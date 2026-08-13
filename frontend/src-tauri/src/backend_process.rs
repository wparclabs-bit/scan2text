use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

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
    pub fn start(&mut self, timeout: Duration) -> Result<(), String> {
        if self.child.is_some() {
            return Ok(()); // already running
        }
        let exe_path = resolve_backend_path();
        let child = start_backend(&exe_path);
        self.child = Some(child);
        self.wait_for_health(timeout)
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
pub fn boot_backend(manager: &mut BackendManager) -> Result<(), String> {
    manager.start(Duration::from_secs(30))?;
    manager.wait_for_health(Duration::from_secs(30))
}

/// Resolve the backend executable path without hardcoding D:.
/// Looks relative to CARGO_MANIFEST_DIR (three parent dirs = repo root),
/// or falls back to locating it alongside the running executable.
pub fn resolve_backend_path() -> PathBuf {
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_path = PathBuf::from(manifest);
        if let Some(root) = manifest_path.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            let exe = root.join("dist").join("scan2text-backend").join("scan2text-backend.exe");
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
            let candidate = path.join("dist").join("scan2text-backend").join("scan2text-backend.exe");
            if candidate.exists() {
                return candidate;
            }
        }
    }

    panic!(
        "Backend executable not found. Expected dist/scan2text-backend/scan2text-backend.exe \
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

/// Start the backend executable.
pub fn start_backend(exe_path: &std::path::Path) -> std::process::Child {
    Command::new(exe_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
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