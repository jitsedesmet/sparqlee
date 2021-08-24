import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type * as E from '../expressions';
import { SyncTermTransformer } from '../transformers/SyncTermTransformer';
import type { ISyncTermTransformer } from '../transformers/SyncTermTransformer';
import { TypeAlias } from '../util/Consts';
import {isSubTypeOfAsync, isSubTypeOfSync} from '../util/TypeHandling';
import {ICompleteAsyncEvaluatorConfig} from "../evaluators/evaluatorHelpers/AsyncRecursiveEvaluator";
import {AsyncTermTransformer, IAsyncTermTransformer} from "../transformers/AsyncTermTransformer";

export abstract class BaseAsyncAggregator<State> {
  protected distinct: boolean;
  protected separator: string;
  protected termTransformer: IAsyncTermTransformer;

  public constructor(expr: Algebra.AggregateExpression, protected config: ICompleteAsyncEvaluatorConfig) {
    this.distinct = expr.distinct;
    this.separator = expr.separator || ' ';
    this.termTransformer = new AsyncTermTransformer(config.superTypeProvider);
  }

  protected async termToNumericOrError(term: RDF.Term): Promise<E.NumericLiteral> {
    // TODO: Check behaviour
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !await isSubTypeOfAsync(term.datatype.value, TypeAlias.SPARQL_NUMERIC, this.config.superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> await this.termTransformer.transformLiteral(term);
  }

  protected async extractValue(extremeTerm: RDF.Literal, term: RDF.Term): Promise<{ value: any; type: string }> {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }

    const transformedLit = await this.termTransformer.transformLiteral(term);
    return { type: transformedLit.dataType, value: transformedLit.typedValue };
  }

  public static emptyValue(): RDF.Term {
    return undefined;
  }

  abstract init(start: RDF.Term): Promise<State>;

  abstract result(state: State): Promise<RDF.Term>;

  abstract put(state: State, bindings: RDF.Term): Promise<State>;
}
