<template>
  <section class="wealth-scout card">
    <section v-if="viewMode === 'inputs'" class="wealth-scout__panel wealth-scout__panel--form">
      <div class="wealth-scout__hero">
        <h2>Find the next area worth targeting</h2>
      </div>

      <div class="wealth-scout__inputs">
        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>When do you want to buy?</h3>
          </div>
          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'target' }" @click="setTargetBuyMode()">
                <strong>I'll choose when to buy</strong>
                <span>Set a target purchase window yourself.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'whenever' }" @click="setWheneverMode()">
                <strong>Buy whenever I can afford to</strong>
                <span>Automatically find the earliest buying point.</span>
              </button>
            </div>
            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.buyFlexibility === 'target'" class="wealth-scout__slider-card">
                <div class="wealth-scout__slider-head">
                  <span>Target timing</span>
                  <strong>{{ sliderTimingLabel }}</strong>
                </div>
                <input v-model.number="targetYearsUi" class="wealth-scout__slider" type="range" min="0" max="20" step="1" @input="handleTargetYearsInput" />
                <div class="wealth-scout__slider-scale">
                  <span>Now</span>
                  <span>10 years</span>
                  <span>20 years</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>Are you comfortable investing while you save for a house?</h3>
          </div>
          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'defaultPortfolio' }" @click="selectSavingsMode('defaultPortfolio')">
                <strong>Yes, invest while saving</strong>
                <span>Use the portfolio mix below to grow the deposit.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'cash' }" @click="selectSavingsMode('cash')">
                <strong>No, keep it in cash</strong>
                <span>Assume savings stay in a high-interest cash path.</span>
              </button>
            </div>
            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.savingsMode === 'defaultPortfolio'" class="wealth-scout__portfolio">
                <label
                  v-for="allocation in portfolioAllocationFields"
                  :key="allocation.key"
                  class="wealth-scout__allocation"
                  :class="{ 'is-locked': isAllocationLocked(allocation.key) }"
                >
                  <span class="wealth-scout__allocation-top">
                    <span class="wealth-scout__allocation-title">
                      <i class="wealth-scout__swatch" :style="{ background: allocation.color }"></i>
                      {{ allocation.label }}
                    </span>
                    <span class="wealth-scout__allocation-actions">
                      <strong>{{ getAllocationPct(allocation.key) }}%</strong>
                      <button
                        type="button"
                        class="wealth-scout__lock-btn"
                        :class="{ 'is-active': isAllocationLocked(allocation.key) }"
                        :aria-pressed="isAllocationLocked(allocation.key)"
                        @click.prevent="toggleAllocationLock(allocation.key)"
                      >
                        {{ isAllocationLocked(allocation.key) ? 'Locked' : 'Lock' }}
                      </button>
                    </span>
                  </span>
                  <div class="wealth-scout__allocation-controls">
                    <input :value="getAllocationPct(allocation.key)" type="range" min="0" max="100" step="1" :disabled="isAllocationLocked(allocation.key) && !hasUnlockedAllocationPeers(allocation.key)" @input="handleAllocationInput(allocation.key, $event)" />
                    <input :value="getAllocationPct(allocation.key)" type="number" min="0" max="100" step="1" :disabled="isAllocationLocked(allocation.key) && !hasUnlockedAllocationPeers(allocation.key)" @input="handleAllocationInput(allocation.key, $event)" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>Your purchasing power and deposit runway</h3>
          </div>
          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'optimal' }" @click="draftConfig.depositMode = 'optimal'">
              <strong>Use the strongest deposit automatically</strong>
              <span>The scout scales deposit size up as savings grow.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'fixed' }" @click="draftConfig.depositMode = 'fixed'">
              <strong>Set my own deposit %</strong>
              <span>Keep the deposit ratio fixed across the scouting window.</span>
            </button>
          </div>
          <div v-if="draftConfig.depositMode === 'fixed'" class="wealth-scout__slider-card wealth-scout__slider-card--compact">
            <div class="wealth-scout__slider-head">
              <span>Fixed deposit size</span>
              <strong>{{ Math.round(draftConfig.fixedDepositPct * 100) }}%</strong>
            </div>
            <input v-model.number="fixedDepositPctUi" class="wealth-scout__slider" type="range" min="5" max="40" step="1" />
          </div>
        </section>

        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>Do you have a preference for location?</h3>
          </div>
          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference === 'specific' }" @click="selectLocationPreference('specific')">
              <strong>Yes, I have a region in mind</strong>
              <span>Rank the best suburbs inside that region.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference !== 'specific' }" @click="selectLocationPreference('broad')">
              <strong>No strong preference</strong>
              <span>Choose between top regions or all individual suburbs.</span>
            </button>
          </div>
          <Transition name="wealth-scout-reveal" mode="out-in">
            <div v-if="locationPreference === 'specific'" key="specific" class="wealth-scout__range-grid wealth-scout__range-grid--single">
              <label>
                <span>Preferred region</span>
                <select v-model="draftConfig.locationKey">
                  <option :value="null">Select a region</option>
                  <option v-for="option in regionOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                </select>
              </label>
            </div>
            <div v-else key="broad" class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'region' }" @click="setBroadSearchMode('region')">
                <strong>Show top regions</strong>
                <span>Return larger regional catchments first.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'suburb' }" @click="setBroadSearchMode('suburb')">
                <strong>Show all individual suburbs</strong>
                <span>Rank individual suburbs across NSW.</span>
              </button>
            </div>
          </Transition>
        </section>

        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>Are you interested in an apartment or house?</h3>
          </div>
          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'apartment' }" @click="draftConfig.propertyType = 'apartment'">
              <strong>Apartment</strong>
              <span>Use apartment medians and apartment-specific holding costs.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'house' }" @click="draftConfig.propertyType = 'house'">
              <strong>House</strong>
              <span>Use house medians and house-specific borrowing assumptions.</span>
            </button>
          </div>
          <div class="wealth-scout__summary-grid">
            <article class="wealth-scout__summary-card">
              <span>Search scope</span>
              <strong>{{ searchScopeLabel }}</strong>
              <small>{{ locationSummaryLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Buying goal</span>
              <strong>{{ buyTimingLabel }}</strong>
              <small>{{ draftConfig.buyFlexibility === 'whenever' ? 'Scout will surface earliest affordable timing' : 'Results fixed to the chosen timeframe' }}</small>
            </article>
          </div>
        </section>

        <section class="wealth-scout__input-section">
          <div class="wealth-scout__question-head wealth-scout__question-head--stacked">
            <h3>How should results be sorted?</h3>
          </div>
          <div class="wealth-scout__ranking">
            <div class="wealth-scout__ranking-head">
              <strong>Do you have value growth or rental yield?</strong>
              <span>{{ rankingPreferenceLabel }}</span>
            </div>
            <input v-model.number="draftConfig.rentalYieldWeight" class="wealth-scout__slider" type="range" min="0" max="1" step="0.05" />
            <div class="wealth-scout__slider-scale">
              <span>Property growth only</span>
              <span>Balanced</span>
              <span>Rental yield only</span>
            </div>
            <div class="wealth-scout__mini-head">
              <strong>What is your risk appetite?</strong>
            </div>
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--three">
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'small' }" @click="setRiskAppetite('small')">
                <strong>Small</strong>
                <span>Bigger penalty for volatility.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'medium' }" @click="setRiskAppetite('medium')">
                <strong>Medium</strong>
                <span>Balanced penalty.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'large' }" @click="setRiskAppetite('large')">
                <strong>Large</strong>
                <span>Smaller penalty for volatility.</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </section>

    <template v-else>
    <Transition :name="transitionName" mode="out-in">
      <section :key="activeStep.key" class="wealth-scout__panel">
        <template v-if="false && activeStep.key === 'intro'">
          <div class="wealth-scout__hero">
            <p class="wealth-scout__kicker">Region scout</p>
            <h2>Find the next area worth targeting</h2>
            <p class="wealth-scout__copy">
              Answer a few questions, move back when you need to, and the scout will translate your savings path into suburbs or regions worth watching.
            </p>
          </div>
        </template>

        <template v-else-if="false && activeStep.key === 'timing'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>When do you want to buy?</h3>
            <p>Pick a timeframe, or tell the scout to keep looking until something becomes realistically affordable.</p>
          </div>

          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'target' }" @click="setTargetBuyMode()">
                <strong>I'll choose when to buy</strong>
                <span>Set a target purchase window yourself.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'whenever' }" @click="setWheneverMode()">
                <strong>Buy whenever I can afford to</strong>
                <span>Automatically find the earliest buying point.</span>
              </button>
            </div>

            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.buyFlexibility === 'target'" class="wealth-scout__slider-card">
                <div class="wealth-scout__slider-head">
                  <span>Target timing</span>
                  <strong>{{ sliderTimingLabel }}</strong>
                </div>
                <input
                  v-model.number="draftConfig.targetYears"
                  class="wealth-scout__slider"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  @input="draftConfig.buyFlexibility = 'target'"
                />
                <div class="wealth-scout__slider-scale">
                  <span>Now</span>
                  <span>10 years</span>
                  <span>20 years</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="false && activeStep.key === 'savings'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Are you comfortable investing while you save for a house?</h3>
            <p>If yes, use the same portfolio sleeves as the main workbook. If no, the scout assumes high-interest cash.</p>
          </div>

          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'defaultPortfolio' }" @click="selectSavingsMode('defaultPortfolio')">
                <strong>Yes, invest while saving</strong>
                <span>Use the portfolio mix below to grow the deposit.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'cash' }" @click="selectSavingsMode('cash')">
                <strong>No, keep it in cash</strong>
                <span>Assume savings stay in a high-interest cash path.</span>
              </button>
            </div>

            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.savingsMode === 'defaultPortfolio'" class="wealth-scout__portfolio">
                <label v-for="allocation in portfolioAllocationFields" :key="allocation.key" class="wealth-scout__allocation">
                  <span class="wealth-scout__allocation-top">
                    <span class="wealth-scout__allocation-title">
                      <i class="wealth-scout__swatch" :style="{ background: allocation.color }"></i>
                      {{ allocation.label }}
                    </span>
                    <strong>{{ getAllocationPct(allocation.key) }}%</strong>
                  </span>
                  <div class="wealth-scout__allocation-controls">
                    <input :value="getAllocationPct(allocation.key)" type="range" min="0" max="100" step="1" @input="handleAllocationInput(allocation.key, $event)" />
                    <input :value="getAllocationPct(allocation.key)" type="number" min="0" max="100" step="1" @input="handleAllocationInput(allocation.key, $event)" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="false && activeStep.key === 'power'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Your purchasing power and deposit runway</h3>
            <p>The chart tracks what you can buy over time and how much deposit cash you should have available from savings or sell-off value.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'optimal' }" @click="draftConfig.depositMode = 'optimal'">
              <strong>Use the strongest deposit automatically</strong>
              <span>The scout scales deposit size up as savings grow.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'fixed' }" @click="draftConfig.depositMode = 'fixed'">
              <strong>Set my own deposit %</strong>
              <span>Keep the deposit ratio fixed across the scouting window.</span>
            </button>
          </div>

          <div v-if="draftConfig.depositMode === 'fixed'" class="wealth-scout__slider-card wealth-scout__slider-card--compact">
            <div class="wealth-scout__slider-head">
              <span>Fixed deposit size</span>
              <strong>{{ Math.round(draftConfig.fixedDepositPct * 100) }}%</strong>
            </div>
            <input v-model.number="fixedDepositPctUi" class="wealth-scout__slider" type="range" min="5" max="40" step="1" />
          </div>
          <div class="wealth-scout__charts">
            <WealthLineChart title="Purchasing power over time" subtitle="The max property value your savings and serviceability support." kicker="0-20 year path" :series="purchasingPowerChartSeries" :markers="buyYearMarker" />
          </div>

        </template>

        <template v-else-if="false && activeStep.key === 'location'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Do you have a preference for location?</h3>
            <p>Pick a specific NSW region, or let the scout compare broad regions versus all individual suburbs.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference === 'specific' }" @click="selectLocationPreference('specific')">
              <strong>Yes, I have a region in mind</strong>
              <span>Rank the best suburbs inside that region.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference !== 'specific' }" @click="selectLocationPreference('broad')">
              <strong>No strong preference</strong>
              <span>Choose between top regions or all individual suburbs.</span>
            </button>
          </div>

          <Transition name="wealth-scout-reveal" mode="out-in">
            <div v-if="locationPreference === 'specific'" key="specific" class="wealth-scout__range-grid wealth-scout__range-grid--single">
              <label>
                <span>Preferred region</span>
                <select v-model="draftConfig.locationKey">
                  <option :value="null">Select a region</option>
                  <option v-for="option in regionOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                </select>
              </label>
            </div>
            <div v-else key="broad" class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'region' }" @click="setBroadSearchMode('region')">
                <strong>Show top regions</strong>
                <span>Return larger regional catchments first.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'suburb' }" @click="setBroadSearchMode('suburb')">
                <strong>Show all individual suburbs</strong>
                <span>Rank individual suburbs across NSW.</span>
              </button>
            </div>
          </Transition>
        </template>

        <template v-else-if="false && activeStep.key === 'property'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Are you interested in an apartment or house?</h3>
            <p>The scout uses the matching market history, growth assumptions, and purchasing-power track for that property type.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'apartment' }" @click="draftConfig.propertyType = 'apartment'">
              <strong>Apartment</strong>
              <span>Use apartment medians and apartment-specific holding costs.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'house' }" @click="draftConfig.propertyType = 'house'">
              <strong>House</strong>
              <span>Use house medians and house-specific borrowing assumptions.</span>
            </button>
          </div>

          <div class="wealth-scout__summary-grid">
            <article class="wealth-scout__summary-card">
              <span>Search scope</span>
              <strong>{{ searchScopeLabel }}</strong>
              <small>{{ locationSummaryLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Buying goal</span>
              <strong>{{ buyTimingLabel }}</strong>
              <small>{{ draftConfig.buyFlexibility === 'whenever' ? 'Scout will surface earliest affordable timing' : 'Results fixed to the chosen timeframe' }}</small>
            </article>
          </div>
        </template>

        <template v-else-if="false && activeStep.key === 'ranking'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>How should results be sorted?</h3>
            <p>Balance long-run capital growth against rental yield, and choose how much volatility should be penalised.</p>
          </div>

          <div class="wealth-scout__ranking">
            <div class="wealth-scout__ranking-head">
              <strong>Do you have value growth or rental yield?</strong>
              <span>{{ rankingPreferenceLabel }}</span>
            </div>
            <input
              v-model.number="draftConfig.rentalYieldWeight"
              class="wealth-scout__slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
            />
            <div class="wealth-scout__slider-scale">
              <span>Property growth only</span>
              <span>Balanced</span>
              <span>Rental yield only</span>
            </div>
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--three">
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'small' }" @click="setRiskAppetite('small')">
                <strong>Small</strong>
                <span>Bigger penalty for volatility.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'medium' }" @click="setRiskAppetite('medium')">
                <strong>Medium</strong>
                <span>Balanced penalty.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'large' }" @click="setRiskAppetite('large')">
                <strong>Large</strong>
                <span>Smaller penalty for volatility.</span>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-if="isCalculating" class="wealth-scout__loading">
            <p class="wealth-scout__eyebrow">Calculating shortlist</p>
            <h3>Ranking the best {{ appliedConfig.granularity === 'region' ? 'regions' : 'suburbs' }}</h3>
            <p>Comparing affordability, growth, yield, and timing for your current settings.</p>
            <div class="wealth-scout__loading-spinner" aria-hidden="true"></div>
          </div>

          <template v-else>
            <div class="wealth-scout__question-head wealth-scout__question-head--results">
              <div>
                <h3>{{ filteredResultsModel.totalMatches ? `${filteredResultsModel.totalMatches} matching ${appliedConfig.granularity === 'region' ? 'regions' : 'suburbs'}` : 'No matches yet' }}</h3>
              </div>
              <p>Each result shows today's median, the price at your buy timing, and a relative score based on your growth and yield mix. Open a result for the deeper projection view.</p>
            </div>

            <div class="wealth-scout__results-filters">
              <div class="wealth-scout__results-filters-head">
                <div>
                  <h4>Results filter</h4>
                </div>
                <span>{{ filteredResultsModel.totalMatches }} matches</span>
              </div>

              <div class="wealth-scout__filter-toggle-group">
                <button type="button" class="wealth-scout__filter-chip" :class="{ 'is-active': resultFilters.mode === 'affordable' }" @click="setResultsMode('affordable')">
                  Properties that I can afford
                </button>
                <button type="button" class="wealth-scout__filter-chip" :class="{ 'is-active': resultFilters.mode === 'all' }" @click="setResultsMode('all')">
                  All properties
                </button>
              </div>

              <div v-if="resultFilters.mode === 'all'" class="wealth-scout__price-filter">
                <div class="wealth-scout__price-slider-shell" :style="priceSelectionStyle">
                  <div class="wealth-scout__histogram">
                    <div class="wealth-scout__histogram-bars">
                      <div v-for="(bin, index) in priceHistogramBins" :key="`bin-${index}`" class="wealth-scout__histogram-bar" :style="{ height: `${bin.height}%` }"></div>
                    </div>
                  </div>
                  <div class="wealth-scout__range-track">
                    <div class="wealth-scout__range-track-base"></div>
                    <div class="wealth-scout__range-track-active"></div>
                    <input v-model.number="draftMinPrice" class="wealth-scout__range-input wealth-scout__range-input--min" type="range" :min="resultPriceBounds.min" :max="resultPriceBounds.max" :step="resultPriceBounds.step" />
                    <input v-model.number="draftMaxPrice" class="wealth-scout__range-input wealth-scout__range-input--max" type="range" :min="resultPriceBounds.min" :max="resultPriceBounds.max" :step="resultPriceBounds.step" />
                  </div>
                </div>

                <div class="wealth-scout__price-input-grid">
                  <label class="wealth-scout__price-field-box">
                    <span>Min price</span>
                    <div class="wealth-scout__price-field-value">
                      <strong>$</strong>
                      <input v-model.number="draftMinPrice" type="number" :min="resultPriceBounds.min" :max="draftMaxPrice" :step="resultPriceBounds.step" />
                    </div>
                  </label>
                  <label class="wealth-scout__price-field-box">
                    <span>Max price</span>
                    <div class="wealth-scout__price-field-value">
                      <strong>$</strong>
                      <input v-model.number="draftMaxPrice" type="number" :min="draftMinPrice" :max="resultPriceBounds.max" :step="resultPriceBounds.step" />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div v-if="filteredResultsModel.hasRecommendations" class="wealth-scout__results">
              <article v-for="(recommendation, index) in filteredResultsModel.recommendations" :key="recommendation.key" class="wealth-scout__result-card" :class="{ 'is-expanded': activeResultKey === recommendation.key }">
              <button type="button" class="wealth-scout__result-main" @click="toggleResult(recommendation.key)">
                <div class="wealth-scout__result-rank">#{{ index + 1 }}</div>
                <div class="wealth-scout__result-copy">
                  <div class="wealth-scout__result-head">
                    <div>
                      <h4>{{ recommendation.label }}</h4>
                      <p>{{ recommendation.type === 'region' ? 'Region' : 'Suburb' }}<template v-if="recommendation.regionLabel && recommendation.regionLabel !== recommendation.label"> | {{ recommendation.regionLabel }}</template></p>
                    </div>
                    <strong>{{ formatRelativeResultScore(recommendation) }}/10</strong>
                  </div>

                  <div class="wealth-scout__result-metrics">
                    <div>
                      <span>Median {{ propertyTypeLabel.toLowerCase() }} price</span>
                      <strong>{{ formatCurrency(recommendation.priceToday) }}</strong>
                    </div>
                    <div>
                      <span>Buy-year price</span>
                      <strong>{{ formatCurrency(recommendation.buyYearPrice) }}</strong>
                    </div>
                    <div>
                      <span>Timing</span>
                      <strong>{{ recommendation.selectedTimingLabel }}</strong>
                    </div>
                    <div>
                      <span>Growth score</span>
                      <strong>{{ formatPercent(recommendation.growthScore) }}</strong>
                    </div>
                    <div>
                      <span>Yield score</span>
                      <strong>{{ formatPercent(recommendation.rentalYieldScore) }}</strong>
                    </div>
                  </div>
                </div>
              </button>

              <Transition name="wealth-scout-reveal">
                <div v-if="activeResultKey === recommendation.key" class="wealth-scout__detail">
                  <div class="wealth-scout__detail-metrics">
                    <article class="wealth-scout__detail-card">
                      <span>Deposit required</span>
                      <strong>{{ formatCurrency(recommendation.requiredCashAtBuyYear) }}</strong>
                      <small>{{ recommendation.requiredDepositPctAtBuyYear ? `${Math.round(recommendation.requiredDepositPctAtBuyYear * 100)}% of property value` : 'Not affordable within the current plan window' }}</small>
                    </article>
                    <article class="wealth-scout__detail-card">
                      <span>Budget gap at buy timing</span>
                      <strong :class="budgetClass(recommendation.budgetGap)">{{ formatSignedCurrency(recommendation.budgetGap) }}</strong>
                      <small>Positive means the plan clears the buy-year price</small>
                    </article>
                  </div>

                  <div class="wealth-scout__charts wealth-scout__charts--stacked">
                    <WealthPropertyTrendChart :title="`Historical ${propertyTypeLabel.toLowerCase()} price`" :subtitle="recommendation.selectedTimingLabel" color="#0f766e" :actual-points="recommendation.actualPoints" :trend-points="recommendation.trendPoints" :estimate-point="recommendation.estimatePoint" />
                    <WealthLineChart :title="`${propertyTypeLabel} price Monte Carlo`" subtitle="P10 / P50 / P90 projection for the next 30 years." kicker="Forward market path" :series="buildMonteCarloChartSeries(recommendation)" :markers="buildResultMarkers(recommendation)" />
                    <WealthLineChart title="Purchasing power vs required property value" subtitle="Compare what you can buy against the projected price path." kicker="30-year affordability" :series="buildResultPowerSeries(recommendation)" :markers="buildResultMarkers(recommendation)" />
                  </div>
                </div>
              </Transition>
              </article>
            </div>

            <div v-else class="wealth-scout__empty">
              <h4>No results match those settings</h4>
              <p>Widen the price range, switch between regions and suburbs, or change the buy timing.</p>
            </div>
          </template>
        </template>
      </section>
    </Transition>

    </template>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import WealthLineChart from './WealthLineChart.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'
