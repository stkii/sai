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
            commands::append_analysis_log,
            commands::build_numeric_dataset,
            commands::consume_result_token,
            commands::get_excel_sheets,
            commands::issue_result_token,
            commands::open_or_reuse_window,
            commands::parse_excel,
            commands::run_r_analysis_with_dataset,
            commands::save_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
