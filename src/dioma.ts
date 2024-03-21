type InstanceResolver = (cls: any, container: Container, resolutionContainer: Container) => any;

export type Scope = InstanceResolver;

interface ScopedClass {
  new (...args: any[]): any;

  scope: Scope;
}

export type Injectable<C extends I, I extends ScopedClass = ScopedClass> = InstanceType<I>;

export class Container {
  private instances = new WeakMap();
  private resolutionContainer: Container | null = null;

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

    try {
      return scope(cls, this, this.resolutionContainer);
    } finally {
      this.resolutionContainer = oldResolutionContainer;
    }
  };

  register = this.inject;

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
