# dxgen/core-runtime

Core runtime package for DXGen containing shared types, contracts, and AI-powered stack detection capabilities.

## Features

- **Stack Detection** – Automatically identifies project language and framework using LLM (Google Gemini)
- **Shared Types** – Central type definitions used across all DXGen packages
- **Project Snapshot** – Builds a lightweight representation of project structure for AI analysis

## Exports

```ts
// Types
export type { WizardFeature, DocStyle, WizardAnswers } from "core-runtime";
export type { ProjectMetadata, GenerateRequest, GenerateResult } from "core-runtime";
export type { DetectedStack, FinalDocKind } from "core-runtime";

// Stack Detection
export { detectStack, stackDetectorRunnable } from "core-runtime";
```

## Stack Detection

The stack detector analyzes project files and manifests to identify:

| Detection | Examples |
| :--- | :--- |
| **Language** | `ts`, `js`, `py`, `go`, `other` |
| **Framework** | Next.js, Express, FastAPI, Gin, etc. |
| **Notes** | Additional context about the stack |

### How it works

1. **Snapshot Creation** – Scans root directory for file hints (extensions, first lines)
2. **Manifest Parsing** – Reads `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`
3. **LLM Analysis** – Sends snapshot to Gemini for intelligent classification
4. **Structured Output** – Returns typed `DetectedStack` object

### Usage

```ts
import { detectStack } from "core-runtime";

const stack = await detectStack("/path/to/project");

console.log(stack);
// { language: "ts", framework: "Next.js", notes: "App Router with TypeScript" }
```

## Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Yes | API key for Google Gemini LLM |
| `DXGEN_STACK_MODEL` | No | Override default model (default: `gemini-2.5-flash-lite`) |

## Core Types

### `GenerateRequest`

```ts
interface GenerateRequest {
  wizard: WizardAnswers;   // User selections from CLI wizard
  project: ProjectMetadata; // Project root path and metadata
}
```

### `GenerateResult`

```ts
interface GenerateResult {
  kind: FinalDocKind;      // "readme" | "api-docs" | "diagram" | "summary"
  content: string;         // Generated documentation content
  suggestedPath: string;   // Where to save the file
}
```

### `DetectedStack`

```ts
interface DetectedStack {
  language: "ts" | "js" | "py" | "go" | "other";
  framework?: string;
  notes?: string;
}
```

## Architecture

```
core-runtime/
├── src/
│   ├── index.ts              # Public exports
│   ├── types.ts              # Shared type definitions
│   ├── stackDetection.ts     # LLM-powered stack detector
│   └── stackDetection.types.ts # Stack detection types
├── package.json
└── tsconfig.json
```

## Development

```bash
# Build the package
npm run build --workspace=core-runtime

# Watch mode
npm run dev --workspace=core-runtime
```

## Dependencies

- **LangChain** – For LLM orchestration and runnables
- **Google Generative AI** – Gemini model for stack detection
