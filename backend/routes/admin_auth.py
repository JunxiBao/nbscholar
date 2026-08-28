"""管理员认证路由：登录 / 注册"""
import jwt
import time
from flask import Blueprint, request, current_app
from extensions import db, bcrypt
from models import AdminUser
from utils.response import ok, err, conflict, unauthorized

admin_auth_bp = Blueprint('admin_auth', __name__, url_prefix='/api/admin_auth')

def _make_admin_token(admin_id: int, role: str) -> str:
    payload = {
        'admin_id': admin_id,
        'role': role,
        'exp': int(time.time()) + current_app.config.get('JWT_ADMIN_ACCESS_TOKEN_EXPIRES', 7200),
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

@admin_auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    account  = (data.get('account') or '').strip()
    password = data.get('password') or ''
    name     = data.get('name') or ''
    remark   = data.get('remark') or ''

    if not account or not password:
        return err('账号和密码不能为空')
    if len(password) < 6:
        return err('密码长度不能少于 6 位')

    if AdminUser.query.filter_by(account=account).first():
        return conflict('该管理员账号已被占用，请换一个重试')

    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    admin_user = AdminUser(
        account  = account,
        password = pw_hash,
        name     = name,
        remark   = remark,
        role     = 'admin',
        status   = 'pending'  # 必须由超级管理员批准
    )
    db.session.add(admin_user)
    db.session.commit()

    return ok({'admin': admin_user.to_dict()}, msg='注册成功，请等待超级管理员审批')

@admin_auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    account  = (data.get('account') or '').strip()
    password = data.get('password') or ''

    if not account or not password:
        return err('账号和密码不能为空')

    admin_user = AdminUser.query.filter_by(account=account).first()
    if not admin_user or not bcrypt.check_password_hash(admin_user.password, password):
        return unauthorized('账号或密码错误')
        
    if admin_user.status == 'pending':
        return unauthorized('账号正在审批中，请稍后再试')
    if admin_user.status == 'rejected':
        return unauthorized('账号审批被拒绝')

    token = _make_admin_token(admin_user.id, admin_user.role)
    return ok({'token': token, 'admin': admin_user.to_dict()}, msg='登录成功')

@admin_auth_bp.route('/logout', methods=['POST'])
def logout():
    return ok(msg='已退出登录')