import { buildRegionScoutPreviewModel, buildRegionScoutResultsModel, normaliseRegionScoutConfig } from '../../wealth/regionScout.js'
import {
  getLockedWeightKeys,
  isPortfolioWeightLocked,
  portfolioAllocationFields,
  setPortfolioAllocation,
  togglePortfolioWeightLock
} from '../../wealth/portfolioAllocation.js'

const props = defineProps({
  view: {
    type: String,
    default: 'inputs'
  },
  form: { type: Object, required: true },
  scoutConfig: {
    type: Object,
    required: true
  },
  suburbSearchContext: {
    type: Object,
    default: () => ({ areasByKey: {}, areaOptions: [] })
  }
})

const emit = defineEmits(['loading-change'])

const steps = [
  { key: 'intro', label: 'Intro' },
  { key: 'timing', label: 'Timing' },
  { key: 'savings', label: 'Savings path' },
  { key: 'power', label: 'Purchasing power' },
  { key: 'location', label: 'Location' },
  { key: 'property', label: 'Property type' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'results', label: 'Results' }
]

const currentStepIndex = ref(props.view === 'results' ? steps.length - 1 : 0)
const transitionDirection = ref('forward')
const activeResultKey = ref(null)
const draftConfig = reactive(createDraftConfig(props.scoutConfig))
const locationPreference = ref(draftConfig.locationKey ? 'specific' : 'broad')
const isCalculating = ref(props.view === 'results')
const calculationToken = ref(0)
const appliedConfig = ref(normaliseRegionScoutConfig(props.scoutConfig))
const resultsModel = ref(createEmptyResultsModel(appliedConfig.value))
const resultFilters = reactive({
  mode: 'affordable',
  minPrice: 0,
  maxPrice: 0
})
const scoutPortfolioDraft = reactive(createPortfolioConfigDraft(props.form.portfolioConfig))
const committedScoutPortfolio = reactive(createPortfolioConfigDraft(props.form.portfolioConfig))
const draftMinPrice = ref(0)
const draftMaxPrice = ref(0)
let priceCommitTimer = null
let targetYearsCommitTimer = null
let portfolioCommitTimer = null
let syncingConfig = false
const viewMode = computed(() => props.view === 'results' ? 'results' : 'inputs')
const activeStep = computed(() => steps[currentStepIndex.value])
const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'wealth-scout-slide-next' : 'wealth-scout-slide-back'
)

