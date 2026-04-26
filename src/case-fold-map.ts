export class CaseFoldMap<Value> {
  private readonly caseFold: (key: string) => string
  private readonly valuesByKey = new Map<string, { key: string; value: Value }>()

  constructor(caseFold: (key: string) => string) {
    this.caseFold = caseFold
  }

  get size(): number {
    return this.valuesByKey.size
  }

  get(key: string): Value | undefined {
    return this.valuesByKey.get(this.caseFold(key))?.value
  }

  set(key: string, value: Value): this {
    this.valuesByKey.set(this.caseFold(key), { key, value })
    return this
  }

  ensure(key: string, create: () => Value): Value {
    const existing = this.get(key)
    if (existing !== undefined) {
      return existing
    }

    const value = create()
    this.set(key, value)
    return value
  }

  has(key: string): boolean {
    return this.valuesByKey.has(this.caseFold(key))
  }

  delete(key: string): boolean {
    return this.valuesByKey.delete(this.caseFold(key))
  }

  clear(): void {
    this.valuesByKey.clear()
  }

  *entries(): IterableIterator<[string, Value]> {
    for (const { key, value } of this.valuesByKey.values()) {
      yield [key, value]
    }
  }

  *keys(): IterableIterator<string> {
    for (const { key } of this.valuesByKey.values()) {
      yield key
    }
  }

  *values(): IterableIterator<Value> {
    for (const { value } of this.valuesByKey.values()) {
      yield value
    }
  }

  [Symbol.iterator](): IterableIterator<[string, Value]> {
    return this.entries()
  }
}
