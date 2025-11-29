import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import type { FC } from "react";
import { colors, icons } from "../../theme";

type SpinnerStatus = "loading" | "success" | "error";

interface SpinnerProps {
  message: string;
  status?: SpinnerStatus;
}

export const Spinner: FC<SpinnerProps> = ({ message, status = "loading" }) => {
  if (status === "success") {
    return (
      <Text color={colors.success}>
        {icons.success} {message}
      </Text>
    );
  }

  if (status === "error") {
    return (
      <Text color={colors.error}>
        {icons.error} {message}
      </Text>
    );
  }

  return (
    <Box>
      <Text color={colors.primary}>
        <InkSpinner type="dots" />
      </Text>
      <Text> {message}</Text>
    </Box>
  );
};
