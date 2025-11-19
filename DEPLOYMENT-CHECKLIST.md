# 📋 Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

---

## ✅ Pre-Deployment Checklist

### 1. MongoDB Atlas Setup
- [ ] Created MongoDB Atlas account (free tier)
- [ ] Created a cluster
- [ ] Created database user with username and password
- [ ] Set network access to "Allow from Anywhere" (0.0.0.0/0)
- [ ] Obtained connection string
- [ ] Replaced `<password>` in connection string with actual password
- [ ] Added database name to end of connection string (e.g., `/login-module`)

**My MongoDB URI** (save this securely):
```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/login-module
```

---

### 2. Generate Session Secret
- [ ] Run: `node generate-secret.js`
- [ ] Copy the generated secret

**My Session Secret** (save this securely):
```
[Your generated secret here]
```

---

### 3. API Keys
- [ ] Have Google Gemini API Key ready

**My Gemini API Key**:
```
AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE
```

---

### 4. Code Preparation
- [ ] All changes saved
- [ ] Tested locally with `npm start`
- [ ] Verified all features work
- [ ] No sensitive data in code (passwords, keys, etc.)

---

### 5. Git Repository
- [ ] Git initialized (`git init`)
- [ ] All files added (`git add .`)
- [ ] Changes committed (`git commit -m "Initial commit"`)
- [ ] GitHub repository created
- [ ] Code pushed to GitHub

**My GitHub Repository**:
```
https://github.com/[username]/[repository-name]
```

---

## 🚀 Deployment Steps

### 1. Vercel Account
- [ ] Created Vercel account at https://vercel.com
- [ ] Connected GitHub account to Vercel

---

### 2. Import Project
- [ ] Clicked "Add New" → "Project" in Vercel
- [ ] Selected GitHub repository
- [ ] Clicked "Import"

---

### 3. Configure Project Settings
- [ ] Framework Preset: **Other**
- [ ] Root Directory: `./`
- [ ] Build Command: (leave empty)
- [ ] Output Directory: (leave empty)
- [ ] Install Command: `npm install`

---

### 4. Environment Variables (CRITICAL!)
Add these in Vercel's Environment Variables section:

- [ ] **MONGODB_URI**
  ```
  Value: [Your MongoDB connection string from step 1]
  ```

- [ ] **SESSION_SECRET**
  ```
  Value: [Your generated secret from step 2]
  ```

- [ ] **GEMINI_API_KEY**
  ```
  Value: AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE
  ```

- [ ] **NODE_ENV**
  ```
  Value: production
  ```

---

### 5. Deploy
- [ ] Clicked "Deploy" button
- [ ] Waited for deployment to complete (1-2 minutes)
- [ ] Received deployment URL

**My Vercel URL**:
```
https://[your-app-name].vercel.app
```

---

## ✅ Post-Deployment Checklist

### 1. Test Basic Functionality
- [ ] Can access the homepage
- [ ] Can register a new trainer account
- [ ] Can login as trainer
- [ ] Can access trainer dashboard

---

### 2. Test Scenario Management
- [ ] Can create a new scenario
- [ ] Can view scenarios list
- [ ] Can edit a scenario
- [ ] Can delete a scenario

---

### 3. Test User Management
- [ ] Can register a new user account
- [ ] Can login as user
- [ ] Can access user dashboard

---

### 4. Test Session Management
- [ ] Can create a session as trainer
- [ ] Can assign users/team members
- [ ] Can view sessions list
- [ ] User can see assigned sessions

---

### 5. Test Scenario Game
- [ ] User can start a scenario game
- [ ] Timer works correctly
- [ ] Can submit responses
- [ ] AI generates next scenarios (check for uniqueness)
- [ ] Game completes successfully

---

### 6. Test Team Sessions
- [ ] Can create team session with multiple users
- [ ] All team members can access the session
- [ ] Custom roles display correctly
- [ ] Waiting mechanism works (when not all submitted)
- [ ] All team members progress together

---

### 7. Test Analysis Features
- [ ] Trainer can view responses
- [ ] Trainer can submit analysis
- [ ] Analysis displays correctly
- [ ] Session status updates properly

---

### 8. Test Session Status Flow
- [ ] Active → Submitted (when user submits)
- [ ] Submitted → Analysing (trainer marks)
- [ ] Analysing → Completed (trainer submits analysis)
- [ ] Can archive completed sessions
- [ ] Can view archived sessions

---

## 🔍 Troubleshooting

### If something doesn't work:

1. **Check Vercel Logs**
   - [ ] Opened Vercel Dashboard → Project → Logs
   - [ ] Reviewed error messages
   - [ ] Noted any issues

2. **Check MongoDB Atlas**
   - [ ] Verified cluster is running
   - [ ] Checked network access settings
   - [ ] Reviewed connection metrics

3. **Verify Environment Variables**
   - [ ] All 4 variables are set in Vercel
   - [ ] No typos in variable names
   - [ ] Values are correct (no extra spaces)

4. **Common Fixes**
   - [ ] Redeployed project (Vercel Dashboard → Deployments → Redeploy)
   - [ ] Cleared browser cache
   - [ ] Tried in incognito/private window

---

## 📊 Monitoring

### Regular Checks
- [ ] Check Vercel analytics weekly
- [ ] Monitor MongoDB Atlas metrics
- [ ] Review error logs monthly
- [ ] Test critical features monthly

---

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ All features work as expected
- ✅ No errors in Vercel logs
- ✅ MongoDB shows active connections
- ✅ Users can register and login
- ✅ AI generates unique scenarios
- ✅ Sessions complete successfully

---

## 📝 Notes

Use this section for any deployment-specific notes:

```
[Your notes here]
```

---

## 🔄 Future Updates

When you need to update your deployed app:

1. Make changes locally
2. Test thoroughly
3. Commit changes: `git commit -m "Description"`
4. Push to GitHub: `git push`
5. Vercel auto-deploys! ✨

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Status**: ⬜ In Progress  ⬜ Completed  ⬜ Issues

---

Good luck! 🚀

