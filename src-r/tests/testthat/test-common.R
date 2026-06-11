# common.R の共通ヘルパのテスト

test_that(".Stars は有意水準ごとに正しい星印を返す", {
  expect_identical(.Stars(0.0005), "***")
  expect_identical(.Stars(0.005), "**")
  expect_identical(.Stars(0.03), "*")
  expect_identical(.Stars(0.1), "")
})

test_that(".Stars は境界値で星を付けない (p < 閾値の厳密判定)", {
  expect_identical(.Stars(0.001), "**")
  expect_identical(.Stars(0.01), "*")
  expect_identical(.Stars(0.05), "")
})

test_that(".FmtP は p 値を3桁固定で整形し、p < .001 は < 0.001 を返す", {
  expect_identical(.FmtP(0.0004), "< 0.001")
  expect_identical(.FmtP(0.001), "0.001")
  expect_identical(.FmtP(0.02658), "0.027")
  expect_identical(.FmtP(0.8101), "0.810")
  expect_identical(.FmtP(NA), "NA")
  expect_identical(.FmtP(NULL), "NA")
})

test_that(".FmtP は丸めが星と矛盾して見える境界では表示桁を増やす", {
  expect_identical(.FmtP(0.0497), "0.0497") # 3桁だと "0.050" + * で矛盾
  expect_identical(.FmtP(0.0099), "0.0099") # 3桁だと "0.010" + ** で矛盾
  expect_identical(.FmtP(0.05), "0.050") # 星なしなので 3桁のまま
  expect_identical(.FmtP(0.01), "0.010") # * (p < .05) と "0.010" は矛盾しない
  expect_identical(.FmtP(0.011), "0.011")
})

test_that(".Stars は NA / NULL / 空ベクトルで空文字を返す", {
  expect_identical(.Stars(NA), "")
  expect_identical(.Stars(NULL), "")
  expect_identical(.Stars(numeric(0)), "")
})
