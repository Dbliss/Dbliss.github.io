# Study notes: how to write one

This folder holds the study notes published at `dbliss.github.io/#/notes`. Each note is one self-contained HTML page that teaches a single topic as an animated, scroll-driven walk-through.

## Adding a note to this folder

1. Write the page as described below and save it here as `<slug>.html`. Use a short, lowercase, hyphenated slug, such as `obrien-fleming`.
2. Add an entry to the **start** of the array in `notes.json`, so the newest note is listed first:

   ```json
   {
     "slug": "obrien-fleming",
     "file": "obrien-fleming.html",
     "title": "O'Brien–Fleming boundaries",
     "summary": "One sentence saying what the reader will understand by the end.",
     "topic": "Statistics",
     "tags": ["clinical trials", "hypothesis testing"],
     "chapters": 7,
     "minutes": 6,
     "updated": "2026-11-16"
   }
   ```

   Optional: `"series": "Kalman filters"` and `"part": 2` group closely related notes, such as a method and its variants. The index shows a series as its own branch of the tree, in part order. Use a series when one note builds directly on another; otherwise leave both fields out.

   `topic` is where the note sits in the index tree. Separate levels with ` / `, broadest first, such as `"Statistics / State estimation"`. A plain `"Statistics"` puts the note directly under that topic. Reuse existing branches where one fits, and only add a sub-level once it will hold more than one note or series.

   Optional: `"related": ["kalman-filter"]` lists the slugs of notes in other branches that share an idea with this one. The index draws a link between them. Links are two-way, so list each pair once. Notes that share a tag are linked automatically, so `related` is only needed for connections the tags do not show.

   `minutes` is the time it takes to play every chapter through, rounded up. `updated` is today's date.
3. Do not change anything outside this folder. The site's Notes page reads `notes.json` and lists the new note automatically.

Notes are served at `/study-notes/<slug>.html`. The template's "Study notes" link points to `../#/notes` and leads back to the index. Keep it. Also keep the `<script src="note-end.js" defer></script>` line before `</body>`: it adds the end-of-note panel, with an "All notes" button and links to the next part of the series and to related notes, worked out from `notes.json`. Keep the KaTeX stylesheet, `vendor/katex/katex.min.js` and `note-math.js` lines after `<title>` as well: they typeset each chapter's formula (see "The chapter formula" below). To change how formulas look in every note, edit `note-math.js`, not the notes.

---

# Animated explainer prompt

To use this outside the folder workflow, fill in the three fields and paste everything from here down to the agent.

**TOPIC:** [the concept, algorithm, system or piece of code to explain]

**SOURCE MATERIAL:** [file paths, pasted code, links or notes. Write "none" to work from general knowledge.]

**READER:** [what they already know, for example "strong programmer, no statistics background"]

**CONTEXT:** [where you will use this, for example "testing and evaluating AI models". Write "none" if there is no particular use.]

---

## Your task

Build one self-contained HTML file, `<slug>.html`, that teaches TOPIC to READER as a scroll-triggered animated walk-through.

The page is a sequence of chapters. Each chapter pairs a large animated canvas with a short list of numbered steps. When a chapter scrolls into view its animation plays through the steps by itself, at reading pace, and the highlighted step always describes what the canvas is doing at that moment. Selecting a step replays from there.

The goal is understanding. A reader should finish able to explain the mechanism to someone else, and should be able to say what happens to one concrete example at every stage.

The file must open directly from disk with no build step, no server, no libraries and no external requests. Use the template at the end of this prompt. Its runtime and drawing helpers are finished, so your work is the content: the example, the chapters, the step text and the scene drawings.

## Step 1: understand it, then plan

1. Read all SOURCE MATERIAL before designing anything. Work out the actual mechanism: what goes in, what each stage does to it, and what comes out.
2. Choose **one worked example** small enough to draw and specific enough to care about: one request, one array, one transaction, one packet. It travels through every chapter.
3. List every concept the topic depends on, such as a statistic, a data structure or a piece of notation. For each one READER does not already know for certain, plan a **foundations chapter** that teaches it with the same worked example before the main idea uses it. When unsure, assume the reader does not know it. A reader who already knows it can skip a chapter, but a missing chapter cannot be made up for.
4. List the chapters as a chain, where the output of each is the input of the next. Use 5 to 12 chapters, and give each exactly one idea. Split a chapter if it needs two ideas. Cut anything the reader does not need in order to understand the next chapter.
5. For each chapter, decide on one picture (see the vocabulary below) and storyboard its steps: for each step, what moves on the canvas (from where, to where, and what changes when it lands) and the sentence that describes it. If a step's storyboard has no motion, the picture is missing something.
6. Find the **central mechanism**: the operation the topic exists to explain, such as how a hash is assembled, how a gradient flows back or how an estimate is corrected. Give it more chapters than feels necessary: one for the parts, one for the operation that combines them, one for building a result in full, and one for changing that result. A mechanism that fits in a single step is under-explained.
7. If CONTEXT is given, plan a final **application chapter** that carries the idea into CONTEXT with a worked example from there. Map each part of the original example onto its counterpart, such as "patients → conversations", and show the same method making a real decision.

**Accuracy rule.** The example's numbers can be invented, but the shapes must follow the real thing: the same stages, in the same order, with the same formulas and the same real identifiers. Never say that the figures are illustrative, invented or simplified: readers know a teaching example is not real data. If the source does not settle how something works, do not invent it. Leave it out, or say in the step text that it is a simplification.

## Teaching rules

- **Assume less than you think.** Write for a curious reader who is new to the field. Never use a term, symbol or threshold, such as Z, p, α, 1.96 or O(n log n), until a step has explained it in plain words. If a step needs to say what something means, it belongs in that step, not a later one.
- **Thread the example.** Introduce it in the first chapter, not in a page heading. Every chapter picks up what the previous one produced.
- **One in detail, then the rest quickly.** Show one item slowly with everything else dimmed, then let the remaining items follow fast in a single step ("The other nine players follow").
- **Never point forward.** Do not write "explained next" or "more on this later". If a step needs an idea, teach it in an earlier chapter, and reorder the chapters until that holds.
- **Explain jargon words, not just symbols.** Words that sound everyday but carry a special meaning here, such as "a look", "crosses", "spends" or "converges", need a plain, concrete meaning the first time they appear ("pauses to analyse the results so far", "ends up beyond 1.96").
- **Connect it to CONTEXT.** The reader is learning this for a reason. Name the counterparts in CONTEXT explicitly, and make the application chapter show what goes wrong without the idea as well as what it makes possible.
- **Picture before term.** Show the thing, then name it. Introduce a piece of jargon only once the reader is looking at what it refers to, and define it in that same sentence.
- **One new thing per step.** If a step needs an "and also", make it two steps.
- **Say what each number means.** A step such as "Z = 1.6" is not finished until it also says what 1.6 tells the reader ("the gap is 1.6 times the typical chance wobble, which chance produces fairly often").
- **Show the arithmetic once with real numbers.** Write out one complete calculation with the example's values, such as `84 × 0.35 + 71 × 0.25 + 78 × 0.40 = 77`. Do not leave the key step as an abstract formula.
- **Say why.** The most useful sentences give the reason a stage exists ("Single games are noisy", "Different roles have different jobs").
- **When the topic is code,** put the real code on the canvas with `codeBlock` and slide its highlight line by line, with the live variable values or data structure beside it. The reader should watch the state change as the line runs.

## Maximise animation: show the mechanism, not a summary of it

The canvas does the explaining and the text narrates it. Use as much animation as the reader can follow, and make every piece of it carry meaning.

