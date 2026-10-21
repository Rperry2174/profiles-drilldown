import { SceneObject } from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { SelectAction } from '../../../domain/actions/SelectAction';
import { SceneByVariableRepeaterGrid } from '../../SceneByVariableRepeaterGrid/SceneByVariableRepeaterGrid';
import { PanelType } from '../../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneExploreAllServices } from '../SceneExploreAllServices';

jest.mock('@shared/domain/reportInteraction', () => ({ reportInteraction: jest.fn() }));
jest.mock('../../SceneByVariableRepeaterGrid/SceneByVariableRepeaterGrid', () => {
  const { SceneObjectBase } = jest.requireActual('@grafana/scenes');
  return { SceneByVariableRepeaterGrid: class extends SceneObjectBase {} };
});
jest.mock('../../../domain/variables/ServiceNameVariable/ServiceNameVariable', () => {
  const { SceneObjectBase } = jest.requireActual('@grafana/scenes');
  return { ServiceNameVariable: class extends SceneObjectBase {} };
});
jest.mock('../../../domain/variables/FiltersVariable/AllServicesFilterVariable', () => ({}));
jest.mock('../../../domain/variables/ProfileMetricVariable', () => ({}));
jest.mock('../../SceneByVariableRepeaterGrid/components/SceneLayoutSwitcher', () => ({}));
jest.mock('../../SceneByVariableRepeaterGrid/components/SceneQuickFilter', () => ({}));

const SELECT_ACTIONS = ['Profile types', 'Labels', 'Flame graph'];

function renderHeaderActions(serviceName: string) {
  const grid = new SceneExploreAllServices().state.body as SceneByVariableRepeaterGrid;
  const item: GridItemData = {
    index: 0,
    value: serviceName,
    label: serviceName,
    queryRunnerParams: { serviceName, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
    panelType: PanelType.TIMESERIES,
  };

  const actions = (grid.state.headerActions(item, [item]) as SceneObject[]).filter((a) => a instanceof SelectAction);

  render(
    <>
      {actions.map((action) => (
        <action.Component key={action.state.key} model={action} />
      ))}
    </>
  );
}

describe('SceneExploreAllServices header actions', () => {
  it('renders the select actions icon-only for namespaced service names, so the title keeps its width', () => {
    renderHeaderActions('ridesharing-production/checkout-api');

    for (const name of SELECT_ACTIONS) {
      const button = screen.getByRole('button', { name });
      expect(button).not.toHaveTextContent(name);
    }
  });

  it('keeps the text labels for short service names', () => {
    renderHeaderActions('ride-sharing-app');

    for (const name of SELECT_ACTIONS) {
      expect(screen.getByRole('button', { name })).toHaveTextContent(name);
    }
  });
});
