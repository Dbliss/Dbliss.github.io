import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { cloneSimulationRequest } from '../../data/wealthDefaults.js'
import { simulateWealthPathways } from '../../wealth/simulator.js'

const mockRun = vi.fn()

vi.mock('../../wealth/client.js', () => ({
  WealthSimulationClient: class WealthSimulationClient {
    run(payload) {
      return mockRun(payload)
    }

    destroy() {}
  }
}))

import WealthPathwaysDetail from '../WealthPathwaysDetail.vue'

const request = cloneSimulationRequest()
request.simulationSettings.iterations = 120
const mockResult = simulateWealthPathways(request)

function parseCurrency(text) {
  return Number(text.replace(/[^\d]/g, ''))
}

function mountPage() {
  mockRun.mockImplementation(async payload => ({
    ...mockResult,
    request: payload
  }))

  return mount(WealthPathwaysDetail, {
    props: {
      project: {
        title: 'NSW Wealth Pathways Calculator',
        tagline: 'Interactive comparison tool',
        category: 'Personal project',
        tags: ['Finance Modelling']
      }
    },
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' }
      }
    }
  })
}

function getAffordabilityCard(wrapper, label) {
  return wrapper.findAll('article.wealth-property-panel')
    .find(node => node.text().includes(label) && node.text().includes('Investment + rent today'))
}

function getFormState(wrapper) {
  return wrapper.vm.form ?? wrapper.vm.$.setupState.form
}

function isOwnerAffordable(card) {
  return /Live and own today\s*Yes/.test(card.text())
}

function isRentvestAffordable(card) {
  return /Investment \+ rent today\s*Yes/.test(card.text())
}

