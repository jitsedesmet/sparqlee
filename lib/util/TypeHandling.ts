import type * as LRUCache from 'lru-cache';
import type { KnownLiteralTypes } from './Consts';
import { TypeAlias, TypeURL } from './Consts';

export type OverrideType = KnownLiteralTypes | 'term';

/**
 * Types that are not mentioned just map to 'term'.
 * When editing this, make sure type promotion and substituion don't start interfering.
 * e.g. when saying something like string -> stringly -> anyUri -> term.
 * This would make substitution on types that promote to each other possible. We and the specs don't want that!
 * A DAG will be created based on this. Make sure it doesn't have any cycles!
 */
export const extensionTableInput: Record<KnownLiteralTypes, OverrideType> = {
  // Datetime types
  [TypeURL.XSD_DATE_TIME_STAMP]: TypeURL.XSD_DATE_TIME,

  // Duration types
  [TypeURL.XSD_DAYTIME_DURATION]: TypeURL.XSD_DURATION,
  [TypeURL.XSD_YEAR_MONTH_DURATION]: TypeURL.XSD_DURATION,

  // Stringly types
  [TypeURL.RDF_LANG_STRING]: TypeAlias.SPARQL_STRINGLY,
  [TypeURL.XSD_STRING]: TypeAlias.SPARQL_STRINGLY,

  // String types
  [TypeURL.XSD_NORMALIZED_STRING]: TypeURL.XSD_STRING,
  [TypeURL.XSD_TOKEN]: TypeURL.XSD_NORMALIZED_STRING,
  [TypeURL.XSD_LANGUAGE]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NM_TOKEN]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NAME]: TypeURL.XSD_TOKEN,
  [TypeURL.XSD_NC_NAME]: TypeURL.XSD_NAME,
  [TypeURL.XSD_ENTITY]: TypeURL.XSD_NC_NAME,
  [TypeURL.XSD_ID]: TypeURL.XSD_NC_NAME,
  [TypeURL.XSD_ID_REF]: TypeURL.XSD_NC_NAME,

  // Numeric types
  // https://www.w3.org/TR/sparql11-query/#operandDataTypes
  // > numeric denotes typed literals with datatypes xsd:integer, xsd:decimal, xsd:float, and xsd:double
  [TypeURL.XSD_DOUBLE]: TypeAlias.SPARQL_NUMERIC,
  [TypeURL.XSD_FLOAT]: TypeAlias.SPARQL_NUMERIC,
  [TypeURL.XSD_DECIMAL]: TypeAlias.SPARQL_NUMERIC,

  // Decimal types
  [TypeURL.XSD_INTEGER]: TypeURL.XSD_DECIMAL,

  [TypeURL.XSD_NON_POSITIVE_INTEGER]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_NEGATIVE_INTEGER]: TypeURL.XSD_NON_POSITIVE_INTEGER,

  [TypeURL.XSD_LONG]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_INT]: TypeURL.XSD_LONG,
  [TypeURL.XSD_SHORT]: TypeURL.XSD_INT,
  [TypeURL.XSD_BYTE]: TypeURL.XSD_SHORT,

  [TypeURL.XSD_NON_NEGATIVE_INTEGER]: TypeURL.XSD_INTEGER,
  [TypeURL.XSD_POSITIVE_INTEGER]: TypeURL.XSD_NON_NEGATIVE_INTEGER,
  [TypeURL.XSD_UNSIGNED_LONG]: TypeURL.XSD_NON_NEGATIVE_INTEGER,
  [TypeURL.XSD_UNSIGNED_INT]: TypeURL.XSD_UNSIGNED_LONG,
  [TypeURL.XSD_UNSIGNED_SHORT]: TypeURL.XSD_UNSIGNED_INT,
  [TypeURL.XSD_UNSIGNED_BYTE]: TypeURL.XSD_UNSIGNED_SHORT,

  [TypeURL.XSD_DATE_TIME]: 'term',
  [TypeURL.XSD_BOOLEAN]: 'term',
  [TypeURL.XSD_DATE]: 'term',
  [TypeURL.XSD_DURATION]: 'term',
  [TypeAlias.SPARQL_NUMERIC]: 'term',
  [TypeAlias.SPARQL_STRINGLY]: 'term',
  [TypeAlias.SPARQL_NON_LEXICAL]: 'term',
  [TypeURL.XSD_ANY_URI]: 'term',
};
type SuperTypeDict = Record<KnownLiteralTypes, number> & { __depth: number };
type SuperTypeDictTable = Record<KnownLiteralTypes, SuperTypeDict>;
export type GeneralSuperTypeDict = Record<string, number> & { __depth: number };
export let superTypeDictTable: SuperTypeDictTable;

/**
 * This will return the super types of a type and cache them.
 * @param type IRI we will decide the super types of.
 * @param superTypeProvider the enabler that provides a way to find super types.
 */
export function getSuperTypesSync(type: string, superTypeProvider: ISyncSuperTypeProvider): GeneralSuperTypeDict {
  const cached = superTypeProvider.cache.get(type);
  if (cached) {
    return cached;
  }
  const value = superTypeProvider.discoverer(type);
  if (value === 'term') {
    const res: GeneralSuperTypeDict = Object.create(null);
    res.__depth = 0;
    res[type] = 0;
    superTypeProvider.cache.set(type, res);
    return res;
  }
  let subExtension: GeneralSuperTypeDict;
  const knownValue = isKnownLiteralType(value);
  if (knownValue) {
    subExtension = { ...superTypeDictTable[knownValue] };
  } else {
    subExtension = { ...getSuperTypesSync(value, superTypeProvider) };
  }
  subExtension.__depth++;
  subExtension[type] = subExtension.__depth;
  superTypeProvider.cache.set(type, subExtension);
  return subExtension;
}

