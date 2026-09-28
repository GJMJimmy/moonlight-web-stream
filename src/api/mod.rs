use actix_web::{
    dev::HttpServiceFactory,
    middleware::from_fn,
    services,
    web::{self},
};

use crate::api::{
    app::{get_app_image, get_apps},
    auth::auth_middleware,
    clipboard::{get_clipboard, post_clipboard},
    host::{delete_host, get_host, list_hosts, pair_host, patch_host, post_host, wake_host},
    role::{add_role, delete_role, get_role, list_roles, patch_role},
    settings::{get_default_settings, get_permissions},
    user::{
        add_user, delete_user, get_client_data, get_user, list_users, patch_user, put_client_data,
    },
};

pub mod app;
pub mod auth;
pub mod clipboard;
pub mod host;
pub mod role;
pub mod settings;
pub mod stream;
pub mod user;

pub mod response_streaming;

/// The clipboard agent endpoints must never be reachable from outside the
/// machine: they have no session auth (the agent is not a logged-in user),
/// and a loopback check inside the app cannot distinguish local callers from
/// requests forwarded by a reverse proxy/tunnel that terminates on localhost
/// (frp does exactly that). Serving them on a dedicated loopback-only
/// listener keeps them unreachable from the tunnel.
pub fn clipboard_agent_service() -> impl HttpServiceFactory {
    web::scope("/api").service(services![
        // -- Clipboard agent
        clipboard::agent_poll,
        clipboard::agent_push
    ])
}

pub fn api_service() -> impl HttpServiceFactory {
    web::scope("/api")
        .wrap(from_fn(auth_middleware))
        .service(services![
            // -- Auth
            auth::login,
            auth::logout,
            auth::authenticate
        ])
        .service(services![
            // -- Host
            list_hosts,
            get_host,
            post_host,
            patch_host,
            wake_host,
            delete_host,
            pair_host,
        ])
        .service(services![
            // -- Apps
            get_apps,
            get_app_image,
        ])
        .service(services![
            // -- Users
            get_user,
            add_user,
            patch_user,
            delete_user,
            list_users,
            get_client_data,
            put_client_data
        ])
        .service(services![
            // -- Roles
            get_role,
            add_role,
            patch_role,
            delete_role,
            list_roles,
        ])
        .service(services![
            // -- Settings
            get_default_settings,
            get_permissions
        ])
        .service(services![
            // -- Clipboard
            get_clipboard,
            post_clipboard
        ])
        .service(services![
            // -- Stream
            stream::start_host,
            stream::cancel_host,
        ])
}
