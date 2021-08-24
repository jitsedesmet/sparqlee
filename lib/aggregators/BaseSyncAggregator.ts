import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ICompleteSyncEvaluatorConfig } from '../evaluators/evaluatorHelpers/SyncRecursiveEvaluator';
import type * as E from '../expressions';
import { SyncTermTransformer } from '../transformers/SyncTermTransformer';
import type { ISyncTermTransformer } from '../transformers/SyncTermTransformer';
import { TypeAlias } from '../util/Consts';
import { isSubTypeOfSync } from '../util/TypeHandling';

export abstract class BaseSyncAggregator<State> {
  protected distinct: boolean;
  protected separator: string;
  protected termTransformer: ISyncTermTransformer;

  public constructor(expr: Algebra.AggregateExpression, protected config: ICompleteSyncEvaluatorConfig) {
    this.distinct = expr.distinct;
    this.separator = expr.separator || ' ';
    this.termTransformer = new SyncTermTransformer(config.superTypeProvider);
  }

  protected termToNumericOrError(term: RDF.Term): E.NumericLiteral {
    // TODO: Check behaviour
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    } else if (
      !isSubTypeOfSync(term.datatype.value, TypeAlias.SPARQL_NUMERIC, this.config.superTypeProvider)
    ) {
      throw new Error(`Term datatype ${term.datatype.value} with value ${term.value} has type ${term.termType} and is not a numeric literal`);
    }
    return <E.NumericLiteral> this.termTransformer.transformLiteral(term);
  }

  protected extractValue(extremeTerm: RDF.Literal, term: RDF.Term): { value: any; type: string } {
    if (term.termType !== 'Literal') {
      throw new Error(`Term with value ${term.value} has type ${term.termType} and is not a literal`);
    }

    const transformedLit = this.termTransformer.transformLiteral(term);
    return { type: transformedLit.dataType, value: transformedLit.typedValue };
  }

  public static emptyValue(): RDF.Term {
    return undefined;
  }

  abstract init(start: RDF.Term): State;

  abstract result(state: State): RDF.Term;

  abstract put(state: State, bindings: RDF.Term): State;
}
