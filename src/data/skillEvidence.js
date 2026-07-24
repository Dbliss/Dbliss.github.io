export const skillDescriptions = {
  Python: 'A general-purpose language I use for backend services, automation, data processing and engineering tools.',
  TypeScript: 'JavaScript with static types, used to make application contracts clearer and larger codebases safer to change.',
  JavaScript: 'The core browser language I use for interactive products, application logic and full-stack services.',
  'C++': 'A compiled systems language I use when predictable performance, memory control and low-level optimisation matter.',
  SQL: 'The language I use to query, transform and validate relational data.',
  Algorithms: 'Structured approaches to solving computational problems efficiently, including search, optimisation and pathfinding.',
  'Vue.js': 'A component-based frontend framework I use to build responsive, stateful web interfaces.',
  HTML: 'The semantic structure behind the web interfaces and accessible documents I build.',
  CSS: 'The layout, responsive design and visual-system layer used across my browser-based products.',
  Vite: 'A fast frontend build tool and development server used to package modern web applications.',
  'Three.js': 'A JavaScript 3D library I use for interactive browser scenes, simulations and games.',
  WebGL: 'The browser graphics API beneath GPU-accelerated 2D and 3D rendering.',
  FastAPI: 'A typed Python framework I use to build maintainable, documented HTTP APIs.',
  'Node.js': 'A JavaScript runtime I use for backend services, integrations and automation.',
  'REST APIs': 'Resource-oriented HTTP interfaces used to connect products, services and external platforms.',
  OpenAPI: 'A machine-readable API contract used for documentation, validation and client integration.',
  Multithreading: 'Running work concurrently across threads to improve throughput or keep computational interfaces responsive.',
  'Rate Limiting': 'Controlling request volume to protect services, allocate capacity fairly and reduce abuse.',
  Caching: 'Retaining expensive or frequently used results so systems respond faster and repeat less work.',
  'API Versioning': 'Evolving an API without unexpectedly breaking existing consumers.',
  'OAuth 2.0': 'A delegated authorisation standard for granting scoped access without sharing user credentials.',
  SAML: 'An XML-based enterprise identity standard used for single sign-on between identity and service providers.',
  JWT: 'Signed tokens used to carry verifiable identity and authorisation claims between systems.',
  'Audit Logging': 'Tamper-conscious records of important user and system actions for traceability and investigation.',
  AWS: 'Amazon Web Services, used to host, connect, secure and operate cloud workloads.',
  'AWS EC2': 'Virtual cloud compute used to run and control application workloads.',
  'AWS S3': 'Durable object storage used for application assets, files and data exchange.',
  'AWS RDS': 'Managed relational databases with operational support for backups, availability and maintenance.',
  'AWS Route 53': 'AWS domain-name and DNS routing used to direct traffic to services.',
  'AWS VPC': 'Isolated cloud networking used to control how workloads communicate internally and externally.',
  'AWS IAM': 'AWS identity and access controls used to apply least-privilege permissions.',
  'AWS Lambda': 'Event-driven serverless compute used for short-lived automation and integration workloads.',
  Docker: 'Container packaging used to make application environments portable and repeatable.',
  Linux: 'The operating-system environment beneath most of the services and edge systems I work with.',
  Nginx: 'A web server and reverse proxy used to terminate traffic and route requests to applications.',
  Gunicorn: 'A production WSGI process server used to run Python web applications.',
  Systemd: 'Linux service management used to start, supervise and recover long-running processes.',
  DNS: 'The naming system that maps domains to services and underpins reliable web routing.',
  'TCP/IP': 'The foundational network protocols used to move data between devices and services.',
  'Reverse Proxies': 'Gateway services that receive client traffic and route it to internal applications.',
  'TLS/SSL': 'Transport encryption used to protect data and authenticate services in transit.',
  Git: 'Distributed version control used to track changes and collaborate safely on code.',
  GitHub: 'The collaboration platform I use for repositories, reviews and automated delivery workflows.',
  'CI/CD': 'Automated integration and delivery practices that make changes repeatable and lower-risk.',
  'GitHub Actions': 'GitHub-native workflow automation used for builds, checks and deployments.',
  Logging: 'Structured runtime records used to understand system behaviour and diagnose failures.',
  Monitoring: 'Continuous observation of service health, behaviour and performance.',
  'Health Checks': 'Automated probes that verify whether a service and its dependencies are operating correctly.',
  Alerting: 'Rules and notifications that turn important operational conditions into action.',
  PostgreSQL: 'A production-grade relational database used for strongly structured application data.',
  SQLite: 'A lightweight embedded relational database useful for local tools, prototypes and portable applications.',
  Redis: 'An in-memory data store used for fast caching, coordination and transient state.',
  'Schema Design': 'Designing data structures, constraints and relationships that preserve meaning as systems evolve.',
  Alembic: 'A Python database-migration tool used to version and safely apply schema changes.',
  Pandas: 'A Python library I use to clean, transform and analyse tabular data.',
  NumPy: 'Python numerical arrays and vectorised computation used beneath analytical and scientific workflows.',
  'scikit-learn': 'A Python machine-learning toolkit used for modelling, preprocessing and evaluation.',
  Bayesian: 'Probabilistic modelling that updates beliefs as evidence arrives and makes uncertainty explicit.',
  'Monte Carlo': 'Repeated random simulation used to explore ranges of possible outcomes under uncertainty.',
  'Random Forests': 'Ensembles of decision trees used for robust prediction and feature analysis.',
  Regression: 'Modelling relationships and predicting continuous outcomes from observed data.',
  Classification: 'Assigning observations to categories using learned patterns and calibrated decision rules.',
  Clustering: 'Finding meaningful groups in unlabelled data based on similarity.',
  'Web scraping': 'Programmatically collecting and structuring information from web sources.',
  'Data Cleaning': 'Finding and resolving missing, inconsistent or malformed data before it is used.',
  MQTT: 'A lightweight publish-subscribe protocol designed for devices and telemetry.',
  'Edge Computing': 'Processing data close to devices to reduce latency, bandwidth use and cloud dependency.',
  'Raspberry Pi': 'A compact Linux computer I use for embedded prototypes, robotics and control.',
  'Sensor Fusion': 'Combining multiple measurements to form a more reliable estimate of system state.',
  Metering: 'Capturing and interpreting measured usage or performance data from physical systems.',
  'Control Systems': 'Feedback-based methods used to make dynamic physical systems behave predictably.',
  'Fault Detection': 'Identifying abnormal behaviour so physical or software systems can be investigated and recovered.',
  'System Design': 'Defining components, boundaries, interfaces and trade-offs so a complete system meets its requirements.',
  'Unit Testing': 'Focused automated checks that verify small pieces of behaviour in isolation.',
  'Integration Testing': 'Checks that verify components, services and external dependencies work correctly together.',
  'Test Automation': 'Repeatable tooling that runs quality checks without relying on manual execution.',
  'Code Review': 'Collaborative inspection of proposed changes to improve correctness, clarity and shared understanding.',
  Specifications: 'Turning needs and constraints into clear, testable requirements for implementation.',
  Documentation: 'Written guidance that makes systems understandable, operable and easier to change.',
  Mentoring: 'Helping others build confidence and capability through practical, contextual guidance.',
  Scrum: 'An iterative delivery framework organised around short cycles, review and adaptation.',
  Kanban: 'A flow-based delivery method that makes work, constraints and bottlenecks visible.',
  'Public speaking': 'Presenting technical or business ideas clearly to groups with different levels of context.'
}

