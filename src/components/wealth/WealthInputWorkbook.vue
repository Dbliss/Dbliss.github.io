<template>
  <section class="wealth-workbook">
    <Transition name="wealth-sheet-slide" mode="out-in">
      <section :key="activeSheet" class="wealth-workbook__panel">
        <template v-if="activeSheet === 'stock'">
          <div class="wealth-workbook__panel-head">
            <h3>Stock assumptions</h3>
            <p>Configure the Portfolio Mix sleeve allocation here. The single-asset stock scenarios still run as pure QQQ, ASX200, VGS, VGE, DBP, bonds, high-interest cash, and bitcoin tracks.</p>
          </div>
          <div class="wealth-workbook__allocation-grid">
            <label
              v-for="allocation in allocationFields"
              :key="allocation.key"
              class="wealth-workbook__allocation"
              :class="{ 'is-locked': isLocked(allocation.key) }"
            >
              <span class="wealth-workbook__allocation-head">
                <span class="wealth-workbook__allocation-title">
                  <i class="wealth-workbook__allocation-swatch" :style="{ background: allocation.color }"></i>
                  {{ allocation.label }}
                </span>
                <button
                  type="button"
                  class="wealth-workbook__lock-btn"
                  :class="{ 'is-active': isLocked(allocation.key) }"
                  :aria-pressed="isLocked(allocation.key)"
                  @click.prevent="toggleLock(allocation.key)"
                >
                  {{ isLocked(allocation.key) ? 'Locked' : 'Lock' }}
                </button>
              </span>
              <div class="wealth-workbook__allocation-controls">
                <input
                  :value="getAllocationPct(allocation.key)"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="isLocked(allocation.key) && !hasUnlockedPeers(allocation.key)"
                  @input="handleAllocationInput(allocation.key, $event)"
                />
                <input
                  :value="getAllocationPct(allocation.key)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="isLocked(allocation.key) && !hasUnlockedPeers(allocation.key)"
                  @input="handleAllocationInput(allocation.key, $event)"
                />
              </div>
            </label>
          </div>
          <div class="wealth-workbook__bootstrap-grid">
            <article
              v-for="asset in bootstrapAssets"
              :key="asset.key"
              class="wealth-workbook__bootstrap-card"
            >
              <div class="wealth-workbook__bootstrap-top">
                <strong>{{ asset.label }}</strong>
                <span>{{ asset.ticker }}</span>
              </div>
              <p>
                {{ asset.lookbackYears }} year bootstrap window from {{ asset.startMonth }} to {{ asset.endMonth }}.
              </p>
              <span>{{ asset.months }} historical months in the bootstrap pool.</span>
            </article>
          </div>
          <p class="wealth-workbook__note">
            {{ bootstrapSamplingNote }}
          </p>
        </template>

        <template v-else-if="activeSheet === 'regionScout'">
          <WealthRegionScoutStep
            view="inputs"
            :form="form"
            :scout-config="regionScoutConfig"
            :suburb-search-context="suburbSearchContext"
          />
        </template>

        <template v-else-if="activeSheet === 'apartment'">
          <div class="wealth-workbook__panel-head">
            <h3>Apartment assumptions</h3>
            <p>Owner and rentvest apartment paths both draw from this sheet.</p>
          </div>
          <div class="wealth-market">
            <div class="wealth-market__controls-row wealth-market__controls-row--apartment">
              <section class="wealth-market__controls card">
                <label class="wealth-workbook__toggle">
                  <input v-model="form.propertyConfig.firstHomeBuyerEligible" type="checkbox" />
                  <span>Apply first-home-buyer support where possible</span>
                </label>
                <label class="wealth-workbook__toggle">
                  <input v-model="form.propertyConfig.investWhileSavingForDeposit" type="checkbox" />
                  <span>Invest while saving for deposit</span>
                </label>
                <div class="wealth-routing">
                  <div class="wealth-routing__head">
                    <span>Property surplus routing</span>
                  </div>
                  <div class="wealth-routing__options">
                    <button
                      type="button"
                      class="wealth-routing__option"
                      :class="{ 'is-active': form.propertyConfig.surplusAllocationMode === 'portfolio' }"
                      @click="form.propertyConfig.surplusAllocationMode = 'portfolio'"
                    >
                      <strong>Invest surplus</strong>
                      <span>Keep excess cash in the portfolio for higher upside and more liquidity.</span>
                    </button>
                    <button
                      type="button"
                      class="wealth-routing__option"
                      :class="{ 'is-active': form.propertyConfig.surplusAllocationMode === 'mortgagePrepayment' }"
                      @click="form.propertyConfig.surplusAllocationMode = 'mortgagePrepayment'"
                    >
                      <strong>Prepay mortgage</strong>
                      <span>Use excess cash to reduce the loan balance and interest drag sooner.</span>
                    </button>
                  </div>
                </div>
              </section>
              <section v-if="activePropertyPurchasingPower" class="wealth-market__power card">
                <div class="wealth-property-section__head">
                  <h4>Estimated purchasing power</h4>
                  <p>Based on current household income, savings, HELP debt, and the strongest deposit the current cash position can support.</p>
                </div>
                <div class="wealth-market__power-grid">
                  <article class="wealth-market__power-card">
                    <span>Live-in</span>
                    <strong>{{ formatCurrency(activePropertyPurchasingPower.owner.affordablePrice) }}</strong>
                    <small>Cash needed {{ formatCurrency(activePropertyPurchasingPower.owner.requiredCash) }}</small>
                  </article>
                  <article class="wealth-market__power-card">
                    <span>Investment</span>
                    <strong>{{ formatCurrency(activePropertyPurchasingPower.investment.affordablePrice) }}</strong>
                    <small>Cash needed {{ formatCurrency(activePropertyPurchasingPower.investment.requiredCash) }}</small>
                  </article>
                </div>
              </section>
            </div>

            <SuburbSearchSelector
              :current-selection="selectedApartmentAreaSelection"
              :suburb-options="suburbSearchContext.suburbOptions"
              @select-suburb="emit('select-property-area', { propertyType: 'apartment', selection: $event })"
            />

            <p
              v-if="selectedApartmentAreaRecord && !hasEnoughPropertyData(selectedApartmentAreaRecord, selectedApartmentAreaPreview, 'apartment')"
              class="wealth-market__warning"
            >
              Not enough data for your result.
            </p>

            <div
              v-if="selectedApartmentAreaRecord && hasEnoughPropertyData(selectedApartmentAreaRecord, selectedApartmentAreaPreview, 'apartment')"
              class="wealth-market__summary-card"
            >
              <h3 class="wealth-market__selected-area">
                {{ selectedApartmentAreaRecord.label }}
              </h3>
              <div class="wealth-workbook__summary-grid wealth-workbook__summary-grid--market wealth-workbook__summary-grid--flat">
                <div v-if="selectedApartmentAreaPreview.apartment">
                  <span>{{ getEstimatedLabel(selectedApartmentAreaRecord, 'apartment', 'Estimated apartment price') }}</span>
                  <strong>{{ formatCurrency(selectedApartmentAreaPreview.apartment.purchasePrice) }}</strong>
                </div>
                <div v-if="selectedApartmentAreaRecord.marketHistory?.apartment?.actualPoints?.length">
                  <span>Apartment avg annual increase</span>
                  <strong>{{ formatPercent(selectedApartmentAreaRecord.marketHistory?.apartment?.averageAnnualIncrease) }}</strong>
                </div>
                <div v-if="selectedApartmentAreaRecord.marketHistory?.apartment?.actualPoints?.length">
                  <span>Apartment sales</span>
                  <strong>{{ formatListingsSummary(selectedApartmentAreaRecord.marketHistory?.salesSummary?.apartmentTotal, selectedApartmentAreaRecord.marketHistory?.salesSummary?.apartmentAverage) }}</strong>
                </div>
                <div>
                  <span>History window</span>
                  <strong>{{ getHistoryWindow(selectedApartmentAreaRecord, 'apartment') }}</strong>
                </div>
                <div>
                  <span>Yield model source</span>
                  <strong>{{ getYieldSourceLabel(selectedApartmentAreaPreview, 'apartment') }}</strong>
                </div>
                <div>
                  <span>Latest gross yield</span>
                  <strong>{{ formatPercent(getYieldModel(selectedApartmentAreaPreview, 'apartment')?.currentYield) }}</strong>
                </div>
                <div>
                  <span>Long-run yield mean</span>
                  <strong>{{ formatPercent(getYieldModel(selectedApartmentAreaPreview, 'apartment')?.longTermMean) }}</strong>
                </div>
                <div>
                  <span>Yield volatility</span>
                  <strong>{{ formatPercent(getYieldModel(selectedApartmentAreaPreview, 'apartment')?.volatility) }}</strong>
                </div>
                <div>
                  <span>Yield history window</span>
                  <strong>{{ getYieldHistoryWindow(selectedApartmentAreaPreview, 'apartment') }}</strong>
                </div>
              </div>
              <p
                v-if="selectedApartmentAreaPreview.apartment && !hasUsableYieldModel(selectedApartmentAreaPreview, 'apartment')"
                class="wealth-market__warning"
              >
                Investment apartment paths are unavailable because no rental-yield model could be resolved from suburb, subregion, or region history.
              </p>
            </div>

            <div
              v-if="selectedApartmentAreaRecord && hasEnoughPropertyData(selectedApartmentAreaRecord, selectedApartmentAreaPreview, 'apartment')"
              class="wealth-market__charts wealth-market__charts--single"
            >
              <WealthPropertyTrendChart
                title="Median apartment price"
                color="#0f9d7a"
                :actual-points="selectedApartmentAreaRecord.marketHistory?.apartment?.actualPoints || []"
                :trend-points="selectedApartmentAreaRecord.marketHistory?.apartment?.trendPoints || []"
                :estimate-point="selectedApartmentAreaRecord.marketHistory?.apartment?.estimatePoint || null"
              />
              <WealthPropertyTrendChart
                title="Rent yield over time"
                kicker="Yield history"
                color="#0f9d7a"
                value-mode="percent"
                :value-padding="0.005"
                empty-text="No rental-yield history available for this property type."
                actual-legend-label="Actual yearly yield"
                trend-legend-label="Curved best-fit trend"
                estimate-legend-label="Current estimate"
                :actual-points="getYieldModel(selectedApartmentAreaPreview, 'apartment')?.actualYieldPoints || []"
                :trend-points="buildYieldTrendPoints(selectedApartmentAreaPreview, 'apartment')"
                :estimate-point="null"
              />
            </div>
          </div>
          <div
            v-if="selectedApartmentAreaRecord && hasEnoughPropertyData(selectedApartmentAreaRecord, selectedApartmentAreaPreview, 'apartment')"
            class="wealth-property-sections"
          >
            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Shared property settings</h4>
                <p>These apply to the property regardless of whether the path ends up owner-occupied or investment-led.</p>
              </div>
              <div class="wealth-workbook__grid wealth-workbook__grid--triple">
                <label>
                  <span>Target price</span>
                  <input v-model.number="apartmentPurchasePrice" type="number" min="0" step="1000" />
                </label>
                <label>
                  <span>Mortgage years</span>
                  <select v-model.number="form.propertyConfig.apartment.mortgageYears">
                    <option :value="20">20 years</option>
                    <option :value="25">25 years</option>
                    <option :value="30">30 years</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Financing paths</h4>
                <p>These change depending on whether the property is purchased to live in or held as an investment. Lower deposits can increase estimated LMI, which remains a rough proxy rather than a lender quote.</p>
              </div>
              <div class="wealth-property-paths">
                <div class="wealth-property-path-card">
                  <h5>Owner path</h5>
                  <div class="wealth-workbook__grid">
                    <label class="wealth-workbook__toggle wealth-workbook__toggle--inline">
                      <input v-model="apartmentOwnerScaleDepositToBuyAsap" type="checkbox" />
                      <span>Scale deposit so I can purchase ASAP</span>
                    </label>
                    <label>
                      <span>Deposit %</span>
                      <input v-model.number="apartmentOwnerDepositPct" type="number" min="5" max="80" step="1" />
                    </label>
                    <label>
                      <span>Interest rate %</span>
                      <input v-model.number="apartmentOwnerRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Long-run interest rate %</span>
                      <input v-model.number="apartmentOwnerLongRunRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                  </div>
                </div>
                <div class="wealth-property-path-card">
                  <h5>Investment path</h5>
                  <div class="wealth-workbook__grid">
                    <label class="wealth-workbook__toggle wealth-workbook__toggle--inline">
                      <input v-model="apartmentInvestmentScaleDepositToBuyAsap" type="checkbox" />
                      <span>Scale deposit so I can purchase ASAP</span>
                    </label>
                    <label>
                      <span>Deposit %</span>
                      <input v-model.number="apartmentDepositPct" type="number" min="5" max="80" step="1" />
                    </label>
                    <label>
                      <span>Property vacancy %</span>
                      <input v-model.number="vacancyRatePct" type="number" min="0" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Management fee %</span>
                      <input v-model.number="apartmentManagementPct" type="number" min="0" max="15" step="0.1" />
                    </label>
                    <label>
                      <span>Interest rate %</span>
                      <input v-model.number="apartmentInvestmentRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Long-run interest rate %</span>
                      <input v-model.number="apartmentInvestmentLongRunRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Auto-filled property costs</h4>
                <p>These fields are prefilled from the selected property value. Stamp duty uses the current NSW stepped schedule, while land tax remains a purchase-price-based estimate only.</p>
              </div>
              <div class="wealth-workbook__grid wealth-workbook__grid--triple">
                <label>
                  <span>Stamp duty</span>
                  <input v-model.number="apartmentStampDuty" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Legal fees</span>
                  <input v-model.number="apartmentLegalFees" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Buyer costs</span>
                  <input v-model.number="apartmentBuyersCosts" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Council rates</span>
                  <input v-model.number="form.propertyConfig.apartment.councilRates" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Water rates</span>
                  <input v-model.number="form.propertyConfig.apartment.waterRates" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Insurance</span>
                  <input v-model.number="form.propertyConfig.apartment.insurance" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Maintenance</span>
                  <input v-model.number="form.propertyConfig.apartment.maintenance" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Strata</span>
                  <input v-model.number="form.propertyConfig.apartment.strata" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Estimated land tax (investment)</span>
                  <input v-model.number="form.propertyConfig.apartment.landTax" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Borrowing expenses</span>
                  <input v-model.number="form.propertyConfig.apartment.borrowingExpensesTotal" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Other deductible expenses</span>
                  <input v-model.number="form.propertyConfig.apartment.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
                </label>
              </div>
            </section>
          </div>
        </template>

        <template v-else-if="activeSheet === 'house'">
          <div class="wealth-workbook__panel-head">
            <h3>House assumptions</h3>
            <p>Owner and rentvest house paths both draw from this sheet.</p>
          </div>
          <div class="wealth-market">
            <div class="wealth-market__controls-row">
              <section class="wealth-market__controls card">
                <label class="wealth-workbook__toggle">
                  <input v-model="form.propertyConfig.firstHomeBuyerEligible" type="checkbox" />
                  <span>Apply first-home-buyer support where possible</span>
                </label>
                <label class="wealth-workbook__toggle">
                  <input v-model="form.propertyConfig.investWhileSavingForDeposit" type="checkbox" />
                  <span>Invest while saving for deposit</span>
                </label>
                <div class="wealth-routing">
                  <div class="wealth-routing__head">
                    <span>Property surplus routing</span>
                  </div>
                  <div class="wealth-routing__options">
                    <button
                      type="button"
                      class="wealth-routing__option"
                      :class="{ 'is-active': form.propertyConfig.surplusAllocationMode === 'portfolio' }"
                      @click="form.propertyConfig.surplusAllocationMode = 'portfolio'"
                    >
                      <strong>Invest surplus</strong>
                      <span>Keep excess cash in the portfolio for higher upside and more liquidity.</span>
                    </button>
                    <button
                      type="button"
                      class="wealth-routing__option"
                      :class="{ 'is-active': form.propertyConfig.surplusAllocationMode === 'mortgagePrepayment' }"
                      @click="form.propertyConfig.surplusAllocationMode = 'mortgagePrepayment'"
                    >
                      <strong>Prepay mortgage</strong>
                      <span>Use excess cash to reduce the loan balance and interest drag sooner.</span>
                    </button>
                  </div>
                </div>
              </section>
              <section v-if="activePropertyPurchasingPower" class="wealth-market__power card">
                <div class="wealth-property-section__head">
                  <h4>Estimated purchasing power</h4>
                  <p>Based on current household income, savings, HELP debt, and the strongest deposit the current cash position can support.</p>
                </div>
                <div class="wealth-market__power-grid">
                  <article class="wealth-market__power-card">
                    <span>Live-in</span>
                    <strong>{{ formatCurrency(activePropertyPurchasingPower.owner.affordablePrice) }}</strong>
                    <small>Cash needed {{ formatCurrency(activePropertyPurchasingPower.owner.requiredCash) }}</small>
                  </article>
                  <article class="wealth-market__power-card">
                    <span>Investment</span>
                    <strong>{{ formatCurrency(activePropertyPurchasingPower.investment.affordablePrice) }}</strong>
                    <small>Cash needed {{ formatCurrency(activePropertyPurchasingPower.investment.requiredCash) }}</small>
                  </article>
                </div>
              </section>
            </div>

            <SuburbSearchSelector
              :current-selection="selectedHouseAreaSelection"
              :suburb-options="suburbSearchContext.suburbOptions"
              @select-suburb="emit('select-property-area', { propertyType: 'house', selection: $event })"
            />

            <p
              v-if="selectedHouseAreaRecord && !hasEnoughPropertyData(selectedHouseAreaRecord, selectedHouseAreaPreview, 'house')"
              class="wealth-market__warning"
            >
              Not enough data for your result.
            </p>

            <div
              v-if="selectedHouseAreaRecord && hasEnoughPropertyData(selectedHouseAreaRecord, selectedHouseAreaPreview, 'house')"
              class="wealth-market__summary-card"
            >
              <h3 class="wealth-market__selected-area">
                {{ selectedHouseAreaRecord.label }}
              </h3>
              <div class="wealth-workbook__summary-grid wealth-workbook__summary-grid--market wealth-workbook__summary-grid--flat">
                <div v-if="selectedHouseAreaPreview.house">
                  <span>{{ getEstimatedLabel(selectedHouseAreaRecord, 'house', 'Estimated house price') }}</span>
                  <strong>{{ formatCurrency(selectedHouseAreaPreview.house.purchasePrice) }}</strong>
                </div>
                <div v-if="selectedHouseAreaRecord.marketHistory?.house?.actualPoints?.length">
                  <span>House avg annual increase</span>
                  <strong>{{ formatPercent(selectedHouseAreaRecord.marketHistory?.house?.averageAnnualIncrease) }}</strong>
                </div>
                <div v-if="selectedHouseAreaRecord.marketHistory?.house?.actualPoints?.length">
                  <span>House sales</span>
                  <strong>{{ formatListingsSummary(selectedHouseAreaRecord.marketHistory?.salesSummary?.houseTotal, selectedHouseAreaRecord.marketHistory?.salesSummary?.houseAverage) }}</strong>
                </div>
                <div>
                  <span>History window</span>
                  <strong>{{ getHistoryWindow(selectedHouseAreaRecord, 'house') }}</strong>
                </div>
                <div>
                  <span>Yield model source</span>
                  <strong>{{ getYieldSourceLabel(selectedHouseAreaPreview, 'house') }}</strong>
                </div>
                <div>
                  <span>Latest gross yield</span>
                  <strong>{{ formatPercent(getYieldModel(selectedHouseAreaPreview, 'house')?.currentYield) }}</strong>
                </div>
                <div>
                  <span>Long-run yield mean</span>
                  <strong>{{ formatPercent(getYieldModel(selectedHouseAreaPreview, 'house')?.longTermMean) }}</strong>
                </div>
                <div>
                  <span>Yield volatility</span>
                  <strong>{{ formatPercent(getYieldModel(selectedHouseAreaPreview, 'house')?.volatility) }}</strong>
                </div>
                <div>
                  <span>Yield history window</span>
                  <strong>{{ getYieldHistoryWindow(selectedHouseAreaPreview, 'house') }}</strong>
                </div>
              </div>
              <p
                v-if="selectedHouseAreaPreview.house && !hasUsableYieldModel(selectedHouseAreaPreview, 'house')"
                class="wealth-market__warning"
              >
                Investment house paths are unavailable because no rental-yield model could be resolved from suburb, subregion, or region history.
              </p>
            </div>

            <div
              v-if="selectedHouseAreaRecord && hasEnoughPropertyData(selectedHouseAreaRecord, selectedHouseAreaPreview, 'house')"
              class="wealth-market__charts wealth-market__charts--single"
            >
              <WealthPropertyTrendChart
                title="Median house price"
                color="#2563eb"
                :actual-points="selectedHouseAreaRecord.marketHistory?.house?.actualPoints || []"
                :trend-points="selectedHouseAreaRecord.marketHistory?.house?.trendPoints || []"
                :estimate-point="selectedHouseAreaRecord.marketHistory?.house?.estimatePoint || null"
              />
              <WealthPropertyTrendChart
                title="Rent yield over time"
                kicker="Yield history"
                color="#2563eb"
                value-mode="percent"
                :value-padding="0.005"
                empty-text="No rental-yield history available for this property type."
                actual-legend-label="Actual yearly yield"
                trend-legend-label="Curved best-fit trend"
                estimate-legend-label="Current estimate"
                :actual-points="getYieldModel(selectedHouseAreaPreview, 'house')?.actualYieldPoints || []"
                :trend-points="buildYieldTrendPoints(selectedHouseAreaPreview, 'house')"
                :estimate-point="null"
              />
            </div>
          </div>
          <div
            v-if="selectedHouseAreaRecord && hasEnoughPropertyData(selectedHouseAreaRecord, selectedHouseAreaPreview, 'house')"
            class="wealth-property-sections"
          >
            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Shared property settings</h4>
                <p>These apply to the property regardless of whether the path ends up owner-occupied or investment-led.</p>
              </div>
              <div class="wealth-workbook__grid wealth-workbook__grid--triple">
                <label>
                  <span>Target price</span>
                  <input v-model.number="housePurchasePrice" type="number" min="0" step="1000" />
                </label>
                <label>
                  <span>Mortgage years</span>
                  <select v-model.number="form.propertyConfig.house.mortgageYears">
                    <option :value="20">20 years</option>
                    <option :value="25">25 years</option>
                    <option :value="30">30 years</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Financing paths</h4>
                <p>These change depending on whether the property is purchased to live in or held as an investment. Lower deposits can increase estimated LMI, which remains a rough proxy rather than a lender quote.</p>
              </div>
              <div class="wealth-property-paths">
                <div class="wealth-property-path-card">
                  <h5>Owner path</h5>
                  <div class="wealth-workbook__grid">
                    <label class="wealth-workbook__toggle wealth-workbook__toggle--inline">
                      <input v-model="houseOwnerScaleDepositToBuyAsap" type="checkbox" />
                      <span>Scale deposit so I can purchase ASAP</span>
                    </label>
                    <label>
                      <span>Deposit %</span>
                      <input v-model.number="houseOwnerDepositPct" type="number" min="5" max="80" step="1" />
                    </label>
                    <label>
                      <span>Interest rate %</span>
                      <input v-model.number="houseOwnerRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Long-run interest rate %</span>
                      <input v-model.number="houseOwnerLongRunRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                  </div>
                </div>
                <div class="wealth-property-path-card">
                  <h5>Investment path</h5>
                  <div class="wealth-workbook__grid">
                    <label class="wealth-workbook__toggle wealth-workbook__toggle--inline">
                      <input v-model="houseInvestmentScaleDepositToBuyAsap" type="checkbox" />
                      <span>Scale deposit so I can purchase ASAP</span>
                    </label>
                    <label>
                      <span>Deposit %</span>
                      <input v-model.number="houseDepositPct" type="number" min="5" max="80" step="1" />
                    </label>
                    <label>
                      <span>Property vacancy %</span>
                      <input v-model.number="vacancyRatePct" type="number" min="0" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Management fee %</span>
                      <input v-model.number="houseManagementPct" type="number" min="0" max="15" step="0.1" />
                    </label>
                    <label>
                      <span>Interest rate %</span>
                      <input v-model.number="houseInvestmentRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                    <label>
                      <span>Long-run interest rate %</span>
                      <input v-model.number="houseInvestmentLongRunRatePct" type="number" min="1" max="12" step="0.1" />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="wealth-property-section wealth-property-section--plain">
              <div class="wealth-property-section__head">
                <h4>Auto-filled property costs</h4>
                <p>These fields are prefilled from the selected property value. Stamp duty uses the current NSW stepped schedule, while land tax remains a purchase-price-based estimate only.</p>
              </div>
              <div class="wealth-workbook__grid wealth-workbook__grid--triple">
                <label>
                  <span>Stamp duty</span>
                  <input v-model.number="houseStampDuty" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Legal fees</span>
                  <input v-model.number="houseLegalFees" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Buyer costs</span>
                  <input v-model.number="houseBuyersCosts" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Council rates</span>
                  <input v-model.number="form.propertyConfig.house.councilRates" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Water rates</span>
                  <input v-model.number="form.propertyConfig.house.waterRates" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Insurance</span>
                  <input v-model.number="form.propertyConfig.house.insurance" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Maintenance</span>
                  <input v-model.number="form.propertyConfig.house.maintenance" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Estimated land tax (investment)</span>
                  <input v-model.number="form.propertyConfig.house.landTax" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Borrowing expenses</span>
                  <input v-model.number="form.propertyConfig.house.borrowingExpensesTotal" type="number" min="0" step="100" />
                </label>
                <label>
                  <span>Other deductible expenses</span>
                  <input v-model.number="form.propertyConfig.house.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
                </label>
              </div>
            </section>
          </div>
        </template>
      </section>
    </Transition>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SuburbSearchSelector from './SuburbSearchSelector.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'
