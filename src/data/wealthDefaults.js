import {
  estimateGenericPurchaseCosts,
  estimatePropertyCostFromPrice
} from '../wealth/finance.js'
import { NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT } from '../wealth/areaMarket.js'
import { buildFlatIncomeSeries } from '../wealth/incomeSeries.js'

export const wealthProjectSlug = 'wealth-pathways-au'

export const wealthSimulationMetadata = {
  lastUpdated: '2026-03-29',
  version: 'v2.3',
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
      detail: 'NSW owner-occupier duty relief is modeled as an eligibility-dependent estimate using the current NSW home-price thresholds and the corrected reduced-duty formula.',
      url: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/first-home-buyers'
    },
    {
      label: 'Australian Government Home Guarantee Scheme property caps',
      detail: 'LMI remains a rough estimate only in the workbook. The app no longer treats first-home-buyer status as an automatic no-LMI rule because scheme outcomes depend on product and eligibility details.',
      url: 'https://www.housingaustralia.gov.au/support-buy-home/property-price-caps'
    },
    {
      label: 'ATO rental deductions',
      detail: 'Investment-property taxable income includes deductible interest, borrowing-expense amortisation, council, water, insurance, maintenance, strata, and other manual deductible costs, while principal remains non-deductible.',
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
      label: 'ATO HELP repayment thresholds',
      detail: 'Compulsory HECS/HELP repayments use the federal ATO 2025-26 repayment thresholds and rates rather than NSW-specific policy.',
      url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds'
    },
    {
      label: 'ATO study-loan indexation',
      detail: 'The live calculator simplifies HELP indexation to a fixed 3 percent annual rate, while the source note tracks the ATO indexation framework and published rates.',
      url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-indexation-rates'
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
    },
    {
      label: 'Revenue NSW land tax rates and thresholds',
      detail: 'Land tax stays as a purchase-price-based estimate in this workbook unless a real taxable land value is supplied, so it should be read as a proxy rather than a statutory assessment.',
      url: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/land-tax'
    }
  ]
}

export const wealthVacancyRate = 0.03
export const wealthVacancyRateVolatility = 0.01

export const wealthAssumptionSections = [
  {
    title: 'What this models',
    items: [
      'A household comparison across rent + invest, buy to live, and buy as an investment property while renting.',
      'NSW-focused first-home-buyer and transfer-duty assumptions for owner-occupier purchases.',
      'Federal ATO-style compulsory HECS/HELP repayments, using per-earner salary bands and a simplified fixed 3 percent annual indexation rate.',
      'An optional currently-living-at-home phase that lowers housing costs while saving, investing, or rentvesting before rent-based paths move out.',
      'A yearly after-tax cash ledger starting from household wages, non-housing living costs, housing cashflows, and portfolio market returns.'
    ]
  },
  {
    title: 'What this does not model',
    items: [
      'Dependants, Medicare levy surcharge edge cases, or trust/company ownership structures.',
      'Suburb-level property cycles, automated state land-tax tables, offset account optimization, redraw facilities, or superannuation strategy.',
      'Personal financial advice, product recommendations, or edge-case legal treatment.'
    ]
  },
  {
    title: 'Interpretation notes',
    items: [
      'Portfolio tax is simplified to recurring distribution tax, franking-credit gross-up, and refundable franking offsets rather than realised capital-gains events.',
      'HELP repayments follow the current federal ATO 2025-26 repayment table in this build, while the tax brackets elsewhere in the model remain locked to 2026-27.',
      'Investment-property tax compares salary-only tax with salary plus taxable portfolio income and net rental profit or loss, so negative gearing can lower modeled tax.',
      'Property pathways can route positive annual surplus either to the portfolio or to extra mortgage repayments.',
      'Headline results use an estimated sell-everything value at the horizon: liquid assets plus sale proceeds less debt and estimated CGT where applicable.',
      'Owner-occupier property is treated as main-residence exempt, while taxable portfolio and investment-property gains use a simplified discounted CGT estimate.',
      'Owner-path transfer duty uses the current NSW stepped schedule and an eligibility-dependent first-home-buyer concession estimate, while duty still uses purchase price as the proxy input in this version.',
      'Borrowing power uses an APRA-style assessment rate, a living-cost floor, and an 80 percent rent credit for investment-property serviceability rather than a lender-specific approval engine.',
      'Lenders mortgage insurance is shown as an estimated premium only, not a lender quote or NSW statutory amount.',
      'Estimated land tax is still inferred from purchase price using a land-value-share proxy, so it is a directional estimate rather than an official assessment.',
      'Property pathways wait until upfront cash is available and the purchase year still ends with non-negative liquid assets; affordability warnings flag later years where liquid assets still fall below zero.',
      'Investment-property vacancy uses a 3 percent baseline and the simulation varies it year to year.',
      'Most defaults are editable so users can pressure-test their own conservative and aggressive assumptions.'
    ]
  }
]

