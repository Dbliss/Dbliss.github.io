// Adds the "keep reading" panel after the last chapter of a study note: a button back to the notes index
// and up to three notes to read next. Every note loads this file, and it reads notes.json,
// so the suggestions stay current as notes are added without editing any note.
//
// Suggestion order: the next part of the same series, then notes linked by `related` or a
// shared tag (the same links the index draws), then other notes in the same topic.
(function () {
  const INDEX = '../#/notes'
  const MAX = 3

  const file = decodeURIComponent(location.pathname.split('/').pop() || '')
  const slug = file.replace(/\.html?$/i, '')

  const style = document.createElement('style')
  style.textContent = `
.note-end { margin: clamp(72px, 14vh, 150px) 0 96px; padding-top: 28px; border-top: 1px solid var(--line, #e2e4ee); }
.note-end-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 18px; }
.note-end-label { font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent, #6858e8); }
.note-end-home { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 18px; border: 1px solid var(--ink, #111632); border-radius: 999px; color: var(--ink, #111632); font-weight: 650; font-size: .92rem; text-decoration: none; transition: background-color .18s ease, color .18s ease; }
.note-end-home:hover, .note-end-home:focus-visible { background: var(--ink, #111632); color: var(--bg, #fff); }
.note-end-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.note-end-next { display: flex; flex-direction: column; gap: 6px; height: 100%; padding: 16px 18px; border: 1px solid var(--line, #e2e4ee); border-left: 3px solid var(--accent, #6858e8); border-radius: 4px 12px 12px 4px; background: #fff; color: var(--ink, #111632); text-decoration: none; transition: border-color .18s ease, transform .18s ease; }
.note-end-next:hover, .note-end-next:focus-visible { border-color: var(--accent, #6858e8); transform: translateX(3px); }
.note-end-why { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .72rem; color: var(--muted, #626980); }
.note-end-title { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-weight: 650; font-size: 1.05rem; line-height: 1.3; letter-spacing: -.01em; }
.note-end-title span { color: var(--accent, #6858e8); transition: transform .18s ease; }
.note-end-next:hover .note-end-title span { transform: translateX(3px); }
.note-end-home:focus-visible, .note-end-next:focus-visible { outline: 2px solid var(--accent, #6858e8); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .note-end-home, .note-end-next, .note-end-title span { transition: none; } .note-end-next:hover { transform: none; } }
`
  document.head.appendChild(style)

  const nav = document.createElement('nav')
  nav.className = 'note-end'
  nav.setAttribute('aria-label', 'Keep reading')
  nav.innerHTML = `
    <div class="note-end-head">
      <span class="note-end-label">Keep reading</span>
      <a class="note-end-home" href="${INDEX}"><span aria-hidden="true">←</span> All notes</a>
    </div>`

  const anchor = document.querySelector('#story')
  if (anchor) anchor.after(nav)
  else (document.querySelector('.page') || document.body).appendChild(nav)

  const topTopic = (n) => String(n.topic || '').split('/')[0].trim()
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

  function pick (notes, me) {
    const out = []
    const add = (n, why) => {
      if (n && n.slug !== me.slug && out.length < MAX && !out.some((o) => o.note.slug === n.slug)) out.push({ note: n, why })
    }

    if (me.series) {
      const parts = notes.filter((n) => n.series === me.series).sort((a, b) => (a.part || 0) - (b.part || 0))
      const next = parts.find((n) => (n.part || 0) > (me.part || 0))
      if (next) add(next, `Next in ${me.series} · part ${next.part}`)
    }

    const myTags = new Set((me.tags || []).map((t) => t.toLowerCase()))
    notes.forEach((n) => {
      if (n.slug === me.slug || (me.series && n.series === me.series)) return
      const explicit = (me.related || []).includes(n.slug) || (n.related || []).includes(me.slug)
      const shared = (n.tags || []).find((t) => myTags.has(t.toLowerCase()))
      if (explicit) add(n, 'Related idea')
      else if (shared) add(n, `Also about ${shared}`)
    })

    notes.forEach((n) => { if (topTopic(n) && topTopic(n) === topTopic(me)) add(n, `More in ${topTopic(n)}`) })
    return out
  }

  fetch('notes.json', { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : []))
    .then((notes) => {
      if (!Array.isArray(notes)) return
      const me = notes.find((n) => n.slug === slug || n.file === file)
      if (!me) return
      const picks = pick(notes, me)
      if (!picks.length) return
      const list = document.createElement('ul')
      list.className = 'note-end-list'
      list.innerHTML = picks.map(({ note, why }) => `
        <li><a class="note-end-next" href="${esc(note.file || `${note.slug}.html`)}">
          <span class="note-end-why">${esc(why)}</span>
          <span class="note-end-title">${esc(note.title)}<span aria-hidden="true">→</span></span>
        </a></li>`).join('')
      nav.appendChild(list)
    })
    .catch(() => {})
})()
