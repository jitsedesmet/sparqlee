import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteAsyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type { IAsyncEvaluationContext, ISyncEvaluationContext } from '../evaluators/SharedEvaluationTypes';

export enum ExpressionType {
  Aggregate = 'aggregate',
  Existence = 'existence',
  Named = 'named',
  Operator = 'operator',
  SpecialOperator = 'specialOperator',
  Term = 'term',
  Variable = 'variable',
  AsyncExtension = 'asyncExtension',
  SyncExtension = 'syncExtension',
}

export type Expression =
  AggregateExpression |
  ExistenceExpression |
  NamedExpression |
  OperatorExpression |
  SpecialOperatorExpression |
  TermExpression |
  VariableExpression |
  AsyncExtensionExpression |
  SyncExtensionExpression;

export interface IExpressionProps {
  expressionType: ExpressionType;
}

export type AggregateExpression = IExpressionProps & {
  expressionType: ExpressionType.Aggregate;
  name: string;
  expression: Algebra.AggregateExpression;
};

export type ExistenceExpression = IExpressionProps & {
  expressionType: ExpressionType.Existence;
  expression: Algebra.ExistenceExpression;
};

export type NamedExpression = IExpressionProps & {
  expressionType: ExpressionType.Named;
  name: RDF.NamedNode;
  applySync: (context: ICompleteSyncEvaluatorConfig) => SimpleSyncApplication;
  applyAsync: (context: ICompleteAsyncEvaluatorConfig) => SimpleAsyncApplication;
  args: Expression[];
};

export type AsyncExtensionExpression = IExpressionProps & {
  expressionType: ExpressionType.AsyncExtension;
  name: RDF.NamedNode;
  apply: SimpleAsyncApplication;
  args: Expression[];
};

export type SyncExtensionExpression = IExpressionProps & {
  expressionType: ExpressionType.SyncExtension;
  name: RDF.NamedNode;
  apply: SimpleSyncApplication;
  args: Expression[];
};

export type OperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.Operator;
  args: Expression[];
  applySync: (context: ICompleteSyncEvaluatorConfig) => SimpleSyncApplication;
  applyAsync: (context: ICompleteAsyncEvaluatorConfig) => SimpleAsyncApplication;
};

export type SpecialOperatorExpression = IExpressionProps & {
  expressionType: ExpressionType.SpecialOperator;
  args: Expression[];
  applyAsync: SpecialApplicationAsync;
  applySync: SpecialApplicationSync;
};

// TODO: Create alias Term = TermExpression
export type TermType = 'namedNode' | 'literal' | 'blankNode';
export type TermExpression = IExpressionProps & {
  expressionType: ExpressionType.Term;
  termType: TermType;
  str: () => string;
  coerceEBV: () => boolean;
  toRDF: () => RDF.Term;
};

export type VariableExpression = IExpressionProps & {
  expressionType: ExpressionType.Variable;
  name: string;
};

// Export type Application = SimpleApplication | SpecialApplication;
export type SimpleSyncApplication = (args: TermExpression[]) => TermExpression;
export type SimpleAsyncApplication = (args: TermExpression[]) => Promise<TermExpression>;

export type SpecialApplicationAsync = (context: IAsyncEvaluationContext) => Promise<TermExpression>;

export type SpecialApplicationSync = (context: ISyncEvaluationContext) => TermExpression;
