/**
 * Grafana end-ellipsizes a panel title that shares its header row with the actions.
 * Namespaced service names share a long prefix, so that cut hides the only part that
 * differs. A title that does not fit needs the row to itself; one that already fits
 * must stay on the shared row.
 */
export function panelTitleNeedsOwnRow(scrollWidth: number, clientWidth: number): boolean {
  if (clientWidth <= 0) {
    return false;
  }

  // 1px slack avoids flipping the layout on subpixel rounding.
  return scrollWidth > clientWidth + 1;
}
