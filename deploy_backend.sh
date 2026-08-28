#!/bin/bash

# ==========================================
# 甬学阁 (NBScholar) 后端开机自启一键部署脚本
# ==========================================

# 1. 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "❌ 错误: 请使用 root 权限运行此脚本 (例如: sudo ./deploy_backend.sh)"
  exit 1
fi

# 获取当前代码所在的绝对路径
PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ 错误: 找不到 backend 目录，请确保你在项目根目录下运行此脚本。"
    exit 1
fi

echo "=========================================="
echo " 开始配置后端服务守护进程 (支持开机自启)"
echo "=========================================="

echo "=> [1/3] 正在安装 Gunicorn (生产级 Python Web 服务器)..."
# 安装 gunicorn 用于在生产环境中稳定运行 Flask
pip3 install gunicorn

echo "=> [2/3] 正在生成 Systemd 服务配置..."
SERVICE_FILE="/etc/systemd/system/nbscholar-backend.service"

# 获取系统中 Python3 的路径，并通过 -m gunicorn 模块方式启动，彻底避免 root 环境下找不到路径的问题
PYTHON_PATH=$(which python3)

cat > $SERVICE_FILE << EOF
[Unit]
Description=NBScholar Backend Service (Flask)
After=network.target

[Service]
# 以 root 权限运行，或者你可以改成你服务器的具体用户名
User=root
WorkingDirectory=$BACKEND_DIR
# 使用 4 个 worker 进程，监听 5000 端口
ExecStart=$PYTHON_PATH -m gunicorn -w 4 -b 0.0.0.0:5000 app:app
# 如果崩溃则自动重启
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "=> [3/3] 激活并启动后台服务..."
# 重新加载 systemd 配置
systemctl daemon-reload
# 设置开机自启
systemctl enable nbscholar-backend
# 立即启动服务
systemctl restart nbscholar-backend

echo "=========================================="
echo "✅ 后端开机自启部署完成！"
echo "你的 Flask 后端现在已经作为一个系统级守护进程在后台运行。"
echo "即使服务器重启，它也会自动恢复运行！"
echo ""
echo "常用命令提示："
echo "查看运行状态: systemctl status nbscholar-backend"
echo "查看实时日志: journalctl -u nbscholar-backend -f"
echo "停止服务:     systemctl stop nbscholar-backend"
echo "=========================================="
