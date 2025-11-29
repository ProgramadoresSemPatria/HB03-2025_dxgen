import { existsSync } from "node:fs";
import { Box, Text, useApp } from "ink";
import React, { useEffect, useState } from "react";
import { getSessionFilePath } from "../../lib/auth/session.js";
import { supabase } from "../../lib/supabase.js";
import { checkUsageLimits } from "../../lib/usage.js";
import { Card } from "../components/display/Card.js";
import { KeyValue } from "../components/display/KeyValue.js";
import { UsageStats } from "../components/display/UsageStats.js";
import { Spinner } from "../components/feedback/Spinner.js";
import { StatusMessage } from "../components/feedback/StatusMessage.js";
import { colors, icons } from "../theme.js";

type Status = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  status: Status;
  user?: {
    email: string;
    username?: string;
    avatarUrl?: string;
    provider?: string;
  };
  session?: {
    expiresAt: Date | null;
    isExpired: boolean;
  };
  usage?: {
    docsUsed: number;
    limit: number;
    daysUntilReset: number;
  };
  error?: string;
  sessionPath: string;
  sessionExists: boolean;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export const StatusScreen = () => {
  const { exit } = useApp();
  const sessionPath = getSessionFilePath();
  const sessionExists = existsSync(sessionPath);

  const [state, setState] = useState<AuthState>({
    status: "loading",
    sessionPath,
    sessionExists,
  });

  useEffect(() => {
    async function fetchStatus() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: error.message,
          }));
          return;
        }

        if (!session) {
          setState((prev) => ({
            ...prev,
            status: "unauthenticated",
          }));
          return;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: "Session exists but user validation failed",
          }));
          return;
        }

        const expiresAt = session.expires_at
          ? new Date(session.expires_at * 1000)
          : null;
        const isExpired = expiresAt ? expiresAt < new Date() : false;

        let usage: AuthState["usage"] | undefined;
        try {
          const usageStatus = await checkUsageLimits(user.id);
          usage = {
            docsUsed: usageStatus.docs_used,
            limit: usageStatus.limit_value,
            daysUntilReset: usageStatus.days_until_reset,
          };
        } catch {
          // Usage fetch failed, continue without it
        }

        setState((prev) => ({
          ...prev,
          status: "authenticated",
          user: {
            email: user.email || user.id,
            username: user.user_metadata?.user_name,
            avatarUrl: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider,
          },
          session: { expiresAt, isExpired },
          usage,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: (error as Error).message,
        }));
      }
    }

    fetchStatus().then(() => {
      setTimeout(() => exit(), 100);
    });
  }, [exit]);

  if (state.status === "loading") {
    return (
      <Box marginY={1}>
        <Spinner message="Checking authentication status..." />
      </Box>
    );
  }

  if (state.status === "error") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage
          type="error"
          hint='Try running "dxgen logout" and "dxgen login" again'
        >
          {state.error}
        </StatusMessage>
      </Box>
    );
  }

  if (state.status === "unauthenticated") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage type="warning" hint='Run "dxgen login" to authenticate'>
          Not logged in
        </StatusMessage>
      </Box>
    );
  }

  const tokenExpiry = state.session?.expiresAt
    ? state.session.isExpired
      ? "Expired (will auto-refresh on next command)"
      : formatTimeRemaining(state.session.expiresAt.getTime() - Date.now())
    : "Unknown";

  return (
    <Box marginY={1} flexDirection="column" gap={1}>
      <Card title={`${icons.chart} Authentication Status`}>
        <Box flexDirection="column" gap={0}>
          <KeyValue
            icon={icons.success}
            label="Logged in as"
            value={state.user!.email}
          />

          {state.user!.username && (
            <KeyValue
              icon={icons.user}
              label="GitHub username"
              value={state.user!.username}
            />
          )}

          {state.user!.avatarUrl && (
            <KeyValue
              icon="\uD83D\uDDBC\uFE0F"
              label="Avatar"
              value={state.user!.avatarUrl}
            />
          )}

          <Box marginY={1} />

          <KeyValue
            icon={state.session?.isExpired ? icons.warning : icons.clock}
            label="Access token expires in"
            value={tokenExpiry}
            valueColor={state.session?.isExpired ? colors.warning : undefined}
          />

          <KeyValue
            icon={icons.file}
            label="Session file"
            value={state.sessionPath}
          />

          {!state.sessionExists && (
            <Text color={colors.warning}>
              {icons.warning} Warning: Session file not found on disk
            </Text>
          )}

          {state.user!.provider && (
            <KeyValue
              icon={icons.lock}
              label="Auth provider"
              value={state.user!.provider}
            />
          )}
        </Box>
      </Card>

      {state.usage && (
        <UsageStats
          used={state.usage.docsUsed}
          limit={state.usage.limit}
          daysUntilReset={state.usage.daysUntilReset}
        />
      )}
    </Box>
  );
};
