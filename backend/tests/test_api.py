import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.init import init_db

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers():
    return {"x-demo-role": "admin"}

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "VeriBrand AI"

def test_brands_endpoint(client, auth_headers):
    response = client.get("/api/brands", headers=auth_headers)
    assert response.status_code == 200
    brands = response.json()
    assert isinstance(brands, list)
    assert len(brands) > 0
    assert "name" in brands[0]

def test_brain_documents_and_rules(client, auth_headers):
    response = client.get("/api/brain/documents?brand_id=BRAND-ACME-01", headers=auth_headers)
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)

    rules_resp = client.get("/api/brain/rules?brand_id=BRAND-ACME-01", headers=auth_headers)
    assert rules_resp.status_code == 200
    rules = rules_resp.json()
    assert isinstance(rules, list)

def test_campaigns_list(client, auth_headers):
    response = client.get("/api/campaigns", headers=auth_headers)
    assert response.status_code == 200
    campaigns = response.json()
    assert isinstance(campaigns, list)
    assert len(campaigns) > 0

def test_analytics_overview(client, auth_headers):
    response = client.get("/api/analytics?brand_id=BRAND-ACME-01", headers=auth_headers)
    assert response.status_code == 200
    analytics = response.json()
    assert "overallReadinessScore" in analytics
    assert "complianceTrends" in analytics

def test_audit_verify_endpoint(client, auth_headers):
    response = client.get("/api/audit/verify", headers=auth_headers)
    assert response.status_code == 200
    verification = response.json()
    assert "valid" in verification
    assert verification["valid"] is True
    assert "count" in verification

def test_queue_endpoint(client, auth_headers):
    response = client.get("/api/queue", headers=auth_headers)
    assert response.status_code == 200
    queue = response.json()
    assert isinstance(queue, dict)
    assert "pendingCampaigns" in queue
    assert "pendingOverrides" in queue
