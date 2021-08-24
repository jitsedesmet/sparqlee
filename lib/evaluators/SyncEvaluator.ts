import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions';
import { SyncAlgebraTransformer } from '../transformers/SyncAlgebraTransformer';
import type { Bindings, IExpressionEvaluator } from '../Types';
import type { SyncSuperTypeCallback } from '../util/TypeHandling';
import type { ICompleteSyncEvaluatorConfig } from './evaluatorHelpers/SyncRecursiveEvaluator';
import { SyncRecursiveEvaluator } from './evaluatorHelpers/SyncRecursiveEvaluator';
import type { ISharedConfig } from './SharedEvaluationTypes';

export interface ISyncEvaluatorConfig extends ISharedConfig {
  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
  extensionFunctionCreator?: SyncExtensionFunctionCreator;
  superTypeCallback?: SyncSuperTypeCallback;
}

export type SyncExtensionFunction = (args: RDF.Term[]) => RDF.Term;
export type SyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => SyncExtensionFunction | undefined;

export class SyncEvaluator {
  private readonly expr: E.Expression;
  private readonly evaluator: IExpressionEvaluator<E.Expression, E.TermExpression>;

  public static setDefaultsFromConfig(config: ISyncEvaluatorConfig): ICompleteSyncEvaluatorConfig {
    return {
      now: config.now || new Date(Date.now()),
      baseIRI: config.baseIRI || undefined,
      overloadCache: config.overloadCache,
      superTypeProvider: {
        cache: config.typeCache || new LRUCache(),
        discoverer: config.superTypeCallback || (() => 'term'),
      },
      // eslint-disable-next-line unicorn/no-useless-undefined
      extensionFunctionCreator: config.extensionFunctionCreator || (() => undefined),
      exists: config.exists,
      aggregate: config.aggregate,
      bnode: config.bnode,
    };
  }

  public constructor(public algExpr: Alg.Expression, public config: ISyncEvaluatorConfig = {}) {
    const context = SyncEvaluator.setDefaultsFromConfig(config);

    const transformer = new SyncAlgebraTransformer(context.superTypeProvider, {
      type: 'sync',
      creator: context.extensionFunctionCreator
    });
    this.expr = transformer.transformAlgebra(algExpr);

    this.evaluator = new SyncRecursiveEvaluator(context, transformer);
  }

  public evaluate(mapping: Bindings): RDF.Term {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public evaluateAsEBV(mapping: Bindings): boolean {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public evaluateAsInternal(mapping: Bindings): E.TermExpression {
    const result = this.evaluator.evaluate(this.expr, mapping);
    return result;
  }
}
