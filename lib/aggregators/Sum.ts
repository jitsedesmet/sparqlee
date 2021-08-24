import type * as RDF from '@rdfjs/types';
import type * as E from '../expressions';
import { regularFunctions } from '../functions';
import { integer } from '../functions/Helpers';
import * as C from '../util/Consts';
import { BaseSyncAggregator } from './BaseSyncAggregator';
import {BaseAsyncAggregator} from "./BaseAsyncAggregator";

type SumState = E.NumericLiteral;

export class SyncSum extends BaseSyncAggregator<SumState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public init(start: RDF.Term): SumState {
    return this.termToNumericOrError(start);
  }

  public put(state: SumState, term: RDF.Term): SumState {
    const internalTerm = this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> this.summer.applySync([ state, internalTerm ], this.config);
    return sum;
  }

  public result(state: SumState): RDF.Term {
    return state.toRDF();
  }
}

export class AsyncSum extends BaseAsyncAggregator<SumState> {
  private readonly summer = regularFunctions[C.RegularOperator.ADDITION];

  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public async init(start: RDF.Term): Promise<SumState> {
    return await this.termToNumericOrError(start);
  }

  public async put(state: SumState, term: RDF.Term): Promise<SumState> {
    const internalTerm = await this.termToNumericOrError(term);
    const sum = <E.NumericLiteral> await this.summer.applyAsync([ state, internalTerm ], this.config);
    return sum;
  }

  public async result(state: SumState): Promise<RDF.Term> {
    return state.toRDF();
  }
}

