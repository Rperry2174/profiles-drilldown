import { render, screen } from '@testing-library/react';
import React from 'react';

import { PanelType } from '../../components/SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../../components/SceneByVariableRepeaterGrid/types/GridItemData';
import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { compactSelectActionsForLongTitle } from '../compactSelectActionsForLongTitle';

jest.mock('react-inlinesvg', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('svg', {}) };
});

jest.mock('@shared/domain/reportInteraction', () => ({
  reportInteraction: jest.fn(),
}));

const buildItem = (label: string): GridItemData => ({
  index: 0,
  value: label,
  label,
  queryRunnerParams: { serviceName: label, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
  panelType: PanelType.TIMESERIES,
});

const buildHeaderActions = (label: string) => {
  const item = buildItem(label);

  return compactSelectActionsForLongTitle(
    [
      new SelectAction({ type: 'view-profiles', item }),
      new SelectAction({ type: 'view-labels', item }),
      new SelectAction({ type: 'view-flame-graph', item }),
      new FavAction({ item }),
    ],
    label
  ).filter((action): action is SelectAction => action instanceof SelectAction);
};

const renderActions = (actions: SelectAction[]) =>
  render(
    <>
      {actions.map((action) => (
        <action.Component key={action.state.type} model={action} />
      ))}
    </>
  );

describe('compactSelectActionsForLongTitle(headerActions, title)', () => {
  it('keeps the labelled select buttons for short titles', () => {
    const actions = buildHeaderActions('ride-sharing-app');

    expect(actions.map((a) => a.state.compact)).toEqual([undefined, undefined, undefined]);

    renderActions(actions);
    ['Profile types', 'Labels', 'Flame graph'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveTextContent(name);
    });
  });

  it('renders icon-only select buttons for long namespaced service names so the title has room', () => {
    const actions = buildHeaderActions('ridesharing-production/checkout-api');

    expect(actions.map((a) => a.state.compact)).toEqual([true, true, true]);

    renderActions(actions);
    ['Profile types', 'Labels', 'Flame graph'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveTextContent('');
    });
  });
});
