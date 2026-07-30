export const SESSION_TOKEN_CHANGED = "session-token-changed";

export function notifySessionTokenChanged(target: EventTarget = window): void {
  target.dispatchEvent(new Event(SESSION_TOKEN_CHANGED));
}

export function subscribeToSessionTokenChanges(target: EventTarget, listener: () => void): () => void {
  target.addEventListener(SESSION_TOKEN_CHANGED, listener);
  return () => target.removeEventListener(SESSION_TOKEN_CHANGED, listener);
}

export type SerialTaskQueue = (task: () => void | Promise<void>) => Promise<void>;

export function createSerialTaskQueue(): SerialTaskQueue {
  let pending = Promise.resolve();
  return (task) => pending = pending.then(task).catch(() => undefined);
}

export function subscribeWithSessionTokenChanges(
  subscribe: (enqueue: SerialTaskQueue) => () => void,
  target: EventTarget = window,
): () => void {
  const enqueue = createSerialTaskQueue();
  let close = subscribe(enqueue);
  const stopListening = subscribeToSessionTokenChanges(target, () => {
    close();
    close = subscribe(enqueue);
  });
  return () => {
    stopListening();
    close();
  };
}