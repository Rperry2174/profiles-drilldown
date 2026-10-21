import { SceneObject } from '@grafana/scenes';

import { FavAction } from '../../../domain/actions/FavAction';
import { SelectAction } from '../../../domain/actions/SelectAction';
import { PanelType } from '../../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from '../SceneLabelValuesTimeseries';

// the real module pulls in the whole explorer (and its SVG assets) through SceneExploreServiceFlameGraph
jest.mock('../../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
  HIGHLIGHTED_SERIES_REF_ID: 'highlighted-series',
  addExemplarTransformations: () => [],
  getHighlightedSeriesOverrides: () => ({}),
}));

const buildItem = (serviceName: string): GridItemData => ({
  index: 0,
  value: serviceName,
  label: serviceName,
  panelType: PanelType.TIMESERIES,
  queryRunnerParams: { serviceName, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
});

// same header actions as the All services grid
const buildPanel = (serviceName: string) =>
  new SceneLabelValuesTimeseries({
    item: buildItem(serviceName),
    headerActions: (item) => [
      new SelectAction({ type: 'view-profiles', item }),
      new SelectAction({ type: 'view-labels', item }),
      new SelectAction({ type: 'view-flame-graph', item }),
      new FavAction({ item }),
    ],
  });

const getHeaderActions = (panel: SceneLabelValuesTimeseries) => panel.state.body.state.headerActions as SceneObject[];

const getCompactSelectActions = (panel: SceneLabelValuesTimeseries) =>
  getHeaderActions(panel)
    .filter((action): action is SelectAction => action instanceof SelectAction && Boolean(action.state.compact))
    .map((action) => action.state.label);

describe('SceneLabelValuesTimeseries header actions', () => {
  it('switches the labelled actions to icons when a namespaced service name is clipped', () => {
    const panel = buildPanel('ridesharing-production/checkout-api');

    panel.onHeaderResize({ width: 464, isTitleClipped: true });

    expect(panel.state.body.state.title).toBe('ridesharing-production/checkout-api');
    expect(getCompactSelectActions(panel)).toEqual(['Profile types', 'Labels', 'Flame graph']);
    // every action stays in the header, the favorite star included
    expect(getHeaderActions(panel).map((action) => action.constructor.name)).toEqual([
      'SelectAction',
      'SelectAction',
      'SelectAction',
      'FavAction',
    ]);
  });

  it('keeps the labelled actions when the title fits', () => {
    const panel = buildPanel('ride-sharing-app');

    panel.onHeaderResize({ width: 464, isTitleClipped: false });

    expect(getCompactSelectActions(panel)).toEqual([]);
  });

  it('stays compact at the same width and expands again once the panel gets wider', () => {
    const panel = buildPanel('ridesharing-production/checkout-api');

    panel.onHeaderResize({ width: 464, isTitleClipped: true });
    // the title fits now that the actions are icons: this must not flip them back
    panel.onHeaderResize({ width: 464, isTitleClipped: false });
    expect(getCompactSelectActions(panel)).toHaveLength(3);

    panel.onHeaderResize({ width: 900, isTitleClipped: false });
    expect(getCompactSelectActions(panel)).toEqual([]);
  });

  it('keeps the compact layout when the header actions are rebuilt for the same service', () => {
    const panel = buildPanel('ridesharing-production/checkout-api');
    panel.onHeaderResize({ width: 464, isTitleClipped: true });

    panel.updateItem({ label: 'ridesharing-production/checkout-api' });

    expect(getCompactSelectActions(panel)).toHaveLength(3);

    panel.updateItem({ label: 'ride-sharing-app' });

    expect(getCompactSelectActions(panel)).toEqual([]);
  });
});