import WealthRegionScoutStep from './WealthRegionScoutStep.vue'
import { getWealthBootstrapAssets } from '../../wealth/assetBootstrap.js'
import {
  amortizeOneYear,
  calculatePurchaseCosts,
  estimatePropertyBorrowingPower,
  estimateLmi,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  isDepositScalingEnabled,
  scalePropertyCostWithPrice,
  scalePurchaseCostsWithPrice
} from '../../wealth/finance.js'
import { getAdjustedWeeklyLivingCosts, getEarnerAnnualIncomeForYear, normaliseHouseholdEarners, normaliseIncomeProfile } from '../../wealth/incomeSeries.js'
import {
  getLockedWeightKeys,
  isPortfolioWeightLocked,
  portfolioAllocationFields as allocationFields,
  setPortfolioAllocation,
  togglePortfolioWeightLock
} from '../../wealth/portfolioAllocation.js'

const props = defineProps({
  form: { type: Object, required: true },
  activeSheet: { type: String, required: true },
  scenarioSelection: { type: Object, required: true },
  regionScoutConfig: {
    type: Object,
    default: () => ({
      targetYears: 5,
      propertyType: 'apartment',
      granularity: 'region',
      locationKey: null,
      savingsMode: 'defaultPortfolio',
      minPrice: null,
      maxPrice: null
    })
  },
  suburbSearchContext: { type: Object, required: true },
  selectedApartmentAreaSelection: { type: Object, default: null },
  selectedApartmentAreaRecord: { type: Object, default: null },
  selectedApartmentAreaPreview: {
    type: Object,
    default: () => ({ house: null, apartment: null, houseGrowthYears: 0, apartmentGrowthYears: 0 })
  },
  selectedHouseAreaSelection: { type: Object, default: null },
  selectedHouseAreaRecord: { type: Object, default: null },
  selectedHouseAreaPreview: {
    type: Object,
    default: () => ({ house: null, apartment: null, houseGrowthYears: 0, apartmentGrowthYears: 0 })
  }
})

