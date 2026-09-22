include(FetchContent)

# Pinned by release archive and checksum rather than by branch, so the same
# sources are used on every machine and in CI. Verify the checksum when
# raising the version. Set FETCHCONTENT_SOURCE_DIR_GOOGLETEST to build
# against a local copy without network access.
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.18.0.tar.gz
    URL_HASH SHA256=6e3191c1455468b3fc35a417fb565c1c5071aee1b7e7f85e30cf48a98d37d8b5
    # Treat GoogleTest headers as system headers, so this project's warning
    # set does not report findings in code it does not own.
    SYSTEM
)

# GoogleMock is not used, and GoogleTest must not be part of an install.
set(BUILD_GMOCK OFF)
set(INSTALL_GTEST OFF)
FetchContent_MakeAvailable(googletest)

include(GoogleTest)

# Register one test executable. Each TEST() inside it becomes a separate CTest
# entry, so a failure names the case rather than the whole binary.
#
# The remaining arguments are the targets under test. They are named per test
# instead of fixed, so a test that reaches the engine through the C adapter
# does not also link the engine directly and put it on the link line twice.
function(sai_add_test name source)
    add_executable(${name} ${source})
    target_link_libraries(${name} PRIVATE GTest::gtest_main ${ARGN})
    gtest_discover_tests(${name})
endfunction()

# Shared by tests that read stored reference values or compare doubles. A
# library rather than extra sources per test, so the comparison defined in
# docs/NUMERICAL_POLICY.md has one implementation for every method. It carries
# sai::sai so the fixture mask uses the engine's own encoding; a test that
# names this target must not name sai::sai as well.
add_library(sai_test_support STATIC
    support/fixture.cpp
    support/tolerance.cpp
)
add_library(sai::test_support ALIAS sai_test_support)

target_include_directories(sai_test_support PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(sai_test_support
    PUBLIC sai::compile_options sai::sai GTest::gtest
)
# The fixtures are read from the source tree rather than copied next to the
# binary, so a regenerated reference value takes effect without reconfiguring.
target_compile_definitions(sai_test_support
    PRIVATE SAI_FIXTURE_DIR="${CMAKE_CURRENT_SOURCE_DIR}/fixtures"
)

sai_add_test(data_view_test unit/data_view_test.cpp sai::sai)
sai_add_test(diagnostic_test unit/diagnostic_test.cpp sai::sai)

# The C boundary has two tests: one for the structures the adapter declares,
# one for the functions it exports. The first also names sai::sai, because it
# reads the C++ types the structures mirror.
sai_add_test(c_compatibility_test unit/c_compatibility_test.cpp sai::c_api sai::sai)
sai_add_test(c_api_test integration/c_api_test.cpp sai::c_api)

sai_add_test(tolerance_test unit/tolerance_test.cpp sai::test_support)

# Step 8 adds the comparison against these values; this one checks that they
# load and that the loader rejects a damaged file.
sai_add_test(descriptive_fixture_test reference/descriptive_fixture_test.cpp sai::test_support)
