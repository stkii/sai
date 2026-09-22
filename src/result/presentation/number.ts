/** 有効数字。R の .FmtNum と同じ桁数で、切り替えた前後で表示が変わらないようにする。 */
const SIGNIFICANT_DIGITS = 4;

/**
 * これを下回ると固定小数点では 0.0000001234 のようになり桁が読めないため、
 * 指数表記へ切り替える。逆に大きな値は指数表記にすると桁が読めず、同じ列の
 * 他の値とも比べられないので固定小数点のままにする。
 */
const SMALL_MAGNITUDE = 1e-4;

/** 値がないことの表示。0 や空欄と見分けが付く記号にする。 */
export const ABSENT = '—';

/** 表示用の数値整形。値がないことは ABSENT で表し、0 で代用しない。 */
export function formatStatistic(value: number | null | undefined): string {
  if (value === null || value === undefined) return ABSENT;
  if (value === 0) return '0';
  if (Math.abs(value) < SMALL_MAGNITUDE) return exponential(value);
  return fixed(value);
}

/** 件数など、丸めてはいけない整数。 */
export function formatCount(value: number): string {
  return String(value);
}

function fixed(value: number): string {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const decimals = Math.max(0, SIGNIFICANT_DIGITS - 1 - exponent);
  return trimTrailingZeros(value.toFixed(decimals));
}

function exponential(value: number): string {
  // 指数部を 2 桁に揃える。1e-5 と 1e-12 が同じ幅で並ぶ。
  return value.toExponential(SIGNIFICANT_DIGITS - 1).replace(/e([+-])(\d)$/, 'e$10$2');
}

function trimTrailingZeros(text: string): string {
  if (!text.includes('.')) return text;
  return text.replace(/\.?0+$/, '');
}
