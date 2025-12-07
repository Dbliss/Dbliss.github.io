export const projects = [
  {
    slug: 'lol-match-predictor',
    title: 'Bayesian Predictor for Esports',
    tagline: 'Side project to price pro esports matches like a bookmaker',
    excerpt:
      'Built my own player rating system and match model, then used it to see where it disagrees with bookmaker odds.',
    description: `
For this project I wanted to learn some more advanced ML concepts, and also explore finance from an analytics angle.

Esports has extensive match history data available, so I picked League of Legends pro matches as my domain. 
I take raw match data and:
- turn it into a clean view of players, teams and patches
- give every player a skill rating that moves over time according to bayesian fundamentals
- additional metrics were measured over time, where I created random forest models to measure how well each individual contributed to game.
- finally, I built a gradient boosting models with these features to predict match outcomes

Instead of stopping at "the model is X% accurate", I pushed hard on how **good** the probabilities are:
- plotted calibration curves to check if my 60% calls really win about 60% of the time
- looked at the full distribution of predicted win chances to see when the model is sitting on coinflip vs finding real favourites/underdogs
- compared my numbers to bookmaker lines in simple backtests to see if there’s any edge or if I’m just recreating the market
- I also used testings methods to ensure I wasn’t overfitting to historical data, or leaking future info into my features. This included k-fold cross-validation and time-based splits.

What I actually got out of it:
- this project gave me real taste of building end-to-end ML systems, and the challenges of establishing clean workflows for data processing, model training, and evaluation
- a much deeper understanding of common professional ML methods and tools, such as random forests, gradient boosting, calibration techniques, and backtesting strategies.
- the financial understanding of how to evaluate probabilistic models in real-world scenarios, especially in competitive markets like sports betting.

Model Results:
- My final model achieved about 68% accuracy on held-out test data, which is decent for this domain
- Calibration plots showed the probabilities were reasonably well-aligned with actual outcomes, though there’s room for improvement
- Backtests against bookmaker odds indicated some small edges on certain match types, but nothing consistently exploitable after fees
- The model did however, beat the market from prior to 2020, indicating that bookmakers have improved efficiency over time as the esports scene matured. 
- While not a financially profitable system, it was a great learning experience in probabilistic modeling and real-world ML evaluation.

The images here are two of the main diagnostics I use:
- a calibration plot to sanity-check the probabilities
- a probability distribution chart to see how often the model leans into strong opinions vs staying conservative
    `,
    stack: ['Python', 'pandas', 'scikit-learn', 'UKF', 'Random forests', 'Gradient Boosting'],
    tags: ['Machine Learning', 'Sports Analytics', 'Financial Modeling', 'Statistics'],
    repoUrl: 'https://github.com/Dbliss/LoLPredictor',
    liveUrl: '',
    featured: true
  },
  {
    slug: 'sportslux',
    title: 'Sportslux Lighting Optimiser',
    tagline: 'Advanced sports lighting configuration calculator for Schreder',
    excerpt:
      'End-to-end web app that calculates optimal pole layouts, fixture mixes, and tilt for sports fields with downloadable reports.',
    description: `
Sportslux is a full-stack tool for engineers to rapidly design compliant sports field lighting layouts.
It ingests field requirements, fixture photometry, and pole placement rules to generate optimised aiming plans, preview heatmaps, and PDFs.

The platform supports two optimisation modes (fast vs advanced), interactive manual overrides, and uploads of custom IES files to extend the luminaire library.
I led the UX, data model, and optimisation orchestration work to make it practical for day-to-day design teams.
    `,
    stack: ['Vue', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL'],
    tags: ['Photometry', 'Optimisation', 'Full-stack'],
    repoUrl: '',
    liveUrl: '',
    featured: true
  },
  {
    slug: 'smart-lighting-dashboard',
    title: 'Smart Lighting Control Dashboard',
    tagline: 'Manage lighting groups, schedules, and live device states',
    excerpt:
      'Production-grade dashboard to configure thousands of devices, integrated with an IoT CMS.',
    description: `
I led the front-end implementation of a Vue 3 + TypeScript dashboard for smart-city lighting.
The UI supports schedule editing, device grouping, and live status streaming with WebSockets.

**Constraints**
- 10k+ devices, flaky field connectivity, and slow vendor APIs
- Needed optimistic updates with conflict detection

**Outcome**
- Reduced configuration time from ~20 minutes to <5 minutes for common tasks
- Cleaner separation of concerns and testable modules for long-term maintainability

*Note:* Code is proprietary; I can walk through the architecture in interviews.
    `,
    stack: ['Vue 3', 'TypeScript', 'REST', 'WebSockets'],
    tags: ['IoT', 'Dashboard'],
    repoUrl: '',
    liveUrl: '',
    featured: true
  },
  {
    slug: 'invoice-automation',
    title: 'Invoice Automation Toolkit',
    tagline: 'Generate polished PDFs from lesson logs',
    excerpt:
      'Scriptable workflow that aggregates lesson logs and generates invoices on a schedule.',
    description: `
The toolkit authenticates with Google APIs, normalizes lesson logs from Docs/Sheets, and generates PDF invoices.
I built templating and rounding rules, then scheduled it on a small VM with email delivery.

**Outcome**
- Replaced manual monthly work; repeatable and auditable invoice outputs
    `,
    stack: ['Python', 'Google APIs'],
    tags: ['Automation'],
    repoUrl: 'https://github.com/your-handle/invoice-automation',
    liveUrl: '',
    featured: true
  },
  {
    slug: 's4i-cms-integration',
    title: 'S4i CMS Integration (Anonymised)',
    tagline: 'Unified API client for a vendor CMS',
    excerpt:
      'Created a typed client and caching strategy to make a vendor CMS bearable to integrate with.',
    description: `
I reverse-engineered inconsistent endpoints, wrapped them in a typed client, and added
request deduplication and caching. This improved reliability and simplified the UI layer.

**Outcome**
- Fewer edge-case failures and simpler error handling
- Easier to mock in tests
    `,
    stack: ['TypeScript', 'OpenAPI', 'Caching'],
    tags: ['Integration'],
    repoUrl: '',
    liveUrl: ''
  }
]
