mod commands;
mod dto;
mod excel;
mod r;
mod temp_store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::build_numeric_dataset,
            commands::get_excel_sheets,
            commands::open_or_reuse_window,
            commands::parse_excel,
            commands::run_r_analysis_with_dataset,
            commands::issue_result_token,
            commands::consume_result_token,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