export const projectSkillMap = {
  frontier: [
    'JavaScript', 'Vue.js', 'HTML', 'CSS', 'Vite', 'Three.js', 'WebGL',
    'Algorithms', 'System Design', 'Git', 'GitHub'
  ],
  'lol-match-predictor': [
    'Python', 'Pandas', 'NumPy', 'scikit-learn', 'Bayesian', 'Random Forests',
    'Regression', 'Classification', 'Data Cleaning', 'Web scraping', 'Algorithms'
  ],
  sportslux: [
    'Python', 'JavaScript', 'Vue.js', 'HTML', 'CSS', 'FastAPI', 'REST APIs',
    'OpenAPI', 'PostgreSQL', 'Schema Design', 'Algorithms', 'System Design',
    'Specifications', 'Documentation'
  ],
  chessEngine: [
    'C++', 'Algorithms', 'Caching', 'Multithreading', 'System Design',
    'Unit Testing', 'Git', 'GitHub'
  ],
  'sports-booking': [
    'JavaScript', 'Vue.js', 'Node.js', 'REST APIs', 'PostgreSQL', 'Schema Design',
    'JWT', 'Audit Logging', 'System Design', 'Integration Testing', 'Specifications'
  ],
  'asset-data-integration': [
    'Python', 'JavaScript', 'Node.js', 'REST APIs', 'API Versioning',
    'Data Cleaning', 'Logging', 'Integration Testing', 'System Design'
  ],
  drone: [
    'Python', 'C++', 'Linux', 'Raspberry Pi', 'Sensor Fusion',
    'Control Systems', 'Fault Detection', 'Algorithms'
  ],
  'wealth-pathways-au': [
    'JavaScript', 'Vue.js', 'HTML', 'CSS', 'Vite', 'Multithreading',
    'Monte Carlo', 'Algorithms', 'System Design'
  ]
}

