import {
  AsyncDependencyCycleError,
  DependencyCycleError,
  TokenNotRegisteredError,
} from "./errors";
import { Scopes } from "./scopes";
import { Token } from "./token";
import type {
  AnyDescriptor,
  ArgsOf,
  InstanceOf,
  ScopeHandler,
  ScopedClass,
  TokenClassDescriptor,
  TokenFactoryDescriptor,
  TokenOrClass,
  TokenValueDescriptor,
} from "./types";
import { proxyHandlers } from './proxy-handlers';

type DescriptorWithContainer = AnyDescriptor & {
  container: Container;
};

const MAX_LOOP_COUNT = 100;

export class Container {
  private instances = new WeakMap();

  private resolutionContainer: Container | null = null;

  private resolutionSet = new Set<TokenOrClass>();

  private pendingPromiseMap = new Map<TokenOrClass, Promise<InstanceType<any>>>();

  private tokenDescriptorMap = new Map<TokenOrClass, DescriptorWithContainer>();

  private resolutionsLoopCounter = 0;

  constructor(private parentContainer: Container | null = null, public name?: string) {
    this.register = this.register.bind(this);
  }

  childContainer = (name?: string) => {
    return new Container(this, name);
  };

  public $getInstance(
    descriptor: TokenClassDescriptor<any>,
    args: any[] = [],
    cache = true
  ) {
    let instance = null;
    let container: Container | null = this;

    const cls = descriptor.class;

    while (!instance && container) {
      instance = container.instances.get(cls);
      container = container.parentContainer;
    }

    if (!instance) {
      if (descriptor.beforeCreate) {
        descriptor.beforeCreate(this, descriptor, args);
      }

      instance = new cls(...args);

      if (cache) {
        this.instances.set(cls, instance);
      }
    }

    return instance;
  }

  private getTokenDescriptor(
    clsOrToken: TokenOrClass
  ): DescriptorWithContainer | undefined {
    let tokenDescriptor;
    let container: Container | null = this;

    while (!tokenDescriptor && container) {
      tokenDescriptor = container.tokenDescriptorMap.get(clsOrToken);
      container = container.parentContainer;
    }

    return tokenDescriptor;
  }

  private injectImpl<T extends TokenOrClass, Args extends ArgsOf<T>>(
    clsOrToken: T,
    args: Args,
    resolutionContainer = this.resolutionContainer
  ): InstanceOf<T> {
    this.resolutionContainer = resolutionContainer || new Container();

    try {
      if (this.resolutionSet.has(clsOrToken)) {
        throw new DependencyCycleError();
      }

      let cls = clsOrToken as TokenOrClass;

      let scope: ScopeHandler;

      let container: Container = this;

      let descriptor = this.getTokenDescriptor(clsOrToken);

      this.resolutionSet.add(clsOrToken);

      if (!descriptor) {
        if (clsOrToken instanceof Token) {
          throw new TokenNotRegisteredError();
        }

        cls = clsOrToken;
        scope = cls.scope || Scopes.Transient();
        container = this;
        descriptor = { class: cls, container: this };
      } else {
        if (descriptor.beforeInject) {
          descriptor.beforeInject(container, descriptor, args);
        }

        if ("class" in descriptor) {
          cls = descriptor.class as ScopedClass;
          scope = descriptor.scope || cls.scope || Scopes.Transient();
          container = descriptor.container;
        } else if ("value" in descriptor) {
          return descriptor.value;
        } else if ("factory" in descriptor) {
          // @ts-ignore
          return descriptor.factory(container, ...args);
        } else {
          throw new Error("Invalid descriptor");
        }
      }

      return scope(descriptor, args, container, this.resolutionContainer);
    } finally {
      this.resolutionSet.delete(clsOrToken);
      this.resolutionContainer = resolutionContainer;

      if (!resolutionContainer) {
        this.resolutionsLoopCounter = 0;
      }
    }
  }

  inject = <T extends TokenOrClass, Args extends ArgsOf<T>>(
    cls: T,
    ...args: Args
  ): InstanceOf<T> => {
    return this.injectImpl(cls, args, undefined);
  };

  injectLazy = <T extends TokenOrClass, Args extends ArgsOf<T>>(
    cls: () => T,
    ...args: Args
  ): InstanceOf<T> => {
    let resolvedCLS: T | undefined;

    const resolveCLS = () => {
      if (!resolvedCLS)
        resolvedCLS = cls()
      return resolvedCLS;
    }

    const handler: Record<string, any> = {
      get: (_: any, key: string | symbol) => {
        const obj = this.injectImpl(resolveCLS(), args);
        const value = obj[key];
        return typeof value === 'function' ? value.bind(obj) : value;
      },
      set: (_: any, key: string | symbol, value: any) => {
        const obj = this.injectImpl(resolveCLS(), args);
        obj[key] = value;
        return true;
      }
    };

    proxyHandlers
      .forEach((key) => {
        handler[key] = (...handlerArgs: any[]) => {
          const obj = this.injectImpl(resolveCLS(), args);
          // @ts-ignore
          return Reflect[key].apply(null, [obj, ...handlerArgs.slice(1)]);
        };
      });

    return new Proxy({} as InstanceOf<T>, handler);
  };

  injectAsync = <T extends TokenOrClass, Args extends ArgsOf<T>>(
    cls: T,
    ...args: Args
  ): Promise<InstanceOf<T>> => {
    const resolutionContainer = this.resolutionContainer;

    this.resolutionsLoopCounter += 1;

    if (this.resolutionsLoopCounter > MAX_LOOP_COUNT) {
      throw new AsyncDependencyCycleError();
    }

    if (this.pendingPromiseMap.has(cls)) {
      return this.pendingPromiseMap.get(cls) as Promise<InstanceOf<T>>;
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

  waitAsync = async () => {
    // // The solution doesn't work correctly in all cases
    // // because at the moment of the call not all promises are in the map
    // await Promise.all(this.pendingPromiseMap.values());
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
  };

  register<T extends Token<any>>(descriptor: TokenValueDescriptor<T>): void;

  register<T extends Token<any>>(descriptor: TokenFactoryDescriptor<T>): void;

  register<T extends Token<any>>(descriptor: TokenClassDescriptor<T>): void;

  register(tokenDescriptor: any): void {
    const token = tokenDescriptor.token || tokenDescriptor.class;

    const descriptorWithContainer = { ...tokenDescriptor, container: this };

    this.tokenDescriptorMap.set(token, descriptorWithContainer);

    if (tokenDescriptor.class) {
      this.tokenDescriptorMap.set(token.class, descriptorWithContainer);
    }
  }

  unregister = (token: TokenOrClass): void => {
    const descriptor = this.getTokenDescriptor(token);

    this.tokenDescriptorMap.delete(token);
    this.instances.delete(token);

    if (descriptor && "class" in descriptor) {
      this.tokenDescriptorMap.delete(descriptor.class as ScopedClass);
      this.instances.delete(descriptor.class);
    }
  };

  reset = (): void => {
    this.instances = new WeakMap();
    this.resolutionSet.clear();
    this.pendingPromiseMap.clear();
    this.tokenDescriptorMap.clear();
    this.resolutionContainer = null;
    this.resolutionsLoopCounter = 0;
  };
}

export const globalContainer = new Container(null, "Global container");

export const inject = globalContainer.inject;

export const injectAsync = globalContainer.injectAsync;

export const injectLazy = globalContainer.injectLazy;

export const childContainer = globalContainer.childContainer;
