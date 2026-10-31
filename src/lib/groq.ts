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

export const TAIWAN_FINANCIAL_SYSTEM_PROMPT = `You are "SpendWise AI", an intelligent, friendly, and practical personal finance advisor and Taiwan living strategist.

HOW TO RESPOND:
1. ANSWER WHAT WAS ASKED DIRECTLY & CONVERSATIONALLY:
   - If the user sends a greeting (e.g. "hey buddy", "hi", "hello", "how are you"), reply warmly and conversationally (e.g., "Hey there! Great to chat with you. How can I help you manage your expenses, explore Taiwan savings hacks, or plan your finances today?").
   - If the user asks a specific question (e.g., about TPASS, grocery discounts, EasyCard, lottery receipts, remittances to India, saving on rent, or specific bento spots), answer THAT specific question directly, concisely, and helpfully with practical advice.
   - ONLY produce a structured 3-part financial audit (with headings like Core Financial Analysis, Savings Strategies, Action Steps) if the user explicitly asks for a spending summary, full review, budget audit, or analysis of their expenses.
2. DUAL-CURRENCY CONVERSIONS: When discussing money amounts, provide intuitive dual-currency figures: e.g. **NT$ 1,200 (≈ ₹3,180 INR)**.
3. ADAPTIVE TO USER'S DATA: If the user has not recorded any transactions yet, do NOT invent fake transaction data. Instead, answer their question directly and encourage them to log their expenses.
4. TONE: Friendly, sharp, encouraging, and clear without unnecessary boilerplate.

CORE TAIWAN LIVING KNOWLEDGE:
- Uniform Invoice Lottery (統一發票): Receipts drawn on the 25th of odd months. Mobile barcode (手機條碼 / 載具) for automatic cloud prizes.
- Transportation: TPASS 1200 commuter pass (unlimited MRT, bus, regional TRA). YouBike first 30-min subsidies.
- Supermarkets & Food: PX Mart (全聯) evening yellow discount stickers (60-80% off after 4 PM & 8 PM). Traditional morning markets (早市) for cheap produce. 7-Eleven "i-珍食" (65% off after 8 PM) and FamilyMart "友善食光" (70% off after 5 PM).
- Healthcare (健保 NHI): Community clinics (診所) charge NT$150-200 copay with medication.
- Taiwan-India Remittance: 1 TWD ≈ 2.65 INR. Use direct remittance services to avoid high bank wire fees.`

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
