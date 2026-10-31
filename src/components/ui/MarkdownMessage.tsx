import React from 'react'
import { Sparkles, ArrowRight, Lightbulb, CheckCircle2, TrendingDown } from 'lucide-react'

interface MarkdownMessageProps {
  content: string
}

interface TableData {
  headers: string[]
  rows: string[][]
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'table' | 'hr' | 'callout' | 'blockquote' | 'p'
  content: string
  number?: string
  icon?: string
  tableData?: TableData
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const blocks = parseMarkdownBlocks(content)

  return (
    <div className="space-y-3.5 text-sm leading-relaxed text-foreground/95 select-text">
      {blocks.map((block, idx) => {
        if (block.type === 'hr') {
          return (
            <div key={idx} className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-mono text-[10px]">§</span>
              </div>
            </div>
          )
        }

        if (block.type === 'h1') {
          return (
            <h2
              key={idx}
              className="text-lg sm:text-xl font-black text-primary mt-4 mb-2 flex items-center gap-2 pb-1.5 border-b border-primary/20 tracking-tight"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-primary animate-pulse" />
              <span>{formatInline(block.content)}</span>
            </h2>
          )
        }

        if (block.type === 'h2') {
          return (
            <h3
              key={idx}
              className="text-base sm:text-lg font-bold text-foreground mt-4 mb-2 flex items-center gap-2.5 pb-1 border-b border-border/60"
            >
              {block.icon && <span className="text-lg shrink-0">{block.icon}</span>}
              <span className="text-foreground">{formatInline(block.content)}</span>
            </h3>
          )
        }

        if (block.type === 'h3') {
          return (
            <h4
              key={idx}
              className="text-sm sm:text-base font-semibold text-primary mt-3 mb-1.5 flex items-center gap-2"
            >
              {block.icon && <span className="text-base shrink-0">{block.icon}</span>}
              <span>{formatInline(block.content)}</span>
            </h4>
          )
        }

        if (block.type === 'table') {
          const { headers, rows } = block.tableData!
          return (
            <div
              key={idx}
              className="my-3 overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-sm"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-accent/70 text-foreground font-bold">
                      {headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-3.5 py-2.5 whitespace-nowrap font-bold text-primary tracking-wide"
                        >
                          {formatInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={
                          rIdx % 2 === 0
                            ? 'bg-transparent hover:bg-accent/20 transition-colors'
                            : 'bg-accent/30 hover:bg-accent/50 transition-colors'
                        }
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-3.5 py-2.5 align-top text-foreground/90 leading-normal"
                          >
                            {formatInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 my-1.5">
              <span className="text-primary font-bold text-sm leading-none mt-1 shrink-0">✦</span>
              <div className="flex-1 text-sm leading-relaxed">{formatInline(block.content)}</div>
            </div>
          )
        }

        if (block.type === 'numbered') {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 my-1.5">
              <span className="text-primary font-bold text-[11px] bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full mt-0.5 shrink-0">
                {block.number}
              </span>
              <div className="flex-1 text-sm leading-relaxed">{formatInline(block.content)}</div>
            </div>
          )
        }

        if (block.type === 'callout') {
          return (
            <div
              key={idx}
              className="my-3 p-3.5 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-xs sm:text-sm font-medium text-foreground flex items-start gap-3 shadow-xs"
            >
              <div className="p-1 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="flex-1 leading-relaxed">{formatInline(block.content)}</div>
            </div>
          )
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-primary/70 bg-accent/30 pl-3.5 py-2 my-2 text-xs sm:text-sm italic rounded-r-xl text-muted-foreground"
            >
              {formatInline(block.content)}
            </blockquote>
          )
        }

        // Paragraph
        return (
          <p key={idx} className="text-sm leading-relaxed text-foreground">
            {formatInline(block.content)}
          </p>
        )
      })}
    </div>
  )
}

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    if (!trimmed) {
      i++
      continue
    }

