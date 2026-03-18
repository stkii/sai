use serde_json::Value;

use crate::domain::analysis::error::{
    AnalysisErrorKind,
    classified_error,
};
use crate::domain::analysis::method::Method;
use crate::domain::analysis::model::AnalysisResult;
use crate::domain::input::table::ParsedDataTable;

#[tauri::command]
pub fn run_power_analysis(state: tauri::State<'_, crate::bootstrap::state::AppState>,
                          options: Option<Value>)
                          -> Result<ParsedDataTable, String> {
    log::info!("analysis.run_power_analysis start");

    let result = state.analysis_service
                      .run_standalone_analysis(Method::POWER, options)
                      .map_err(|e| {
                          log::error!("analysis.run_power_analysis failed err={}", e);
                          e
                      })?;

    let table = extract_table(result.result).map_err(|e| {
                                                log::error!("analysis.run_power_analysis failed err={}", e);
                                                e
                                            })?;

    log::info!("analysis.run_power_analysis ok headers={} rows={}",
               table.headers.len(),
               table.rows.len());
    Ok(table)
}

fn extract_table(result: AnalysisResult) -> Result<ParsedDataTable, String> {
    match result {
        AnalysisResult::Table { table } => Ok(table),
        _ => Err(classified_error(AnalysisErrorKind::InvalidAnalysisResult,
                                  "power analysis must return a table result")),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use crate::domain::analysis::model::{
        AnalysisResult,
        FactorResult,
    };
    use crate::domain::input::table::ParsedDataTable;

    use super::extract_table;

    fn table(headers: &[&str],
             rows: Vec<Vec<Value>>)
             -> ParsedDataTable {
        ParsedDataTable { headers: headers.iter().map(|v| v.to_string()).collect(),
                          rows,
                          note: None,
                          title: None }
    }

    #[test]
    fn extract_table_accepts_table_result() {
        let result = AnalysisResult::Table { table: table(&["x"], vec![vec![1.into()]]) };

        let extracted = extract_table(result).expect("table result should be accepted");
        assert_eq!(extracted.headers, vec!["x".to_string()]);
        assert_eq!(extracted.rows.len(), 1);
    }

    #[test]
    fn extract_table_rejects_non_table_result() {
        let result =
            AnalysisResult::Factor { factor: Box::new(FactorResult { eigen: table(&["x"], vec![vec![1.into()]]),
                                                            pattern: table(&["x"],
                                                                           vec![vec![1.into()]]),
                                                            rotmat: Some(table(&["x"], vec![vec![1.into()]])),
                                                            structure: None,
                                                            phi: None,
                                                            scree_plot: None }) };

        let error = extract_table(result).expect_err("non-table result should be rejected");
        assert!(error.contains("power analysis must return a table result"));
    }
}
