pub mod analysis;
pub mod data;
pub mod excel;
pub mod export;

#[macro_export]
macro_rules! commands_handler {
    () => {
        tauri::generate_handler![$crate::commands::analysis::build_numeric_dataset,
                                 $crate::commands::analysis::run_analysis,
                                 $crate::commands::data::get_sheets,
                                 $crate::commands::data::parse_table,
                                 $crate::commands::excel::get_excel_sheets,
                                 $crate::commands::excel::parse_excel,
                                 $crate::commands::export::export_analysis_to_xlsx,]
    };
}
