<template>
  <article class="wealth-page">
    <RouterLink to="/projects" class="wealth-back">&larr; Back to projects</RouterLink>

    <section class="wealth-hero">
      <div class="wealth-hero__copy">
        <p class="wealth-kicker">Australian wealth pathways calculator</p>
        <h1>{{ project.title }}</h1>
        <p class="wealth-tagline">{{ project.tagline }}</p>
        <p class="wealth-copy">
          Start with an optional live-at-home runway, choose the portfolio mix, then compare three move-out paths:
          rent + invest, buy to live in, or buy as an investment while renting.
        </p>

        <div class="wealth-tags">
          <CategoryTag :category="project.category" />
          <span v-for="tag in project.tags" :key="tag" class="tag wealth-tag">{{ tag }}</span>
        </div>

        <div class="wealth-hero__stats">
          <div>
            <span>Defaults</span>
            <strong>{{ wealthSimulationMetadata.version }} - {{ wealthSimulationMetadata.lastUpdated }}</strong>
          </div>
          <div>
            <span>Horizon</span>
            <strong>{{ form.profile.horizonYears }} years</strong>
          </div>
        </div>
      </div>

      <div class="wealth-hero__panel">
        <p class="wealth-kicker">Workflow</p>
        <h2>{{ currentStage === 1 ? 'Stage 1: Fill inputs' : 'Stage 2: Explore results' }}</h2>
        <p class="wealth-copy">
          {{
            currentStage === 1
              ? 'Set the live-at-home plan, portfolio mix, and property intention. When you are ready, generate the results stage.'
              : 'Hover the charts for exact values and click any scenario chip to grey it out or bring it back into focus.'
          }}
        </p>

        <div class="wealth-stage-tabs">
          <button
            type="button"
            class="wealth-stage-tab"
            :class="{ 'is-active': currentStage === 1 }"
            @click="goToInputs"
          >
            1. Inputs
          </button>
          <button
            type="button"
            class="wealth-stage-tab"
            :class="{ 'is-active': currentStage === 2 }"
            :disabled="!result"
            @click="goToResults"
          >
            2. Results
          </button>
        </div>

        <div class="wealth-hero__mini">
          <div>
            <span>Status</span>
            <strong>{{ loading ? 'Running' : resultsStale ? 'Inputs changed' : 'Ready' }}</strong>
          </div>
          <div>
            <span>Last run</span>
            <strong>{{ lastRunAt || 'Not yet run' }}</strong>
          </div>
          <div>
            <span>Current lead</span>
            <strong>{{ bestMedianStrategy ? bestMedianStrategy.label : 'Pending' }}</strong>
          </div>
          <div>
            <span>Note</span>
            <strong>Not financial advice</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="wealth-banner">
      <p>
        The model uses simplified Australian tax, property, and return assumptions. It is for scenario comparison rather
        than advice, delays property entry until the deposit is actually affordable, and invests surplus cash for the ownership pathways.
      </p>
      <span class="wealth-pill" :class="{ 'is-live': !loading && !resultsStale && !errorMessage }">
        {{ loading ? 'Simulation running' : errorMessage ? 'Review inputs' : resultsStale ? 'Results out of date' : 'Simulation ready' }}
      </span>
    </section>

    <div v-if="errorMessage" class="wealth-error">{{ errorMessage }}</div>

    <section v-if="currentStage === 1" class="wealth-stage wealth-stage--inputs">
      <div class="wealth-input-layout">
        <div class="wealth-form-stack">
          <details class="wealth-panel" open>
            <summary>Profile</summary>
            <div class="wealth-panel__body">
              <label class="wealth-range">
                <span v-bind="labelAttrs('horizonYears')">Time horizon</span>
                <div class="wealth-range__row">
                  <input
                    data-testid="horizon-years"
                    v-model.number="form.profile.horizonYears"
                    v-bind="valueAttrs('horizonYears')"
                    type="range"
                    min="10"
                    max="30"
                    step="1"
                  />
                  <input v-model.number="form.profile.horizonYears" v-bind="valueAttrs('horizonYears')" type="number" min="10" max="30" step="1" />
                </div>
              </label>

              <div class="wealth-grid">
                <label>
                  <span v-bind="labelAttrs('startingSavings')">Starting savings</span>
                  <input v-model.number="form.profile.startingSavings" v-bind="valueAttrs('startingSavings')" type="number" min="0" step="1000" />
                </label>
                <label>
                  <span v-bind="labelAttrs('annualIncome')">Gross income</span>
                  <input v-model.number="form.profile.annualIncome" v-bind="valueAttrs('annualIncome')" type="number" min="0" step="1000" />
                </label>
                <label>
                  <span v-bind="labelAttrs('incomeGrowthRate')">Income growth %</span>
                  <input v-model.number="profileIncomeGrowthPct" v-bind="valueAttrs('incomeGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('weeklyAvailableToSave')">Weekly investable cash</span>
                  <input v-model.number="form.profile.weeklyAvailableToSave" v-bind="valueAttrs('weeklyAvailableToSave')" type="number" min="0" step="25" />
                </label>
              </div>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>Housing plan</summary>
            <div class="wealth-panel__body">
              <div class="wealth-grid">
                <label>
                  <span v-bind="labelAttrs('targetPropertyType')">Property intention</span>
                  <select v-model="form.propertyConfig.targetPropertyType" v-bind="valueAttrs('targetPropertyType')">
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                  </select>
                </label>
                <label class="wealth-toggle wealth-toggle--card">
                  <input data-testid="live-at-home-toggle" v-model="form.housingCosts.liveAtHome" v-bind="valueAttrs('liveAtHome')" type="checkbox" />
                  <span v-bind="labelAttrs('liveAtHome')">Live at home first</span>
                </label>
                <label>
                  <span v-bind="labelAttrs('weeklyRent')">Move-out weekly rent</span>
                  <input v-model.number="form.housingCosts.weeklyRent" v-bind="valueAttrs('weeklyRent')" type="number" min="0" step="10" />
                </label>
                <label>
                  <span v-bind="labelAttrs('rentGrowthRate')">Rent growth %</span>
                  <input v-model.number="rentGrowthPct" v-bind="valueAttrs('rentGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label v-if="form.housingCosts.liveAtHome">
                  <span v-bind="labelAttrs('liveAtHomeYears')">Years living at home</span>
                  <input
                    v-model.number="form.housingCosts.liveAtHomeYears"
                    v-bind="valueAttrs('liveAtHomeYears')"
                    type="number"
                    min="1"
                    :max="Math.max(1, form.profile.horizonYears - 1)"
                    step="1"
                  />
                </label>
                <label v-if="form.housingCosts.liveAtHome">
                  <span v-bind="labelAttrs('weeklyBoardAtHome')">Weekly board at home</span>
                  <input v-model.number="form.housingCosts.weeklyBoardAtHome" v-bind="valueAttrs('weeklyBoardAtHome')" type="number" min="0" step="10" />
                </label>
                <label v-if="form.housingCosts.liveAtHome">
                  <span v-bind="labelAttrs('boardGrowthRate')">Board growth %</span>
                  <input v-model.number="boardGrowthPct" v-bind="valueAttrs('boardGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
              </div>

              <p class="wealth-field-note wealth-field-note--section">
                After the live-at-home period ends, every path assumes you move out. The selected {{ targetPropertyLabel.toLowerCase() }}
                settings drive both property strategies and the affordability signal shown on the right.
              </p>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>Portfolio</summary>
            <div class="wealth-panel__body">
              <label class="wealth-range">
                <span v-bind="labelAttrs('bondWeight')">Bond allocation</span>
                <div class="wealth-range__row">
                  <input
                    data-testid="bond-allocation"
                    v-model.number="bondWeightPct"
                    v-bind="valueAttrs('bondWeight')"
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                  />
                  <input v-model.number="bondWeightPct" v-bind="valueAttrs('bondWeight')" type="number" min="0" max="40" step="1" />
                </div>
              </label>

              <label class="wealth-range">
                <span v-bind="labelAttrs('asxEquitySplit')">ASX share of equities</span>
                <div class="wealth-range__row">
                  <input v-model.number="asxEquitySplitPct" v-bind="valueAttrs('asxEquitySplit')" type="range" min="0" max="100" step="1" />
                  <input v-model.number="asxEquitySplitPct" v-bind="valueAttrs('asxEquitySplit')" type="number" min="0" max="100" step="1" />
                </div>
              </label>

              <div class="wealth-mini-grid">
                <div><span>ASX</span><strong>{{ formatPercent(form.portfolioConfig.asxWeight) }}</strong></div>
                <div><span>QQQ</span><strong>{{ formatPercent(form.portfolioConfig.qqqWeight) }}</strong></div>
                <div><span>Bonds</span><strong>{{ formatPercent(form.portfolioConfig.bondWeight) }}</strong></div>
              </div>

              <div class="wealth-grid wealth-grid--compact">
                <label>
                  <span v-bind="labelAttrs('asxReturnMean')">ASX return %</span>
                  <input v-model.number="asxReturnPct" v-bind="valueAttrs('asxReturnMean')" type="number" min="0" max="20" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('qqqReturnMean')">QQQ return %</span>
                  <input v-model.number="qqqReturnPct" v-bind="valueAttrs('qqqReturnMean')" type="number" min="0" max="25" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('bondReturnMean')">Bond return %</span>
                  <input v-model.number="bondReturnPct" v-bind="valueAttrs('bondReturnMean')" type="number" min="0" max="12" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('asxDividendYield')">ASX dividend %</span>
                  <input v-model.number="asxDividendPct" v-bind="valueAttrs('asxDividendYield')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('bondIncomeYield')">Bond income %</span>
                  <input v-model.number="bondIncomePct" v-bind="valueAttrs('bondIncomeYield')" type="number" min="0" max="8" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('qqqDividendYield')">QQQ dividend %</span>
                  <input v-model.number="qqqDividendPct" v-bind="valueAttrs('qqqDividendYield')" type="number" min="0" max="5" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('asxFrankingPct')">ASX franking %</span>
                  <input v-model.number="asxFrankingPct" v-bind="valueAttrs('asxFrankingPct')" type="number" min="0" max="100" step="1" />
                </label>
              </div>

              <p class="wealth-field-note wealth-field-note--section">
                ASX, QQQ, bond returns, dividend rates, and property growth rates stay as the baseline assumptions.
                Monte Carlo samples stronger and weaker market and property years around those means behind the scenes.
              </p>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>Property and tax rules</summary>
            <div class="wealth-panel__body">
              <label class="wealth-toggle">
                <input data-testid="fhb-toggle" v-model="form.propertyConfig.firstHomeBuyerEligible" v-bind="valueAttrs('firstHomeBuyerEligible')" type="checkbox" />
                <span v-bind="labelAttrs('firstHomeBuyerEligible')">Apply first-home-buyer support</span>
              </label>
              <p v-if="form.propertyConfig.firstHomeBuyerEligible" class="wealth-field-note wealth-field-note--section">
                First-home-buyer support now applies the reduced duty and grant settings plus a modeled 5% deposit,
                so the upfront cash is lower but the loan and repayments are higher.
              </p>
              <div class="wealth-grid wealth-grid--compact">
                <label>
                  <span v-bind="labelAttrs('rentYield')">Rent yield %</span>
                  <input v-model.number="rentYieldPct" v-bind="valueAttrs('rentYield')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('vacancyRate')">Vacancy %</span>
                  <input v-model.number="vacancyPct" v-bind="valueAttrs('vacancyRate')" type="number" min="0" max="15" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('propertyManagementPct')">Management fee %</span>
                  <input v-model.number="managementPct" v-bind="valueAttrs('propertyManagementPct')" type="number" min="0" max="15" step="0.1" />
                </label>
              </div>

              <p class="wealth-field-note wealth-field-note--section">
                These assumptions are used by the "{{ targetPropertyLabel }} as investment + rent" pathway once you have moved out.
              </p>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>House and apartment assumptions</summary>
            <div class="wealth-panel__body wealth-property-grid">
              <section>
                <h4>House <small v-if="targetPropertyKey === 'house'" class="wealth-inline-note">selected</small></h4>
                <div class="wealth-grid wealth-grid--compact">
                  <label>
                    <span v-bind="labelAttrs('housePurchasePrice')">Price</span>
                    <input v-model.number="form.propertyConfig.house.purchasePrice" v-bind="valueAttrs('housePurchasePrice')" type="number" min="0" step="1000" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseDepositPct')">Deposit %</span>
                    <input
                      v-if="!form.propertyConfig.firstHomeBuyerEligible"
                      v-model.number="houseDepositPct"
                      v-bind="valueAttrs('houseDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                    <input
                      v-else
                      :value="houseEffectiveDepositPctInput"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      disabled
                    />
                    <small v-if="form.propertyConfig.firstHomeBuyerEligible" class="wealth-field-note">
                      Locked to 5% while first-home-buyer support is on.
                    </small>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseMortgageYears')">Mortgage term</span>
                    <select v-model.number="form.propertyConfig.house.mortgageYears">
                      <option v-for="years in mortgageYearOptions" :key="`house-${years}`" :value="years">{{ years }} years</option>
                    </select>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseInterestRate')">Rate %</span>
                    <input v-model.number="houseRatePct" v-bind="valueAttrs('houseInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseLongRunInterestRate')">Long-run rate %</span>
                    <input v-model.number="houseLongRunRatePct" v-bind="valueAttrs('houseLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                    <small class="wealth-field-note">{{ houseLongRunRateNote }}</small>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseGrowthMean')">Growth %</span>
                    <input v-model.number="houseGrowthPct" v-bind="valueAttrs('houseGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseStampDuty')">Stamp duty</span>
                    <input v-model.number="form.propertyConfig.house.stampDuty" v-bind="valueAttrs('houseStampDuty')" type="number" min="0" step="100" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseAnnualCosts')">Base annual costs</span>
                    <input v-model.number="houseAnnualCosts" v-bind="valueAttrs('houseAnnualCosts')" type="number" min="0" step="100" />
                  </label>
                </div>
                <div class="wealth-cost-breakdown">
                  <div>
                    <span>Council rates</span>
                    <strong>{{ formatCurrency(form.propertyConfig.house.councilRates) }}</strong>
                    <small>{{ houseAnnualCostFormula.council }}</small>
                  </div>
                  <div>
                    <span>Insurance</span>
                    <strong>{{ formatCurrency(form.propertyConfig.house.insurance) }}</strong>
                    <small>{{ houseAnnualCostFormula.insurance }}</small>
                  </div>
                  <div>
                    <span>Maintenance</span>
                    <strong>{{ formatCurrency(form.propertyConfig.house.maintenance) }}</strong>
                    <small>{{ houseAnnualCostFormula.maintenance }}</small>
                  </div>
                </div>
              </section>

              <section>
                <h4>Apartment <small v-if="targetPropertyKey === 'apartment'" class="wealth-inline-note">selected</small></h4>
                <div class="wealth-grid wealth-grid--compact">
                  <label>
                    <span v-bind="labelAttrs('apartmentPurchasePrice')">Price</span>
                    <input v-model.number="form.propertyConfig.apartment.purchasePrice" v-bind="valueAttrs('apartmentPurchasePrice')" type="number" min="0" step="1000" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentDepositPct')">Deposit %</span>
                    <input
                      v-if="!form.propertyConfig.firstHomeBuyerEligible"
                      v-model.number="apartmentDepositPct"
                      v-bind="valueAttrs('apartmentDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                    <input
                      v-else
                      :value="apartmentEffectiveDepositPctInput"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                      disabled
                    />
                    <small v-if="form.propertyConfig.firstHomeBuyerEligible" class="wealth-field-note">
                      Locked to 5% while first-home-buyer support is on.
                    </small>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentMortgageYears')">Mortgage term</span>
                    <select v-model.number="form.propertyConfig.apartment.mortgageYears">
                      <option v-for="years in mortgageYearOptions" :key="`apartment-${years}`" :value="years">{{ years }} years</option>
                    </select>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentInterestRate')">Rate %</span>
                    <input v-model.number="apartmentRatePct" v-bind="valueAttrs('apartmentInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentLongRunInterestRate')">Long-run rate %</span>
                    <input v-model.number="apartmentLongRunRatePct" v-bind="valueAttrs('apartmentLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                    <small class="wealth-field-note">{{ apartmentLongRunRateNote }}</small>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentGrowthMean')">Growth %</span>
                    <input v-model.number="apartmentGrowthPct" v-bind="valueAttrs('apartmentGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentStampDuty')">Stamp duty</span>
                    <input v-model.number="form.propertyConfig.apartment.stampDuty" v-bind="valueAttrs('apartmentStampDuty')" type="number" min="0" step="100" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentAnnualCosts')">Base annual costs</span>
                    <input v-model.number="apartmentAnnualCosts" v-bind="valueAttrs('apartmentAnnualCosts')" type="number" min="0" step="100" />
                  </label>
                </div>
                <div class="wealth-cost-breakdown wealth-cost-breakdown--four">
                  <div>
                    <span>Council rates</span>
                    <strong>{{ formatCurrency(form.propertyConfig.apartment.councilRates) }}</strong>
                    <small>{{ apartmentAnnualCostFormula.council }}</small>
                  </div>
                  <div>
                    <span>Insurance</span>
                    <strong>{{ formatCurrency(form.propertyConfig.apartment.insurance) }}</strong>
                    <small>{{ apartmentAnnualCostFormula.insurance }}</small>
                  </div>
                  <div>
                    <span>Maintenance</span>
                    <strong>{{ formatCurrency(form.propertyConfig.apartment.maintenance) }}</strong>
                    <small>{{ apartmentAnnualCostFormula.maintenance }}</small>
                  </div>
                  <div>
                    <span>Strata</span>
                    <strong>{{ formatCurrency(form.propertyConfig.apartment.strata) }}</strong>
                    <small>{{ apartmentAnnualCostFormula.strata }}</small>
                  </div>
                </div>
              </section>
            </div>
          </details>
        </div>

        <div class="wealth-stage-card">
          <section class="wealth-card">
            <p class="wealth-kicker">What happens in stage 2</p>
            <h3>Interactive charts and scenario focus</h3>
            <p class="wealth-copy">
              Hover either chart to inspect exact values. Click a scenario chip like Rent + Invest to grey it out, or
              click again to bring it back into focus.
            </p>
          </section>

          <section class="wealth-card">
            <p class="wealth-kicker">Affordability snapshot</p>
            <h3>{{ targetPropertyLabel }} entry requirements today</h3>
            <div class="wealth-mini-grid wealth-mini-grid--dense">
              <div>
                <span>Upfront now</span>
                <strong>{{ formatCurrency(selectedPropertySnapshot.upfront) }}</strong>
              </div>
              <div>
                <span>Loan now</span>
                <strong>{{ formatCurrency(selectedPropertySnapshot.loan) }}</strong>
              </div>
              <div>
                <span>Live and own today</span>
                <strong>{{ affordabilitySummary.ownerAffordable ? 'Yes' : 'No' }}</strong>
              </div>
              <div>
                <span>Investment + rent today</span>
                <strong>{{ affordabilitySummary.rentvestAffordable ? 'Yes' : 'No' }}</strong>
              </div>
            </div>
            <p class="wealth-field-note wealth-field-note--section">
              Deposit ready: {{ affordabilitySummary.depositReady ? 'Yes' : 'No' }}. Owner-occupier carry uses
              {{ formatCurrency(affordabilitySummary.ownerCarry) }} per year. Investment + rent uses
              {{ formatCurrency(affordabilitySummary.rentvestCarry) }} per year against
              {{ formatCurrency(affordabilitySummary.annualSavingsCapacity) }} of annual housing capacity.
            </p>
          </section>

          <section class="wealth-card">
            <p class="wealth-kicker">Next step</p>
            <h3>Generate the results stage</h3>
            <p class="wealth-copy">
              The simulation will use the current inputs and move you into the chart stage. If you come back and change
              assumptions later, the results will be marked stale until you rerun them.
            </p>
            <button type="button" class="wealth-primary-btn" data-testid="continue-results" @click="generateResults">
              {{ loading ? 'Running simulation...' : 'Continue to results' }}
            </button>
          </section>
        </div>
      </div>
    </section>

    <section v-else class="wealth-stage wealth-stage--results">
      <div class="wealth-results-toolbar">
        <button type="button" class="wealth-secondary-btn" data-testid="edit-inputs" @click="goToInputs">Edit assumptions</button>
        <button type="button" class="wealth-primary-btn" data-testid="rerun-results" @click="rerunResults">
          {{ loading ? 'Running simulation...' : 'Recalculate with current inputs' }}
        </button>
        <span v-if="mutedStrategyLabels" class="wealth-filter-note">
          Greyed out: {{ mutedStrategyLabels }}
        </span>
      </div>

      <section class="wealth-summary-grid">
        <article class="wealth-card">
          <p class="wealth-kicker">Median winner</p>
          <h3>{{ bestMedianStrategy ? bestMedianStrategy.label : 'Running simulation...' }}</h3>
          <p class="wealth-copy">
            {{
              bestMedianStrategy
                ? `${bestMedianStrategy.label} finishes with a median net worth of ${formatCurrency(bestMedianStrategy.summary.finalMedianNetWorth)}.`
                : 'Waiting for the first completed run.'
            }}
          </p>
        </article>
        <article class="wealth-card">
          <p class="wealth-kicker">Best downside case</p>
          <h3>{{ downsideLeader ? downsideLeader.label : 'Running simulation...' }}</h3>
          <p class="wealth-copy">
            {{
              downsideLeader
                ? `${downsideLeader.label} keeps the strongest 10th-percentile result at ${formatCurrency(downsideLeader.summary.downsideRisk)}.`
                : 'Downside results will appear after the first run.'
            }}
          </p>
        </article>
        <article class="wealth-card">
          <p class="wealth-kicker">Breakeven vs rent + invest</p>
          <h3>{{ breakevenSummary.title }}</h3>
          <p class="wealth-copy">{{ breakevenSummary.body }}</p>
        </article>
      </section>

      <WealthLineChart
        title="Net worth projection bands"
        subtitle="Hover to inspect exact values. Click a chip to grey out a scenario without removing the others."
        kicker="Outcome distribution"
        :series="netWorthSeries"
        :muted-series-ids="mutedStrategyKeys"
        @toggle-series="toggleStrategy"
      />

      <div class="wealth-dashboard-grid">
        <WealthCompositionBars
          title="Final-year balance composition"
          subtitle="Median liquid assets, housing equity, and remaining debt at the end of the chosen horizon."
          :rows="compositionRows"
        />

        <section class="wealth-card wealth-card--scroll">
          <p class="wealth-kicker">Strategy readout</p>
          <h3>How the pathways finish</h3>
          <div class="wealth-strategy-list">
            <article v-for="strategy in strategyCards" :key="strategy.key" class="wealth-strategy-item">
              <div class="wealth-strategy-item__top">
                <div class="wealth-strategy-item__title">
                  <span class="wealth-swatch" :style="{ background: strategy.color }"></span>
                  <strong>{{ strategy.label }}</strong>
                </div>
                <span>{{ strategy.summary.finalMedianDisplay }}</span>
              </div>
              <p class="wealth-copy">{{ strategy.description }}</p>
              <div class="wealth-strategy-item__meta">
                <span>Downside {{ formatCurrency(strategy.summary.downsideRisk) }}</span>
                <span>
                  {{
                    strategy.breakevenYear === null
                      ? 'No median overtake'
                      : `Beats rent in year ${strategy.breakevenYear}`
                  }}
                </span>
              </div>
              <div v-if="strategy.purchaseYear !== null" class="wealth-strategy-item__meta">
                <span>Buys in year {{ strategy.purchaseYear }}</span>
                <span>{{ strategy.purchaseNote }}</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <WealthLineChart
        title="Annual cashflow pressure"
        subtitle="Median annual housing-linked cash outflow. Lower is easier to carry."
        kicker="Cashflow"
        :series="cashflowSeries"
        :muted-series-ids="mutedStrategyKeys"
        @toggle-series="toggleStrategy"
      />

      <section class="wealth-strategy-grid">
        <article v-for="strategy in strategyCards" :key="`${strategy.key}-grid`" class="wealth-card">
          <div class="wealth-strategy-item__top">
            <div class="wealth-strategy-item__title">
              <span class="wealth-swatch" :style="{ background: strategy.color }"></span>
              <strong>{{ strategy.label }}</strong>
            </div>
            <span>{{ strategy.shortLabel }}</span>
          </div>

          <div class="wealth-mini-grid wealth-mini-grid--dense">
            <div>
              <span>Median final wealth</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianNetWorth) }}</strong>
            </div>
            <div>
              <span>P10 outcome</span>
              <strong>{{ formatCurrency(strategy.summary.downsideRisk) }}</strong>
            </div>
            <div>
              <span>Liquid assets</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianLiquidAssets) }}</strong>
            </div>
            <div>
              <span>Home equity</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianHomeEquity) }}</strong>
            </div>
            <div>
              <span>Debt remaining</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianDebt) }}</strong>
            </div>
            <div>
              <span>Cashflow drag</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianCashOutflow) }}</strong>
            </div>
          </div>
        </article>
      </section>

      <section class="wealth-methodology">
        <details class="wealth-panel" open>
          <summary>Assumptions and rule notes</summary>
          <div class="wealth-panel__body wealth-method-grid">
            <section v-for="section in wealthAssumptionSections" :key="section.title">
              <h4>{{ section.title }}</h4>
              <ul>
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>
        </details>

        <details class="wealth-panel" open>
          <summary>Default input sources</summary>
          <div class="wealth-panel__body wealth-source-list">
            <article v-for="source in wealthSimulationMetadata.sources" :key="source.label">
              <h4>{{ source.label }}</h4>
              <p class="wealth-copy">{{ source.detail }}</p>
            </article>
          </div>
        </details>
      </section>
    </section>
  </article>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryTag from '../components/CategoryTag.vue'
