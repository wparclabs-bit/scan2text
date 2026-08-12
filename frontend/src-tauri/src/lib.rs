#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn resolve_backend_path() -> PathBuf {
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

/// Send a minimal HTTP GET request to /api/health and verify status 200.
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
            // Give it extra time to fully release
            std::thread::sleep(Duration::from_millis(2000));
            if !is_port_open(host, port) {
                return Ok(());
            }
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}

/// Start the backend executable.
/// Returns the child process handle.
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
    child.kill()?;
    child.wait().map(|_| ())
}

/// Tauri app entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Start backend executable on app startup
      let exe_path = resolve_backend_path();
      if exe_path.exists() {
        // Spawn the backend process
        let mut child = start_backend_process();

        // Wait for health check with timeout
        if let Err(e) = wait_for_health("127.0.0.1", 47351, Duration::from_secs(30)) {
          log::warn!("Backend health check failed on startup: {}", e);
          // Do not crash dev mode; just log the error
          // The process will be cleaned up when the app exits
          let _ = child.kill();
        } else {
          log::info!("Backend /api/health returned 200 on startup");
        }
      } else {
        log::warn!("Backend executable not found at startup");
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}