#!/bin/bash
# Run from your Mac: bash docs/landing/deploy.sh
# Copies the landing page to the VPS and sets up Nginx to serve it.

VPS="root@89.111.140.207"
REMOTE_DIR="/var/www/flik-landing"

echo "→ Uploading landing page..."
ssh $VPS "mkdir -p $REMOTE_DIR"
scp docs/landing/index.html $VPS:$REMOTE_DIR/index.html

echo "→ Writing Nginx config..."
ssh $VPS "cat > /etc/nginx/sites-available/flik-games.com << 'NGINX'
server {
    listen 80;
    server_name flik-games.com www.flik-games.com;

    # Landing page at root
    location = / {
        root $REMOTE_DIR;
        try_files /index.html =404;
    }
    location = /index.html {
        root $REMOTE_DIR;
    }

    # Everything else → Expo Metro bundler
    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX"

echo "→ Enabling site and reloading Nginx..."
ssh $VPS "ln -sf /etc/nginx/sites-available/flik-games.com /etc/nginx/sites-enabled/flik-games.com && nginx -t && systemctl reload nginx"

echo "✅ Done! Visit http://flik-games.com"
