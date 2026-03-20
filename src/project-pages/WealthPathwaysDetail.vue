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
                  <span v-bind="labelAttrs('taxYear')">Tax year</span>
                  <select v-model="form.profile.taxYear" v-bind="valueAttrs('taxYear')">
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                  </select>
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
                  <span v-bind="labelAttrs('liveAtHome')">Currently living at home</span>
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
                    <span>Invest while saving for deposit</span>
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
              <div class="wealth-slider-grid">
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
              </div>

              <div class="wealth-mini-grid">
                <div><span>ASX</span><strong>{{ formatPercent(form.portfolioConfig.asxWeight) }}</strong></div>
                <div><span>QQQ</span><strong>{{ formatPercent(form.portfolioConfig.qqqWeight) }}</strong></div>
                <div><span>Bonds</span><strong>{{ formatPercent(form.portfolioConfig.bondWeight) }}</strong></div>
              </div>

              <div class="wealth-grid wealth-grid--compact wealth-grid--triple">
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
            <summary>House and apartment assumptions</summary>
            <div class="wealth-panel__body wealth-property-grid">
              <p class="wealth-field-note wealth-field-note--section">
                First-home-buyer support is automatically applied to the buy-and-live path. The investment + rent path
                keeps the standard deposit and buying costs because those concessions usually depend on living in the
                property. Owner paths waive stamp duty below $800k, taper the duty concession to $1m, and default to a
                5% owner deposit with no LMI up to $1.5m, but you can model a higher deposit. Investment-property
                cash flow assumes a 3% vacancy baseline.
              </p>
              <div class="wealth-property-panels">
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
                      {{ formatCurrency(maxAffordableToday.house) }}
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
                    <span v-bind="labelAttrs('houseInterestRate')">Rate %</span>
                    <input v-model.number="houseRatePct" v-bind="valueAttrs('houseInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseLongRunInterestRate')">Long-run rate %</span>
                    <input v-model.number="houseLongRunRatePct" v-bind="valueAttrs('houseLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseGrowthMean')">Growth %</span>
                    <input v-model.number="houseGrowthPct" v-bind="valueAttrs('houseGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('houseAnnualCosts')">Base annual costs</span>
                    <input v-model.number="houseAnnualCosts" v-bind="valueAttrs('houseAnnualCosts')" type="number" min="0" step="100" />
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
                  <p v-if="form.propertyConfig.house.purchasePrice > maxAffordableToday.house" class="wealth-field-note wealth-field-note--section">
                    This target is above today&apos;s owner-occupier serviceability. The model will wait until both income and
                    cash support the purchase, while the target price keeps compounding with house growth.
                  </p>
                  <div class="wealth-cost-breakdown">
                  <label class="wealth-cost-breakdown__item">
                    <span>Council rates</span>
                    <input v-model.number="form.propertyConfig.house.councilRates" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Water rates</span>
                    <input v-model.number="form.propertyConfig.house.waterRates" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Insurance</span>
                    <input v-model.number="form.propertyConfig.house.insurance" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Maintenance</span>
                    <input v-model.number="form.propertyConfig.house.maintenance" type="number" min="0" step="100" />
                  </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--three">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseStampDuty')">Stamp duty</span>
                      <input v-model.number="houseStampDuty" v-bind="valueAttrs('houseStampDuty')" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseLegalFees')">Legal fees</span>
                      <input v-model.number="houseLegalFees" v-bind="valueAttrs('houseLegalFees')" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseBuyersCosts')">Buyer costs</span>
                      <input v-model.number="houseBuyersCosts" v-bind="valueAttrs('houseBuyersCosts')" type="number" min="0" step="100" />
                    </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--three">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseLandTax')">Land tax</span>
                      <input v-model.number="form.propertyConfig.house.landTax" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseBorrowingExpensesTotal')">Borrowing expenses</span>
                      <input v-model.number="form.propertyConfig.house.borrowingExpensesTotal" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseOtherDeductibleExpensesAnnual')">Other deductible</span>
                      <input v-model.number="form.propertyConfig.house.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
                    </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--two">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseCapitalWorksDeductionAnnual')">Capital works deduction</span>
                      <input v-model.number="form.propertyConfig.house.capitalWorksDeductionAnnual" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('houseDepreciationDeductionAnnual')">Depreciation deduction</span>
                      <input v-model.number="form.propertyConfig.house.depreciationDeductionAnnual" type="number" min="0" step="100" />
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
                      {{ formatCurrency(maxAffordableToday.apartment) }}
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
                    <span v-bind="labelAttrs('apartmentInterestRate')">Rate %</span>
                    <input v-model.number="apartmentRatePct" v-bind="valueAttrs('apartmentInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentLongRunInterestRate')">Long-run rate %</span>
                    <input v-model.number="apartmentLongRunRatePct" v-bind="valueAttrs('apartmentLongRunInterestRate')" type="number" min="1" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentGrowthMean')">Growth %</span>
                    <input v-model.number="apartmentGrowthPct" v-bind="valueAttrs('apartmentGrowthMean')" type="number" min="0" max="12" step="0.1" />
                  </label>
                  <label>
                    <span v-bind="labelAttrs('apartmentAnnualCosts')">Base annual costs</span>
                    <input v-model.number="apartmentAnnualCosts" v-bind="valueAttrs('apartmentAnnualCosts')" type="number" min="0" step="100" />
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
                  <p v-if="form.propertyConfig.apartment.purchasePrice > maxAffordableToday.apartment" class="wealth-field-note wealth-field-note--section">
                    This target is above today&apos;s owner-occupier serviceability. The model will wait until both income and
                    cash support the purchase, while the target price keeps compounding with apartment growth.
                  </p>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--four">
                  <label class="wealth-cost-breakdown__item">
                    <span>Council rates</span>
                    <input v-model.number="form.propertyConfig.apartment.councilRates" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Water rates</span>
                    <input v-model.number="form.propertyConfig.apartment.waterRates" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Insurance</span>
                    <input v-model.number="form.propertyConfig.apartment.insurance" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Maintenance</span>
                    <input v-model.number="form.propertyConfig.apartment.maintenance" type="number" min="0" step="100" />
                  </label>
                  <label class="wealth-cost-breakdown__item">
                    <span>Strata</span>
                    <input v-model.number="form.propertyConfig.apartment.strata" type="number" min="0" step="100" />
                  </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--three">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentStampDuty')">Stamp duty</span>
                      <input v-model.number="apartmentStampDuty" v-bind="valueAttrs('apartmentStampDuty')" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentLegalFees')">Legal fees</span>
                      <input v-model.number="apartmentLegalFees" v-bind="valueAttrs('apartmentLegalFees')" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentBuyersCosts')">Buyer costs</span>
                      <input v-model.number="apartmentBuyersCosts" v-bind="valueAttrs('apartmentBuyersCosts')" type="number" min="0" step="100" />
                    </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--three">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentLandTax')">Land tax</span>
                      <input v-model.number="form.propertyConfig.apartment.landTax" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentBorrowingExpensesTotal')">Borrowing expenses</span>
                      <input v-model.number="form.propertyConfig.apartment.borrowingExpensesTotal" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentOtherDeductibleExpensesAnnual')">Other deductible</span>
                      <input v-model.number="form.propertyConfig.apartment.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
                    </label>
                  </div>
                  <div class="wealth-cost-breakdown wealth-cost-breakdown--two">
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentCapitalWorksDeductionAnnual')">Capital works deduction</span>
                      <input v-model.number="form.propertyConfig.apartment.capitalWorksDeductionAnnual" type="number" min="0" step="100" />
                    </label>
                    <label class="wealth-cost-breakdown__item">
                      <span v-bind="labelAttrs('apartmentDepreciationDeductionAnnual')">Depreciation deduction</span>
                      <input v-model.number="form.propertyConfig.apartment.depreciationDeductionAnnual" type="number" min="0" step="100" />
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
                {{ card.targetPrice > card.maxAffordablePurchasePrice
                  ? 'Target is above today\'s owner serviceability, so the simulation waits until income and cash catch up while the target value keeps growing.'
                  : 'Target is within today\'s owner serviceability range, so the main remaining gate is having enough cash to transact without going negative.'
                }}
              </p>
              <p class="wealth-field-note wealth-field-note--section">
                Deposit ready: owner {{ card.ownerDepositReady ? 'Yes' : 'No' }}, investment
                {{ card.investmentDepositReady ? 'Yes' : 'No' }}. Owner-occupier carry uses
                {{ formatCurrency(card.ownerCarry) }} per year. Investment + rent uses
                {{ formatCurrency(card.rentvestCarry) }} per year after a first-year rental tax
                {{ card.propertyTaxImpact < 0 ? 'benefit' : 'cost' }} of
                {{ formatCurrency(Math.abs(card.propertyTaxImpact)) }} against annual disposable cash after tax and
                non-housing living costs of {{ formatCurrency(card.annualDisposableAfterLiving) }}.
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

      <WealthLineChart
        title="Net worth projection bands"
        subtitle="Each year assumes you sold down the remaining assets in that year and netted out the model's estimated CGT before comparing scenarios."
        kicker="Outcome distribution"
        :series="netWorthSeries"
        :muted-series-ids="mutedStrategyKeys"
        @toggle-series="toggleStrategy"
      />

      <div class="wealth-dashboard-grid">
        <WealthCompositionBars
          title="Final-year balance composition"
          subtitle="Hold-only median liquid assets, housing equity, and remaining debt at the end of the chosen horizon before any sale tax is applied."
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
        title="Annual after-tax surplus or deficit"
        subtitle="Positive values mean the annual ledger still has cash left after tax, living costs, rent, and property cashflows. Negative values show cash burn."
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
import { cloneSimulationRequest, wealthAssumptionSections, wealthSimulationMetadata, wealthStrategyOrder, wealthVacancyRate } from '../data/wealthDefaults.js'
import {
  FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT,
  calculateAnnualMortgagePayment,
  calculateAustralianAnnualTax,
  calculateInvestmentPropertyTaxPosition,
  calculatePurchaseCosts,
  clamp,
  estimateLmi,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  scalePurchaseCostsWithPrice
} from '../wealth/finance.js'
import { WealthSimulationClient } from '../wealth/client.js'

