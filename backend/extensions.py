"""Flask 扩展实例（统一在此创建，避免循环导入）"""
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS

db      = SQLAlchemy()
bcrypt  = Bcrypt()
cors    = CORS()
