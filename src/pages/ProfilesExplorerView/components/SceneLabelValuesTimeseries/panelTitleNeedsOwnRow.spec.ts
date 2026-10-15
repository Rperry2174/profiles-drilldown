import { availableTitleBox, panelTitleNeedsOwnRow } from './panelTitleNeedsOwnRow';

// Measured at 1440px in All services: the title box beside Profile types / Labels /
// Flame graph is 177px, and every namespaced demo service is wider than that, so
// Grafana's end ellipsis leaves `ridesharing-production/…` for all four.
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

  it('uses the box beside the actions, so a wide rows panel keeps the title on the shared row', () => {
    // Grid at 1440px: header 462, actions 245 + menu 24, title padding 16 → 177px box.
    const gridBox = availableTitleBox(462, 245 + 24, 16);
    expect(gridBox).toBe(TITLE_BOX_PX);
    expect(panelTitleNeedsOwnRow(254, gridBox)).toBe(true);

    // Rows is one column. The same actions leave enough room for the full name.
    const rowsBox = availableTitleBox(1400, 245 + 24, 16);
    expect(panelTitleNeedsOwnRow(254, rowsBox)).toBe(false);
  });
});
