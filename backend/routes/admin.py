"""管理员后台路由：管理权限和培训活动"""
from flask import Blueprint, request
from extensions import db
from models import AdminUser, TrainingEvent, Enrollment, User
from utils.response import ok, err, not_found
from utils.auth_helper import admin_required, super_admin_required
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ==========================================
# 超级管理员路由：审批管理员账号
# ==========================================

@admin_bp.route('/pending', methods=['GET'])
@super_admin_required
def list_pending_admins():
    """列出所有待审批和已拒绝的管理员账号（排除超级管理员自身）"""
    admins = AdminUser.query.filter(AdminUser.role == 'admin', AdminUser.status.in_(['pending', 'rejected'])).order_by(AdminUser.created_at.desc()).all()
    return ok({'admins': [a.to_dict() for a in admins]})


@admin_bp.route('/approve/<int:admin_id>', methods=['PUT'])
@super_admin_required
def approve_admin(admin_id):
    """审批管理员账号"""
    data = request.get_json(silent=True) or {}
    status = data.get('status') # 'approved', 'rejected', 或 'pending'
    
    if status not in ['approved', 'rejected', 'pending']:
        return err('无效的状态值')
        
    admin_user = AdminUser.query.filter_by(id=admin_id, role='admin').first()
    if not admin_user:
        return not_found('待审批的管理员账号不存在')
        
    admin_user.status = status
    db.session.commit()
    return ok(msg=f'账号已更新为 {status}')


@admin_bp.route('/<int:admin_id>', methods=['DELETE'])
@super_admin_required
def delete_admin(admin_id):
    """注销(删除)管理员账号"""
    admin_user = AdminUser.query.filter_by(id=admin_id, role='admin').first()
    if not admin_user:
        return not_found('管理员账号不存在')
        
    db.session.delete(admin_user)
    db.session.commit()
    return ok(msg='账号已注销')


@admin_bp.route('/all_admins', methods=['GET'])
@super_admin_required
def list_all_admins():
    """列出所有已批准的管理员（可选功能）"""
    admins = AdminUser.query.filter_by(role='admin', status='approved').order_by(AdminUser.created_at.desc()).all()
    return ok({'admins': [a.to_dict() for a in admins]})

@admin_bp.route('/history', methods=['GET'])
@super_admin_required
def get_approval_history():
    """获取审批记录（排除超级管理员自身）"""
    admins = AdminUser.query.filter(AdminUser.role == 'admin', AdminUser.status.in_(['approved', 'rejected'])).order_by(AdminUser.created_at.desc()).all()
    return ok({'admins': [a.to_dict() for a in admins]})


# ==========================================
# 普通管理员路由：管理培训活动
# ==========================================

@admin_bp.route('/training', methods=['GET'])
@admin_required
def list_training_events():
    """列出所有培训活动"""
    events = TrainingEvent.query.order_by(TrainingEvent.event_date.desc()).all()
    return ok({'events': [e.to_dict() for e in events]})


@admin_bp.route('/training', methods=['POST'])
@admin_required
def create_training_event():
    """发布新的培训活动"""
    data = request.get_json(silent=True) or {}
    
    if not data.get('title') or not data.get('event_date'):
        return err('标题和活动日期不能为空')
        
    try:
        event_date = datetime.strptime(data['event_date'], '%Y-%m-%d %H:%M')
        end_time = datetime.strptime(data['end_time'], '%H:%M') if data.get('end_time') else None
    except ValueError:
        return err('日期时间格式不正确，应为 YYYY-MM-DD HH:MM / HH:MM')
        
    event = TrainingEvent(
        title=data['title'].strip(),
        speaker=data.get('speaker', '').strip(),
        affiliation=data.get('affiliation', '').strip(),
        event_date=event_date,
        end_time=end_time,
        location=data.get('location', '').strip(),
        event_type=data.get('event_type', '').strip(),
        platform=data.get('platform', '').strip(),
        capacity=int(data.get('capacity', 100)),
        description=data.get('description', '').strip(),
        color=data.get('color', '#2563EB')
    )
    db.session.add(event)
    db.session.commit()
    return ok({'event': event.to_dict()}, msg='发布成功')


@admin_bp.route('/training/<int:event_id>', methods=['PUT'])
@admin_required
def update_training_event(event_id):
    """更新培训活动"""
    event = TrainingEvent.query.get(event_id)
    if not event:
        return not_found('活动不存在')
        
    data = request.get_json(silent=True) or {}
    if 'title' in data: event.title = data['title'].strip()
    if 'speaker' in data: event.speaker = data['speaker'].strip()
    if 'affiliation' in data: event.affiliation = data['affiliation'].strip()
    if 'location' in data: event.location = data['location'].strip()
    if 'event_type' in data: event.event_type = data['event_type'].strip()
    if 'platform' in data: event.platform = data['platform'].strip()
    if 'capacity' in data: event.capacity = int(data['capacity'])
    if 'description' in data: event.description = data['description'].strip()
    if 'color' in data: event.color = data['color'].strip()
    
    if 'event_date' in data:
        try:
            event.event_date = datetime.strptime(data['event_date'], '%Y-%m-%d %H:%M')
        except ValueError:
            return err('日期格式错误')
    if 'end_time' in data:
        if data['end_time']:
            try:
                event.end_time = datetime.strptime(data['end_time'], '%H:%M')
            except ValueError:
                return err('时间格式错误')
        else:
            event.end_time = None
            
    db.session.commit()
    return ok({'event': event.to_dict()}, msg='更新成功')


@admin_bp.route('/training/<int:event_id>', methods=['DELETE'])
@admin_required
def delete_training_event(event_id):
    """删除培训活动"""
    event = TrainingEvent.query.get(event_id)
    if not event:
        return not_found('活动不存在')
        
    db.session.delete(event)
    db.session.commit()
    return ok(msg='活动已删除')


@admin_bp.route('/training/<int:event_id>/enrollments', methods=['GET'])
@admin_required
def list_enrollments(event_id):
    """查看活动的报名人员列表"""
    event = TrainingEvent.query.get(event_id)
    if not event:
        return not_found('活动不存在')
        
    enrollments = Enrollment.query.filter_by(event_id=event_id).all()
    results = []
    for enr in enrollments:
        user = User.query.get(enr.user_id)
        if user:
            results.append({
                'enrollment_id': enr.id,
                'status': enr.status,
                'enrolled_at': enr.created_at.strftime('%Y-%m-%d %H:%M'),
                'user': user.to_dict()
            })
            
    return ok({
        'event': event.to_dict(),
        'enrollments': results
    })

# ==========================================
# 普通管理员路由：管理普通用户
# ==========================================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """列出所有普通用户（包含待审批、已通过、已拒绝）"""
    users = User.query.order_by(User.created_at.desc()).all()
    return ok({'users': [u.to_dict() for u in users]})

@admin_bp.route('/users/<int:user_id>/approve', methods=['PUT'])
@admin_required
def approve_user(user_id):
    """审批普通用户账号"""
    data = request.get_json(silent=True) or {}
    status = data.get('status')
    if status not in ['approved', 'rejected', 'pending']:
        return err('无效的状态值')
        
    user = User.query.get(user_id)
    if not user:
        return not_found('用户不存在')
        
    user.status = status
    db.session.commit()
    return ok(msg=f'账号已更新为 {status}')
