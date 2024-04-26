let microtaskPromise: Promise<void> | null = null;

export const waitForMicrotaskEnd = (cb: () => any) => {
  if (microtaskPromise) {
    return;
  }

  microtaskPromise = Promise.resolve().then(() => {
    microtaskPromise = null;
    cb();
  });
};
