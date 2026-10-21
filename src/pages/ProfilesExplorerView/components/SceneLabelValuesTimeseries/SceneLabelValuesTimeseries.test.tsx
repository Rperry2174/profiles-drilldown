import { SceneDataTransformer, SceneObject } from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from './SceneLabelValuesTimeseries';

jest.mock('react-inlinesvg', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('svg', {}) };
});

jest.mock('@shared/domain/reportInteraction', () => ({
  reportInteraction: jest.fn(),
}));

jest.mock('../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
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

const buildPanel = (label: string) =>
  new SceneLabelValuesTimeseries({
    item: buildItem(label),
    data: new SceneDataTransformer({ transformations: [] }),
    headerActions: (item) => [
      new SelectAction({ type: 'view-profiles', item }),
      new SelectAction({ type: 'view-labels', item }),
      new SelectAction({ type: 'view-flame-graph', item }),
      new FavAction({ item }),
    ],
  });

const getSelectActions = (panel: SceneLabelValuesTimeseries) =>
  (panel.state.body.state.headerActions as SceneObject[]).filter(
    (action): action is SelectAction => action instanceof SelectAction
  );

const renderActions = (panel: SceneLabelValuesTimeseries) =>
  render(
    <>
      {getSelectActions(panel).map((action) => (
        <action.Component key={action.state.type} model={action} />
      ))}
    </>
  );

describe('SceneLabelValuesTimeseries header actions', () => {
  it('keeps the labelled select buttons for short titles', () => {
    const panel = buildPanel('ride-sharing-app');

    expect(panel.state.body.state.title).toBe('ride-sharing-app');
    expect(getSelectActions(panel).map((a) => a.state.compact)).toEqual([undefined, undefined, undefined]);

    renderActions(panel);
    ['Profile types', 'Labels', 'Flame graph'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveTextContent(name);
    });
  });

  it('renders icon-only select buttons for long namespaced service names so the title has room', () => {
    const label = 'ridesharing-production/checkout-api';
    const panel = buildPanel(label);

    expect(panel.state.body.state.title).toBe(label);
    expect(getSelectActions(panel).map((a) => a.state.compact)).toEqual([true, true, true]);

    renderActions(panel);
    ['Profile types', 'Labels', 'Flame graph'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveTextContent('');
    });
  });

  it('re-evaluates compact buttons when the item label changes', () => {
    const panel = buildPanel('ride-sharing-app');

    panel.updateItem({ label: 'ridesharing-production/payments-api' });
    expect(getSelectActions(panel).every((a) => a.state.compact)).toBe(true);

    panel.updateItem({ label: 'ride-sharing-app' });
    expect(getSelectActions(panel).every((a) => !a.state.compact)).toBe(true);
  });
});
