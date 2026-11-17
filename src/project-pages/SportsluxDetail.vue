<template>
  <article class="sportslux-page" aria-labelledby="sportslux-title">
    <header class="slx-topline slx-inset">
      <RouterLink to="/projects" class="slx-link">&#8592; All projects</RouterLink>
      <span>Selected work / Sportslux</span>
      <span class="slx-status"><i aria-hidden="true"></i> In production</span>
    </header>

    <section class="slx-hero">
      <figure class="slx-hero-media">
        <video v-autoplay-visible="{ start: 6, end: 12 }" :src="`${video3d}#t=6`" :poster="poster3d" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="metadata"
          aria-label="Sportslux 3D night render of Waverley Park, Melbourne, showing the lighting design and its beams."></video>
        <figcaption>Waverley Park, Melbourne <span>3D lighting preview</span></figcaption>
      </figure>
      <div class="slx-hero-copy">
        <p class="slx-eyebrow">Full-stack engineering / Schr&#233;der</p>
        <h1 id="sportslux-title">Sportslux<span class="slx-title-dot">.</span></h1>
        <p class="slx-hero-heading">Sports lighting<br>as an optimisation problem.</p>
        <p class="slx-body">I led end-to-end development of this production application, covering system architecture, UX and frontend development, backend API design and AWS infrastructure. I also built the CI/CD pipeline to automate builds and deployments.</p>
        <a href="#sportslux-overview" class="slx-link slx-explore" @click.prevent="scrollToOverview">Read the case study <span aria-hidden="true">&#8595;</span></a>
        <div v-if="project.repoUrl || project.liveUrl" class="slx-actions">
          <a v-if="project.repoUrl" :href="project.repoUrl" target="_blank" rel="noopener noreferrer" class="slx-link">View code &#8599;</a>
          <a v-if="project.liveUrl" :href="project.liveUrl" target="_blank" rel="noopener noreferrer" class="slx-link">Live demo &#8599;</a>
        </div>
      </div>
    </section>

    <section id="sportslux-overview" ref="overview" tabindex="-1" class="slx-overview slx-inset slx-band" aria-labelledby="slx-overview-title">
      <div class="slx-overview-heading">
        <p class="slx-eyebrow">01 / The project</p>
        <h2 id="slx-overview-title">Why Sportslux<br>was developed.</h2>
      </div>
      <div>
        <p class="slx-body">A sports lighting design is a plan for lighting a playing field: where the poles go, how many lights they need and where each light should point. The aim is to light the field evenly and brightly enough for play, while limiting glare and unwanted light reaching neighbouring properties.</p>
        <p class="slx-body">Designers can spend hours adjusting these choices by hand. Sportslux was developed for Schr&#233;der to automate the initial design, calculating a suitable arrangement of lights and giving designers a starting point to review and refine.</p>
        <p class="slx-body">Salespeople can also generate draft designs during customer meetings, showing what a proposed lighting installation could look like. This supports a more informed, professional conversation and provides a basis for more accurate initial quotes instead of rough estimates.</p>
        <dl class="slx-project-facts">
          <div><dt>Technology</dt><dd>{{ project.stack.join(' / ') }}</dd></div>
        </dl>
      </div>
    </section>

    <section class="slx-stats slx-inset" aria-label="Sportslux capabilities and time savings">
      <div v-for="stat in stats" :key="stat.label"><p>{{ stat.value }}<span>{{ stat.unit }}</span></p><span class="slx-stat-label">{{ stat.label }}</span></div>
    </section>

    <section class="slx-feature slx-band slx-inset" aria-labelledby="slx-field-title">
      <div class="slx-copy">
        <p class="slx-eyebrow">02 / Geometry &amp; field setup</p>
        <h2 id="slx-field-title">Satellite imagery<br>to field geometry.</h2>
        <p class="slx-body">The field setup workflow lets designers search for a venue and trace its boundary on satellite imagery. An oval is fitted through the selected points, and the measured size, orientation and location become inputs to the lighting calculation.</p>
        <p class="slx-body">Recommended pole zones appear over the map, so designers can place lights where they can actually be installed. Each pole can have its own position, height and fitting count.</p>
        <div class="slx-details slx-expanded"><h3 class="slx-detail-title">Field setup capabilities</h3><ul><li v-for="item in fieldSetupHighlights" :key="item">{{ item }}</li></ul></div>
      </div>
      <figure class="slx-media">
        <video v-autoplay-visible :src="videoSatellite" :poster="posterSatellite" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="none"
          aria-label="Locating Waverley Park on satellite imagery and tracing the field boundary."></video>
        <figcaption><span>01 &mdash; Locate &amp; outline</span><span>Satellite field setup &middot; 1.5&times; speed</span></figcaption>
      </figure>
    </section>

    <section class="slx-feature slx-feature-media-first slx-band slx-inset" aria-labelledby="slx-search-title">
      <div class="slx-copy">
        <p class="slx-eyebrow">03 / Live calculation feedback</p>
        <h2 id="slx-search-title">Visualising<br>solver progress.</h2>
        <p class="slx-body">While a job runs, the interface renders the best candidate in the same style as the final result: isolux bands, fitting aiming lines, 1/5/10 lux spill contours and live statistics against the targets.</p>
        <p class="slx-body">A fixed colour scale makes each improvement easy to compare. If the targets cannot be met, the closest solution is shown with the most important requirements prioritised.</p>
        <div class="slx-details slx-expanded"><h3 class="slx-detail-title">Inside the live preview</h3><ul><li v-for="item in liveProgressPoints" :key="item">{{ item }}</li></ul></div>
      </div>
      <figure class="slx-media">
        <video v-autoplay-visible :src="videoLoading" :poster="posterLoading" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="none"
          aria-label="Live optimisation of an eight-pole AFL lighting design with updating heatmap and statistics."></video>
        <figcaption><span>02 &mdash; Search &amp; refine</span><span>Real calculation &middot; search shown at 3&times; speed</span></figcaption>
      </figure>
    </section>

    <section class="slx-showcase slx-band" aria-labelledby="slx-results-title">
      <div class="slx-section-heading slx-inset">
        <div><p class="slx-eyebrow">04 / Result visualisation</p><h2 id="slx-results-title">Rendering the<br>photometry.</h2></div>
        <p class="slx-body">The same calculation supports a three.js night scene, false-colour heatmap, isolux bands and an interactive lux grid. The 3D scene places the field in its surroundings and derives beam haze from each luminaire's actual photometry.</p>
      </div>
      <figure class="slx-wide-media">
        <video v-autoplay-visible :src="videoOverlays" :poster="posterOverlays" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="none"
          aria-label="Sportslux three-dimensional field preview with aiming points, lighting overlays and photometric beams."></video>
        <figcaption class="slx-inset"><span>03 &mdash; Understand the design</span><span>three.js / photometric beam rendering</span></figcaption>
      </figure>
      <div class="slx-feature slx-inset slx-results-detail">
        <div class="slx-copy"><h3>Multiple views of<br>the same result.</h3><p class="slx-body">The result interface exposes uniformity, spill and lux at every grid point, with hover zoom for inspecting individual values. Aiming points, grid values and isolux lines can be toggled independently.</p><p class="slx-body">The 3D scene loads when it is first opened and is retained afterwards, keeping return visits to the view instant.</p></div>
        <figure class="slx-media"><video v-autoplay-visible :src="videoResults" :poster="posterResults" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="none" aria-label="Switching between Sportslux result visualisations and lighting overlays."></video><figcaption>Heatmap, isolux and grid views</figcaption></figure>
      </div>
    </section>


    <section class="slx-band slx-inset" aria-labelledby="slx-workflow-title">
      <div class="slx-section-heading"><div><p class="slx-eyebrow">Interface &amp; manual refinement</p><h2 id="slx-workflow-title">Pole placement<br>&amp; manual control.</h2></div><p class="slx-body">The pole-position interface updates invalid positions as the sport and field size change. Manual mode allows individual fitting tilts and orientations to be adjusted, with the heatmap and metrics updating to reflect the changes.</p></div>
      <div class="slx-ui-gallery"><figure class="slx-media"><video v-autoplay-visible :src="videoPoles" :poster="dashboardPreview" autoplay muted loop playsinline disablepictureinpicture disableremoteplayback tabindex="-1" @contextmenu.prevent preload="none" aria-label="Pole placement on satellite imagery with recommended installation zones."></video><figcaption>Pole placement on satellite imagery: shaded zones follow AS 2560.2.3, and poles can be added and dragged into place.</figcaption></figure><figure class="slx-media"><img :src="resultsHeatmap" alt="Sportslux result heatmap with all lighting metrics meeting requirements." loading="lazy" decoding="async"><figcaption>Result from a simple user setup, with all metrics meeting requirements.</figcaption></figure><figure class="slx-media"><img :src="dashboardPreview" alt="Sportslux pole-position selection interface." loading="lazy" decoding="async"><figcaption>Pole-position UI / field geometry and placement constraints</figcaption></figure><figure class="slx-media"><img :src="resultsGrid" alt="Sportslux photometry grid showing illuminance values across a field." loading="lazy" decoding="async"><figcaption>Photometry grid / individual calculated lux values</figcaption></figure></div>
    </section>

    <section class="slx-feature slx-feature-media-first slx-paper slx-band slx-inset" aria-labelledby="slx-report-title">
      <div class="slx-copy"><p class="slx-eyebrow">05 / Reporting &amp; workflow integration</p><h2 id="slx-report-title">Automated<br>design reports.</h2><p class="slx-body">Sportslux generates a detailed PDF report from the calculation results and captured customer requirements. The export gives specialist lighting designers a consistent starting point for the next stage of a project.</p><p class="slx-body">This connects the sales workflow to the engineering workflow: initial concepts and requirements are recorded together, reducing rework and miscommunication during handoff.</p></div>
      <figure class="slx-report-media"><img :src="reportImage" alt="Sportslux generated lighting design report with field visualisations and calculation results." loading="lazy" decoding="async"><figcaption>From interactive exploration to a downloadable report</figcaption></figure>
    </section>


    <section class="slx-band slx-inset" aria-labelledby="slx-method-title">
      <div class="slx-section-heading">
        <div><p class="slx-eyebrow">Engine design &amp; simulation</p><h2 id="slx-method-title">Geometry, constraints<br>&amp; objective functions.</h2></div>
        <div><p class="slx-body">The engine takes fixed project inputs, searches over the variables it can change, and evaluates the resulting design against lighting performance targets.</p><p class="slx-body">The user selects the sport, field dimensions, pole positions and allowed luminaires. The engine searches fitting counts and configurations, aiming to meet the requirements with the minimum hardware. Typical scopes return results in seconds.</p></div>
      </div>
