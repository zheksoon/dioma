import { globalContainer } from "./container";
import { ArgumentsError } from "./errors";
import type { ScopeHandler } from "./types";

export class Scopes {
  public static Singleton(): ScopeHandler {
    return function SingletonScope(descriptor, args) {
      if (args.length > 0) {
        throw new ArgumentsError(SingletonScope.name, descriptor.class.name);
      }

      return globalContainer.$getInstance(descriptor);
    };
  }

  public static Transient(): ScopeHandler {
    return function TransientScope(descriptor, args, container) {
      return container.$getInstance(descriptor, args, false);
    };
  }

  public static Container(): ScopeHandler {
    return function ContainerScope(descriptor, args, container) {
      if (args.length > 0) {
        throw new ArgumentsError(ContainerScope.name, descriptor.class.name);
      }

      return container.$getInstance(descriptor);
    };
  }

  public static Resolution(): ScopeHandler {
    return function ResolutionScope(descriptor, args, _, resolutionContainer) {
      return resolutionContainer.$getInstance(descriptor, args);
    };
  }

  public static Scoped = Scopes.Container;
}
