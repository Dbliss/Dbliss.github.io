<template>
  <section class="suburb-search">
    <div class="suburb-search__header">
      <div>
        <h3>Search a region, subregion, or suburb</h3>
      </div>
    </div>

    <div class="suburb-search__controls">
      <label class="suburb-search__input">
        <input
          v-model.trim="query"
          type="search"
          placeholder="Region, postcode, or suburb"
        />
      </label>
    </div>

    <div v-if="filteredAreas.length" class="suburb-search__dropdown" role="listbox" aria-label="Matching areas">
      <button
        v-for="area in filteredAreas"
        :key="area.key"
        type="button"
        class="suburb-search__option"
        :class="{ 'is-active': currentSelection?.key === area.key }"
        @click="selectSuburb(area)"
      >
        <div>
          <strong>{{ area.label }}</strong>
          <span>{{ area.typeLabel }}<template v-if="area.regionLabel && area.type !== 'region'"> · {{ area.regionLabel }}</template></span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  currentSelection: { type: Object, default: null },
  suburbOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['select-suburb'])
const query = ref('')

const filteredAreas = computed(() => {
  const search = normaliseSearch(query.value)
  if (!search) return []
  return props.suburbOptions
    .map((option) => ({
      ...option,
      score: scoreAreaMatch(option, search)
    }))
    .filter((option) => option.score > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'en-AU'))
    .slice(0, 10)
})

function selectSuburb(suburb) {
  emit('select-suburb', suburb)
  query.value = ''
}

function scoreAreaMatch(option, search) {
  const haystacks = [
    String(option.label || ''),
    String(option.suburb || ''),
    String(option.regionLabel || ''),
    String(option.postcode || ''),
    String(option.typeLabel || ''),
    String(option.searchText || '')
  ].map(normaliseSearch)

  const regionLabel = normaliseSearch(option.regionLabel)
  const optionLabel = normaliseSearch(option.label)

  let regionBoost = 0
  if (option.type === 'region') {
    if (optionLabel === search || regionLabel === search) regionBoost = 80
    else if (optionLabel.startsWith(search) || regionLabel.startsWith(search)) regionBoost = 45
    else if (optionLabel.includes(search) || regionLabel.includes(search)) regionBoost = 25
  }

  if (haystacks.some((value) => value === search)) return 200 + regionBoost
  if (haystacks.some((value) => value.startsWith(search))) return 150 + regionBoost
  if (haystacks.some((value) => value.includes(search))) return 120 + regionBoost

  const searchTokens = search.split(/\s+/).filter(Boolean)
  let tokenScore = 0

  searchTokens.forEach((token) => {
    if (haystacks.some((value) => value.startsWith(token))) tokenScore += 30
    else if (haystacks.some((value) => value.includes(token))) tokenScore += 18
  })

  const compactSearch = search.replace(/\s+/g, '')
  const distanceScore = haystacks.reduce((best, value) => {
    const compactValue = value.replace(/\s+/g, '')
    if (!compactValue) return best
    const candidate = compactValue.slice(0, Math.max(compactSearch.length, compactValue.length))
    const distance = levenshteinDistance(compactSearch, candidate)
    return Math.max(best, Math.max(0, 40 - (distance * 8)))
  }, 0)

  return tokenScore + distanceScore + regionBoost
}

function normaliseSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(left, right) {
  if (!left) return right.length
  if (!right) return left.length

  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0))
  for (let row = 0; row <= left.length; row += 1) matrix[row][0] = row
  for (let column = 0; column <= right.length; column += 1) matrix[0][column] = column

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      )
    }
  }

  return matrix[left.length][right.length]
}
</script>

<style scoped>
.suburb-search {
  width: 100%;
  max-width: none;
  justify-self: stretch;
  padding: 0;
  margin-top: 1.1rem;
  margin-bottom: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.suburb-search__header {
  display: flex;
  gap: 0.9rem;
  justify-content: space-between;
  align-items: start;
}

.suburb-search__kicker {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: #5f7a9f;
}

.suburb-search__header h3 {
  margin: 0;
}

.suburb-search__copy {
  margin: 0.35rem 0 0;
  color: #5b7091;
  line-height: 1.4;
  max-width: none;
}

.suburb-search__status {
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 999px;
  background: rgba(244, 249, 255, 0.9);
  color: #274160;
  font: inherit;
}

.suburb-search__status {
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.suburb-search__controls {
  display: flex;
  gap: 0.75rem;
  align-items: end;
  margin-top: 0.45rem;
}

.suburb-search__input {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.35rem;
}

.suburb-search__input span {
  font-size: 0.9rem;
  color: #5c7598;
}

.suburb-search__input input {
  width: 100%;
  min-height: 3.6rem;
  padding: 0.95rem 1.1rem;
  border: 1px solid rgba(154, 174, 204, 0.3);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
  font-size: 1rem;
}

.suburb-search__dropdown {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.9rem;
  max-height: 20rem;
  overflow-y: auto;
  padding-right: 0.2rem;
}

.suburb-search__option {
  display: flex;
  gap: 0.8rem;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.05rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.88);
  color: #173050;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.suburb-search__option > div {
  display: grid;
  gap: 0.15rem;
}

.suburb-search__option:hover {
  border-color: rgba(78, 117, 171, 0.34);
  background: rgba(248, 251, 255, 0.98);
}

.suburb-search__option.is-active {
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(220, 252, 231, 0.68);
}

.suburb-search__option span,
.suburb-search__empty {
  color: #5b7091;
}

.suburb-search__empty {
  margin: 0.85rem 0 0;
}

@media (max-width: 900px) {
  .suburb-search__header {
    flex-direction: column;
  }

  .suburb-search__controls,
  .suburb-search__option {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