<div class="slx-engine-matrix">
        <!-- Column 1: User inputs -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">User inputs</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Field length</span>
              <span class="slx-engine-value">{{ engineState.fieldWidth }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Field width</span>
              <span class="slx-engine-value">{{ engineState.fieldHeight }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Field shape</span>
              <span class="slx-engine-value">{{ engineState.fieldShape }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Pole positions</span>
              <span class="slx-engine-value">{{ engineState.polePositions }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Pole height</span>
              <span class="slx-engine-value">{{ engineState.poleHeight }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Allowed luminaire models</span>
              <span class="slx-engine-value">{{ engineState.allowedLuminaires }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Target Lux</span>
              <span class="slx-engine-value">{{ engineState.targetLux }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Target uniformity</span>
              <span class="slx-engine-value">{{ engineState.targetUniformity }}</span>
            </li>
          </ul>
        </div>

        <div class="slx-engine-flow-line slx-engine-flow-line-1"></div>

        <!-- Column 2: Optimisation variables -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">Optimisation variables</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Luminaires per pole</span>
              <span class="slx-engine-value">{{ engineState.luminairesPerPole }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Orientations</span>
              <span class="slx-engine-value-2">{{ engineState.luminaireOrientation }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Tilts</span>
              <span class="slx-engine-value-2">{{ engineState.luminaireTilt }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Luminaire models</span>
              <span class="slx-engine-value">{{ engineState.luminaireModel }}</span>
            </li>
          </ul>
        </div>

        <div class="slx-engine-flow-line slx-engine-flow-line-2"></div>

        <!-- Column 3: Results -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">Results</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Lux level</span>
              <span class="slx-engine-value">{{ engineState.luxLevel }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Uniformity ratio</span>
              <span class="slx-engine-value">{{ engineState.uniformityRatio }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Light spill</span>
              <span class="slx-engine-value">{{ engineState.lightSpill }}</span>
            </li>
          </ul>
        </div>
      </div>

      
      <div class="slx-feature slx-method-demo">
        <div class="slx-copy"><h3>Turning lighting design<br>into an algorithm</h3><p class="slx-body">Early sports lighting design is usually a loop of guessing pole layouts, running old photometry software, tweaking fittings
              and hoping the results satisfy Australian standards. Sportslux streamlines that process. For a computer,
              everything becomes geometry, constraints and objective functions.</p>
<p class="slx-body">Because the objective is non-differentiable and discontinuous, Differential Evolution was chosen as the intelligent search algorithm.
              The engine begins by randomly placing luminaires on the poles, then evaluates the photometry grid, isolux curves and glare.
              These metrics are assigned a cost score where heavy penalties are applied for any unmet targets. The algorithm then iteratively refines the solution
              until it converges to a low-cost solution.</p>
<p class="slx-body">To minimise hardware, the search is staged: begin with one luminaire per pole, then increase the count only when targets can’t be met.
              Each stage is cached so the next depth can warm-start from previous best candidates, keeping runtimes low while reliably converging to a minimum-fitting design.
              A technique I learned from my work on chess engines, known as iterative deepening. If the best lux per fitting seen so far shows
              a field would need more than the 20-fittings-per-pole limit, the job is declined early with the reason, rather than after trying every count.</p>
<p class="slx-body">The search is visible while it runs. The loading screen shows the current stage, the fittings being tried and a live heatmap
              of the best design so far against the targets, so users can watch the solution converge.</p></div>
        <figure class="slx-media slx-demo-figure">
          <img :src="currentResultFrame.image" :alt="`Illustrative optimisation stage ${currentResultFrame.id}`" loading="lazy" decoding="async">
          <figcaption>Illustrative optimisation sequence / existing result frames</figcaption>
          <dl class="slx-demo-metrics"><div><dt>Fittings per pole</dt><dd>{{ currentResultFrame.luminairesPerPole }}</dd></div><div><dt>Average illuminance</dt><dd>{{ currentResultFrame.lux }} lx</dd></div><div><dt>Uniformity</dt><dd>{{ currentResultFrame.uniformity.toFixed(2) }}</dd></div></dl>
        </figure>
      </div>
    </section>


    <section class="slx-band slx-inset" aria-labelledby="slx-challenges-title">
      <div class="slx-feature"><div class="slx-copy"><p class="slx-eyebrow">Technical challenges</p><h2 id="slx-challenges-title">Searching a<br>combinatorial space.</h2><p class="slx-body">Computers are excellent at brute-force computing millions of possibilities and finding the very best solution.
            However, this problem quickly grows beyond brute force. Every luminaire has its own orientation (0–360°), tilt (−10° to +15°)
            and model, so a design with just nine luminaires already exceeds <strong>10<sup>40</sup> possible configurations</strong>.
            With up to 20 luminaires on each of up to ten poles, the space passes <strong>10<sup>350</sup></strong>.</p>
<p class="slx-body">Trying to evaluate every combination is computationally infeasible. Even at millions of evaluations per second,
            a brute-force search would take longer than the age of the universe.
            For Sportslux to be usable in practice, solutions needed to be returned in a few minutes or less.</p>
<p class="slx-body">To achieve this, the engine relies on advanced optimisation algorithms to intelligently explore the solution space,
            rapidly converging toward optimal configurations without evaluating more than a tiny fraction of all possibilities.
            Reaching this level of performance required careful algorithm selection, aggressive pruning, and a deliberately
            engineered computation pipeline.</p></div><figure class="slx-media"><img :src="isoluxPreview" alt="Isolux curves showing the calculated distribution of illuminance across the field." loading="lazy" decoding="async"><figcaption>Calculated isolux curves and lighting distributions</figcaption></figure></div>
      <h3 class="slx-strategies-heading">Key optimisation strategies</h3>
<div class="slx-strategy-list">
            <div class="slx-feature-item">
              <strong>Extensive caching: </strong>
              <ul class="slx-subpoints">
                <li>Each luminaire footprint is pre-computed on file upload for every supported tilt angle.</li>
                <li>The optimiser caches all evaluated orientations so repeated configurations can be pulled directly from memory rather than recalculated.</li>
                <li>Complete solutions are cached in the database, enabling instant retrieval for repeated use cases (e.g. common sports presets).</li>
                <li>Prepared photometry is shared between jobs with matching geometry, cutting a ~12 s preparation step to under 0.1 s when warm.</li>
              </ul>
            </div>

            <div class="slx-feature-item">
              <strong>Batched integer search: </strong>
              <span>The whole population is scored in a single vectorised batch using whole-number decisions, allowing the engine to evaluate many candidate designs efficiently.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Bounded memory: </strong>
              <span>Luminaire footprints are streamed into fixed-size sample banks and only the winning design is rebuilt at full resolution, keeping memory use bounded during the search.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Symmetry detection: </strong>
              <span>The optimiser finds the field reflections that map a pole layout onto itself. Mirrored poles share fittings, so the search space shrinks while asymmetric layouts still optimise every pole independently.</span>
            </div>

            <div class="slx-feature-item">
              <strong>High-efficiency data handling: </strong>
              <span>NumPy arrays and vectorised operations are used throughout the computation pipeline to manage large datasets with minimal overhead.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Optimised library selection: </strong>
              <span>Performance-critical tasks leverage specialised libraries. For example, <code>cv2</code> is used for luminaire footprint transformations and SciPy for numeric optimisation.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Algorithm tuning and evaluation: </strong>
              <span>Multiple optimisation methods were tested, ultimately converging on SciPy's Differential Evolution algorithm as the best balance of reliability and performance for this problem. A 900-trial study (nine jobs &times; five seeds &times; 20 variants) informed the settings: a bounded score with a uniformity bonus, a Latin hypercube start, local search and population 20.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Code-level performance profiling: </strong>
              <span>The system was iteratively profiled line-by-line to identify inefficiencies and eliminate bottlenecks, ensuring consistent high-speed execution.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Infrastructure choices: </strong>
              <span>Each calculation runs in a small 1 vCPU / 2 GB ARM container that only runs while a job needs it (see the cloud architecture below).</span>
            </div>
          </div>
        
      <div class="slx-practical"><h3>Designed for practical use</h3><p class="slx-body">Typical scopes return a lighting design in seconds, allowing designers to explore layouts and discuss options during a customer meeting.</p><p class="slx-body">Prepared photometry and complete solutions are cached, so repeat calculations can reuse work. Each search runs independently in an on-demand worker and reports its best design as it progresses.</p></div>
    </section>

    <section class="slx-engineering slx-band slx-inset" aria-labelledby="slx-engine-title">
      <div class="slx-section-heading"><div><p class="slx-eyebrow">06 / Optimisation &amp; infrastructure</p><h2 id="slx-engine-title">Solver design<br>&amp; cloud architecture.</h2></div><p class="slx-body">The system runs on an on-demand, serverless AWS stack. The frontend is served from the edge, the API scales to zero between requests, and each calculation runs in its own ARM container. One CloudFormation template defines the stack, with automatic deployment on every merge.</p></div>
      <div class="slx-engine-notes">
        <div><span class="slx-eyebrow">Search</span><h3>Vectorised search.</h3><p class="slx-body">SciPy's Differential Evolution searches whole-number fitting decisions in vectorised batches. Photometry is streamed into fixed-size sample banks, and only the winning design is rebuilt at full resolution.</p></div>
        <div><span class="slx-eyebrow">Evaluate</span><h3>Algorithm evaluation.</h3><p class="slx-body">A 900-trial study informed the solver settings: a bounded score with a uniformity bonus, a Latin hypercube start, local search and population 20. Prepared photometry and complete solutions are cached for reuse.</p></div>
        <div><span class="slx-eyebrow">Deliver</span><h3>On-demand workers.</h3><p class="slx-body">A dedicated ARM Fargate worker runs each calculation. Opening the form pre-starts a worker; completed workers stay warm briefly so follow-up calculations can avoid another cold start.</p></div>
      </div>
      <div class="slx-architecture" aria-label="Sportslux AWS architecture components">
        <div v-for="(column, index) in awsArchitecture" :key="column.title" class="slx-architecture-column"><p class="slx-eyebrow">0{{ index + 1 }} / {{ column.title }}</p><div v-for="node in column.nodes" :key="node.name"><h4>{{ node.name }}</h4><p>{{ node.detail }}</p></div></div>
      </div>
      <div class="slx-details slx-expanded"><h3 class="slx-detail-title">Architecture &amp; operations in detail</h3><div class="slx-technical-grid"><div v-for="group in technicalGroups" :key="group.title"><h3>{{ group.title }}</h3><ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul></div></div><h3>Deployment</h3><ol><li v-for="step in deployPipeline" :key="step">{{ step }}</li></ol></div>
    </section>

    <section class="slx-feature slx-band slx-inset" aria-labelledby="slx-admin-title">
      <div class="slx-copy"><p class="slx-eyebrow">07 / Administration &amp; security</p><h2 id="slx-admin-title">Access control<br>&amp; operations.</h2><p class="slx-body">The administration interface uses an adjustable role-based access control model. Authorised staff can invite users, revoke access, upload or delete luminaire models, and monitor total runs and the most active users. Usage reporting also shows which roles in the organisation use the tool most.</p><p class="slx-body">Passwords are hashed and salted with bcrypt, with JWT-based authentication and self-service password resets through emailed links. A custom domain serves the application over HTTPS with HSTS and standard security headers, giving Schr&#233;der teams and selected customers browser access.</p></div>
      <figure class="slx-media slx-screenshot"><img :src="admin" alt="Sportslux administration interface for managing users, access and luminaires." loading="lazy" decoding="async"><figcaption>Administration / access, luminaire library &amp; usage</figcaption></figure>
    </section>

    <section class="slx-impact slx-band slx-inset" aria-labelledby="slx-impact-title">
      <p class="slx-eyebrow">08 / Project outcomes</p><h2 id="slx-impact-title">Business impact<br>of the engineering work.</h2>
      <div class="slx-impact-bottom"><p class="slx-lead">Approximately two hours of designer time saved per use, with initial lighting concepts available during customer meetings.</p><div><p class="slx-body">Sportslux brings design exploration into customer meetings and makes the handoff to specialist lighting designers clearer. The project also led to a Young Achiever Award nomination in 2025.</p><p class="slx-small">The existing project figures record 480+ runs and an estimated 960 hours saved. These are recorded project figures rather than a live usage counter.</p></div></div>
      <div class="slx-details slx-expanded"><h3 class="slx-detail-title">Project impact in detail</h3><ul><li v-for="item in benefits" :key="item">{{ item }}</li></ul></div>
    </section>

    <section class="slx-reflection slx-band slx-inset" aria-labelledby="slx-learning-title"><div class="slx-section-heading"><div><p class="slx-eyebrow">09 / Collaboration &amp; learning</p><h2 id="slx-learning-title">End-to-end delivery.<br>Development led by me.</h2></div><div><p class="slx-body">I led development from a locally hosted MVP to production releases. Jira and Confluence supported short sprints, clear decisions and a shared understanding of the system.</p><p class="slx-body">The work connected user experience, data design, numerical optimisation and cloud infrastructure, with real designer feedback shaping each iteration.</p></div></div><div class="slx-details slx-expanded"><figure class="slx-media slx-development-media"><img :src="devBoard" alt="Sportslux development board showing tickets and sprint planning." loading="lazy" decoding="async"><figcaption>Development process / Jira ticketing and sprint planning, supported by Confluence documentation</figcaption></figure><h3 class="slx-detail-title">Lessons from the project</h3><ul><li v-for="item in learnings" :key="item">{{ item }}</li></ul></div><div class="slx-details slx-expanded"><h3 class="slx-detail-title">Release history</h3><ol class="slx-timeline"><li v-for="event in keyDates" :key="event.date + event.version + event.title"><span class="slx-small">{{ event.date }} / {{ event.version }}</span><p>{{ event.title }}</p></li></ol></div></section>

    <footer class="slx-end slx-inset"><span class="slx-eyebrow">Sportslux / {{ project.category }} project</span><RouterLink to="/projects" class="slx-end-link">Explore more work <span aria-hidden="true">&#8599;</span></RouterLink></footer>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import video3d from '../assets/sportslux/videos/3d-night-render.mp4'
import poster3d from '../assets/sportslux/videos/3d-night-render.jpg'
import videoSatellite from '../assets/sportslux/videos/satellite-locate.mp4'
import posterSatellite from '../assets/sportslux/videos/satellite-locate.jpg'
import videoLoading from '../assets/sportslux/videos/live-optimiser.mp4'
import posterLoading from '../assets/sportslux/videos/live-optimiser.jpg'
import videoOverlays from '../assets/sportslux/videos/result-3d-overlays.mp4'
import posterOverlays from '../assets/sportslux/videos/result-3d-overlays.jpg'
import videoResults from '../assets/sportslux/videos/result-views.mp4'
import posterResults from '../assets/sportslux/videos/result-views.jpg'
import reportImage from '../assets/sportslux/report.png'
import admin from '../assets/sportslux/admin.png'
import result1 from '../assets/sportslux/results/1.png'
import result2 from '../assets/sportslux/results/2.png'
import result3 from '../assets/sportslux/results/3.png'
import result4 from '../assets/sportslux/results/4.png'
import result5 from '../assets/sportslux/results/5.png'
import result6 from '../assets/sportslux/results/6.png'
import result7 from '../assets/sportslux/results/7.png'
import result8 from '../assets/sportslux/results/8.png'
import result9 from '../assets/sportslux/results/9.png'
import result10 from '../assets/sportslux/results/10.png'
import result11 from '../assets/sportslux/results/11.png'
import result12 from '../assets/sportslux/results/12.png'
import resultsGrid from '../assets/sportslux/grid.png'
import resultsHeatmap from '../assets/sportslux/heatmap.png'
import isoluxPreview from '../assets/sportslux/isolux.png'
import dashboardPreview from '../assets/sportslux/dashboard.png'
import devBoard from '../assets/sportslux/devboard.png'
import videoPoles from '../assets/sportslux/videos/pole-placement.mp4'


defineProps({ project: { type: Object, required: true } })
const overview = ref(null)
function scrollToOverview() {
  overview.value?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  overview.value?.focus({ preventScroll: true })
}
const stats = [
  { value: '~2', unit: 'hrs', label: 'Designer time saved per use' },
  { value: '10', unit: 'poles', label: 'Individually positioned per field' },
  { value: '20', unit: 'fittings', label: 'Available on each pole' }
]

// Autoplay without playback controls; suspend off-screen clips to limit work.
const vAutoplayVisible = {
  mounted(el, binding) {
    const segment = binding.value
    const keepWithinSegment = () => {
      if (segment && el.readyState >= 1 && !el.seeking &&
          (el.currentTime < segment.start || el.currentTime >= segment.end)) {
        el.currentTime = segment.start
      }
    }
    if (segment) {
      el.addEventListener('loadedmetadata', keepWithinSegment)
      el.addEventListener('timeupdate', keepWithinSegment)
      keepWithinSegment()
    }
    let inView = false
    const sync = () => {
      keepWithinSegment()
      if (inView && !document.hidden) el.play()?.catch(() => {})
      else el.pause()
    }
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(entries => {
          inView = entries[0].isIntersecting
          sync()
        }, { threshold: 0.1 })
      : null
    if (observer) observer.observe(el)
    else { inView = true; sync() }
    document.addEventListener('visibilitychange', sync)
    el._slxCleanup = () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      el.removeEventListener('loadedmetadata', keepWithinSegment)
      el.removeEventListener('timeupdate', keepWithinSegment)
      el.pause()
    }
  },
  unmounted(el) { el._slxCleanup?.() }
}

const resultFrames = [
  { id: 12, image: result12, luminairesPerPole: 1, lux: 49, uniformity: 0.08, models: '1' },
  { id: 11, image: result11, luminairesPerPole: 1, lux: 60, uniformity: 0.10, models: '2' },
  { id: 10, image: result10, luminairesPerPole: 2, lux: 80, uniformity: 0.10, models: '3' },
  { id: 9,  image: result9,  luminairesPerPole: 2, lux: 90, uniformity: 0.12, models: '1' },
  { id: 8,  image: result8,  luminairesPerPole: 3, lux: 120, uniformity: 0.15, models: '1, 2' },
  { id: 7,  image: result7,  luminairesPerPole: 3, lux: 135, uniformity: 0.18, models: '1, 2' },
  { id: 6,  image: result6,  luminairesPerPole: 4, lux: 150, uniformity: 0.25, models: '1, 2' },
  { id: 5,  image: result5,  luminairesPerPole: 4, lux: 170, uniformity: 0.30, models: '2, 3' },
  { id: 4,  image: result4,  luminairesPerPole: 5, lux: 190, uniformity: 0.50, models: '1, 2' },
  { id: 3,  image: result3,  luminairesPerPole: 5, lux: 200, uniformity: 0.60, models: '1, 2, 3' },
  { id: 2,  image: result2,  luminairesPerPole: 5, lux: 210, uniformity: 0.65, models: '1, 2, 3' },
  { id: 1,  image: result1,  luminairesPerPole: 5, lux: 220, uniformity: 0.70, models: '1, 2, 3' }
]

const currentResultIndex = ref(0)
const currentResultFrame = computed(() => resultFrames[currentResultIndex.value])

/* ---------------- ENGINE MATRIX DEMO STATE ---------------- */

const engineState = ref({
  fieldWidth: '',
  fieldHeight: '',
  fieldShape: '',
  polePositions: '',
  poleHeight: '',
  allowedLuminaires: '',
  targetLux: '',
  targetUniformity: '',
  luminairesPerPole: '',
  luminaireOrientation: '',
  luminaireTilt: '',
  luminaireModel: '',
  luxLevel: '',
  uniformityRatio: '',
  lightSpill: ''
})

const fieldWidthOptions = [135]
const fieldHeightOptions = [115]
const poleHeightOptions = [30]
const allowedLuminaireOptions = ['x', 'y', 'z']

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function randomSubset(arr) {
  const count = Math.max(1, Math.floor(Math.random() * arr.length) + 1)
  const copy = arr.slice()
  const result = []
  while (result.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

/* --- Left column: INPUTS (updates slowly) --- */
function updateInputs() {
  const fw = randomChoice(fieldWidthOptions)
  const fh = randomChoice(fieldHeightOptions)
  const poleHeight = randomChoice(poleHeightOptions)
  const allowedLums = randomSubset(allowedLuminaireOptions)

  engineState.value.fieldWidth = fw + ' m'
  engineState.value.fieldHeight = fh + ' m'
  engineState.value.fieldShape = 'Oval'
  engineState.value.polePositions = '60m, 50m'
  engineState.value.poleHeight = poleHeight + ' m'
  engineState.value.allowedLuminaires = allowedLums.join(', ')
  engineState.value.targetLux = '200 lx'
  engineState.value.targetUniformity = '0.70'
}

/* --- Apply a result frame to middle + right column --- */
function applyFrame(idx) {
  const frame = resultFrames[idx]
  currentResultIndex.value = idx

  const lux = frame.lux
  const uni = frame.uniformity
  const spillBase = (1 - uni) * 100 / 3
  const spillValue = clamp(spillBase, 0, 100)
  const models = frame.models

  engineState.value.luminairesPerPole = String(frame.luminairesPerPole)
  engineState.value.luxLevel = lux + ' lx'
  engineState.value.uniformityRatio = uni.toFixed(2)
  engineState.value.lightSpill = spillValue.toFixed(1) + '%'
  engineState.value.luminaireModel = models

  // ✅ ensure middle-column variables re-sync with this frame's luminaire count
  updateVariablesFast()
}

/* --- Middle column: VARIABLES (updates frequently, uses current frame lum count) --- */
function updateVariablesFast() {
  const lumPerPole = parseInt(engineState.value.luminairesPerPole || '1', 10) || 1

  const orientationArray = Array.from({ length: lumPerPole }, () =>
    Math.round(randomFloat(0, 99))
  )
  const tiltArray = Array.from({ length: lumPerPole }, () =>
    Math.round(randomFloat(-10, 15))
  )

  engineState.value.luminaireOrientation = orientationArray.map(v => v + '°').join(',')
  engineState.value.luminaireTilt = tiltArray.map(v => v + '°').join(',')
}

/* --- Advance frame: 12 -> 11 -> ... -> 1 -> loop --- */
function advanceResultFrame() {
  const next = (currentResultIndex.value + 1) % resultFrames.length
  applyFrame(next)
}

let inputInterval
let variablesInterval
let frameInterval

onMounted(() => {
  updateInputs()
  applyFrame(0)           // start at 12.png (worst)
  updateVariablesFast()

  variablesInterval = setInterval(updateVariablesFast, 3000) // vars: fast
  frameInterval = setInterval(advanceResultFrame, 3000)     // image + outputs: medium
})

onBeforeUnmount(() => {
  clearInterval(inputInterval)
  clearInterval(variablesInterval)
  clearInterval(frameInterval)
})


const fieldSetupHighlights = [
  'Up to 10 poles placed anywhere, with support for both symmetric and asymmetric layouts.',
  'Each pole has its own height, and the form suggests one based on where the pole stands.',
  'Fitting counts can be chosen automatically for the whole field or pole by pole, up to 20 per pole.',
  'The optimiser removes unnecessary fittings from each pole while keeping the design within the standard.',
  'When no design meets the standard, the closest one is shown, ranked by the most important requirements first.',
  'Field markings follow the rules: AS 2560.2.3 rugby in-goals and FIFA-sized soccer areas, scaled to smaller pitches.'
]

const liveProgressPoints = [
  'The worker sends a snapshot about once a second: the best candidate\'s illuminance as compact uint16 lux (~18 KB) plus its decoded fittings and aim points. It uses the same decoding as the final render.',
  'The colour scale is fixed from 0 to the required lux for the whole run, so successive designs can be compared as they fill in.',
  'Progress is weighted by stage. Within a search it follows convergence on a log scale, it never moves backwards, and it does not stall in background tabs.',
  'For UI work, a dev page replays recorded optimiser runs through the real loading screen without a backend or login.'
]

const awsArchitecture = [
  {
    title: 'Edge',
    nodes: [
      { name: 'CloudFront', detail: 'Custom domain, HTTPS, HSTS + security headers' },
      { name: 'S3 · frontend', detail: 'Private bucket, readable only by CloudFront' }
    ]
  },
  {
    title: 'API',
    nodes: [
      { name: 'API Gateway', detail: 'HTTP API in front of the backend' },
      { name: 'Lambda · FastAPI', detail: 'arm64 container: auth, validation, job control' }
    ]
  },
  {
    title: 'Compute',
    nodes: [
      { name: 'ECS Fargate', detail: 'ARM worker per job, 1 vCPU / 2 GB, kept warm 5 min' },
      { name: 'EventBridge → Lambda', detail: 'Reconciler every minute recovers stalled jobs' }
    ]
  },
  {
    title: 'Data',
    nodes: [
      { name: 'PostgreSQL · RDS', detail: 'Users, run history, cached solutions, job state' },
      { name: 'S3 · artifacts', detail: 'Reports + images, expired by lifecycle rule' },
      { name: 'Secrets Manager', detail: 'DB, JWT and SMTP settings' }
    ]
  }
]

const deployPipeline = [
  'Merge to main',
  'GitHub Actions builds arm64 images',
  'ECR (pinned by digest)',
  'CloudFormation stack update',
  'DB migration',
  'Frontend upload + CloudFront invalidation'
]

const backendRequestPath = [
  'The Vue app is served from a private S3 bucket through CloudFront, so pages load from the edge with no server involved.',
  'API calls go through API Gateway to FastAPI on Lambda, which validates inputs and checks authentication/roles, so bad or unauthorised requests never reach compute.',
  'A valid calculation is written to a jobs table in PostgreSQL and handed to an idle warm worker if one is waiting. Otherwise Lambda starts a new Fargate task.',
  'The worker runs the optimiser and publishes a live snapshot about once a second (stage, fittings tried, best heatmap so far) that the loading screen polls. Jobs can be cancelled midway.',
  'Results, images and PDF reports land in S3 and the job record in PostgreSQL, so a user can refresh the page or change tabs without re-running the job.'
]

const backendCoreComponents = [
  'CloudFront + S3: fast static delivery of the UI from the edge, with both buckets fully private.',
  'API Gateway + Lambda: the FastAPI app packaged as an ARM container image. Strict typed requests, and it scales to zero between requests.',
  'Optimisation engine on Fargate: kept in its own container, separate from the web layer, so it stays testable and can report progress independently.',
  'Postgres (RDS): records users, runs and job state. Job hand-off uses row locks, so two jobs can never claim the same worker.',
  'S3 artifacts: keeps generated reports/exports durable and lightweight to serve, without bloating the database.'
]

const awsEfficiency = [
  'Pay per use: there is no always-on application server. The API and workers scale to zero when idle and scale out automatically when several designers run jobs at once.',
  'ARM (Graviton) throughout: both the API and the workers run on arm64, which costs less per unit of compute than x86.',
  'Cold starts hidden from the user: opening the calculation form pre-starts a worker, and finished workers stay warm for 5 minutes, so follow-up runs and manual-mode tweaks skip the 30–60 s container start-up.',
  'Right-sized compute: bounded memory use lets each calculation run in a 2 GB container.',
  'Least privilege: each component has its own IAM role scoped to just the buckets, secret and ECS actions it needs, and compute runs in private subnets with no public IPs.'
]

const backendOps = [
  'Every run is logged with enough metadata to reproduce issues, which makes debugging much faster.',
  'Caching is built in, so repeated runs with the same inputs return instantly instead of burning compute again.',
  'Validation happens at the API boundary, so the solver and databases are protected.',
  'A scheduled reconciler re-dispatches jobs whose worker disappeared and cleans up stale workers, so a failed container never leaves a user stuck on a loading screen.',
  'Infrastructure is code: one CloudFormation template defines the stack, every merge deploys automatically, and images are pinned by digest so rolling back is a redeploy of the previous build.'
]

const learnings = [
  'I had to design the overall structure of the system end-to-end, making sure it could scale cleanly and still stay reliable as usage grows.',
  'I learned that good API design is mostly about preventing misuse, so I built clear schemas, stringent validation, and role-based permissions so the system can be managed safely.',
  'I further improved my code optimisation skill set, this time in Python. This consisted of profiling properly, finding the real bottlenecks, and then fixing them with better data structures, caching, and vectorisation.',
  'I learned to iterate with the end-user in mind: collecting real feedback from customers, turning it into clear tickets, and planning sprints so we ship improvements without breaking what already works.',
  'How to properly future proof code, designing the database so new luminaire models and new constraints can be added without needing a schema rewrite or breaking existing projects.',
  'I learned the value of proper observability by storing API calls and run metadata. This made issues easily diagnosable, made solver runs reproducible, enabled monitoring of usage/health, and allowed for result caching.',
  'Documentation is what keeps momentum in an intermittent project, so I documented features, decisions, and backend structure, and kept commits clear enough that rollbacks and version tracking are easy.',
  'Moving from an always-on server to serverless taught me to design around cost and cold starts: job state lives in the database, workers stay warm briefly, and compute is started just before a user needs it.',
  'I learned to validate solver behaviour with reproducible seeded trials and use a 900-trial study to guide tuning decisions.',
]

const benefits = [
  'Turned early sports-field design from hours of manual work into seconds-long solver runs for typical scopes. Each use saves about 2 hours of designer time.',
  'Since launch, designers have run Sportslux over 480 times. 480 uses x 2 hours = 960 hours saved (at $150/hour) ~ $144 000 of business value to date.',
  'Sales teams can now build and iterate lighting concepts live in front of customers, lifting perceived technical maturity. Salespeople who use the tool report increased sales rate. However, this is anecdotal.',
  'Streamlines the handoff between sales teams and lighting designers, as initial designs are now formatted in the exact form a lighting designer desires, reducing rework and miscommunication.',
  'Customers now immediately receive a detailed report of their initial design automatically generated by the system, improving customer experience and professionalism.',
  'All sales meetings now automatically log the customer\'s exact requirements and initial designs, allowing for better follow-up and more tailored proposals.',
  'As a side use-case, the website also hosts a DGI calculator for quick daylight glare analysis, which has been used over 300 times since launch.',
  'Sportslux led to me getting nominated for the Young Achiever Award 2025, recognising the significant impact this project had on the business.'
]

const keyDates = [
  { date: '14/03/2025', version: 'V0.0.0', title: 'Exploration and initial implementation of the optimisation engine.' },
  { date: '14/04/2025', version: 'V0.1.0', title: 'Internal alpha and early designer feedback on the UI and solver outputs.' },
  { date: '24/04/2025', version: 'V1.0.0', title: 'First production rollout of Sportslux for day-to-day project work.' },
  { date: '09/06/2025', version: 'V1.0.1', title: 'Kickoff of V2 architecture and refactors based on production usage.' },
  { date: '11/07/2025', version: 'V1.1.0', title: 'V2 beta released to designers for testing and feedback.' },
  { date: '18/07/2025', version: 'V2.0.0', title: 'V2 deployed to production with expanded feature set.' },
  { date: '29/07/2025', version: 'V2.0.1', title: 'Stability and polish update focused on bug fixes.' },
  { date: '11/08/2025', version: 'V2.0.2', title: 'Additional stability pass and defect fixes in production.' },
  { date: '18/08/2025', version: 'V2.0.2', title: 'DGI calculator migrated into the Sportslux service.' },
  { date: '01/10/2025', version: 'V2.0.3', title: 'Further maintenance and bug-fix release.' },
  { date: '12/10/2026', version: 'V2.0.3', title: 'Batched integer search and bounded-memory photometry implemented in the solver.' },
  { date: '20/10/2026', version: 'V2.0.3', title: 'Moved to on-demand serverless AWS, with live optimisation progress, warm workers and automatic deploys.' },
  { date: '29/10/2026', version: 'V2.0.4', title: 'Custom domain, self-service password reset, security headers and pre-warmed calculations.' },
  { date: '03/11/2026', version: 'V2.1.0', title: 'Up to 10 poles anywhere, 20 fittings per pole, satellite field location and a 3D night view.' },
  { date: '03/11/2026', version: 'V2.1.2', title: 'Rugby in-goals, FIFA soccer markings and a live-site standards fix.' }
]

const technicalGroups = [
  { title: 'Request path', items: backendRequestPath },
  { title: 'Core components', items: backendCoreComponents },
  { title: 'Efficiency', items: awsEfficiency },
  { title: 'Operations', items: backendOps }
]
</script>

<style scoped>
:global(main.container:has(.sportslux-page)) { width: 100%; max-width: none; margin: 0; padding: 0; }
.sportslux-page { --slx-bg: #0c0e0f; --slx-ink: #f3f3ed; --slx-muted: #a6aaa7; --slx-line: #303434; --slx-accent: #d4e6b3; background: var(--slx-bg); color: var(--slx-ink); overflow: clip; }
.sportslux-page *, .sportslux-page *::before, .sportslux-page *::after { box-sizing: border-box; }
.sportslux-page h1, .sportslux-page h2, .sportslux-page h3, .sportslux-page h4, .sportslux-page p, .sportslux-page figure { margin: 0; }
.slx-inset { padding-inline: clamp(24px, 5vw, 100px); }
.slx-band { border-top: 1px solid var(--slx-line); padding-block: clamp(76px, 9vw, 160px); }
.slx-topline { min-height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 24px; font-size: 11px; letter-spacing: .09em; text-transform: uppercase; }
.slx-topline > span:nth-child(2) { color: var(--slx-muted); }
.slx-status { display: inline-flex; align-items: center; gap: 9px; }
.slx-status i { width: 6px; height: 6px; border-radius: 50%; background: var(--slx-accent); }
.slx-link { display: inline-flex; align-items: center; gap: 32px; width: fit-content; padding-block: 7px; border-bottom: 1px solid currentColor; font-size: 13px; }
.slx-link:hover { color: var(--slx-accent); }
.sportslux-page :is(a, summary, video):focus-visible { outline: 2px solid var(--slx-accent); outline-offset: 7px; }
.slx-hero { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr); min-height: 660px; padding-bottom: clamp(76px, 9vw, 150px); }
.slx-hero-media { align-self: stretch; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.slx-hero-media video { width: 100%; min-height: 420px; aspect-ratio: 1.2; object-fit: cover; background: #14201a; }
.slx-hero-media figcaption { padding: 17px 0 0 clamp(24px, 5vw, 100px); display: flex; justify-content: space-between; gap: 20px; }
.slx-hero-copy { padding: clamp(42px, 5vw, 90px) clamp(24px, 5vw, 100px); padding-right: clamp(24px, 4vw, 80px); align-self: center; }
.slx-eyebrow { font-size: 10px; line-height: 1.6; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; }
.slx-copy .slx-eyebrow, .slx-overview-heading .slx-eyebrow, .slx-section-heading .slx-eyebrow, .slx-impact > .slx-eyebrow { margin-bottom: 30px; color: var(--slx-muted); }
.slx-hero-copy .slx-eyebrow { color: var(--slx-accent); margin-bottom: 36px; }
.sportslux-page h1 { font-size: clamp(48px, 6.7vw, 120px); font-weight: 500; letter-spacing: -.075em; line-height: .96; }
.slx-title-dot { color: var(--slx-accent); }
.sportslux-page .slx-hero-heading { font-size: clamp(27px, 3vw, 54px); line-height: 1.12; letter-spacing: -.045em; margin: 28px 0; }
.slx-body { font-size: clamp(15px, 1.15vw, 18px); line-height: 1.8; color: var(--slx-muted); max-width: 570px; }
.slx-body + .slx-body { margin-top: 20px; }
.slx-explore { margin-top: 38px; }
.slx-actions { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 20px; }
.sportslux-page h2 { font-size: clamp(38px, 4.6vw, 76px); line-height: 1.07; font-weight: 400; letter-spacing: -.055em; }
.sportslux-page h3 { font-size: clamp(26px, 2.5vw, 42px); line-height: 1.16; font-weight: 400; letter-spacing: -.04em; }
.slx-lead { font-size: clamp(21px, 2vw, 32px); line-height: 1.45; letter-spacing: -.025em; max-width: 660px; }
.slx-overview { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 8vw, 150px); scroll-margin-top: 100px; }
.slx-overview .slx-body { margin-top: 26px; }
.slx-project-facts { margin: 48px 0 0; }
.slx-project-facts > div { display: grid; grid-template-columns: 125px 1fr; gap: 20px; padding-block: 18px; border-top: 1px solid var(--slx-line); font-size: 13px; }
.slx-project-facts dt { color: var(--slx-muted); }
.slx-project-facts dd { margin: 0; }
.slx-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; padding-block: 55px 85px; }
.slx-stats > div { padding-top: 24px; border-top: 1px solid var(--slx-line); }
.slx-stats p { font-size: clamp(56px, 7.5vw, 120px); line-height: 1.1; font-weight: 400; letter-spacing: -.07em; }
.slx-stats p span { font-size: clamp(16px, 1.6vw, 26px); margin-left: 12px; letter-spacing: -.025em; color: var(--slx-muted); }
.slx-stat-label { display: block; font-size: 12px; color: var(--slx-muted); margin-top: 22px; }
.slx-feature { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.3fr); align-items: center; gap: clamp(40px, 7vw, 130px); }
.slx-feature-media-first { grid-template-columns: minmax(0, 1.3fr) minmax(0, .8fr); }
.slx-feature-media-first > .slx-copy { grid-column: 2; grid-row: 1; }
.slx-feature-media-first > figure { grid-column: 1; grid-row: 1; }
.slx-copy h2, .slx-copy h3 { margin-bottom: 32px; }
.slx-media { min-width: 0; }
.slx-media video, .slx-media img { display: block; width: 100%; height: auto; background: #151a1b; }
.slx-media video { aspect-ratio: 16 / 9; object-fit: contain; }
.sportslux-page figcaption { font-size: 10px; color: var(--slx-muted); line-height: 1.6; letter-spacing: .025em; }
.slx-media figcaption, .slx-wide-media figcaption { display: flex; justify-content: space-between; gap: 12px; padding-top: 18px; }
.slx-section-heading { display: grid; grid-template-columns: 1.2fr 1fr; align-items: end; gap: clamp(40px, 9vw, 160px); margin-bottom: clamp(50px, 6vw, 100px); }
.slx-wide-media video { display: block; width: 100%; max-height: 85vh; aspect-ratio: 16 / 8; object-fit: cover; background: #131b17; }
.slx-wide-media figcaption { padding-block: 20px; }
.slx-results-detail { padding-top: clamp(60px, 8vw, 130px); }
.slx-paper { --slx-muted: #656a62; --slx-ink: #20251f; --slx-line: #d0d3c9; --slx-accent: #3b572a; background: #e9eae2; color: var(--slx-ink); }
.slx-report-media { padding: clamp(20px, 4vw, 65px); background: #d9ddd1; }
.slx-report-media img { display: block; width: 100%; max-height: 700px; object-fit: contain; }
.slx-report-media figcaption { text-align: center; padding-top: 24px; }
.slx-engine-notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: clamp(25px, 4vw, 75px); }
.slx-engine-notes > div { border-top: 1px solid var(--slx-line); padding-top: 24px; }
.slx-engine-notes .slx-eyebrow { color: var(--slx-accent); }
.slx-engine-notes h3 { font-size: clamp(23px, 2vw, 32px); margin-block: 20px; }
.slx-engine-notes .slx-body { font-size: 14px; }
.slx-architecture { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-block: 70px 30px; border-block: 1px solid var(--slx-line); }
.slx-architecture-column { padding: 28px 24px; border-right: 1px solid var(--slx-line); }
.slx-architecture-column:first-child { padding-left: 0; }
.slx-architecture-column:last-child { border-right: 0; }
.slx-architecture-column > p { color: var(--slx-accent); margin-bottom: 30px; }
.slx-architecture-column > div + div { margin-top: 24px; }
.sportslux-page h4 { font-size: 14px; font-weight: 500; }
.slx-architecture-column div p { font-size: 12px; line-height: 1.6; margin-top: 7px; color: var(--slx-muted); }
.slx-details { margin-top: 30px; border-top: 1px solid var(--slx-line); border-bottom: 1px solid var(--slx-line); }
.slx-details + .slx-details { margin-top: -1px; }
.slx-details summary { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-block: 22px; font-size: 13px; cursor: pointer; list-style: none; }
.slx-details summary::-webkit-details-marker { display: none; }
.slx-details summary span { font-size: 22px; font-weight: 300; transition: transform .2s; }
.slx-details[open] summary span { transform: rotate(45deg); }
.slx-details summary:hover { color: var(--slx-accent); }
.slx-details ul, .slx-details ol { margin: 0 0 30px; padding-left: 20px; color: var(--slx-muted); font-size: 14px; line-height: 1.9; }
.slx-details li + li { margin-top: 14px; }
.slx-details h3 { font-size: 22px; margin-block: 24px 18px; }
.slx-technical-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 70px; }
.slx-screenshot { background: #191d1e; padding: 24px; }
.slx-impact { background: #18211b; }
.slx-impact h2 { font-size: clamp(40px, 5.5vw, 88px); max-width: 1100px; }
.slx-impact-bottom { margin-top: 70px; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(35px, 8vw, 150px); }
.slx-small { font-size: 11px; line-height: 1.8; color: var(--slx-muted); }
.slx-impact-bottom .slx-small { margin-top: 24px; }
.slx-timeline { list-style: none; padding-left: 0 !important; display: grid; grid-template-columns: 1fr 1fr; gap: 25px 60px; }
.slx-timeline li { margin: 0 !important; padding-top: 16px; border-top: 1px solid var(--slx-line); }
.slx-timeline p { color: var(--slx-ink); margin-top: 6px; }
.slx-end { padding-block: 60px 90px; display: flex; align-items: center; justify-content: space-between; gap: 30px; border-top: 1px solid var(--slx-line); }
.slx-end > span { color: var(--slx-muted); }
.slx-end-link { font-size: clamp(26px, 4vw, 64px); letter-spacing: -.05em; }
.slx-end-link span { margin-left: 25px; color: var(--slx-accent); }
@media (min-width: 1800px) { .slx-hero { min-height: 850px; } .slx-hero-media video { max-height: 820px; } }
@media (max-width: 1100px) {
  .slx-hero { grid-template-columns: 1.05fr 1fr; min-height: auto; }
  .slx-hero-copy { padding-left: 32px; }
  .slx-hero-media video { min-height: 370px; }
  .slx-hero-media figcaption { flex-direction: column; gap: 0; }
  .slx-feature, .slx-feature-media-first { gap: 35px; grid-template-columns: 1fr 1.1fr; }
  .slx-feature-media-first { grid-template-columns: 1.1fr 1fr; }
  .slx-media figcaption { flex-direction: column; gap: 3px; }
  .slx-architecture-column { padding-inline: 16px; }
}
@media (max-width: 760px) {
  .slx-topline { min-height: 74px; font-size: 9px; gap: 12px; }
  .slx-topline > span:nth-child(2) { display: none; }
  .slx-hero { display: flex; flex-direction: column; padding-bottom: 50px; }
  .slx-hero-copy { order: -1; padding: 30px 24px 50px; align-self: stretch; }
  .slx-hero-copy .slx-eyebrow { margin-bottom: 28px; }
  .sportslux-page h1 { font-size: clamp(62px, 14vw, 100px); }
  .sportslux-page .slx-hero-heading { font-size: clamp(32px, 7vw, 48px); margin-block: 22px; }
  .slx-hero-media video { aspect-ratio: 16 / 10; min-height: 0; object-fit: contain; }
  .slx-hero-media figcaption { padding-inline: 24px; flex-direction: row; font-size: 9px; }
  .slx-overview, .slx-feature, .slx-feature-media-first, .slx-section-heading, .slx-impact-bottom { grid-template-columns: 1fr; gap: 40px; }
  .slx-feature-media-first > .slx-copy, .slx-feature-media-first > figure { grid-column: auto; grid-row: auto; }
  .slx-stats { gap: 18px; padding-block: 15px 55px; }
  .slx-stats p { font-size: clamp(40px, 11vw, 72px); }
  .slx-stats p span { display: block; margin: 6px 0 0; font-size: 15px; letter-spacing: 0; }
  .slx-stat-label { font-size: 10px; margin-top: 16px; }
  .slx-engine-notes, .slx-technical-grid, .slx-timeline { grid-template-columns: 1fr; }
  .slx-architecture { grid-template-columns: 1fr 1fr; margin-top: 45px; }
  .slx-architecture-column { padding: 24px 14px; }
  .slx-architecture-column:nth-child(odd) { padding-left: 0; }
  .slx-architecture-column:nth-child(even) { border-right: 0; }
  .slx-architecture-column:nth-child(n+3) { border-top: 1px solid var(--slx-line); }
  .slx-wide-media video { aspect-ratio: 16 / 10; object-fit: contain; max-height: none; }
  .slx-wide-media figcaption { flex-direction: column; gap: 3px; }
  .slx-impact-bottom { margin-top: 40px; }
  .slx-end { align-items: flex-start; flex-direction: column; padding-block: 45px 60px; }
  .slx-project-facts > div { grid-template-columns: 105px 1fr; gap: 14px; }
}
@media (prefers-reduced-motion: reduce) { .sportslux-page *, .sportslux-page *::before, .sportslux-page *::after { scroll-behavior: auto !important; transition: none !important; } }

/* The full case-study content stays expanded for the author's editing pass. */
.slx-expanded { padding-block: 24px; }
.slx-expanded > .slx-detail-title { font-size: 20px; margin: 0 0 24px; }
.slx-expanded ul, .slx-expanded ol { margin-bottom: 0; }
.sportslux-page video { pointer-events: none; }
.slx-engine-matrix { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; margin-bottom: 80px; }
.slx-engine-column { border-block: 1px solid var(--slx-line); padding-block: 25px; }
.slx-engine-column-title { font-size: 18px; margin-bottom: 24px; }
.slx-engine-list { list-style: none; padding: 0; margin: 0; }
.slx-engine-list li { display: flex; justify-content: space-between; align-items: baseline; gap: 18px; padding-block: 12px; font-size: 12px; border-top: 1px solid var(--slx-line); }
.slx-engine-label { color: var(--slx-muted); }
.slx-engine-value, .slx-engine-value-2 { text-align: right; overflow-wrap: anywhere; }
.slx-engine-flow-line { display: none; }
.slx-method-demo { align-items: start; grid-template-columns: 1fr 1fr; }
.slx-demo-figure { position: sticky; top: 110px; }
.slx-demo-metrics { display: flex; justify-content: space-between; gap: 20px; margin: 30px 0 0; border-top: 1px solid var(--slx-line); padding-top: 20px; }
.slx-demo-metrics dt { color: var(--slx-muted); font-size: 11px; }
.slx-demo-metrics dd { margin: 8px 0 0; font-size: 24px; }
.slx-strategies-heading { margin-top: 90px !important; margin-bottom: 40px !important; }
.slx-strategy-list { display: grid; grid-template-columns: 1fr 1fr; gap: 35px 70px; }
.slx-feature-item { padding-top: 24px; border-top: 1px solid var(--slx-line); font-size: 14px; line-height: 1.9; color: var(--slx-muted); }
.slx-feature-item strong { display: block; color: var(--slx-ink); font-size: 18px; font-weight: 400; margin-bottom: 15px; }
.slx-subpoints { margin: 0; padding-left: 20px; }
.slx-subpoints li + li { margin-top: 12px; }
.slx-practical { margin-top: 65px; }
.slx-practical h3 { margin-bottom: 25px; }
.slx-ui-gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 60px 40px; align-items: start; }
.slx-development-media { margin-bottom: 50px !important; }
@media (max-width: 760px) {
  .slx-engine-matrix, .slx-method-demo, .slx-strategy-list, .slx-ui-gallery { grid-template-columns: 1fr; }
  .slx-engine-matrix { gap: 24px; margin-bottom: 45px; }
  .slx-demo-figure { position: static; }
  .slx-strategies-heading { margin-top: 55px !important; }
}

</style>
