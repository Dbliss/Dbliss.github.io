import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import WealthIntroStep from '../WealthIntroStep.vue'
import { cloneSimulationRequest } from '../../../data/wealthDefaults.js'

describe('WealthIntroStep', () => {
  it('renders the HECS/HELP debt input and explanatory copy', () => {
    const form = reactive(cloneSimulationRequest())

    const wrapper = mount(WealthIntroStep, {
      props: { form },
      global: {
        stubs: {
          WealthIncomeGrowthEditor: true
        }
      }
    })

    expect(wrapper.text()).toContain('HECS/HELP debt')
    expect(wrapper.text()).toContain('federal ATO 2025-26 table')
    expect(wrapper.text()).toContain('fixed 3% each year before repayment')
  })
})
