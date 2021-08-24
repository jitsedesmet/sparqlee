import type * as RDF from '@rdfjs/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../../expressions';
import type { SyncExtension } from '../../expressions';
import type { ISyncTermTransformer } from '../../transformers/SyncTermTransformer';
import { SyncTermTransformer } from '../../transformers/SyncTermTransformer';
import type { Bindings, IExpressionEvaluator } from '../../Types';
import * as Err from '../../util/Errors';
import type { ISyncSuperTypeProvider } from '../../util/TypeHandling';
import type { ICompleteSharedConfig, ISyncEvaluationContext } from '../SharedEvaluationTypes';
import type { SyncExtensionFunctionCreator } from '../SyncEvaluator';
import { BaseExpressionEvaluator } from './BaseExpressionEvaluator';

export interface ICompleteSyncEvaluatorConfig extends ICompleteSharedConfig {
  exists?: (expression: Alg.ExistenceExpression, mapping: Bindings) => boolean;
  aggregate?: (expression: Alg.AggregateExpression) => RDF.Term;
  bnode?: (input?: string) => RDF.BlankNode;
  extensionFunctionCreator?: SyncExtensionFunctionCreator;
  superTypeProvider: ISyncSuperTypeProvider;
}

export class SyncRecursiveEvaluator extends BaseExpressionEvaluator
  implements IExpressionEvaluator<E.Expression, E.Term> {
  protected readonly termTransformer: ISyncTermTransformer;
  private readonly subEvaluators: Record<string, (expr: E.Expression, mapping: Bindings) => E.Term> = {
    // Shared
    [E.ExpressionType.Term]: this.term.bind(this),

    // Sync
    [E.ExpressionType.Variable]: this.variable.bind(this),
    [E.ExpressionType.Operator]: this.evalOperator.bind(this),
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator.bind(this),
    [E.ExpressionType.Named]: this.evalNamed.bind(this),
    [E.ExpressionType.Existence]: this.evalExistence.bind(this),
    [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
    [E.ExpressionType.SyncExtension]: this.evalSyncExtension.bind(this),
  };

  public constructor(private readonly context: ICompleteSyncEvaluatorConfig, termTransformer?: ISyncTermTransformer) {
    super();
    this.termTransformer = termTransformer || new SyncTermTransformer(context.superTypeProvider);
  }

  protected variable(expr: E.Variable, mapping: Bindings): E.Term {
    const term = mapping.get(expr.name);
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return this.termTransformer.transformRDFTermUnsafe(term);
  }

  public evaluate(expr: E.Expression, mapping: Bindings): E.Term {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private evalOperator(expr: E.Operator, mapping: Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.applySync(this.context)(args);
  }

  private evalSpecialOperator(expr: E.SpecialOperator, mapping: Bindings): E.Term {
    const evaluate = this.evaluate.bind(this);
    const context: ISyncEvaluationContext = {
      args: expr.args,
      mapping,
      evaluate,
      ...this.context,
    };
    return expr.applySync(context);
  }

  private evalNamed(expr: E.Named, mapping: Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.applySync(this.context)(args);
  }

  private evalSyncExtension(expr: SyncExtension, mapping: Bindings): E.Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalExistence(expr: E.Existence, mapping: Bindings): E.Term {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(this.context.exists(expr.expression, mapping));
  }

  private evalAggregate(expr: E.Aggregate, mapping: Bindings): E.Term {
    if (!this.context.aggregate) {
      throw new Err.NoAggregator();
    }

    return this.termTransformer.transformRDFTermUnsafe(this.context.aggregate(expr.expression));
  }
}
