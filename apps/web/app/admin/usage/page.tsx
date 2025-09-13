'use client';
import { useEffect, useState } from 'react';
import { useLocalStorage } from '../useLocalStorage';
export default function Usage(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001');
  const [orgId] = useLocalStorage<string>('orgId','');
  const [roles] = useLocalStorage<string>('roles','org');
  const [rows,setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{ const res=await fetch(`${apiBase}/usage/summary`,{headers:{'x-org-id':orgId,'x-roles':roles}}); const data=await res.json(); setRows(data.rows||[]); })(); },[apiBase,orgId,roles]);
  return (<div className='space-y-3'><h1 className='text-xl font-semibold'>Usage</h1>
    <table className='w-full text-sm'><thead><tr className='text-left'><th>Provider</th><th>Model</th><th>Op</th><th>In</th><th>Out</th><th>Embed</th><th>Cost</th></tr></thead>
      <tbody>{rows.map((r,i)=>(<tr key={i} className='border-t'><td>{r.provider}</td><td>{r.model}</td><td>{r.operation}</td><td>{r.in_tokens}</td><td>{r.out_tokens}</td><td>{r.embed_tokens}</td><td>${r.cost_usd}</td></tr>))}</tbody></table>
  </div>);
}
