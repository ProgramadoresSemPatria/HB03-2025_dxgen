import {
  createPromptFileExistsHandler,
  runGenerateCommand,
  writeDocumentationFile,
} from "@repo/ai";
import { buildRagQuery, runRagPipeline } from "@repo/rag";
import type { User } from "@supabase/supabase-js";
import { Box, Text, useApp } from "ink";
import  { useEffect, useState, type FC } from "react";
import {
  checkUsageLimits,
  incrementUsage,
  type UsageResult,
  type UsageStatus,
} from "../../lib/usage.js";
import { mapGenerateAnswersToRequest } from "../../mappers/generateRequest.mappers.js";
import type { GenerateAnswers } from "../../types/generate.types.js";
import { Spinner } from "../components/feedback/Spinner.js";
import { StatusMessage } from "../components/feedback/StatusMessage.js";
import { Confirm } from "../components/input/Confirm.js";
import { Select } from "../components/input/Select.js";
import { TextInput } from "../components/input/TextInput.js";
import { colors, icons } from "../theme.js";

type GenerateStatus =
  | "checking_auth"
  | "auth_error"
  | "checking_usage"
  | "usage_error"
  | "wizard_outputDir"
  | "wizard_sync"
  | "wizard_feature"
  | "wizard_style"
  | "processing"
  | "syncing"
  | "generating"
  | "writing"
  | "success"
  | "error";

interface GenerateState {
  status: GenerateStatus;
  usageInfo?: UsageStatus;
  usageResult?: UsageResult;
  answers: Partial<GenerateAnswers>;
  progress?: string;
  result?: { filePath: string };
  error?: string;
  errorHint?: string;
}

interface GenerateScreenProps {
  user?: User;
}

const FEATURE_OPTIONS = [
  { label: "README", value: "readme" },
  { label: "API Docs", value: "api-docs" },
  { label: "Diagrams", value: "diagram" },
  { label: "Repository Summary", value: "summary" },
];

