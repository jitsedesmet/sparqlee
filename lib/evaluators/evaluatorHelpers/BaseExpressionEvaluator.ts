import type * as E from '../../expressions';
import type { Bindings } from '../../Types';

export class BaseExpressionEvaluator {
  protected term(expr: E.Term, mapping: Bindings): E.Term {
    return expr;
  }
}
