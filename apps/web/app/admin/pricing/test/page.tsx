'use client';
import { useLocalStorage } from '../../useLocalStorage';
import { useState } from 'react';
import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input';
export default function PricingTest(){
  const [apiBase] = useLocalStorage<string>('apiBase', process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001');
  const [orgId] = useLocalStorage<string>('orgId','demo');
  const [roles] = useLocalStorage<string>('roles','org');
  const [provider,setProvider] = useState('bedrock');
  const [model,setModel] = useState('anthropic.claude-3-haiku-20240307-v1:0');
  const [inp,setInp] = useState(1000); const [out,setOut] = useState(500); const [emb,setEmb] = useState(0);
  const [result,setResult] = useState<any>();
  async function run(){
    const url = `${apiBase}/pricing/test?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}&in=${inp}&out=${out}&embed=${emb}`;
    const res = await fetch(url, { headers: { 'x-org-id': orgId, 'x-roles': roles } });
    const data = await res.json(); setResult(data);
  }
  return (<div className='space-y-4'>
    <h1 className='text-xl font-semibold'>Pricing Simulator</h1>
    <div className='grid grid-cols-3 gap-3'>
      <label className='text-sm'>Provider<Input value={provider} onChange={e=>setProvider(e.target.value)} /></label>
      <label className='text-sm'>Model<Input value={model} onChange={e=>setModel(e.target.value)} /></label>
      <label className='text-sm'>Input tokens<Input type='number' value={inp} onChange={e=>setInp(Number(e.target.value))} /></label>
      <label className='text-sm'>Output tokens<Input type='number' value={out} onChange={e=>setOut(Number(e.target.value))} /></label>
      <label className='text-sm'>Embed tokens<Input type='number' value={emb} onChange={e=>setEmb(Number(e.target.value))} /></label>
      <div><Button onClick={run}>Simulate</Button></div>
    </div>
    {result && <pre className='bg-gray-900 text-gray-100 p-3 rounded-xl overflow-auto'>{JSON.stringify(result,null,2)}</pre>}
  </div>);
}