const props = defineProps({
  project: { type: Object, required: true }
})

const labelHelp = {
  horizonYears: 'How many years the model runs for. Longer horizons give ownership and compounding more time to separate.',
  startingSavings: 'Cash already available on day one. It can fund a deposit, buying costs, or the starting investment balance.',
  annualIncome: 'Gross annual salary before tax. The model estimates take-home pay from this figure each year.',
  taxYear: 'Resident tax settings used by the annual tax engine. 2025-26 remains on the 16 percent second bracket, while 2026-27 applies the later 15 percent cut.',
  incomeGrowthRate: 'Expected annual growth in your gross income. The annual salary and non-housing living-cost baseline both step up using this setting.',
  weeklyNonHousingLivingCosts: 'Weekly living costs before housing. The model starts from gross salary, deducts tax, then subtracts these non-housing costs plus the strategy-specific housing cashflows.',
  liveAtHome: 'If enabled, the model starts from you currently living at home. Rent + invest and investment-property paths treat it as lower housing costs, while buy-to-live paths move into the property as soon as they can buy.',
  liveAtHomeYears: 'How long you remain at home before rent-based paths switch to market rent. Buy-to-live paths stop using the at-home setting as soon as the property purchase happens.',
  weeklyRent: 'Weekly rent assumed once you have moved out or for any strategy that keeps you renting.',
  rentGrowthRate: 'Expected annual rent inflation. Higher rent raises the housing cash-cost line in renting and rentvest scenarios.',
  weeklyBoardAtHome: 'Weekly rent and household expenses paid while living at home.',
  boardGrowthRate: 'Expected annual increase in at-home rent and household expenses, with some annual variation layered on in the simulation.',
  investWhileSavingForDeposit: 'If enabled, pre-purchase savings for the property pathways stay invested in the portfolio while you wait. If disabled, those savings are held as cash until buying is possible.',
  surplusAllocationMode: 'Choose whether positive surplus in property strategies is invested into the portfolio or directed to extra mortgage repayments.',
  bondWeight: 'Portfolio share held in bonds. Raising this usually lowers expected return and smooths the overall portfolio path.',
  asxEquitySplit: 'How the equity portion is split between ASX and QQQ after the bond allocation is set.',
  asxReturnMean: 'The expected average annual return of the ASX allocation.',
  qqqReturnMean: 'The expected average annual return of the QQQ allocation.',
  bondReturnMean: 'Baseline long-run annual bond return used as the centre of the bond distribution.',
  asxDividendYield: 'Cash distribution yield assumed for the ASX sleeve. It contributes to recurring income and simplified portfolio tax.',
  bondIncomeYield: 'Income yield for the bond sleeve. This feeds recurring income and tax drag in the model.',
  qqqDividendYield: 'Cash distribution yield assumed for the QQQ sleeve. It is kept low because most return is modeled as capital growth.',
  asxFrankingPct: 'Share of ASX dividends assumed to arrive with franking credits. This offsets some tax drag in the simplified tax model.',
  firstHomeBuyerEligible: 'First-home-buyer support is automatically applied to owner-occupier purchases only.',
  houseRentYield: 'Gross rental yield used when the house is held as an investment property.',
  housePropertyManagementPct: 'Property manager fee applied to collected rent for the house investment path.',
  housePurchasePrice: 'Manual house target in today\'s dollars. If it is above today\'s serviceability limit, the model waits and lets the target grow with house prices until income and cash catch up.',
  houseOwnerDepositPct: 'Owner-occupier deposit share used for the buy-to-live path and the max-affordable-today calculation. First-home-buyer cases default to 5 percent below $1.5m, but you can raise it.',
  houseDepositPct: 'Deposit share for the house investment purchase. Lower deposits increase leverage and can trigger lenders mortgage insurance.',
  houseMortgageYears: 'Length of the house mortgage used for amortization and repayment calculations.',
  houseInterestRate: 'Starting mortgage rate for the house path before the simulation drifts toward the long-run rate.',
  houseLongRunInterestRate: 'Steadier mortgage rate assumption used after the opening years. It represents a normalized mortgage setting rather than today\'s spot rate.',
  houseGrowthMean: 'Baseline annual house price growth used for the house path.',
  houseStampDuty: 'Shared baseline stamp duty for the house purchase. The owner path still applies first-home-buyer relief automatically, while the investment path uses the full amount.',
  houseLegalFees: 'Shared legal and conveyancing cost baseline for the house purchase. It feeds both owner and investment paths.',
  houseBuyersCosts: 'Shared buyer-side purchase cost baseline for the house purchase, such as inspections and settlement extras.',
  houseAnnualCosts: 'Base annual owner-occupier holding cost total for council rates, water, insurance, and maintenance.',
  houseWaterRates: 'Annual water charges. They count as a cash housing cost for owner-occupier paths and as a deductible rental expense for investment-property paths.',
  houseLandTax: 'Annual land tax applied to the investment-property path only.',
  houseBorrowingExpensesTotal: 'Upfront loan-establishment style costs for the investment-property path. The model treats them as upfront cash and amortises the deduction over time.',
  houseCapitalWorksDeductionAnnual: 'Manual annual capital-works deduction used only in the investment-property taxable-income calculation.',
  houseDepreciationDeductionAnnual: 'Manual annual depreciation deduction used only in the investment-property taxable-income calculation.',
  houseOtherDeductibleExpensesAnnual: 'Other annual deductible rental expenses that are not already broken out above.',
  apartmentRentYield: 'Gross rental yield used when the apartment is held as an investment property.',
  apartmentPropertyManagementPct: 'Property manager fee applied to collected rent for the apartment investment path.',
  apartmentPurchasePrice: 'Manual apartment target in today\'s dollars. If it is above today\'s serviceability limit, the model waits and lets the target grow with apartment prices until income and cash catch up.',
  apartmentOwnerDepositPct: 'Owner-occupier deposit share used for the buy-to-live path and the max-affordable-today calculation. First-home-buyer cases default to 5 percent below $1.5m, but you can raise it.',
  apartmentDepositPct: 'Deposit share for the apartment investment purchase. Lower deposits increase leverage and can trigger lenders mortgage insurance.',
  apartmentMortgageYears: 'Length of the apartment mortgage used for amortization and repayment calculations.',
  apartmentInterestRate: 'Starting mortgage rate for the apartment path before drifting toward the long-run rate.',
  apartmentLongRunInterestRate: 'Steadier mortgage rate assumption used after the opening years for apartments.',
  apartmentGrowthMean: 'Baseline annual apartment price growth used for the apartment path.',
  apartmentStampDuty: 'Shared baseline stamp duty for the apartment purchase. The owner path still applies first-home-buyer relief automatically, while the investment path uses the full amount.',
  apartmentLegalFees: 'Shared legal and conveyancing cost baseline for the apartment purchase. It feeds both owner and investment paths.',
  apartmentBuyersCosts: 'Shared buyer-side purchase cost baseline for the apartment purchase, such as inspections and settlement extras.',
  apartmentAnnualCosts: 'Base annual owner-occupier holding cost total for council rates, water, insurance, maintenance, and strata.',
  apartmentWaterRates: 'Annual water charges applied to apartment ownership.',
  apartmentLandTax: 'Annual land tax applied to the apartment investment path only.',
  apartmentBorrowingExpensesTotal: 'Upfront borrowing expenses for the apartment investment path.',
  apartmentCapitalWorksDeductionAnnual: 'Manual annual capital-works deduction for the apartment investment path.',
  apartmentDepreciationDeductionAnnual: 'Manual annual depreciation deduction for the apartment investment path.',
  apartmentOtherDeductibleExpensesAnnual: 'Other annual deductible apartment rental expenses.'
}

