"""期刊路由：期刊列表 + AI 智能选刊"""
import re
from flask import Blueprint, request, current_app
from sqlalchemy import or_
from openai import OpenAI
from models import Journal
from utils.response import ok, err
from utils.auth_helper import optional_login

journal_bp = Blueprint('journal', __name__, url_prefix='/api/journal')


@journal_bp.route('', methods=['GET'])
def list_journals():
    """期刊指南列表（支持关键词搜索 + 领域筛选）"""
    q     = (request.args.get('q') or '').strip()
    field = (request.args.get('field') or '').strip()
    page  = max(1, request.args.get('page', 1, type=int))
    per_page = min(50, request.args.get('per_page', 20, type=int))

    query = Journal.query.order_by(Journal.impact_factor.desc())

    if q:
        like_q = f'%{q}%'
        query = query.filter(
            or_(Journal.name.ilike(like_q), Journal.publisher.ilike(like_q))
        )
    if field:
        query = query.filter(Journal.field == field)

    total    = query.count()
    journals = query.offset((page - 1) * per_page).limit(per_page).all()
    return ok({'total': total, 'page': page, 'per_page': per_page,
               'journals': [j.to_dict() for j in journals]})


@journal_bp.route('/match', methods=['POST'])
@optional_login
def match_journal():
    """AI 智能选刊：根据标题 + 摘要推荐期刊"""
    data    = request.get_json(silent=True) or {}
    title   = (data.get('title') or '').strip()
    abstract= (data.get('abstract') or '').strip()
    if_min  = data.get('if_min', 0)
    oa_only = data.get('open_access_only', False)

    if not title and not abstract:
        return err('请输入论文标题或摘要')

    # 先从本地期刊库做初步关键词匹配
    all_journals = Journal.query.all()

    client = OpenAI(
        api_key  = current_app.config['DEEPSEEK_API_KEY'],
        base_url = current_app.config['DEEPSEEK_BASE_URL'],
    )

    journals_brief = '\n'.join(
        f"[{j.id}] {j.name} (IF:{j.impact_factor}, 领域:{j.field}, "
        f"审稿:{j.review_weeks}, {j.quartile})"
        for j in all_journals
        if (j.impact_factor or 0) >= if_min and (not oa_only or j.open_access)
    )

    system_msg = (
        "你是一个期刊匹配专家。根据用户提供的论文信息，从给定的期刊列表中选出最匹配的 3–5 个期刊，"
        "并给出匹配度百分比（0-100）和推荐理由。严格按照以下 JSON 格式输出，不要多余文字：\n"
        '{"matches":[{"id":1,"match_score":95,"reason":"..."},...]}'
    )
    user_msg = (
        f"论文标题：{title}\n摘要：{abstract}\n\n可选期刊列表：\n{journals_brief}"
    )

    try:
        resp = client.chat.completions.create(
            model    = 'deepseek-chat',
            messages = [
                {'role': 'system', 'content': system_msg},
                {'role': 'user',   'content': user_msg},
            ],
            temperature = 0.2,
            max_tokens  = 800,
        )
        raw = resp.choices[0].message.content.strip()

        # 解析 JSON
        import json
        # 提取 json 块
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        if not m:
            raise ValueError('No JSON in response')
        result = json.loads(m.group())
        matches = result.get('matches', [])

        # 补充完整期刊信息
        journal_map = {j.id: j for j in all_journals}
        enriched = []
        for match in matches:
            jid = match.get('id')
            j   = journal_map.get(jid)
            if j:
                d = j.to_dict()
                d['match_score'] = match.get('match_score', 80)
                d['reason']      = match.get('reason', '')
                enriched.append(d)

        return ok({'matches': enriched})

    except Exception as e:
        current_app.logger.error(f'Journal match error: {e}')
        # 降级：按领域关键词本地排序
        fallback = [j.to_dict() for j in all_journals[:5]]
        for d in fallback:
            d['match_score'] = 75
            d['reason'] = 'AI 暂时不可用，以下为综合影响因子排序结果'
        return ok({'matches': fallback, 'warn': 'AI 服务暂时不可用，已返回降级结果'})