import WealthLineChart from '../components/wealth/WealthLineChart.vue'
import WealthCompositionBars from '../components/wealth/WealthCompositionBars.vue'
import { cloneSimulationRequest, wealthAssumptionSections, wealthSimulationMetadata, wealthStrategyOrder } from '../data/wealthDefaults.js'
import { calculateAnnualMortgagePayment, calculatePurchaseCosts, clamp, estimateLmi, getAustralianTaxBreakdown, getEffectiveDepositPct } from '../wealth/finance.js'
import { WealthSimulationClient } from '../wealth/client.js'

const props = defineProps({
  project: { type: Object, required: true }
})

const labelHelp = {
  horizonYears: 'How many years the model runs for. Longer horizons give ownership and compounding more time to separate.',
  startingSavings: 'Cash already available on day one. It can fund a deposit, buying costs, or the starting investment balance.',
  annualIncome: 'Gross annual salary before tax. The model estimates take-home pay from this figure each year.',
  incomeGrowthRate: 'Expected annual growth in your gross income. This lifts future take-home pay and the cash available to save.',
  weeklyAvailableToSave: 'Weekly surplus available after normal living spending. This becomes the core amount directed to investing or ownership costs.',
  liveAtHome: 'If enabled, every pathway starts with a period living at home before moving into the main strategy.',
  liveAtHomeYears: 'How long you stay at home before the model forces a move into renting or the selected property pathway.',
  weeklyRent: 'Weekly rent assumed once you have moved out or for any strategy that keeps you renting.',
  rentGrowthRate: 'Expected annual rent inflation. The simulation also adds year-to-year variation around this baseline.',
  weeklyBoardAtHome: 'Weekly board or household contribution paid while living at home.',
  boardGrowthRate: 'Expected annual increase in at-home living costs, with some annual variation layered on in the simulation.',
  targetPropertyType: 'Select whether the property pathways and affordability check should use the house or apartment assumptions.',
  bondWeight: 'Portfolio share held in bonds. Raising this usually lowers expected return and smooths the overall portfolio path.',
  asxEquitySplit: 'How the equity portion is split between ASX and QQQ after the bond allocation is set.',
  asxReturnMean: 'The expected average annual return of the ASX allocation.',
  qqqReturnMean: 'The expected average annual return of the QQQ allocation.',
  bondReturnMean: 'Baseline long-run annual bond return used as the centre of the bond distribution.',
  asxDividendYield: 'Cash distribution yield assumed for the ASX sleeve. It contributes to recurring income and simplified portfolio tax.',
  bondIncomeYield: 'Income yield for the bond sleeve. This feeds recurring income and tax drag in the model.',
  qqqDividendYield: 'Cash distribution yield assumed for the QQQ sleeve. It is kept low because most return is modeled as capital growth.',
  asxFrankingPct: 'Share of ASX dividends assumed to arrive with franking credits. This offsets some tax drag in the simplified tax model.',
  firstHomeBuyerEligible: 'Turns on the built-in first-home-buyer duty reduction, grant assumptions, and the modeled 5 percent deposit path for property purchases.',
  rentYield: 'Gross rental yield used in the investment-property plus rent scenario.',
  vacancyRate: 'Share of rent lost to vacancy when the selected property is used as an investment.',
  propertyManagementPct: 'Property manager fee applied to rental income in the investment-property path.',
  housePurchasePrice: 'Current house purchase price used to size the deposit, loan, buying costs, and later capital growth.',
  houseDepositPct: 'Deposit share for the house purchase. Lower deposits increase leverage and can trigger lenders mortgage insurance.',
  houseMortgageYears: 'Length of the house mortgage used for amortization and repayment calculations.',
  houseInterestRate: 'Starting mortgage rate for the house path before the simulation drifts toward the long-run rate.',
  houseLongRunInterestRate: 'Steadier mortgage rate assumption used after the opening years. It represents a normalized mortgage setting rather than today\'s spot rate.',
  houseGrowthMean: 'Baseline annual house price growth used for the house path.',
  houseStampDuty: 'Upfront transfer duty added to buying costs. First-home-buyer support can reduce the effective amount.',
  houseAnnualCosts: 'Base annual non-mortgage holding cost used to derive council rates, insurance, and maintenance.',
  apartmentPurchasePrice: 'Current apartment purchase price used to size the deposit, loan, buying costs, and later capital growth.',
  apartmentDepositPct: 'Deposit share for the apartment purchase. Lower deposits increase leverage and can trigger lenders mortgage insurance.',
  apartmentMortgageYears: 'Length of the apartment mortgage used for amortization and repayment calculations.',
  apartmentInterestRate: 'Starting mortgage rate for the apartment path before drifting toward the long-run rate.',
  apartmentLongRunInterestRate: 'Steadier mortgage rate assumption used after the opening years for apartments.',
  apartmentGrowthMean: 'Baseline annual apartment price growth used for the apartment path.',
  apartmentStampDuty: 'Upfront transfer duty added to apartment buying costs. First-home-buyer support can reduce the effective amount.',
  apartmentAnnualCosts: 'Base annual non-mortgage holding cost used to derive council rates, insurance, maintenance, and strata.'
}

