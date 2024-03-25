<h1 align="center">Dioma</h1>

<p align="center">  
  <img src="https://github.com/zheksoon/dioma/blob/main/assets/dioma-logo.webp?raw=true" alt="dioma" width="200" />
</p>
<p align="center">
  <b>Elegant dependency injection container for vanilla JavaScript and TypeScript</b>
</p>
<p align="center">
  <img alt="npm package minimized gzipped size" src="https://img.shields.io/bundlejs/size/dioma?style=flat-square&label=gzip&color=%2364d4c1">
  <img alt="Codecov" src="https://img.shields.io/codecov/c/github/zheksoon/dioma?style=flat-square&color=%2364d4c1">
</p>

## Features

- Just do it - no decorators, no annotations, no magic
- No dependencies
- Async injection and loop detection
- TypeScript support
- Tiny size

## Installation

```sh
npm install dioma

yarn add dioma
```

## Usage

To start injecting dependencies you just need to add a `static scope` property to your class and use `inject` function to get the instance of the class.

```typescript
import { inject, Scopes } from "dioma";

class Engine {
  start() {
    console.log("Engine started");
  }

  static scope = Scopes.Singleton();
}

class Car {
  constructor(private engine = inject(Engine)) {}

  start() {
    this.engine.start();
  }

  static scope = Scopes.Transient();
}

const car = inject(Car);

car.start();
```

## Scopes

Dioma supports the following scopes:

- `Scopes.Singleton()` - creates a single instance of the class
- `Scopes.Transient()` - creates a new instance of the class every time it is requested
- `Scopes.Container()` - creates a single instance of the class per container
- `Scopes.Resolution()` - creates a new instance of the class every time, but the instance is the same for the entire resolution
- `Scopes.Scoped()` - the same as `Scoped.Container()`

### Singleton scope

```typescript
import { inject, Scopes } from "dioma";

class Engine {
  start() {
    console.log("Engine started");
  }

  static scope = Scopes.Singleton();
}

class Car {
  constructor(private engine = inject(Engine)) {}

  start() {
    this.engine.start();
  }
}

const car = inject(Car);

car.start();
```

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
    this.dishes = [inject(Dish), inject(Dish), inject(Dish)]; // 3 different dishes
  }

  ealAll() {
    this.dishes.forEach((dish) => dish.eat());
  }

  static scope = Scopes.Singleton();
}

const kitchen = inject(Kitchen);

kitchen.ealAll();
```

### Container scope

Container scope creates a single instance of the class per container.

```typescript
import { Scopes, Container } from "dioma";

const container = new Container();

class Engine {
  start() {
    console.log("Engine started");
  }

  static scope = Scopes.Container();
}

class Car {
  constructor(private engine = container.inject(Engine)) {
    // this.engine is the same instance for all Car instances
  }

  start() {
    this.engine.start();
  }

  static scope = Scopes.Container();
}

const car = container.inject(Car);

car.start();
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

class Repository {
  constructor(private request = inject(Request), private query = inject(Query)) {
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

## Async injection and injection cycles

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

Please note that async injection has an undefined behavior when used with `Scopes.Transient()`. It may return an instance with unexpected loop, or throw the `Circular dependency detected in async resolution` error.

## Author

Eugene Daragan

## License

MIT
