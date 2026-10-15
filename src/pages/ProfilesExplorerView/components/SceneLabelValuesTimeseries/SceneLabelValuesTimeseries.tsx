import { css, cx } from '@emotion/css';
import { DataFrame, FieldMatcherID, LoadingState, PanelData } from '@grafana/data';
import { config } from '@grafana/runtime';
import {
  PanelBuilders,
  SceneComponentProps,
  SceneDataProvider,
  SceneDataTransformer,
  sceneGraph,
  SceneObject,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  VizPanel,
  VizPanelMenu,
  VizPanelState,
} from '@grafana/scenes';
import { GraphGradientMode, ScaleDistribution, ScaleDistributionConfig, SortOrder } from '@grafana/schema';
import { LegendDisplayMode, TooltipDisplayMode, VizLegendOptions } from '@grafana/ui';
import { isEqual, merge } from 'lodash';
import React from 'react';

import { ExemplarToggleAction } from '../../domain/actions/ExemplarToggleAction';
import { FavAction } from '../../domain/actions/FavAction';
import { SelectAction } from '../../domain/actions/SelectAction';
import { SpanExemplarToggleAction } from '../../domain/actions/SpanExemplarToggleAction';
import { EventTimeseriesDataReceived } from '../../domain/events/EventTimeseriesDataReceived';
import { ProfileIdSelectorVariable } from '../../domain/variables/ProfileIdSelectorVariable';
import { ProfileMetricVariable } from '../../domain/variables/ProfileMetricVariable';
import { formatSingleSeriesDisplayName } from '../../helpers/formatSingleSeriesDisplayName';
import { getColorByIndex } from '../../helpers/getColorByIndex';
import { deferSceneQueryRunnerRun } from '../../infrastructure/deferSceneQueryRunnerRun';
import { getSeriesLabelFieldName } from '../../infrastructure/helpers/getSeriesLabelFieldName';
import { LabelsDataSource } from '../../infrastructure/labels/LabelsDataSource';
import { buildTimeSeriesQueryRunner } from '../../infrastructure/timeseries/buildTimeSeriesQueryRunner';
import { addRefId, addStats } from '../SceneByVariableRepeaterGrid/infrastructure/data-transformations';
import {
  addExemplarTransformations,
  getHighlightedSeriesOverrides,
  HIGHLIGHTED_SERIES_REF_ID,
} from '../SceneByVariableRepeaterGrid/infrastructure/exemplars-transformations';
import { GridItemData } from '../SceneByVariableRepeaterGrid/types/GridItemData';
import { RangeAnnotation } from '../SceneExploreDiffFlameGraph/components/SceneComparePanel/domain/RangeAnnotation';
import { TimeseriesReprocess } from './domain/events/TimeseriesReprocess';
import { SceneTimeseriesMenu } from './SceneTimeseriesMenu';
import { servicePanelTitleLayout, titleOverflowsInlineSlot } from './servicePanelTitle';

interface SceneLabelValuesTimeseriesState extends SceneObjectState {
  item: GridItemData;
  headerActions: (item: GridItemData) => VizPanelState['headerActions'];
  body: VizPanel;
  displayAllValues: boolean;
  legendPlacement: VizLegendOptions['placement'];
  overrides?: (series: DataFrame[]) => VizPanelState['fieldConfig']['overrides'];
}

