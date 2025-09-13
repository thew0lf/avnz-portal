import { BadRequestException } from '@nestjs/common';
export async function validatePassword(client, password) {
    const r = await client.query('select password_policy from security_settings where id=1');
    const policy = r.rows[0]?.password_policy || {};
    const min = Number(policy.minLength || 12);
    const requireUpper = policy.requireUpper !== false;
    const requireLower = policy.requireLower !== false;
    const requireDigit = policy.requireDigit !== false;
    const requireSymbol = policy.requireSymbol !== false;
    if (String(password).length < min)
        throw new BadRequestException(`password must be at least ${min} characters`);
    if (requireUpper && !/[A-Z]/.test(password))
        throw new BadRequestException('password must include an uppercase letter');
    if (requireLower && !/[a-z]/.test(password))
        throw new BadRequestException('password must include a lowercase letter');
    if (requireDigit && !/[0-9]/.test(password))
        throw new BadRequestException('password must include a digit');
    if (requireSymbol && !/[^A-Za-z0-9]/.test(password))
        throw new BadRequestException('password must include a symbol');
}
