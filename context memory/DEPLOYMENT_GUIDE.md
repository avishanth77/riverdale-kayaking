# 🚀 Deployment & Cloud Hosting Guide

## 1. Hosting Architecture on Render.com

- **Platform:** Render Web Service (Free Tier)
- **Repository:** `https://github.com/avishanth77/riverdale-kayaking.git`
- **Branch:** `main`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start` (or `node server.js`)

---

## 2. Resolving the Render Build Error (`ENOENT package.json`)

### What Caused It:
Render failed with `npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/opt/render/project/src/package.json'`.
- **Reason:** The GitHub repository initially only contained a single empty/placeholder commit; local files had not yet been committed and pushed.

### How It Was Fixed:
1. Created `.gitignore` excluding `node_modules/`, `.env`, and logs.
2. Ran `git add .` and committed all files.
3. Pushed to `origin main`.
Render now locates `package.json` in the root repository folder and executes `npm install` cleanly.

---

## 3. Database Persistence Setup (MongoDB Atlas)

Because free web servers (Render, Railway, Fly) have ephemeral disk storage where local JSON files wipe on restart, cloud persistence is essential:

### 3-Step Setup:
1. **Sign Up for MongoDB Atlas:**
   - Register at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (100% Free M0 cluster).
   - Select cloud provider (AWS, Mumbai `ap-south-1` is recommended for Kerala users).
   - Create a database user (e.g. `riverdale_user`).
2. **Network Access Rule:**
   - Go to **Security** &rarr; **Network Access** &rarr; **Add IP Address**.
   - Choose **Allow Access From Anywhere** (`0.0.0.0/0`) so Render servers can connect.
3. **Add Environment Variable on Render:**
   - In Render Dashboard under your Web Service, go to **Environment**.
   - Add variable:
     - **Key:** `MONGODB_URI`
     - **Value:** `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/riverdale?retryWrites=true&w=majority`
   - Click **Save Changes**.

---

## 4. Git Push & Auto-Deploy Workflow

Whenever you or an agent make code changes, deploy to production with standard Git commands:

```bash
git add .
git commit -m "Describe your update"
git push origin main
```
Render automatically detects new commits on `main`, runs `npm install`, and deploys the live update with zero manual intervention.
