import { Box, Text } from "ink";
import type { FC, ReactNode } from "react";
import { colors, icons } from "../../theme";

type MessageType = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  type: MessageType;
  children: ReactNode;
  hint?: string;
}

const typeConfig: Record<MessageType, { icon: string; color: string }> = {
  success: { icon: icons.success, color: colors.success },
  error: { icon: icons.error, color: colors.error },
  warning: { icon: icons.warning, color: colors.warning },
  info: { icon: icons.info, color: colors.info },
};

export const StatusMessage: FC<StatusMessageProps> = ({
  type,
  children,
  hint,
}) => {
  const config = typeConfig[type];

  return (
    <Box flexDirection="column">
      <Text color={config.color}>
        {config.icon} {children as string}
      </Text>
      {hint && (
        <Text color={colors.muted} dimColor>
          {icons.tip} {hint}
        </Text>
      )}
    </Box>
  );
};
