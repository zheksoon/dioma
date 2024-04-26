import { globalContainer } from "./container";
import { ArgumentsError } from "./errors";
import type { ScopeHandler } from "./types";

export class Scopes {
  public static Singleton(): ScopeHandler {
    return function SingletonScope(descriptor, args) {
      if (args.length > 0) {
        throw new ArgumentsError(SingletonScope.name, descriptor.class.name);
      }

      return globalContainer.$getOrCreateInstance(descriptor);
    };
  }

  public static Transient(): ScopeHandler {
    return function TransientScope(descriptor, args, container) {
      // @ts-ignore
      container.checkResolutionsLoop(descriptor);

      return container.$getOrCreateInstance(descriptor, args, false);
    };
  }

  public static Container(): ScopeHandler {
    return function ContainerScope(descriptor, args, container) {
      if (args.length > 0) {
        throw new ArgumentsError(ContainerScope.name, descriptor.class.name);
      }

      return container.$getOrCreateInstance(descriptor);
    };
  }

  public static Resolution(): ScopeHandler {
    return function ResolutionScope(descriptor, args, _, resolutionContainer) {
      return resolutionContainer.$getOrCreateInstance(descriptor, args);
    };
  }

  public static Scoped = Scopes.Container;
}
