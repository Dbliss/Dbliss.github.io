import { nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import WealthIntroStep from '../WealthIntroStep.vue'
import { cloneSimulationRequest } from '../../../data/wealthDefaults.js'

describe('WealthIntroStep', () => {
  function mountIntro(form) {
    return mount(WealthIntroStep, {
      props: { form },
      global: {
        stubs: {
          WealthIncomeGrowthEditor: true,
          SuburbSearchSelector: true,
          Teleport: true
        }
      }
    })
  }

  it('shows family and second-person fields immediately after switching to 2 people', async () => {
    const form = reactive(cloneSimulationRequest())
    const wrapper = mountIntro(form)

    expect(wrapper.text()).not.toContain('Children and family costs')
    expect(wrapper.text()).not.toContain('Person 2')

    const householdSelect = wrapper.find('select')
    await householdSelect.setValue('2')
    await nextTick()

    expect(form.profile.earners).toHaveLength(2)
    expect(wrapper.text()).toContain('Children and family costs')
    expect(wrapper.text()).toContain('Person 2')
  })
})
