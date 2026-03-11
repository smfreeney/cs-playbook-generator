import { useState } from "react";

const NAV = "#1e3a5f", ACCENT = "#2d6a9f";

const FIELDS = [
  { key: "company", label: "Company Name", placeholder: "e.g. Acme Corp", type: "text" },
  { key: "industry", label: "Industry / Vertical", placeholder: "e.g. Utilities, AR Automation, Fintech", type: "text" },
  { key: "tier", label: "Contract Tier", placeholder: "e.g. Enterprise, Mid-Market, SMB", type: "text" },
  { key: "arr", label: "ARR / Contract Value", placeholder: "e.g. $120,000", type: "text" },
  { key: "stage", label: "Account Stage", placeholder: "e.g. Onboarding, Adopted, At-Risk, Expansion, Renewal", type: "text" },
  { key: "renewalDate", label: "Renewal Date", placeholder: "e.g. Q3 2026 or 09/01/2026", type: "text" },
  { key: "stakeholders", label: "Key Stakeholders", placeholder: "e.g. VP Finance (champion), IT Director, CFO (exec sponsor)", type: "text" },
  { key: "goals", label: "Customer Goals & Success Criteria", placeholder: "e.g. Reduce DSO by 20%, automate invoice delivery, cut manual posting", type: "textarea" },
  { key: "painPoints", label: "Known Pain Points / Risks", placeholder: "e.g. Low portal adoption, integration delays, champion leaving", type: "textarea" },
  { key: "notes", label: "Additional Context (optional)", placeholder: "e.g. Came from competitor, price sensitive, exec relationship with CEO", type: "textarea" },
];

const REQUIRED = ["company","industry","tier","stage","renewalDate","stakeholders","goals"];
const ICONS = ["🚀","❤️","📊","🚨","📈","🎯","📋"];
const EMPTY_FORM = { company:"",industry:"",tier:"",arr:"",stage:"",renewalDate:"",stakeholders:"",goals:"",painPoints:"",notes:"" };

function buildPlaybookPrompt(f) {
  return `You are a senior CSM with deep expertise in payments, AR automation, and utility tech. Generate a practical, account-specific CS playbook. Be direct and actionable — no generic filler.

ACCOUNT:
Company: ${f.company} | Industry: ${f.industry} | Tier: ${f.tier} | ARR: ${f.arr}
Stage: ${f.stage} | Renewal: ${f.renewalDate}
Stakeholders: ${f.stakeholders}
Goals: ${f.goals}
Pain Points: ${f.painPoints}
${f.notes ? `Context: ${f.notes}` : ""}

Generate all 7 sections with 3-5 specific bullets each. Flag account-specific risks.

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
  const ctx = sections.slice(0,3).map(s => s.title+": "+s.content.slice(0,2).join(" ")).join(" | ");
  return `Generate 4 email templates for this CS account. Respond ONLY with valid JSON, no markdown, no preamble.

Account: ${f.company} | ${f.industry} | ${f.tier} | Stage: ${f.stage} | Renewal: ${f.renewalDate}
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
      const title = line.replace(/^##\s*/,"").trim();
      if (/CSM Priority/i.test(title)) { cur = null; inPriority = true; }
      else { cur = { title, content: [] }; inPriority = false; }
    } else if (inPriority && line.trim()) priority.push(line.trim());
    else if (cur && line.trim()) cur.content.push(line.trim());
  }
  if (cur) sections.push(cur);
  return { sections, priority };
}

