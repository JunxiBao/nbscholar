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

echo "=> [1/3] 正在配置 Python 环境与依赖..."
# 阿里云/CentOS 默认自带 Python 3.6 太老，我们需要安装并使用 Python 3.9
if command -v yum &> /dev/null; then
    yum install -y python39
    PYTHON_CMD="python3.9"
elif command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y python3.9 python3-pip
    PYTHON_CMD="python3.9"
else
    PYTHON_CMD="python3"
fi

# 获取系统中 Python 的路径
PYTHON_PATH=$(which $PYTHON_CMD || which python3)

echo "=> 正在安装项目依赖 (requirements.txt) 与 Gunicorn..."
$PYTHON_PATH -m pip install -r $BACKEND_DIR/requirements.txt
$PYTHON_PATH -m pip install gunicorn

SERVICE_FILE="/etc/systemd/system/nbscholar-backend.service"

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

echo "=> [4/4] 正在进行服务健康诊断..."
# 等待 3 秒钟让服务充分启动并暴露出可能的崩溃问题
sleep 3

if systemctl is-active --quiet nbscholar-backend; then
    echo "=========================================="
    echo "✅ 后端服务诊断 [通过]: 服务正在后台健康运行！"
    echo "即使服务器重启，它也会自动恢复运行。"
    echo ""
    echo "常用命令提示："
    echo "查看运行状态: systemctl status nbscholar-backend"
    echo "查看实时日志: journalctl -u nbscholar-backend -f"
    echo "停止服务:     systemctl stop nbscholar-backend"
    echo "=========================================="
else
    echo "=========================================="
    echo "❌ 后端服务诊断 [失败]: 服务启动后异常退出！"
    echo "以下是最新的报错日志，请检查代码或配置是否有误："
    echo "------------------------------------------"
    journalctl -u nbscholar-backend -n 30 --no-pager
    echo "=========================================="
    exit 1
fi
