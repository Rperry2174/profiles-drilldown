/**
 * Grafana end-ellipsizes a panel title that shares its header row with the actions.
 * Namespaced service names share a long prefix, so that cut hides the only part that
 * differs (`checkout-api` vs `payments-api`). A title that does not fit needs the row
 * to itself; one that already fits must stay where it is.
 *
 * `availableWidth` is the title box beside the actions, not the h2's width after it
 * has already been given its own row (that width grows to the text and would look like it fits).
 */
export function panelTitleNeedsOwnRow(textWidth: number, availableWidth: number): boolean {
  if (availableWidth <= 0) {
    return false;
  }

  // 1px slack avoids flipping the layout on subpixel rounding.
  return textWidth > availableWidth + 1;
}

/** Width left for the h2 once the action cluster and the title's horizontal padding are subtracted. */
export function availableTitleBox(headerWidth: number, reservedWidth: number, titlePadding: number): number {
  return headerWidth - reservedWidth - titlePadding;
}
