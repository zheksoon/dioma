import type { Container } from "./container";
import type { Token } from "./token";

export type ScopeHandler = (
  cls: any,
  args: any[],
  container: Container,
  resolutionContainer: Container
) => any;

export interface ScopedClass {
  new (...args: any[]): any;

  scope: ScopeHandler;
}

export type Injectable<
  C extends I,
  I extends ScopedClass = ScopedClass
> = InstanceType<I>;

export type TokenDescriptor = {
  token?: Token<any>;
  class: ScopedClass;
  scope?: ScopeHandler;
};

export type TokenOrClass = Token<any> | ScopedClass;

export type TokenOrClassInstance<T extends TokenOrClass> = T extends Token<infer U>
  ? U
  : T extends ScopedClass
  ? InstanceType<T>
  : any;

export interface IContainer {
  inject<T extends TokenOrClass, Args extends any[]>(
    cls: T,
    ...args: Args
  ): TokenOrClassInstance<T>;

  injectAsync<T extends TokenOrClass, Args extends any[]>(
    cls: T,
    ...args: Args
  ): Promise<TokenOrClassInstance<T>>;

  childContainer(name?: string): Container;

  register(tokenDescriptor: TokenDescriptor): void;

  unregister(token: Token<any> | ScopedClass): void;

  reset(): void;
}
