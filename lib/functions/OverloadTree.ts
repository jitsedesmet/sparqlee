import type * as E from '../expressions';
import type { ArgumentType } from './Core';

export type SearchStack = OverloadTree[];

/**
 * Maps argument types on their specific implementation in a tree like structure.
 */
export class OverloadTree {
  private implementation?: E.SimpleApplication | undefined;
  private readonly subTrees: Record<string, OverloadTree>;

  public constructor() {
    this.implementation = undefined;
    this.subTrees = {};
  }

  /**
   * Searches in a depth first way for the best matching overload. considering this a the tree's root.
   * @param args
   */
  public search(args: E.TermExpression[]): E.SimpleApplication | undefined {
    // SearchStack is a stack of all node's that need to be checked for implementation.
    // It provides an easy way to keep order in our search.
    const searchStack: { node: OverloadTree; index: number }[] = [];
    const startIndex = 0;
    if (args.length === 0) {
      return this.implementation;
    }
    // GetSubTreeWithArg return a SearchStack containing the node's that should be contacted next.
    // We also log the index since there is no other way to remember this index.
    // the provided stack should be pushed on top of our search stack since it also has it's order.
    searchStack.push(...this.getSubTreeWithArg(args[startIndex]).map(node =>
      ({ node, index: startIndex + 1 })));
    while (searchStack.length > 0) {
      const { index, node } = <{ node: OverloadTree; index: number }>searchStack.pop();
      if (index === args.length) {
        return node.implementation;
      }
      searchStack.push(...node.getSubTreeWithArg(args[index]).map(item =>
        ({ node: item, index: index + 1 })));
    }
    return this.implementation;
  }

  /**
   * Adds an overload to the tree structure considering this as the tree's root.
   * @param argumentTypes a list of ArgumentTypes that would need to be provided in the same order to
   * get the implementation.
   * @param func the implementation for this overload.
   */
  public addOverload(argumentTypes: ArgumentType[], func: E.SimpleApplication): void {
    this._addOverload([ ...argumentTypes ], func);
  }

  private _addOverload(argumentTypes: ArgumentType[], func: E.SimpleApplication): void {
    const argumentType = argumentTypes.shift();
    if (!argumentType) {
      this.implementation = func;
      return;
    }
    if (!this.subTrees[argumentType]) {
      this.subTrees[argumentType] = new OverloadTree();
    }
    this.subTrees[argumentType]._addOverload(argumentTypes, func);
  }

  /**
   * @param arg term to try and match to possible overloads of this node.
   * @returns SearchStack a stack with top element the next node that should be asked for implementation or overload.
   */
  private getSubTreeWithArg(arg: E.TermExpression): SearchStack {
    const match: OverloadTree = this.subTrees[(<any>arg).type];
    const res: SearchStack = [];
    // These types refer to Type exported by lib/util/Consts.ts
    if (this.subTrees.term) {
      res.push(this.subTrees.term);
    }
    // TermTypes are defined in E.TermType.
    if (this.subTrees[arg.termType]) {
      res.push(this.subTrees[arg.termType]);
    }
    if (match) {
      res.push(match);
    }
    return res;
  }
}