const valueHelp = {
  asxReturnMean: 'Based on the average of the last 15 years.',
  qqqReturnMean: 'Based on the average of the last 15 years.',
  bondReturnMean: 'Based on a long-run bond return baseline rather than a short-term rate print.',
  asxDividendYield: 'Based on a recent long-run ASX cash distribution average.',
  bondIncomeYield: 'Based on a representative long-run bond income yield.',
  qqqDividendYield: 'Based on a recent long-run QQQ cash distribution average.',
  houseLongRunInterestRate: 'Set below the opening mortgage rate to represent a steadier long-run borrowing environment.',
  houseRentYield: 'Gross rent is modeled as property value x rent yield x (1 - vacancy).',
  housePropertyManagementPct: 'Management is modeled as a share of collected rent, so higher rents increase the dollar fee automatically.',
  houseStampDuty: 'Changing the house target price scales this baseline stamp-duty input using a generic duty curve before owner concessions are applied.',
  houseLegalFees: 'Changing the house target price scales this legal-fee baseline using a generic conveyancing formula.',
  houseBuyersCosts: 'Changing the house target price scales this buyer-cost baseline using a generic closing-cost formula.',
  apartmentLongRunInterestRate: 'Set below the opening mortgage rate to represent a steadier long-run borrowing environment.',
  apartmentRentYield: 'Gross rent is modeled as property value x rent yield x (1 - vacancy).',
  apartmentPropertyManagementPct: 'Management is modeled as a share of collected rent, so higher rents increase the dollar fee automatically.',
  apartmentStampDuty: 'Changing the apartment target price scales this baseline stamp-duty input using a generic duty curve before owner concessions are applied.',
  apartmentLegalFees: 'Changing the apartment target price scales this legal-fee baseline using a generic conveyancing formula.',
  apartmentBuyersCosts: 'Changing the apartment target price scales this buyer-cost baseline using a generic closing-cost formula.',
  houseAnnualCosts: 'Editing this total scales the current council rates, water, insurance, and maintenance mix.',
  apartmentAnnualCosts: 'Editing this total scales the current council rates, water, insurance, maintenance, and strata mix.'
}

