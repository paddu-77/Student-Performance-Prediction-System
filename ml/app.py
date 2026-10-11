from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor
import numpy as np

app = FastAPI(title="Student Performance Prediction API", version="1.0.0")

# Local development only. Add your deployed frontend origin before deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176"
],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# EDUCATIONAL DEMO ONLY:
# This generated dataset is not real student data and cannot establish real-world accuracy.
rng = np.random.default_rng(42)
X = np.column_stack([
    rng.uniform(0, 10, 1500),    # study hours/day
    rng.uniform(0, 100, 1500),   # attendance %
    rng.uniform(0, 100, 1500),   # previous marks
    rng.uniform(0, 100, 1500),   # assignments completed %
])
noise = rng.normal(0, 5, 1500)
y = np.clip(
    2.2 * X[:, 0] + 0.20 * X[:, 1] +
    0.45 * X[:, 2] + 0.12 * X[:, 3] + noise,
    0, 100
)

model = RandomForestRegressor(n_estimators=120, random_state=42)
model.fit(X, y)


class StudentInput(BaseModel):
    study_hours: float = Field(ge=0, le=24)
    attendance: float = Field(ge=0, le=100)
    previous_marks: float = Field(ge=0, le=100)
    assignments_completed: float = Field(ge=0, le=100)


@app.get("/")
def home():
    return {
        "message": "Student Performance Prediction API is running",
        "warning": "Demo model trained on synthetic data; not for real academic decisions."
    }


@app.post("/predict")
def predict(student: StudentInput):
    features = np.array([[
        student.study_hours,
        student.attendance,
        student.previous_marks,
        student.assignments_completed,
    ]])
    score = round(float(model.predict(features)[0]), 1)
    if score >= 75:
        category = "Excellent"
    elif score >= 60:
        category = "Good"
    elif score >= 40:
        category = "Average"
    else:
        category = "Needs Improvement"

    return {
        "predicted_marks": score,
        "performance": category,
        "disclaimer": "Demo estimate from synthetic training data; not a validated prediction."
    }
