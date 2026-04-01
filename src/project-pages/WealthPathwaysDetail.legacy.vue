<template>
  <article class="wealth-page">
    <div class="wealth-back-row">
      <RouterLink to="/projects" class="wealth-back">&larr; Back to projects</RouterLink>
    </div>

    <section ref="heroRef" class="wealth-hero">
      <h1 ref="heroTitleRef">{{ project.title }}</h1>
      <p class="wealth-tagline">{{ project.tagline }}</p>
    </section>

    <div v-if="errorMessage" class="wealth-error">{{ errorMessage }}</div>

    <section v-if="currentStage === 1" class="wealth-stage wealth-stage--inputs">
      <div class="wealth-form-stack">
        <div class="wealth-panel-grid wealth-panel-grid--primary">
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
                  <input
                    data-testid="annual-income"
                    v-model.number="form.profile.annualIncome"
                    v-bind="valueAttrs('annualIncome')"
                    type="number"
                    min="0"
                    step="1000"
                  />
                </label>
                <label>
                  <span v-bind="labelAttrs('incomeGrowthRate')">Income growth %</span>
                  <input v-model.number="profileIncomeGrowthPct" v-bind="valueAttrs('incomeGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('weeklyNonHousingLivingCosts')">Weekly non-housing living costs</span>
                  <input
                    v-model.number="form.profile.weeklyNonHousingLivingCosts"
                    v-bind="valueAttrs('weeklyNonHousingLivingCosts')"
                    type="number"
                    min="0"
                    step="25"
                  />
                </label>
                <label class="wealth-toggle wealth-toggle--card">
                  <input data-testid="live-at-home-toggle" v-model="form.housingCosts.liveAtHome" v-bind="valueAttrs('liveAtHome')" type="checkbox" />
                  <span class="wealth-toggle__label" v-bind="labelAttrs('liveAtHome')">Currently living at home</span>
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
                  <span v-bind="labelAttrs('weeklyBoardAtHome')">Weekly rent + expenses at home</span>
                  <input v-model.number="form.housingCosts.weeklyBoardAtHome" v-bind="valueAttrs('weeklyBoardAtHome')" type="number" min="0" step="10" />
                </label>
                <label v-if="form.housingCosts.liveAtHome">
                  <span v-bind="labelAttrs('boardGrowthRate')">Rent + expenses growth %</span>
                  <input v-model.number="boardGrowthPct" v-bind="valueAttrs('boardGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
              </div>

              <p v-if="form.housingCosts.liveAtHome" class="wealth-field-note wealth-field-note--section">
                Rent + invest and investment-property paths treat living at home as lower housing costs for the selected
                years. Buy-to-live paths move into the purchased home as soon as the deposit and buying costs are covered.
              </p>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>Housing plan</summary>
            <div class="wealth-panel__body">
              <div class="wealth-grid">
                <div class="wealth-toggle-card">
                  <span v-bind="labelAttrs('investWhileSavingForDeposit')">Saving mode</span>
                  <label class="wealth-toggle wealth-toggle--card">
                    <input
                      data-testid="invest-while-saving-toggle"
                      v-model="form.propertyConfig.investWhileSavingForDeposit"
                      type="checkbox"
                    />
                    <span class="wealth-toggle__label" v-bind="labelAttrs('investWhileSavingForDeposit')">Invest while saving for deposit</span>
                  </label>
                </div>
                <label>
                  <span v-bind="labelAttrs('surplusAllocationMode')">Property surplus</span>
                  <select v-model="form.propertyConfig.surplusAllocationMode" v-bind="valueAttrs('surplusAllocationMode')">
                    <option value="portfolio">Invest surplus</option>
                    <option value="mortgagePrepayment">Prepay mortgage</option>
                  </select>
                </label>
                <label>
                  <span v-bind="labelAttrs('weeklyRent')">Move-out weekly rent</span>
                  <input v-model.number="form.housingCosts.weeklyRent" v-bind="valueAttrs('weeklyRent')" type="number" min="0" step="10" />
                </label>
                <label>
                  <span v-bind="labelAttrs('rentGrowthRate')">Rent growth %</span>
                  <input v-model.number="rentGrowthPct" v-bind="valueAttrs('rentGrowthRate')" type="number" min="0" max="10" step="0.1" />
                </label>
              </div>

              <p class="wealth-field-note wealth-field-note--section">
                Move-out rent applies once a rent-based path leaves home. The yearly ledger starts from gross salary,
                subtracts tax and your non-housing living costs, then applies each strategy&apos;s rent, mortgage, property
                cashflow, and any surplus routing choice.
              </p>
            </div>
          </details>
        </div>

          <details class="wealth-panel" open>
            <summary>Portfolio</summary>
            <div class="wealth-panel__body">
              <div class="wealth-allocation-editor">
                <div
                  ref="allocationBarRef"
                  class="wealth-allocation-bar"
                  :class="{ 'is-dragging': activeAllocationHandleIndex !== null }"
                  aria-label="Portfolio allocation by sleeve"
                >
                  <div
                    v-for="allocation in portfolioAllocationFields"
                    :key="allocation.key"
                    class="wealth-allocation-bar__segment"
                    :style="{
                      width: `${getPortfolioAllocationWidth(allocation.key)}%`,
                      background: allocation.color
                    }"
                    :title="`${allocation.label}: ${getPortfolioAllocationPct(allocation.key)}%`"
                  >
                    <span v-if="getPortfolioAllocationPct(allocation.key) >= 14">
                      {{ allocation.shortLabel }} {{ getPortfolioAllocationPct(allocation.key) }}%
                    </span>
                  </div>

                  <button
                    v-for="boundary in portfolioAllocationBoundaries"
                    :key="boundary.key"
                    type="button"
                    class="wealth-allocation-bar__handle"
                    :class="{ 'is-active': activeAllocationHandleIndex === boundary.index }"
                    :style="{ left: `${boundary.position}%` }"
                    :aria-label="`Adjust ${boundary.leftLabel} and ${boundary.rightLabel}`"
                    :title="`Drag to adjust ${boundary.leftLabel} and ${boundary.rightLabel}`"
                    @pointerdown.prevent="startPortfolioHandleDrag(boundary.index, $event)"
                  ></button>
                </div>

                <p class="wealth-field-note">Drag the dividers on the bar or type the percentages directly.</p>

                <div class="wealth-allocation-grid">
                  <label
                    v-for="allocation in portfolioAllocationFields"
                    :key="`${allocation.key}-input`"
                    class="wealth-allocation-input"
                  >
                    <span class="wealth-allocation-input__label">
                      <i class="wealth-allocation-input__swatch" :style="{ background: allocation.color }"></i>
                      <span v-bind="labelAttrs(allocation.key)">{{ allocation.label }}</span>
                    </span>
                    <input
                      :data-testid="allocation.testId"
                      :value="getPortfolioAllocationPct(allocation.key)"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      @input="setPortfolioAllocation(allocation.key, $event.target.value)"
                    />
                  </label>
                </div>
              </div>


              <div class="wealth-grid wealth-grid--compact wealth-grid--triple">
                <label>
                  <span v-bind="labelAttrs('asxReturnMean')">ASX return %</span>
                  <input v-model.number="asxReturnPct" v-bind="valueAttrs('asxReturnMean')" type="number" min="0" max="20" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('qqqReturnMean')">US return %</span>
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
                  <span v-bind="labelAttrs('qqqDividendYield')">US dividend %</span>
                  <input v-model.number="qqqDividendPct" v-bind="valueAttrs('qqqDividendYield')" type="number" min="0" max="5" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('cashReturnMean')">Cash return %</span>
                  <input v-model.number="cashReturnPct" v-bind="valueAttrs('cashReturnMean')" type="number" min="0" max="10" step="0.1" />
                </label>
                <label>
                  <span v-bind="labelAttrs('asxFrankingPct')">ASX franking %</span>
                  <input v-model.number="asxFrankingPct" v-bind="valueAttrs('asxFrankingPct')" type="number" min="0" max="100" step="1" />
                </label>
              </div>
            </div>
          </details>

          <details class="wealth-panel" open>
            <summary>House and apartment assumptions</summary>
            <div class="wealth-panel__body wealth-property-grid">
              <p class="wealth-field-note wealth-field-note--section">
                NSW first-home-buyer support is automatically applied to the buy-and-live path. The investment + rent
                path keeps the standard deposit and buying costs because those concessions depend on living in the
                property. Owner paths fully waive stamp duty below $800k, then use the current NSW reduced-duty
                concession between $800k and $1m. The low-deposit first-home-buyer cap now auto-switches between the
                selected area's $1.5m and $800k limits. Any LMI shown is an estimate only, not a lender quote or
                guaranteed scheme outcome. Borrowing-power checks use an APRA-style assessment rate and a living-cost
                floor. Editable property costs now auto-refresh from NSW or Sydney-style fixed-base-plus-scaling
                baselines instead of a straight percentage-of-price rule, while land tax remains a purchase-price-based
                estimate. Investment-property cash flow starts from a 3% vacancy baseline unless a suburb selection
                overrides it.
              </p>
              <SuburbSearchSelector
                :current-selection="selectedSuburbSelection"
                :suburb-options="suburbSearchContext.suburbOptions"
                @select-suburb="handleSuburbSelect"
              />
              <div class="wealth-property-panels">
                <div v-if="selectedSuburbRecord" class="wealth-suburb-summary">
                  <div>
                    <span class="wealth-suburb-summary__label">Applied suburb</span>
                    <strong>{{ selectedSuburbRecord.label }}</strong>
                  </div>
                  <div v-if="selectedSuburbPreview.house">
                    <span class="wealth-suburb-summary__label">House median</span>
                    <strong>{{ formatCurrency(selectedSuburbPreview.house.purchasePrice) }}</strong>
                  </div>
                  <div v-if="selectedSuburbPreview.apartment">
                    <span class="wealth-suburb-summary__label">Apartment median</span>
                    <strong>{{ formatCurrency(selectedSuburbPreview.apartment.purchasePrice) }}</strong>
                  </div>
                  <div v-if="selectedSuburbPreview.vacancyRate !== null">
                    <span class="wealth-suburb-summary__label">Vacancy baseline</span>
                    <strong>{{ formatPercent(selectedSuburbPreview.vacancyRate) }}</strong>
                  </div>
                </div>
                <section class="wealth-property-panel">
                  <h4>House</h4>
                  <div class="wealth-grid wealth-grid--compact">
                  <label>
                    <span v-bind="labelAttrs('housePurchasePrice')">Target price</span>
                    <input
                      data-testid="house-target-price"
                      v-model.number="form.propertyConfig.house.purchasePrice"
                      v-bind="valueAttrs('housePurchasePrice')"
                      type="number"
                      min="0"
                      step="1000"
                    />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseOwnerDepositPct')">Owner deposit %</span>
                    <input
                      data-testid="house-owner-deposit"
                      v-model.number="houseOwnerDepositPct"
                      v-bind="valueAttrs('houseOwnerDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                  </label>
                  <label>
                    <span>Max affordable today</span>
                    <div class="wealth-static-value" data-testid="house-max-purchase-price">
                      {{ formatCurrency(purchaseCapsToday.house.affordable) }}
                    </div>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseDepositPct')">Investment deposit %</span>
                    <input
                      v-model.number="houseDepositPct"
                      v-bind="valueAttrs('houseDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseMortgageYears')">Mortgage term</span>
                    <select v-model.number="form.propertyConfig.house.mortgageYears">
                      <option v-for="years in mortgageYearOptions" :key="`house-${years}`" :value="years">{{ years }} years</option>
                    </select>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseOwnerInterestRate')">Owner rate %</span>
                    <input v-model.number="houseOwnerRatePct" v-bind="valueAttrs('houseOwnerInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseOwnerLongRunInterestRate')">Owner long-run rate %</span>
                    <input v-model.number="houseOwnerLongRunRatePct" v-bind="valueAttrs('houseOwnerLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseInvestmentInterestRate')">Investment rate %</span>
                    <input v-model.number="houseInvestmentRatePct" v-bind="valueAttrs('houseInvestmentInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseInvestmentLongRunInterestRate')">Investment long-run rate %</span>
                    <input v-model.number="houseInvestmentLongRunRatePct" v-bind="valueAttrs('houseInvestmentLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseGrowthMean')">Growth %</span>
                    <input v-model.number="houseGrowthPct" v-bind="valueAttrs('houseGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseRentYield')">Rent yield %</span>
                    <input v-model.number="houseRentYieldPct" v-bind="valueAttrs('houseRentYield')" type="number" min="0" max="10" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('housePropertyManagementPct')">Management fee %</span>
                    <input
                      v-model.number="houseManagementPct"
                      v-bind="valueAttrs('housePropertyManagementPct')"
                      type="number"
                      min="0"
                      max="15"
                      step="0.1"
                    />
                  </label>
                  </div>
                  <p v-if="form.propertyConfig.house.purchasePrice > purchaseCapsToday.house.serviceable" class="wealth-field-note wealth-field-note--section">
                    This target is above today&apos;s owner-occupier serviceability. The model will wait until both income and
                    cash support the purchase, while the target price keeps compounding with house growth.
                  </p>
                  <div class="wealth-grid wealth-grid--compact wealth-grid--triple">
                    <label>
                      <span v-bind="labelAttrs('houseCouncilRates')">Council rates</span>
                      <input v-model.number="form.propertyConfig.house.councilRates" v-bind="valueAttrs('houseCouncilRates')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseWaterRates')">Water rates</span>
                      <input v-model.number="form.propertyConfig.house.waterRates" v-bind="valueAttrs('houseWaterRates')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseInsurance')">Insurance</span>
                      <input v-model.number="form.propertyConfig.house.insurance" v-bind="valueAttrs('houseInsurance')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseMaintenance')">Maintenance</span>
                      <input v-model.number="form.propertyConfig.house.maintenance" v-bind="valueAttrs('houseMaintenance')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseStampDuty')">Stamp duty</span>
                      <input v-model.number="houseStampDuty" v-bind="valueAttrs('houseStampDuty')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseLegalFees')">Legal fees</span>
                      <input v-model.number="houseLegalFees" v-bind="valueAttrs('houseLegalFees')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseBuyersCosts')">Buyer costs</span>
                      <input v-model.number="houseBuyersCosts" v-bind="valueAttrs('houseBuyersCosts')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseBorrowingExpensesTotal')">Borrowing expenses</span>
                      <input v-model.number="form.propertyConfig.house.borrowingExpensesTotal" v-bind="valueAttrs('houseBorrowingExpensesTotal')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('houseOtherDeductibleExpensesAnnual')">Other deductible</span>
                      <input
                        v-model.number="form.propertyConfig.house.otherDeductibleExpensesAnnual"
                        v-bind="valueAttrs('houseOtherDeductibleExpensesAnnual')"
                        type="number"
                        min="0"
                        step="100"
                      />
                    </label>
                  </div>
                </section>

                <section class="wealth-property-panel">
                  <h4>Apartment</h4>
                  <div class="wealth-grid wealth-grid--compact">
                  <label>
                    <span v-bind="labelAttrs('apartmentPurchasePrice')">Target price</span>
                    <input
                      data-testid="apartment-target-price"
                      v-model.number="form.propertyConfig.apartment.purchasePrice"
                      v-bind="valueAttrs('apartmentPurchasePrice')"
                      type="number"
                      min="0"
                      step="1000"
                    />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentOwnerDepositPct')">Owner deposit %</span>
                    <input
                      data-testid="apartment-owner-deposit"
                      v-model.number="apartmentOwnerDepositPct"
                      v-bind="valueAttrs('apartmentOwnerDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                  </label>
                  <label>
                    <span>Max affordable today</span>
                    <div class="wealth-static-value" data-testid="apartment-max-purchase-price">
                      {{ formatCurrency(purchaseCapsToday.apartment.affordable) }}
                    </div>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentDepositPct')">Investment deposit %</span>
                    <input
                      v-model.number="apartmentDepositPct"
                      v-bind="valueAttrs('apartmentDepositPct')"
                      type="number"
                      min="5"
                      max="80"
                      step="1"
                    />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentMortgageYears')">Mortgage term</span>
                    <select v-model.number="form.propertyConfig.apartment.mortgageYears">
                      <option v-for="years in mortgageYearOptions" :key="`apartment-${years}`" :value="years">{{ years }} years</option>
                    </select>
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentOwnerInterestRate')">Owner rate %</span>
                    <input v-model.number="apartmentOwnerRatePct" v-bind="valueAttrs('apartmentOwnerInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentOwnerLongRunInterestRate')">Owner long-run rate %</span>
                    <input v-model.number="apartmentOwnerLongRunRatePct" v-bind="valueAttrs('apartmentOwnerLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentInvestmentInterestRate')">Investment rate %</span>
                    <input v-model.number="apartmentInvestmentRatePct" v-bind="valueAttrs('apartmentInvestmentInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentInvestmentLongRunInterestRate')">Investment long-run rate %</span>
                    <input v-model.number="apartmentInvestmentLongRunRatePct" v-bind="valueAttrs('apartmentInvestmentLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentGrowthMean')">Growth %</span>
                    <input v-model.number="apartmentGrowthPct" v-bind="valueAttrs('apartmentGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentRentYield')">Rent yield %</span>
                    <input v-model.number="apartmentRentYieldPct" v-bind="valueAttrs('apartmentRentYield')" type="number" min="0" max="10" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentPropertyManagementPct')">Management fee %</span>
                    <input
                      v-model.number="apartmentManagementPct"
                      v-bind="valueAttrs('apartmentPropertyManagementPct')"
                      type="number"
                      min="0"
                      max="15"
                      step="0.1"
                    />
                  </label>
                  </div>
                  <p v-if="form.propertyConfig.apartment.purchasePrice > purchaseCapsToday.apartment.serviceable" class="wealth-field-note wealth-field-note--section">
                    This target is above today&apos;s owner-occupier serviceability. The model will wait until both income and
                    cash support the purchase, while the target price keeps compounding with apartment growth.
                  </p>
                  <div class="wealth-grid wealth-grid--compact wealth-grid--triple">
                    <label>
                      <span v-bind="labelAttrs('apartmentCouncilRates')">Council rates</span>
                      <input v-model.number="form.propertyConfig.apartment.councilRates" v-bind="valueAttrs('apartmentCouncilRates')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentWaterRates')">Water rates</span>
                      <input v-model.number="form.propertyConfig.apartment.waterRates" v-bind="valueAttrs('apartmentWaterRates')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentInsurance')">Insurance</span>
                      <input v-model.number="form.propertyConfig.apartment.insurance" v-bind="valueAttrs('apartmentInsurance')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentMaintenance')">Maintenance</span>
                      <input v-model.number="form.propertyConfig.apartment.maintenance" v-bind="valueAttrs('apartmentMaintenance')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentStrata')">Strata</span>
                      <input v-model.number="form.propertyConfig.apartment.strata" v-bind="valueAttrs('apartmentStrata')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentStampDuty')">Stamp duty</span>
                      <input v-model.number="apartmentStampDuty" v-bind="valueAttrs('apartmentStampDuty')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentLegalFees')">Legal fees</span>
                      <input v-model.number="apartmentLegalFees" v-bind="valueAttrs('apartmentLegalFees')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentBuyersCosts')">Buyer costs</span>
                      <input v-model.number="apartmentBuyersCosts" v-bind="valueAttrs('apartmentBuyersCosts')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentBorrowingExpensesTotal')">Borrowing expenses</span>
                      <input v-model.number="form.propertyConfig.apartment.borrowingExpensesTotal" v-bind="valueAttrs('apartmentBorrowingExpensesTotal')" type="number" min="0" step="100" />
                    </label>
                    <label>
                      <span v-bind="labelAttrs('apartmentOtherDeductibleExpensesAnnual')">Other deductible</span>
                      <input
                        v-model.number="form.propertyConfig.apartment.otherDeductibleExpensesAnnual"
                        v-bind="valueAttrs('apartmentOtherDeductibleExpensesAnnual')"
                        type="number"
                        min="0"
                        step="100"
                      />
                    </label>
                  </div>
                </section>
              </div>
            </div>
          </details>

      </div>

      <div class="wealth-stage-footer">
        <section class="wealth-card">
          <p class="wealth-kicker">Affordability snapshot</p>
          <h3>House and apartment entry requirements today</h3>
          <div class="wealth-property-panels">
            <article v-for="card in affordabilityCards" :key="card.key" class="wealth-property-panel">
              <h4>{{ card.label }}</h4>
              <div class="wealth-mini-grid wealth-mini-grid--dense">
                <div>
                  <span>Manual target</span>
                  <strong>{{ formatCurrency(card.targetPrice) }}</strong>
                </div>
                <div>
                  <span>Max affordable today</span>
                  <strong>{{ formatCurrency(card.maxAffordablePurchasePrice) }}</strong>
                </div>
                <div>
                  <span>Bank-style cap today</span>
                  <strong>{{ formatCurrency(card.maxServiceablePurchasePrice) }}</strong>
                </div>
                <div>
                  <span>Owner upfront now</span>
                  <strong>{{ formatCurrency(card.ownerSnapshot.upfront) }}</strong>
                </div>
                <div>
                  <span>Investment upfront now</span>
                  <strong>{{ formatCurrency(card.investmentSnapshot.upfront) }}</strong>
                </div>
                <div>
                  <span>Owner loan now</span>
                  <strong>{{ formatCurrency(card.ownerSnapshot.loan) }}</strong>
                </div>
                <div>
                  <span>Investment loan now</span>
                  <strong>{{ formatCurrency(card.investmentSnapshot.loan) }}</strong>
                </div>
                <div>
                  <span>Live and own today</span>
                  <strong>{{ card.ownerAffordable ? 'Yes' : 'No' }}</strong>
                </div>
                <div>
                  <span>Investment + rent today</span>
                  <strong>{{ card.rentvestAffordable ? 'Yes' : 'No' }}</strong>
                </div>
              </div>
              <p class="wealth-field-note wealth-field-note--section">
                {{ card.targetPrice > card.maxServiceablePurchasePrice
                  ? 'Target is above today\'s bank-style owner serviceability cap, so the simulation waits until income and cash catch up while the target value keeps growing.'
                  : 'Target is within today\'s bank-style owner serviceability range, so the main remaining gate is having enough cash to transact without going negative.'
                }}
              </p>
              <p class="wealth-field-note wealth-field-note--section">
                Deposit ready: owner {{ card.ownerDepositReady ? 'Yes' : 'No' }}, investment
                {{ card.investmentDepositReady ? 'Yes' : 'No' }}. Max affordable today uses your entered living costs,
                the live owner rate, and annual owner carry of {{ formatCurrency(card.ownerCashflowCarry) }} at
                {{ formatPercent(card.ownerCashflowRate) }} against a post-tax budget of
                {{ formatCurrency(card.ownerCashflowBudgetAfterLiving) }}. The simulation still checks a bank-style
                owner carry of {{ formatCurrency(card.ownerCarry) }} per year at {{ formatPercent(card.ownerAssessedRate) }}.
                Investment + rent uses {{ formatCurrency(card.rentvestCarry) }} per year at
                {{ formatPercent(card.investmentAssessedRate) }} after an 80% rent credit and a first-year rental tax
                {{ card.propertyTaxImpact < 0 ? 'benefit' : 'cost' }} of
                {{ formatCurrency(Math.abs(card.propertyTaxImpact)) }} against a serviceability budget after tax and
                assessed living costs of {{ formatCurrency(card.annualDisposableAfterLiving) }}.
              </p>
            </article>
          </div>
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
                  ? `${bestMedianStrategy.label} finishes with a median after-tax sell-down value of ${formatCurrency(bestMedianStrategy.summary.finalMedianNetWorth)}.`
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
                ? `${downsideLeader.label} keeps the strongest 10th-percentile after-tax sell-down result at ${formatCurrency(downsideLeader.summary.downsideRisk)}.`
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

      <section class="wealth-chart-grid">
        <WealthLineChart
          class="wealth-chart--outcome"
          title="Net worth projection bands"
          subtitle="Each year assumes you sold down the remaining assets in that year and netted out the model's estimated CGT before comparing scenarios."
          kicker="Outcome distribution"
          :series="netWorthSeries"
          :muted-series-ids="mutedStrategyKeys"
          @toggle-series="toggleStrategy"
        />

        <WealthLineChart
          class="wealth-chart--inflation"
          title="Sell-down value in today's dollars"
          subtitle="Each year's sell-everything value is discounted back into today's dollars using your rent inflation assumption as the inflation proxy."
          kicker="Inflation adjusted"
          :series="inflationAdjustedNetWorthSeries"
          :muted-series-ids="mutedStrategyKeys"
          @toggle-series="toggleStrategy"
        />
      </section>

      <div class="wealth-dashboard-grid">
        <WealthCompositionBars
          class="wealth-bars--breakdown"
          title="Final-year balance composition"
          subtitle="Hold-only median liquid assets, housing equity, and remaining debt at the end of the chosen horizon before any sale tax is applied."
          :rows="compositionRows"
        />

        <section class="wealth-card wealth-card--scroll wealth-readout-panel">
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
              <div class="wealth-strategy-item__meta">
                <span>Tax delta {{ formatCurrency(strategy.summary.finalMedianTaxDelta) }}</span>
                <span>
                  {{
                    strategy.summary.maxMedianCashDeficit > 0
                      ? `Median cash deficit ${formatCurrency(strategy.summary.maxMedianCashDeficit)}`
                      : 'No median cash deficit'
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
        class="wealth-chart--cashflow"
        title="Annual after-tax surplus or deficit"
        subtitle="Positive values mean the annual ledger still has cash left after tax, living costs, rent, and property cashflows. Negative values show cash burn."
        kicker="Cashflow"
        :series="cashflowSeries"
        :muted-series-ids="mutedStrategyKeys"
        @toggle-series="toggleStrategy"
      />

      <section class="wealth-strategy-grid wealth-strategy-grid--results">
        <article v-for="strategy in strategyCards" :key="`${strategy.key}-grid`" class="wealth-card wealth-card--result">
          <div class="wealth-strategy-item__top">
            <div class="wealth-strategy-item__title">
              <span class="wealth-swatch" :style="{ background: strategy.color }"></span>
              <strong>{{ strategy.label }}</strong>
            </div>
            <span>{{ strategy.shortLabel }}</span>
          </div>

          <div class="wealth-mini-grid wealth-mini-grid--dense">
            <div>
              <span>Median after-tax sale value</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianNetWorth) }}</strong>
            </div>
            <div>
              <span>P10 outcome</span>
              <strong>{{ formatCurrency(strategy.summary.downsideRisk) }}</strong>
            </div>
            <div>
              <span>Hold-only balance</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianHoldNetWorth) }}</strong>
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
              <span>Annual surplus</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianAnnualSurplus) }}</strong>
            </div>
            <div>
              <span>Tax delta</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianTaxDelta) }}</strong>
            </div>
            <div>
              <span>Estimated sale tax</span>
              <strong>{{ formatCurrency(strategy.summary.finalMedianEstimatedSaleTax) }}</strong>
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
              <p v-if="source.url" class="wealth-copy">
                <a :href="source.url" target="_blank" rel="noreferrer">Open source</a>
              </p>
            </article>
          </div>
        </details>
      </section>
    </section>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import WealthLineChart from '../components/wealth/WealthLineChart.vue'
