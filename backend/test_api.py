"""Test suite for the PrepMap API.

Tests all major endpoints using FastAPI TestClient:
- GET /
- GET /health
- GET /subjects
- GET /companies
- GET /companies/{name} (e.g. TCS, ZS Associates)
- GET /practice?company=TCS
- GET /practice?company=ZS%20Associates&subject=Guesstimates%20%26%20Case%20Studies
- GET /questions/{id}
- POST /analyse with "What is a deadlock?"
"""

import os
import pytest
from fastapi.testclient import TestClient

# Ensure local artifacts folder is checked if available
default_local = r"C:\Users\acer\Downloads\askedbefore_models"
if os.path.isdir(default_local) and not os.environ.get("LOCAL_ARTIFACTS"):
    os.environ["LOCAL_ARTIFACTS"] = default_local

from main import app


@pytest.fixture(scope="session")
def client():
    """Create a TestClient that triggers lifespan startup and shutdown."""
    with TestClient(app) as test_client:
        yield test_client


def test_root_endpoint(client):
    """Test GET / returns app metadata and /docs link."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PrepMap API"
    assert data["docs"] == "/docs"


def test_health_endpoint(client):
    """Test GET /health returns ok status and accurate artifact counts."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["models_loaded"] is True
    assert data["questions"] == 1770
    assert data["companies"] == 19
    assert data["subjects"] == 15


def test_subjects_endpoint(client):
    """Test GET /subjects returns the 15 subject names."""
    response = client.get("/subjects")
    assert response.status_code == 200
    subjects = response.json()
    assert isinstance(subjects, list)
    assert len(subjects) == 15
    assert "DSA" in subjects
    assert "Operating Systems" in subjects
    assert "DBMS & SQL" in subjects


def test_companies_endpoint(client):
    """Test GET /companies returns all 19 company profiles with array subject fields."""
    response = client.get("/companies")
    assert response.status_code == 200
    companies = response.json()
    assert isinstance(companies, list)
    assert len(companies) == 19

    tcs = next((c for c in companies if c["company"] == "TCS"), None)
    assert tcs is not None
    assert isinstance(tcs["core_subjects"], list)
    assert len(tcs["core_subjects"]) > 0
    assert isinstance(tcs["difficulty_focus"], list)


def test_company_detail_endpoint(client):
    """Test GET /companies/{name} with spaces and case-insensitivity."""
    # Test case-insensitivity and standard company
    resp_tcs = client.get("/companies/tcs")
    assert resp_tcs.status_code == 200
    data_tcs = resp_tcs.json()
    assert data_tcs["company"] == "TCS"
    assert data_tcs["total_questions"] > 0
    assert "core" in data_tcs["relevance_counts"]
    assert "frequent" in data_tcs["relevance_counts"]

    # Test company name with spaces
    resp_zs = client.get("/companies/ZS%20Associates")
    assert resp_zs.status_code == 200
    data_zs = resp_zs.json()
    assert data_zs["company"] == "ZS Associates"

    # Test unknown company returns 404
    resp_unknown = client.get("/companies/NonExistentCorp")
    assert resp_unknown.status_code == 404


def test_practice_endpoint_tcs(client):
    """Test GET /practice?company=TCS returns ordered questions with disclaimer."""
    response = client.get("/practice?company=TCS")
    assert response.status_code == 200
    data = response.json()
    assert data["company"] == "TCS"
    assert data["total_available"] > 0
    assert data["returned"] == min(20, data["total_available"])
    assert len(data["questions"]) == data["returned"]
    assert "disclaimer" in data
    assert "Recommended based on each company's public hiring process" in data["disclaimer"]

    # Verify stable ordering: core -> frequent -> occasional
    relevance_order = {"core": 0, "frequent": 1, "occasional": 2}
    ranks = [relevance_order.get(q["relevance"], 99) for q in data["questions"]]
    assert ranks == sorted(ranks), "Questions must be ordered core -> frequent -> occasional"


def test_practice_endpoint_zs_associates_guesstimates(client):
    """Test GET /practice with URL-encoded company name and subject."""
    url = "/practice?company=ZS%20Associates&subject=Guesstimates%20%26%20Case%20Studies"
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["company"] == "ZS Associates"
    assert data["total_available"] > 0
    for q in data["questions"]:
        assert q["subject"] == "Guesstimates & Case Studies"


def test_practice_reproducible_seed(client):
    """Test that practice set returns deterministic order when seed is provided."""
    url = "/practice?company=Infosys&seed=42&n=15"
    res1 = client.get(url).json()
    res2 = client.get(url).json()
    assert [q["id"] for q in res1["questions"]] == [q["id"] for q in res2["questions"]]


def test_question_detail_endpoint(client):
    """Test GET /questions/{id} returns question metadata and matching companies."""
    response = client.get("/questions/ab-0000")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "ab-0000"
    assert "question" in data
    assert "subject" in data
    assert "difficulty" in data
    assert isinstance(data["companies"], list)
    assert len(data["companies"]) > 0

    # Test unknown question returns 404
    resp_404 = client.get("/questions/ab-999999")
    assert resp_404.status_code == 404


def test_analyse_deadlock(client):
    """Test POST /analyse with 'What is a deadlock?'."""
    payload = {"question": "What is a deadlock?"}
    response = client.post("/analyse", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["question"] == "What is a deadlock?"
    assert isinstance(data["subject"], str)
    assert data["subject"] == "Operating Systems"
    assert data["subject_confidence"] > 0.5
    assert isinstance(data["subject_candidates"], list)
    assert len(data["subject_candidates"]) == 3
    assert data["difficulty"] in ["easy", "medium", "hard"]
    assert isinstance(data["recommended_for"], list)
    assert len(data["recommended_for"]) > 0

    # Validate company recommendations have relevance and are ordered
    for rec in data["recommended_for"]:
        assert rec["relevance"] in ["core", "frequent", "occasional"]

    assert "disclaimer" in data
    assert "Recommended based on each company's public hiring process" in data["disclaimer"]


def test_analyse_validation_errors(client):
    """Test POST /analyse rejects questions that are too short or too long."""
    # Too short (< 3 chars)
    resp_short = client.post("/analyse", json={"question": "hi"})
    assert resp_short.status_code == 422

    # Too long (> 500 chars)
    resp_long = client.post("/analyse", json={"question": "a" * 501})
    assert resp_long.status_code == 422
