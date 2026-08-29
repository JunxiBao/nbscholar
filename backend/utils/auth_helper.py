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
        if 'user_id' not in payload:
            return unauthorized('此操作需要普通用户账号，您当前可能是管理员账号。')
            
        from models import User
        user = User.query.get(payload['user_id'])
        if not user:
            return unauthorized('ACCOUNT_DELETED')
        if getattr(user, 'status', 'approved') == 'rejected':
            return unauthorized('ACCOUNT_REVOKED')
            
        g.user_id = payload['user_id']
        return f(*args, **kwargs)
    return decorated


def optional_login(f):
    """路由装饰器：登录可选（不强制）"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        payload = decode_token(token) if token else None
        g.user_id = payload.get('user_id') if payload else None
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """路由装饰器：要求管理员权限"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        if not token:
            return unauthorized('未提供认证 token')
        payload = decode_token(token)
        if payload is None:
            return unauthorized('token 无效或已过期')
        if 'admin_id' not in payload:
            return unauthorized('无管理员权限')
        if payload.get('role') not in ['admin', 'super_admin']:
            return unauthorized('角色不匹配')
            
        from models import AdminUser
        admin = AdminUser.query.get(payload['admin_id'])
        if not admin:
            return unauthorized('ACCOUNT_DELETED')
        if getattr(admin, 'status', 'approved') == 'rejected':
            return unauthorized('ACCOUNT_REVOKED')
        
        g.admin_id = payload['admin_id']
        g.role = payload['role']
        return f(*args, **kwargs)
    return decorated


def super_admin_required(f):
    """路由装饰器：要求超级管理员权限"""
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        if not token:
            return unauthorized('未提供认证 token')
        payload = decode_token(token)
        if payload is None:
            return unauthorized('token 无效或已过期')
        if 'admin_id' not in payload:
            return unauthorized('无管理员权限')
        if payload.get('role') != 'super_admin':
            return unauthorized('需要超级管理员权限')
            
        from models import AdminUser
        admin = AdminUser.query.get(payload['admin_id'])
        if not admin:
            return unauthorized('ACCOUNT_DELETED')
        if getattr(admin, 'status', 'approved') == 'rejected':
            return unauthorized('ACCOUNT_REVOKED')
        
        g.admin_id = payload['admin_id']
        g.role = payload['role']
        return f(*args, **kwargs)
    return decorated
