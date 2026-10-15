import { SceneObject } from '@grafana/scenes';

import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { PanelType } from '../SceneByVariableRepeaterGrid/components/ScenePanelTypeSwitcher';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { SceneLabelValuesTimeseries } from './SceneLabelValuesTimeseries';
import { SceneTimeseriesMenu } from './SceneTimeseriesMenu';

jest.mock('../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations', () => ({
  addExemplarTransformations: () => [],
  HIGHLIGHTED_SERIES_REF_ID: 'highlighted',
  getHighlightedSeriesOverrides: () => ({ matcher: { id: 'byFrameRefID' }, properties: [] }),
}));

jest.mock('../../infrastructure/labels/LabelsDataSource', () => ({
  LabelsDataSource: { MAX_TIMESERIES_LABEL_VALUES: 20 },
}));

function headerSceneObjects(actions: unknown): SceneObject[] {
  return Array.isArray(actions) ? actions : [];
}

function gridItem(label: string): GridItemData {
  return {
    index: 0,
    value: label,
    label,
    panelType: PanelType.TIMESERIES,
    queryRunnerParams: { serviceName: label, profileMetricId: 'process_cpu:cpu:nanoseconds:cpu:nanoseconds' },
  };
}

function allServicesHeaderActions(item: GridItemData) {
  return [
    new SelectAction({ type: 'view-profiles', item }),
    new SelectAction({ type: 'view-labels', item }),
    new SelectAction({ type: 'view-flame-graph', item }),
    new FavAction({ item }),
  ];
}

function buildPanel(label: string) {
  return new SceneLabelValuesTimeseries({
    item: gridItem(label),
    headerActions: allServicesHeaderActions,
  });
}

describe('SceneLabelValuesTimeseries service titles', () => {
  it('keeps the full namespaced service name and moves Profile types and Labels out of the header', () => {
    const scene = buildPanel('ridesharing-production/checkout-api');
    const { body } = scene.state;
    const menu = body.state.menu as unknown as SceneTimeseriesMenu;

    // The label is already the full service name. Truncation happens because labeled
    // header actions steal the title width, so those two actions belong in the menu.
    expect(body.state.title).toBe('ridesharing-production/checkout-api');
    expect(body.state.showMenuAlways).toBe(true);

    const headerActions = headerSceneObjects(body.state.headerActions);
    const headerSelectTypes = headerActions
      .filter((action): action is SelectAction => action instanceof SelectAction)
      .map((action) => action.state.type);

    expect(headerSelectTypes).not.toContain('view-profiles');
    expect(headerSelectTypes).not.toContain('view-labels');
    expect(headerSelectTypes).toContain('view-flame-graph');
    expect(headerActions.some((action) => action instanceof FavAction)).toBe(true);

    const flameGraph = headerActions.find(
      (action): action is SelectAction => action instanceof SelectAction && action.state.type === 'view-flame-graph'
    );
    expect(flameGraph?.state.label).toBeUndefined();
    expect(flameGraph?.state.ariaLabel).toBe('Flame graph');

    const menuLabels = menu.buildMenuItems().map((item) => item.text);
    const openInExplore = menuLabels.indexOf('Open in Explore');
    expect(menuLabels.indexOf('Profile types')).toBeGreaterThan(-1);
    expect(menuLabels.indexOf('Labels')).toBeGreaterThan(-1);
    expect(menuLabels.indexOf('Profile types')).toBeLessThan(openInExplore);
    expect(menuLabels.indexOf('Labels')).toBeLessThan(openInExplore);

    scene.updateItem({ label: 'ridesharing-production/payments-api' });

    const updatedHeader = headerSceneObjects(scene.state.body.state.headerActions);
    const updatedTypes = updatedHeader
      .filter((action): action is SelectAction => action instanceof SelectAction)
      .map((action) => action.state.type);
    expect(scene.state.body.state.title).toBe('ridesharing-production/payments-api');
    expect(updatedTypes).not.toContain('view-profiles');
    expect(updatedTypes).not.toContain('view-labels');
    expect(updatedTypes).toContain('view-flame-graph');
    expect(
      (scene.state.body.state.menu as unknown as SceneTimeseriesMenu).state.items?.map((item) => item.text)
    ).toEqual(expect.arrayContaining(['Profile types', 'Labels']));
  });

  it('leaves a short service name as the panel title', () => {
    const scene = buildPanel('ride-sharing-app');

    expect(scene.state.body.state.title).toBe('ride-sharing-app');
  });
});
