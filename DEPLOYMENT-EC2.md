# Deploy to AWS EC2 - Complete Guide

## Step 1: Create EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)
2. Click **Launch Instance**
3. Configure:
   - **Name**: `billing-system`
   - **AMI**: Ubuntu Server 22.04 LTS (free tier eligible)
   - **Instance type**: `t2.micro` (free tier)
   - **Key pair**: Create new or use existing `.pem` file (save it securely!)
   - **Network**: Allow HTTP/HTTPS traffic from internet (security group)
     - Port 80 (HTTP)
     - Port 443 (HTTPS)
     - Port 5000 (custom - your app port)
   - **Storage**: 8 GB (default is enough for SQLite)
4. Click **Launch Instance**
5. Note your **Public IPv4 Address** (e.g., `54.123.456.789`)

## Step 2: Connect to EC2

Open terminal/PowerShell and SSH into your instance:

```bash
# Windows (using .pem file)
ssh -i "path/to/your-key.pem" ubuntu@YOUR_EC2_IP

# If permission denied, fix the key permissions first:
chmod 400 path/to/your-key.pem
```

## Step 3: Install Dependencies on EC2

Once SSH'd in, run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install git (optional, for cloning)
sudo apt install -y git
```

## Step 4: Deploy Your App

### Option A: Clone from GitHub (Recommended)

```bash
# Clone your repo
git clone https://github.com/VIDITshah123/billingsystem.git
cd billingsystem

# Install dependencies
npm run install:all

# Build the client
npm run build

# Start the app in production
cd server
NODE_ENV=production nohup node index.js > /home/ubuntu/app.log 2>&1 &

echo "App started! PID: $!"
```

### Option B: Upload from Local Machine

From your local machine (not SSH session):

```bash
# Build locally first
cd client && npm install && npm run build && cd ..

# Upload to EC2
scp -i "path/to/key.pem" -r client/dist ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/
scp -i "path/to/key.pem" -r server ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/
scp -i "path/to/key.pem" package.json ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/

# SSH in and start
ssh -i "path/to/key.pem" ubuntu@YOUR_EC2_IP
cd /home/ubuntu/billingsystem/server
npm install --production
NODE_ENV=production nohup node index.js > /home/ubuntu/app.log 2>&1 &
```

## Step 5: Set Up PM2 (Auto-Restart on Reboot)

PM2 keeps your app running even after you disconnect or the server restarts:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
cd /home/ubuntu/billingsystem/server
NODE_ENV=production pm2 start index.js --name billing-api

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

**PM2 Commands:**
```bash
pm2 status          # Check app status
pm2 logs billing-api # View logs
pm2 restart billing-api # Restart app
pm2 stop billing-api    # Stop app
```

## Step 6: Open Port 5000 (if not already)

1. Go to EC2 Console → Your Instance → **Security** tab
2. Click the **Security Group** name
3. **Edit inbound rules** → Add rule:
   - Type: Custom TCP
   - Port range: `5000`
   - Source: `0.0.0.0/0` (or your IP for security)
4. Save

## Step 7: Access Your App

Visit: `http://YOUR_EC2_PUBLIC_IP:5000`

Check API health: `http://YOUR_EC2_PUBLIC_IP:5000/api/health`

## Step 8 (Optional): Add Domain + HTTPS

### Using Nginx as Reverse Proxy:

```bash
# Install Nginx
sudo apt install -y nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/billing-system
```

Paste this config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/billing-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Add SSL with Let's Encrypt (free)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Step 9 (Optional): Automated Deploy Script

Use the included `deploy-ec2.sh` script:

```bash
# Make it executable
chmod +x deploy-ec2.sh

# Deploy
./deploy-ec2.sh ubuntu@YOUR_EC2_IP
```

## Database Location

SQLite database is stored at: `server/billing.db`
- Persists across restarts on EC2 ✅
- Back up regularly: `cp server/billing.db server/billing.db.backup`

## Environment Variables (Optional)

Create `.env` in the `server` folder:
```
PORT=5000
NODE_ENV=production
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password
AUTH_TOKEN=your-token
```

## Troubleshooting

**App not starting:**
```bash
cat /home/ubuntu/app.log
pm2 logs billing-api
```

**Port not accessible:**
- Check security group allows port 5000
- Check firewall: `sudo ufw status`
- Open if needed: `sudo ufw allow 5000`

**Node.js not found:**
```bash
# Check PATH
echo $PATH
# Add if missing
export PATH=$HOME/.nvm/versions/node/v20.0.0/bin:$PATH
```

## Costs (Free Tier)

- **EC2 t2.micro**: 750 hrs/month free (first 12 months)
- **8 GB EBS**: 30 GB free (first 12 months)
- **Data transfer**: 100 GB/month free

Your app should run completely free for the first year!