const emit = defineEmits(['select-property-area'])

const bootstrapAssets = getWealthBootstrapAssets()

const bootstrapSamplingNote = computed(() => {
  const method = props.form.portfolioConfig.bootstrapMethod === 'historical-monthly'
    ? 'historical-monthly'
    : 'historical-block'
  const blockSizeMonths = Math.max(1, Math.round(Number(props.form.portfolioConfig.bootstrapBlockSizeMonths) || 3))

  if (method === 'historical-monthly') {
    return 'Stock paths bootstrap shared historical months across QQQ, ASX200, VGS, VGE, DBP, bonds, and cash so cross-asset moves stay aligned within each simulated year. Bitcoin still uses its shorter 5 year history.'
  }

  return `Stock paths bootstrap shared ${blockSizeMonths}-month historical blocks across QQQ, ASX200, VGS, VGE, DBP, bonds, and cash so crashes and momentum clusters stay intact within each simulated year. Bitcoin still uses its shorter 5 year history.`
})

function percentProxy(getter, setter) {
  return computed({
    get: () => Number(((Number(getter()) || 0) * 100).toFixed(1)),
    set: (value) => setter(Math.max(0, Number(value) || 0) / 100)
  })
}

function getAllocationPct(key) {
  return Math.round((Math.max(0, Number(props.form.portfolioConfig[key]) || 0) * 100))
}