function calcHealth(f) {
  let score = 0, bd = [];
  const sn = f.stage.toLowerCase();
  let ss = 14;
  if (sn.includes("adopt")||sn.includes("expan")) ss=28;
  else if (sn.includes("onboard")) ss=20;
  else if (sn.includes("renew")) ss=16;
  else if (sn.includes("risk")) ss=6;
  score += ss;
  bd.push({ label:"Account Stage", score:ss, max:28, note:f.stage });

  const rw = ["churn","cancel","unhappy","leaving","delayed","low adoption","no adoption","integration issue","escalat","dissatisf","not using","behind","churning"];
  const rt = (f.painPoints+" "+f.notes).toLowerCase();
  const hits = rw.filter(w=>rt.includes(w)).length;
  const rs = Math.max(0, 25-hits*6);
  score += rs;
  bd.push({ label:"Risk Signals", score:rs, max:25, note:hits===0?"No major flags detected":`${hits} risk signal(s) detected` });

  let rns = 12;
  const now = new Date();
  const qm = f.renewalDate.toLowerCase().match(/q([1-4])\s*(\d{4})?/);
  if (qm) {
    const q=parseInt(qm[1]), yr=qm[2]?parseInt(qm[2]):now.getFullYear();
    const rd = new Date(yr,[0,3,6,9][q-1],1);
    const d=(rd-now)/86400000;
    rns = d>180?20:d>90?15:d>60?10:d>30?5:2;
  } else {
    const pd=new Date(f.renewalDate);
    if(!isNaN(pd)){const d=(pd-now)/86400000; rns=d>180?20:d>90?15:d>60?10:d>30?5:2;}
  }
  score += rns;
  bd.push({ label:"Renewal Proximity", score:rns, max:20, note:f.renewalDate });

  const st=f.stakeholders.toLowerCase();
  const hasChamp = st.includes("champion")||st.includes("advocate")||st.includes("sponsor");
  const hasExec = /cfo|ceo|cto|vp |director|president|exec/i.test(st);
  const cnt = f.stakeholders.split(",").filter(s=>s.trim()).length;
  const ss2 = (hasChamp&&hasExec)?15:(hasExec&&cnt>=2)?11:cnt>=2?7:4;
  score += ss2;
  bd.push({ label:"Stakeholder Coverage", score:ss2, max:15, note:hasChamp?"Champion identified":hasExec?"Exec contact present":"Expand stakeholder map" });

  const gs = f.goals.length>100?12:f.goals.length>60?8:f.goals.length>20?5:2;
  score += gs;
  bd.push({ label:"Goals Clarity", score:gs, max:12, note:f.goals.length>100?"Well-defined criteria":"Add more specificity" });

  const total = Math.min(100, score);
  const status = total>=75?"Healthy":total>=55?"Needs Attention":total>=35?"At Risk":"Critical";
  const color = total>=75?"#27ae60":total>=55?"#e6a817":total>=35?"#e67e22":"#c0392b";
  return { total, status, color, breakdown:bd };
}

async function callClaude(prompt) {
  const res = await fetch('/api/generate', {
    method:'POST', headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{role:"user",content:prompt}] })
  });
  const data = await res.json();
  return data.content?.map(b=>b.text||"").join("")||"";
}

function buildExportText(f, pb, health) {
  let out = `CS ACCOUNT PLAYBOOK — ${f.company}\n${"=".repeat(52)}\n`;
  out += `Industry: ${f.industry} | Tier: ${f.tier} | ARR: ${f.arr}\nStage: ${f.stage} | Renewal: ${f.renewalDate}\nStakeholders: ${f.stakeholders}\n\n`;
  out += `HEALTH SCORE: ${health.total}/100 — ${health.status}\n${"=".repeat(52)}\n\n`;
  pb.sections.forEach(s => { out += `${s.title}\n${"-".repeat(42)}\n${s.content.join("\n")}\n\n`; });
  if (pb.priority.length) out += `CSM PRIORITY ACTIONS\n${"-".repeat(42)}\n${pb.priority.join("\n")}\n`;
  return out;
}

