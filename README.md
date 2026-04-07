# cs-playbook-generator
# CS Account Playbook Generator

An AI-powered tool that generates customized Customer Success playbooks for B2B accounts. Built for CSMs who need practical, account-specific strategies — not generic templates.

**Live Demo:** [cs-playbook-generator.vercel.app](https://cs-playbook-generator.vercel.app)

---

## What It Does

Drop in your account details (company, industry, ARR, renewal date, pain points, etc.) and get back:

- **7-section CS playbook** tailored to that specific account
- **Health score** with risk flags and renewal proximity alerts
- **4 ready-to-send email templates** (kickoff, QBR invite, renewal outreach, escalation)
- **Downloadable Word doc** with everything formatted and ready to drop into your CRM or share with your team

The whole thing runs in your browser. No signup, no data collection — just plug in account info and generate.

---

## Why I Built This

After 20 years in payments and B2B SaaS, I got tired of starting every new account from scratch. Most CS "playbooks" are either too generic to be useful or so company-specific they don't transfer when you switch jobs.

This tool pulls from frameworks I've used across utility tech, AR automation, and fintech — but it personalizes everything based on the account you're actually working. Onboarding strategy for a mid-market fintech company looks different than renewal tactics for an enterprise utility client, and the AI adjusts for that.

It's also a portfolio piece. I wanted something that showed I could build functional tools, not just talk about customer success in theory.

---

## Features

### Playbook Sections
1. **Onboarding & Kickoff** — First 90 days, stakeholder alignment, early wins
2. **Health Scoring & Risk Flags** — What to monitor, red flags specific to this account
3. **QBR / Executive Business Review** — Agenda structure, metrics to highlight, exec positioning
4. **Escalation & De-escalation** — When to escalate, how to pull back, containment strategies
5. **Renewal & Expansion** — Timing, upsell opportunities, renewal risk mitigation
6. **Success Metrics & KPIs** — What numbers matter for this customer's goals
7. **Project Status** — Active initiatives, blockers, next steps

Plus a **Priority Actions This Quarter** section that gives you the 3-5 things to focus on right now.

### Health Score Calculator
Scores accounts 0-100 based on:
- Account stage (onboarding vs. adopted vs. at-risk)
- Risk signals in pain points (churn language, adoption issues, integration delays)
- Renewal proximity (how close you are to the renewal date)

Breaks down the score by component so you can see exactly what's dragging it down.

### Email Templates
Four templates pre-written for the account:
- **Kickoff Email** — Intro, set expectations, schedule first call
- **QBR Invite & Agenda** — Get execs in the room, frame it around their goals
- **Renewal Outreach** — Start the conversation 90-120 days out
- **Escalation Acknowledgment** — Respond to issues without making it worse

Uses placeholders so you can personalize before sending, but gives you 80% of the work done.

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel serverless functions
- **AI:** Anthropic Claude API (Sonnet 4)
- **Export:** docx generation in-browser
- **Deployment:** Vercel

No database, no auth, no tracking. Entirely stateless.

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/smfreeney/cs-playbook-generator.git
   cd cs-playbook-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

### Deploy to Vercel

1. Push your repo to GitHub
2. Import the project in Vercel
3. Add your `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy

That's it. Vercel handles the serverless function routing automatically.

---

## Usage

1. Fill in the account form (company, industry, ARR, stage, renewal date, goals, pain points)
2. Hit **Generate Playbook**
3. Wait ~10-15 seconds while the AI builds everything
4. Review the playbook, health score, and email templates
5. Click **Download Word Doc** to save it

Required fields: company name, industry, tier, stage, renewal date, stakeholders, and goals. Everything else is optional but improves the output.

---

## How It Works

### Prompt Engineering
The tool sends account details to Claude with a structured prompt designed for CS practitioners. It asks for specific, actionable bullets — no fluff, no generic advice. The prompt includes domain context (payments, AR automation, utilities) so the AI generates strategies that actually make sense in B2B SaaS environments.

### Health Score Logic
- **Account Stage (0-28 pts):** Adoption/Expansion = 28, Onboarding = 20, Renewal = 16, At-Risk = 6
- **Risk Signals (0-25 pts):** Scans pain points for words like "churn," "delayed," "low adoption" — deducts 6 points per flag
- **Renewal Proximity (0-12 pts):** More points if renewal is 6+ months out, fewer if it's imminent
- **Engagement (0-20 pts):** Placeholder for future integration with CRM usage data
- **Stakeholder Health (0-15 pts):** Checks for champion/exec sponsor language

The breakdown shows which factors are hurting the score so you know where to focus.

### Email Generation
Second API call after the playbook is generated. Uses context from the first three playbook sections to write emails that reference the customer's goals and pain points. Keeps emails under 180 words because nobody reads long emails.

---

## Limitations & Known Issues

- **No data persistence** — refresh the page and you lose everything. It's intentional (privacy) but annoying if you accidentally close the tab.
- **Single account only** — can't bulk-generate playbooks for your entire book of business (yet).
- **No CRM integration** — you have to manually copy data in. Would love to add Salesforce/HubSpot connectors eventually.
- **Basic health score** — doesn't pull real usage data or engagement metrics. It's based purely on what you type in the form.

---

## Roadmap

Things I'd like to add if I keep working on this:

- **Save/load accounts** — probably localStorage for now, maybe a lightweight backend later
- **Multi-account view** — generate playbooks for your whole portfolio, compare health scores
- **CRM connectors** — auto-pull account data from Salesforce, HubSpot, etc.
- **Usage tracking in health score** — integrate with product analytics (Pendo, Amplitude) to score based on actual feature adoption
- **Template customization** — let users tweak the email templates or add their own sections to the playbook
- **Export to PDF** — some people prefer PDFs over Word docs

---

## Contributing

This is mostly a personal project, but if you want to fork it or suggest improvements, go for it. Open an issue or submit a pull request if you've got ideas.

---

## License

MIT License — use it however you want. If you build something cool with it, I'd love to hear about it.

---

## Contact

Built by Sonya Freeney  
[GitHub](https://github.com/smfreeney) | [LinkedIn](https://www.linkedin.com/in/sonya-freeney)

---

## Acknowledgments

This tool wouldn't exist without:
- The CS community on LinkedIn who kept asking for better playbook templates
- Anthropic's Claude API for making the AI part actually work
- Every customer I've ever worked with who taught me what good CS looks like