function setAllocation(targetKey, value) {
  setPortfolioAllocation(props.form.portfolioConfig, targetKey, value)
}

function handleAllocationInput(targetKey, event) {
  setAllocation(targetKey, event?.target?.value)

  if (event?.target) {
    event.target.value = String(getAllocationPct(targetKey))
  }
}

function toggleLock(key) {
  togglePortfolioWeightLock(props.form.portfolioConfig, key)
}

function isLocked(key) {
  return isPortfolioWeightLocked(props.form.portfolioConfig, key)
}

function hasUnlockedPeers(key) {
  const lockedKeys = new Set(getLockedWeightKeys(props.form.portfolioConfig))
  return allocationFields.some(field => field.key !== key && !lockedKeys.has(field.key))
}

const vacancyRatePct = percentProxy(() => props.form.propertyConfig.vacancyRate, value => { props.form.propertyConfig.vacancyRate = value })
const housePurchasePrice = computed({
  get: () => roundToNearestThousand(props.form.propertyConfig.house.purchasePrice),
  set: (value) => { props.form.propertyConfig.house.purchasePrice = roundToNearestThousand(value) }
})
const apartmentPurchasePrice = computed({
  get: () => roundToNearestThousand(props.form.propertyConfig.apartment.purchasePrice),
  set: (value) => { props.form.propertyConfig.apartment.purchasePrice = roundToNearestThousand(value) }
})
const houseOwnerDepositPct = percentProxy(() => props.form.propertyConfig.house.ownerDepositPct, value => { props.form.propertyConfig.house.ownerDepositPct = value })
const houseDepositPct = percentProxy(() => props.form.propertyConfig.house.depositPct, value => { props.form.propertyConfig.house.depositPct = value })
const houseOwnerScaleDepositToBuyAsap = computed({
  get: () => props.form.propertyConfig.house.ownerScaleDepositToBuyAsap !== false,
  set: (value) => { props.form.propertyConfig.house.ownerScaleDepositToBuyAsap = Boolean(value) }
})
const houseInvestmentScaleDepositToBuyAsap = computed({
  get: () => props.form.propertyConfig.house.investmentScaleDepositToBuyAsap !== false,
  set: (value) => { props.form.propertyConfig.house.investmentScaleDepositToBuyAsap = Boolean(value) }
})
const houseOwnerRatePct = percentProxy(() => props.form.propertyConfig.house.ownerInterestRate, value => { props.form.propertyConfig.house.ownerInterestRate = value })
const houseOwnerLongRunRatePct = percentProxy(() => props.form.propertyConfig.house.ownerLongRunInterestRate, value => { props.form.propertyConfig.house.ownerLongRunInterestRate = value })
const houseInvestmentRatePct = percentProxy(() => props.form.propertyConfig.house.investmentInterestRate, value => { props.form.propertyConfig.house.investmentInterestRate = value })
const houseInvestmentLongRunRatePct = percentProxy(() => props.form.propertyConfig.house.investmentLongRunInterestRate, value => { props.form.propertyConfig.house.investmentLongRunInterestRate = value })
const houseGrowthPct = percentProxy(() => props.form.propertyConfig.house.growthMean, value => { props.form.propertyConfig.house.growthMean = value })
const houseManagementPct = percentProxy(() => props.form.propertyConfig.house.propertyManagementPct, value => { props.form.propertyConfig.house.propertyManagementPct = value })
const apartmentOwnerDepositPct = percentProxy(() => props.form.propertyConfig.apartment.ownerDepositPct, value => { props.form.propertyConfig.apartment.ownerDepositPct = value })
const apartmentDepositPct = percentProxy(() => props.form.propertyConfig.apartment.depositPct, value => { props.form.propertyConfig.apartment.depositPct = value })
const apartmentOwnerScaleDepositToBuyAsap = computed({
  get: () => props.form.propertyConfig.apartment.ownerScaleDepositToBuyAsap !== false,
  set: (value) => { props.form.propertyConfig.apartment.ownerScaleDepositToBuyAsap = Boolean(value) }
})
const apartmentInvestmentScaleDepositToBuyAsap = computed({
  get: () => props.form.propertyConfig.apartment.investmentScaleDepositToBuyAsap !== false,
  set: (value) => { props.form.propertyConfig.apartment.investmentScaleDepositToBuyAsap = Boolean(value) }
})
const apartmentOwnerRatePct = percentProxy(() => props.form.propertyConfig.apartment.ownerInterestRate, value => { props.form.propertyConfig.apartment.ownerInterestRate = value })
const apartmentOwnerLongRunRatePct = percentProxy(() => props.form.propertyConfig.apartment.ownerLongRunInterestRate, value => { props.form.propertyConfig.apartment.ownerLongRunInterestRate = value })
const apartmentInvestmentRatePct = percentProxy(() => props.form.propertyConfig.apartment.investmentInterestRate, value => { props.form.propertyConfig.apartment.investmentInterestRate = value })
const apartmentInvestmentLongRunRatePct = percentProxy(() => props.form.propertyConfig.apartment.investmentLongRunInterestRate, value => { props.form.propertyConfig.apartment.investmentLongRunInterestRate = value })
const apartmentGrowthPct = percentProxy(() => props.form.propertyConfig.apartment.growthMean, value => { props.form.propertyConfig.apartment.growthMean = value })
const apartmentManagementPct = percentProxy(() => props.form.propertyConfig.apartment.propertyManagementPct, value => { props.form.propertyConfig.apartment.propertyManagementPct = value })

