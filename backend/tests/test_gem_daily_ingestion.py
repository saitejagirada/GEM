"""
Unit tests for GeM Daily Ingestion Pipeline and Live Bids API
"""

import pytest
from unittest.mock import patch
from app import create_app
from app.services.gem_daily_ingestion import GemDailyIngestion


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_transform_gem_doc():
    """Verifies parsing of raw Solr response from bidplus.gem.gov.in into structured bid."""
    raw_doc = {
        "b_bid_number": ["GEM/2026/B/8163002"],
        "b_category_name": ["Tablet, Laptop, Charger for Laptop"],
        "ba_official_details_minName": ["Ministry of Defence"],
        "ba_official_details_deptName": ["Department of Military Affairs"],
        "b_total_quantity": [25],
        "final_end_date_sort": ["2026-10-30T15:00:00Z"],
        "final_start_date_sort": ["2026-10-20T10:00:00Z"],
        "b_id": ["10037552"],
        "b_bid_to_ra": [0]
    }

    result = GemDailyIngestion._transform_gem_doc(raw_doc)
    assert result is not None
    assert result["bidNumber"] == "GEM/2026/B/8163002"
    assert result["title"] == "Tablet, Laptop, Charger for Laptop"
    assert result["ministry"] == "Ministry of Defence"
    assert result["department"] == "Department of Military Affairs"
    assert result["quantity"] == 25
    assert result["docUrl"] == "https://bidplus.gem.gov.in/showbidDocument/10037552"
    assert result["isEmdExemptForMse"] is True
    assert len(result["boqItems"]) == 1
    assert result["boqItems"][0]["quantity"] == 25


def test_transform_gem_doc_missing_bid_number():
    """Returns None when raw doc lacks a bid number."""
    raw_doc = {"b_category_name": ["Office Chairs"]}
    assert GemDailyIngestion._transform_gem_doc(raw_doc) is None


def test_get_live_bids_endpoint(client):
    """Verifies GET /api/portal/live-bids returns data."""
    mock_bids = [
        {
            "bidNumber": "GEM/2026/B/99999",
            "title": "Industrial Power Cables",
            "ministry": "Ministry of Power",
            "department": "NTPC",
            "type": "PRODUCT"
        }
    ]
    with patch.object(GemDailyIngestion, 'fetch_live_portal_bids', return_value=mock_bids):
        res = client.get('/api/portal/live-bids')
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data['success'] is True
        assert json_data['count'] == 1
        assert json_data['data'][0]['bidNumber'] == "GEM/2026/B/99999"


def test_sync_daily_bids_endpoint(client):
    """Verifies POST /api/portal/sync-daily-bids triggers crawler and returns sync summary."""
    mock_result = {
        "success": True,
        "count": 5,
        "live_bids": [{"bidNumber": "GEM/2026/B/1"}],
        "database_sync": {"total_bids": 5, "synced_tenders": 5, "errors": []},
        "synced_at": "2026-10-24T12:00:00Z"
    }
    with patch.object(GemDailyIngestion, 'sync_daily_bids', return_value=mock_result):
        res = client.post('/api/portal/sync-daily-bids')
        assert res.status_code == 200
        json_data = res.get_json()
        assert json_data['success'] is True
        assert json_data['count'] == 5
        assert "database_sync" in json_data