import WealthCompositionBars from '../components/wealth/WealthCompositionBars.vue'
import SuburbSearchSelector from '../components/wealth/SuburbSearchSelector.vue'
import { cloneSimulationRequest, wealthAssumptionSections, wealthSimulationMetadata, wealthStrategyOrder, wealthVacancyRate } from '../data/wealthDefaults.js'
import wealthPropertyMarketData from '../data/generated/wealthPropertyMarket.json'
import {
  calculateAnnualMortgagePayment,
  calculateAustralianAnnualTax,
  calculateInvestmentPropertyTaxPosition,
  assessPropertyPurchaseServiceability,
  FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT,
  calculatePurchaseCosts,
  clamp,
  estimatePropertyCostFromPrice,
  estimateLmi,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  getOwnerHoldingCosts,
  getPropertyInterestRate,
  scalePurchaseCostsWithPrice
} from '../wealth/finance.js'
import { WealthSimulationClient } from '../wealth/client.js'
import { applySuburbMarketToFormBySlug, buildSuburbSearchContext, createPropertyConfigPatchFromSuburb } from '../wealth/suburbMarket.js'

const props = defineProps({
  project: { type: Object, required: true }
})

const labelHelp = {
  horizonYears: 'How many years the model runs for. Longer horizons give ownership and compounding more time to separate.',
  startingSavings: 'Cash already available on day one. It can fund a deposit, buying costs, or the starting investment balance.',
  annualIncome: 'Gross annual salary before tax. The model estimates take-home pay from this figure each year.',
  incomeGrowthRate: 'Expected annual growth in your gross income. The annual salary and non-housing living-cost baseline both step up using this setting.',
  weeklyNonHousingLivingCosts: 'Weekly living costs before housing. The yearly cash ledger uses this input directly, while borrowing-power checks use the higher of this value or the model\'s default living-cost floor.',
  liveAtHome: 'If enabled, the model starts from you currently living at home. Rent + invest and investment-property paths treat it as lower housing costs, while buy-to-live paths move into the property as soon as they can buy.',
  liveAtHomeYears: 'How long you remain at home before rent-based paths switch to market rent. Buy-to-live paths stop using the at-home setting as soon as the property purchase happens.',
  weeklyRent: 'Weekly rent assumed once you have moved out or for any strategy that keeps you renting.',
  rentGrowthRate: 'Expected annual rent inflation. Higher rent raises the housing cash-cost line in renting and rentvest scenarios.',
  weeklyBoardAtHome: 'Weekly rent and household expenses paid while living at home.',
  boardGrowthRate: 'Expected annual increase in at-home rent and household expenses, with some annual variation layered on in the simulation.',
  investWhileSavingForDeposit: 'If enabled, pre-purchase savings for the property pathways stay invested in the portfolio while you wait. If disabled, those savings are held as cash until buying is possible.',
  surplusAllocationMode: 'Choose whether positive surplus in property strategies is invested into the portfolio or directed to extra mortgage repayments.',
  asxWeight: 'Portfolio share allocated to AU Stocks - ASX200.',
  qqqWeight: 'Portfolio share allocated to US Stock - QQQ.',
  bondWeight: 'Portfolio share held in bonds. Raising this usually lowers expected return and smooths the overall portfolio path.',
  cashWeight: 'Portfolio share held in cash or cash-like instruments.',
  asxReturnMean: 'The expected average annual return of the ASX allocation.',
  qqqReturnMean: 'The expected average annual return of the US allocation.',
  bondReturnMean: 'Baseline long-run annual bond return used as the centre of the bond distribution.',
  cashReturnMean: 'Baseline annual return for the cash sleeve. It is treated like taxable interest with low volatility.',
  asxDividendYield: 'Cash distribution yield assumed for the ASX sleeve. It contributes to recurring income and simplified portfolio tax.',
  bondIncomeYield: 'Income yield for the bond sleeve. This feeds recurring income and tax drag in the model.',
  qqqDividendYield: 'Cash distribution yield assumed for the US sleeve. It is kept low because most return is modeled as capital growth.',
  asxFrankingPct: 'Share of ASX dividends assumed to arrive with franking credits. This offsets some tax drag in the simplified tax model.',
  firstHomeBuyerEligible: 'First-home-buyer support is automatically applied to owner-occupier purchases only.',
  houseRentYield: 'Gross rental yield used when the house is held as an investment property.',
  housePropertyManagementPct: 'Property manager fee applied to collected rent for the house investment path.',
  housePurchasePrice: 'Manual house target in today\'s dollars. If it is above today\'s assessed serviceability limit, the model waits and lets the target grow with house prices until income and cash catch up.',
  houseOwnerDepositPct: 'Owner-occupier deposit share used for the buy-to-live path and the max-affordable-today calculation. First-home-buyer cases still default to 5 percent up to the selected area\'s low-deposit cap, while any resulting LMI remains an estimate only.',
  houseDepositPct: 'Deposit share for the house investment purchase. Lower deposits increase leverage and can increase estimated lenders mortgage insurance.',
  houseMortgageYears: 'Length of the house mortgage used for amortization and repayment calculations.',
  houseOwnerInterestRate: 'Starting owner-occupier mortgage rate for the house path before the simulation drifts toward the long-run owner rate.',
  houseOwnerLongRunInterestRate: 'Steadier owner-occupier mortgage rate used after the opening years for house scenarios.',
  houseInvestmentInterestRate: 'Starting investor mortgage rate for the house investment path and serviceability checks.',
  houseInvestmentLongRunInterestRate: 'Steadier investor mortgage rate used after the opening years for house investment scenarios.',
  houseGrowthMean: 'Baseline annual house price growth used for the house path.',
  houseCouncilRates: 'Annual council rates for the house. Land tax is modeled separately as an estimated investment-property cost, while council rates use a NSW council-style fixed base plus a value-linked component.',
  houseStampDuty: 'Shared baseline stamp duty for the house purchase using the current NSW stepped schedule. The owner path still applies an eligibility-dependent first-home-buyer concession estimate, while the investment path uses the full amount.',
  houseLegalFees: 'Shared legal and conveyancing cost baseline for the house purchase. It feeds both owner and investment paths.',
  houseBuyersCosts: 'Shared buyer-side purchase cost baseline for the house purchase, such as inspections and settlement extras.',
  houseWaterRates: 'Annual water charges. They count as a cash housing cost for owner-occupier paths and as a deductible rental expense for investment-property paths.',
  houseInsurance: 'Annual house insurance assumption. It is editable and auto-refreshes from a NSW market baseline when the target price changes.',
  houseMaintenance: 'Annual house maintenance allowance. It is editable and auto-refreshes from a fixed-base-plus-scaling baseline when the target price changes.',
  houseBorrowingExpensesTotal: 'Upfront loan-establishment style costs for the investment-property path. The model treats them as upfront cash and amortises the deduction over time.',
  houseOtherDeductibleExpensesAnnual: 'Other annual deductible rental expenses that are not already broken out above.',
  apartmentRentYield: 'Gross rental yield used when the apartment is held as an investment property.',
  apartmentPropertyManagementPct: 'Property manager fee applied to collected rent for the apartment investment path.',
  apartmentPurchasePrice: 'Manual apartment target in today\'s dollars. If it is above today\'s assessed serviceability limit, the model waits and lets the target grow with apartment prices until income and cash catch up.',
  apartmentOwnerDepositPct: 'Owner-occupier deposit share used for the buy-to-live path and the max-affordable-today calculation. First-home-buyer cases still default to 5 percent up to the selected area\'s low-deposit cap, while any resulting LMI remains an estimate only.',
  apartmentDepositPct: 'Deposit share for the apartment investment purchase. Lower deposits increase leverage and can increase estimated lenders mortgage insurance.',
  apartmentMortgageYears: 'Length of the apartment mortgage used for amortization and repayment calculations.',
  apartmentOwnerInterestRate: 'Starting owner-occupier mortgage rate for the apartment path before drifting toward the long-run owner rate.',
  apartmentOwnerLongRunInterestRate: 'Steadier owner-occupier mortgage rate used after the opening years for apartment scenarios.',
  apartmentInvestmentInterestRate: 'Starting investor mortgage rate for the apartment investment path and serviceability checks.',
  apartmentInvestmentLongRunInterestRate: 'Steadier investor mortgage rate used after the opening years for apartment investment scenarios.',
  apartmentGrowthMean: 'Baseline annual apartment price growth used for the apartment path.',
  apartmentCouncilRates: 'Annual council rates for the apartment. Land tax is modeled separately as an estimated investment-property cost, while the default uses a NSW-style fixed base plus a value-linked component.',
  apartmentStampDuty: 'Shared baseline stamp duty for the apartment purchase using the current NSW stepped schedule. The owner path still applies an eligibility-dependent first-home-buyer concession estimate, while the investment path uses the full amount.',
  apartmentLegalFees: 'Shared legal and conveyancing cost baseline for the apartment purchase. It feeds both owner and investment paths.',
  apartmentBuyersCosts: 'Shared buyer-side purchase cost baseline for the apartment purchase, such as inspections and settlement extras.',
  apartmentWaterRates: 'Annual water charges applied to apartment ownership.',
  apartmentInsurance: 'Annual apartment insurance assumption. It is editable and auto-refreshes from a NSW market baseline when the target price changes.',
  apartmentMaintenance: 'Annual apartment maintenance allowance. It is editable and auto-refreshes from a fixed-base-plus-scaling baseline when the target price changes.',
  apartmentStrata: 'Annual strata levy assumption used for the apartment paths. It stays editable and scales from a Sydney-style strata baseline.',
  apartmentBorrowingExpensesTotal: 'Upfront borrowing expenses for the apartment investment path.',
  apartmentOtherDeductibleExpensesAnnual: 'Other annual deductible apartment rental expenses.'
}

