import { panelTitleNeedsOwnRow } from './panelTitleNeedsOwnRow';

// Measured at 1440px in All services. The title box beside Profile types, Labels,
// and Flame graph is 177px, and every namespaced demo service is wider than that,
// so Grafana's end ellipsis leaves `ridesharing-production/…` for all four.
const TITLE_BOX_PX = 177;
const DEMO_SERVICES: Array<[string, number]> = [
  ['ridesharing-production/checkout-api', 254],
  ['ridesharing-production/dispatch-api', 250],
  ['ridesharing-production/payments-api', 258],
  ['ridesharing-production/pricing-api', 239],
];

describe('panelTitleNeedsOwnRow', () => {
  it.each(DEMO_SERVICES)('gives %s its own row so the service suffix stays visible', (_label, textWidth) => {
    expect(panelTitleNeedsOwnRow(textWidth, TITLE_BOX_PX)).toBe(true);
  });

  it('leaves a short service name on the shared header row', () => {
    expect(panelTitleNeedsOwnRow(110, TITLE_BOX_PX)).toBe(false);
    expect(panelTitleNeedsOwnRow(TITLE_BOX_PX, TITLE_BOX_PX)).toBe(false);
  });

  it('ignores a title that has not been laid out yet', () => {
    expect(panelTitleNeedsOwnRow(254, 0)).toBe(false);
  });
});
