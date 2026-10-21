import { SceneDataTransformer, SceneObject } from '@grafana/scenes';

import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from './SceneLabelValuesTimeseries';

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
    headerActions: (item) => [new SelectAction({ type: 'view-flame-graph', item }), new FavAction({ item })],
  });

const getSelectActions = (panel: SceneLabelValuesTimeseries) =>
  (panel.state.body.state.headerActions as SceneObject[]).filter(
    (action): action is SelectAction => action instanceof SelectAction
  );

describe('SceneLabelValuesTimeseries header actions', () => {
  // Only the views whose panels are space-constrained compact their own actions: full-width panels
  // (e.g. the main timeseries of the Labels view) have long titles and room for labelled buttons.
  it('leaves the header actions of its consumer untouched, whatever the title length', () => {
    const panel = buildPanel('Size of memory allocated in the heap, grouped by region');

    expect(getSelectActions(panel).map((a) => a.state.compact)).toEqual([undefined]);

    panel.updateItem({ label: 'Number of objects allocated inside Thread-Local Allocation Buffers (TLAB)' });

    expect(getSelectActions(panel).map((a) => a.state.compact)).toEqual([undefined]);
  });
});
