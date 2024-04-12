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

type Newable<T = any> = new (...args: any[]) => T;

type OptionalArgs<T, R = Required<T>> = R extends readonly [...infer Rest, infer Last]
  ? R | OptionalArgs<Rest>
  : [];

type TokenType<T, R = any> = T extends Token<infer U> ? U : R;

type BaseDescriptor = {
  beforeInject?: (container: Container, descriptor: AnyDescriptor, args: any[]) => any;
  beforeCreate?: (container: Container, descriptor: AnyDescriptor, args: any[]) => any;
};

export type TokenValueDescriptor<T extends Token<any>> = BaseDescriptor & {
  token: T;
  value: TokenType<T>;
};

export type TokenFactoryDescriptor<T extends Token<any>> = BaseDescriptor & {
  token: T;
  factory: (container: Container, ...args: any[]) => TokenType<T>;
};

export type TokenClassDescriptor<T extends Token<any>> = BaseDescriptor & {
  token?: T;
  class: Newable<TokenType<T>>;
  scope?: ScopeHandler;
};

export type AnyDescriptor =
  | TokenValueDescriptor<any>
  | TokenFactoryDescriptor<any>
  | TokenClassDescriptor<any>;

export type TokenOrClass = Token<any> | ScopedClass;

export type InstanceOf<T, C = TokenType<T, T>> = C extends Newable ? InstanceType<C> : C;

export type ArgsOf<T, C = TokenType<T, T>> = C extends Newable
  ? OptionalArgs<ConstructorParameters<C>>
  : any[];
