#!/bin/bash

# Configuration
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

DOMAIN="zeropass.dev"
EMAIL="mharshith801@gmail.com" # Update this!

# 1. Create dummy certificate to allow Nginx to start
mkdir -p ./certbot/conf/live/$DOMAIN
openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout ./certbot/conf/live/$DOMAIN/privkey.pem \
  -out ./certbot/conf/live/$DOMAIN/fullchain.pem \
  -subj "/CN=localhost"

# 2. Start Nginx
docker-compose -f docker-compose.prod.yml up -d nginx

# 3. Delete dummy certificate
rm -rf ./certbot/conf/live/$DOMAIN

# 4. Request real certificate
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN

# 5. Reload Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
