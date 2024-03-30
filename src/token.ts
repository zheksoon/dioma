import type { ScopedClass } from "./types";

export class Token<T extends InstanceType<ScopedClass>> {
  constructor(public readonly name?: string) {}
}
