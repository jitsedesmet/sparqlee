import type * as E from '../expressions';
import type { OverLoadCache } from '../functions/OverloadTree';
import type { Bindings } from '../Types';
import type {
  IAsyncSuperTypeProvider,
  ISyncSuperTypeProvider,
  SyncSuperTypeCallback,
  TypeCache
} from '../util/TypeHandling';
import type { ICompleteAsyncEvaluatorConfig } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ICompleteSyncEvaluatorConfig } from './evaluatorHelpers/SyncRecursiveEvaluator';
import {SyncExtensionFunctionCreator} from "./SyncEvaluator";
import {AsyncExtensionFunctionCreator} from "./AsyncEvaluator";

export interface ISharedConfig {
  now?: Date;
  baseIRI?: string;
  overloadCache?: OverLoadCache;
  typeCache?: TypeCache;
}

export interface ICompleteSharedConfig {
  now: Date;
  baseIRI?: string;
  overloadCache?: OverLoadCache;
  superTypeProvider: ISyncSuperTypeProvider | IAsyncSuperTypeProvider;
}

// TODO: should get proper name
export type GeneralAlgebraArgument = { type: 'sync'; creator: SyncExtensionFunctionCreator } |
{ type: 'async'; creator: AsyncExtensionFunctionCreator };

export interface ISyncEvaluationContext extends ICompleteSyncEvaluatorConfig {
  args: E.Expression[];
  mapping: Bindings;
  evaluate: (expr: E.Expression, mapping: Bindings) => E.TermExpression;
}

export interface IAsyncEvaluationContext extends ICompleteAsyncEvaluatorConfig{
  args: E.Expression[];
  mapping: Bindings;
  evaluate: (expr: E.Expression, mapping: Bindings) => Promise<E.TermExpression>;
}
