<template>
	<div class="page" :class="pageTheme">
		<section class="chess-stage">
			<canvas ref="canvasRef" class="chess-canvas"></canvas>

			<div
				class="stage-hero"
				:style="{
					opacity: heroOpacity,
					transform: `translateY(${heroTranslateY}px)`,
				}"
			>
				<div class="hero-title">{{ heroTitle }}</div>
				<div class="hero-sub mono">Scroll down to learn more</div>
			</div>

			<!-- Idle prompt ... -->
			<div class="idle-prompt" :class="{ 'is-visible': makeMoveVisible }" :aria-hidden="!makeMoveVisible">
				<div class="hero-sub mono idle-prompt-text">Make a move</div>
			</div>

			<!-- Skip-to-content prompt -->
			<div class="skip-prompt" :class="{ 'is-visible': skipPromptVisible }" :aria-hidden="!skipPromptVisible">
				<div class="skip-prompt-text mono">Only interested in the content?</div>
				<button class="skip-button mono" type="button" @click="skipToContent">
					Skip
				</button>
			</div>

			<div class="vignette" />
		</section>

		<div class="scroll-spacer" :style="{ height: scrollSpacerHeight }" aria-hidden="true"></div>

		<aside class="content-rail" :class="{ 'is-visible': contentDomVisible }" :aria-hidden="(!contentDomVisible).toString()">
			<div class="rail-card">
				<div class="rail-label mono">Case Study Notebook</div>
				<nav class="rail-nav" aria-label="Chess engine documentation sections">
					<button
						v-for="section in CONTENT_SECTIONS"
						:key="section.id"
						type="button"
						class="rail-link"
						:class="{ 'is-active': activeSection === section.id }"
						@click="scrollToContentSection(section.id)"
					>
						<span class="rail-index mono">{{ section.index }}</span>
						<span>{{ section.label }}</span>
					</button>
				</nav>
			</div>
		</aside>

		<article
			ref="contentRef"
			class="content prose"
			:class="{ 'is-visible': contentDomVisible }"
			:aria-hidden="(!contentDomVisible).toString()"
		>
			<div class="content-shell">
				<main class="content-main">
					<section class="notebook-cell notebook-hero" data-section="overview" id="overview">
						<div class="hero-layout">
							<div class="hero-copy hero-copy-intro">
								<h1 class="content-title">Full Stack Chess Engine</h1>
								<p class="hero-dek">
									A C++ engine with a lightweight UI, local play, self-testing, and online integration.
								</p>
							</div>
							<div class="hero-chip-row mono">
								<span class="hero-chip">C++</span>
								<span class="hero-chip">Engine Development</span>
								<span class="hero-chip">Search Algorithms</span>
								<span class="hero-chip">Performance Optimisation</span>
								<span class="hero-chip">Test Suites & Benchmarking</span>
							</div>
							<div class="hero-body">
								<div class="hero-copy hero-copy-details">
									<div class="hero-summary">
										<p>
											This project started as a complex C++ learning opportunity, with a simple console UI and a simple objective of building something that was better than me.
										</p>
										<p>
											Over time, I created a more extensive test suite, built a better UI for me to watch engine selfplay, eventually creating a system where improvements were easily measurable, with calculable confidence.
										</p>
										<p>
											This was then extended further with support for player vs computer local play through an executable file, with a UI that supports sound and move feedback.
										</p>
										<p>
											I closed the project by integrating it with Lichess, an online platform where it can go against other humans and engines, finally proving its 20 wins in a row against me wasn't just a fluke.
										</p>
									</div>
								</div>
								<figure class="feature-frame hero-feature">
									<video
										class="media-video"
										:src="trainingEngineVideo"
										muted
										autoplay
										loop
										playsinline
										preload="metadata"
									></video>
									<figcaption class="media-cap">Engine vs engine self-play</figcaption>
								</figure>
							</div>
						</div>
					</section>

					<section class="metrics-strip" aria-label="Project metrics">
						<div class="metric-strip-card">
							<div class="metric-strip-value mono">22 perft suites</div>
							<div class="metric-strip-label">Millions of moves tested to ensure correctness</div>
						</div>
						<div class="metric-strip-card">
							<div class="metric-strip-value mono">~1.3m pos/s</div>
							<div class="metric-strip-label">Typical board positions evaluated per second</div>
						</div>
						<div class="metric-strip-card">
							<div class="metric-strip-value mono">2500+ Player Elo</div>
							<div class="metric-strip-label">At grandmaster level against humans</div>
						</div>
						<div class="metric-strip-card">
							<div class="metric-strip-value mono">Executable Code</div>
							<div class="metric-strip-label">A desktop application executable for local play</div>
						</div>
						<div class="metric-strip-card">
							<div class="metric-strip-value mono">Simple GUI</div>
							<div class="metric-strip-label">Interactable with game mode selection.</div>
						</div>
					</section>

					<section class="notebook-cell" data-section="problem-framing" id="problem-framing">
						<div class="section-badge mono">01 - Why Chess?</div>
						<h2 class="section-title">Chess as a solvable engineering problem</h2>

						<div class="callout-note">
							Chess originated in India around the 6th century, slowly evolving into one of the most studied and competitive games in history. For centuries, it was seen as a purely human domain, seen as too complex for machines to master.  
							<br><br>
							In 1997, everybodies perception changed, when 'Deep Blue' defeated world champion Garry Kasparov. Just a few decades after the invention of the modern computer, it had surpassed the best human players, not through intuition, study, or experience, but through intelligent brute-force search. It was this moment that marked a turning point in the history of artificial intelligence.
							<br><br>
							But what makes chess such a luring problem for engineers? It's not just a game; it's a system of complex decision-making and feedback-driven learning. The rules are simple, but the possibilities are effectively infinite. It challenges us to think about how we search through vast possibilities and evaluate decisions under pressure. It is a brutally honest environment where mistakes are punished and improvement is rewarded. But why does chess work so well for computers?
						</div>
						<div class="three-col-grid">

							<div class="decision-card">
								<div class="decision-kicker mono">Strict Rules</div>
								<p>
									Chess follows a fixed and deterministic rule set. There is no randomness and luck every outcome is repeatable and tracable back to the decisions made by the user. This makes it an ideal environment for a computer, where every game is a deterministic outcome of the players' choices.
								</p>
							</div>

							<div class="decision-card">
								<div class="decision-kicker mono">Algorithmic Tradeoffs</div>
								<p>
									Despite its simple rules, chess's game tree can very quickly explode in complexity. With a branching factor of ~35, the typical possibilities are on the order of 10<sup>120</sup>, making exhaustive search is impossible. Strong play instead emerges from balancing search depth among candidate moves and intelligently the search tree.
								</p>
							</div>

							<div class="decision-card">
								<div class="decision-kicker mono">Evidence-Driven Optimisation</div>
								<p>
									In chess, performance is easily measurable. How many times did one variant of an engine beat the other over thousands of games? Every minor improvement, from move ordering to tuning a single constant, can be precisely measured for its impact. Strength is not subjective; it is measured through iterations of profiling and data-driven refinement.
								</p>
							</div>

						</div>
					</section>

					<section class="notebook-cell" data-section="architecture" id="architecture">
						<div class="section-badge mono">04 - System architecture</div>
						<h2 class="section-title">How to build a chess engine</h2>
						<p>
							From a software design perspective, the project was structured into a modular design, where the engines core 
							was kept separate from the UI and CLI layer. The engine itself was designed as a deterministic evaluation system,
							recieving the board state, and returning the best move based on a bounded search of the game tree. 
						</p>
						<p>
							The engine itself is a depth-first-search algorithm, as an evaluation depends on exploring complete move sequences. 
							DFS allows position evaluations to propagate back up the tree, enabling pruning techniques to 
							drastically reduce the number of positions evaluated. 
						</p>
						<p>
							The engines core was built using object-oriented design principles, allowing multiple engines
							to share common infrastructure while having different search and evaluation parameters. Thus, enabling 
							easy A/B testing of different engine approaches.
						</p>
						<p>
							Once 'the engine core' is built, the UI, CLI, and 3rd party integration all work by submitting board states to the engine, 
							and receiving optimal moves as a response. The engines core is simplified below.
						</p>
						<figure class="feature-frame">
							<img class="media-img" :src="architectureImg" alt="Architecture diagram of the chess engine search loop" loading="lazy" />
						</figure>
					</section>

					<section class="notebook-cell notebook-cell-dark" data-section="search-optimisation" id="search-optimisation">
						<div class="section-badge mono">05 - Search algorithm</div>
						<h2 class="section-title">Search became an anytime decision system under tight latency constraints</h2>
						<p>
							The software problem here is not "find the perfect answer". It is "return the strongest answer
							you can before the clock expires". That makes the search an anytime algorithm: each completed
							depth pass produces a usable answer, and if more time exists the engine keeps refining it.
						</p>
						<p>
							The core traversal is recursive DFS, but performance comes from controlling the order and width of
							the tree. Alpha-beta is essentially branch-and-bound over an adversarial state space. Iterative
							deepening improves move ordering. The transposition table acts like memoization. Quiescence search
							is a stability check that prevents the engine from scoring noisy frontier states too early.
						</p>
						<div class="deep-dive-panel deep-dive-panel-dark">
							<div class="panel-heading">
								<div class="panel-label mono">Decision Flow</div>
								<h3 class="subhead">How one move request is processed</h3>
							</div>
							<div class="architecture-diagram">
								<div class="arch-node"><span>01</span><strong>Depth 1</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>02</span><strong>Reorder</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>03</span><strong>Depth n</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>04</span><strong>Prune</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>05</span><strong>Stabilise leaf</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>06</span><strong>Return best-so-far</strong></div>
							</div>
						</div>
						<div class="three-col-grid">
							<div class="decision-card">
								<div class="decision-kicker mono">Latency Control</div>
								<p>
									Iterative deepening means the engine never sits for a long time with no answer. Each pass
									improves confidence while keeping the system responsive under a hard time budget.
								</p>
							</div>
							<div class="decision-card">
								<div class="decision-kicker mono">Work Prioritisation</div>
								<p>
									Move ordering and pruning are forms of prioritisation. Expensive work is spent first on
									candidates most likely to matter, and low-value branches are cut early.
								</p>
							</div>
							<div class="decision-card">
								<div class="decision-kicker mono">Frontier Quality</div>
								<p>
									The engine does not trust every frontier state equally. If a position is still tactically
									volatile, it keeps searching until the score is stable enough to be meaningful.
								</p>
							</div>
						</div>
						<div class="deep-dive-panel deep-dive-panel-dark">
							<div class="panel-heading">
								<div class="panel-label mono">Engineering Principles</div>
								<h3 class="subhead">What this section says about software skill</h3>
							</div>
							<div class="panel-grid">
								<div class="analysis-card">
									<div class="panel-label mono">Performance Engineering</div>
									<p>
										The engine is designed around minimizing wasted work. Better ordering improves not only
										raw speed, but the quality of the answer returned within the same deadline.
									</p>
								</div>
								<div class="analysis-card">
									<div class="panel-label mono">Bounded Computation</div>
									<p>
										This section was a practical lesson in trading completeness for value. The system needs
										to degrade gracefully, not catastrophically, when time is limited.
									</p>
								</div>
							</div>
						</div>

						<div class="performance-band">
							<div class="benchmark-card">
								<div class="metric-label mono">Node throughput</div>
								<div class="metric-value">~1.3m pos/s</div>
								<p>Throughput mattered because every extra node had to translate into stronger practical play.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Pruning profile</div>
								<div class="metric-value">~99.98%</div>
								<p>Most of the raw game tree is discarded once move ordering and cutoffs begin cooperating.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Search stack</div>
								<div class="metric-value">AB + PVS + QSearch</div>
								<p>The gain came from subsystem cooperation rather than one isolated optimisation trick.</p>
							</div>
						</div>

					</section>

					<section class="notebook-cell" data-section="board-state" id="board-state">
						<div class="section-badge mono">06 - Move generation &amp; bitboards</div>
						<h2 class="section-title">Board state was modelled for data locality, rollback, and fast set operations</h2>
						<p>
							This section is really about data structures. A naive representation would use an 8x8 array or a
							list of piece objects and repeatedly scan the board looking for what is occupied, attacked, or
							legal. That is easy to understand, but expensive when the same queries happen millions of times.
						</p>
						<p>
							Bitboards compress one whole 8x8 board into a single 64-bit integer. That means set operations
							become CPU-native bitwise operations instead of loops over squares. In practice, the engine keeps
							12 per-piece bitboards and 2 occupancy bitboards, then pairs them with a 64-byte mailbox array so
							exact square lookup stays simple when applying and undoing moves.
						</p>
						<div class="two-col-grid">
							<pre class="terminal-note mono diagram-terminal">Bitboard example

8 | 0 0 0 0 0 0 0 1
7 | 0 0 0 0 0 0 1 0
6 | 0 0 0 0 0 1 0 0
5 | 0 0 0 1 0 0 0 0
4 | 0 0 0 0 1 0 0 0
3 | 0 0 1 0 0 0 0 0
2 | 0 1 0 0 0 0 0 0
1 | 1 0 0 0 0 0 0 0
    a b c d e f g h

