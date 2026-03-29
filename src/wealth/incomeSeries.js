import { clamp } from './finance.js'

function toIncome(value) {
  return Math.max(0, Number(value) || 0)
}

function clampIncomeCurve(value) {
  if (value === 'logarithmic') return 'logarithmic'
  if (value === 'sigmoid') return 'sigmoid'
  return 'exponential'
}

export function clampIncomeGrowthRate(value) {
  return clamp(Number(value) || 0, 0, 0.1)
}

export function buildFlatIncomeSeries(annualIncome, incomeGrowthRate, horizonYears, incomeCurve = 'exponential') {
  const safeAnnualIncome = toIncome(annualIncome)
  const safeGrowthRate = clampIncomeGrowthRate(incomeGrowthRate)
  const safeHorizonYears = Math.max(1, Math.round(Number(horizonYears) || 1))
  const safeIncomeCurve = clampIncomeCurve(incomeCurve)

  if (safeIncomeCurve === 'logarithmic') {
    const saturationWeight = Math.max(4.5, 8 - safeGrowthRate * 20)
    return Array.from({ length: safeHorizonYears }, (_, yearIndex) => {
      if (yearIndex === 0) return safeAnnualIncome
      const progress = yearIndex / Math.max(1, safeHorizonYears - 1)
      const scaledProgress = Math.log1p(progress * saturationWeight) / Math.log1p(saturationWeight)
      const effectiveYears = scaledProgress * Math.max(1, safeHorizonYears - 1)
      return Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, effectiveYears))
    })
  }

  if (safeIncomeCurve === 'sigmoid') {
    const midpoint = Math.max(0.35, Math.min(0.55, 0.48 - safeGrowthRate * 0.6))
    const steepness = Math.max(4.5, Math.min(8, 5.8 + safeGrowthRate * 18))
    const startValue = 1 / (1 + Math.exp(steepness * midpoint))
    const endValue = 1 / (1 + Math.exp(-steepness * (1 - midpoint)))

    return Array.from({ length: safeHorizonYears }, (_, yearIndex) => {
      if (yearIndex === 0) return safeAnnualIncome
      const progress = yearIndex / Math.max(1, safeHorizonYears - 1)
      const logisticValue = 1 / (1 + Math.exp(-steepness * (progress - midpoint)))
      const scaledProgress = (logisticValue - startValue) / Math.max(0.0001, endValue - startValue)
      const effectiveYears = scaledProgress * Math.max(1, safeHorizonYears - 1)
      return Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, effectiveYears))
    })
  }

  return Array.from({ length: safeHorizonYears }, (_, yearIndex) =>
    Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, yearIndex))
  )
}

export function resizeCustomIncomeSeries(series, annualIncome, horizonYears, incomeGrowthRate, incomeCurve = 'exponential') {
  const flatSeries = buildFlatIncomeSeries(annualIncome, incomeGrowthRate, horizonYears, incomeCurve)
  const safeSeries = Array.isArray(series) ? series : []

  return flatSeries.map((fallbackValue, index) => {
    if (index === 0) return fallbackValue
    const customValue = toIncome(safeSeries[index])
    return customValue > 0 ? Math.round(customValue) : fallbackValue
  })
}

export function scaleCustomIncomeSeries(series, previousAnnualIncome, nextAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve = 'exponential') {
  const resizedSeries = resizeCustomIncomeSeries(series, previousAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve)
  const safePreviousAnnualIncome = toIncome(previousAnnualIncome)
  const safeNextAnnualIncome = toIncome(nextAnnualIncome)

  if (safePreviousAnnualIncome <= 0) {
    return resizeCustomIncomeSeries(series, nextAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve)
  }

  const scale = safeNextAnnualIncome / safePreviousAnnualIncome
  return resizedSeries.map((value, index) =>
    index === 0 ? safeNextAnnualIncome : Math.round(Math.max(0, value * scale))
  )
}

export function normaliseIncomeProfile(profile = {}) {
  const safeAnnualIncome = toIncome(profile.annualIncome)
  const safeHorizonYears = Math.max(1, Math.round(Number(profile.horizonYears) || 1))
  const safeGrowthRate = clampIncomeGrowthRate(profile.incomeGrowthRate)
  const incomeCurve = clampIncomeCurve(profile.incomeCurve)
  const useCustomIncomeSeries = Boolean(profile.useCustomIncomeSeries)
  const annualIncomeSeries = useCustomIncomeSeries
    ? resizeCustomIncomeSeries(profile.annualIncomeSeries, safeAnnualIncome, safeHorizonYears, safeGrowthRate, incomeCurve)
    : buildFlatIncomeSeries(safeAnnualIncome, safeGrowthRate, safeHorizonYears, incomeCurve)

  return {
    annualIncome: safeAnnualIncome,
    horizonYears: safeHorizonYears,
    incomeGrowthRate: safeGrowthRate,
    incomeCurve,
    useCustomIncomeSeries,
    annualIncomeSeries
  }
}

export function getIncomeForYear(profile, yearIndex) {
  const normalisedProfile = normaliseIncomeProfile(profile)
  const safeYearIndex = clamp(Math.round(Number(yearIndex) || 0), 0, normalisedProfile.annualIncomeSeries.length - 1)
  return normalisedProfile.annualIncomeSeries[safeYearIndex] || 0
}

export function getIncomeScaleForYear(profile, yearIndex) {
  const normalisedProfile = normaliseIncomeProfile(profile)
  const baseIncome = normalisedProfile.annualIncomeSeries[0] || 0
  if (baseIncome <= 0) return 1
  return (normalisedProfile.annualIncomeSeries[Math.max(0, Math.min(yearIndex, normalisedProfile.annualIncomeSeries.length - 1))] || 0) / baseIncome
}
