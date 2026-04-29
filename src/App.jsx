import { useState } from "react";

// ── Design tokens — csplaybooks.com design system ─────────────────────────────
const BG      = "#f5f0e8";   // cream background
const CARD    = "#ffffff";   // white card surface
const TEXT    = "#1a1210";   // dark brown primary text
const MUTED   = "#5a4a42";   // secondary text
const BORDER  = "#e8e0d0";   // warm border
const AMBER   = "#c9901a";   // primary accent
const SLATE   = "#4a6fa5";   // secondary accent
const SUCCESS = "#27ae60";
const WARN    = "#e6a817";
const DANGER  = "#e05c2a";
const CRIT    = "#c0392b";

// Keep old NAV/ACCENT names so internal logic references stay untouched
const NAV    = TEXT;
const ACCENT = AMBER;

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Crimson Text', Georgia, serif;
  background: ${BG};
  color: ${TEXT};
  -webkit-font-smoothing: antialiased;
}

input, textarea, button, select {
  font-family: inherit;
}

::placeholder { color: #b8a898; }

input:focus, textarea:focus {
  outline: none;
  border-color: ${AMBER} !important;
  box-shadow: 0 0 0 3px ${AMBER}22;
}

.mono { font-family: 'JetBrains Mono', monospace; }

/* Subtle paper texture on bg */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
`;

const FIELDS = [
  { key: "company",      label: "Company Name",              placeholder: "e.g. Acme Corp",                                                                               type: "text"     },
  { key: "industry",     label: "Industry / Vertical",       placeholder: "e.g. Utilities, AR Automation, Fintech",                                                       type: "text"     },
  { key: "tier",         label: "Contract Tier",             placeholder: "e.g. Enterprise, Mid-Market, SMB",                                                             type: "text"     },
  { key: "arr",          label: "ARR / Contract Value",      placeholder: "e.g. $120,000",                                                                                type: "text"     },
  { key: "stage",        label: "Account Stage",             placeholder: "e.g. Onboarding, Adopted, At-Risk, Expansion, Renewal",                                       type: "text"     },
  { key: "renewalDate",  label: "Renewal Date",              placeholder: "e.g. Q3 2026 or 09/01/2026",                                                                   type: "text"     },
  { key: "stakeholders", label: "Key Stakeholders",          placeholder: "e.g. VP Finance (champion), IT Director, CFO (exec sponsor)",                                  type: "text"     },
  { key: "usageMetrics", label: "Usage Metrics (optional)",  placeholder: "e.g. Automation rate 51% (down from 62%), active users 6/8, approver logins 1.6/mo, CSAT 7.2, 27 support tickets", type: "textarea" },
  { key: "goals",        label: "Customer Goals & Success Criteria", placeholder: "e.g. Reduce invoice processing cost 50%, cycle time 12→5 days, improve audit readiness", type: "textarea" },
  { key: "painPoints",   label: "Known Pain Points / Risks", placeholder: "e.g. Low portal adoption, integration delays, champion leaving",                               type: "textarea" },
  { key: "notes",        label: "Additional Context (optional)", placeholder: "e.g. Came from competitor, price sensitive, exec relationship with CEO",                   type: "textarea" },
];

const REQUIRED   = ["company", "industry", "tier", "stage", "renewalDate", "stakeholders", "goals"];
const ICONS      = ["🚀", "❤️", "📊", "🚨", "📈", "🎯", "📋"];
const EMPTY_FORM = { company: "", industry: "", tier: "", arr: "", stage: "", renewalDate: "", stakeholders: "", usageMetrics: "", goals: "", painPoints: "", notes: "" };

function getTodayString() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function buildPlaybookPrompt(f) {
  const today = getTodayString();
  return `You are a senior CSM with deep expertise in payments, AR automation, and utility tech. Generate a practical, account-specific CS playbook. Be direct and actionable — no generic filler.

TODAY'S DATE: ${today}
All dates, timelines, and quarter references in your output MUST be based on this date. Do not use any other year or date assumption.

ACCOUNT:
Company: ${f.company} | Industry: ${f.industry} | Tier: ${f.tier} | ARR: ${f.arr}
Stage: ${f.stage} | Renewal: ${f.renewalDate}
Stakeholders: ${f.stakeholders}
${f.usageMetrics ? `Usage Metrics: ${f.usageMetrics}` : ""}
Goals: ${f.goals}
Pain Points: ${f.painPoints}
${f.notes ? `Context: ${f.notes}` : ""}

Generate all 7 sections with 3-5 specific bullets each. Use the usage metrics to make recommendations specific and data-driven.
When referencing dates or quarters, always calculate relative to today (${today}).

## 1. Onboarding & Kickoff
## 2. Health Scoring & Risk Flags
## 3. QBR / Executive Business Review
## 4. Escalation & De-escalation
## 5. Renewal & Expansion
## 6. Success Metrics & KPIs
## 7. Project Status
## CSM Priority Actions This Quarter`;
}

