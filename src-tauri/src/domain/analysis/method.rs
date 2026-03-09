use std::str::FromStr;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Method(&'static str);

impl Method {
    pub(crate) const CORRELATION: Self = Self("correlation");
    pub(crate) const DESCRIPTIVE: Self = Self("descriptive");
    pub(crate) const FACTOR: Self = Self("factor");

    pub(crate) fn as_str(self) -> &'static str {
        self.0
    }
}

impl FromStr for Method {
    type Err = String;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        let normalized = value.trim();
        match normalized {
            "correlation" => Ok(Method::CORRELATION),
            "descriptive" => Ok(Method::DESCRIPTIVE),
            "factor" => Ok(Method::FACTOR),
            _ => Err(format!("Unsupported method: {}", value)),
        }
    }
}