export const skillRoles = [
  {
    id: 'lead-engineer',
    title: 'Lead System & Software Development Engineer',
    organisation: 'Schréder',
    period: 'May 2026 – Present',
    skills: [
      'Python', 'TypeScript', 'JavaScript', 'SQL', 'Vue.js', 'FastAPI', 'Node.js',
      'REST APIs', 'OpenAPI', 'API Versioning', 'AWS', 'Docker', 'Linux', 'Git',
      'GitHub', 'CI/CD', 'GitHub Actions', 'Logging', 'Monitoring', 'Health Checks',
      'Alerting', 'PostgreSQL', 'Redis', 'Schema Design', 'Alembic', 'System Design',
      'Unit Testing', 'Integration Testing', 'Test Automation', 'Code Review',
      'Specifications', 'Documentation', 'Mentoring', 'Scrum', 'Kanban',
      'Public speaking'
    ]
  },
  {
    id: 'project-systems-engineer',
    title: 'Project & Control System Services Engineer',
    organisation: 'Schréder',
    period: 'May 2024 – May 2026',
    skills: [
      'Python', 'JavaScript', 'SQL', 'REST APIs', 'AWS', 'Linux', 'Git', 'Logging',
      'Monitoring', 'PostgreSQL', 'Data Cleaning', 'MQTT', 'Edge Computing',
      'Raspberry Pi', 'Sensor Fusion', 'Metering', 'Control Systems',
      'Fault Detection', 'System Design', 'Integration Testing', 'Specifications',
      'Documentation', 'Public speaking'
    ]
  },
  {
    id: 'co-founder',
    title: 'Co-Founder',
    organisation: 'Concepts & Calculations',
    period: 'Jun 2022 – Nov 2025',
    skills: [
      'Python', 'Documentation', 'Kanban'
    ]
  },
  {
    id: 'technical-consultant',
    title: 'Technical Consultant',
    organisation: 'Australian Business Council of Sweden',
    period: 'May 2023 – May 2024',
    skills: ['JavaScript', 'HTML', 'CSS', 'Test Automation', 'Documentation']
  },
  {
    id: 'tutor',
    title: 'High School Math and Software Tutor',
    organisation: 'Self-employed',
    period: 'Mar 2019 – May 2024',
    skills: ['Python', 'Algorithms', 'Mentoring']
  }
]
