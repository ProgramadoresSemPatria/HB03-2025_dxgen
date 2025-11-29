import { Box, Text } from "ink";
import { type FC, type PropsWithChildren } from "react";
import { colors, spacing } from "../../theme";

interface CardProps {
  title?: string;
  borderColor?: string;
}

export const Card: FC<PropsWithChildren<CardProps>> = ({
  title,
  children,
  borderColor = colors.primary,
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={spacing.sm}
      paddingY={spacing.xs}
    >
      {title && (
        <Box marginBottom={1}>
          <Text bold color={borderColor}>
            {title}
          </Text>
        </Box>
      )}
      {children}
    </Box>
  );
};
