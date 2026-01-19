#!/bin/bash
# =============================================================================
# Lentra - Development Server Script
# =============================================================================
# Starts all development servers with proper configuration
# Usage: ./scripts/dev.sh [--backend-only | --frontend-only | --docker]
# -----------------------------------------------------------------------------

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║    ██╗     ███████╗███╗   ██╗████████╗██████╗  █████╗        ║"
    echo "║    ██║     ██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗       ║"
    echo "║    ██║     █████╗  ██╔██╗ ██║   ██║   ██████╔╝███████║       ║"
    echo "║    ██║     ██╔══╝  ██║╚██╗██║   ██║   ██╔══██╗██╔══██║       ║"
    echo "║    ███████╗███████╗██║ ╚████║   ██║   ██║  ██║██║  ██║       ║"
    echo "║    ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝       ║"
    echo "║                                                               ║"
    echo "║              Local-First Multi-Model Playground               ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}▶${NC} $1"
}

cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    
    # Kill background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# -----------------------------------------------------------------------------
# Start Functions
# -----------------------------------------------------------------------------

check_ollama() {
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Ollama is not running.${NC}"
        echo -e "  Start Ollama with: ${CYAN}ollama serve${NC}"
        echo -e "  Or install from: ${CYAN}https://ollama.ai${NC}"
        echo ""
        read -p "Continue without Ollama? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✓${NC} Ollama is running"
        MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | head -3 | sed 's/"name":"//g' | sed 's/"//g' | tr '\n' ', ')
        echo -e "  Models: ${CYAN}${MODELS%,}${NC}"
    fi
}

start_backend() {
    print_status "Starting backend server on port $BACKEND_PORT..."
    
    cd "$PROJECT_ROOT/backend"
    
    if [ ! -d "venv" ]; then
        echo -e "${RED}✗ Virtual environment not found. Run ./scripts/setup.sh first.${NC}"
        exit 1
    fi
    
    source venv/bin/activate
    
    # Export environment
    export PYTHONPATH="$PROJECT_ROOT/backend/src"
    
    # Start server
    uvicorn src.main:create_app \
        --factory \
        --host 0.0.0.0 \
        --port "$BACKEND_PORT" \
        --reload \
        --reload-dir src \
        --log-level debug &
    
    BACKEND_PID=$!
    echo -e "${GREEN}✓${NC} Backend started (PID: $BACKEND_PID)"
}

start_frontend() {
    print_status "Starting frontend server on port $FRONTEND_PORT..."
    
    cd "$PROJECT_ROOT/frontend"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${RED}✗ Node modules not found. Run ./scripts/setup.sh first.${NC}"
        exit 1
    fi
    
    # Start Next.js dev server
    PORT=$FRONTEND_PORT npm run dev &
    
    FRONTEND_PID=$!
    echo -e "${GREEN}✓${NC} Frontend started (PID: $FRONTEND_PID)"
}

start_docker() {
    print_status "Starting services with Docker Compose..."
    
    cd "$PROJECT_ROOT/docker"
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

print_banner

case "${1:-}" in
    --backend-only)
        check_ollama
        start_backend
        wait
        ;;
    --frontend-only)
        start_frontend
        wait
        ;;
    --docker)
        start_docker
        ;;
    --help|-h)
        echo "Usage: ./scripts/dev.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --backend-only   Start only the backend server"
        echo "  --frontend-only  Start only the frontend server"
        echo "  --docker         Start all services with Docker Compose"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BACKEND_PORT     Backend server port (default: 8000)"
        echo "  FRONTEND_PORT    Frontend server port (default: 3000)"
        ;;
    *)
        check_ollama
        echo ""
        
        start_backend
        sleep 2  # Give backend time to start
        start_frontend
        
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  Development servers are running!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "  ${BLUE}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
        echo -e "  ${BLUE}Backend:${NC}   http://localhost:$BACKEND_PORT"
        echo -e "  ${BLUE}API Docs:${NC}  http://localhost:$BACKEND_PORT/docs"
        echo ""
        echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all servers"
        echo ""
        
        # Wait for all background processes
        wait
        ;;
esac
