import { globalContainer } from "./container";
import { ArgumentsError } from "./errors";
import type { ScopeHandler } from "./types";

export class Scopes {
  public static Singleton(): ScopeHandler {
    return function SingletonScope(cls, args) {
      if (args.length > 0) {
        throw new ArgumentsError(SingletonScope.name, cls.name);
      }

      return globalContainer.$getInstance(cls);
    };
  }

  public static Transient(): ScopeHandler {
    return function TransientScope(cls, args) {
      return new cls(...args);
    };
  }

  public static Container(): ScopeHandler {
    return function ContainerScope(cls, args, container) {
      if (args.length > 0) {
        throw new ArgumentsError(ContainerScope.name, cls.name);
      }

      return container.$getInstance(cls);
    };
  }

  public static Resolution(): ScopeHandler {
    return function ResolutionScope(cls, args, _, resolutionContainer) {
      return resolutionContainer.$getInstance(cls, args);
    };
  }

  public static Scoped = Scopes.Container;
}
