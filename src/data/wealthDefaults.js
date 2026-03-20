export const wealthProjectSlug = 'wealth-pathways-au'

export const wealthSimulationMetadata = {
  lastUpdated: '2026-03-20',
  version: 'v2.0',
  sources: [
    {
      label: 'ATO resident tax rates',
      detail: 'Default resident tax-year logic uses the 2025-26 settings by default, with the 2026-27 15 percent bracket available as a scenario input.',
      url: 'https://www.ato.gov.au/law/view/document?DocNum=0000081420&FullDocument=true&PiT=99991231235958'
    },
    {
      label: 'ATO Medicare levy',
      detail: 'The model applies a national-core 2 percent Medicare levy and does not automate surcharge or low-income threshold edge cases.',
      url: 'https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/tax-time-2025/before-you-lodge/medicare-levy'
    },
    {
      label: 'ATO rental deductions',
      detail: 'Investment-property taxable income includes deductible interest, borrowing-expense amortisation, and manual capital-works and depreciation inputs, while principal remains non-deductible.',
      url: 'https://www.ato.gov.au/forms-and-instructions/rental-properties-2025/rental-expenses'
    },
    {
      label: 'ATO common rental expenses',
      detail: 'Common rental-cost categories such as council, water, insurance, maintenance, strata, and management fees are surfaced as editable assumptions.',
      url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/property-and-land/residential-rental-properties/rental-expenses/common-property-expenses'
    },
    {
      label: 'CGT treatment note',
      detail: 'Headline results now estimate after-tax sell-down at the horizon, applying the main-residence exemption to owner paths and a simplified discounted CGT estimate to taxable gains.',
      url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/property-and-capital-gains-tax/your-main-residence-home/moving-to-a-new-main-residence'
    }
  ]
}

export const wealthVacancyRate = 0.03
export const wealthVacancyRateVolatility = 0.01

export const wealthAssumptionSections = [
  {
    title: 'What this models',
    items: [
      'Single-person comparison across rent + invest, buy to live, and buy as an investment property while renting.',
      'An optional currently-living-at-home phase that lowers housing costs while saving, investing, or rentvesting before rent-based paths move out.',
      'A yearly after-tax cash ledger starting from gross salary, non-housing living costs, housing cashflows, and portfolio market returns.'
    ]
  },
  {
    title: 'What this does not model',
    items: [
      'Couples, dependants, HELP balances, Medicare levy surcharge edge cases, or trust/company ownership structures.',
      'Suburb-level property cycles, automated state land-tax tables, offset account optimization, redraw facilities, or superannuation strategy.',
      'Personal financial advice, product recommendations, or edge-case legal treatment.'
    ]
  },
  {
    title: 'Interpretation notes',
    items: [
      'Portfolio tax is simplified to recurring distribution tax, franking-credit gross-up, and refundable franking offsets rather than realised capital-gains events.',
      'Investment-property tax compares salary-only tax with salary plus taxable portfolio income and net rental profit or loss, so negative gearing can lower modeled tax.',
      'Property pathways can route positive annual surplus either to the portfolio or to extra mortgage repayments.',
      'Headline results use an estimated sell-everything value at the horizon: liquid assets plus sale proceeds less debt and estimated CGT where applicable.',
      'Owner-occupier property is treated as main-residence exempt, while taxable portfolio and investment-property gains use a simplified discounted CGT estimate.',
      'Property pathways wait until upfront cash is available and the purchase year still ends with non-negative liquid assets; affordability warnings flag later years where liquid assets still fall below zero.',
      'Investment-property vacancy uses a 3 percent baseline and the simulation varies it year to year.',
      'Most defaults are editable so users can pressure-test their own conservative and aggressive assumptions.'
    ]
  }
]

export const wealthStrategyOrder = [
  'rentInvest',
  'buyHouseHome',
  'buyApartmentHome',
  'buyHouseInvestmentProperty',
  'buyApartmentInvestmentProperty'
]