- **Every step moves.** Each step changes the canvas in a way of its own: something arrives, flips, slides, grows, splits or lights up. A step whose picture matches the step before is wasted, and a step that only fades in a label means a picture is missing.
- **Show every contributor contributing.** When a result is built from many parts, such as pieces into a hash, terms into a sum, samples into an estimate or neurons into a layer, animate each part travelling from where it lives to where it lands, and update the result as it lands. Do the first one or two slowly, marking exactly what each one changes. Then let the rest follow quickly, but still visibly one by one, never as a single jump to the total.
- **Draw the representation the mechanism works on.** If the algorithm works on bits, draw the bits as cells and flip them. If it works on array slots, matrix entries or tree nodes, draw those. A finished number such as `0x3fa2` or a label such as "a ⊕ b = c" hides the mechanism. Show the value both ways: the working form, and the readable number underneath it.
- **Show updates as edits.** When the topic includes an incremental update, such as a move editing a hash, an insert rebalancing a tree or an observation updating a belief, give each part its own step: the state before, the part that leaves, the part that arrives, the state after. Then rebuild the result from scratch on the canvas and show that it matches.
- **Use several concrete instances where contrast teaches.** Two positions, two inputs or two orders. Show that one input reached by different routes gives the same output, and that a different input gives a different output. Prove a property, such as order not mattering, by running it on the canvas.
- **Animate the joins between panels.** When something on one side of the canvas feeds something on the other, draw it travelling with `flight`, a sliding strip or a morph, so the reader always sees where a value came from.
- **Build the parts before the whole.** When the topic depends on a table, an operation or an encoding, give it a foundations chapter that animates it on its own, such as a grid of random numbers filling in, or XOR sweeping across two rows of bits, before a later chapter puts it to work.
- **Loops add life on top of the steps.** Use `pulse`, `ripple` and `runner` on whatever is live, but the finished state must still be complete without them.

## Formulas: derive, motivate, then work through slowly

A formula must never just appear. Every formula the reader needs gets three things, each as its own steps, with the canvas showing exactly what each step says:

1. **Where it comes from.** Derive it from ideas already taught, one move per step: a picture or a simpler fact, then each algebraic step. If a full derivation is beyond READER, give the intuitive version and say what was skipped.
2. **Why it is needed.** What problem it solves, and what goes wrong without it.
3. **A slow worked example.** Substitute the example's numbers one at a time, one line per step, ending in the result. The graphic moves with each substitution: as a number goes in, the bell shifts, the bar grows or the point slides. Use `formulaSteps` on the canvas for the lines.

A chapter can hold one formula done this way. Split a chapter rather than rush a formula.

## Writing the steps

Each chapter has 2 to 6 steps, or more when one idea genuinely needs them. Never cut or rush content to make a chapter fit: when its steps do not fit beside the canvas, the runtime moves the canvas across and continues the steps on the other side. A step is 1 to 3 plain sentences, 45 words at most. Every sentence must describe something visible at that moment on the canvas. Each chapter also gets a header line that connects the picture to the real thing. Use `formula` for the stage's equation, and `code` for real identifiers from source code. A chapter can have both.

### The chapter formula: LaTeX, numbered, with a "where" list

The chapter header typesets `formula` like an equation in a LaTeX paper: KaTeX renders it as a centred display equation in Computer Modern, numbered by chapter on the right, as in (6) or (6a), and a "where" list under it says what every symbol means. Write it in LaTeX inside `String.raw` so that backslashes survive:

```js
{
  short: 'Transposition table',
  title: 'The chess engine’s transposition table',
  formula: [String.raw`\text{slot} = \text{key} \bmod N`, String.raw`\text{entry} = (\text{key},\ \text{score},\ \text{depth},\ \text{best move})`],
  where: [
    [String.raw`\text{key}`, String.raw`the position’s 64-bit Zobrist key`],
    [String.raw`N`, String.raw`the number of entries the table can hold`],
    [String.raw`\text{depth}`, String.raw`how many plies below the position were searched`]
  ],
  draw: sceneTT,
  beats: [ … ]
}
```

- **`formula`** is one LaTeX string, or an array of them for a short system of equations, numbered (6a), (6b) and so on. To line up several related lines under one number, use `\begin{aligned} … \end{aligned}` with `&` before the `=`.
- **`where`** lists `[symbolLaTeX, description]` pairs. Each description is a short lowercase phrase with units and the example's value where it helps, such as "the process noise: the variance of the motion’s own error, $3^{2} = 9$". Write `$…$` inside a description for inline maths. Descriptions are HTML, so escape `&` as `&amp;`. Every symbol in the formula gets an entry, unless an earlier chapter's "where" list already defined it with the same meaning. A later chapter can refer back by number: "the gain from (5a)".
- **Write real maths, not sentences in maths type.** A formula is an equation, an inequality or a definition: `\alpha \ge \beta \;\Longrightarrow\; \text{stop searching this node}`, not "stop searching a node once α ≥ β". Use `\dfrac` for fractions, `\sqrt{}`, `\operatorname{atan2}` or `\operatorname{fib}` for named functions, `\text{…}` for words, `\leftarrow` for an update, `\mathcal{N}(\mu, \sigma^{2})` for a bell curve, `\hat{z}` for an estimate and `\begin{cases}` for a rule with branches.
- Never put `${` or a backtick inside `String.raw`.

### Maths in step text

Step text is HTML. Write maths in it with small markup, never as code. Write `<i>Z</i><sub>3</sub>`, not `Z_3`, and use `×`, `−`, `÷`, `≤`, `≈` and `√` rather than `*`, `-`, `/`, `<=` and `sqrt`:

| Markup | Use |
| --- | --- |
| `<i>x</i>` | a variable, set in italic maths type |
| `<sub>k</sub>`, `<sup>2</sup>` | subscripts and superscripts |
| `<span class="frac"><span>top</span><span>bottom</span></span>` | a stacked fraction |
| `√<span class="sqrt">…</span>` | a square root, with its bar over the contents |

Escape `<`, `>` and `&` in text as `&lt;`, `&gt;` and `&amp;`. On the canvas, draw symbolic expressions with `txt(s, x, y, { math: true })`. It sets single letters in italic and numbers, operators and words of three or more letters upright, and `_` and `^` make the next character, or a `{group}`, a subscript or superscript: `txt('φ = atan2(a_y, a_z)', x, y, { math: true })`. Never leave a raw `_` or `^` in visible text.

If a scene needs an asset that loads later, such as an image or a 3D model, draw a simple fallback until it is ready, then call `window.dispatchEvent(new Event('scene-assets'))` so every chapter redraws.

| Good | Bad |
| --- | --- |
| Then the game is played. The surprise is the gap between the prediction and the result: an upset is a big surprise, and a confident, correct call barely registers. | The innovation term is computed and propagated through the state update. |
| The bold shape is a running average, so it follows form rather than flukes. | Next, we apply exponential smoothing to reduce variance in the time series data. |
| Their outputs simply add up to one score. | Crucially, the ensemble seamlessly aggregates predictions to deliver a robust final output. |

Generate every number in step text from the example data with template literals, so that the text and the drawing cannot disagree.

## How scenes work

Each scene is a function `draw(p)`, and it must be a **pure function of `p`**.

- `p` is measured in steps. `p = 2.5` is halfway through the third step, and at the end of a chapter `p` equals the number of steps. Keep no state between frames and never call `Math.random` while drawing. Precompute the example with the seeded `rng`.
- Animate with `seg`. `seg(p, 1.2, 1.6)` runs 0 to 1 across that window. Pass it through `ease`, `easeOut` or `backOut`. Finish each step's motion by about 0.85 through the step, so the finished state can be read before the next step begins.
- Move between compositions with `group(alpha, fn)`, for example `group(1 - ease(seg(p, 2, 2.3)), drawOld)`. Prefer morphing to cutting: let a shape move, shrink or grow into its role in the next composition, using `lerp` on position and size.
- The looping layer is decoration that sits on the state `p` has set up: `runner`, `ripple`, `pulse`, `bob`, `cycle`. These do nothing when motion is off, so nothing the reader needs may exist only in a loop. At `p` equal to the step count with loops off, the scene must still show its complete result.
- Position everything as a fraction of `W` and `H`. Size text with `fz(n)`. When `NARROW` is true, use shorter labels. Keep at most about 5 text labels in view at once, and never let text overlap at any value of `p`.
- Dim what is not the subject (alpha around 0.45) and mark the subject with `C.hi`.

