use std::collections::HashMap;
use std::sync::atomic::{
    AtomicU64,
    Ordering,
};
use std::sync::{
    Mutex,
    OnceLock,
};
use std::time::{
    Duration,
    Instant,
    SystemTime,
    UNIX_EPOCH,
};

static STORE: OnceLock<Mutex<HashMap<String, (Instant, serde_json::Value)>>> = OnceLock::new();
static COUNTER: AtomicU64 = AtomicU64::new(1);

fn now_instant() -> Instant {
    Instant::now()
}

fn default_store() -> &'static Mutex<HashMap<String, (Instant, serde_json::Value)>> {
    STORE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn gen_token() -> String {
    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let ct = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("{:x}-{:x}-{:x}", ts.as_secs(), ts.subsec_nanos(), ct)
}

pub fn issue(
    value: serde_json::Value,
    ttl: Duration,
) -> String {
    let token = gen_token();
    let deadline = now_instant() + ttl;
    let mut map = default_store().lock().expect("temp store mutex poisoned");
    map.insert(token.clone(), (deadline, value));
    token
}

pub fn consume(token: &str) -> Result<serde_json::Value, String> {
    let mut map = default_store()
        .lock()
        .map_err(|_| "temp store lock error".to_string())?;
    let Some((deadline, val)) = map.remove(token) else {
        return Err("指定されたトークンは存在しません".to_string());
    };
    if now_instant() > deadline {
        return Err("トークンの有効期限が切れています".to_string());
    }
    Ok(val)
}
