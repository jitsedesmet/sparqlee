import type * as RDF from '@rdfjs/types';
import { BaseAsyncAggregator } from './BaseAsyncAggregator';
import { BaseSyncAggregator } from './BaseSyncAggregator';

interface IExtremeState {
  extremeValue: number; term: RDF.Literal;
}
export class SyncMin extends BaseSyncAggregator<IExtremeState> {
  public init(start: RDF.Term): IExtremeState {
    const { value } = this.extractValue(null, start);
    if (start.termType === 'Literal') {
      return { extremeValue: value, term: start };
    }
  }

  public put(state: IExtremeState, term: RDF.Term): IExtremeState {
    const extracted = this.extractValue(state.term, term);
    if (extracted.value < state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  public result(state: IExtremeState): RDF.Term {
    return state.term;
  }
}

export class AsyncMin extends BaseAsyncAggregator<IExtremeState> {
  public async init(start: RDF.Term): Promise<IExtremeState> {
    const { value } = await this.extractValue(null, start);
    if (start.termType === 'Literal') {
      return { extremeValue: value, term: start };
    }
  }

  public async put(state: IExtremeState, term: RDF.Term): Promise<IExtremeState> {
    const extracted = await this.extractValue(state.term, term);
    if (extracted.value < state.extremeValue && term.termType === 'Literal') {
      return {
        extremeValue: extracted.value,
        term,
      };
    }
    return state;
  }

  public async result(state: IExtremeState): Promise<RDF.Term> {
    return state.term;
  }
}
