import type * as RDF from '@rdfjs/types';
import * as RDFString from 'rdf-string';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import * as E from '../expressions';
import { AsyncNonLexicalLiteral } from '../expressions';
import { TypeURL as DT, TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import type { IAsyncSuperTypeProvider } from '../util/TypeHandling';
import { isSubTypeOfAsync } from '../util/TypeHandling';

export interface IAsyncTermTransformer {
  transformRDFTermUnsafe: (term: RDF.Term) => Promise<E.Term>;
  transformLiteral: (lit: RDF.Literal) => Promise<E.Literal<any>>;
}

export class AsyncTermTransformer implements IAsyncTermTransformer {
  public constructor(protected readonly superTypeProvider: IAsyncSuperTypeProvider) {
  }

  /**
   * Transforms an RDF term to the internal representation of a term,
   * assuming it is not a variable, which would be an expression (internally).
   *
   * @param term RDF term to transform into internal representation of a term
   */
  public async transformRDFTermUnsafe(term: RDF.Term): Promise<E.Term> {
    return <E.Term> await this.transformTerm({
      term,
      type: 'expression',
      expressionType: 'term',
    });
  }

  protected async transformTerm(term: Alg.TermExpression): Promise<E.Expression> {
    if (!term.term) {
      throw new Err.InvalidExpression(term);
    }

    switch (term.term.termType) {
      case 'Variable':
        return new E.Variable(RDFString.termToString(term.term));
      case 'Literal':
        return await this.transformLiteral(term.term);
      case 'NamedNode':
        return new E.NamedNode(term.term.value);
      case 'BlankNode':
        return new E.BlankNode(term.term.value);
      default:
        throw new Err.InvalidTermType(term);
    }
  }

  /**
   * @param lit the rdf literal we want to transform to an internal Literal expression.
   */
  public async transformLiteral(lit: RDF.Literal): Promise<E.Literal<any>> {
    // Both here and within the switch we transform to LangStringLiteral or StringLiteral.
    // We do this when we detect a simple literal being used.
    // Original issue regarding this behaviour: https://github.com/w3c/sparql-12/issues/112
    if (!lit.datatype || [ null, undefined, '' ].includes(lit.datatype.value)) {
      return lit.language ?
        new E.LangStringLiteral(lit.value, lit.language) :
        new E.StringLiteral(lit.value);
    }

    const dataType = lit.datatype.value;

    if (await isSubTypeOfAsync(dataType, TypeURL.XSD_STRING, this.superTypeProvider)) {
      return new E.StringLiteral(lit.value, dataType);
    }
    if (await isSubTypeOfAsync(dataType, DT.RDF_LANG_STRING, this.superTypeProvider)) {
      return new E.LangStringLiteral(lit.value, lit.language);
    }
    if (await isSubTypeOfAsync(dataType, DT.XSD_DATE_TIME, this.superTypeProvider)) {
      // It should be noted how we don't care if its a XSD_DATE_TIME_STAMP or not.
      // This is because sparql functions don't care about the timezone.
      // It's also doesn't break the specs because we keep the string representation stored,
      // that way we can always give it back. There are also no sparql functions that alter a date.
      // (So the representation initial representation always stays valid)
      // https://github.com/comunica/sparqlee/pull/103#discussion_r688462368
      const dateVal: Date = new Date(lit.value);
      if (Number.isNaN(dateVal.getTime())) {
        return await AsyncNonLexicalLiteral
          .createNonLexicalLiteral(undefined, dataType, this.superTypeProvider, lit.value);
      }
      return new E.DateTimeLiteral(new Date(lit.value), lit.value, dataType);
    }
    if (await isSubTypeOfAsync(dataType, DT.XSD_BOOLEAN, this.superTypeProvider)) {
      if (lit.value !== 'true' && lit.value !== 'false' && lit.value !== '1' && lit.value !== '0') {
        return await AsyncNonLexicalLiteral
          .createNonLexicalLiteral(undefined, dataType, this.superTypeProvider, lit.value);
      }
      return new E.BooleanLiteral(lit.value === 'true' || lit.value === '1', lit.value);
    }
    if (await isSubTypeOfAsync(dataType, DT.XSD_DECIMAL, this.superTypeProvider)) {
      const intVal: number = P.parseXSDDecimal(lit.value);
      if (intVal === undefined) {
        return await AsyncNonLexicalLiteral
          .createNonLexicalLiteral(undefined, dataType, this.superTypeProvider, lit.value);
      }
      if (await isSubTypeOfAsync(dataType, DT.XSD_INTEGER, this.superTypeProvider)) {
        return new E.IntegerLiteral(intVal, dataType, lit.value);
      }
      // If type is not an integer it's just a decimal.
      return new E.DecimalLiteral(intVal, dataType, lit.value);
    }
    const isFloat = await isSubTypeOfAsync(dataType, DT.XSD_FLOAT, this.superTypeProvider);
    const isDouble = await isSubTypeOfAsync(dataType, DT.XSD_DOUBLE, this.superTypeProvider);
    if (isFloat || isDouble) {
      const doubleVal: number = P.parseXSDFloat(lit.value);
      if (doubleVal === undefined) {
        return await AsyncNonLexicalLiteral
          .createNonLexicalLiteral(undefined, dataType, this.superTypeProvider, lit.value);
      }
      if (isFloat) {
        return new E.FloatLiteral(doubleVal, dataType, lit.value);
      }
      return new E.DoubleLiteral(doubleVal, dataType, lit.value);
    }
    return new E.Literal<string>(lit.value, dataType, lit.value);
  }
}
