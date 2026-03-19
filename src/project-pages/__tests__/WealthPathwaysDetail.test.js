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

    expect(wrapper.text()).toContain('Stage 1: Fill inputs')
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('runs the simulation and moves to the results stage when continuing', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="horizon-years"]').setValue(25)
    await wrapper.get('[data-testid="continue-results"]').trigger('click')
    await flushPromises()

    expect(mockRun).toHaveBeenCalledTimes(1)
    expect(mockRun.mock.calls[0][0].profile.horizonYears).toBe(25)
    expect(wrapper.text()).toContain('Stage 2: Explore results')
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
    expect(wrapper.text()).toContain('Property intention')
    expect(wrapper.text()).toContain('Live at home first')
    expect(wrapper.text()).not.toContain('ASX vol %')
    expect(wrapper.text()).not.toContain('QQQ vol %')
    expect(wrapper.text()).not.toContain('Bond vol %')
    expect(wrapper.text()).not.toContain('Growth vol %')
  })

  it('only shows live-at-home inputs when the live-at-home checkbox is enabled', async () => {
    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain('Years living at home')
    expect(wrapper.text()).not.toContain('Weekly board at home')
    expect(wrapper.text()).not.toContain('Board growth %')
    expect(wrapper.text()).toContain('Rent yield %')
    expect(wrapper.text()).toContain('Vacancy %')
    expect(wrapper.text()).toContain('Management fee %')

    await wrapper.get('[data-testid="live-at-home-toggle"]').setValue(true)

    expect(wrapper.text()).toContain('Years living at home')
    expect(wrapper.text()).toContain('Weekly board at home')
    expect(wrapper.text()).toContain('Board growth %')
  })
})