const valueHelp = {
  asxReturnMean: 'Based on the average of the last 15 years.',
  qqqReturnMean: 'Based on the average of the last 15 years for the US sleeve.',
  bondReturnMean: 'Based on a long-run bond return baseline rather than a short-term rate print.',
  cashReturnMean: 'Based on a cash-rate style baseline with low volatility.',
  asxDividendYield: 'Based on a recent long-run ASX cash distribution average.',
  bondIncomeYield: 'Based on a representative long-run bond income yield.',
  qqqDividendYield: 'Based on a recent long-run US equity cash distribution average.',
  houseOwnerInterestRate: 'Defaulted from recent RBA owner-occupier housing-loan rates.',
  houseOwnerLongRunInterestRate: 'Set slightly below the opening owner rate to represent a steadier long-run borrowing environment.',
  houseInvestmentInterestRate: 'Defaulted from recent RBA investor housing-loan rates.',
  houseInvestmentLongRunInterestRate: 'Set slightly below the opening investor rate to represent a steadier long-run borrowing environment.',
  houseRentYield: 'Gross rent is modeled as property value x rent yield x (1 - vacancy).',
  housePropertyManagementPct: 'Management is modeled as a share of collected rent, so higher rents increase the dollar fee automatically.',
  houseCouncilRates: 'Changing the house target price rescales this field from a fixed-base NSW council-style formula rather than a straight price ratio. This is the only visible council-and-land-tax holding-cost field.',
  houseWaterRates: 'Changing the house target price rescales this field from Sydney Water style service-and-usage charges rather than a straight price ratio.',
  houseInsurance: 'Changing the house target price rescales this field from a NSW market insurance baseline with a fixed base and value-linked component.',
  houseMaintenance: 'Changing the house target price rescales this field from a fixed-base maintenance baseline rather than a straight price ratio.',
  houseStampDuty: 'Changing the house target price recalculates this baseline from the NSW transfer-duty schedule before owner concessions are applied.',
  houseLegalFees: 'Changing the house target price rescales this legal-fee baseline from an affine conveyancing formula, not a pure proportion of price.',
  houseBuyersCosts: 'Changing the house target price rescales this buyer-cost baseline from an affine due-diligence and settlement-cost formula.',
  houseBorrowingExpensesTotal: 'Changing the house target price rescales this field from lender-fee examples plus fixed government charges.',
  houseOtherDeductibleExpensesAnnual: 'Changing the house target price rescales this misc deductible-cost baseline from a fixed base plus light value-linked component.',
  apartmentOwnerInterestRate: 'Defaulted from recent RBA owner-occupier housing-loan rates.',
  apartmentOwnerLongRunInterestRate: 'Set slightly below the opening owner rate to represent a steadier long-run borrowing environment.',
  apartmentInvestmentInterestRate: 'Defaulted from recent RBA investor housing-loan rates.',
  apartmentInvestmentLongRunInterestRate: 'Set slightly below the opening investor rate to represent a steadier long-run borrowing environment.',
  apartmentRentYield: 'Gross rent is modeled as property value x rent yield x (1 - vacancy).',
  apartmentPropertyManagementPct: 'Management is modeled as a share of collected rent, so higher rents increase the dollar fee automatically.',
  apartmentCouncilRates: 'Changing the apartment target price rescales this field from a fixed-base NSW council-style formula rather than a straight price ratio. This is the only visible council-and-land-tax holding-cost field.',
  apartmentWaterRates: 'Changing the apartment target price rescales this field from Sydney Water style service-and-usage charges rather than a straight price ratio.',
  apartmentInsurance: 'Changing the apartment target price rescales this field from a NSW market insurance baseline with a fixed base and value-linked component.',
  apartmentMaintenance: 'Changing the apartment target price rescales this field from a fixed-base maintenance baseline rather than a straight price ratio.',
  apartmentStrata: 'Changing the apartment target price rescales this field from a Sydney-style strata levy baseline rather than a straight price ratio.',
  apartmentStampDuty: 'Changing the apartment target price recalculates this baseline from the NSW transfer-duty schedule before owner concessions are applied.',
  apartmentLegalFees: 'Changing the apartment target price rescales this legal-fee baseline from an affine conveyancing formula, not a pure proportion of price.',
  apartmentBuyersCosts: 'Changing the apartment target price rescales this buyer-cost baseline from an affine due-diligence and settlement-cost formula.',
  apartmentBorrowingExpensesTotal: 'Changing the apartment target price rescales this field from lender-fee examples plus fixed government charges.',
  apartmentOtherDeductibleExpensesAnnual: 'Changing the apartment target price rescales this misc deductible-cost baseline from a fixed base plus light value-linked component.',
}

