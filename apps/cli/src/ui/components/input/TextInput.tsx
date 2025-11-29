import { Box, Text } from "ink";
import InkTextInput from "ink-text-input";
import React, { type FC, useState } from "react";
import { colors, icons } from "../../theme.js";

interface TextInputProps {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
}

export const TextInput: FC<TextInputProps> = ({
  label,
  placeholder = "",
  defaultValue = "",
  onSubmit,
}) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <Box flexDirection="column" gap={0}>
      <Text color={colors.primary}>
        {icons.edit} {label}
      </Text>
      <Box>
        <Text color={colors.muted}>{"> "}</Text>
        <InkTextInput
          value={value}
          onChange={setValue}
          onSubmit={onSubmit}
          placeholder={placeholder}
        />
      </Box>
    </Box>
  );
};
