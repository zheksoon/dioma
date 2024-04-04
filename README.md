<h1 align="center">Dioma</h1>

<p align="center">  
  <img src="https://github.com/zheksoon/dioma/blob/main/assets/dioma-logo.webp?raw=true" alt="dioma" width="200" />
</p>
<p align="center">
  <b>Elegant dependency injection container for vanilla JavaScript and TypeScript</b>
</p>
<p align="center">
  <img alt="NPM Version" src="https://img.shields.io/npm/v/dioma?style=flat-square&color=%2364d4c1&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fdioma">
  <img alt="NPM package gzipped size" src="https://img.shields.io/bundlejs/size/dioma?style=flat-square&label=gzip&color=%2364d4c1">
  <img alt="Codecov" src="https://img.shields.io/codecov/c/github/zheksoon/dioma?style=flat-square&color=%2364d4c1">
</p>

## Features

- <b>Just do it</b> - no decorators, no annotations, no magic
- <b>Tokens</b> for class, value, and factory injection
- <b>Async</b> injection and dependency cycle detection
- <b>TypeScript</b> support
- <b>No</b> dependencies
- <b>Tiny</b> size

## Installation

```sh
npm install --save dioma

yarn add dioma
```

## Usage

To start injecting dependencies, you just need to add the `static scope` property to your class and use the `inject` function to get the instance of it. By default, `inject` makes classes "stick" to the container where they were first injected (more details in the [Class registration](#Class-registration) section).

Here's an example of using it for [Singleton](#singleton-scope) and [Transient](#transient-scope) scopes:

```typescript
import { inject, Scopes } from "dioma";

class Garage {
  open() {
    console.log("garage opened");
  }

  // Single instance of the class for the entire application
  static scope = Scopes.Singleton();
}

class Car {
  // injects instance of Garage
  constructor(private garage = inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("car parked");
  }

  // New instance of the class on every injection
  static scope = Scopes.Transient();
}

// Creates a new Car and injects Garage
const car = inject(Car);

car.park();
```

## Scopes

Dioma supports the following scopes:

- `Scopes.Singleton()` - creates a single instance of the class
- `Scopes.Transient()` - creates a new instance of the class on every injection
- `Scopes.Container()` - creates a single instance of the class per container
- `Scopes.Resolution()` - creates a new instance of the class every time, but the instance is the same for the entire resolution
- `Scopes.Scoped()` is the same as `Scopes.Container()`

### Singleton scope

Singleton scope creates a single instance of the class for the entire application.
The instances are stored in the global container, so anyone can access them.
If you want to isolate the class to a specific container, use the [Container](#Container-scope) scope.

A simple example you can see in the [Usage](#Usage) section.

Multiple singletons can be cross-referenced with each other using [async injection](#async-injection-and-circular-dependencies).

### Transient scope

Transient scope creates a new instance of the class on every injection:

```typescript
import { inject, Scopes } from "dioma";

class Engine {
  start() {
    console.log("Engine started");
  }

  static scope = Scopes.Singleton();
}

class Vehicle {
  constructor(private engine = inject(Engine)) {}

  drive() {
    this.engine.start();
    console.log("Vehicle driving");
  }

  static scope = Scopes.Transient();
}

// New vehicle every time
const vehicle = inject(Vehicle);

vehicle.drive();
```

Generally, transient scope instances can't be cross-referenced by the [async injection](#Async-injection-and-injection-cycles) with some exceptions.

### Container scope

Container scope creates a single instance of the class per container. It's the same as the singleton, but relative to the custom container.

The usage is the same as for the singleton scope, but you need to create a container first and use `container.inject` instead of `inject`:

```typescript
import { Container, Scopes } from "dioma";

const container = new Container();

class Garage {
  open() {
    console.log("garage opened");
  }

  // Single instance of the class for the container
  static scope = Scopes.Container();
}

// Register Garage on the container
container.register({ class: Garage });

class Car {
  // Use inject method of the container for Garage
  constructor(private garage = container.inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("car parked");
  }

  // New instance on every injection
  static scope = Scopes.Transient();
}

const car = container.inject(Car);

car.park();
```

Container-scoped classes usually are [registered in the container](#class-registration) first. Without it, the class will "stick" to the container it's used in.

### Resolution scope

Resolution scope creates a new instance of the class every time, but the instance is the same for the entire resolution:

```typescript
import { inject, Scopes } from "dioma";

class Query {
  static scope = Scopes.Resolution();
}

class RequestHandler {
  constructor(public query = inject(Query)) {}

  static scope = Scopes.Resolution();
}

class RequestUser {
  constructor(
    public request = inject(RequestHandler),
    public query = inject(Query)
  ) {}

  static scope = Scopes.Transient();
}

const requestUser = inject(RequestUser);

// The same instance of Query is used for each of them
requestUser.query === requestUser.request.query;
```

Resolution scope instances can be cross-referenced by the [async injection](#async-injection-and-circular-dependencies) without any issues.

## Injection with arguments

You can pass arguments to the constructor when injecting a class:

```typescript
import { inject, Scopes } from "dioma";

class Owner {
  static scope = Scopes.Singleton();

  petSomebody(pet: Pet) {
    console.log(`${pet.name} petted`);
  }
}

class Pet {
  constructor(public name: string, public owner = inject(Owner)) {}

  pet() {
    this.owner.petSomebody(this);
  }

  static scope = Scopes.Transient();
}

const pet = inject(Pet, "Fluffy");

pet.pet(); // Fluffy petted
```

Only transient and resolution scopes support argument injection.
Resolution scope instances are cached for the entire resolution, so the arguments are passed only once.

## Class registration

By default, `Scopes.Container` class injection is "sticky" - the class sticks to the container where it was first injected.

If you want to make a class save its instance in some specific parent container (see [Child containers](#Child-containers)), you can use class registration:

```typescript
const container = new Container();

const child = container.childContainer();

class FooBar {
  static scope = Scopes.Container();
}

// Register the Foo class in the parent container
container.register({ class: FooBar });

// Returns and cache the instance on parent container
const foo = container.inject(FooBar);

// Returns the FooBar instance from the parent container
const bar = child.inject(FooBar);

foo === bar; // true
```

You can override the scope of the registered class:

```typescript
container.register({ class: FooBar, scope: Scopes.Transient() });
```

To unregister a class, use the `unregister` method:

```typescript
container.unregister(FooBar);
```

After that, the class will be removed from the container and all its child containers, and the next injection will return a new instance.

## Injection with tokens

Instead of passing a class to the `inject`, you can use **tokens** instead.
The token injection can be used for **class, value, and factory** injection.
Here's detailed information about each type.

### Class tokens

Class tokens are useful to inject an abstract class or interface that has multiple implementations:

<details>

<summary><b>Here is an example of injecting an abstract interface</b></summary>

```typescript
import { Token, Scopes, globalContainer } from "dioma";

const wild = globalContainer.childContainer("Wild");

const zoo = wild.childContainer("Zoo");

interface IAnimal {
  speak(): void;
}

class Dog implements IAnimal {
  speak() {
    console.log("Woof");
  }

  static scope = Scopes.Container();
}

class Cat implements IAnimal {
  speak() {
    console.log("Meow");
  }

  static scope = Scopes.Container();
}

const animalToken = new Token<IAnimal>("Animal");

// Register Dog class with the token
wild.register({ token: animalToken, class: Dog });

// Register Cat class with the token
zoo.register({ token: animalToken, class: Cat });

// Returns Dog instance
const wildAnimal = wild.inject(animalToken);

// Returns Cat instance
const zooAnimal = zoo.inject(animalToken);
```

</details>

The class token registration can also override the scope of the class:

```typescript
wild.register({ token: animalToken, class: Dog, scope: Scopes.Transient() });
```

### Value tokens

Value tokens are useful to inject a constant value:

```typescript
import { Token } from "dioma";

const token = new Token<string>("Value token");

container.register({ token, value: "Value" });

const value = container.inject(token);

console.log(value); // Value
```

### Factory tokens

Factory tokens are useful to inject a factory function.
The factory takes the current container as the first argument and returns a value:

```typescript
import { Token } from "dioma";

const token = new Token<string>("Factory token");

container.register({ token, factory: (container) => "Value" });

const value = container.inject(token);

console.log(value); // Value
```

Factory function can also take additional arguments:

```typescript
const token = new Token<string>("Factory token");

container.register({
  token,
  factory: (container, a: string, b): string => a + b,
});

const value = container.inject(token, "Hello, ", "world!");

console.log(value); // Hello, world!
```

As a usual function, a factory can contain any additional logic, conditions, or dependencies.

## Child containers

You can create child containers to isolate the scope of the classes.
Child containers have a hierarchical structure, so Dioma searches instances top-down from the current container to the root container.
If the instance is not found, Dioma will create a new instance in the current container, or in the container where the class was registered.

Here's an example:

```typescript
import { Container, Scopes } from "dioma";

const container = new Container(null, "Parent");

const child = container.childContainer("Child");

class ParentClass {
  static scope = Scopes.Container();
}

class ChildClass {
  static scope = Scopes.Container();
}

container.register({ class: ParentClass });

child.register({ class: ChildClass });

// Returns ParentClass instance from the parent container
const parentInstance = child.inject(ParentClass);

// Returns ChildClass instance from the child container
const childInstance = child.inject(ChildClass);
```

## Async injection and circular dependencies

When you have a circular dependency, there will be an error `Circular dependency detected`. To solve this problem, you can use async injection.

<details>

<summary><b>Here is an example:</b></summary>

```typescript
import { inject, injectAsync, Scopes } from "dioma";

class A {
  constructor(private instanceB = inject(B)) {}

  doWork() {
    console.log("doing work A");
    this.instanceB.help();
  }

  static scope = Scopes.Singleton();
}

class B {
  private declare instanceA: A;

  // injectAsync returns a promise of the A instance
  constructor(private promiseA = injectAsync(A)) {
    this.promiseA.then((instance) => {
      this.instanceA = instance;
    });
  }

  help() {
    console.log("helping with work");
  }

  doAnotherWork() {
    console.log("doing work B");
    this.instanceA.doWork();
  }

  static scope = Scopes.Singleton();
}

const a = await injectAsync(A);
const b = await injectAsync(B);

// Wait until all promises are resolved
await globalContainer.waitAsync();

a.doWork();
b.doAnotherWork();
```

</details>

Async injection has an undefined behavior when there is a loop with transient dependencies. It may return an instance with an unexpected loop, or throw the `Circular dependency detected in async resolution` error, so it's better to avoid such cases.

As defined in the code above, you need to use `container.waitAsync()` or **wait for the next tick** to get all instance promises resolved, even if you use `await injectAsync(...)`.

Generally, if you expect your dependency to have an async resolution, it's better to inject it with `injectAsync`, as in the example above. But, you can also use `inject` for async injection as long as you wait for it as above.

Tokens also can be used for async injection as well:

```typescript
import { Token, Scopes } from "dioma";

const token = new Token<A>("A");

class B {
  private declare instanceA: A;

  // token in used for async injection
  constructor(private promiseA = injectAsync(token)) {
    this.promiseA.then((instance) => {
      this.instanceA = instance;
    });
  }
}
```

## TypeScript

Dioma is written in TypeScript and provides type safety out of the box:

```typescript
import { inject, Scopes, Injectable } from "dioma";

// Injectable interface makes sure the static scope is defined
class Database implements Injectable<typeof Database> {
  constructor(private url: string) {}

  connect() {
    console.log(`Connected to ${this.url}`);
  }

  static scope = Scopes.Singleton();
}

// Error, scope is not specified
class Repository implements Injectable<typeof Repository> {
  constructor(private db = inject(Database)) {}
}

inject(Repository); // Also type error, scope is not specified
```

Also, token and class injection infers the output types from the input types.
If available, arguments are also checked and inferred.

## API Reference

### `new Container(parent?, name?)`

Creates a new container with the specified parent container and name.

### `new Token<T>(name?)`

Creates a new token with the specified type and name.

### `container.inject(classOrToken, ...args)`

Injects the instance of the class or token, and provides arguments to the constructor or factory function.

### `container.injectAsync(classOrToken, ...args)`

Injects the promise of the instance of the class or token, and provides arguments to the constructor or factory function.

### `container.waitAsync()`

Returns a promise that resolves when all current async injections are resolved.

### `container.register({ class, token?, scope? })`

### `container.register({ token, value })`

### `container.register({ token, factory })`

Registers the class, value, or factory with the token in the container.

### `container.unregister(classOrToken)`

Unregister the class or token from the container.

### `container.childContainer(name?)`

Creates a new child container with the specified name.

### Global exports

Global container:

- `globalContainer` - the global container that is used by default for the `inject` function.
- `inject` - the function to inject the instance of the class or token.
- `injectAsync` - the function to inject the promise of the instance of the class or token.

Errors:

- `DependencyCycleError` - thrown when a circular dependency is detected.
- `AsyncDependencyCycleError` - thrown when a circular dependency is detected in async resolution.
- `ArgumentsError` - thrown when the arguments are passed to unsupported scopes.
- `TokenNotRegisteredError` - thrown when the token is not registered in the container.

## Author

Eugene Daragan

## License

MIT
