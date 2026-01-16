import { Checkbox } from '@chakra-ui/react';

const CheckBoxOptions = () => {
  return (
    <Checkbox.Root>
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>Accept terms and conditions</Checkbox.Label>
    </Checkbox.Root>
  );
};

export default CheckBoxOptions;
