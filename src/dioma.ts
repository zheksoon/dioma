type InstanceResolver = (cls: any, container: Container, resolutionContainer: Container) => any;

export type Scope = InstanceResolver;

interface ScopedClass {
  new (...args: any[]): any;

  scope: Scope;
}

export type Injectable<C extends I, I extends ScopedClass = ScopedClass> = InstanceType<I>;

class CycleDependencyError extends Error {
  constructor() {
    super("Circular dependency detected");
  }
}

export class Container {
  private instances = new WeakMap();

  private resolutionContainer: Container | null = null;

  private resolutionSet = new Set();

  constructor(private parentContainer: Container | null = null) {}

  childContainer = () => {
    return new Container(this);
  };

  private getInstance<T>(cls: new () => T, topLevel = true) {
    let instance = this.instances.get(cls);

    if (!instance && this.parentContainer) {
      instance = this.parentContainer.getInstance(cls, false);
    }

    if (!instance && topLevel) {
      instance = new cls();

      this.instances.set(cls, instance);
    }

    return instance;
  }

  inject = <T extends ScopedClass>(cls: T): InstanceType<T> => {
    let oldResolutionContainer = this.resolutionContainer;

    this.resolutionContainer ||= this.childContainer();

    const scope = cls.scope || Scopes.Transient();

    if (this.resolutionSet.has(cls)) {
      throw new CycleDependencyError();
    }

    this.resolutionSet.add(cls);

    let instance: InstanceType<T> | undefined;

    try {
      instance = scope(cls, this, this.resolutionContainer);

      return instance!;
    } finally {
      this.resolutionSet.delete(cls);

      this.resolutionContainer = oldResolutionContainer;
    }
  };

  register = this.inject;

  reset = () => {
    this.instances = new WeakMap();
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

const globalContainer = new Container();

export const Scopes = Container.Scopes;

export const inject = globalContainer.inject;

export const childContainer = globalContainer.childContainer;

export const register = globalContainer.register;