One 64-bit value can represent this entire mask.
Intersection, union, and occupancy checks become
bitwise AND / OR / XOR instead of scanning 64 cells.</pre>
							<div class="stacked-notes">
								<div class="subsystem-card">
									<div class="subsystem-title">Mailbox-only board</div>
									<p>
										If each square is stored as a 1-byte code, the board uses exactly 64 bytes. The tradeoff
										is compute: queries like "which white bishops are active?" require a 64-square scan.
									</p>
								</div>
								<div class="subsystem-card">
									<div class="subsystem-title">Bitboard set model</div>
									<p>
										One bitboard is 8 bytes. This engine keeps 14 of them, so the set-based layer costs
										112 bytes and answers many board-wide questions with a handful of register-sized ops.
									</p>
								</div>
								<div class="subsystem-card">
									<div class="subsystem-title">Hybrid design used here</div>
									<p>
										`112 bytes` of bitboards plus a `64 byte` mailbox gives `176 bytes` of core placement
										state. That is `112 bytes` more than mailbox-only, but it removes repeated full-board
										scans from the hottest search paths.
									</p>
								</div>
							</div>
						</div>
						<div class="performance-band">
							<div class="benchmark-card">
								<div class="metric-label mono">Mailbox only</div>
								<div class="metric-value">64 bytes</div>
								<p>Small memory footprint, but many common queries degrade into branchy 64-cell loops.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Bitboards only</div>
								<div class="metric-value">112 bytes</div>
								<p>Fourteen 64-bit sets make board-wide intersection tests cheap and cache-friendly.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Hybrid used here</div>
								<div class="metric-value">176 bytes</div>
								<p>Extra memory buys simpler rollback, direct square lookup, and far less repeated scanning.</p>
							</div>
						</div>
						<div class="subsystem-grid">
							<div class="subsystem-card">
								<div class="subsystem-title">Compute tradeoff</div>
								<p>
									A check like "is this lane occupied?" becomes a bit-mask operation on a 64-bit value,
									which is dramatically cheaper than iterating over squares with conditionals.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Rollback-friendly state</div>
								<p>
									The board is mutated in place and restored through undo records. That is a classic
									performance decision: reuse memory, avoid copies, and make rollback exact.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Invariant management</div>
								<p>
									Splitting candidate generation from legality checks made it easier to guard complex edge
									cases without mixing correctness logic into every low-level data update.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Alternative baseline</div>
								<p>
									For comparison, 32 piece records at 16 bytes each would already cost 512 bytes before
									container overhead. The compact board model keeps the hot state dense and predictable.
								</p>
							</div>
						</div>
						<figure class="feature-frame">
							<img class="media-img" :src="gameplayImg" alt="Live gameplay view from the chess engine interface" loading="lazy" />
							<figcaption class="media-cap">The same board model had to satisfy two different software needs at once: very cheap search-state mutation and clean square-level interaction in the visible UI.</figcaption>
						</figure>
						<div class="callout-note">
							The main engineering lesson here was that "fast" and "maintainable" do not have to be opposites.
							The hybrid model costs a little extra memory, but it keeps the state machine both efficient and
							tractable to debug.
						</div>
					</section>

					<section class="notebook-cell" data-section="evaluation-design" id="evaluation-design">
						<div class="section-badge mono">07 - Static evaluation</div>
						<h2 class="section-title">Evaluation was built as an explainable scoring pipeline instead of a black box</h2>
						<p>
							Once search reaches a stopping frontier, the engine needs a scoring function. Rather than using
							an opaque learned model, I built an explicit weighted system. That made it slower to reach peak
							strength than dropping in a black box, but it paid off in debuggability, tunability, and being
							able to explain why the engine preferred one position over another.
						</p>
						<p>
							From a software design perspective, this is feature engineering plus weighted aggregation. The
							engine extracts many small signals, scores them separately for midgame and endgame, and blends
							the result based on phase. The important part is not the domain vocabulary itself, but the fact
							that the scoring logic is modular and parameterised rather than buried in one giant heuristic blob.
						</p>
						<div class="deep-dive-panel">
							<div class="panel-heading">
								<div class="panel-label mono">Scoring Pipeline</div>
								<h3 class="subhead">How a position becomes one comparable number</h3>
							</div>
							<div class="architecture-diagram">
								<div class="arch-node"><span>01</span><strong>Position</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>02</span><strong>Extract features</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>03</span><strong>MG weights</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>04</span><strong>EG weights</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>05</span><strong>Blend by phase</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>06</span><strong>Score</strong></div>
							</div>
						</div>
						<div class="three-col-grid">
							<div class="decision-card">
								<div class="decision-kicker mono">Explainability</div>
								<p>
									Because the model is hand-authored, I can trace a surprising score back to specific feature
									weights instead of treating the evaluator as a mysterious oracle.
								</p>
							</div>
							<div class="decision-card">
								<div class="decision-kicker mono">Phase Awareness</div>
								<p>
									The same feature can matter differently over time, so the scorer interpolates between two
									weight sets rather than assuming one static value is always correct.
								</p>
							</div>
							<div class="decision-card">
								<div class="decision-kicker mono">Parameter Surface</div>
								<p>
									Values and bonuses are exposed as parameters, which makes the system suitable for batch A/B
									testing instead of requiring code edits for every experiment.
								</p>
							</div>
						</div>
						<div class="callout-note">
							This section developed a useful general skill: turning fuzzy domain judgement into a measurable,
							tunable scoring function with clean inputs, clean outputs, and a clear calibration workflow.
						</div>
					</section>

					<section class="notebook-cell" data-section="testing-validation" id="testing-validation">
						<div class="section-badge mono">08 - Caching &amp; performance</div>
						<h2 class="section-title">Caching and hot-path discipline pushed the same hardware much further</h2>
						<p>
							The main performance story here is memoization plus locality. The engine hashes each position into
							a 64-bit key and uses that key to probe a transposition table. If a semantically identical state
							has already been searched, the engine can reuse the previous result instead of paying for the same
							subtree again.
						</p>
						<p>
							The rest of the gains came from hot-path discipline. Fixed-size move arrays avoid heap churn.
							Incremental hashing avoids recomputing identity from scratch. In-place rollback avoids large state
							copies. Time checks happen at intervals rather than every node. None of those changes is glamorous
							on its own, but together they move the engine into a very different performance class.
						</p>
						<figure class="feature-frame">
							<img class="media-img" :src="searchTreeImg" alt="Search tree visual showing recursive exploration of moves and responses" loading="lazy" />
							<figcaption class="media-cap">At the bottom of the stack, the search still reduces to a recursive decision tree, but the architectural value comes from how that tree is bounded, cached, and exposed through stable interfaces.</figcaption>
						</figure>
						<div class="deep-dive-panel">
							<div class="panel-heading">
								<div class="panel-label mono">Cache Flow</div>
								<h3 class="subhead">How repeated work is avoided</h3>
							</div>
							<div class="architecture-diagram">
								<div class="arch-node"><span>01</span><strong>Position</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>02</span><strong>64-bit hash</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>03</span><strong>Bucket probe</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>04</span><strong>Hit / miss</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>05</span><strong>Reuse or search</strong></div>
								<div class="arch-arrow">-&gt;</div>
								<div class="arch-node"><span>06</span><strong>Store result</strong></div>
							</div>
						</div>
						<div class="subsystem-grid">
							<div class="subsystem-card">
								<div class="subsystem-title">Memoization key design</div>
								<p>
									A full board state collapses to one 64-bit identity value. That makes cache lookup cheap,
									but only works because the key is updated exactly during every state transition.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Cache replacement</div>
								<p>
									The table is bucketed and aged, which means the cache is managed as a bounded resource
									rather than as an ever-growing memory sink.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Allocation control</div>
								<p>
									The hot path avoids vectors of transient objects and other allocation-heavy patterns. That
									helps both speed and consistency because GC-style pauses or allocator noise do not exist.
								</p>
							</div>
							<div class="subsystem-card">
								<div class="subsystem-title">Runtime budgeting</div>
								<p>
									The engine checks time periodically instead of constantly, which is a small but important
									example of respecting overhead even in instrumentation and control logic.
								</p>
							</div>
						</div>
						<div class="performance-band">
							<div class="benchmark-card">
								<div class="metric-label mono">Cache role</div>
								<div class="metric-value">TT + Zobrist</div>
								<p>Repeated positions are converted from repeated searches into fast, hash-keyed reuse.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Throughput</div>
								<div class="metric-value">~1.3m pos/s</div>
								<p>Performance was judged by how much stronger search fit into the same time budget.</p>
							</div>
							<div class="benchmark-card">
								<div class="metric-label mono">Tree reduction</div>
								<div class="metric-value">~99.98%</div>
								<p>Pruning, ordering, and caching cut away most of the raw tree before it becomes expensive.</p>
							</div>
						</div>
						<div class="callout-note">
							The useful software lesson here is that performance rarely comes from one clever trick. It comes
							from many small decisions that all reduce unnecessary work, memory traffic, and avoidable latency.
						</div>
					</section>

					<section class="notebook-cell" data-section="iteration-validation" id="iteration-validation">
						<div class="section-badge mono">09 - Iteration &amp; validation</div>
						<h2 class="section-title">Iteration became an experimentation workflow with regression gates</h2>
						<p>
							Once the engine was functional, the work shifted from building features to building a reliable
							feedback loop. Self-play and head-to-head matches became the experiment harness, while perft acted
							as the regression suite that stopped "optimisations" from silently breaking correctness.
						</p>
						<p>
							That is a software engineering pattern I value well beyond this project: measure behaviour with
							production-like workloads, but keep deterministic correctness checks in front of every change. A
							performance win that corrupts state is not a win.
						</p>
						<div class="image-grid image-grid-dual">
							<figure class="feature-frame">
								<img class="media-img media-img-perft" :src="perftImg" alt="Perft validation output used to test chess move generation" loading="lazy" />
								<figcaption class="media-cap">Perft remained the correctness gate before performance claims were trusted.</figcaption>
							</figure>
							<figure class="feature-frame">
								<img
									class="media-img media-img-log"
									:src="engineLogImg"
									alt="Search log from the chess engine while evaluating positions"
									loading="lazy"
								/>
								<figcaption class="media-cap">Self-play and live logs made iteration measurable instead of purely subjective.</figcaption>
							</figure>
						</div>
						<div class="callout-note">
							The project eventually included dedicated tuning infrastructure, so experiments could be compared
							in large batches with confidence instead of by a few anecdotal games.
						</div>
					</section>

					<section class="notebook-cell" data-section="local-ui" id="local-ui">
						<div class="section-badge mono">10 - Local UI</div>
						<h2 class="section-title">The local UI acted as both a product surface and a debugging tool</h2>
						<p>
							The local interface turned the engine from a console-only program into something I could actually
							play against, observe, and debug. That change sounds cosmetic, but it materially improved the
							project because it exposed engine behaviour in a way raw terminal output never could.
						</p>
						<p>
							Building the UI also forced a clean separation between the engine core and the interaction layer.
							The same search and board code had to support local play, visible feedback, and future
							integrations without being rewritten for each front end. In that sense, the UI was a proof that
							the internal API boundary was real rather than accidental.
						</p>
						<div class="two-col-grid">
							<figure class="feature-frame">
								<img class="media-img" :src="gameplayImg" alt="Chess engine gameplay screen showing pieces and move interface" loading="lazy" />
								<figcaption class="media-cap">The local UI made the engine easier to inspect, play against, and trust.</figcaption>
							</figure>
							<div class="stacked-notes">
								<div class="subsystem-card">
									<div class="subsystem-title">Inspectability</div>
									<p>
										Watching moves unfold in a proper interface made search behaviour easier to understand,
										especially when debugging awkward tactical decisions.
									</p>
								</div>
								<div class="subsystem-card">
									<div class="subsystem-title">Practical UX</div>
									<p>
										Local player-vs-engine support, move feedback, and a cleaner presentation pushed the
										project beyond "works in a terminal" toward something others could actually use.
									</p>
								</div>
								<div class="subsystem-card">
									<div class="subsystem-title">Reusable core</div>
									<p>
										The UI was a proof that the engine logic had been decomposed well enough to sit behind
										more than one client.
									</p>
								</div>
							</div>
						</div>
					</section>

					<section class="notebook-cell notebook-cell-end" data-section="lichess-integration" id="lichess-integration">
						<div class="section-badge mono">11 - Lichess integration</div>
						<h2 class="section-title">Lichess integration turned the engine into a real external-facing system</h2>
						<p>
							Lichess integration was the point where the project stopped being a private experiment and had to
							handle real games in a live environment. That meant dealing with external APIs, real-time move
							exchange, and the unpredictability of human and engine opponents outside controlled local tests.
						</p>
						<p>
							For portfolio purposes, this section matters because it shows the work was not limited to core
							algorithms. The engine was taken all the way through to integration, protocol handling, and
							practical use against real opponents on infrastructure I did not control.
						</p>
						<div class="image-grid image-grid-dual">
							<figure class="feature-frame">
								<img class="media-img" :src="lichessImg" alt="Online chess rating or match result screenshot for the engine" loading="lazy" />
								<figcaption class="media-cap">Lichess provided a live environment where strength and reliability were visible.</figcaption>
							</figure>
							<figure class="feature-frame">
								<img class="media-img" :src="lichessAltImg" alt="Additional online chess match or rating screenshot for the engine" loading="lazy" />
								<figcaption class="media-cap">A second result helps show repeatability beyond one isolated online session.</figcaption>
							</figure>
						</div>
						<div class="callout-note">
							Beating me locally was one benchmark. Operating online through a third-party platform was the more
							convincing demonstration that the engine was robust enough to leave the dev environment.
						</div>
					</section>
				</main>
			</div>
		</article>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import chessModelUrl from "../assets/chess-engine/chess_set.glb?url";
import chessBoardImg from "../assets/chess-engine/board.PNG";
import gameplayImg from "../assets/chess-engine/game.PNG";
import lichessImg from "../assets/chess-engine/lichess.png";
import lichessAltImg from "../assets/chess-engine/lichess2.PNG";
import engineLogImg from "../assets/chess-engine/log.PNG";
import perftImg from "../assets/chess-engine/perft_tests.PNG";
import architectureImg from "../assets/chess-engine/architecture.png";
import searchTreeImg from "../assets/chess-engine/search_tree.png";
import trainingEngineVideo from "../assets/chess-engine/training_engine.mp4";

import { createChessGame, fileRankToSquare, squareToFileRank } from "../chess/chessGame.js";
import { StockfishClient, parseUciMove } from "../chess/stockfishClient.js";
import {
	DRAG,
	GRID,
	HOVER_GLOW,
	HOVER_SHAKE,
	MOVE_ANIM,
	TEMPLATE_NAMES,
} from "../chess/detail/constants.js";
import {
	buildBoardTopPlane,
	clonePieceWithTint,
	computeBoardGrid,
	findBoardMesh,
	getBaseCenterXZWorld,
	getBoxExtremeAlongNormal,
	getSquareCenterWorld,
	normalizePieceUprightAndScale,
	placeOnSquare,
	projectPointToPlane,
	recolorBoard,
	snapToBoardTopInPlace,
	squareFromWorldPoint,
} from "../chess/detail/boardGeometry.js";
import { disposeObject3D, easeInOutCubic, sleep, smoothstep } from "../chess/detail/helpers.js";

const canvasRef = ref(null);
const contentRef = ref(null);
const queenCanvasRef = ref(null);

const loading = ref(true);
const progress = ref(0);

let renderer = null;
let scene = null;
let camera = null;
let controls = null;

let queenRenderer = null;
let queenScene = null;
let queenCamera = null;
let queenPieceDisplay = null;
let queenPmrem = null;
let queenEnvTex = null;

let pmrem = null;
let envTex = null;

let root = null;
let boardMesh = null;

let piecesGroup = null;
let meshToPiece = new WeakMap();

let canvasListenersAttached = false;

// Highlights (selection vs hover preview)
let selectionHighlightsGroup = null;
let hoverHighlightsGroup = null;

// Idle hint highlight (separate so it doesn't fight selection/hover)
let idleHintHighlightsGroup = null;

let dotGeo = null;
let captureRingGeo = null;
let selectRingGeo = null;
let highlightQuat = new THREE.Quaternion();

let matMoveSel = null;
let matCaptureSel = null;
let matSelectFrom = null;

let matMoveHover = null;
let matCaptureHover = null;

let matIdleHint = null;

let raf = 0;
const clock = new THREE.Clock();
let elapsed = 0;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let boardPickMeshes = []; // meshes that cover the playable board for raycasting

let hoveredPiece = null;
let hoveredBasePos = null;
let hoveredBaseQuat = null;
let hoveredEmissiveRestore = [];
let hoverStartTime = 0;

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpBox = new THREE.Box3();
const tmpSize = new THREE.Vector3();
const tmpCenter = new THREE.Vector3();
const tmpAxisX = new THREE.Vector3();
const tmpAxisY = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const CAM_LOCAL_UP = new THREE.Vector3(0, 1, 0);

function getCameraUpWorld(out) {
	invariant(camera, "getCameraUpWorld requires camera.");
	return out.copy(CAM_LOCAL_UP).applyQuaternion(camera.quaternion).normalize();
}

// “Down on the screen” in world space = -cameraUpWorld
function getCameraScreenDownWorld(out) {
	return getCameraUpWorld(out).multiplyScalar(-1);
}

let dragCandidate = null; // { pieceRoot, fromSquare, startX, startY }
let draggingPiece = null;
let dragFromSquare = null;

let dragPlane = null;
let dragOffsetPlanar = new THREE.Vector3();
let dragLift = 0;
let dragLastPlanePoint = new THREE.Vector3();
let dragPrevControlsEnabled = false;

// Active piece move animations
let moveAnims = []; // { piece, startPos, endPos, startQuat, endQuat, startT, dur, jumpH, onComplete? }

// ------------------------------------------------------------
// Cinematic scroll config
// ------------------------------------------------------------
const CINEMATIC = {
	// vh per stage
	transitionVh: 210,
	stages: 3,

	smoothing: 6.0,

	titleFadeStart: 0.05,
	titleFadeEnd: 0.32,

	// Start position
	introSideDist: 1.5,
	introUp: 0.02,
	introForward: 0,
	introSide: 0,
	introTargetUp: 0.08,

	// Final Position (stage 1)
	playBack: 1.1,
	playUp: 1.5,
	playSide: -0.0,
	playTargetUp: 0.0,

	// Learn-more Position (stage 2) — subtle lift + full roll upside down
	learnBack: 0.88,
	learnUp: 0.14,
	learnSide: 0.0,
	learnTargetUp: 0.14,
	learnTargetForward: 0.85,
	learnTargetSide: 0.0,
	learnRollRad: Math.PI,

	// Stage 3 (content) — camera pans DOWN to a text card
	contentBack: 0.88,
	contentUp: 0.14,
	contentSide: 0.0,
	contentTargetUp: 0.6,
	contentTargetForward: 0.85,
	contentTargetSide: 0.0,
	contentRollRad: Math.PI,

	twistDeg: 0,
};

// Scroll state (0..2)
let scrollTargetT = 0;
const scrollT = ref(0);
let endAutoAdvanceDone = false;


// Cinematic poses
let introCamPos = new THREE.Vector3();
let introTarget = new THREE.Vector3();
let playCamPos = new THREE.Vector3();
let playTarget = new THREE.Vector3();

// Stage 2 (learn more) pose
let learnCamPos = new THREE.Vector3();
let learnTarget = new THREE.Vector3();

// Stage 3 (content) pose
let contentCamPos = new THREE.Vector3();
let contentTarget = new THREE.Vector3();

// Basis for “white perspective”
let basisCenter = new THREE.Vector3();
let basisUp = new THREE.Vector3();
let basisRight = new THREE.Vector3();
let basisForward = new THREE.Vector3();
let boardSpan = 1;

let cinematicReady = false;

// ------------------------------------------------------------
// Stage 2 -> 3 scene objects
// ------------------------------------------------------------
let contentGroup = null;
let contentCardSprite = null;
let contentCardTexture = null;
let contentCardMaterial = null;

let fallingPiecesGroup = null;
let fallingPieces = []; // { obj, speed, angVel: THREE.Vector3 }
let rainSpawnAcc = 0;

