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
    apt-get update
    apt-get install -y nginx
fi

echo "=> [4/4] 写入并激活 Nginx 配置..."
cat > /etc/nginx/sites-available/nbscholar << EOF
server {
    listen 80;
    server_name _; # 监听所有 IP 或填入具体域名

    root $DEPLOY_DIR;
    index index.html login.html;

    # 尝试读取静态文件，前端路由如果为 history 模式会回退到 index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 启用该配置并禁用默认配置
ln -sf /etc/nginx/sites-available/nbscholar /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重启 Nginx，同时设置为开机自启
echo "=> 测试 Nginx 配置文件并设置开机自启..."
nginx -t && systemctl restart nginx
systemctl enable nginx

echo "=========================================="
echo "✅ 部署完成！"
echo "👉 请在浏览器访问 http://$SERVER_IP 预览前端项目"
echo "=========================================="
