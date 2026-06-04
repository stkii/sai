mod bootstrap;
mod commands;
mod infra;
mod models;
mod services;

use tauri::Manager;

use bootstrap::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default().plugin(tauri_plugin_log::Builder::new().build())
                             .plugin(tauri_plugin_dialog::init())
                             .plugin(tauri_plugin_opener::init())
                             .setup(|app| {
                                 let data_dir =
                                     app.path()
                                        .app_local_data_dir()
                                        .map_err(|e| format!("ローカルデータディレクトリの解決失敗: {e}"))?;
                                 let history_path = data_dir.join("history.jsonl");
                                 app.manage(AppState::new(history_path));
                                 Ok(())
                             })
                             .invoke_handler(tauri::generate_handler![commands::dataset::get_sheets,
                                                                      commands::dataset::load_dataset,
                                                                      commands::analysis::run_analysis,
                                                                      commands::history::load_history,
                                                                      commands::history::append_history,
                                                                      commands::history::clear_history,
                                                                      commands::history::remove_history,])
                             .run(tauri::generate_context!())
                             .expect("error while running tauri application");
}
