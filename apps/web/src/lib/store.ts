import { useSyncExternalStore } from "react";

export interface Store<T> {
  get(): T;
  set(value: T): void;
  /** Re-renders when the value changes. On the server (and while hydrating) it is always the first value. */
  use(): T;
}

/** A small shared value, for components in different trees (a page and the layout) that can't share context. */
export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };
  const get = () => value;
  return {
    get,
    set(next) {
      value = next;
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, get, () => initial),
  };
}
