export class DependencyCycleError extends Error {
  constructor() {
    super("Circular dependency detected");
  }
}

export class AsyncDependencyCycleError extends Error {
  constructor() {
    super("Circular dependency detected in async resolution");
  }
}

export class ArgumentsError extends Error {
  constructor(scope: string, className: string) {
    super(`Arguments are not supported for ${scope} of ${className}`);
  }
}

export class TokenNotRegisteredError extends Error {
  constructor() {
    super("Token is not registered in the container");
  }
}