const form = reactive(cloneSimulationRequest())
form.propertyConfig.vacancyRate = wealthVacancyRate
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
let runToken = 0
let heroResizeFrame = 0
let heroResizeObserver = null

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
  request.propertyConfig.vacancyRate = wealthVacancyRate
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

    syncSharedPurchaseCosts(form.propertyConfig.house, previousValue, safeValue)
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

    syncSharedPurchaseCosts(form.propertyConfig.apartment, previousValue, safeValue)
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
const houseOwnerDepositPct = percentProxy(() => form.propertyConfig.house.ownerDepositPct, value => { form.propertyConfig.house.ownerDepositPct = value }, 5, 80)
const apartmentOwnerDepositPct = percentProxy(() => form.propertyConfig.apartment.ownerDepositPct, value => { form.propertyConfig.apartment.ownerDepositPct = value }, 5, 80)
const houseDepositPct = percentProxy(() => form.propertyConfig.house.depositPct, value => { form.propertyConfig.house.depositPct = value }, 5, 80)
const apartmentDepositPct = percentProxy(() => form.propertyConfig.apartment.depositPct, value => { form.propertyConfig.apartment.depositPct = value }, 5, 80)
const houseRatePct = percentProxy(() => form.propertyConfig.house.interestRate, value => { form.propertyConfig.house.interestRate = value }, 1, 12)
const apartmentRatePct = percentProxy(() => form.propertyConfig.apartment.interestRate, value => { form.propertyConfig.apartment.interestRate = value }, 1, 12)
const houseLongRunRatePct = percentProxy(() => form.propertyConfig.house.longRunInterestRate, value => { form.propertyConfig.house.longRunInterestRate = value }, 1, 12)
const apartmentLongRunRatePct = percentProxy(() => form.propertyConfig.apartment.longRunInterestRate, value => { form.propertyConfig.apartment.longRunInterestRate = value }, 1, 12)
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
const houseRecurringCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance']
const apartmentRecurringCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'strata']

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

