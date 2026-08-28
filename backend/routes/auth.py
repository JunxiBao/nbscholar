"""认证路由：登录 / 注册 / 登出"""
import jwt
import time
from flask import Blueprint, request, current_app
from extensions import db, bcrypt
from models import User
from utils.response import ok, err, conflict, unauthorized
from utils.file_helper import save_base64_image

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def _make_token(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': int(time.time()) + current_app.config['JWT_ACCESS_TOKEN_EXPIRES'],
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    account  = (data.get('account') or '').strip()
    password = data.get('password') or ''

    if not account or not password:
        return err('账号和密码不能为空')
    if len(password) < 6:
        return err('密码长度不能少于 6 位')

    if User.query.filter_by(account=account).first():
        return conflict('该用户名已被占用，请换一个重试')

    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(
        account     = account,
        password    = pw_hash,
        name        = data.get('name', ''),
        institution = data.get('institution', ''),
        age         = data.get('age'),
        gender      = data.get('gender', ''),
        avatar_url  = save_base64_image(data.get('avatar_url', '')),
    )
    db.session.add(user)
    db.session.commit()

    token = _make_token(user.id)
    return ok({'token': token, 'user': user.to_dict()}, msg='注册成功')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    account  = (data.get('account') or '').strip()
    password = data.get('password') or ''

    if not account or not password:
        return err('账号和密码不能为空')

    user = User.query.filter_by(account=account).first()
    if not user or not bcrypt.check_password_hash(user.password, password):
        return unauthorized('账号或密码错误')

    token = _make_token(user.id)
    return ok({'token': token, 'user': user.to_dict()}, msg='登录成功')


@auth_bp.route('/logout', methods=['POST'])
def logout():
    # JWT 无状态，客户端清除 token 即可
    return ok(msg='已退出登录')

from utils.auth_helper import login_required

@auth_bp.route('/account', methods=['DELETE'])
@login_required
def delete_account():
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return err('用户不存在')
    
    db.session.delete(user)
    db.session.commit()
    return ok(msg='账号及所有关联数据已成功注销')

@auth_bp.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return err('用户不存在')
    
    data = request.get_json(silent=True) or {}
    if 'institution' in data:
        user.institution = data['institution'].strip()
    
    db.session.commit()
    return ok({'user': user.to_dict()}, msg='资料已更新')

@auth_bp.route('/password', methods=['PUT'])
@login_required
def update_password():
    from flask import g
    user = User.query.get(g.user_id)
    if not user:
        return err('用户不存在')
    
    data = request.get_json(silent=True) or {}
    new_password = data.get('new_password')
    
    if not new_password or len(new_password) < 6:
        return err('新密码长度不能少于 6 位')
        
    pw_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    user.password = pw_hash
    db.session.commit()
    return ok(msg='密码已成功修改')
