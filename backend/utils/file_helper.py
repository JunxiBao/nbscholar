import os
import uuid
import base64
from flask import current_app

def save_base64_image(b64_string: str, subfolder: str = 'avatars') -> str:
    """
    解码 base64 字符串并保存为图片，返回其访问路径。
    如果输入的不是合法的 base64 图片字符串，则原样返回。
    """
    if not b64_string or not b64_string.startswith('data:image/'):
        return b64_string

    try:
        header, encoded = b64_string.split(",", 1)
        ext = header.split(';')[0].split('/')[1]
        if ext == 'jpeg':
            ext = 'jpg'
        
        file_data = base64.b64decode(encoded)
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), subfolder)
        os.makedirs(upload_dir, exist_ok=True)
        
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(file_data)
            
        return f"/api/uploads/{subfolder}/{filename}"
    except Exception as e:
        print(f"Error saving base64 image: {e}")
        return ''

def delete_file_by_url(file_url: str):
    """
    根据 /api/uploads/ 的 URL 删除对应的本地文件。
    """
    if not file_url or not file_url.startswith('/api/uploads/'):
        return
    try:
        rel_path = file_url[len('/api/uploads/'):]
        if '..' in rel_path:
            return
        upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        filepath = os.path.join(upload_dir, rel_path)
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error deleting file {file_url}: {e}")
