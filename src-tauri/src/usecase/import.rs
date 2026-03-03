mod csv;
mod numeric;
mod utils;
mod xlsx;

mod api;
pub(crate) use api::{
    build_numeric_dataset,
    get_sheets,
    get_xlsx_sheets,
    parse_table,
};
pub(crate) use utils::DataSourceKind;
