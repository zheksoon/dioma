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

export interface IContainer {
  inject<T extends ScopedClass, Args extends any[]>(
    cls: T | Token<T>,
    ...args: Args
  ): InstanceType<T>;

  injectAsync<T extends ScopedClass, Args extends any[]>(
    cls: T | Token<T>,
    ...args: Args
  ): Promise<InstanceType<T>>;

  childContainer(name?: string): Container;

  register(tokenDescriptor: TokenDescriptor): void;

  unregister(token: Token<any> | ScopedClass): void;

  reset(): void;
}
