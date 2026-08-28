"""收藏夹路由"""
from flask import Blueprint, request, g
from extensions import db
from models import Favorite, Paper
from utils.response import ok, err, created, not_found, conflict
from utils.auth_helper import login_required

favorites_bp = Blueprint('favorites', __name__, url_prefix='/api/favorites')


@favorites_bp.route('', methods=['GET'])
@login_required
def list_favorites():
    uid     = g.user_id
    page    = max(1, request.args.get('page', 1, type=int))
    per_page= min(50, request.args.get('per_page', 20, type=int))
    limit   = request.args.get('limit', type=int)  # 首页预览用

    query = Favorite.query.filter_by(user_id=uid).order_by(Favorite.created_at.desc())

    if limit:
        items = query.limit(limit).all()
        return ok({'favorites': [f.to_dict() for f in items], 'total': query.count()})

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return ok({
        'total':     total,
        'page':      page,
        'per_page':  per_page,
        'favorites': [f.to_dict() for f in items],
    })


@favorites_bp.route('', methods=['POST'])
@login_required
def add_favorite():
    data     = request.get_json(silent=True) or {}
    paper_id = data.get('paper_id')
    if not paper_id:
        return err('缺少 paper_id')

    paper = Paper.query.get(paper_id)
    if not paper:
        return not_found('文献不存在')

    if Favorite.query.filter_by(user_id=g.user_id, paper_id=paper_id).first():
        return conflict('已收藏该文献')

    fav = Favorite(user_id=g.user_id, paper_id=paper_id)  # type: ignore
    db.session.add(fav)
    db.session.commit()
    return created(fav.to_dict(), msg='收藏成功')


@favorites_bp.route('/<int:fav_id>', methods=['DELETE'])
@login_required
def remove_favorite(fav_id):
    fav = Favorite.query.filter_by(id=fav_id, user_id=g.user_id).first()
    if not fav:
        return not_found('收藏不存在')
    db.session.delete(fav)
    db.session.commit()
    return ok(msg='已取消收藏')


@favorites_bp.route('/by-paper/<int:paper_id>', methods=['DELETE'])
@login_required
def remove_by_paper(paper_id):
    fav = Favorite.query.filter_by(paper_id=paper_id, user_id=g.user_id).first()
    if not fav:
        return not_found('收藏不存在')
    db.session.delete(fav)
    db.session.commit()
    return ok(msg='已取消收藏')