const valueHelp = {
  asxReturnMean: 'Based on the average of the last 15 years.',
  qqqReturnMean: 'Based on the average of the last 15 years.',
  bondReturnMean: 'Based on a long-run bond return baseline rather than a short-term rate print.',
  asxDividendYield: 'Based on a recent long-run ASX cash distribution average.',
  bondIncomeYield: 'Based on a representative long-run bond income yield.',
  qqqDividendYield: 'Based on a recent long-run QQQ cash distribution average.',
  houseLongRunInterestRate: 'Set below the opening mortgage rate to represent a steadier long-run borrowing environment.',
  apartmentLongRunInterestRate: 'Set below the opening mortgage rate to represent a steadier long-run borrowing environment.',
  houseAnnualCosts: 'This base annual cost is split into council rates, insurance, and maintenance using the formulas shown below.',
  apartmentAnnualCosts: 'This base annual cost is split into council rates, insurance, maintenance, and strata using the formulas shown below.'
}

const form = reactive(cloneSimulationRequest())
const result = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const lastRunAt = ref('')
const currentStage = ref(1)
const resultsStale = ref(true)
const mutedStrategyKeys = ref([])
const client = new WealthSimulationClient()
const mortgageYearOptions = [20, 25, 30]
let runToken = 0

function labelAttrs(key) {
  const help = labelHelp[key]
  return help
    ? {
        title: help,
        'aria-label': help
      }
    : {}
}

