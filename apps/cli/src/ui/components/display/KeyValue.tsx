import { Box, Text } from "ink";
import type { FC } from "react";
import { colors } from "../../theme";

interface KeyValueProps {
  label: string;
  value: string;
  icon?: string;
  valueColor?: string;
}

export const KeyValue: FC<KeyValueProps> = ({
  label,
  value,
  icon,
  valueColor = colors.text,
}) => {
  return (
    <Box>
      {icon && <Text>{icon} </Text>}
      <Text color={colors.muted}>{label}: </Text>
      <Text color={valueColor}>{value}</Text>
    </Box>
  );
};
