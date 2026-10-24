"""
GeM Portal Intelligence API Blueprint
Exposes endpoints for market pulse, personalized tender feeds, fundamentals deconstruction,
reverse/forward auctions, participated portfolios, keyword search, and real-time alerts.
"""

from flask import Blueprint, jsonify, request
from ..services.gem_portal_service import GemPortalService
from ..services.gem_daily_ingestion import GemDailyIngestion

portal_bp = Blueprint('portal', __name__)


@portal_bp.route('/sync-daily-bids', methods=['POST'])
def sync_daily_bids():
    """Triggers live crawl of public bids from bidplus.gem.gov.in and database sync."""
    pages = request.args.get('pages', default=5, type=int)
    result = GemDailyIngestion.sync_daily_bids(pages=pages)
    return jsonify(result), 200


@portal_bp.route('/live-bids', methods=['GET'])
def get_live_bids():
    """Returns freshly crawled live public tenders from gem.gov.in."""
    pages = request.args.get('pages', default=5, type=int)
    bids = GemDailyIngestion.fetch_live_portal_bids(pages=pages)
    return jsonify({"success": True, "count": len(bids), "data": bids}), 200


@portal_bp.route('/market-pulse', methods=['GET'])
def get_market_pulse():
    """Returns today's high-level tender market metrics."""
    data = GemPortalService.get_market_pulse()
    return jsonify({"success": True, "data": data})


@portal_bp.route('/feed', methods=['GET'])
def get_feed():
    """Returns ranked opportunities with AI fit scoring, procurement type, and category filtering."""
    user_id = request.args.get('userId')
    bid_type = request.args.get('bidType')
    domain_category = request.args.get('domainCategory')
    category = request.args.get('category')
    state = request.args.get('state')
    min_score_raw = request.args.get('minScore')
    min_score = int(min_score_raw) if min_score_raw and min_score_raw.isdigit() else None

    bids = GemPortalService.get_feed(
        user_id=user_id,
        bid_type=bid_type,
        domain_category=domain_category,
        category=category,
        state=state,
        min_score=min_score
    )
    return jsonify({"success": True, "count": len(bids), "data": bids})


@portal_bp.route('/search', methods=['GET'])
def search_tenders():
    """Searches tenders by keyword across title, department, or bid number."""
    query = request.args.get('q', '').strip()
    bids = GemPortalService.search_bids(query=query)
    return jsonify({"success": True, "query": query, "count": len(bids), "data": bids})


@portal_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """Returns active notifications (corrigendums, outbid, closing soon) for PhonePe Alerts tab."""
    alerts = GemPortalService.get_alerts()
    return jsonify({"success": True, "count": len(alerts), "data": alerts})


@portal_bp.route('/bid/<path:bid_number>/fundamentals', methods=['GET'])
def get_bid_fundamentals(bid_number):
    """Returns zero-PDF structured tender fundamentals."""
    doc = GemPortalService.get_bid_fundamentals(bid_number)
    if not doc:
        return jsonify({"success": False, "error": "Bid not found"}), 404
    return jsonify({"success": True, "data": doc})


@portal_bp.route('/auctions', methods=['GET'])
def get_auctions():
    """Returns live reverse auctions or forward scrap auction lots."""
    auction_type = request.args.get('type', 'reverse').lower()
    auctions = GemPortalService.get_auctions(auction_type=auction_type)
    return jsonify({"success": True, "type": auction_type, "count": len(auctions), "data": auctions})


@portal_bp.route('/portfolio', methods=['GET', 'POST'])
def manage_portfolio():
    """Fetches or updates user participated bids portfolio."""
    user_id = request.args.get('userId')
    if request.method == 'POST':
        payload = request.get_json(silent=True) or {}
        return jsonify({"success": True, "message": "Bid added to portfolio tracking", "data": payload}), 201

    portfolio = GemPortalService.get_portfolio(user_id=user_id)
    return jsonify({"success": True, "count": len(portfolio), "data": portfolio})
