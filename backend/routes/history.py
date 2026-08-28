"""检索历史路由"""
from flask import Blueprint, request, g
from extensions import db
from models import SearchHistory
from utils.response import ok, not_found
from utils.auth_helper import login_required

history_bp = Blueprint('history', __name__, url_prefix='/api/history')


@history_bp.route('', methods=['GET'])
@login_required
def list_history():
    uid     = g.user_id
    page    = max(1, request.args.get('page', 1, type=int))
    per_page= min(50, request.args.get('per_page', 20, type=int))
    limit   = request.args.get('limit', type=int)

    query = SearchHistory.query.filter_by(user_id=uid).order_by(SearchHistory.created_at.desc())

    if limit:
        items = query.limit(limit).all()
        return ok({'history': [h.to_dict() for h in items], 'total': query.count()})

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return ok({
        'total':   total,
        'page':    page,
        'per_page':per_page,
        'history': [h.to_dict() for h in items],
    })


@history_bp.route('/<int:hist_id>', methods=['DELETE'])
@login_required
def delete_history(hist_id):
    h = SearchHistory.query.filter_by(id=hist_id, user_id=g.user_id).first()
    if not h:
        return not_found('记录不存在')
    db.session.delete(h)
    db.session.commit()
    return ok(msg='已删除')


@history_bp.route('/clear', methods=['DELETE'])
@login_required
def clear_history():
    SearchHistory.query.filter_by(user_id=g.user_id).delete()
    db.session.commit()
    return ok(msg='检索历史已清空')
