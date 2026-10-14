export class SerialQueue {
  private chains = new Map<string, Promise<unknown>>()

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(key) ?? Promise.resolve()
    const next = prev.then(
      () => fn(),
      () => fn()
    )
    this.chains.set(
      key,
      next.catch(() => undefined)
    )
    return next
  }
}

export const repoQueue = new SerialQueue()