function createSharedPurchaseCostProxy(propertyKey, costKey) {
  return computed({
    get: () => Number(props.form.propertyConfig[propertyKey].ownerPurchaseCosts?.[costKey] || 0),
    set: (value) => {
      const safeValue = Math.max(0, Number(value) || 0)
      props.form.propertyConfig[propertyKey].ownerPurchaseCosts[costKey] = safeValue
      props.form.propertyConfig[propertyKey].investmentPurchaseCosts[costKey] = safeValue
    }
  })
}

const apartmentStampDuty = createSharedPurchaseCostProxy('apartment', 'stampDuty')
const apartmentLegalFees = createSharedPurchaseCostProxy('apartment', 'legalFees')
const apartmentBuyersCosts = createSharedPurchaseCostProxy('apartment', 'buyersCosts')
const houseStampDuty = createSharedPurchaseCostProxy('house', 'stampDuty')
const houseLegalFees = createSharedPurchaseCostProxy('house', 'legalFees')
const houseBuyersCosts = createSharedPurchaseCostProxy('house', 'buyersCosts')

const householdProfile = computed(() => normaliseIncomeProfile(props.form.profile))
const currentEarners = computed(() => normaliseHouseholdEarners(props.form.profile))
const currentHouseholdIncome = computed(() =>
  currentEarners.value.reduce((sum, earner) => sum + getEarnerAnnualIncomeForYear(earner, 0, currentEarners.value.length), 0)
)
const currentStartingSavings = computed(() => householdProfile.value.startingSavings || 0)
const currentHousingCostAnnual = computed(() => {
  if (props.form.existingProperty?.enabled && props.form.existingProperty?.occupancyMode === 'owner') {
    const property = props.form.existingProperty
    const annualRepayment = getEstimatedExistingPropertyRepayment(property)
    const estimatedHoldingCosts =
      Math.max(0, Number(property.councilRates) || 0) +
      Math.max(0, Number(property.waterRates) || 0) +
      Math.max(0, Number(property.insurance) || 0) +
      Math.max(0, Number(property.maintenance) || 0) +
      Math.max(0, Number(property.strata) || 0)
    return annualRepayment + estimatedHoldingCosts
  }
  const housingCosts = props.form.housingCosts || {}
  const livesAtHomeNow = Boolean(housingCosts.liveAtHome) && Number(housingCosts.liveAtHomeYears || 0) > 0
  return livesAtHomeNow
    ? Math.max(0, Number(housingCosts.weeklyBoardAtHome) || 0) * 52
    : Math.max(0, Number(housingCosts.weeklyRent) || 0) * 52
})
const activePropertyKey = computed(() =>
  props.activeSheet === 'house' || props.activeSheet === 'apartment'
    ? props.activeSheet
    : null
)
const activePropertyPurchasingPower = computed(() => {
  if (!activePropertyKey.value) return null
  return {
    owner: estimatePurchasingPower(activePropertyKey.value, 'owner'),
    investment: estimatePurchasingPower(activePropertyKey.value, 'investment')
  }
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(roundToNearestThousand(value))
}

function formatListingsSummary(total, average) {
  const safeTotal = Number.isFinite(Number(total)) ? Math.round(Number(total)) : 0
  const averageText = Number.isFinite(Number(average)) ? `${Math.round(Number(average))}/yr avg` : 'n/a avg'
  return `${safeTotal} total | ${averageText}`
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}%`
}

function getHistoryWindow(areaRecord, propertyType) {
  const years = (areaRecord?.marketHistory?.[propertyType]?.actualPoints || []).map((point) => point.year)
  if (!years.length) return 'No history loaded'
  return `${Math.min(...years)}-${Math.max(...years)}`
}

function getEstimatedLabel(areaRecord, propertyType, fallbackLabel) {
  const estimateYear = areaRecord?.marketHistory?.[propertyType]?.estimatePoint?.year
  return estimateYear ? `${fallbackLabel} (${estimateYear})` : fallbackLabel
}

function getYieldModel(preview, propertyType) {
  const property = preview?.[propertyType]
  const yieldModel = property?.yieldModel
  return yieldModel && typeof yieldModel === 'object' ? yieldModel : null
}

function hasUsableYieldModel(preview, propertyType) {
  return Boolean(getYieldModel(preview, propertyType)?.actualYieldPoints?.length)
}

function getYieldSourceLabel(preview, propertyType) {
  const yieldModel = getYieldModel(preview, propertyType)
  if (!yieldModel) return 'Unavailable'

  const sourceType = yieldModel.sourceAreaType === 'subregion'
    ? 'Subregion'
    : yieldModel.sourceAreaType === 'region'
      ? 'Region'
      : 'Suburb'
  const sourceLabel = String(yieldModel.sourceAreaLabel || '').trim()
  return sourceLabel ? `${sourceType}: ${sourceLabel}` : sourceType
}

function getYieldHistoryWindow(preview, propertyType) {
  const years = (getYieldModel(preview, propertyType)?.actualYieldPoints || []).map((point) => point.year)
  if (!years.length) return 'No history loaded'
  return `${Math.min(...years)}-${Math.max(...years)}`
}

function buildYieldTrendPoints(preview, propertyType) {
  const yieldModel = getYieldModel(preview, propertyType)
  const points = Array.isArray(yieldModel?.actualYieldPoints) ? yieldModel.actualYieldPoints : []
  const mean = Number(yieldModel?.longTermMean)
  if (!points.length || !Number.isFinite(mean)) return []

  return points.map((point) => ({
    year: point.year,
    value: mean
  }))
}


function hasEnoughPropertyData(areaRecord, preview, propertyType) {
  const purchasePrice = Number(preview?.[propertyType]?.purchasePrice) || 0
  const actualPoints = areaRecord?.marketHistory?.[propertyType]?.actualPoints || []
  return purchasePrice > 0 && actualPoints.length > 0
}

function roundToNearestThousand(value) {
  return Math.round((Math.max(0, Number(value) || 0)) / 1000) * 1000
}

function clampPct(value) {
  return Math.min(0.95, Math.max(0.05, Number(value) || 0))
}

function getEstimatedExistingPropertyRepayment(property) {
  if (!property || !Number(property.mortgageBalance)) return 0
  const occupancyMode = property.occupancyMode === 'investment' ? 'investment' : 'owner'
  const annualRate = occupancyMode === 'investment'
    ? Number(property.investmentInterestRate)
    : Number(property.ownerInterestRate)
  const yearsRemaining = Math.max(1, Math.round(Number(property.mortgageYears) || 25))
  return amortizeOneYear(
    Math.max(0, Number(property.mortgageBalance) || 0),
    Math.max(0, annualRate || 0),
    yearsRemaining
  ).payment
}

function getMinimumDepositPct(propertyKey, occupancyMode) {
  const propertyConfig = props.form.propertyConfig?.[propertyKey]
  if (!propertyConfig) return 0.05
  return occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(propertyConfig)
    : getEffectiveInvestmentDepositPct(propertyConfig)
}

function buildPurchasePlan(propertyKey, occupancyMode, propertyValue, depositPct = getMinimumDepositPct(propertyKey, occupancyMode)) {
  const propertyConfig = props.form.propertyConfig?.[propertyKey]
  if (!propertyConfig) return null
  const scaledPrice = Math.max(0, Number(propertyValue) || 0)
  const scaledPurchaseCosts = scalePurchaseCostsWithPrice(
    occupancyMode === 'owner' ? propertyConfig.ownerPurchaseCosts : propertyConfig.investmentPurchaseCosts,
    propertyConfig.purchasePrice,
    scaledPrice,
    propertyKey
  )
  const firstHomeBuyerEligible = occupancyMode === 'owner' && Boolean(props.form.propertyConfig.firstHomeBuyerEligible)
  const safeDepositPct = clampPct(depositPct)
  const deposit = scaledPrice * safeDepositPct
  const lmi = estimateLmi(scaledPrice, safeDepositPct, firstHomeBuyerEligible)
  const purchaseCosts = calculatePurchaseCosts(scaledPurchaseCosts, firstHomeBuyerEligible, scaledPrice)
  const scaledBorrowingExpensesTotal = scalePropertyCostWithPrice(
    propertyConfig.borrowingExpensesTotal,
    propertyConfig.purchasePrice,
    scaledPrice,
    propertyKey,
    'borrowingExpensesTotal'
  )
  const borrowingExpensesUpfront = occupancyMode === 'investment'
    ? scaledBorrowingExpensesTotal
    : 0
  const deductibleBorrowingExpensesTotal = occupancyMode === 'investment'
    ? scaledBorrowingExpensesTotal + lmi
    : 0

  return {
    depositPct: safeDepositPct,
    requiredCash: deposit + purchaseCosts.total + borrowingExpensesUpfront,
    openingLoanBalance: Math.max(0, scaledPrice - deposit + lmi),
    deductibleBorrowingExpensesTotal
  }
}

function solveBestPurchasePlan(propertyKey, occupancyMode, propertyValue) {
  const propertyConfig = props.form.propertyConfig?.[propertyKey]
  if (!propertyConfig) return null

  const minDepositPct = getMinimumDepositPct(propertyKey, occupancyMode)
  const allowDepositScaling = isDepositScalingEnabled(propertyConfig, occupancyMode)
  const minimumPlan = buildPurchasePlan(propertyKey, occupancyMode, propertyValue, minDepositPct)
  if (!minimumPlan || minimumPlan.requiredCash > currentStartingSavings.value) return null
  if (!allowDepositScaling) return minimumPlan

  let low = minDepositPct
  let high = 0.95
  let bestPlan = minimumPlan

  const highPlan = buildPurchasePlan(propertyKey, occupancyMode, propertyValue, high)
  if (highPlan && highPlan.requiredCash <= currentStartingSavings.value) {
    return highPlan
  }

  for (let step = 0; step < 28; step += 1) {
    const midpoint = (low + high) / 2
    const plan = buildPurchasePlan(propertyKey, occupancyMode, propertyValue, midpoint)
    if (!plan) break
    if (plan.requiredCash <= currentStartingSavings.value) {
      low = midpoint
      bestPlan = plan
    } else {
      high = midpoint
    }
  }

  return bestPlan
}

function canAffordProperty(propertyKey, occupancyMode, propertyValue) {
  const propertyConfig = props.form.propertyConfig?.[propertyKey]
  const plan = solveBestPurchasePlan(propertyKey, occupancyMode, propertyValue)
  if (!propertyConfig || !plan) return false

  const borrowerIncomes = currentEarners.value.map((earner) => earner.annualIncomeSeries?.[0] || earner.annualIncome || 0)
  const helpDebtBalances = currentEarners.value.map((earner) => earner.helpDebtBalance || 0)
  const borrowingPower = estimatePropertyBorrowingPower({
    taxYear: props.form.profile.taxYear,
    annualIncome: currentHouseholdIncome.value,
    annualIncomeByBorrower: borrowerIncomes,
    helpDebtBalances,
    weeklyNonHousingLivingCosts: getAdjustedWeeklyLivingCosts(props.form.profile, 0),
    occupancyMode,
    propertyType: propertyKey,
    propertyConfig,
    propertyValue,
    mortgageYears: propertyConfig.mortgageYears,
    personalHousingCostAnnual: occupancyMode === 'investment' ? currentHousingCostAnnual.value : 0,
    vacancyRate: props.form.propertyConfig.vacancyRate,
    borrowingExpensesTotalOverride: plan.deductibleBorrowingExpensesTotal
  })

  return plan.openingLoanBalance <= borrowingPower.maxLoanSize
}

function estimatePurchasingPower(propertyKey, occupancyMode) {
  const propertyConfig = props.form.propertyConfig?.[propertyKey]
  if (!propertyConfig) return null

  const targetPrice = Math.max(0, Number(propertyConfig.purchasePrice) || 0)
  let low = 0
  let high = Math.max(200000, targetPrice)

  while (canAffordProperty(propertyKey, occupancyMode, high) && high < 10000000) {
    low = high
    high *= 1.25
  }

  for (let step = 0; step < 28; step += 1) {
    const midpoint = roundToNearestThousand((low + high) / 2)
    if (canAffordProperty(propertyKey, occupancyMode, midpoint)) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  const affordablePrice = roundToNearestThousand(low)
  const purchasePlan = solveBestPurchasePlan(propertyKey, occupancyMode, affordablePrice)

  return {
    affordablePrice,
    requiredCash: purchasePlan?.requiredCash || 0,
    depositPct: purchasePlan?.depositPct || getMinimumDepositPct(propertyKey, occupancyMode),
    remainingCash: Math.max(0, currentStartingSavings.value - (purchasePlan?.requiredCash || 0))
  }
}
</script>

<style scoped>
.wealth-workbook {
  display: grid;
  gap: 1rem;
}

.wealth-workbook__panel {
  display: grid;
  gap: 0.9rem;
  min-height: 28rem;
  padding: 1.25rem;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(154, 174, 204, 0.22);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
}

.wealth-workbook__panel-head h3 {
  margin: 0;
  font-size: clamp(1.65rem, 1.3rem + 1vw, 2.3rem);
  line-height: 1;
}

.wealth-workbook__panel-head p {
  margin: 0.2rem 0 0;
  color: #5d7394;
}

.wealth-market {
  display: grid;
  gap: 0.6rem;
}

.wealth-market__controls-row {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.85fr);
  gap: 0.9rem;
  align-items: stretch;
}

.wealth-market__controls-row--apartment {
  margin-top: -0.35rem;
}

.wealth-market__controls,
.wealth-market__power {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
  border-radius: 20px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.82);
}

.wealth-market__controls {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-market__controls > :last-child {
  grid-column: 1 / -1;
}

.wealth-routing {
  display: grid;
  gap: 0.7rem;
}

.wealth-routing__head {
  display: grid;
  gap: 0.18rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-routing__head span {
  font-weight: 600;
  color: #385879;
}

.wealth-routing__head p {
  margin: 0;
  color: #6a819f;
  line-height: 1.45;
}

.wealth-routing__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.wealth-routing__option {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  text-align: left;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.2);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(246, 250, 255, 0.96));
  color: #4e6787;
  font: inherit;
  cursor: pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.wealth-routing__option strong {
  color: #173050;
  font-size: 0.95rem;
}

.wealth-routing__option span {
  line-height: 1.45;
  font-size: 0.82rem;
}

.wealth-routing__option:hover {
  transform: translateY(-1px);
  border-color: rgba(71, 118, 197, 0.3);
}

.wealth-routing__option.is-active {
  border-color: rgba(37, 99, 235, 0.34);
  background: linear-gradient(180deg, rgba(230, 241, 255, 0.96), rgba(241, 247, 255, 0.98));
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.wealth-market__power-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.wealth-market__power-card {
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(154, 174, 204, 0.14);
}

.wealth-market__power-card span,
.wealth-market__power-card small {
  color: #5d7394;
}

.wealth-market__power-card span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-market__power-card strong {
  color: #173050;
  font-size: 1.2rem;
}

.wealth-market__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-market__charts--single {
  grid-template-columns: minmax(0, 1fr);
}

.wealth-market__empty {
  margin: 0;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  border: 1px dashed rgba(154, 174, 204, 0.26);
  background: rgba(255, 255, 255, 0.64);
  color: #5d7394;
  line-height: 1.5;
}

.wealth-market__warning {
  margin: -0.35rem 0 0;
  color: #b42318;
  font-size: 0.92rem;
  font-weight: 600;
}

.wealth-market__summary-card {
  padding: 0.95rem 1.1rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(255, 255, 255, 0.72);
}

.wealth-market__selected-area {
  margin: 0 0 0.8rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #173050;
  text-align: center;
}

.wealth-property-sections {
  display: grid;
  gap: 1rem;
}

.wealth-property-section {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
  border-radius: 20px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.72);
}

.wealth-property-section--plain {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.wealth-property-section__head {
  display: grid;
  gap: 0.2rem;
}

.wealth-property-section__head h4 {
  margin: 0;
  font-size: 1rem;
  color: #173050;
}

.wealth-property-section__head p {
  margin: 0;
  color: #5d7394;
  line-height: 1.45;
}

.wealth-property-paths {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-property-path-card {
  display: grid;
  gap: 0.75rem;
  padding: 0.95rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(255, 255, 255, 0.76);
}

.wealth-property-path-card h5 {
  margin: 0;
  font-size: 0.95rem;
  color: #173050;
}

.wealth-workbook__summary-grid--flat {
  gap: 0.9rem 1.1rem;
}

.wealth-workbook__summary-grid--flat div {
  padding: 0;
  border: 0;
  background: transparent;
}

.wealth-workbook__bootstrap-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

@media (max-width: 900px) {
  .wealth-market__controls-row,
  .wealth-market__controls,
  .wealth-market__power-grid,
  .wealth-property-paths,
  .wealth-routing__options {
    grid-template-columns: minmax(0, 1fr);
  }
}

.wealth-workbook__bootstrap-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-workbook__bootstrap-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.wealth-workbook__bootstrap-card p,
.wealth-workbook__bootstrap-card span {
  margin: 0;
  color: #5d7394;
  line-height: 1.5;
}

.wealth-workbook__note {
  margin: -0.1rem 0 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(214, 233, 255, 0.58);
  border: 1px solid rgba(82, 136, 201, 0.18);
  color: #315273;
  line-height: 1.55;
}

.wealth-workbook__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.wealth-workbook__allocation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-workbook__allocation {
  display: grid;
  gap: 0.45rem;
  color: #5b7192;
  font-size: 0.84rem;
  padding: 0.85rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(255, 255, 255, 0.68);
}

.wealth-workbook__allocation.is-locked {
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.wealth-workbook__allocation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.wealth-workbook__allocation-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.wealth-workbook__allocation-swatch {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-workbook__lock-btn {
  border: 1px solid rgba(154, 174, 204, 0.24);
  border-radius: 999px;
  padding: 0.38rem 0.72rem;
  background: rgba(244, 248, 255, 0.96);
  color: #355474;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}

.wealth-workbook__lock-btn.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(219, 234, 254, 0.92);
  color: #1d4ed8;
}

.wealth-workbook__allocation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px;
  gap: 0.7rem;
  align-items: center;
}

.wealth-workbook__grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-workbook__grid--quad {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-workbook__grid label,
.wealth-workbook__toggle {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-workbook__grid input,
.wealth-workbook__grid select,
.wealth-workbook__allocation-controls input {
  width: 100%;
  min-height: 3.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-workbook__allocation-controls input[type='range'] {
  min-height: 0;
  padding-inline: 0;
}

.wealth-workbook__allocation-controls input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.wealth-workbook__toggle {
  grid-template-columns: 20px 1fr;
  align-items: center;
  min-height: 3.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
}

.wealth-workbook__toggle input {
  width: 18px;
  height: 18px;
  min-height: 0;
  padding: 0;
}

.wealth-workbook__toggle--inline {
  grid-column: 1 / -1;
}

.wealth-workbook__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-workbook__summary-grid--market {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-workbook__summary-grid div {
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-workbook__summary-grid span {
  display: block;
  margin-bottom: 0.28rem;
  color: #6481a6;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-sheet-slide-enter-active,
.wealth-sheet-slide-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.wealth-sheet-slide-enter-from,
.wealth-sheet-slide-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

@media (max-width: 1100px) {
  .wealth-market__charts,
  .wealth-workbook__bootstrap-grid,
  .wealth-property-paths,
  .wealth-workbook__grid--quad,
  .wealth-workbook__grid--triple {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .wealth-market__charts,
  .wealth-workbook__bootstrap-grid,
  .wealth-workbook__allocation-grid,
  .wealth-property-paths,
  .wealth-workbook__grid,
  .wealth-workbook__summary-grid,
  .wealth-workbook__summary-grid--market,
  .wealth-workbook__grid--quad,
  .wealth-workbook__grid--triple {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-workbook__allocation-controls {
    grid-template-columns: 1fr;
  }
}
</style>
