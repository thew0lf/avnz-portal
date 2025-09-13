// Minimal JSONLogic evaluator for ABAC; supports subset used by tasks
export function evalJsonLogic(rule: any, data: any): boolean {
  if (!rule || typeof rule !== 'object') return false
  const op = Object.keys(rule)[0]
  const arg = (rule as any)[op]
  switch (op) {
    case '==': return resolve(arg[0], data) == resolve(arg[1], data)
    case '===': return resolve(arg[0], data) === resolve(arg[1], data)
    case '!=': return resolve(arg[0], data) != resolve(arg[1], data)
    case '!': return !truthy(resolve(arg, data))
    case 'and': return arg.every((x: any)=> truthy(evalJsonLogic(x, data)))
    case 'or': return arg.some((x: any)=> truthy(evalJsonLogic(x, data)))
    case '>': return resolve(arg[0], data) > resolve(arg[1], data)
    case '>=': return resolve(arg[0], data) >= resolve(arg[1], data)
    case '<': return resolve(arg[0], data) < resolve(arg[1], data)
    case '<=': return resolve(arg[0], data) <= resolve(arg[1], data)
    case 'var': return resolve(rule, data)
    default: return false
  }
}

function resolve(expr: any, data: any): any {
  if (expr && typeof expr === 'object' && 'var' in expr) {
    const path = String((expr as any)['var'] || '').split('.').filter(Boolean)
    let cur: any = data
    for (const k of path) { if (cur == null) return undefined; cur = cur[k] }
    return cur
  }
  return expr
}

function truthy(v: any) { return !!v }

