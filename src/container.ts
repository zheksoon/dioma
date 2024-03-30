import type {
  ScopedClass,
  TokenDescriptor,
  ScopeHandler,
  IContainer,
  TokenOrClass,
  TokenOrClassInstance,
} from "./types";
import { Scopes } from "./scopes";
import { Token } from "./token";
import {
  AsyncCycleDependencyError,
  CycleDependencyError,
  TokenNotRegisteredError,
} from "./errors";

type TokenDescriptorWithContainer = TokenDescriptor & {
  container: Container;
};

const MAX_LOOP_COUNT = 100;

export class Container implements IContainer {
  private instances = new WeakMap();

  private resolutionContainer: Container | null = null;

  private resolutionSet = new Set<TokenOrClass>();

  private pendingPromiseMap = new Map<TokenOrClass, Promise<InstanceType<ScopedClass>>>();

  private tokenDescriptorMap = new Map<TokenOrClass, TokenDescriptorWithContainer>();

  constructor(private parentContainer: Container | null = null, public name?: string) {}

  loopCounter = 0;

  childContainer = (name?: string) => {
    return new Container(this, name);
  };

  getInstance(cls: any, args: any[] = []) {
    let instance = null;
    let container: Container | null = this;

    while (!instance && container) {
      instance = container.instances.get(cls);
      container = container.parentContainer;
    }

    if (!instance) {
      instance = new cls(...args);

      this.instances.set(cls, instance);
    }

    return instance;
  }

  private getTokenDescriptor(
    clsOrToken: ScopedClass | Token<any>
  ): TokenDescriptorWithContainer | undefined {
    let tokenDescriptor = this.tokenDescriptorMap.get(clsOrToken);

    if (!tokenDescriptor && this.parentContainer) {
      tokenDescriptor = this.parentContainer.getTokenDescriptor(clsOrToken);
    }

    return tokenDescriptor;
  }

  injectImpl<T extends TokenOrClass, Args extends any[]>(
    clsOrToken: T,
    args: Args,
    resolutionContainer = this.resolutionContainer
  ): TokenOrClassInstance<T> {
    this.resolutionContainer = resolutionContainer || new Container();

    let cls = clsOrToken as ScopedClass;
    let scope: ScopeHandler;
    let container: Container | null = this;

    const descriptor = this.getTokenDescriptor(clsOrToken);

    if (descriptor) {
      container = descriptor.container;
      cls = descriptor.class;
      scope = descriptor.scope || cls.scope || Scopes.Transient();
    } else {
      if (clsOrToken instanceof Token) {
        throw new TokenNotRegisteredError();
      }

      scope = cls.scope || Scopes.Transient();
    }

    try {
      if (this.resolutionSet.has(clsOrToken)) {
        throw new CycleDependencyError();
      }

      this.resolutionSet.add(clsOrToken);

      return scope(cls, args, container, this.resolutionContainer);
    } finally {
      this.resolutionSet.delete(clsOrToken);
      this.resolutionContainer = resolutionContainer;

      if (!resolutionContainer) {
        this.loopCounter = 0;
      }
    }
  }

  inject = <T extends TokenOrClass, Args extends any[]>(
    cls: T,
    ...args: Args
  ): TokenOrClassInstance<T> => {
    return this.injectImpl(cls, args, undefined);
  };

  injectAsync = <T extends TokenOrClass, Args extends any[]>(
    cls: T,
    ...args: Args
  ): Promise<TokenOrClassInstance<T>> => {
    const resolutionContainer = this.resolutionContainer;

    this.loopCounter += 1;

    if (this.loopCounter > MAX_LOOP_COUNT) {
      throw new AsyncCycleDependencyError();
    }

    if (this.pendingPromiseMap.has(cls)) {
      return this.pendingPromiseMap.get(cls) as Promise<TokenOrClassInstance<T>>;
    }

    if (this.instances.has(cls)) {
      return Promise.resolve(this.instances.get(cls));
    }

    const promise = Promise.resolve().then(() => {
      try {
        return this.injectImpl(cls, args, resolutionContainer);
      } finally {
        this.pendingPromiseMap.delete(cls);
      }
    });

    this.pendingPromiseMap.set(cls, promise);

    return promise;
  };

  register = (tokenDescriptor: TokenDescriptor): void => {
    const token = tokenDescriptor.token || tokenDescriptor.class;

    const descriptorWithContainer = { ...tokenDescriptor, container: this };

    this.tokenDescriptorMap.set(token, descriptorWithContainer);
  };

  unregister = (token: TokenOrClass) => {
    const descriptor = this.getTokenDescriptor(token);

    this.tokenDescriptorMap.delete(token);

    if (descriptor) {
      this.instances.delete(descriptor.class);
    }
  };

  reset = (): void => {
    this.instances = new WeakMap();
    this.resolutionSet.clear();
    this.pendingPromiseMap.clear();
    this.tokenDescriptorMap.clear();
    this.resolutionContainer = null;
    this.loopCounter = 0;
  };
}

export const globalContainer = new Container(null, "Global container");

export const inject = globalContainer.inject;

export const injectAsync = globalContainer.injectAsync;

export const childContainer = globalContainer.childContainer;
