import type * as RDF from '@rdfjs/types';
import { integer } from '../functions/Helpers';
import { BaseSyncAggregator } from './BaseSyncAggregator';
import {BaseAsyncAggregator} from "./BaseAsyncAggregator";

// TODO: can we get rid of this duplication?

export class SyncCount extends BaseSyncAggregator<number> {
  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public init(start: RDF.Term): number {
    return 1;
  }

  public put(state: number, term: RDF.Term): number {
    return state + 1;
  }

  public result(state: number): RDF.Term {
    return integer(state).toRDF();
  }
}

export class AsyncCount extends BaseAsyncAggregator<number> {
  public static emptyValue(): RDF.Term {
    return integer(0).toRDF();
  }

  public async init(start: RDF.Term): Promise<number> {
    return 1;
  }

  public async put(state: number, term: RDF.Term): Promise<number> {
    return state + 1;
  }

  public async result(state: number): Promise<RDF.Term> {
    return integer(state).toRDF();
  }
}
