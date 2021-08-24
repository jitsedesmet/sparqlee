import type * as RDF from '@rdfjs/types';
import * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';
import { BaseAsyncAggregator } from './BaseAsyncAggregator';
import { BaseSyncAggregator } from './BaseSyncAggregator';

interface IAverageState {
  sum: E.NumericLiteral;
  count: number;
}

export class SyncAverage extends BaseSyncAggregator<IAverageState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public init(start: RDF.Term): IAverageState {
    const sum = this.termToNumericOrError(start);
    return { sum, count: 1 };
  }

  public put(state: IAverageState, term: RDF.Term): IAverageState {
    const internalTerm = this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> this.summer.applySync([ state.sum, internalTerm ], this.config);
    return {
      sum,
      count: state.count + 1,
    };
  }

  public result(state: IAverageState): RDF.Term {
    const count = new E.IntegerLiteral(state.count);
    const result = this.divider.applySync([ state.sum, count ], this.config);
    return result.toRDF();
  }
}

export class AsyncAverage extends BaseAsyncAggregator<IAverageState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];
  private readonly divider = regularFunctions[C.RegularOperator.DIVISION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public async init(start: RDF.Term): Promise<IAverageState> {
    const sum = await this.termToNumericOrError(start);
    return { sum, count: 1 };
  }

  public async put(state: IAverageState, term: RDF.Term): Promise<IAverageState> {
    const internalTerm = await this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> await this.summer.applyAsync([ state.sum, internalTerm ], this.config);
    return {
      sum,
      count: state.count + 1,
    };
  }

  public async result(state: IAverageState): Promise<RDF.Term> {
    const count = new E.IntegerLiteral(state.count);
    const result = await this.divider.applyAsync([ state.sum, count ], this.config);
    return result.toRDF();
  }
}
