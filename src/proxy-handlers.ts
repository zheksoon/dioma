export const proxyHandlers: readonly string[] = [
    'apply',
    'construct',
    'defineProperty',
    'deleteProperty',
    'getOwnPropertyDescriptor',
    'getPrototypeOf',
    'has',
    'isExtensible',
    'ownKeys',
    'preventExtensions',
    'setPrototypeOf',

    // reflect-metadata - Compat with typescript decorators and metadata.
    'decorate',
    'defineMetadata',
    'getMetadata',
    'hasMetadata',
    'getOwnMetadata',
    'hasOwnMetadata',
    'metadata'
] as const;