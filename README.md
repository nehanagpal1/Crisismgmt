# Scenario-Based Training Application

A comprehensive training platform for creating and managing scenario-based exercises with AI-powered dynamic content generation.

## Features

- **Trainer Dashboard**: Create scenarios, manage sessions, assign users, and analyze performance
- **User Dashboard**: View assigned sessions and participate in scenario games
- **Team Sessions**: Support for 1-5 team members with custom roles
- **AI-Powered Scenarios**: Dynamic scenario generation using Google Gemini
- **Session Management**: Complete workflow from active to completed/archived
- **Detailed Analysis**: Behavioral interpretation and performance feedback

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **AI**: Google Gemini API
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: Express Session

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google Gemini API Key

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/login-module
   SESSION_SECRET=your_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. Start MongoDB (if running locally)

5. Run the server:
   ```bash
   npm start
   ```

6. Open http://localhost:3000

## Deploying to Vercel

### Step 1: Set up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/dbname`)
5. Replace `<password>` with your actual password
6. Replace `dbname` with `login-module` or your preferred database name

### Step 2: Prepare Your Project

1. Make sure all files are saved
2. Initialize git repository (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. Push to GitHub (optional but recommended):
   ```bash
   git remote add origin https://github.com/yourusername/your-repo.git
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and set environment variables when asked

#### Option B: Deploy via Vercel Dashboard

1. Go to [Vercel](https://vercel.com)
2. Sign up or log in
3. Click "Add New" → "Project"
4. Import your GitHub repository (or upload folder)
5. Configure project:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

6. Add Environment Variables:
   - Click "Environment Variables"
   - Add the following:
     ```
     MONGODB_URI = mongodb+srv://your-connection-string
     SESSION_SECRET = generate-a-strong-random-string
     GEMINI_API_KEY = AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE
     NODE_ENV = production
     ```

7. Click "Deploy"

### Step 4: Configure MongoDB Atlas Network Access

1. In MongoDB Atlas, go to "Network Access"
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
   - This is necessary for Vercel's dynamic IPs
4. Click "Confirm"

### Step 5: Test Your Deployment

1. Once deployed, Vercel will provide a URL (e.g., `your-app.vercel.app`)
2. Visit the URL and test:
   - Registration
   - Login
   - Creating scenarios
   - Creating sessions
   - Playing scenario games

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `PORT` | Server port (auto-assigned on Vercel) | No |
| `NODE_ENV` | Environment (production/development) | No |

## Important Notes for Production

1. **Session Storage**: For production, consider using a session store like:
   - `connect-mongo` (MongoDB session store)
   - `connect-redis` (Redis session store)

2. **Security**:
   - Use strong, random SESSION_SECRET
   - Enable HTTPS (Vercel does this automatically)
   - Consider rate limiting for API endpoints

3. **Database**:
   - Use MongoDB Atlas for production
   - Set up proper indexes for performance
   - Enable backups

4. **Monitoring**:
   - Check Vercel logs for errors
   - Monitor MongoDB Atlas metrics
   - Set up alerts for critical issues

## Troubleshooting

### Common Issues

1. **"Cannot connect to MongoDB"**
   - Check your MONGODB_URI is correct
   - Verify MongoDB Atlas network access allows Vercel IPs
   - Ensure database user has proper permissions

2. **"Session not persisting"**
   - Check SESSION_SECRET is set
   - Verify cookie settings in production
   - Consider using a session store

3. **"AI not generating scenarios"**
   - Verify GEMINI_API_KEY is set correctly
   - Check API quota limits
   - Review server logs for errors

4. **"404 errors on routes"**
   - Ensure `vercel.json` is properly configured
   - Check all routes are mounted in `server.js`

## Support

For issues or questions, please check the logs:
- Vercel: Dashboard → Your Project → Logs
- MongoDB: Atlas Dashboard → Metrics

## License

MIT

