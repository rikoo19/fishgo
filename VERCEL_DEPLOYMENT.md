# 🚀 Vercel Deployment Guide - Fishing Game 2D

## Prerequisites
- Vercel account (sign up at [vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**
   ```bash
   cd d:/backup/fishgo
   vercel
   ```

4. **Follow the prompts**
   - Set project name (e.g., `fishgo-game`)
   - Link to existing project or create new
   - Confirm settings

5. **Deploy to production**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure settings:
     - **Framework Preset**: Other
     - **Root Directory**: `./`
     - **Build Command**: (leave empty)
     - **Output Directory**: (leave empty)

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live at `https://your-project-name.vercel.app`

## Configuration Files Created

- `vercel.json` - Vercel routing configuration
- `api/index.py` - Serverless function entry point
- Updated `requirements.txt` - Added mangum for ASGI adapter

## Project Structure for Vercel

```
fishgo/
├── api/
│   └── index.py          # Serverless function entry point
├── backend/
│   ├── main.py           # FastAPI application
│   └── music/            # Background music files
├── frontend/
│   ├── index.html        # Main game HTML
│   ├── game_new.js       # Game logic
│   └── style_new.css     # Game styles
├── vercel.json           # Vercel configuration
└── requirements.txt      # Python dependencies
```

## Routing Configuration

- `/api/*` → API serverless functions (FastAPI)
- `/backend/music/*` → Static music files
- `/*` → Frontend static files

## Environment Variables (Optional)

If needed, add these in Vercel Dashboard:
- `DEBUG` - Set to `false` for production
- `HOST` - Set to `0.0.0.0`
- `PORT` - Set to `8000`

## Troubleshooting

### Build fails
- Check that `requirements.txt` includes all dependencies
- Verify `api/index.py` exists and is properly configured

### API not working
- Check Vercel Function logs in dashboard
- Verify mangum is installed in requirements.txt

### Music not playing
- Check that music files are in `backend/music/` directory
- Verify path is `/backend/music/backsoundOne.mp3`

### Static files not loading
- Check vercel.json routing configuration
- Verify frontend files are in `frontend/` directory

## Post-Deployment

1. **Test the application**
   - Visit your Vercel URL
   - Test fishing functionality
   - Check if music plays (may need user interaction first)

2. **Set up custom domain** (optional)
   - Go to Vercel Dashboard
   - Project Settings → Domains
   - Add your custom domain

3. **Monitor performance**
   - Check Vercel Analytics
   - Monitor function execution time
   - Check error logs

## Notes

- The app uses in-memory storage (players dict) - data will reset on each deployment
- For production, consider adding a database (PostgreSQL, Redis)
- Serverless functions have execution time limits (10-60 seconds depending on plan)
- Background music may not autoplay due to browser policies - requires user interaction