const form = reactive(cloneSimulationRequest())
form.propertyConfig.vacancyRate = wealthVacancyRate
form.propertyConfig.house.landTax = 0
form.propertyConfig.apartment.landTax = 0
const portfolioAllocationFields = [
  { key: 'qqqWeight', label: 'US Stock - QQQ', shortLabel: 'QQQ', color: '#2563eb', testId: 'us-allocation' },
  { key: 'asxWeight', label: 'AU Stocks - ASX200', shortLabel: 'ASX200', color: '#16a34a', testId: 'asx-allocation' },
  { key: 'bondWeight', label: 'Bonds', shortLabel: 'Bonds', color: '#f59e0b', testId: 'bond-allocation' },
  { key: 'cashWeight', label: 'High Interest Cash Account', shortLabel: 'Cash', color: '#475569', testId: 'cash-allocation' }
]
const result = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const lastRunAt = ref('')
const currentStage = ref(1)
const resultsStale = ref(true)
const mutedStrategyKeys = ref([])
const client = new WealthSimulationClient()
const mortgageYearOptions = [20, 25, 30]
const ownerOccupierFirstHomeBuyerSupport = true
const heroRef = ref(null)
const heroTitleRef = ref(null)
const allocationBarRef = ref(null)
const activeAllocationHandleIndex = ref(null)
const selectedSuburbSelection = ref(null)
let runToken = 0
let heroResizeFrame = 0
let heroResizeObserver = null

const suburbSearchContext = computed(() => buildSuburbSearchContext(wealthPropertyMarketData))

const selectedSuburbRecord = computed(() => {
  const slug = selectedSuburbSelection.value?.slug
  return slug ? suburbSearchContext.value.suburbsBySlug[slug] || null : null
})

const selectedSuburbPreview = computed(() => createPropertyConfigPatchFromSuburb(selectedSuburbRecord.value) || {
  house: null,
  apartment: null,
  vacancyRate: null
})

