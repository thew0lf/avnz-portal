import crypto from 'crypto';
const ALG = 'aes-256-gcm';
export function enc(value, secret) {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALG, key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: data.toString('base64'),
    };
}
export function dec(payload, secret) {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const data = Buffer.from(payload.data, 'base64');
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return out.toString('utf8');
}
