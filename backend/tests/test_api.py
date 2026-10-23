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


def test_campaign_lifecycle_and_rewrites(client, auth_headers):
    # 1. Create a campaign
    create_resp = client.post(
        "/api/campaigns",
        headers=auth_headers,
        json={
            "brand_id": "BRAND-ACME-01",
            "name": "Integration Test Campaign",
            "channel": "social_ad",
            "department": "Growth",
            "region": "Global",
            "agency": "In-house",
            "target_audience": "Enterprise CIOs",
            "content_text": "Yo check this out! Acme Cloud Legacy is $39 and 100% unhackable!!",
            "asset_urls": ["/sample_creative_orange.png"],
        },
    )
    assert create_resp.status_code == 200
    camp = create_resp.json()
    cid = camp["id"]
    assert cid.startswith("CAMP-")

    # 2. Multimodal Scan
    scan_resp = client.post(f"/api/campaigns/{cid}/scan", headers=auth_headers)
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()
    assert scan_data["findingsCount"] >= 5

    # 3. Fetch Campaign Details
    get_resp = client.get(f"/api/campaigns/{cid}", headers=auth_headers)
    assert get_resp.status_code == 200
    camp_detail = get_resp.json()
    findings = camp_detail["findings"]
    assert len(findings) >= 5

    # 4. Accept AI rewrite on first finding
    f0 = findings[0]
    rewrite_resp = client.post(
        f"/api/campaigns/{cid}/rewrites/accept",
        headers=auth_headers,
        json={"finding_id": f0["id"], "rewrite_mode": "strict_compliance"},
    )
    assert rewrite_resp.status_code == 200
    revised_camp = rewrite_resp.json()
    assert revised_camp["latestRevision"]["revisionNumber"] == 2

    # 5. Diff between v1 and v2
    diff_resp = client.get(f"/api/campaigns/{cid}/diff?rev_a=1&rev_b=2", headers=auth_headers)
    assert diff_resp.status_code == 200
    diff_data = diff_resp.json()
    assert "wordDiff" in diff_data
    assert len(diff_data["wordDiff"]) > 0

    # 6. Override request on another finding
    creator_headers = {"x-demo-role": "creator"}
    f1 = findings[1]
    ovr_resp = client.post(
        f"/api/campaigns/{cid}/override",
        headers=creator_headers,
        json={"finding_id": f1["id"], "justification": "Approved partner exception with business clearance"},
    )
    assert ovr_resp.status_code == 200
    ovr_id = ovr_resp.json()["overrideId"]

    # 7. Decide override in queue as manager
    manager_headers = {"x-demo-role": "manager"}
    dec_resp = client.post(
        f"/api/queue/overrides/{ovr_id}/decide",
        headers=manager_headers,
        json={"approve": True, "decision_note": "Verified with VP of Marketing"},
    )
    assert dec_resp.status_code == 200
    assert dec_resp.json()["status"] == "approved"