const regionOptions = computed(() =>
  (props.suburbSearchContext?.areaOptions || []).filter((option) => option.type === 'region')
)

const previewConfig = computed(() => normaliseRegionScoutConfig(draftConfig))
const targetYearsUi = ref(Number(draftConfig.targetYears) || 0)

const previewModel = computed(() => buildRegionScoutPreviewModel({
  form: buildPreviewForm(),
  suburbSearchContext: props.suburbSearchContext,
  config: previewConfig.value
}))

const fixedDepositPctUi = computed({
  get: () => Math.round((Number(draftConfig.fixedDepositPct) || 0.2) * 100),
  set: (value) => {
    draftConfig.fixedDepositPct = Math.max(0.05, Math.min(0.95, (Number(value) || 20) / 100))
  }
})

const sliderTimingLabel = computed(() => yearLabel(targetYearsUi.value))
const buyTimingLabel = computed(() =>
  draftConfig.buyFlexibility === 'whenever'
    ? 'Whenever I can afford to'
    : sliderTimingLabel.value
)
const savingsPathLabel = computed(() =>
  draftConfig.savingsMode === 'cash'
    ? 'High-interest cash savings'
    : 'Invested portfolio savings'
)
const depositModeLabel = computed(() =>
  draftConfig.depositMode === 'fixed'
    ? `${Math.round(draftConfig.fixedDepositPct * 100)}% fixed deposit`
    : 'Auto-scaled strongest deposit'
)
const propertyTypeLabel = computed(() =>
  draftConfig.propertyType === 'house' ? 'House' : 'Apartment'
)
const searchScopeLabel = computed(() => {
  if (locationPreference.value === 'specific') {
    const match = regionOptions.value.find((option) => option.key === draftConfig.locationKey)
    return match?.label ? `Best suburbs in ${match.label}` : 'Pick a region'
  }
  return draftConfig.granularity === 'suburb' ? 'All individual suburbs' : 'Top regions'
})
const locationSummaryLabel = computed(() =>
  locationPreference.value === 'specific'
    ? 'Scoped to suburbs in one region'
    : draftConfig.granularity === 'suburb'
      ? 'Statewide suburb ranking'
      : 'Statewide region ranking'
)
const resultPriceBounds = computed(() => buildResultPriceBounds(resultsModel.value.allRecommendations))
const filteredPriceRangeLabel = computed(() => formatPriceRange({
  minPrice: resultFilters.mode === 'all' ? resultFilters.minPrice : resultPriceBounds.value.min,
  maxPrice: resultFilters.mode === 'all' ? resultFilters.maxPrice : resultPriceBounds.value.max
}))
const filteredResultsModel = computed(() => buildFilteredResultsModel(resultsModel.value, resultFilters))
const priceHistogramBins = computed(() => buildPriceHistogramBins(resultsModel.value.allRecommendations, resultPriceBounds.value))
const priceSelectionStyle = computed(() => buildPriceSelectionStyle({
  minPrice: draftMinPrice.value,
  maxPrice: draftMaxPrice.value
}, resultPriceBounds.value))
const relativeScoreBounds = computed(() => buildRelativeScoreBounds(
  resultsModel.value.scoreReferenceRecommendations || resultsModel.value.allRecommendations
))

