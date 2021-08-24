import type { ICompleteAsyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type {
  Expression,
  OperatorExpression, SimpleAsyncApplication,
  SimpleSyncApplication,
} from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class Operator implements OperatorExpression {
  public expressionType: ExpressionType.Operator = ExpressionType.Operator;

  public constructor(
    public args: Expression[],
    public applySync: (context: ICompleteSyncEvaluatorConfig) => SimpleSyncApplication,
    public applyAsync: (context: ICompleteAsyncEvaluatorConfig) => SimpleAsyncApplication,
  ) { }
}
