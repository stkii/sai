import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * useInView
 *
 * 目的: DOM要素がビューポート（または指定root）内に入ったかを検知する再利用可能なロジック。
 * 引数:
 * - root: 交差判定の基準となる要素/Document/未指定(null/undefined)
 * - rootMargin: CSSのmargin指定形式（例: '0px', '600px 0px'）
 * - threshold: 0..1 もしくは閾値配列
 * - once: trueなら一度でも可視になった時点で監視を停止
 * 返り値:
 * - ref: 監視対象にアタッチするref
 * - inView: 可視ならtrue
 * フォールバック:
 * - IntersectionObserverが未定義の環境では即座にinView=trueを返す（SSR/テスト/Tauri以外の互換性確保）
 */
export function useInView<T extends Element>(
  params: {
    root?: Element | Document | null;
    rootMargin?: string;
    threshold?: number | number[];
    once?: boolean;
  } = {}
) {
  const { root = null, rootMargin = '0px', threshold = 0, once = false } = params;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  const supportsIO = typeof IntersectionObserver !== 'undefined';

  const ioInit = useMemo<IntersectionObserverInit>(
    () => ({ root: (root as Element | null) ?? null, rootMargin, threshold }),
    [root, rootMargin, threshold]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!supportsIO) {
      // 環境フォールバック: 監視できない環境では可視扱いにする
      setInView(true);
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const visible = e.isIntersecting;
        if (visible) setInView(true);
        else if (!once) setInView(false);
        if (visible && once) {
          obs.disconnect();
        }
      }
    }, ioInit);

    obs.observe(el);
    return () => obs.disconnect();
  }, [ioInit, once, supportsIO]);

  return { ref, inView } as const;
}
