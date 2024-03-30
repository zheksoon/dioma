import {
  Container,
  Scopes,
  inject,
  globalContainer,
  CycleDependencyError,
  AsyncCycleDependencyError,
  injectAsync,
  ArgumentsError,
  Token,
} from "../src";
import { describe, it, expect, beforeEach } from "vitest";

const delay = (ms: number = 0) => new Promise((resolve) => setTimeout(resolve, ms));

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

      const instance1 = parentContainer.getInstance(ParentClass);

      const childContainer = parentContainer.childContainer();

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

      const instance1 = inject(DefaultClass);

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

      expect(() => container.inject(CircularDependencyA)).toThrowError(
        CycleDependencyError
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
        CycleDependencyError
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

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await delay();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for singleton scope (both async)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(instanceBPromise = injectAsync(CircularDependencyB)) {
          instanceBPromise.then((instance) => {
            this.instanceB = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceA: CircularDependencyA;

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      const instance = inject(CircularDependencyA);

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      // const instance2 = inject(CircularDependencyB);

      // await delay();
      // await delay();

      // expect(instance2).toBeInstanceOf(CircularDependencyB);
      // expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      // expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      // expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for singleton scope (async cycle of 3)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(instanceBPromise = injectAsync(CircularDependencyB)) {
          instanceBPromise.then((instance) => {
            this.instanceB = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceC: CircularDependencyC;

        constructor(instanceCPromise = injectAsync(CircularDependencyC)) {
          instanceCPromise.then((instance) => {
            this.instanceC = instance;
          });
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        public instanceA: CircularDependencyA;

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
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
          instanceBPromise = injectAsync(CircularDependencyB),
          instanceCPromise = injectAsync(CircularDependencyC)
        ) {
          Promise.all([instanceBPromise, instanceCPromise]).then(
            ([instanceB, instanceC]) => {
              this.instanceB = instanceB;
              this.instanceC = instanceC;
            }
          );
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyB {
        public instanceA: CircularDependencyA;
        public instanceC: CircularDependencyC;

        constructor(
          instanceCPromise = injectAsync(CircularDependencyC),
          instanceAPromise = injectAsync(CircularDependencyA)
        ) {
          Promise.all([instanceCPromise, instanceAPromise]).then(
            ([instanceC, instanceA]) => {
              this.instanceC = instanceC;
              this.instanceA = instanceA;
            }
          );
        }

        static scope = Scopes.Singleton();
      }

      class CircularDependencyC {
        public instanceA: CircularDependencyA;
        public instanceB: CircularDependencyB;

        constructor(
          instanceAPromise = injectAsync(CircularDependencyA),
          instanceBPromise = injectAsync(CircularDependencyB)
        ) {
          Promise.all([instanceAPromise, instanceBPromise]).then(
            ([instanceA, instanceB]) => {
              this.instanceA = instanceA;
              this.instanceB = instanceB;
            }
          );
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

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Resolution();
      }

      const instance = inject(CircularDependencyA);

      await delay();
      await delay();
      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await delay();
      await delay();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).toBe(instance2);
    });

    it("should be able to inject async for resolution scope (both async)", async () => {
      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(instanceBPromise = injectAsync(CircularDependencyB)) {
          instanceBPromise.then((instance) => {
            this.instanceB = instance;
          });
        }

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

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB.instanceA).toBe(instance);

      const instance2 = inject(CircularDependencyB);

      await delay();

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

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB).not.toBe(instance.instanceB.instanceA.instanceB);
      expect(instance.instanceB.instanceA).not.toBe(instance);

      const instance2 = inject(CircularDependencyB);

      expect(instance).not.toBe(instance2);

      await delay();

      expect(instance2).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
      expect(instance2.instanceA.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance2.instanceA.instanceB).not.toBe(instance2);
    });

    it("should be able to inject async for multiple transient classes", async () => {
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

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);
      expect(instance.instanceB.instanceC).toBeInstanceOf(CircularDependencyC);
      expect(instance.instanceB.instanceC.instanceA).toBeInstanceOf(CircularDependencyA);

      expect(instance.instanceB.instanceC.instanceA).not.toBe(instance);
      expect(instance.instanceB.instanceC.instanceA.instanceB).not.toBe(
        instance.instanceB
      );
      expect(instance.instanceB.instanceC.instanceA.instanceB.instanceC).not.toBe(
        instance.instanceB.instanceC
      );
    });

    it("should throw error when trying to inject transients with async only loop", async () => {
      let errorA: Error | null = null;
      let errorB: Error | null = null;

      class CircularDependencyA {
        public instanceB: CircularDependencyB;

        constructor(instanceBPromise = injectAsync(CircularDependencyB)) {
          instanceBPromise
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
        declare instanceA: CircularDependencyA;

        constructor(instanceAPromise = injectAsync(CircularDependencyA)) {
          instanceAPromise
            .then((instance) => {
              this.instanceA = instance;
            })
            .catch((error) => {
              errorB = error;
            });
        }

        static scope = Scopes.Transient();
      }

      const instance = inject(CircularDependencyA);

      await delay();

      expect(errorA).toBeInstanceOf(AsyncCycleDependencyError);
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

        constructor(
          public instanceAPromise = container.injectAsync(CircularDependencyA)
        ) {
          instanceAPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Container();
      }

      const instance = container.inject(CircularDependencyA);

      await delay();

      expect(instance).toBeInstanceOf(CircularDependencyA);
      expect(instance.instanceB).toBeInstanceOf(CircularDependencyB);

      // const instance2 = container.inject(CircularDependencyB);

      // await delay();
      // await delay();

      // expect(instance2).toBeInstanceOf(CircularDependencyB);
      // expect(instance2.instanceA).toBeInstanceOf(CircularDependencyA);
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
        constructor(public value: string, public instanceB = inject(ClassB, "hello")) {}

        static scope = Scopes.Resolution();
      }

      class ClassB {
        public instanceA: ClassA;

        constructor(public value: string, aPromise = injectAsync(ClassA, "world")) {
          aPromise.then((instance) => {
            this.instanceA = instance;
          });
        }

        static scope = Scopes.Transient();
      }

      const instanceB = inject(ClassB, "test");

      await delay();

      expect(instanceB).toBeInstanceOf(ClassB);
      expect(instanceB.value).toBe("test");

      expect(instanceB.instanceA).toBeInstanceOf(ClassA);
      expect(instanceB.instanceA.value).toBe("world");
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

      it("should be able to inject token", () => {
        const token = new Token();

        class TokenClass {
          constructor() {}

          static scope = Scopes.Transient();
        }

        container.register({ token, class: TokenClass });

        const instance = container.inject(token);

        expect(instance).toBeInstanceOf(TokenClass);
      });

      it("should be able to inject token with arguments", () => {
        const token = new Token();

        class TokenClass {
          constructor(public value: string) {}

          static scope = Scopes.Transient();
        }

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
        const token = new Token();

        class TokenClass {
          static scope = Scopes.Container();
        }

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
        const tokenA = new Token();
        const tokenB = new Token();

        class A {
          constructor(public instanceB = container.inject(B)) {}

          static scope = Scopes.Container();
        }

        class B {
          declare instanceA: A;

          constructor(promiseA = container.injectAsync(A)) {
            promiseA.then((instance) => {
              this.instanceA = instance;
            });
          }

          static scope = Scopes.Container();
        }

        container.register({ token: tokenA, class: A });
        container.register({ token: tokenB, class: B });

        const instance = container.inject(tokenA);

        expect(instance).toBeInstanceOf(A);

        await delay();

        expect(instance.instanceB).toBeInstanceOf(B);
        expect(instance.instanceB.instanceA).toBeInstanceOf(A);
        expect(instance.instanceB.instanceA).toBe(instance);

        const instance2 = container.inject(tokenB);

        expect(instance2).toBeInstanceOf(B);

        await delay();

        expect(instance2.instanceA).toBeInstanceOf(A);
        expect(instance2.instanceA.instanceB).toBeInstanceOf(B);
        expect(instance2.instanceA.instanceB).toBe(instance2);
      });

      it("should be able to injectAsync token in async loop", async () => {
        const tokenA = new Token();
        const tokenB = new Token();

        class A {
          constructor(public instanceB = container.inject(B)) {}

          static scope = Scopes.Container();
        }

        class B {
          declare instanceA: A;

          constructor(promiseA = container.injectAsync(A)) {
            promiseA.then((instance) => {
              this.instanceA = instance;
            });
          }

          static scope = Scopes.Container();
        }

        container.register({ token: tokenA, class: A });
        container.register({ token: tokenB, class: B });

        const instance = await container.injectAsync(tokenA);

        expect(instance).toBeInstanceOf(A);

        await delay();

        expect(instance.instanceB).toBeInstanceOf(B);
        expect(instance.instanceB.instanceA).toBeInstanceOf(A);
        expect(instance.instanceB.instanceA).toBe(instance);

        const instance2 = await container.injectAsync(tokenB);

        expect(instance2).toBeInstanceOf(B);

        await delay();

        expect(instance2.instanceA).toBeInstanceOf(A);
        expect(instance2.instanceA.instanceB).toBeInstanceOf(B);
        expect(instance2.instanceA.instanceB).toBe(instance2);
      });

      it("should be able to inject token in async loop", async () => {
        const tokenA = new Token();
        const tokenB = new Token();

        class A {
          constructor(public instanceB = container.inject(tokenB)) {}

          static scope = Scopes.Container();
        }

        class B {
          declare instanceA: A;

          constructor(promiseA = container.injectAsync(tokenA)) {
            promiseA.then((instance) => {
              this.instanceA = instance;
            });
          }

          static scope = Scopes.Container();
        }

        container.register({ token: tokenA, class: A });
        container.register({ token: tokenB, class: B });

        const instance = container.inject(tokenA);

        expect(instance).toBeInstanceOf(A);

        await delay();

        expect(instance.instanceB).toBeInstanceOf(B);
        expect(instance.instanceB.instanceA).toBeInstanceOf(A);
        expect(instance.instanceB.instanceA).toBe(instance);
      });

      it("should get the same instance of inject token and class", () => {
        const token = new Token();

        class TokenClass {
          constructor() {}

          static scope = Scopes.Container();
        }

        container.register({ token, class: TokenClass });

        const instance = container.inject(token);
        const instance2 = container.inject(TokenClass);

        expect(instance).toBe(instance2);
      });

      it("should unregister token", () => {
        const token = new Token();

        class TokenClass {
          constructor() {}

          static scope = Scopes.Container();
        }

        container.register({ token, class: TokenClass });

        const instance = container.inject(token);

        expect(instance).toBeInstanceOf(TokenClass);

        container.unregister(token);

        expect(() => container.inject(token)).toThrowError();
      });

      it("should unregister token from parent container", () => {
        const token = new Token();

        class TokenClass {
          constructor() {}

          static scope = Scopes.Container();
        }

        container.register({ token, class: TokenClass });

        const childContainer = container.childContainer("child");

        const instance = childContainer.inject(token);

        expect(instance).toBeInstanceOf(TokenClass);

        container.unregister(token);

        expect(() => childContainer.inject(token)).toThrowError();
      });
    });
  });
});
