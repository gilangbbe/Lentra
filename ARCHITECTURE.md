Project Technical Documentation
Project Name (working): Lentra
Tagline: Local multi-model RAG playground with side-by-side evaluation and character-driven UI
1. Overview
1.1 Purpose
ArenaLLM is a local-first AI playground designed to:
Run multiple local LLMs
Test RAG (Retrieval-Augmented Generation) pipelines
Compare model outputs side-by-side
Select, score, or ensemble the best response
Present each model as a distinct “character” with extensible visuals
The system is built for:
AI/ML engineers
Researchers
Builders evaluating models for production use

1.2 Key Design Principles
Local-first – No cloud dependency required
Model-agnostic – Any LLM backend can be plugged in
Evaluation-aware – Comparison is a first-class feature
Visual-optional – UI enhancements never block core usage
Composable – RAG, models, and evaluators are independent modules

2. High-Level Architecture
┌────────────────────────────┐
│        Frontend UI         │
│  (Next.js + WebGL Layer)   │
└─────────────┬──────────────┘
              │ REST / WS
┌─────────────▼──────────────┐
│        API Gateway         │
│         (FastAPI)          │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│     Orchestration Layer    │
│  (Model + RAG Controller)  │
└───────┬───────────┬────────┘
        │           │
┌───────▼──────┐ ┌──▼────────┐
│   RAG Engine │ │ LLM Runner │
│ (Retrieval)  │ │  Adapters  │
└───────┬──────┘ └──┬─────────┘
        │           │
┌───────▼──────┐ ┌──▼─────────┐
│ Vector Store │ │ Local LLMs │
│ (FAISS etc.) │ │ (Multiple) │
└──────────────┘ └────────────┘

3. Core Components

3.1 Frontend (UI Layer)
Responsibilities:
 - Prompt input
 - Model selection
 - Side-by-side response visualization
 - Scoring & comparison view
 - Optional 3D character rendering

Tech Stack:
 - Next.js (React)
 - TailwindCSS
 - WebSocket for streaming responses
 - Optional WebGL layer (Three.js / React Three Fiber)

Key View
| View            | Description                               |
| --------------- | ----------------------------------------- |
| Prompt Arena    | Submit a single prompt to multiple models |
| Comparison View | Diff & score model outputs                |
| RAG Inspector   | See retrieved chunks & sources            |
| Model Profile   | Personality, stats, and metadata          |
| Visual Layer    | Character/avatar rendering                |

3.2 Backend API
Responsibilities: 
 - Unified API for frontend
 - Orchestration of models & RAG
 - Parallel execution
 - Response normalization

Tech Stack:
 - FastAPI
 - Pydantic
 - Async I/O (asyncio)

Key Endpoints:
POST /prompt
POST /rag/query
GET  /models
GET  /models/{id}
POST /evaluate

3.3 Model Runner Layer
Purpose
 - Abstracts away differences between local LLM runtimes.
Supported Backends (Adapters):
 - llama.cpp
 - Ollama
 - HuggingFace Transformers
 - text-generation-webui (API mode)

Adapter Interface:
 class ModelAdapter:
    def generate(
        self,
        prompt: str,
        context: str | None,
        params: dict
    ) -> ModelResponse
Each adapter must return:
{
  "text": "...",
  "latency_ms": 1234,
  "tokens": 512,
  "model_id": "mistral-7b"
}

3.4 RAG Engine
Responsibilities
 - Document ingestion
 - Chunking
 - Embedding
 - Retrieval
 - Prompt assembly

Stack:
 - LangChain
 - LlamaIndex
 - FAISS / Chroma

RAG Flow:
 - Load documents
 - Chunk text
 - Generate embeddings
 - Store vectors
 - Retrieve top-k chunks
 - Inject into prompt template

3.5 Comparator / Evaluation Engine
Purpose
Determine which model response is “best”.

Evaluation Modes
| Mode                 | Description                |
| -------------------- | -------------------------- |
| Heuristic            | Length, structure, latency |
| Embedding Similarity | Semantic relevance         |
| LLM-as-Judge         | Meta-model scoring         |
| Human Vote           | Manual selection           |
| Ensemble             | Merge multiple outputs     |

Example Scoring Schema
{
  "relevance": 0.91,
  "clarity": 0.87,
  "hallucination_risk": 0.12,
  "final_score": 0.88
}

3.6 Character & Visual System
Visuals are metadata-driven, not hardcoded.

Character Definition
{
  "model_id": "llama-3-8b",
  "name": "Atlas",
  "traits": ["analytical", "methodical"],
  "visual": {
    "type": "2.5D",
    "primary_color": "#4F8EF7",
    "aura": "calm",
    "animation": "idle_slow"
  }
}

Rendering Rules
 - UI must function without visuals
 - Visuals are optional overlays
 - Characters are resolved client-side

4. Data Flow (Prompt Lifecycle)
User Prompt
   ↓
API Gateway
   ↓
RAG Retrieval (optional)
   ↓
Parallel Model Calls
   ↓
Response Normalization
   ↓
Evaluation / Scoring
   ↓
UI Presentation

5. Configuration System
Global Config
rag:
  enabled: true
  top_k: 5

evaluation:
  mode: llm_judge

models:
  - id: mistral-7b
    backend: ollama
  - id: llama-3-8b
    backend: llama_cpp

6. Plugin Architecture
Plugin Types:
 - Model Adapter
 - RAG Source
 - Evaluator
 - UI Widget

Plugin Contract:
class Plugin:
    name: str
    version: str

    def register(app): ...

7. Security & Privacy
All data stays local
No telemetry by default
Optional anonymized metrics
Sandboxed model execution

