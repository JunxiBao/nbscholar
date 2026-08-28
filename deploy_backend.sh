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

echo "=> [1/4] 正在检测并配置 Python 运行环境..."

# 1. 尝试在系统中寻找满足版本要求的 Python (>= 3.8)
PYTHON_CMD=""
for cmd in python3.11 python3.10 python3.9 python3.8; do
    if command -v $cmd &> /dev/null; then
        PYTHON_CMD=$cmd
        break
    fi
done

# 如果没有高版本 Python，则尝试利用所有已知的包管理器自动安装
if [ -z "$PYTHON_CMD" ]; then
    echo "未检测到 Python 3.8+，正在尝试通过包管理器自动安装..."
    if command -v dnf &> /dev/null; then
        dnf install -y python39 || dnf install -y python3.9 || dnf install -y python3
    elif command -v yum &> /dev/null; then
        yum install -y python39 || yum install -y python3.9 || yum install -y python38
    elif command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y python3.9 python3.9-venv python3-pip || apt-get install -y python3.10 python3.10-venv || apt-get install -y python3.8 python3.8-venv
    elif command -v pacman &> /dev/null; then
        pacman -Sy --noconfirm python python-pip
    else
        echo "❌ 无法识别包管理器或安装失败，请手动安装 Python 3.8 或以上版本。"
        exit 1
    fi
    
    # 安装完成后再次检测
    for cmd in python3.11 python3.10 python3.9 python3.8 python3; do
        if command -v $cmd &> /dev/null; then
            PYTHON_CMD=$cmd
            break
        fi
    done
fi

PYTHON_PATH=$(which $PYTHON_CMD)
if [ -z "$PYTHON_PATH" ]; then
    echo "❌ 致命错误：Python 环境配置失败！"
    exit 1
fi
echo "=> 使用的 Python 解析器路径: $PYTHON_PATH ($($PYTHON_PATH --version))"

echo "=> [2/4] 配置隔离的 Python 虚拟环境 (Virtualenv)..."
# 使用虚拟环境 (venv) 是最强大的适配方案，彻底避免系统级依赖冲突和 sudo 权限警告
VENV_DIR="$BACKEND_DIR/venv"
$PYTHON_PATH -m venv $VENV_DIR || { echo "❌ 虚拟环境创建失败，你可能需要安装 python3-venv 包！"; exit 1; }

# 指定使用虚拟环境中的 pip 和 python
VENV_PIP="$VENV_DIR/bin/pip"
VENV_PYTHON="$VENV_DIR/bin/python"

echo "=> 正在虚拟环境中安装依赖 (requirements.txt) 与 Gunicorn..."
$VENV_PIP install --upgrade pip
$VENV_PIP install -r $BACKEND_DIR/requirements.txt || { echo "❌ 依赖安装失败，请检查上面 pip 的报错！"; exit 1; }
$VENV_PIP install gunicorn || { echo "❌ Gunicorn 安装失败！"; exit 1; }

echo "=> [3/4] 正在生成 Systemd 服务配置..."
SERVICE_FILE="/etc/systemd/system/nbscholar-backend.service"

cat > $SERVICE_FILE << EOF
[Unit]
Description=NBScholar Backend Service (Flask)
After=network.target

[Service]
# 以 root 权限运行，或者你可以改成你服务器的具体用户名
User=root
WorkingDirectory=$BACKEND_DIR
# 使用虚拟环境中的 Gunicorn 运行应用
ExecStart=$VENV_DIR/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
# 如果崩溃则自动重启
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "=> [4/4] 激活并启动后台服务..."
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
