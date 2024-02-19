type InstanceResolver = (cls: any, container: Container, resolutionContainer: Container) => any;

export type Scope = InstanceResolver;

interface ScopedClass {
  new (...args: any[]): any;

  scope: Scope;
}

export type Injectable<C extends I, I extends ScopedClass = ScopedClass> = InstanceType<I>;

export const Scopes = {
  Singleton(): Scope {
    return function SingletonScope(cls) {
      return globalContainer.getInstance(cls);
    };
  },

  Transient(): Scope {
    return function TransientScope(cls) {
      return new cls();
    };
  },

  Container(): Scope {
    return function ContainerScope(cls, container) {
      return container.getInstance(cls);
    };
  },

  Resolution(): Scope {
    return function ResolutionScope(cls, _, resolutionContainer) {
      return resolutionContainer.getInstance(cls);
    };
  },

  get Scoped() {
    return Scopes.Container;
  },
} as const;

export class Container {
  private instances = new WeakMap();
  private resolutionContainer: Container | null = null;

  constructor(private parentContainer: Container | null = null) {}

  childContainer = () => {
    return new Container(this);
  };

  getInstance<T>(cls: new () => T, topLevel = true) {
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

    if (!oldResolutionContainer) {
      this.resolutionContainer = this.childContainer();
    }

    const scope = cls.scope ?? Scopes.Transient();

    try {
      return scope(cls, this, this.resolutionContainer as Container);
    } finally {
      this.resolutionContainer = oldResolutionContainer;
    }
  };

  register = this.inject;
}

const globalContainer = new Container();

export const inject = globalContainer.inject;

export const childContainer = globalContainer.childContainer;

export const register = globalContainer.register;
