import type * as RDF from '@rdfjs/types';
import { BaseAsyncAggregator } from './BaseAsyncAggregator';
import { BaseSyncAggregator } from './BaseSyncAggregator';

export class SyncSample extends BaseSyncAggregator<RDF.Term> {
  public init(start: RDF.Term): RDF.Term {
    return start;
  }

  public put(state: RDF.Term, term: RDF.Term): RDF.Term {
    // First value is our sample
    return state;
  }

  public result(state: RDF.Term): RDF.Term {
    return state;
  }
}

export class AsyncSample extends BaseAsyncAggregator<RDF.Term> {
  public async init(start: RDF.Term): Promise<RDF.Term> {
    return start;
  }

  public async put(state: RDF.Term, term: RDF.Term): Promise<RDF.Term> {
    // First value is our sample
    return state;
  }

  public async result(state: RDF.Term): Promise<RDF.Term> {
    return state;
  }
}
