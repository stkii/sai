import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  onClick: () => void;
  colorPalette?: ButtonProps['colorPalette'];
  disabled?: boolean;
  loading?: boolean;
  spinner?: ReactNode;
  variant?: ButtonProps['variant'];
}

const BaseButton = ({ label, onClick, colorPalette, disabled, loading, spinner, variant }: Props) => {
  return (
    <Button
      onClick={onClick}
      colorPalette={colorPalette}
      variant={variant}
      disabled={disabled}
      loading={loading}
      spinner={spinner}
    >
      {label}
    </Button>
  );
};

export default BaseButton;