let stage2DropStarted = false;
let stage2DropStartTime = 0;

const STAGE2_DROP = {
	startScrollT: 2.0,      // start dropping existing board pieces once you enter stage 2 transition
	maxDelaySec: 0.75,       // random delay per piece
	speedMinSpan: 0.55,      // multiplied by boardSpan
	speedMaxSpan: 1.30,
	cullBelowSpan: 3.25,     // remove once below center by this span
};

const BG_RAIN = {
	startScrollT: 1.60,      // start background rain when camera begins panning to the text card
	spinScrollT: 2.8,       // “then” -> start spawning spinning pieces late in the transition
	rateStraight: 10.0,       // pieces/sec (upright)
	rateSpin: 14.0,          // pieces/sec (random rotation)
	maxPieces: 140,
	spawnRadiusSpan: 1.8,
	spawnHeightSpan: 2.2,
	speedMinSpan: 0.85,
	speedMaxSpan: 1.0,
	angVelMax: 3.0,          // rad/sec
	cullBelowSpan: 3.8,
	minCamDistSpan: 1.05,
};

// ------------------------------------------------------------
// Stage 3 lock (once fully reached, prevent scrolling back up)
// ------------------------------------------------------------
const CONTENT_LOCK = {
	activateAtScrollT: 2.98, // near the end of stage 2->3 (3.0 is fully complete)
};

let contentLockActive = false;
let contentLockMinY = 0;

function computeContentLockMinY() {
	const el = contentRef.value;
	if (el) {
		const r = el.getBoundingClientRect();
		return Math.round(r.top + window.scrollY);
	}
	return stageLenPx() * CINEMATIC.stages;
}

function enforceContentMinScroll() {
	if (!contentLockActive) return;
	if (window.scrollY < contentLockMinY) {
		window.scrollTo({ top: contentLockMinY, behavior: "auto" });
	}
}

function setHeaderVisible(visible) {
	// This assumes your header can be controlled by a global class.
	// If your header uses a store instead, swap this implementation.
	document.documentElement.classList.toggle("header-visible", visible);
}


// ------------------------------------------------------------
// Chess state (logic)
// ------------------------------------------------------------
const game = createChessGame();
let templatesGlobal = null;
let boardInfoGlobal = null;

const squareToPiece = new Map(); // square => Object3D root
let selected = null; // { pieceRoot, fromSquare }
let selectedMoves = []; // verbose moves from chess.js

// Engine
let engine = null;
const engineThinking = ref(false);

// End scene state: null | "win" | "lose" | "draw" | "gameover"
const endScene = ref(null);

const heroTitle = computed(() => {
	if (endScene.value === "win") return "You won!";
	if (endScene.value === "lose") return "You lost";
	if (endScene.value === "draw") return "Draw";
	if (endScene.value === "gameover") return "Game over";
	return "Chess Engine C++";
});

const pageTheme = computed(() => {
	if (endScene.value === "win") return "theme-win";
	if (endScene.value === "lose") return "theme-lose";
	if (endScene.value === "draw") return "theme-draw";
	if (endScene.value === "gameover") return "theme-draw"; // neutral look; change if you want
	return "theme-default";
});

// ------------------------------------------------------------
// Content UX (guided reveal so text doesn't dump all at once)
// ------------------------------------------------------------
const CONTENT_SECTIONS = [
	{ id: "overview", label: "Overview", index: "01" },
	{ id: "problem-framing", label: "Problem Framing", index: "02" },
	{ id: "architecture", label: "System Architecture", index: "03" },
	{ id: "search-optimisation", label: "Search Algorithm", index: "04" },
	{ id: "board-state", label: "Move Generation & Bitboards", index: "05" },
	{ id: "evaluation-design", label: "Static Evaluation", index: "06" },
	{ id: "testing-validation", label: "Caching & Performance", index: "07" },
	{ id: "iteration-validation", label: "Iteration & Validation", index: "08" },
	{ id: "local-ui", label: "Local UI", index: "09" },
	{ id: "lichess-integration", label: "Lichess Integration", index: "10" },
];

const activeSection = ref("overview");

const activeIndex = computed(() => {
	const i = CONTENT_SECTIONS.findIndex((s) => s.id === activeSection.value);
	return Math.max(0, i);
});

function scrollContentIntoView() {
	const el = contentRef.value;
	if (!el) return;

	const r = el.getBoundingClientRect();
	const y = Math.round(r.top + window.scrollY);
	const top = Math.max(contentLockActive ? contentLockMinY : y, y) - 12;

	window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollToContentSection(id) {
	const root = contentRef.value;
	if (!root) {
		scrollContentIntoView();
		return;
	}

	const target = root.querySelector(`#${id}`);
	if (!target) {
		scrollContentIntoView();
		return;
	}

	const r = target.getBoundingClientRect();
	const y = Math.round(r.top + window.scrollY);
	const top = Math.max(contentLockActive ? contentLockMinY : y, y) - 12;
	window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollSectionIntoView(id) {
	const root = contentRef.value;
	if (!root) {
		scrollContentIntoView();
		return;
	}

	const target = root.querySelector(`[data-section="${id}"]`);
	if (!target) {
		scrollContentIntoView();
		return;
	}

	const r = target.getBoundingClientRect();
	const y = Math.round(r.top + window.scrollY);
	const top = Math.max(contentLockActive ? contentLockMinY : y, y) - 12;
	window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function updateActiveSectionFromScroll() {
	const root = contentRef.value;
	if (!root) return;

	const threshold = window.innerHeight * 0.26;
	let current = CONTENT_SECTIONS[0]?.id ?? "overview";

	for (const section of CONTENT_SECTIONS) {
		const el = root.querySelector(`#${section.id}`);
		if (!el) continue;
		const top = el.getBoundingClientRect().top;
		if (top - threshold <= 0) {
			current = section.id;
		} else {
			break;
		}
	}

	activeSection.value = current;
}

// ------------------------------------------------------------
// Idle “Make a move” prompt + d2 pawn shake
// ------------------------------------------------------------
const IDLE_HINT = {
	delayMs: 400,
	square: "e2",
	settledP01: 0.995,
};

// subtle, “selected-ish” shake (continuous while hint is visible)
const IDLE_SHAKE = {
	rotAmp: 0.022,
	posAmp: 0.004,
	freq: 12.0,
};

const cinematicSettled = computed(() => scrollT.value >= IDLE_HINT.settledP01);

const idleHintVisible = ref(false);
let idleHintTimeout = 0;
const didAnyMove = ref(false);

let idleShakePiece = null;
let idleShakeBasePos = null;
let idleShakeBaseQuat = null;

const makeMoveVisible = computed(() => idleHintVisible.value);

function shouldShowIdleHint() {
	if (endScene.value) return false;
	if (didAnyMove.value) return false;
	if (!cinematicSettled.value) return false;
	if (loading.value) return false;
	if (engineThinking.value) return false;
	if (game.isGameOver()) return false;
	if (game.turn() !== "w") return false;
	if (isAnimating()) return false;
	if (isDraggingOrPending()) return false;
	return true;
}

const skipPromptVisible = computed(() => {
	if (loading.value) return false;
	if (!cinematicReady) return false;
	if (endScene.value) return false;
	if (!cinematicSettled.value) return false;

	// avoid offering the button during active interactions
	if (engineThinking.value) return false;
	if (isAnimating()) return false;
	if (isDraggingOrPending()) return false;

	return true;
});

const contentDomVisible = computed(() => {
	return !!endScene.value && scrollT.value >= 2.85;
});

watch(contentDomVisible, (visible) => {
	if (!visible) return;
	nextTick(() => updateActiveSectionFromScroll());
});

function skipToContent() {
	if (endScene.value) return;

	// kill any chess UX state
	endScene.value = "gameover";

	cancelIdleHint();
	clearSelection();
	clearHover();
	detachDragListeners();

	window.scrollTo({ top: 0, behavior: "smooth" });
}


function clearIdleHintHighlights() {
	idleHintHighlightsGroup?.clear?.();
}

function stopIdleShake() {
	if (!idleShakePiece) return;
	idleShakePiece.position.copy(idleShakeBasePos);
	idleShakePiece.quaternion.copy(idleShakeBaseQuat);
	idleShakePiece.updateWorldMatrix(true, true);

	idleShakePiece = null;
	idleShakeBasePos = null;
	idleShakeBaseQuat = null;
}

function cancelIdleHint() {
	if (idleHintTimeout) {
		clearTimeout(idleHintTimeout);
		idleHintTimeout = 0;
	}
	idleHintVisible.value = false;
	clearIdleHintHighlights();
	stopIdleShake();
}

function scheduleIdleHint() {
	cancelIdleHint();
	idleHintTimeout = window.setTimeout(() => {
		if (!shouldShowIdleHint()) return;

		// Only show if the target pawn still exists at d2
		indexPiecesBySquare();
		const p = squareToPiece.get(IDLE_HINT.square);
		if (!p) return;

		idleHintVisible.value = true;
		startIdleHintVisuals();
	}, IDLE_HINT.delayMs);
}

function startIdleHintVisuals() {
	invariant(boardInfoGlobal, "Idle hint requires boardInfoGlobal.");
	invariant(basisRight && basisForward && basisUp, "Idle hint requires cinematic basis vectors.");

	indexPiecesBySquare();
	const pawn = squareToPiece.get(IDLE_HINT.square);
	if (!pawn) return;

	// Store base transform once (don’t drift)
	idleShakePiece = pawn;
	idleShakeBasePos = pawn.position.clone();
	idleShakeBaseQuat = pawn.quaternion.clone();

	// Add a subtle ring under d2 (separate group so it won’t clobber selection)
	clearIdleHintHighlights();
	addIdleHintRing(IDLE_HINT.square);
}

function addIdleHintRing(square) {
	invariant(boardInfoGlobal, "addIdleHintRing requires boardInfoGlobal.");
	invariant(idleHintHighlightsGroup, "addIdleHintRing requires idleHintHighlightsGroup.");

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	const mesh = new THREE.Mesh(selectRingGeo, matIdleHint);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = 10; // behind selection (12/13) but above board
	idleHintHighlightsGroup.add(mesh);
}

watch(cinematicSettled, (settled) => {
	if (!settled) {
		cancelIdleHint();
		return;
	}
	// If we settle while already in a “showable” state, start the timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
});

watch(loading, (isLoading) => {
	if (isLoading) {
		cancelIdleHint();
		return;
	}
	// If loading finishes after we already settled, start the timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
});

// ------------------------------------------------------------

function initThree() {
	invariant(canvasRef.value, "Canvas ref is not set (canvasRef.value is null).");

	// Renderer
	renderer = new THREE.WebGLRenderer({
		canvas: canvasRef.value,
		antialias: true,
		alpha: true,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);

	// Color management (support both newer and older three builds)
	renderer.outputColorSpace = THREE.SRGBColorSpace;

	// Scene
	scene = new THREE.Scene();

	// Camera
	camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 2000);
	camera.position.set(0, 1.2, 3.2);

	// Controls (you disable these in your cinematic every frame, but we still need them created)
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.enabled = false;
	controls.update();

	// Environment lighting
	pmrem = new THREE.PMREMGenerator(renderer);
	envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	// Highlight groups must exist BEFORE loadModel() finishes (your loader callback assumes this)
	selectionHighlightsGroup = new THREE.Group();
	selectionHighlightsGroup.name = "SelectionHighlights";
	scene.add(selectionHighlightsGroup);

	hoverHighlightsGroup = new THREE.Group();
	hoverHighlightsGroup.name = "HoverHighlights";
	scene.add(hoverHighlightsGroup);

	idleHintHighlightsGroup = new THREE.Group();
	idleHintHighlightsGroup.name = "IdleHintHighlights";
	scene.add(idleHintHighlightsGroup);

	// Stage 2 -> 3 props
	contentGroup = new THREE.Group();
	contentGroup.name = "ContentGroup";
	contentGroup.visible = false;
	scene.add(contentGroup);

	fallingPiecesGroup = new THREE.Group();
	fallingPiecesGroup.name = "FallingPieces";
	fallingPiecesGroup.visible = false;
	scene.add(fallingPiecesGroup);

	cinematicReady = false;
}

function initQueenShowcase() {
	if (!queenCanvasRef.value || queenRenderer) return;

	queenRenderer = new THREE.WebGLRenderer({
		canvas: queenCanvasRef.value,
		antialias: true,
		alpha: true,
		powerPreference: "high-performance",
	});
	queenRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	queenRenderer.outputColorSpace = THREE.SRGBColorSpace;

	const rect = queenCanvasRef.value.getBoundingClientRect();
	const width = Math.max(1, Math.round(rect.width));
	const height = Math.max(1, Math.round(rect.height));
	queenRenderer.setSize(width, height, false);

	queenScene = new THREE.Scene();

	queenCamera = new THREE.PerspectiveCamera(30, width / height, 0.01, 100);
	queenCamera.position.set(0, 0.96, 8.9);
	queenCamera.lookAt(0, 1.2, 0);

	queenPmrem = new THREE.PMREMGenerator(queenRenderer);
	queenEnvTex = queenPmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	queenScene.environment = queenEnvTex;

	const hemi = new THREE.HemisphereLight(0xdde7ff, 0x141821, 1.8);
	hemi.position.set(0, 1, 0);
	queenScene.add(hemi);

	const key = new THREE.DirectionalLight(0xfff0d4, 2.2);
	key.position.set(2.4, 3.2, 3.8);
	queenScene.add(key);

	const rim = new THREE.DirectionalLight(0x7ea7ff, 1.05);
	rim.position.set(-3.4, 1.8, -2.6);
	queenScene.add(rim);

	rebuildQueenShowcase();
}

function rebuildQueenShowcase() {
	if (!queenScene || !templatesGlobal) return;

	if (queenPieceDisplay) {
		queenScene.remove(queenPieceDisplay);
		disposeObject3D(queenPieceDisplay);
		queenPieceDisplay = null;
	}

	const queenRoot = new THREE.Group();
	const queenPiece = clonePieceWithTint(templatesGlobal.queen, "white");
	normalizePieceUprightAndScale(queenPiece, 2.8);
	queenRoot.add(queenPiece);

	const bounds = new THREE.Box3();
	const center = new THREE.Vector3();

	bounds.setFromObject(queenRoot);
	bounds.getCenter(center);
	queenRoot.position.x -= center.x;
	queenRoot.position.z -= center.z;

	bounds.setFromObject(queenRoot);
	queenRoot.position.y -= bounds.min.y - 0.12;

	queenScene.add(queenRoot);
	queenPieceDisplay = queenRoot;
}

onMounted(() => {
	initThree();
	initQueenShowcase();
	loadModel();
	startLoop();

	engine = new StockfishClient({
		workerUrl: "/stockfish/stockfish-17.1-lite-single-03e3232.js",
		skillLevel: 2,
		movetimeMs: 120,
	});

	void engine.init();

	onScroll();
	window.addEventListener("resize", onResize, { passive: true });
	window.addEventListener("scroll", onScroll, { passive: true });

	window.addEventListener("wheel", onWheelAutoAdvance, { passive: false });
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", onResize);
	window.removeEventListener("scroll", onScroll);

	// NEW
	window.removeEventListener("wheel", onWheelAutoAdvance);

	cancelIdleHint();
	detachDragListeners();

	if (engine) engine.terminate();
	engine = null;

	setHeaderVisible(false);

	cancelEndAutoSequence();
	stopLoop();
	disposeAll();
});


// ------------------------------------------------------------
// UI / scroll helpers
// ------------------------------------------------------------
const allowedStages = computed(() => (endScene.value ? CINEMATIC.stages : 1));

watch(allowedStages, (maxT) => {
	const lenPx = stageLenPx();
	const maxY = lenPx * maxT;

	// Only clamp scroll position while we're still in cinematic mode.
	// Once contentLockActive is true, you MUST allow scrolling beyond maxY for the cards.
	if (!contentLockActive && window.scrollY > maxY) {
		window.scrollTo({ top: maxY, behavior: "auto" });
	}

	scrollTargetT = Math.min(scrollTargetT, maxT);
	scrollT.value = Math.min(scrollT.value, maxT);

	applyCinematic(scrollT.value, true);
});

const scrollSpacerHeight = computed(() => {
	// You need +100vh so max scrollY can reach stageLenPx() * allowedStages
	return `${CINEMATIC.transitionVh * allowedStages.value + 100}vh`;
});

// Hero transforms
const heroOpacity = computed(() => {
	const p = scrollT.value;
	const t = smoothstep(CINEMATIC.titleFadeStart, CINEMATIC.titleFadeEnd, p);
	return 1 - t;
});

const heroTranslateY = computed(() => {
	const p = scrollT.value;
	const t = smoothstep(0.0, CINEMATIC.titleFadeEnd, p);
	return -28 * t;
});

function cachePiecePlacementMetrics(piece, boardInfo) {
	// Base center (XZ) in world
	const base = getBaseCenterXZWorld(piece);

	// Constant offset (world X/Z) from base-center to root position
	piece.userData.rootMinusBaseXZ = {
		x: piece.position.x - base.x,
		z: piece.position.z - base.z,
	};

	// Constant offset (along board normal) from bottom-most point to root
	tmpBox.setFromObject(piece);
	const bottomDot = getBoxExtremeAlongNormal(tmpBox, boardInfo.normal, false);
	piece.userData.rootMinusBottom = piece.position.dot(boardInfo.normal) - bottomDot;
}

function stageLenPx() {
	return Math.max(1, window.innerHeight * (CINEMATIC.transitionVh / 100));
}

function onScroll() {
	if (endAutoRunning) return;

	const lenPx = stageLenPx();
	const maxT = allowedStages.value;
	const maxY = lenPx * maxT;

	// If we’re NOT in content mode yet, keep the cinematic scroll bounded.
	// Once contentLockActive is true, DO NOT clamp max scroll anymore (you need normal page scrolling).
	if (!contentLockActive && window.scrollY > maxY) {
		window.scrollTo({ top: maxY, behavior: "auto" });
	}

	// Always enforce the MIN lock once active (prevents returning to cinematic)
	if (contentLockActive) {
		enforceContentMinScroll();
	}

	// Cinematic should be driven by a clamped scrollY, but the page can keep scrolling past it.
	const yForCinematic = Math.min(window.scrollY, maxY);
	scrollTargetT = THREE.MathUtils.clamp(yForCinematic / lenPx, 0, maxT);

	if (contentDomVisible.value) {
		updateActiveSectionFromScroll();
	}
}


function onWheelAutoAdvance(ev) {
	if (!endScene.value) return;

	if (endAutoAdvanceDone) return;
	if ((ev.deltaY ?? 0) <= 0) return;

	const topGatePx = Math.max(16, stageLenPx() * 0.08);
	if (window.scrollY > topGatePx) return;

	ev.preventDefault?.();

	endAutoAdvanceDone = true;

	startEndAutoSequence();
}

function loadModel() {
	// Prevent pointer events while loading/reloading
	detachCanvasListeners();

	loading.value = true;
	progress.value = 0;
	cinematicReady = false;

	const loader = new GLTFLoader();

	loader.load(
		chessModelUrl,
		(gltf) => {
			// These now won't crash because groups exist from initThree()
			clearSelection();
			clearHover();
			detachDragListeners();
			disposeHighlightSystem();

			if (piecesGroup) {
				scene.remove(piecesGroup);
				disposeObject3D(piecesGroup);
				piecesGroup = null;
			}

			if (root) {
				scene.remove(root);
				disposeObject3D(root);
				root = null;
			}

			root = gltf.scene;
			root.traverse((o) => {
				if (o.isMesh) o.frustumCulled = true;
			});
			scene.add(root);

			boardMesh = findBoardMesh(root);
			invariant(boardMesh, 'Board mesh not found. Rename the board node or adjust findBoardMesh().');

			const templates = getTemplatesStrict(root);
			templatesGlobal = templates;
			rebuildQueenShowcase();

			hideTemplates(templates);

			const boardRoot = boardMesh.parent ?? boardMesh;

			boardPickMeshes = [];
			boardRoot.traverse((o) => {
				if (!o.isMesh) return;
				if (/pawn|rook|knight|bishop|queen|king/i.test(o.name || "")) return;
				boardPickMeshes.push(o);
			});

			const boardInfo = computeBoardGrid(boardMesh, WORLD_UP);
			boardInfoGlobal = boardInfo;

			recolorBoard(boardRoot, boardInfo.squareSize);

			buildFullSetFromTemplates(templates, boardMesh);
			indexPiecesBySquare();

			setupHighlightSystem(boardInfo);
			setupCinematicFromBoard(boardInfo, boardMesh);

			game.reset();
			endScene.value = null;
			didAnyMove.value = false;
			endAutoAdvanceDone = false;

			resetStage23Effects();

			loading.value = false;

			// Now that piecesGroup/board exist, we can accept pointer input safely.
			attachCanvasListeners();

			if (shouldShowIdleHint()) scheduleIdleHint();
		},
		(evt) => {
			if (!evt?.total) return;
			progress.value = Math.min(1, evt.loaded / evt.total);
		},
		(e) => {
			loading.value = false;
			throwAsync(e);
		}
	);
}

function attachCanvasListeners() {
	invariant(renderer, "attachCanvasListeners requires renderer.");
	const el = renderer.domElement;

	if (canvasListenersAttached) return;

	el.addEventListener("pointermove", onPointerMove, { passive: true });
	el.addEventListener("pointerleave", clearHover, { passive: true });

	// NOTE: passive:false so we *can* preventDefault during drag start on touchpads/mobile.
	el.addEventListener("pointerdown", onPointerDown, { passive: false });

	canvasListenersAttached = true;
}

function detachCanvasListeners() {
	if (!renderer) return;

	const el = renderer.domElement;
	if (!canvasListenersAttached) return;

	el.removeEventListener("pointermove", onPointerMove);
	el.removeEventListener("pointerleave", clearHover);
	el.removeEventListener("pointerdown", onPointerDown);

	canvasListenersAttached = false;
}

function getWinnerColorIfCheckmate() {
	// Assumes chess.js-like API; guarded so it won't crash if wrapper differs.
	if (!game.isGameOver()) return null;

	// If we can detect checkmate, winner is the side that is NOT to move.
	if (typeof game.isCheckmate === "function" && game.isCheckmate()) {
		return game.turn() === "w" ? "black" : "white";
	}

	// Otherwise treat as draw (stalemate/rep/etc.)
	return "draw";
}

function triggerEndSceneIfGameOver() {
	if (endScene.value) return; // only trigger once
	if (!game.isGameOver()) return;

	cancelIdleHint();
	clearSelection();
	clearHover();

	const o = game.outcome();
	if (o.status === "checkmate") endScene.value = (o.winner === "white") ? "win" : "lose";
	else if (o.status === "draw") endScene.value = "draw";

	// WAIT STATE:
	// Snap to the start so the win/lose hero is fully visible (t=0),
	// and wait for the user to scroll before starting the end credits sequence.
	cancelEndAutoSequence();
	endAutoAdvanceDone = false; // re-arm wheel trigger

	// Hard reset scroll + cinematic immediately (avoid mid-fade state)
	window.scrollTo({ top: 0, behavior: "auto" });
	scrollTargetT = 0;
	scrollT.value = 0;
	applyCinematic(0, true);

	// Optional: keep nav hidden here if your header reveals on hover at top
	setHeaderVisible(false);
}


// ------------------------------------------------------------
// End-scene auto-advance timing (seconds per segment)
// ------------------------------------------------------------
const END_AUTO = {
	seg01: 2.0,
	seg12: 1.5,
	seg23: 1.0,
};

let endAutoRaf = 0;
let endAutoStartMs = 0;
let endAutoRunning = false;

function cancelEndAutoSequence() {
	endAutoRunning = false;
	if (endAutoRaf) cancelAnimationFrame(endAutoRaf);
	endAutoRaf = 0;
	endAutoStartMs = 0;
}

function hermite1D(p0, p1, m0, m1, u, dt) {
	const u2 = u * u;
	const u3 = u2 * u;

	const h00 =  2 * u3 - 3 * u2 + 1;
	const h10 =      u3 - 2 * u2 + u;
	const h01 = -2 * u3 + 3 * u2;
	const h11 =      u3 -     u2;

	// Note: tangents scale by dt for time-parameterized Hermite
	return h00 * p0 + h10 * (m0 * dt) + h01 * p1 + h11 * (m1 * dt);
}

function startEndAutoSequence() {
	cancelEndAutoSequence();

	const lenPx = stageLenPx();
	const maxT = allowedStages.value; // should be 3 when endScene is set

	// Keyframes in "t space"
	const P = [0, 1, 2, Math.min(3, maxT)];

	// Segment durations (seconds)
	const D = [
		Math.max(0.001, END_AUTO.seg01),
		Math.max(0.001, END_AUTO.seg12),
		Math.max(0.001, END_AUTO.seg23),
	];

	// Velocities per segment (dt/dtime)
	const V = [
		(P[1] - P[0]) / D[0],
		(P[2] - P[1]) / D[1],
		(P[3] - P[2]) / D[2],
	];

	// Tangents (derivatives w.r.t time) at keyframes:
	// - endpoints: 0 for gentle start/end (one smooth animation feel)
	// - interior: average adjacent velocities -> C1 smooth join
	const M = [
		0.0,
		0.5 * (V[0] + V[1]),
		0.5 * (V[1] + V[2]),
		0.0,
	];

	const Tcum = [0, D[0], D[0] + D[1], D[0] + D[1] + D[2]];
	const totalDur = Tcum[3];

	endAutoStartMs = performance.now();
	endAutoRunning = true;

	// Put the scrollbar at the start cleanly once
	window.scrollTo({ top: 0, behavior: "auto" });

	const step = (nowMs) => {
		if (!endAutoRunning) return;

		const tSec = (nowMs - endAutoStartMs) / 1000;
		const s = Math.min(totalDur, Math.max(0, tSec));

		// Which segment?
		let seg = 0;
		if (s >= Tcum[2]) seg = 2;
		else if (s >= Tcum[1]) seg = 1;

		const segStart = Tcum[seg];
		const segDur = D[seg];
		const u = THREE.MathUtils.clamp((s - segStart) / segDur, 0, 1);

		// Smooth t with continuous velocity across segments
		const newT = hermite1D(P[seg], P[seg + 1], M[seg], M[seg + 1], u, segDur);

		// Drive cinematic directly (no per-frame scrollTo jitter)
		scrollTargetT = newT;

		// OPTIONAL: if you want the scrollbar to match, update it *lightly*.
		// Updating every frame tends to feel "jittery" due to scroll events.
		// This keeps it pretty aligned without fighting your onScroll too hard:
		if ((nowMs | 0) % 2 === 0) {
			window.scrollTo({ top: newT * lenPx, behavior: "auto" });
		}

		if (s >= totalDur - 1e-6) {
			scrollTargetT = P[3];
			window.scrollTo({ top: P[3] * lenPx, behavior: "auto" });
			endAutoRunning = false;
			endAutoRaf = 0;
			return;
		}

		endAutoRaf = requestAnimationFrame(step);
	};

	endAutoRaf = requestAnimationFrame(step);
}


// ------------------------------------------------------------
// “Let errors flow” helpers
// ------------------------------------------------------------
function invariant(cond, msg) {
	if (!cond) throw new Error(msg);
}

// Surface async errors with a proper uncaught stack (GLTFLoader callbacks, etc.)
function throwAsync(err) {
	setTimeout(() => {
		throw err instanceof Error ? err : new Error(String(err));
	}, 0);
}


// ------------------------------------------------------------
// Highlight system (dots + rings)
// ------------------------------------------------------------
function setupHighlightSystem(boardInfo) {
	invariant(selectionHighlightsGroup && hoverHighlightsGroup && idleHintHighlightsGroup, "Highlight groups not initialized.");

	// Clear any old markers
	selectionHighlightsGroup.clear();
	hoverHighlightsGroup.clear();
	idleHintHighlightsGroup.clear();

	const s = boardInfo.squareSize * GRID.spacing;

	const r = s * 0.14;

	dotGeo = new THREE.CircleGeometry(r, 32);
	captureRingGeo = new THREE.RingGeometry(r * 0.55, r * 0.9, 32);
	selectRingGeo = new THREE.RingGeometry(r * 1.25, r * 1.55, 48);

	// Orient XY => board plane (x=fileAxis, y=rankAxis, z=normal)
	tmpM.makeBasis(boardInfo.fileAxis, boardInfo.rankAxis, boardInfo.normal);
	highlightQuat.setFromRotationMatrix(tmpM);

	const common = {
		transparent: true,
		depthWrite: false,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1,
	};

	matMoveSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matCaptureSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matSelectFrom = new THREE.MeshBasicMaterial({ color: 0x2f3440, opacity: 0.55, ...common });

	matMoveHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });
	matCaptureHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });

	matIdleHint = new THREE.MeshBasicMaterial({ color: 0x2f3440, opacity: 0.22, ...common });
}