const styles = {
  wrapper: css({
    width: '100%',
    height: '100%',
  }),
  // Grafana renders exemplar markers at 50% opacity by default (ExemplarMarker.tsx).
  // The highlighted exemplar frame is appended last, so its marker is the last child in the DOM.
  highlightedExemplar: css({
    'div:last-child > [data-testid*="Exemplar marker"] svg': {
      opacity: '1 !important',
    },
  }),
  // Namespaced service names share a prefix. The header ellipsizes the end, so
  // give the title its own row when it does not fit beside the actions.
  stackedTitle: css({
    '[class*="panel-header"]': {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      gridTemplateAreas: '"title title title" "items actions menu"',
      // PanelChrome sets the header height inline to one row. The title row
      // needs that override or the actions land under the chart and miss clicks.
      height: 'auto !important',
      maxHeight: 'none !important',
      flexShrink: 0,
      alignItems: 'center',
    },
    '[class*="panel-title"]': {
      gridArea: 'title',
      maxWidth: '100%',
      minWidth: 0,
    },
    '[class*="panel-title"] h2': {
      maxWidth: '100%',
    },
    '[data-testid="title-items-container"]': {
      gridArea: 'items',
    },
    '[class*="right-aligned-container"]': {
      gridArea: 'actions',
      justifySelf: 'end',
    },
    '[class*="panel-menu"]': {
      gridArea: 'menu',
    },
  }),
};

export class SceneLabelValuesTimeseries extends SceneObjectBase<SceneLabelValuesTimeseriesState> {
  constructor({
    item,
    headerActions,
    displayAllValues,
    legendPlacement,
    data,
    overrides,
    includeExemplars,
    includeSpanExemplars,
    spanExemplarToggleAction,
    menuActions,
  }: {
    item: SceneLabelValuesTimeseriesState['item'];
    headerActions: SceneLabelValuesTimeseriesState['headerActions'];
    displayAllValues?: SceneLabelValuesTimeseriesState['displayAllValues'];
    legendPlacement?: SceneLabelValuesTimeseriesState['legendPlacement'];
    data?: SceneDataTransformer;
    overrides?: SceneLabelValuesTimeseriesState['overrides'];
    includeExemplars?: boolean;
    includeSpanExemplars?: boolean;
    spanExemplarToggleAction?: SpanExemplarToggleAction;
    menuActions?: { selectAction?: SelectAction; favAction: FavAction };
  }) {
    const { processedHeaderActions, menuState } = SceneLabelValuesTimeseries.processExemplarsConfig(
      headerActions,
      includeExemplars,
      includeSpanExemplars,
      spanExemplarToggleAction
    );
    Object.assign(menuState, menuActions);

    super({
      key: 'timeseries-label-values',
      item,
      headerActions: processedHeaderActions,
      displayAllValues: Boolean(displayAllValues),
      legendPlacement: legendPlacement || 'bottom',
      overrides,
      body: PanelBuilders.timeseries()
        // TODO: remove `as any` once @grafana/scenes exposes `multiLane` on the annotations option type
        .setOption('annotations' as any, { multiLane: true })
        .setTitle(item.label)
        .setData(
          data ||
            new SceneDataTransformer({
              $data: buildTimeSeriesQueryRunner(
                item.queryRunnerParams,
                displayAllValues ? undefined : LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES,
                includeExemplars
              ),
              transformations: [],
            })
        )
        .setHeaderActions(processedHeaderActions(item))
        .setMenu(new SceneTimeseriesMenu(menuState) as unknown as VizPanelMenu)
        .build(),
    });

    if (!data) {
      this.addTransformations(item);
    }
    this.addActivationHandler(this.onActivate.bind(this));
  }

  private static processExemplarsConfig(
    headerActions: SceneLabelValuesTimeseriesState['headerActions'],
    includeExemplars: boolean | undefined,
    includeSpanExemplars?: boolean,
    spanExemplarToggleAction?: SpanExemplarToggleAction
  ): {
    processedHeaderActions: SceneLabelValuesTimeseriesState['headerActions'];
    menuState: Record<string, unknown>;
  } {
    let processedHeaderActions = headerActions;
    const menuState: Record<string, unknown> = {};

    if (includeExemplars) {
      const prev = processedHeaderActions;
      processedHeaderActions = (item: GridItemData) => [
        ...(prev(item) as SceneObject[]),
        new ExemplarToggleAction(true),
      ];
    } else {
      menuState.showExemplars = false;
    }

    if (includeSpanExemplars) {
      const prev = processedHeaderActions;
      processedHeaderActions = (item: GridItemData) => [
        ...(prev(item) as SceneObject[]),
        spanExemplarToggleAction ?? new SpanExemplarToggleAction(false),
      ];
    }

    return { processedHeaderActions, menuState };
  }

