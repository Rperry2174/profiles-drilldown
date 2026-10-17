import {
  SceneComponentProps,
  SceneDataProvider,
  SceneDataTransformer,
  SceneObjectBase,
  SceneObjectState,
  VizPanel,
} from '@grafana/scenes';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from './SceneLabelValuesTimeseries';

jest.mock('../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
  addExemplarTransformations: () => [],
  getHighlightedSeriesOverrides: () => ({}),
  HIGHLIGHTED_SERIES_REF_ID: 'highlighted-series',
}));

// Rendering a real VizPanel needs a running Grafana; PanelChrome renders the title as <h2 title={title}>.
class PanelStub extends SceneObjectBase<SceneObjectState & { title: string; $data?: SceneDataProvider }> {
  static Component = ({ model }: SceneComponentProps<PanelStub>) => {
    const { title } = model.useState();
    return <h2 title={title}>{title}</h2>;
  };
}

function renderPanelTitle(label: string) {
  const item: GridItemData = {
    index: 0,
    value: label,
    label,
    queryRunnerParams: { serviceName: label, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
    panelType: PanelType.TIMESERIES,
  };
  const model = new SceneLabelValuesTimeseries({
    item,
    headerActions: () => [],
    data: new SceneDataTransformer({ transformations: [] }),
  });
  const { title } = model.state.body.state;
  model.setState({
    body: new PanelStub({ title: title!, $data: new SceneDataTransformer({ transformations: [] }) }) as unknown as VizPanel,
  });

  render(<model.Component model={model} />);

  return screen.getByRole('heading', { name: label });
}

describe('SceneLabelValuesTimeseries', () => {
  describe('panel title', () => {
    it('is truncated from the start for namespaced names, so the distinct service part stays visible', () => {
      const title = renderPanelTitle('ridesharing-production/checkout-api');

      expect(title).toHaveAttribute('title', 'ridesharing-production/checkout-api');
      expect(getComputedStyle(title).direction).toBe('rtl');
      expect(getComputedStyle(title).textAlign).toBe('left');
    });

    it('is rendered as before for names without a namespace', () => {
      const title = renderPanelTitle('ride-sharing-app');

      expect(getComputedStyle(title).direction).not.toBe('rtl');
    });
  });
});
