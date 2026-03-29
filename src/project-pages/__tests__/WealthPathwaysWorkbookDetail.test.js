import { mount } from '@vue/test-utils'
import WealthPathwaysWorkbookDetail from '../WealthPathwaysWorkbookDetail.vue'

describe('WealthPathwaysWorkbookDetail', () => {
  it('moves through the guided stages before results', async () => {
    const wrapper = mount(WealthPathwaysWorkbookDetail, {
      props: {
        project: {
          title: 'Australian Wealth Pathways Calculator',
          tagline: 'Interactive comparison tool for rent, investing, houses, and apartments'
        }
      },
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Start with your situation')
    expect(wrapper.text()).toContain('Weekly rent once moved out')

    await wrapper.get('button.wealth-primary-btn').trigger('click')
    expect(wrapper.text()).toContain('Choose what you want to compare')

    await wrapper.get('button.wealth-primary-btn').trigger('click')
    expect(wrapper.text()).toContain('Move through the workbook sheets')
    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).not.toContain('Common cashflow')
    expect(wrapper.text()).not.toContain('Housing costs')
  })
})
