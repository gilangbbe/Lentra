"""
Tests for the health and core API endpoints.
"""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for /health endpoint."""
    
    def test_health_check(self, client: TestClient) -> None:
        """Health endpoint returns healthy status."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Lentra"


class TestOpenAPI:
    """Tests for OpenAPI documentation."""
    
    def test_openapi_schema_available(self, client: TestClient) -> None:
        """OpenAPI schema is accessible."""
        response = client.get("/openapi.json")
        
        assert response.status_code == 200
        data = response.json()
        assert data["info"]["title"] == "Lentra"
        assert "paths" in data
    
    def test_docs_available(self, client: TestClient) -> None:
        """Swagger docs are accessible."""
        response = client.get("/docs")
        
        assert response.status_code == 200
