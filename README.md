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
- <b>No</b> dependencies
- <b>Async</b> injection and dependency cycles detection
- <b>TypeScript</b> support
- <b>Tiny</b> size

## Installation

```sh
npm install dioma

yarn add dioma
```

## Usage

To start injecting dependencies you just need to add the `static scope` property to your class and use the `inject` function to get the instance of a class.
Here's an example of using it for [Singleton](#singleton-scope) and [Transient](#transient-scope) scopes:

```typescript
import { inject, Scopes } from "dioma";

class Garage {
  open() { console.log("garage opened"); }

  // Single instance of the class for the entire application
  static scope = Scopes.Singleton();
}

class Car {
  constructor(private garage = inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("car parked");
  }

  // New instance of the class every time it is requested
  static scope = Scopes.Transient();
}

// Creates a new Car and injects Garage
const car = inject(Car);

сar.park();
```

## Scopes

Dioma supports the following scopes:

- `Scopes.Singleton()` - creates a single instance of the class
- `Scopes.Transient()` - creates a new instance of the class every time it is requested
- `Scopes.Container()` - creates a single instance of the class per container
- `Scopes.Resolution()` - creates a new instance of the class every time, but the instance is the same for the entire resolution
- `Scopes.Scoped()` - the same as `Scopes.Container()`

### Singleton scope

Singleton scope creates a single instance of the class for the entire application. The instances are stored in the global container, so any child containers will have access to it.

A simple example you can see in the [Usage](#Usage) section.

Multiple singletons can be cross-referenced with each other using [async injection](#async-injection-and-circular-dependencies).

### Transient scope

Transient scope creates a new instance of the class every time it is requested.

```typescript
class Engine {
  start() { console.log("Engine started"); }

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

// new vehicle every time
const vehicle = inject(Vehicle);

vehicle.drive();
```

Transient scope instances can't be cross-referenced by the [async injection](#Async-injection-and-injection-cycles) as it's an infinite recursion.

### Container scope

Container scope creates a single instance of the class per container. It's the same as the singleton, but relative to the custom container.

The usage is the same as for the singleton scope, but you need to create a container first and use `container.inject` instead of `inject`:

```typescript
import { Container, Scopes } from "dioma";

const container = new Container();

class Garage {
  open() { console.log("garage opened"); }

  // Single instance of the class for the container where it's used
  static scope = Scopes.Container();
}

class Car {
  // use the container to inject the Garage, so it sticks to it
  constructor(private garage = container.inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("car parked");
  }

  // New instance of the class every time it is requested
  static scope = Scopes.Transient();
}

const car = inject(Car);
```

### Resolution scope

Resolution scope creates a new instance of the class every time, but the instance is the same for the entire resolution.

```typescript
import { inject, Scopes } from "dioma";

class Query {
  constructor() {}

  run() { console.log("Query run"); }

  static scope = Scopes.Resolution();
}

class RequestHandler {
  constructor(public query = inject(Query)) {}

  static scope = Scopes.Resoltion();
}

class RequestUser {
  constructor(
    public request = inject(RequestHandler),
    public query = inject(Query),
  ) {}

  static scope = Scopes.Transient();
}

const requestUser = inject(RequestUser);

// the same instance of Query is used for each of them
requestUser.query === requestUser.request.query;
```

## Child containers

You can create child containers to isolate the scope of the classes:

<details>
<summary>Here is an example</summary>

```typescript
import { Container, Scopes } from "dioma";

const container = new Container();

const child = container.childContainer();

class Land {
  static scope = Scopes.Container();
}

// register the Land class in the parent container
container.inject(Land);

class Garage {
  // Land resolves from the the parent container
  constructor(private land = child.inject(Land)) {}

  open() { console.log("Garage opened"); }

  static scope = Scopes.Container();
}

// now Garage instance is stuck to the child container
child.inject(Garage);

class Car {
  constructor(private garage = child.inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("Car parked");
  }

  static scope = Scopes.Transient();
}

const car = child.inject(Car);

car.park();
```

</details>

## Async injection and circular dependencies

When you have a circular dependency, there will be an error `Circular dependency detected`. To solve this problem, you can use async injection.

```typescript
import { inject, injectAsync, Scopes } from "dioma";

class A {
  constructor(private b = inject(B)) {}

  doWork() {
    console.log("doing work");
    this.b.help();
  }

  static scope = Scopes.Singleton();
}

class B {
  // injectAsync returns a promise of the A instance
  constructor(aPromise = injectAsync(A)) {
    aPromise.then((instance) => {
      this.a = instance;
    });
  }

  help() {
    console.log("helping with work")
  }

  static scope = Scopes.Singleton();
}

const a = inject(A);

// all cycles are resolved by the end of the event loop
await new Promise((resolve) => setTimeout(resolve, 0));

await a.init();
```

Please note that async injection has an undefined behavior when used with `Scopes.Transient()`. It may return an instance with an unexpected loop, or throw the `Circular dependency detected in async resolution` error.

As defined in the code above, you need to wait for the next tick to get all instance promises resolved. 

In this example, doing `const b = await injectAsync(B)` will only return an instance with promise, not actual A, so it gets resolved only by the next tick.

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

// error, scope is not specified
class Repository implements Injectable<typeof Repository> {
  constructor(private db = inject(Database)) {}
}

inject(Repository); // also type error, scope is not specified
```

## Author

Eugene Daragan

## License

MIT
