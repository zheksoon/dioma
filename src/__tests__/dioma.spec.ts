import { Container, Scopes, inject } from "../dioma";
import { describe, it, expect } from "vitest";

describe("Dioma", () => {
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

      parentContainer.register(ParentClass);

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
});
