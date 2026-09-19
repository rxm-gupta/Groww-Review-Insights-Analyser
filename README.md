# 📈 Groww Pulse — Customer Voice & Product Health Intelligence

A high-signal, client-side intelligence dashboard that transforms raw public app reviews from the **Google Play Store** and **Apple App Store** into an executive-ready weekly pulse note (≤250 words).

Designed for **Product**, **Growth**, and **Leadership** teams to identify critical platform bottlenecks, customer friction, and actionable engineering priorities.

---

## 👥 Who This Helps

- **Product & Growth Teams:** Rapidly pinpoint where conversion breaks (KYC, payments, MTF, onboarding) and prioritize high-ROI sprint items.

- **Support & Operations Teams:** Surface recurring spikes in negative ticket sentiment before they overwhelm escalation desks.

- **Engineering & Infra Leadership:** Get real-time alerts on market-open execution latency, server timeouts, and candlestick lag.

---

## ✨ Key Features

- **🛡️ 100% Client-Side Privacy (Zero-PII Engine):**  
  Uses multi-pattern Regular Expressions to redact sensitive data (emails, Indian phone numbers, PAN card IDs, Aadhaar numbers) entirely within the user's browser before rendering or storage. No user data ever touches an external server.

- **🏷️ 5-Theme Canonical Taxonomy:**  
  Automatically groups raw feedback across 5 defined themes:
  1. *Market-Open Latency & Stability*
  2. *Withdrawal Latency & Settlement*
  3. *Pricing, MTF & Hidden Fees*
  4. *KYC & Account Setup*
  5. *Charting & Execution Tools*

- **📝 Executive 1-Page Summary (≤250 Words):**  
  Generates a high-signal brief featuring:
  - **Top 3 User Friction Themes** (ranked by negative volume share)
  - **3 Real Verbatim Quotes** (sanitized, star-rated, platform-attributed)
  - **3 Tactical Action Ideas** (P0 Infra, P1 FinOps, P2 Trading UX with team pod ownership)

- **📬 One-Click Email Distribution:**  
  Review and edit the generated summary in the built-in composer, then draft directly in **Gmail** or **Copy to Clipboard**.

---

## 📂 Project Structure

```text
groww-pulse-app/
│
├── index.html                  # Core markup, accessible UI, and Tailwind CDN configuration
├── README.md                   # System documentation, taxonomy, and operational playbook
├── groww_reviews_sample.csv    # Sample 8-12 week public review dataset for validation
│
├── css/
│   └── style.css               # Dark-mode theme tokens, custom scrollbars, glassmorphism cards
│
└── js/
    └── app.js                  # PII regex scrubbers, theme classifiers, CSV parser, DOM engine
```

## How to Run Weekly

1. Export the trailing 8–12 weeks of reviews from Google Playstore and App Store as a CSV.
2. Ensure columns include at minimum: platform, rating, title, text, date.
3. Drag and drop the CSV file into the upload zone (or click the sample test button).
4. Click Generate Weekly Note. The system will auto-scrub PII and classify themes client-side.
5. Download the PDF/Doc from the Customer Pulse header, or use Draft an Email / Copy Email below.


## Email Draft

![alt text](<Screenshot 2026-09-20 010603.png>)