  onActivate() {
    const { body } = this.state;

    const dataSub = (body.state.$data as SceneDataProvider).subscribeToState(this.handleDataStateChange.bind(this));

    const profileMetricSub = this.subscribeToProfileMetricChanges();

    const timeseriesReprocessSub = this.subscribeToEvent(TimeseriesReprocess, () => {
      const bodyData = this.state.body.state.$data as SceneDataTransformer | undefined;
      bodyData?.reprocessTransformations();
    });

    const cancelDefer = deferSceneQueryRunnerRun(
      this.state.body.state.$data?.state.$data as SceneQueryRunner | undefined
    );

    return () => {
      dataSub.unsubscribe();
      profileMetricSub?.unsubscribe();
      timeseriesReprocessSub?.unsubscribe();
      cancelDefer();
    };
  }

  private addTransformations(item: GridItemData) {
    const bodyData = this.state.body.state.$data as SceneDataTransformer;
    if (bodyData) {
      bodyData.setState({
        transformations: [addRefId, addStats, ...addExemplarTransformations(this, item)],
      });
    }
  }

  private handleDataStateChange(newState: { data?: PanelData }, prevState: { data?: PanelData }) {
    if (newState.data?.state !== LoadingState.Done) {
      return;
    }

    this.retainPreviousAnnotations(newState, prevState);

    const { series } = newState.data;

    if (series?.length) {
      this.updateBodyConfig(series);
    }

    this.publishEvent(new EventTimeseriesDataReceived({ series }), true);
  }

  private retainPreviousAnnotations(newState: { data?: PanelData }, prevState: { data?: PanelData }) {
    const rangeAnnotations = prevState?.data?.annotations?.filter(
      (annotation: unknown) => annotation instanceof RangeAnnotation
    );
    if (
      rangeAnnotations?.length &&
      newState?.data &&
      !newState.data.annotations?.some((annotation: unknown) => annotation instanceof RangeAnnotation)
    ) {
      const $data = this.state.body.state.$data as SceneDataProvider;
      $data.setState({
        data: {
          ...newState.data,
          annotations: [...(newState.data.annotations ?? []), ...rangeAnnotations],
        },
      });
    }
  }

  private updateBodyConfig(series: DataFrame[]) {
    const { body } = this.state;
    const config = this.state.displayAllValues ? this.getAllValuesConfig(series) : this.getConfig(series);
    body.setState(merge({}, body.state, config));
  }

  private subscribeToProfileMetricChanges() {
    try {
      const profileMetricVariable = sceneGraph.findByKeyAndType(this, 'profileMetricId', ProfileMetricVariable);
      return profileMetricVariable.subscribeToState((newState, prevState) => {
        if (newState.value !== prevState.value) {
          this.handleProfileMetricChange();
        }
      });
    } catch {
      return null;
    }
  }

  private handleProfileMetricChange() {
    const { body } = this.state;
    const currentData = (body.state.$data as SceneDataProvider).state.data;
    if (currentData?.series?.length) {
      this.updateBodyConfig(currentData.series);
    }
  }

  handleExemplarToggleChange(includeExemplars: boolean) {
    const { body, item, displayAllValues } = this.state;
    if (!includeExemplars) {
      // Hide exemplars (annotations) by filtering them out from the data without running queries
      const { $data } = body.state;
      const data = ($data as SceneDataProvider)?.state.data;
      if (data?.annotations) {
        // Filter out exemplar annotations
        const exemplars = data.annotations.filter((annotation: any) => annotation.name !== 'exemplar');
        ($data as SceneDataProvider)?.setState({
          data: {
            ...data,
            annotations: exemplars,
          },
        });
      }
      return;
    }

    const { queries } = buildTimeSeriesQueryRunner(
      item.queryRunnerParams,
      displayAllValues ? undefined : LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES,
      includeExemplars
    ).state;

    const queryRunner = body.state.$data?.state.$data as SceneQueryRunner;

    if (queryRunner) {
      queryRunner.setState({ queries });
      queryRunner.runQueries();
    }
  }