export function getWealthStrategyMeta() {
  return {
    rentInvest: {
      label: 'Rent + Invest',
      shortLabel: 'Rent',
      color: '#7dd3fc',
      accent: 'rgba(125, 211, 252, 0.18)',
      description: 'Move out, pay market rent, and direct surplus cash into the portfolio.'
    },
    buyHouseHome: {
      label: 'Buy House To Live In',
      shortLabel: 'Own House',
      color: '#34d399',
      accent: 'rgba(52, 211, 153, 0.18)',
      description: 'Buy the house as an owner-occupier and invest any surplus above repayments and holding costs.'
    },
    buyApartmentHome: {
      label: 'Buy Apartment To Live In',
      shortLabel: 'Own Apt',
      color: '#22c55e',
      accent: 'rgba(34, 197, 94, 0.18)',
      description: 'Buy the apartment as an owner-occupier and invest any surplus above repayments and holding costs.'
    },
    buyHouseInvestmentProperty: {
      label: 'Buy House As Investment + Rent',
      shortLabel: 'Rentvest House',
      color: '#f472b6',
      accent: 'rgba(244, 114, 182, 0.18)',
      description: 'Keep renting where you live while holding the house as an investment property.'
    },
    buyApartmentInvestmentProperty: {
      label: 'Buy Apartment As Investment + Rent',
      shortLabel: 'Rentvest Apt',
      color: '#fb923c',
      accent: 'rgba(251, 146, 60, 0.18)',
      description: 'Keep renting where you live while holding the apartment as an investment property.'
    }
  }
}

export const defaultSimulationRequest = {
  profile: {
    startingSavings: 140000,
    annualIncome: 115000,
    taxYear: '2025-26',
    incomeGrowthRate: 0.04,
    weeklyNonHousingLivingCosts: 640,
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
    investWhileSavingForDeposit: true,
    surplusAllocationMode: 'portfolio',
    vacancyRate: wealthVacancyRate,
    house: {
      purchasePrice: 980000,
      ownerDepositPct: 0.05,
      depositPct: 0.2,
      mortgageYears: 30,
      interestRate: 0.062,
      longRunInterestRate: 0.055,
      growthMean: 0.058,
      growthVolatility: 0.09,
      rentYield: 0.037,
      propertyManagementPct: 0.065,
      councilRates: 2700,
      waterRates: 1400,
      insurance: 2500,
      maintenance: 2500,
      strata: 0,
      landTax: 0,
      borrowingExpensesTotal: 1800,
      capitalWorksDeductionAnnual: 0,
      depreciationDeductionAnnual: 0,
      otherDeductibleExpensesAnnual: 900,
      ownerPurchaseCosts: {
        stampDuty: 40500,
        legalFees: 2600,
        buyersCosts: 2400,
        firstHomeBuyerDutyReductionPct: 0.65,
        firstHomeBuyerGrant: 10000
      },
      investmentPurchaseCosts: {
        stampDuty: 40500,
        legalFees: 2600,
        buyersCosts: 2400
      }
    },
    apartment: {
      purchasePrice: 710000,
      ownerDepositPct: 0.05,
      depositPct: 0.18,
      mortgageYears: 30,
      interestRate: 0.061,
      longRunInterestRate: 0.054,
      growthMean: 0.041,
      growthVolatility: 0.065,
      rentYield: 0.046,
      propertyManagementPct: 0.075,
      councilRates: 1700,
      waterRates: 950,
      insurance: 950,
      maintenance: 1200,
      strata: 4800,
      landTax: 0,
      borrowingExpensesTotal: 1600,
      capitalWorksDeductionAnnual: 0,
      depreciationDeductionAnnual: 0,
      otherDeductibleExpensesAnnual: 750,
      ownerPurchaseCosts: {
        stampDuty: 24700,
        legalFees: 2400,
        buyersCosts: 2100,
        firstHomeBuyerDutyReductionPct: 0.55,
        firstHomeBuyerGrant: 7000
      },
      investmentPurchaseCosts: {
        stampDuty: 24700,
        legalFees: 2400,
        buyersCosts: 2100
      }
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
