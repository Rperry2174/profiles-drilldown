import { CompleteFilters, FilterKind } from '@shared/components/QueryBuilder/domain/types';

import { AllServicesFilterVariable } from '../AllServicesFilterVariable';

jest.mock('@shared/components/QueryBuilder/QueryBuilder', () => ({ QueryBuilder: () => null }));
jest.mock('@shared/components/SavedSearches/utils', () => ({ buildFilterExpressionParts: () => '' }));
jest.mock('../../ProfileMetricVariable', () => ({ ProfileMetricVariable: class {} }));
jest.mock('../../ProfilesDataSourceVariable', () => ({ ProfilesDataSourceVariable: class {} }));

const regionFilter = {
  id: 'region-filter',
  type: FilterKind['attribute-operator-value'],
  active: true,
  attribute: { value: 'region', label: 'region' },
  operator: { value: '=', label: '=' },
  value: { value: 'eu-north', label: 'eu-north' },
};

function changeQuery(variable: AllServicesFilterVariable, filters: CompleteFilters) {
  (variable as any).onQueryChange('', filters);
}

describe('AllServicesFilterVariable', () => {
  describe('when the query builder emits new filters', () => {
    it('keeps the service_name filters, which the query builder does not display', () => {
      const variable = new AllServicesFilterVariable({
        key: 'filtersAllServices',
        initialFilters: [{ key: 'service_name', operator: '=', value: 'checkout-api' }],
      });

      changeQuery(variable, [regionFilter] as CompleteFilters);

      expect(variable.state.filters).toEqual([
        { key: 'service_name', operator: '=', value: 'checkout-api' },
        { key: 'region', operator: '=', value: 'eu-north' },
      ]);
    });

    it('replaces the other filters', () => {
      const variable = new AllServicesFilterVariable({
        key: 'filtersAllServices',
        initialFilters: [{ key: 'pyroscope_spy', operator: '=', value: 'gospy' }],
      });

      changeQuery(variable, [regionFilter] as CompleteFilters);

      expect(variable.state.filters).toEqual([{ key: 'region', operator: '=', value: 'eu-north' }]);
    });
  });
});
