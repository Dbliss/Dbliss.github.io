import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import WealthInputWorkbook from '../WealthInputWorkbook.vue'
import { cloneSimulationRequest } from '../../../data/wealthDefaults.js'

describe('WealthInputWorkbook', () => {
  it('hides housing-specific sheets when housing scenarios are not selected', () => {
    const form = reactive(cloneSimulationRequest())
    form.scenarioSelection.includeHousing = false
    form.scenarioSelection.selectedScenarioKeys = ['stockPortfolio', 'stockQqq', 'stockAsx200', 'stockBonds', 'stockCash']

    const wrapper = mount(WealthInputWorkbook, {
      props: {
        form,
        activeSheet: 'stock',
        scenarioSelection: form.scenarioSelection,
        regionScoutConfig: {},
        suburbSearchContext: { suburbOptions: [] }
      }
    })

    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).not.toContain('Apartment assumptions')
    expect(wrapper.text()).not.toContain('House assumptions')
  })

  it('renders the apartment property sheet without the stock sheet when housing is selected', () => {
    const form = reactive(cloneSimulationRequest())
    form.scenarioSelection.includeStocks = false
    form.scenarioSelection.selectedScenarioKeys = ['buyApartmentHome', 'buyHouseHome']

    const wrapper = mount(WealthInputWorkbook, {
      props: {
        form,
        activeSheet: 'apartment',
        scenarioSelection: form.scenarioSelection,
        regionScoutConfig: {},
        suburbSearchContext: { suburbOptions: [] }
      }
    })

    expect(wrapper.text()).not.toContain('Stock assumptions')
    expect(wrapper.text()).toContain('Apartment assumptions')
    expect(wrapper.text()).not.toContain('Rent yield %')
  })
})