export async function getSuperTypesAsync(type: string, superTypeProvider: IAsyncSuperTypeProvider):
Promise<GeneralSuperTypeDict> {
  const cached = superTypeProvider.cache.get(type);
  if (cached) {
    return cached;
  }
  const value = await superTypeProvider.discoverer(type);
  if (value === 'term') {
    const res: GeneralSuperTypeDict = Object.create(null);
    res.__depth = 0;
    res[type] = 0;
    superTypeProvider.cache.set(type, res);
    return res;
  }
  let subExtension: GeneralSuperTypeDict;
  const knownValue = isKnownLiteralType(value);
  if (knownValue) {
    subExtension = { ...superTypeDictTable[knownValue] };
  } else {
    subExtension = { ...await getSuperTypesAsync(value, superTypeProvider) };
  }
  subExtension.__depth++;
  subExtension[type] = subExtension.__depth;
  superTypeProvider.cache.set(type, subExtension);
  return subExtension;
}

// No circular structure allowed! & No other keys allowed!
export function extensionTableInit(): void {
  const res: SuperTypeDictTable = Object.create(null);
  for (const [ _key, value ] of Object.entries(extensionTableInput)) {
    const key = <KnownLiteralTypes>_key;
    if (res[key]) {
      continue;
    }
    extensionTableBuilderInitKey(key, value, res);
  }
  superTypeDictTable = res;
}
extensionTableInit();

function extensionTableBuilderInitKey(key: KnownLiteralTypes, value: OverrideType, res: SuperTypeDictTable): void {
  if (value === 'term' || value === undefined) {
    const baseRes: SuperTypeDict = Object.create(null);
    baseRes.__depth = 0;
    baseRes[key] = 0;
    res[key] = baseRes;
    return;
  }
  if (!res[value]) {
    extensionTableBuilderInitKey(value, extensionTableInput[value], res);
  }
  res[key] = { ...res[value], [key]: res[value].__depth + 1, __depth: res[value].__depth + 1 };
}

export let typeAliasCheck: Record<TypeAlias, boolean>;
function initTypeAliasCheck(): void {
  typeAliasCheck = Object.create(null);
  for (const val of Object.values(TypeAlias)) {
    typeAliasCheck[val] = true;
  }
}
initTypeAliasCheck();

export function isTypeAlias(type: string): TypeAlias | undefined {
  if (type in typeAliasCheck) {
    return <TypeAlias> type;
  }
  return undefined;
}

export function isKnownLiteralType(type: string): KnownLiteralTypes | undefined {
  if (type in superTypeDictTable) {
    return <KnownLiteralTypes> type;
  }
  return undefined;
}

export function isOverrideType(type: string): OverrideType | undefined {
  if (isKnownLiteralType(type) || type === 'term') {
    return <OverrideType> type;
  }
  return undefined;
}

export type TypeCache = LRUCache<string, GeneralSuperTypeDict>;
export type SyncSuperTypeCallback = (unknownType: string) => string;
export type AsyncSuperTypeCallback = (unknownType: string) => Promise<string>;
export interface ISyncSuperTypeProvider {
  cache: TypeCache;
  discoverer: SyncSuperTypeCallback;
}
export interface IAsyncSuperTypeProvider {
  cache: TypeCache;
  discoverer: AsyncSuperTypeCallback;
}

/**
 * Internal type of @see isSubTypeOf This only takes knownTypes but doesn't need an enabler
 */
export function isInternalSubType(baseType: OverrideType, argumentType: KnownLiteralTypes): boolean {
  return baseType !== 'term' &&
    (superTypeDictTable[baseType] && superTypeDictTable[baseType][argumentType] !== undefined);
}

/**
 * This function needs do be O(1)! The execution time of this function is vital!
 * We define typeA isSubtypeOf typeA as true.
 * @param baseType type you want to provide.
 * @param argumentType type you want to provide @param baseType to.
 * @param superTypeProvider the enabler to discover super types of unknown types.
 */
export function isSubTypeOfSync(baseType: string, argumentType: KnownLiteralTypes,
  superTypeProvider: ISyncSuperTypeProvider): boolean {
  const concreteType: OverrideType | undefined = isOverrideType(baseType);
  let subExtensionTable: GeneralSuperTypeDict;
  if (concreteType === 'term' || baseType === 'term') {
    return false;
  }
  if (concreteType) {
    // Concrete dataType is known by sparqlee.
    subExtensionTable = superTypeDictTable[concreteType];
  } else {
    // Datatype is a custom datatype
    subExtensionTable = getSuperTypesSync(baseType, superTypeProvider);
  }
  return subExtensionTable[argumentType] !== undefined;
}

export async function isSubTypeOfAsync(baseType: string, argumentType: KnownLiteralTypes,
  superTypeProvider: IAsyncSuperTypeProvider): Promise<boolean> {
  const concreteType: OverrideType | undefined = isOverrideType(baseType);
  let subExtensionTable: GeneralSuperTypeDict;
  if (concreteType === 'term' || baseType === 'term') {
    return false;
  }
  if (concreteType) {
    // Concrete dataType is known by sparqlee.
    subExtensionTable = superTypeDictTable[concreteType];
  } else {
    // Datatype is a custom datatype
    subExtensionTable = await getSuperTypesAsync(baseType, superTypeProvider);
  }
  return subExtensionTable[argumentType] !== undefined;
}