function disposeHighlightSystem() {
	selectionHighlightsGroup?.clear();
	hoverHighlightsGroup?.clear();
	idleHintHighlightsGroup?.clear();

	dotGeo?.dispose?.();
	dotGeo = null;
	captureRingGeo?.dispose?.();
	captureRingGeo = null;
	selectRingGeo?.dispose?.();
	selectRingGeo = null;

	matMoveSel?.dispose?.();
	matMoveSel = null;
	matCaptureSel?.dispose?.();
	matCaptureSel = null;
	matSelectFrom?.dispose?.();
	matSelectFrom = null;

	matMoveHover?.dispose?.();
	matMoveHover = null;
	matCaptureHover?.dispose?.();
	matCaptureHover = null;

	matIdleHint?.dispose?.();
	matIdleHint = null;
}

function clearSelectionHighlights() {
	invariant(selectionHighlightsGroup, "selectionHighlightsGroup is not initialized.");
	selectionHighlightsGroup.clear();
}

function clearHoverHighlights() {
	invariant(hoverHighlightsGroup, "hoverHighlightsGroup is not initialized.");
	hoverHighlightsGroup.clear();
}

function addMoveMarker(square, kind, mode) {
	invariant(boardInfoGlobal, "addMoveMarker requires boardInfoGlobal.");

	const isSel = mode === "selection";
	const group = isSel ? selectionHighlightsGroup : hoverHighlightsGroup;

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	let geo = dotGeo;
	let mat = isSel ? matMoveSel : matMoveHover;

	if (kind === "capture") {
		geo = captureRingGeo;
		mat = isSel ? matCaptureSel : matCaptureHover;
	}

	const mesh = new THREE.Mesh(geo, mat);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = isSel ? 12 : 11;

	// Only selection markers are clickable for "move now"
	if (isSel) mesh.userData.square = square;

	group.add(mesh);
}

function addFromMarker(square) {
	invariant(boardInfoGlobal, "addFromMarker requires boardInfoGlobal.");
	invariant(selectionHighlightsGroup, "addFromMarker requires selectionHighlightsGroup.");

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	const mesh = new THREE.Mesh(selectRingGeo, matSelectFrom);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = 13;
	selectionHighlightsGroup.add(mesh);
}

function showSelectionAndMoves(fromSquare, movesVerbose) {
	clearSelectionHighlights();
	clearHoverHighlights(); // selection should "own" the board UI

	addFromMarker(fromSquare);

	for (const m of movesVerbose) {
		const isCap = m.flags?.includes("c") || m.flags?.includes("e");
		addMoveMarker(m.to, isCap ? "capture" : "move", "selection");
	}
}

function showHoverMoves(pieceRoot) {
	clearHoverHighlights();
	if (!pieceRoot) return;
	if (selected?.pieceRoot === pieceRoot) return;
	if (engineThinking.value || game.isGameOver()) return;

	const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
	const turnColor = game.turn() === "w" ? "white" : "black";
	if (pieceRoot.userData.color !== turnColor) return;

	const moves = game.legalMovesFrom(sq);
	for (const m of moves) {
		const isCap = m.flags?.includes("c") || m.flags?.includes("e");
		addMoveMarker(m.to, isCap ? "capture" : "move", "hover");
	}
}

function getPieceRootFromHit(obj) {
	let o = obj;
	while (o) {
		const pr = meshToPiece.get(o);
		if (pr) return pr;
		o = o.parent;
	}
	return null;
}

function isAnimating() {
	return moveAnims.length > 0;
}

function isDraggingOrPending() {
	return !!dragCandidate || !!draggingPiece;
}

function updateRayFromEvent(ev) {
	invariant(renderer, "renderer is null in updateRayFromEvent.");
	invariant(camera, "camera is null in updateRayFromEvent.");

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
	pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

	raycaster.setFromCamera(pointer, camera);
}

function setCursor(c) {
	document.body.style.cursor = c || "";
}

