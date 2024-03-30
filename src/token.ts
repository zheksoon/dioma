export class Token<T extends new (...args: any[]) => any> {
  constructor(public readonly name?: string) {}
}
