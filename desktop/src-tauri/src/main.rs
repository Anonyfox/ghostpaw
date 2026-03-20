#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::Manager;

const READY_PREFIX: &str = "GHOSTPAW_READY port=";
const STARTUP_TIMEOUT_SECS: u64 = 30;
const GRACEFUL_SHUTDOWN_SECS: u64 = 6;

fn find_node_binary(exe_dir: &std::path::Path) -> std::path::PathBuf {
    let triple = std::env::consts::ARCH.to_string()
        + "-"
        + match std::env::consts::OS {
            "macos" => "apple-darwin",
            "linux" => "unknown-linux-gnu",
            "windows" => "pc-windows-msvc",
            _ => "unknown",
        };

    let ext = if cfg!(windows) { ".exe" } else { "" };
    let arch_name = format!("node-{}{}", triple, ext);

    let bare_name = format!("node{}", ext);
    let candidates: Vec<String> = if cfg!(target_os = "macos") {
        vec![arch_name.clone(), format!("node-universal-apple-darwin{}", ext), bare_name]
    } else {
        vec![arch_name.clone(), bare_name]
    };

    for name in &candidates {
        let bundled = exe_dir.join(name);
        if bundled.exists() {
            return bundled;
        }
        let dev_path = exe_dir.join("../../binaries").join(name);
        if dev_path.exists() {
            return dev_path;
        }
    }

    panic!(
        "Node binary not found. Looked for {:?} in:\n  {}\n  {}",
        candidates,
        exe_dir.display(),
        exe_dir.join("../../binaries").display()
    );
}

fn find_ghostpaw_mjs(exe_dir: &std::path::Path) -> std::path::PathBuf {
    let locations = [
        exe_dir.join("../Resources/resources/ghostpaw.mjs"),
        exe_dir.join("resources/ghostpaw.mjs"),
        exe_dir.join("../../resources/ghostpaw.mjs"),
    ];

    for loc in &locations {
        if loc.exists() {
            return loc.clone();
        }
    }

    let paths: Vec<String> = locations.iter().map(|p| format!("  {}", p.display())).collect();
    panic!("ghostpaw.mjs not found. Looked in:\n{}", paths.join("\n"));
}

fn graceful_kill(child: &mut Child) {
    let pid = child.id();
    eprintln!("[tauri] sending SIGTERM to sidecar pid={}", pid);

    #[cfg(unix)]
    unsafe {
        libc::kill(pid as i32, libc::SIGTERM);
    }
    #[cfg(windows)]
    {
        let _ = child.kill();
        let _ = child.wait();
        return;
    }

    let deadline = std::time::Instant::now()
        + std::time::Duration::from_secs(GRACEFUL_SHUTDOWN_SECS);

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                eprintln!("[tauri] sidecar exited: {:?}", status);
                return;
            }
            Ok(None) => {
                if std::time::Instant::now() >= deadline {
                    eprintln!("[tauri] sidecar did not exit in {}s, sending SIGKILL", GRACEFUL_SHUTDOWN_SECS);
                    let _ = child.kill();
                    let _ = child.wait();
                    return;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
            }
            Err(_) => return,
        }
    }
}

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").expect("main window");
            let window_nav = window.clone();

            let home_dir = app
                .path()
                .home_dir()
                .expect("home directory")
                .to_string_lossy()
                .to_string();

            let exe_path = std::env::current_exe().expect("current exe path");
            let exe_dir = exe_path.parent().expect("exe parent directory");

            let node_bin = find_node_binary(exe_dir);
            let ghostpaw_mjs = find_ghostpaw_mjs(exe_dir);

            eprintln!("[tauri] node binary: {}", node_bin.display());
            eprintln!("[tauri] ghostpaw.mjs: {}", ghostpaw_mjs.display());
            eprintln!("[tauri] workspace: {}", home_dir);

            let mut child = Command::new(&node_bin)
                .arg(&ghostpaw_mjs)
                .env("GHOSTPAW_DESKTOP", "1")
                .env("GHOSTPAW_WORKSPACE", &home_dir)
                .env("NODE_NO_WARNINGS", "1")
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .unwrap_or_else(|e| {
                    panic!(
                        "Failed to spawn node sidecar at {}: {}",
                        node_bin.display(),
                        e
                    )
                });

            eprintln!("[tauri] sidecar spawned, pid={}", child.id());

            let stdout = child.stdout.take().expect("stdout pipe");
            let child_handle: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(Some(child)));

            // Share the handle globally for both window-close and app-exit
            let child_for_window = child_handle.clone();
            app.manage(child_handle);

            let ready_found = Arc::new(Mutex::new(false));
            let ready_timeout = ready_found.clone();

            std::thread::spawn(move || {
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    let Ok(text) = line else {
                        eprintln!("[tauri] stdout read error, stopping");
                        break;
                    };
                    eprintln!("[tauri] stdout: {}", text);
                    if let Some(port_str) = text.trim().strip_prefix(READY_PREFIX) {
                        if let Ok(port) = port_str.trim().parse::<u16>() {
                            let url = format!("http://127.0.0.1:{}", port);
                            eprintln!("[tauri] navigating to {}", url);
                            *ready_found.lock().unwrap_or_else(|e| e.into_inner()) = true;
                            let _ = window_nav.navigate(url.parse().expect("valid url"));
                        }
                    }
                }
                eprintln!("[tauri] stdout reader exited");
            });

            let window_timeout = window.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(STARTUP_TIMEOUT_SECS)).await;
                if !*ready_timeout.lock().unwrap_or_else(|e| e.into_inner()) {
                    let error_html = format!(
                        "data:text/html,<html><body style='background:#0d1117;color:#c9d1d9;\
                         font-family:system-ui;display:flex;align-items:center;\
                         justify-content:center;height:100vh;margin:0;'>\
                         <div style='text-align:center'>\
                         <h2 style='color:#58a6ff'>Ghostpaw</h2>\
                         <p>Sidecar failed to start within {}s.</p>\
                         <p style='color:#8b949e'>Check logs or restart the app.</p>\
                         </div></body></html>",
                        STARTUP_TIMEOUT_SECS
                    );
                    let _ = window_timeout.navigate(error_html.parse().expect("valid data uri"));
                }
            });

            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Destroyed = event {
                    if let Some(mut child) = child_for_window
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .take()
                    {
                        graceful_kill(&mut child);
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|handle, event| {
        if let tauri::RunEvent::Exit = event {
            let state: tauri::State<Arc<Mutex<Option<Child>>>> = handle.state();
            let child = state.lock().unwrap_or_else(|e| e.into_inner()).take();
            if let Some(mut c) = child {
                graceful_kill(&mut c);
            }
        }
    });
}
