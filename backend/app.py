"""Flask 应用入口"""
import sys
import os

# 使后端子目录中的导入能正确解析
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from config import Config
from extensions import db, bcrypt, cors

# 蓝图
from routes.auth     import auth_bp
from routes.user     import user_bp
from routes.search   import search_bp
from routes.favorites import favorites_bp
from routes.history  import history_bp
from routes.training import training_bp
from routes.journal  import journal_bp
from routes.tools    import tools_bp
from routes.admin_auth import admin_auth_bp
from routes.admin    import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ---- 扩展初始化 ----
    db.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': Config.CORS_ORIGINS}},
                  supports_credentials=True)

    # ---- 注册蓝图 ----
    for bp in (auth_bp, user_bp, search_bp, favorites_bp,
               history_bp, training_bp, journal_bp, tools_bp,
               admin_auth_bp, admin_bp):
        app.register_blueprint(bp)

    # ---- 健康检查 ----
    @app.route('/api/ping')
    def ping():
        return {'status': 'ok', 'message': '甬学阁后端服务运行正常'}

    # ---- 静态文件服务（如头像） ----
    from flask import send_from_directory
    @app.route('/api/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config.get('UPLOAD_FOLDER', 'uploads'), filename)

    # ---- 建表（开发模式自动建表） ----
    with app.app_context():
        db.create_all()
        # 初始化默认超级管理员
        from models import AdminUser
        sa_account = app.config.get('SUPER_ADMIN_ACCOUNT', 'superadmin')
        sa_password = app.config.get('SUPER_ADMIN_PASSWORD', '123456')
        
        if not AdminUser.query.filter_by(account=sa_account).first():
            pw_hash = bcrypt.generate_password_hash(sa_password).decode('utf-8')
            super_admin = AdminUser(
                account=sa_account,
                password=pw_hash,
                name='默认超级管理员',
                role='super_admin',
                status='approved'
            )
            db.session.add(super_admin)
            db.session.commit()
            print(f"【系统提示】默认超级管理员账号已创建：{sa_account} / {sa_password}")

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
