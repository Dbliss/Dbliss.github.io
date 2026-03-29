import { mount } from '@vue/test-utils'
import WealthPathwaysWorkbookDetail from '../WealthPathwaysWorkbookDetail.vue'

function createWrapper() {
  return mount(WealthPathwaysWorkbookDetail, {
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
}

async function clickButtonByText(wrapper, text) {
  const button = wrapper.findAll('button').find(candidate => candidate.text().includes(text))
  expect(button).toBeTruthy()
  await button.trigger('click')
}

describe('WealthPathwaysWorkbookDetail', () => {
  it('moves through the guided stages and shows the comparison-mode selector', async () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Current situation')
    expect(wrapper.text()).toContain('Income trajectory')

    await clickButtonByText(wrapper, 'Next: Interests')

    expect(wrapper.text()).toContain('Choose the comparison path first')
    expect(wrapper.text()).toContain('Deep dive in portfolio options')
    expect(wrapper.text()).toContain('Property vs stocks')
    expect(wrapper.text()).toContain('Property as an investment vs living')

    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).toContain('Move through the workbook sheets')
    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).toContain('Housing setup')
  })

  it('uses property vs stocks as the default selection', async () => {
    const wrapper = createWrapper()

    await clickButtonByText(wrapper, 'Next: Interests')

    expect(wrapper.get('[data-testid="interest-mode-propertyVsStocks"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="interest-mode-portfolioDeepDive"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[data-testid="interest-mode-propertyInvestmentVsLiving"]').attributes('aria-pressed')).toBe('false')
  })

  it('shows only stock inputs for the portfolio deep-dive mode', async () => {
    const wrapper = createWrapper()

    await clickButtonByText(wrapper, 'Next: Interests')
    await wrapper.get('[data-testid="interest-mode-portfolioDeepDive"]').trigger('click')
    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).not.toContain('Housing setup')
    expect(wrapper.text()).not.toContain('Suburb defaults')
    expect(wrapper.text()).not.toContain('Apartment assumptions')
    expect(wrapper.text()).not.toContain('House assumptions')
  })

  it('shows only housing inputs for the property investment vs living mode', async () => {
    const wrapper = createWrapper()

    await clickButtonByText(wrapper, 'Next: Interests')
    await wrapper.get('[data-testid="interest-mode-propertyInvestmentVsLiving"]').trigger('click')
    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).not.toContain('Stock assumptions')
    expect(wrapper.text()).toContain('Housing setup')
    expect(wrapper.text()).toContain('Suburb defaults')
    expect(wrapper.text()).toContain('Apartment assumptions')
    expect(wrapper.text()).toContain('House assumptions')
  })
})
