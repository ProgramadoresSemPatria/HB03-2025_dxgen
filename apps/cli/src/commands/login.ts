import { Command } from "commander";
import { renderApp, LoginScreen } from "../ui/index.js";

export const loginCommand = new Command("login")
  .description("Authenticate with dxgen using GitHub")
  .action(async () => {
    await renderApp(LoginScreen);
  });
