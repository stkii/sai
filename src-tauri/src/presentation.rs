mod commands;

pub(crate) fn attach_handlers(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![commands::get_sheets::get_sheets,
                                                    commands::parse_table::parse_table,])
}
