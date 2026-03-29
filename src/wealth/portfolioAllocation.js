const EPSILON = 1e-9

export const portfolioAllocationFields = [
  { key: 'qqqWeight', label: 'US Stock - QQQ', color: '#2563eb' },
  { key: 'asxWeight', label: 'AU Stocks - ASX200', color: '#16a34a' },
  { key: 'bondWeight', label: 'Bonds', color: '#f59e0b' },
  { key: 'cashWeight', label: 'High Interest Cash', color: '#475569' },
  { key: 'bitcoinWeight', label: 'Bitcoin', color: '#f97316' }
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getWeight(config, key) {
  return Math.max(0, Number(config[key]) || 0)
}

function setWeight(config, key, value) {
  config[key] = Math.max(0, value)
}

export function getLockedWeightKeys(config) {
  const source = Array.isArray(config.lockedWeights) ? config.lockedWeights : []
  const allowedKeys = new Set(portfolioAllocationFields.map(field => field.key))
  return source.filter(key => allowedKeys.has(key))
}

export function isPortfolioWeightLocked(config, key) {
  return getLockedWeightKeys(config).includes(key)
}

export function togglePortfolioWeightLock(config, key) {
  const lockedKeys = new Set(getLockedWeightKeys(config))
  if (lockedKeys.has(key)) lockedKeys.delete(key)
  else lockedKeys.add(key)
  config.lockedWeights = Array.from(lockedKeys)
}

export function setPortfolioAllocation(config, targetKey, rawValue) {
  const keys = portfolioAllocationFields.map(field => field.key)
  const lockedKeys = new Set(getLockedWeightKeys(config))
  const lockedOtherKeys = keys.filter(key => key !== targetKey && lockedKeys.has(key))
  const unlockedOtherKeys = keys.filter(key => key !== targetKey && !lockedKeys.has(key))
  const lockedOtherTotal = lockedOtherKeys.reduce((sum, key) => sum + getWeight(config, key), 0)
  const targetCapacity = Math.max(0, 1 - lockedOtherTotal)

  if (targetCapacity <= EPSILON) {
    setWeight(config, targetKey, 0)
    unlockedOtherKeys.forEach((key) => setWeight(config, key, 0))
    return
  }

  if (!unlockedOtherKeys.length) {
    setWeight(config, targetKey, targetCapacity)
    return
  }

  const nextTargetWeight = clamp((Number(rawValue) || 0) / 100, 0, targetCapacity)
  const unlockedOtherValues = unlockedOtherKeys.map(key => getWeight(config, key))
  const unlockedOtherTotal = unlockedOtherValues.reduce((sum, value) => sum + value, 0)
  const remainingWeight = Math.max(0, targetCapacity - nextTargetWeight)

  setWeight(config, targetKey, nextTargetWeight)

  let assignedWeight = nextTargetWeight + lockedOtherTotal
  unlockedOtherKeys.forEach((key, index) => {
    const nextShare = unlockedOtherTotal > EPSILON
      ? remainingWeight * (unlockedOtherValues[index] / unlockedOtherTotal)
      : remainingWeight / unlockedOtherKeys.length

    if (index === unlockedOtherKeys.length - 1) {
      setWeight(config, key, Math.max(0, 1 - assignedWeight))
      return
    }

    setWeight(config, key, nextShare)
    assignedWeight += nextShare
  })
}