// ------------------------------------------------------------
// Click / drag handling
// ------------------------------------------------------------
function onPointerDown(ev) {
	// Any interaction kills the hint immediately (text + ring + shake)
	if (endScene.value) return;
	cancelIdleHint();

	invariant(!loading.value, "Pointer interaction while model is still loading.");
	invariant(renderer && camera, "Pointer interaction before renderer/camera ready.");
	invariant(piecesGroup && boardMesh && boardInfoGlobal, "Pointer interaction before board/pieces are ready.");

	if (engineThinking.value) return;
	if (isAnimating()) return;

	// If we were mid-drag for any reason, end it cleanly.
	if (isDraggingOrPending()) {
		detachDragListeners();
		dragCandidate = null;
		draggingPiece = null;
		dragFromSquare = null;
	}

	updateRayFromEvent(ev);

	// 1) Click on a selection move dot => attempt move immediately
	if (selectionHighlightsGroup) {
		const hlHits = raycaster.intersectObject(selectionHighlightsGroup, true);
		if (hlHits.length) {
			const sq = hlHits[0].object?.userData?.square;
			if (sq) {
				tryMoveTo(sq, { fromDrag: false });
				return;
			}
		}
	}

	// 2) Click on a piece
	const pieceHits = raycaster.intersectObject(piecesGroup, true);
	if (pieceHits.length) {
		const pieceRoot = getPieceRootFromHit(pieceHits[0].object);
		if (pieceRoot) {
			const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
			const turnColor = game.turn() === "w" ? "white" : "black";

			// If we have a selection, clicking an enemy on a legal square should CAPTURE
			if (selected) {
				const legal = selectedMoves.some((m) => m.to === sq);
				const enemy = pieceRoot.userData.color !== selected.pieceRoot.userData.color;

				if (legal && enemy) {
					tryMoveTo(sq, { fromDrag: false });
					return;
				}
			}

			// Own-piece interaction: select + allow drag
			if (pieceRoot.userData.color === turnColor) {
				trySelectPiece(pieceRoot);

				// Only set up drag if it actually stayed selected
				if (selected?.pieceRoot === pieceRoot) {
					dragCandidate = {
						pieceRoot,
						fromSquare: sq,
						startX: ev.clientX,
						startY: ev.clientY,
					};

					attachDragListeners();
				}
				return;
			}

			// Enemy piece clicked when nothing selected: behave like before (clear selection)
			clearSelection();
			return;
		}
	}

	// 3) Click on board => if selected, try move to that square; else clear selection
	const boardHits = boardPickMeshes.length
		? raycaster.intersectObjects(boardPickMeshes, true)
		: raycaster.intersectObject(boardMesh, true);

	if (boardHits.length) {
		const sq = squareFromWorldPoint(boardHits[0].point, boardInfoGlobal);

		if (!sq) {
			clearSelection();
			return;
		}

		if (selected) {
			tryMoveTo(sq, { fromDrag: false });
			return;
		}

		clearSelection();
		return;
	}

	clearSelection();
}

function attachDragListeners() {
	window.addEventListener("pointermove", onDragPointerMove, { passive: false });
	window.addEventListener("pointerup", onDragPointerUp, { passive: false });
	window.addEventListener("pointercancel", onDragPointerUp, { passive: false });
}

function detachDragListeners() {
	window.removeEventListener("pointermove", onDragPointerMove);
	window.removeEventListener("pointerup", onDragPointerUp);
	window.removeEventListener("pointercancel", onDragPointerUp);

	dragCandidate = null;

	// Restore controls if we were dragging
	if (draggingPiece) {
		controls.enabled = dragPrevControlsEnabled;
	}

	draggingPiece = null;
	dragFromSquare = null;
	dragPlane = null;
	dragLift = 0;
	dragOffsetPlanar.set(0, 0, 0);
}

function startDraggingFromCandidate(ev) {
	if (!dragCandidate || draggingPiece) return;

	invariant(boardInfoGlobal, "startDraggingFromCandidate requires boardInfoGlobal.");
	invariant(controls, "startDraggingFromCandidate requires controls.");

	draggingPiece = dragCandidate.pieceRoot;
	dragFromSquare = dragCandidate.fromSquare;

	dragCandidate = null;

	clearHover(); // no glow/jiggle fighting drag
	setCursor("grabbing");

	dragPrevControlsEnabled = controls.enabled;
	controls.enabled = false;

	dragPlane = buildBoardTopPlane(boardInfoGlobal);
	dragLift = boardInfoGlobal.squareSize * DRAG.liftRatio;

	// Compute intersection point on plane
	updateRayFromEvent(ev);
	const hit = raycaster.ray.intersectPlane(dragPlane, tmpTarget);
	invariant(hit, "Ray did not intersect drag plane.");

	dragLastPlanePoint.copy(hit);

	// Offset so we don't snap the piece center to cursor
	const pieceProj = projectPointToPlane(draggingPiece.position, dragPlane, tmpV);
	dragOffsetPlanar.copy(pieceProj).sub(dragLastPlanePoint);

	// Lift immediately
	tmpTarget.copy(dragLastPlanePoint).add(dragOffsetPlanar).addScaledVector(boardInfoGlobal.normal, dragLift);
	draggingPiece.position.copy(tmpTarget);
	draggingPiece.updateWorldMatrix(true, true);
}

function updateDragging(ev) {
	invariant(draggingPiece && dragPlane && boardInfoGlobal, "updateDragging called without active drag.");

	ev.preventDefault?.();

	updateRayFromEvent(ev);
	const hit = raycaster.ray.intersectPlane(dragPlane, tmpTarget);
	invariant(hit, "Ray did not intersect drag plane during drag.");

	dragLastPlanePoint.copy(hit);

	tmpTarget.copy(dragLastPlanePoint)
		.add(dragOffsetPlanar)
		.addScaledVector(boardInfoGlobal.normal, dragLift);

	draggingPiece.position.copy(tmpTarget);
	draggingPiece.updateWorldMatrix(true, true);
}

function onDragPointerMove(ev) {
	if (!dragCandidate && !draggingPiece) return;
	if (engineThinking.value) return;
	if (isAnimating()) return;

	invariant(renderer && camera && boardInfoGlobal, "Drag move before renderer/camera/boardInfoGlobal ready.");

	if (draggingPiece) {
		updateDragging(ev);
		return;
	}

	// Candidate -> decide if we start dragging
	const dx = ev.clientX - dragCandidate.startX;
	const dy = ev.clientY - dragCandidate.startY;
	if (Math.hypot(dx, dy) >= DRAG.thresholdPx) {
		startDraggingFromCandidate(ev);
	}
}

function onDragPointerUp(ev) {
	if (!dragCandidate && !draggingPiece) return;

	// If we never started dragging: just clean up listeners.
	if (dragCandidate && !draggingPiece) {
		detachDragListeners();
		setCursor("");
		return;
	}

	invariant(boardInfoGlobal, "Drop without boardInfoGlobal.");

	// Dropping a piece
	invariant(draggingPiece, "Drop without draggingPiece.");

	// Compute drop square from the planar position under cursor (plus our planar offset)
	updateRayFromEvent(ev);
	const hit = dragPlane ? raycaster.ray.intersectPlane(dragPlane, tmpTarget) : null;
	invariant(hit, "Ray did not intersect drag plane on drop.");
	dragLastPlanePoint.copy(hit);

	const planar = tmpV.copy(dragLastPlanePoint).add(dragOffsetPlanar);

	const toSq = squareFromWorldPoint(planar, boardInfoGlobal);

	// Restore cursor / controls now (the animation will run independently)
	setCursor("");
	controls.enabled = dragPrevControlsEnabled;

	// Validate move before calling tryMoveTo (because tryMoveTo assumes visuals are still on squares)
	const fromSq = dragFromSquare;
	const piece = draggingPiece;

	detachDragListeners();

	// No square / same square => cancel (return + keep selection consistent)
	if (!toSq || !fromSq || toSq === fromSq) {
		animatePieceRootToSquare(piece, fromSq, {
			durationSec: MOVE_ANIM.dragCancelDurationSec,
			jumpHeightRatio: 0.0,
		});
		return;
	}

	// Must still be selected and legal
	const ok = !!selected && selected.fromSquare === fromSq && selectedMoves.some((m) => m.to === toSq);
	if (!ok) {
		// Return and clear selection (matches your click-to-illegal behavior)
		animatePieceRootToSquare(piece, fromSq, {
			durationSec: MOVE_ANIM.dragCancelDurationSec,
			jumpHeightRatio: 0.0,
		});
		clearSelection();
		return;
	}

	tryMoveTo(toSq, { fromDrag: true });
}

function trySelectPiece(pieceRoot) {
	// User is interacting: hide hint immediately
	cancelIdleHint();

	indexPiecesBySquare();

	const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
	const turnColor = game.turn() === "w" ? "white" : "black";

	// Enforce turn
	if (pieceRoot.userData.color !== turnColor) {
		clearSelection();
		return;
	}

	// Toggle off if re-clicked
	if (selected?.fromSquare === sq) {
		clearSelection();
		return;
	}

	const moves = game.legalMovesFrom(sq);
	selected = { pieceRoot, fromSquare: sq };
	selectedMoves = moves;

	showSelectionAndMoves(sq, moves);
}

function tryMoveTo(toSquare, { fromDrag = false } = {}) {
	if (!selected) return;
	if (isAnimating()) return;

	cancelIdleHint();

	const fromSquare = selected.fromSquare;

	const ok = selectedMoves.some((m) => m.to === toSquare);
	if (!ok) {
		clearSelection();
		return;
	}

	clearHover();
	clearIdleHintHighlights();

	const result = game.tryMove(fromSquare, toSquare, "q");
	if (!result) {
		clearSelection();
		return;
	}

	applyMoveToScene(result, selected.pieceRoot, fromSquare, toSquare, { fromDrag });

	didAnyMove.value = true;
	cancelIdleHint();

	clearSelection();

	// If user ended the game (mate/stalemate/etc.), show end scene and don't ask engine to move.
	triggerEndSceneIfGameOver();
	if (game.isGameOver()) return;

	void maybePlayBlackMove();
}


async function maybePlayBlackMove() {
	if (endScene.value) return;
	if (!engine) return;
	if (game.isGameOver()) return;
	if (game.turn() !== "b") return;

	engineThinking.value = true;
	clearSelection();
	clearHover();
	cancelIdleHint();

	try {
		await sleep(1000);

		const uci = await engine.bestMoveFromFen(game.fen(), { movetimeMs: 120 });
		if (!uci || uci === "(none)") return;

		const mv = parseUciMove(uci);
		if (!mv) return;

		indexPiecesBySquare();
		const pieceRoot = squareToPiece.get(mv.from);
		if (!pieceRoot) return;

		const result = game.tryMove(mv.from, mv.to, mv.promotion || "q");
		if (!result) return;

		applyMoveToScene(result, pieceRoot, mv.from, mv.to, { fromDrag: false });

		didAnyMove.value = true;
		cancelIdleHint();
		triggerEndSceneIfGameOver();
	} finally {
		engineThinking.value = false;

		if (shouldShowIdleHint()) scheduleIdleHint();
	}
}

function clearSelection() {
	selected = null;
	selectedMoves = [];
	clearSelectionHighlights();

	// If you're currently hovering something (and it's your turn), restore hover preview
	if (hoveredPiece) showHoverMoves(hoveredPiece);

	// When selection clears, if we’re otherwise eligible, restart idle timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
}

// ------------------------------------------------------------
// Apply move to scene (captures, castling, en-passant, promotion)
// ------------------------------------------------------------
function applyMoveToScene(moveResult, movedPieceRoot, fromSquare, toSquare, { fromDrag = false } = {}) {
	const dur = fromDrag ? MOVE_ANIM.dragDropDurationSec : MOVE_ANIM.durationSec;
	const jumpRatio = fromDrag ? MOVE_ANIM.dragDropJumpHeightRatio : MOVE_ANIM.jumpHeightRatio;

	// Captures
	if (moveResult.flags?.includes("e")) {
		const { file: tf } = squareToFileRank(toSquare);
		const { rank: fr } = squareToFileRank(fromSquare);
		const capSq = fileRankToSquare(tf, fr);
		removePieceAtSquare(capSq);
	} else if (moveResult.flags?.includes("c")) {
		removePieceAtSquare(toSquare);
	}

	// Promotion needs to swap AFTER the landing (looks better)
	let promotionType = null;
	if (moveResult.flags?.includes("p")) {
		const promo = (moveResult.promotion || "q").toLowerCase();
		promotionType =
			promo === "q" ? "queen" :
			promo === "r" ? "rook" :
			promo === "b" ? "bishop" :
			promo === "n" ? "knight" :
			"queen";
	}

	// Move the piece (jump anim or drag settle)
	animatePieceRootToSquare(movedPieceRoot, toSquare, {
		durationSec: dur,
		jumpHeightRatio: jumpRatio,
		onComplete: () => {
			if (promotionType) {
				replacePieceWithType(movedPieceRoot, promotionType, toSquare);
			}
			indexPiecesBySquare();
		},
	});

	// Castling: move rook too
	if (moveResult.flags?.includes("k") || moveResult.flags?.includes("q")) {
		const side = moveResult.flags.includes("k") ? "k" : "q";
		const color = moveResult.color === "w" ? "w" : "b";

		const rookMoves = {
			w: {
				k: { from: "h1", to: "f1" },
				q: { from: "a1", to: "d1" },
			},
			b: {
				k: { from: "h8", to: "f8" },
				q: { from: "a8", to: "d8" },
			},
		};

		const rm = rookMoves[color][side];
		const rook = squareToPiece.get(rm.from);
		if (rook) {
			animatePieceRootToSquare(rook, rm.to, {
				durationSec: dur,
				jumpHeightRatio: MOVE_ANIM.jumpHeightRatio, // keep some life on rook movement
			});
		}
	}

	// Update mapping now (logic) even though visuals animate
	indexPiecesBySquare();
}

function animatePieceRootToSquare(pieceRoot, square, opts = {}) {
	invariant(boardInfoGlobal, "animatePieceRootToSquare requires boardInfoGlobal.");
	invariant(pieceRoot, "animatePieceRootToSquare requires pieceRoot.");

	const {
		durationSec = MOVE_ANIM.durationSec,
		onComplete = null,
		jumpHeightRatio = MOVE_ANIM.jumpHeightRatio,
	} = opts;

	// Record start
	const startPos = pieceRoot.position.clone();
	const startQuat = pieceRoot.quaternion.clone();

	// Update logical square immediately
	const { file, rank } = squareToFileRank(square);
	pieceRoot.userData.file = file;
	pieceRoot.userData.rank = rank;
	pieceRoot.userData.square = square;

	// Compute end transform by placing, then restore
	placeOnSquare(pieceRoot, boardInfoGlobal, file, rank, pieceRoot.userData.color);
	const endPos = pieceRoot.position.clone();
	const endQuat = pieceRoot.quaternion.clone();

	pieceRoot.position.copy(startPos);
	pieceRoot.quaternion.copy(startQuat);
	pieceRoot.updateWorldMatrix(true, true);

	const jumpH = boardInfoGlobal.squareSize * Math.max(0, jumpHeightRatio);

	moveAnims.push({
		piece: pieceRoot,
		startPos,
		endPos,
		startQuat,
		endQuat,
		startT: elapsed,
		dur: Math.max(0.05, durationSec),
		jumpH: Math.max(0, jumpH),
		onComplete,
	});
}

function updateMoveAnimations(nowT) {
	if (!moveAnims.length) return;

	const upDir = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : (boardInfoGlobal?.normal || WORLD_UP);

	for (let i = moveAnims.length - 1; i >= 0; i--) {
		const a = moveAnims[i];
		const t = (nowT - a.startT) / a.dur;

		if (t >= 1) {
			a.piece.position.copy(a.endPos);
			a.piece.quaternion.copy(a.endQuat);
			a.piece.updateWorldMatrix(true, true);

			a.onComplete?.();

			moveAnims.splice(i, 1);
			continue;
		}

		const e = easeInOutCubic(Math.max(0, Math.min(1, t)));
		const jump = Math.sin(Math.PI * e) * a.jumpH;

		tmpTarget.copy(a.startPos).lerp(a.endPos, e).addScaledVector(upDir, jump);
		a.piece.position.copy(tmpTarget);
		a.piece.quaternion.slerpQuaternions(a.startQuat, a.endQuat, e);
		a.piece.updateWorldMatrix(true, true);
	}
}

function removePieceAtSquare(square) {
	const victim = squareToPiece.get(square);
	if (!victim || !piecesGroup) return;

	piecesGroup.remove(victim);
	disposeObject3D(victim);
}

function replacePieceWithType(oldPiece, newType, square) {
	invariant(piecesGroup, "replacePieceWithType requires piecesGroup.");
	invariant(templatesGlobal, "replacePieceWithType requires templatesGlobal.");
	invariant(boardInfoGlobal, "replacePieceWithType requires boardInfoGlobal.");

	const color = oldPiece.userData.color;
	const { file, rank } = squareToFileRank(square);

	// Remove old
	piecesGroup.remove(oldPiece);
	disposeObject3D(oldPiece);

	// Spawn new
	const newPiece = clonePieceWithTint(templatesGlobal[newType], color);
	newPiece.userData.type = newType;
	newPiece.userData.color = color;
	newPiece.userData.file = file;
	newPiece.userData.rank = rank;
	newPiece.userData.square = square;
	newPiece.name = `${color}_${newType}_${file}_${rank}`;

	normalizePieceUprightAndScale(newPiece, boardInfoGlobal.squareSize, color);
	placeOnSquare(newPiece, boardInfoGlobal, file, rank, color);

	newPiece.traverse((o) => {
		if (o.isMesh) meshToPiece.set(o, newPiece);
	});

	piecesGroup.add(newPiece);
}

