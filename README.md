<h1 align="center">Dioma</h1>

<p align="center">  
  <img src="https://github.com/zheksoon/dioma/blob/main/assets/dioma-logo.webp?raw=true" alt="dioma" width="200" />
  <br/>
  <b>Elegant dependency injection container for vanilla JavaScript and TypeScript</b>
</p>

## Features

- Just do it - no decorators, no annotations, no magic
- No dependencies
- TypeScript support
- Tiny size

## Installation

```sh
npm install dioma

yarn add dioma
```

## Usage

### Basics

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

### Scopes

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

## Author

Eugene Daragan

## License

MIT
