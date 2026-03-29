<template>
  <section class="suburb-search card">
    <div class="suburb-search__header">
      <div>
        <p class="suburb-search__kicker">Suburb Defaults</p>
        <h3>Search a suburb</h3>
        <p class="suburb-search__copy">
          Optional. Search to prefill market defaults, or leave this blank and set the numbers manually.
        </p>
      </div>
      <span class="suburb-search__status">{{ currentSelection?.label ? 'Applied' : 'Optional' }}</span>
    </div>

    <div class="suburb-search__controls">
      <label class="suburb-search__input">
        <span>Search suburb</span>
        <input
          v-model.trim="query"
          type="search"
          placeholder="Suburb, state, or postcode"
        />
      </label>
      <button
        v-if="currentSelection?.label"
        type="button"
        class="suburb-search__clear"
        @click="clearSelection"
      >
        Clear
      </button>
    </div>

    <div v-if="filteredSuburbs.length" class="suburb-search__dropdown" role="listbox" aria-label="Matching suburbs">
      <button
        v-for="suburb in filteredSuburbs"
        :key="suburb.slug"
        type="button"
        class="suburb-search__option"
        :class="{ 'is-active': currentSelection?.slug === suburb.slug }"
        @click="selectSuburb(suburb)"
      >
        <div>
          <strong>{{ suburb.suburb }}</strong>
          <span>{{ suburb.state }}<template v-if="suburb.postcode"> {{ suburb.postcode }}</template></span>
        </div>
        <span class="suburb-search__option-action">
          {{ currentSelection?.slug === suburb.slug ? 'Applied' : 'Apply' }}
        </span>
      </button>
    </div>
    <p v-else-if="query" class="suburb-search__empty">No suburbs match that search.</p>
    <p v-else class="suburb-search__empty">No suburb selected.</p>
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

const filteredSuburbs = computed(() => {
  const search = query.value.toLowerCase()
  if (!search) return []
  return props.suburbOptions
    .filter((option) =>
      [option.label, option.suburb, option.state, option.postcode]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(search))
    )
    .slice(0, 20)
})

function selectSuburb(suburb) {
  query.value = suburb?.label || suburb?.suburb || ''
  emit('select-suburb', suburb)
}

function clearSelection() {
  emit('select-suburb', null)
}
</script>

<style scoped>
.suburb-search {
  width: 100%;
  max-width: none;
  justify-self: stretch;
  padding: 1.15rem 1.25rem;
  margin-bottom: 1rem;
  background: transparent;
  border: 1px solid rgba(154, 174, 204, 0.16);
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

.suburb-search__status,
.suburb-search__clear,
.suburb-search__option-action {
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
  margin-top: 1rem;
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

.suburb-search__clear,
.suburb-search__option-action {
  padding: 0.9rem 1.1rem;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.suburb-search__clear:hover:not(:disabled),
.suburb-search__option:hover .suburb-search__option-action {
  border-color: rgba(78, 117, 171, 0.34);
  background: rgba(233, 242, 255, 0.96);
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

.suburb-search__option-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.9rem;
  white-space: nowrap;
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
