"""培训活动路由"""
from datetime import datetime
from flask import Blueprint, request, g
from sqlalchemy import extract
from extensions import db
from models import TrainingEvent, Enrollment
from utils.response import ok, err, created, not_found, conflict
from utils.auth_helper import login_required, optional_login

training_bp = Blueprint('training', __name__, url_prefix='/api/training')

EVENT_TYPE_MAP = {
    '线上': '线上直播',
    '线下': '线下讲座',
    '录播': '录播课程',
    '工作坊': '工作坊',
}


@training_bp.route('', methods=['GET'])
@optional_login
def list_events():
    """活动列表（支持按月份、类型筛选）"""
    event_type = (request.args.get('type') or '').strip()
    year  = request.args.get('year',  type=int)
    month = request.args.get('month', type=int)
    page  = max(1, request.args.get('page', 1, type=int))
    per_page = min(50, request.args.get('per_page', 10, type=int))

    query = TrainingEvent.query.order_by(TrainingEvent.event_date.asc())

    if event_type and event_type in EVENT_TYPE_MAP:
        query = query.filter(TrainingEvent.event_type == EVENT_TYPE_MAP[event_type])

    if year:
        query = query.filter(extract('year', TrainingEvent.event_date) == year)
    if month:
        query = query.filter(extract('month', TrainingEvent.event_date) == month)

    total = query.count()
    events = query.offset((page - 1) * per_page).limit(per_page).all()

    # 如已登录，标注用户的报名状态
    enrolled_ids = set()
    if getattr(g, 'user_id', None):
        records = Enrollment.query.filter_by(
            user_id=g.user_id, status='enrolled'
        ).all()
        enrolled_ids = {r.event_id for r in records}

    data = []
    for ev in events:
        d = ev.to_dict()
        d['enrolled'] = ev.id in enrolled_ids
        data.append(d)

    return ok({'total': total, 'page': page, 'per_page': per_page, 'events': data})


@training_bp.route('/<int:event_id>', methods=['GET'])
@optional_login
def get_event(event_id):
    ev = TrainingEvent.query.get(event_id)
    if not ev:
        return not_found('活动不存在')
    d = ev.to_dict()
    if getattr(g, 'user_id', None):
        enroll = Enrollment.query.filter_by(
            user_id=g.user_id, event_id=event_id, status='enrolled'
        ).first()
        d['enrolled'] = bool(enroll)
    return ok(d)


@training_bp.route('/<int:event_id>/enroll', methods=['POST'])
@login_required
def enroll(event_id):
    ev = TrainingEvent.query.get(event_id)
    if not ev:
        return not_found('活动不存在')
    if ev.enrolled_cnt >= ev.capacity:
        return err('该活动报名人数已满', 400)

    existing = Enrollment.query.filter_by(
        user_id=g.user_id, event_id=event_id
    ).first()
    if existing:
        if existing.status == 'enrolled':
            return conflict('您已报名该活动')
        # 曾取消，重新报名
        existing.status = 'enrolled'
        ev.enrolled_cnt += 1
        db.session.commit()
        return ok(existing.to_dict(), msg='报名成功')

    enroll_record = Enrollment(user_id=g.user_id, event_id=event_id)  # type: ignore
    ev.enrolled_cnt += 1
    db.session.add(enroll_record)
    db.session.commit()
    return created(enroll_record.to_dict(), msg='报名成功！')


@training_bp.route('/<int:event_id>/enroll', methods=['DELETE'])
@login_required
def cancel_enroll(event_id):
    existing = Enrollment.query.filter_by(
        user_id=g.user_id, event_id=event_id, status='enrolled'
    ).first()
    if not existing:
        return not_found('未报名该活动')
    existing.status = 'cancelled'
    ev = TrainingEvent.query.get(event_id)
    if ev and ev.enrolled_cnt > 0:
        ev.enrolled_cnt -= 1
    db.session.commit()
    return ok(msg='已取消报名')


@training_bp.route('/my', methods=['GET'])
@login_required
def my_events():
    """我的报名记录"""
    records = (
        Enrollment.query
        .filter_by(user_id=g.user_id, status='enrolled')
        .order_by(Enrollment.created_at.desc())
        .all()
    )
    data = []
    for r in records:
        ev_dict = r.event.to_dict()
        ev_dict['enrollment_status'] = r.status
        ev_dict['enrolled_at'] = r.created_at.strftime('%Y-%m-%d %H:%M')
        data.append(ev_dict)
    return ok({'enrollments': data})