async function resizeHeroTitle() {
  await nextTick()

  const hero = heroRef.value
  const title = heroTitleRef.value

  if (!hero || !title) return

  const maxFontSize = 72
  const minFontSize = 14
  const availableWidth = hero.clientWidth
  let fontSize = maxFontSize

  title.style.fontSize = `${maxFontSize}px`

  while (fontSize > minFontSize && title.scrollWidth > availableWidth) {
    fontSize -= 1
    title.style.fontSize = `${fontSize}px`
  }
}

function scheduleHeroTitleResize() {
  if (heroResizeFrame) cancelAnimationFrame(heroResizeFrame)
  heroResizeFrame = requestAnimationFrame(() => {
    heroResizeFrame = 0
    void resizeHeroTitle()
  })
}

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
  const request = JSON.parse(JSON.stringify(form))
  request.propertyConfig.firstHomeBuyerEligible = ownerOccupierFirstHomeBuyerSupport
  request.propertyConfig.vacancyRate = clamp(Number(form.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  request.propertyConfig.house.landTax = 0
  request.propertyConfig.apartment.landTax = 0
  return request
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

async function enterResultsStage() {
  currentStage.value = 2
  await nextTick()
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

async function generateResults() {
  const ok = await runSimulation()
  if (ok) await enterResultsStage()
}

async function rerunResults() {
  await runSimulation()
}

function goToInputs() {
  currentStage.value = 1
}

async function goToResults() {
  if (result.value) await enterResultsStage()
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
  () => props.project.title,
  () => {
    scheduleHeroTitleResize()
  }
)

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

watch(
  () => form.propertyConfig.house.purchasePrice,
  (value, previousValue) => {
    const safeValue = Math.max(0, Number(value) || 0)
    if (safeValue !== value) {
      form.propertyConfig.house.purchasePrice = safeValue
      return
    }

    syncSharedPurchaseCosts('house', form.propertyConfig.house, previousValue, safeValue)
    syncPropertyCostsWithPrice('house', form.propertyConfig.house, housePropertyCostKeys, previousValue, safeValue)
  }
)

watch(
  () => form.propertyConfig.apartment.purchasePrice,
  (value, previousValue) => {
    const safeValue = Math.max(0, Number(value) || 0)
    if (safeValue !== value) {
      form.propertyConfig.apartment.purchasePrice = safeValue
      return
    }

    syncSharedPurchaseCosts('apartment', form.propertyConfig.apartment, previousValue, safeValue)
    syncPropertyCostsWithPrice('apartment', form.propertyConfig.apartment, apartmentPropertyCostKeys, previousValue, safeValue)
  }
)

onMounted(() => {
  scheduleHeroTitleResize()

  if (typeof ResizeObserver === 'function') {
    heroResizeObserver = new ResizeObserver(() => {
      scheduleHeroTitleResize()
    })

    if (heroRef.value) {
      heroResizeObserver.observe(heroRef.value)
    }
  } else {
    window.addEventListener('resize', scheduleHeroTitleResize)
  }
})

onBeforeUnmount(() => {
  stopPortfolioHandleDrag()
  client.destroy()

  if (heroResizeFrame) {
    cancelAnimationFrame(heroResizeFrame)
  }

  if (heroResizeObserver) {
    heroResizeObserver.disconnect()
  } else {
    window.removeEventListener('resize', scheduleHeroTitleResize)
  }
})

function percentProxy(getter, setter, min, max) {
  return computed({
    get: () => Number((getter() * 100).toFixed(1)),
    set: value => setter(clamp(Number(value) || 0, min, max) / 100)
  })
}

function handleSuburbSelect(selection) {
  selectedSuburbSelection.value = selection
  applySuburbMarketToFormBySlug(form, suburbSearchContext.value.suburbsBySlug, selection?.slug)
}

const profileIncomeGrowthPct = percentProxy(() => form.profile.incomeGrowthRate, value => { form.profile.incomeGrowthRate = value }, 0, 10)
const rentGrowthPct = percentProxy(() => form.housingCosts.rentGrowthRate, value => { form.housingCosts.rentGrowthRate = value }, 0, 10)
const boardGrowthPct = percentProxy(() => form.housingCosts.boardGrowthRate, value => { form.housingCosts.boardGrowthRate = value }, 0, 10)
const asxReturnPct = percentProxy(() => form.portfolioConfig.asxReturnMean, value => { form.portfolioConfig.asxReturnMean = value }, 0, 20)
const qqqReturnPct = percentProxy(() => form.portfolioConfig.qqqReturnMean, value => { form.portfolioConfig.qqqReturnMean = value }, 0, 25)
const bondReturnPct = percentProxy(() => form.portfolioConfig.bondReturnMean, value => { form.portfolioConfig.bondReturnMean = value }, 0, 12)
const cashReturnPct = percentProxy(() => form.portfolioConfig.cashReturnMean, value => { form.portfolioConfig.cashReturnMean = value }, 0, 10)
const asxDividendPct = percentProxy(() => form.portfolioConfig.asxDividendYield, value => { form.portfolioConfig.asxDividendYield = value }, 0, 10)
const bondIncomePct = percentProxy(() => form.portfolioConfig.bondIncomeYield, value => { form.portfolioConfig.bondIncomeYield = value }, 0, 8)
const qqqDividendPct = percentProxy(() => form.portfolioConfig.qqqDividendYield, value => { form.portfolioConfig.qqqDividendYield = value }, 0, 5)
const asxFrankingPct = percentProxy(() => form.portfolioConfig.asxFrankingPct, value => { form.portfolioConfig.asxFrankingPct = value }, 0, 100)
const houseOwnerDepositPct = percentProxy(() => form.propertyConfig.house.ownerDepositPct, value => { form.propertyConfig.house.ownerDepositPct = value }, 5, 80)
const apartmentOwnerDepositPct = percentProxy(() => form.propertyConfig.apartment.ownerDepositPct, value => { form.propertyConfig.apartment.ownerDepositPct = value }, 5, 80)
const houseDepositPct = percentProxy(() => form.propertyConfig.house.depositPct, value => { form.propertyConfig.house.depositPct = value }, 5, 80)
const apartmentDepositPct = percentProxy(() => form.propertyConfig.apartment.depositPct, value => { form.propertyConfig.apartment.depositPct = value }, 5, 80)
const houseOwnerRatePct = percentProxy(() => form.propertyConfig.house.ownerInterestRate, value => { form.propertyConfig.house.ownerInterestRate = value }, 1, 12)
const apartmentOwnerRatePct = percentProxy(() => form.propertyConfig.apartment.ownerInterestRate, value => { form.propertyConfig.apartment.ownerInterestRate = value }, 1, 12)
const houseInvestmentRatePct = percentProxy(() => form.propertyConfig.house.investmentInterestRate, value => { form.propertyConfig.house.investmentInterestRate = value }, 1, 12)
const apartmentInvestmentRatePct = percentProxy(() => form.propertyConfig.apartment.investmentInterestRate, value => { form.propertyConfig.apartment.investmentInterestRate = value }, 1, 12)
const houseOwnerLongRunRatePct = percentProxy(
  () => form.propertyConfig.house.ownerLongRunInterestRate,
  value => { form.propertyConfig.house.ownerLongRunInterestRate = value },
  1,
  12
)
const apartmentOwnerLongRunRatePct = percentProxy(
  () => form.propertyConfig.apartment.ownerLongRunInterestRate,
  value => { form.propertyConfig.apartment.ownerLongRunInterestRate = value },
  1,
  12
)
const houseInvestmentLongRunRatePct = percentProxy(
  () => form.propertyConfig.house.investmentLongRunInterestRate,
  value => { form.propertyConfig.house.investmentLongRunInterestRate = value },
  1,
  12
)
const apartmentInvestmentLongRunRatePct = percentProxy(
  () => form.propertyConfig.apartment.investmentLongRunInterestRate,
  value => { form.propertyConfig.apartment.investmentLongRunInterestRate = value },
  1,
  12
)
const houseGrowthPct = percentProxy(() => form.propertyConfig.house.growthMean, value => { form.propertyConfig.house.growthMean = value }, 0, 12)
const apartmentGrowthPct = percentProxy(() => form.propertyConfig.apartment.growthMean, value => { form.propertyConfig.apartment.growthMean = value }, 0, 12)
const houseRentYieldPct = percentProxy(() => form.propertyConfig.house.rentYield, value => { form.propertyConfig.house.rentYield = value }, 0, 10)
const apartmentRentYieldPct = percentProxy(() => form.propertyConfig.apartment.rentYield, value => { form.propertyConfig.apartment.rentYield = value }, 0, 10)
const houseManagementPct = percentProxy(
  () => form.propertyConfig.house.propertyManagementPct,
  value => { form.propertyConfig.house.propertyManagementPct = value },
  0,
  15
)
const apartmentManagementPct = percentProxy(
  () => form.propertyConfig.apartment.propertyManagementPct,
  value => { form.propertyConfig.apartment.propertyManagementPct = value },
  0,
  15
)
const housePropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']
const apartmentPropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'strata', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']

function getSharedPurchaseCost(property, key) {
  return Math.max(
    0,
    Number(property.ownerPurchaseCosts?.[key] ?? property.investmentPurchaseCosts?.[key]) || 0
  )
}

function setSharedPurchaseCost(property, key, value) {
  const safeValue = Math.max(0, Number(value) || 0)
  property.ownerPurchaseCosts[key] = safeValue
  property.investmentPurchaseCosts[key] = safeValue
}

function scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline) {
  const safeCurrentValue = Math.max(0, Number(currentValue) || 0)
  const safePreviousBaseline = Math.max(0, Number(previousBaseline) || 0)
  const safeNextBaseline = Math.max(0, Number(nextBaseline) || 0)

  if (safeCurrentValue <= 0) return 0
  if (safePreviousBaseline > 0 && safeNextBaseline > 0) {
    return Math.round((safeCurrentValue / safePreviousBaseline) * safeNextBaseline)
  }
  return Math.round(Math.max(0, safeCurrentValue + (safeNextBaseline - safePreviousBaseline)))
}

function syncSharedPurchaseCosts(propertyType, property, previousPrice, nextPrice) {
  const scaledCosts = scalePurchaseCostsWithPrice(
    {
      stampDuty: getSharedPurchaseCost(property, 'stampDuty'),
      legalFees: getSharedPurchaseCost(property, 'legalFees'),
      buyersCosts: getSharedPurchaseCost(property, 'buyersCosts')
    },
    previousPrice,
    nextPrice,
    propertyType
  )

  setSharedPurchaseCost(property, 'stampDuty', scaledCosts.stampDuty)
  setSharedPurchaseCost(property, 'legalFees', scaledCosts.legalFees)
  setSharedPurchaseCost(property, 'buyersCosts', scaledCosts.buyersCosts)
}

function syncPropertyCostsWithPrice(propertyType, property, keys, previousPrice, nextPrice) {
  const safePreviousPrice = Math.max(0, Number(previousPrice) || 0)
  const safeNextPrice = Math.max(0, Number(nextPrice) || 0)
  if (safeNextPrice <= 0) {
    keys.forEach((key) => {
      property[key] = 0
    })
    return
  }

  keys.forEach((key) => {
    const currentValue = Math.max(0, Number(property[key]) || 0)
    const previousBaseline = safePreviousPrice > 0
      ? estimatePropertyCostFromPrice(propertyType, key, safePreviousPrice)
      : 0
    const nextBaseline = estimatePropertyCostFromPrice(propertyType, key, safeNextPrice)
    property[key] = scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline)
  })
}

function createPriceAdjustedProperty(propertyType, property, nextPrice) {
  const safeNextPrice = Math.max(0, Number(nextPrice) || 0)
  const safePreviousPrice = Math.max(0, Number(property.purchasePrice) || 0)
  const costKeys = propertyType === 'apartment' ? apartmentPropertyCostKeys : housePropertyCostKeys
  const adjustedProperty = {
    ...property,
    purchasePrice: safeNextPrice,
    landTax: 0,
    ownerPurchaseCosts: {
      ...(property.ownerPurchaseCosts || {})
    },
    investmentPurchaseCosts: {
      ...(property.investmentPurchaseCosts || {})
    }
  }

  if (safeNextPrice <= 0) {
    costKeys.forEach((key) => {
      adjustedProperty[key] = 0
    })
    adjustedProperty.ownerPurchaseCosts = scalePurchaseCostsWithPrice(
      property.ownerPurchaseCosts,
      safePreviousPrice,
      safeNextPrice,
      propertyType
    )
    adjustedProperty.investmentPurchaseCosts = scalePurchaseCostsWithPrice(
      property.investmentPurchaseCosts,
      safePreviousPrice,
      safeNextPrice,
      propertyType
    )
    return adjustedProperty
  }

  costKeys.forEach((key) => {
    const currentValue = Math.max(0, Number(property[key]) || 0)
    const previousBaseline = safePreviousPrice > 0
      ? estimatePropertyCostFromPrice(propertyType, key, safePreviousPrice)
      : 0
    const nextBaseline = estimatePropertyCostFromPrice(propertyType, key, safeNextPrice)
    adjustedProperty[key] = scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline)
  })

  adjustedProperty.ownerPurchaseCosts = scalePurchaseCostsWithPrice(
    property.ownerPurchaseCosts,
    safePreviousPrice,
    safeNextPrice,
    propertyType
  )
  adjustedProperty.investmentPurchaseCosts = scalePurchaseCostsWithPrice(
    property.investmentPurchaseCosts,
    safePreviousPrice,
    safeNextPrice,
    propertyType
  )

  return adjustedProperty
}