### Formula steps on the canvas

`formulaSteps(lines, x, y, shown, { size, gap, align })` draws a derivation or substitution as stacked maths lines. `shown` counts lines revealed (fractional values fade the next one in), and the newest line is highlighted, so drive it with `seg` in step with the picture.

### Picture vocabulary

Pick the form that matches the idea, and vary it across chapters.

| The idea | The picture |
| --- | --- |
| Data arriving or being read | A scrolling log conveyor, with values flying along arcs (`flight`) into bars or cards |
| Choosing, branching, routing | A tree or graph with the taken path drawn in (`drawTree`, `tracePath`, `glow` at the head) |
| A value compared with a baseline | A number line with markers and a green delta bar growing from the baseline |
| Uncertainty or a belief | A bell curve or band that widens and tightens |
| Noise versus signal | Faint outlines of single samples with one bold shape moving through them |
| A multi-part profile | A radar shape, or small multiples that shrink into a comparison grid |
| Stacking or summing | Blocks or a running total that builds, each piece flying into place |
| Every pair, every combination | A table or matrix that fills in cell by cell |
| A function or transformation | An input dot travelling along the curve and reading off the output |
| A pipeline or architecture | Boxes and links with packets moving along them |
| State changing over time | A timeline with a playhead, or a before and after that morphs |
| Code execution | `codeBlock` with a moving highlight, and variable state beside it |

### Visual style

Keep the light, precise look from the template. White cards with soft shadows on a faint dot grid, thin lines, small monospaced labels for values, and bold tight sans-serif for scene headings. Colours carry meaning and keep that meaning across chapters: `C.one` and `C.two` for the two main subjects, `C.hi` for "look here", `C.green` and `C.pink` for above and below or good and bad, `C.accent` for a secondary measure. Do not add decorative elements, gradients or emoji.

## Finishing

Replace the sample scene and every `TODO`. The opening shows only the subject area and the topic name (use the same name as `title` in `notes.json`, and in `<title>`). Its title animates in, and the runtime lists the chapters beside it, so do not add a page heading, an intro paragraph, a key terms list or a recap. Define each term in the step where it first appears, and let the last chapter finish the example.

Do not change the runtime section. You can add drawing helpers to the content section, and you can adjust `ms` on a step that needs longer than its word count gives it.

Before handing over, check the following. If you can run a browser, load the page at 1440×900 and 390×844 and look at each chapter finished and mid-step. If you cannot, say so clearly.

- There are no console errors, and every chapter autoplays and replays from a selected step.
- On a keyboard, ← and → move between steps, and ↑ and ↓ move between chapters.
- At each step, the sentence describes what is on screen.
- Every step moves something on the canvas, every part that contributes to a result is seen contributing, and every incremental update is shown as an edit and checked against a rebuild.
- No text overlaps or is clipped at either size.
- With `prefers-reduced-motion`, each chapter shows its finished result.
- Every number in the text matches the drawing.

