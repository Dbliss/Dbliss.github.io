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

The platform supports two optimisation modes (fast vs advanced), interactive manual overrides, and uploads of custom IES files to extend the luminaire library.
I led the UX, data model, and optimisation orchestration work to make it practical for day-to-day design teams.
    `,
    stack: ['Vue', 'JavaScript', 'CSS', 'HTML', 'Python', 'FastAPI', 'PostgreSQL'],
    tags: ['Photometry', 'Optimisation', 'Full-stack'],
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
    category: 'Personal project',
    repoUrl: 'https://github.com/Dbliss/Chess-Engine-cpp',
    liveUrl: '',
    featured: true,
    hideFooter: true,
    hideNav: true
  },
  {
    slug: 'sports-booking',
    title: 'Sports Booking Platform',
    tagline: 'Customer-facing scheduling and lighting automation',
    excerpt:
      'Full-stack booking system for sports fields that automates lighting schedules based on reservations.',
    description: 'Documentation pending',
    stack: ['Vue', 'Node.js', 'PostgreSQL', 'REST API'],
    tags: ['Bookings', 'Automation', 'Full-stack'],
    category: 'External',
    repoUrl: '',
    liveUrl: '',
    featured: false
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
    category: 'External',
    repoUrl: '',
    liveUrl: '',
    featured: false
  },
  {
    slug: 'betting-odds',
    title: 'Betting Odds Analysis',
    tagline: 'Personal study of pricing and probability',
    excerpt:
      'Explorations of implied probabilities, market movement, and pricing models.',
    description: 'Documentation pending',
    stack: ['Python', 'pandas', 'Jupyter'],
    tags: ['Statistics', 'Sports analytics'],
    category: 'Personal project',
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
    category: 'Personal project',
    repoUrl: '',
    liveUrl: '',
    featured: false
  }
]
