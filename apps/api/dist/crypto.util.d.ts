export declare function enc(value: string, secret: string): {
    iv: string;
    tag: string;
    data: string;
};
export declare function dec(payload: {
    iv: string;
    tag: string;
    data: string;
}, secret: string): string;
