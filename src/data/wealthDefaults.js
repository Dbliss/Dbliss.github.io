import {
  estimateGenericPurchaseCosts,
  estimatePropertyCostFromPrice
} from '../wealth/finance.js'

export const wealthProjectSlug = 'wealth-pathways-au'

export const wealthSimulationMetadata = {
  lastUpdated: '2026-03-21',
  version: 'v2.2',
  sources: [
    {
      label: 'ATO resident tax rates',
      detail: 'Resident tax-year logic is locked to the 2026-27 settings, including the 15 percent second bracket.',
      url: 'https://www.ato.gov.au/law/view/document?DocNum=0000081420&FullDocument=true&PiT=99991231235958'
    },
    {
      label: 'ATO Medicare levy',
      detail: 'The model applies a national-core 2 percent Medicare levy and does not automate surcharge or low-income threshold edge cases.',
      url: 'https://www.ato.gov.au/tax-and-super-professionals/for-tax-professionals/prepare-and-lodge/tax-time-2025/before-you-lodge/medicare-levy'
    },
    {
      label: 'Revenue NSW first-home-buyer duty rules',
      detail: 'NSW owner-occupier duty relief is modeled for eligible first-home buyers under the current NSW thresholds.',
      url: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/first-home-buyers'
    },
    {
      label: 'ATO rental deductions',
      detail: 'Investment-property taxable income includes deductible interest, borrowing-expense amortisation, council, water, insurance, maintenance, strata, land tax, and other manual deductible costs, while principal remains non-deductible.',
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
    },
    {
      label: 'RBA housing lending rates',
      detail: 'Owner-occupier and investor mortgage defaults are refreshed from recent RBA housing lending-rate baselines, then paired with a lower long-run assumption.',
      url: 'https://www.rba.gov.au/statistics/interest-rates/'
    },
    {
      label: 'ABS wage growth',
      detail: 'Default income growth is aligned to the latest ABS Wage Price Index annual change.',
      url: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/wage-price-index-australia/latest-release'
    },
    {
      label: 'ABS rent inflation',
      detail: 'Default rent inflation is aligned to the latest ABS CPI rents series annual change.',
      url: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/dec-2025'
    },
    {
      label: 'APRA serviceability buffer',
      detail: 'Borrowing-power checks apply a 3 percentage point assessment-rate buffer with an 8 percent floor and an 80 percent rent credit on investment-property income.',
      url: 'https://www.apra.gov.au/news-and-publications/apra-keeps-macroprudential-policy-settings-steady'
    },
    {
      label: 'Sydney Water residential charges',
      detail: 'Water defaults are anchored to Sydney Water style fixed service charges plus usage, then scaled from that baseline as prices change.',
      url: 'https://www.sydneywater.com.au/accounts-billing/paying-your-bill/our-prices/business-pricing.html'
    },
    {
      label: 'City of Sydney rates calculator',
      detail: 'Council-rate defaults use a NSW council-style fixed charge plus a value-linked component rather than a straight percentage of property value.',
      url: 'https://www.cityofsydney.nsw.gov.au/rates/rates-calculator'
    },
    {
      label: 'Revenue NSW land tax threshold',
      detail: 'Land-tax defaults stay at zero until an estimated land-value share clears the NSW general threshold, then use the standard rate schedule.',
      url: 'https://www.revenue.nsw.gov.au/help-centre/resources-library/budget/2024-state-budget'
    },
    {
      label: 'CHOICE home-insurance averages',
      detail: 'Insurance defaults are calibrated against recent NSW home-insurance premium examples rather than held flat across all property values.',
      url: 'https://www.choice.com.au/money/insurance/home-and-contents/articles/best-and-cheapest-home-insurance'
    },
    {
      label: 'Canstar conveyancing range',
      detail: 'Legal-fee defaults are set inside the recent buyer-side conveyancing range and then scaled with property value from that baseline.',
      url: 'https://www.canstar.com.au/home-loans/how-to-find-a-conveyancer/'
    },
    {
      label: 'ANZ home-loan fee examples',
      detail: 'Borrowing-expense defaults are informed by current lender fee examples plus state registration charges rather than left as a flat constant.',
      url: 'https://www.anz.com.au/personal/home-loans/construction-loan/land-loan/'
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
      'NSW-focused first-home-buyer and transfer-duty assumptions for owner-occupier purchases.',
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
      'Borrowing power uses an APRA-style assessment rate, a living-cost floor, and an 80 percent rent credit for investment-property serviceability rather than a lender-specific approval engine.',
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
    startingSavings: 40000,
    annualIncome: 100000,
    taxYear: '2026-27',
    incomeGrowthRate: 0.034,
    weeklyNonHousingLivingCosts: 400,
    horizonYears: 30
  },
  housingCosts: {
    liveAtHome: false,
    liveAtHomeYears: 0,
    weeklyRent: 500,
    rentGrowthRate: 0.039,
    weeklyBoardAtHome: 180,
    boardGrowthRate: 0.034
  },
  portfolioConfig: {
    asxWeight: 0.20,
    qqqWeight: 0.65,
    bondWeight: 0.10,
    cashWeight: 0.05,
    asxReturnMean: 0.087,
    asxVolatility: 0.135,
    asxDividendYield: 0.032,
    asxFrankingPct: 0.75,
    qqqReturnMean: 0.15,
    qqqVolatility: 0.18,
    qqqDividendYield: 0.0045,
    bondReturnMean: 0.032,
    bondVolatility: 0.05,
    bondIncomeYield: 0.042,
    cashReturnMean: 0.035,
    cashVolatility: 0.014
  },
  propertyConfig: {
    firstHomeBuyerEligible: true,
    investWhileSavingForDeposit: true,
    surplusAllocationMode: 'portfolio',
    vacancyRate: wealthVacancyRate,
    house: {},
    apartment: {}
  },
  simulationSettings: {
    iterations: 500,
    seed: 5259408
  }
}

const housePurchasePrice = 980000
const apartmentPurchasePrice = 710000
const housePurchaseCosts = estimateGenericPurchaseCosts(housePurchasePrice, 'house')
const apartmentPurchaseCosts = estimateGenericPurchaseCosts(apartmentPurchasePrice, 'apartment')

defaultSimulationRequest.propertyConfig.house = {
  purchasePrice: housePurchasePrice,
  ownerDepositPct: 0.05,
  depositPct: 0.2,
  mortgageYears: 30,
  ownerInterestRate: 0.055,
  ownerLongRunInterestRate: 0.0525,
  investmentInterestRate: 0.0574,
  investmentLongRunInterestRate: 0.055,
  growthMean: 0.058,
  growthVolatility: 0.09,
  rentYield: 0.037,
  propertyManagementPct: 0.065,
  councilRates: estimatePropertyCostFromPrice('house', 'councilRates', housePurchasePrice),
  waterRates: estimatePropertyCostFromPrice('house', 'waterRates', housePurchasePrice),
  insurance: estimatePropertyCostFromPrice('house', 'insurance', housePurchasePrice),
  maintenance: estimatePropertyCostFromPrice('house', 'maintenance', housePurchasePrice),
  strata: 0,
  landTax: estimatePropertyCostFromPrice('house', 'landTax', housePurchasePrice),
  borrowingExpensesTotal: estimatePropertyCostFromPrice('house', 'borrowingExpensesTotal', housePurchasePrice),
  otherDeductibleExpensesAnnual: estimatePropertyCostFromPrice('house', 'otherDeductibleExpensesAnnual', housePurchasePrice),
  ownerPurchaseCosts: {
    ...housePurchaseCosts
  },
  investmentPurchaseCosts: {
    ...housePurchaseCosts
  }
}

defaultSimulationRequest.propertyConfig.apartment = {
  purchasePrice: apartmentPurchasePrice,
  ownerDepositPct: 0.05,
  depositPct: 0.18,
  mortgageYears: 30,
  ownerInterestRate: 0.055,
  ownerLongRunInterestRate: 0.0525,
  investmentInterestRate: 0.0574,
  investmentLongRunInterestRate: 0.055,
  growthMean: 0.041,
  growthVolatility: 0.065,
  rentYield: 0.046,
  propertyManagementPct: 0.075,
  councilRates: estimatePropertyCostFromPrice('apartment', 'councilRates', apartmentPurchasePrice),
  waterRates: estimatePropertyCostFromPrice('apartment', 'waterRates', apartmentPurchasePrice),
  insurance: estimatePropertyCostFromPrice('apartment', 'insurance', apartmentPurchasePrice),
  maintenance: estimatePropertyCostFromPrice('apartment', 'maintenance', apartmentPurchasePrice),
  strata: estimatePropertyCostFromPrice('apartment', 'strata', apartmentPurchasePrice),
  landTax: estimatePropertyCostFromPrice('apartment', 'landTax', apartmentPurchasePrice),
  borrowingExpensesTotal: estimatePropertyCostFromPrice('apartment', 'borrowingExpensesTotal', apartmentPurchasePrice),
  otherDeductibleExpensesAnnual: estimatePropertyCostFromPrice('apartment', 'otherDeductibleExpensesAnnual', apartmentPurchasePrice),
  ownerPurchaseCosts: {
    ...apartmentPurchaseCosts
  },
  investmentPurchaseCosts: {
    ...apartmentPurchaseCosts
  }
}

export function cloneSimulationRequest() {
  return JSON.parse(JSON.stringify(defaultSimulationRequest))
}
