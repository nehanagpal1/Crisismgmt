@echo off
echo ========================================
echo   Vercel Deployment Helper
echo ========================================
echo.

echo Step 1: Checking if git is initialized...
if not exist ".git" (
    echo Git not initialized. Initializing now...
    git init
    echo Git initialized!
) else (
    echo Git already initialized.
)
echo.

echo Step 2: Adding all files to git...
git add .
echo.

echo Step 3: Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Ready for Vercel deployment
git commit -m "%commit_msg%"
echo.

echo Step 4: Checking for Vercel CLI...
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
    echo Vercel CLI installed!
) else (
    echo Vercel CLI already installed.
)
echo.

echo ========================================
echo   Ready to Deploy!
echo ========================================
echo.
echo IMPORTANT: Before deploying, make sure you have:
echo   1. MongoDB Atlas connection string
echo   2. Session secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo   3. Gemini API Key: AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE
echo.
echo You will be asked to set these as environment variables during deployment.
echo.
pause

echo.
echo Starting Vercel deployment...
vercel

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Your app should now be live on Vercel.
echo Check the URL provided above.
echo.
pause