## Template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TODO: topic name</title>
<link rel="stylesheet" href="vendor/katex/katex.min.css">
<script src="vendor/katex/katex.min.js"></script>
<script src="note-math.js"></script>
<style>
:root {
  --bg: #fafaff; --ink: #111632; --muted: #626980; --line: #e2e4ee; --faint: #c9cde0; --accent: #6858e8;
  --stage-h: min(calc(100vh - 48px), 640px);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
}
.page { width: min(1240px, 100% - 48px); margin: 0 auto; }
html, body { overflow-x: clip; }
.opening { position: relative; display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(220px, .65fr); align-items: center; column-gap: clamp(32px, 6vw, 96px); min-height: 100svh; padding: 84px 0 84px; }
.back { position: absolute; top: 28px; left: 0; font-size: .9rem; font-weight: 650; color: var(--muted); text-decoration: none; opacity: 0; transition: opacity .6s ease .1s, color .2s ease; }
.opening-kicker { font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); opacity: 0; translate: 0 10px; transition: opacity .6s ease, translate .6s cubic-bezier(.2, .7, .2, 1); }
.opening-title { margin: 14px 0 0; font-size: clamp(2.8rem, 7vw, 6.2rem); font-weight: 800; line-height: .98; letter-spacing: -.055em; overflow-wrap: anywhere; }
.opening-title .ow { display: inline-block; overflow: hidden; vertical-align: top; padding-bottom: .1em; margin-bottom: -.1em; }
.opening-title .ow > span { display: inline-block; translate: 0 105%; transition: translate .95s cubic-bezier(.2, .8, .2, 1); }
.opening-rule { display: block; width: min(220px, 40%); height: 3px; margin-top: 30px; border-radius: 3px; background: var(--accent); transform: scaleX(0); transform-origin: left center; transition: transform 1s cubic-bezier(.65, 0, .35, 1) .55s; }
.opening-map { position: relative; margin: 0; padding: 0 0 0 24px; list-style: none; }
.opening-map::before { content: ''; position: absolute; left: 4px; top: 14px; bottom: 14px; border-left: 1px solid var(--faint); transform: scaleY(0); transform-origin: top center; transition: transform 1.2s cubic-bezier(.65, 0, .35, 1) .6s; }
.map-item { position: relative; display: flex; align-items: baseline; gap: 12px; width: 100%; padding: 6px 0; border: 0; background: none; font: inherit; color: var(--ink); text-align: left; cursor: pointer; opacity: 0; translate: -10px 0; transition: opacity .5s ease, translate .5s cubic-bezier(.2, .7, .2, 1), color .2s ease; transition-delay: calc(700ms + var(--i) * 70ms), calc(700ms + var(--i) * 70ms), 0s; }
.map-item::before { content: ''; position: absolute; left: -24px; top: 50%; width: 9px; height: 9px; margin-top: -4.5px; border: 1.5px solid var(--faint); border-radius: 50%; background: var(--bg); transition: border-color .2s ease, background .2s ease; }
.map-num { font-size: .74rem; color: var(--muted); }
.map-label { font-weight: 600; }
.map-item:hover, .map-item:focus-visible { color: var(--accent); }
.map-item:hover::before, .map-item:focus-visible::before { border-color: var(--accent); background: var(--accent); }
.map-item:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: 2px; border-radius: 6px; }
.opening-cue { position: absolute; left: 0; bottom: 28px; display: flex; align-items: center; gap: 12px; font-size: .8rem; color: var(--muted); opacity: 0; transition: opacity .8s ease 1.4s; }
.opening-cue i { display: block; width: 1px; height: 28px; background: linear-gradient(var(--accent), transparent); transform-origin: top center; animation: cue 1.8s ease-in-out infinite; }
@keyframes cue { 0% { transform: scaleY(0); opacity: 1; } 60% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 0; } }
.opening.play .back, .opening.play .opening-cue { opacity: 1; }
.opening.play .opening-kicker, .opening.play .map-item { opacity: 1; translate: 0 0; }
.opening.play .opening-title .ow > span { translate: 0 0; }
.opening.play .opening-rule, .opening.play .opening-map::before { transform: none; }
@media (max-width: 900px) {
  .opening { grid-template-columns: minmax(0, 1fr); align-content: center; row-gap: 40px; padding: 72px 0 48px; }
  .opening-map { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); column-gap: 16px; padding-left: 0; }
  .opening-map::before, .map-item::before { display: none; }
  .map-item { padding: 4px 0; font-size: .92rem; }
  .opening-cue { display: none; }
}
.back:hover, .back:focus-visible { color: var(--accent); }
.story { margin-top: 44px; }
.chapter { display: grid; grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr); column-gap: clamp(36px, 6vw, 84px); }
.chapter + .chapter { margin-top: clamp(72px, 14vh, 150px); }
.chapter.flip { grid-template-columns: minmax(0, 1fr) minmax(0, 1.42fr); }
.chapter.flip .stage-col { grid-column: 2; grid-row: 1; }
.chapter.flip .copy { grid-column: 1; grid-row: 1; }
.chapter { position: relative; }
.stage-col { position: relative; z-index: 2; transition: translate .95s cubic-bezier(.65, 0, .35, 1); }
.copy { position: relative; z-index: 1; }
.pages { display: grid; }
@property --fade { syntax: '<percentage>'; inherits: false; initial-value: 150%; }
.pg { grid-area: 1 / 1; align-self: center; min-width: 0; --fade: 150%; -webkit-mask-image: linear-gradient(var(--fade-dir, 90deg), #000 calc(var(--fade) - 35%), transparent var(--fade)); mask-image: linear-gradient(var(--fade-dir, 90deg), #000 calc(var(--fade) - 35%), transparent var(--fade)); transition: translate .95s cubic-bezier(.65, 0, .35, 1), opacity .7s ease, --fade .95s cubic-bezier(.65, 0, .35, 1); }
.chapter-cont { display: block; margin-bottom: 14px; font-size: .78rem; font-weight: 700; letter-spacing: .12em; color: var(--muted); }
.stage {
  position: sticky; top: calc((100vh - var(--stage-h)) / 2); height: var(--stage-h);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--line); border-radius: 24px;
  background: radial-gradient(rgba(104, 88, 232, .13) 1px, transparent 1.4px) 0 0 / 22px 22px, linear-gradient(160deg, #fff 0%, #fbfaff 100%);
  box-shadow: 0 28px 70px rgba(27, 31, 69, .1);
  opacity: 0; transform: translateY(26px) scale(.985);
  transition: opacity .7s ease, transform .9s cubic-bezier(.2, .7, .2, 1);
}
.chapter.seen .stage { opacity: 1; transform: none; }
.canvas-box { position: relative; flex: 1 1 0; min-height: 0; margin: 10px 10px 0; }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ticks { flex: 0 0 auto; display: flex; justify-content: center; gap: 6px; padding: 10px 0 12px; }
.tick { width: 22px; height: 3px; border-radius: 3px; background: var(--line); transition: background .35s ease; }
.tick.on { background: var(--accent); }
.copy { align-self: center; min-width: 0; }
.chapter-head { margin-bottom: 20px; }
.chapter-num { display: block; margin-bottom: 8px; font-size: .86rem; font-weight: 700; letter-spacing: .12em; color: var(--accent); }
.chapter-title { margin: 0; font-size: clamp(1.9rem, 3vw, 2.7rem); font-weight: 750; line-height: 1.04; letter-spacing: -.04em; }
.chapter-code { display: inline-block; margin-top: 12px; padding: 4px 10px; border-radius: 8px; font-size: .72rem; overflow-wrap: anywhere; background: color-mix(in srgb, var(--accent) 7%, transparent); color: var(--accent); }
.beat-text i { font-family: KaTeX_Math, "Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif; font-style: italic; }
.beat-text i { font-size: 1.08em; }
.frac { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 .12em; font-size: .88em; line-height: 1.15; }
.frac > :first-child { padding: 0 .25em .12em; border-bottom: 1px solid currentColor; }
.frac > :last-child { padding: .12em .25em 0; }
.sqrt { display: inline-block; padding: .06em .12em 0; border-top: 1px solid currentColor; }
sub, sup { font-size: .7em; line-height: 0; }
.steps { display: flex; flex-direction: column; gap: 4px; margin: 0; padding: 0; list-style: none; }
.beat { display: grid; grid-template-columns: 3px minmax(0, 1fr); column-gap: 14px; width: 100%; padding: 8px 8px 8px 0; border: 0; background: none; font: inherit; text-align: left; color: var(--ink); cursor: pointer; opacity: .42; transition: opacity .5s ease; }
.beat:hover, .beat.active, .copy.done .beat { opacity: 1; }
.beat:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: 2px; border-radius: 6px; }
.beat-bar { display: block; border-radius: 3px; background: var(--line); overflow: hidden; }
.beat-fill { display: block; height: 100%; background: var(--accent); transform-origin: top center; transform: scaleY(0); }
.beat.active .beat-fill { transform: scaleY(var(--fill, 0)); }
.beat.past .beat-fill { transform: scaleY(1); }
.beat-text { font-size: clamp(1.02rem, 1.25vw, 1.14rem); line-height: 1.45; letter-spacing: -.01em; }
.mono { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.rail { position: fixed; right: 20px; top: 50%; z-index: 5; display: none; flex-direction: column; align-items: flex-end; gap: 2px; transform: translateY(-50%); opacity: 0; pointer-events: none; transition: opacity .3s ease; }
.rail.shown { opacity: 1; pointer-events: auto; }
.rail-item { display: flex; align-items: center; gap: 10px; height: 22px; padding: 0; border: 0; background: none; color: var(--muted); font: inherit; font-size: .78rem; cursor: pointer; }
.rail-label { opacity: 0; transform: translateX(4px); transition: opacity .2s ease, transform .2s ease; }
.rail-mark { display: block; width: 14px; height: 3px; border-radius: 3px; background: var(--faint); transition: width .25s ease, background .25s ease; }
.rail-item:hover .rail-label, .rail-item:focus-visible .rail-label, .rail-item.on .rail-label { opacity: 1; transform: none; }
.rail-item.on { color: var(--ink); font-weight: 650; }
.rail-item.on .rail-mark { width: 28px; background: var(--accent); }
@media (min-width: 1360px) { .rail { display: flex; } }
@media (max-width: 900px) {
  :root { --stage-h: min(46svh, 400px); }
  .page { width: calc(100% - 32px); }
  .chapter, .chapter.flip { display: block; }
  .stage-col { display: contents; }
  .stage { top: 8px; z-index: 2; border-radius: 18px; background: radial-gradient(rgba(104, 88, 232, .13) 1px, transparent 1.4px) 0 0 / 22px 22px, #fff; }
  .canvas-box { margin: 6px 6px 0; }
  .ticks { padding: 6px 0 8px; }
  .copy { margin-top: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .stage, .beat, .tick, .rail, .rail-label, .rail-mark, .stage-col, .pg, .opening * { transition: none; }
  .opening-cue i { animation: none; }
  .stage { opacity: 1; transform: none; }
}
</style>
</head>
<body>
<div class="page">
  <section class="opening" aria-label="Introduction">
    <a class="back" href="../#/notes">← Study notes</a>
    <div class="opening-body">
      <div class="opening-kicker">TODO: subject area</div>
      <h1 class="opening-title">TODO: topic name</h1>
      <span class="opening-rule" aria-hidden="true"></span>
    </div>
    <ol class="opening-map" aria-label="Chapters"></ol>
    <div class="opening-cue"><i aria-hidden="true"></i>Scroll to begin · ← → to step through</div>
  </section>
  <main id="story" class="story"></main>
</div>

<script>
// ===== DRAWING HELPERS (keep these; add more in the content section if needed) =====
const C = {
  ink: '#111632', muted: '#626980', dim: '#8a90ad', faint: '#c9cde0',
  one: '#e4002b', two: '#c08a12', accent: '#1aa3c2', hi: '#6858e8',
  green: '#0e9f6e', pink: '#d63d8f', surface: '#ffffff', track: 'rgba(17,22,50,0.07)'
}
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const MATH = 'KaTeX_Main, "Cambria Math", "STIX Two Math", "Latin Modern Math", "Times New Roman", serif'
const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const seg = (p, a, b) => clamp((p - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const backOut = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
function rng (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let ctx = null
let W = 0
let H = 0
let NARROW = false
let U = 1
let GA = 1
let FONT = 'system-ui, sans-serif'
let T = 0
let LIVE = false

const fz = (n) => Math.max(8.5, n * U)
const cycle = (period, offset = 0) => (T / period + offset) % 1
const pulse = (period = 1800, offset = 0) => (LIVE ? 0.5 + 0.5 * Math.sin(TAU * cycle(period, offset)) : 1)
const bob = (seed, amount = 2) => (LIVE ? Math.sin(T / 520 + seed) * amount : 0)
function A (a = 1) { ctx.globalAlpha = clamp(GA * a) }
function group (a, fn) {
  if (a <= 0) return
  const parent = GA
  GA = parent * a
  fn()
  GA = parent
}
function rgba (hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function txt (s, x, y, o = {}) {
  const { size = 11, color = C.ink, align = 'left', weight = 500, mono = false, math = false, base = 'middle', alpha = 1 } = o
  if (math) return drawMath(s, x, y, { size: size * 1.12, color, align, weight, alpha, base })
  A(alpha)
  ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = base
  ctx.fillText(s, x, y)
}
// Typeset a small maths expression: single letters italic, numbers and longer words upright,
// `_x` / `^x` (or `_{xy}`) as subscripts and superscripts.
function mathRuns (s) {
  const runs = []
  const push = (t, level) => {
    const re = /([A-Za-zα-ωΑ-Ω]+)|([^A-Za-zα-ωΑ-Ω]+)/g
    let m
    while ((m = re.exec(t))) {
      if (m[1]) {
        // A single letter straight after a number and a space is a unit (4 m), so it stays upright.
        const prev = runs[runs.length - 1]
        const unit = m[1].length === 1 && prev && prev.level === level && /\d\s$/.test(prev.t)
        runs.push({ t: m[1], italic: m[1].length < 3 && !unit, level })
      }
      else runs.push({ t: m[2], italic: false, level })
    }
  }
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      const level = c === '_' ? -1 : 1
      if (s[i + 1] === '{') {
        const j = s.indexOf('}', i + 2)
        push(s.slice(i + 2, j < 0 ? s.length : j), level)
        i = j < 0 ? s.length : j + 1
      } else {
        push(s[i + 1], level)
        i += 2
      }
    } else {
      let j = i
      while (j < s.length && s[j] !== '_' && s[j] !== '^') j++
      push(s.slice(i, j), 0)
      i = j
    }
  }
  return runs
}
function drawMath (s, x, y, o) {
  const runs = mathRuns(s)
  const fontFor = (r) => `${r.italic ? 'italic ' : ''}${o.weight} ${r.level ? o.size * 0.68 : o.size}px ${MATH}`
  let total = 0
  runs.forEach((r) => {
    ctx.font = fontFor(r)
    r.w = ctx.measureText(r.t).width + (r.italic && !r.level ? o.size * 0.04 : 0)
    total += r.w
  })
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x
  A(o.alpha)
  ctx.fillStyle = o.color
  ctx.textAlign = 'left'
  ctx.textBaseline = o.base
  runs.forEach((r) => {
    ctx.font = fontFor(r)
    ctx.fillText(r.t, cx, y + (r.level < 0 ? o.size * 0.3 : r.level > 0 ? -o.size * 0.36 : 0))
    cx += r.w
  })
}
// Stacked maths lines for derivations and slow worked examples. The newest revealed line is highlighted.
function formulaSteps (lines, x, y, shown, o = {}) {
  const { size = fz(15), gap = fz(30), align = 'left' } = o
  lines.forEach((s, i) => {
    const a = clamp(shown - i)
    if (a <= 0) return
    const current = shown - i < 2 && i === Math.min(lines.length - 1, Math.ceil(shown) - 1)
    txt(s, x, y + i * gap, { size, math: true, color: current ? C.hi : C.ink, align, alpha: easeOut(a) * (current ? 1 : 0.75) })
  })
}
function measure (s, size, weight = 500, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`
  return ctx.measureText(s).width
}
function rr (x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), r)
}
function line (x1, y1, x2, y2, color, w = 1, a = 1, dash = null) {
  A(a)
  ctx.strokeStyle = color
  ctx.lineWidth = w
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  if (dash) ctx.setLineDash([])
}
function dot (x, y, r, color, a = 1) {
  A(a)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU)
  ctx.fill()
}
function glow (x, y, r, color, a = 1) {
  A(a)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
  g.addColorStop(0, rgba(color, 0.3))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * 4, 0, TAU)
  ctx.fill()
  dot(x, y, r, color, a)
  dot(x, y, r * 0.42, '#ffffff', a)
}
function softShadow (on) {
  ctx.shadowColor = on ? 'rgba(27,31,69,0.08)' : 'transparent'
  ctx.shadowBlur = on ? 14 : 0
  ctx.shadowOffsetY = on ? 4 : 0
}
function panel (x, y, w, h, a = 1, border = C.hi) {
  A(a)
  softShadow(true)
  rr(x, y, w, h, 12)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = rgba(border, 0.4)
  ctx.lineWidth = 1
  ctx.stroke()
}
function qb (a, c, b, t) {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
// A glowing dot with a tail, arcing from a to b as t goes 0..1.
function flight (a, b, t, color, r = 2.4, lift = 40) {
  if (t <= 0 || t >= 1.25) return
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift }
  for (let k = 6; k >= 0; k--) {
    const tt = t - k * 0.04
    if (tt < 0 || tt > 1) continue
    const q = qb(a, c, b, ease(tt))
    if (k === 0) glow(q.x, q.y, r, color)
    else dot(q.x, q.y, r * (1 - k / 9), color, 0.45 * (1 - k / 7))
  }
}
function polyLen (pts) {
  const L = [0]
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return L
}
function along (pts, L, t) {
  const d = clamp(t) * L[L.length - 1]
  let i = 1
  while (i < L.length - 1 && L[i] < d) i++
  const s = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1)
  return { x: lerp(pts[i - 1].x, pts[i].x, s), y: lerp(pts[i - 1].y, pts[i].y, s) }
}
// Draws a path up to t (0..1) and returns its leading point.
function tracePath (pts, t, color, width = 2.2, a = 1) {
  const L = polyLen(pts)
  const total = L[L.length - 1] || 1
  for (let s = 1; s < pts.length; s++) {
    if (t * total < L[s - 1]) break
    const end = t * total < L[s] ? along(pts, L, t) : pts[s]
    line(pts[s - 1].x, pts[s - 1].y, end.x, end.y, color, width, a)
  }
  return along(pts, L, t)
}
// Looping: small dots travelling along a path.
function runner (pts, offset = 0, color = C.hi, alpha = 1, period = 2600) {
  if (!LIVE || alpha <= 0 || pts.length < 2) return
  const L = polyLen(pts)
  const t = cycle(period, offset)
  const fade = Math.sin(Math.PI * t) * alpha
  for (let k = 4; k >= 0; k--) {
    const tail = t - k * 0.018
    if (tail < 0) continue
    const q = along(pts, L, tail)
    dot(q.x, q.y, k ? 1.5 : 2.8, color, fade * (1 - k / 6))
  }
}
// Looping: an expanding ring.
function ripple (x, y, r0, r1, color, a = 1, period = 2000, offset = 0) {
  if (!LIVE || a <= 0) return
  const t = cycle(period, offset)
  A(a * (1 - t) * 0.55)
  ctx.beginPath()
  ctx.arc(x, y, lerp(r0, r1, t), 0, TAU)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  ctx.stroke()
}
function treeLayout (cx, top, w, h, depth = 3) {
  const lv = []
  for (let l = 0; l <= depth; l++) {
    const n = 1 << l
    lv.push(Array.from({ length: n }, (_, i) => ({ x: cx - w / 2 + (i + 0.5) * w / n, y: top + l * h / depth })))
  }
  return lv
}
const treePath = (lv, leaf) => lv.map((nodes, l) => nodes[leaf >> (lv.length - 1 - l)])
function drawTree (lv, a = 1, r = 2.2) {
  for (let l = 0; l < lv.length - 1; l++) {
    lv[l].forEach((n, i) => {
      line(n.x, n.y, lv[l + 1][2 * i].x, lv[l + 1][2 * i].y, C.faint, 1, a)
      line(n.x, n.y, lv[l + 1][2 * i + 1].x, lv[l + 1][2 * i + 1].y, C.faint, 1, a)
    })
  }
  lv.forEach((nodes) => nodes.forEach((n) => dot(n.x, n.y, r, C.faint, a)))
}
// A code listing. `active` is a line index and may be fractional, so the highlight can slide between lines.
function codeBlock (lines, x, y, w, h, active, a = 1) {
  panel(x, y, w, h, a, C.faint)
  const lh = Math.min(fz(22), (h - 20) / lines.length)
  const longest = Math.max(...lines.map((s) => s.length), 1)
  const size = Math.min(lh * 0.64, (w - 28) / (longest * 0.62))
  const top = y + (h - lh * lines.length) / 2
  const at = clamp(active, 0, lines.length - 1)
  A(a * 0.1)
  ctx.fillStyle = C.hi
  rr(x + 6, top + at * lh, w - 12, lh, 5)
  ctx.fill()
  lines.forEach((s, n) => {
    const on = Math.abs(n - at) < 0.5
    txt(s, x + 14, top + (n + 0.5) * lh, { size, mono: true, color: on ? C.ink : C.muted, weight: on ? 700 : 500, alpha: a })
  })
}

// ===== CONTENT: replace everything in this section =====
// Sample only, showing the idioms: one item first, then the rest quickly, then a new result.
const EXAMPLE = (() => {
  const values = [72, 40, 88, 56, 64]
  return { values, mean: values.reduce((s, v) => s + v, 0) / values.length }
})()

function sceneAverage (p) {
  const { values, mean } = EXAMPLE
  const top = H * 0.2
  const base = H * 0.84
  const bw = W * 0.1
  const gap = W * 0.07
  const x0 = (W - values.length * bw - (values.length - 1) * gap) / 2
  const x1 = W - x0
  const Y = (v) => lerp(base, top, v / 100)
  const focus = 1 - seg(p, 0.85, 1.05)

  txt('Five readings', W / 2, H * 0.09, { size: fz(17), weight: 750, align: 'center', alpha: easeOut(seg(p, 0, 0.2)) })
  values.forEach((v, i) => {
    const start = i === 0 ? 0.15 : 1 + (i - 1) * 0.14
    const grow = easeOut(seg(p, start, start + 0.4))
    const x = x0 + i * (bw + gap)
    A(i === 0 ? 1 : 1 - 0.55 * focus)
    ctx.fillStyle = C.track
    rr(x, top, bw, base - top, 8)
    ctx.fill()
    if (grow <= 0) return
    const y = lerp(base, Y(v), grow)
    A(1)
    ctx.fillStyle = C.one
    rr(x, y, bw, base - y, 8)
    ctx.fill()
    txt(String(Math.round(v * grow)), x + bw / 2, y - fz(12), { size: fz(12), mono: true, weight: 700, align: 'center', alpha: grow })
  })

  const reach = ease(seg(p, 2, 2.5))
  if (reach > 0) {
    const end = lerp(x0, x1, reach)
    line(x0, Y(mean), end, Y(mean), C.hi, 2.5)
    runner([{ x: x0, y: Y(mean) }, { x: end, y: Y(mean) }], 0, '#ffffff', reach, 2200)
    ripple(end, Y(mean), 4, 20, C.hi, reach)
  }
  txt(`average ${mean}`, W / 2, H * 0.94, { size: fz(18), color: C.hi, weight: 750, align: 'center', alpha: easeOut(seg(p, 2.4, 2.7)) })
}

const SCENES = [
  {
    short: 'Average',
    title: 'Taking an average',
    code: 'mean = sum(values) / len(values)',
    draw: sceneAverage,
    beats: [
      { text: `Start with one reading: ${EXAMPLE.values[0]}.` },
      { text: 'The other four follow.' },
      { text: `Add them up, divide by five, and one line summarises them all: ${EXAMPLE.mean}.` }
    ]
  }
]

// ===== RUNTIME: do not change =====
function drawScene (context, index, p, { width, height, dpr, font }, time = 0) {
  ctx = context
  T = time
  LIVE = time > 0
  W = width
  H = height
  NARROW = width < 520
  U = clamp(Math.min(width, height) / 600, 0.55, 1.15)
  GA = 1
  if (font) FONT = font
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)
  SCENES[index].draw(p)
}

;(() => {
  const START_LINE = 0.45
  const MS_PER_WORD = 210
  const BEAT_PADDING_MS = 1300
  const MIN_BEAT_MS = 3600
  const MAX_BEAT_MS = 8200
  const DAMPING_MS = 140
  const SNAP_EPSILON = 4
  const SNAP_PADDING = 24
  const ENTRY_REACH = 0.6
  const MIN_GLIDE_MS = 900
  const MAX_GLIDE_MS = 1500
  const GLIDE_MS_PER_PX = 0.6
  const WHEEL_THRESHOLD = 24
  const WHEEL_QUIET_MS = 110
  const SWIPE_THRESHOLD = 36
  const KEY_DIRECTION = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }

  const root = document.getElementById('story')
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const font = getComputedStyle(root).fontFamily
  let raf = 0
  let lastFrame = 0
  let inView = false
  let activeChapter = -1
  let railShown = false
  let glideRaf = 0
  let settling = false
  let lastWheelAt = 0
  let lastWheelSize = 0
  let wheelTotal = 0
  let touch = null

  const make = (tag, cls, text) => {
    const node = document.createElement(tag)
    if (cls) node.className = cls
    if (text !== undefined) node.textContent = text
    return node
  }
  const beatDuration = ({ text, ms }) => {
    if (ms) return ms
    const words = text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length
    return Math.min(MAX_BEAT_MS, Math.max(MIN_BEAT_MS, words * MS_PER_WORD + BEAT_PADDING_MS))
  }

  const rail = make('nav', 'rail')
  rail.setAttribute('aria-label', 'Stages')
  const railItems = SCENES.map((s, i) => {
    const item = make('button', 'rail-item')
    item.type = 'button'
    item.append(make('span', 'rail-label', s.short), make('span', 'rail-mark'))
    item.addEventListener('click', () => jump(i))
    rail.append(item)
    return item
  })
  root.append(rail)

  // The opening: the topic name rises in word by word, and the chapters draw in as a map.
  const opening = document.querySelector('.opening')
  if (opening) {
    const title = opening.querySelector('.opening-title')
    if (title) {
      const words = title.textContent.trim().split(/\s+/)
      title.setAttribute('aria-label', words.join(' '))
      title.textContent = ''
      words.forEach((w, n) => {
        const outer = make('span', 'ow')
        outer.setAttribute('aria-hidden', 'true')
        const inner = make('span', '', w)
        inner.style.transitionDelay = `${120 + n * 90}ms`
        outer.append(inner)
        title.append(outer, ' ')
      })
    }
    const map = opening.querySelector('.opening-map')
    if (map) {
      SCENES.forEach((s, i) => {
        const li = make('li')
        const btn = make('button', 'map-item')
        btn.type = 'button'
        btn.style.setProperty('--i', i)
        btn.append(make('span', 'map-num mono', String(i + 1).padStart(2, '0')), make('span', 'map-label', s.short))
        btn.addEventListener('click', () => jump(i))
        li.append(btn)
        map.append(li)
      })
    }
    requestAnimationFrame(() => requestAnimationFrame(() => opening.classList.add('play')))
  }

  const chapters = SCENES.map((s, i) => {
    const el = make('section', i % 2 ? 'chapter flip' : 'chapter')
    const col = make('div', 'stage-col')
    const stage = make('div', 'stage')
    const box = make('div', 'canvas-box')
    const canvas = make('canvas')
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', `Animation: ${s.title}. The steps are described in the text alongside.`)
    box.append(canvas)
    const ticks = make('div', 'ticks')
    ticks.setAttribute('aria-hidden', 'true')
    const tickEls = s.beats.map(() => ticks.appendChild(make('span', 'tick')))
    stage.append(box, ticks)
    col.append(stage)

    const copy = make('div', 'copy')
    const head = make('header', 'chapter-head')
    head.append(make('span', 'chapter-num mono', String(i + 1).padStart(2, '0')), make('h2', 'chapter-title', s.title))
    if (s.formula) head.append(noteFormula(s.formula, s.where, i + 1))
    if (s.code) head.append(make('code', 'chapter-code', s.code))
    const pagesEl = make('div', 'pages')
    const firstPage = make('div', 'pg')
    const steps = make('ol', 'steps')
    const lis = []
    const beatEls = s.beats.map((b, bi) => {
      const li = make('li')
      const btn = make('button', 'beat')
      btn.type = 'button'
      const bar = make('span', 'beat-bar')
      bar.setAttribute('aria-hidden', 'true')
      bar.append(make('span', 'beat-fill'))
      const text = make('span', 'beat-text')
      text.innerHTML = b.text
      btn.append(bar, text)
      btn.addEventListener('click', () => seek(i, bi))
      li.append(btn)
      steps.append(li)
      lis.push(li)
      return btn
    })
    firstPage.append(head, steps)
    pagesEl.append(firstPage)
    copy.append(pagesEl)
    el.append(col, copy)
    root.append(el)

    const durations = s.beats.map(beatDuration)
    let elapsed = 0
    const starts = durations.map((d) => { const at = elapsed; elapsed += d; return at })
    return {
      el, canvas, box, copy, beatEls, tickEls, durations, starts,
      col, stage, head, pagesEl, lis,
      flip: i % 2 === 1,
      num: String(i + 1).padStart(2, '0'),
      pages: [{ el: firstPage, list: steps }],
      pageOf: s.beats.map(() => 0),
      page: -1,
      ctx: canvas.getContext('2d'),
      total: elapsed,
      time: reduceMotion ? elapsed : 0,
      near: false,
      seen: false,
      started: reduceMotion,
      dirty: true,
      size: null,
      shown: reduceMotion ? durations.length : 0,
      drawn: -1,
      beat: -1,
      done: false
    }
  })

  function sizeCanvas (ch) {
    const width = ch.box.clientWidth
    const height = ch.box.clientHeight
    if (!width || !height) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    ch.size = { width, height, dpr, font }
    ch.canvas.width = Math.round(width * dpr)
    ch.canvas.height = Math.round(height * dpr)
    ch.dirty = true
  }
  let layoutKey = ''
  function resizeStages () {
    const key = `${window.innerWidth}x${window.innerHeight}`
    if (key !== layoutKey) {
      layoutKey = key
      chapters.forEach(paginate)
    }
    chapters.forEach((ch) => { if (ch.near) sizeCanvas(ch) })
    start()
  }
  function progressAt (ch) {
    let b = ch.durations.length - 1
    while (b > 0 && ch.time < ch.starts[b]) b--
    return b + Math.min(1, (ch.time - ch.starts[b]) / ch.durations[b])
  }
  function paintBeats (ch, beat, done) {
    if (ch.beat === beat && ch.done === done) return
    ch.beat = beat
    ch.done = done
    ch.copy.classList.toggle('done', done)
    ch.beatEls.forEach((el, n) => {
      el.classList.toggle('active', n === beat)
      el.classList.toggle('past', n < beat || done)
      if (n === beat) el.setAttribute('aria-current', 'step')
      else el.removeAttribute('aria-current')
    })
    ch.tickEls.forEach((el, n) => el.classList.toggle('on', n <= beat))
    applyPages(ch)
  }

  // A chapter whose steps do not fit beside the stage is split into pages. Reaching the next
  // page slides the stage across, squeezes the old page off the edge as it fades, and brings
  // the new page in on the side the stage has left. Narrow screens scroll the steps instead.
  const CONT_H = 40
  function paginate (ch) {
    const first = ch.pages[0]
    ch.lis.forEach((li) => first.list.append(li))
    ch.pages.splice(1).forEach((pg) => pg.el.remove())
    const wide = window.innerWidth > 900
    const limit = ch.stage.offsetHeight - 16
    const heights = ch.lis.map((li) => li.offsetHeight + 4)
    let used = ch.head.offsetHeight + (parseFloat(getComputedStyle(ch.head).marginBottom) || 0)
    const fits = !wide || used + heights.reduce((sum, h) => sum + h, 0) <= limit
    const groups = [[]]
    heights.forEach((h, i) => {
      if (!fits && groups[groups.length - 1].length && used + h > limit) {
        groups.push([])
        used = CONT_H
      }
      groups[groups.length - 1].push(i)
      used += h
    })
    groups.slice(1).forEach(() => {
      const el = make('div', 'pg')
      const list = make('ol', 'steps')
      el.append(make('span', 'chapter-cont mono', `${ch.num} · continued`), list)
      ch.pagesEl.append(el)
      ch.pages.push({ el, list })
    })
    groups.forEach((g, k) => g.forEach((i) => {
      if (k) ch.pages[k].list.append(ch.lis[i])
      ch.pageOf[i] = k
    }))
    applyPages(ch, true)
  }
  // How much of the previous page stays in view beside the stage before fading out.
  const GHOST_SHOWN = 0.5
  function applyPages (ch, force = false) {
    const cur = ch.pageOf[Math.max(0, ch.beat)] || 0
    if (!force && cur === ch.page) return
    ch.page = cur
    if (ch.pages.length < 2) {
      ch.col.style.translate = ''
      ch.pages.forEach(({ el }) => {
        el.style.translate = ''
        el.style.opacity = ''
        el.style.removeProperty('--fade')
        el.inert = false
      })
      return
    }
    const dir = ch.flip ? -1 : 1
    const stageW = ch.col.offsetWidth
    const copyW = ch.copy.offsetWidth
    const gap = Math.abs(ch.copy.offsetLeft - ch.col.offsetLeft) - (dir > 0 ? stageW : copyW)
    // The row pans as one: the stage moves across, the new page takes the side it left, and
    // the old page slides out beside the stage as a fading ghost. The whole row then shifts
    // away from the ghost, as far as the screen allows, so it stays balanced on screen.
    let shift = 0
    if (cur > 0) {
      const ghostSide = cur % 2 ? dir : -dir
      const rect = ch.el.getBoundingClientRect()
      const room = ghostSide > 0 ? rect.left : window.innerWidth - rect.right
      shift = -ghostSide * Math.min((gap + copyW * GHOST_SHOWN) / 2, Math.max(0, room - 16))
    }
    ch.col.style.translate = `${(cur % 2 ? dir * (copyW + gap) : 0) + shift}px 0`
    ch.pages.forEach(({ el }, k) => {
      const away = k % 2 === 1
      const base = (away ? -dir * (stageW + gap) : 0) + shift
      const out = away ? -dir : dir
      const s = el.style
      s.setProperty('--fade-dir', out > 0 ? '90deg' : '270deg')
      if (k === cur) {
        s.translate = `${base}px 0`
        s.opacity = '1'
        s.setProperty('--fade', '150%')
      } else if (k < cur) {
        s.translate = `${base + out * (copyW + gap)}px 0`
        s.opacity = k === cur - 1 ? '.75' : '0'
        s.setProperty('--fade', k === cur - 1 ? `${GHOST_SHOWN * 100}%` : '0%')
      } else {
        s.translate = `${base + out * 56}px 0`
        s.opacity = '0'
        s.setProperty('--fade', '150%')
      }
      el.inert = k !== cur
    })
  }

  function frame (now) {
    raf = 0
    if (!inView) { lastFrame = 0; return }
    const dt = lastFrame ? Math.min(64, now - lastFrame) : 16
    lastFrame = now
    const vh = window.innerHeight
    const rate = reduceMotion ? 1 : 1 - Math.exp(-dt / DAMPING_MS)
    let current = activeChapter

    chapters.forEach((ch, i) => {
      const rect = ch.el.getBoundingClientRect()
      if (rect.top < vh * 0.5 && rect.bottom > vh * 0.5) current = i
      const near = rect.bottom > -vh * 0.3 && rect.top < vh * 1.3
      if (near !== ch.near) {
        ch.near = near
        if (near) {
          sizeCanvas(ch)
        } else {
          ch.canvas.width = 0
          ch.canvas.height = 0
          ch.size = null
        }
      }
      if (!ch.seen && rect.top < vh * 0.9) {
        ch.seen = true
        ch.el.classList.add('seen')
      }
      if (!ch.started && rect.top < vh * START_LINE && rect.bottom > vh * 0.2) ch.started = true
      const visible = rect.top < vh * 0.8 && rect.bottom > vh * 0.2
      if (ch.started && visible && !reduceMotion && ch.time < ch.total) {
        ch.time = Math.min(ch.total, ch.time + dt)
      }
      const target = progressAt(ch)
      ch.shown += (target - ch.shown) * rate
      if (Math.abs(target - ch.shown) < 0.0004) ch.shown = target
      const beat = Math.min(ch.beatEls.length - 1, Math.floor(target))
      paintBeats(ch, beat, ch.time >= ch.total)
      ch.beatEls[beat].style.setProperty('--fill', (target - beat).toFixed(3))
      if (!near) return
      const looping = !reduceMotion && rect.bottom > 0 && rect.top < vh
      if (ch.size && (looping || ch.dirty || Math.abs(ch.shown - ch.drawn) > 0.0002)) {
        drawScene(ch.ctx, i, ch.shown, ch.size, reduceMotion ? 0 : now)
        ch.drawn = ch.shown
        ch.dirty = false
      }
    })

    if (current !== activeChapter) {
      activeChapter = current
      railItems.forEach((item, n) => item.classList.toggle('on', n === current))
    }
    const first = chapters[0].el.getBoundingClientRect()
    const last = chapters[chapters.length - 1].el.getBoundingClientRect()
    const shown = first.top < vh * 0.5 && last.bottom > vh * 0.5
    if (shown !== railShown) {
      railShown = shown
      rail.classList.toggle('shown', shown)
    }
    raf = requestAnimationFrame(frame)
  }
  function start () {
    if (!raf && inView) raf = requestAnimationFrame(frame)
  }

  // The opening is a stop of its own, so one scroll from it glides into the first chapter.
  function openingZone () {
    if (!opening) return []
    const bottom = opening.getBoundingClientRect().bottom + window.scrollY
    return [{ snap: 0, end: Math.max(0, bottom - window.innerHeight) }]
  }
  function zoneOf (ch) {
    const vh = window.innerHeight
    const rect = ch.el.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const maxScroll = document.documentElement.scrollHeight - vh
    const snap = Math.min(maxScroll, Math.max(0, top - Math.max(SNAP_PADDING, (vh - rect.height) / 2)))
    const end = Math.min(maxScroll, Math.max(snap, top + rect.height + SNAP_PADDING - vh))
    return { snap, end }
  }
  // `force` lets the keyboard enter the story from anywhere above or below it.
  function nextStop (direction, force = false) {
    const y = window.scrollY
    const reach = window.innerHeight * ENTRY_REACH
    const zones = [...openingZone(), ...chapters.map(zoneOf)]
    if (direction > 0) {
      for (let i = 0; i < zones.length; i++) {
        if (y < zones[i].snap - SNAP_EPSILON) return i === 0 && !force && zones[i].snap - y > reach ? null : zones[i].snap
        if (y < zones[i].end - SNAP_EPSILON) return null
      }
      return null
    }
    for (let i = zones.length - 1; i >= 0; i--) {
      if (y > zones[i].end + SNAP_EPSILON) return i === zones.length - 1 && !force && y - zones[i].end > reach ? null : zones[i].end
      if (y > zones[i].snap + SNAP_EPSILON) return null
    }
    return null
  }
  function cancelGlide () {
    if (glideRaf) cancelAnimationFrame(glideRaf)
    glideRaf = 0
  }
  function glideTo (target) {
    cancelGlide()
    const from = window.scrollY
    const distance = Math.abs(target - from)
    if (distance < 2) return
    const duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, distance * GLIDE_MS_PER_PX + 500))
    const startedAt = performance.now()
    settling = true
    wheelTotal = 0
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - startedAt) / duration))
      window.scrollTo({ top: from + (target - from) * ease(t), behavior: 'instant' })
      glideRaf = t < 1 ? requestAnimationFrame(step) : 0
    }
    glideRaf = requestAnimationFrame(step)
  }
  function onWheel (e) {
    if (e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
    const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
    const size = Math.abs(delta)
    const now = performance.now()
    const gap = now - lastWheelAt
    const rising = size > 30 && size > lastWheelSize * 1.6
    lastWheelAt = now
    lastWheelSize = size
    if (glideRaf) { e.preventDefault(); return }
    if (gap > WHEEL_QUIET_MS) {
      settling = false
      wheelTotal = 0
    }
    if (settling) {
      if (!rising) { e.preventDefault(); return }
      settling = false
      wheelTotal = 0
    }
    const direction = Math.sign(delta)
    const target = nextStop(direction)
    if (target === null) return
    e.preventDefault()
    if (Math.sign(wheelTotal) !== direction) wheelTotal = 0
    wheelTotal += delta
    if (Math.abs(wheelTotal) >= WHEEL_THRESHOLD) glideTo(target)
  }
  // ← and → move between steps, continuing into the next or previous chapter at either end.
  function stepBy (dir) {
    const i = Math.max(0, activeChapter)
    const ch = chapters[i]
    if (activeChapter !== i) {
      jump(i)
      seek(i, 0)
      return
    }
    const n = ch.beatEls.length
    const current = ch.started ? Math.min(n - 1, Math.floor(progressAt(ch))) : -1
    const target = current + dir
    if (target >= n) {
      if (i + 1 < chapters.length) {
        jump(i + 1)
        seek(i + 1, 0)
      }
    } else if (target < 0) {
      if (i > 0) {
        jump(i - 1)
        seek(i - 1, chapters[i - 1].beatEls.length - 1)
      }
    } else {
      seek(i, target)
    }
  }
  function onKeydown (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      stepBy(e.key === 'ArrowRight' ? 1 : -1)
      return
    }
    let direction = KEY_DIRECTION[e.key]
    if (e.key === ' ') {
      if (e.target.closest?.('button, a')) return
      direction = e.shiftKey ? -1 : 1
    }
    if (!direction) return
    if (glideRaf) { e.preventDefault(); return }
    const target = nextStop(direction, true)
    if (target === null) return
    e.preventDefault()
    if (reduceMotion) window.scrollTo({ top: target, behavior: 'instant' })
    else glideTo(target)
  }
  function onTouchStart (e) {
    touch = e.touches.length === 1 ? { y: e.touches[0].clientY, target: undefined } : null
  }
  function onTouchMove (e) {
    if (glideRaf) {
      if (e.cancelable) e.preventDefault()
      return
    }
    if (!touch) return
    const dy = e.touches[0].clientY - touch.y
    if (touch.target === undefined) {
      if (Math.abs(dy) < 8) return
      touch.target = nextStop(dy < 0 ? 1 : -1)
    }
    if (touch.target === null || !e.cancelable) return
    e.preventDefault()
    if (Math.abs(dy) >= SWIPE_THRESHOLD) {
      glideTo(touch.target)
      touch = null
    }
  }
  function onPointerDown (e) {
    if (e.target === document.documentElement) cancelGlide()
  }
  function jump (i) {
    const { snap } = zoneOf(chapters[i])
    if (reduceMotion) window.scrollTo({ top: snap, behavior: 'instant' })
    else glideTo(snap)
  }
  function seek (i, beat) {
    const ch = chapters[i]
    ch.started = true
    ch.time = reduceMotion ? ch.starts[beat] + ch.durations[beat] - 1 : ch.starts[beat]
  }

  new ResizeObserver(resizeStages).observe(root)
  window.addEventListener('resize', resizeStages)
  window.addEventListener('keydown', onKeydown)
  if (!reduceMotion) {
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerdown', onPointerDown)
  }
  document.fonts?.ready.then(() => chapters.forEach((ch) => { paginate(ch); ch.dirty = true }))
  window.addEventListener('scene-assets', () => chapters.forEach((ch) => { ch.dirty = true }))
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    if (inView) start()
  }, { rootMargin: '30% 0px' }).observe(root)
})()
</script>
<script src="note-end.js" defer></script>
</body>
</html>
```
