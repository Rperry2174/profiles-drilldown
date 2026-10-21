import { waitFor } from 'xstate/lib/waitFor';

import { buildStateMachine } from '../stateMachine';
import { FilterKind } from '../types';

jest.mock('@shared/infrastructure/labels/labelsRepository', () => ({
  labelsRepository: {
    cancel: jest.fn(),
    setApiClient: jest.fn(),
    listLabels: jest.fn(async () => [{ value: 'region', label: 'region' }]),
    listLabelValues: jest.fn(async () => [{ value: 'eu-north', label: 'eu-north' }]),
  },
}));

const QUERY = 'process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="svc",pyroscope_spy="go"}';
const LAST_HOUR = { from: 1_700_000_000_000 - 3600_000, to: 1_700_000_000_000 };
const LAST_6_HOURS = { from: 1_700_000_000_000 - 6 * 3600_000, to: 1_700_000_000_000 };

async function startPartialFilter() {
  const { actor } = buildStateMachine({ query: QUERY, ...LAST_HOUR });
  actor.start();

  actor.send({ type: 'START_INPUT' });
  await waitFor(actor, (state) => state.matches('displayLabels'));
  actor.send({ type: 'SELECT_SUGGESTION', data: { value: 'region', label: 'region' } });
  await waitFor(actor, (state) => state.matches('displayOperators'));
  actor.send({ type: 'SELECT_SUGGESTION', data: { value: '=', label: '=' } });
  await waitFor(actor, (state) => state.matches('displayLabelValues'));
  // e.g. the user clicks on the time picker
  actor.send({ type: 'DISCARD_SUGGESTIONS' });

  return actor;
}

describe('Query builder state machine', () => {
  describe('when only the time range changes', () => {
    it('keeps every filter, including the one being built', async () => {
      const actor = await startPartialFilter();
      const filtersBefore = actor.getSnapshot().context.filters;

      expect(filtersBefore).toHaveLength(2);
      expect(filtersBefore[1]).toMatchObject({ type: FilterKind.partial, attribute: { value: 'region' } });

      actor.send({ type: 'CHANGE_INPUT_PARAMS', data: { query: QUERY, ...LAST_6_HOURS } });

      const { context } = actor.getSnapshot();
      expect(context.filters).toEqual(filtersBefore);
      expect(context.inputParams).toEqual({ query: QUERY, ...LAST_6_HOURS });

      actor.stop();
    });
  });

  describe('when the query changes', () => {
    it('rebuilds the filters from the new query', async () => {
      const actor = await startPartialFilter();
      const newQuery = 'process_cpu:cpu:nanoseconds:cpu:nanoseconds{service_name="svc",region="eu-north"}';

      actor.send({ type: 'CHANGE_INPUT_PARAMS', data: { query: newQuery, ...LAST_6_HOURS } });

      const { context } = actor.getSnapshot();
      expect(context.filters).toEqual([
        expect.objectContaining({
          type: FilterKind['attribute-operator-value'],
          attribute: { value: 'region', label: 'region' },
          value: { value: 'eu-north', label: 'eu-north' },
        }),
      ]);
      expect(context.query).toBe(newQuery);

      actor.stop();
    });
  });
});
