pub mod analysis;
pub mod analysis_log;
pub mod excel;

#[macro_export]
macro_rules! commands_handler {
    () => {
        tauri::generate_handler![$crate::commands::analysis::build_numeric_dataset,
                                 $crate::commands::analysis::run_analysis,
                                 $crate::commands::excel::get_excel_sheets,
                                 $crate::commands::excel::parse_excel,]
    };
}
