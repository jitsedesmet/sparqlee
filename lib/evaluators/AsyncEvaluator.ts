import type * as RDF from '@rdfjs/types';
import * as LRUCache from 'lru-cache';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions/Expressions';
import { AsyncAlgebraTransformer } from '../transformers/AsyncAlgebraTransformer';
import { SyncAlgebraTransformer } from '../transformers/SyncAlgebraTransformer';
import type { Bindings, IExpressionEvaluator } from '../Types';
import type { AsyncSuperTypeCallback } from '../util/TypeHandling';
import type { ICompleteAsyncEvaluatorConfig } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import { AsyncRecursiveEvaluator } from './evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ISharedConfig } from './SharedEvaluationTypes';

export type AsyncExtensionFunction = (args: RDF.Term[]) => Promise<RDF.Term>;
export type AsyncExtensionFunctionCreator = (functionNamedNode: RDF.NamedNode) => AsyncExtensionFunction | undefined;

export interface IAsyncEvaluatorConfig extends ISharedConfig {
  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode?: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  superTypeCallback?: AsyncSuperTypeCallback;
}

export class AsyncEvaluator {
  private readonly expr: E.Expression;
  private readonly evaluator: IExpressionEvaluator<E.Expression, Promise<E.TermExpression>>;

  public static setDefaultsFromConfig(config: IAsyncEvaluatorConfig): ICompleteAsyncEvaluatorConfig {
    return {
      now: config.now || new Date(Date.now()),
      baseIRI: config.baseIRI || undefined,
      overloadCache: config.overloadCache,
      superTypeProvider: {
        cache: config.typeCache || new LRUCache(),
        discoverer: config.superTypeCallback || (async() => 'term'),
      },
      // eslint-disable-next-line unicorn/no-useless-undefined
      extensionFunctionCreator: config.extensionFunctionCreator || (() => undefined),
      exists: config.exists,
      aggregate: config.aggregate,
      bnode: config.bnode,
    };
  }

  public constructor(public algExpr: Alg.Expression, config: IAsyncEvaluatorConfig = {}, createOptions?: {
    expr: E.Expression; transformer: AsyncAlgebraTransformer; context: ICompleteAsyncEvaluatorConfig;
  }) {
    const context = createOptions ? createOptions.context : AsyncEvaluator.setDefaultsFromConfig(config);

    if (createOptions) {
      this.expr = createOptions.expr;
    } else {
      const transformer = new SyncAlgebraTransformer({
        cache: context.superTypeProvider.cache,
        discoverer: () => 'term',
      }, {
        creator: context.extensionFunctionCreator,
        type: 'async',
      });
      this.expr = transformer.transformAlgebra(algExpr);
    }

    this.evaluator = new AsyncRecursiveEvaluator(context, createOptions?.transformer);
  }

  public static async create(algExpr: Alg.Expression, config: IAsyncEvaluatorConfig = {}):
  Promise<AsyncEvaluator> {
    const context = AsyncEvaluator.setDefaultsFromConfig(config);

    const transformer = new AsyncAlgebraTransformer(context.superTypeProvider, context.extensionFunctionCreator);
    const expr = await transformer.transformAlgebra(algExpr);

    return new AsyncEvaluator(algExpr, {}, { transformer, expr, context });
  }

  public async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.toRDF();
  }

  public async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result.coerceEBV();
  }

  public async evaluateAsInternal(mapping: Bindings): Promise<E.TermExpression> {
    const result = await this.evaluator.evaluate(this.expr, mapping);
    return result;
  }
}
