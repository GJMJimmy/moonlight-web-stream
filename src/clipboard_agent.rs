// Spawns the clipboard agent (clipboard-agent.ps1) into the active console
// user session. The web-server usually runs as a service in session 0, where
// the host clipboard is unreachable, so the agent has to be created with the
// logged-in user's token via the WTS api.
//
// A background thread retries every 60 seconds until the agent is confirmed
// running (marker file + tasklist), so it recovers after boot-before-login
// and after logouts.

use std::path::{Path, PathBuf};
use std::time::Duration;

use tracing::{info, warn};

pub fn start_spawner_thread(script: PathBuf) {
    std::thread::spawn(move || {
        loop {
            match ensure_agent_running(&script) {
                Ok(true) => { /* already running */ }
                Ok(false) => {
                    info!("[clipboard-agent] spawned into user session");
                }
                Err(err) => {
                    warn!("[clipboard-agent] not spawned yet: {err}");
                }
            }

            std::thread::sleep(Duration::from_secs(60));
        }
    });
}

/// Returns Ok(true) when the agent was already running, Ok(false) when it was
/// (re)spawned by this call.
fn ensure_agent_running(script: &Path) -> Result<bool, String> {
    let marker = marker_path(script);

    if let Some(pid) = read_pid(&marker) {
        if process_alive(pid) {
            return Ok(true);
        }
    }

    kill_stray_agents();

    #[cfg(windows)]
    {
        let pid = spawn_into_user_session(script)?;
        let _ = std::fs::write(&marker, pid.to_string());
        Ok(false)
    }
    #[cfg(not(windows))]
    {
        let _ = &marker;
        Err("clipboard agent spawning is only supported on windows".to_string())
    }
}

fn marker_path(script: &Path) -> PathBuf {
    script
        .parent()
        .unwrap_or(Path::new("."))
        .join("clipboard-agent.pid")
}

fn read_pid(marker: &Path) -> Option<u32> {
    let content = std::fs::read_to_string(marker).ok()?;
    content.trim().parse().ok()
}

fn process_alive(pid: u32) -> bool {
    std::process::Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH"])
        .output()
        .map(|output| String::from_utf8_lossy(&output.stdout).contains(&pid.to_string()))
        .unwrap_or(false)
}

/// Terminates leftover agent instances from previous runs (best effort).
fn kill_stray_agents() {
    let _ = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*clipboard-agent.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }",
        ])
        .output();
}

#[cfg(windows)]
fn spawn_into_user_session(script: &Path) -> Result<u32, String> {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "kernel32")]
    extern "system" {
        fn WTSGetActiveConsoleSessionId() -> u32;
        fn CloseHandle(handle: isize) -> i32;
        fn ProcessIdToSessionId(process_id: u32, session_id: *mut u32) -> i32;
        fn CreateProcessW(
            application_name: *const u16,
            command_line: *mut u16,
            process_attributes: *mut u8,
            thread_attributes: *mut u8,
            inherit_handles: i32,
            creation_flags: u32,
            environment: *mut u8,
            current_directory: *const u16,
            startup_info: *mut StartupInfoW,
            process_information: *mut ProcessInformation,
        ) -> i32;
    }

    #[link(name = "wtsapi32")]
    extern "system" {
        fn WTSQueryUserToken(session_id: u32, token: *mut isize) -> i32;
    }

    #[link(name = "advapi32")]
    extern "system" {
        #[allow(clippy::too_many_arguments)]
        fn CreateProcessAsUserW(
            token: isize,
            application_name: *const u16,
            command_line: *mut u16,
            process_attributes: *mut u8,
            thread_attributes: *mut u8,
            inherit_handles: i32,
            creation_flags: u32,
            environment: *mut u8,
            current_directory: *const u16,
            startup_info: *mut StartupInfoW,
            process_information: *mut ProcessInformation,
        ) -> i32;
    }

    #[repr(C)]
    struct StartupInfoW {
        cb: u32,
        reserved: *mut u16,
        desktop: *mut u16,
        title: *mut u16,
        x: u32,
        y: u32,
        x_size: u32,
        y_size: u32,
        x_count_chars: u32,
        y_count_chars: u32,
        fill_attribute: u32,
        flags: u32,
        show_window: u16,
        cb_reserved2: u16,
        reserved2: *mut u8,
        std_input: isize,
        std_output: isize,
        std_error: isize,
    }

    #[repr(C)]
    struct ProcessInformation {
        process: isize,
        thread: isize,
        process_id: u32,
        thread_id: u32,
    }

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    const CREATE_UNICODE_ENVIRONMENT: u32 = 0x0000_0400;

    let script_text = script
        .to_str()
        .ok_or("clipboard agent script path is not valid unicode")?
        .to_string();

    let mut current_session: u32 = 0;
    unsafe { ProcessIdToSessionId(std::process::id(), &mut current_session) };
    let console_session = unsafe { WTSGetActiveConsoleSessionId() };

    // When the server itself runs in the interactive session (manual start),
    // a plain CreateProcessW is enough. From a service session, create the
    // process with the console user's token instead.
    let token = if current_session != 0 && current_session == console_session {
        0
    } else {
        let mut token: isize = 0;
        if unsafe { WTSQueryUserToken(console_session, &mut token) } == 0 {
            return Err(
                "WTSQueryUserToken failed - is a user logged in on the console?".to_string(),
            );
        }
        token
    };

    let mut command_line: Vec<u16> = std::ffi::OsStr::new(&format!(
        "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"{script_text}\""
    ))
    .encode_wide()
    .chain(Some(0))
    .collect();

    let mut startup_info = StartupInfoW {
        cb: std::mem::size_of::<StartupInfoW>() as u32,
        reserved: std::ptr::null_mut(),
        desktop: std::ptr::null_mut(),
        title: std::ptr::null_mut(),
        x: 0,
        y: 0,
        x_size: 0,
        y_size: 0,
        x_count_chars: 0,
        y_count_chars: 0,
        fill_attribute: 0,
        flags: 0,
        show_window: 0,
        cb_reserved2: 0,
        reserved2: std::ptr::null_mut(),
        std_input: 0,
        std_output: 0,
        std_error: 0,
    };
    let mut process_info = ProcessInformation {
        process: 0,
        thread: 0,
        process_id: 0,
        thread_id: 0,
    };

    let ok = unsafe {
        if token != 0 {
            CreateProcessAsUserW(
                token,
                std::ptr::null(),
                command_line.as_mut_ptr(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                0,
                CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
                std::ptr::null_mut(),
                std::ptr::null(),
                &mut startup_info,
                &mut process_info,
            )
        } else {
            CreateProcessW(
                std::ptr::null(),
                command_line.as_mut_ptr(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                0,
                CREATE_NO_WINDOW | CREATE_UNICODE_ENVIRONMENT,
                std::ptr::null_mut(),
                std::ptr::null(),
                &mut startup_info,
                &mut process_info,
            )
        }
    };

    if token != 0 {
        unsafe { CloseHandle(token) };
    }
    if ok == 0 {
        return Err("failed to create the clipboard agent process".to_string());
    }
    if process_info.process != 0 {
        unsafe { CloseHandle(process_info.process) };
    }
    if process_info.thread != 0 {
        unsafe { CloseHandle(process_info.thread) };
    }

    info!("[clipboard-agent] spawned pid {}", process_info.process_id);
    Ok(process_info.process_id)
}
