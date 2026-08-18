use std::io::{Read, Write};
use std::net::TcpStream;
use std::process::Child;
use std::time::{Duration, Instant};

#[cfg(not(debug_assertions))]
use std::path::PathBuf;
#[cfg(not(debug_assertions))]
use std::process::Command;
#[cfg(all(windows, not(debug_assertions)))]
use std::os::windows::process::CommandExt;

/// Backend port (ADR-008).
const BACKEND_PORT: u16 = 47351;

/// Manages the lifecycle of the Python backend process.
pub struct BackendManager {
    child: Option<Child>,
    port: u16,
}

impl BackendManager {
    /// Create a new BackendManager with default port.
    pub fn new() -> Self {
        Self {
            child: None,
            port: BACKEND_PORT,
        }
    }

    /// Start the backend executable and store the child process.
    /// Idempotent: if a live child already exists, reuse it.
    /// If a dead child exists, restart it.
    /// In debug/dev mode, skip spawning — the dev script manages the backend.
    pub fn start(&mut self, _timeout: Duration) -> Result<(), String> {
        #[cfg(debug_assertions)]
        {
            return Ok(());
        }
        #[cfg(not(debug_assertions))]
        {
            if let Some(ref mut child) = self.child {
                // Verify existing child is still alive
                if child.try_wait().ok().flatten().is_some() {
                    // Child has died — fall through to restart
                } else {
                    return Ok(()); // already running and alive
                }
            }
            let exe_path = resolve_backend_path();
            let child = start_backend(&exe_path);
            self.child = Some(child);
            return self.wait_for_health(_timeout);
        }
    }

    /// Stop the backend process cleanly.
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(ref mut child) = self.child {
            stop_backend(child).map_err(|e| e.to_string())?;
        }
        self.child = None;
        Ok(())
    }

    /// Get the PID of the backend process, or 0 if not running.
    pub fn get_pid(&self) -> u32 {
        self.child.as_ref().map(|c| c.id()).unwrap_or(0)
    }

    /// Wait for the backend to report healthy via /api/health.
    pub fn wait_for_health(&self, timeout: Duration) -> Result<(), String> {
        wait_for_health("127.0.0.1", self.port, timeout)
    }

    /// Wait for the backend port to close after stop.
    pub fn wait_for_port_closed(&self, port: u16, timeout: Duration) -> Result<(), String> {
        wait_for_port_closed("127.0.0.1", port, timeout)
    }
}

/// Boot the backend: start it and wait for health.
/// In debug/dev mode, skip entirely — dev.ps1 manages the backend on port 8000.
pub fn boot_backend(_manager: &mut BackendManager) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        return Ok(());
    }
    #[cfg(not(debug_assertions))]
    {
        _manager.start(Duration::from_secs(30))?;
        _manager.wait_for_health(Duration::from_secs(30))
    }
}

/// Resolve the backend executable path without hardcoding D:.
/// Looks relative to CARGO_MANIFEST_DIR (three parent dirs = repo root),
/// or falls back to locating it alongside the running executable.
#[cfg(not(debug_assertions))]
pub fn resolve_backend_path() -> PathBuf {
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_path = PathBuf::from(manifest);
        if let Some(root) = manifest_path.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            let exe = root.join("backend").join("scan2text-backend.exe");
            if exe.exists() {
                return exe;
            }
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        let mut path = match exe.canonicalize() {
            Ok(p) => p,
            Err(_) => exe,
        };
        for _ in 0..10 {
            path = path.parent().unwrap_or(&path).to_path_buf();
            let candidate = path.join("backend").join("scan2text-backend.exe");
            if candidate.exists() {
                return candidate;
            }
        }
    }

    panic!(
        "Backend executable not found. Expected backend/scan2text-backend.exe \
         relative to repo root."
    )
}

