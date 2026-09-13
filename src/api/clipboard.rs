use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};

use actix_web::{get, post, web, HttpRequest, HttpResponse};
use serde::Serialize;

use crate::app::user::AuthenticatedUser;

/// Clipboard relay state for the clipboard agent running in the host's user
/// session (see clipboard-agent.ps1). The web-server itself runs in session 0
/// as a service and cannot touch the host clipboard directly, so the agent
/// picks up text queued here and pushes host clipboard changes back.
#[derive(Default)]
pub struct ClipboardState {
    pending_to_host: Mutex<Option<String>>,
    latest_from_host: Mutex<String>,
    seq: AtomicU64,
}

#[derive(Serialize)]
struct PendingResponse {
    text: Option<String>,
}

#[derive(Serialize)]
struct LatestResponse {
    text: String,
    seq: u64,
}

#[derive(serde::Deserialize)]
struct ClipboardText {
    text: String,
}

fn is_loopback(req: &HttpRequest) -> bool {
    req.peer_addr().map(|addr| addr.ip().is_loopback()).unwrap_or(false)
}

/// The agent takes the text the web client wants on the host clipboard.
#[get("/clipboard/agent/poll")]
pub async fn agent_poll(state: web::Data<ClipboardState>, req: HttpRequest) -> HttpResponse {
    if !is_loopback(&req) {
        return HttpResponse::Forbidden().finish();
    }

    let text = state
        .pending_to_host
        .lock()
        .unwrap_or_else(|err| err.into_inner())
        .take();

    HttpResponse::Ok().json(PendingResponse { text })
}

/// The agent reports the host's current clipboard content.
#[post("/clipboard/agent/push")]
pub async fn agent_push(
    state: web::Data<ClipboardState>,
    req: HttpRequest,
    body: web::Bytes,
) -> HttpResponse {
    if !is_loopback(&req) {
        return HttpResponse::Forbidden().finish();
    }

    let text = String::from_utf8_lossy(&body).to_string();

    {
        let mut latest = state.latest_from_host.lock().unwrap_or_else(|err| err.into_inner());
        *latest = text;
    }
    state.seq.fetch_add(1, Ordering::Relaxed);

    HttpResponse::Ok().finish()
}

/// Latest host clipboard for the web client.
#[get("/clipboard")]
pub async fn get_clipboard(
    state: web::Data<ClipboardState>,
    _user: AuthenticatedUser,
) -> HttpResponse {
    let (text, seq) = {
        let latest = state.latest_from_host.lock().unwrap_or_else(|err| err.into_inner());
        (latest.clone(), state.seq.load(Ordering::Relaxed))
    };

    HttpResponse::Ok().json(LatestResponse { text, seq })
}

/// The web client sends text that should end up on the host clipboard.
#[post("/clipboard")]
pub async fn post_clipboard(
    state: web::Data<ClipboardState>,
    _user: AuthenticatedUser,
    payload: web::Json<ClipboardText>,
) -> HttpResponse {
    {
        let mut pending = state.pending_to_host.lock().unwrap_or_else(|err| err.into_inner());
        *pending = Some(payload.text.clone());
    }

    HttpResponse::Ok().finish()
}
