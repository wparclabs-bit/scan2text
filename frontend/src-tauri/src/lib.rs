#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{Manager, RunEvent};
use log;

mod backend_process;
pub use backend_process::{boot_backend, BackendManager};

/// Tauri managed state holding the BackendManager.
pub struct AppState(pub Arc<Mutex<BackendManager>>);

/// Resolve the backend executable path without hardcoding D:.
/// Looks relative to CARGO_MANIFEST_DIR (three parent dirs = repo root),
/// or falls back to locating it alongside the running executable.
pub fn resolve_backend_path() -> std::path::PathBuf {
    if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest_path = std::path::PathBuf::from(manifest);
        if let Some(root) = manifest_path.parent().and_then(|p| p.parent()) {
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

/// Send a minimal HTTP GET request to /api/health and verify status 200.
pub fn wait_for_health(host: &str, port: u16, timeout: std::time::Duration) -> Result<(), String> {
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::{Duration, Instant};

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

/// Wait for port to close, with retry.
pub fn wait_for_port_closed(host: &str, port: u16, timeout: std::time::Duration) -> Result<(), String> {
    use std::time::{Duration, Instant};

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
            let mut closed_count = 0;
            for _ in 0..5 {
                std::thread::sleep(Duration::from_millis(1000));
                if !is_port_open(host, port) {
                    closed_count += 1;
                } else {
                    closed_count = 0;
                }
            }
            if closed_count >= 3 {
                return Ok(());
            }
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

/// Start the backend executable.
pub fn start_backend_process() -> std::process::Child {
    let exe_path = resolve_backend_path();
    Command::new(exe_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("Failed to start backend executable")
}

/// Stop the backend process cleanly.
pub fn stop_backend_process(child: &mut std::process::Child) -> Result<(), std::io::Error> {
    #[cfg(windows)]
    {
        let pid = child.id();
        let taskkill_result = Command::new("taskkill")
            .arg("/F")
            .arg("/T")
            .arg("/PID")
            .arg(pid.to_string())
            .status();

        if let Ok(status) = taskkill_result {
            if status.success() {
                std::thread::sleep(std::time::Duration::from_millis(500));
                match child.try_wait() {
                    Ok(Some(_)) => return Ok(()),
                    Ok(None) => {
                        child.kill()?;
                        let _ = child.wait();
                        return Ok(());
                    }
                    Err(e) => return Err(e),
                }
            } else {
                child.kill()?;
                let _ = child.wait();
                return Ok(());
            }
        } else {
            child.kill()?;
            let _ = child.wait();
            return Ok(());
        }
    }

    #[cfg(not(windows))]
    {
        child.kill()?;
        let _ = child.wait();
    }
}

/// State to manage the backend child process (legacy, used by tests).
pub struct BackendState(pub Mutex<Option<std::process::Child>>);

/// Internal cleanup logic that operates on a BackendState directly (for testing).
pub fn cleanup_backend_state(state: &BackendState) -> Result<(), String> {
    let mut child_lock = state.0.lock().unwrap();

    let mut child = match child_lock.take() {
        Some(child) => child,
        None => {
            log::info!("No backend process to clean up");
            return Ok(());
        }
    };

    log::info!("Stopping backend process...");
    if let Err(e) = stop_backend_process(&mut child) {
        log::warn!("Failed to stop backend process gracefully: {}", e);
    }

    let pid = child.id();
    log::info!("Waiting for backend process (PID: {}) to exit...", pid);

    let start = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(5);
    let mut process_exited = false;

    while start.elapsed() < timeout {
        match child.try_wait() {
            Ok(Some(status)) => {
                log::info!("Backend process exited with status: {}", status);
                process_exited = true;
                break;
            }
            Ok(None) => {
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            Err(e) => {
                log::warn!("Error checking process status: {}", e);
                break;
            }
        }
    }

    if !process_exited {
        log::warn!("Backend process did not exit gracefully, attempting force kill...");
        if let Err(e) = child.kill() {
            log::warn!("Failed to kill backend process: {}", e);
        }

        let kill_start = std::time::Instant::now();
        let kill_timeout = std::time::Duration::from_secs(3);
        while kill_start.elapsed() < kill_timeout {
            match child.try_wait() {
                Ok(Some(_)) => {
                    log::info!("Backend process killed successfully");
                    process_exited = true;
                    break;
                }
                Ok(None) => {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                Err(e) => {
                    log::warn!("Error checking process status after kill: {}", e);
                    break;
                }
            }
        }
    }

    if !process_exited && cfg!(windows) {
        log::warn!("Backend process still alive after direct kill, attempting Windows process-tree kill...");
        if let Err(e) = force_kill_process_tree(pid) {
            log::error!("Failed to kill backend process tree: {}", e);
            return Err(format!("Failed to kill backend process tree: {}", e));
        }
        log::info!("Backend process tree killed successfully");
        process_exited = true;
    }

    if !process_exited {
        return Err("Backend process did not exit within timeout".to_string());
    }

    log::info!("Verifying port 47351 is closed...");
    let port_closed = wait_for_port_closed("127.0.0.1", 47351, std::time::Duration::from_secs(30));
    if let Err(e) = port_closed {
        log::warn!("Port 47351 may still be open: {}", e);
    } else {
        log::info!("Port 47351 is confirmed closed");
    }

    Ok(())
}

/// Clean up the backend process with verification and escalation (Tauri entry point).
pub fn cleanup_backend_process(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let state = app_handle.state::<BackendState>();
    cleanup_backend_state(&state)
}

/// Force kill a process and its children on Windows using taskkill.
#[cfg(windows)]
pub fn force_kill_process_tree(pid: u32) -> Result<(), String> {
    use std::process::Command;

    let output = Command::new("taskkill")
        .arg("/F")
        .arg("/T")
        .arg("/PID")
        .arg(pid.to_string())
        .output()
        .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("taskkill failed: {}", stderr));
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn force_kill_process_tree(_pid: u32) -> Result<(), String> {
    Ok(())
}

/// Tauri app entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState(Arc::new(Mutex::new(BackendManager::new()))))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let manager = {
                let state = app.state::<AppState>();
                Arc::clone(&state.0)
            };

            {
                let mut mgr = manager.lock().unwrap();
                if let Err(e) = boot_backend(&mut mgr) {
                    log::error!("Failed to boot backend: {}", e);
                    return Err(e.into());
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |app: &tauri::AppHandle, event: RunEvent| {
            match event {
                RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                    let state = app.state::<AppState>();
                    let mut guard = state.0.lock().unwrap();
                    if let Err(e) = guard.stop() {
                        log::warn!("Backend stop on exit failed: {}", e);
                    } else {
                        log::info!("Backend stopped cleanly on app exit");
                    }
                }
                _ => {}
            }
        });
}
