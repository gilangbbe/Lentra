#!/bin/bash
# =============================================================================
# Lentra - Development Environment Setup Script
# =============================================================================
# Sets up the complete development environment
# Usage: ./scripts/setup.sh
# -----------------------------------------------------------------------------

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Prerequisite Checks
# -----------------------------------------------------------------------------

print_header "Checking Prerequisites"

MISSING_DEPS=()

check_command "python3" || MISSING_DEPS+=("python3")
check_command "node" || MISSING_DEPS+=("node")
check_command "npm" || MISSING_DEPS+=("npm")
check_command "git" || MISSING_DEPS+=("git")

# Optional but recommended
check_command "ollama" || print_warning "Ollama not found - install for local LLM support"
check_command "docker" || print_warning "Docker not found - needed for containerized deployment"

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    print_error "Missing required dependencies: ${MISSING_DEPS[*]}"
    echo "Please install them and run this script again."
    exit 1
fi

# Check versions
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
NODE_VERSION=$(node --version | cut -d'v' -f2)
echo ""
print_step "Python version: $PYTHON_VERSION"
print_step "Node version: $NODE_VERSION"

# -----------------------------------------------------------------------------
# Directory Setup
# -----------------------------------------------------------------------------

print_header "Setting Up Project Structure"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
print_step "Project root: $PROJECT_ROOT"

# Create data directories
mkdir -p data/vector_store
mkdir -p data/documents
mkdir -p logs
print_success "Created data directories"

# -----------------------------------------------------------------------------
# Environment Files
# -----------------------------------------------------------------------------

print_header "Setting Up Environment Files"

# Backend .env
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env 2>/dev/null || cat > backend/.env << 'EOF'
# Lentra Backend Environment
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120
DEFAULT_MODEL=llama3.2:latest

# CORS
CORS_ORIGINS=http://localhost:3000

# Vector Store
VECTOR_STORE_PATH=./data/vector_store
EMBEDDING_MODEL=all-MiniLM-L6-v2
EOF
    print_success "Created backend/.env"
else
    print_warning "backend/.env already exists, skipping"
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << 'EOF'
# Lentra Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=Lentra
EOF
    print_success "Created frontend/.env.local"
else
    print_warning "frontend/.env.local already exists, skipping"
fi

# -----------------------------------------------------------------------------
# Backend Setup
# -----------------------------------------------------------------------------

print_header "Setting Up Backend"

cd "$PROJECT_ROOT/backend"

# Create virtual environment
if [ ! -d "venv" ]; then
    print_step "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate and install dependencies
print_step "Installing Python dependencies..."
source venv/bin/activate

pip install --upgrade pip > /dev/null
pip install -r requirements.txt > /dev/null
pip install -r requirements-dev.txt > /dev/null

print_success "Python dependencies installed"

# Verify installation
python -c "import fastapi; print(f'FastAPI {fastapi.__version__}')" 2>/dev/null && print_success "FastAPI verified"
python -c "import pydantic; print(f'Pydantic {pydantic.__version__}')" 2>/dev/null && print_success "Pydantic verified"

deactivate

# -----------------------------------------------------------------------------
# Frontend Setup
# -----------------------------------------------------------------------------

print_header "Setting Up Frontend"

cd "$PROJECT_ROOT/frontend"

print_step "Installing Node.js dependencies..."
npm install > /dev/null 2>&1

print_success "Node.js dependencies installed"

# Verify installation
npx next --version 2>/dev/null && print_success "Next.js verified"

# -----------------------------------------------------------------------------
# Common Package Setup
# -----------------------------------------------------------------------------

print_header "Setting Up Common Package"

cd "$PROJECT_ROOT/common"

npm install > /dev/null 2>&1
print_success "Common package dependencies installed"

# -----------------------------------------------------------------------------
# Git Hooks (Optional)
# -----------------------------------------------------------------------------

print_header "Setting Up Git Hooks"

cd "$PROJECT_ROOT"

if [ -d ".git" ]; then
    # Pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook for Lentra

# Run backend linting
cd backend
source venv/bin/activate
ruff check src/ --fix
mypy src/
deactivate

# Run frontend linting
cd ../frontend
npm run lint
npm run type-check

echo "Pre-commit checks passed!"
EOF
    chmod +x .git/hooks/pre-commit
    print_success "Git pre-commit hook installed"
else
    print_warning "Not a git repository, skipping hooks"
fi

# -----------------------------------------------------------------------------
# Ollama Model Pull (Optional)
# -----------------------------------------------------------------------------

print_header "Ollama Setup"

if command -v ollama &> /dev/null; then
    read -p "Would you like to pull the default model (llama3.2:latest)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Pulling llama3.2:latest (this may take a while)..."
        ollama pull llama3.2:latest && print_success "Model pulled successfully"
    else
        print_warning "Skipping model pull. Run 'ollama pull llama3.2:latest' later."
    fi
else
    print_warning "Ollama not installed. Install from: https://ollama.ai"
    echo "  After installing, run: ollama pull llama3.2:latest"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------

print_header "Setup Complete! 🎉"

echo -e "
${GREEN}Your Lentra development environment is ready!${NC}

${BLUE}Quick Start:${NC}
  1. Start the backend:
     ${YELLOW}cd backend && source venv/bin/activate && uvicorn src.main:create_app --factory --reload${NC}

  2. Start the frontend (in another terminal):
     ${YELLOW}cd frontend && npm run dev${NC}

  3. Or use the dev script:
     ${YELLOW}./scripts/dev.sh${NC}

${BLUE}Useful Commands:${NC}
  Backend tests:   ${YELLOW}cd backend && pytest${NC}
  Frontend tests:  ${YELLOW}cd frontend && npm test${NC}
  Type checking:   ${YELLOW}cd frontend && npm run type-check${NC}

${BLUE}Access Points:${NC}
  Frontend:  http://localhost:3000
  Backend:   http://localhost:8000
  API Docs:  http://localhost:8000/docs

${BLUE}Documentation:${NC}
  See ARCHITECTURE.md for system design
  See README.md for general information
"
