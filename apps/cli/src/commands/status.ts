import { Command } from "commander";
import { renderApp, StatusScreen } from "../ui/index.js";

export const statusCommand = new Command("status")
  .description("Show current authentication status")
  .action(async () => {
    await renderApp(StatusScreen);
  });
