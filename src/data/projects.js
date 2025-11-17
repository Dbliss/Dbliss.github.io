export const projects = [
  {
    slug: 'lol-match-predictor',
    title: 'League of Legends Match Predictor',
    tagline: 'Predict win probabilities from pro-match data',
    excerpt:
      'End-to-end system that ingests pro-match data, learns Elo-like ratings, and serves predictions.',
    description: `
I built a data pipeline to ingest and clean match logs, extracted team-level features and recent-form signals,
and trained a Random Forest model with cross-validation and calibration. I packaged the model behind a FastAPI
service with endpoints for probability lookups, and a Vue front end for exploration.

**Key decisions**
- Prefer interpretable features with leakage checks over heavy feature-engineering
- Emphasized calibration (Brier) rather than just raw accuracy
- Cached derived features to cut training time by ~60%

**Outcome**
- Cross-validated accuracy around mid-60s, with well-calibrated probabilities
- Great playground for discussing feature leakage and real-world evaluation trade-offs
    `,
    stack: ['Python', 'pandas', 'scikit-learn', 'FastAPI', 'Vue'],
    tags: ['ML', 'Sports Analytics'],
    repoUrl: 'https://github.com/your-handle/lol-predictor', // replace when ready
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
