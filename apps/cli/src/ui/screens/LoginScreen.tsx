import type { User } from "@supabase/supabase-js";
import { Box, Text, useApp, useInput } from "ink";
import open from "open";
import React, { useEffect, useState } from "react";
import { checkAuth } from "../../lib/auth/index.js";
import { startOAuthServer } from "../../lib/auth/oauth-server.js";
import { getSessionFilePath } from "../../lib/auth/session.js";
import { supabase } from "../../lib/supabase.js";
import { Spinner } from "../components/feedback/Spinner.js";
import { StatusMessage } from "../components/feedback/StatusMessage.js";
import { colors, icons } from "../theme.js";

type LoginStatus =
  | "checking_auth"
  | "already_logged_in"
  | "starting_server"
  | "opening_browser"
  | "waiting_for_auth"
  | "completing_login"
  | "checking_allowlist"
  | "setting_up_profile"
  | "success"
  | "error";

async function checkAllowlist(githubUsername: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_allowlist", {
    username: githubUsername,
  });

  if (error) {
    throw new Error(`Allowlist check failed: ${error.message}`);
  }

  return data === true;
}

interface LoginState {
  status: LoginStatus;
  user?: User;
  serverUrl?: string;
  oauthUrl?: string;
  error?: string;
  errorType?: string;
}

