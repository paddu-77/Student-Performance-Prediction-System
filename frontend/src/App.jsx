
import React, { useEffect, useMemo, useState } from "react";

import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis
} from "recharts";
import { supabase, supabaseReady } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const blankForm = {
  study_hours: "4",
  attendance: "85",
  previous_marks: "70",
  assignments_completed: "80"
};

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!supabaseReady) {
        throw new Error("Supabase setup complete కాలేదు. frontend/.env file లో URL, public key ఇవ్వండి.");
      }
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setMessage("Account create అయింది. Email confirmation enable చేసి ఉంటే email verify చేసి login అవ్వండి.");
      } else {
        setMessage("Success! Loading dashboard…");
      }
    } catch (error) {
      setMessage(error.message || "Login చేయలేకపోయాం.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">🎓</div>
        <p className="eyebrow">ACADEMIC ANALYTICS</p>
        <h1>Student<span>Predict</span></h1>
        <p className="muted">Understand your progress. Plan your next step.</p>
        <label>Email address</label>
        <input type="email" autoComplete="email" required value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <label>Password</label>
        <input type="password" minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="At least 6 characters" />
        <button className="primary-btn full" disabled={busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Login"}
        </button>
        {message && <p className="notice" role="status">{message}</p>}
        <p className="auth-switch">
          {mode === "signup" ? "Already registered?" : "New student?"}{" "}
          <button type="button" className="text-btn" onClick={() => {
            setMode(mode === "signup" ? "login" : "signup"); setMessage("");
          }}>{mode === "signup" ? "Login" : "Sign up"}</button>
        </p>
      </form>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [form, setForm] = useState(blankForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    if (!supabaseReady) {
      setAuthReady(true);
      return undefined;
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setMessage(error.message);
      setSession(data?.session ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadHistory();
    else setHistory([]);
    // loadHistory is intentionally triggered when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  async function loadHistory() {
    if (!supabaseReady || !session) return;
    const { data, error } = await supabase
      .from("predictions").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) showMessage(`History load కాలేదు: ${error.message}`, "error");
    else setHistory(data || []);
  }

  function showMessage(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function updateField(event) {
    setForm(old => ({ ...old, [event.target.name]: event.target.value }));
  }

  async function predict(event) {
    event.preventDefault();
    setResult(null);
    setMessage("");
    const input = {
      study_hours: Number(form.study_hours),
      attendance: Number(form.attendance),
      previous_marks: Number(form.previous_marks),
      assignments_completed: Number(form.assignments_completed)
    };
    if (Object.values(input).some(value => !Number.isFinite(value))) {
      showMessage("దయచేసి అన్ని fields లో valid numbers ఇవ్వండి.", "error");
      return;
    }
    if (input.study_hours < 0 || input.study_hours > 24 ||
        input.attendance < 0 || input.attendance > 100 ||
        input.previous_marks < 0 || input.previous_marks > 100 ||
        input.assignments_completed < 0 || input.assignments_completed > 100) {
      showMessage("Study hours 0–24 మధ్య, మిగతా percentages/marks 0–100 మధ్య ఉండాలి.", "error");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "ML API prediction failed.");
      setResult(data);

      const { error: saveError } = await supabase.from("predictions").insert({
        user_id: session.user.id,
        ...input,
        predicted_marks: data.predicted_marks,
        performance: data.performance
      });
      if (saveError) {
        showMessage(`Prediction వచ్చింది, కానీ database save కాలేదు: ${saveError.message}. SQL/RLS settings check చేయండి.`, "error");
      } else {
        showMessage("Prediction విజయవంతంగా Supabase లో save అయింది.", "success");
        await loadHistory();
      }
    } catch (error) {
      showMessage(`${error.message} — Python API నడుస్తుందో చూడండి (${API_URL}).`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) showMessage(error.message, "error");
    else {
      setResult(null);
      setPage("dashboard");
    }
  }

  const average = useMemo(() => history.length
    ? (history.reduce((sum, item) => sum + Number(item.predicted_marks), 0) / history.length).toFixed(1)
    : "—", [history]);
  const latest = history[0];
  const chartData = [...history].slice(0, 8).reverse().map((item, index) => ({
    name: new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    marks: Number(item.predicted_marks),
    attempt: index + 1
  }));

  if (!authReady) return <main className="loading-screen">Loading StudentPredict…</main>;
  if (!session) return <AuthScreen />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon">🎓</span><div><b>StudentPredict</b><small>Performance System</small></div></div>
        <p className="side-label">WORKSPACE</p>
        <button className={`nav-item ${page === "dashboard" ? "selected" : ""}`} onClick={() => setPage("dashboard")}><span>⌂</span> Dashboard</button>
        <button className={`nav-item ${page === "student" ? "selected" : ""}`} onClick={() => setPage("student")}><span>♙</span> Student Details</button>
        <button className={`nav-item ${page === "history" ? "selected" : ""}`} onClick={() => setPage("history")}><span>◷</span> Prediction History</button>
        <div className="sidebar-bottom">
          <div className="future-icon">✦</div>
          <h3>Better insights.<br/>Brighter future.</h3>
          <p>Your learning today builds your success tomorrow.</p>
          <button className="nav-item logout" onClick={logout}><span>↪</span> Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="top-search">⌕ <span>Academic performance overview</span></div>
          <div className="user-pill"><span className="avatar">{session.user.email?.[0]?.toUpperCase() || "S"}</span><span>{session.user.email}</span></div>
        </header>

        <section className="welcome-banner">
          <p className="eyebrow">YOUR LEARNING JOURNEY</p>
          <h1>Student Performance Prediction System</h1>
          <p>Enter your academic details and explore an AI-powered estimate of your performance.</p>
        </section>

        <section className="stats-grid">
          <StatCard icon="▤" label="Your Predictions" value={history.length} tone="purple" />
          <StatCard icon="↗" label="Average Prediction" value={average === "—" ? "—" : `${average}/100`} tone="green" />
          <StatCard icon="◎" label="Latest Score" value={latest ? `${latest.predicted_marks}/100` : "—"} tone="blue" />
          <StatCard icon="★" label="Latest Category" value={latest?.performance || "Not yet"} tone="orange" compact />
        </section>

        {message && <div className={`notice banner-notice ${messageType}`} role="status">{message}</div>}

        {page === "history" ? (
          <section className="panel history-panel">
            <div className="panel-title"><div><h2>Prediction History</h2><p>Your saved predictions from Supabase.</p></div><button className="secondary-btn" onClick={loadHistory}>↻ Refresh</button></div>
            <HistoryTable history={history} />
          </section>
        ) : (
          <>
            <div className="section-heading"><div><h2>{page === "student" ? "Student Details" : "Performance workspace"}</h2><p>Update your information and request a prediction.</p></div></div>
            <section className="workspace-grid">
              <form className="panel student-form" onSubmit={predict}>
                <div className="panel-title"><div><h2>Enter Student Details</h2><p>Use your latest academic information.</p></div><span className="panel-emoji">📝</span></div>
                <Field label="Study hours per day" name="study_hours" value={form.study_hours} onChange={updateField} min="0" max="24" step="0.5" suffix="hours" help="Example: 4.5 hours daily" />
                <Field label="Attendance percentage" name="attendance" value={form.attendance} onChange={updateField} min="0" max="100" suffix="%" />
                <Field label="Previous exam marks" name="previous_marks" value={form.previous_marks} onChange={updateField} min="0" max="100" suffix="/100" />
                <Field label="Assignments completed" name="assignments_completed" value={form.assignments_completed} onChange={updateField} min="0" max="100" suffix="%" />
                <button className="primary-btn full predict-btn" disabled={busy}>{busy ? <><span className="spinner"/> Predicting…</> : "✦  Predict Performance"}</button>
                <p className="fine-print">Your prediction is an estimate, not a guaranteed exam result.</p>
              </form>

              <section className="panel result-panel">
                <div className="panel-title"><div><h2>Prediction Result</h2><p>Your estimated academic outcome.</p></div><span className="panel-emoji">🧠</span></div>
                {result ? <Result result={result} form={form} /> : (
                  <div className="empty-result"><div className="empty-art">📈</div><h3>Your result will appear here</h3><p>Complete the form and select <b>Predict Performance</b>.</p><div className="empty-line"/></div>
                )}
              </section>
            </section>

            <section className="bottom-grid">
              <section className="panel chart-panel">
                <div className="panel-title"><div><h2>Performance Analysis</h2><p>Recent predicted marks</p></div><span className="mini-legend"><i/> Predicted</span></div>
                {chartData.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6658e8" stopOpacity={0.28}/><stop offset="100%" stopColor="#6658e8" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf0fa" strokeDasharray="4 4"/><XAxis dataKey="name" tick={{ fill: "#7c849f", fontSize: 11 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fill: "#7c849f", fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="marks" name="Predicted marks" stroke="#6658e8" strokeWidth={3} fill="url(#scoreFill)" /></AreaChart></ResponsiveContainer></div> : <div className="chart-empty">Your chart will appear after your first prediction.</div>}
              </section>
              <section className="panel recent-panel">
                <div className="panel-title"><div><h2>Recent Predictions</h2><p>Latest saved results</p></div><button className="text-btn" onClick={() => setPage("history")}>View all →</button></div>
                <HistoryTable history={history.slice(0, 4)} compact />
              </section>
            </section>
          </>
        )}
        <footer className="footer">StudentPredict · Learning analytics for guidance, not guarantees.</footer>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, tone, compact }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div className="stat-copy"><p>{label}</p><h2 className={compact ? "small-value" : ""}>{value}</h2></div></article>;
}

function Field({ label, name, value, onChange, min, max, step = "1", suffix, help }) {
  return <div className="field"><label htmlFor={name}>{label}</label><div className="input-wrap"><input id={name} name={name} type="number" min={min} max={max} step={step} required value={value} onChange={onChange}/><span>{suffix}</span></div>{help && <small>{help}</small>}</div>;
}

function Result({ result, form }) {
  const score = Math.max(0, Math.min(100, Number(result.predicted_marks)));
  const tips = [];
  if (Number(form.attendance) < 75) tips.push("Try to improve your attendance.");
  if (Number(form.study_hours) < 3) tips.push("Plan a consistent daily study routine.");
  if (Number(form.assignments_completed) < 80) tips.push("Complete assignments before their deadlines.");
  if (Number(form.previous_marks) < 60) tips.push("Revise previous topics and practice sample questions.");
  if (!tips.length) tips.push("Keep your routine consistent and continue practicing.");
  return <div className="result-content">
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }}><div><strong>{score.toFixed(1)}</strong><span>/ 100</span></div></div>
    <p className="result-label">Estimated performance</p>
    <span className={`performance-tag ${result.performance === "Excellent" ? "excellent" : result.performance === "Good" ? "good" : result.performance === "Average" ? "average" : "improve"}`}>{result.performance}</span>
    <div className="score-track"><span style={{ width: `${score}%` }}/></div>
    <div className="tips-box"><b>💡 Quick tips</b><ul>{tips.map(tip => <li key={tip}>{tip}</li>)}</ul></div>
    <p className="fine-print">This demo model uses generated example data. Do not use its estimate for real academic decisions.</p>
  </div>;
}

function HistoryTable({ history, compact = false }) {
  if (!history.length) return <div className="table-empty">No saved predictions yet. Run a prediction to see it here.</div>;
  return <div className="table-scroll"><table><thead><tr><th>Date</th>{!compact && <><th>Study</th><th>Attendance</th><th>Previous</th></>}<th>Predicted</th><th>Category</th></tr></thead><tbody>
    {history.map(item => <tr key={item.id}><td>{new Date(item.created_at).toLocaleDateString()}</td>{!compact && <><td>{item.study_hours}h</td><td>{item.attendance}%</td><td>{item.previous_marks}</td></>}<td><b className="score-chip">{Number(item.predicted_marks).toFixed(1)}</b></td><td>{item.performance}</td></tr>)}
  </tbody></table></div>;
}

export default App;