function syncSharedPurchaseCosts(property, previousPrice, nextPrice) {
  const scaledCosts = scalePurchaseCostsWithPrice(
    {
      stampDuty: getSharedPurchaseCost(property, 'stampDuty'),
      legalFees: getSharedPurchaseCost(property, 'legalFees'),
      buyersCosts: getSharedPurchaseCost(property, 'buyersCosts')
    },
    previousPrice,
    nextPrice
  )

  setSharedPurchaseCost(property, 'stampDuty', scaledCosts.stampDuty)
  setSharedPurchaseCost(property, 'legalFees', scaledCosts.legalFees)
  setSharedPurchaseCost(property, 'buyersCosts', scaledCosts.buyersCosts)
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

syncSharedPurchaseCosts(form.propertyConfig.house, form.propertyConfig.house.purchasePrice, form.propertyConfig.house.purchasePrice)
syncSharedPurchaseCosts(form.propertyConfig.apartment, form.propertyConfig.apartment.purchasePrice, form.propertyConfig.apartment.purchasePrice)

const annualSalaryTax = computed(() => calculateAustralianAnnualTax({
  taxYear: form.profile.taxYear,
  salaryIncome: form.profile.annualIncome
}))

const annualDisposableAfterLiving = computed(() =>
  form.profile.annualIncome -
  annualSalaryTax.value.totalTax -
  form.profile.weeklyNonHousingLivingCosts * 52
)

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
      low: point.annualSurplusP10,
      mid: point.annualSurplusP50,
      high: point.annualSurplusP90
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
    total: strategy.summary.finalMedianHoldNetWorth
  }))
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

