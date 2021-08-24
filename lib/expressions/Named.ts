import type * as RDF from '@rdfjs/types';

import type { ICompleteAsyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/AsyncRecursiveEvaluator';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type {
  Expression,
  NamedExpression, SimpleAsyncApplication,
  SimpleSyncApplication,
} from './Expressions';
import {
  ExpressionType,
} from './Expressions';

export class Named implements NamedExpression {
  public expressionType: ExpressionType.Named = ExpressionType.Named;

  public constructor(
    public name: RDF.NamedNode,
    public args: Expression[],
    public applySync: (context: ICompleteSyncEvaluatorConfig) => SimpleSyncApplication,
    public applyAsync: (context: ICompleteAsyncEvaluatorConfig) => SimpleAsyncApplication,
  ) { }
}