function valueAttrs(key) {
  const help = valueHelp[key]
  return help
    ? {
        title: help,
        'aria-label': help
      }
    : {}
}

function cloneRequest() {
  return JSON.parse(JSON.stringify(form))
}

async function runSimulation() {
  const token = ++runToken
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await client.run(cloneRequest())
    if (token !== runToken) return false
    result.value = response
    resultsStale.value = false
    lastRunAt.value = new Intl.DateTimeFormat('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date())
    return true
  } catch (error) {
    if (token !== runToken) return false
    errorMessage.value = error instanceof Error ? error.message : 'Simulation failed.'
    return false
  } finally {
    if (token === runToken) loading.value = false
  }
}

async function generateResults() {
  const ok = await runSimulation()
  if (ok) currentStage.value = 2
}

async function rerunResults() {
  await runSimulation()
}

function goToInputs() {
  currentStage.value = 1
}

function goToResults() {
  if (result.value) currentStage.value = 2
}

function toggleStrategy(id) {
  const next = new Set(mutedStrategyKeys.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  mutedStrategyKeys.value = wealthStrategyOrder.filter(key => next.has(key))
}

watch(form, () => {
  resultsStale.value = true
}, { deep: true })

watch(
  () => form.profile.horizonYears,
  (value) => {
    form.profile.horizonYears = Math.round(clamp(value, 10, 30))
    const maxLiveAtHomeYears = Math.max(0, form.profile.horizonYears - 1)
    if (form.housingCosts.liveAtHomeYears > maxLiveAtHomeYears) {
      form.housingCosts.liveAtHomeYears = maxLiveAtHomeYears
    }
  }
)

watch(
  () => form.housingCosts.liveAtHome,
  (enabled) => {
    if (!enabled) {
      form.housingCosts.liveAtHomeYears = 0
      return
    }

    if (form.housingCosts.liveAtHomeYears < 1) {
      form.housingCosts.liveAtHomeYears = 1
    }
  }
)

onBeforeUnmount(() => {
  client.destroy()
})

function percentProxy(getter, setter, min, max) {
  return computed({
    get: () => Number((getter() * 100).toFixed(1)),
    set: value => setter(clamp(Number(value) || 0, min, max) / 100)
  })
}

const profileIncomeGrowthPct = percentProxy(() => form.profile.incomeGrowthRate, value => { form.profile.incomeGrowthRate = value }, 0, 10)
const rentGrowthPct = percentProxy(() => form.housingCosts.rentGrowthRate, value => { form.housingCosts.rentGrowthRate = value }, 0, 10)
const boardGrowthPct = percentProxy(() => form.housingCosts.boardGrowthRate, value => { form.housingCosts.boardGrowthRate = value }, 0, 10)
const asxReturnPct = percentProxy(() => form.portfolioConfig.asxReturnMean, value => { form.portfolioConfig.asxReturnMean = value }, 0, 20)
const qqqReturnPct = percentProxy(() => form.portfolioConfig.qqqReturnMean, value => { form.portfolioConfig.qqqReturnMean = value }, 0, 25)
const bondReturnPct = percentProxy(() => form.portfolioConfig.bondReturnMean, value => { form.portfolioConfig.bondReturnMean = value }, 0, 12)
const asxDividendPct = percentProxy(() => form.portfolioConfig.asxDividendYield, value => { form.portfolioConfig.asxDividendYield = value }, 0, 10)
const bondIncomePct = percentProxy(() => form.portfolioConfig.bondIncomeYield, value => { form.portfolioConfig.bondIncomeYield = value }, 0, 8)
const qqqDividendPct = percentProxy(() => form.portfolioConfig.qqqDividendYield, value => { form.portfolioConfig.qqqDividendYield = value }, 0, 5)
const asxFrankingPct = percentProxy(() => form.portfolioConfig.asxFrankingPct, value => { form.portfolioConfig.asxFrankingPct = value }, 0, 100)
const rentYieldPct = percentProxy(() => form.propertyConfig.rentYield, value => { form.propertyConfig.rentYield = value }, 0, 10)
const vacancyPct = percentProxy(() => form.propertyConfig.vacancyRate, value => { form.propertyConfig.vacancyRate = value }, 0, 15)
const managementPct = percentProxy(() => form.propertyConfig.propertyManagementPct, value => { form.propertyConfig.propertyManagementPct = value }, 0, 15)
const houseDepositPct = percentProxy(() => form.propertyConfig.house.depositPct, value => { form.propertyConfig.house.depositPct = value }, 5, 80)
const apartmentDepositPct = percentProxy(() => form.propertyConfig.apartment.depositPct, value => { form.propertyConfig.apartment.depositPct = value }, 5, 80)
const houseRatePct = percentProxy(() => form.propertyConfig.house.interestRate, value => { form.propertyConfig.house.interestRate = value }, 1, 12)
const apartmentRatePct = percentProxy(() => form.propertyConfig.apartment.interestRate, value => { form.propertyConfig.apartment.interestRate = value }, 1, 12)
const houseLongRunRatePct = percentProxy(() => form.propertyConfig.house.longRunInterestRate, value => { form.propertyConfig.house.longRunInterestRate = value }, 1, 12)
const apartmentLongRunRatePct = percentProxy(() => form.propertyConfig.apartment.longRunInterestRate, value => { form.propertyConfig.apartment.longRunInterestRate = value }, 1, 12)
const houseGrowthPct = percentProxy(() => form.propertyConfig.house.growthMean, value => { form.propertyConfig.house.growthMean = value }, 0, 12)
const apartmentGrowthPct = percentProxy(() => form.propertyConfig.apartment.growthMean, value => { form.propertyConfig.apartment.growthMean = value }, 0, 12)
const houseEffectiveDepositPct = computed(() => getEffectiveDepositPct(form.propertyConfig.house, form.propertyConfig.firstHomeBuyerEligible))
const apartmentEffectiveDepositPct = computed(() => getEffectiveDepositPct(form.propertyConfig.apartment, form.propertyConfig.firstHomeBuyerEligible))
const houseEffectiveDepositPctInput = computed(() => Math.round(houseEffectiveDepositPct.value * 100))
const apartmentEffectiveDepositPctInput = computed(() => Math.round(apartmentEffectiveDepositPct.value * 100))

const targetPropertyKey = computed(() => form.propertyConfig.targetPropertyType === 'apartment' ? 'apartment' : 'house')
const targetPropertyLabel = computed(() => targetPropertyKey.value === 'apartment' ? 'Apartment' : 'House')
const targetPropertyConfig = computed(() => form.propertyConfig[targetPropertyKey.value])

const bondWeightPct = computed({
  get: () => Math.round(form.portfolioConfig.bondWeight * 100),
  set: value => {
    const bond = clamp(Number(value) || 0, 0, 40) / 100
    const equityShare = Math.max(0.0001, form.portfolioConfig.asxWeight + form.portfolioConfig.qqqWeight)
    const asxRatio = form.portfolioConfig.asxWeight / equityShare
    const newEquity = 1 - bond
    form.portfolioConfig.bondWeight = bond
    form.portfolioConfig.asxWeight = newEquity * asxRatio
    form.portfolioConfig.qqqWeight = newEquity * (1 - asxRatio)
  }
})

const asxEquitySplitPct = computed({
  get: () => {
    const equity = Math.max(0.0001, 1 - form.portfolioConfig.bondWeight)
    return Math.round((form.portfolioConfig.asxWeight / equity) * 100)
  },
  set: value => {
    const ratio = clamp(Number(value) || 0, 0, 100) / 100
    const equity = 1 - form.portfolioConfig.bondWeight
    form.portfolioConfig.asxWeight = equity * ratio
    form.portfolioConfig.qqqWeight = equity * (1 - ratio)
  }
})

const strategyCards = computed(() => {
  if (!result.value) return []
  const rent = result.value.strategies.rentInvest
  return wealthStrategyOrder.map((key) => {
    const strategy = result.value.strategies[key]
    let breakevenYear = null
    if (key !== 'rentInvest') {
      const hit = strategy.points.find(point => {
        const rentPoint = rent.points.find(candidate => candidate.year === point.year)
        return rentPoint && point.p50 >= rentPoint.p50
      })
      breakevenYear = hit ? hit.year : null
    }
    const purchasePoint = strategy.points.find(point => point.homeEquityP50 > 0)
    return {
      ...strategy,
      breakevenYear,
      purchaseYear: purchasePoint ? purchasePoint.year : null,
      purchaseNote: key === 'buyInvestmentProperty'
        ? 'Then shifts into rent plus investment-property cashflows'
        : 'Then shifts into owner-occupier cashflows'
    }
  })
})

const mutedStrategyLabels = computed(() =>
  strategyCards.value
    .filter(strategy => mutedStrategyKeys.value.includes(strategy.key))
    .map(strategy => strategy.label)
    .join(', ')
)

const bestMedianStrategy = computed(() =>
  strategyCards.value.reduce((best, strategy) =>
    !best || strategy.summary.finalMedianNetWorth > best.summary.finalMedianNetWorth ? strategy : best
  , null)
)

const downsideLeader = computed(() =>
  strategyCards.value.reduce((best, strategy) =>
    !best || strategy.summary.downsideRisk > best.summary.downsideRisk ? strategy : best
  , null)
)

const breakevenSummary = computed(() => {
  const winner = strategyCards.value
    .filter(strategy => strategy.key !== 'rentInvest' && strategy.breakevenYear !== null)
    .sort((a, b) => a.breakevenYear - b.breakevenYear)[0]

  if (!winner) {
    return {
      title: 'No overtake in the median path',
      body: 'For the current settings, rent + invest stays ahead of the property options on the median outcome path.'
    }
  }

  return {
    title: `${winner.label} in year ${winner.breakevenYear}`,
    body: `${winner.label} is the first non-renting strategy to overtake rent + invest on the median path.`
  }
})

const netWorthSeries = computed(() =>
  strategyCards.value.map(strategy => ({
    id: strategy.key,
    label: strategy.label,
    color: strategy.color,
    accent: strategy.accent,
    points: strategy.points.map(point => ({
      year: point.year,
      low: point.p10,
      mid: point.p50,
      high: point.p90
    }))
  }))
)

const cashflowSeries = computed(() =>
  strategyCards.value.map(strategy => ({
    id: strategy.key,
    label: strategy.shortLabel,
    color: strategy.color,
    accent: strategy.accent,
    points: strategy.points.map(point => ({
      year: point.year,
      low: point.annualCashOutflowP10,
      mid: point.annualCashOutflowP50,
      high: point.annualCashOutflowP90
    }))
  }))
)

const compositionRows = computed(() =>
  strategyCards.value.map(strategy => ({
    key: strategy.key,
    label: strategy.shortLabel,
    liquid: Math.max(0, strategy.summary.finalMedianLiquidAssets),
    equity: Math.max(0, strategy.summary.finalMedianHomeEquity),
    debt: Math.max(0, strategy.summary.finalMedianDebt),
    total: strategy.summary.finalMedianNetWorth
  }))
)

const propertySnapshots = computed(() => {
  const houseCosts = calculatePurchaseCosts(form.propertyConfig.house, form.propertyConfig.firstHomeBuyerEligible)
  const apartmentCosts = calculatePurchaseCosts(form.propertyConfig.apartment, form.propertyConfig.firstHomeBuyerEligible)
  const houseDeposit = form.propertyConfig.house.purchasePrice * houseEffectiveDepositPct.value
  const apartmentDeposit = form.propertyConfig.apartment.purchasePrice * apartmentEffectiveDepositPct.value
  return {
    house: {
      upfront: houseDeposit + houseCosts.total,
      loan: form.propertyConfig.house.purchasePrice - houseDeposit + estimateLmi(form.propertyConfig.house.purchasePrice, houseEffectiveDepositPct.value)
    },
    apartment: {
      upfront: apartmentDeposit + apartmentCosts.total,
      loan: form.propertyConfig.apartment.purchasePrice - apartmentDeposit + estimateLmi(form.propertyConfig.apartment.purchasePrice, apartmentEffectiveDepositPct.value)
    }
  }
})

const selectedPropertySnapshot = computed(() => propertySnapshots.value[targetPropertyKey.value])

const affordabilitySummary = computed(() => {
  const property = targetPropertyConfig.value
  const snapshot = selectedPropertySnapshot.value
  const annualSavingsCapacity = form.profile.weeklyAvailableToSave * 52
  const recurringCosts =
    property.councilRates +
    property.insurance +
    property.maintenance +
    property.strata
  const annualMortgagePayment = calculateAnnualMortgagePayment(snapshot.loan, property.interestRate, property.mortgageYears)
  const ownerCarry = annualMortgagePayment + recurringCosts
  const depositReady = form.profile.startingSavings >= snapshot.upfront

  const annualRent = form.housingCosts.weeklyRent * 52
  const rentIncome = property.purchasePrice * form.propertyConfig.rentYield * (1 - form.propertyConfig.vacancyRate)
  const managementFee = rentIncome * form.propertyConfig.propertyManagementPct
  const firstYearInterest = snapshot.loan * property.interestRate
  const propertyTaxImpact =
    (rentIncome - managementFee - recurringCosts - firstYearInterest) *
    getAustralianTaxBreakdown(form.profile.annualIncome).marginalRate
  const netPropertyCashflow =
    rentIncome -
    managementFee -
    recurringCosts -
    annualMortgagePayment -
    propertyTaxImpact
  const rentvestCarry = Math.max(0, annualRent - netPropertyCashflow)

  return {
    annualSavingsCapacity,
    depositReady,
    ownerCarry,
    rentvestCarry,
    ownerAffordable: depositReady && annualSavingsCapacity >= ownerCarry,
    rentvestAffordable: depositReady && annualSavingsCapacity >= rentvestCarry,
    ownerGap: Math.max(0, ownerCarry - annualSavingsCapacity),
    rentvestGap: Math.max(0, rentvestCarry - annualSavingsCapacity)
  }
})

const houseAnnualCosts = computed({
  get: () => Math.round(form.propertyConfig.house.councilRates + form.propertyConfig.house.insurance + form.propertyConfig.house.maintenance),
  set: value => {
    const total = Math.max(0, Number(value) || 0)
    form.propertyConfig.house.councilRates = total * 0.3
    form.propertyConfig.house.insurance = total * 0.2
    form.propertyConfig.house.maintenance = total * 0.5
  }
})

const apartmentAnnualCosts = computed({
  get: () => Math.round(
    form.propertyConfig.apartment.councilRates +
    form.propertyConfig.apartment.insurance +
    form.propertyConfig.apartment.maintenance +
    form.propertyConfig.apartment.strata
  ),
  set: value => {
    const total = Math.max(0, Number(value) || 0)
    form.propertyConfig.apartment.councilRates = total * 0.18
    form.propertyConfig.apartment.insurance = total * 0.1
    form.propertyConfig.apartment.maintenance = total * 0.14
    form.propertyConfig.apartment.strata = total * 0.58
  }
})

const houseLongRunRateNote = computed(() =>
  `Default rule of thumb: start near today\'s house rate, then ease toward a steadier long-run mortgage setting over time.`
)

const apartmentLongRunRateNote = computed(() =>
  `Default rule of thumb: start near today\'s apartment rate, then ease toward a steadier long-run mortgage setting over time.`
)

const houseAnnualCostFormula = computed(() => ({
  council: `${formatCurrency(houseAnnualCosts.value)} x 30%`,
  insurance: `${formatCurrency(houseAnnualCosts.value)} x 20%`,
  maintenance: `${formatCurrency(houseAnnualCosts.value)} x 50%`
}))

const apartmentAnnualCostFormula = computed(() => ({
  council: `${formatCurrency(apartmentAnnualCosts.value)} x 18%`,
  insurance: `${formatCurrency(apartmentAnnualCosts.value)} x 10%`,
  maintenance: `${formatCurrency(apartmentAnnualCosts.value)} x 14%`,
  strata: `${formatCurrency(apartmentAnnualCosts.value)} x 58%`
}))

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}
</script>

