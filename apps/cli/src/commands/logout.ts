import { Command } from "commander";
import { renderApp, LogoutScreen } from "../ui/index.js";

export const logoutCommand = new Command("logout")
  .description("Sign out and clear local session")
  .action(async () => {
    await renderApp(LogoutScreen);
  });