export const wealthStockStrategyKeys = [
  'stockPortfolio',
  'stockQqq',
  'stockAsx200',
  'stockBonds',
  'stockCash',
  'stockBitcoin'
]

export const wealthHousingStrategyKeys = [
  'buyApartmentHome',
  'buyHouseHome',
  'buyApartmentInvestmentProperty',
  'buyHouseInvestmentProperty'
]

export const wealthStrategyOrder = [
  ...wealthStockStrategyKeys,
  ...wealthHousingStrategyKeys
]

export const wealthDefaultStockBaselineKey = 'stockPortfolio'

export function createDefaultScenarioSelection() {
  return {
    includeStocks: true,
    includeHousing: true,
    selectedScenarioKeys: [...wealthStrategyOrder],
    stockBaselineKey: wealthDefaultStockBaselineKey
  }
}

export function resolveScenarioSelection(selection = {}) {
  const includeStocks = selection.includeStocks !== false
  const includeHousing = selection.includeHousing !== false
  const allowedKeys = wealthStrategyOrder.filter((key) =>
    (includeStocks && wealthStockStrategyKeys.includes(key)) ||
    (includeHousing && wealthHousingStrategyKeys.includes(key))
  )
  const selectedScenarioKeys = Array.isArray(selection.selectedScenarioKeys)
    ? allowedKeys.filter(key => selection.selectedScenarioKeys.includes(key))
    : allowedKeys
  const fallbackBaselineKey = allowedKeys.find(key => wealthStockStrategyKeys.includes(key)) || null
  const stockBaselineKey = wealthStockStrategyKeys.includes(selection.stockBaselineKey)
    ? selection.stockBaselineKey
    : fallbackBaselineKey

  return {
    includeStocks,
    includeHousing,
    selectedScenarioKeys: selectedScenarioKeys.length ? selectedScenarioKeys : allowedKeys,
    stockBaselineKey
  }
}