function createSharedPurchaseCostProxy(propertyGetter, key) {
  return computed({
    get: () => getSharedPurchaseCost(propertyGetter(), key),
    set: value => setSharedPurchaseCost(propertyGetter(), key, value)
  })
}

const houseStampDuty = createSharedPurchaseCostProxy(() => form.propertyConfig.house, 'stampDuty')
const houseLegalFees = createSharedPurchaseCostProxy(() => form.propertyConfig.house, 'legalFees')
const houseBuyersCosts = createSharedPurchaseCostProxy(() => form.propertyConfig.house, 'buyersCosts')
const apartmentStampDuty = createSharedPurchaseCostProxy(() => form.propertyConfig.apartment, 'stampDuty')
const apartmentLegalFees = createSharedPurchaseCostProxy(() => form.propertyConfig.apartment, 'legalFees')
const apartmentBuyersCosts = createSharedPurchaseCostProxy(() => form.propertyConfig.apartment, 'buyersCosts')

syncSharedPurchaseCosts('house', form.propertyConfig.house, form.propertyConfig.house.purchasePrice, form.propertyConfig.house.purchasePrice)
syncSharedPurchaseCosts('apartment', form.propertyConfig.apartment, form.propertyConfig.apartment.purchasePrice, form.propertyConfig.apartment.purchasePrice)
syncPropertyCostsWithPrice(
  'house',
  form.propertyConfig.house,
  housePropertyCostKeys,
  form.propertyConfig.house.purchasePrice,
  form.propertyConfig.house.purchasePrice
)
syncPropertyCostsWithPrice(
  'apartment',
  form.propertyConfig.apartment,
  apartmentPropertyCostKeys,
  form.propertyConfig.apartment.purchasePrice,
  form.propertyConfig.apartment.purchasePrice
)

function getPortfolioAllocationPct(key) {
  return Math.round((Math.max(0, Number(form.portfolioConfig[key]) || 0) * 100))
}

function getPortfolioAllocationWidth(key) {
  return Math.max(0, Number(form.portfolioConfig[key]) || 0) * 100
}

const portfolioAllocationBoundaries = computed(() => {
  let cumulativeWeight = 0

  return portfolioAllocationFields.slice(0, -1).map((field, index) => {
    cumulativeWeight += Math.max(0, Number(form.portfolioConfig[field.key]) || 0)
    return {
      key: `${field.key}-${portfolioAllocationFields[index + 1].key}`,
      index,
      leftLabel: field.label,
      rightLabel: portfolioAllocationFields[index + 1].label,
      position: cumulativeWeight * 100
    }
  })
})

function setPortfolioAllocation(targetKey, value) {
  const keys = portfolioAllocationFields.map(field => field.key)
  const nextWeight = clamp(Number(value) || 0, 0, 100) / 100
  const otherKeys = keys.filter(key => key !== targetKey)
  const otherValues = otherKeys.map(key => Math.max(0, Number(form.portfolioConfig[key]) || 0))
  const otherTotal = otherValues.reduce((sum, weight) => sum + weight, 0)
  const remainingWeight = 1 - nextWeight

  form.portfolioConfig[targetKey] = nextWeight

  if (remainingWeight <= 0) {
    otherKeys.forEach(key => {
      form.portfolioConfig[key] = 0
    })
    return
  }

  let assignedWeight = nextWeight
  otherKeys.forEach((key, index) => {
    const nextShare = otherTotal > 0
      ? remainingWeight * (otherValues[index] / otherTotal)
      : remainingWeight / otherKeys.length

    if (index === otherKeys.length - 1) {
      form.portfolioConfig[key] = Math.max(0, 1 - assignedWeight)
      return
    }

    form.portfolioConfig[key] = nextShare
    assignedWeight += nextShare
  })
}

function setPortfolioBoundary(index, clientX) {
  const bar = allocationBarRef.value
  if (!bar) return

  const rect = bar.getBoundingClientRect()
  if (rect.width <= 0) return

  const leftField = portfolioAllocationFields[index]
  const rightField = portfolioAllocationFields[index + 1]
  if (!leftField || !rightField) return

  const leadingWeight = portfolioAllocationFields
    .slice(0, index)
    .reduce((sum, field) => sum + Math.max(0, Number(form.portfolioConfig[field.key]) || 0), 0)
  const pairWeight =
    Math.max(0, Number(form.portfolioConfig[leftField.key]) || 0) +
    Math.max(0, Number(form.portfolioConfig[rightField.key]) || 0)

  const pairStart = rect.left + leadingWeight * rect.width
  const pairEnd = pairStart + pairWeight * rect.width
  const clampedX = clamp(clientX, pairStart, pairEnd)
  const nextLeftWeight = rect.width > 0
    ? clamp((clampedX - pairStart) / rect.width, 0, pairWeight)
    : 0

  form.portfolioConfig[leftField.key] = nextLeftWeight
  form.portfolioConfig[rightField.key] = Math.max(0, pairWeight - nextLeftWeight)
}

function handlePortfolioPointerMove(event) {
  if (activeAllocationHandleIndex.value === null) return
  setPortfolioBoundary(activeAllocationHandleIndex.value, event.clientX)
}

function stopPortfolioHandleDrag() {
  activeAllocationHandleIndex.value = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', handlePortfolioPointerMove)
    window.removeEventListener('pointerup', stopPortfolioHandleDrag)
    window.removeEventListener('pointercancel', stopPortfolioHandleDrag)
  }

  if (typeof document !== 'undefined') {
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }
}

function startPortfolioHandleDrag(index, event) {
  activeAllocationHandleIndex.value = index
  event.currentTarget?.setPointerCapture?.(event.pointerId)
  setPortfolioBoundary(index, event.clientX)
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', handlePortfolioPointerMove)
    window.addEventListener('pointerup', stopPortfolioHandleDrag)
    window.addEventListener('pointercancel', stopPortfolioHandleDrag)
  }

  if (typeof document !== 'undefined') {
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }
}

const strategyCards = computed(() => {
  if (!result.value) return []
  const rent = result.value.strategies.rentInvest
  return wealthStrategyOrder.map((key) => {
    const strategy = result.value.strategies[key]
    let breakevenYear = null
    if (key !== 'rentInvest') {
      const hit = strategy.points.find(point => {
        const rentPoint = rent.points.find(candidate => candidate.year === point.year)
        return rentPoint && point.p50 > rentPoint.p50
      })
      breakevenYear = hit ? hit.year : null
    }
    const purchasePoint = strategy.points.find(point => point.homeEquityP50 > 0)
    return {
      ...strategy,
      breakevenYear,
      purchaseYear: purchasePoint ? purchasePoint.year : null,
      purchaseNote: key.includes('InvestmentProperty')
        ? 'Then shifts into rent plus investment-property cashflows'
        : 'Then shifts into owner-occupier cashflows'
    }
  }).sort((left, right) => {
    const outcomeGap = right.summary.finalMedianNetWorth - left.summary.finalMedianNetWorth
    if (outcomeGap !== 0) return outcomeGap
    return right.summary.downsideRisk - left.summary.downsideRisk
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
    body: `${winner.label} is the first non-renting strategy to overtake rent + invest on the median after-tax path.`
  }
})

function buildSellDownSeries(valueMapper) {
  return strategyCards.value.map(strategy => ({
    id: strategy.key,
    label: strategy.label,
    color: strategy.color,
    accent: strategy.accent,
    points: strategy.points.map(point => valueMapper(point))
  }))
}

function discountToToday(value, year) {
  const rate = clamp(Number(form.housingCosts.rentGrowthRate) || 0, 0, 0.1)
  return Math.round((Number(value) || 0) / Math.pow(1 + rate, year))
}

const netWorthSeries = computed(() =>
  buildSellDownSeries(point => ({
    year: point.year,
    low: point.p10,
    mid: point.p50,
    high: point.p90
  }))
)

const inflationAdjustedNetWorthSeries = computed(() =>
  buildSellDownSeries(point => ({
    year: point.year,
    low: discountToToday(point.p10, point.year),
    mid: discountToToday(point.p50, point.year),
    high: discountToToday(point.p90, point.year)
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
      low: point.annualSurplusP10,
      mid: point.annualSurplusP50,
      high: point.annualSurplusP90
    }))
  }))
)

const compositionRows = computed(() =>
  strategyCards.value
    .map(strategy => ({
      key: strategy.key,
      label: strategy.shortLabel,
      liquid: Math.max(0, strategy.summary.finalMedianLiquidAssets),
      equity: Math.max(0, strategy.summary.finalMedianHomeEquity),
      debt: Math.max(0, strategy.summary.finalMedianDebt),
      total: strategy.summary.finalMedianHoldNetWorth
    }))
    .sort((left, right) => right.total - left.total)
)

