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
# Extra arguments are additional source files.
function(sai_add_test name source)
    add_executable(${name} ${source} ${ARGN})
    target_link_libraries(${name} PRIVATE sai::sai GTest::gtest_main)
    gtest_discover_tests(${name})
endfunction()

sai_add_test(data_view_test unit/data_view_test.cpp)
sai_add_test(diagnostic_test unit/diagnostic_test.cpp)
sai_add_test(c_compatibility_test unit/c_compatibility_test.cpp)