function getOwnerRecurringCosts(property) {
  return (
    (Number(property.councilRates) || 0) +
    (Number(property.waterRates) || 0) +
    (Number(property.insurance) || 0) +
    (Number(property.maintenance) || 0) +
    (Number(property.strata) || 0)
  )
}

function getOwnerLoanForPrice(property, purchasePrice, depositPct, firstHomeBuyerEligible) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const safeDepositPct = clamp(Number(depositPct) || 0.05, 0.05, 0.95)
  const deposit = safePrice * safeDepositPct
  return safePrice - deposit + estimateLmi(safePrice, safeDepositPct, firstHomeBuyerEligible)
}

function getOwnerAnnualCarryForPrice(property, purchasePrice, depositPct, firstHomeBuyerEligible) {
  const loan = getOwnerLoanForPrice(property, purchasePrice, depositPct, firstHomeBuyerEligible)
  return getOwnerRecurringCosts(property) + calculateAnnualMortgagePayment(loan, property.interestRate, property.mortgageYears)
}

function solveMaxServiceablePriceRange(property, minimumPrice, maximumPrice, depositPct, firstHomeBuyerEligible) {
  if (maximumPrice <= minimumPrice) return 0

  const annualBudget = annualDisposableAfterLiving.value
  if (annualBudget <= 0) return 0
  if (getOwnerAnnualCarryForPrice(property, minimumPrice, depositPct, firstHomeBuyerEligible) > annualBudget) return 0
  if (getOwnerAnnualCarryForPrice(property, maximumPrice, depositPct, firstHomeBuyerEligible) <= annualBudget) {
    return Math.floor(maximumPrice / 1000) * 1000
  }

  let low = minimumPrice
  let high = maximumPrice
  for (let step = 0; step < 32; step += 1) {
    const midpoint = (low + high) / 2
    const annualCarry = getOwnerAnnualCarryForPrice(property, midpoint, depositPct, firstHomeBuyerEligible)
    if (annualCarry <= annualBudget) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  return Math.floor(low / 1000) * 1000
}

function calculateMaxServiceablePurchasePrice(property) {
  const configuredDepositPct = getEffectiveOwnerDepositPct(property)
  const serviceableSegments = []

  if (ownerOccupierFirstHomeBuyerSupport) {
    serviceableSegments.push(
      solveMaxServiceablePriceRange(property, 0, FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT, configuredDepositPct, true)
    )
  }

  serviceableSegments.push(
    solveMaxServiceablePriceRange(
      property,
      ownerOccupierFirstHomeBuyerSupport ? FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT : 0,
      20_000_000,
      configuredDepositPct,
      false
    )
  )

  return Math.max(0, ...serviceableSegments)
}

const maxAffordableToday = computed(() => ({
  house: calculateMaxServiceablePurchasePrice(form.propertyConfig.house),
  apartment: calculateMaxServiceablePurchasePrice(form.propertyConfig.apartment)
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

function buildAffordabilitySummary(property, ownerSnapshot, investmentSnapshot, maxAffordablePurchasePrice) {
  const ownerRecurringCosts = getOwnerRecurringCosts(property)
  const ownerAnnualMortgagePayment = calculateAnnualMortgagePayment(ownerSnapshot.loan, property.interestRate, property.mortgageYears)
  const investmentAnnualMortgagePayment = calculateAnnualMortgagePayment(investmentSnapshot.loan, property.interestRate, property.mortgageYears)
  const ownerCarry = ownerAnnualMortgagePayment + ownerRecurringCosts
  const ownerDepositReady = form.profile.startingSavings >= ownerSnapshot.upfront
  const investmentDepositReady = form.profile.startingSavings >= investmentSnapshot.upfront
  const ownerServiceableToday = annualDisposableAfterLiving.value >= ownerCarry

  const annualRent = form.housingCosts.weeklyRent * 52
  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: property,
    propertyValue: property.purchasePrice,
    vacancyRate: wealthVacancyRate,
    interestPaid: investmentSnapshot.loan * property.interestRate,
    yearsOwned: 0
  })
  const investmentTax = calculateAustralianAnnualTax({
    taxYear: form.profile.taxYear,
    salaryIncome: form.profile.annualIncome,
    taxableRentalIncome: rentalTaxPosition.taxableRentalIncome
  })
  const rentvestCarry =
    annualRent +
    investmentAnnualMortgagePayment +
    rentalTaxPosition.cashOperatingExpenses -
    rentalTaxPosition.rentReceived +
    investmentTax.deltaVsSalaryOnly
  const rentvestServiceableToday = annualDisposableAfterLiving.value >= rentvestCarry

  return {
    targetPrice: property.purchasePrice,
    maxAffordablePurchasePrice,
    ownerSnapshot,
    investmentSnapshot,
    annualDisposableAfterLiving: annualDisposableAfterLiving.value,
    ownerDepositReady,
    investmentDepositReady,
    ownerServiceableToday,
    rentvestServiceableToday,
    ownerCarry,
    rentvestCarry,
    propertyTaxImpact: investmentTax.deltaVsSalaryOnly,
    ownerAffordable: ownerDepositReady && ownerServiceableToday,
    rentvestAffordable: investmentDepositReady && rentvestServiceableToday,
    ownerNeedsIncomeWait: property.purchasePrice > maxAffordablePurchasePrice,
    ownerGap: Math.max(0, ownerCarry - annualDisposableAfterLiving.value),
    rentvestGap: Math.max(0, rentvestCarry - annualDisposableAfterLiving.value)
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
      maxAffordableToday.value.house
    )
  },
  {
    key: 'apartment',
    label: 'Apartment',
    ...buildAffordabilitySummary(
      form.propertyConfig.apartment,
      propertySnapshots.value.apartment.owner,
      propertySnapshots.value.apartment.investment,
      maxAffordableToday.value.apartment
    )
  }
]))

