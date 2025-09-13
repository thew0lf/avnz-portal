export class SimpleCache {
    constructor(ttlMs = 10_000) {
        this.ttlMs = ttlMs;
        this.map = new Map();
    }
    get(key) {
        const e = this.map.get(key);
        if (!e)
            return undefined;
        if (Date.now() > e.exp) {
            this.map.delete(key);
            return undefined;
        }
        return e.value;
    }
    set(key, value) { this.map.set(key, { value, exp: Date.now() + this.ttlMs }); }
    clear() { this.map.clear(); }
}
export const permCache = new SimpleCache(5000);
