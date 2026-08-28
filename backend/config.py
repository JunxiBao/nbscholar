import os
from dotenv import load_dotenv

# 加载 .env 配置文件
load_dotenv()

class Config:
    # ---- 基础配置 ----
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
    
    # ---- 数据库 ----
    # 格式：mysql+pymysql://user:password@host:port/dbname
    # 请根据你的云端数据库信息修改以下变量
    DB_USER     = os.getenv('DB_USER', 'nbscholar')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'your_password_here')
    DB_HOST     = os.getenv('DB_HOST', 'your_host_here')
    DB_PORT     = os.getenv('DB_PORT', '3306')
    DB_NAME     = os.getenv('DB_NAME', 'nbscholar')

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ---- JWT ----
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'CHANGE_ME_IN_PRODUCTION_abc123')
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24 * 7   # 7 天（秒）

    # ---- DeepSeek ----
    DEEPSEEK_API_KEY  = os.getenv('DEEPSEEK_API_KEY', 'your_deepseek_key_here')
    DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

    # ---- CORS ----
    CORS_ORIGINS = ['http://localhost:5500', 'http://127.0.0.1:5500',
                    'http://localhost:3000', 'null']   # null 用于本地文件打开