function downloadBlob(content, filename, type="text/plain") {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

const T = { PRIORITY:"priority", HEALTH:"health", TEMPLATES:"templates" };

export default function App() {
  const [form, setForm] = useState({...EMPTY_FORM});
  const [playbook, setPlaybook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [templates, setTemplates] = useState(null);
  const [tmplLoading, setTmplLoading] = useState(false);
  const [tmplError, setTmplError] = useState("");
  const [selTmpl, setSelTmpl] = useState(0);
  const [copied, setCopied] = useState("");

  const canGen = REQUIRED.every(k=>form[k].trim());
  const hasAnyValue = Object.values(form).some(v=>v.trim());
  const health = playbook ? calcHealth(form) : null;

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const clearForm = () => setForm({...EMPTY_FORM});

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
    if (templates||tmplLoading) return;
    setTmplLoading(true); setTmplError("");
    try {
      const text = await callClaude(buildTemplatesPrompt(form, playbook.sections));
      const clean = text.replace(/```json|```/g,"").trim();
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      if (jsonStart===-1||jsonEnd===-1) throw new Error("No JSON found");
      const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd+1));
      if (!parsed.templates||!Array.isArray(parsed.templates)) throw new Error("Unexpected structure");
      setTemplates(parsed.templates);
    } catch { setTmplError("Failed to generate templates. Please try again."); }
    setTmplLoading(false);
  };

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2000); };
  const download = (fmt) => {
    const txt = buildExportText(form, playbook, health);
    if (fmt==="txt") { downloadBlob(txt, `${form.company.replace(/\s+/g,"-")}-playbook.txt`); return; }
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>${form.company} Playbook</title><style>body{font-family:sans-serif;padding:32px;max-width:800px;margin:0 auto;color:#1a2332}pre{white-space:pre-wrap;line-height:1.7;font-family:inherit;font-size:14px}</style></head><body><pre>${txt}</pre></body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  };

  // ── Form view ──
  if (!playbook) return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",minHeight:"100vh",background:"#f0f4f8"}}>
      <div style={{background:`linear-gradient(135deg,${NAV},${ACCENT})`,color:"#fff",padding:"28px 32px 24px"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:0.65,marginBottom:6}}>Customer Success</div>
          <h1 style={{margin:0,fontSize:26,fontWeight:700}}>Account Playbook Generator</h1>
          <p style={{margin:"8px 0 0",opacity:0.8,fontSize:13}}>Fill in account details to get a tailored playbook with health scoring and email templates.</p>
        </div>
      </div>
      <div style={{maxWidth:860,margin:"0 auto",padding:"28px 20px"}}>
        <div style={{background:"#fff",borderRadius:12,padding:"28px 32px",boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 24px"}}>
            {FIELDS.map(f=>(
              <div key={f.key} style={{gridColumn:f.type==="textarea"?"1 / -1":"auto"}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:"#4a6380",textTransform:"uppercase",letterSpacing:0.8,marginBottom:5}}>
                  {f.label}{REQUIRED.includes(f.key)&&<span style={{color:"#e05c2a"}}> *</span>}
                </label>
                {f.type==="textarea"
                  ? <textarea value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} rows={3}
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #d0dce8",fontSize:13,resize:"vertical",boxSizing:"border-box",color:"#1a2332",outline:"none",fontFamily:"inherit"}} />
                  : <input value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
                      style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #d0dce8",fontSize:13,boxSizing:"border-box",color:"#1a2332",outline:"none",fontFamily:"inherit"}} />}
              </div>
            ))}
          </div>
          {error&&<div style={{marginTop:16,padding:"11px 16px",background:"#fff3f0",border:"1px solid #f5c6bb",borderRadius:8,color:"#c0392b",fontSize:13}}>{error}</div>}
          <div style={{marginTop:22,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12}}>
            {!canGen&&<span style={{fontSize:12,color:"#9aacbc"}}>* Complete required fields</span>}
            {hasAnyValue&&(
              <button onClick={clearForm}
                style={{background:"#fff",border:"1.5px solid #d0dce8",borderRadius:8,padding:"12px 20px",fontSize:14,fontWeight:600,cursor:"pointer",color:"#6b829e"}}>
                Clear Fields
              </button>
            )}
            <button onClick={generate} disabled={!canGen||loading}
              style={{background:canGen&&!loading?`linear-gradient(135deg,${NAV},${ACCENT})`:"#aabdd4",color:"#fff",border:"none",borderRadius:8,padding:"12px 30px",fontSize:14,fontWeight:600,cursor:canGen&&!loading?"pointer":"not-allowed",letterSpacing:0.2}}>
              {loading?"Generating Playbook…":"Generate Playbook →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Playbook view ──
  const allTabs = [
    ...playbook.sections.map((s,i)=>({ key:i, label:`${ICONS[i]} ${s.title.replace(/^\d+\.\s*/,"")}`, color:NAV })),
    { key:T.PRIORITY, label:"⚡ Priority", color:"#e05c2a" },
    { key:T.HEALTH, label:"💚 Health Score", color:"#27ae60" },
    { key:T.TEMPLATES, label:"✉️ Templates", color:"#7b52c4" },
  ];

  const renderContent = () => {
    if (tab===T.HEALTH) return (
      <div>
        <div style={{display:"flex",gap:28,marginBottom:24,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{width:108,height:108,borderRadius:"50%",background:`conic-gradient(${health.color} ${health.total*3.6}deg,#e8eef4 0deg)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
              <div style={{width:80,height:80,borderRadius:"50%",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:24,fontWeight:800,color:health.color,lineHeight:1}}>{health.total}</div>
                <div style={{fontSize:10,color:"#9aacbc",marginTop:2}}>/ 100</div>
              </div>
            </div>
            <div style={{marginTop:10,fontSize:14,fontWeight:700,color:health.color}}>{health.status}</div>
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:15,fontWeight:700,color:"#1e3a5f",marginBottom:3}}>{form.company} — Account Health</div>
            <div style={{fontSize:12,color:"#6b829e",marginBottom:14}}>Scored on stage, risk signals, renewal timing, stakeholders, and goal definition.</div>
            {health.breakdown.map((b,i)=>(
              <div key={i} style={{marginBottom:11}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                  <span style={{fontWeight:600,color:"#2a3d52"}}>{b.label}</span>
                  <span style={{color:"#8a9bb0"}}>{b.score}/{b.max} · <em>{b.note}</em></span>
                </div>
                <div style={{height:7,background:"#e8eef4",borderRadius:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(b.score/b.max)*100}%`,background:b.score/b.max>=0.75?"#27ae60":b.score/b.max>=0.5?"#e6a817":"#e05c2a",borderRadius:4}} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#f7fafc",borderRadius:10,padding:"14px 18px",borderLeft:`4px solid ${health.color}`}}>
          <div style={{fontSize:12,fontWeight:700,color:"#2a3d52",textTransform:"uppercase",letterSpacing:0.8,marginBottom:5}}>Recommendation</div>
          <div style={{fontSize:13,color:"#4a6380",lineHeight:1.7}}>
            {health.total>=75?`${form.company} is in strong shape. Focus on expansion opportunities and documenting ROI ahead of renewal.`
             :health.total>=55?`Some risk signals present. Prioritize stakeholder engagement and define clear success milestones in the next 30 days.`
             :health.total>=35?`This account needs immediate attention. Schedule an exec sync, identify root causes, and build a recovery plan with tracked milestones.`
             :`High churn risk. Escalate internally, activate executive sponsors, and create a formal remediation plan now.`}
          </div>
        </div>
      </div>
    );

    if (tab===T.TEMPLATES) {
      if (tmplLoading) return <div style={{textAlign:"center",padding:"48px 0",color:"#6b829e",fontSize:14}}>Generating templates for {form.company}…</div>;
      if (tmplError) return <div style={{padding:"14px 18px",background:"#fff3f0",borderRadius:8,color:"#c0392b",fontSize:13}}>{tmplError} <button onClick={()=>{setTmplError("");loadTemplates();}} style={{marginLeft:10,color:"#c0392b",fontWeight:600,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Retry</button></div>;
      if (!templates) return null;
      const tmpl = templates[selTmpl];
      return (
        <div>
          <div style={{display:"flex",gap:7,marginBottom:18,flexWrap:"wrap"}}>
            {templates.map((t,i)=>(
              <button key={i} onClick={()=>setSelTmpl(i)}
                style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${selTmpl===i?"#7b52c4":"#d0dce8"}`,background:selTmpl===i?"#7b52c4":"#fff",color:selTmpl===i?"#fff":"#4a6380",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {t.name}
              </button>
            ))}
          </div>
          {tmpl&&<>
            <div style={{background:"#f7fafc",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#9aacbc",marginBottom:4}}>Subject Line</div>
              <div style={{fontSize:14,fontWeight:600,color:"#1a2332"}}>{tmpl.subject}</div>
            </div>
            <div style={{background:"#f7fafc",borderRadius:10,padding:"14px 18px",position:"relative"}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1,color:"#9aacbc",marginBottom:8}}>Body</div>
              <pre style={{fontSize:13,color:"#2a3d52",whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit",lineHeight:1.75}}>{tmpl.body}</pre>
              <button onClick={()=>copy(`Subject: ${tmpl.subject}\n\n${tmpl.body}`,`t${selTmpl}`)}
                style={{position:"absolute",top:12,right:14,background:"#fff",border:"1.5px solid #d0dce8",borderRadius:6,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#4a6380"}}>
                {copied===`t${selTmpl}`?"✓ Copied":"Copy"}
              </button>
            </div>
          </>}
        </div>
      );
    }

    if (tab===T.PRIORITY) return (
      <div>
        <h2 style={{margin:"0 0 18px",fontSize:18,color:"#e05c2a"}}>⚡ CSM Priority Actions This Quarter</h2>
        {playbook.priority.map((line,i)=>(
          <div key={i} style={{display:"flex",gap:10,marginBottom:11,background:"#fff8f5",borderLeft:"3px solid #e05c2a",padding:"10px 14px",borderRadius:"0 8px 8px 0"}}>
            <span style={{fontSize:14,color:"#2a3d52",lineHeight:1.7}}>{line.replace(/^[-•*]\s*/,"").replace(/\*\*/g,"")}</span>
          </div>
        ))}
      </div>
    );

    const sec = playbook.sections[tab];
    if (!sec) return null;
    return (
      <div>
        <h2 style={{margin:"0 0 18px",fontSize:18,color:NAV}}>{ICONS[tab]} {sec.title}</h2>
        {sec.content.map((line,i)=>{
          const isBullet=/^[-•*]/.test(line);
          const cleaned=line.replace(/^[-•*]\s*/,"").replace(/\*\*/g,"");
          return (
            <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
              {isBullet&&<span style={{color:ACCENT,fontWeight:700,marginTop:2,flexShrink:0}}>›</span>}
              <span style={{fontSize:14,color:"#2a3d52",lineHeight:1.75}}>{cleaned}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{fontFamily:"'Segoe UI',sans-serif",minHeight:"100vh",background:"#f0f4f8"}}>
      <div style={{background:`linear-gradient(135deg,${NAV},${ACCENT})`,color:"#fff",padding:"22px 32px 20px"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:0.65,marginBottom:4}}>Customer Success</div>
          <h1 style={{margin:0,fontSize:24,fontWeight:700}}>Account Playbook Generator</h1>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"22px 20px"}}>
        <div style={{background:"#fff",borderRadius:12,padding:"14px 22px",marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:17,fontWeight:700}}>{form.company}</div>
            <div style={{fontSize:12,color:"#6b829e",marginTop:2}}>{form.industry} · {form.tier}{form.arr?` · ${form.arr}`:""} · Renewal: {form.renewalDate}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {health&&(
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:health.color+"18",border:`1.5px solid ${health.color}55`}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:health.color}} />
                <span style={{fontSize:12,fontWeight:700,color:health.color}}>{health.status} ({health.total})</span>
              </div>
            )}
            <button onClick={()=>download("txt")} style={{background:"#f0f4f8",border:"1.5px solid #d0dce8",borderRadius:8,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",color:NAV}}>⬇ TXT</button>
            <button onClick={()=>download("pdf")} style={{background:"#f0f4f8",border:"1.5px solid #d0dce8",borderRadius:8,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",color:NAV}}>⬇ PDF</button>
            <button onClick={()=>{ setPlaybook(null); setTemplates(null); }} style={{background:`linear-gradient(135deg,${NAV},${ACCENT})`,border:"none",borderRadius:8,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#fff"}}>← New</button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
          {allTabs.map((t,i)=>{
            const isActive = tab===t.key;
            return (
              <button key={i} onClick={()=>t.key===T.TEMPLATES?loadTemplates():setTab(t.key)}
                style={{background:isActive?t.color:"#fff",color:isActive?"#fff":t.color,border:`1.5px solid ${isActive?"transparent":t.color+"80"}`,borderRadius:20,padding:"6px 13px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",letterSpacing:0.2}}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{background:"#fff",borderRadius:12,padding:"24px 28px",boxShadow:"0 2px 8px rgba(0,0,0,0.06)",minHeight:290}}>
          {renderContent()}
        </div>
        {typeof tab==="number"&&tab<playbook.sections.length&&(
          <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
            <button onClick={()=>setTab(t=>Math.max(0,t-1))} disabled={tab===0}
              style={{background:"#fff",border:"1.5px solid #d0dce8",borderRadius:8,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:tab===0?"not-allowed":"pointer",color:"#4a6380",opacity:tab===0?0.4:1}}>
              ← Prev
            </button>
            <button onClick={()=>setTab(t=>t+1)}
              style={{background:"#fff",border:"1.5px solid #d0dce8",borderRadius:8,padding:"7px 18px",fontSize:13,fontWeight:600,cursor:"pointer",color:"#4a6380"}}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