/// Minimal HTTP health check: GET /api/health, verify "200" in response.
pub fn wait_for_health(host: &str, port: u16, timeout: Duration) -> Result<(), String> {
    let request =
        format!("GET /api/health HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", host);
    let start = Instant::now();
    loop {
        if start.elapsed() > timeout {
            return Err(format!(
                "Health check timed out after {}s on {}:{}",
                timeout.as_secs(),
                host,
                port
            ));
        }
        match TcpStream::connect(format!("{}:{}", host, port)) {
            Ok(mut stream) => {
                if let Err(e) = stream.set_read_timeout(Some(Duration::from_millis(500))) {
                    return Err(format!("Failed to set read timeout: {}", e));
                }
                if let Err(e) = stream.write_all(request.as_bytes()) {
                    return Err(format!("Failed to write health request: {}", e));
                }
                let mut response = Vec::new();
                match stream.read_to_end(&mut response) {
                    Ok(_) => {
                        let body = String::from_utf8_lossy(&response);
                        if body.contains("200") {
                            return Ok(());
                        }
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {}
                    Err(e) => return Err(format!("Read error: {}", e)),
                }
            }
            Err(_) => {
                std::thread::sleep(Duration::from_millis(200));
            }
        }
    }
}

/// Check if host:port is currently accepting TCP connections.
pub fn is_port_open(host: &str, port: u16) -> bool {
    TcpStream::connect(format!("{}:{}", host, port)).is_ok()
}

/// Derive the log file path from the executable's parent directory.
/// Log path: <exe_dir>/logs/backend-boot.log
#[cfg(not(debug_assertions))]
pub fn derive_log_path(exe_dir: &std::path::Path) -> PathBuf {
    exe_dir.join("logs").join("backend-boot.log")
}

/// Ensure the log directory exists.
#[cfg(not(debug_assertions))]
pub fn ensure_log_dir(log_path: &std::path::Path) -> std::io::Result<()> {
    if let Some(dir) = log_path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    Ok(())
}

/// Creation flags for backend process spawn.
/// On Windows: CREATE_NO_WINDOW (0x08000000) suppresses the black console.
#[cfg(all(windows, not(debug_assertions)))]
const BACKEND_CREATION_FLAGS: u32 = 0x08000000;

/// Return the creation flags used when spawning the backend process.
/// Exposed for testing.
#[cfg(all(windows, not(debug_assertions)))]
pub fn spawn_creation_flags() -> u32 {
    BACKEND_CREATION_FLAGS
}

/// Build a Command that pipes stdout+stderr to the log file.
/// Creates the log directory if needed.
#[cfg(not(debug_assertions))]
pub fn spawn_config(
    exe_path: &std::path::Path,
    log_path: &std::path::Path,
) -> std::io::Result<Command> {
    ensure_log_dir(log_path)?;
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)?;
    let mut cmd = Command::new(exe_path);
    cmd.stdout(log_file.try_clone()?);
    cmd.stderr(log_file);
    #[cfg(windows)]
    cmd.creation_flags(BACKEND_CREATION_FLAGS);
    Ok(cmd)
}

/// Start the backend executable.
#[cfg(not(debug_assertions))]
pub fn start_backend(exe_path: &std::path::Path) -> std::process::Child {
    let exe_dir = exe_path
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| exe_path.to_path_buf());
    let log_path = derive_log_path(&exe_dir);
    spawn_config(exe_path, &log_path)
        .expect("Failed to build spawn config")
        .spawn()
        .expect("Failed to start backend executable")
}

/// Stop the backend process cleanly.
pub fn stop_backend(child: &mut Child) -> Result<(), std::io::Error> {
    child.kill()?;
    let _ = child.wait()?;
    Ok(())
}

