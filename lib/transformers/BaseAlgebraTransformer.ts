import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../expressions';
import * as Err from '../util/Errors';

export class BaseAlgebraTransformer {
  public static transformWildcard(term: Alg.WildcardExpression): E.Expression {
    if (!term.wildcard) {
      throw new Err.InvalidExpression(term);
    }

    return new E.NamedNode(term.wildcard.value);
  }

  public static hasCorrectArity(args: E.Expression[], arity: number | number[]): boolean {
    // Infinity is used to represent var-args, so it's always correct.
    if (arity === Number.POSITIVE_INFINITY) {
      return true;
    }

    // If the function has overloaded arity, the actual arity needs to be present.
    if (Array.isArray(arity)) {
      return arity.includes(args.length);
    }

    return args.length === arity;
  }

  public static transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
    const name = expr.aggregator;
    return new E.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): E.Existence {
    return new E.Existence(expr);
  }
}