function buildTemplatesPrompt(f, sections) {
  const today = getTodayString();
  const ctx = sections.slice(0, 3).map(s => s.title + ": " + s.content.slice(0, 2).join(" ")).join(" | ");
  return `Generate 4 email templates for this CS account. Respond ONLY with valid JSON, no markdown, no preamble.

TODAY'S DATE: ${today}
All date references must be based on this date.

Account: ${f.company} | ${f.industry} | ${f.tier} | Stage: ${f.stage} | Renewal: ${f.renewalDate}
${f.usageMetrics ? `Usage Metrics: ${f.usageMetrics}` : ""}
Goals: ${f.goals}
Pain Points: ${f.painPoints}
Context: ${ctx}

Return EXACTLY:
{"templates":[{"name":"Kickoff Email","subject":"...","body":"..."},{"name":"QBR Invite & Agenda","subject":"...","body":"..."},{"name":"Renewal Outreach","subject":"...","body":"..."},{"name":"Escalation Acknowledgment","subject":"...","body":"..."}]}

Rules: body under 180 words. Use [brackets] for placeholders. Specific to this account. Warm but professional.`;
}

function parsePlaybook(text) {
  const sections = [], lines = text.split("\n");
  let cur = null, priority = [], inPriority = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (cur) sections.push(cur);
      const title = line.replace(/^##\s*/, "").trim();
      if (/CSM Priority/i.test(title)) { cur = null; inPriority = true; }
      else { cur = { title, content: [] }; inPriority = false; }
    } else if (inPriority && line.trim()) priority.push(line.trim());
    else if (cur && line.trim()) cur.content.push(line.trim());
  }
  if (cur) sections.push(cur);
  return { sections, priority };
}

function parseUsageMetrics(raw) {
  if (!raw) return { automationRate: null, userRetention: null, csatScore: null, ticketCount: null, approverLogins: null };
  const txt = raw.toLowerCase();
  let automationRate = null;
  const automMatch = txt.match(/automation[^%\d]*(\d{1,3})%/) || txt.match(/touchless[^%\d]*(\d{1,3})%/) || txt.match(/(\d{1,3})%[^%]*automation/) || txt.match(/(\d{1,3})%[^%]*touchless/);
  if (automMatch) automationRate = parseInt(automMatch[1]);
  let userRetention = null;
  const userMatch = txt.match(/active users\s*(\d+)\s*\/\s*(\d+)/) || txt.match(/(\d+)\s*\/\s*(\d+)\s*users/) || txt.match(/(\d+)\s*of\s*(\d+)\s*users/);
  if (userMatch) userRetention = parseInt(userMatch[1]) / parseInt(userMatch[2]);
  let csatScore = null;
  const csatMatch = txt.match(/csat[^.\d]*(\d+\.?\d*)/) || txt.match(/satisfaction[^.\d]*(\d+\.?\d*)/);
  if (csatMatch) csatScore = parseFloat(csatMatch[1]);
  let ticketCount = null;
  const ticketMatch = txt.match(/(\d+)\s*(?:support\s*)?tickets/) || txt.match(/tickets[^.\d]*(\d+)/);
  if (ticketMatch) ticketCount = parseInt(ticketMatch[1]);
  let approverLogins = null;
  const loginMatch = txt.match(/(?:approver\s*)?logins?[^.\d]*(\d+\.?\d*)\s*\/\s*mo/) || txt.match(/(\d+\.?\d*)\s*\/mo[^%]*login/) || txt.match(/login[^.\d]*(\d+\.?\d*)/);
  if (loginMatch) approverLogins = parseFloat(loginMatch[1]);
  return { automationRate, userRetention, csatScore, ticketCount, approverLogins };
}

