import { servicePanelTitleLayout, titleOverflowsInlineSlot, visibleServicePanelTitle } from './servicePanelTitle';

const NAMESPACED_SERVICES = [
  'ridesharing-production/checkout-api',
  'ridesharing-production/payments-api',
  'ridesharing-production/dispatch-api',
  'ridesharing-production/pricing-api',
];

// Measured on the 1440px all-services grid: header 462px, action cluster 269px,
// title text 239–258px. The leftover 177px slot cuts every name at the same prefix.
const HEADER_WIDTH_PX = 462;
const ACTIONS_WIDTH_PX = 269;
const MEASURED_TEXT_WIDTHS_PX = [254, 258, 250, 239];

describe('service panel titles', () => {
  it('keeps the four namespaced demo services distinct at 1440px', () => {
    for (const textWidth of MEASURED_TEXT_WIDTHS_PX) {
      expect(titleOverflowsInlineSlot(textWidth, HEADER_WIDTH_PX, ACTIONS_WIDTH_PX)).toBe(true);
    }

    expect(NAMESPACED_SERVICES.map(visibleServicePanelTitle)).toEqual(NAMESPACED_SERVICES);
    expect(new Set(NAMESPACED_SERVICES.map(servicePanelTitleLayout))).toEqual(new Set(['stacked']));
  });

  it('leaves short names on the inline row, unchanged', () => {
    expect(visibleServicePanelTitle('ride-sharing-app')).toBe('ride-sharing-app');
    expect(visibleServicePanelTitle('load-generator')).toBe('load-generator');
    expect(servicePanelTitleLayout('ride-sharing-app')).toBe('inline');
    expect(servicePanelTitleLayout('load-generator')).toBe('inline');
    expect(titleOverflowsInlineSlot(113, HEADER_WIDTH_PX, ACTIONS_WIDTH_PX)).toBe(false);
  });
});
