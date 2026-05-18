#!/bin/bash
# AWS EC2 Deployment Script for Billing System
# Run this AFTER you have an EC2 instance running

# Usage: ./deploy-ec2.sh ubuntu@your-ec2-ip

if [ -z "$1" ]; then
  echo "Usage: ./deploy-ec2.sh ubuntu@your-ec2-ip"
  echo "Example: ./deploy-ec2.sh ubuntu@54.123.456.789"
  exit 1
fi

EC2_HOST=$1
DEPLOY_DIR="/home/ubuntu/billingsystem"

echo "🚀 Deploying to $EC2_HOST..."

# Build locally first
echo "📦 Building client..."
cd client && npm install && npm run build && cd ..

echo "📁 Transferring files to EC2..."
ssh $EC2_HOST "mkdir -p $DEPLOY_DIR"
scp -r client/dist server node_modules package.json $EC2_HOST:$DEPLOY_DIR/

echo "🔧 Installing server dependencies on EC2..."
ssh $EC2_HOST "cd $DEPLOY_DIR/server && npm install --production"

echo "🔄 Restarting the service..."
ssh $EC2_HOST "
  cd $DEPLOY_DIR
  # Kill existing process
  pkill -f 'node index.js' || true
  sleep 1
  # Start new process
  cd server
  NODE_ENV=production nohup node index.js > /home/ubuntu/app.log 2>&1 &
  echo 'App started with PID:' \$!
"

echo "✅ Deployment complete!"
echo "📋 Check logs: ssh $EC2_HOST 'cat /home/ubuntu/app.log'"
echo "🌐 Visit: http://your-ec2-public-ip"
