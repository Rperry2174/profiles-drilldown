import { SceneObject } from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FavAction } from '../../../domain/actions/FavAction';
import { SelectAction } from '../../../domain/actions/SelectAction';
import { PanelType } from '../../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from '../SceneLabelValuesTimeseries';

jest.mock('../../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
  addExemplarTransformations: () => [],
  getHighlightedSeriesOverrides: () => ({}),
  HIGHLIGHTED_SERIES_REF_ID: 'highlighted-series',
}));

const buildItem = (label: string): GridItemData => ({
  index: 0,
  value: label,
  label,
  queryRunnerParams: { serviceName: label, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
  panelType: PanelType.TIMESERIES,
});

// same header actions as the All services view
const allServicesHeaderActions = (item: GridItemData) => [
  new SelectAction({ type: 'view-profiles', item }),
  new SelectAction({ type: 'view-labels', item }),
  new SelectAction({ type: 'view-flame-graph', item }),
  new FavAction({ item }),
];

function renderSelectActions(label: string) {
  const timeseries = new SceneLabelValuesTimeseries({
    item: buildItem(label),
    headerActions: allServicesHeaderActions,
  });

  const selectActions = (timeseries.state.body.state.headerActions as SceneObject[]).filter(
    (action): action is SelectAction => action instanceof SelectAction
  );

  render(
    <>
      {selectActions.map((action) => (
        <action.Component key={action.state.key} model={action} />
      ))}
    </>
  );
}

describe('SceneLabelValuesTimeseries', () => {
  describe('header actions', () => {
    it.each(['Profile types', 'Labels', 'Flame graph'])(
      'renders the "%s" action as an icon-only button when the panel title is long',
      (actionName) => {
        renderSelectActions('ridesharing-production/checkout-api');

        const button = screen.getByRole('button', { name: actionName });
        expect(button).not.toHaveTextContent(actionName);
      }
    );

    it.each(['Profile types', 'Labels', 'Flame graph'])(
      'renders the "%s" action with its text label when the panel title is short',
      (actionName) => {
        renderSelectActions('ride-sharing-app');

        const button = screen.getByRole('button', { name: actionName });
        expect(button).toHaveTextContent(actionName);
      }
    );
  });
});