function getPropertySnapshot(property, purchaseCosts, occupancyMode, firstHomeBuyerEligible, includeBorrowingExpenses = false) {
  const depositPct = occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(property)
    : getEffectiveInvestmentDepositPct(property)
  const resolvedPurchaseCosts = calculatePurchaseCosts(purchaseCosts, firstHomeBuyerEligible, property.purchasePrice)
  const deposit = property.purchasePrice * depositPct
  const borrowingExpenses = includeBorrowingExpenses ? (Number(property.borrowingExpensesTotal) || 0) : 0
  return {
    upfront: deposit + resolvedPurchaseCosts.total + borrowingExpenses,
    loan: property.purchasePrice - deposit + estimateLmi(property.purchasePrice, depositPct, firstHomeBuyerEligible)
  }
}

function getOwnerLoanForPrice(property, purchasePrice, depositPct, firstHomeBuyerEligible) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const safeDepositPct = clamp(Number(depositPct) || 0.05, 0.05, 0.95)
  const deposit = safePrice * safeDepositPct
  return safePrice - deposit + estimateLmi(safePrice, safeDepositPct, firstHomeBuyerEligible)
}

function getCurrentPersonalHousingCostAnnual() {
  const weeklyHousingCost = form.housingCosts.liveAtHome
    ? form.housingCosts.weeklyBoardAtHome
    : form.housingCosts.weeklyRent
  return Math.max(0, Number(weeklyHousingCost) || 0) * 52
}