8. Performance Considerations
Parallel inference with async workers
Streaming responses
Model warm-up caching
Optional GPU pinning

9. Project Structure

```
Lentra/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI pipeline (tests, lint, type-check)
│   │   └── docker.yml                # Docker build & push on release
│   └── dependabot.yml                # Automated dependency updates
│
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── prompt.py         # POST /prompt endpoint
│   │   │   │   ├── models.py         # Model listing & info
│   │   │   │   ├── rag.py            # RAG query & ingest
│   │   │   │   └── evaluate.py       # Comparison & scoring
│   │   │   └── dependencies.py       # FastAPI dependencies
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings
│   │   │   ├── exceptions.py         # Custom exception classes
│   │   │   └── logging.py            # Structlog configuration
│   │   ├── models/
│   │   │   ├── adapters/
│   │   │   │   ├── base.py           # Abstract ModelAdapter
│   │   │   │   └── ollama.py         # Ollama implementation
│   │   │   └── runner.py             # Unified model interface
│   │   ├── rag/
│   │   │   └── engine.py             # RAG pipeline (FAISS)
│   │   ├── evaluation/
│   │   │   ├── comparator.py         # Comparison orchestrator
│   │   │   └── strategies/
│   │   │       ├── heuristic.py      # Heuristic scoring
│   │   │       └── llm_judge.py      # LLM-as-judge scoring
│   │   ├── schemas/
│   │   │   ├── prompt.py             # Request/Response models
│   │   │   ├── model.py              # Model info schemas
│   │   │   ├── rag.py                # RAG schemas
│   │   │   └── evaluation.py         # Evaluation schemas
│   │   └── main.py                   # FastAPI app factory
│   ├── tests/
│   │   ├── conftest.py               # Pytest fixtures
│   │   ├── api/                      # API route tests
│   │   ├── models/                   # Adapter tests
│   │   ├── rag/                      # RAG engine tests
│   │   └── evaluation/               # Comparator tests
│   ├── requirements.txt              # Production dependencies
│   ├── requirements-dev.txt          # Development dependencies
│   └── pyproject.toml                # Ruff, mypy, pytest config
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── page.tsx              # Home page (Arena)
│   │   │   └── globals.css           # Global styles
│   │   ├── components/
│   │   │   ├── ui/                   # Base UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── layout/               # Layout components
│   │   │   │   ├── header.tsx
│   │   │   │   └── sidebar.tsx
│   │   │   └── arena/                # Arena-specific components
│   │   │       ├── prompt-arena.tsx
│   │   │       ├── model-selector.tsx
│   │   │       └── response-card.tsx
│   │   ├── hooks/
│   │   │   ├── use-models.ts         # Model fetching hook
│   │   │   ├── use-prompt.ts         # Prompt submission hook
│   │   │   └── use-toast.ts          # Toast notifications
│   │   ├── services/
│   │   │   ├── prompt-service.ts     # Prompt API calls
│   │   │   ├── models-service.ts     # Models API calls
│   │   │   └── evaluation-service.ts # Evaluation API calls
│   │   ├── stores/
│   │   │   ├── models-store.ts       # Model state (Zustand)
│   │   │   ├── prompt-store.ts       # Prompt/response state
│   │   │   └── ui-store.ts           # UI state
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Axios client with transforms
│   │   │   └── utils.ts              # Utility functions
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   ├── tests/
│   │   ├── setup.ts                  # Vitest setup
│   │   ├── lib/                      # Utility tests
│   │   └── components/               # Component tests
│   ├── public/                       # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── vitest.config.ts
│
├── common/
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts              # Shared API types
│   │   └── index.ts                  # Package exports
│   ├── package.json
│   └── tsconfig.json
│
├── docker/
│   ├── Dockerfile.backend            # Multi-stage Python build
│   ├── Dockerfile.frontend           # Multi-stage Next.js build
│   ├── docker-compose.yml            # Full stack composition
│   └── docker-compose.dev.yml        # Development overrides
│
├── scripts/
│   ├── setup.sh                      # Initial environment setup
│   ├── dev.sh                        # Start dev servers
│   └── test.sh                       # Run all tests
│
├── data/                             # Runtime data (gitignored)
│   ├── vector_store/                 # FAISS indices
│   └── documents/                    # Ingested documents
│
├── .env.example                      # Environment template
├── .gitignore
├── README.md
└── ARCHITECTURE.md                   # This document
```

10. Technology Choices

| Layer        | Technology                          | Rationale                                      |
|--------------|-------------------------------------|------------------------------------------------|
| Frontend     | Next.js 14, React 18, TypeScript    | App Router, RSC support, type safety           |
| Styling      | TailwindCSS                         | Utility-first, rapid iteration                 |
| State        | Zustand                             | Minimal boilerplate, DevTools support          |
| Backend      | FastAPI, Pydantic v2                | Async native, automatic OpenAPI, validation    |
| LLM Backend  | Ollama (MVP)                        | Easy local setup, REST API, model management   |
| Vector Store | FAISS                               | Fast, no external dependencies, well-supported |
| Embedding    | sentence-transformers               | Local embeddings, no API keys required         |
| Testing      | pytest, Vitest                      | Standard choices, good DX                      |
| Linting      | Ruff, ESLint                        | Fast Python linting, standard JS/TS linting    |
| CI/CD        | GitHub Actions                      | Native integration, generous free tier         |

11. Development Workflow

```bash
# Initial setup
./scripts/setup.sh

# Start development servers
./scripts/dev.sh

# Run tests
./scripts/test.sh

# With Docker
cd docker && docker-compose up -d
```

Access Points:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Ollama: http://localhost:11434