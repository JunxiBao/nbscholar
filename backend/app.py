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
               history_bp, training_bp, journal_bp, tools_bp):
        app.register_blueprint(bp)

    # ---- 健康检查 ----
    @app.route('/api/ping')
    def ping():
        return {'status': 'ok', 'message': '甬学阁后端服务运行正常'}

    # ---- 建表（开发模式自动建表） ----
    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
