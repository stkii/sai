import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

type Props = {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  label: ReactNode;
  title?: string;
  className?: string;
  widthGroup?: string; // グループ名ごとに最大幅を管理する
};

// グループごとの最大幅と通知先を管理
type GroupInfo = { width: number; subs: Set<() => void> };
const groupRegistry: Map<string, GroupInfo> = new Map();

const BaseButton: FC<Props> = ({ onClick, disabled, label, title, className, widthGroup }) => {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [groupWidth, setGroupWidth] = useState<number | null>(null);

  // ボタンの自然な幅を測定
  useLayoutEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const prevWidth = el.style.width;
    el.style.width = 'auto';
    const rect = el.getBoundingClientRect();
    setNaturalWidth(rect.width);
    el.style.width = prevWidth;
  }, [label]);

  // グループ内での幅を同期
  useEffect(() => {
    if (!widthGroup) return;
    const info = groupRegistry.get(widthGroup) ?? { width: 0, subs: new Set() };
    groupRegistry.set(widthGroup, info);
    const notify = () => setGroupWidth(info.width);
    info.subs.add(notify);

    // このボタンの幅がグループ最大なら全体に通知
    if (naturalWidth && naturalWidth > info.width) {
      info.width = naturalWidth;
      info.subs.forEach((fn) => fn());
    } else if (info.width > 0) {
      setGroupWidth(info.width);
    }

    return () => {
      info.subs.delete(notify);
      if (info.subs.size === 0) {
        groupRegistry.delete(widthGroup);
      }
    };
  }, [widthGroup, naturalWidth]);

  const style = useMemo(() => {
    const s: React.CSSProperties = { whiteSpace: 'nowrap' };
    if (widthGroup && groupWidth && groupWidth > 0) {
      s.width = `${groupWidth}px`;
    }
    return s;
  }, [widthGroup, groupWidth]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={['bg-white border border-gray-300 px-3 py-1.5 rounded-md', className || '']
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {label}
    </button>
  );
};

export default BaseButton;