export const GenerateScreen: FC<GenerateScreenProps> = ({ user }) => {
  const { exit } = useApp();
  const [state, setState] = useState<GenerateState>({
    status: "checking_auth",
    answers: {},
  });

  // Step 1: Check authentication
  useEffect(() => {
    if (!user) {
      setState({
        status: "auth_error",
        answers: {},
        error: "Authentication required",
        errorHint: 'Run "dxgen login" to authenticate',
      });
    } else {
      setState((prev) => ({ ...prev, status: "checking_usage" }));
    }
  }, [user]);

  // Step 2: Check usage limits
  useEffect(() => {
    if (state.status !== "checking_usage" || !user) return;

    async function checkUsage() {
      try {
        const usageInfo = await checkUsageLimits(user!.id);

        if (!usageInfo.can_generate) {
          setState((prev) => ({
            ...prev,
            status: "usage_error",
            usageInfo,
            error: "Monthly limit reached!",
            errorHint: `Usage: ${usageInfo.docs_used}/${usageInfo.limit_value} docs. Resets in ${usageInfo.days_until_reset} days. Upgrade at https://dxgen.io/pricing`,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          status: "wizard_outputDir",
          usageInfo,
        }));
      } catch (error) {
        const errorMsg = (error as Error).message;

        if (errorMsg === "PROFILE_NOT_FOUND") {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: "User profile not found",
            errorHint: 'Please run "dxgen logout && dxgen login" to reset your session',
          }));
        } else {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: `Failed to check usage limits: ${errorMsg}`,
          }));
        }
      }
    }

    checkUsage();
  }, [state.status, user]);

  // Step 6: Run the generation pipeline
  useEffect(() => {
    if (state.status !== "processing" || !user) return;

    async function runPipeline() {
      try {
        const answers = state.answers as GenerateAnswers;
        const request = mapGenerateAnswersToRequest(answers);

        // Syncing phase
        setState((prev) => ({ ...prev, status: "syncing", progress: "Building RAG query..." }));

        const queryToFindRelevantFiles = buildRagQuery(request);

        setState((prev) => ({ ...prev, progress: "Running RAG pipeline..." }));

        const { documents } = await runRagPipeline({
          rootDir: process.cwd(),
          query: queryToFindRelevantFiles,
          pinecone: {
            index: "dxgen-docs",
            apiKey: process.env.PINECONE_API_KEY,
          },
          context: {
            userId: user!.id,
            projectId: request.project.rootPath,
          },
          sync: {
            enabled: request.wizard.sync,
            fullReindex: request.wizard.sync,
          },
          retrieverOptions: {
            topK: 50,
          },
        });

        // Generating phase
        setState((prev) => ({
          ...prev,
          status: "generating",
          progress: "Generating documentation with AI...",
        }));

        const result = await runGenerateCommand(request, { documents });

        if (!result) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: "No documentation was generated",
          }));
          return;
        }

        // Writing phase
        setState((prev) => ({ ...prev, status: "writing", progress: "Writing file..." }));

        const writeResult = await writeDocumentationFile(request, result, {
          onFileExists: await createPromptFileExistsHandler(),
        });

        if (!writeResult.success) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: `Failed to write file: ${writeResult.error}`,
            errorHint: `Path: ${writeResult.filePath}`,
          }));
          return;
        }

        // Update usage
        let usageResult: UsageResult | undefined;
        try {
          usageResult = await incrementUsage(user!.id);
        } catch {
          // Non-critical error, continue to success
        }

        setState((prev) => ({
          ...prev,
          status: "success",
          result: { filePath: writeResult.filePath },
          usageResult,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: (error as Error).message,
        }));
      }
    }

    runPipeline();
  }, [state.status, user, state.answers]);

  // Auto-exit on terminal states
  useEffect(() => {
    if (
      state.status === "success" ||
      state.status === "auth_error" ||
      state.status === "usage_error" ||
      state.status === "error"
    ) {
      const timer = setTimeout(() => {
        exit(state.status !== "success" ? new Error(state.error) : undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.error, exit]);

  // Wizard step handlers
  const handleOutputDir = (value: string) => {
    setState((prev) => ({
      ...prev,
      status: "wizard_sync",
      answers: { ...prev.answers, outputDir: value || "./docs" },
    }));
  };

  const handleSync = (value: boolean) => {
    setState((prev) => ({
      ...prev,
      status: "wizard_feature",
      answers: { ...prev.answers, sync: value },
    }));
  };

  const handleFeature = (value: string) => {
    setState((prev) => ({
      ...prev,
      status: "wizard_style",
      answers: {
        ...prev.answers,
        feature: value as GenerateAnswers["feature"],
      },
    }));
  };

  const handleStyle = (value: string) => {
    setState((prev) => ({
      ...prev,
      status: "processing",
      answers: { ...prev.answers, style: value },
    }));
  };

  // Render header
  const Header = () => (
    <Text bold color={colors.primary}>
      {icons.doc} Generate Documentation
    </Text>
  );

  // Render based on status
  if (state.status === "checking_auth") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Spinner message="Checking authentication..." />
      </Box>
    );
  }

  if (state.status === "auth_error" || state.status === "usage_error" || state.status === "error") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <StatusMessage type="error" hint={state.errorHint}>
          {state.error}
        </StatusMessage>
      </Box>
    );
  }

  if (state.status === "checking_usage") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Spinner message="Checking usage limits..." />
      </Box>
    );
  }

  if (state.status === "wizard_outputDir") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        {state.usageInfo && (
          <Text color={colors.muted}>
            {icons.chart} Usage: {state.usageInfo.docs_used}/{state.usageInfo.limit_value} docs
          </Text>
        )}
        <Box marginTop={1}>
          <TextInput
            label="Output directory for docs:"
            defaultValue="./docs"
            onSubmit={handleOutputDir}
          />
        </Box>
      </Box>
    );
  }

  if (state.status === "wizard_sync") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Text color={colors.muted}>
          {icons.file} Output: {state.answers.outputDir}
        </Text>
        <Box marginTop={1}>
          <Confirm
            label="Do you want to sync your project?"
            defaultValue={true}
            onConfirm={handleSync}
          />
        </Box>
      </Box>
    );
  }

  if (state.status === "wizard_feature") {
    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Text color={colors.muted}>
          {icons.file} Output: {state.answers.outputDir}
        </Text>
        <Text color={colors.muted}>
          {icons.sync} Sync: {state.answers.sync ? "Yes" : "No"}
        </Text>
        <Box marginTop={1}>
          <Select
            label="What type of documentation do you want to generate?"
            options={FEATURE_OPTIONS}
            onSelect={handleFeature}
          />
        </Box>
      </Box>
    );
  }

  if (state.status === "wizard_style") {
    const featureLabel = FEATURE_OPTIONS.find(
      (o) => o.value === state.answers.feature
    )?.label;

    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Text color={colors.muted}>
          {icons.file} Output: {state.answers.outputDir}
        </Text>
        <Text color={colors.muted}>
          {icons.sync} Sync: {state.answers.sync ? "Yes" : "No"}
        </Text>
        <Text color={colors.muted}>
          {icons.doc} Type: {featureLabel}
        </Text>
        <Box marginTop={1}>
          <TextInput
            label="Style of documentation (e.g., Onboarding, Technical, Performance):"
            placeholder="Leave empty for default"
            onSubmit={handleStyle}
          />
        </Box>
      </Box>
    );
  }

  if (
    state.status === "processing" ||
    state.status === "syncing" ||
    state.status === "generating" ||
    state.status === "writing"
  ) {
    const statusMessages = {
      processing: "Starting pipeline...",
      syncing: state.progress || "Syncing project...",
      generating: state.progress || "Generating documentation...",
      writing: state.progress || "Writing file...",
    };

    return (
      <Box marginY={1} flexDirection="column" gap={1}>
        <Header />
        <Box flexDirection="column" gap={0}>
          <Text color={colors.muted}>
            {icons.file} Output: {state.answers.outputDir}
          </Text>
          <Text color={colors.muted}>
            {icons.sync} Sync: {state.answers.sync ? "Yes" : "No"}
          </Text>
          <Text color={colors.muted}>
            {icons.doc} Type:{" "}
            {FEATURE_OPTIONS.find((o) => o.value === state.answers.feature)?.label}
          </Text>
          {state.answers.style && (
            <Text color={colors.muted}>
              {icons.edit} Style: {state.answers.style}
            </Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Spinner message={statusMessages[state.status]} />
        </Box>
      </Box>
    );
  }

  // Success
  return (
    <Box marginY={1} flexDirection="column" gap={0}>
      <Header />
      <Box marginTop={1} flexDirection="column" gap={0}>
        <Text color={colors.success}>
          {icons.success} Documentation generated successfully!
        </Text>
        <Text color={colors.muted}>
          {icons.file} File: {state.result?.filePath}
        </Text>
      </Box>
      {state.usageResult && (
        <Box marginTop={1} flexDirection="column" gap={0}>
          <Text color={colors.info}>
            {icons.chart} Usage: {state.usageResult.new_count}/{state.usageResult.limit_value} docs
            this month
          </Text>
          {state.usageResult.limit_reached && (
            <Text color={colors.warning}>
              {icons.warning} You've reached your monthly limit! Upgrade at
              https://dxgen.io/pricing
            </Text>
          )}
          {!state.usageResult.limit_reached &&
            state.usageResult.limit_value - state.usageResult.new_count <= 5 && (
              <Text color={colors.warning}>
                {icons.tip} Running low! Consider upgrading to Pro.
              </Text>
            )}
        </Box>
      )}
    </Box>
  );
};