const questionProgressLabel = computed(() => {
  const questionKeys = ['timing', 'savings', 'power', 'location', 'property', 'ranking']
  const visibleIndex = Math.max(1, questionKeys.indexOf(activeStep.value.key) + 1)
  return `Question ${visibleIndex}/${questionKeys.length}`
})

const rankingPreferenceLabel = computed(() => {
  const yieldWeight = Math.round((draftConfig.rentalYieldWeight || 0) * 100)
  const growthWeight = 100 - yieldWeight
  return `${growthWeight}% growth / ${yieldWeight}% rent yield`
})

const furthestUnlockedStep = computed(() => {
  let unlocked = 0
  for (let index = 0; index < steps.length - 1; index += 1) {
    if (!isStepValid(index)) return index
    unlocked = index + 1
  }
  return Math.min(unlocked, steps.length - 1)
})

const canMoveForward = computed(() => isStepValid(currentStepIndex.value))

const buyYearMarker = computed(() => {
  const markerYear = previewConfig.value.buyFlexibility === 'target' ? previewConfig.value.targetYears : null
  return Number.isFinite(markerYear)
    ? [{ year: markerYear, label: previewConfig.value.buyFlexibility === 'target' ? 'Buy target' : 'Best timing', color: '#0f766e' }]
    : []
})

const purchasingPowerChartSeries = computed(() => ([
  {
    id: 'power',
    label: 'Purchasing power',
    color: '#0f766e',
    accent: 'rgba(15, 118, 110, 0.15)',
    points: previewModel.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.affordablePrice,
      mid: point.affordablePrice,
      high: point.affordablePrice
    }))
  }
]))

const depositChartSeries = computed(() => ([
  {
    id: 'saved',
    label: 'Sell-off savings',
    color: '#2563eb',
    accent: 'rgba(37, 99, 235, 0.16)',
    points: previewModel.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.liquidSavings,
      mid: point.liquidSavings,
      high: point.liquidSavings
    }))
  },
  {
    id: 'required',
    label: 'Required deposit cash',
    color: '#f97316',
    accent: 'rgba(249, 115, 22, 0.14)',
    points: previewModel.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.requiredCash,
      mid: point.requiredCash,
      high: point.requiredCash
    }))
  }
]))

watch(resultsModel, (nextModel) => {
  syncResultFiltersForNewResults(nextModel)
}, { immediate: true, deep: true })

watch(isCalculating, (value) => {
  emit('loading-change', value)
}, { immediate: true })

watch(filteredResultsModel, (nextModel) => {
  const firstKey = nextModel.recommendations[0]?.key || null
  if (!nextModel.recommendations.some((item) => item.key === activeResultKey.value)) {
    activeResultKey.value = firstKey
  }
}, { immediate: true, deep: true })

watch(() => draftConfig.savingsMode, (mode) => {
  props.form.propertyConfig.investWhileSavingForDeposit = mode === 'defaultPortfolio'
}, { immediate: true })

watch(draftMinPrice, (minPrice) => {
  const clampedMin = clampToRange(minPrice, resultPriceBounds.value.min, resultPriceBounds.value.max)
  if (clampedMin !== minPrice) {
    draftMinPrice.value = clampedMin
    return
  }
  if (clampedMin > draftMaxPrice.value) {
    draftMaxPrice.value = clampedMin
  }
  schedulePriceFilterCommit()
})

