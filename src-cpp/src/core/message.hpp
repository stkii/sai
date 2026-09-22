#pragma once

#include <format>
#include <string>
#include <string_view>

namespace sai::core::detail {

// Every message the engine produces is built here, leaving one site to change
// if a target platform ships without <format>.
//
// vformat rather than format: the arguments are named here and so reach
// make_format_args as lvalues, which both its C++20 and later signatures take.
template <typename... Args>
[[nodiscard]] std::string format_message(std::string_view spec, Args&&... args) {
    return std::vformat(spec, std::make_format_args(args...));
}

// Enough digits to distinguish any two doubles. A rounded value would hide the
// input that caused the failure.
[[nodiscard]] inline std::string format_number(double value) {
    return format_message("{:.17g}", value);
}

}  // namespace sai::core::detail
