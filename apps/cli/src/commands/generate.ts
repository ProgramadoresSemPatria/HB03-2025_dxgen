import type { User } from "@supabase/supabase-js";
import { Command } from "commander";
import { renderApp, GenerateScreen } from "../ui/index";

export const generateCommand = new Command("generate").description(
  "Generate documentation for a project",
);

generateCommand.action(async (_options, command) => {
  const user = command.getOptionValue("__authenticatedUser") as User | undefined;
  await renderApp(GenerateScreen, { user });
});
