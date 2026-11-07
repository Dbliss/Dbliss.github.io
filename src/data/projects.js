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
    tags: ['Machine Learning', 'Sports Analytics', 'Statistics'],
    groups: ['AI & ML', 'Data engineering'],
    category: 'Personal project',
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

Designers can locate the real ground on satellite imagery, place up to 10 poles anywhere, watch the optimiser's best design update live, and review results in a 3D night view.
It also supports interactive manual overrides and uploads of custom IES files to extend the luminaire library.
It runs on an on-demand serverless AWS stack (CloudFront, Lambda, ARM Fargate), so compute only exists while a calculation needs it.
I led the UX, data model, and optimisation orchestration work to make it practical for day-to-day design teams.
    `,
    stack: ['Vue', 'three.js', 'JavaScript', 'CSS', 'HTML', 'Python', 'FastAPI', 'PostgreSQL', 'AWS'],
    tags: ['Photometry', 'Optimisation', 'Full-stack'],
    groups: ['In production', 'Full-stack & web', 'Algorithms & optimisation'],
    category: 'Internal',
    repoUrl: '',
    liveUrl: '',
    featured: true
  },
  {
    slug: 'chessEngine',
    title: 'C++ Chess Engine',
    tagline: 'High Performing Chess Engine and UI Built from Scratch',
    excerpt:
      'Created a high performing chess engine to extend my c++ skillset. Includes UI for player vs computer and computer vs computer matches.',
    description: `
I built a chess engine from scratch in c++ to extend my knowledge of c++ fundamentals, learn about optimisation techniques,
and master key software fundamentals such as hashing, search trees, bit operations, 

**Outcome**
- Over 2000 rated chess engine
- Millions of computations a second
- Extensive understanding of C++ fundamentals and heavily optimised code
    `,
    stack: ['C++', 'Visual Studio executable code', 'Caching'],
    tags: ['Optimisation', 'Game-Tree'],
    groups: ['Systems & embedded', 'Algorithms & optimisation'],
    category: 'Personal project',
    repoUrl: 'https://github.com/Dbliss/Chess-Engine-cpp',
    liveUrl: '',
    featured: true,
    hideFooter: true,
    hideNav: true
  },
  {
    slug: 'sports-booking',
    title: 'FrontRunner Sports Booking Platform',
    tagline: 'Council-grade booking, policy enforcement, and lighting automation',
    excerpt:
      'Customer-facing multi-tenant booking system that validates reservations in real time and commissions lighting schedules through EXEDRA.',
    description: `
FrontRunner is a full-stack booking and operations platform for councils and sports operators.
It centralises reservations, enforces configurable booking policies, and automates lighting schedules via EXEDRA integration.
The product includes role-based administration, subtenancy delegation, recurring bookings, and reporting exports for operational workflows.
    `,
    stack: ['Vue 3', 'Node.js', 'PostgreSQL', 'JWT Auth', 'SMTP', 'EXEDRA API'],
    tags: ['Multi-tenant', 'RBAC', 'Automation', 'Scheduling'],
    groups: ['In production', 'Full-stack & web'],
    category: 'External',
    repoUrl: '',
    liveUrl: '',
    featured: true,
    hideFooter: true,
    hideNav: true
  },
  {
    slug: 'curated-wellness',
    title: 'Curated Wellness AI Commerce Platform',
    tagline: 'Bella, an AI supplement guide with memory, guardrails and a full operations backend',
    excerpt:
      'Built the backend, AI chatbot, customer memory, affiliate programme and super admin behind a live Shopify supplement store.',
    description: `
