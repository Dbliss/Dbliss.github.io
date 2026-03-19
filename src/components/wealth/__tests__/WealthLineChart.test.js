import { mount } from '@vue/test-utils'
import WealthLineChart from '../WealthLineChart.vue'

const series = [
  {
    id: 'rentInvest',
    label: 'Rent + Invest',
    color: '#7dd3fc',
    accent: 'rgba(125, 211, 252, 0.18)',
    points: [
      { year: 0, low: 100000, mid: 110000, high: 120000 },
      { year: 1, low: 120000, mid: 130000, high: 140000 }
    ]
  },
  {
    id: 'buyHouse',
    label: 'Buy A House',
    color: '#34d399',
    accent: 'rgba(52, 211, 153, 0.18)',
    points: [
      { year: 0, low: 95000, mid: 100000, high: 105000 },
      { year: 1, low: 125000, mid: 132000, high: 145000 }
    ]
  }
]

describe('WealthLineChart', () => {
  it('emits a toggle event when clicking a legend item', async () => {
    const wrapper = mount(WealthLineChart, {
      props: {
        title: 'Net worth',
        series
      }
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('toggle-series')?.[0]).toEqual(['rentInvest'])
  })

  it('shows a tooltip on hover with values for the nearest year', async () => {
    const wrapper = mount(WealthLineChart, {
      props: {
        title: 'Net worth',
        series
      }
    })

    const body = wrapper.get('.wealth-chart__body')
    body.element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300
    })

    await wrapper.get('svg').trigger('pointermove', { clientX: 390, clientY: 120 })

    expect(wrapper.text()).toContain('Year 1')
    expect(wrapper.text()).toContain('Rent + Invest')
    expect(wrapper.text()).toContain('Buy A House')
  })
})
