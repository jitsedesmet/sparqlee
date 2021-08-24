import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../../expressions';
import type { AsyncExtension } from '../../expressions';
import type { IAsyncTermTransformer } from '../../transformers/AsyncTermTransformer';
import { AsyncTermTransformer } from '../../transformers/AsyncTermTransformer';
import type { Bindings, IExpressionEvaluator } from '../../Types';
import * as Err from '../../util/Errors';
import type { IAsyncSuperTypeProvider } from '../../util/TypeHandling';
import type { AsyncExtensionFunctionCreator } from '../AsyncEvaluator';
import type { IAsyncEvaluationContext, ICompleteSharedConfig } from '../SharedEvaluationTypes';
import { BaseExpressionEvaluator } from './BaseExpressionEvaluator';

export interface ICompleteAsyncEvaluatorConfig extends ICompleteSharedConfig {
  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => Promise<boolean>;
  aggregate?: (expression: Alg.AggregateExpression) => Promise<RDF.Term>;
  bnode?: (input?: string) => Promise<RDF.BlankNode>;
  extensionFunctionCreator?: AsyncExtensionFunctionCreator;
  superTypeProvider: IAsyncSuperTypeProvider;
}

export class AsyncRecursiveEvaluator extends BaseExpressionEvaluator
  implements IExpressionEvaluator<E.Expression, Promise<E.Term>> {
  protected readonly termTransformer: IAsyncTermTransformer;
  private readonly subEvaluators: Record<string, (expr: E.Expression, mapping: Bindings) =>
  Promise<E.Term> | E.Term> = {
    // Shared
    [E.ExpressionType.Term]: this.term.bind(this),

    // Async
    [E.ExpressionType.Variable]: this.variable.bind(this),
    [E.ExpressionType.Operator]: this.evalOperator.bind(this),
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator.bind(this),
    [E.ExpressionType.Named]: this.evalNamed.bind(this),
    [E.ExpressionType.Existence]: this.evalExistence.bind(this),
    [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
    [E.ExpressionType.AsyncExtension]: this.evalAsyncExtension.bind(this),
  };

  public constructor(private readonly context: ICompleteAsyncEvaluatorConfig, termTransformer?: IAsyncTermTransformer) {
    super();
    this.termTransformer = termTransformer || new AsyncTermTransformer(context.superTypeProvider);
  }

  protected variable(expr: E.Variable, mapping: Bindings): Promise<E.Term> {
    const term = mapping.get(expr.name);
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.termTransformer.transformRDFTermUnsafe(term);
  }

  public async evaluate(expr: E.Expression, mapping: Bindings): Promise<E.Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private async evalOperator(expr: E.Operator, mapping: Bindings): Promise<E.Term> {
    const argPromises = expr.args.map(arg => this.evaluate(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return await expr.applyAsync(this.context)(argResults);
  }

  private async evalSpecialOperator(expr: E.SpecialOperator, mapping: Bindings): Promise<E.Term> {
    const evaluate = this.evaluate.bind(this);
    const context: IAsyncEvaluationContext = {
      args: expr.args,
      mapping,
      evaluate,
      ...this.context,
    };
    return expr.applyAsync(context);
  }

  private async _evalAsyncArgs(args: E.Expression[], mapping: Bindings): Promise<E.TermExpression[]> {
    const argPromises = args.map(arg => this.evaluate(arg, mapping));
    return await Promise.all(argPromises);
  }

  private async evalNamed(expr: E.Named, mapping: Bindings): Promise<E.Term> {
    return await expr.applyAsync(this.context)(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalAsyncExtension(expr: AsyncExtension, mapping: Bindings): Promise<E.Term> {
    return await expr.apply(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalExistence(expr: E.Existence, mapping: Bindings): Promise<E.Term> {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(await this.context.exists(expr.expression, mapping));
  }

  // TODO: Remove?
  private async evalAggregate(expr: E.Aggregate, _mapping: Bindings): Promise<E.Term> {
    if (!this.context.aggregate) {
      throw new Err.NoExistenceHook();
    }

    return this.termTransformer.transformRDFTermUnsafe(await this.context.aggregate(expr.expression));
  }
}
