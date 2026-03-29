import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import WealthInputWorkbook from '../WealthInputWorkbook.vue'
import { cloneSimulationRequest } from '../../../data/wealthDefaults.js'

describe('WealthInputWorkbook', () => {
  it('hides housing-specific sheets when housing scenarios are not selected', () => {
    const form = reactive(cloneSimulationRequest())
    form.scenarioSelection.includeHousing = false
    form.scenarioSelection.selectedScenarioKeys = ['stockQqq', 'stockAsx200', 'stockBonds', 'stockCash']

    const wrapper = mount(WealthInputWorkbook, {
      props: {
        form,
        activeSheet: 'stock',
        scenarioSelection: form.scenarioSelection,
        suburbSearchContext: { suburbOptions: [] },
        selectedSuburbPreview: { house: null, apartment: null, vacancyRate: null }
      }
    })

    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).not.toContain('Common cashflow')
    expect(wrapper.text()).not.toContain('Housing setup')
    expect(wrapper.text()).not.toContain('Suburb defaults')
    expect(wrapper.text()).not.toContain('Apartment assumptions')
    expect(wrapper.text()).not.toContain('House assumptions')
  })
})
