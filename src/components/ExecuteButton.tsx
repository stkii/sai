import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface ExecuteButtonProps {
  label: string;
  onClick: () => void;
  colorPalette?: ButtonProps['colorPalette'];
  variant?: ButtonProps['variant'];
  loading?: boolean;
  spinner?: ReactNode;
}

const ExecuteButton = ({ label, onClick, colorPalette, variant, loading, spinner }: ExecuteButtonProps) => {
  return (
    <Button
      onClick={onClick}
      colorPalette={colorPalette}
      variant={variant}
      loading={loading}
      spinner={spinner}
    >
      {label}
    </Button>
  );
};

export default ExecuteButton;
