import { Box } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export function VerticalSplitter({ onResize }: { onResize: (clientX: number) => void }) {
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

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      width="4px"
      flexShrink={0}
      cursor="col-resize"
      bg="gray.100"
      _hover={{ bg: 'blue.300' }}
      _active={{ bg: 'blue.400' }}
      onMouseDown={onDown}
    />
  );
}
