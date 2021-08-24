import type * as RDF from '@rdfjs/types';
import { string } from '../functions/Helpers';
import { BaseSyncAggregator } from './BaseSyncAggregator';
import {BaseAsyncAggregator} from "./BaseAsyncAggregator";

// TODO: can we get rid of this duplication?

export class SyncGroupConcat extends BaseSyncAggregator<string> {
  public static emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public init(start: RDF.Term): string {
    return start.value;
  }

  public put(state: string, term: RDF.Term): string {
    return state + this.separator + term.value;
  }

  public result(state: string): RDF.Term {
    return string(state).toRDF();
  }
}

export class AsyncGroupConcat extends BaseAsyncAggregator<string> {
  public static emptyValue(): RDF.Term {
    return string('').toRDF();
  }

  public async init(start: RDF.Term): Promise<string> {
    return start.value;
  }

  public async put(state: string, term: RDF.Term): Promise<string> {
    return state + this.separator + term.value;
  }

  public async result(state: string): Promise<RDF.Term> {
    return string(state).toRDF();
  }
}