    // Horizontal Rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr', content: '' })
      i++
      continue
    }

    // Table detection: line contains '|' and looks like markdown table
    if (trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.endsWith('|') || trimmed.split('|').length >= 3)) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        lines[i].trim().includes('|') &&
        (lines[i].trim().startsWith('|') || lines[i].trim().endsWith('|') || lines[i].trim().split('|').length >= 2)
      ) {
        tableLines.push(lines[i].trim())
        i++
      }

      const parsedTable = parseTable(tableLines)
      if (parsedTable) {
        blocks.push({ type: 'table', content: '', tableData: parsedTable })
        continue
      }
    }

    // Standard Markdown Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', content: trimmed.slice(2).trim() })
      i++
      continue
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', content: trimmed.slice(3).trim() })
      i++
      continue
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', content: trimmed.slice(4).trim() })
      i++
      continue
    }

    // Unicode Keycap or Emoji Section Headings (e.g. "2️⃣ How to Slash...", "1️⃣ ...", "3️⃣ ...")
    const emojiHeadingMatch = trimmed.match(/^([0-9]️⃣|[1-9][0-9]?️⃣|💡|🎯|🧾|🚆|🛒|🍱|💰|📊)\s+(.*)/)
    if (emojiHeadingMatch) {
      blocks.push({
        type: 'h2',
        icon: emojiHeadingMatch[1],
        content: emojiHeadingMatch[2],
      })
      i++
      continue
    }

    // Bold numbered headings like "**1. Strategy**" or "1. **Strategy**"
    const boldNumHeading = trimmed.match(/^(\d+)\.\s+\*\*(.+?)\*\*(.*)/)
    if (boldNumHeading) {
      blocks.push({
        type: 'h3',
        number: boldNumHeading[1],
        content: `${boldNumHeading[2]}${boldNumHeading[3]}`,
      })
      i++
      continue
    }

    // Callout lines: "Action:", "Tip:", "Important:", "Notice:", "Note:"
    if (/^(Action:|Tip:|Important:|Notice:|Note:|💡|⚠️|🎯 Immediate Action)/i.test(trimmed)) {
      blocks.push({ type: 'callout', content: trimmed })
      i++
      continue
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: trimmed.slice(2).trim() })
      i++
      continue
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      blocks.push({ type: 'bullet', content: trimmed.slice(2).trim() })
      i++
      continue
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      blocks.push({ type: 'numbered', content: numMatch[2], number: numMatch[1] })
      i++
      continue
    }

    // Regular paragraph
    blocks.push({ type: 'p', content: rawLine })
    i++
  }

  return blocks
}

function parseTable(lines: string[]): TableData | null {
  if (lines.length < 2) return null

  const splitRow = (rowStr: string) => {
    return rowStr
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim())
  }

  // Filter out any lines that are just a single pipe or empty
  const cleanLines = lines.filter(l => {
    const s = l.trim()
    return s.length > 1 && s !== '|'
  })

  if (cleanLines.length < 2) return null

  const headerLine = cleanLines[0]
  const separatorLine = cleanLines[1]

  // Verify separator line has dashes
  if (!separatorLine.includes('-')) return null

  const headers = splitRow(headerLine)
  const rows: string[][] = []

  for (let idx = 2; idx < cleanLines.length; idx++) {
    const row = splitRow(cleanLines[idx])
    if (row.length > 0 && row.some(c => c.length > 0)) {
      while (row.length < headers.length) row.push('')
      rows.push(row.slice(0, headers.length))
    }
  }

  return { headers, rows }
}

function formatInline(text: string): React.ReactNode {
  // Regex tokens: bold **text**, inline `code`, dual currency tags e.g. (≈ ₹...) or NT$...
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\(≈\s*[^)]+\)|NT\$\s*[\d,]+|₹\s*[\d,]+)/g
  const splits = text.split(tokenRegex)

  return splits.map((segment, i) => {
    if (!segment) return null

    // Bold text
    if (segment.startsWith('**') && segment.endsWith('**')) {
      const inner = segment.slice(2, -2)
      return (
        <strong key={i} className="font-bold text-foreground">
          {inner}
        </strong>
      )
    }

    // Inline Code
    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-accent font-mono text-xs text-primary font-semibold border border-border/50"
        >
          {segment.slice(1, -1)}
        </code>
      )
    }

    // Dual currency conversion parenthetical e.g. (≈ ₹80-₹130)
    if (segment.startsWith('(≈') && segment.endsWith(')')) {
      return (
        <span
          key={i}
          className="inline-block mx-1 px-1.5 py-0.2 rounded-md bg-sky-500/10 text-sky-400 font-semibold text-[11px] border border-sky-500/20"
        >
          {segment}
        </span>
      )
    }

    // Primary currency NT$ or ₹
    if (/^(NT\$\s*[\d,]+|₹\s*[\d,]+)/.test(segment)) {
      return (
        <span
          key={i}
          className="font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded"
        >
          {segment}
        </span>
      )
    }

    return segment
  })
}
