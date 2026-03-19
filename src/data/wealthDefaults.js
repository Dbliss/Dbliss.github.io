export const wealthProjectSlug = 'wealth-pathways-au'

export const wealthSimulationMetadata = {
  lastUpdated: '2026-03-19',
  version: 'v1.1',
  sources: [
    { label: 'RBA cash rate / mortgage context', detail: 'Static assumptions curated for this portfolio build; edit locally as conditions change.' },
    { label: 'ATO resident tax bands', detail: 'Resident individual tax estimates including a simple Medicare levy approximation.' },
    { label: 'Property growth and fee defaults', detail: 'Illustrative Australia-wide baseline inputs, not suburb-level forecasting.' }
  ]
}

export const wealthAssumptionSections = [
  {
    title: 'What this models',
    items: [
      'Single-person comparison across rent + invest, buy to live, and buy as an investment property while renting.',
      'An optional live-at-home runway before all strategies branch into the same move-out decision point.',
      'Monte Carlo return bands for ASX200, QQQ, bonds, and the selected property type over 10 to 30 years.'
    ]
  },
  {
    title: 'What this does not model',
    items: [
      'Couples, dependants, complex borrowing assessments, or trust/company ownership structures.',
      'Suburb-level property cycles, offset account optimization, redraw facilities, or superannuation strategy.',
      'Personal financial advice, product recommendations, or edge-case legal treatment.'
    ]
  },
  {
    title: 'Interpretation notes',
    items: [
      'Portfolio tax is simplified to recurring distribution tax and franking effects rather than lot-level capital gains realization.',
      'Property pathways use the selected house or apartment assumptions, and positive surplus cash is redirected into the portfolio.',
      'Affordability snapshots are simple deposit-and-carry checks, not formal bank serviceability assessments.',
      'All defaults are editable so users can pressure-test their own conservative and aggressive assumptions.'
    ]
  }
]

export const wealthStrategyOrder = ['rentInvest', 'buyHome', 'buyInvestmentProperty']

export function getWealthStrategyMeta(propertyIntent = 'house') {
  const propertyLabel = propertyIntent === 'apartment' ? 'Apartment' : 'House'
  return {
    rentInvest: {
      label: 'Rent + Invest',
      shortLabel: 'Rent',
      color: '#7dd3fc',
      accent: 'rgba(125, 211, 252, 0.18)',
      description: 'Move out, pay market rent, and direct surplus cash into the portfolio.'
    },
    buyHome: {
      label: `Buy ${propertyLabel} To Live In`,
      shortLabel: `Own ${propertyLabel}`,
      color: '#34d399',
      accent: 'rgba(52, 211, 153, 0.18)',
      description: `Buy the chosen ${propertyIntent} as an owner-occupier and invest any surplus above repayments and holding costs.`
    },
    buyInvestmentProperty: {
      label: `Buy ${propertyLabel} As Investment + Rent`,
      shortLabel: `Rentvest ${propertyLabel}`,
      color: '#f472b6',
      accent: 'rgba(244, 114, 182, 0.18)',
      description: `Keep renting where you live while holding the chosen ${propertyIntent} as an investment property.`
    }
  }
}

export const defaultSimulationRequest = {
  profile: {
    startingSavings: 140000,
    annualIncome: 115000,
    incomeGrowthRate: 0.04,
    weeklyAvailableToSave: 970,
    horizonYears: 20
  },
  housingCosts: {
    liveAtHome: false,
    liveAtHomeYears: 0,
    weeklyRent: 760,
    rentGrowthRate: 0.035,
    weeklyBoardAtHome: 180,
    boardGrowthRate: 0.025
  },
  portfolioConfig: {
    asxWeight: 0.42,
    qqqWeight: 0.33,
    bondWeight: 0.25,
    asxReturnMean: 0.085,
    asxVolatility: 0.16,
    asxDividendYield: 0.04,
    asxFrankingPct: 0.75,
    qqqReturnMean: 0.11,
    qqqVolatility: 0.23,
    qqqDividendYield: 0.009,
    bondReturnMean: 0.045,
    bondVolatility: 0.07,
    bondIncomeYield: 0.038
  },
  propertyConfig: {
    firstHomeBuyerEligible: true,
    targetPropertyType: 'house',
    rentYield: 0.042,
    vacancyRate: 0.03,
    propertyManagementPct: 0.07,
    house: {
      purchasePrice: 980000,
      depositPct: 0.2,
      mortgageYears: 30,
      interestRate: 0.062,
      longRunInterestRate: 0.055,
      growthMean: 0.058,
      growthVolatility: 0.09,
      stampDuty: 40500,
      legalFees: 2600,
      buyersCosts: 2400,
      councilRates: 2600,
      insurance: 1800,
      maintenance: 4200,
      strata: 0,
      firstHomeBuyerDutyReductionPct: 0.65,
      firstHomeBuyerGrant: 10000
    },
    apartment: {
      purchasePrice: 710000,
      depositPct: 0.18,
      mortgageYears: 30,
      interestRate: 0.061,
      longRunInterestRate: 0.054,
      growthMean: 0.041,
      growthVolatility: 0.065,
      stampDuty: 24700,
      legalFees: 2400,
      buyersCosts: 2100,
      councilRates: 1700,
      insurance: 950,
      maintenance: 1200,
      strata: 4800,
      firstHomeBuyerDutyReductionPct: 0.55,
      firstHomeBuyerGrant: 7000
    }
  },
  simulationSettings: {
    iterations: 360,
    seed: 19
  }
}

export function cloneSimulationRequest() {
  return JSON.parse(JSON.stringify(defaultSimulationRequest))
}
