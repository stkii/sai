cmake_minimum_required(VERSION 3.25)

project(sai
    VERSION 0.1.0
    DESCRIPTION "Statistical analysis engine for SAI"
    LANGUAGES CXX
)

# Tests are built when sai is the top-level project, not when it is embedded
# in another build such as crates/sai-engine/build.rs.
option(SAI_BUILD_TESTS "Build the test suite" ${PROJECT_IS_TOP_LEVEL})
set(SAI_SANITIZERS "" CACHE STRING
    "Semicolon-separated sanitizer names, for example address;undefined"
)

# Request the standard without GNU extensions, so the same dialect is used
# regardless of the compiler that builds the engine.
set(CMAKE_CXX_EXTENSIONS OFF)

# Every target in this project links this, so the language standard, the
# warning set and the sanitizer selection cannot differ between targets.
# CMAKE_COMPILE_WARNING_AS_ERROR is applied by CMake itself and is set per
# preset, so it is deliberately absent here.
add_library(sai_compile_options INTERFACE)
add_library(sai::compile_options ALIAS sai_compile_options)

target_compile_features(sai_compile_options INTERFACE cxx_std_20)

# The second group enforces rules that would otherwise only exist as prose in
# docs/NUMERICAL_POLICY.md and CLAUDE.md. A rule the compiler can check does not
# need a reader to check it.
target_compile_options(sai_compile_options INTERFACE
    $<$<COMPILE_LANG_AND_ID:CXX,AppleClang,Clang,GNU>:
        -Wall
        -Wextra
        -Wpedantic
        -Wconversion
        -Wshadow

        # Floating point values must not be compared with == or !=.
        -Wfloat-equal
        # No C-style casts.
        -Wold-style-cast
        # nullptr, never NULL or a literal 0.
        -Wzero-as-null-pointer-constant
        # override on every overriding function.
        -Wsuggest-override
        # Catches float reaching an interface that works in double.
        -Wdouble-promotion
        # A base class deleted through a base pointer needs a virtual destructor.
        -Wnon-virtual-dtor
    >
    $<$<COMPILE_LANG_AND_ID:CXX,MSVC>:
        /W4
        /permissive-
    >
)

# Fast-math lets the compiler assume no NaN or infinity exists and reassociate
# arithmetic. Both assumptions are false here: finiteness is checked explicitly
# and summation order is chosen to limit cancellation. Configuring with such a
# flag is a mistake rather than a preference, so it stops the build.
foreach(sai_flag_var IN ITEMS
    CMAKE_CXX_FLAGS
    CMAKE_CXX_FLAGS_DEBUG
    CMAKE_CXX_FLAGS_RELEASE
    CMAKE_CXX_FLAGS_RELWITHDEBINFO
    CMAKE_CXX_FLAGS_MINSIZEREL
)
    if(${sai_flag_var} MATCHES "fast-math|-Ofast|/fp:fast")
        message(FATAL_ERROR
            "${sai_flag_var} contains a fast-math option: ${${sai_flag_var}}. "
            "See docs/NUMERICAL_POLICY.md."
        )
    endif()
endforeach()

if(SAI_SANITIZERS)
    if(MSVC)
        message(FATAL_ERROR "SAI_SANITIZERS is only supported for Clang and GCC")
    endif()
    # -fsanitize takes a comma-separated list; the cache variable is a CMake list.
    list(JOIN SAI_SANITIZERS "," sai_sanitizer_list)
    target_compile_options(sai_compile_options INTERFACE
        -fsanitize=${sai_sanitizer_list}
        # UndefinedBehaviorSanitizer only prints and continues by default, which
        # would let a test report success after undefined behaviour was found.
        -fno-sanitize-recover=all
        # Keep frame pointers so sanitizer reports carry a usable stack trace.
        -fno-omit-frame-pointer
    )
    target_link_options(sai_compile_options INTERFACE -fsanitize=${sai_sanitizer_list})
    message(STATUS "Sanitizers enabled: ${sai_sanitizer_list}")
endif()

# The engine library. Declarations callers depend on live in include/sai/,
# implementation and private headers in src/; see docs/ARCHITECTURE.md. Both
# directories are include roots, so a header is always reached by the path it
# has in the tree rather than relative to the file that includes it.
add_library(sai
    src/core/data_view.cpp
)
add_library(sai::sai ALIAS sai)

target_include_directories(sai
    PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src
)
target_link_libraries(sai PUBLIC sai::compile_options)

# The C ABI adapter. A separate target rather than more sources in sai, so that
# src/ stays private to the engine and the adapter can only reach it through
# include/sai/. It converts representations and passes errors across; the
# statistical rules stay behind the public API. See docs/ARCHITECTURE.md.
add_library(sai_c_api
    adapters/c_api/src/sai_c.cpp
)
add_library(sai::c_api ALIAS sai_c_api)

target_include_directories(sai_c_api
    PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/adapters/c_api/include
)
target_link_libraries(sai_c_api
    PUBLIC sai::compile_options
    PRIVATE sai::sai
)

if(SAI_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
