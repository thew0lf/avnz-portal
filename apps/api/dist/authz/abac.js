// Minimal JSONLogic evaluator for ABAC; supports subset used by tasks
export function evalJsonLogic(rule, data) {
    if (!rule || typeof rule !== 'object')
        return false;
    const op = Object.keys(rule)[0];
    const arg = rule[op];
    switch (op) {
        case '==': return resolve(arg[0], data) == resolve(arg[1], data);
        case '===': return resolve(arg[0], data) === resolve(arg[1], data);
        case '!=': return resolve(arg[0], data) != resolve(arg[1], data);
        case '!': return !truthy(resolve(arg, data));
        case 'and': return arg.every((x) => truthy(evalJsonLogic(x, data)));
        case 'or': return arg.some((x) => truthy(evalJsonLogic(x, data)));
        case '>': return resolve(arg[0], data) > resolve(arg[1], data);
        case '>=': return resolve(arg[0], data) >= resolve(arg[1], data);
        case '<': return resolve(arg[0], data) < resolve(arg[1], data);
        case '<=': return resolve(arg[0], data) <= resolve(arg[1], data);
        case 'var': return resolve(rule, data);
        default: return false;
    }
}
function resolve(expr, data) {
    if (expr && typeof expr === 'object' && 'var' in expr) {
        const path = String(expr['var'] || '').split('.').filter(Boolean);
        let cur = data;
        for (const k of path) {
            if (cur == null)
                return undefined;
            cur = cur[k];
        }
        return cur;
    }
    return expr;
}
function truthy(v) { return !!v; }
