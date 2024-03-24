type InstanceResolver = (cls: any, container: Container, resolutionContainer: Container) => any;

export type Scope = InstanceResolver;

interface ScopedClass {
  new (...args: any[]): any;

  scope: Scope;
}

export type Injectable<C extends I, I extends ScopedClass = ScopedClass> = InstanceType<I>;

export class CycleDependencyError extends Error {
  constructor() {
    super("Circular dependency detected");
  }
}

export class AsyncCycleDependencyError extends Error {
  constructor() {
    super("Circular dependency detected in async resolution");
  }
}

const MAX_LOOP_COUNT = 100;

export class Container {
  private instances = new WeakMap();

  private resolutionContainer: Container | null = null;

  private resolutionSet = new Set<ScopedClass>();

  private pendingPromiseMap = new Map<ScopedClass, Promise<InstanceType<ScopedClass>>>();

  constructor(private parentContainer: Container | null = null, public name?: string) {}

  loopCounter = 0;

  childContainer = (name?: string) => {
    return new Container(this, name);
  };

  private getInstance<T>(cls: new () => T) {
    let instance: T | null = null;
    let container: Container | null = this;

    while (!instance && container) {
      instance = container.instances.get(cls);
      container = container.parentContainer;
    }

    if (!instance) {
      instance = new cls();

      this.instances.set(cls, instance);
    }

    return instance;
  }

  injectImpl<T extends ScopedClass>(
    cls: T,
    resolutionContainer = this.resolutionContainer
  ): InstanceType<T> {
    this.resolutionContainer = resolutionContainer || this.childContainer("ResolutionContainer");

    const scope = cls.scope || Scopes.Transient();

    try {
      if (this.resolutionSet.has(cls)) {
        throw new CycleDependencyError();
      }

      this.resolutionSet.add(cls);

      return scope(cls, this, this.resolutionContainer);
    } finally {
      this.resolutionSet.delete(cls);
      this.resolutionContainer = resolutionContainer;

      if (!resolutionContainer) {
        this.loopCounter = 0;
      }
    }
  }

  inject = <T extends ScopedClass>(cls: T) => {
    return this.injectImpl(cls, undefined);
  };

  injectAsync = <T extends ScopedClass>(cls: T): Promise<InstanceType<T>> => {
    const resolutionContainer = this.resolutionContainer;

    this.loopCounter += 1;

    if (this.loopCounter > MAX_LOOP_COUNT) {
      throw new AsyncCycleDependencyError();
    }

    if (this.pendingPromiseMap.has(cls)) {
      return this.pendingPromiseMap.get(cls) as Promise<InstanceType<T>>;
    }

    if (this.instances.has(cls)) {
      return Promise.resolve(this.instances.get(cls));
    }

    const promise = Promise.resolve().then(() => {
      try {
        return this.injectImpl(cls, resolutionContainer);
      } finally {
        this.pendingPromiseMap.delete(cls);
      }
    });

    this.pendingPromiseMap.set(cls, promise);

    return promise;
  };

  reset = () => {
    this.instances = new WeakMap();
    this.resolutionSet = new Set();
    this.pendingPromiseMap = new Map();
    this.resolutionContainer = null;
  };

  static Scopes = class Scopes {
    public static Singleton(): Scope {
      return function SingletonScope(cls) {
        return globalContainer.getInstance(cls);
      };
    }

    public static Transient(): Scope {
      return function TransientScope(cls) {
        return new cls();
      };
    }

    public static Container(): Scope {
      return function ContainerScope(cls, container) {
        return container.getInstance(cls);
      };
    }

    public static Resolution(): Scope {
      return function ResolutionScope(cls, _, resolutionContainer) {
        return resolutionContainer.getInstance(cls);
      };
    }

    public static Scoped = Scopes.Container;
  };
}

export const globalContainer = new Container();

export const Scopes = Container.Scopes;

export const inject = globalContainer.inject;

export const injectAsync = globalContainer.injectAsync;

export const childContainer = globalContainer.childContainer;