/// Wait for port to close, with retry.
pub fn wait_for_port_closed(host: &str, port: u16, timeout: Duration) -> Result<(), String> {
    let start = Instant::now();
    loop {
        if start.elapsed() > timeout {
            return Err(format!(
                "Port {} still open after {}s",
                port,
                timeout.as_secs()
            ));
        }
        if !is_port_open(host, port) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

#[cfg(test)]
mod tests {
    #[cfg(not(debug_assertions))]
    use super::*;

    #[cfg(not(debug_assertions))]
    #[test]
    fn test_derive_log_path() {
        let exe_dir = std::path::Path::new("/some/path/to/exe");
        let log_path = derive_log_path(exe_dir);
        assert_eq!(
            log_path,
            std::path::Path::new("/some/path/to/exe/logs/backend-boot.log")
        );
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn test_ensure_log_dir_creates_directory() {
        let temp_dir = std::env::temp_dir();
        let test_log = temp_dir
            .join("scan2text_boot_test_logs")
            .join("backend-boot.log");
        let result = ensure_log_dir(&test_log);
        assert!(result.is_ok(), "ensure_log_dir should succeed");
        if test_log.exists() {
            let _ = std::fs::remove_dir_all(test_log.parent().unwrap());
        }
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn test_spawn_config_pipes_to_log() {
        let temp_dir = std::env::temp_dir();
        let test_log = temp_dir
            .join("scan2text_boot_test")
            .join("backend-boot.log");
        let test_exe = std::path::Path::new("C:\\Windows\\System32\\cmd.exe");
        let result = spawn_config(test_exe, &test_log);
        assert!(result.is_ok(), "spawn_config should succeed with valid inputs");
        let mut cmd = result.unwrap();
        // Verify the command can be spawned (cmd.exe exists)
        let child = cmd.spawn();
        assert!(child.is_ok(), "spawn should succeed");
        if let Ok(mut child) = child {
            let _ = child.kill();
            let _ = child.wait();
        }
        // Cleanup
        if test_log.exists() {
            let _ = std::fs::remove_file(&test_log);
        }
        if let Some(parent) = test_log.parent() {
            let _ = std::fs::remove_dir_all(parent);
        }
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn test_spawn_config_log_captures_stdout() {
        let temp_dir = std::env::temp_dir();
        let test_log = temp_dir
            .join("scan2text_boot_stdio_test")
            .join("backend-boot.log");
        let test_exe = std::path::Path::new("C:\\Windows\\System32\\cmd.exe");
        // Build spawn config with piped stdio -> log file
        let result = spawn_config(test_exe, &test_log);
        assert!(result.is_ok(), "spawn_config should succeed");
        let mut cmd = result.unwrap();
        // Use /c echo to produce stdout output
        cmd.arg("/c").arg("echo STDIO_TEST_OK");
        let mut child = cmd.spawn().expect("spawn should succeed");
        let wait_result = child.wait().expect("wait should succeed");
        assert!(wait_result.success(), "echo command should exit success");
        // Read log file and verify stdout was piped there
        let log_content = std::fs::read_to_string(&test_log)
            .expect("log file should be readable after spawn");
        assert!(
            log_content.contains("STDIO_TEST_OK"),
            "Log file should capture stdout output (piped stdio). Content: {:?}",
            log_content
        );
        // Cleanup
        if test_log.exists() {
            let _ = std::fs::remove_file(&test_log);
        }
        if let Some(parent) = test_log.parent() {
            let _ = std::fs::remove_dir_all(parent);
        }
    }

    #[cfg(all(windows, not(debug_assertions)))]
    #[test]
    fn test_spawn_creation_flags_no_window_on_windows() {
        // CREATE_NO_WINDOW = 0x08000000
        let flags = spawn_creation_flags();
        assert!(
            (flags & 0x08000000) != 0,
            "spawn_creation_flags must include CREATE_NO_WINDOW (0x08000000) on Windows, got: {:#x}",
            flags
        );
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn test_boot_backend_single_live_child() {
        let mut manager = BackendManager::new();

        // First boot
        let result1 = boot_backend(&mut manager);
        assert!(result1.is_ok(), "first boot_backend should succeed");
        let pid1 = manager.get_pid();
        assert!(pid1 > 0, "first boot should yield a live PID");

        // Second boot — must reuse same child, not spawn a new one
        let result2 = boot_backend(&mut manager);
        assert!(result2.is_ok(), "second boot_backend should succeed (idempotent)");
        let pid2 = manager.get_pid();
        assert_eq!(
            pid1, pid2,
            "second boot must reuse same child PID, not spawn a new one (pid1={}, pid2={})",
            pid1, pid2
        );

        // Verify the child is still alive (not a zombie)
        let alive = manager.child.as_mut().map(|c| c.try_wait().unwrap().is_none()).unwrap_or(false);
        assert!(alive, "child process must still be alive after idempotent boot");

        manager.stop().expect("stop should succeed");
    }
}