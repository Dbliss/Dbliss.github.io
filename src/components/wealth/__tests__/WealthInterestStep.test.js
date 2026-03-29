import { mount } from '@vue/test-utils'
import WealthInterestStep from '../WealthInterestStep.vue'
import { cloneSimulationRequest } from '../../../data/wealthDefaults.js'

describe('WealthInterestStep', () => {
  it('renders the high-level comparison modes without detailed scenario pickers', () => {
    const wrapper = mount(WealthInterestStep, {
      props: {
        scenarioSelection: cloneSimulationRequest().scenarioSelection
      }
    })

    expect(wrapper.text()).toContain('Deep dive in portfolio options')
    expect(wrapper.text()).toContain('Property vs stocks')
    expect(wrapper.text()).toContain('Property as an investment vs living')
    expect(wrapper.find('[data-testid="interest-mode-portfolioDeepDive"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="interest-mode-propertyVsStocks"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="interest-mode-propertyInvestmentVsLiving"]').exists()).toBe(true)
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="scenario-card-stockPortfolio"]').exists()).toBe(false)
  })
})
