import { a } from "vite-node/index-WT31LSgS";
import {
  Container,
  Scopes,
  inject,
  globalContainer,
  CycleDependencyError,
  injectAsync,
} from "../dioma";
import { describe, it, expect, beforeEach } from "vitest";

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
        static scope = Scopes.Scoped();
      }

      const parentContainer = new Container();

      // @ts-expect-error
      const instance1 = parentContainer.getInstance(ParentClass);

      const childContainer = parentContainer.childContainer();

      // @ts-expect-error
      const instance2 = childContainer.getInstance(ParentClass);

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

      // @ts-expect-error
      const instance1 = inject(DefaultClass);

      // @ts-expect-error
      const instance2 = inject(DefaultClass);

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

      expect(() => inject(CircularDependencyA)).toThrowError(CycleDependencyError);
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

      expect(() => container.inject(CircularDependencyA)).toThrowError(CycleDependencyError);
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

      expect(() => container.inject(CircularDependencyA)).toThrowError(CycleDependencyError);
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

      expect(() => inject(CircularDependencyA)).toThrowError(CycleDependencyError);
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

      expect(() => inject(CircularDependencyA)).toThrowError(CycleDependencyError);

      expect(() => inject(CircularDependencyB)).toThrowError(CycleDependencyError);

      expect(() => inject(CircularDependencyC)).toThrowError(CycleDependencyError);
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

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await Promise.resolve();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);

      const instance2 = inject(CircularDependencyB);

      await Promise.resolve();
      await Promise.resolve();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
    });

    it("should be able to inject async for resolution scope", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Resolution();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      await Promise.resolve();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);

      const instance2 = inject(CircularDependencyB);

      await Promise.resolve();
      await Promise.resolve();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
    });

    it("should be able to inject async for transient scope", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(public instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await Promise.resolve();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);

      const instance2 = inject(CircularDependencyB);

      await Promise.resolve();
      await Promise.resolve();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
    });

    it("should be able to inject async for container scope", async () => {
      const container = new Container();

      class CircularDependencyA {
        constructor(public instanceB = container.inject(CircularDependencyB)) {}

        static scope = Scopes.Container();
      }

      class CircularDependencyB {
        declare instanceA: CircularDependencyA;

        constructor(public instanceAPromise = container.injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Container();
      }

      const instance = container.inject(CircularDependencyA);

      await Promise.resolve();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);

      const instance2 = container.inject(CircularDependencyB);

      await Promise.resolve();
      await Promise.resolve();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
    });

    it.skip("should be able to inject async for multiple classes", async () => {
      class CircularDependencyA {
        constructor(public instanceB = inject(CircularDependencyB)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyB {
        constructor(public instanceC = inject(CircularDependencyC)) {}

        static scope = Scopes.Transient();
      }

      class CircularDependencyC {
        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await Promise.resolve();
      await Promise.resolve();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB.instanceC.instanceA).toBe(instance);
    });
  });
});