function calcHealth(f) {
  let score = 0, bd = [];
  const sn = f.stage.toLowerCase();
  const rt = (f.painPoints + " " + f.notes + " " + f.stage + " " + f.usageMetrics).toLowerCase();
  const metrics = parseUsageMetrics(f.usageMetrics);

  let ss = 14;
  if (sn.includes("adopt") || sn.includes("expan")) ss = 28;
  else if (sn.includes("onboard")) ss = 20;
  else if (sn.includes("renew")) ss = 16;
  else if (sn.includes("risk") || sn.includes("at-risk") || sn.includes("at risk")) ss = 6;
  score += ss;
  bd.push({ label: "Account Stage", score: ss, max: 28, note: f.stage });

  let usageScore = 0, usageNote = "";
  if (metrics.automationRate !== null || metrics.userRetention !== null || metrics.csatScore !== null) {
    let pts = 0, signals = [];
    if (metrics.automationRate !== null) {
      const ap = metrics.automationRate >= 80 ? 12 : metrics.automationRate >= 70 ? 9 : metrics.automationRate >= 60 ? 6 : metrics.automationRate >= 50 ? 3 : 0;
      pts += ap; signals.push(`${metrics.automationRate}% automation`);
    } else { pts += 6; }
    if (metrics.userRetention !== null) {
      const up = metrics.userRetention >= 0.75 ? 5 : metrics.userRetention >= 0.5 ? 2 : 0;
      pts += up; signals.push(`${Math.round(metrics.userRetention * 100)}% user retention`);
    } else { pts += 3; }
    if (metrics.csatScore !== null) {
      const cp = metrics.csatScore >= 9 ? 5 : metrics.csatScore >= 8 ? 4 : metrics.csatScore >= 7 ? 2 : 0;
      pts += cp; signals.push(`CSAT ${metrics.csatScore}`);
    } else { pts += 3; }
    if (metrics.approverLogins !== null) {
      const lp = metrics.approverLogins >= 3 ? 3 : metrics.approverLogins >= 2 ? 1 : 0;
      pts += lp; signals.push(`${metrics.approverLogins} logins/mo`);
    }
    usageScore = Math.min(25, pts);
    usageNote = signals.length > 0 ? signals.join(", ") : "Metrics provided";
  } else {
    const rw = ["churn","cancel","unhappy","leaving","delayed","low adoption","no adoption","integration issue","escalat","dissatisf","not using","behind","churning","declining","dropped","bypass","disengag","abandon","not logging","inactive","missed","overdue","manual workaround","reverting","regression"];
    const hits = rw.filter(w => rt.includes(w)).length;
    usageScore = Math.max(0, 25 - hits * 4);
    usageNote = hits === 0 ? "No major flags detected" : `${hits} risk signal(s) in notes`;
  }
  score += usageScore;
  bd.push({ label: "Usage & Adoption", score: usageScore, max: 25, note: usageNote });

  let rns = 12;
  const now = new Date();
  const qm = f.renewalDate.toLowerCase().match(/q([1-4])\s*(\d{4})?/);
  if (qm) {
    const q = parseInt(qm[1]), yr = qm[2] ? parseInt(qm[2]) : now.getFullYear();
    const rd = new Date(yr, [0, 3, 6, 9][q - 1], 1);
    const d = (rd - now) / 86400000;
    rns = d > 180 ? 20 : d > 90 ? 15 : d > 60 ? 10 : d > 30 ? 5 : 2;
  } else {
    const pd = new Date(f.renewalDate);
    if (!isNaN(pd)) { const d = (pd - now) / 86400000; rns = d > 180 ? 20 : d > 90 ? 15 : d > 60 ? 10 : d > 30 ? 5 : 2; }
  }
  score += rns;
  bd.push({ label: "Renewal Proximity", score: rns, max: 20, note: f.renewalDate });

  const st = f.stakeholders.toLowerCase();
  const hasChamp = st.includes("champion") || st.includes("advocate") || st.includes("sponsor");
  const hasExec = /cfo|ceo|cto|vp |director|president|exec/i.test(st);
  const cnt = f.stakeholders.split(",").filter(s => s.trim()).length;
  const ss2 = (hasChamp && hasExec) ? 15 : (hasExec && cnt >= 2) ? 11 : cnt >= 2 ? 7 : 4;
  score += ss2;
  bd.push({ label: "Stakeholder Coverage", score: ss2, max: 15, note: hasChamp ? "Champion identified" : hasExec ? "Exec contact present" : "Expand stakeholder map" });

  const gs = f.goals.length > 100 ? 12 : f.goals.length > 60 ? 8 : f.goals.length > 20 ? 5 : 2;
  score += gs;
  bd.push({ label: "Goals Clarity", score: gs, max: 12, note: f.goals.length > 100 ? "Well-defined criteria" : "Add more specificity" });

  if (sn.includes("risk") || sn.includes("at-risk") || sn.includes("at risk")) score = Math.min(score, 54);
  if (metrics.automationRate !== null && metrics.automationRate < 55) score = Math.min(score, 54);
  if (metrics.csatScore !== null && metrics.csatScore < 7.5) score = Math.min(score, 54);
  const multipleMetricFail = [
    metrics.automationRate !== null && metrics.automationRate < 60,
    metrics.csatScore !== null && metrics.csatScore < 7.5,
    metrics.userRetention !== null && metrics.userRetention < 0.75,
    metrics.approverLogins !== null && metrics.approverLogins < 2,
  ].filter(Boolean).length;
  if (multipleMetricFail >= 3) score = Math.min(score, 44);

  const total = Math.min(100, score);
  const status = total >= 75 ? "Healthy" : total >= 55 ? "Needs Attention" : total >= 35 ? "At Risk" : "Critical";
  const color  = total >= 75 ? SUCCESS : total >= 55 ? WARN : total >= 35 ? DANGER : CRIT;
  return { total, status, color, breakdown: bd };
}

