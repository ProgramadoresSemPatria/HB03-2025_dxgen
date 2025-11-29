import { Box, Text, useApp } from "ink";
import React, { useEffect, useState } from "react";
import { checkAuth, logout } from "../../lib/auth/index.js";
import { getSessionFilePath } from "../../lib/auth/session.js";
import { Spinner } from "../components/feedback/Spinner.js";
import { StatusMessage } from "../components/feedback/StatusMessage.js";
import { colors, icons } from "../theme.js";

type LogoutStatus =
  | "checking"
  | "not_logged_in"
  | "logging_out"
  | "success"
  | "error";

interface LogoutState {
  status: LogoutStatus;
  userEmail?: string;
  sessionPath: string;
  error?: string;
}

export const LogoutScreen = () => {
  const { exit } = useApp();
  const sessionPath = getSessionFilePath();

  const [state, setState] = useState<LogoutState>({
    status: "checking",
    sessionPath,
  });

  useEffect(() => {
    async function performLogout() {
      try {
        // Check if user is logged in
        const user = await checkAuth();

        if (!user) {
          setState((prev) => ({
            ...prev,
            status: "not_logged_in",
          }));
          return;
        }

        // User is logged in, proceed with logout
        setState((prev) => ({
          ...prev,
          status: "logging_out",
          userEmail: user.email || user.id,
        }));

        await logout();

        setState((prev) => ({
          ...prev,
          status: "success",
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: (error as Error).message,
        }));
      }
    }

    performLogout().then(() => {
      setTimeout(() => {
        exit(state.status === "error" ? new Error(state.error) : undefined);
      }, 100);
    });
  }, [exit]);

  if (state.status === "checking") {
    return (
      <Box marginY={1}>
        <Spinner message="Checking session..." />
      </Box>
    );
  }

  if (state.status === "not_logged_in") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage type="info" hint='Run "dxgen login" to authenticate'>
          Not currently logged in
        </StatusMessage>
      </Box>
    );
  }

  if (state.status === "logging_out") {
    return (
      <Box marginY={1}>
        <Spinner message={`Signing out ${state.userEmail}...`} />
      </Box>
    );
  }

  if (state.status === "error") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage type="error">Logout failed: {state.error}</StatusMessage>
      </Box>
    );
  }

  // success
  return (
    <Box marginY={1} flexDirection="column" gap={0}>
      <Text color={colors.success}>
        {icons.wave} Signed out successfully
      </Text>
      <Text color={colors.muted}>
        {icons.trash} Session file removed: {state.sessionPath}
      </Text>
      <Box marginTop={1}>
        <Text color={colors.muted}>
          {icons.tip} Run "dxgen login" to sign in again
        </Text>
      </Box>
    </Box>
  );
};
