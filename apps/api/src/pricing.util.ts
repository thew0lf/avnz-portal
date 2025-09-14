import { getClientForReq } from './db.js'
export type Metric = 'embed_tokens' | 'input_tokens' | 'output_tokens'

export async function unitPrice(provider:string, model:string, metric:Metric, orgId:string, userId?:string, roles:string[]=[]): Promise<number> {
  const client=await getClientForReq({ auth: { orgUUID: orgId } } as any)
  try{
    if(userId){ const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='user' and user_id=$1 and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null limit 1`,[userId,provider,model,metric]); if(rows[0]) return Number(rows[0].price_per_1k) }
    if(roles.length){ const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='role' and role = ANY($1) and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null order by price_per_1k asc limit 1`,[roles,provider,model,metric]); if(rows[0]) return Number(rows[0].price_per_1k) }
    { const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='org' and org_id=$1 and provider=$2 and model=$3 and metric=$4 and active=true and deleted_at is null limit 1`,[orgId,provider,model,metric]); if(rows[0]) return Number(rows[0].price_per_1k) }
    { const { rows } = await client.query(`select price_per_1k from pricing_rules where scope='default' and provider=$1 and model=$2 and metric=$3 and active=true and deleted_at is null limit 1`,[provider,model,metric]); if(rows[0]) return Number(rows[0].price_per_1k) }
    return 0
  } finally { client.release() }
}

