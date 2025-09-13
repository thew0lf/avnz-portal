'use client';
import { useEffect, useState } from 'react';
export function useLocalStorage<T>(key: string, initial: T){
  const [value,setValue] = useState<T>(initial as T);
  useEffect(()=>{ try{ const v = localStorage.getItem(key); if(v!=null) setValue(JSON.parse(v)); }catch{} },[key]);
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} },[key,value]);
  return [value,setValue] as const;
}