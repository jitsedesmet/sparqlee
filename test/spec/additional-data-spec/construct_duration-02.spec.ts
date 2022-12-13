import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('create duration', () => {
  /**
   * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
   * SELECT (xsd:duration(?literal) AS ?duration) WHERE {
   * 	VALUES ?literal {
   * 		"P"
   * 		"-P"
   * 		"PT"
   * 		"-PT"
   * 		"PS"
   * 		""
   * 		"T1S"
   * 	}
   * }
   */

  describe('respect the construct_duration-02 spec', () => {
    runTestTable({
      operation: 'xsd:date',
      arity: 1,
      notation: Notation.Function,
      testTable: `
        '"P"' = ''
        '"-P"' = ''
        '"PT"' = ''
        '"-PT"' = ''
        '"PS"' = ''
        '""' = ''
        '"T1S"' = ''
      `,
    });
  });

  /**
   * <?xml version="1.0" encoding="utf-8"?>
   * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
   * <head>
   *  <variable name="duration"/>
   * </head>
   * <results>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   *    <result></result>
   * </results>
   * </sparql>
   */
});