watch(draftMaxPrice, (maxPrice) => {
  const clampedMax = clampToRange(maxPrice, resultPriceBounds.value.min, resultPriceBounds.value.max)
  if (clampedMax !== maxPrice) {
    draftMaxPrice.value = clampedMax
    return
  }
  if (clampedMax < draftMinPrice.value) {
    draftMinPrice.value = clampedMax
  }
  schedulePriceFilterCommit()
})

watch(() => props.scoutConfig, (nextConfig) => {
  syncingConfig = true
  Object.assign(draftConfig, createDraftConfig(nextConfig))
  targetYearsUi.value = Number(nextConfig?.targetYears) || 0
  locationPreference.value = nextConfig?.locationKey ? 'specific' : 'broad'
  syncingConfig = false
}, { deep: true })

watch(() => props.form.portfolioConfig, (nextPortfolioConfig) => {
  syncPortfolioDrafts(nextPortfolioConfig)
}, { deep: true })

watch(() => draftConfig.targetYears, (nextYears) => {
  const normalisedYears = Number(nextYears) || 0
  if (targetYearsUi.value !== normalisedYears) {
    targetYearsUi.value = normalisedYears
  }
})

watch(draftConfig, () => {
  if (viewMode.value !== 'inputs' || syncingConfig) return
  commitCurrentStep()
}, { deep: true })

onMounted(() => {
  if (viewMode.value === 'results') {
    currentStepIndex.value = steps.length - 1
    void calculateResults()
    return
  }
  commitCurrentStep()
})

onBeforeUnmount(() => {
  if (priceCommitTimer) window.clearTimeout(priceCommitTimer)
  if (targetYearsCommitTimer) window.clearTimeout(targetYearsCommitTimer)
  if (portfolioCommitTimer) window.clearTimeout(portfolioCommitTimer)
})

function isStepValid(index) {
  const stepKey = steps[index]?.key
  if (stepKey === 'savings') return draftConfig.savingsMode === 'cash' || portfolioTotalPct() === 100
  if (stepKey === 'location') return locationPreference.value === 'specific' ? Boolean(draftConfig.locationKey) : ['region', 'suburb'].includes(draftConfig.granularity)
  return true
}

function goToStep(index) {
  if (index < 0 || index >= steps.length) return
  if (index > furthestUnlockedStep.value) return
  transitionDirection.value = index >= currentStepIndex.value ? 'forward' : 'back'
  currentStepIndex.value = index
}

async function goNext() {
  if (!canMoveForward.value || currentStepIndex.value >= steps.length - 1 || isCalculating.value) return
  if (steps[currentStepIndex.value + 1]?.key === 'results') {
    await calculateResults()
    return
  }
  commitCurrentStep()
  goToStep(currentStepIndex.value + 1)
}

function goBack() {
  if (currentStepIndex.value <= 0) return
  goToStep(currentStepIndex.value - 1)
}

function setTargetBuyMode() {
  draftConfig.buyFlexibility = 'target'
}

function setWheneverMode() {
  draftConfig.buyFlexibility = 'whenever'
}

function selectSavingsMode(mode) {
  draftConfig.savingsMode = mode
}

function selectLocationPreference(mode) {
  locationPreference.value = mode === 'specific' ? 'specific' : 'broad'
  if (locationPreference.value === 'specific') draftConfig.granularity = 'suburb'
  else draftConfig.locationKey = null
}

function setBroadSearchMode(mode) {
  draftConfig.locationKey = null
  draftConfig.granularity = mode === 'suburb' ? 'suburb' : 'region'
}

function setRiskAppetite(value) {
  draftConfig.riskAppetite = value
}

function handleTargetYearsInput() {
  draftConfig.buyFlexibility = 'target'
  if (targetYearsCommitTimer) window.clearTimeout(targetYearsCommitTimer)
  targetYearsCommitTimer = window.setTimeout(() => {
    draftConfig.targetYears = Number(targetYearsUi.value) || 0
    targetYearsCommitTimer = null
  }, 1000)
}

function toggleResult(resultKey) {
  activeResultKey.value = activeResultKey.value === resultKey ? null : resultKey
}

function handleAllocationInput(key, event) {
  setPortfolioAllocation(scoutPortfolioDraft, key, event?.target?.value)
  if (event?.target) {
    event.target.value = String(getAllocationPct(key))
  }
  schedulePortfolioCommit()
}

function getAllocationPct(key) {
  return Math.round((Math.max(0, Number(scoutPortfolioDraft[key]) || 0) * 100))
}

function portfolioTotalPct() {
  return portfolioAllocationFields.reduce((sum, field) => sum + getAllocationPct(field.key), 0)
}

function toggleAllocationLock(key) {
  togglePortfolioWeightLock(scoutPortfolioDraft, key)
  schedulePortfolioCommit()
}

function isAllocationLocked(key) {
  return isPortfolioWeightLocked(scoutPortfolioDraft, key)
}

function hasUnlockedAllocationPeers(key) {
  const lockedKeys = new Set(getLockedWeightKeys(scoutPortfolioDraft))
  return portfolioAllocationFields.some((field) => field.key !== key && !lockedKeys.has(field.key))
}

function buildMonteCarloChartSeries(recommendation) {
  return [{
    id: 'mc',
    label: `${propertyTypeLabel.value} price`,
    color: '#0f766e',
    accent: 'rgba(15, 118, 110, 0.16)',
    points: recommendation.monteCarloSeries
  }]
}

function buildResultPowerSeries(recommendation) {
  return [
    {
      id: 'power',
      label: 'Your purchasing power',
      color: '#2563eb',
      accent: 'rgba(37, 99, 235, 0.16)',
      points: recommendation.purchasingPowerSeries.map((point) => ({ year: point.year, low: point.affordablePrice, mid: point.affordablePrice, high: point.affordablePrice }))
    },
    {
      id: 'required',
      label: 'Required property value',
      color: '#f97316',
      accent: 'rgba(249, 115, 22, 0.14)',
      points: recommendation.purchasingPowerSeries.map((point) => ({ year: point.year, low: point.requiredPrice, mid: point.requiredPrice, high: point.requiredPrice }))
    }
  ]
}

function buildResultDepositSeries(recommendation) {
  return [
    {
      id: 'saved',
      label: 'Sell-off savings',
      color: '#2563eb',
      accent: 'rgba(37, 99, 235, 0.16)',
      points: recommendation.depositSeries.map((point) => ({ year: point.year, low: point.sellOffSavings, mid: point.sellOffSavings, high: point.sellOffSavings }))
    },
    {
      id: 'deposit',
      label: 'Required deposit',
      color: '#f97316',
      accent: 'rgba(249, 115, 22, 0.14)',
      points: recommendation.depositSeries.map((point) => ({ year: point.year, low: point.requiredDeposit, mid: point.requiredDeposit, high: point.requiredDeposit }))
    }
  ]
}

function buildResultMarkers(recommendation) {
  return Number.isFinite(recommendation.selectedYear) ? [{ year: recommendation.selectedYear, label: 'Buy line', color: '#0f766e' }] : []
}

function formatRelativeResultScore(recommendation) {
  const rawScore = Number(recommendation?.rankingScore)
  if (!Number.isFinite(rawScore)) return '0.0'
  const { min, max } = relativeScoreBounds.value
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '0.0'
  if (Math.abs(max - min) < 1e-9) return '10.0'
  const relativeScore = ((rawScore - min) / (max - min)) * 10
  return clampToRange(relativeScore, 0, 10).toFixed(1)
}

async function calculateResults() {
  commitCurrentStep()
  const nextConfig = normaliseRegionScoutConfig(props.scoutConfig)
  const token = calculationToken.value + 1
  calculationToken.value = token
  isCalculating.value = true
  appliedConfig.value = nextConfig
  activeResultKey.value = null
  currentStepIndex.value = steps.length - 1
  await nextTick()
  await waitForNextPaint()
  if (calculationToken.value !== token) return

  try {
    const nextResults = buildRegionScoutResultsModel({
      form: props.form,
      suburbSearchContext: props.suburbSearchContext,
      config: nextConfig,
      previewModel: previewModel.value
    })
    if (calculationToken.value !== token) return
    resultsModel.value = nextResults
  } finally {
    if (calculationToken.value === token) {
      isCalculating.value = false
    }
  }
}

