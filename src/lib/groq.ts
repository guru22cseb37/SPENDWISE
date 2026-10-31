/**
 * Ultra-Fast Groq AI Service for SpendWise AI.
 * Specialized for Taiwan Living, TWD-INR dual-currency optimization,
 * spending summaries, and proactive savings strategies.
 */

export interface FinancialContext {
  period: string
  currency: string
  secondaryCurrency?: string
  exchangeRateText?: string
  current_month_income: string
  current_month_expenses: string
  current_month_net: string
  savings_rate: string
  previous_month_expenses: string
  transaction_count: number
  top_categories: Array<{ name: string; amount: string; percent: string }>
  recent_transactions?: Array<{ date: string; merchant: string; category: string; amount: string }>
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Preferred model list with fallback
const MODEL_PRIORITY = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
]

export function getGroqApiKey(): string {
  // Check localStorage first (in case user changed it in UI)
  const userKey = localStorage.getItem('spendwise_groq_api_key')
  if (userKey && userKey.trim().startsWith('gsk_')) {
    return userKey.trim()
  }

  // Vite environment variable
  const envKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (envKey && envKey.trim().startsWith('gsk_')) {
    return envKey.trim()
  }

  return ''
}

export function setCustomGroqApiKey(key: string): void {
  if (key) {
    localStorage.setItem('spendwise_groq_api_key', key.trim())
  } else {
    localStorage.removeItem('spendwise_groq_api_key')
  }
}

export const TAIWAN_FINANCIAL_SYSTEM_PROMPT = `You are "SpendWise AI Master", the world's most capable personal finance strategist and bilingual Taiwan living & cross-border wealth advisor.

CRITICAL FORMATTING RULES:
1. Use clear Markdown headings:
   ## 1. Core Financial Analysis
   ## 2. Practical Taiwan Savings Strategies (NT$ & ₹)
   ## 3. 🎯 Immediate Action Steps
2. When comparing options or hacks, use a concise, complete Markdown table:
| Strategy / Item | How It Works | Approx. Savings (NT$ & ₹) |
|---|---|---|
| PX Mart Yellow Stickers | 60-80% off meat/bread from 4-8 PM | NT$30-50 (≈ ₹80-₹130) per visit |
3. Always include dual-currency figures: e.g. **NT$ 1,200 (≈ ₹3,180 INR)**.
4. Keep table descriptions crisp and concise so the table stays neat.
5. In the "🎯 Immediate Action Steps" section, write 2-3 bullet points with clear, actionable advice.
6. NEVER stop midway or leave dangling headings or unfinished words. Always provide a full, complete answer.

CORE EXPERTISE:
1. 🇹🇼 LIVING AND SAVING MONEY IN TAIWAN (台灣實用省錢攻略):
   - Uniform Invoice Lottery (統一發票): Every receipt is a lottery ticket drawn on the 25th of odd months. Guide users to register a Taiwan Ministry of Finance e-invoice mobile barcode (手機條碼 / 載具) to automatically claim cloud-only bonus prizes (雲端發票專屬獎, an extra NT$500M pool).
   - Transportation: TPASS (基北北桃 / Central / Southern 1200 commuter pass) gives unlimited MRT, buses, Light Rail, and TRA regional trains for only NT$1,200/month (saves NT$1,500-NT$3,000/month for commuters). YouBike first 30-minutes free/subsidized.
   - Groceries: PX Mart (全聯福利中心) evening discount stickers (60-80% off yellow stickers around 4 PM / 8 PM on meat and bread); Carrefour discount corner; Traditional morning markets (傳統早市) for fresh produce at 1/3 supermarket prices.
   - Convenience Store Food Hacks: 7-Eleven "i-珍食" (65% off food near expiry after 8:00 PM) and FamilyMart "友善食光" (70% off food from 5:00 PM).
   - Dining: Affordable balanced meals via local cafeteria/buffet (自助餐) and Bento shops (便當) for NT$80-120; student cafeterias in universities.
   - Healthcare (健保 NHI): Always visit local community clinics (診所) with your NHI card for NT$150-200 copay (including medication) rather than big medical center hospitals (醫院) which charge NT$450-700+ without a referral.
   - Taxes & ARC: If residing in Taiwan for ≥ 183 days in a tax year, you become a tax resident: your tax rate drops from flat 18% to progressive 5%, with generous personal deductions and refunds every May!

2. 🇮🇳 ↔ 🇹🇼 TAIWAN-INDIA CROSS-BORDER & REMITTANCE OPTIMIZATION:
   - Exchange rate awareness: 1 TWD ≈ 2.65 INR. Convert spending into both currencies so the user intuitively feels the value.
   - Remittance strategy: Explain how to avoid costly bank telegraphic transfer fees (which charge NT$400-800 outbound fee + intermediary bank fees) by using verified remittance services (Index, Western Union, specialized NRI channels) and timing transfers when TWD is strong against INR.

3. 📊 ACTIONABLE SPENDING SUMMARIES & PROACTIVE BUDGETING:
   - Highlight anomalies, category distribution, savings rate, and concrete weekly targets.`

export async function callGroqAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  modelIndex = 0
): Promise<string> {
  const apiKey = getGroqApiKey()
  const model = MODEL_PRIORITY[modelIndex] || MODEL_PRIORITY[0]

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn(`Groq model ${model} failed:`, errorData)

      // Try next model if available
      if (modelIndex < MODEL_PRIORITY.length - 1) {
        return callGroqAPI(messages, modelIndex + 1)
      }

      throw new Error(
        errorData?.error?.message || `Groq API returned HTTP ${response.status}`
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No response text received from Groq.')
    }
    return content
  } catch (err: unknown) {
    if (modelIndex < MODEL_PRIORITY.length - 1) {
      return callGroqAPI(messages, modelIndex + 1)
    }
    throw err
  }
}

/**
 * Generate comprehensive spending summary and financial health report.
 */
export async function generateSpendingReport(
  context: FinancialContext,
  customPrompt?: string
): Promise<string> {
  const userContent = `Here is my current financial status for ${context.period}:
- Primary Currency: ${context.currency} (Converted dual: ${context.exchangeRateText || '1 TWD ≈ 2.65 INR'})
- Total Income: ${context.current_month_income}
- Total Expenses: ${context.current_month_expenses}
- Net Savings: ${context.current_month_net} (Savings Rate: ${context.savings_rate})
- Previous Month Expenses: ${context.previous_month_expenses}
- Total Transactions Logged: ${context.transaction_count}
- Top Expense Categories:
${context.top_categories.map(c => `  * ${c.name}: ${c.amount} (${c.percent})`).join('\n')}

${customPrompt || 'Please provide a comprehensive spending summary, analyze where my money is going, rate my financial health, and give me top actionable suggestions to save money in Taiwan and optimize my budget.'}`

  return callGroqAPI([
    { role: 'system', content: TAIWAN_FINANCIAL_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ])
}

/**
 * Taiwan living & savings specialized question.
 */
export async function askTaiwanSavingTips(
  question: string,
  context: FinancialContext
): Promise<string> {
  const userContent = `My Financial Context:
- Monthly Expenses: ${context.current_month_expenses} (${context.currency})
- Top Categories: ${context.top_categories.map(c => `${c.name} (${c.amount})`).join(', ')}

My Question:
${question}

Please answer with specific, practical Taiwan money-saving hacks and dual-currency comparisons (NT$ and ₹).`

  return callGroqAPI([
    { role: 'system', content: TAIWAN_FINANCIAL_SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ])
}