<style scoped>
.wealth-page {
  color: #173050;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding: 1.4rem 1rem 3rem;
  background:
    radial-gradient(circle at 15% 0%, rgba(125, 211, 252, 0.12), transparent 34%),
    radial-gradient(circle at 85% 10%, rgba(110, 231, 183, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 42%, #f5f8fd 100%);
}

.wealth-page :deep(.card) {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(154, 174, 204, 0.22);
}

.wealth-back,
.wealth-banner,
.wealth-panel,
.wealth-card,
.wealth-hero__copy,
.wealth-hero__panel {
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
}

.wealth-back {
  display: inline-flex;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
}

.wealth-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
  gap: 1rem;
}

.wealth-hero__copy,
.wealth-hero__panel,
.wealth-banner,
.wealth-panel,
.wealth-card {
  border-radius: 24px;
}

.wealth-hero__copy,
.wealth-hero__panel,
.wealth-banner,
.wealth-card {
  padding: 1.15rem 1.2rem;
}

.wealth-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5c7ca1;
}

.wealth-hero__copy h1 {
  margin: 0.35rem 0 0.7rem;
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
}

.wealth-hero__panel h2,
.wealth-card h3 {
  margin: 0.35rem 0 0.6rem;
  font-size: 1.2rem;
}

.wealth-tagline {
  margin: 0 0 0.7rem;
  color: #27415f;
}

