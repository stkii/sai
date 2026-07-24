import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

/** 矢印キー 1 回あたりの移動量 (px) */
const NUDGE_STEP = 16;

interface Props {
  /** ドラッグ中のポインタ位置 (clientX) */
  onResize: (clientX: number) => void;
  /** 矢印キーによる相対移動量 (px) */
  onNudge: (delta: number) => void;
  /** 現在の左ペイン幅と可動域。支援技術に現在値を伝えるために使う */
  value: number;
  min: number;
  max: number;
}

export function VerticalSplitter({ onResize, onNudge, value, min, max }: Props) {
  const dragging = useRef(false);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      onResize(e.clientX);
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [onResize]);

  function onDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onNudge(-NUDGE_STEP);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onNudge(NUDGE_STEP);
    }
  }

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label="データペインの幅"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      colorPalette="blue"
      width="4px"
      flexShrink={0}
      cursor="col-resize"
      bg="bg.muted"
      _hover={{ bg: 'colorPalette.emphasized' }}
      _active={{ bg: 'colorPalette.solid' }}
      _focusVisible={{
        bg: 'colorPalette.solid',
        outline: '2px solid',
        outlineColor: 'colorPalette.focusRing',
        outlineOffset: '1px',
      }}
      onMouseDown={onDown}
      onKeyDown={onKeyDown}
    />
  );
}
