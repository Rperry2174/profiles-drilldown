import { render, screen } from '@testing-library/react';
import React from 'react';

import { PanelType } from '../../../components/SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { SelectAction } from '../SelectAction';

const item = {
  index: 0,
  value: 'ridesharing-production/checkout-api',
  label: 'ridesharing-production/checkout-api',
  panelType: PanelType.TIMESERIES,
  queryRunnerParams: {
    serviceName: 'ridesharing-production/checkout-api',
    profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds',
  },
};

describe('SelectAction', () => {
  it('renders its label by default', () => {
    const action = new SelectAction({ type: 'view-profiles', item });

    render(<action.Component model={action} />);

    expect(screen.getByRole('button', { name: 'Profile types' })).toHaveTextContent('Profile types');
  });

  it('renders only an icon when compact, keeping the same accessible name', () => {
    const action = new SelectAction({ type: 'view-profiles', item });
    action.setCompact(true);

    render(<action.Component model={action} />);

    const button = screen.getByRole('button', { name: 'Profile types' });
    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('ignores compact for actions without an icon', () => {
    const action = new SelectAction({ type: 'select-label', item });

    action.setCompact(true);

    expect(action.state.compact).toBeUndefined();
  });
});
