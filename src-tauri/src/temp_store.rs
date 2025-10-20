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

const MAX_ENTRIES: usize = 1000;

#[derive(Clone)]
struct Entry {
    deadline: Instant,
    last_access: Instant,
    value: serde_json::Value,
}

static STORE: OnceLock<Mutex<HashMap<String, Entry>>> = OnceLock::new();
static COUNTER: AtomicU64 = AtomicU64::new(1);

fn now_instant() -> Instant {
    Instant::now()
}

fn default_store() -> &'static Mutex<HashMap<String, Entry>> {
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
    // 期限切れの掃除と上限超過対策
    cleanup_expired_and_evict();
    let token = gen_token();
    let deadline = now_instant() + ttl;
    let mut map = default_store().lock().expect("temp store mutex poisoned");
    map.insert(
        token.clone(),
        Entry {
            deadline,
            last_access: now_instant(),
            value,
        },
    );
    token
}

pub fn consume(token: &str) -> Result<serde_json::Value, String> {
    // 試行前に期限切れを掃除
    cleanup_expired_and_evict();
    let mut map = default_store()
        .lock()
        .map_err(|_| "temp store lock error".to_string())?;
    let Some(entry) = map.remove(token) else {
        return Err("指定されたトークンは存在しません".to_string());
    };
    if now_instant() > entry.deadline {
        return Err("トークンの有効期限が切れています".to_string());
    }
    Ok(entry.value)
}

fn cleanup_expired_and_evict() {
    if let Ok(mut map) = default_store().lock() {
        // 期限切れを削除
        let now = now_instant();
        map.retain(|_, e| e.deadline > now);

        // 上限超過なら LRU で削除
        if map.len() > MAX_ENTRIES {
            // 収まるまで古い順に削除
            let mut items: Vec<(String, Instant)> =
                map.iter().map(|(k, v)| (k.clone(), v.last_access)).collect();
            items.sort_by_key(|(_, ts)| *ts);
            let mut to_remove = map.len() - MAX_ENTRIES;
            for (k, _) in items.into_iter() {
                if to_remove == 0 {
                    break;
                }
                map.remove(&k);
                to_remove -= 1;
            }
        }
    }
}
