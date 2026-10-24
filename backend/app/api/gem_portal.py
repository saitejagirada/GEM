"""
GeM Portal Intelligence API Blueprint
Exposes endpoints for market pulse, personalized tender feeds, fundamentals deconstruction,
reverse/forward auctions, and participated portfolios.
"""

from flask import Blueprint, jsonify, request
from ..services.gem_portal_service import GemPortalService

portal_bp = Blueprint('portal', __name__)


@portal_bp.route('/market-pulse', methods=['GET'])
def get_market_pulse():
    """Returns today's high-level tender market metrics."""
    data = GemPortalService.get_market_pulse()
    return jsonify({"success": True, "data": data})


@portal_bp.route('/feed', methods=['GET'])
def get_feed():
    """Returns ranked tenders with AI fit scoring."""
    user_id = request.args.get('userId')
    category = request.args.get('category')
    state = request.args.get('state')
    min_score_raw = request.args.get('minScore')
    min_score = int(min_score_raw) if min_score_raw and min_score_raw.isdigit() else None

    bids = GemPortalService.get_feed(user_id=user_id, category=category, state=state, min_score=min_score)
    return jsonify({"success": True, "count": len(bids), "data": bids})


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
        # In mock mode, acknowledge addition
        return jsonify({"success": True, "message": "Bid added to portfolio tracking", "data": payload}), 201

    portfolio = GemPortalService.get_portfolio(user_id=user_id)
    return jsonify({"success": True, "count": len(portfolio), "data": portfolio})
