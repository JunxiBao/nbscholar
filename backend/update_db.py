from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    # 尝试添加 status 字段
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'approved'"))
        db.session.commit()
        print("✅ Column 'status' added successfully.")
    except Exception as e:
        db.session.rollback()
        print("ℹ️ Column 'status' might already exist or error:", e)

    # 尝试添加 remark 字段
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN remark VARCHAR(255) DEFAULT ''"))
        db.session.commit()
        print("✅ Column 'remark' added successfully.")
    except Exception as e:
        db.session.rollback()
        print("ℹ️ Column 'remark' might already exist or error:", e)

    # 将历史用户的 status 设置为 approved
    try:
        db.session.execute(text("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = 'pending'"))
        db.session.commit()
        print("✅ Existing users updated to 'approved'.")
    except Exception as e:
        db.session.rollback()
        print("ℹ️ Could not update existing users:", e)