function getRecurringCostTotal(property, keys) {
  return Math.round(keys.reduce((sum, key) => sum + (Number(property[key]) || 0), 0))
}

function scaleRecurringCosts(property, keys, nextTotal) {
  const targetTotal = Math.max(0, Math.round(Number(nextTotal) || 0))
  const currentTotal = keys.reduce((sum, key) => sum + (Number(property[key]) || 0), 0)

  if (currentTotal <= 0) {
    const equalShare = Math.round(targetTotal / keys.length)
    let assigned = 0
    keys.forEach((key, index) => {
      const value = index === keys.length - 1 ? Math.max(0, targetTotal - assigned) : equalShare
      property[key] = value
      assigned += value
    })
    return
  }

  let assigned = 0
  keys.forEach((key, index) => {
    const currentValue = Number(property[key]) || 0
    const value = index === keys.length - 1
      ? Math.max(0, targetTotal - assigned)
      : Math.max(0, Math.round((currentValue / currentTotal) * targetTotal))
    property[key] = value
    assigned += value
  })
}

const houseAnnualCosts = computed({
  get: () => getRecurringCostTotal(form.propertyConfig.house, houseRecurringCostKeys),
  set: value => scaleRecurringCosts(form.propertyConfig.house, houseRecurringCostKeys, value)
})

const apartmentAnnualCosts = computed({
  get: () => getRecurringCostTotal(form.propertyConfig.apartment, apartmentRecurringCostKeys),
  set: value => scaleRecurringCosts(form.propertyConfig.apartment, apartmentRecurringCostKeys, value)
})

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

.wealth-page :deep(.card) {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(154, 174, 204, 0.22);
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

.wealth-grid label,
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
.wealth-range input {
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

.wealth-cost-breakdown {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.wealth-cost-breakdown--four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-cost-breakdown--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-cost-breakdown--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-cost-breakdown > * {
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

.wealth-cost-breakdown input {
  width: 100%;
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
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
  .wealth-mini-grid,
  .wealth-cost-breakdown,
  .wealth-cost-breakdown--two,
  .wealth-cost-breakdown--three,
  .wealth-cost-breakdown--four {
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
