<template>
  <article class="cw-page">
    <RouterLink to="/projects" class="btn cw-back">Back to projects</RouterLink>

    <!-- Hero -->
    <section class="cw-hero" v-reveal>
      <div class="cw-hero-inner">
        <img class="cw-hero-logo" :src="logoCharcoal" alt="Curated Wellness" />
        <div class="cw-hero-copy">
          <p class="cw-kicker">Client build · Shopify · Applied AI</p>
          <h1 class="cw-hero-title">Bella, an AI supplement guide that remembers who it's talking to.</h1>
          <p class="cw-hero-lead">
            I engineered everything behind the Curated Wellness storefront: the Bella chatbot, its retrieval and safety
            pipeline, customer and purchase memory, an affiliate programme, and the super admin the business runs on.
          </p>
          <div class="cw-hero-actions">
            <a class="cw-btn" :href="liveUrl" target="_blank" rel="noopener">Visit the live store ↗</a>
            <a class="cw-btn cw-btn--quiet" href="#cw-bella" @click.prevent="scrollTo('cw-bella')">Watch Bella think ↓</a>
          </div>
        </div>
      </div>

      <div class="cw-hero-fan" aria-hidden="true">
        <img
          v-for="(handle, i) in galleryOrder"
          :key="handle"
          :src="products[handle].image"
          alt=""
          class="cw-fan-card"
          :style="{ '--i': i }"
        />
      </div>
    </section>

    <section class="cw-stats" v-reveal>
      <div class="cw-stat" v-for="stat in heroStats" :key="stat.label">
        <span class="cw-stat-value">{{ stat.value }}</span>
        <span class="cw-stat-label">{{ stat.label }}</span>
      </div>
    </section>

    <!-- Overview + ownership -->
    <section class="cw-section cw-overview" v-reveal>
      <div class="cw-overview-copy">
        <p class="cw-kicker">01 · The brief</p>
        <h2 class="cw-h2">A premium store that sells like a knowledgeable friend</h2>
        <p class="cw-copy">
          Curated Wellness is a New Zealand supplement brand with four products: creatine, whey protein, collagen and an
          electrolyte blend. The founder wanted shoppers to get the kind of advice you'd get in a good boutique, without the
          compliance risk of an AI making health claims.
        </p>
        <p class="cw-copy">
          The storefront look and feel came from the brand's design team. I was the engineer: I built the systems that make
          the site smart, measurable and safe to run, and took them from a prototype in May to production on the owner's
          store in October 2026.
        </p>
        <div class="cw-pill-row">
          <CategoryTag :category="project.category" />
          <span class="tag" v-for="tag in project.tags" :key="tag">{{ tag }}</span>
        </div>
      </div>

      <div class="cw-layers" role="list" aria-label="Who built each layer of the platform">
        <p class="cw-layers-title mono">Who built what</p>
        <div
          v-for="layer in ownership"
          :key="layer.name"
          class="cw-layer"
          :class="layer.mine ? 'is-mine' : 'is-team'"
          role="listitem"
        >
          <div>
            <p class="cw-layer-name">{{ layer.name }}</p>
            <p class="cw-layer-detail">{{ layer.detail }}</p>
          </div>
          <span class="cw-layer-badge">{{ layer.mine ? 'Built by me' : 'Design team' }}</span>
        </div>
      </div>
    </section>

    <!-- Live store -->
    <section class="cw-section cw-live" id="cw-live" v-reveal>
      <div class="cw-live-head">
        <div>
          <p class="cw-kicker">02 · Live in production</p>
          <h2 class="cw-h2">curatedwellness.co.nz</h2>
        </div>
        <a class="cw-btn" :href="liveUrl" target="_blank" rel="noopener">Open the live store ↗</a>
      </div>

      <div class="cw-browser">
        <div class="cw-browser-bar">
          <span class="cw-dot"></span><span class="cw-dot"></span><span class="cw-dot"></span>
          <a class="cw-url mono" :href="liveUrl" target="_blank" rel="noopener">
            <span aria-hidden="true">🔒</span> curatedwellness.co.nz
          </a>
        </div>
        <div class="cw-browser-view">
          <img class="cw-browser-logo" :src="logoCharcoal" alt="" aria-hidden="true" />

          <div class="cw-widget" aria-hidden="true">
            <div class="cw-widget-head">
              <span class="cw-widget-avatar">B</span>
              <div>
                <strong>Bella</strong>
                <small>Your supplement guide</small>
              </div>
            </div>
            <p class="cw-widget-msg">Hi, I'm Bella. Tell me what you're training for and I'll help you find your fit.</p>
            <div class="cw-widget-chips">
              <span>Recovery</span><span>Hydration</span><span>Strength</span>
            </div>
          </div>
        </div>
      </div>
      <p class="cw-note">
        Shopify blocks storefronts from being embedded in other sites, so this frame shows the Bella widget in its real
        position and links out to the store. The store is in a pre-launch period, so it may ask for a password.
      </p>
    </section>

    <!-- Bella replay -->
    <section class="cw-section cw-bella" id="cw-bella" v-reveal>
      <p class="cw-kicker">03 · Watch Bella think</p>
      <h2 class="cw-h2">Every reply runs through a five-stage pipeline</h2>
      <p class="cw-copy cw-copy--narrow">
        Pick a reply on the left. The right-hand panel shows what the backend did for that turn. This is a replay of real
        pipeline behaviour using the shipped product copy and guardrail text, not a live model call.
      </p>

      <div class="cw-bella-grid">
        <div class="cw-chat">
          <div class="cw-chat-head">
            <span class="cw-widget-avatar">B</span>
            <div>
              <strong>Bella</strong>
              <small>Curated Wellness</small>
            </div>
            <button type="button" class="cw-chat-reset" @click="resetChat">Restart</button>
          </div>

          <div class="cw-chat-log" ref="chatLog" aria-live="polite">
            <div
              v-for="(msg, i) in transcript"
              :key="i"
              class="cw-msg"
              :class="msg.role === 'user' ? 'cw-msg--user' : 'cw-msg--bella'"
            >
              <p>{{ msg.text }}</p>
              <p v-if="msg.safetyNotice" class="cw-msg-safety">{{ msg.safetyNotice }}</p>
              <div v-if="msg.products && msg.products.length" class="cw-msg-products">
                <figure v-for="handle in msg.products" :key="handle" class="cw-product">
                  <img :src="products[handle].image" :alt="products[handle].name" loading="lazy" />
                  <figcaption>
                    <strong>{{ products[handle].name }}</strong>
                    <span>{{ products[handle].tag }}</span>
                  </figcaption>
                </figure>
              </div>
            </div>
            <div v-if="typing" class="cw-msg cw-msg--bella cw-typing" aria-label="Bella is typing">
              <span></span><span></span><span></span>
            </div>
          </div>

          <div class="cw-chat-replies">
            <button
              v-for="option in currentOptions"
              :key="option.label"
              type="button"
              class="cw-reply"
              :disabled="typing"
              @click="choose(option)"
            >
              {{ option.label }}
            </button>
            <p v-if="!currentOptions.length && !typing" class="cw-chat-end">
              End of this path. Restart to try another.
            </p>
          </div>
        </div>

        <div class="cw-pipeline">
          <p class="cw-pipeline-title mono">
            {{ activeTurn ? `Turn: "${activeTurn.user}"` : 'Choose a reply to run the pipeline' }}
          </p>
          <ol class="cw-stages">
            <li
              v-for="(stage, i) in pipelineStages"
              :key="stage.id"
              class="cw-stage"
              :class="`is-${stageState(stage.id)}`"
              :style="{ '--i': i }"
            >
              <div class="cw-stage-marker" aria-hidden="true">{{ i + 1 }}</div>
              <div class="cw-stage-body">
                <p class="cw-stage-name">
                  {{ stage.name }}
                  <span class="cw-stage-state mono">{{ stateLabel(stageState(stage.id)) }}</span>
                </p>
                <p class="cw-stage-text">{{ activeTurn ? activeTurn.pipeline[stage.id].text : stage.idle }}</p>
                <ul v-if="activeTurn && activeTurn.pipeline[stage.id].chunks" class="cw-chunks mono">
                  <li v-for="chunk in activeTurn.pipeline[stage.id].chunks" :key="chunk">{{ chunk }}</li>
                </ul>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Retrieval -->
    <section class="cw-section cw-retrieval" v-reveal>
      <p class="cw-kicker">04 · Retrieval without a vector database</p>
      <h2 class="cw-h2">Small, ranked context instead of the whole catalogue</h2>
      <p class="cw-copy cw-copy--narrow">
        The brand's knowledge lives in markdown: six always-on guidance files plus seven micro-files per product. Each turn,
        the backend splits them into heading-level chunks, scores them against the message, page and shopper profile, and
        packs the best into a fixed 32,000-character budget. It's cheap, deterministic and easy to unit-test, and the client
        can edit the knowledge without touching code.
      </p>

      <div class="cw-retrieval-grid">
        <div class="cw-card">
          <p class="cw-card-label mono">Context matrix: which chunks get pulled</p>
          <div class="cw-query-tabs" role="tablist" aria-label="Example shopper messages">
            <button
              v-for="(q, i) in matrixQueries"
              :key="q.text"
              type="button"
              role="tab"
              class="cw-query-tab"
              :class="{ 'is-active': activeQuery === i }"
              :aria-selected="activeQuery === i"
              @click="activeQuery = i"
            >
              “{{ q.text }}”
            </button>
          </div>

          <div class="cw-matrix-wrap">
            <table class="cw-matrix">
              <thead>
                <tr>
                  <th scope="col"><span class="sr-only">Product</span></th>
                  <th v-for="kind in contextKinds" :key="kind" scope="col" class="mono">{{ kind }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="handle in matrixProducts" :key="handle">
                  <th scope="row">{{ products[handle].short }}</th>
                  <td v-for="kind in contextKinds" :key="kind">
                    <span
                      class="cw-cell"
                      :class="`is-${cellState(handle, kind)}`"
                      :title="`${products[handle].short} / ${kind}.md: ${cellLabel(cellState(handle, kind))}`"
                    ></span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="cw-matrix-legend">
            <span><i class="cw-cell is-identity"></i>Product identity (always sent when a product is in play)</span>
            <span><i class="cw-cell is-ranked"></i>Ranked section that made the cut</span>
            <span><i class="cw-cell is-none"></i>Left out</span>
          </div>
          <p class="cw-note">{{ matrixQueries[activeQuery].why }}</p>
        </div>

        <div class="cw-card cw-score">
          <p class="cw-card-label mono">How a chunk is scored</p>
          <div class="cw-formula">
            <div class="cw-term">
              <span class="cw-term-name">Intent</span>
              <span class="cw-term-math mono">text + 2×heading + filename</span>
              <span class="cw-term-note">token overlap after product names are stripped, so "creatine" alone can't win</span>
            </div>
            <span class="cw-plus">+</span>
            <div class="cw-term">
              <span class="cw-term-name">Product</span>
              <span class="cw-term-math mono">+10 named · +6 on page · +3 identity</span>
              <span class="cw-term-note">keeps answers anchored to what the shopper is looking at</span>
            </div>
            <span class="cw-plus">+</span>
            <div class="cw-term">
              <span class="cw-term-name">Suitability</span>
              <span class="cw-term-math mono">+5 safety &amp; suitability</span>
              <span class="cw-term-note">only when the remembered profile holds a health signal</span>
            </div>
          </div>
        </div>
      </div>

      <div class="cw-card cw-budget">
        <div class="cw-budget-head">
          <p class="cw-card-label mono">Context budget for one turn (32,000 characters)</p>
          <p class="cw-budget-sub">Example: “Strength work, 4x a week”. The guidance figure comes from the code; the rest are estimates.</p>
        </div>
        <div class="cw-budget-bar" role="img" :aria-label="budgetAria">
          <div
            v-for="seg in budgetSegments"
            :key="seg.label"
            class="cw-budget-seg"
            :class="{ 'is-free': seg.free, 'is-hover': hoverSeg === seg.label }"
            :style="{ flexGrow: seg.chars, background: seg.free ? null : seg.color }"
            @mouseenter="hoverSeg = seg.label"
            @mouseleave="hoverSeg = null"
          >
            <span v-if="hoverSeg === seg.label" class="cw-budget-tip">
              <strong>{{ seg.label }}</strong> {{ formatChars(seg.chars) }} chars
            </span>
          </div>
        </div>
        <ul class="cw-budget-legend">
          <li v-for="seg in budgetSegments" :key="seg.label">
            <i :class="{ 'is-free': seg.free }" :style="{ background: seg.free ? null : seg.color }"></i>
            <span>{{ seg.label }}</span>
            <strong class="mono">{{ formatChars(seg.chars) }}</strong>
          </li>
        </ul>
        <p class="cw-note">
          When a turn overflows, lower-ranked chunks are dropped whole and logged by file and heading, so a silent quality
          drop shows up in the server logs.
        </p>
      </div>
    </section>

    <!-- Architecture -->
    <section class="cw-section cw-arch" v-reveal>
      <p class="cw-kicker">05 · System architecture</p>
      <h2 class="cw-h2">Shopify at the edge, a small Node service in the middle</h2>
      <p class="cw-copy cw-copy--narrow">
        Select any component to see what it does. Dashed boxes are the parts I didn't build.
      </p>

      <div class="cw-arch-grid">
        <div class="cw-arch-canvas">
          <svg viewBox="0 0 1000 530" class="cw-arch-svg" role="group" aria-label="Architecture diagram">
            <defs>
              <marker id="cw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" class="cw-arrowhead" />
              </marker>
            </defs>

            <g class="cw-edges">
              <path
                v-for="edge in archEdges"
                :key="edge.id"
                :d="edge.d"
                class="cw-edge"
                :class="{ 'is-lit': edgeLit(edge) }"
                marker-end="url(#cw-arrow)"
              />
              <text
                v-for="edge in archEdges.filter(e => e.label)"
                :key="`${edge.id}-label`"
                :x="edge.lx"
                :y="edge.ly"
                class="cw-edge-label"
                :text-anchor="edge.anchor || 'middle'"
              >{{ edge.label }}</text>
            </g>

            <g
              v-for="node in archNodes"
              :key="node.id"
              class="cw-node"
              :class="[`is-${node.owner}`, { 'is-active': activeNode === node.id }]"
              tabindex="0"
              role="button"
              :aria-pressed="activeNode === node.id"
              :aria-label="node.title"
              @click="activeNode = node.id"
              @keydown.enter.prevent="activeNode = node.id"
              @keydown.space.prevent="activeNode = node.id"
            >
              <rect :x="node.x" :y="node.y" :width="node.w" :height="node.h" rx="16" />
              <text :x="node.x + 16" :y="node.y + 32" class="cw-node-title">{{ node.title }}</text>
              <text :x="node.x + 16" :y="node.y + 54" class="cw-node-sub">{{ node.sub }}</text>
            </g>
          </svg>
        </div>

        <aside class="cw-arch-detail" aria-live="polite">
          <p class="cw-owner-chip" :class="`is-${selectedNode.owner}`">{{ ownerLabel(selectedNode.owner) }}</p>
          <h3>{{ selectedNode.title }}</h3>
          <p class="cw-copy">{{ selectedNode.detail }}</p>
          <ul>
            <li v-for="point in selectedNode.points" :key="point">{{ point }}</li>
          </ul>
        </aside>
      </div>
    </section>

    <!-- Identity & affiliates -->
    <section class="cw-section cw-journey" v-reveal>
      <p class="cw-kicker">06 · Identity, memory &amp; attribution</p>
      <h2 class="cw-h2">From anonymous visitor to known customer, without guessing</h2>
      <p class="cw-copy cw-copy--narrow">
        Bella remembers people across visits, and partners earn commission on the customers they bring in. Both depend on
        tying a browser to a real Shopify customer, and doing it only when there's proof.
      </p>

      <ol class="cw-steps">
        <li v-for="(step, i) in journey" :key="step.title" class="cw-step">
          <span class="cw-step-num mono">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.copy }}</p>
          <code v-if="step.code" class="cw-step-code">{{ step.code }}</code>
        </li>
      </ol>

      <div class="cw-rules">
        <article v-for="rule in affiliateRules" :key="rule.value" class="cw-rule">
          <span class="cw-rule-value">{{ rule.value }}</span>
          <p>{{ rule.copy }}</p>
        </article>
      </div>
    </section>

    <!-- Admin -->
    <section class="cw-section cw-admin" v-reveal>
      <p class="cw-kicker">07 · Super admin</p>
      <h2 class="cw-h2">One place to run the store, the partners and the bot</h2>
      <p class="cw-copy cw-copy--narrow">
        The admin is a React Router app served from the Shopify app, backed by a dozen admin API routes. Below is a
        faithful recreation of four of its views. The real dashboard sits behind a login, so the figures here are sample data.
      </p>

      <div class="cw-admin-shell">
        <nav class="cw-admin-nav" aria-label="Admin views">
          <img :src="logoCharcoal" alt="Curated Wellness" class="cw-admin-logo" />
          <div v-for="group in adminNav" :key="group.label" class="cw-admin-group">
            <span class="cw-admin-group-label">{{ group.label }}</span>
            <button
              v-for="item in group.items"
              :key="item.view"
              type="button"
              class="cw-admin-link"
              :class="{ 'is-active': adminView === item.view, 'is-disabled': !item.demo }"
              :disabled="!item.demo"
              :aria-pressed="adminView === item.view"
              @click="adminView = item.view"
            >
              {{ item.label }}
            </button>
          </div>
        </nav>

        <div class="cw-admin-main">
          <div class="cw-admin-top">
            <h3>{{ adminTitle }}</h3>
            <span class="cw-sample mono">Sample data</span>
          </div>

          <!-- Chats -->
          <div v-if="adminView === 'chats'" class="cw-admin-chats">
            <ul class="cw-convos">
              <li
                v-for="(convo, i) in sampleConvos"
                :key="convo.id"
                :class="{ 'is-active': activeConvo === i }"
                @click="activeConvo = i"
              >
                <strong>{{ convo.who }}</strong>
                <span>{{ convo.preview }}</span>
                <small class="mono">{{ convo.meta }}</small>
              </li>
            </ul>
            <div class="cw-convo">
              <div class="cw-convo-meta">
                <span v-for="fact in sampleConvos[activeConvo].facts" :key="fact" class="cw-fact">{{ fact }}</span>
              </div>
              <div
                v-for="(line, i) in sampleConvos[activeConvo].lines"
                :key="i"
                class="cw-msg"
                :class="line.role === 'user' ? 'cw-msg--user' : 'cw-msg--bella'"
              >
                <p>{{ line.text }}</p>
              </div>
            </div>
          </div>

          <!-- Site health -->
          <div v-else-if="adminView === 'health'" class="cw-admin-health">
            <div class="cw-kpis">
              <div v-for="kpi in healthKpis" :key="kpi.label" class="cw-kpi">
                <span class="cw-kpi-label">{{ kpi.label }}</span>
                <span class="cw-kpi-value">{{ kpi.value }}</span>
                <span class="cw-kpi-note">{{ kpi.note }}</span>
              </div>
            </div>

            <div class="cw-chart">
              <p class="cw-chart-title">p95 API response time, last 30 days (ms)</p>
              <div class="cw-chart-plot" @mouseleave="hoverDay = null">
                <svg :viewBox="`0 0 ${chart.w} ${chart.h}`" class="cw-chart-svg" role="img" :aria-label="chartAria">
                  <g class="cw-grid">
                    <g v-for="tick in chart.ticks" :key="tick">
                      <line :x1="chart.left" :x2="chart.w - chart.right" :y1="yScale(tick)" :y2="yScale(tick)" />
                      <text :x="chart.left - 8" :y="yScale(tick) + 4" text-anchor="end">{{ tick }}</text>
                    </g>
                    <text
                      v-for="i in [0, 9, 19, 29]"
                      :key="`x${i}`"
                      :x="xScale(i)"
                      :y="chart.h - 6"
                      text-anchor="middle"
                    >{{ dayLabel(i) }}</text>
                  </g>
                  <path :d="p95Path" class="cw-chart-line" />
                  <g v-if="hoverDay !== null">
                    <line
                      class="cw-crosshair"
                      :x1="xScale(hoverDay)"
                      :x2="xScale(hoverDay)"
                      :y1="chart.top"
                      :y2="chart.h - chart.bottom"
                    />
                    <circle class="cw-chart-dot" :cx="xScale(hoverDay)" :cy="yScale(p95Series[hoverDay])" r="5" />
                  </g>
                  <rect
                    :x="chart.left"
                    :y="chart.top"
                    :width="chart.w - chart.left - chart.right"
                    :height="chart.h - chart.top - chart.bottom"
                    fill="transparent"
                    @mousemove="onChartMove"
                  />
                </svg>
                <div
                  v-if="hoverDay !== null"
                  class="cw-chart-tip"
                  :style="{ left: `${(xScale(hoverDay) / chart.w) * 100}%` }"
                >
                  <span>{{ dayLabel(hoverDay) }}</span>
                  <strong>{{ p95Series[hoverDay] }} ms</strong>
                </div>
              </div>
            </div>

            <div class="cw-incident">
              <span class="cw-status-icon" aria-hidden="true">✓</span>
              <div>
                <strong>Resolved incident · day 18</strong>
                <p>External probe failed twice. One alert email was sent when the incident opened, and the incident closed automatically when probes recovered.</p>
              </div>
            </div>
          </div>

          <!-- Chatbot context -->
          <div v-else-if="adminView === 'context'" class="cw-admin-context">
            <ul class="cw-files mono">
              <li class="cw-files-group">guidance</li>
              <li
                v-for="file in contextFiles"
                :key="file.path"
                :class="{ 'is-active': activeFile === file.path }"
                @click="activeFile = file.path"
              >
                {{ file.path }}
                <span v-if="file.override" class="cw-override">edited</span>
              </li>
              <li class="cw-files-group">products / creatine-monohydrate</li>
              <li class="cw-files-dim">attributes.md · usage.md · safety.md …</li>
            </ul>
            <div class="cw-editor">
              <div class="cw-editor-bar mono">
                <span>{{ activeFile }}</span>
                <span v-if="currentFile.override" class="cw-editor-state">Override saved · revision 4 · base hash matches repo</span>
                <span v-else class="cw-editor-state">Repo version</span>
              </div>
              <pre class="cw-editor-body mono">{{ currentFile.body }}</pre>
              <div class="cw-editor-actions">
                <span class="cw-btn cw-btn--small">Save override</span>
                <span class="cw-btn cw-btn--small cw-btn--quiet">Reset to repo</span>
              </div>
            </div>
          </div>

          <!-- Affiliates -->
          <div v-else-if="adminView === 'affiliates'" class="cw-admin-affiliates">
            <div class="cw-table-wrap">
              <table class="cw-table">
                <thead>
                  <tr>
                    <th scope="col">Partner</th>
                    <th scope="col">Link</th>
                    <th scope="col">Rate</th>
                    <th scope="col">Customers</th>
                    <th scope="col" class="num">Earned</th>
                    <th scope="col" class="num">Clawed back</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sampleAffiliates" :key="row.slug">
                    <td>{{ row.name }}<small>{{ row.type }}</small></td>
                    <td class="mono">/{{ row.slug }}</td>
                    <td>{{ row.rate }}</td>
                    <td>{{ row.customers }}</td>
                    <td class="num mono">{{ row.earned }}</td>
                    <td class="num mono">{{ row.clawback }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="cw-note">
              Partners are invited by email through AWS SES, set their own password, and get a portal with their link and stats.
              Payouts are tracked here and paid manually.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Reliability -->
    <section class="cw-section cw-reliability" v-reveal>
      <p class="cw-kicker">08 · Engineering for a real business</p>
      <h2 class="cw-h2">Decisions I'd defend in a code review</h2>
      <div class="cw-decisions">
        <article v-for="item in decisions" :key="item.title" class="cw-decision">
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </div>

      <div class="cw-incident-story">
        <div>
          <p class="cw-kicker">Post-incident</p>
          <h3>29 September 2026: an admin deploy overwrote the live theme</h3>
        </div>
        <p>
          A deployment workflow pushed a stale theme folder every time it ran, including during an admin-only release.
          I restored the storefront from the last good copy of the theme, then made the pipeline never push a theme by
          default, wrote theme safety rules into the repo's agent and deploy docs, and added a pull-before-edit workflow so
          changes made in Shopify can't be silently lost again.
        </p>
      </div>
    </section>

    <!-- Brand gallery -->
    <section class="cw-section cw-gallery-section" v-reveal>
      <p class="cw-kicker">09 · The product knowledge Bella works from</p>
      <h2 class="cw-h2">Four products, written down once and used everywhere</h2>
      <p class="cw-copy cw-copy--narrow">
        Bella's usage answers come from the same approved directions as the brand's packaging guides. Imagery by the
        Curated Wellness design team.
      </p>
      <div class="cw-gallery">
        <figure v-for="handle in galleryOrder" :key="handle" class="cw-gallery-item">
          <img :src="products[handle].image" :alt="`How to take ${products[handle].name}`" loading="lazy" />
          <figcaption>
            <strong>{{ products[handle].name }}</strong>
            <span>{{ products[handle].fact }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- Timeline -->
    <section class="cw-section cw-timeline-section" v-reveal>
      <p class="cw-kicker">10 · Delivery</p>
      <h2 class="cw-h2">Six months from prototype to the owner's store</h2>
      <ol class="cw-timeline">
        <li v-for="item in timeline" :key="item.month">
          <span class="cw-timeline-month mono">{{ item.month }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </li>
      </ol>
    </section>

    <!-- Closing -->
    <section class="cw-close" v-reveal>
      <div>
        <p class="cw-kicker cw-kicker--light">What this project shows</p>
        <h2 class="cw-close-title">Production AI that a small business can trust and run on its own</h2>
        <ul class="cw-close-list">
          <li v-for="skill in takeaways" :key="skill">{{ skill }}</li>
        </ul>
        <p class="cw-close-stack mono">{{ project.stack.join(' · ') }}</p>
      </div>
      <a class="cw-btn cw-btn--light" :href="liveUrl" target="_blank" rel="noopener">Visit curatedwellness.co.nz ↗</a>
    </section>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryTag from '../components/CategoryTag.vue'

import logoCharcoal from '../assets/curated-wellness/logo-charcoal.png'
import collagenImg from '../assets/curated-wellness/how-to-collagen.jpg'
import creatineImg from '../assets/curated-wellness/how-to-creatine.jpg'
import electrolytesImg from '../assets/curated-wellness/how-to-electrolytes.jpg'
import proteinImg from '../assets/curated-wellness/how-to-protein.jpg'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const liveUrl = computed(() => props.project.liveUrl || 'https://curatedwellness.co.nz')

// Fade sections in as they enter the viewport.
const vReveal = {
  mounted(el) {
    el.classList.add('cw-reveal')
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          el.classList.add('is-visible')
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observer.observe(el)
    el._cwObserver = observer
  },
  unmounted(el) {
    el._cwObserver?.disconnect()
  }
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const heroStats = [
  { value: '14k+', label: 'lines of backend, admin and widget code' },
  { value: '130', label: 'automated tests across 16 suites' },
  { value: '14', label: 'Postgres tables on AWS RDS' },
  { value: '35+', label: 'API and Shopify proxy routes' }
]

const ownership = [
  { name: 'Storefront theme & page design', detail: 'Layouts, branding and content pages', mine: false },
  { name: 'Bella chat widget', detail: 'Theme app extension: chat UI, product cards, guided journey, cart bridge', mine: true },
  { name: 'Shopify app & App Proxy', detail: 'React Router 7 + Prisma, signed proxy routes, order webhooks', mine: true },
  { name: 'AI backend', detail: 'Retrieval, guardrails, structured output, repair pass, memory', mine: true },
  { name: 'Data, identity & affiliates', detail: 'Postgres schema, customer linking, commission ledger', mine: true },
  { name: 'Super admin & partner portal', detail: 'Chats, orders, payouts, site health, context editor', mine: true },
  { name: 'Infrastructure', detail: 'EC2, RDS, SES, Secrets Manager, deploy scripts, health probes', mine: true }
]

onBeforeUnmount(() => {
  clearTimeout(typingTimer)
})

// ---------------------------------------------------------------------------
// Bella replay
// ---------------------------------------------------------------------------

const products = {
  creatine: {
    name: 'Creatine Monohydrate',
    short: 'Creatine',
    tag: 'Strength & power',
    fact: '5 g once daily · 56 serves per tin',
    image: creatineImg
  },
  whey: {
    name: 'Whey Protein',
    short: 'Whey',
    tag: 'Recovery nutrition',
    fact: 'One 25 g scoop · 300–350 ml liquid',
    image: proteinImg
  },
  electrolytes: {
    name: 'Electrolyte Hydration Blend',
    short: 'Electrolytes',
    tag: 'Hydration & minerals',
    fact: 'Mineral replacement for sweat, heat and travel',
    image: electrolytesImg
  },
  collagen: {
    name: 'Collagen Peptides',
    short: 'Collagen',
    tag: 'Daily support',
    fact: 'Daily structural protein support',
    image: collagenImg
  }
}

const pipelineStages = [
  { id: 'guardrail', name: 'Request guardrail', idle: 'Pattern checks for medical advice, urgent symptoms and prompt injection run before anything else.' },
  { id: 'retrieval', name: 'Context retrieval', idle: 'Ranks markdown chunks against the message, page and remembered profile.' },
  { id: 'model', name: 'Model call', idle: 'OpenAI Responses API with a strict JSON schema for the reply.' },
  { id: 'guards', name: 'Response guards', idle: 'Deterministic rules on top of the model: recommendation, tone and length checks.' },
  { id: 'memory', name: 'Memory & storage', idle: 'Messages and the shopper profile are written to Postgres before the reply returns.' }
]

const MEDICAL_COPY =
  "I can't provide medical advice or assess whether a supplement is safe for your individual circumstances."
const MEDICAL_NOTICE =
  'Please speak with a qualified healthcare professional who knows your medical history and medications.'

const turns = {
  goal: {
    user: 'I want to recover better after training',
    bella: 'Good goal. To point you at the right thing, what kind of training fills most of your week?',
    products: [],
    options: [
      { label: 'Strength work, 4x a week', next: 'strength' },
      { label: 'Running and longer sessions', next: 'endurance' }
    ],
    pipeline: {
      guardrail: { state: 'pass', text: 'No medical-advice or off-role pattern matched. The request continues to the model.' },
      retrieval: {
        state: 'run',
        text: 'Six always-on guidance files, plus ranked sections that match "recover" and "training".',
        chunks: ['brand.md', 'response-style.md', 'safety.md', 'recommendations.md', 'whey-protein/attributes.md', 'electrolyte-hydration-blend/attributes.md']
      },
      model: { state: 'run', text: 'gpt-5-mini returns message, products, quickReplies, safetyNotice and an updated shopperProfile as schema-checked JSON.' },
      guards: { state: 'warn', text: 'Broad goal with no routine or limitation yet, so product cards are held back until Bella knows more. Quick replies are capped at five.' },
      memory: { state: 'run', text: 'Shopper profile updated (goals: recovery) and saved against the visitor cookie.' }
    }
  },
  strength: {
    user: 'Strength work, 4x a week',
    bella:
      'For strength sessions four times a week, creatine is the clearest fit. It supports repeated high-effort sets and is just one 5 g serve a day.',
    products: ['creatine'],
    options: [
      { label: 'How do I take creatine?', next: 'usage' },
      { label: "I'm pregnant, is creatine okay?", next: 'pregnant' }
    ],
    pipeline: {
      guardrail: { state: 'pass', text: 'Clear. Nothing in the message needs individual medical advice.' },
      retrieval: {
        state: 'run',
        text: 'Routine words ("strength", "4x a week") lift creatine sections. The product identity chunk joins automatically.',
        chunks: ['creatine-monohydrate/attributes.md', 'creatine-monohydrate/science.md', 'creatine-monohydrate/suitability.md', 'recommendations.md']
      },
      model: { state: 'run', text: 'The model returns product handles, not free text. Unknown handles are discarded, so it can never invent a product.' },
      guards: { state: 'pass', text: 'Goal plus routine meets the readiness rules, so cards are allowed. Products named in the text get a card, and the product on the current page is never re-recommended.' },
      memory: { state: 'run', text: 'Profile adds routine (strength, 4x/week) and the recommended product, so later turns don\'t repeat it.' }
    }
  },
  endurance: {
    user: 'Running and longer sessions',
    bella:
      'For longer sessions, the Electrolyte Hydration Blend is the best fit. It supports hydration and helps replace minerals lost through sweat.',
    products: ['electrolytes'],
    options: [{ label: "I'm pregnant, is this okay?", next: 'pregnant' }],
    pipeline: {
      guardrail: { state: 'pass', text: 'Clear. Hydration questions stay within the allowed claims.' },
      retrieval: {
        state: 'run',
        text: '"Running" and "longer" match electrolyte usage and science sections, which outrank everything else.',
        chunks: ['electrolyte-hydration-blend/attributes.md', 'electrolyte-hydration-blend/usage.md', 'electrolyte-hydration-blend/science.md', 'recommendations.md']
      },
      model: { state: 'run', text: 'Structured reply with one product handle and no safety notice.' },
      guards: { state: 'pass', text: 'Copy is checked against the allowed-claims rules. Electrolytes are framed as hydration support, never as a treatment for cramps or dehydration illness.' },
      memory: { state: 'run', text: 'Profile adds routine (running, long sessions). Stored with the transcript.' }
    }
  },
  usage: {
    user: 'How do I take creatine?',
    bella:
      'One 5 g serve once a day, mixed into water or any drink. Timing is flexible, so morning, after training or with a meal all work. A 280 g tin gives you 56 serves.',
    products: [],
    options: [{ label: "I'm pregnant, is creatine okay?", next: 'pregnant' }],
    pipeline: {
      guardrail: { state: 'pass', text: 'Clear. Usage questions are the core job.' },
      retrieval: {
        state: 'run',
        text: 'Product name tokens are stripped before scoring, so the intent words "take" and "how" decide which sections win.',
        chunks: ['creatine-monohydrate/attributes.md', 'creatine-monohydrate/usage.md#Daily Maintenance', 'creatine-monohydrate/usage.md#Timing', 'creatine-monohydrate/usage.md#Pack Yield']
      },
      model: { state: 'run', text: 'Answers only from the approved 5 g direction. The context forbids loading phases or higher doses.' },
      guards: { state: 'pass', text: 'Creatine was already recommended, so no duplicate card. Replies over three sentences or repeating the last question get one repair pass.' },
      memory: { state: 'run', text: 'Conversation state records the question so Bella doesn\'t ask the same thing twice.' }
    }
  },
  pregnant: {
    user: "I'm pregnant, is creatine okay?",
    bella: MEDICAL_COPY,
    safetyNotice: MEDICAL_NOTICE,
    products: [],
    options: [],
    pipeline: {
      guardrail: { state: 'block', text: 'Matched a medical-advice pattern (pregnancy plus "okay"). The backend answers with fixed, reviewed copy.' },
      retrieval: { state: 'skip', text: 'Skipped. No context is assembled.' },
      model: { state: 'skip', text: 'Not called. No tokens spent, and no chance of an improvised medical answer.' },
      guards: { state: 'skip', text: 'Skipped. The guardrail copy is already final.' },
      memory: { state: 'run', text: 'Both messages are still stored, so the admin Chats view shows the full conversation.' }
    }
  }
}

const GREETING = "Hi, I'm Bella. Tell me what you're training for, or ask me about any of our products."
const openingOptions = [
  { label: 'I want to recover better after training', next: 'goal' },
  { label: 'How do I take creatine?', next: 'usage' },
  { label: "I'm pregnant, is creatine okay?", next: 'pregnant' }
]

const transcript = ref([{ role: 'bella', text: GREETING }])
const currentOptions = ref(openingOptions)
const activeTurn = ref(null)
const typing = ref(false)
const chatLog = ref(null)
let typingTimer = null

function scrollChat() {
  nextTick(() => {
    if (chatLog.value) chatLog.value.scrollTop = chatLog.value.scrollHeight
  })
}

function choose(option) {
  const turn = turns[option.next]
  transcript.value.push({ role: 'user', text: option.label })
  currentOptions.value = []
  activeTurn.value = { ...turn, user: option.label }
  typing.value = true
  scrollChat()

  typingTimer = setTimeout(() => {
    typing.value = false
    transcript.value.push({
      role: 'bella',
      text: turn.bella,
      safetyNotice: turn.safetyNotice,
      products: turn.products
    })
    currentOptions.value = turn.options
    scrollChat()
  }, 900)
}

function resetChat() {
  clearTimeout(typingTimer)
  typing.value = false
  transcript.value = [{ role: 'bella', text: GREETING }]
  currentOptions.value = openingOptions
  activeTurn.value = null
}

function stageState(id) {
  return activeTurn.value ? activeTurn.value.pipeline[id].state : 'idle'
}

function stateLabel(state) {
  return { idle: 'waiting', pass: 'passed', run: 'ran', warn: 'adjusted', block: 'stopped', skip: 'skipped' }[state]
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

const contextKinds = ['attributes', 'ingredients', 'science', 'usage', 'suitability', 'safety', 'faq']
const matrixProducts = ['creatine', 'whey', 'electrolytes', 'collagen']

const matrixQueries = [
  {
    text: 'How do I take creatine?',
    cells: { creatine: { attributes: 'identity', usage: 'ranked', faq: 'ranked' } },
    why: 'A named product gets +10, and its usage sections win on intent. Other products score zero and stay out.'
  },
  {
    text: 'Is whey okay if I avoid lactose?',
    cells: { whey: { attributes: 'identity', ingredients: 'ranked', suitability: 'ranked', safety: 'ranked', faq: 'ranked' } },
    why: 'The profile now holds an avoidance, so safety and suitability sections get a +5 boost on top of their intent score.'
  },
  {
    text: 'Something for hydration on hot runs',
    cells: {
      electrolytes: { attributes: 'identity', usage: 'ranked', science: 'ranked', suitability: 'ranked' }
    },
    why: 'No product is named, so retrieval matches on intent words ("hydration", "hot", "runs") across the catalogue. The electrolyte sections come out on top.'
  }
]

const activeQuery = ref(0)

function cellState(handle, kind) {
  return matrixQueries[activeQuery.value].cells[handle]?.[kind] || 'none'
}

function cellLabel(state) {
  return { identity: 'product identity', ranked: 'ranked and included', none: 'not included' }[state]
}

const CONTEXT_BUDGET = 32000
const budgetUsed = [
  { label: 'Always-on guidance (6 files)', chars: 17000, color: '#5b6fb5' },
  { label: 'Product identity', chars: 2600, color: '#c8643a' },
  { label: 'Ranked sections', chars: 7400, color: '#1a9480' }
]
const budgetSegments = [
  ...budgetUsed,
  { label: 'Headroom', chars: CONTEXT_BUDGET - budgetUsed.reduce((sum, seg) => sum + seg.chars, 0), free: true }
]
const hoverSeg = ref(null)

function formatChars(n) {
  return n.toLocaleString('en-NZ')
}

const budgetAria = computed(() =>
  `Context budget: ${budgetSegments.map(seg => `${seg.label} ${formatChars(seg.chars)} characters`).join(', ')}`
)

// ---------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------

const archNodes = [
  {
    id: 'browser', x: 20, y: 60, w: 200, h: 96, owner: 'me',
    title: 'Shopper browser', sub: 'Bella widget · cart bridge',
    detail: 'A Shopify theme app extension injects Bella on every page. It owns the chat UI, product cards and guided journey, and keeps a visitor cookie.',
    points: ['Persistent visitor cookie identifies the browser across visits', 'Cart bridge posts every cart change, including emptying it', 'Stamps visitor and referral IDs onto cart attributes so they flow into the order']
  },
  {
    id: 'storefront', x: 270, y: 60, w: 200, h: 96, owner: 'team',
    title: 'Shopify storefront', sub: 'Theme by design team',
    detail: 'The premium theme and page design were built by the brand\'s design team. I integrated with it but didn\'t build it.',
    points: ['Hosts the widget blocks I built', 'Native Customer Privacy banner gates referral cookies']
  },
  {
    id: 'app', x: 520, y: 60, w: 210, h: 96, owner: 'me',
    title: 'Shopify app', sub: 'React Router 7 · Prisma',
    detail: 'The public edge. Storefront calls arrive through Shopify\'s App Proxy, so every request is signed by Shopify and can carry the logged-in customer ID.',
    points: ['Verifies App Proxy signatures and webhook HMACs', 'Hosts the super admin and partner portal UI', 'Forwards to the backend with a shared service token']
  },
  {
    id: 'webhooks', x: 780, y: 60, w: 200, h: 96, owner: 'external',
    title: 'Shopify webhooks', sub: 'orders/create · orders/paid',
    detail: 'Order events are where a browser becomes a known customer and where affiliate commission is earned.',
    points: ['Ingested in a single database transaction', 'A 503 on failure means Shopify retries it automatically']
  },
  {
    id: 'secrets', x: 20, y: 245, w: 200, h: 80, owner: 'external',
    title: 'Secrets Manager', sub: 'RDS password, rotated',
    detail: 'The database password is fetched for each new connection and fetched again if Postgres rejects it, so rotation never needs a redeploy.',
    points: ['No .env files shipped to the server', 'TLS to RDS verified against the bundled CA']
  },
  {
    id: 'admin', x: 270, y: 245, w: 200, h: 80, owner: 'me',
    title: 'Super admin', sub: 'Chats · orders · health',
    detail: 'The operating console for the business: conversations, customers, orders, partners, payouts, site health and the chatbot knowledge editor.',
    points: ['Session-based admin login', 'Context edits stored as Postgres overrides with revisions', 'Date-range filters on dashboards']
  },
  {
    id: 'backend', x: 520, y: 230, w: 210, h: 110, owner: 'me',
    title: 'Bella backend', sub: 'Node.js · one dependency',
    detail: 'A plain Node HTTP service with a single npm dependency (pg). It handles retrieval, the model call, guardrails, memory, affiliates and the admin APIs.',
    points: ['Token-authenticated, never public', 'Schema created and migrated on startup', 'Records latency for every request for the health dashboard']
  },
  {
    id: 'openai', x: 790, y: 245, w: 190, h: 80, owner: 'external',
    title: 'OpenAI', sub: 'Responses API · gpt-5-mini',
    detail: 'The only model call. Output is constrained to a JSON schema, and the backend still validates every field before using it.',
    points: ['Optional second repair pass on quality violations', 'Model is configurable by environment variable']
  },
  {
    id: 'cron', x: 270, y: 430, w: 200, h: 80, owner: 'me',
    title: 'Health probe', sub: 'EC2 cron · every 5 min',
    detail: 'An external probe calls the health endpoint, records the result, and opens or resolves incidents with one alert email per incident.',
    points: ['Health returns 200 only if the database answers', 'Drives uptime and p50–p99 charts in the admin']
  },
  {
    id: 'postgres', x: 520, y: 420, w: 210, h: 96, owner: 'me',
    title: 'PostgreSQL', sub: 'AWS RDS · 14 tables',
    detail: 'Visitors, customers, conversations, carts, orders, purchases, affiliates, payouts, enquiries, health data and chatbot context overrides.',
    points: ['Private to the VPC, reachable only from EC2', 'Upserts keyed by order and line identity']
  },
  {
    id: 'ses', x: 790, y: 430, w: 190, h: 80, owner: 'external',
    title: 'AWS SES', sub: 'Invites · alerts',
    detail: 'Transactional email for partner invites, enquiry notifications and health alerts.',
    points: ['Verified sender domain', 'One email per incident, not per failed probe']
  }
]

const archEdges = [
  { id: 'b-s', from: 'browser', to: 'storefront', d: 'M220 108 L266 108' },
  { id: 's-a', from: 'storefront', to: 'app', d: 'M470 108 L516 108', label: 'App Proxy', lx: 495, ly: 96 },
  { id: 'w-a', from: 'webhooks', to: 'app', d: 'M780 108 L734 108', label: 'HMAC', lx: 757, ly: 96 },
  { id: 'a-b', from: 'app', to: 'backend', d: 'M625 156 L625 226', label: 'service token', lx: 635, ly: 196, anchor: 'start' },
  { id: 'ad-b', from: 'admin', to: 'backend', d: 'M470 285 L516 285' },
  { id: 'b-o', from: 'backend', to: 'openai', d: 'M730 285 L786 285', label: 'JSON schema', lx: 758, ly: 273 },
  { id: 'b-p', from: 'backend', to: 'postgres', d: 'M625 340 L625 416' },
  { id: 'sec-b', from: 'secrets', to: 'backend', d: 'M120 325 C 120 385, 460 385, 540 344' },
  { id: 'c-b', from: 'cron', to: 'backend', d: 'M440 430 C 470 395, 520 380, 560 344', label: '/health', lx: 455, ly: 400, anchor: 'end' },
  { id: 'c-p', from: 'cron', to: 'postgres', d: 'M470 470 L516 470' },
  { id: 'b-ses', from: 'backend', to: 'ses', d: 'M730 325 C 790 345, 885 370, 885 426' }
]

const activeNode = ref('backend')
const selectedNode = computed(() => archNodes.find(node => node.id === activeNode.value))

function edgeLit(edge) {
  return edge.from === activeNode.value || edge.to === activeNode.value
}

function ownerLabel(owner) {
  return { me: 'Built by me', team: 'Design team', external: 'Managed service' }[owner]
}

// ---------------------------------------------------------------------------
// Identity & affiliates
// ---------------------------------------------------------------------------

const journey = [
  {
    title: 'Click a partner link',
    copy: 'A trainer shares their link. After cookie consent, a 30-day referral cookie is set.',
    code: '/ruby → ?ref=ruby'
  },
  {
    title: 'Chat as an anonymous visitor',
    copy: 'Every message is tied to the browser\'s visitor ID. Bella restores the last ten messages and the shopper profile on each turn.',
    code: '_cw_vid'
  },
  {
    title: 'Add to cart',
    copy: 'Cart snapshots keep variants, flavours, quantities and prices. Visitor and referral IDs are stamped onto cart attributes.',
    code: 'cart.attributes'
  },
  {
    title: 'Check out',
    copy: 'The order webhook links the visitor to a customer by Shopify ID first, then by an unambiguous email match. Names and phone numbers never merge records.',
    code: 'orders/create'
  },
  {
    title: 'Remembered everywhere',
    copy: 'Once signed in, Bella can see purchase history on any device. A guest browser only ever sees its own orders.',
    code: 'logged_in_customer_id'
  }
]

const affiliateRules = [
  { value: '10%', copy: 'Default commission on attributed orders, adjustable per partner.' },
  { value: '30 days', copy: 'Window for a click to bind a customer to a partner on their first purchase.' },
  { value: 'Lifetime', copy: 'Once bound, every future order earns the partner commission. First partner wins.' },
  { value: 'Clawback', copy: 'Refunded or cancelled orders reverse their commission automatically.' }
]

// ---------------------------------------------------------------------------
// Admin recreation
// ---------------------------------------------------------------------------

const adminNav = [
  {
    label: 'Store',
    items: [
      { view: 'orders', label: 'Orders' },
      { view: 'customers', label: 'Customers' },
      { view: 'chats', label: 'Chats', demo: true }
    ]
  },
  {
    label: 'Partners',
    items: [
      { view: 'affiliates', label: 'Affiliates', demo: true },
      { view: 'payouts', label: 'Payouts' }
    ]
  },
  {
    label: 'System',
    items: [
      { view: 'health', label: 'Site health', demo: true },
      { view: 'context', label: 'Chatbot context', demo: true }
    ]
  }
]

const adminView = ref('chats')
const adminTitle = computed(() =>
  adminNav.flatMap(group => group.items).find(item => item.view === adminView.value)?.label
)

const sampleConvos = [
  {
    id: 'c1',
    who: 'Sam R. · signed in',
    preview: 'How do I take creatine?',
    meta: '6 messages · 2h ago',
    facts: ['Customer · 2 orders', 'Cart: Creatine 280 g', 'Referred by /ruby'],
    lines: [
      { role: 'user', text: 'I want to recover better after training' },
      { role: 'bella', text: 'Good goal. To point you at the right thing, what kind of training fills most of your week?' },
      { role: 'user', text: 'Strength work, 4x a week' },
      { role: 'bella', text: 'For strength sessions four times a week, creatine is the clearest fit. It supports repeated high-effort sets and is just one 5 g serve a day.' },
      { role: 'user', text: 'How do I take creatine?' },
      { role: 'bella', text: 'One 5 g serve once a day, mixed into water or any drink. A 280 g tin gives you 56 serves.' }
    ]
  },
  {
    id: 'c2',
    who: 'Visitor 8f2c…',
    preview: 'Something for hydration on hot runs',
    meta: '2 messages · yesterday',
    facts: ['Anonymous visitor', 'Cart: empty'],
    lines: [
      { role: 'user', text: 'Something for hydration on hot runs' },
      { role: 'bella', text: 'The Electrolyte Hydration Blend is the best fit. It supports hydration and helps replace minerals lost through sweat on long or hot sessions.' }
    ]
  },
  {
    id: 'c3',
    who: 'Visitor 1a7e…',
    preview: "I'm pregnant, is creatine okay?",
    meta: '2 messages · 3 days ago',
    facts: ['Guardrail: medical_advice_required'],
    lines: [
      { role: 'user', text: "I'm pregnant, is creatine okay?" },
      { role: 'bella', text: `${MEDICAL_COPY} ${MEDICAL_NOTICE}` }
    ]
  }
]
const activeConvo = ref(0)

const healthKpis = [
  { label: 'Uptime', value: '99.93%', note: '8,640 probes' },
  { label: 'p50 response', value: '148 ms', note: 'external probe' },
  { label: 'p95 response', value: '412 ms', note: 'external probe' },
  { label: 'p99 response', value: '690 ms', note: 'external probe' }
]

// Deterministic sample series so the chart is stable between renders.
const p95Series = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin(i / 3.2) * 38 + Math.cos(i / 1.7) * 22
  const spike = i === 17 ? 310 : i === 18 ? 160 : 0
  return Math.round(390 + wave + spike)
})

const chart = { w: 640, h: 220, left: 46, right: 14, top: 14, bottom: 30, max: 800, ticks: [0, 200, 400, 600, 800] }

function xScale(i) {
  return chart.left + (i / (p95Series.length - 1)) * (chart.w - chart.left - chart.right)
}

function yScale(v) {
  return chart.h - chart.bottom - (v / chart.max) * (chart.h - chart.top - chart.bottom)
}

const p95Path = computed(() => p95Series.map((v, i) => `${i ? 'L' : 'M'}${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' '))
const chartAria = computed(() => {
  const peak = Math.max(...p95Series)
  return `Line chart of p95 response time over 30 days, mostly between 330 and 450 ms with one spike to ${peak} ms on day ${p95Series.indexOf(peak) + 1}.`
})

function dayLabel(i) {
  return i === 29 ? 'Today' : `Day ${i + 1}`
}

const hoverDay = ref(null)

function onChartMove(event) {
  const svg = event.currentTarget.ownerSVGElement
  const rect = svg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * chart.w
  const ratio = (x - chart.left) / (chart.w - chart.left - chart.right)
  hoverDay.value = Math.min(p95Series.length - 1, Math.max(0, Math.round(ratio * (p95Series.length - 1))))
}

const contextFiles = [
  {
    path: 'recommendations.md',
    override: true,
    body: `# Recommendation Rules

## Readiness

- Vague goal: ask discovery and return no product
  recommendations.
- Clear activity or goal but no blockers: ask what is
  holding them back.
- Clear goal/problem plus blocker and relevant context:
  recommend the best fit and explain why using their context.`
  },
  {
    path: 'safety.md',
    body: `# Supplement Safety And Allowed Claims

## Allowed Positioning

- Use "supports", "helps maintain", "can fit into", and
  "may be useful for".
- Mention product facts only when present in the available
  product information.`
  },
  {
    path: 'response-style.md',
    body: `# Response Style Guide

## Word Choice

- Do not mention the chatbot, prompt, developer setup,
  system, supplied markdown or knowledge context.
- Avoid recurring permission phrases such as "If you want,
  I can help". Once the shopper agrees, move straight into
  guidance.`
  },
  {
    path: 'brand.md',
    body: `# Brand Voice

## Tone

- Calm, precise, helpful, and premium without being theatrical.
- Specific enough to be useful, but never pushy.
- Short paragraphs are preferred in chat.`
  }
]
const activeFile = ref('recommendations.md')
const currentFile = computed(() => contextFiles.find(file => file.path === activeFile.value))

const sampleAffiliates = [
  { name: 'Ruby T.', type: 'Personal trainer', slug: 'ruby', rate: '10%', customers: 18, earned: '$412.60', clawback: '−$24.90' },
  { name: 'Jordan P.', type: 'Personal trainer', slug: 'jordan', rate: '12%', customers: 31, earned: '$788.15', clawback: '$0.00' },
  { name: 'Mia K.', type: 'Affiliate', slug: 'mia', rate: '10%', customers: 7, earned: '$139.40', clawback: '$0.00' }
]

// ---------------------------------------------------------------------------
// Narrative content
// ---------------------------------------------------------------------------

const decisions = [
  {
    title: 'Fail loudly, never lose a message',
    copy: 'Each message is stored before the reply is generated, and the reply is stored before it returns. If the database is down, chat returns a 503 instead of an unrecorded conversation.'
  },
  {
    title: 'Atomic order ingestion',
    copy: 'Identity, order lines and commission are written in one transaction. Webhook retries upsert by order and line ID, so a retried webhook never double-counts.'
  },
  {
    title: 'Privacy by proof',
    copy: 'Purchase history appears only after a verified login or a verified order link. Anything typed into the chat, such as a name or email, never unlocks it.'
  },
  {
    title: 'Deterministic rules around the model',
    copy: 'The LLM writes the words. Code decides when products may appear, which handles are real, how long replies are, and when a medical question never reaches the model.'
  },
  {
    title: 'Client-editable knowledge',
    copy: 'The founder edits Bella\'s knowledge in the admin. Edits are stored as overrides on top of the repo files and can be reset with one click.'
  },
  {
    title: 'Boring, cheap infrastructure',
    copy: 'One EC2 box, one small RDS instance, a one-dependency Node service. It\'s cheap to run, easy to reason about, and has 130 tests behind it.'
  }
]

const galleryOrder = ['creatine', 'whey', 'electrolytes', 'collagen']

const timeline = [
  { month: 'May 2026', title: 'Prototype', copy: 'Chat UI and backend talking end to end. Built the retrieval approach to keep context small, then added the guided journey and product cards.' },
  { month: 'Jun 2026', title: 'Into the storefront', copy: 'Moved the widget into the Shopify theme, wired product pages and bundles, set up the domains and took the backend live.' },
  { month: 'Jul 2026', title: 'Lock-down & admin', copy: 'Added access restrictions on the chat API, the first admin pages and SES email, then reworked the super admin.' },
  { month: 'Aug 2026', title: 'Postgres & memory', copy: 'Moved to RDS, relinked carts, and built visitor, customer and purchase memory across the new theme.' },
  { month: 'Sep 2026', title: 'Admin redesign', copy: 'Linked the admin and partner portal to the new theme, added the context editor, and hardened deploys after the theme incident.' },
  { month: 'Oct 2026', title: "Owner's store", copy: 'Tested chats, carts, payments and purchase history end to end, then started the move to the owner\'s Shopify store.' }
]

const takeaways = [
  'Shipping an LLM feature with guardrails a non-technical client can rely on',
  'Designing identity and attribution logic where mistakes cost money or leak data',
  'Owning a production system from schema to monitoring to incident response',
  'Working alongside a design team and a client to integrate rather than replace'
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap');

.cw-page {
  --cw-paper: #fbf9f7;
  --cw-cream: #f4eee6;
  --cw-sand: #ede8e2;
  --cw-line: #ddd6cd;
  --cw-ink: #2c2c2c;
  --cw-ink-2: #4a4a45;
  --cw-muted: #77716a;
  --cw-rose: #e7c3b8;
  --cw-blush: #f6e2dc;
  --cw-clay: #a95a3a;
  --cw-good: #2f7a5a;
  --cw-serif: 'Cormorant Garamond', 'Times New Roman', Georgia, serif;
  --cw-ease: cubic-bezier(.2, .7, .2, 1);
  color: var(--cw-ink);
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.cw-back {
  align-self: flex-start;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Reveal */
.cw-reveal {
  opacity: 0;
  transform: translateY(18px);
  transition: opacity .8s var(--cw-ease), transform .8s var(--cw-ease);
}

.cw-reveal.is-visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .cw-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Shared type */
.cw-kicker {
  margin: 0 0 10px;
  color: var(--cw-clay);
  text-transform: uppercase;
  letter-spacing: .2em;
  font-size: .74rem;
  font-weight: 700;
}

.cw-kicker--light {
  color: var(--cw-rose);
}

.cw-h2 {
  margin: 0;
  font-family: var(--cw-serif);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.05;
  letter-spacing: -.01em;
}

.cw-copy {
  margin: 14px 0 0;
  color: var(--cw-ink-2);
  line-height: 1.75;
}

.cw-copy--narrow {
  max-width: 720px;
}

.cw-note {
  margin: 14px 0 0;
  color: var(--cw-muted);
  font-size: .86rem;
  line-height: 1.6;
}

.cw-section {
  background: var(--cw-paper);
  border: 1px solid var(--cw-line);
  border-radius: 28px;
  padding: clamp(24px, 4vw, 48px);
}

.cw-card {
  background: #fff;
  border: 1px solid var(--cw-line);
  border-radius: 20px;
  padding: 22px;
}

.cw-card-label {
  margin: 0 0 14px;
  font-size: .74rem;
  color: var(--cw-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}

/* Buttons */
.cw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 999px;
  border: 1px solid var(--cw-ink);
  background: var(--cw-ink);
  color: #fff;
  font-weight: 600;
  font-size: .92rem;
  white-space: nowrap;
  transition: transform .2s var(--cw-ease), background .2s;
}

.cw-btn:hover {
  transform: translateY(-1px);
}

.cw-btn--light {
  background: var(--cw-paper);
  border-color: var(--cw-paper);
  color: var(--cw-ink);
}

.cw-btn--small {
  min-height: 34px;
  padding: 6px 14px;
  font-size: .8rem;
}

.cw-btn--quiet {
  background: transparent;
  color: var(--cw-ink);
  border-color: var(--cw-line);
}

/* Hero */
.cw-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  gap: 24px;
  min-height: min(78vh, 660px);
  border-radius: 32px;
  overflow: hidden;
  border: 1px solid var(--cw-line);
  background:
    radial-gradient(circle at 78% 30%, rgba(231, 195, 184, .55), transparent 55%),
    linear-gradient(120deg, #efe4d7 0%, var(--cw-paper) 60%, #f3e9e1 100%);
}

.cw-hero-inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 40px;
  padding: clamp(24px, 5vw, 56px);
}

.cw-hero-logo {
  width: 150px;
  height: auto;
  mix-blend-mode: multiply;
}

.cw-hero-copy {
  max-width: 620px;
}

.cw-hero-title {
  margin: 0;
  font-family: var(--cw-serif);
  font-weight: 500;
  font-size: clamp(2.4rem, 5.2vw, 4.4rem);
  line-height: 1;
  letter-spacing: -.015em;
}

.cw-hero-lead {
  margin: 20px 0 0;
  color: var(--cw-ink-2);
  font-size: 1.05rem;
  line-height: 1.7;
  max-width: 560px;
}

.cw-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.cw-hero-fan {
  position: relative;
  min-height: 420px;
}

.cw-fan-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(250px, 58%);
  aspect-ratio: 3 / 4;
  object-fit: cover;
  object-position: top;
  border-radius: 18px;
  border: 6px solid #fff;
  box-shadow: 0 24px 50px rgba(70, 50, 30, .18);
  transform:
    translate(-50%, -50%)
    translateX(calc((var(--i) - 1.5) * 64px))
    rotate(calc((var(--i) - 1.5) * 7deg));
  transition: transform .6s var(--cw-ease);
}

.cw-hero-fan:hover .cw-fan-card {
  transform:
    translate(-50%, -50%)
    translateX(calc((var(--i) - 1.5) * 92px))
    rotate(calc((var(--i) - 1.5) * 10deg));
}

@media (prefers-reduced-motion: reduce) {
  .cw-fan-card { transition: none; }
}

/* Stats */
.cw-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--cw-line);
  border-radius: 24px;
  background: var(--cw-paper);
  overflow: hidden;
}

.cw-stat {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cw-stat + .cw-stat {
  border-left: 1px solid var(--cw-line);
}

.cw-stat-value {
  font-family: var(--cw-serif);
  font-size: 2.6rem;
  line-height: 1;
  font-weight: 600;
}

.cw-stat-label {
  color: var(--cw-muted);
  font-size: .86rem;
  line-height: 1.4;
}

/* Overview */
.cw-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 40px;
  align-items: start;
}

.cw-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.cw-layers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cw-layers-title {
  margin: 0 0 6px;
  font-size: .74rem;
  color: var(--cw-muted);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.cw-layer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
}

.cw-layer.is-mine {
  background: #fff;
  border: 1px solid var(--cw-line);
  box-shadow: inset 4px 0 0 var(--cw-clay);
}

.cw-layer.is-team {
  border: 1px dashed var(--cw-line);
  background: transparent;
  color: var(--cw-muted);
}

.cw-layer-name {
  margin: 0;
  font-weight: 650;
  font-size: .95rem;
}

.cw-layer-detail {
  margin: 2px 0 0;
  font-size: .82rem;
  color: var(--cw-muted);
  line-height: 1.45;
}

.cw-layer-badge {
  flex-shrink: 0;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .04em;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--cw-blush);
  color: var(--cw-clay);
}

.cw-layer.is-team .cw-layer-badge {
  background: var(--cw-sand);
  color: var(--cw-muted);
}

/* Live */
.cw-live-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.cw-browser {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--cw-line);
  box-shadow: 0 30px 70px rgba(70, 50, 30, .14);
  background: #fff;
}

.cw-browser-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  background: var(--cw-sand);
  border-bottom: 1px solid var(--cw-line);
}

.cw-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #d3cbc1;
}

.cw-url {
  margin-left: 12px;
  flex: 1;
  max-width: 420px;
  padding: 5px 14px;
  border-radius: 999px;
  background: #fff;
  color: var(--cw-ink-2);
  font-size: .8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cw-browser-view {
  position: relative;
  aspect-ratio: 16 / 9;
  background: linear-gradient(120deg, #e9dccd, #f6efe6);
}

.cw-browser-logo {
  position: absolute;
  top: 38%;
  left: 50%;
  transform: translateX(-50%);
  width: clamp(110px, 18%, 200px);
  mix-blend-mode: multiply;
}

.cw-widget {
  position: absolute;
  right: 3%;
  bottom: 5%;
  width: min(300px, 46%);
  padding: 14px;
  border-radius: 18px;
  background: rgba(251, 249, 247, .94);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 40px rgba(40, 30, 20, .2);
  animation: cw-float 6s ease-in-out infinite;
}

@keyframes cw-float {
  50% { transform: translateY(-6px); }
}

@media (prefers-reduced-motion: reduce) {
  .cw-widget { animation: none; }
}

.cw-widget-head,
.cw-chat-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cw-widget-head strong,
.cw-chat-head strong {
  display: block;
  font-size: .9rem;
}

.cw-widget-head small,
.cw-chat-head small {
  display: block;
  color: var(--cw-muted);
  font-size: .74rem;
}

.cw-widget-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--cw-rose);
  color: var(--cw-ink);
  font-family: var(--cw-serif);
  font-weight: 600;
  font-size: 1.1rem;
}

.cw-widget-msg {
  margin: 10px 0 0;
  font-size: .82rem;
  line-height: 1.5;
  color: var(--cw-ink-2);
}

.cw-widget-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.cw-widget-chips span {
  font-size: .72rem;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--cw-line);
  background: #fff;
}

/* Bella replay */
.cw-bella-grid {
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr);
  gap: 22px;
  margin-top: 28px;
}

.cw-chat {
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  border: 1px solid var(--cw-line);
  background: linear-gradient(180deg, #fff, var(--cw-cream));
  overflow: hidden;
  min-height: 560px;
}

.cw-chat-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--cw-line);
  background: #fff;
}

.cw-chat-reset {
  margin-left: auto;
  border: 1px solid var(--cw-line);
  background: transparent;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: .78rem;
  cursor: pointer;
  color: var(--cw-ink-2);
}

.cw-chat-log {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  overflow-y: auto;
  max-height: 460px;
  scroll-behavior: smooth;
}

.cw-msg {
  max-width: 86%;
  padding: 11px 14px;
  border-radius: 16px;
  font-size: .9rem;
  line-height: 1.55;
  animation: cw-pop .35s var(--cw-ease);
}

.cw-msg p {
  margin: 0;
}

@keyframes cw-pop {
  from { opacity: 0; transform: translateY(6px); }
}

.cw-msg--bella {
  align-self: flex-start;
  background: #fff;
  border: 1px solid var(--cw-line);
  border-bottom-left-radius: 4px;
}

.cw-msg--user {
  align-self: flex-end;
  background: var(--cw-ink);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.cw-msg-safety {
  margin-top: 8px !important;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--cw-blush);
  color: #6d3420;
  font-size: .82rem;
}

.cw-msg-products {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.cw-product {
  margin: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--cw-line);
  background: var(--cw-paper);
}

.cw-product img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  object-position: 18% 72%;
}

.cw-product figcaption {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cw-product strong {
  font-size: .78rem;
  line-height: 1.3;
}

.cw-product span {
  font-size: .7rem;
  color: var(--cw-muted);
}

.cw-typing {
  display: flex;
  gap: 5px;
  padding: 14px 16px;
}

.cw-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--cw-muted);
  animation: cw-blink 1s infinite;
}

.cw-typing span:nth-child(2) { animation-delay: .15s; }
.cw-typing span:nth-child(3) { animation-delay: .3s; }

@keyframes cw-blink {
  50% { opacity: .25; }
}

.cw-chat-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 18px 18px;
  border-top: 1px solid var(--cw-line);
  background: #fff;
  min-height: 72px;
}

.cw-reply {
  border: 1px solid var(--cw-clay);
  background: #fff;
  color: var(--cw-clay);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: .84rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s, color .2s;
}

.cw-reply:hover:not(:disabled) {
  background: var(--cw-clay);
  color: #fff;
}

.cw-reply:disabled {
  opacity: .5;
  cursor: default;
}

.cw-chat-end {
  margin: 0;
  color: var(--cw-muted);
  font-size: .84rem;
  align-self: center;
}

.cw-pipeline {
  border-radius: 24px;
  background: #24211e;
  color: #efe9e2;
  padding: 22px;
}

.cw-pipeline-title {
  margin: 0 0 16px;
  font-size: .78rem;
  color: var(--cw-rose);
  overflow-wrap: anywhere;
}

.cw-stages {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cw-stage {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  transition: background .4s, opacity .4s;
  transition-delay: calc(var(--i) * 90ms);
}

.cw-stage-marker {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: .8rem;
  font-weight: 700;
  border: 1px solid rgba(239, 233, 226, .3);
  color: rgba(239, 233, 226, .7);
  transition: background .4s, color .4s, border-color .4s;
  transition-delay: calc(var(--i) * 90ms);
}

.cw-stage-name {
  margin: 4px 0 0;
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cw-stage-state {
  font-size: .68rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .08em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(239, 233, 226, .1);
  color: rgba(239, 233, 226, .7);
}

.cw-stage-text {
  margin: 6px 0 0;
  font-size: .86rem;
  line-height: 1.55;
  color: rgba(239, 233, 226, .78);
}

.cw-stage.is-idle { opacity: .72; }

.cw-stage.is-pass .cw-stage-marker,
.cw-stage.is-run .cw-stage-marker {
  background: #e9f3ee;
  border-color: #e9f3ee;
  color: var(--cw-good);
}

.cw-stage.is-pass .cw-stage-state,
.cw-stage.is-run .cw-stage-state {
  background: rgba(144, 214, 180, .16);
  color: #a6dcc2;
}

.cw-stage.is-warn .cw-stage-marker {
  background: #f4ead6;
  border-color: #f4ead6;
  color: #8a5a16;
}

.cw-stage.is-warn .cw-stage-state {
  background: rgba(244, 234, 214, .16);
  color: #ead6ad;
}

.cw-stage.is-block {
  background: rgba(231, 195, 184, .1);
}

.cw-stage.is-block .cw-stage-marker {
  background: var(--cw-rose);
  border-color: var(--cw-rose);
  color: #5a2716;
}

.cw-stage.is-block .cw-stage-state {
  background: rgba(231, 195, 184, .2);
  color: var(--cw-rose);
}

.cw-stage.is-skip { opacity: .45; }

.cw-chunks {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cw-chunks li {
  font-size: .7rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(239, 233, 226, .08);
  border: 1px solid rgba(239, 233, 226, .14);
  color: rgba(239, 233, 226, .85);
}

/* Retrieval */
.cw-retrieval-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 18px;
  margin-top: 28px;
}

.cw-query-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.cw-query-tab {
  border: 1px solid var(--cw-line);
  background: var(--cw-paper);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: .8rem;
  cursor: pointer;
  color: var(--cw-ink-2);
}

.cw-query-tab.is-active {
  background: var(--cw-ink);
  border-color: var(--cw-ink);
  color: #fff;
}

.cw-matrix-wrap {
  overflow-x: auto;
}

.cw-matrix {
  border-collapse: separate;
  border-spacing: 4px;
  width: 100%;
  min-width: 440px;
}

.cw-matrix th {
  font-size: .72rem;
  font-weight: 600;
  color: var(--cw-muted);
  text-align: center;
  padding: 0 0 4px;
}

.cw-matrix tbody th {
  text-align: left;
  font-size: .82rem;
  color: var(--cw-ink);
  padding-right: 8px;
  white-space: nowrap;
}

.cw-matrix td {
  padding: 0;
}

.cw-cell {
  display: block;
  height: 30px;
  border-radius: 6px;
  transition: background .35s var(--cw-ease), box-shadow .35s;
}

.cw-matrix-legend .cw-cell {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  vertical-align: -2px;
  margin-right: 6px;
}

.cw-cell.is-none {
  background: var(--cw-sand);
}

.cw-cell.is-identity {
  background: var(--cw-rose);
}

.cw-cell.is-ranked {
  background: var(--cw-clay);
}

.cw-matrix-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 14px;
  font-size: .78rem;
  color: var(--cw-ink-2);
}

.cw-score {
  background: var(--cw-ink);
  color: #f4eee6;
  border-color: var(--cw-ink);
}

.cw-score .cw-card-label {
  color: var(--cw-rose);
}

.cw-formula {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cw-term {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(244, 238, 230, .07);
  border: 1px solid rgba(244, 238, 230, .14);
}

.cw-term-name {
  font-family: var(--cw-serif);
  font-size: 1.4rem;
  line-height: 1;
}

.cw-term-math {
  font-size: .78rem;
  color: var(--cw-rose);
}

.cw-term-note {
  font-size: .8rem;
  color: rgba(244, 238, 230, .7);
  line-height: 1.45;
}

.cw-plus {
  align-self: center;
  font-size: 1.1rem;
  color: rgba(244, 238, 230, .5);
  line-height: 1;
}

.cw-budget {
  margin-top: 18px;
}

.cw-budget-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 18px;
  align-items: baseline;
}

.cw-budget-sub {
  margin: 0 0 14px;
  font-size: .8rem;
  color: var(--cw-muted);
}

.cw-budget-bar {
  display: flex;
  gap: 2px;
  height: 34px;
}

.cw-budget-seg {
  position: relative;
  min-width: 6px;
  cursor: default;
  transition: filter .2s;
}

.cw-budget-seg:first-child {
  border-radius: 4px 0 0 4px;
}

.cw-budget-seg:last-child {
  border-radius: 0 4px 4px 0;
}

.cw-budget-seg.is-free {
  background: repeating-linear-gradient(135deg, var(--cw-sand) 0 6px, #fff 6px 10px);
  box-shadow: inset 0 0 0 1px var(--cw-line);
}

.cw-budget-seg.is-hover:not(.is-free) {
  filter: brightness(1.08);
}

.cw-budget-tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--cw-ink);
  color: #fff;
  font-size: .76rem;
  pointer-events: none;
  z-index: 2;
}

.cw-budget-legend {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.cw-budget-legend li {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  column-gap: 8px;
  font-size: .8rem;
  color: var(--cw-ink-2);
}

.cw-budget-legend i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  margin-top: 3px;
}

.cw-budget-legend i.is-free {
  background: repeating-linear-gradient(135deg, var(--cw-sand) 0 3px, #fff 3px 5px);
  box-shadow: inset 0 0 0 1px var(--cw-line);
}

.cw-budget-legend strong {
  grid-column: 2;
  color: var(--cw-ink);
  font-size: .86rem;
}

/* Architecture */
.cw-arch-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  gap: 18px;
  margin-top: 26px;
  align-items: start;
}

.cw-arch-canvas {
  overflow-x: auto;
  border-radius: 20px;
  border: 1px solid var(--cw-line);
  background:
    radial-gradient(circle at 1px 1px, rgba(44, 44, 44, .08) 1px, transparent 0) 0 0 / 22px 22px,
    #fff;
  padding: 10px;
}

.cw-arch-svg {
  display: block;
  width: 100%;
  min-width: 620px;
  height: auto;
}

.cw-edge {
  fill: none;
  stroke: #c9c0b5;
  stroke-width: 2;
  transition: stroke .3s;
}

.cw-edge.is-lit {
  stroke: var(--cw-clay);
  stroke-dasharray: 6 5;
  animation: cw-flow 1s linear infinite;
}

@keyframes cw-flow {
  to { stroke-dashoffset: -11; }
}

@media (prefers-reduced-motion: reduce) {
  .cw-edge.is-lit { animation: none; }
}

.cw-arrowhead {
  fill: #a99f93;
}

.cw-edge-label {
  font-size: 12px;
  fill: var(--cw-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.cw-node {
  cursor: pointer;
  outline: none;
}

.cw-node rect {
  fill: #fff;
  stroke: var(--cw-line);
  stroke-width: 1.5;
  transition: fill .25s, stroke .25s;
}

.cw-node.is-me rect {
  stroke: #d9b2a3;
}

.cw-node.is-team rect {
  fill: var(--cw-paper);
  stroke-dasharray: 6 5;
}

.cw-node.is-external rect {
  fill: var(--cw-paper);
}

.cw-node:hover rect,
.cw-node:focus-visible rect {
  stroke: var(--cw-clay);
}

.cw-node.is-active rect {
  fill: var(--cw-ink);
  stroke: var(--cw-ink);
}

.cw-node-title {
  font-size: 17px;
  font-weight: 650;
  fill: var(--cw-ink);
}

.cw-node-sub {
  font-size: 12.5px;
  fill: var(--cw-muted);
}

.cw-node.is-active .cw-node-title { fill: #fff; }
.cw-node.is-active .cw-node-sub { fill: var(--cw-rose); }

.cw-arch-detail {
  border-radius: 20px;
  background: var(--cw-cream);
  border: 1px solid var(--cw-line);
  padding: 22px;
}

.cw-arch-detail h3 {
  margin: 8px 0 0;
  font-family: var(--cw-serif);
  font-size: 1.9rem;
  font-weight: 500;
  line-height: 1.1;
}

.cw-arch-detail ul {
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--cw-ink-2);
  font-size: .9rem;
  line-height: 1.6;
}

.cw-owner-chip {
  display: inline-block;
  margin: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: .72rem;
  font-weight: 700;
  background: var(--cw-blush);
  color: var(--cw-clay);
}

.cw-owner-chip.is-team,
.cw-owner-chip.is-external {
  background: var(--cw-sand);
  color: var(--cw-muted);
}

/* Journey */
.cw-steps {
  list-style: none;
  padding: 0;
  margin: 30px 0 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  counter-reset: step;
  position: relative;
}

.cw-step {
  position: relative;
  padding: 18px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid var(--cw-line);
  display: flex;
  flex-direction: column;
}

.cw-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 32px;
  right: -12px;
  width: 12px;
  height: 2px;
  background: var(--cw-clay);
}

.cw-step-num {
  font-size: .76rem;
  color: var(--cw-clay);
  font-weight: 700;
}

.cw-step h3 {
  margin: 8px 0 0;
  font-size: 1rem;
}

.cw-step p {
  margin: 8px 0 0;
  color: var(--cw-ink-2);
  font-size: .85rem;
  line-height: 1.55;
  flex: 1;
}

.cw-step-code {
  margin-top: 12px;
  align-self: flex-start;
  font-size: .72rem;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--cw-sand);
  color: var(--cw-ink-2);
  overflow-wrap: anywhere;
}

.cw-rules {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.cw-rule {
  padding: 18px;
  border-radius: 18px;
  background: var(--cw-ink);
  color: #f4eee6;
}

.cw-rule-value {
  font-family: var(--cw-serif);
  font-size: 2.1rem;
  line-height: 1;
  color: var(--cw-rose);
}

.cw-rule p {
  margin: 10px 0 0;
  font-size: .85rem;
  line-height: 1.5;
  color: rgba(244, 238, 230, .8);
}

/* Admin */
.cw-admin-shell {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  margin-top: 28px;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid var(--cw-line);
  background: #fff;
  box-shadow: 0 24px 60px rgba(70, 50, 30, .1);
  min-height: 520px;
}

.cw-admin-nav {
  background: #f8f4ef;
  border-right: 1px solid var(--cw-line);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cw-admin-logo {
  width: 120px;
  mix-blend-mode: multiply;
  margin: 0 6px 4px;
}

.cw-admin-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cw-admin-group-label {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #9e9e90;
  padding: 0 10px 4px;
}

.cw-admin-link {
  text-align: left;
  border: 0;
  background: transparent;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: .88rem;
  color: var(--cw-ink-2);
  cursor: pointer;
}

.cw-admin-link:hover:not(:disabled) {
  background: #ede8e2;
}

.cw-admin-link.is-active {
  background: var(--cw-ink);
  color: #fff;
}

.cw-admin-link.is-disabled {
  color: #b5aea5;
  cursor: default;
}

.cw-admin-main {
  padding: 22px;
  min-width: 0;
}

.cw-admin-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.cw-admin-top h3 {
  margin: 0;
  font-family: var(--cw-serif);
  font-size: 1.8rem;
  font-weight: 500;
}

.cw-sample {
  font-size: .7rem;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px dashed var(--cw-line);
  color: var(--cw-muted);
}

.cw-admin-chats {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: 14px;
}

.cw-convos {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cw-convos li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--cw-line);
  cursor: pointer;
  transition: border-color .2s, background .2s;
}

.cw-convos li.is-active {
  border-color: var(--cw-clay);
  background: #fdf6f3;
}

.cw-convos strong {
  font-size: .85rem;
}

.cw-convos span {
  font-size: .8rem;
  color: var(--cw-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cw-convos small {
  font-size: .68rem;
  color: var(--cw-muted);
}

.cw-convo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: var(--cw-cream);
  min-width: 0;
}

.cw-convo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.cw-fact {
  font-size: .72rem;
  padding: 3px 9px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--cw-line);
}

.cw-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.cw-kpi {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--cw-line);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cw-kpi-label {
  font-size: .74rem;
  color: var(--cw-muted);
}

.cw-kpi-value {
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -.02em;
}

.cw-kpi-note {
  font-size: .72rem;
  color: var(--cw-muted);
}

.cw-chart {
  margin-top: 14px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid var(--cw-line);
}

.cw-chart-title {
  margin: 0 0 6px;
  font-size: .86rem;
  font-weight: 600;
}

.cw-chart-plot {
  position: relative;
}

.cw-chart-svg {
  display: block;
  width: 100%;
  height: auto;
}

.cw-grid line {
  stroke: #ece6df;
  stroke-width: 1;
}

.cw-grid text {
  font-size: 11px;
  fill: var(--cw-muted);
}

.cw-chart-line {
  fill: none;
  stroke: #5b6fb5;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.cw-crosshair {
  stroke: var(--cw-ink-2);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.cw-chart-dot {
  fill: #5b6fb5;
  stroke: #fff;
  stroke-width: 2;
}

.cw-chart-tip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--cw-ink);
  color: #fff;
  font-size: .76rem;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  white-space: nowrap;
}

.cw-chart-tip span {
  color: rgba(255, 255, 255, .7);
}

.cw-incident {
  display: flex;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: #eef6f1;
}

.cw-incident strong {
  font-size: .88rem;
}

.cw-incident p {
  margin: 4px 0 0;
  font-size: .82rem;
  color: var(--cw-ink-2);
  line-height: 1.5;
}

.cw-status-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--cw-good);
  color: #fff;
  font-size: .8rem;
}

.cw-admin-context {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: 14px;
}

.cw-files {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: .8rem;
}

.cw-files li {
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cw-files li.is-active {
  background: var(--cw-sand);
}

.cw-files .cw-files-group {
  cursor: default;
  margin-top: 10px;
  font-size: .68rem;
  color: #9e9e90;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.cw-files .cw-files-dim {
  cursor: default;
  color: var(--cw-muted);
}

.cw-override {
  font-size: .64rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--cw-blush);
  color: var(--cw-clay);
}

.cw-editor {
  border-radius: 14px;
  border: 1px solid var(--cw-line);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cw-editor-bar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding: 10px 14px;
  font-size: .74rem;
  background: var(--cw-paper);
  border-bottom: 1px solid var(--cw-line);
}

.cw-editor-state {
  color: var(--cw-muted);
}

.cw-editor-body {
  margin: 0;
  padding: 16px;
  font-size: .8rem;
  line-height: 1.7;
  white-space: pre-wrap;
  color: var(--cw-ink-2);
  flex: 1;
  min-height: 230px;
}

.cw-editor-actions {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid var(--cw-line);
}

.cw-table-wrap {
  overflow-x: auto;
}

.cw-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .86rem;
  min-width: 520px;
}

.cw-table th {
  text-align: left;
  font-size: .72rem;
  font-weight: 600;
  color: var(--cw-muted);
  padding: 10px 12px;
  border-bottom: 1px solid var(--cw-line);
}

.cw-table td {
  padding: 12px;
  border-bottom: 1px solid #f0ebe5;
}

.cw-table td small {
  display: block;
  font-size: .72rem;
  color: var(--cw-muted);
}

.cw-table .num {
  text-align: right;
}

/* Reliability */
.cw-decisions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 26px;
}

.cw-decision {
  padding: 20px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid var(--cw-line);
}

.cw-decision h3 {
  margin: 0;
  font-family: var(--cw-serif);
  font-size: 1.45rem;
  font-weight: 600;
  line-height: 1.15;
}

.cw-decision p {
  margin: 10px 0 0;
  color: var(--cw-ink-2);
  font-size: .88rem;
  line-height: 1.6;
}

.cw-incident-story {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  gap: 24px;
  margin-top: 16px;
  padding: 24px;
  border-radius: 18px;
  background: var(--cw-blush);
}

.cw-incident-story h3 {
  margin: 0;
  font-family: var(--cw-serif);
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.15;
}

.cw-incident-story > p {
  margin: 0;
  color: #4a3a33;
  line-height: 1.7;
  font-size: .92rem;
}

/* Gallery */
.cw-gallery {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 26px;
}

.cw-gallery-item {
  margin: 0;
  border-radius: 18px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--cw-line);
}

.cw-gallery-item img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  object-position: top;
  transition: transform .6s var(--cw-ease);
}

.cw-gallery-item:hover img {
  transform: scale(1.03);
}

.cw-gallery-item figcaption {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cw-gallery-item strong {
  font-size: .9rem;
}

.cw-gallery-item span {
  font-size: .78rem;
  color: var(--cw-muted);
}

/* Timeline */
.cw-timeline {
  list-style: none;
  padding: 0;
  margin: 30px 0 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  border-top: 2px solid var(--cw-ink);
}

.cw-timeline li {
  position: relative;
  padding: 22px 16px 0 0;
}

.cw-timeline li::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--cw-paper);
  border: 2px solid var(--cw-ink);
}

.cw-timeline li:last-child::before {
  background: var(--cw-clay);
  border-color: var(--cw-clay);
}

.cw-timeline-month {
  font-size: .74rem;
  color: var(--cw-clay);
  font-weight: 700;
}

.cw-timeline h3 {
  margin: 6px 0 0;
  font-family: var(--cw-serif);
  font-size: 1.35rem;
  font-weight: 600;
}

.cw-timeline p {
  margin: 6px 0 0;
  font-size: .84rem;
  color: var(--cw-ink-2);
  line-height: 1.55;
}

/* Closing */
.cw-close {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
  padding: clamp(28px, 5vw, 56px);
  border-radius: 28px;
  background:
    radial-gradient(circle at 85% 20%, rgba(231, 195, 184, .25), transparent 45%),
    #24211e;
  color: #f4eee6;
}

.cw-close > div {
  max-width: 720px;
}

.cw-close-title {
  margin: 0;
  font-family: var(--cw-serif);
  font-weight: 500;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.05;
}

.cw-close-list {
  margin: 20px 0 0;
  padding-left: 18px;
  color: rgba(244, 238, 230, .82);
  line-height: 1.8;
}

.cw-close-stack {
  margin: 20px 0 0;
  font-size: .78rem;
  color: var(--cw-rose);
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1020px) {
  .cw-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cw-step::after {
    display: none;
  }

  .cw-timeline {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 28px;
  }

  .cw-decisions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cw-arch-grid,
  .cw-bella-grid,
  .cw-retrieval-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 820px) {
  .cw-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .cw-hero-fan {
    min-height: 340px;
  }

  .cw-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cw-stat:nth-child(3) {
    border-left: 0;
  }

  .cw-stat:nth-child(n + 3) {
    border-top: 1px solid var(--cw-line);
  }

  .cw-overview,
  .cw-incident-story {
    grid-template-columns: minmax(0, 1fr);
  }

  .cw-rules,
  .cw-gallery,
  .cw-kpis,
  .cw-budget-legend {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cw-admin-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .cw-admin-nav {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    border-right: 0;
    border-bottom: 1px solid var(--cw-line);
  }

  .cw-admin-logo {
    display: none;
  }

  .cw-admin-chats,
  .cw-admin-context {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .cw-steps,
  .cw-decisions,
  .cw-timeline {
    grid-template-columns: minmax(0, 1fr);
  }

  .cw-timeline {
    border-top: 0;
    border-left: 2px solid var(--cw-ink);
    padding-left: 18px;
  }

  .cw-timeline li {
    padding: 0;
  }

  .cw-timeline li::before {
    top: 4px;
    left: -26px;
  }

  .cw-widget {
    display: none;
  }

  .cw-msg {
    max-width: 94%;
  }

  .cw-layer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
