"""学术检索路由（本地 papers 表全文/模糊搜索）"""
from flask import Blueprint, request, g
from sqlalchemy import or_
from models import Paper, SearchHistory
from extensions import db
from utils.response import ok, err
from utils.auth_helper import optional_login
from datetime import datetime

search_bp = Blueprint('search', __name__, url_prefix='/api/search')

# 允许的排序字段（防止 SQL 注入）
SORT_MAP = {
    'relevance': None,
    'citations': Paper.citations.desc(),
    'newest':    Paper.year.desc(),
}

SOURCE_MAP = {
    'arxiv':  'arXiv',
    'cnki':   '知网',
    'wanfang':'万方',
    'pubmed': 'PubMed',
    'wos':    'WoS',
    'scopus': 'Scopus',
}

DOC_TYPE_MAP = {
    '研究论文': '研究论文',
    '综述':     '综述',
    '会议论文': '会议论文',
    '学位论文': '学位论文',
}


@search_bp.route('', methods=['GET'])
@optional_login
def search():
    q       = (request.args.get('q') or '').strip()
    source  = (request.args.get('source') or '').strip()
    doc_type= (request.args.get('type') or '').strip()
    sort    = (request.args.get('sort') or 'relevance').strip()
    year    = request.args.get('year')
    if_min  = request.args.get('if_min', type=float)
    page    = max(1, request.args.get('page', 1, type=int))
    per_page= min(20, request.args.get('per_page', 10, type=int))

    if not q:
        return err('请输入检索关键词')

    query = Paper.query

    # 关键词过滤（标题 + 摘要）
    like_q = f'%{q}%'
    query = query.filter(
        or_(Paper.title.ilike(like_q), Paper.abstract.ilike(like_q),
            Paper.authors.ilike(like_q))
    )

    # 来源筛选
    if source and source in SOURCE_MAP:
        query = query.filter(Paper.source == SOURCE_MAP[source])

    # 文献类型筛选
    if doc_type and doc_type in DOC_TYPE_MAP:
        query = query.filter(Paper.doc_type == DOC_TYPE_MAP[doc_type])

    # 年份筛选
    if year:
        if year == '2024':
            query = query.filter(Paper.year == 2024)
        elif year == '2023':
            query = query.filter(Paper.year == 2023)
        elif year == '近5年':
            query = query.filter(Paper.year >= 2020)

    # 影响因子筛选
    if if_min is not None:
        query = query.filter(Paper.impact_factor >= if_min)

    # 排序
    order = SORT_MAP.get(sort)
    if order is not None:
        query = query.order_by(order)

    total = query.count()
    papers = query.offset((page - 1) * per_page).limit(per_page).all()

    # 记录检索历史
    if getattr(g, 'user_id', None) and total > 0:
        hist = SearchHistory.query.filter_by(user_id=g.user_id, keyword=q).first()
        if hist:
            hist.created_at = datetime.utcnow()
            hist.result_cnt = total
            hist.source = source
        else:
            hist = SearchHistory()
            hist.user_id = g.user_id
            hist.keyword = q
            hist.source = source
            hist.result_cnt = total
            db.session.add(hist)
        db.session.commit()

    return ok({
        'total':    total,
        'page':     page,
        'per_page': per_page,
        'papers':   [p.to_dict() for p in papers],
    })
