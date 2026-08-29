from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN remark VARCHAR(255) DEFAULT ''"))
        db.session.commit()
        print("Column 'remark' added.")
    except Exception as e:
        db.session.rollback()
        print("Error adding column:", e)