function indexPiecesBySquare() {
	squareToPiece.clear();
	if (!piecesGroup) return;

	for (const piece of piecesGroup.children) {
		const sq = fileRankToSquare(piece.userData.file, piece.userData.rank);
		piece.userData.square = sq;
		squareToPiece.set(sq, piece);
	}
}

// ------------------------------------------------------------
// Cinematic camera path (scroll driven)
// ------------------------------------------------------------
function setupCinematicFromBoard(boardInfo, board) {
	tmpBox.setFromObject(board);
	tmpBox.getSize(tmpSize);
	tmpBox.getCenter(tmpCenter);

	boardSpan = Math.max(tmpSize.x, tmpSize.z);

	basisCenter.copy(boardInfo.center);
	basisRight.copy(boardInfo.fileAxis).normalize();
	basisForward.copy(boardInfo.rankAxis).normalize();
	basisUp.copy(boardInfo.normal).normalize();
	if (basisUp.dot(WORLD_UP) < 0) basisUp.multiplyScalar(-1);

	// INTRO (side spectator)
	introTarget.copy(basisCenter).addScaledVector(basisUp, boardSpan * CINEMATIC.introTargetUp);
	introCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.introUp)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.introSideDist)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.introForward);

	// PLAY (White perspective) — stage 1
	playTarget.copy(basisCenter).addScaledVector(basisUp, boardSpan * CINEMATIC.playTargetUp);
	playCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.playUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.playBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.playSide);

	// Stage 2
	learnTarget.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.learnTargetUp)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.learnTargetForward)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.learnTargetSide);
	learnCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.learnUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.learnBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.learnSide);

	// Stage 3 (content card)
	contentTarget.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.contentTargetUp)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.contentTargetForward)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.contentTargetSide);
	contentCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.contentUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.contentBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.contentSide);

	ensureContentCard(); // creates/places the “Carpe diem” text box at contentTarget

	if (Math.abs(CINEMATIC.twistDeg) > 1e-6) {
		const twist = THREE.MathUtils.degToRad(CINEMATIC.twistDeg);
		tmpQuat.setFromAxisAngle(basisUp, twist);

		const off = tmpV.copy(playCamPos).sub(basisCenter).applyQuaternion(tmpQuat);
		playCamPos.copy(basisCenter).add(off);
	}

	camera.position.copy(introCamPos);
	controls.target.copy(introTarget);

	const introDist = camera.position.distanceTo(controls.target);
	camera.near = Math.max(0.01, introDist / 100);
	camera.far = Math.max(500, introDist * 6);

	camera.updateProjectionMatrix();
	controls.update();

	cinematicReady = true;
	applyCinematic(scrollTargetT, true);
}

function applyCinematic(t, force = false) {
	if (!cinematicReady) return;

	const clamped = THREE.MathUtils.clamp(t, 0, allowedStages.value);

	let roll = 0;

	// We'll compute a target vector each frame (don’t let OrbitControls rebuild camera rotation)
	const target = tmpTarget;

	if (clamped <= 1) {
		// Stage 0 -> 1
		const e = easeInOutCubic(clamped);
		camera.position.lerpVectors(introCamPos, playCamPos, e);
		target.lerpVectors(introTarget, playTarget, e);
		roll = 0;
	} else if (clamped <= 2) {
		// Stage 1 -> 2
		const u = THREE.MathUtils.clamp(clamped - 1, 0, 1);
		const e = easeInOutCubic(u);
		camera.position.lerpVectors(playCamPos, learnCamPos, e);
		target.lerpVectors(playTarget, learnTarget, e);
		roll = CINEMATIC.learnRollRad * e;
	} else {
		// Stage 2 -> 3 (pan down to text card)
		const u = THREE.MathUtils.clamp(clamped - 2, 0, 1);
		const e = easeInOutCubic(u);
		camera.position.lerpVectors(learnCamPos, contentCamPos, e);
		target.lerpVectors(learnTarget, contentTarget, e);
		roll = THREE.MathUtils.lerp(CINEMATIC.learnRollRad, CINEMATIC.contentRollRad, e);
 	}

	// Keep controls target in sync for anything else relying on it
	if (controls) controls.target.copy(target);

	// CRITICAL: reset camera orientation every frame, then apply roll.
	// This prevents quaternion accumulation (“corkscrew” twisting).
	const up = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : WORLD_UP;
	camera.up.copy(up);
	camera.lookAt(target);

	// Roll around the view axis (camera local Z) after lookAt
	if (Math.abs(roll) > 1e-6) {
		camera.rotateZ(roll);
	}

	camera.updateMatrixWorld(true);
	if (force) camera.updateProjectionMatrix();
}

// ------------------------------------------------------------
// Strict templates (no fallback)
// ------------------------------------------------------------
function getTemplatesStrict(rootObj) {
	const out = {};
	for (const [type, name] of Object.entries(TEMPLATE_NAMES)) {
		const node = rootObj.getObjectByName(name);
		if (!node) throw new Error(`Missing template node "${name}" for type "${type}".`);
		out[type] = node;
	}
	return out;
}

function hideTemplates(templates) {
	for (const t of Object.values(templates)) t.visible = false;
}

// ------------------------------------------------------------
// Build full set
// ------------------------------------------------------------
function buildFullSetFromTemplates(templates, board) {
	clearHover();

	if (piecesGroup) {
		scene.remove(piecesGroup);
		disposeObject3D(piecesGroup);
		piecesGroup = null;
	}

	piecesGroup = new THREE.Group();
	piecesGroup.name = "GeneratedPieces";
	scene.add(piecesGroup);

	meshToPiece = new WeakMap();

	const boardInfo = computeBoardGrid(board, WORLD_UP);

	const addPiece = (type, color, file, rank) => {
		const piece = clonePieceWithTint(templates[type], color);

		piece.userData.type = type;
		piece.userData.color = color;
		piece.userData.file = file;
		piece.userData.rank = rank;

		piece.name = `${color}_${type}_${file}_${rank}`;

		normalizePieceUprightAndScale(piece, boardInfo.squareSize, color);
		placeOnSquare(piece, boardInfo, file, rank, color);
		cachePiecePlacementMetrics(piece, boardInfo);

		piece.traverse((o) => {
			if (o.isMesh) meshToPiece.set(o, piece);
		});

		piecesGroup.add(piece);
	};

	// White
	addPiece("rook", "white", 0, 0);
	addPiece("knight", "white", 1, 0);
	addPiece("bishop", "white", 2, 0);
	addPiece("queen", "white", 3, 0);
	addPiece("king", "white", 4, 0);
	addPiece("bishop", "white", 5, 0);
	addPiece("knight", "white", 6, 0);
	addPiece("rook", "white", 7, 0);
	for (let f = 0; f < 8; f++) addPiece("pawn", "white", f, 1);

	// Black
	addPiece("rook", "black", 0, 7);
	addPiece("knight", "black", 1, 7);
	addPiece("bishop", "black", 2, 7);
	addPiece("queen", "black", 3, 7);
	addPiece("king", "black", 4, 7);
	addPiece("bishop", "black", 5, 7);
	addPiece("knight", "black", 6, 7);
	addPiece("rook", "black", 7, 7);
	for (let f = 0; f < 8; f++) addPiece("pawn", "black", f, 6);

	piecesGroup.updateMatrixWorld(true);
}

// ------------------------------------------------------------
// Hover pick + glow + time-limited jiggle + hover move preview
// ------------------------------------------------------------
function onPointerMove(ev) {
	if (endScene.value) return;
	invariant(!loading.value, "Pointer move while model is loading.");
	invariant(piecesGroup, "Pointer move before piecesGroup is ready.");
	invariant(renderer && camera, "Pointer move before renderer/camera ready.");

	if (isAnimating()) return;
	if (isDraggingOrPending()) return;

	updateRayFromEvent(ev);

	const hits = raycaster.intersectObject(piecesGroup, true);
	if (!hits.length) {
		clearHover();
		return;
	}

	const pieceRoot = getPieceRootFromHit(hits[0].object);
	if (!pieceRoot) {
		clearHover();
		return;
	}

	if (hoveredPiece === pieceRoot) return;
	setHover(pieceRoot);
}

function setHover(pieceRoot) {
	clearHover();

	hoveredPiece = pieceRoot;
	hoveredBasePos = pieceRoot.position.clone();
	hoveredBaseQuat = pieceRoot.quaternion.clone();
	hoverStartTime = elapsed;

	setCursor("pointer");

	hoveredEmissiveRestore = [];
	pieceRoot.traverse((o) => {
		if (!o.isMesh || !o.material) return;

		const mats = Array.isArray(o.material) ? o.material : [o.material];
		for (const m of mats) {
			if (!m?.emissive) continue;
			hoveredEmissiveRestore.push({ mat: m, emissive: m.emissive.clone() });
			m.emissive.setHex(HOVER_GLOW);
			m.needsUpdate = true;
		}
	});

	// Hover preview moves (only when nothing selected)
	if (!selected) showHoverMoves(pieceRoot);
}

function clearHover() {
	if (!hoveredPiece) return;

	hoveredPiece.position.copy(hoveredBasePos);
	hoveredPiece.quaternion.copy(hoveredBaseQuat);

	for (const { mat, emissive } of hoveredEmissiveRestore) {
		mat.emissive.copy(emissive);
		mat.needsUpdate = true;
	}

	hoveredPiece = null;
	hoveredBasePos = null;
	hoveredBaseQuat = null;
	hoveredEmissiveRestore = [];
	setCursor("");

	clearHoverHighlights();
}

function applyHoverShake(nowT) {
	if (!hoveredPiece) return;
	if (isDraggingOrPending()) return;

	const dt = nowT - hoverStartTime;

	// 0..1s steady, then ease out to 0 by 2s
	let env = 1.0;
	if (dt >= HOVER_SHAKE.totalSec) env = 0.0;
	else if (dt > HOVER_SHAKE.holdSec) {
		const t01 = (dt - HOVER_SHAKE.holdSec) / Math.max(1e-6, HOVER_SHAKE.totalSec - HOVER_SHAKE.holdSec);
		env = 1.0 - smoothstep(0, 1, t01);
	}

	// Stop fully after 2s (but keep glow / cursor)
	if (env <= 1e-4) {
		hoveredPiece.position.copy(hoveredBasePos);
		hoveredPiece.quaternion.copy(hoveredBaseQuat);
		return;
	}

	const f = HOVER_SHAKE.freq;

	hoveredPiece.position.copy(hoveredBasePos);
	hoveredPiece.quaternion.copy(hoveredBaseQuat);

	tmpEuler.set(
		env * HOVER_SHAKE.rotAmp * Math.sin(nowT * f * 1.1),
		env * HOVER_SHAKE.rotAmp * 0.8 * Math.sin(nowT * f * 0.9),
		env * HOVER_SHAKE.rotAmp * 0.6 * Math.sin(nowT * f * 1.3)
	);

	tmpQuat.setFromEuler(tmpEuler);
	hoveredPiece.quaternion.multiply(tmpQuat);

	hoveredPiece.position.x += env * HOVER_SHAKE.posAmp * Math.sin(nowT * f * 1.7);
	hoveredPiece.position.z += env * HOVER_SHAKE.posAmp * Math.cos(nowT * f * 1.4);
}

// Idle shake applied in the main render loop
function applyIdleShake(nowT) {
	if (!idleHintVisible.value) return;
	if (!idleShakePiece) return;

	// If pawn moved / captured / promoted away from d2, just drop the hint.
	if (idleShakePiece.userData.square !== IDLE_HINT.square) {
		cancelIdleHint();
		return;
	}

	// Don’t fight real interaction / animation
	if (selected || engineThinking.value || isAnimating() || isDraggingOrPending()) return;

	// Safety: basis vectors exist once cinematic is set up
	const right = basisRight && basisRight.lengthSq() > 1e-8 ? basisRight : null;
	const forward = basisForward && basisForward.lengthSq() > 1e-8 ? basisForward : null;
	const up = basisUp && basisUp.lengthSq() > 1e-8 ? basisUp : (boardInfoGlobal?.normal || WORLD_UP);

	invariant(right && forward, "Idle shake requires basisRight and basisForward.");

	const s1 = Math.sin(nowT * IDLE_SHAKE.freq);
	const s2 = Math.sin(nowT * IDLE_SHAKE.freq * 1.37);

	idleShakePiece.position.copy(idleShakeBasePos);
	idleShakePiece.quaternion.copy(idleShakeBaseQuat);

	// Planar wiggle (small)
	idleShakePiece.position.addScaledVector(right, IDLE_SHAKE.posAmp * s1);
	idleShakePiece.position.addScaledVector(forward, IDLE_SHAKE.posAmp * 0.6 * s2);

	// Yaw wobble around “up”
	tmpQuat.setFromAxisAngle(up, IDLE_SHAKE.rotAmp * s2);
	idleShakePiece.quaternion.multiply(tmpQuat);

	idleShakePiece.updateWorldMatrix(true, true);
}

function resetStage23Effects(fromDispose = false) {
	stage2DropStarted = false;
	stage2DropStartTime = 0;

	// clear per-piece drop metadata (don’t restore pieces; stage 2 is “destructive” by design)
	if (piecesGroup) {
		for (const p of piecesGroup.children) {
			if (p?.userData) delete p.userData.__drop;
		}
	}

	// clear background raining pieces
	if (fallingPiecesGroup) {
		for (const it of fallingPieces) {
			fallingPiecesGroup.remove(it.obj);
			disposeObject3D(it.obj);
		}
	}
	fallingPieces = [];
	rainSpawnAcc = 0;

	// clear content card
	if (contentGroup && contentCardSprite) {
		contentGroup.remove(contentCardSprite);
		contentCardSprite = null;
	}
	if (contentCardMaterial) {
		contentCardMaterial.dispose();
		contentCardMaterial = null;
	}
	if (contentCardTexture) {
		contentCardTexture.dispose();
		contentCardTexture = null;
	}

	// hide groups if we still exist
	if (!fromDispose) {
		contentGroup && (contentGroup.visible = false);
		fallingPiecesGroup && (fallingPiecesGroup.visible = false);
	}
}

function updateStage23Effects(delta) {
	// No stage 2/3 while playing; your existing allowedStages already enforces this,
	// but keep this guard so we don’t mutate pieces accidentally.
	if (!endScene.value) return;
	if (!cinematicReady) return;
	if (loading.value) return;
	if (!boardInfoGlobal) return;

	// Fade/show the content card as we enter stage 2 -> 3
	if (contentCardMaterial) {
		const a = smoothstep(2.0, 2.25, scrollT.value);
		contentCardMaterial.opacity = a;
	}
	if (contentGroup) {
		contentGroup.visible = scrollT.value >= 1.95;
	}

	// Start dropping the *existing* chess set (stage 2 continuation)
	if (!stage2DropStarted && scrollT.value >= STAGE2_DROP.startScrollT) {
		stage2DropStarted = true;
		stage2DropStartTime = elapsed;

		if (piecesGroup) {
			for (const p of piecesGroup.children) {
				p.userData.__drop = {
					delay: Math.random() * STAGE2_DROP.maxDelaySec,
					speed: boardSpan * (STAGE2_DROP.speedMinSpan + Math.random() * (STAGE2_DROP.speedMaxSpan - STAGE2_DROP.speedMinSpan)),
					traveled: 0,
				};
			}
		}
	}
	if (stage2DropStarted) {
		updateExistingPieceDrops(delta);
	}

	// Background rain (late stage 2 -> stage 3)
	updateBackgroundRain(delta);
}

function updateExistingPieceDrops(delta) {
	if (!piecesGroup) return;

	const up = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : (boardInfoGlobal.normal || WORLD_UP);

	// Phase A: until we reach the fully “learn” pose (t < 2), drop in board/world down.
	// Phase B: from stage 2 onward (t >= 2), drop “down the screen” (toward the camera).
	const down = tmpAxisX; // reuse scratch
	if (scrollT.value < 2.0) {
		down.copy(up).multiplyScalar(-1);
	} else {
		getCameraScreenDownWorld(down);
	}

	const cullDist = boardSpan * STAGE2_DROP.cullBelowSpan;

	for (let i = piecesGroup.children.length - 1; i >= 0; i--) {
		const p = piecesGroup.children[i];
		const d = p?.userData?.__drop;
		if (!d) continue;

		if ((elapsed - stage2DropStartTime) < d.delay) continue;

		const ds = d.speed * delta;
		d.traveled = (d.traveled ?? 0) + ds;

		p.position.addScaledVector(down, ds);
		p.updateWorldMatrix(true, true);

		// Direction-safe cull: remove after traveling far enough, regardless of direction changes
		if (d.traveled > cullDist) {
			piecesGroup.remove(p);
			disposeObject3D(p);
		}
	}
}

