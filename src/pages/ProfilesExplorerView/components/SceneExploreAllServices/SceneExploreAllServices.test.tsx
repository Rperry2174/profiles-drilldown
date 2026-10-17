import { render, screen } from '@testing-library/react';
import React from 'react';

import { SelectAction } from '../../domain/actions/SelectAction';
import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { SceneByVariableRepeaterGrid } from '../SceneByVariableRepeaterGrid/SceneByVariableRepeaterGrid';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneExploreAllServices } from './SceneExploreAllServices';

jest.mock('@shared/components/SavedSearches/utils', () => ({ buildFilterExpressionParts: jest.fn() }));
jest.mock(
  '../SceneByVariableRepeaterGrid/components/SceneEmptyState/ui/img/grot-404-dark.svg',
  () => 'grot-404-dark.svg'
);
jest.mock(
  '../SceneByVariableRepeaterGrid/components/SceneEmptyState/ui/img/grot-404-light.svg',
  () => 'grot-404-light.svg'
);
jest.mock('../SceneExploreServiceFlameGraph/SceneFlameGraph', () => {
  const { SceneObjectBase } = jest.requireActual('@grafana/scenes');

  return {
    SceneFlameGraph: class SceneFlameGraph extends SceneObjectBase {
      constructor() {
        super({});
      }
    },
  };
});

function renderHeaderActions(serviceName: string) {
  const grid = new SceneExploreAllServices().state.body as SceneByVariableRepeaterGrid;
  const item: GridItemData = {
    index: 0,
    value: serviceName,
    label: serviceName,
    queryRunnerParams: { serviceName, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
    panelType: PanelType.TIMESERIES,
  };

  const actions = (grid.state.headerActions(item, [item]) as unknown[]).filter(
    (action): action is SelectAction => action instanceof SelectAction
  );

  render(
    <>
      {actions.map((action) => (
        <action.Component key={action.state.key} model={action} />
      ))}
    </>
  );
}

const TEXT_ACTIONS = ['Profile types', 'Labels', 'Flame graph'];

describe('SceneExploreAllServices header actions', () => {
  it('keeps the text actions for short service names', () => {
    renderHeaderActions('ride-sharing-app');

    for (const name of TEXT_ACTIONS) {
      expect(screen.getByRole('button', { name })).toHaveTextContent(name);
    }
  });

  it('renders the actions as icons for namespaced service names so the title is not cut at the shared prefix', () => {
    renderHeaderActions('ridesharing-production/payments-api');

    for (const name of TEXT_ACTIONS) {
      expect(screen.getByRole('button', { name }).textContent).toBe('');
    }
  });
});
