mod commands;

pub(crate) fn attach_handlers(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![commands::build_numeric_dataset::build_numeric_dataset,
                                                    commands::clear_numeric_dataset_cache::clear_numeric_dataset_cache,
                                                    commands::get_sheets::get_sheets,
                                                    commands::parse_table::parse_table,
                                                    commands::run_analysis::run_analysis,])
}
