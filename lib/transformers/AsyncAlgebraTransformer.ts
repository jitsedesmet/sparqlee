import { Algebra as Alg } from 'sparqlalgebrajs';
import type { AsyncExtensionFunction, AsyncExtensionFunctionCreator } from '../evaluators/AsyncEvaluator';
import type { SyncExtensionFunction } from '../evaluators/SyncEvaluator';
import type { SimpleAsyncApplication, SimpleSyncApplication } from '../expressions';
import * as E from '../expressions';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import { ExtensionFunctionError } from '../util/Errors';
import type { IAsyncSuperTypeProvider } from '../util/TypeHandling';
import type { IAsyncTermTransformer } from './AsyncTermTransformer';
import { AsyncTermTransformer } from './AsyncTermTransformer';
import { BaseAlgebraTransformer } from './BaseAlgebraTransformer';

export interface IAsyncAlgebraTransformer extends IAsyncTermTransformer {
  transformAlgebra: (expr: Alg.Expression) => Promise<E.Expression>;
}

export class AsyncAlgebraTransformer extends AsyncTermTransformer implements IAsyncAlgebraTransformer {
  public constructor(superTypeProvider: IAsyncSuperTypeProvider,
    private readonly creator: AsyncExtensionFunctionCreator) {
    super(superTypeProvider);
  }

  public async transformAlgebra(expr: Alg.Expression): Promise<E.Expression> {
    if (!expr) {
      throw new Err.InvalidExpression(expr);
    }
    const types = Alg.expressionTypes;

    switch (expr.expressionType) {
      case types.TERM:
        return await this.transformTerm(<Alg.TermExpression>expr);
      case types.OPERATOR:
        return this.transformOperator(<Alg.OperatorExpression>expr);
      case types.NAMED:
        return this.transformNamed(<Alg.NamedExpression>expr);
      case types.EXISTENCE:
        return BaseAlgebraTransformer.transformExistence(<Alg.ExistenceExpression>expr);
      case types.AGGREGATE:
        return BaseAlgebraTransformer.transformAggregate(<Alg.AggregateExpression>expr);
      case types.WILDCARD:
        return BaseAlgebraTransformer.transformWildcard(<Alg.WildcardExpression>expr);
      default:
        throw new Err.InvalidExpressionType(expr);
    }
  }

  private async transformOperator(expr: Alg.OperatorExpression):
  Promise<E.OperatorExpression | E.SpecialOperatorExpression> {
    if (C.SpecialOperators.has(expr.operator)) {
      const specialOp = <C.SpecialOperator>expr.operator;
      const specialArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
      const specialFunc = specialFunctions[specialOp];
      if (!specialFunc.checkArity(specialArgs)) {
        throw new Err.InvalidArity(specialArgs, specialOp);
      }
      return new E.SpecialOperator(specialArgs, specialFunc.applyAsync, specialFunc.applySync);
    }
    if (!C.Operators.has(expr.operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const regularOp = <C.RegularOperator>expr.operator;
    const regularArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    const regularFunc = regularFunctions[regularOp];
    if (!BaseAlgebraTransformer.hasCorrectArity(regularArgs, regularFunc.arity)) {
      throw new Err.InvalidArity(regularArgs, regularOp);
    }
    return new E.Operator(
      regularArgs,
      context => args => regularFunc.applySync(args, context),
      context => args => regularFunc.applyAsync(args, context),
    );
  }

  private wrapAsyncFunction(func: AsyncExtensionFunction, name: string): SimpleAsyncApplication {
    return async args => {
      try {
        const res = await func(args.map(arg => arg.toRDF()));
        return this.transformRDFTermUnsafe(res);
      } catch (error: unknown) {
        throw new ExtensionFunctionError(name, error);
      }
    };
  }

  // TODO: Support passing functions to override default behaviour;
  private async transformNamed(expr: Alg.NamedExpression):
  Promise<E.NamedExpression | E.AsyncExtensionExpression | E.SyncExtensionExpression> {
    const funcName = expr.name.value;
    const namedArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    if (C.NamedOperators.has(<C.NamedOperator>funcName)) {
      // Return a basic named expression
      const op = <C.NamedOperator>expr.name.value;
      const namedFunc = namedFunctions[op];
      return new E.Named(
        expr.name,
        namedArgs,
        context => args => namedFunc.applySync(args, context),
        context => args => namedFunc.applyAsync(args, context),
      );
    }
    // The expression might be an extension function
    const asyncExtensionFunc = this.creator(expr.name);
    if (asyncExtensionFunc) {
      const asyncAppl = this.wrapAsyncFunction(asyncExtensionFunc, expr.name.value);
      return new E.AsyncExtension(expr.name, namedArgs, asyncAppl);
    }
    throw new Err.UnknownNamedOperator(expr.name.value);
  }
}
