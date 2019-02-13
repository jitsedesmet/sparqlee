import * as RDFDM from '@rdfjs/data-model';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions/Expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';

import { transformAlgebra, transformTerm } from '../Transformation';
import { Bindings, Hooks } from '../Types';

type Expression = E.Expression;
type Term = E.TermExpression;
type Variable = E.VariableExpression;
type Existence = E.ExistenceExpression;
type Operator = E.OperatorExpression;
type SpecialOperator = E.SpecialOperatorExpression;
type Named = E.NamedExpression;
type Aggregate = E.AggregateExpression;

export class AsyncEvaluator {
  private expr: Expression;

  constructor(public algExpr: Alg.Expression, public hooks: Hooks = {}) {
    this.expr = transformAlgebra(algExpr, hooks);
  }

  async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evalRecursive(this.expr, mapping);
    return log(result).toRDF();
  }

  async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evalRecursive(this.expr, mapping);
    return log(result).coerceEBV();
  }

  async evaluateAsInternal(mapping: Bindings): Promise<Term> {
    return this.evalRecursive(this.expr, mapping);
  }

  // tslint:disable-next-line:member-ordering
  private readonly evaluators: {
    [key: string]: (expr: Expression, mapping: Bindings) => Promise<Term>;
  } = {
      [E.ExpressionType.Term]: this.evalTerm,
      [E.ExpressionType.Variable]: this.evalVariable,
      [E.ExpressionType.Operator]: this.evalOperator,
      [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator,
      [E.ExpressionType.Named]: this.evalNamed,
      [E.ExpressionType.Existence]: this.evalExistence,
      [E.ExpressionType.Aggregate]: this.evalAggregate,
    };

  private async evalRecursive(expr: Expression, mapping: Bindings): Promise<Term> {
    const evaluator = this.evaluators[expr.expressionType];
    if (!evaluator) { throw new Err.InvalidExpressionType(expr); }
    return evaluator.bind(this)(expr, mapping);
  }

  private async evalTerm(expr: Term, mapping: Bindings): Promise<Term> {
    return expr;
  }

  private async evalVariable(expr: Variable, mapping: Bindings): Promise<Term> {
    const term = mapping.get(expr.name);

    if (!term) { throw new Err.UnboundVariableError(expr.name, mapping); }

    return transformTerm({
      term,
      type: 'expression',
      expressionType: 'term',
    }) as Term;
  }

  private async evalOperator(expr: Operator, mapping: Bindings): Promise<Term> {
    const argPromises = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  private async evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Promise<Term> {
    const evaluate = this.evalRecursive.bind(this);
    const context = { args: expr.args, mapping, evaluate };
    return expr.applyAsync(context);
  }

  private async evalNamed(expr: Named, mapping: Bindings): Promise<Term> {
    const argPromises = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  private async evalExistence(expr: Existence, mapping: Bindings): Promise<Term> {
    const result = await expr.exists_with(mapping);
    return transformTerm({
      term: RDFDM.literal(result.toString(), C.make(C.TypeURL.XSD_BOOLEAN)),
      expressionType: 'term',
      type: 'expression',
    }) as Term;
  }

  private async evalAggregate(expr: Aggregate, _mapping: Bindings): Promise<Term> {
    const result = await expr.aggregate();
    return transformTerm({
      type: 'expression',
      expressionType: 'term',
      term: result,
    }) as Term;
  }
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}