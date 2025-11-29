import { Box, Text } from "ink";
import type { FC } from "react";
import { colors, icons } from "../../theme";

interface UsageStatsProps {
  used: number;
  limit: number;
  daysUntilReset: number;
}

export const UsageStats: FC<UsageStatsProps> = ({
  used,
  limit,
  daysUntilReset,
}) => {
  const remaining = limit - used;
  const percentage = (used / limit) * 100;

  const getProgressBar = (pct: number): string => {
    const filled = Math.round(pct / 5);
    const empty = 20 - filled;
    return `[${"=".repeat(filled)}${" ".repeat(empty)}]`;
  };

  const getProgressColor = (pct: number): string => {
    if (pct >= 90) return colors.error;
    if (pct >= 75) return colors.warning;
    return colors.success;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.info}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1}>
        <Text bold color={colors.info}>
          {icons.chart} Usage Statistics
        </Text>
      </Box>

      <Box flexDirection="column" gap={0}>
        <Box>
          <Text color={colors.muted}>Docs generated: </Text>
          <Text>
            {used}/{limit}
          </Text>
          <Text color={colors.muted}> this month</Text>
        </Box>

        <Box>
          <Text color={getProgressColor(percentage)}>{getProgressBar(percentage)}</Text>
          <Text color={colors.muted}> {percentage.toFixed(0)}%</Text>
        </Box>

        <Box>
          <Text color={colors.muted}>Remaining: </Text>
          <Text color={remaining <= 5 ? colors.warning : colors.text}>
            {remaining} docs
          </Text>
        </Box>

        <Box>
          <Text color={colors.muted}>Resets in: </Text>
          <Text>{daysUntilReset} days</Text>
        </Box>
      </Box>

      {percentage >= 90 && (
        <Box marginTop={1} flexDirection="column">
          <Text color={colors.warning}>{icons.warning} Approaching monthly limit!</Text>
          <Text color={colors.info}>
            {icons.rocket} Upgrade to Pro: https://dxgen.io/pricing
          </Text>
        </Box>
      )}

      {percentage >= 75 && percentage < 90 && (
        <Box marginTop={1}>
          <Text color={colors.warning}>
            {icons.tip} 75% of monthly limit used
          </Text>
        </Box>
      )}
    </Box>
  );
};