async function callClaude(prompt) {
  const res = await fetch('/api/generate', {
    method: 'POST', headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2500, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "";
}

function buildExportText(f, pb, health) {
  let out = `CS ACCOUNT PLAYBOOK — ${f.company}\n${"=".repeat(52)}\n`;
  out += `Industry: ${f.industry} | Tier: ${f.tier} | ARR: ${f.arr}\nStage: ${f.stage} | Renewal: ${f.renewalDate}\nStakeholders: ${f.stakeholders}\n`;
  if (f.usageMetrics) out += `Usage Metrics: ${f.usageMetrics}\n`;
  out += `\nHEALTH SCORE: ${health.total}/100 — ${health.status}\n${"=".repeat(52)}\n\n`;
  pb.sections.forEach(s => { out += `${s.title}\n${"-".repeat(42)}\n${s.content.join("\n")}\n\n`; });
  if (pb.priority.length) out += `CSM PRIORITY ACTIONS\n${"-".repeat(42)}\n${pb.priority.join("\n")}\n`;
  return out;
}

function downloadBlob(content, filename, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const T = { PRIORITY: "priority", HEALTH: "health", TEMPLATES: "templates" };

// ── Shared style helpers ───────────────────────────────────────────────────────
const card = { background: CARD, borderRadius: 12, boxShadow: "0 2px 16px rgba(26,18,16,0.07)", border: `1px solid ${BORDER}` };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" };
const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`, fontSize: 15, boxSizing: "border-box", color: TEXT, background: CARD, fontFamily: "'Crimson Text', Georgia, serif", transition: "border-color 0.2s, box-shadow 0.2s" };
const btnPrimary = (disabled) => ({ background: disabled ? "#d4c9bc" : AMBER, color: disabled ? "#a89888" : "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Crimson Text', Georgia, serif", letterSpacing: 0.3, transition: "background 0.2s, transform 0.1s" });
const btnSecondary = { background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: MUTED, fontFamily: "'Crimson Text', Georgia, serif", transition: "border-color 0.2s, color 0.2s" };

export default function App() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [playbook, setPlaybook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [templates, setTemplates] = useState(null);
  const [tmplLoading, setTmplLoading] = useState(false);
  const [tmplError, setTmplError] = useState("");
  const [selTmpl, setSelTmpl] = useState(0);
  const [copied, setCopied] = useState("");

  const canGen = REQUIRED.every(k => form[k].trim());
  const hasAnyValue = Object.values(form).some(v => v.trim());
  const health = playbook ? calcHealth(form) : null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const clearForm = () => setForm({ ...EMPTY_FORM });

  const generate = async () => {
    setLoading(true); setError(""); setPlaybook(null); setTemplates(null);
    try {
      const text = await callClaude(buildPlaybookPrompt(form));
      if (!text) throw new Error();
      setPlaybook(parsePlaybook(text)); setTab(0);
    } catch { setError("Failed to generate playbook. Please try again."); }
    setLoading(false);
  };

  const loadTemplates = async () => {
    setTab(T.TEMPLATES);
    if (templates || tmplLoading) return;
    setTmplLoading(true); setTmplError("");
    try {
      const text = await callClaude(buildTemplatesPrompt(form, playbook.sections));
      const clean = text.replace(/```json|```/g, "").trim();
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
      const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
      if (!parsed.templates || !Array.isArray(parsed.templates)) throw new Error("Unexpected structure");
      setTemplates(parsed.templates);
    } catch { setTmplError("Failed to generate templates. Please try again."); }
    setTmplLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); };
  const download = (fmt) => {
    const txt = buildExportText(form, playbook, health);
    if (fmt === "txt") { downloadBlob(txt, `${form.company.replace(/\s+/g, "-")}-playbook.txt`); return; }
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>${form.company} Playbook</title><style>body{font-family:'Crimson Text',Georgia,serif;padding:32px;max-width:800px;margin:0 auto;color:${TEXT};background:${BG}}pre{white-space:pre-wrap;line-height:1.7;font-family:inherit;font-size:15px}</style></head><body><pre>${txt}</pre></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  // ── INPUT FORM ─────────────────────────────────────────────────────────────
  if (!playbook) return (
    <>
      <style>{FONTS}</style>
      <div style={{ minHeight: "100vh", background: BG, position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ background: CARD, borderBottom: `2px solid ${AMBER}`, padding: "24px 32px" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: AMBER, marginBottom: 4 }}>
                CS Playbooks
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, lineHeight: 1.1, fontFamily: "'Crimson Text', Georgia, serif" }}>
                Account Playbook Generator
              </h1>
              <p style={{ marginTop: 5, color: MUTED, fontSize: 15 }}>
                Fill in account details to get a tailored playbook with health scoring and email templates.
              </p>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: BORDER, userSelect: "none", textAlign: "right" }}>
              <div style={{ fontSize: 22, marginBottom: 2 }}>◈</div>
              <div style={{ letterSpacing: 1 }}>csplaybooks.com</div>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ ...card, padding: "32px 36px" }}>

            {/* Section label */}
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: AMBER, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 20, height: 1.5, background: AMBER }} />
              Account Details
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 28px" }}>
              {FIELDS.map(f => (
                <div key={f.key} style={{ gridColumn: f.type === "textarea" ? "1 / -1" : "auto" }}>
                  <label style={labelStyle}>
                    {f.label}
                    {REQUIRED.includes(f.key) && <span style={{ color: AMBER, marginLeft: 3 }}>*</span>}
                  </label>
                  {f.type === "textarea"
                    ? <textarea
                        value={form[f.key]}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    : <input
                        value={form[f.key]}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={inputStyle}
                      />
                  }
                </div>
              ))}
            </div>

            {error && (
              <div style={{ marginTop: 18, padding: "12px 16px", background: "#fff3f0", border: `1px solid ${CRIT}33`, borderRadius: 8, color: CRIT, fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 26, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
              {!canGen && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#b8a898", letterSpacing: 0.5 }}>
                  * Complete required fields
                </span>
              )}
              {hasAnyValue && (
                <button onClick={clearForm} style={btnSecondary}>
                  Clear Fields
                </button>
              )}
              <button onClick={generate} disabled={!canGen || loading} style={btnPrimary(!canGen || loading)}>
                {loading ? "Generating Playbook…" : "Generate Playbook →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // ── PLAYBOOK VIEW ──────────────────────────────────────────────────────────
  const allTabs = [
    ...playbook.sections.map((s, i) => ({ key: i, label: `${ICONS[i]} ${s.title.replace(/^\d+\.\s*/, "")}`, color: SLATE })),
    { key: T.PRIORITY, label: "⚡ Priority",    color: DANGER },
    { key: T.HEALTH,   label: "◎ Health Score", color: SUCCESS },
    { key: T.TEMPLATES,label: "✉ Templates",    color: AMBER  },
  ];

  const renderContent = () => {

    // ── Health Score ──────────────────────────────────────────────────────────
    if (tab === T.HEALTH) return (
      <div>
        <div style={{ display: "flex", gap: 32, marginBottom: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ width: 112, height: 112, borderRadius: "50%", background: `conic-gradient(${health.color} ${health.total * 3.6}deg, ${BORDER} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <div style={{ width: 82, height: 82, borderRadius: "50%", background: CARD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 6px rgba(26,18,16,0.1)" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: health.color, lineHeight: 1, fontFamily: "'Crimson Text', Georgia, serif" }}>{health.total}</div>
                <div style={{ fontSize: 10, color: "#b8a898", marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>/ 100</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: health.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>{health.status}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 3, fontFamily: "'Crimson Text', Georgia, serif" }}>{form.company} — Account Health</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, fontFamily: "'JetBrains Mono', monospace" }}>Scored on stage, usage metrics, renewal timing, stakeholders, and goal definition.</div>
            {health.breakdown.map((b, i) => (
              <div key={i} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: TEXT }}>{b.label}</span>
                  <span style={{ color: MUTED, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{b.score}/{b.max} · <em>{b.note}</em></span>
                </div>
                <div style={{ height: 6, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(b.score / b.max) * 100}%`, background: b.score / b.max >= 0.75 ? SUCCESS : b.score / b.max >= 0.5 ? WARN : DANGER, borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: BG, borderRadius: 10, padding: "16px 20px", borderLeft: `4px solid ${health.color}` }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Recommendation</div>
          <div style={{ fontSize: 15, color: TEXT, lineHeight: 1.75 }}>
            {health.total >= 75 ? `${form.company} is in strong shape. Focus on expansion opportunities and documenting ROI ahead of renewal.`
              : health.total >= 55 ? `Some risk signals present. Prioritise stakeholder engagement and define clear success milestones in the next 30 days.`
                : health.total >= 35 ? `This account needs immediate attention. Schedule an exec sync, identify root causes, and build a recovery plan with tracked milestones.`
                  : `High churn risk. Escalate internally, activate executive sponsors, and create a formal remediation plan now.`}
          </div>
        </div>
      </div>
    );

    // ── Email Templates ───────────────────────────────────────────────────────
    if (tab === T.TEMPLATES) {
      if (tmplLoading) return (
        <div style={{ textAlign: "center", padding: "52px 0", color: MUTED, fontSize: 15 }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>✉</div>
          Generating templates for {form.company}…
        </div>
      );
      if (tmplError) return (
        <div style={{ padding: "14px 18px", background: "#fff3f0", borderRadius: 8, color: CRIT, fontSize: 14 }}>
          {tmplError}
          <button onClick={() => { setTmplError(""); loadTemplates(); }} style={{ marginLeft: 12, color: CRIT, fontWeight: 700, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
        </div>
      );
      if (!templates) return null;
      const tmpl = templates[selTmpl];
      return (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {templates.map((t, i) => (
              <button key={i} onClick={() => setSelTmpl(i)}
                style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${selTmpl === i ? AMBER : BORDER}`, background: selTmpl === i ? AMBER : CARD, color: selTmpl === i ? "#fff" : MUTED, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Crimson Text', Georgia, serif", transition: "all 0.2s" }}>
                {t.name}
              </button>
            ))}
          </div>
          {tmpl && <>
            <div style={{ background: BG, borderRadius: 10, padding: "13px 18px", marginBottom: 12, border: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: MUTED, marginBottom: 5 }}>Subject Line</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>{tmpl.subject}</div>
            </div>
            <div style={{ background: BG, borderRadius: 10, padding: "16px 20px", position: "relative", border: `1px solid ${BORDER}` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: MUTED, marginBottom: 10 }}>Body</div>
              <pre style={{ fontSize: 15, color: TEXT, whiteSpace: "pre-wrap", margin: 0, fontFamily: "'Crimson Text', Georgia, serif", lineHeight: 1.8 }}>{tmpl.body}</pre>
              <button onClick={() => copy(`Subject: ${tmpl.subject}\n\n${tmpl.body}`, `t${selTmpl}`)}
                style={{ position: "absolute", top: 14, right: 16, background: CARD, border: `1.5px solid ${BORDER}`, borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                {copied === `t${selTmpl}` ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </>}
        </div>
      );
    }

    // ── Priority Actions ──────────────────────────────────────────────────────
    if (tab === T.PRIORITY) return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: DANGER }}>This Quarter</span>
          <span style={{ flex: 1, height: 1, background: BORDER }} />
        </div>
        <h2 style={{ margin: "0 0 20px", fontSize: 22, color: TEXT, fontFamily: "'Crimson Text', Georgia, serif" }}>⚡ CSM Priority Actions</h2>
        {playbook.priority.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, background: BG, borderLeft: `3px solid ${DANGER}`, padding: "11px 16px", borderRadius: "0 8px 8px 0", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${DANGER}` }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: DANGER, marginTop: 3, flexShrink: 0 }}>0{i + 1}</span>
            <span style={{ fontSize: 15, color: TEXT, lineHeight: 1.75 }}>{line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "")}</span>
          </div>
        ))}
      </div>
    );

    // ── Section content ───────────────────────────────────────────────────────
    const sec = playbook.sections[tab];
    if (!sec) return null;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: AMBER }}>Section {tab + 1} of {playbook.sections.length}</span>
          <span style={{ flex: 1, height: 1, background: BORDER }} />
        </div>
        <h2 style={{ margin: "0 0 22px", fontSize: 22, color: TEXT, fontFamily: "'Crimson Text', Georgia, serif" }}>{ICONS[tab]} {sec.title}</h2>
        {sec.content.map((line, i) => {
          const isBullet = /^[-•*]/.test(line);
          const cleaned = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "");
          return (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
              {isBullet && <span style={{ color: AMBER, fontWeight: 700, marginTop: 4, flexShrink: 0, fontSize: 16 }}>›</span>}
              <span style={{ fontSize: 15, color: TEXT, lineHeight: 1.8 }}>{cleaned}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{FONTS}</style>
      <div style={{ minHeight: "100vh", background: BG, position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ background: CARD, borderBottom: `2px solid ${AMBER}`, padding: "18px 32px" }}>
          <div style={{ maxWidth: 940, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: AMBER, marginBottom: 3 }}>CS Playbooks</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT, fontFamily: "'Crimson Text', Georgia, serif" }}>Account Playbook Generator</h1>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#b8a898", letterSpacing: 1 }}>csplaybooks.com</div>
          </div>
        </div>

        <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 20px" }}>

          {/* Account summary bar */}
          <div style={{ ...card, padding: "16px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "'Crimson Text', Georgia, serif" }}>{form.company}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: MUTED, marginTop: 3 }}>
                {form.industry} · {form.tier}{form.arr ? ` · ${form.arr}` : ""} · Renewal: {form.renewalDate}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {health && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 13px", borderRadius: 20, background: health.color + "15", border: `1.5px solid ${health.color}44` }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: health.color }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: health.color }}>{health.status} ({health.total})</span>
                </div>
              )}
              <button onClick={() => download("txt")} style={{ ...btnSecondary, padding: "6px 13px", fontSize: 12 }}>⬇ TXT</button>
              <button onClick={() => download("pdf")} style={{ ...btnSecondary, padding: "6px 13px", fontSize: 12 }}>⬇ PDF</button>
              <button onClick={() => { setPlaybook(null); setTemplates(null); }} style={{ ...btnPrimary(false), padding: "7px 14px", fontSize: 13 }}>← New</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {allTabs.map((t, i) => {
              const isActive = tab === t.key;
              return (
                <button key={i}
                  onClick={() => t.key === T.TEMPLATES ? loadTemplates() : setTab(t.key)}
                  style={{
                    background: isActive ? t.color : CARD,
                    color: isActive ? "#fff" : t.color,
                    border: `1.5px solid ${isActive ? "transparent" : t.color + "66"}`,
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: 0.3,
                    transition: "all 0.2s"
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content card */}
          <div style={{ ...card, padding: "28px 32px", minHeight: 300 }}>
            {renderContent()}
          </div>

          {/* Prev / Next */}
          {typeof tab === "number" && tab < playbook.sections.length && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}
                style={{ ...btnSecondary, opacity: tab === 0 ? 0.4 : 1, cursor: tab === 0 ? "not-allowed" : "pointer" }}>
                ← Prev
              </button>
              <button onClick={() => setTab(t => t + 1)} style={btnSecondary}>
                Next →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
