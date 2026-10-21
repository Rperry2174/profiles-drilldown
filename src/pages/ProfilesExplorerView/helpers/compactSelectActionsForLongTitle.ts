import { SceneObject } from '@grafana/scenes';

import { SelectAction } from '../domain/actions/SelectAction';

// Longer titles (e.g. namespaced service names) get ellipsized by the labelled select buttons in a 3-column grid
// at common widths, hiding the part of the name that tells panels apart.
const MAX_TITLE_LENGTH_WITH_LABELLED_ACTIONS = 24;

/**
 * Switches the `SelectAction` buttons of a panel header to icon-only when its title is long.
 *
 * Only views whose panels are space-constrained should call this: full-width panels (e.g. the main timeseries of
 * the Labels view) also have long titles, but they have room for both the title and the labelled buttons.
 */
export function compactSelectActionsForLongTitle(headerActions: SceneObject[], title: string): SceneObject[] {
  if (title.length > MAX_TITLE_LENGTH_WITH_LABELLED_ACTIONS) {
    headerActions
      .filter((action): action is SelectAction => action instanceof SelectAction)
      .forEach((action) => action.setState({ compact: true }));
  }

  return headerActions;
}
