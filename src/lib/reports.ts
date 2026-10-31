import { format } from 'date-fns'
import { Transaction } from '@/types'
import { convertAmount } from '@/lib/currency'


export function exportCSV(
  transactions: Transaction[],
  currency = 'TWD',
  periodName = 'all'
) {
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'
  const headers = [
    'Date',
    'Type',
    `Amount (${currency})`,
    `Converted (${secondaryCurrency})`,
    'Category',
    'Merchant',
    'Description',
    'Payment Method',
    'Tags',
    'Notes',
  ]

  const rows = transactions.map(tx => {
    const primaryAmount = tx.amount_minor / 100
    const converted = convertAmount(primaryAmount, currency, secondaryCurrency)

    return [
      tx.date,
      tx.type,
      primaryAmount.toFixed(currency === 'TWD' ? 0 : 2),
      converted.toFixed(2),
      tx.category?.name || '',
      tx.merchant || '',
      tx.description || '',
      tx.payment_method || '',
      tx.tags?.join('; ') || '',
      tx.notes || '',
    ]
  })

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const cleanPeriod = periodName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  link.download = `spendwise-expenses-${cleanPeriod}-${format(new Date(), 'yyyyMMdd')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportPrintablePDFReport(
  transactions: Transaction[],
  currency = 'TWD',
  incomeMinor = 0,
  expenseMinor = 0,
  periodTitle = 'Monthly Statement',
  budgetLimitMinor?: number
) {
  const secondaryCurrency = currency === 'TWD' ? 'INR' : 'TWD'
  const now = new Date()
  const netMinor = incomeMinor - expenseMinor
  const savingsRatePct = incomeMinor > 0 ? Math.max(0, (netMinor / incomeMinor) * 100).toFixed(1) : '0'

  // Calculate category aggregates for this period
  const categoryMap = new Map<string, { name: string; total: number; count: number }>()
  transactions.filter(t => t.type === 'expense').forEach(tx => {
    const catName = tx.category?.name || 'General & Other'
    const cur = categoryMap.get(catName) || { name: catName, total: 0, count: 0 }
    cur.total += tx.amount_minor
    cur.count += 1
    categoryMap.set(catName, cur)
  })
  const categorySummary = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)

  const rowsHtml = transactions
    .map((tx, idx) => {
      const amt = tx.amount_minor / 100
      const conv = convertAmount(amt, currency, secondaryCurrency)
      const isIncome = tx.type === 'income'
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11.5px; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 10px; white-space: nowrap; color: #475569;">${tx.date}</td>
          <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${tx.merchant || tx.description || 'Transaction'}</td>
          <td style="padding: 7px 10px;">
            <span style="background: #f1f5f9; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; color: #334155; font-weight: 500;">
              ${tx.category?.name || 'General'}
            </span>
          </td>
          <td style="padding: 7px 10px; text-transform: capitalize; color: #64748b;">${tx.payment_method?.replace(/_/g, ' ') || 'Cash'}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${isIncome ? '#059669' : '#e11d48'}; white-space: nowrap;">
            ${isIncome ? '+' : '-'}${currency === 'TWD' ? 'NT$' : '₹'} ${amt.toLocaleString()}
            <div style="font-size: 10px; color: #64748b; font-weight: 400;">≈ ${secondaryCurrency === 'INR' ? '₹' : 'NT$'} ${conv.toLocaleString()}</div>
          </td>
        </tr>
      `
    })
    .join('')

  const catRowsHtml = categorySummary
    .slice(0, 8)
    .map(c => {
      const amt = c.total / 100
      const pct = expenseMinor > 0 ? ((c.total / expenseMinor) * 100).toFixed(1) : '0'
      const conv = convertAmount(amt, currency, secondaryCurrency)
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 10px; font-weight: 600; color: #1e293b;">${c.name}</td>
          <td style="padding: 6px 10px; text-align: center; color: #64748b;">${c.count}</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 700; color: #0f172a;">
            ${currency === 'TWD' ? 'NT$' : '₹'} ${amt.toLocaleString()}
            <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">(≈ ${secondaryCurrency === 'INR' ? '₹' : 'NT$'} ${conv.toLocaleString()})</span>
          </td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 600; color: #6366f1;">${pct}%</td>
        </tr>
      `
    })
    .join('')

  const budgetInfoCard = budgetLimitMinor ? `
    <div class="stat-card">
      <div class="stat-label">Budget Allocated</div>
      <div class="stat-val" style="color: #6366f1;">${currency === 'TWD' ? 'NT$' : '₹'} ${(budgetLimitMinor / 100).toLocaleString()}</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
        ${((expenseMinor / budgetLimitMinor) * 100).toFixed(1)}% utilized
      </div>
    </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>SpendWise AI — ${periodTitle}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
          }
          .action-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px 18px;
            margin-bottom: 24px;
          }
          .btn {
            background: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 9px 18px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
            transition: all 0.2s;
          }
          .btn:hover { background: #4338ca; }
          .btn-secondary {
            background: #ffffff;
            color: #334155;
            border: 1px solid #cbd5e1;
            margin-left: 8px;
          }
          .btn-secondary:hover { background: #f1f5f9; }
          .header {
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 14px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .brand {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #1e1b4b;
          }
          .subtitle {
            font-size: 13px;
            color: #64748b;
            margin-top: 3px;
            font-weight: 500;
          }
          .badge {
            background: #eef2ff;
            color: #4338ca;
            font-size: 11px;
            padding: 5px 10px;
            border-radius: 6px;
            font-weight: 700;
            border: 1px solid #c7d2fe;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(${budgetLimitMinor ? '5' : '4'}, 1fr);
            gap: 10px;
            margin-bottom: 22px;
          }
          .stat-card {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            background: #f8fafc;
          }
          .stat-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .stat-val {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 3px;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th {
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            text-transform: uppercase;
            color: #475569;
            border-bottom: 2px solid #cbd5e1;
            background: #f1f5f9;
            font-weight: 700;
          }
          .section-title {
            font-weight: 800;
            font-size: 14px;
            color: #1e293b;
            margin-top: 20px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .footer {
            margin-top: 28px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            font-size: 10.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            .action-bar { display: none !important; }
            body { padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div class="action-bar">
          <div>
            <strong style="color: #0f172a; font-size: 14px;">📄 SpendWise AI Printable Statement Ready</strong>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">
              Click "Print or Save as PDF" below. In destination, choose "Save as PDF".
            </p>
          </div>
          <div>
            <button class="btn" onclick="window.print()">🖨️ Print or Save as PDF</button>
            <button class="btn btn-secondary" onclick="window.close()">Close</button>
          </div>
        </div>

        <div class="header">
          <div>
            <div class="brand">SpendWise AI Financial Statement</div>
            <div class="subtitle">${periodTitle} · Master Financial Ledger & Audit</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">🇹🇼 NT$ (TWD) & 🇮🇳 ₹ (INR) Synchronized</span>
            <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
              Generated: ${format(now, 'dd MMMM yyyy, HH:mm')}
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Expenses</div>
            <div class="stat-val" style="color: #e11d48;">${currency === 'TWD' ? 'NT$' : '₹'} ${(expenseMinor / 100).toLocaleString()}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ≈ ${secondaryCurrency === 'INR' ? '₹' : 'NT$'} ${convertAmount(expenseMinor / 100, currency, secondaryCurrency).toLocaleString()}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Income</div>
            <div class="stat-val" style="color: #059669;">${currency === 'TWD' ? 'NT$' : '₹'} ${(incomeMinor / 100).toLocaleString()}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ≈ ${secondaryCurrency === 'INR' ? '₹' : 'NT$'} ${convertAmount(incomeMinor / 100, currency, secondaryCurrency).toLocaleString()}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Net Balance</div>
            <div class="stat-val" style="color: ${netMinor >= 0 ? '#2563eb' : '#e11d48'};">
              ${currency === 'TWD' ? 'NT$' : '₹'} ${(netMinor / 100).toLocaleString()}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ${netMinor >= 0 ? 'Surplus' : 'Deficit'}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Savings Rate</div>
            <div class="stat-val" style="color: #059669;">${savingsRatePct}%</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              Of total earnings
            </div>
          </div>
          ${budgetInfoCard}
        </div>

        ${categorySummary.length > 0 ? `
          <div class="section-title">
            <span>Category Spending Breakdown</span>
            <span style="font-size: 11px; font-weight: normal; color: #64748b;">${categorySummary.length} Active Categories</span>
          </div>
          <table style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: center;">Transactions</th>
                <th style="text-align: right;">Total Spent</th>
                <th style="text-align: right;">Share (%)</th>
              </tr>
            </thead>
            <tbody>
              ${catRowsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">
          <span>Itemized Expense Ledger</span>
          <span style="font-size: 11px; font-weight: normal; color: #64748b;">${transactions.length} Total Records</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant / Description</th>
              <th>Category</th>
              <th>Payment Method</th>
              <th style="text-align: right;">Amount (${currency} & ${secondaryCurrency})</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions found for this period.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <span>SpendWise AI — Know your money. Own your future.</span>
          <span>Dual Currency Engine: New Taiwan Dollar (NT$) & Indian Rupee (₹)</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
    </html>
  `

  const printWindow = window.open('', '_blank', 'width=980,height=850')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  } else {
    // If popup was blocked, fallback to hidden iframe printing
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 2000)
      }, 500)
    }
  }
}