.wealth-copy {
  margin: 0;
  color: #5d7394;
}

.wealth-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.wealth-tag {
  color: #27415f;
  background: rgba(225, 238, 255, 0.86);
  border-color: rgba(145, 178, 227, 0.28);
}

.wealth-hero__stats,
.wealth-hero__mini,
.wealth-mini-grid,
.wealth-strategy-item__meta,
.wealth-strategy-item__top,
.wealth-strategy-item__title,
.wealth-stage-tabs,
.wealth-results-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.wealth-hero__stats,
.wealth-hero__mini,
.wealth-mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  margin-top: 1rem;
}

.wealth-hero__mini {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-hero__stats div,
.wealth-hero__mini div,
.wealth-mini-grid div {
  padding: 0.8rem;
  border-radius: 16px;
  background: rgba(243, 247, 255, 0.96);
}

.wealth-hero__stats span,
.wealth-hero__mini span,
.wealth-mini-grid span {
  display: block;
  margin-bottom: 0.25rem;
  color: #5d7394;
  font-size: 0.76rem;
}

.wealth-stage-tabs {
  margin-top: 1rem;
}

.wealth-stage-tab,
.wealth-primary-btn,
.wealth-secondary-btn {
  border: 1px solid rgba(154, 174, 204, 0.28);
  border-radius: 999px;
  padding: 0.65rem 1rem;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.wealth-stage-tab,
.wealth-secondary-btn {
  background: rgba(244, 248, 255, 0.96);
  color: #27415f;
}

.wealth-stage-tab.is-active {
  background: rgba(218, 235, 255, 0.98);
  border-color: rgba(93, 142, 208, 0.34);
}

.wealth-stage-tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wealth-primary-btn {
  background: linear-gradient(135deg, #8fd3ff, #bce4ff);
  color: #0f2848;
}

.wealth-primary-btn:hover,
.wealth-secondary-btn:hover,
.wealth-stage-tab:hover:not(:disabled) {
  transform: translateY(-1px);
}

.wealth-banner {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.wealth-pill,
.wealth-filter-note {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #9a6200;
  white-space: nowrap;
}

.wealth-pill.is-live {
  background: rgba(16, 185, 129, 0.12);
  color: #0f766e;
}

.wealth-error {
  margin-top: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(254, 242, 242, 0.95);
  border: 1px solid rgba(248, 113, 113, 0.24);
  color: #b91c1c;
}

.wealth-stage {
  margin-top: 1rem;
}

.wealth-input-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(300px, 0.82fr);
  gap: 1rem;
  align-items: start;
}

.wealth-form-stack,
.wealth-stage-card,
.wealth-summary-grid,
.wealth-dashboard-grid,
.wealth-strategy-grid,
.wealth-method-grid,
.wealth-source-list,
.wealth-strategy-list {
  display: grid;
  gap: 1rem;
}

.wealth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-grid--compact {
  gap: 0.7rem;
}

.wealth-grid label,
.wealth-range {
  display: grid;
  gap: 0.35rem;
  color: #5d7394;
  font-size: 0.82rem;
}

.wealth-grid label > span,
.wealth-range > span,
.wealth-toggle span {
  width: fit-content;
  cursor: help;
}

.wealth-field-note {
  margin: 0;
  color: #7187a6;
  font-size: 0.74rem;
  line-height: 1.45;
}

.wealth-field-note--section {
  margin-top: 0.85rem;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  background: rgba(235, 244, 255, 0.72);
  border: 1px solid rgba(154, 174, 204, 0.18);
}

.wealth-grid input,
.wealth-grid select,
.wealth-range input {
  width: 100%;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
}

.wealth-panel summary {
  cursor: pointer;
  list-style: none;
  padding: 1rem 1.1rem;
  font-weight: 600;
}

.wealth-panel summary::-webkit-details-marker {
  display: none;
}

.wealth-panel__body {
  padding: 0 1.1rem 1.1rem;
}

.wealth-range__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px;
  gap: 0.6rem;
}

.wealth-toggle {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 0.8rem;
}

.wealth-toggle--card {
  margin: 0;
  min-height: 52px;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
}

.wealth-toggle input {
  width: 18px;
  height: 18px;
}

.wealth-property-grid {
  display: grid;
  gap: 1rem;
}

.wealth-cost-breakdown {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.wealth-cost-breakdown--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-cost-breakdown div {
  display: grid;
  gap: 0.28rem;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  background: rgba(243, 247, 255, 0.92);
  border: 1px solid rgba(154, 174, 204, 0.18);
}

.wealth-cost-breakdown span {
  color: #5d7394;
  font-size: 0.76rem;
}

.wealth-cost-breakdown strong {
  color: #173050;
}

.wealth-cost-breakdown small {
  color: #7187a6;
  font-size: 0.72rem;
  line-height: 1.35;
}

.wealth-results-toolbar {
  align-items: center;
}

.wealth-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-dashboard-grid {
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
}

.wealth-strategy-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-card--scroll {
  overflow: hidden;
}

.wealth-strategy-list {
  margin-top: 0.85rem;
}

.wealth-strategy-item {
  padding: 0.9rem;
  border-radius: 16px;
  background: rgba(243, 247, 255, 0.96);
}

.wealth-strategy-item__top {
  justify-content: space-between;
  align-items: center;
}

.wealth-strategy-item__title {
  align-items: center;
}

.wealth-strategy-item__meta {
  margin-top: 0.6rem;
  color: #5d7394;
  font-size: 0.8rem;
  justify-content: space-between;
}

.wealth-swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.wealth-mini-grid--dense {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-method-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-method-grid ul {
  margin: 0;
  padding-left: 1rem;
  color: #5d7394;
}

.wealth-source-list h4,
.wealth-property-grid h4 {
  margin: 0 0 0.45rem;
}

.wealth-inline-note {
  margin-left: 0.4rem;
  color: #5c7ca1;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

@media (max-width: 1100px) {
  .wealth-input-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .wealth-hero,
  .wealth-summary-grid,
  .wealth-dashboard-grid,
  .wealth-strategy-grid,
  .wealth-method-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .wealth-page {
    padding: 1rem 0.85rem 2.4rem;
  }

  .wealth-grid,
  .wealth-hero__stats,
  .wealth-hero__mini,
  .wealth-mini-grid,
  .wealth-cost-breakdown,
  .wealth-cost-breakdown--four {
    grid-template-columns: 1fr;
  }

  .wealth-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .wealth-range__row {
    grid-template-columns: 1fr;
  }
}
</style>
