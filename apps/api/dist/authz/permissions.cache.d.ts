export declare class SimpleCache<T> {
    private ttlMs;
    private map;
    constructor(ttlMs?: number);
    get(key: string): T | undefined;
    set(key: string, value: T): void;
    clear(): void;
}
export declare const permCache: SimpleCache<any>;