function updateBackgroundRain(delta) {
	if (!fallingPiecesGroup || !templatesGlobal || !boardInfoGlobal) return;

	const active = scrollT.value >= BG_RAIN.startScrollT;
	fallingPiecesGroup.visible = active;
	if (!active) return;

	const spin = scrollT.value >= BG_RAIN.spinScrollT;

	const rate = spin ? BG_RAIN.rateSpin : BG_RAIN.rateStraight;
	rainSpawnAcc += rate * delta;

	// spawn
	while (rainSpawnAcc >= 1.0) {
		rainSpawnAcc -= 1.0;
		if (fallingPieces.length >= BG_RAIN.maxPieces) break;
		spawnBackgroundPiece({ spin });
	}

	const down = getCameraScreenDownWorld(tmpAxisX);
	const cullDist = boardSpan * BG_RAIN.cullBelowSpan;

	for (let i = fallingPieces.length - 1; i >= 0; i--) {
		const it = fallingPieces[i];
		const obj = it.obj;

		const ds = it.speed * delta;
		it.traveled = (it.traveled ?? 0) + ds;

		obj.position.addScaledVector(down, ds);

		if (spin) {
			obj.rotation.x += it.angVel.x * delta;
			obj.rotation.y += it.angVel.y * delta;
			obj.rotation.z += it.angVel.z * delta;
		}

		obj.updateWorldMatrix(true, true);

		if (it.traveled > cullDist) {
			fallingPiecesGroup.remove(obj);
			disposeObject3D(obj);
			fallingPieces.splice(i, 1);
		}
	}
}

function spawnBackgroundPiece({ spin }) {
	// pick template
	const types = Object.keys(TEMPLATE_NAMES);
	const type = types[Math.floor(Math.random() * types.length)];
	const color = Math.random() < 0.5 ? "white" : "black";

	const tpl = templatesGlobal[type];
	if (!tpl) return;

	const piece = clonePieceWithTint(tpl, color);
	piece.userData.type = type;
	piece.userData.color = color;

	// scale consistently with your set
	normalizePieceUprightAndScale(piece, boardInfoGlobal.squareSize, color);

	// Spawn around the BOARD, but lifted “up on screen” so it falls down toward camera.
	const screenDown = getCameraScreenDownWorld(tmpAxisX);
	const screenUp = tmpAxisY.copy(screenDown).multiplyScalar(-1);

	const r = boardSpan * BG_RAIN.spawnRadiusSpan;
	const h = boardSpan * BG_RAIN.spawnHeightSpan;

	const rx = (Math.random() * 2 - 1) * r;
	const rz = (Math.random() * 2 - 1) * r;

	const right = (basisRight && basisRight.lengthSq() > 1e-8) ? basisRight : new THREE.Vector3(1, 0, 0);
	const fwd = (basisForward && basisForward.lengthSq() > 1e-8) ? basisForward : new THREE.Vector3(0, 0, 1);

	piece.position.copy(basisCenter)
		.addScaledVector(right, rx)
		.addScaledVector(fwd, rz)
		.addScaledVector(screenUp, h);

	if (camera) {
		const minD = boardSpan * BG_RAIN.minCamDistSpan;
		const v = tmpV.copy(piece.position).sub(camera.position);
		const d = v.length();
		if (d < minD && d > 1e-6) {
			piece.position.copy(camera.position).add(v.setLength(minD));
		}
	}

	// stage-2 straight drop: keep upright (no extra rotation)
	// stage-3 background: random rotation
	if (spin) {
		piece.rotation.set(
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2
		);
	}

	piece.updateWorldMatrix(true, true);
	fallingPiecesGroup.add(piece);

	const speed = boardSpan * (BG_RAIN.speedMinSpan + Math.random() * (BG_RAIN.speedMaxSpan - BG_RAIN.speedMinSpan));

	const angVel = new THREE.Vector3(
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax,
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax,
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax
	);

	fallingPieces.push({ obj: piece, speed, angVel, traveled: 0 });
}

// 3D “text box” the camera pans to
function ensureContentCard() {
	if (!contentGroup) return;

	// rebuild every time cinematic basis is recomputed (safe + simple)
	if (contentCardSprite) {
		contentGroup.remove(contentCardSprite);
		contentCardSprite = null;
	}
	if (contentCardMaterial) {
		contentCardMaterial.dispose();
		contentCardMaterial = null;
	}
	if (contentCardTexture) {
		contentCardTexture.dispose();
		contentCardTexture = null;
	}

	contentCardTexture = makeTextCardTexture("Carpe diem");
	contentCardMaterial = new THREE.SpriteMaterial({
		map: contentCardTexture,
		transparent: true,
		opacity: 0.0,
		depthWrite: false,
		depthTest: false,
	});

	contentCardSprite = new THREE.Sprite(contentCardMaterial);
	contentCardSprite.renderOrder = 999; 
	contentCardSprite.position.copy(contentTarget);
	contentCardSprite.scale.set(boardSpan * 1.7, boardSpan * 0.62, 1);

	contentGroup.add(contentCardSprite);
	contentGroup.visible = false;
}

function makeTextCardTexture(text) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 512;

	const ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);

	// card bg
	const pad = 52;
	const x = pad, y = pad, w = c.width - pad * 2, h = c.height - pad * 2;
	const r = 44;

	ctx.fillStyle = "rgba(10,16,32,0.78)";
	ctx.strokeStyle = "rgba(180,200,255,0.28)";
	ctx.lineWidth = 6;

	roundedRect(ctx, x, y, w, h, r);
	ctx.fill();
	ctx.stroke();

	// title text
	ctx.fillStyle = "rgba(245,248,255,0.96)";
	ctx.font = "800 92px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, c.width / 2, c.height / 2);

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

function roundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function renderQueenShowcase(timeSec) {
	if (!queenRenderer || !queenScene || !queenCamera || !queenPieceDisplay) return;

	queenPieceDisplay.rotation.y = timeSec * 0.72;
	queenPieceDisplay.position.y = 0.18 + Math.sin(timeSec * 1.15) * 0.08;

	queenRenderer.render(queenScene, queenCamera);
}

function resizeQueenShowcase() {
	if (!queenRenderer || !queenCamera || !queenCanvasRef.value) return;

	const rect = queenCanvasRef.value.getBoundingClientRect();
	const width = Math.max(1, Math.round(rect.width));
	const height = Math.max(1, Math.round(rect.height));

	queenRenderer.setSize(width, height, false);
	queenCamera.aspect = width / height;
	queenCamera.updateProjectionMatrix();
}


// ------------------------------------------------------------
// Loop + resize + dispose
// ------------------------------------------------------------
function startLoop() {
	const tick = () => {
		raf = requestAnimationFrame(tick);

		invariant(renderer && scene && camera && controls, "Render loop ticked before three.js was initialized.");

		const delta = clock.getDelta();
		elapsed += delta;

		scrollT.value = THREE.MathUtils.damp(scrollT.value, scrollTargetT, CINEMATIC.smoothing, delta);
		applyCinematic(scrollT.value);

		// Activate lock once we fully arrive at stage 3
		if (endScene.value && !contentLockActive && scrollT.value >= CONTENT_LOCK.activateAtScrollT) {
			contentLockActive = true;
			contentLockMinY = computeContentLockMinY();
			enforceContentMinScroll();
			setHeaderVisible(true);
		}

		updateStage23Effects(delta);

		updateMoveAnimations(elapsed);
		applyHoverShake(elapsed);
		applyIdleShake(elapsed);

		renderer.render(scene, camera);
		renderQueenShowcase(elapsed);
	};
	tick();
}

function stopLoop() {
	if (raf) cancelAnimationFrame(raf);
	raf = 0;
}

function onResize() {
	invariant(renderer && camera, "Resize before renderer/camera initialized.");

	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	resizeQueenShowcase();

	if (contentLockActive) {
		contentLockMinY = computeContentLockMinY();
		enforceContentMinScroll();
	}
}

function disposeAll() {
	detachCanvasListeners();

	detachDragListeners();
	clearHover();
	clearSelection();
	cancelIdleHint();

	disposeHighlightSystem();
	resetStage23Effects(true);

	if (contentGroup) {
		scene?.remove(contentGroup);
		contentGroup = null;
	}
	if (fallingPiecesGroup) {
		scene?.remove(fallingPiecesGroup);
		fallingPiecesGroup = null;
	}

	if (piecesGroup) {
		scene?.remove(piecesGroup);
		disposeObject3D(piecesGroup);
		piecesGroup = null;
	}

	if (root) {
		scene?.remove(root);
		disposeObject3D(root);
		root = null;
	}

	envTex?.dispose?.();
	envTex = null;

	pmrem?.dispose?.();
	pmrem = null;

	controls?.dispose();
	controls = null;

	renderer?.dispose();
	renderer = null;

	if (queenPieceDisplay) {
		queenScene?.remove(queenPieceDisplay);
		disposeObject3D(queenPieceDisplay);
		queenPieceDisplay = null;
	}

	queenEnvTex?.dispose?.();
	queenEnvTex = null;

	queenPmrem?.dispose?.();
	queenPmrem = null;

	queenRenderer?.dispose();
	queenRenderer = null;

	queenScene = null;
	queenCamera = null;

	scene = null;
	camera = null;
}

</script>

<style scoped>
.page {
	min-height: 100vh;
	background:
		radial-gradient(circle at 50% 34%, rgba(36, 49, 108, 0.58), rgba(9, 10, 26, 0) 42%),
		linear-gradient(180deg, #090b1c 0%, #04050f 100%);

	/* theme tokens */
	--accent: 80, 140, 255;         /* default blue */
	--title: 245, 248, 255;         /* default hero title */
	--sub: 231, 238, 252;           /* default hero sub */
}

.page.theme-win {
	--accent: 70, 220, 120;
	--title: 210, 255, 225;
	--sub: 200, 255, 215;
}

.page.theme-lose {
	--accent: 255, 80, 80;
	--title: 255, 215, 215;
	--sub: 255, 205, 205;
}

.page.theme-draw {
	--accent: 200, 200, 210;
	--title: 245, 248, 255;
	--sub: 231, 238, 252;
}

.chess-stage {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	background:
		radial-gradient(circle at 50% 32%, rgba(var(--accent), 0.22), rgba(6, 8, 18, 0) 40%),
		linear-gradient(180deg, rgba(10, 12, 28, 0.96) 0%, rgba(4, 5, 15, 0.98) 100%);
}

.chess-canvas {
	width: 100%;
	height: 100%;
	display: block;
	touch-action: pan-y;
}

.stage-hero {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	pointer-events: none;
	z-index: 2;
	text-align: center;
	padding: 0 18px;
}

.hero-title {
	font-weight: 900;
	letter-spacing: 0.02em;
	line-height: 1;
	font-size: clamp(40px, 7vw, 78px);
	color: rgba(var(--title), 0.96);
	text-shadow:
		0 0 14px rgba(var(--accent), 0.35),
		0 0 44px rgba(var(--accent), 0.18),
		0 12px 60px rgba(0, 0, 0, 0.55);
}

.hero-sub {
	margin-top: 10px;
	opacity: 0.88;
	color: rgba(var(--sub), 0.90);
}

.idle-prompt {
	position: fixed;
	top: clamp(28px, 6vh, 80px);
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	z-index: 9999;
	pointer-events: none;

	opacity: 0;
	transform: translateY(-8px);
	transition: opacity 360ms ease, transform 360ms ease;
	will-change: opacity, transform;
}

.idle-prompt.is-visible {
	opacity: 1;
	transform: translateY(0);
}

.idle-prompt-text {
	margin-top: 3vh;
	padding: 0;
	background: none;
	border: none;

	font-size: clamp(16px, 2.1vw, 20px);
	font-weight: 600;
	letter-spacing: 0;
	text-transform: none;

	text-shadow:
		0 0 14px rgba(80, 140, 255, 0.18),
		0 10px 40px rgba(0, 0, 0, 0.35);
}

.skip-prompt {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 18px;

	display: flex;
	justify-content: center;
	align-items: center;
	gap: 12px;

	z-index: 9999;
	pointer-events: none;

	opacity: 0;
	transform: translateY(8px);
	transition: opacity 360ms ease, transform 360ms ease;
	will-change: opacity, transform;
}

.skip-prompt.is-visible {
	opacity: 1;
	transform: translateY(0);
}

.skip-prompt-text {
	color: rgba(var(--sub), 0.92);
	text-shadow:
		0 0 14px rgba(var(--accent), 0.14),
		0 10px 40px rgba(0, 0, 0, 0.35);
}

.skip-button {
	pointer-events: auto;

	cursor: pointer;
	border-radius: 999px;
	padding: 10px 14px;

	background: rgba(10, 16, 32, 0.62);
	border: 1px solid rgba(var(--accent), 0.35);
	color: rgba(var(--title), 0.95);

	font-weight: 700;
	letter-spacing: 0.01em;
	backdrop-filter: blur(10px);
}

.skip-button:hover {
	background: rgba(10, 16, 32, 0.78);
}

.skip-button:active {
	transform: translateY(1px);
}

.skip-button:focus-visible {
	outline: 2px solid rgba(var(--accent), 0.55);
	outline-offset: 2px;
}

.vignette {
	pointer-events: none;
	position: absolute;
	inset: -2px;
	z-index: 1;
	background:
		radial-gradient(1200px 700px at 50% 35%, rgba(var(--accent), 0.14), rgba(0, 0, 0, 0) 55%),
		radial-gradient(1200px 900px at 50% 50%, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.55) 75%),
		linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35));
}

.mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.content {
	position: relative;
	z-index: 5;
	padding: 18px;
	width: min(1880px, calc(120vw - 32px));
	margin: 0 auto;
	max-width: 100%;
	box-sizing: border-box;

	opacity: 0;
	transform: translateY(10px);
	transition: opacity 300ms ease, transform 300ms ease;
	pointer-events: none;
}

.content.is-visible {
	margin-top: 12px;
	opacity: 1;
	transform: translateY(0);
	pointer-events: auto;
}

.content-shell {
	position: relative;
	display: block;
	overflow: visible;
}