  getConfig(series: DataFrame[]) {
    const { body, item, legendPlacement } = this.state;
    let { title } = body.state;
    let description;

    if (item.queryRunnerParams.groupBy?.label) {
      title = series.length > 1 ? `${item.label} (${series.length})` : item.label;
      description = this.buildDescription(item.queryRunnerParams.groupBy!);
    }

    return {
      title,
      description,
      options: {
        tooltip: {
          mode: 'single',
          sort: 'none',
        },
        legend: {
          showLegend: true,
          displayMode: 'list',
          placement: legendPlacement,
        },
      },
      fieldConfig: {
        defaults: {
          min: 0,
          custom: {
            fillOpacity: series.length >= LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES ? 0 : 9,
            gradientMode: series.length === 1 ? GraphGradientMode.None : GraphGradientMode.Opacity,
            pointSize: 3,
          },
        },
        overrides: this.getOverrides(series),
      },
    };
  }

  buildDescription(groupBy: GridItemData['queryRunnerParams']['groupBy']) {
    if (!groupBy) {
      return '';
    }

    // this case is for favorites: they are stored in localStorage without the `values` array
    if (!groupBy!.values) {
      return `Showing only ${LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES} series to preserve readability. To view all the series, click on the expand icon on this panel.`;
    }

    if (groupBy!.values.length > LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES) {
      return `Showing only ${LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES} out of ~${
        groupBy!.values.length
      } series to preserve readability. To view all the series for the current filters, click on the expand icon on this panel.`;
    }

    return '';
  }

  getAllValuesConfig(series: DataFrame[]) {
    const { legendPlacement } = this.state;

    return {
      options: {
        tooltip: {
          mode: TooltipDisplayMode.Single,
          sort: SortOrder.None,
        },
        legend: {
          showLegend: true,
          displayMode: LegendDisplayMode.List,
          placement: legendPlacement,
          calcs: [],
        },
      },
      fieldConfig: {
        defaults: {
          min: 0,
          custom: {
            fillOpacity: 0,
            pointSize: 5,
          },
        },
        overrides: this.getOverrides(series),
      },
    };
  }

  getOverrides(series: DataFrame[]) {
    if (this.state.overrides) {
      return this.state.overrides(series);
    }

    const { item } = this.state;
    const groupByLabel = item.queryRunnerParams.groupBy?.label;

    // Check if highlightedSeries is present
    const hasHighlightedSeries = series.some((s) => s.refId === HIGHLIGHTED_SERIES_REF_ID);

    const getSeriesColor = (index: number) =>
      hasHighlightedSeries
        ? { mode: 'fixed', fixedColor: config.theme2.colors.text.disabled }
        : { mode: 'fixed', fixedColor: getColorByIndex(item.index + index) };

    const overrides = series
      .filter((s) => s.refId !== HIGHLIGHTED_SERIES_REF_ID)
      .map((s, i) => {
        const metricField = s.fields[1];
        const displayName = groupByLabel ? getSeriesLabelFieldName(metricField, groupByLabel) : metricField.name;

        return {
          matcher: { id: FieldMatcherID.byFrameRefID, options: s.refId },
          properties: [
            { id: 'displayName', value: formatSingleSeriesDisplayName(displayName, s) },
            { id: 'color', value: getSeriesColor(i) },
          ],
        };
      });

    return [...overrides, getHighlightedSeriesOverrides()];
  }