function commitCurrentStep() {
  flushPendingPortfolioCommit()
  if (draftConfig.buyFlexibility === 'target') {
    if (targetYearsCommitTimer) {
      window.clearTimeout(targetYearsCommitTimer)
      targetYearsCommitTimer = null
    }
    draftConfig.targetYears = Number(targetYearsUi.value) || 0
  }
  Object.assign(props.scoutConfig, normaliseRegionScoutConfig(draftConfig))
}

function createDraftConfig(config) {
  return {
    ...normaliseRegionScoutConfig(config)
  }
}

function createPortfolioConfigDraft(config) {
  return {
    qqqWeight: Number(config?.qqqWeight) || 0,
    asxWeight: Number(config?.asxWeight) || 0,
    bondWeight: Number(config?.bondWeight) || 0,
    cashWeight: Number(config?.cashWeight) || 0,
    bitcoinWeight: Number(config?.bitcoinWeight) || 0,
    lockedWeights: Array.isArray(config?.lockedWeights) ? [...config.lockedWeights] : [],
    cashReturnMean: Number(config?.cashReturnMean) || 0
  }
}

function syncPortfolioDrafts(config) {
  const nextDraft = createPortfolioConfigDraft(config)
  Object.assign(scoutPortfolioDraft, nextDraft)
  Object.assign(committedScoutPortfolio, nextDraft)
}

function schedulePortfolioCommit() {
  if (portfolioCommitTimer) window.clearTimeout(portfolioCommitTimer)
  portfolioCommitTimer = window.setTimeout(() => {
    flushPendingPortfolioCommit()
  }, 1000)
}

function flushPendingPortfolioCommit() {
  if (portfolioCommitTimer) {
    window.clearTimeout(portfolioCommitTimer)
    portfolioCommitTimer = null
  }
  Object.assign(committedScoutPortfolio, createPortfolioConfigDraft(scoutPortfolioDraft))
  Object.assign(props.form.portfolioConfig, createPortfolioConfigDraft(scoutPortfolioDraft))
}

function buildPreviewForm() {
  return {
    ...props.form,
    portfolioConfig: committedScoutPortfolio
  }
}

function createEmptyResultsModel(config) {
  return {
    ...buildRegionScoutPreviewModel({
      form: props.form,
      suburbSearchContext: props.suburbSearchContext,
      config
    }),
    allRecommendations: [],
    scoreReferenceRecommendations: [],
    recommendations: [],
    totalMatches: 0,
    hasRecommendations: false,
    bestTiming: null
  }
}

function buildRelativeScoreBounds(recommendations = []) {
  const scores = recommendations
    .map((recommendation) => Number(recommendation?.rankingScore))
    .filter((score) => Number.isFinite(score))

  if (!scores.length) {
    return { min: 0, max: 0 }
  }

  return {
    min: Math.min(...scores),
    max: Math.max(...scores)
  }
}

function buildFilteredResultsModel(model, filters) {
  const recommendations = (model?.allRecommendations || []).filter((recommendation) => {
    if (filters.mode === 'all' && !matchesPriceRange(recommendation, filters)) return false
    if (filters.mode === 'affordable' && !matchesAffordableMode(recommendation, appliedConfig.value)) return false
    return true
  })

  const bestTiming = recommendations
    .map((candidate) => candidate.selectedYear)
    .filter((year) => Number.isFinite(year))
    .sort((left, right) => left - right)[0] ?? null

  return {
    ...model,
    recommendations: recommendations.slice(0, 12),
    totalMatches: recommendations.length,
    hasRecommendations: recommendations.length > 0,
    bestTiming
  }
}

function buildResultPriceBounds(recommendations = []) {
  const prices = recommendations
    .map((recommendation) => Number(recommendation?.priceToday) || 0)
    .filter((price) => price > 0)

  if (!prices.length) {
    return { min: 0, max: 5_000_000, step: 10_000 }
  }

  const min = Math.floor(Math.min(...prices) / 10000) * 10000
  const max = Math.ceil(Math.max(...prices) / 10000) * 10000
  return {
    min,
    max: Math.max(max, min + 10000),
    step: 10_000
  }
}

function syncResultFiltersForNewResults(model) {
  const bounds = buildResultPriceBounds(model?.allRecommendations)
  resultFilters.mode = 'affordable'
  resultFilters.minPrice = bounds.min
  resultFilters.maxPrice = bounds.max
  draftMinPrice.value = bounds.min
  draftMaxPrice.value = bounds.max
  if (priceCommitTimer) {
    clearTimeout(priceCommitTimer)
    priceCommitTimer = null
  }
}

function setResultsMode(mode) {
  resultFilters.mode = mode === 'all' ? 'all' : 'affordable'
  if (resultFilters.mode === 'all') {
    draftMinPrice.value = resultFilters.minPrice
    draftMaxPrice.value = resultFilters.maxPrice
  }
}

function schedulePriceFilterCommit() {
  if (resultFilters.mode !== 'all') return
  if (priceCommitTimer) clearTimeout(priceCommitTimer)
  priceCommitTimer = setTimeout(() => {
    resultFilters.minPrice = draftMinPrice.value
    resultFilters.maxPrice = draftMaxPrice.value
    priceCommitTimer = null
  }, 120)
}

function matchesPriceRange(recommendation, filters) {
  const priceToday = Number(recommendation?.priceToday) || 0
  return priceToday >= filters.minPrice && priceToday <= filters.maxPrice
}

function isAffordableWithinHorizon(recommendation, horizon) {
  if (!recommendation) return false
  const limit = Math.max(0, Math.min(30, Number(horizon) || 0))
  return recommendation.priceRequirementSeries?.some((point) => point.affordable && point.year <= limit) || false
}

function matchesAffordableMode(recommendation, config) {
  if (!recommendation) return false
  if (config?.buyFlexibility === 'target') {
    return recommendation.priceRequirementSeries?.some((point) => point.year === config.targetYears && point.affordable) || false
  }
  return isAffordableWithinHorizon(recommendation, 20)
}

function buildPriceHistogramBins(recommendations = [], bounds = { min: 0, max: 0 }) {
  const binCount = 56
  const span = Math.max(1, (bounds.max || 0) - (bounds.min || 0))
  const bins = Array.from({ length: binCount }, () => 0)

  recommendations.forEach((recommendation) => {
    const price = Number(recommendation?.priceToday)
    if (!Number.isFinite(price)) return
    const ratio = (price - bounds.min) / span
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(ratio * binCount)))
    bins[index] += 1
  })

  const maxCount = Math.max(...bins, 1)
  return bins.map((count) => ({
    count,
    height: count > 0 ? Math.max(10, (count / maxCount) * 100) : 0
  }))
}

function buildPriceSelectionStyle(filters, bounds) {
  const span = Math.max(1, (bounds.max || 0) - (bounds.min || 0))
  const start = (((filters.minPrice || 0) - bounds.min) / span) * 100
  const end = (((filters.maxPrice || 0) - bounds.min) / span) * 100
  const safeStart = Math.max(0, Math.min(100, start))
  const safeWidth = Math.max(0, Math.min(100, end) - safeStart)
  return {
    '--range-left': `${safeStart}%`,
    '--range-width': `${safeWidth}%`
  }
}

