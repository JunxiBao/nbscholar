"""智能工具路由：AI 对话 / 翻译 / 引用格式转换"""
import re
import json
from flask import Blueprint, request, current_app, Response, stream_with_context
from openai import OpenAI
from utils.response import ok, err
from utils.auth_helper import optional_login

tools_bp = Blueprint('tools', __name__, url_prefix='/api/tools')


def _get_client():
    return OpenAI(
        api_key  = current_app.config['DEEPSEEK_API_KEY'],
        base_url = current_app.config['DEEPSEEK_BASE_URL'],
    )


# ===================== AI 文献助手（流式） =====================
@tools_bp.route('/chat', methods=['POST'])
@optional_login
def chat():
    data     = request.get_json(silent=True) or {}
    messages = data.get('messages', [])
    model    = data.get('model', 'deepseek-chat')

    if not messages:
        return err('消息不能为空')

    # 系统提示
    system = {
        'role': 'system',
        'content': (
            '你是甬学阁科研信息服务门户的 AI 文献助手，专注于学术文献分析、摘要生成、翻译和科研指导。'
            '回答请使用中文，专业、简洁、有条理。'
        )
    }
    full_messages = [system] + messages

    def generate():
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
                    yield f"data: {json.dumps({'content': delta.content}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
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
