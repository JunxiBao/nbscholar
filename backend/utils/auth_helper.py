"""JWT 认证辅助函数"""
import jwt
import functools
from flask import request, current_app, g
from utils.response import unauthorized


def get_token():
    """从 Authorization: Bearer <token> 或 cookie 中获取 token"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return request.cookies.get('token', '')


def decode_token(token):
    """解码 JWT，返回 payload 或 None"""
    try:
        return jwt.decode(
            token,
            current_app.config['JWT_SECRET_KEY'],
            algorithms=['HS256']
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login_required(f):
    """路由装饰器：要求登录"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        if not token:
            return unauthorized('未提供认证 token')
        payload = decode_token(token)
        if payload is None:
            return unauthorized('token 无效或已过期')
        g.user_id = payload['user_id']
        return f(*args, **kwargs)
    return decorated


def optional_login(f):
    """路由装饰器：登录可选（不强制）"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        payload = decode_token(token) if token else None
        g.user_id = payload['user_id'] if payload else None
        return f(*args, **kwargs)
    return decorated