  updateItem(partialItem: Partial<GridItemData>) {
    const { item, headerActions, body } = this.state;
    const updatedItem = merge({}, item, partialItem);

    if (partialItem.queryRunnerParams?.hasOwnProperty('groupBy')) {
      if (partialItem.queryRunnerParams.groupBy === undefined) {
        delete updatedItem.queryRunnerParams.groupBy;
      } else {
        // we completely replace groupBy because merge() above concatenates groupBy.values
        updatedItem.queryRunnerParams.groupBy = partialItem.queryRunnerParams.groupBy;
      }
    }

    if (
      partialItem.queryRunnerParams?.hasOwnProperty('filters') &&
      partialItem.queryRunnerParams.filters === undefined
    ) {
      delete updatedItem.queryRunnerParams.filters;
    }

    this.setState({ item: updatedItem });

    body.setState({
      title: partialItem.label,
      description: this.buildDescription(updatedItem.queryRunnerParams.groupBy),
      headerActions: headerActions(updatedItem),
    });

    if (!isEqual(item.queryRunnerParams, updatedItem.queryRunnerParams)) {
      const { queries } = buildTimeSeriesQueryRunner(
        updatedItem.queryRunnerParams,
        LabelsDataSource.MAX_TIMESERIES_LABEL_VALUES
      ).state;

      const queryRunner = body.state.$data?.state.$data as SceneQueryRunner;

      // this allows us not to have to subscribe to the data provider changes as we do in onActivate() above
      queryRunner?.setState({ queries });
      queryRunner?.runQueries();
    }
  }

  changeScale(scaleDistribution: ScaleDistributionConfig, axisLabel: string) {
    const { body } = this.state;

    body.clearFieldConfigCache();

    body.setState({
      fieldConfig: merge({}, body.state.fieldConfig, {
        defaults: {
          custom: {
            scaleDistribution,
            axisLabel: scaleDistribution.type !== ScaleDistribution.Linear ? axisLabel : '',
          },
        },
      }),
    });
  }

  static Component = SceneLabelValuesTimeseriesComponent;
}

function inlineTitleOverflows(root: HTMLElement): boolean | null {
  const header = root.querySelector('[class*="panel-header"]');
  const h2 = header?.querySelector('h2');
  if (!header || !h2) {
    return null;
  }

  const actions = header.querySelector('[class*="right-aligned-container"]');
  const menu = header.querySelector('[class*="panel-menu"]');
  const actionsWidth = (actions?.getBoundingClientRect().width ?? 0) + (menu?.getBoundingClientRect().width ?? 0);
  const range = document.createRange();
  range.selectNodeContents(h2);
  const textWidth = range.getBoundingClientRect().width;

  return titleOverflowsInlineSlot(textWidth, header.getBoundingClientRect().width, actionsWidth);
}

function SceneLabelValuesTimeseriesComponent({ model }: SceneComponentProps<SceneLabelValuesTimeseries>) {
  const { body, item } = model.useState();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = React.useState(() => servicePanelTitleLayout(item.label) === 'stacked');
  const hasSelectedExemplar = useHasSelectedExemplar(model);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const measure = () => {
      const overflows = inlineTitleOverflows(root);
      if (overflows !== null) {
        setStacked(overflows);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [item.label]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.wrapper, stacked && styles.stackedTitle, hasSelectedExemplar && styles.highlightedExemplar)}
    >
      <body.Component model={body} />
    </div>
  );
}

function useHasSelectedExemplar(model: SceneObject): boolean {
  const [hasSelection, setHasSelection] = React.useState(false);

  React.useEffect(() => {
    let variable: ProfileIdSelectorVariable;
    try {
      variable = sceneGraph.findByKeyAndType(model, 'profileIdSelector', ProfileIdSelectorVariable);
    } catch {
      return; // profileIdSelector doesn't exist in non-flame-graph views
    }

    setHasSelection(Boolean(variable.state.value));
    const sub = variable.subscribeToState((state) => setHasSelection(Boolean(state.value)));
    return () => sub.unsubscribe();
  }, [model]);

  return hasSelection;
}
