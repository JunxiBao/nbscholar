"""用户信息路由"""
from flask import request, g
from flask import Blueprint
from extensions import db, bcrypt
from models import User, SearchHistory, Favorite, Enrollment
from utils.response import ok, err, not_found
from utils.auth_helper import login_required
from utils.file_helper import save_base64_image

user_bp = Blueprint('user', __name__, url_prefix='/api/user')


@user_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    user = User.query.get(g.user_id)
    if not user:
        return not_found('用户不存在')
    return ok(user.to_dict())


@user_bp.route('/me', methods=['PUT'])
@login_required
def update_me():
    user = User.query.get(g.user_id)
    if not user:
        return not_found('用户不存在')

    data = request.get_json(silent=True) or {}
    for field in ('name', 'institution', 'age', 'gender', 'avatar_url'):
        if field in data:
            val = data[field]
            if field == 'avatar_url':
                val = save_base64_image(val)
            setattr(user, field, val)

    # 修改密码（可选）
    new_pw = data.get('new_password')
    if new_pw:
        old_pw = data.get('old_password', '')
        if not bcrypt.check_password_hash(user.password, old_pw):
            return err('原密码错误')
        if len(new_pw) < 6:
            return err('新密码长度不能少于 6 位')
        user.password = bcrypt.generate_password_hash(new_pw).decode('utf-8')

    db.session.commit()
    return ok(user.to_dict(), msg='更新成功')


@user_bp.route('/stats', methods=['GET'])
@login_required
def get_stats():
    """首页统计数字：历史检索数 / 收藏文献数 / 培训报名数"""
    uid = g.user_id
    history_cnt    = SearchHistory.query.filter_by(user_id=uid).count()
    favorites_cnt  = Favorite.query.filter_by(user_id=uid).count()
    enrollment_cnt = Enrollment.query.filter_by(user_id=uid, status='enrolled').count()
    return ok({
        'history_count':    history_cnt,
        'favorites_count':  favorites_cnt,
        'enrollment_count': enrollment_cnt,
    })
