# Student Performance Prediction System — Beginner Guide (Telugu)

ఈ project లో:
- React + CSS: website design and forms
- Python + FastAPI: prediction API
- scikit-learn: demo ML model
- Supabase: signup/login and prediction history database

## 1. Requirements
- VS Code
- Node.js (LTS)
- Python 3.10 or newer
- Supabase account

## 2. React setup
PowerShell లో project root నుండి:
```powershell
cd frontend
npm install
Copy-Item .env.example .env
```
`frontend/.env` open చేసి Supabase URL, public/publishable key పెట్టండి.
Supabase project dashboard లో project URL మరియు publishable key (లేదా legacy anon public key) దొరుకుతాయి.
`service_role` లేదా secret key ను React `.env` లో పెట్టకండి.

React start:
```powershell
npm run dev
```
Terminal లో చూపించిన URL open చేయండి; సాధారణంగా http://localhost:5173.

## 3. Supabase database setup
Supabase project → SQL Editor → `supabase/schema.sql` లోని SQL copy చేసి Run చేయండి.
ఈ table లో ప్రతి logged-in user తన prediction rows మాత్రమే చూడగలిగేలా RLS policies ఉన్నాయి.

Auth settings లో email/password sign-in enable అయి ఉందో చూడండి. Signup తర్వాత email confirmation అడిగితే email verify చేయండి.

## 4. Python ML API setup
కొత్త terminal open చేసి project root నుండి:
```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
PowerShell activation policy వల్ల activate కాలేకపోతే, ఈ terminal కోసం activate చేయకుండా కూడా run చేయవచ్చు:
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8000
```
API test: http://127.0.0.1:8000/docs

## 5. Run both at the same time
- Terminal 1: `frontend` folder లో `npm run dev`
- Terminal 2: `ml` folder లో `uvicorn app:app --reload --port 8000`
రెండు servers నడుస్తూ ఉండాలి.

## 6. How it works
1. Signup/Login ద్వారా Supabase Auth session వస్తుంది.
2. Student form లో study hours, attendance, previous marks, assignments ఇస్తారు.
3. React `/predict` endpoint కి data పంపుతుంది.
4. FastAPI model predicted marks మరియు category తిరిగి ఇస్తుంది.
5. React result చూపించి Supabase `predictions` table లో save చేస్తుంది.
6. History page అదే logged-in user records మాత్రమే చూపిస్తుంది.

## 7. Important ML limitation
`ml/app.py` లో demo training data random/synthetic data. ఇది నిజమైన student records కాదు; model accuracy నిజ జీవితానికి సరిపోతుందని అర్థం కాదు.
Final academic project కోసం ethically sourced real dataset ఉపయోగించి train/test split చేయండి; MAE, RMSE, R² metrics నివేదించండి. Prediction ని guaranteed exam result అని చెప్పకండి.

## 8. Common problems
- `Failed to fetch`: Python API running ఉందో, port 8000 correct ఉందో చూడండి.
- CORS error: frontend URL 5173 లో ఉందో చూడండి.
- Supabase URL/key error: `.env` values సరిగ్గా ఉన్నాయో చూడండి; `.env` మార్చిన తర్వాత Vite restart చేయండి.
- Database insert error: `supabase/schema.sql` పూర్తిగా run చేశారో, login session ఉందో చూడండి.
- Signup తర్వాత login కాలేకపోతే: email confirmation email verify చేయండి.
