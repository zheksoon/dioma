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

To start injecting dependencies you just need to add the `static scope` property to your class and use `inject` function to get the instance of a class.
Here's an example of using it for [Singleton](#singleton-scope) and [Transient](#transient-scope) scopes:

```typescript
import { inject, Scopes } from "dioma";

class Garage {
  open() {
    console.log("Garage opened");
  }

  close() {
    console.log("Garage closed");
  }

  // Single instance of the class for the entire application
  static scope = Scopes.Singleton();
}

class Car {
  constructor(private garage = inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("Car parked");
    this.garage.close();
  }

  // New instance of the class every time it is requested
  static scope = Scopes.Transient();
}

// Creates a new Car and injects Garage
const car = inject(Car);

car.park();
```

## Scopes

Dioma supports the following scopes:

- `Scopes.Singleton()` - creates a single instance of the class
- `Scopes.Transient()` - creates a new instance of the class every time it is requested
- `Scopes.Container()` - creates a single instance of the class per container
- `Scopes.Resolution()` - creates a new instance of the class every time, but the instance is the same for the entire resolution
- `Scopes.Scoped()` - the same as `Scoped.Container()`

### Singleton scope

Singleton scope creates a single instance of the class for the entire application. The instances are stored in the global container, so any child containers will have access to it.

A simple example you can see in the [Usage](#Usage) section.

Multiple singletons can be cross-referenced with each other using [async injection](#async-injection-and-circular-dependencies).

### Transient scope

Transient scope creates a new instance of the class every time it is requested.

```typescript
import { inject, Scopes } from "dioma";

class Dish {
  constructor() {
    this.name = getRandomDish();
  }

  eat() {
    console.log(`Eating ${this.name}`);
  }

  static scope = Scopes.Transient();
}

class Kitchen {
  constructor() {
    // 3 different dishes
    this.dishes = [inject(Dish), inject(Dish), inject(Dish)];
  }

  eatAll() {
    this.dishes.forEach((dish) => dish.eat());
  }

  static scope = Scopes.Singleton();
}

const kitchen = inject(Kitchen);

kitchen.ealAll();
```

Transient scope instances can't be cross-referenced by the [async injection](#Async-injection-and-injection-cycles) as it's an infinite recursion.

### Container scope

Container scope creates a single instance of the class per container. It's the same as the singleton, but relative to the custom container.

The usage is the same as for the singleton scope, but you need to create a container first, and use `container.inject` instead of `inject`:

```typescript
import { Container, Scopes } from "dioma";

const container = new Container();

class Garage {
  open() {
    console.log("Garage opened");
  }

  close() {
    console.log("Garage closed");
  }

  static scope = Scopes.Container();
}

class Car {
  constructor(private garage = container.inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("Car parked");
    this.garage.close();
  }

  static scope = Scopes.Transient();
}

const car = container.inject(Car);

car.park();
```

### Resolution scope

Resolution scope creates a new instance of the class every time, but the instance is the same for the entire resolution.

```typescript
import { inject, Scopes } from "dioma";

class Query {
  makeQuery() {
    console.log("Query made");
  }

  static scope = Scopes.Resolution();
}

class Request {
  constructor(private query = inject(Query)) {}

  makeRequest() {
    this.query.makeQuery();
  }

  static scope = Scopes.Resolution();
}

class Handler {
  constructor(
    private request = inject(Request),
    private query = inject(Query)
  ) {
    // both this.query and this.request.query are the same instance
  }

  makeRequest() {
    this.request.makeRequest();
    this.query.makeQuery();
  }

  static scope = Scopes.Transient();
}

const repository = inject(Repository);
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

// register Land in the parent container
container.inject(Land);

class Garage {
  // Land resolves to the singleton from the the parent container
  constructor(private land = child.inject(Land)) {}

  open() {
    console.log("Garage opened");
  }

  close() {
    console.log("Garage closed");
  }

  static scope = Scopes.Container();
}

class Car {
  constructor(private garage = child.inject(Garage)) {}

  park() {
    this.garage.open();
    console.log("Car parked");
    this.garage.close();
  }

  static scope = Scopes.Transient();
}

// car.garage is registered in the child container
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

  async init() {
    await this.b.init();
  }

  static scope = Scopes.Singleton();
}

class B {
  constructor(aPromise = injectAsync(A)) {
    aPromise.then((a) => {
      this.a = a;
    });
  }

  async init() {
    await this.a.init();
  }

  static scope = Scopes.Singleton();
}

const a = inject(A);

// all cycles are resolved by the end of the event loop
await new Promise((resolve) => setTimeout(resolve, 0));

await a.init();
```

Please note that async injection has an undefined behavior when used with `Scopes.Transient()`. It may return an instance with an unexpected loop, or throw the `Circular dependency detected in async resolution` error.

## TypeScript

Dioma is written in TypeScript and provides type safety out of the box:

```typescript
import { inject, Scopes, Injectable } from "dioma";

// good, scope is specified
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

inject(Repository); // type error, scope is not specified
```

## Author

Eugene Daragan

## License

MIT
