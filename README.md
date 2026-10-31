# SpendWise AI 🇹🇼 🇮🇳

**Know your money. Own your future.**

SpendWise AI is an ultra-premium, AI-powered personal finance management and cross-border expense tracker tailored for living, working, and studying in Taiwan with seamless remittance conversion to Indian Rupees (INR).

---

## 🌟 Key Features

- **🇹🇼 🇮🇳 Real-Time Dual-Currency Peg**:
  - Live conversions between **New Taiwan Dollar (NT$)** and **Indian Rupee (₹)**.
  - Interactive top bar conversion rates with instant calculator.
- **🕒 Real-Time Taiwan Time Synchronization**:
  - Live ticking Asia/Taipei (UTC+8) digital clock.
  - Contextual time-of-day greetings addressed to Master.
- **📅 Month-Wise Tracking & Analytics**:
  - **Month-Wise Dashboard**: Recalculates stats, spending charts, and category breakdowns for any selected month.
  - **Month-Wise Budgets**: Prev/Next month navigation, spending buffer alerts, and itemized monthly expense ledger.
  - **Month-Wise Transactions**: Quick month filter pills with instant record counts and expense summaries.
- **📄 Printable PDF & Spreadsheet CSV Exports**:
  - **A4 Printable PDF Financial Statements**: Complete with Master credentials, KPI summaries, category share analysis, and itemized ledger.
  - **Excel-Compatible CSV**: UTF-8 BOM encoding with dual-currency breakdown.
- **🎯 1-Click Transaction Management**:
  - Permanent, instant Edit & Delete actions on every transaction item.
  - 1-click in-modal delete button and instant undo safety banner.
- **🧾 Taiwan Uniform Invoice Lottery Checker (統一發票)**:
  - Official Taiwan prize tier validation (Special NT$ 10M, Grand NT$ 2M, First Prize NT$ 200K, and Sixth Prize NT$ 200).
- **🤖 SpendWise AI Financial Coach**:
  - Real-time advice powered by Groq LLMs tailored to Taiwan living hacks and remittance optimization.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS, Radix UI, Framer Motion
- **Icons & Visuals**: Lucide React, Recharts (High-contrast customized tooltips)
- **Backend & Database**: Supabase with resilient LocalStorage fallback
- **Date & Utilities**: date-fns, clsx, tailwind-merge

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/guru22cseb37/SPENDWISE.git
cd SPENDWISE
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Fill in your Groq API key and Supabase credentials:
```env
VITE_GROQ_API_KEY=your_groq_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the development server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

---

## 📄 License
MIT License. Built with ❤️ for Taiwan-India cross-border living.
