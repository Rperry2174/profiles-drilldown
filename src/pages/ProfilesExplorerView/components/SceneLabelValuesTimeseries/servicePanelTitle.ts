// At 1440px the all-services grid (minmax 400px) leaves the panel title ~177px
// beside Profile types / Labels / Flame graph / Favorite. A 14px Inter title
// is ~7.2px per character, so namespaced names (~250px) ellipsize from the
// end and every panel reads "ridesharing-production/…".
const TITLE_CHAR_PX = 7.2;
const NARROW_TITLE_SLOT_PX = 177;
// Header width minus the title's horizontal padding, once the title sits on its own row.
const STACKED_TITLE_SLOT_PX = 446;
const TITLE_PADDING_PX = 16;

function estimatedTitleWidthPx(label: string): number {
  return label.length * TITLE_CHAR_PX;
}

export function servicePanelTitleLayout(label: string): 'inline' | 'stacked' {
  return estimatedTitleWidthPx(label) > NARROW_TITLE_SLOT_PX ? 'stacked' : 'inline';
}

export function titleOverflowsInlineSlot(textWidth: number, headerWidth: number, actionsWidth: number): boolean {
  return textWidth > headerWidth - actionsWidth - TITLE_PADDING_PX + 1;
}

// What the header shows. Stacked titles get the full header row, so the demo
// names fit whole. The narrow slot end-ellipsizes them to one shared prefix.
export function visibleServicePanelTitle(label: string): string {
  const slot = servicePanelTitleLayout(label) === 'stacked' ? STACKED_TITLE_SLOT_PX : NARROW_TITLE_SLOT_PX;
  if (estimatedTitleWidthPx(label) <= slot) {
    return label;
  }

  const maxChars = Math.max(1, Math.floor(slot / TITLE_CHAR_PX) - 1);
  return `${label.slice(0, maxChars)}…`;
}