export function getWealthStrategyMeta() {
  return {
    stockPortfolio: {
      group: 'stock',
      baselineEligible: true,
      label: 'Portfolio Mix',
      shortLabel: 'Portfolio',
      color: '#2563eb',
      accent: 'rgba(37, 99, 235, 0.18)',
      description: 'Stay liquid and invest into your chosen multi-asset portfolio mix.'
    },
    stockQqq: {
      group: 'stock',
      baselineEligible: true,
      label: 'QQQ',
      shortLabel: 'QQQ',
      color: '#7dd3fc',
      accent: 'rgba(125, 211, 252, 0.18)',
      description: 'Stay liquid and direct surplus cash into a QQQ-led stock portfolio.'
    },
    stockAsx200: {
      group: 'stock',
      baselineEligible: true,
      label: 'ASX200',
      shortLabel: 'ASX200',
      color: '#22c55e',
      accent: 'rgba(34, 197, 94, 0.18)',
      description: 'Stay liquid and direct surplus cash into an ASX200-style equity portfolio.'
    },
    stockBonds: {
      group: 'stock',
      baselineEligible: true,
      label: 'Bonds',
      shortLabel: 'Bonds',
      color: '#f59e0b',
      accent: 'rgba(245, 158, 11, 0.18)',
      description: 'Stay liquid and direct surplus cash into a bond-heavy defensive portfolio.'
    },
    stockCash: {
      group: 'stock',
      baselineEligible: true,
      label: 'High Interest Cash',
      shortLabel: 'Cash',
      color: '#64748b',
      accent: 'rgba(100, 116, 139, 0.18)',
      description: 'Stay liquid and hold surplus in high-interest cash.'
    },
    stockBitcoin: {
      group: 'stock',
      baselineEligible: true,
      label: 'Bitcoin',
      shortLabel: 'Bitcoin',
      color: '#f97316',
      accent: 'rgba(249, 115, 22, 0.18)',
      description: 'Stay liquid and direct surplus cash into Bitcoin using the shorter bootstrap history.'
    },
    buyHouseHome: {
      group: 'housing',
      baselineEligible: false,
      label: 'House To Live In',
      shortLabel: 'Own House',
      color: '#10b981',
      accent: 'rgba(16, 185, 129, 0.18)',
      description: 'Buy the house as an owner-occupier and invest any surplus above repayments and holding costs.'
    },
    buyApartmentHome: {
      group: 'housing',
      baselineEligible: false,
      label: 'Apartment To Live In',
      shortLabel: 'Own Apt',
      color: '#14b8a6',
      accent: 'rgba(20, 184, 166, 0.18)',
      description: 'Buy the apartment as an owner-occupier and invest any surplus above repayments and holding costs.'
    },
    buyHouseInvestmentProperty: {
      group: 'housing',
      baselineEligible: false,
      label: 'House As Investment',
      shortLabel: 'Rentvest House',
      color: '#ec4899',
      accent: 'rgba(236, 72, 153, 0.18)',
      description: 'Keep renting where you live while holding the house as an investment property.'
    },
    buyApartmentInvestmentProperty: {
      group: 'housing',
      baselineEligible: false,
      label: 'Apartment As Investment',
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
    helpDebtBalance: 15000,
    incomeGrowthRate: 0.036,
    incomeCurve: 'sigmoid',
    weeklyNonHousingLivingCosts: 400,
    horizonYears: 30,
    useCustomIncomeSeries: false,
    annualIncomeSeries: [],
    earners: [
      {
        id: 'person-1',
        label: 'Person 1',
        startingSavings: 40000,
        annualIncome: 100000,
        helpDebtBalance: 15000,
        incomeGrowthRate: 0.036,
        incomeCurve: 'sigmoid',
        useCustomIncomeSeries: false,
        annualIncomeSeries: []
      }
    ]
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
    bitcoinWeight: 0,
    lockedWeights: [],
    asxDividendYield: 0.032,
    asxFrankingPct: 0.75,
    qqqDividendYield: 0.0045,
    bondIncomeYield: 0.042,
    cashReturnMean: 0.035,
    bootstrapMethod: 'historical-block',
    bootstrapBlockSizeMonths: 3
  },
  propertyConfig: {
    firstHomeBuyerEligible: true,
    investWhileSavingForDeposit: true,
    surplusAllocationMode: 'portfolio',
    vacancyRate: wealthVacancyRate,
    house: {},
    apartment: {}
  },
  scenarioSelection: createDefaultScenarioSelection(),
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
  ownerScaleDepositToBuyAsap: true,
  depositPct: 0.2,
  investmentScaleDepositToBuyAsap: true,
  mortgageYears: 30,
  ownerInterestRate: 0.061,
  ownerLongRunInterestRate: 0.056,
  investmentInterestRate: 0.066,
  investmentLongRunInterestRate: 0.061,
  growthMean: 0.058,
  growthVolatility: 0.09,
  firstHomeBuyerLowDepositLimit: NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT,
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
  ownerScaleDepositToBuyAsap: true,
  depositPct: 0.18,
  investmentScaleDepositToBuyAsap: true,
  mortgageYears: 30,
  ownerInterestRate: 0.061,
  ownerLongRunInterestRate: 0.056,
  investmentInterestRate: 0.066,
  investmentLongRunInterestRate: 0.061,
  growthMean: 0.041,
  growthVolatility: 0.065,
  firstHomeBuyerLowDepositLimit: NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT,
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

defaultSimulationRequest.profile.earners.forEach((earner) => {
  earner.annualIncomeSeries = buildFlatIncomeSeries(
    earner.annualIncome,
    earner.incomeGrowthRate,
    defaultSimulationRequest.profile.horizonYears,
    earner.incomeCurve
  )
})

defaultSimulationRequest.profile.annualIncomeSeries = buildFlatIncomeSeries(
  defaultSimulationRequest.profile.annualIncome,
  defaultSimulationRequest.profile.incomeGrowthRate,
  defaultSimulationRequest.profile.horizonYears,
  defaultSimulationRequest.profile.incomeCurve
)

export function cloneSimulationRequest() {
  return JSON.parse(JSON.stringify(defaultSimulationRequest))
}
