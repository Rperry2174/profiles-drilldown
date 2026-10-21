import { SceneObject } from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { SelectAction } from '../../domain/actions/SelectAction';
import { SceneByVariableRepeaterGrid } from '../SceneByVariableRepeaterGrid/SceneByVariableRepeaterGrid';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneExploreAllServices } from './SceneExploreAllServices';

jest.mock('react-inlinesvg', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('svg', {}) };
});

jest.mock('@shared/domain/reportInteraction', () => ({
  reportInteraction: jest.fn(),
}));

jest.mock('../SceneByVariableRepeaterGrid/SceneByVariableRepeaterGrid', () => {
  const { SceneObjectBase } = require('@grafana/scenes');
  return { SceneByVariableRepeaterGrid: class extends SceneObjectBase {} };
});
jest.mock('../../domain/actions/FavAction', () => {
  const { SceneObjectBase } = require('@grafana/scenes');
  return { FavAction: class extends SceneObjectBase {} };
});
jest.mock('../../domain/variables/FiltersVariable/AllServicesFilterVariable', () => ({
  AllServicesFilterVariable: class {},
}));
jest.mock('../../domain/variables/ProfileMetricVariable', () => ({ ProfileMetricVariable: class {} }));
jest.mock('../../domain/variables/ServiceNameVariable/ServiceNameVariable', () => {
  const { SceneObjectBase } = require('@grafana/scenes');
  return { ServiceNameVariable: class extends SceneObjectBase {} };
});
jest.mock('../SceneByVariableRepeaterGrid/components/SceneLayoutSwitcher', () => ({ SceneLayoutSwitcher: class {} }));
jest.mock('../SceneByVariableRepeaterGrid/components/SceneQuickFilter', () => ({ SceneQuickFilter: class {} }));

function renderHeaderActions(label: string) {
  const grid = new SceneExploreAllServices().state.body as unknown as SceneByVariableRepeaterGrid;
  const item: GridItemData = {
    index: 0,
    value: label,
    label,
    queryRunnerParams: {
      serviceName: label,
      profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
    },
  } as GridItemData;

  const actions = (grid.state.headerActions(item, []) as SceneObject[]).filter((a) => a instanceof SelectAction);

  render(
    <>
      {actions.map((action) => (
        <action.Component key={action.state.key} model={action} />
      ))}
    </>
  );
}

const ACTION_LABELS = ['Profile types', 'Labels', 'Flame graph'];

describe('SceneExploreAllServices header actions', () => {
  it('render as text buttons for short service names', () => {
    renderHeaderActions('ride-sharing-app');

    for (const label of ACTION_LABELS) {
      const button = screen.getByRole('button', { name: label });
      expect(button).toHaveTextContent(label);
    }
  });

  // At 1440px the text buttons leave the title ~177px, which cuts every name of this demo kit
  // at "ridesharing-production/…" and makes all the panels look identical.
  it.each([
    'ridesharing-production/checkout-api',
    'ridesharing-production/payments-api',
    'ridesharing-production/dispatch-api',
    'ridesharing-production/pricing-api',
  ])('render as icon buttons for the long service name "%s", keeping their accessible names', (serviceName) => {
    renderHeaderActions(serviceName);

    for (const label of ACTION_LABELS) {
      const button = screen.getByRole('button', { name: label });
      expect(button).not.toHaveTextContent(label);
    }
  });
});