.content-main {
	width: min(1780px, 100%);
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.content-rail {
	--rail-peek: clamp(40px, 1.5vw, 60px);
	--rail-width: min(clamp(200px, 20vw, 300px), calc(100vw - 24px));
	--rail-hover-offset: clamp(48px, 0.7vw, 44px);
	position: fixed;
	top: 112px;
	left: -40px;
	z-index: 40;
	width: var(--rail-peek);
	height: 1px;
	overflow: visible;
	opacity: 0;
	pointer-events: none;
	transition: opacity 180ms ease;
}

.content-rail.is-visible {
	opacity: 1;
	pointer-events: auto;
}

.rail-card {
	position: absolute;
	top: 0;
	left: 0;
	width: var(--rail-width);
	padding: 18px;
	border-radius: 20px;
	background: linear-gradient(180deg, rgba(13, 16, 25, 0.92), rgba(8, 10, 16, 0.96));
	border: 1px solid rgba(204, 216, 235, 0.12);
	box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
	backdrop-filter: blur(12px);
	overflow: visible;
	transform: translateX(calc(-100% + var(--rail-peek)));
	transition: transform 220ms ease, box-shadow 220ms ease;
}

.content-rail:hover .rail-card,
.content-rail:focus-within .rail-card {
	transform: translateX(var(--rail-hover-offset));
	box-shadow: 0 28px 70px rgba(0, 0, 0, 0.34);
}

.rail-card::before {
	content: "";
	position: absolute;
	inset: 0;
	background:
		linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
	background-size: 36px 36px;
	opacity: 0.18;
	pointer-events: none;
}

.rail-card::after {
	content: "Sections";
	position: absolute;
	top: 18px;
	right: calc(-1 * var(--rail-peek));
	display: grid;
	place-items: center;
	width: var(--rail-peek);
	height: clamp(112px, 12vw, 136px);
	border-radius: 0 14px 14px 0;
	background: linear-gradient(180deg, rgba(13, 16, 25, 0.96), rgba(8, 10, 16, 0.98));
	border: 1px solid rgba(204, 216, 235, 0.14);
	border-left: none;
	box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
	color: rgba(var(--sub), 0.78);
	font-size: 0.68rem;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	writing-mode: vertical-rl;
}

.rail-card > * {
	position: relative;
	z-index: 1;
}

.rail-label {
	font-size: 0.72rem;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: rgba(var(--sub), 0.62);
}

.rail-nav {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 18px;
}

.rail-link {
	display: grid;
	grid-template-columns: 36px minmax(0, 1fr);
	gap: 10px;
	align-items: center;
	padding: 11px 12px;
	border-radius: 14px;
	border: 1px solid transparent;
	background: transparent;
	color: rgba(var(--sub), 0.82);
	text-align: left;
	cursor: pointer;
	font: inherit;
	transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.rail-link:hover {
	transform: translateX(2px);
	background: rgba(255, 255, 255, 0.03);
	border-color: rgba(var(--accent), 0.18);
	color: rgba(var(--title), 0.94);
}

.rail-link.is-active {
	background: linear-gradient(90deg, rgba(var(--accent), 0.16), rgba(255, 255, 255, 0.03));
	border-color: rgba(var(--accent), 0.32);
	color: rgba(var(--title), 0.98);
	box-shadow: inset 3px 0 0 rgba(214, 186, 110, 0.75);
}

.rail-index {
	color: rgba(214, 186, 110, 0.88);
	font-size: 0.75rem;
}

.content-title {
	font-family: Georgia, "Times New Roman", serif;
	font-weight: 900;
	letter-spacing: 0.01em;
	line-height: 0.95;
	font-size: clamp(34px, 5.2vw, 68px);
	color: rgba(var(--title), 0.98);
	margin: 0;
	text-shadow:
		0 0 14px rgba(var(--accent), 0.18),
		0 12px 60px rgba(0, 0, 0, 0.45);
}

.prose {
	overflow-wrap: anywhere;
}

.prose p {
	margin: 0;
	color: rgba(var(--sub), 0.88);
	line-height: 1.72;
}

.prose ul,
.prose ol {
	margin: 0;
	padding-left: 18px;
	color: rgba(var(--sub), 0.88);
	line-height: 1.65;
}

.prose li {
	margin: 0 0 8px;
}

.prose .subhead {
	margin: 0;
	font-size: 0.95rem;
	font-weight: 800;
	letter-spacing: 0.01em;
	color: rgba(var(--title), 0.95);
}

.notebook-cell {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 18px;
	padding: clamp(22px, 3vw, 34px);
	border-radius: 24px;
	background:
		linear-gradient(180deg, rgba(14, 18, 27, 0.92), rgba(9, 12, 18, 0.95)),
		radial-gradient(circle at top right, rgba(var(--accent), 0.1), rgba(0, 0, 0, 0) 42%);
	border: 1px solid rgba(222, 228, 243, 0.12);
	box-shadow:
		0 24px 70px rgba(0, 0, 0, 0.34),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
	backdrop-filter: blur(12px);
	overflow: hidden;
}

.notebook-cell::before {
	content: "";
	position: absolute;
	inset: 0;
	background:
		linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
		linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px);
	background-size: 48px 48px;
	opacity: 0.22;
	pointer-events: none;
	mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.75), transparent 96%);
}

.notebook-cell > * {
	position: relative;
	z-index: 1;
}

.notebook-hero {
	gap: 26px;
	padding-top: clamp(28px, 4vw, 40px);
}

.notebook-cell-end {
	margin-bottom: min(18vh, 180px);
}

.notebook-cell-dark {
	background:
		linear-gradient(180deg, rgba(10, 13, 20, 0.96), rgba(5, 7, 12, 0.98)),
		radial-gradient(circle at top left, rgba(74, 110, 156, 0.22), rgba(0, 0, 0, 0) 52%);
}

.cell-meta,
.section-badge {
	font-size: 0.78rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: rgba(var(--sub), 0.66);
}

.section-title {
	margin: 0;
	font-family: Georgia, "Times New Roman", serif;
	font-size: clamp(1.5rem, 2.2vw, 2.25rem);
	line-height: 1.12;
	color: rgba(var(--title), 0.96);
}

.hero-dek {
	max-width: 70ch;
	font-size: clamp(1rem, 1.8vw, 1.08rem);
	color: rgba(var(--sub), 0.9);
}

.hero-layout,
.summary-grid,
.three-col-grid,
.subsystem-grid,
.proof-grid,
.future-grid,
.lessons-grid,
.validation-grid,
.image-grid,
.two-col-grid {
	display: grid;
	gap: 16px;
}

.hero-layout {
	grid-template-columns: minmax(0, 1fr);
	justify-items: center;
}

	.hero-body {
		width: 100%;
		display: grid;
		grid-template-columns: minmax(0, 0.6fr) minmax(0, 0.6fr);
		gap: 24px;
		align-items: start;
	}

.hero-copy,
.hero-visual,
.hero-sidecars,
.stacked-notes,
.validation-copy,
.validation-dashboard {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.hero-copy {
	align-items: center;
	text-align: center;
}

.hero-copy-details {
	align-items: flex-start;
	text-align: left;
}

.hero-copy-details .hero-chip-row,
.hero-copy-details .hero-actions {
	justify-content: flex-start;
}

.hero-summary {
	max-width: 60ch;
	font-size: 0.98rem;
}

.hero-summary p + p {
	margin-top: 0.75rem;
}

.hero-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: center;
}

.hero-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 42px;
	padding: 0 16px;
	border-radius: 999px;
	border: 1px solid rgba(215, 223, 237, 0.14);
	text-decoration: none;
	cursor: pointer;
	font: inherit;
	letter-spacing: 0.08em;
}

.hero-action-primary {
	background: linear-gradient(135deg, rgba(var(--accent), 0.26), rgba(214, 186, 110, 0.24));
	color: rgba(var(--title), 0.98);
}

.hero-action-secondary {
	background: rgba(255, 255, 255, 0.03);
	color: rgba(var(--title), 0.9);
}

.hero-visual-frame {
	position: relative;
	margin: 0;
	padding: 14px;
	border-radius: 22px;
	background: linear-gradient(180deg, rgba(12, 16, 24, 0.96), rgba(8, 10, 16, 0.98));
	border: 1px solid rgba(221, 227, 242, 0.12);
	box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
	overflow: hidden;
}

.hero-overlay-lines {
	position: absolute;
	inset: 18px;
	pointer-events: none;
}

.hero-overlay-lines span {
	position: absolute;
	background: linear-gradient(90deg, rgba(var(--accent), 0), rgba(var(--accent), 0.35), rgba(var(--accent), 0));
	height: 1px;
	left: 5%;
	right: 5%;
}

.hero-overlay-lines span:nth-child(1) { top: 24%; }
.hero-overlay-lines span:nth-child(2) { top: 52%; }
.hero-overlay-lines span:nth-child(3) { top: 78%; }

.hero-console {
	position: absolute;
	right: 28px;
	bottom: 28px;
	min-width: 190px;
	padding: 12px 14px;
	border-radius: 16px;
	background: rgba(5, 8, 14, 0.76);
	border: 1px solid rgba(182, 197, 225, 0.18);
	box-shadow: 0 16px 34px rgba(0, 0, 0, 0.34);
}

.hero-console-row {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	font-size: 0.74rem;
	color: rgba(var(--sub), 0.8);
}

.hero-console-row + .hero-console-row {
	margin-top: 6px;
}

.hero-console strong {
	color: rgba(214, 186, 110, 0.9);
	font-weight: 700;
}

.hero-chip-row {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	justify-content: center;
}

.hero-chip {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 36px;
	padding: 0 14px;
	border-radius: 999px;
	border: 1px solid rgba(221, 227, 242, 0.16);
	background: rgba(255, 255, 255, 0.03);
	color: rgba(var(--title), 0.9);
	text-decoration: none;
	font-size: 0.82rem;
	letter-spacing: 0.06em;
}

.hero-chip:hover {
	border-color: rgba(var(--accent), 0.4);
	background: rgba(var(--accent), 0.1);
}

.metrics-strip {
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 12px;
}

.metric-strip-card,
.summary-card,
.decision-card,
.subsystem-card,
.proof-card,
.future-card,
.lesson-card,
.dashboard-card,
.analysis-card,
.benchmark-card,
.notebook-subcell {
	padding: 16px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(221, 227, 242, 0.1);
}

.metric-strip-card {
	padding: 18px 16px;
	background: linear-gradient(180deg, rgba(12, 16, 24, 0.92), rgba(8, 10, 16, 0.96));
}

.metric-strip-value,
.summary-label,
.decision-kicker,
.proof-title,
.subsystem-title,
.panel-title,
.analysis-label {
	color: rgba(var(--title), 0.95);
}

.metric-strip-value {
	font-size: 0.82rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	margin-bottom: 8px;
}

.metric-strip-label {
	color: rgba(var(--sub), 0.78);
	font-size: 0.92rem;
	line-height: 1.45;
}

.decision-kicker {
	display: inline-block;
	margin-bottom: 10px;
	font-size: 0.92rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.summary-grid,
.three-col-grid,
.proof-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.subsystem-grid {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lessons-grid {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.future-grid,
.image-grid-triple {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.two-col-grid,
.image-grid-dual,
.validation-grid {
	grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.8fr);
}

.subsystem-card,
.proof-card,
.future-card,
.lesson-card {
	display: grid;
	gap: 8px;
}

.subsystem-title,
.proof-title {
	font-size: 1rem;
	font-weight: 800;
}

.deep-dive-panel {
	display: grid;
	gap: 16px;
	padding: 18px;
	border-radius: 20px;
	background: rgba(255, 255, 255, 0.028);
	border: 1px solid rgba(221, 227, 242, 0.1);
}

.deep-dive-panel-dark {
	background: linear-gradient(180deg, rgba(14, 18, 27, 0.74), rgba(9, 12, 18, 0.82));
}

.panel-heading {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.panel-grid,
.architecture-diagram {
	display: grid;
	gap: 12px;
}

.panel-grid {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel-label {
	margin-bottom: 6px;
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: rgba(214, 186, 110, 0.86);
}

.architecture-diagram {
	grid-template-columns: repeat(15, minmax(0, 1fr));
	align-items: center;
}

.arch-node {
	grid-column: span 1;
	display: grid;
	gap: 8px;
	padding: 14px 12px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(221, 227, 242, 0.1);
	text-align: center;
}

.arch-node span {
	color: rgba(214, 186, 110, 0.88);
	font-size: 0.72rem;
}

.arch-node strong {
	font-size: 0.9rem;
	line-height: 1.35;
	color: rgba(var(--title), 0.94);
}

.arch-arrow {
	text-align: center;
	color: rgba(var(--accent), 0.75);
	font-size: 0.8rem;
}

.arch-node,
.arch-arrow {
	grid-column: span 1;
}

.arch-node-final {
	grid-column: span 2;
}

.performance-band {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
	padding: 18px;
	border-radius: 20px;
	background: linear-gradient(180deg, rgba(5, 8, 14, 0.88), rgba(3, 5, 8, 0.96));
	border: 1px solid rgba(143, 164, 203, 0.18);
}

.benchmark-card {
	background: rgba(255, 255, 255, 0.02);
}

.analysis-card {
	background: linear-gradient(180deg, rgba(12, 16, 24, 0.96), rgba(8, 10, 16, 0.96));
}

.analysis-bar {
	height: 10px;
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.06);
	overflow: hidden;
}

.analysis-fill {
	display: block;
	width: 78%;
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, rgba(214, 186, 110, 0.9), rgba(var(--accent), 0.85));
}

.validation-dashboard {
	display: grid;
	grid-template-columns: 1fr;
}

.dashboard-card-bugs {
	background: linear-gradient(180deg, rgba(15, 24, 17, 0.72), rgba(9, 16, 12, 0.78));
}

.terminal-note {
	display: grid;
	gap: 8px;
	padding: 18px;
	border-radius: 18px;
	background: linear-gradient(180deg, rgba(8, 12, 10, 0.96), rgba(4, 7, 5, 0.98));
	border: 1px solid rgba(120, 202, 144, 0.22);
	color: rgba(183, 243, 196, 0.92);
}

.diagram-terminal {
	margin: 0;
	overflow-x: auto;
	white-space: pre;
	font-size: 0.82rem;
	line-height: 1.55;
}

.feature-frame {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.hero-feature {
	width: 100%;
	margin-top: 0;
}

.metric-label {
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: rgba(var(--sub), 0.62);
	margin-bottom: 10px;
}

.metric-value {
	font-size: clamp(1.2rem, 2vw, 1.8rem);
	font-weight: 800;
	color: rgba(var(--title), 0.96);
	margin-bottom: 8px;
}

.feature-frame {
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.feature-frame img,
.feature-frame video,
.media-img,
.media-video {
	width: 100%;
	height: auto;
	display: block;
	border-radius: 16px;
}

.media-img,
.media-video {
	margin: 0 auto;
	max-width: none;
}

.media-img-wide {
	max-width: none;
}

.media-img-log {
	max-width: none;
}

.media-img-perft {
	max-width: none;
}

.image-grid-triple > .feature-frame:first-child {
	grid-column: 1 / -1;
}

.media-cap {
	margin: 0;
	color: rgba(var(--sub), 0.76);
	font-size: 0.92rem;
	line-height: 1.55;
	text-align: center;
}

.analysis-label {
	width: 100%;
	text-align: center;
}

.queen-interlude {
	position: relative;
	display: grid;
	place-items: center;
	min-height: 420px;
	padding: 34px 0 28px;
	overflow: hidden;
}

.queen-stage {
	position: relative;
	display: grid;
	place-items: center;
	width: min(100%, 1180px);
	min-height: 420px;
}

.queen-aura {
	position: absolute;
	inset: 10% 24%;
	border-radius: 50%;
	background:
		radial-gradient(circle, rgba(214, 186, 110, 0.24) 0%, rgba(214, 186, 110, 0.08) 34%, rgba(0, 0, 0, 0) 68%),
		radial-gradient(circle at 50% 42%, rgba(var(--accent), 0.28), rgba(0, 0, 0, 0) 58%);
	filter: blur(18px);
}

.queen-shadow {
	position: absolute;
	z-index: 1;
	bottom: 68px;
	width: clamp(220px, 28vw, 360px);
	height: 48px;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.08) 72%, rgba(0, 0, 0, 0) 100%);
	filter: blur(12px);
	animation: queen-shadow 5.6s ease-in-out infinite;
}

.queen-canvas {
	position: relative;
	z-index: 2;
	width: min(100%, 760px);
	height: 420px;
	display: block;
	filter: drop-shadow(0 18px 42px rgba(0, 0, 0, 0.38));
}

@keyframes queen-shadow {
	0%,
	100% {
		transform: scale(1);
		opacity: 0.82;
	}

	50% {
		transform: scale(0.88);
		opacity: 0.56;
	}
}

.note-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.callout-note {
	padding: 15px 16px;
	border-left: 3px solid rgba(var(--accent), 0.65);
	border-radius: 14px;
	background: rgba(var(--accent), 0.08);
	color: rgba(var(--sub), 0.9);
}

@media (max-width: 980px) {
	.content {
		padding: 14px;
		width: min(100vw, calc(100vw - 16px));
	}

	.hero-layout,
	.hero-body,
	.summary-grid,
	.three-col-grid,
	.subsystem-grid,
	.proof-grid,
	.future-grid,
	.lessons-grid,
	.panel-grid,
	.validation-grid,
	.performance-band,
	.metrics-strip,
	.two-col-grid,
	.image-grid-dual,
	.image-grid-triple {
		grid-template-columns: 1fr;
	}

	.content-rail {
		position: static;
		width: 100%;
		height: auto;
		margin-bottom: 16px;
	}

	.rail-card {
		width: 100%;
		transform: none;
	}

	.rail-card::after {
		display: none;
	}

	.architecture-diagram {
		grid-template-columns: 1fr;
	}

	.arch-node,
	.arch-node-final,
	.arch-arrow {
		grid-column: auto;
	}

	.queen-stage,
	.queen-canvas {
		width: 100%;
	}
}

@media (max-width: 640px) {
	.notebook-cell {
		padding: 20px 16px;
		border-radius: 18px;
		gap: 16px;
	}

	.content-title {
		font-size: clamp(2rem, 11vw, 2.8rem);
	}

	.hero-chip,
	.hero-action,
	.rail-link {
		font-size: 0.76rem;
		padding: 0 12px;
	}

	.hero-console {
		position: static;
		margin-top: 12px;
	}
}

:global(html.header-visible header),
:global(html.header-visible .site-nav),
:global(html.header-visible .navbar) {
	opacity: 1 !important;
	transform: translateY(0) !important;
	pointer-events: auto !important;
	visibility: visible !important;
	z-index: 100000 !important;
}
</style>