Curated Wellness is a New Zealand supplement brand selling on Shopify. The storefront design came from the brand's design team;
I built everything behind it:
- Bella, an OpenAI-powered chat guide with ranked markdown retrieval, request guardrails and deterministic response guards
- visitor, customer and purchase memory linked through verified Shopify logins and order webhooks
- an affiliate and personal-trainer programme with lifetime attribution and refund clawback
- a super admin for chats, orders, payouts, site health and editing the chatbot's knowledge
- AWS infrastructure (EC2, RDS Postgres, SES, Secrets Manager) with health probes and incident alerts
    `,
    stack: ['Node.js', 'PostgreSQL (AWS RDS)', 'OpenAI Responses API', 'Shopify App (React Router 7, Prisma)', 'Theme app extensions', 'AWS EC2 / SES / Secrets Manager'],
    tags: ['Applied AI', 'E-commerce', 'Full-stack', 'Data modelling'],
    groups: ['In production', 'AI & ML', 'Full-stack & web'],
    category: 'External',
    repoUrl: '',
    liveUrl: 'https://curatedwellness.co.nz',
    featured: true
  },
  {
    slug: 'asset-data-integration',
    title: 'Asset Data Integration',
    tagline: 'CMS ingestion and transformation pipeline',
    excerpt:
      'Service that ingests CMS API data, filters and transforms it, then syncs to an asset management platform.',
    description: 'Documentation pending',
    stack: ['Python', 'Node.js', 'ETL', 'REST API'],
    tags: ['Data integration', 'Automation', 'ETL'],
    groups: ['In production', 'Data engineering'],
    category: 'External',
    repoUrl: '',
    liveUrl: '',
    featured: false
  },
  {
    slug: 'drone',
    title: 'Autonomous Drone Prototype',
    tagline: 'Low-latency flight control on Raspberry Pi',
    excerpt:
      'Custom-built drone with PID controllers and low-latency control software running on a Raspberry Pi.',
    description: 'Documentation pending',
    stack: ['Raspberry Pi', 'C++', 'Python', 'PID Control'],
    tags: ['Robotics', 'Control systems', 'Embedded'],
    groups: ['Systems & embedded', 'Algorithms & optimisation'],
    category: 'Personal project',
    repoUrl: '',
    liveUrl: '',
    featured: false
  },
  {
    slug: 'wealth-pathways-au',
    title: 'Australian Wealth Pathways Calculator',
    tagline: 'Interactive comparison tool for rent, investing, houses, and apartments',
    excerpt:
      'Monte Carlo-based browser calculator that compares wealth-building pathways for Australians across 10 to 30 year horizons.',
    description: `
Australian Wealth Pathways is a scenario-planning tool built for Australians trying to decide between renting and investing,
an optional live-at-home runway, buying a home to live in, and buying a property as an investment while renting.

The page is designed as a live calculator rather than a static case study. Users can edit assumptions for:
- income growth and savings rate
- move-out rent, live-at-home duration, and at-home living costs
 - ASX200, QQQ, bond, cash, and bitcoin allocations
- mortgage rates, deposits, and property growth
- first-home-buyer settings, selected property intention, and rentvesting assumptions

The engine uses Monte Carlo simulation in a web worker so the UI stays responsive while percentile bands update.
The goal is not to give personal advice, but to make the trade-offs and drivers of each pathway visible.
    `,
    stack: ['Vue', 'Vite', 'Web Workers', 'Monte Carlo Simulation'],
    tags: ['Finance Modelling', 'Interactive UI', 'Australia'],
    groups: ['Full-stack & web', 'Algorithms & optimisation'],
    category: 'Personal project',
    repoUrl: '',
    liveUrl: '',
    featured: false,
    hideFooter: true
  },
  {
    slug: 'super-move',
    title: 'Super Move Quote Builder',
    tagline: 'Static Vue app with a voxel truck packer, embedded in a Wix site',
    excerpt:
      'Removals quote builder for a Sydney removalist. It runs entirely in the browser, packs the inventory into trucks with a 3D voxel search, and sends quote requests into the client\'s Wix site.',
    description: `
Hosting: a Vue 3 + Vite multi-page build, deployed to GitHub Pages by a GitHub Actions workflow on every push to main.
There is no server. All computation runs in the browser, including a time-budgeted packing search in a Web Worker.

Integration: the app is embedded in the client's Wix site as an HTML iframe. On submit it sends the quote to the parent page with postMessage.
Wix page code listens with $w(...).onMessage and calls a Velo backend web module, which inserts the quote into a QuoteRequests CMS collection.
A Wix Automation on that collection emails the business, so no keys or email logic ever reach the browser.

Packing: a 10 cm voxel grid with per-item stack levels, open-top flags, allowed rest poses and a 70% support rule.
A three-phase search finds the fewest trucks, then the cheapest mixed fleet, then the best-looking layout within the time budget.
    `,
    stack: ['Vue 3', 'Vite', 'three.js', 'Web Workers', 'GitHub Actions', 'GitHub Pages', 'Wix Velo'],
    tags: ['3D bin packing', 'Static hosting', 'Wix integration'],
    groups: ['In production', 'Full-stack & web', 'Algorithms & optimisation'],
    category: 'External',
    repoUrl: 'https://github.com/Dbliss/Super-Move',
    liveUrl: 'https://dbliss.github.io/Super-Move/',
    featured: true,
    hideNav: true
  }
]
