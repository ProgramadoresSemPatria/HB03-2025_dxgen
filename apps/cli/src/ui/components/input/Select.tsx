import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import React, { type FC } from "react";
import { colors, icons } from "../../theme.js";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
}

export const Select: FC<SelectProps> = ({ label, options, onSelect }) => {
  const handleSelect = (item: SelectOption) => {
    onSelect(item.value);
  };

  return (
    <Box flexDirection="column" gap={0}>
      <Text color={colors.primary}>
        {icons.arrow} {label}
      </Text>
      <Box marginLeft={2}>
        <SelectInput items={options} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};