function assessCurrentPurchaseCashflow(propertyType, property, occupancyMode, openingLoanBalance, propertyValue) {
  const priceAdjustedProperty = createPriceAdjustedProperty(propertyType, property, propertyValue)
  const annualIncome = Math.max(0, Number(form.profile.annualIncome) || 0)
  const annualLivingCosts = Math.max(0, Number(form.profile.weeklyNonHousingLivingCosts) || 0) * 52
  const salaryOnlyTax = calculateAustralianAnnualTax({
    taxYear: form.profile.taxYear,
    salaryIncome: annualIncome
  })
  const annualDisposableAfterLiving = annualIncome - salaryOnlyTax.totalTax - annualLivingCosts
  const productRate = getPropertyInterestRate(priceAdjustedProperty, occupancyMode)
  const annualMortgagePayment = calculateAnnualMortgagePayment(
    openingLoanBalance,
    productRate,
    priceAdjustedProperty.mortgageYears
  )

  if (occupancyMode === 'owner') {
    const annualCarry = annualMortgagePayment + getOwnerHoldingCosts(priceAdjustedProperty)
    return {
      annualLivingCosts,
      annualDisposableAfterLiving,
      annualMortgagePayment,
      annualCarry,
      rate: productRate,
      affordable: annualDisposableAfterLiving >= annualCarry
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: priceAdjustedProperty,
    propertyValue,
    vacancyRate: clamp(Number(form.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12),
    interestPaid: Math.max(0, Number(openingLoanBalance) || 0) * productRate,
    yearsOwned: 0
  })
  const taxPosition = calculateAustralianAnnualTax({
    taxYear: form.profile.taxYear,
    salaryIncome: annualIncome,
    taxableRentalIncome: rentalTaxPosition.taxableRentalIncome
  })
  const annualCarry =
    getCurrentPersonalHousingCostAnnual() +
    annualMortgagePayment +
    rentalTaxPosition.cashOperatingExpenses -
    rentalTaxPosition.rentReceived +
    taxPosition.deltaVsSalaryOnly

  return {
    annualLivingCosts,
    annualDisposableAfterLiving,
    annualMortgagePayment,
    annualCarry,
    rate: productRate,
    taxDelta: taxPosition.deltaVsSalaryOnly,
    rentalTaxPosition,
    affordable: annualDisposableAfterLiving >= annualCarry
  }
}

function assessCurrentPurchaseServiceability(propertyType, property, occupancyMode, openingLoanBalance, propertyValue) {
  const priceAdjustedProperty = createPriceAdjustedProperty(propertyType, property, propertyValue)
  return assessPropertyPurchaseServiceability({
    taxYear: form.profile.taxYear,
    annualIncome: form.profile.annualIncome,
    weeklyNonHousingLivingCosts: form.profile.weeklyNonHousingLivingCosts,
    occupancyMode,
    propertyConfig: priceAdjustedProperty,
    propertyValue,
    mortgageYears: priceAdjustedProperty.mortgageYears,
    openingLoanBalance,
    personalHousingCostAnnual: occupancyMode === 'investment' ? getCurrentPersonalHousingCostAnnual() : 0,
    vacancyRate: clamp(Number(form.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  })
}

function solveMaxAffordablePriceRange(propertyType, property, minimumPrice, maximumPrice, depositPct, firstHomeBuyerEligible) {
  if (maximumPrice <= minimumPrice) return 0

  const minimumLoan = getOwnerLoanForPrice(property, minimumPrice, depositPct, firstHomeBuyerEligible)
  const minimumCashflow = assessCurrentPurchaseCashflow(propertyType, property, 'owner', minimumLoan, minimumPrice)
  if (minimumCashflow.annualDisposableAfterLiving <= 0) return 0
  if (!minimumCashflow.affordable) return 0

  const maximumLoan = getOwnerLoanForPrice(property, maximumPrice, depositPct, firstHomeBuyerEligible)
  const maximumCashflow = assessCurrentPurchaseCashflow(propertyType, property, 'owner', maximumLoan, maximumPrice)
  if (maximumCashflow.affordable) {
    return Math.floor(maximumPrice / 1000) * 1000
  }

  let low = minimumPrice
  let high = maximumPrice
  for (let step = 0; step < 32; step += 1) {
    const midpoint = (low + high) / 2
    const loan = getOwnerLoanForPrice(property, midpoint, depositPct, firstHomeBuyerEligible)
    const cashflow = assessCurrentPurchaseCashflow(propertyType, property, 'owner', loan, midpoint)
    if (cashflow.affordable) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  return Math.floor(low / 1000) * 1000
}

function solveMaxServiceablePriceRange(propertyType, property, minimumPrice, maximumPrice, depositPct, firstHomeBuyerEligible) {
  if (maximumPrice <= minimumPrice) return 0

  const minimumLoan = getOwnerLoanForPrice(property, minimumPrice, depositPct, firstHomeBuyerEligible)
  const minimumServiceability = assessCurrentPurchaseServiceability(propertyType, property, 'owner', minimumLoan, minimumPrice)
  if (minimumServiceability.annualDisposableAfterLiving <= 0) return 0
  if (!minimumServiceability.affordable) return 0

  const maximumLoan = getOwnerLoanForPrice(property, maximumPrice, depositPct, firstHomeBuyerEligible)
  const maximumServiceability = assessCurrentPurchaseServiceability(propertyType, property, 'owner', maximumLoan, maximumPrice)
  if (maximumServiceability.affordable) {
    return Math.floor(maximumPrice / 1000) * 1000
  }

  let low = minimumPrice
  let high = maximumPrice
  for (let step = 0; step < 32; step += 1) {
    const midpoint = (low + high) / 2
    const loan = getOwnerLoanForPrice(property, midpoint, depositPct, firstHomeBuyerEligible)
    const serviceability = assessCurrentPurchaseServiceability(propertyType, property, 'owner', loan, midpoint)
    if (serviceability.affordable) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  return Math.floor(low / 1000) * 1000
}

function calculateMaxAffordablePurchasePrice(propertyType, property) {
  const configuredDepositPct = getEffectiveOwnerDepositPct(property)
  const firstHomeBuyerLowDepositLimit = Math.max(0, Number(property.firstHomeBuyerLowDepositLimit) || FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT)
  const affordableSegments = []

  if (ownerOccupierFirstHomeBuyerSupport) {
    affordableSegments.push(
      solveMaxAffordablePriceRange(propertyType, property, 0, firstHomeBuyerLowDepositLimit, configuredDepositPct, true)
    )
  }

  affordableSegments.push(
      solveMaxAffordablePriceRange(
        propertyType,
        property,
        ownerOccupierFirstHomeBuyerSupport ? firstHomeBuyerLowDepositLimit : 0,
        20_000_000,
        configuredDepositPct,
        false
    )
  )

  return Math.max(0, ...affordableSegments)
}

function calculateMaxServiceablePurchasePrice(propertyType, property) {
  const configuredDepositPct = getEffectiveOwnerDepositPct(property)
  const firstHomeBuyerLowDepositLimit = Math.max(0, Number(property.firstHomeBuyerLowDepositLimit) || FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT)
  const serviceableSegments = []

  if (ownerOccupierFirstHomeBuyerSupport) {
    serviceableSegments.push(
      solveMaxServiceablePriceRange(propertyType, property, 0, firstHomeBuyerLowDepositLimit, configuredDepositPct, true)
    )
  }

  serviceableSegments.push(
      solveMaxServiceablePriceRange(
        propertyType,
        property,
        ownerOccupierFirstHomeBuyerSupport ? firstHomeBuyerLowDepositLimit : 0,
        20_000_000,
        configuredDepositPct,
        false
    )
  )

  return Math.max(0, ...serviceableSegments)
}

const purchaseCapsToday = computed(() => ({
  house: {
    affordable: calculateMaxAffordablePurchasePrice('house', form.propertyConfig.house),
    serviceable: calculateMaxServiceablePurchasePrice('house', form.propertyConfig.house)
  },
  apartment: {
    affordable: calculateMaxAffordablePurchasePrice('apartment', form.propertyConfig.apartment),
    serviceable: calculateMaxServiceablePurchasePrice('apartment', form.propertyConfig.apartment)
  }
}))

const propertySnapshots = computed(() => ({
  house: {
    owner: getPropertySnapshot(
      form.propertyConfig.house,
      form.propertyConfig.house.ownerPurchaseCosts,
      'owner',
      ownerOccupierFirstHomeBuyerSupport
    ),
    investment: getPropertySnapshot(
      form.propertyConfig.house,
      form.propertyConfig.house.investmentPurchaseCosts,
      'investment',
      false,
      true
    )
  },
  apartment: {
    owner: getPropertySnapshot(
      form.propertyConfig.apartment,
      form.propertyConfig.apartment.ownerPurchaseCosts,
      'owner',
      ownerOccupierFirstHomeBuyerSupport
    ),
    investment: getPropertySnapshot(
      form.propertyConfig.apartment,
      form.propertyConfig.apartment.investmentPurchaseCosts,
      'investment',
      false,
      true
    )
  }
}))

function buildAffordabilitySummary(property, ownerSnapshot, investmentSnapshot, maxAffordablePurchasePrice, maxServiceablePurchasePrice) {
  const propertyType = property === form.propertyConfig.apartment ? 'apartment' : 'house'
  const ownerCashflow = assessCurrentPurchaseCashflow(propertyType, property, 'owner', ownerSnapshot.loan, property.purchasePrice)
  const ownerServiceability = assessCurrentPurchaseServiceability(propertyType, property, 'owner', ownerSnapshot.loan, property.purchasePrice)
  const investmentServiceability = assessCurrentPurchaseServiceability(propertyType, property, 'investment', investmentSnapshot.loan, property.purchasePrice)
  const ownerDepositReady = form.profile.startingSavings >= ownerSnapshot.upfront
  const investmentDepositReady = form.profile.startingSavings >= investmentSnapshot.upfront

  return {
    targetPrice: property.purchasePrice,
    maxAffordablePurchasePrice,
    maxServiceablePurchasePrice,
    ownerSnapshot,
    investmentSnapshot,
    ownerCashflowBudgetAfterLiving: ownerCashflow.annualDisposableAfterLiving,
    ownerCashflowCarry: ownerCashflow.annualCarry,
    ownerCashflowRate: ownerCashflow.rate,
    annualDisposableAfterLiving: ownerServiceability.annualDisposableAfterLiving,
    annualLivingCosts: ownerServiceability.annualLivingCosts,
    ownerDepositReady,
    investmentDepositReady,
    ownerServiceableToday: ownerServiceability.affordable,
    rentvestServiceableToday: investmentServiceability.affordable,
    ownerCarry: ownerServiceability.annualCarry,
    rentvestCarry: investmentServiceability.annualCarry,
    ownerAssessedRate: ownerServiceability.assessedRate,
    investmentAssessedRate: investmentServiceability.assessedRate,
    propertyTaxImpact: investmentServiceability.taxDelta,
    ownerAffordable: ownerDepositReady && ownerServiceability.affordable,
    rentvestAffordable: investmentDepositReady && investmentServiceability.affordable,
    ownerNeedsIncomeWait: property.purchasePrice > maxServiceablePurchasePrice,
    ownerGap: Math.max(0, ownerServiceability.annualCarry - ownerServiceability.annualDisposableAfterLiving),
    rentvestGap: Math.max(0, investmentServiceability.annualCarry - investmentServiceability.annualDisposableAfterLiving)
  }
}

const affordabilityCards = computed(() => ([
  {
    key: 'house',
    label: 'House',
    ...buildAffordabilitySummary(
      form.propertyConfig.house,
      propertySnapshots.value.house.owner,
      propertySnapshots.value.house.investment,
      purchaseCapsToday.value.house.affordable,
      purchaseCapsToday.value.house.serviceable
    )
  },
  {
    key: 'apartment',
    label: 'Apartment',
    ...buildAffordabilitySummary(
      form.propertyConfig.apartment,
      propertySnapshots.value.apartment.owner,
      propertySnapshots.value.apartment.investment,
      purchaseCapsToday.value.apartment.affordable,
      purchaseCapsToday.value.apartment.serviceable
    )
  }
]))

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
  --wealth-content-max: 1500px;
  --wealth-results-max: 1360px;
  --wealth-chart-max: 1140px;
  --wealth-chart-reduced-max: 684px;
  --wealth-breakdown-max: 500px;
  --wealth-readout-max: 430px;
  --wealth-results-grid-max: 816px;
  color: #173050;
  box-sizing: border-box;
  font-size: 0.96rem;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding: 1.4rem clamp(1.4rem, 4vw, 4.75rem) 3rem;
  background:
    radial-gradient(circle at 15% 0%, rgba(125, 211, 252, 0.12), transparent 34%),
    radial-gradient(circle at 85% 10%, rgba(110, 231, 183, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 42%, #f5f8fd 100%);
}

.wealth-back-row,
.wealth-hero,
.wealth-banner,
.wealth-error,
.wealth-stage {
  width: min(100%, var(--wealth-content-max));
  margin-inline: auto;
}

.wealth-back-row {
  margin-bottom: 1rem;
}

.wealth-stage--results {
  width: min(100%, var(--wealth-results-max));
}

.wealth-stage--results :deep(.wealth-chart),
.wealth-stage--results :deep(.wealth-bars) {
  width: min(100%, var(--wealth-chart-max));
  margin-inline: auto;
}

.wealth-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.wealth-chart-grid :deep(.wealth-chart) {
  width: 100%;
  margin-inline: 0;
}

.wealth-stage--results :deep(.wealth-chart--cashflow) {
  width: min(100%, var(--wealth-chart-reduced-max));
}

.wealth-stage--results :deep(.wealth-bars--breakdown) {
  width: min(100%, var(--wealth-breakdown-max));
  justify-self: center;
}

.wealth-page :deep(.card) {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(154, 174, 204, 0.22);
}

.wealth-suburb-summary {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 20px;
  background: transparent;
}

.wealth-suburb-summary strong {
  display: block;
  margin-top: 0.28rem;
}

.wealth-suburb-summary__label {
  display: block;
  font-size: 0.78rem;
  color: #6782a6;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

@media (max-width: 900px) {
  .wealth-suburb-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.wealth-back,
.wealth-banner,
.wealth-panel,
.wealth-card {
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
}

.wealth-back {
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
}

.wealth-hero {
  max-width: 960px;
  padding: clamp(2.1rem, 5vw, 4rem) clamp(1.4rem, 4vw, 3.6rem);
  text-align: center;
}

.wealth-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5c7ca1;
}

.wealth-hero h1 {
  margin: 0;
  font-size: 72px;
  line-height: 0.94;
  letter-spacing: -0.05em;
  white-space: nowrap;
}

.wealth-card h3 {
  margin: 0.35rem 0 0.6rem;
  font-size: 1.2rem;
}

.wealth-banner,
.wealth-panel,
.wealth-card {
  border-radius: 24px;
}

.wealth-banner,
.wealth-card {
  padding: 1rem 1.05rem;
}

.wealth-tagline {
  max-width: 680px;
  margin: 0.95rem auto 0;
  color: #39597d;
  font-size: clamp(1.05rem, 0.98rem + 0.55vw, 1.34rem);
  line-height: 1.5;
}

.wealth-copy {
  margin: 0;
  color: #5d7394;
}

.wealth-mini-grid,
.wealth-strategy-item__meta,
.wealth-strategy-item__top,
.wealth-strategy-item__title,
.wealth-results-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.wealth-mini-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  margin-top: 1rem;
}

.wealth-mini-grid div {
  padding: 0.8rem;
  border-radius: 16px;
  background: rgba(243, 247, 255, 0.96);
}

.wealth-mini-grid span {
  display: block;
  margin-bottom: 0.25rem;
  color: #5d7394;
  font-size: 0.76rem;
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

.wealth-banner__note {
  margin: 0;
  color: #5d7394;
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

.wealth-form-stack,
.wealth-stage-footer,
.wealth-summary-grid,
.wealth-dashboard-grid,
.wealth-strategy-grid,
.wealth-method-grid,
.wealth-source-list,
.wealth-strategy-list {
  display: grid;
  gap: 1rem;
}

.wealth-stage-footer {
  margin-top: 1rem;
}

.wealth-panel-grid,
.wealth-property-panels {
  display: grid;
  gap: 1rem;
}

.wealth-panel-grid--primary,
.wealth-property-panels {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-grid--compact {
  gap: 0.7rem;
}

.wealth-grid--triple,
.wealth-slider-grid {
  display: grid;
  gap: 0.8rem;
}

.wealth-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-slider-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-allocation-editor {
  display: grid;
  gap: 0.9rem;
}

.wealth-allocation-bar {
  position: relative;
  display: flex;
  min-height: 58px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.24);
  background: rgba(231, 238, 247, 0.72);
}

.wealth-allocation-bar__segment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.7rem 0.35rem;
  color: #f8fbff;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  transition: width 120ms ease;
}

.wealth-allocation-bar__segment span {
  white-space: nowrap;
}

.wealth-allocation-bar.is-dragging .wealth-allocation-bar__segment,
.wealth-allocation-bar.is-dragging .wealth-allocation-bar__handle {
  transition: none;
}

.wealth-allocation-bar__handle {
  position: absolute;
  top: 7px;
  bottom: 7px;
  width: 18px;
  border: 0;
  border-radius: 999px;
  background: rgba(248, 251, 255, 0.96);
  box-shadow: 0 0 0 1px rgba(23, 48, 80, 0.08), 0 10px 24px rgba(23, 48, 80, 0.12);
  transform: translateX(-50%);
  cursor: ew-resize;
  touch-action: none;
}

.wealth-allocation-bar__handle::before {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: rgba(93, 115, 148, 0.72);
  transform: translate(-50%, -50%);
  box-shadow: -4px 0 0 rgba(93, 115, 148, 0.28), 4px 0 0 rgba(93, 115, 148, 0.28);
}

.wealth-allocation-bar__handle.is-active {
  background: #ffffff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.2), 0 12px 30px rgba(37, 99, 235, 0.22);
}

.wealth-allocation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-allocation-input {
  display: grid;
  gap: 0.35rem;
  color: #5d7394;
  font-size: 0.82rem;
}

.wealth-allocation-input__label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.wealth-allocation-input__label > span {
  width: fit-content;
  cursor: help;
}

.wealth-allocation-input__swatch {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-grid label:not(.wealth-toggle),
.wealth-range {
  display: grid;
  gap: 0.35rem;
  color: #5d7394;
  font-size: 0.82rem;
}

.wealth-toggle-card {
  display: grid;
  gap: 0.35rem;
  align-content: start;
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
.wealth-range input,
.wealth-allocation-input input {
  width: 100%;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
}

.wealth-static-value {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font-weight: 600;
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

.wealth-toggle__label {
  color: inherit;
  font: inherit;
  line-height: 1.35;
  letter-spacing: normal;
  text-transform: none;
}

.wealth-property-grid {
  display: grid;
  gap: 1rem;
}

.wealth-property-panel {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(243, 247, 255, 0.72);
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.wealth-card--scroll {
  overflow: hidden;
}

.wealth-readout-panel {
  width: min(100%, var(--wealth-readout-max));
  justify-self: center;
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

.wealth-strategy-grid--results {
  width: 100%;
  margin-inline: auto;
}

.wealth-card--result {
  padding: 0.85rem 0.9rem;
}

.wealth-card--result .wealth-mini-grid {
  margin-top: 0.8rem;
  gap: 0.75rem;
}

.wealth-card--result .wealth-mini-grid div {
  padding: 0.7rem;
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

.wealth-source-list a {
  color: #2a5ca5;
}

.wealth-inline-note {
  margin-left: 0.4rem;
  color: #5c7ca1;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

@media (max-width: 960px) {
  .wealth-hero,
  .wealth-panel-grid--primary,
  .wealth-property-panels,
  .wealth-chart-grid,
  .wealth-summary-grid,
  .wealth-dashboard-grid,
  .wealth-strategy-grid,
  .wealth-method-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .wealth-page {
    font-size: 1rem;
    padding: 1rem 1rem 2.4rem;
  }

  .wealth-grid,
  .wealth-slider-grid,
  .wealth-allocation-grid,
  .wealth-mini-grid {
    grid-template-columns: 1fr;
  }

  .wealth-hero {
    padding: 1.8rem 1.15rem;
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
