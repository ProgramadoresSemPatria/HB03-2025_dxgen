import { Box, Text, useInput } from "ink";
import React, { type FC, useState } from "react";
import { colors, icons } from "../../theme.js";

interface ConfirmProps {
  label: string;
  defaultValue?: boolean;
  onConfirm: (value: boolean) => void;
}

export const Confirm: FC<ConfirmProps> = ({
  label,
  defaultValue = true,
  onConfirm,
}) => {
  const [value, setValue] = useState(defaultValue);

  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      setValue(true);
      onConfirm(true);
    } else if (input === "n" || input === "N") {
      setValue(false);
      onConfirm(false);
    } else if (key.leftArrow || key.rightArrow) {
      setValue((prev) => !prev);
    } else if (key.return) {
      onConfirm(value);
    }
  });

  return (
    <Box flexDirection="column" gap={0}>
      <Text color={colors.primary}>
        {icons.check} {label}
      </Text>
      <Box gap={2}>
        <Text
          color={value ? colors.success : colors.muted}
          bold={value}
          inverse={value}
        >
          {" Yes "}
        </Text>
        <Text
          color={!value ? colors.error : colors.muted}
          bold={!value}
          inverse={!value}
        >
          {" No "}
        </Text>
        <Text color={colors.muted} dimColor>
          (y/n or arrows + enter)
        </Text>
      </Box>
    </Box>
  );
};