export const LoginScreen = () => {
  const { exit } = useApp();
  const [state, setState] = useState<LoginState>({ status: "checking_auth" });
  const [cancelled, setCancelled] = useState(false);

  // Handle Ctrl+C
  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      setCancelled(true);
    }
  });

  useEffect(() => {
    if (cancelled) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Login cancelled by user",
        errorType: "cancelled",
      }));
    }
  }, [cancelled]);

  useEffect(() => {
    let server: Awaited<ReturnType<typeof startOAuthServer>> | null = null;
    let isCleanedUp = false;

    async function performLogin() {
      try {
        // Step 1: Check if already logged in
        const existingUser = await checkAuth();
        if (existingUser) {
          setState({
            status: "already_logged_in",
            user: existingUser,
          });
          return;
        }

        if (cancelled) return;

        // Step 2: Start OAuth server
        setState({ status: "starting_server" });
        server = await startOAuthServer(54321);

        setState((prev) => ({
          ...prev,
          status: "opening_browser",
          serverUrl: server!.callbackUrl,
        }));

        if (cancelled) return;

        // Step 3: Get OAuth URL
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo: server.callbackUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error || !data?.url) {
          throw new Error(
            `Failed to get OAuth URL: ${error?.message || "Unknown error"}`
          );
        }

        setState((prev) => ({
          ...prev,
          oauthUrl: data.url,
        }));

        // Step 4: Open browser
        try {
          await open(data.url);
        } catch {
          // Browser opening failed, user can use manual URL
        }

        if (cancelled) return;

        // Step 5: Wait for authorization
        setState((prev) => ({ ...prev, status: "waiting_for_auth" }));

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Authorization timed out after 2 minutes"));
          }, 120000);
        });

        const tokens = await Promise.race([
          server.waitForCallback(),
          timeoutPromise,
        ]);

        if (cancelled || isCleanedUp) return;

        // Step 6: Complete login
        setState((prev) => ({ ...prev, status: "completing_login" }));

        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });

        if (sessionError || !sessionData.user) {
          throw new Error(
            `Failed to create session: ${sessionError?.message || "Unknown error"}`
          );
        }

        if (cancelled || isCleanedUp) return;

        // Step 7: Check allowlist
        setState((prev) => ({
          ...prev,
          status: "checking_allowlist",
          user: sessionData.user,
        }));

        const githubUsername = sessionData.user.user_metadata?.user_name;
        if (!githubUsername) {
          await supabase.auth.signOut();
          throw new Error("Could not retrieve GitHub username");
        }

        const isAllowed = await checkAllowlist(githubUsername);

        if (!isAllowed) {
          await supabase.auth.signOut();

          // Notify frontend about allowlist failure
          if (server) {
            server.setStatus('not_allowed', "You're not on the allowlist");
          }

          setState((prev) => ({
            ...prev,
            status: "error",
            error: "You're not on the allowlist",
            errorType: "not_on_allowlist",
          }));
          return;
        }

        if (cancelled || isCleanedUp) return;

        // Step 8: Setup profile
        setState((prev) => ({
          ...prev,
          status: "setting_up_profile",
          user: sessionData.user,
        }));

        const { error: profileError } = await supabase
          .from("profiles")
          .select("id, email, tier, monthly_limit")
          .eq("id", sessionData.user.id)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // Profile doesn't exist, create it
          await supabase.from("profiles").insert({
            id: sessionData.user.id,
            email: sessionData.user.email,
            username: sessionData.user.user_metadata?.user_name || "user",
            avatar_url: sessionData.user.user_metadata?.avatar_url,
            tier: "free",
            monthly_limit: 50,
          });
        }

        // Success!
        setState((prev) => ({
          ...prev,
          status: "success",
          user: sessionData.user,
        }));
      } catch (error) {
        if (isCleanedUp) return;

        const errorMessage = (error as Error).message;
        let errorType = "oauth_error";

        if (errorMessage.includes("timeout")) {
          errorType = "timeout";
        } else if (errorMessage.includes("EADDRINUSE")) {
          errorType = "port_in_use";
        } else if (errorMessage.includes("session")) {
          errorType = "session_error";
        } else if (errorMessage.includes("Allowlist check failed")) {
          errorType = "allowlist_check_failed";
        }

        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage,
          errorType,
        }));
      } finally {
        if (server) {
          server.close();
        }
      }
    }

    performLogin();

    return () => {
      isCleanedUp = true;
      if (server) {
        server.close();
      }
    };
  }, [cancelled]);

  // Auto-exit on terminal states
  useEffect(() => {
    if (
      state.status === "success" ||
      state.status === "already_logged_in" ||
      state.status === "error"
    ) {
      const timer = setTimeout(() => {
        exit(state.status === "error" ? new Error(state.error) : undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.error, exit]);

  // Render based on status
  if (state.status === "checking_auth") {
    return (
      <Box marginY={1}>
        <Spinner message="Checking authentication..." />
      </Box>
    );
  }

  if (state.status === "already_logged_in") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage type="success" hint='Run "dxgen logout" to sign out first'>
          Already logged in as: {state.user?.email || state.user?.id}
        </StatusMessage>
      </Box>
    );
  }

  if (state.status === "starting_server") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Spinner message="Starting local callback server..." />
      </Box>
    );
  }

  if (state.status === "opening_browser") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Text color={colors.muted}>
          {icons.globe} Local server: {state.serverUrl}
        </Text>
        <Spinner message="Opening browser for GitHub login..." />
      </Box>
    );
  }

  if (state.status === "waiting_for_auth") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Text color={colors.muted}>
          {icons.globe} Local server: {state.serverUrl}
        </Text>
        <Box marginY={1}>
          <Text color={colors.muted}>
            If the browser doesn't open, visit this URL manually:
          </Text>
        </Box>
        <Text color={colors.info}>{state.oauthUrl}</Text>
        <Box marginTop={1}>
          <Spinner message="Waiting for authorization... (Press Ctrl+C to cancel)" />
        </Box>
      </Box>
    );
  }

  if (state.status === "completing_login") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Text color={colors.success}>{icons.success} Authorization received!</Text>
        <Spinner message="Completing login..." />
      </Box>
    );
  }

  if (state.status === "checking_allowlist") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Text color={colors.success}>{icons.success} Authorization received!</Text>
        <Text color={colors.success}>{icons.success} Login complete!</Text>
        <Spinner message="Verifying access..." />
      </Box>
    );
  }

  if (state.status === "setting_up_profile") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Text bold color={colors.primary}>
          {icons.lock} GitHub Authentication
        </Text>
        <Text color={colors.success}>{icons.success} Authorization received!</Text>
        <Text color={colors.success}>{icons.success} Login complete!</Text>
        <Text color={colors.success}>{icons.success} Access verified!</Text>
        <Spinner message="Setting up profile..." />
      </Box>
    );
  }

  if (state.status === "error") {
    let hint: string | undefined;

    if (state.errorType === "timeout") {
      hint = 'The authorization window expired. Run "dxgen login" to try again';
    } else if (state.errorType === "port_in_use") {
      hint = "The local callback server port is in use. Close other instances and try again";
    } else if (state.errorType === "cancelled") {
      hint = 'Run "dxgen login" to try again';
    } else if (state.errorType === "not_on_allowlist") {
      hint = "Visit https://dxgen.io to join the waitlist and request access";
    } else if (state.errorType === "allowlist_check_failed") {
      hint = "Could not verify access. Please try again later";
    } else {
      hint = "Check your internet connection and try again";
    }

    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <StatusMessage type="error" hint={hint}>
          {state.error}
        </StatusMessage>
      </Box>
    );
  }

  // Success
  const sessionPath = getSessionFilePath();
  return (
    <Box marginY={1} flexDirection="column" gap={0}>
      <Text bold color={colors.primary}>
        {icons.lock} GitHub Authentication
      </Text>
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Text color={colors.success}>
          {icons.success} Successfully logged in as: {state.user?.email || state.user?.id}
        </Text>
        <Text color={colors.muted}>
          {icons.file} Session saved to: {sessionPath}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={colors.info}>
          {icons.tip} You can now use dxgen commands!
        </Text>
      </Box>
    </Box>
  );
};
