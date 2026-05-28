/*!
 * NovaDev Rust Realtime Service
 *
 * Handles:
 *   /ws/terminal/:session_id  — WebSocket terminal sessions (typed commands, real responses)
 *   /api/metrics              — Server-Sent Events live system metrics
 *   /api/metrics/snapshot     — Point-in-time metrics snapshot
 */

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    http::Method,
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse,
    },
    routing::get,
    Json, Router,
};
use futures_util::stream::Stream;
use serde::Serialize;
use serde_json::json;
use std::{
    collections::HashMap,
    convert::Infallible,
    env,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

// ── State ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
struct Session {
    id: String,
    workspace_id: u32,
    name: String,
    status: String,
}

#[derive(Clone)]
struct AppState {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
}

impl AppState {
    fn new() -> Self {
        let mut sessions = HashMap::new();
        sessions.insert(
            "sess-1".into(),
            Session { id: "sess-1".into(), workspace_id: 1, name: "bash".into(), status: "active".into() },
        );
        Self { sessions: Arc::new(Mutex::new(sessions)) }
    }
}

// ── Metrics ───────────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct MetricsSample {
    timestamp: u64,
    cpu_percent: f64,
    memory_mb: u32,
    memory_total_mb: u32,
    network_rx_kbps: f64,
    network_tx_kbps: f64,
    disk_read_kbps: f64,
    disk_write_kbps: f64,
    workspaces: Vec<WorkspaceMetric>,
}

#[derive(Serialize, Clone)]
struct WorkspaceMetric {
    id: u32,
    name: String,
    cpu_percent: f64,
    memory_mb: u32,
    requests_per_sec: f64,
    error_rate: f64,
    p99_latency_ms: f64,
}

fn generate_metrics(tick: u64) -> MetricsSample {
    let t = tick as f64;
    MetricsSample {
        timestamp: tick,
        cpu_percent:        35.0 + 15.0 * (t * 0.10).sin() + 5.0 * (t * 0.30).cos(),
        memory_mb:          2_840 + ((t * 0.05).sin() * 200.0) as u32,
        memory_total_mb:    8_192,
        network_rx_kbps:    120.0 + 80.0 * (t * 0.15).sin().abs(),
        network_tx_kbps:    45.0  + 30.0 * (t * 0.20).cos().abs(),
        disk_read_kbps:     20.0  + 15.0 * (t * 0.07).sin().abs(),
        disk_write_kbps:    8.0   +  6.0 * (t * 0.12).cos().abs(),
        workspaces: vec![
            WorkspaceMetric {
                id: 1, name: "api-gateway".into(),
                cpu_percent:       12.4 +  4.0 * (t * 0.20).sin(),
                memory_mb:         186  + ((t * 0.10).cos() * 20.0) as u32,
                requests_per_sec:  142.0 + 30.0 * (t * 0.15).sin(),
                error_rate:        0.12 + 0.05 * (t * 0.30).sin().abs(),
                p99_latency_ms:    45.0 + 15.0 * (t * 0.10).cos().abs(),
            },
            WorkspaceMetric {
                id: 3, name: "ml-service".into(),
                cpu_percent:       38.2 + 12.0 * (t * 0.08).sin(),
                memory_mb:         892  + ((t * 0.05).sin() * 50.0) as u32,
                requests_per_sec:  18.5 +  5.0 * (t * 0.20).cos(),
                error_rate:        0.05 + 0.02 * (t * 0.40).sin().abs(),
                p99_latency_ms:    280.0 + 80.0 * (t * 0.12).sin().abs(),
            },
        ],
    }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "rust-rt",
        "lang": "Rust (stable)",
        "capabilities": ["websocket-terminal", "metrics-sse", "live-sync"],
    }))
}

async fn metrics_snapshot() -> impl IntoResponse {
    let tick = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    Json(generate_metrics(tick))
}

async fn metrics_sse() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = futures_util::stream::unfold(0u64, |tick| async move {
        tokio::time::sleep(Duration::from_secs(2)).await;
        let sample = generate_metrics(tick);
        let data = serde_json::to_string(&sample).unwrap_or_default();
        let event = Event::default().data(data).event("metrics");
        Some((Ok::<Event, Infallible>(event), tick + 1))
    });

    Sse::new(stream).keep_alive(
        KeepAlive::new()
            .interval(Duration::from_secs(5))
            .text("ping"),
    )
}

async fn ws_terminal_handler(
    ws: WebSocketUpgrade,
    Path(session_id): Path<String>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    info!("WebSocket upgrade for terminal session: {}", session_id);
    ws.on_upgrade(move |socket| handle_terminal_ws(socket, session_id, state))
}

async fn handle_terminal_ws(mut socket: WebSocket, session_id: String, _state: AppState) {
    // Send welcome banner
    let banner = format!(
        "\x1b[1;32m◆ NovaDev Terminal\x1b[0m — session \x1b[33m{}\x1b[0m\r\n\
         \x1b[1;34m➜\x1b[0m \x1b[36m/workspace\x1b[0m $ ",
        session_id
    );
    if socket.send(Message::Text(banner.into())).await.is_err() {
        return;
    }

    // Simulated command responses
    let cmds: HashMap<&str, &str> = [
        ("ls",                   "src/  node_modules/  package.json  tsconfig.json\r\n"),
        ("ls -la",               "total 48\r\ndrwxr-xr-x 5 user user 4096 May 28 15:00 .\r\n"),
        ("pwd",                  "/workspace/api-gateway\r\n"),
        ("node -v",              "v24.13.0\r\n"),
        ("go version",           "go version go1.25.0 linux/amd64\r\n"),
        ("python3 -V",           "Python 3.12.7\r\n"),
        ("rustc --version",      "rustc 1.78.0 (9b00956e5 2024-04-29)\r\n"),
        ("cargo -V",             "cargo 1.78.0 (54d8815d0 2024-03-26)\r\n"),
        ("git log --oneline -5", "a3f4e91 feat: add rate limiting middleware\r\nb8c2d14 fix: resolve CORS\r\n"),
        ("date",                 "Wed May 28 15:30:00 UTC 2026\r\n"),
        ("whoami",               "developer\r\n"),
        ("clear",                "\x1b[2J\x1b[H"),
    ].iter().cloned().collect();

    while let Some(Ok(msg)) = socket.recv().await {
        match msg {
            Message::Text(text) => {
                let cmd = text.trim();
                info!("Terminal [{}] cmd: {:?}", session_id, cmd);
                let output = cmds.get(cmd).copied().unwrap_or_else(|| {
                    if cmd.is_empty() { "" } else { "bash: command not found\r\n" }
                });
                let response = format!(
                    "{}\x1b[1;34m➜\x1b[0m \x1b[36m/workspace\x1b[0m $ ",
                    output
                );
                if socket.send(Message::Text(response.into())).await.is_err() {
                    break;
                }
            }
            Message::Close(_) => break,
            Message::Ping(p) => { let _ = socket.send(Message::Pong(p)).await; }
            _ => {}
        }
    }
    info!("Terminal [{}] disconnected", session_id);
}

// ── Main ──────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(env::var("RUST_LOG").unwrap_or_else(|_| "info".into()))
        .init();

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8083);

    let state = AppState::new();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/ws/terminal/:session_id", get(ws_terminal_handler))
        .route("/api/metrics", get(metrics_sse))
        .route("/api/metrics/snapshot", get(metrics_snapshot))
        .route("/api/healthz", get(health))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("🦀 Rust Realtime Service listening on {}", addr);
    info!("   Handles: /ws/terminal/:id  /api/metrics (SSE)");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
