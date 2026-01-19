#!/bin/bash
# =============================================================================
# Lentra - Test Runner Script
# =============================================================================
# Runs all tests across the project
# Usage: ./scripts/test.sh [--backend | --frontend | --coverage]
# -----------------------------------------------------------------------------

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# -----------------------------------------------------------------------------
# Test Functions
# -----------------------------------------------------------------------------

run_backend_tests() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Running Backend Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
    
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    
    if [ "$1" == "--coverage" ]; then
        pytest tests/ -v --cov=src --cov-report=html --cov-report=term-missing
        echo -e "\n${GREEN}Coverage report: backend/htmlcov/index.html${NC}"
    else
        pytest tests/ -v
    fi
    
    deactivate
}

run_frontend_tests() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Running Frontend Tests${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
    
    cd "$PROJECT_ROOT/frontend"
    
    if [ "$1" == "--coverage" ]; then
        npm run test -- --coverage
    else
        npm run test
    fi
}

run_lint() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Running Linters${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
    
    # Backend
    echo -e "${YELLOW}Backend (Ruff + mypy):${NC}"
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate
    ruff check src/
    mypy src/
    deactivate
    
    # Frontend
    echo -e "\n${YELLOW}Frontend (ESLint):${NC}"
    cd "$PROJECT_ROOT/frontend"
    npm run lint
    npm run type-check
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

case "${1:-}" in
    --backend)
        run_backend_tests "$2"
        ;;
    --frontend)
        run_frontend_tests "$2"
        ;;
    --lint)
        run_lint
        ;;
    --coverage)
        run_backend_tests --coverage
        run_frontend_tests --coverage
        ;;
    --help|-h)
        echo "Usage: ./scripts/test.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --backend      Run only backend tests"
        echo "  --frontend     Run only frontend tests"
        echo "  --lint         Run linters only"
        echo "  --coverage     Run all tests with coverage"
        echo "  --help, -h     Show this help message"
        ;;
    *)
        run_backend_tests
        run_frontend_tests
        echo -e "\n${GREEN}All tests passed!${NC}"
        ;;
esac
