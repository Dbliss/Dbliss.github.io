import { flushPromises, mount } from '@vue/test-utils'
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

function readMatchCount(wrapper) {
  const summary = wrapper.get('.wealth-scout__results-filters-head span').text()
  return Number(summary.replace(/[^\d]/g, ''))
}

async function clickButtonByText(wrapper, text) {
  const button = wrapper.findAll('button').find(candidate => candidate.text().includes(text))
  expect(button).toBeTruthy()
  await button.trigger('click')
}

describe('WealthPathwaysWorkbookDetail', () => {
  it('opens on the interests stage before asking for household details', async () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Choose the comparison path first')
    expect(wrapper.text()).toContain('Deep dive in portfolio options')
    expect(wrapper.text()).toContain('Property vs stocks')
    expect(wrapper.text()).toContain('Property as investment vs living')
    expect(wrapper.text()).toContain('Best suburbs to target')
    expect(wrapper.text()).not.toContain('Current household setup')
  })

  it('moves from interests into the situation stage and on to the inputs stage', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-propertyVsStocks"]').trigger('click')

    expect(wrapper.text()).toContain('Current household setup')
    expect(wrapper.text()).toContain('Housing setup')
    expect(wrapper.text()).toContain('Household income trajectory')

    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).toContain('Stock assumptions')
  })

  it('marks the chosen comparison mode as selected when returning to interests', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-propertyVsStocks"]').trigger('click')
    await clickButtonByText(wrapper, 'Back: Interests')

    expect(wrapper.get('[data-testid="interest-mode-propertyVsStocks"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="interest-mode-portfolioDeepDive"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[data-testid="interest-mode-propertyInvestmentVsLiving"]').attributes('aria-pressed')).toBe('false')
  })

  it('shows only stock inputs for the portfolio deep-dive mode', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-portfolioDeepDive"]').trigger('click')
    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).toContain('Stock assumptions')
    expect(wrapper.text()).not.toContain('Apartment assumptions')
    expect(wrapper.text()).not.toContain('House assumptions')
  })

  it('sends the region scout straight to a budget search, skipping household details', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-regionScout"]').trigger('click')

    expect(wrapper.text()).not.toContain('Current household setup')
    expect(wrapper.text()).not.toContain('Your Situation')
    expect(wrapper.text()).toContain('Set your search')
    expect(wrapper.text()).toContain('Target purchase price')
    expect(wrapper.text()).toContain('Where should we look?')
    expect(wrapper.text()).toContain('What matters most to you?')
    expect(wrapper.text()).toContain('Risk tolerance')
    expect(wrapper.text()).not.toContain('When do you want to buy?')
    expect(wrapper.text()).not.toContain('Are you comfortable investing while you save')
    expect(wrapper.get('[data-testid="scout-budget-input"]').element.value).toBe('800,000')
    await clickButtonByText(wrapper, 'Back: Interests')

    expect(wrapper.text()).toContain('Choose the comparison path first')
  })

  it('ranks real areas against the budget and can widen the search to any price', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-regionScout"]').trigger('click')
    await clickButtonByText(wrapper, 'Search areas')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 500))
    await flushPromises()

    const withinBudgetMatches = readMatchCount(wrapper)
    expect(withinBudgetMatches).toBeGreaterThan(0)
    expect(wrapper.findAll('.wealth-scout__result-card').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('Within my budget ($800,000)')
    expect(wrapper.text()).toContain('Expected annual growth')
    expect(wrapper.text()).toContain('Against your budget')
    expect(wrapper.text()).not.toContain('Purchasable in')
    expect(wrapper.text()).not.toContain('purchasing power')

    await clickButtonByText(wrapper, 'Any price')

    expect(readMatchCount(wrapper)).toBeGreaterThan(withinBudgetMatches)
  }, 30000)

  it('only ever returns suburb-level results, never regions', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-regionScout"]').trigger('click')
    await clickButtonByText(wrapper, 'Search areas')
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 500))
    await flushPromises()

    const resultCards = wrapper.findAll('.wealth-scout__result-card')
    expect(resultCards.length).toBeGreaterThan(0)
    resultCards.forEach((card) => {
      expect(card.get('.wealth-scout__result-head p').text()).toMatch(/^Suburb/)
    })
    expect(wrapper.text()).toContain('matching suburbs')
    expect(wrapper.text()).not.toContain('matching regions')
  }, 30000)

  it('shows only housing inputs for the property investment vs living mode', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="interest-mode-propertyInvestmentVsLiving"]').trigger('click')
    await clickButtonByText(wrapper, 'Next: Inputs')

    expect(wrapper.text()).not.toContain('Stock assumptions')
    expect(wrapper.text()).toContain('Apartment assumptions')
  })
})