function clampToRange(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatSignedCurrency(value) {
  const safeValue = Number(value) || 0
  return `${safeValue >= 0 ? '+' : '-'}${formatCurrency(Math.abs(safeValue))}`
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}% p.a.`
}

function budgetClass(value) {
  return (Number(value) || 0) >= 0 ? 'is-positive' : 'is-negative'
}

function formatPriceRange(config) {
  if (!config) return 'Open range'
  if (Number.isFinite(config.minPrice) && Number.isFinite(config.maxPrice)) {
    return `${formatCurrency(config.minPrice)} to ${formatCurrency(config.maxPrice)}`
  }
  if (Number.isFinite(config.minPrice)) return `${formatCurrency(config.minPrice)}+`
  if (Number.isFinite(config.maxPrice)) return `Up to ${formatCurrency(config.maxPrice)}`
  return 'Open range'
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0)
      return
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}

function yearLabel(year) {
  return Number(year) === 0 ? 'Now' : `In ${year} years`
}
</script>

<style scoped>
.wealth-scout {
  display: grid;
  gap: 1rem;
  padding: 1.3rem;
  background: linear-gradient(180deg, rgba(253, 254, 255, 0.96), rgba(243, 248, 255, 0.94));
}

.wealth-scout__hero,
.wealth-scout__question-head,
.wealth-scout__result-head,
.wealth-scout__slider-head,
.wealth-scout__allocation-top,
.wealth-scout__footer,
.wealth-scout__toggle-row,
.wealth-scout__result-main,
.wealth-scout__result-metrics,
.wealth-scout__detail-metrics {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-scout__kicker,
.wealth-scout__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-scout__hero h2,
.wealth-scout__question-head h3,
.wealth-scout__result-head h4,
.wealth-scout__empty h4,
.wealth-scout__loading h3 {
  margin: 0.15rem 0 0;
  color: #173050;
}

.wealth-scout__hero {
  display: grid;
  align-content: start;
  justify-items: start;
  min-height: 0;
  max-width: 70rem;
  margin: 0 auto;
  text-align: left;
}

.wealth-scout__hero h2 {
  font-size: clamp(1.9rem, 1.6rem + 1vw, 2.7rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
  max-width: none;
  white-space: nowrap;
}

.wealth-scout__copy,
.wealth-scout__question-head p,
.wealth-scout__result-head p,
.wealth-scout__empty p,
.wealth-scout__loading p {
  margin: 0;
  color: #5d7394;
  line-height: 1.55;
}

.wealth-scout__choice-grid,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__results,
.wealth-scout__portfolio,
.wealth-scout__range-grid {
  display: grid;
  gap: 0.85rem;
}

.wealth-scout__panel {
  display: grid;
  gap: 1rem;
  min-height: calc(100vh - 18rem);
  padding: 1.6rem 0.4rem 1rem;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.wealth-scout__question-head {
  position: relative;
  display: grid;
  justify-items: start;
  text-align: left;
  gap: 0.45rem;
  width: min(100%, 70rem);
  min-height: 0;
  padding: 0;
  margin: 0 auto;
  align-content: start;
}

.wealth-scout__question-head--results {
  align-items: center;
}

.wealth-scout__question-head--stacked {
  min-height: 0;
  padding-inline: 0;
}

.wealth-scout__inputs {
  display: grid;
  gap: 2.4rem;
  width: min(100%, 70rem);
  margin: 0 auto;
}

.wealth-scout__input-section {
  display: grid;
  gap: 1.2rem;
}

.wealth-scout__question-index {
  position: absolute;
  top: -0.4rem;
  right: 0;
  margin: 0;
  color: #6a819f;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wealth-scout__choice-grid--two,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__detail-metrics,
.wealth-scout__range-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-scout__choice-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-scout__selection-stage {
  display: grid;
  gap: 1rem;
}

.wealth-scout__results-filters {
  display: grid;
  gap: 1rem;
  width: min(100%, 70rem);
  margin: 0 auto;
  padding: 1.1rem;
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.92);
}

.wealth-scout__results-filters-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.wealth-scout__results-filters-head h4 {
  margin: 0.2rem 0 0;
  color: #173050;
}

.wealth-scout__filter-toggle-group,
.wealth-scout__price-input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-scout__filter-chip,
.wealth-scout__price-input-grid label {
  display: grid;
  gap: 0.45rem;
}

.wealth-scout__filter-chip {
  min-height: 4rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(154, 174, 204, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
  text-align: center;
  cursor: pointer;
}

.wealth-scout__filter-chip.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(232, 242, 255, 0.96);
}

.wealth-scout__price-input-grid label {
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-scout__price-filter {
  display: grid;
  gap: 0.6rem;
}

.wealth-scout__price-slider-shell {
  position: relative;
  display: grid;
  gap: 0;
  width: 100%;
}

.wealth-scout__histogram {
  position: relative;
  height: 4.5rem;
  padding: 0 0.35rem;
}

.wealth-scout__histogram::before {
  display: none;
}

.wealth-scout__histogram-bars {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(56, minmax(0, 1fr));
  align-items: end;
  gap: 2px;
  height: 100%;
}

.wealth-scout__histogram-bar {
  position: relative;
  z-index: 1;
  border-radius: 0;
  background: rgba(154, 174, 204, 0.7);
  min-height: 0;
}

.wealth-scout__range-track {
  position: relative;
  height: 1.6rem;
  margin-top: -0.45rem;
  padding: 0 0.35rem;
}

.wealth-scout__range-track-base,
.wealth-scout__range-track-active {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 0.4rem;
  border-radius: 999px;
}

.wealth-scout__range-track-base {
  left: 0.35rem;
  right: 0.35rem;
  background: rgba(154, 174, 204, 0.3);
}

.wealth-scout__range-track-active {
  background: #173050;
  left: calc(0.35rem + var(--range-left, 0%));
  width: var(--range-width, 100%);
}

.wealth-scout__range-input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}

.wealth-scout__range-input::-webkit-slider-runnable-track {
  height: 0.4rem;
  background: transparent;
}

.wealth-scout__range-input::-moz-range-track {
  height: 0.4rem;
  background: transparent;
}

.wealth-scout__range-input::-webkit-slider-thumb {
  pointer-events: auto;
  -webkit-appearance: none;
  width: 2.3rem;
  height: 2.3rem;
  margin-top: -0.95rem;
  border-radius: 999px;
  border: 2px solid #fff;
  background: #173050;
  box-shadow: 0 4px 14px rgba(23, 48, 80, 0.16);
}

.wealth-scout__range-input::-moz-range-thumb {
  pointer-events: auto;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 999px;
  border: 2px solid #fff;
  background: #173050;
  box-shadow: 0 4px 14px rgba(23, 48, 80, 0.16);
}

.wealth-scout__price-field-box {
  display: grid;
  gap: 0.3rem;
  min-height: 5.2rem;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.98);
}

.wealth-scout__price-field-box span {
  color: #6a819f;
  font-size: 0.82rem;
}

.wealth-scout__price-field-box input {
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #173050;
  font: inherit;
  font-size: 1.15rem;
  box-shadow: none;
}

.wealth-scout__price-field-box input:focus {
  outline: none;
}

.wealth-scout__price-field-value {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.wealth-scout__price-field-value strong {
  color: #173050;
  font-size: 1.15rem;
}

.wealth-scout__selection-detail {
  min-height: 10.5rem;
  width: min(100%, 70rem);
  margin-inline: auto;
}

.wealth-scout__choice,
.wealth-scout__summary-card,
.wealth-scout__slider-card,
.wealth-scout__allocation,
.wealth-scout__toggle-row,
.wealth-scout__result-card,
.wealth-scout__detail-card,
.wealth-scout__empty,
.wealth-scout__loading {
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.88);
}

.wealth-scout__loading {
  display: grid;
  gap: 0.85rem;
  place-items: center;
  min-height: 22rem;
  padding: 2.2rem;
  text-align: center;
}

.wealth-scout__loading-spinner {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  border: 4px solid rgba(154, 174, 204, 0.26);
  border-top-color: #173050;
  animation: wealth-scout-spin 0.85s linear infinite;
}

.wealth-scout__choice,
.wealth-scout__toggle-row,
.wealth-scout__result-main {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.wealth-scout__choice {
  display: grid;
  gap: 0.35rem;
  min-height: 7.4rem;
  padding: 0.82rem 0.95rem;
  align-content: center;
  justify-items: start;
  border: 1.5px solid rgba(23, 48, 80, 0.22);
  background: rgba(255, 255, 255, 0.96);
}

.wealth-scout__choice--compact {
  min-height: 0;
  padding: 0.78rem 0.92rem;
}

.wealth-scout__choice strong,
.wealth-scout__toggle-row strong,
.wealth-scout__summary-card strong,
.wealth-scout__detail-card strong {
  color: #173050;
  line-height: 1.2;
  font-weight: 700;
}

.wealth-scout__choice span,
.wealth-scout__toggle-row small,
.wealth-scout__summary-card small,
.wealth-scout__detail-card small {
  color: #5d7394;
  line-height: 1.5;
}

.wealth-scout__choice.is-active,
.wealth-scout__toggle-row.is-active {
  border-color: rgba(23, 48, 80, 0.9);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: inset 0 0 0 1px rgba(23, 48, 80, 0.22);
}

.wealth-scout__slider-card,
.wealth-scout__summary-card,
.wealth-scout__detail-card {
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
}

.wealth-scout__question-head h3 {
  font-size: clamp(1.2rem, 1.08rem + 0.45vw, 1.55rem);
  line-height: 1.14;
  letter-spacing: -0.04em;
  max-width: 42ch;
  margin-inline: 0;
}

.wealth-scout__question-head p {
  max-width: 48rem;
  font-size: 1rem;
}

.wealth-scout__choice-grid,
.wealth-scout__slider-card,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__ranking,
.wealth-scout__custom-range,
.wealth-scout__portfolio,
.wealth-scout__range-grid,
.wealth-scout__results,
.wealth-scout__empty {
  width: min(100%, 70rem);
  margin-inline: auto;
}

.wealth-scout__choice-grid--two {
  grid-template-columns: repeat(2, minmax(18rem, 24rem));
  justify-content: center;
}

.wealth-scout__choice-grid--three {
  grid-template-columns: repeat(3, minmax(14rem, 18rem));
  justify-content: center;
}

.wealth-scout__ranking {
  display: grid;
  gap: 0.8rem;
}

.wealth-scout__mini-head {
  display: grid;
  gap: 0.25rem;
  margin-top: 0.35rem;
  color: #173050;
}

.wealth-scout__mini-head strong {
  font-size: 1.08rem;
  line-height: 1.25;
}

.wealth-scout__charts--stacked {
  grid-template-columns: 1fr;
}

.wealth-scout :deep(.wealth-chart__body) {
  min-height: 360px;
}

.wealth-scout__ranking-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  color: #5d7394;
}

.wealth-scout__ranking-head strong {
  color: #173050;
}

.wealth-scout__choice,
.wealth-scout__summary-card,
.wealth-scout__slider-card,
.wealth-scout__allocation,
.wealth-scout__toggle-row,
.wealth-scout__result-card,
.wealth-scout__detail-card,
.wealth-scout__empty {
  background: rgba(247, 250, 255, 0.68);
  box-shadow: none;
}

.wealth-scout__choice {
  border: 1.5px solid rgba(23, 48, 80, 0.22);
  background: rgba(255, 255, 255, 0.96);
}

.wealth-scout__slider-card--compact {
  max-width: 32rem;
}

.wealth-scout__slider-head span,
.wealth-scout__summary-card span,
.wealth-scout__result-metrics span,
.wealth-scout__detail-card span {
  color: #6481a6;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-scout__slider {
  width: 100%;
}

.wealth-scout__slider-scale {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: #6a819f;
  font-size: 0.8rem;
}

.wealth-scout__portfolio {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-scout__allocation {
  display: grid;
  gap: 0.6rem;
  padding: 0.95rem;
}

.wealth-scout__allocation.is-locked {
  border-color: rgba(23, 48, 80, 0.32);
}

.wealth-scout__allocation-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #173050;
}

.wealth-scout__allocation-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.wealth-scout__lock-btn {
  border: 1px solid rgba(154, 174, 204, 0.28);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  background: rgba(255, 255, 255, 0.96);
  color: #48627f;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.wealth-scout__lock-btn.is-active {
  border-color: rgba(23, 48, 80, 0.9);
  background: rgba(232, 242, 255, 0.96);
  color: #173050;
}

.wealth-scout__swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

.wealth-scout__allocation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 0.75rem;
}

.wealth-scout__allocation-controls input,
.wealth-scout__range-grid select,
.wealth-scout__price-input-grid input {
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.2);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-scout__allocation-controls input[type='range'] {
  min-height: 0;
  padding-inline: 0;
}

.wealth-scout__custom-range {
  display: grid;
  gap: 0.8rem;
}

.wealth-scout__toggle-row {
  align-items: center;
  padding: 1rem 1.05rem;
}

.wealth-scout__toggle-row span {
  display: grid;
  gap: 0.2rem;
}

.wealth-scout__range-grid label {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-scout__range-grid--single {
  max-width: 28rem;
}

.wealth-scout__result-card {
  overflow: hidden;
}

.wealth-scout__result-main {
  align-items: stretch;
  padding: 1rem;
  border: 0;
  background: transparent;
}

.wealth-scout__result-rank {
  width: 4rem;
  min-width: 4rem;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  color: #1d4ed8;
  font-weight: 700;
}

.wealth-scout__result-copy,
.wealth-scout__detail {
  display: grid;
  gap: 0.9rem;
  flex: 1 1 auto;
}

.wealth-scout__result-head strong {
  color: #0f766e;
  white-space: nowrap;
}

.wealth-scout__result-metrics {
  flex-wrap: wrap;
}

.wealth-scout__result-metrics div {
  flex: 1 1 10rem;
  display: grid;
  gap: 0.18rem;
  padding: 0.85rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
}

.wealth-scout__detail {
  padding: 0 1rem 1rem;
}

.wealth-scout__detail strong.is-positive {
  color: #0f766e;
}

.wealth-scout__detail strong.is-negative {
  color: #b42318;
}

.wealth-scout__empty {
  display: grid;
  gap: 0.6rem;
  padding: 1.1rem;
}

.wealth-scout__footer {
  align-items: center;
}

.wealth-scout__nav {
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 999px;
  padding: 0.78rem 1.05rem;
  font: inherit;
  cursor: pointer;
}

.wealth-scout__nav--secondary {
  background: rgba(244, 248, 255, 0.96);
  color: #27415f;
}

.wealth-scout__nav--primary {
  background: linear-gradient(135deg, #8fd3ff, #bce4ff);
  color: #0f2848;
}

.wealth-scout__nav:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wealth-scout-slide-next-enter-active,
.wealth-scout-slide-next-leave-active,
.wealth-scout-slide-back-enter-active,
.wealth-scout-slide-back-leave-active,
.wealth-scout-reveal-enter-active,
.wealth-scout-reveal-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 220ms ease;
}

.wealth-scout-slide-next-enter-from,
.wealth-scout-slide-back-leave-to {
  opacity: 0;
  transform: translateX(26px);
}

.wealth-scout-slide-next-leave-to,
.wealth-scout-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}

.wealth-scout-reveal-enter-from,
.wealth-scout-reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

@keyframes wealth-scout-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .wealth-scout__hero,
  .wealth-scout__question-head,
  .wealth-scout__result-head,
  .wealth-scout__result-main,
  .wealth-scout__footer,
  .wealth-scout__detail-metrics,
  .wealth-scout__charts,
  .wealth-scout__summary-grid,
  .wealth-scout__price-input-grid,
  .wealth-scout__portfolio,
  .wealth-scout__choice-grid--three,
  .wealth-scout__choice-grid--two,
  .wealth-scout__range-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .wealth-scout__panel {
    min-height: calc(100vh - 16rem);
  }

  .wealth-scout__question-head {
    padding-inline: 1rem;
  }

  .wealth-scout__result-rank {
    width: 100%;
    min-width: 0;
    min-height: 3rem;
  }
}

@media (max-width: 720px) {
  .wealth-scout {
    padding: 1rem;
  }

  .wealth-scout__panel {
    min-height: calc(100vh - 14rem);
  }

  .wealth-scout__allocation-controls {
    grid-template-columns: 1fr;
  }

  .wealth-scout__question-index {
    right: 1rem;
  }
}
</style>
