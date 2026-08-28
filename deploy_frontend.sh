#!/bin/bash

# ==========================================
# 甬学阁 (NBScholar) 前端服务器端一键部署脚本
# ==========================================
# 说明：此脚本需要将代码上传至服务器后，直接在服务器上运行

# 1. 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "❌ 错误: 请使用 root 权限运行此脚本 (例如: sudo ./deploy_frontend.sh)"
  exit 1
fi

SERVER_IP="8.147.63.234"             # 你的服务器外网 IP 地址
PROD_API_URL="http://$SERVER_IP:5000" # 生产环境的后端接口地址
DEPLOY_DIR="/var/www/nbscholar_frontend" # 部署在服务器上的真实目录路径

echo "=========================================="
echo " 开始在服务器上部署前端服务..."
echo "=========================================="

echo "=> [1/4] 创建部署目录并复制文件..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# 将当前目录下的前端资源复制到部署目录
# 确保你是在代码根目录下运行此脚本
cp -r css js statics pages index.html login.html $DEPLOY_DIR/ 2>/dev/null || true

echo "=> [2/4] 更新 API 地址为 $PROD_API_URL..."
# 注意: Linux 服务器通常是 GNU sed，不需要 macOS 的 '' 参数
sed -i "s|http://localhost:5000|$PROD_API_URL|g" $DEPLOY_DIR/js/api.js 2>/dev/null || true
sed -i "s|http://localhost:5000|$PROD_API_URL|g" $DEPLOY_DIR/js/login.js 2>/dev/null || true

echo "=> [3/4] 检查并安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    if command -v yum &> /dev/null; then
        echo "=> 检测到 Yum 包管理器，正在通过 yum 安装 Nginx..."
        yum install -y epel-release
        yum install -y nginx
    elif command -v apt-get &> /dev/null; then
        echo "=> 检测到 APT 包管理器，正在通过 apt-get 安装 Nginx..."
        apt-get update
        apt-get install -y nginx
    else
        echo "❌ 无法找到包管理器 (yum 或 apt-get)，请手动安装 Nginx。"
        exit 1
    fi
fi

echo "=> [4/4] 写入并激活 Nginx 配置..."
# 创建通用配置目录
mkdir -p /etc/nginx/conf.d/

cat > /etc/nginx/conf.d/nbscholar.conf << EOF
server {
    listen 80;
    server_name $SERVER_IP; # 填入具体 IP 避免与 nginx.conf 默认规则冲突

    root $DEPLOY_DIR;
    index index.html login.html;

    # 尝试读取静态文件，前端路由如果为 history 模式会回退到 index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 如果系统中存在 default 配置文件，则将其重命名使其失效，避免冲突
if [ -f /etc/nginx/conf.d/default.conf ]; then
    mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true
fi
# 处理 Debian/Ubuntu 系列的 default 文件
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
fi

# 测试并重启 Nginx，同时设置为开机自启
echo "=> 测试 Nginx 配置文件并设置开机自启..."
nginx -t && systemctl restart nginx
systemctl enable nginx

echo "=> [5/5] 正在进行服务健康诊断..."
sleep 2

if systemctl is-active --quiet nginx; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "failed")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "304" ]; then
        echo "=========================================="
        echo "✅ 前端服务诊断 [通过]: Nginx 运行正常且能成功响应网页！"
        echo "👉 请在浏览器访问 http://$SERVER_IP 预览前端项目"
        echo "=========================================="
    else
        echo "=========================================="
        echo "⚠️ 前端服务诊断 [警告]: Nginx 正在运行，但网页响应状态码异常 ($HTTP_CODE)。"
        echo "请检查防火墙或文件权限设置。"
        echo "=========================================="
    fi
else
    echo "=========================================="
    echo "❌ 前端服务诊断 [失败]: Nginx 启动失败！"
    echo "以下是最新的报错日志："
    echo "------------------------------------------"
    tail -n 30 /var/log/nginx/error.log 2>/dev/null || echo "无法读取错误日志 /var/log/nginx/error.log"
    echo "------------------------------------------"
    journalctl -u nginx -n 20 --no-pager
    echo "=========================================="
    exit 1
fi
