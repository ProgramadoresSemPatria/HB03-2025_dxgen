# dxgen/rag

RAG (Retrieval-Augmented Generation) toolkit for DXGen. Scans repositories, chunks files, stores embeddings in Pinecone, and retrieves context for LangChain/LangGraph chains.

## Features

| Feature | Description |
| :--- | :--- |
| **File Scanner** | Configurable extensions, ignore globs, respects `.gitignore` |
| **Smart Chunking** | LangChain `RecursiveCharacterTextSplitter` with source metadata |
| **Pinecone Sync** | Incremental updates and full namespace resets |
| **Vector Retriever** | Pinecone-backed LangChain retriever with fallback support |
| **Pipeline Helper** | `runRagPipeline` for sync or read-only retrieval |

## Architecture

```
rag/
├── src/
│   ├── index.ts          # Public exports
│   ├── pipeline.ts       # High-level RAG pipeline orchestrator
│   ├── file-scanner.ts   # Project file discovery
│   ├── chunker.ts        # Text splitting with metadata
│   ├── embeddings.ts     # OpenAI embeddings wrapper
│   ├── pinecone-sync.ts  # Vector store synchronization
│   ├── retriever.ts      # Document retrieval
│   └── types.ts          # Type definitions
├── package.json
└── vitest.config.ts
```

## Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Yes | Embeddings via `@langchain/openai` |
| `PINECONE_API_KEY` | Yes | Pinecone data plane access |
| `PINECONE_CONTROLLER_HOST` | No | Override for multiple Pinecone projects |

## Usage

```ts
import {
  runRagPipeline,
  scanProjectFiles,
  chunkProjectFiles,
  buildIndex,
  createRetriever,
} from "@dxgen/rag";

const context = { userId: "user-123", projectId: "repo-abc" };

// 1) Full sync (dxgen sync)
const scan = await scanProjectFiles({ rootDir: process.cwd() });
const chunks = await chunkProjectFiles(scan.files);
await buildIndex(chunks, { pinecone, embeddings, context });

// 2) Retrieval only (dxgen generate)
const retriever = createRetriever({ pinecone, context });
const docs = await retriever.getRelevantDocuments("Explain the API routes");

// 3) All-in-one helper
const { documents, syncSummary } = await runRagPipeline({
  rootDir: process.cwd(),
  query: "Generate README",
  pinecone,
  context,
  sync: { enabled: true, fullReindex: true },
});
```

### CLI workflow reference

- `dxgen sync`: sets `sync.enabled=true` and optionally `fullReindex` when the
  user requests a clean refresh. Chunks are stored in Pinecone namespace
  `dxgen-{userId}-{projectId}`.
- `dxgen generate`: skips ingestion, instantiates the retriever, and streams the
  documents to the LangGraph chain chosen by the agent.

### Pinecone configuration

```ts
const pinecone = {
  index: "dxgen-docs",
  apiKey: process.env.PINECONE_API_KEY,
  controllerHostUrl: process.env.PINECONE_CONTROLLER_HOST,
};
```

Namespaces default to `dxgen-{userId}-{projectId}` but can be overridden via
`pinecone.namespace`.

## Development

```bash
# Build the package
npm run build --workspace=@dxgen/rag

# Run tests
npm run test --workspace=@dxgen/rag

# Lint
npm run lint --workspace=@dxgen/rag
```

## Testing

Vitest covers:
- Chunk metadata extraction
- Retriever's Pinecone + fallback behavior
- Pipeline orchestration

## Dependencies

- **LangChain** – Text splitting and retriever base
- **@langchain/openai** – OpenAI embeddings
- **@pinecone-database/pinecone** – Vector store client
- **fdir** – Fast directory traversal
- **globby** – Glob pattern matching