describe('WealthPathwaysDetail', () => {
  beforeEach(() => {
    mockRun.mockClear()
  })

  it('starts in the input stage and does not auto-run the simulation', () => {
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('Profile')
    expect(wrapper.text()).toContain('Housing plan')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('runs the simulation and moves to the results stage when continuing', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="horizon-years"]').setValue(25)
    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()

    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(mockRun.mock.calls[0][0].profile.horizonYears).toBe(25)
    expect(wrapper.text()).toContain('Median winner')
    expect(wrapper.text()).toContain('Net worth projection bands')
  })

  it('marks results stale after editing inputs and allows returning to inputs', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="edit-inputs"]').trigger('click')
    await wrapper.get('[data-testid="bond-allocation"]').setValue(35)

    expect(wrapper.text()).toContain('Results out of date')
  })

  it('greys out a scenario after clicking its chart legend chip and restores it on a second click', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()

    const rentChip = wrapper.findAll('button').find(node => node.text().includes('Rent + Invest'))
    expect(rentChip).toBeTruthy()

    await rentChip.trigger('click')
    expect(wrapper.text()).toContain('Greyed out: Rent + Invest')

    await rentChip.trigger('click')
    expect(wrapper.text()).not.toContain('Greyed out: Rent + Invest')
  })

  it('hides the Monte Carlo run control and shows the new housing plan section', () => {
    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain('Monte Carlo runs')
    expect(wrapper.text()).toContain('Housing plan')
    expect(wrapper.text()).toContain('Invest while saving for deposit')
    expect(wrapper.text()).toContain('House and apartment assumptions')
    expect(wrapper.text()).toContain('House and apartment entry requirements today')
    expect(wrapper.text()).toContain('Target price')
    expect(wrapper.text()).toContain('Max affordable today')
    expect(wrapper.text()).toContain('Owner deposit %')
    expect(wrapper.text()).toContain('US Stock - QQQ')
    expect(wrapper.text()).toContain('AU Stocks - ASX200')
    expect(wrapper.text()).toContain('High Interest Cash Account')
    expect(wrapper.text()).toContain('US return %')
    expect(wrapper.text()).toContain('Cash return %')
    expect(wrapper.text()).toContain('Council rates')
    expect(wrapper.text()).toContain('Water rates')
    expect(wrapper.text()).toContain('Borrowing expenses')
    expect(wrapper.text()).toContain('Other deductible')
    expect(wrapper.text()).not.toContain('Capital works deduction')
    expect(wrapper.text()).not.toContain('Depreciation deduction')
    expect(wrapper.text()).toContain('Currently living at home')
    expect(wrapper.text()).not.toContain('ASX vol %')
    expect(wrapper.text()).not.toContain('QQQ vol %')
    expect(wrapper.text()).not.toContain('Bond vol %')
    expect(wrapper.text()).not.toContain('Growth vol %')
  })

  it('keeps manual target prices editable and sends those values to the simulator', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="house-target-price"]').setValue(1350000)
    await wrapper.get('[data-testid="apartment-target-price"]').setValue(820000)
    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()

    expect(mockRun.mock.calls[0][0].propertyConfig.house.purchasePrice).toBe(1350000)
    expect(mockRun.mock.calls[0][0].propertyConfig.apartment.purchasePrice).toBe(820000)
  })

  it('updates max affordable values when income changes', async () => {
    const wrapper = mountPage()

    const initialHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())
    const initialApartment = parseCurrency(wrapper.get('[data-testid="apartment-max-purchase-price"]').text())

    await wrapper.get('[data-testid="annual-income"]').setValue(150000)

    const nextHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())
    const nextApartment = parseCurrency(wrapper.get('[data-testid="apartment-max-purchase-price"]').text())

    expect(nextHouse).toBeGreaterThan(initialHouse)
    expect(nextApartment).toBeGreaterThan(initialApartment)
  })

  it('updates the max affordable value when owner deposit changes', async () => {
    const wrapper = mountPage()

    const initialHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())
    const ownerDeposit = wrapper.get('[data-testid="house-owner-deposit"]')

    expect(Number(ownerDeposit.element.value)).toBe(5)

    await ownerDeposit.setValue(20)

    const nextHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())
    expect(nextHouse).toBeGreaterThan(initialHouse)
  })

  it('does not anchor the max affordable value to the current target price costs', async () => {
    const wrapper = mountPage()

    const initialHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())

    await wrapper.get('[data-testid="house-target-price"]').setValue(1400000)

    const nextHouse = parseCurrency(wrapper.get('[data-testid="house-max-purchase-price"]').text())
    expect(Math.abs(nextHouse - initialHouse)).toBeLessThanOrEqual(1000)
  })

  it('shows a wait message when the target price is above today’s max affordable value', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="house-target-price"]').setValue(3000000)

    expect(wrapper.text()).toContain('The model will wait until both income and cash support the purchase')
  })

  it('only shows live-at-home inputs when the live-at-home checkbox is enabled', async () => {
    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain('Years living at home')
    expect(wrapper.text()).not.toContain('Weekly rent + expenses at home')
    expect(wrapper.text()).not.toContain('Rent + expenses growth %')
    expect(wrapper.text()).toContain('Rent yield %')
    expect(wrapper.text()).toContain('Owner paths waive stamp duty below $800k')
    expect(wrapper.text()).not.toContain('Property and tax rules')
    expect(wrapper.text()).not.toContain('Vacancy %')
    expect(wrapper.text()).toContain('Management fee %')

    await wrapper.get('[data-testid="live-at-home-toggle"]').setValue(true)

    expect(wrapper.text()).toContain('Years living at home')
    expect(wrapper.text()).toContain('Weekly rent + expenses at home')
    expect(wrapper.text()).toContain('Rent + expenses growth %')
  })

  it('sends cash-saving mode when invest-while-saving is toggled off', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="invest-while-saving-toggle"]').trigger('click')
    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()

    expect(mockRun.mock.calls[0][0].propertyConfig.investWhileSavingForDeposit).toBe(false)
  })

  it('keeps the standard rentvest affordability card aligned with simulator year-0 buyability', async () => {
    const wrapper = mountPage()
    const form = getFormState(wrapper)

    Object.assign(form.profile, {
      startingSavings: 420000,
      annualIncome: 155000
    })
    Object.assign(form.housingCosts, {
      liveAtHome: false,
      weeklyRent: 720
    })
    Object.assign(form.propertyConfig.house, {
      purchasePrice: 650000,
      ownerDepositPct: 0.2,
      depositPct: 0.2
    })
    await nextTick()

    const card = getAffordabilityCard(wrapper, 'House')
    const request = cloneSimulationRequest()
    Object.assign(request.profile, {
      startingSavings: 420000,
      annualIncome: 155000
    })
    Object.assign(request.housingCosts, {
      liveAtHome: false,
      weeklyRent: 720
    })
    Object.assign(request.propertyConfig.house, {
      purchasePrice: 650000,
      ownerDepositPct: 0.2,
      depositPct: 0.2
    })
    const result = simulateWealthPathways(request)
    const purchasePoint = result.strategies.buyHouseInvestmentProperty.points.find(point => point.homeEquityP50 > 0)

    expect(Boolean(card)).toBe(true)
    expect(isRentvestAffordable(card)).toBe(Boolean(purchasePoint && purchasePoint.year === 0))
  })

  it('uses live-at-home board costs in the rentvest affordability card and stays aligned with simulator year-0 buyability', async () => {
    const wrapper = mountPage()
    const form = getFormState(wrapper)

    Object.assign(form.profile, {
      startingSavings: 320000,
      annualIncome: 128000
    })
    Object.assign(form.housingCosts, {
      liveAtHome: true,
      liveAtHomeYears: 2,
      weeklyRent: 2200,
      weeklyBoardAtHome: 150
    })
    Object.assign(form.propertyConfig.house, {
      purchasePrice: 700000,
      ownerDepositPct: 0.2,
      depositPct: 0.2
    })
    await nextTick()

    const card = getAffordabilityCard(wrapper, 'House')
    const request = cloneSimulationRequest()
    Object.assign(request.profile, {
      startingSavings: 320000,
      annualIncome: 128000
    })
    Object.assign(request.housingCosts, {
      liveAtHome: true,
      liveAtHomeYears: 2,
      weeklyRent: 2200,
      weeklyBoardAtHome: 150
    })
    Object.assign(request.propertyConfig.house, {
      purchasePrice: 700000,
      ownerDepositPct: 0.2,
      depositPct: 0.2
    })
    const result = simulateWealthPathways(request)
    const purchasePoint = result.strategies.buyHouseInvestmentProperty.points.find(point => point.homeEquityP50 > 0)

    expect(Boolean(card)).toBe(true)
    expect(isRentvestAffordable(card)).toBe(Boolean(purchasePoint && purchasePoint.year === 0))
  })

  it('keeps the owner affordability card aligned with simulator year-0 buyability near the serviceability threshold', async () => {
    const wrapper = mountPage()
    const form = getFormState(wrapper)

    Object.assign(form.profile, {
      startingSavings: 500000,
      annualIncome: 100000
    })
    Object.assign(form.propertyConfig.house, {
      purchasePrice: 930000,
      ownerDepositPct: 0.05
    })
    await nextTick()

    const card = getAffordabilityCard(wrapper, 'House')
    const request = cloneSimulationRequest()
    Object.assign(request.profile, {
      startingSavings: 500000,
      annualIncome: 100000
    })
    Object.assign(request.propertyConfig.house, {
      purchasePrice: 930000,
      ownerDepositPct: 0.05
    })
    const result = simulateWealthPathways(request)
    const purchasePoint = result.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)

    expect(Boolean(card)).toBe(true)
    expect(isOwnerAffordable(card)).toBe(Boolean(purchasePoint && purchasePoint.year === 0))
  })
})
