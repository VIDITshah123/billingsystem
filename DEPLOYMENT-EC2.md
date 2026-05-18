# Deploy to AWS EC2 - Step by Step Guide

This guide walks you through deploying the billing system on an AWS EC2 free tier instance with persistent SQLite database.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Launch EC2 Instance](#2-launch-ec2-instance)
3. [Connect to EC2](#3-connect-to-ec2)
4. [Install Software on EC2](#4-install-software-on-ec2)
5. [Deploy the App (Option A: Git Clone)](#5-deploy-the-app-option-a-git-clone)
6. [Deploy the App (Option B: Manual Upload)](#6-deploy-the-app-option-b-manual-upload)
7. [Set Up PM2 (Auto-Restart)](#7-set-up-pm2-auto-restart)
8. [Open Port 5000 in Security Group](#8-open-port-5000-in-security-group)
9. [Test Your App](#9-test-your-app)
10. [Set Up Domain + HTTPS (Optional)](#10-set-up-domain--https-optional)
11. [Common Commands & Troubleshooting](#11-common-commands--troubleshooting)

---

## 1. Prerequisites

- [AWS Account](https://aws.amazon.com/) (Free tier eligible)
- Your project pushed to GitHub (or accessible locally)
- A `.pem` key file (created during EC2 setup — save it)

---

## 2. Launch EC2 Instance

**Step 2.1:** Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)

**Step 2.2:** Click the orange **"Launch Instance"** button

**Step 2.3:** Fill in the details:

| Field | Value |
|-------|-------|
| **Name** | `billing-system` |
| **Application and OS Images** | Select "Ubuntu Server 22.04 LTS (HVM)" (free tier) |
| **Architecture** | 64-bit (x86) |
| **Instance type** | `t2.micro` (free tier eligible) |

**Step 2.4:** Create or select a Key Pair

- Click **"Create new key pair"**
- Key pair name: `billing-system-key`
- Key pair type: `RSA`
- Private key file format: `.pem` (for SSH)
- Click **"Create key pair"**
- The `.pem` file will download automatically — **SAVE IT SAFELY** (you cannot download it again)

**Step 2.5:** Configure Network Settings

Click **"Edit"** in the Network settings section:

```
☑ Allow SSH traffic from          → Anywhere (0.0.0.0/0)
☑ Allow HTTP traffic from internet → Port 80
☐ Allow HTTPS traffic from internet → (Optional, for SSL later)
```

> Note: We'll add port 5000 manually in Step 8.

**Step 2.6:** Configure Storage

```
Size (GiB): 8 gp2 (default — free tier)
```

**Step 2.7:** Click **"Launch Instance"**

**Step 2.8:** Wait 30-60 seconds for the instance to be ready

**Step 2.9:** Note your instance details

Go to **Instances** → click your `billing-system` instance

Copy these (you'll need them):
- **Public IPv4 address** (e.g., `54.123.456.789`)
- **Public IPv4 DNS** (e.g., `ec2-54-123-456-789.compute-1.amazonaws.com`)

---

## 3. Connect to EC2

### On Windows (PowerShell):

```powershell
# Navigate to where you saved the .pem file
cd C:\Users\shahv\Downloads

# SSH into your EC2 instance
ssh -i "billing-system-key.pem" ubuntu@YOUR_EC2_IP_ADDRESS
```

### On Mac / Linux:

```bash
# Set correct permissions on the key file
chmod 400 ~/Downloads/billing-system-key.pem

# SSH into your EC2 instance
ssh -i ~/Downloads/billing-system-key.pem ubuntu@YOUR_EC2_IP_ADDRESS
```

> **Replace `YOUR_EC2_IP_ADDRESS`** with the IP you copied in Step 2.9

**Expected output:**
```
Welcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-...-generic x86_64)
...
ubuntu@ip-172-31-XX-XX:~$
```

You are now logged into your EC2 server! Keep this terminal open.

---

## 4. Install Software on EC2

Run these commands **inside your SSH session**:

### Step 4.1: Update the system

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 4.2: Install Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 4.3: Verify installations

```bash
node --version
npm --version
```

**Expected output:** `v20.x.x` for Node, `10.x.x` for npm

### Step 4.4: Install Git

```bash
sudo apt install -y git
```

### Step 4.5: Install build tools (needed for better-sqlite3)

```bash
sudo apt install -y build-essential python3
```

> `better-sqlite3` needs to compile native code on the server. Build tools are required.

---

## 5. Deploy the App (Option A: Git Clone)

This is the easiest method. Run all commands **inside your SSH session**:

### Step 5.1: Clone your repository

```bash
cd /home/ubuntu
git clone https://github.com/VIDITshah123/billingsystem.git
cd billingsystem
```

> If you have set up SSH keys with GitHub, use: `git clone git@github.com:VIDITshah123/billingsystem.git`

### Step 5.2: Install all dependencies

```bash
cd /home/ubuntu/billingsystem

# Install client dependencies
cd client && npm install
cd ..

# Install server dependencies
cd server && npm install
cd ..
```

> This may take 1-2 minutes.

### Step 5.3: Build the React frontend

```bash
cd /home/ubuntu/billingsystem/client
npm run build
cd ..
```

**Expected output:**
```
> client@0.0.0 build
> vite build

✓ built in X.XXs
```

### Step 5.4: Start the app manually (test mode)

```bash
cd /home/ubuntu/billingsystem/server
NODE_ENV=production node index.js
```

**Expected output:**
```
✅ Billing API running on http://localhost:5000
```

### Step 5.5: Test that it works

**Open a SECOND terminal window** (keep the first one running) and test:

```bash
curl http://localhost:5000/api/health
```

**Expected output:**
```json
{"status":"ok"}
```

Press **Ctrl + C** in the first terminal to stop the test server.

---

## 6. Deploy the App (Option B: Manual Upload)

Use this if you prefer not to use Git.

### Step 6.1: Build the frontend locally

**On your local machine** (NOT inside SSH):

```powershell
# Open a NEW PowerShell window on your computer
cd C:\Users\shahv\OneDrive\Desktop\billingsystem\client
npm install
npm run build
```

### Step 6.2: Upload files to EC2

```powershell
# From your local machine
cd C:\Users\shahv\OneDrive\Desktop\billingsystem

# Upload client build
scp -i "C:\Users\shahv\Downloads\billing-system-key.pem" -r client/dist ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/client/

# Upload server folder
scp -i "C:\Users\shahv\Downloads\billing-system-key.pem" -r server ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/

# Upload package.json
scp -i "C:\Users\shahv\Downloads\billing-system-key.pem" package.json ubuntu@YOUR_EC2_IP:/home/ubuntu/billingsystem/
```

### Step 6.3: Install server dependencies on EC2

```bash
# Inside your SSH session
cd /home/ubuntu/billingsystem/server
npm install
```

### Step 6.4: Verify everything is in place

```bash
ls -la /home/ubuntu/billingsystem/
```

**Expected output:**
```
drwxr-xr-x ... client/
drwxr-xr-x ... server/
-rw-r--r-- ... package.json
```

---

## 7. Set Up PM2 (Auto-Restart)

PM2 keeps your app running after you disconnect and auto-restarts it if the server reboots.

### Step 7.1: Install PM2

```bash
sudo npm install -g pm2
```

### Step 7.2: Start your app with PM2

```bash
cd /home/ubuntu/billingsystem/server
NODE_ENV=production pm2 start index.js --name billing-api
```

**Expected output:**
```
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┐
│ id  │ name       │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┤
│ 0   │ billing-api│ default     │ 1.0.0   │ fork    │ 12345    │ 0s     │ 0    │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┘
```

### Step 7.3: Save the PM2 process list

```bash
pm2 save
```

**Expected output:**
```
[PM2] Saving current process list...
[PM2] Successfully saved in /home/ubuntu/.pm2/dump.pm2
```

### Step 7.4: Enable PM2 startup on boot

```bash
pm2 startup
```

**Expected output:**
```
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

**Copy and run the `sudo env PATH=...` command that it outputs:**

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Step 7.5: Verify PM2 is running

```bash
pm2 status
```

**Expected output:**
```
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┐
│ id  │ name       │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┤
│ 0   │ billing-api│ default     │ 1.0.0   │ fork    │ 12345    │ 30s    │ 0    │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┘
```

Status should show **"online"**.

### Step 7.6: Test PM2 restart

```bash
pm2 restart billing-api
pm2 status
```

Your app is now managed by PM2. You can close your terminal — it keeps running.

---

## 8. Open Port 5000 in Security Group

By default, EC2 blocks port 5000. You need to open it.

**Step 8.1:** Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/)

**Step 8.2:** Click **"Instances"** in the left sidebar

**Step 8.3:** Select your `billing-system` instance (click checkbox)

**Step 8.4:** Go to the **"Security"** tab (below the instance details)

**Step 8.5:** Click the security group name (looks like `sg-xxxxxxxxxxxx`)

**Step 8.6:** Click **"Edit inbound rules"** (bottom of page)

**Step 8.7:** Click **"Add rule"**

| Field | Value |
|-------|-------|
| **Type** | Custom TCP |
| **Protocol** | TCP |
| **Port range** | `5000` |
| **Source** | `Anywhere-IPv4 (0.0.0.0/0)` |

> For security: Instead of `Anywhere`, select "My IP" if you're the only user.

**Step 8.8:** Click **"Save rules"**

---

## 9. Test Your App

### Step 9.1: Check PM2 logs

Inside your SSH session:

```bash
pm2 logs billing-api
```

**Expected output:**
```
[TAIL] ... 0: billing-api
0:billing-api> ✅ Billing API running on http://localhost:5000
```

Press **Ctrl + C** to exit logs.

### Step 9.2: Test from your browser

Open ANY browser and visit:

```
http://YOUR_EC2_PUBLIC_IP:5000
```

Replace `YOUR_EC2_PUBLIC_IP` with your instance's IP address.

**You should see the billing system app!**

### Step 9.3: Test the API health endpoint

Visit:

```
http://YOUR_EC2_PUBLIC_IP:5000/api/health
```

**Expected response:**
```json
{"status":"ok"}
```

---

## 10. Set Up Domain + HTTPS (Optional)

### Step 10.1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 10.2: Configure Nginx as a reverse proxy

```bash
sudo nano /etc/nginx/sites-available/billing-system
```

Paste the following:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

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

Save: **Ctrl + X** → **Y** → **Enter**

### Step 10.3: Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/billing-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 10.4: Get free SSL certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Your site will now have HTTPS.

### Step 10.5: Update API URL

Update your Nginx config to serve the app directly on port 80:

```bash
sudo nano /etc/nginx/sites-available/billing-system
```

Replace with:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /home/ubuntu/billingsystem/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo systemctl restart nginx
```

Now visit `http://your-domain.com` (no port needed!)

---

## 11. Common Commands & Troubleshooting

### PM2 Commands

| Command | Purpose |
|---------|---------|
| `pm2 status` | Check if app is running |
| `pm2 logs billing-api` | View real-time logs |
| `pm2 restart billing-api` | Restart the app |
| `pm2 stop billing-api` | Stop the app |
| `pm2 delete billing-api` | Remove from PM2 |
| `pm2 save` | Save current process list |
| `pm2 startup` | Set PM2 to start on boot |

### View Logs

```bash
# PM2 logs (preferred)
pm2 logs billing-api

# Or raw output file
cat /home/ubuntu/app.log

# Follow logs live
tail -f /home/ubuntu/app.log
```

### App Not Loading

```bash
# 1. Check if Node is running
ps aux | grep node

# 2. Check PM2 status
pm2 status

# 3. Check logs
pm2 logs billing-api --lines 50

# 4. Restart if needed
pm2 restart billing-api
```

### Port 5000 Not Accessible

```bash
# 1. Check if the app is listening
sudo netstat -tlnp | grep 5000

# 2. Check the security group in AWS Console
# (Step 8 - make sure the rule is added)

# 3. Check EC2 firewall
sudo ufw status
# If active, allow port 5000:
sudo ufw allow 5000
```

### Permission Denied for .pem Key

```powershell
# On Windows
icacls "C:\Users\shahv\Downloads\billing-system-key.pem" /inheritance:r /grant "shahv:R"

# On Mac/Linux
chmod 400 /path/to/billing-system-key.pem
```

### Update Your App After Code Changes

```bash
# Inside your SSH session
cd /home/ubuntu/billingsystem

# Pull latest code
git pull origin main

# Rebuild and restart
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..

# Restart with PM2
pm2 restart billing-api
```

### Backup SQLite Database

```bash
# Manual backup
cp /home/ubuntu/billingsystem/server/billing.db /home/ubuntu/billing.backup.$(date +%Y%m%d)

# Automatic daily backup (scheduled)
crontab -e
# Add this line:
0 2 * * * cp /home/ubuntu/billingsystem/server/billing.db /home/ubuntu/backups/billing.$(date +\%Y\%m\%d).db
```

---

## Cost Summary (Free Tier)

| Service | Limit | Cost |
|---------|-------|------|
| EC2 t2.micro | 750 hours/month | Free (12 months) |
| EBS 30 GB | 30 GB/month | Free (12 months) |
| Data transfer | 100 GB/month out | Free (12 months) |
| **Total** | | **$0.00/month** |

Your app will run completely free for the first 12 months!

---

## What's Next?

- Add a custom domain with Namecheap/GoDaddy
- Set up Cloudflare CDN for faster loading
- Migrate to PostgreSQL using Supabase (free) for better reliability

---

*Generated for the billing system project.*
