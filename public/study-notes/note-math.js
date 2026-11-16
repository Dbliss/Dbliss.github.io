// Typesets each chapter's formula like a LaTeX paper: a displayed, numbered equation set by KaTeX,
// followed by a "where" list that says what every symbol means. Every note loads this file after
// vendor/katex/katex.min.js, and the runtime calls noteFormula(s.formula, s.where, chapterNumber).
//
//   formula: one LaTeX string, or an array of them for a short system of equations (numbered 3a, 3b, …)
//   where:   [[symbolTeX, 'plain description'], …]. Descriptions are HTML, and $…$ inside them is inline maths.
//
// It also loads the KaTeX fonts for the canvas and asks every scene to redraw once they are ready,
// so maths drawn with txt(…, { math: true }) matches the typeset header.
;(function () {
  const style = document.createElement('style')
  style.textContent = `
.eq { margin: 16px 0 0; padding: 14px 18px 14px; border: 1px solid var(--line, #e2e4ee); border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgba(27, 31, 69, .05); color: var(--ink, #111632); }
.eq-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 14px; }
.eq-row + .eq-row { margin-top: 6px; }
.eq-body { min-width: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
.eq-body .katex-display { margin: .3em 0; }
.eq-body .katex { font-size: 1.16em; }
.eq-no { font-family: KaTeX_Main, "Latin Modern Roman", "Times New Roman", serif; font-size: 1.02rem; color: var(--muted, #626980); }
.eq-where { display: grid; grid-template-columns: auto auto minmax(0, 1fr); column-gap: 10px; row-gap: 4px; align-items: baseline; margin: 12px 0 0; padding-top: 10px; border-top: 1px solid var(--line, #e2e4ee); font-family: KaTeX_Main, "Latin Modern Roman", "Times New Roman", serif; font-size: .98rem; line-height: 1.4; color: var(--muted, #626980); }
.eq-where-label { grid-column: 1; font-style: italic; }
.eq-where dt { grid-column: 2; margin: 0; color: var(--ink, #111632); text-align: right; white-space: nowrap; }
.eq-where dd { grid-column: 3; margin: 0; }
.eq-where .katex { font-size: 1.04em; }
.eq-err { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: .8rem; color: #c0392b; }
`
  document.head.append(style)

  const tex = (src, displayMode) => {
    if (!window.katex) return `<span class="eq-err">${src.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</span>`
    return window.katex.renderToString(src, { displayMode, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' })
  }
  const inline = (html) => html.replace(/\$([^$]+)\$/g, (_, m) => tex(m, false))

  window.noteFormula = function noteFormula (formula, where, number) {
    const lines = Array.isArray(formula) ? formula : [formula]
    const fig = document.createElement('figure')
    fig.className = 'eq chapter-formula'
    lines.forEach((line, n) => {
      const row = document.createElement('div')
      row.className = 'eq-row'
      const body = document.createElement('div')
      body.className = 'eq-body'
      body.innerHTML = tex(line, true)
      const no = document.createElement('span')
      no.className = 'eq-no'
      no.textContent = `(${number}${lines.length > 1 ? String.fromCharCode(97 + n) : ''})`
      row.append(body, no)
      fig.append(row)
    })
    if (where && where.length) {
      const dl = document.createElement('dl')
      dl.className = 'eq-where'
      const label = document.createElement('span')
      label.className = 'eq-where-label'
      label.textContent = 'where'
      dl.append(label)
      where.forEach(([sym, text]) => {
        const dt = document.createElement('dt')
        dt.innerHTML = tex(sym, false)
        const dd = document.createElement('dd')
        dd.innerHTML = inline(text)
        dl.append(dt, dd)
      })
      fig.append(dl)
    }
    return fig
  }

  if (document.fonts && document.fonts.load) {
    Promise.all(['16px KaTeX_Main', 'italic 16px KaTeX_Main', 'italic 16px KaTeX_Math'].map((f) => document.fonts.load(f)))
      .then(() => window.dispatchEvent(new Event('scene-assets')))
      .catch(() => {})
  }
})()
