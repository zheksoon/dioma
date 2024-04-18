import { beforeEach, describe, expect, it } from "vitest";
import {
  ArgumentsError,
  AsyncDependencyCycleError,
  // AsyncDependencyCycleError,
  Container,
  DependencyCycleError,
  ScopedClass,
  Scopes,
  Token,
  globalContainer,
  inject,
  injectAsync,
  injectLazy
} from "../src";
import { AnyDescriptor } from "../src/types";

describe("Dioma", () => {
  beforeEach(() => {
    globalContainer.reset();
  });

  it("should be able to create container", () => {
    const container = new Container();

    expect(container).toBeInstanceOf(Container);
  });

  describe("child container", () => {
    it("should be able to create child container", () => {
      const container = new Container();

      const childContainer = container.childContainer();

      expect(childContainer).toBeInstanceOf(Container);
    });

    it("should be able to create grandchild container", () => {
      const container = new Container();

      const childContainer = container.childContainer();

      const grandchildContainer = childContainer.childContainer();

      expect(grandchildContainer).toBeInstanceOf(Container);
    });

    it("should be able to inject instance from parent container", () => {
      class ParentClass {
        static scope = Scopes.Container();
      }

      const parentContainer = new Container();

      const instance1 = parentContainer.inject(ParentClass);

      const childContainer = parentContainer.childContainer();

      const instance2 = childContainer.inject(ParentClass);

      expect(instance1).toBeInstanceOf(ParentClass);

      expect(instance2).toBe(instance1);
    });

    it("should handle multiple child containers", () => {
      class ParentClass {
        static scope = Scopes.Scoped();
      }

      const parentContainer = new Container();

      const childContainer1 = parentContainer.childContainer();

      const childContainer2 = parentContainer.childContainer();

      const instance1 = childContainer1.inject(ParentClass);

      const instance2 = childContainer2.inject(ParentClass);

      expect(instance1).toBeInstanceOf(ParentClass);

      expect(instance2).toBeInstanceOf(ParentClass);

      expect(instance1).not.toBe(instance2);
    });

    it("should use parent container if instance is not found in child container", () => {
      class ParentClass {
        static scope = Scopes.Scoped();
      }

      const parentContainer = new Container();

      parentContainer.inject(ParentClass);

      const instance1 = parentContainer.inject(ParentClass);

      const childContainer = parentContainer.childContainer();

      const instance2 = childContainer.inject(ParentClass);

      expect(instance1).toBeInstanceOf(ParentClass);

      expect(instance2).toBe(instance1);
    });
  });

  describe("Singleton", () => {
    it("should be able to inject singleton", () => {
      class SingletonClass {
        static scope = Scopes.Singleton();
      }

      const singleton = inject(SingletonClass);

      expect(singleton).toBeInstanceOf(SingletonClass);

      const singleton2 = inject(SingletonClass);

      expect(singleton2).toBe(singleton);
    });
  });

  describe("Transient", () => {
    it("should be able to inject transient", () => {
      class TransientClass {
        static scope = Scopes.Transient();
      }

      const transient = inject(TransientClass);

      expect(transient).toBeInstanceOf(TransientClass);

      const transient2 = inject(TransientClass);

      expect(transient2).not.toBe(transient);
    });

    it("uses transient scope by default", () => {
      class DefaultClass {}

      const instance1 = inject(DefaultClass as ScopedClass);

      const instance2 = inject(DefaultClass as ScopedClass);

      expect(instance1).toBeInstanceOf(DefaultClass);

      expect(instance2).not.toBe(instance1);
    });
  });

  describe("Scoped", () => {
    it("should be able to inject scoped", () => {
      class ScopedClass {
        static scope = Scopes.Scoped();
      }

      const container = new Container();

      const scoped = container.inject(ScopedClass);

      const scoped2 = container.inject(ScopedClass);

      expect(scoped).toBeInstanceOf(ScopedClass);

      expect(scoped2).toBe(scoped);
    });
  });

  describe("Resolution", () => {
    it("should be able to return the same instance in resolution scope", () => {
      class ResolutionClassA {
        constructor(
          public instanceB = inject(ResolutionClassB),
          public instanceC = inject(ResolutionClassC)
        ) {}

        static scope = Scopes.Transient();
      }

      class ResolutionClassB {
        constructor(public instanceC = inject(ResolutionClassC)) {}

        static scope = Scopes.Transient();
      }

      class ResolutionClassC {
        static scope = Scopes.Resolution();
      }

      const instanceA = inject(ResolutionClassA);

      const instanceA2 = inject(ResolutionClassA);

      expect(instanceA).toBeInstanceOf(ResolutionClassA);

      expect(instanceA.instanceB).toBeInstanceOf(ResolutionClassB);

      expect(instanceA.instanceC).toBeInstanceOf(ResolutionClassC);

      expect(instanceA.instanceB.instanceC).toBeInstanceOf(ResolutionClassC);

      expect(instanceA.instanceB.instanceC).toBe(instanceA.instanceC);

      expect(instanceA2).not.toBe(instanceA);

      expect(instanceA2.instanceB.instanceC).toBe(instanceA2.instanceC);

      expect(instanceA2.instanceC).not.toBe(instanceA.instanceC);
    });
  });

  describe("Complex dependency", () => {
    it("should be able to inject complex dependency", () => {
      class DependencyA {
        constructor(public instanceB = inject(DependencyB)) {}

        static scope = Scopes.Transient();
      }

      class DependencyB {
        constructor(public instanceC = inject(DependencyC)) {}

        static scope = Scopes.Transient();
      }

      class DependencyC {
        constructor(public instanceD = inject(DependencyD)) {}

        static scope = Scopes.Transient();
      }

      class DependencyD {
        constructor() {}

        static scope = Scopes.Transient();
      }

      const instanceA = inject(DependencyA);

      expect(instanceA).toBeInstanceOf(DependencyA);

      expect(instanceA.instanceB).toBeInstanceOf(DependencyB);

      expect(instanceA.instanceB.instanceC).toBeInstanceOf(DependencyC);

      expect(instanceA.instanceB.instanceC.instanceD).toBeInstanceOf(DependencyD);
    });

    it("should be able to inject complex dependency with resolution scope", () => {
      class DependencyZ {
        constructor(
          public instanceA = inject(DependencyA),
          public instanceB = inject(DependencyB)
        ) {}

        static scope = Scopes.Transient();
      }

      class DependencyA {
        constructor(
          public instanceB = inject(DependencyB),
          public instanceC = inject(DependencyC)
        ) {}

        static scope = Scopes.Transient();
      }

      class DependencyB {
        constructor(public instanceC = inject(DependencyC)) {}

        static scope = Scopes.Transient();
      }

      class DependencyC {
        constructor() {}

        static scope = Scopes.Resolution();
      }

      const instanceZ = inject(DependencyZ);

      expect(instanceZ).toBeInstanceOf(DependencyZ);

      expect(instanceZ.instanceA).toBeInstanceOf(DependencyA);

      expect(instanceZ.instanceB).toBeInstanceOf(DependencyB);

      expect(instanceZ.instanceA.instanceB).toBeInstanceOf(DependencyB);

      expect(instanceZ.instanceA.instanceC).toBeInstanceOf(DependencyC);

      expect(instanceZ.instanceB.instanceC).toBeInstanceOf(DependencyC);

      expect(instanceZ.instanceA.instanceC).toBe(instanceZ.instanceB.instanceC);
    });
  });

  describe("Circular dependency", () => {
    it("should throw error when circular dependency is detected for transient scope", () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        constructor(public instanceA = inject(CircularDependencyA)) {}

        static scope = Scopes.Transient();
      }

      expect(() => inject(CircularDependencyA)).toThrowError(DependencyCycleError);
    });

    it("should throw error when circular dependency is detected for container scope", () => {
      const container = new Container();

      class CircularDependencyA {
        constructor(public instanceB = container.inject(CircularDependencyB)) {}

        static scope = Scopes.Scoped();
      }

      class CircularDependencyB {
        constructor(public instanceA = container.inject(CircularDependencyA)) {}

        static scope = Scopes.Scoped();
      }

      expect(() => container.inject(CircularDependencyA)).toThrowError(
        DependencyCycleError
      );
    });

    it("should throw error when circular dependency is detected for resolution scope", () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        constructor(public instanceA = inject(CircularDependencyA)) {}

        static scope = Scopes.Resolution();
      }

      const container = new Container();

      expect(() => container.inject(CircularDependencyA)).toThrowError(
        DependencyCycleError
      );
    });

    it("should throw error when circular dependency is detected for singleton scope", () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        constructor(public instanceA = inject(CircularDependencyA)) {}

        static scope = Scopes.Singleton();
      }

      expect(() => inject(CircularDependencyA)).toThrowError(DependencyCycleError);
    });

    it("should throw error when circular dependency is detected for multiple classes", () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        constructor(public instanceC = inject(CircularDependencyC)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyC {
        constructor(public instanceA = inject(CircularDependencyA)) {}

        static scope = Scopes.Transient();
      }

      expect(() => inject(CircularDependencyA)).toThrowError(DependencyCycleError);

      expect(() => inject(CircularDependencyB)).toThrowError(DependencyCycleError);

      expect(() => inject(CircularDependencyC)).toThrowError(DependencyCycleError);
    });
  });

  describe("Async", () => {
    it("should be able to inject async", async () => {
      class AsyncClass {
        static scope = Scopes.Transient();
      }

      const instance = await injectAsync(AsyncClass);

      expect(instance).toBeInstanceOf(AsyncClass);
    });

    it("should be able to inject async for singleton scope ", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for singleton scope (both async)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(private promiseB = injectAsync(CircularDependencyB)) {
          this.promiseB.then((instance) => {
            this.instanceB = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for singleton scope (async cycle of 3)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(private promiseB = injectAsync(CircularDependencyB)) {
          this.promiseB.then((instance) => {
            this.instanceB = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceC: CircularDependencyC;

        constructor(private promiseC = injectAsync(CircularDependencyC)) {
          this.promiseC.then((instance) => {
            this.instanceC = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        public instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB.instanceC.instanceA).toBe(instance);
      expect(instance.instanceB.instanceC.instanceA.instanceB).toBe(instance.instanceB);
      expect(instance.instanceB.instanceC.instanceA.instanceB.instanceC).toBe(
        instance.instanceB.instanceC
      );
    });

    it("should be able to inject async for singleton scope (star schema)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;
        public instanceC: CircularDependencyC;

        constructor(
          private promiseB = injectAsync(CircularDependencyB),
          private promiseC = injectAsync(CircularDependencyC)
        ) {
          Promise.all([this.promiseB, this.promiseC]).then(([instanceB, instanceC]) => {
            this.instanceB = instanceB;
            this.instanceC = instanceC;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceA: CircularDependencyA;
        public instanceC: CircularDependencyC;

        constructor(
          private promiseC = injectAsync(CircularDependencyC),
          private promiseA = injectAsync(CircularDependencyA)
        ) {
          Promise.all([this.promiseC, this.promiseA]).then(([instanceC, instanceA]) => {
            this.instanceC = instanceC;
            this.instanceA = instanceA;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        public instanceA: CircularDependencyA;
        public instanceB: CircularDependencyB;

        constructor(
          private promiseA = injectAsync(CircularDependencyA),
          private promiseB = injectAsync(CircularDependencyB)
        ) {
          Promise.all([this.promiseA, this.promiseB]).then(([instanceA, instanceB]) => {
            this.instanceA = instanceA;
            this.instanceB = instanceB;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceC.instanceB).toBeInstanceOf(CircularDependencyB);

      expect(instance.instanceC.instanceA).toBe(instance);
      expect(instance.instanceB.instanceA).toBe(instance);
      expect(instance.instanceC.instanceB).toBe(instance.instanceB);
      expect(instance.instanceB.instanceC).toBe(instance.instanceC);
    });

    it("should be able to inject async for resolution scope", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for resolution scope (both async)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(private promiseB = injectAsync(CircularDependencyB)) {
          this.promiseB.then((instance) => {
            this.instanceB = instance;
          });
        }

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for transient scope", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB).not.toBe(instance.instanceB.instanceA.instanceB);
      expect(instance.instanceB.instanceA).not.toBe(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance).not.toBe(instance2);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).not.toBe(instance2);
    });

    it("should be able to inject async for multiple transient classes (with unexpected loop)", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        constructor(public instanceC = inject(CircularDependencyC)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyC {
        public instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = await injectAsync(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      // unexpected loops
      expect(instance.instanceB.instanceC.instanceA).toBe(instance);
      expect(instance.instanceB.instanceC.instanceA.instanceB).toBe(instance.instanceB);
      expect(instance.instanceB.instanceC.instanceA.instanceB.instanceC).toBe(
        instance.instanceB.instanceC
      );
    });

    it("should have unexpected result when trying to inject transients with async only loop", async () => {
      let errorA: Error | null = null;
      let errorB: Error | null = null;

      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(private promiseB = injectAsync(CircularDependencyB)) {
          this.promiseB
            .then((instance) => {
              this.instanceB = instance;
            })
            .catch((error) => {
              errorA = error;
            });
        }

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        public instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA
            .then((instance) => {
              this.instanceA = instance;
            })
            .catch((error) => {
              errorB = error;
            });
        }

        static scope = Scopes.Transient();
      }

      const instance = await injectAsync(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(errorA).toBeInstanceOf(AsyncDependencyCycleError);
      expect(errorB).toBe(null);
    });

    it("should be able to inject async for container scope", async () => {
      const container = new Container();

      class CircularDependencyA {
        constructor(public instanceB = container.inject(CircularDependencyB)) {}

        static scope = Scopes.Container();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(public promiseA = container.injectAsync(CircularDependencyA)) {
          promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Container();
      }

      const instance = container.inject(CircularDependencyA);

      await container.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = container.inject(CircularDependencyB);

      await container.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should resolve async self-dependency correctly", async () => {
      class CircularDependencyA {
        public instanceA: CircularDependencyA;

        constructor(private promiseA = injectAsync(CircularDependencyA)) {
          this.promiseA.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = await injectAsync(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceA).toBe(instance);
    });
  });

  describe("Lazy", () => {
    it("should be able to inject lazy", async () => {
      class AsyncClass {
        static scope = Scopes.Transient();
      }

      const instance = injectLazy(() => AsyncClass);

      expect(instance).toBeInstanceOf(AsyncClass);
    });

    it("should be able to inject lazy for singleton scope ", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toEqual(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject lazy for singleton scope (both lazy)", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = injectLazy(() => CircularDependencyB)) {
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toEqual(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toEqual(instance2);
    });

    it("should be able to inject lazy for singleton scope (lazy cycle of 3)", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = injectLazy(() => CircularDependencyB)) {
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceC = injectLazy(() =>CircularDependencyC)) {
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB.instanceC.instanceA).toEqual(instance);
      expect(instance.instanceB.instanceC.instanceA.instanceB).toEqual(instance.instanceB);
      expect(instance.instanceB.instanceC.instanceA.instanceB.instanceC).toEqual(
        instance.instanceB.instanceC
      );
    });

    it("should be able to inject lazy for singleton scope (star schema)", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(
          public instanceB = injectLazy(() => CircularDependencyB),
          public instanceC = injectLazy(() => CircularDependencyC)
        ) {
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(
          public instanceC = injectLazy(() => CircularDependencyC),
          public instanceA = injectLazy(() => CircularDependencyA)
        ) {
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        random = Math.random();

        constructor(
          public instanceA = injectLazy(() => CircularDependencyA),
          public instanceB = injectLazy(() => CircularDependencyB)
        ) {

        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceC.instanceB).toBeInstanceOf(CircularDependencyB);

      expect(instance.instanceC.instanceA).toEqual(instance);
      expect(instance.instanceB.instanceA).toEqual(instance);
      expect(instance.instanceC.instanceB).toEqual(instance.instanceB);
      expect(instance.instanceB.instanceC).toEqual(instance.instanceC);
    });

    it("should be able to inject lazy for resolution scope", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toEqual(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toEqual(instance2);
    });

    it("should be able to inject lazy for resolution scope (both lazy)", async () => {
      class CircularDependencyA {
        constructor(public instanceB = injectLazy(() => CircularDependencyB)) {
        }

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject lazy for transient scope", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await globalContainer.waitAsync();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB).not.toBe(instance.instanceB.instanceA.instanceB);
      expect(instance.instanceB.instanceA).not.toBe(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance).not.toBe(instance2);

      await globalContainer.waitAsync();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).not.toBe(instance2);
    });

    it("should be able to inject lazy for multiple transient classes (with unexpected loop)", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceC = inject(CircularDependencyC)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyC {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Transient();
      }

      const instance = injectLazy(() => CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      // unexpected loops
      expect(instance.instanceB.instanceC.instanceA).toEqual(instance);
      expect(instance.instanceB.instanceC.instanceA.instanceB).toEqual(instance.instanceB);
      expect(instance.instanceB.instanceC.instanceA.instanceB.instanceC).toEqual(
        instance.instanceB.instanceC
      );
    });

    it("should have unexpected result when trying to inject transients with lazy only loop", async () => {
      let errorA: Error | null = null;
      let errorB: Error | null = null;

      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = injectLazy(() => CircularDependencyB)) {
          // this.promiseB
          //   .then((instance) => {
          //     this.instanceB = instance;
          //   })
          //   .catch((error) => {
          //     errorA = error;
          //   });
        }

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
          // this.promiseA
          //   .then((instance) => {
          //     this.instanceA = instance;
          //   })
          //   .catch((error) => {
          //     errorB = error;
          //   });
        }

        static scope = Scopes.Transient();
      }

      const instance = injectLazy(() => CircularDependencyA);

      expect(errorA).toBeInstanceOf(AsyncDependencyCycleError);
      expect(errorB).toBe(null);
    });

    it("should be able to inject lazy for container scope", async () => {
      const container = new Container();

      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceB = container.inject(CircularDependencyB)) {}

        static scope = Scopes.Container();
      }

      class CircularDependencyB {
        random = Math.random();

        constructor(public instanceA = container.injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Container();
      }

      const instance = container.inject(CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toEqual(instance);

      const instance2 = container.inject(CircularDependencyB);

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toEqual(instance2);
    });

    it("should resolve lazy self-dependency correctly", async () => {
      class CircularDependencyA {
        random = Math.random();

        constructor(public instanceA = injectLazy(() => CircularDependencyA)) {
        }

        static scope = Scopes.Transient();
      }

      const instance = injectLazy(() => CircularDependencyA);

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceA).toEqual(instance);
    });
  });

  describe("Arguments", () => {
    it("should be able to inject transient with arguments", () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Transient();
      }

      const instance = inject(ArgumentClass, "test");

      expect(instance).toBeInstanceOf(ArgumentClass);
      expect(instance.value).toBe("test");
    });

    it("should be able to inject multiple transient with arguments", () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Transient();
      }

      const instance = inject(ArgumentClass, "test");

      expect(instance).toBeInstanceOf(ArgumentClass);
      expect(instance.value).toBe("test");

      const instance2 = inject(ArgumentClass, "test2");

      expect(instance2).toBeInstanceOf(ArgumentClass);
      expect(instance2.value).toBe("test2");
    });

    it("should be able to inject resolution with arguments", () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Resolution();
      }

      const instance = inject(ArgumentClass, "test");

      expect(instance).toBeInstanceOf(ArgumentClass);
      expect(instance.value).toBe("test");
    });

    it("should cache first instance of resolution with arguments", () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Resolution();
      }

      class InjectClass {
        constructor(
          public instance1 = inject(ArgumentClass, "test"),
          public instance2 = inject(ArgumentClass, "test2")
        ) {}

        static scope = Scopes.Transient();
      }

      const instance = inject(InjectClass);

      expect(instance).toBeInstanceOf(InjectClass);

      expect(instance.instance1).toBeInstanceOf(ArgumentClass);
      expect(instance.instance1.value).toBe("test");

      expect(instance.instance2).toBeInstanceOf(ArgumentClass);
      expect(instance.instance2.value).toBe("test");
    });

    it("should throw error for singleton with arguments", () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Singleton();
      }

      expect(() => inject(ArgumentClass, "test")).toThrowError(ArgumentsError);
    });

    it("should throw error for container with arguments", () => {
      const container = new Container();

      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Container();
      }

      expect(() => container.inject(ArgumentClass, "test")).toThrowError(ArgumentsError);
    });

    it("should be able to inject async with arguments", async () => {
      class ArgumentClass {
        constructor(public value: string) {}

        static scope = Scopes.Transient();
      }

      const instance = await injectAsync(ArgumentClass, "test");

      expect(instance).toBeInstanceOf(ArgumentClass);
      expect(instance.value).toBe("test");
    });

    it("should be able to inject async with arguments (loop)", async () => {
      class ClassA {
        constructor(public number: number, public instanceB = inject(ClassB, "hello")) {}

        static scope = Scopes.Resolution();
      }

      class ClassB {
        public instanceA: ClassA;

        constructor(
          public value: string,
          aPromise: Promise<ClassA> = injectAsync(ClassA, 123)
        ) {
          aPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instanceB = inject(ClassB, "test");

      await globalContainer.waitAsync();

      expect(instanceB).toBeInstanceOf(ClassB);
      expect(instanceB.value).toBe("test");

      expect(instanceB.instanceA).toBeInstanceOf(ClassA);
      expect(instanceB.instanceA.number).toBe(123);
    });
  });

  describe(".register", () => {
    it("should be able to register class", () => {
      class RegisterClass {
        constructor() {}

        static scope = Scopes.Transient();
      }

      globalContainer.register({ class: RegisterClass });

      const instance = inject(RegisterClass);

      expect(instance).toBeInstanceOf(RegisterClass);
    });

    it("should throw when invalid descriptor is injected", () => {
      const token = new Token();

      // @ts-expect-error
      globalContainer.register({ token, something: "invalid" });

      expect(() => inject(token)).toThrowError();
    });

    it("should use registration scope if provided", () => {
      class RegisterClass {
        constructor() {}

        static scope = Scopes.Transient();
      }

      globalContainer.register({ class: RegisterClass, scope: Scopes.Singleton() });

      const instance = inject(RegisterClass);
      const instance2 = inject(RegisterClass);

      expect(instance).toBe(instance2);
    });

    it("should use class scope if registration scope is not provided", () => {
      class RegisterClass {
        constructor() {}

        static scope = Scopes.Singleton();
      }

      globalContainer.register({ class: RegisterClass });

      const instance = inject(RegisterClass);
      const instance2 = inject(RegisterClass);

      expect(instance).toBe(instance2);
    });

    describe("Token injection", () => {
      let container = new Container(null, "parent");

      beforeEach(() => {
        container = new Container(null, "parent");
      });

      describe("Class Tokens", () => {
        it("should be able to inject token", () => {
          class TokenClass {
            constructor() {}

            static scope = Scopes.Transient();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const instance = container.inject(token);

          expect(instance).toBeInstanceOf(TokenClass);
        });

        it("should be able to inject token with arguments", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Transient();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const instance = container.inject(token, "test");

          expect(instance).toBeInstanceOf(TokenClass);
          expect(instance.value).toBe("test");
        });

        it("should throw error when token is not registered", () => {
          const token = new Token();

          expect(() => container.inject(token)).toThrowError();
        });

        it("should be able to inject token from base class", () => {
          class TokenClass {
            static scope = Scopes.Container();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const childContainer = container.childContainer("child");

          const instance = childContainer.inject(token);

          const instance2 = container.inject(token);

          expect(instance).toBeInstanceOf(TokenClass);

          expect(instance2).toBe(instance);

          container.unregister(token);

          const instance3 = childContainer.inject(TokenClass);

          expect(instance3).toBeInstanceOf(TokenClass);

          expect(instance3).not.toBe(instance);
        });

        it("should be able to inject registered class", () => {
          class RegisterClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          container.register({ class: RegisterClass });

          const instance = container.inject(RegisterClass);

          expect(instance).toBeInstanceOf(RegisterClass);
        });

        it("should be able to inject registered class on parent container", () => {
          class RegisterClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          container.register({ class: RegisterClass });

          const childContainer = container.childContainer("child");

          const instance = childContainer.inject(RegisterClass);

          expect(instance).toBeInstanceOf(RegisterClass);

          const instance2 = container.inject(RegisterClass);

          expect(instance2).toBe(instance);

          container.unregister(RegisterClass);

          const instance3 = childContainer.inject(RegisterClass);

          expect(instance3).toBeInstanceOf(RegisterClass);

          expect(instance3).not.toBe(instance);
        });

        it("should be able to inject token in async loop", async () => {
          class A {
            constructor(public instanceB = container.inject(B)) {}

            static scope = Scopes.Container();
          }

          class B {
            declare instanceA: A;

            constructor(private promiseA = container.injectAsync(A)) {
              this.promiseA.then((instance) => {
                this.instanceA = instance;
              });
            }

            static scope = Scopes.Container();
          }

          const tokenA = new Token<A>();
          const tokenB = new Token<B>();

          container.register({ token: tokenA, class: A });
          container.register({ token: tokenB, class: B });

          const instance = container.inject(tokenA);

          expect(instance).toBeInstanceOf(A);

          await container.waitAsync();

          expect(instance.instanceB).toBeInstanceOf(B);
          expect(instance.instanceB.instanceA).toBeInstanceOf(A);
          expect(instance.instanceB.instanceA).toBe(instance);

          const instance2 = container.inject(tokenB);

          expect(instance2).toBeInstanceOf(B);

          await container.waitAsync();

          expect(instance2.instanceA).toBeInstanceOf(A);
          expect(instance2.instanceA.instanceB).toBeInstanceOf(B);
          expect(instance2.instanceA.instanceB).toBe(instance2);
        });

        it("should be able to injectAsync token in async loop", async () => {
          class A {
            constructor(public instanceB = container.inject(B)) {}

            static scope = Scopes.Container();
          }

          class B {
            declare instanceA: A;

            constructor(private promiseA = container.injectAsync(A)) {
              this.promiseA.then((instance) => {
                this.instanceA = instance;
              });
            }

            static scope = Scopes.Container();
          }

          const tokenA = new Token<A>();
          const tokenB = new Token<B>();

          container.register({ token: tokenA, class: A });
          container.register({ token: tokenB, class: B });

          const instance = await container.injectAsync(tokenA);

          expect(instance).toBeInstanceOf(A);

          await container.waitAsync();

          expect(instance.instanceB).toBeInstanceOf(B);
          expect(instance.instanceB.instanceA).toBeInstanceOf(A);
          expect(instance.instanceB.instanceA).toBe(instance);

          const instance2 = await container.injectAsync(tokenB);

          expect(instance2).toBeInstanceOf(B);

          await container.waitAsync();

          expect(instance2.instanceA).toBeInstanceOf(A);
          expect(instance2.instanceA.instanceB).toBeInstanceOf(B);
          expect(instance2.instanceA.instanceB).toBe(instance2);
        });

        it("should be able to inject token in async loop", async () => {
          class A {
            constructor(public instanceB = container.inject(tokenB)) {}

            static scope = Scopes.Container();
          }

          class B {
            declare instanceA: A;

            constructor(private promiseA = container.injectAsync(tokenA)) {
              promiseA.then((instance) => {
                this.instanceA = instance;
              });
            }

            static scope = Scopes.Container();
          }

          const tokenA = new Token<A>();
          const tokenB = new Token<B>();

          container.register({ token: tokenA, class: A });
          container.register({ token: tokenB, class: B });

          const instance = container.inject(tokenA);

          expect(instance).toBeInstanceOf(A);

          await container.waitAsync();

          expect(instance.instanceB).toBeInstanceOf(B);
          expect(instance.instanceB.instanceA).toBeInstanceOf(A);
          expect(instance.instanceB.instanceA).toBe(instance);
        });

        it("should get the same instance of inject token and class", () => {
          class TokenClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const instance = container.inject(token);
          const instance2 = container.inject(TokenClass);

          expect(instance).toBe(instance2);
        });

        it("should unregister token", () => {
          class TokenClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const instance = container.inject(token);

          expect(instance).toBeInstanceOf(TokenClass);

          container.unregister(token);

          expect(() => container.inject(token)).toThrowError();
        });

        it("should unregister token from parent container", () => {
          class TokenClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          const token = new Token<TokenClass>();

          container.register({ token, class: TokenClass });

          const childContainer = container.childContainer("child");

          const instance = childContainer.inject(token);

          expect(instance).toBeInstanceOf(TokenClass);

          container.unregister(token);

          expect(() => childContainer.inject(token)).toThrowError();
        });
      });

      describe("Value Tokens", () => {
        it("should be able to inject token with value", () => {
          const token = new Token<string>();

          container.register({ token, value: "test" });

          const value = container.inject(token);

          expect(value).toBe("test");
        });

        it("should be able to inject token with value (object)", () => {
          const token = new Token<{ value: string }>();

          const value = { value: "test" };

          container.register({ token, value });

          const injected = container.inject(token);

          expect(injected).toBe(value);
        });

        it("should be able to inject token with value from parent container", () => {
          const token = new Token<string>();

          container.register({ token, value: "test" });

          const childContainer = container.childContainer("child");

          const value = childContainer.inject(token);

          expect(value).toBe("test");
        });

        it("should be able to unregister value token", () => {
          const token = new Token<string>();

          container.register({ token, value: "test" });

          const value = container.inject(token);

          expect(value).toBe("test");

          container.unregister(token);

          expect(() => container.inject(token)).toThrowError();
        });
      });

      describe("Factory Tokens", () => {
        it("should be able to inject token with factory", () => {
          const token = new Token<string>();

          container.register({ token, factory: () => "test" });

          const value = container.inject(token);

          expect(value).toBe("test");
        });

        it("should be able to inject token with factory (object)", () => {
          const token = new Token<{ value: string }>();

          const value = { value: "test" };

          container.register({ token, factory: () => value });

          const injected = container.inject(token);

          expect(injected).toBe(value);
        });

        it("should be able to inject token with factory from parent container", () => {
          const token = new Token<string>();

          container.register({ token, factory: () => "test" });

          const childContainer = container.childContainer("child");

          const value = childContainer.inject(token);

          expect(value).toBe("test");
        });

        it("should be able to inject token with factory with arguments", () => {
          const token = new Token<string>();

          container.register({ token, factory: (container, value: string) => value });

          const value = container.inject(token, "test");

          expect(value).toBe("test");
        });

        it("should be able to inject token with factory with arguments from parent container", () => {
          const token = new Token<string>();

          container.register({ token, factory: (container, value: string) => value });

          const childContainer = container.childContainer("child");

          const value = childContainer.inject(token, "test");

          expect(value).toBe("test");
        });

        it("should be able to unregister factory token", () => {
          const token = new Token<string>();

          container.register({ token, factory: () => "test" });

          const value = container.inject(token);

          expect(value).toBe("test");

          container.unregister(token);

          expect(() => container.inject(token)).toThrowError();
        });

        it("should be able to inject factory when factory injects something else", () => {
          class TokenClass {
            constructor() {}

            static scope = Scopes.Container();
          }

          // TODO: fix types
          const token = new Token<unknown>();

          container.register({
            token,
            factory: (container) => container.inject(TokenClass),
          });

          const value = container.inject(token);

          expect(value).toBeInstanceOf(TokenClass);
        });

        it("should throw error when there is a circular dependency", () => {
          const token = new Token<string>();

          container.register({
            token,
            factory: (container, value: string) => container.inject(token),
          });

          expect(() => container.inject(token, "test")).toThrowError(
            DependencyCycleError
          );
        });
      });

      describe("beforeInject", () => {
        it("should be able to use beforeInject for class injection with token", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Transient();
          }

          const token = new Token<TokenClass>();

          let called = false;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            token,
            class: TokenClass,
            beforeInject: (container, descriptor, args) => {
              called = true;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(token, "test");

          expect(called).toBe(true);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual(["test"]);
        });

        it("should be able to use beforeInject for class injection with class", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Transient();
          }

          let called = false;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            class: TokenClass,
            beforeInject: (container, descriptor, args) => {
              called = true;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(TokenClass, "test");

          expect(called).toBe(true);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual(["test"]);
        });

        it("should be able to use beforeInject for value injection", () => {
          const token = new Token<string>();

          let called = false;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            token,
            value: "test",
            beforeInject: (container, descriptor, args) => {
              called = true;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const value = container.inject(token);

          expect(called).toBe(true);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.value).toBe("test");
          expect(argsArg).toEqual([]);
        });

        it("should be able to use beforeInject for factory injection", () => {
          const token = new Token<string>();

          let called = false;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            token,
            factory: (container, a: string) => a + "!",
            beforeInject: (container, descriptor, args) => {
              called = true;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const value = container.inject(token, "test");

          expect(called).toBe(true);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.factory).toBeDefined();
          expect(argsArg).toEqual(["test"]);
        });
      });

      describe("beforeConstruct", () => {
        it("should be able to use beforeConstruct for class injection (transient scope)", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Transient();
          }

          let called = false;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            class: TokenClass,
            beforeCreate: (container, descriptor, args) => {
              called = true;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(TokenClass, "test");

          expect(called).toBe(true);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual(["test"]);

          const instance2 = container.inject(TokenClass, "test2");
          expect(instance2).not.toBe(instance);
          expect(argsArg).toEqual(["test2"]);
        });

        it("should be able to use beforeConstruct for class injection (singleton scope)", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Singleton();
          }

          let called = 0;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            class: TokenClass,
            beforeCreate: (container, descriptor, args) => {
              called += 1;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(TokenClass);

          expect(called).toBe(1);
          expect(containerArg).toBe(globalContainer);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual([]);

          const instance2 = container.inject(TokenClass);
          expect(instance2).toBe(instance);
          expect(called).toBe(1);
        });

        it("should be able to use beforeConstruct for class injection (container scope)", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Container();
          }

          let called = 0;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            class: TokenClass,
            beforeCreate: (container, descriptor, args) => {
              called += 1;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(TokenClass);

          expect(called).toBe(1);
          expect(containerArg).toBe(container);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual([]);

          const instance2 = container.inject(TokenClass);
          expect(instance2).toBe(instance);
          expect(called).toBe(1);
        });

        it("should be able to use beforeConstruct for class injection (resolution scope)", () => {
          class TokenClass {
            constructor(public value: string) {}

            static scope = Scopes.Resolution();
          }

          let called = 0;
          let containerArg: Container | null = null;
          let descriptorArg: AnyDescriptor | null = null;
          let argsArg: any[] | null = null;

          container.register({
            class: TokenClass,
            beforeCreate: (container, descriptor, args) => {
              called += 1;
              containerArg = container;
              descriptorArg = descriptor;
              argsArg = args;
            },
          });

          const instance = container.inject(TokenClass, "test");

          expect(called).toBe(1);
          expect(containerArg).toBeInstanceOf(Container); // child resolution container is expected
          expect(containerArg).not.toBe(container);
          // @ts-expect-error
          expect(descriptorArg.class).toBe(TokenClass);
          expect(argsArg).toEqual(["test"]);

          const instance2 = container.inject(TokenClass, "test2");
          expect(instance2).not.toBe(instance);
          expect(argsArg).toEqual(["test2"]);
        });
      });
    });
  });
});
