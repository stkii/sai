mod cache;
mod dto;
mod features;
mod presentation;
mod usecase;

pub(crate) use features::{
    analysis,
    data,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    presentation::attach_handlers(tauri::Builder::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("sai".to_string()),
                    },
                ))
                .level(log::LevelFilter::Info)
                .max_file_size(50_000 /* bytes */)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
