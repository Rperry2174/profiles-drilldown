import { SceneDataTransformer, SceneObject } from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from './SceneLabelValuesTimeseries';

jest.mock('@shared/domain/reportInteraction', () => ({
  reportInteraction: jest.fn(),
}));

jest.mock('../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
  addExemplarTransformations: () => [],
  HIGHLIGHTED_SERIES_REF_ID: 'highlighted-series',
  getHighlightedSeriesOverrides: () => ({}),
}));

function buildItem(serviceName: string): GridItemData {
  return {
    index: 2,
    value: serviceName,
    label: serviceName,
    queryRunnerParams: {
      serviceName,
      profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
    },
    panelType: PanelType.TIMESERIES,
  };
}

// same header actions as the All services view
function buildPanel(serviceName: string) {
  return new SceneLabelValuesTimeseries({
    item: buildItem(serviceName),
    data: new SceneDataTransformer({ transformations: [] }),
    headerActions: (item) => [
      new SelectAction({ type: 'view-profiles', item }),
      new SelectAction({ type: 'view-labels', item }),
      new SelectAction({ type: 'view-flame-graph', item }),
      new FavAction({ item }),
    ],
  });
}

// jsdom has no layout: give the panel title the widths measured at 1440px in the browser
function buildContainer({ width, titleWidth, titleSpace }: { width: number; titleWidth: number; titleSpace: number }) {
  const container = document.createElement('div');
  const title = document.createElement('h2');
  container.appendChild(title);

  Object.defineProperty(container, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(title, 'scrollWidth', { configurable: true, value: titleWidth });
  Object.defineProperty(title, 'clientWidth', { configurable: true, value: Math.min(titleWidth, titleSpace) });

  return container;
}

function getSelectActions(panel: SceneLabelValuesTimeseries) {
  return (panel.state.body.state.headerActions as SceneObject[]).filter(
    (action): action is SelectAction => action instanceof SelectAction
  );
}

describe('SceneLabelValuesTimeseries header actions', () => {
  it('switches the text actions to icons when the title is clipped, so namespaced service names stay distinguishable', () => {
    const panel = buildPanel('ridesharing-production/dispatch-api');

    panel.fitHeaderActionsToTitle(buildContainer({ width: 462, titleWidth: 250, titleSpace: 177 }));

    const selectActions = getSelectActions(panel);
    expect(selectActions.map((a) => a.state.compact)).toEqual([true, true, true]);
    expect(selectActions.map((a) => a.state.label)).toEqual(['Profile types', 'Labels', 'Flame graph']);
    expect(panel.state.body.state.title).toBe('ridesharing-production/dispatch-api');
  });

  it('keeps the text actions when the title fits', () => {
    const panel = buildPanel('ride-sharing-app');

    panel.fitHeaderActionsToTitle(buildContainer({ width: 462, titleWidth: 120, titleSpace: 177 }));

    expect(getSelectActions(panel).map((a) => a.state.compact)).toEqual([undefined, undefined, undefined]);
  });

  it('stays compact while the panel keeps its width and goes back to text when the panel grows', () => {
    const panel = buildPanel('ridesharing-production/dispatch-api');

    panel.fitHeaderActionsToTitle(buildContainer({ width: 462, titleWidth: 250, titleSpace: 177 }));
    // once compacted the title fits: this must not flip the actions back
    panel.fitHeaderActionsToTitle(buildContainer({ width: 462, titleWidth: 250, titleSpace: 300 }));
    expect(getSelectActions(panel).every((a) => a.state.compact)).toBe(true);

    panel.fitHeaderActionsToTitle(buildContainer({ width: 900, titleWidth: 250, titleSpace: 600 }));
    expect(getSelectActions(panel).every((a) => a.state.compact)).toBe(false);
  });

  it('keeps the compact mode when the header actions are rebuilt', () => {
    const panel = buildPanel('ridesharing-production/dispatch-api');
    panel.fitHeaderActionsToTitle(buildContainer({ width: 462, titleWidth: 250, titleSpace: 177 }));

    panel.updateItem({ label: 'ridesharing-production/dispatch-api' });

    expect(getSelectActions(panel).every((a) => a.state.compact)).toBe(true);
  });
});

describe('SelectAction', () => {
  it('renders the label as text by default', () => {
    const action = new SelectAction({ type: 'view-profiles', item: buildItem('ride-sharing-app') });

    render(<action.Component model={action} />);

    expect(screen.getByRole('button', { name: 'Profile types' })).toHaveTextContent('Profile types');
  });

  it('renders an icon-only button that keeps its accessible name when compact', () => {
    const action = new SelectAction({ type: 'view-profiles', item: buildItem('ride-sharing-app') });
    action.setState({ compact: true });

    render(<action.Component model={action} />);

    const button = screen.getByRole('button', { name: 'Profile types' });
    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).not.toBeNull();
  });
});
