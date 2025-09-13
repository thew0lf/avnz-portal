import crypto from 'crypto';
export function signToken(payload, secret) {
    const body = { ...payload, iat: Math.floor(Date.now() / 1000) };
    const p = Buffer.from(JSON.stringify(body)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    return `${p}.${sig}`;
}
export function verifyToken(token, secret) {
    const [p, sig] = token.split('.');
    if (!p || !sig)
        return null;
    const expected = crypto.createHmac('sha256', secret).update(p).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
        return null;
    try {
        return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    }
    catch {
        return null;
    }
}
export function scryptHash(password, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const key = crypto.scryptSync(password, s, 32);
    return `scrypt:${s}:${key.toString('hex')}`;
}
export function verifyPassword(password, hash) {
    if (!hash.startsWith('scrypt:'))
        return false;
    const [, salt, hex] = hash.split(':');
    const derived = crypto.scryptSync(password, salt, 32).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hex));
}
export function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}
export function sha256hex(s) {
    return crypto.createHash('sha256').update(s).digest('hex');
}
