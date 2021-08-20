import type { IFunctionContext } from '../../../lib/functions';
import type { Builder } from '../../../lib/functions/Helpers';
import { bool, declare } from '../../../lib/functions/Helpers';
import { TypeURL } from '../../../lib/util/Consts';
import { getDefaultFunctionContext } from '../../util/utils';
import fn = jest.fn;
import mock = jest.mock;

describe('The function helper file', () => {
  describe('has a builder', () => {
    let builder: Builder;
    let functionConfig: IFunctionContext;
    beforeEach(() => {
      builder = declare('non cacheable');
      functionConfig = getDefaultFunctionContext();
    });

    it('can only be collected once', () => {
      builder.collect();
      expect(() => builder.collect()).toThrow('only be collected once');
    });

    it('throws error when copy is not possible', () => {
      expect(() =>
        builder.copy({ from: [ 'term' ], to: [ TypeURL.XSD_STRING ]})).toThrow('types not found');
    });

    it('defines a function onUnaryTyped', () => {
      const func = fn();
      const args = [ bool(true) ];
      builder.onUnaryTyped(TypeURL.XSD_BOOLEAN, () => func).collect()
        .search(args, functionConfig.openWorldEnabler)(functionConfig)(args);
      expect(func).toBeCalledTimes(1);
    });

    it('defines a function onBoolean1', () => {
      const func = fn();
      const args = [ bool(true) ];
      builder.onBoolean1(() => func).collect().search(args, functionConfig.openWorldEnabler)(functionConfig)(args);
      expect(func).toBeCalledTimes(1);
    });
  });
});
