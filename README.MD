# 🎯 Lentra

> Local multi-model RAG playground with side-by-side evaluation and character-driven UI

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 🌟 Overview

Lentra (ArenaLLM) is a **local AI playground** designed to:

- 🤖 Run multiple local LLMs simultaneously
- 📚 Test RAG (Retrieval-Augmented Generation) pipelines
- ⚖️ Compare model outputs side-by-side
- 🏆 Score and evaluate responses
- 🎭 Present each model as a distinct "character"

### Target Users

- AI/ML Engineers
- Researchers
- Builders evaluating models for production

## 🏗️ Architecture

```
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
│   RAG Engine │ │ LLM Runner│
│  (Retrieval) │ │  Adapters │
└───────┬──────┘ └──┬────────┘
        │           │
┌───────▼──────┐ ┌──▼─────────┐
│ Vector Store │ │ Local LLMs │
│   (FAISS)    │ │  (Ollama)  │
└──────────────┘ └────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.ai/) installed and running
- At least one model pulled (e.g., `ollama pull llama3.1:8b`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lentra.git
cd lentra

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Or manual setup:

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

### Development

```bash
# Start both frontend and backend
./scripts/dev.sh

# Or separately:

# Backend (from /backend)
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Frontend (from /frontend)
npm run dev
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 Project Structure

```
lentra/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, logging, exceptions
│   │   ├── models/         # LLM adapters & runner
│   │   ├── rag/            # RAG engine components
│   │   ├── evaluation/     # Comparator & strategies
│   │   └── schemas/        # Pydantic models
│   └── tests/              # pytest tests
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities
│   │   ├── services/      # API clients
│   │   └── types/         # TypeScript types
│   └── tests/             # Vitest tests
├── common/                 # Shared types/contracts
├── scripts/               # Dev & deployment scripts
├── docker/                # Docker configurations
└── .github/               # CI/CD workflows
```

## 🧪 Testing

```bash
# Backend tests
cd backend
source venv/bin/activate
pytest

# Frontend tests
cd frontend
npm run test
```

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose -f docker/docker-compose.yml up --build
```

## 📖 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/prompt` | Submit prompt to multiple models |
| POST | `/rag/query` | Query with RAG context |
| GET | `/models` | List available models |
| GET | `/models/{id}` | Get model details |
| POST | `/evaluate` | Evaluate/compare responses |

## 🔐 Security

- All data stays local (no cloud dependency)
- No telemetry by default
- Secrets managed via environment variables
- Input sanitization on all endpoints

## 🛣️ Roadmap

- [x] Project scaffolding
- [x] Ollama adapter implementation
- [x] Basic RAG with FAISS
- [ ] Side-by-side comparison UI
- [ ] Evaluation strategies
- [ ] Character/avatar system
- [ ] Additional LLM adapters

## 🤝 Contributing

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Follow coding standards
3. Write tests for new features
4. Submit PR with description

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for the local AI community
