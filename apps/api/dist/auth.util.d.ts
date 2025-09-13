export type JwtLike = {
    userId: string;
    email: string;
    orgId: string;
    roles: string[];
    iat: number;
    orgUUID?: string;
    clientCode?: string;
    clientId?: string;
    perms?: string[];
};
export declare function signToken(payload: Omit<JwtLike, 'iat'>, secret: string): string;
export declare function verifyToken(token: string, secret: string): JwtLike | null;
export declare function scryptHash(password: string, salt?: string): string;
export declare function verifyPassword(password: string, hash: string): boolean;
export declare function randomToken(bytes?: number): string;
export declare function sha256hex(s: string): string;
