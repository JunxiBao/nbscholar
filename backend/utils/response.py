"""统一 JSON 响应格式"""
from flask import jsonify


def ok(data=None, msg='success', **kwargs):
    payload = {'code': 0, 'msg': msg}
    if data is not None:
        payload['data'] = data
    payload.update(kwargs)
    return jsonify(payload), 200


def created(data=None, msg='created'):
    payload = {'code': 0, 'msg': msg}
    if data is not None:
        payload['data'] = data
    return jsonify(payload), 201


def err(msg='error', code=400):
    return jsonify({'code': -1, 'msg': msg}), code


def unauthorized(msg='请先登录'):
    return jsonify({'code': 401, 'msg': msg}), 401


def not_found(msg='资源不存在'):
    return jsonify({'code': 404, 'msg': msg}), 404


def conflict(msg='资源已存在'):
    return jsonify({'code': 409, 'msg': msg}), 409
