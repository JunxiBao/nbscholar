"""智能工具路由：AI 对话 / 翻译 / 引用格式转换"""
import re
import json
import threading
from flask import Blueprint, request, current_app, Response, stream_with_context, g
from openai import OpenAI
from utils.response import ok, err
from utils.auth_helper import optional_login, login_required
from extensions import db
from models import ChatSession, ChatMessage

tools_bp = Blueprint('tools', __name__, url_prefix='/api/tools')


def _get_client():
    return OpenAI(
        api_key  = current_app.config['DEEPSEEK_API_KEY'],
        base_url = current_app.config['DEEPSEEK_BASE_URL'],
    )


def _generate_title(app, session_id, first_msg):
    with app.app_context():
        try:
            client = _get_client()
            resp = client.chat.completions.create(
                model='deepseek-chat',
                messages=[
                    {'role': 'system', 'content': '你是一个标题生成助手。请用10个字以内的简体中文概括用户的意图或问题，只输出标题本身，不要加书名号。'},
                    {'role': 'user', 'content': first_msg}
                ],
                max_tokens=20,
                temperature=0.3
            )
            title = resp.choices[0].message.content.strip()
            session = ChatSession.query.get(session_id)
            if session:
                session.title = title
                db.session.commit()
        except Exception as e:
            app.logger.error(f'Title generation error: {e}')


@tools_bp.route('/chat', methods=['POST'])
@optional_login
def chat():
    data       = request.get_json(silent=True) or {}
    messages   = data.get('messages', [])
    model      = data.get('model', 'deepseek-chat')
    session_id = data.get('session_id')

    if not messages:
        return err('消息不能为空')

    user_id = getattr(g, 'user_id', None)
    is_first_msg = False

    if user_id:
        if not session_id:
            session = ChatSession(user_id=user_id)
            db.session.add(session)
            db.session.commit()
            session_id = session.id
            is_first_msg = True
        else:
            session = ChatSession.query.filter_by(id=session_id, user_id=user_id).first()
            if not session:
                session_id = None
        
        if session_id:
            last_user_msg = messages[-1]['content']
            db.session.add(ChatMessage(session_id=session_id, role='user', content=last_user_msg))
            session.updated_at = db.func.now()
            db.session.commit()
            
            if is_first_msg:
                app = current_app._get_current_object()
                threading.Thread(target=_generate_title, args=(app, session_id, last_user_msg)).start()

    system = {
        'role': 'system',
        'content': (
            '你是甬学阁科研信息服务门户的 AI 文献助手，专注于学术文献分析、摘要生成、翻译和科研指导。'
            '回答请使用中文，专业、简洁、有条理。'
        )
    }
    full_messages = [system] + messages

    def generate():
        if is_first_msg and session_id:
            yield f"data: {json.dumps({'_session_id': session_id})}\n\n"
            
        full_reply = ""
        try:
            client = _get_client()
            stream = client.chat.completions.create(
                model    = model,
                messages = full_messages,
                stream   = True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_reply += delta.content
                    yield f"data: {json.dumps({'content': delta.content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            
            if user_id and session_id and full_reply:
                db.session.add(ChatMessage(session_id=session_id, role='assistant', content=full_reply))
                db.session.commit()
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control':              'no-cache',
            'X-Accel-Buffering':          'no',
            'Access-Control-Allow-Origin':'*',
        }
    )


@tools_bp.route('/chat/sessions', methods=['GET'])
@login_required
def get_sessions():
    sessions = ChatSession.query.filter_by(user_id=g.user_id).order_by(ChatSession.updated_at.desc()).all()
    return ok([s.to_dict() for s in sessions])


@tools_bp.route('/chat/sessions/<int:session_id>', methods=['GET'])
@login_required
def get_session_history(session_id):
    session = ChatSession.query.filter_by(id=session_id, user_id=g.user_id).first()
    if not session:
        return err('会话不存在', 404)
    msgs = session.messages.order_by(ChatMessage.created_at.asc()).all()
    return ok([m.to_dict() for m in msgs])


@tools_bp.route('/chat/sessions/<int:session_id>', methods=['DELETE'])
@login_required
def delete_session(session_id):
    session = ChatSession.query.filter_by(id=session_id, user_id=g.user_id).first()
    if not session:
        return err('会话不存在', 404)
    db.session.delete(session)
    db.session.commit()
    return ok(msg='已删除')


# ===================== 翻译 / 润色 =====================
@tools_bp.route('/translate', methods=['POST'])
@optional_login
def translate():
    data     = request.get_json(silent=True) or {}
    text     = (data.get('text') or '').strip()
    trans_type = data.get('type', 'zh2en')  # zh2en / en2zh / polish

    if not text:
        return err('文本不能为空')
    if len(text) > 5000:
        return err('文本过长（最多 5000 字符）')

    PROMPTS = {
        'zh2en':   f'请将以下中文学术文本翻译成专业英文，保持学术风格：\n\n{text}',
        'en2zh':   f'请将以下英文学术文本翻译成专业中文，保持学术风格：\n\n{text}',
        'polish':  f'请对以下学术文本进行专业润色，提升表达的准确性和学术规范性，保留原意：\n\n{text}',
    }
    prompt = PROMPTS.get(trans_type, PROMPTS['zh2en'])

    try:
        client = _get_client()
        resp   = client.chat.completions.create(
            model    = 'deepseek-chat',
            messages = [
                {'role': 'system', 'content': '你是专业的学术翻译与润色助手。'},
                {'role': 'user',   'content': prompt},
            ],
            temperature = 0.3,
            max_tokens  = 2000,
        )
        result = resp.choices[0].message.content.strip()
        return ok({'result': result})
    except Exception as e:
        current_app.logger.error(f'Translate error: {e}')
        return err(f'翻译服务暂时不可用：{str(e)}', 503)


# ===================== 引用格式转换 =====================
@tools_bp.route('/cite', methods=['POST'])
@optional_login
def cite():
    data       = request.get_json(silent=True) or {}
    raw_cite   = (data.get('citation') or '').strip()
    target_fmt = data.get('format', 'gbt')  # gbt / apa / mla / bibtex / vancouver

    if not raw_cite:
        return err('请输入引用内容')

    FORMAT_NAMES = {
        'gbt':       'GB/T 7714-2015',
        'apa':       'APA 7th Edition',
        'mla':       'MLA 9th Edition',
        'vancouver': 'Vancouver',
        'bibtex':    'BibTeX',
    }
    fmt_name = FORMAT_NAMES.get(target_fmt, target_fmt)

    prompt = (
        f'请将以下引用信息转换为 {fmt_name} 格式，只输出格式化后的引用文本，不要其他说明：\n\n{raw_cite}'
    )

    try:
        client = _get_client()
        resp   = client.chat.completions.create(
            model    = 'deepseek-chat',
            messages = [
                {'role': 'system', 'content': '你是学术引用格式专家，精通各种引用规范。'},
                {'role': 'user',   'content': prompt},
            ],
            temperature = 0.1,
            max_tokens  = 500,
        )
        result = resp.choices[0].message.content.strip()
        return ok({'result': result, 'format': fmt_name})
    except Exception as e:
        current_app.logger.error(f'Cite error: {e}')
        return err(f'格式转换服务暂时不可用：{str(e)}', 503)
