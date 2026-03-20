import { flushPromises, mount } from '@vue/test-utils'
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
        title: 'Australian Wealth Pathways Calculator',
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
})
