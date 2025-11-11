import { useEffect, useState } from 'react';

type Options = {
  sampleRowsMax?: number;
  min?: number;
  max?: number;
  round?: number;
  defaultWidth?: number;
  fudge?: number;
};

function roundTo(n: number, step: number) {
  return Math.max(step, Math.round(n / step) * step);
}

export function useMeasuredColumnWidth(
  headers: Array<string>,
  rows: Array<Array<unknown>>,
  opts: Options = {}
) {
  const { sampleRowsMax = 200, min = 120, max = 280, round = 8, defaultWidth = 160, fudge = 12 } = opts;
  const [width, setWidth] = useState<number>(defaultWidth);

  useEffect(() => {
    let container: HTMLDivElement | null = null;
    try {
      const doc = document;
      container = doc.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.visibility = 'hidden';
      container.style.whiteSpace = 'nowrap';
      container.style.pointerEvents = 'none';
      doc.body.appendChild(container);

      let maxWidth = 0;
      const cellClass = 'px-2.5 py-1 text-sm';

      const appendMeasure = (text: string) => {
        const el = doc.createElement('div');
        el.className = cellClass;
        el.textContent = text;
        container?.appendChild(el);
        const w = el.getBoundingClientRect().width;
        if (w > maxWidth) maxWidth = w;
      };

      for (const h of headers) appendMeasure(String(h ?? ''));
      const sampleCount = Math.min(sampleRowsMax, rows.length);
      for (let i = 0; i < sampleCount; i++) {
        const r = rows[i] ?? [];
        for (let j = 0; j < r.length; j++) {
          const v = r[j];
          appendMeasure(v == null ? '' : String(v));
        }
      }

      // 余白・ボーダー相当のバッファ
      const finalWidth = Math.min(max, Math.max(min, roundTo(maxWidth + fudge, round)));
      setWidth(finalWidth);
    } catch {
      // 失敗時は既定値のまま
    } finally {
      if (container?.parentNode) container.parentNode.removeChild(container);
    }
    // headers・サンプル行・パラメータが変わった時に再測定
  }, [sampleRowsMax, min, max, round, headers, rows, fudge]);

  return width;
}
