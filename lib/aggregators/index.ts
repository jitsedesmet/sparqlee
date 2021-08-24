import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteAsyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type { SetFunction } from '../util/Consts';
import { AsyncAverage, SyncAverage } from './Average';
import type { BaseAsyncAggregator } from './BaseAsyncAggregator';
import type { BaseSyncAggregator } from './BaseSyncAggregator';
import { AsyncCount, SyncCount } from './Count';
import { AsyncGroupConcat, SyncGroupConcat } from './GroupConcat';
import { AsyncMax, SyncMax } from './Max';
import { AsyncMin, SyncMin } from './Min';
import { AsyncSample, SyncSample } from './Sample';
import { AsyncSum, SyncSum } from './Sum';

export interface ISyncAggregatorClass {
  new(expr: Algebra.AggregateExpression, applyConfig: ICompleteSyncEvaluatorConfig): BaseSyncAggregator<any>;

  emptyValue: () => RDF.Term;
}

export interface IAsyncAggregatorClass {
  new(expr: Algebra.AggregateExpression, applyConfig: ICompleteAsyncEvaluatorConfig): BaseAsyncAggregator<any>;

  emptyValue: () => RDF.Term;
}

export const asyncAggregators: Readonly<{[key in SetFunction]: IAsyncAggregatorClass }> = {
  count: AsyncCount,
  sum: AsyncSum,
  min: AsyncMin,
  max: AsyncMax,
  avg: AsyncAverage,
  group_concat: AsyncGroupConcat,
  sample: AsyncSample,
};

export const syncAggregators: Readonly<{[key in SetFunction]: ISyncAggregatorClass }> = {
  count: SyncCount,
  sum: SyncSum,
  min: SyncMin,
  max: SyncMax,
  avg: SyncAverage,
  group_concat: SyncGroupConcat,
  sample: SyncSample,
};
