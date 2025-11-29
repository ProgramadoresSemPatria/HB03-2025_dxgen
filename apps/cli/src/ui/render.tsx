import { render } from "ink";
import React, { type FC } from "react";

export interface RenderOptions {
  exitOnCtrlC?: boolean;
}

export async function renderApp<P extends object>(
  App: FC<P>,
  props?: P,
  options: RenderOptions = {}
): Promise<void> {
  if (!process.stdout.isTTY) {
    console.log("[dxgen] Running in non-interactive mode");
    return;
  }

  const { waitUntilExit } = render(<App {...(props as P)} />, {
    exitOnCtrlC: options.exitOnCtrlC ?? true,
  });

  await waitUntilExit();
}
