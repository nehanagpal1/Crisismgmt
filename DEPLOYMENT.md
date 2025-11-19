# Quick Deployment Guide for Vercel

## 🚀 Fast Track Deployment (5 minutes)

### Prerequisites
- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] MongoDB Atlas account (free)
- [ ] Google Gemini API Key: `AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE`

---

## Step 1: Set Up MongoDB Atlas (2 minutes)

1. **Go to**: https://www.mongodb.com/cloud/atlas
2. **Sign up** for free account
3. **Create a cluster**:
   - Choose "Free Shared" tier
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster"
4. **Create Database User**:
   - Go to "Database Access" → "Add New Database User"
   - Username: `admin` (or your choice)
   - Password: Generate a secure password (save it!)
   - User Privileges: "Read and write to any database"
   - Click "Add User"
5. **Allow Network Access**:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"
6. **Get Connection String**:
   - Go to "Database" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Example: `mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your actual password
   - Add database name at the end: `mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/login-module`

**Save this connection string!** You'll need it for Vercel.

---

## Step 2: Push to GitHub (1 minute)

### If you don't have git initialized:

```bash
cd "C:\Users\nehan\OneDrive\Desktop\Cursor\login-module"
git init
git add .
git commit -m "Initial commit - ready for deployment"
```

### Create GitHub repository:

1. Go to https://github.com/new
2. Repository name: `scenario-training-app` (or your choice)
3. Make it **Private** (recommended)
4. Click "Create repository"
5. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/scenario-training-app.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel (2 minutes)

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub
3. **Import Project**:
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

5. **Add Environment Variables** (IMPORTANT!):
   Click "Environment Variables" and add these:

   ```
   Name: MONGODB_URI
   Value: mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/login-module
   
   Name: SESSION_SECRET
   Value: your-super-secret-random-string-here-make-it-long-and-random
   
   Name: GEMINI_API_KEY
   Value: AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE
   
   Name: NODE_ENV
   Value: production
   ```

   **To generate a strong SESSION_SECRET**, use this in your terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

6. **Click "Deploy"**

7. **Wait** for deployment (usually 1-2 minutes)

8. **Done!** Vercel will give you a URL like: `https://your-app.vercel.app`

---

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. **Register** a new trainer account
3. **Create a scenario**
4. **Register** a user account (in incognito/private window)
5. **Create a session** and assign it to the user
6. **Test the scenario game**

---

## 🎯 Quick Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password
- [ ] Network access set to "Allow from Anywhere"
- [ ] Connection string copied and password replaced
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] All 4 environment variables added to Vercel
- [ ] Deployment successful
- [ ] App tested and working

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution**: 
- Check MongoDB Atlas → Network Access → Make sure 0.0.0.0/0 is allowed
- Verify your MONGODB_URI has the correct password
- Ensure database name is at the end of the URI

### Issue: "Session not working / keeps logging out"
**Solution**:
- Make sure SESSION_SECRET is set in Vercel environment variables
- Check that NODE_ENV is set to "production"

### Issue: "AI not generating scenarios"
**Solution**:
- Verify GEMINI_API_KEY is set correctly in Vercel
- Check Vercel logs for API errors

### Issue: "404 errors"
**Solution**:
- Make sure `vercel.json` exists in your project root
- Redeploy the project

---

## 📊 View Logs

**Vercel Logs**:
1. Go to your Vercel dashboard
2. Select your project
3. Click "Logs" tab
4. View real-time logs

**MongoDB Logs**:
1. Go to MongoDB Atlas
2. Select your cluster
3. Click "Metrics" to see connection stats

---

## 🔄 Update Your Deployment

When you make changes to your code:

```bash
git add .
git commit -m "Your update message"
git push
```

Vercel will automatically redeploy! ✨

---

## 🎉 You're Live!

Your scenario training application is now live and accessible worldwide!

**Share your URL**: `https://your-app.vercel.app`

**Default Login**:
- You'll need to register new accounts on the live site
- First user to register can be made a trainer by updating the database

---

## 💡 Pro Tips

1. **Custom Domain**: In Vercel, go to Settings → Domains to add your own domain
2. **Analytics**: Enable Vercel Analytics for visitor insights
3. **Monitoring**: Set up MongoDB Atlas alerts for database issues
4. **Backups**: Enable automated backups in MongoDB Atlas
5. **Rate Limiting**: Consider adding rate limiting for production use

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Gemini API Docs**: https://ai.google.dev/docs

Good luck with your deployment! 🚀

