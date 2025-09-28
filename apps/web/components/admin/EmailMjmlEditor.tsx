"use client"
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

declare global { interface Window { grapesjs?: any } }

function useScript(src: string) {
  const [loaded, setLoaded] = React.useState(false)
  React.useEffect(() => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing) { existing.addEventListener('load', () => setLoaded(true), { once: true }); if ((existing as any).dataset.loaded==='1') setLoaded(true); return }
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => { (s as any).dataset.loaded='1'; setLoaded(true) }; document.head.appendChild(s)
    return () => { /* keep script cached */ }
  }, [src])
  return loaded
}

function useStyle(href: string){
  React.useEffect(()=>{ if (document.querySelector(`link[href="${href}"]`)) return; const l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l) },[href])
}

export default function EmailMjmlEditor({ initialMjml, initialHtml, onExport }: { initialMjml?: string; initialHtml?: string; onExport: (v: { mjml?: string; html: string; text: string }) => void }){
  const gjsReady = useScript('https://unpkg.com/grapesjs@0.21.5/dist/grapes.min.js')
  const mjmlReady = useScript('https://unpkg.com/grapesjs-mjml@0.15.3/dist/grapesjs-mjml.min.js')
  useStyle('https://unpkg.com/grapesjs@0.21.5/dist/css/grapes.min.css')
  const ref = React.useRef<HTMLDivElement>(null)
  const editorRef = React.useRef<any>(null)
  const [device, setDevice] = React.useState<'Desktop'|'Tablet'|'Mobile portrait'>('Desktop')
  const [view, setView] = React.useState<'editor'|'html'|'text'|'preview'>('editor')
  const [cached, setCached] = React.useState<{ html: string; text: string }>({ html: '', text: '' })

  React.useEffect(()=>{
    if (!gjsReady || !mjmlReady) return
    if (!ref.current || editorRef.current) return
    const ed = window.grapesjs.init({
      container: ref.current,
      height: 480,
      fromElement: false,
      storageManager: false,
      plugins: ['gjs-mjml'],
      pluginsOpts: { 'gjs-mjml': {} },
      deviceManager: { devices: [
        { id: 'Desktop', name: 'Desktop', width: '' },
        { id: 'Tablet', name: 'Tablet', width: '768px' },
        { id: 'Mobile portrait', name: 'Mobile', width: '375px' },
      ]},
    })
    editorRef.current = ed
    try {
      const seed = initialMjml || initialHtml || `<mjml><mj-body><mj-section><mj-column><mj-text>Hello {{clientName}}{{orgNameSuffix}},</mj-text><mj-text>Welcome! Use the link below:</mj-text><mj-button href="{{url}}">Open link</mj-button><mj-text>If you did not expect this email, you can ignore it.</mj-text></mj-column></mj-section></mj-body></mjml>`
      ed.setComponents(seed)
    } catch {}
  },[gjsReady, mjmlReady, initialMjml, initialHtml])

  React.useEffect(()=>{
    if (!editorRef.current) return
    editorRef.current.setDevice(device)
  },[device])

  async function exportAll(){
    const ed = editorRef.current
    if (!ed) return
    const html: string = ed.getHtml({ cleanCss: true })
    // derive text by stripping tags
    const tmp = document.createElement('div'); tmp.innerHTML = html
    const text = (tmp.textContent || '').replace(/\n\s+/g,'\n').trim()
    setCached({ html, text })
    const mjml = typeof ed.getMjml === 'function' ? ed.getMjml() : undefined
    onExport({ html, text, mjml })
  }

  return (
    <Card className="border bg-white">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Button variant={device==='Desktop'?'default':'outline'} size="sm" onClick={()=>setDevice('Desktop')}>Desktop</Button>
            <Button variant={device==='Tablet'?'default':'outline'} size="sm" onClick={()=>setDevice('Tablet')}>Tablet</Button>
            <Button variant={device==='Mobile portrait'?'default':'outline'} size="sm" onClick={()=>setDevice('Mobile portrait')}>Mobile</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view==='editor'?'default':'outline'} size="sm" onClick={()=>setView('editor')}>Editor</Button>
            <Button variant={view==='html'?'default':'outline'} size="sm" onClick={()=>{ exportAll(); setView('html') }}>HTML</Button>
            <Button variant={view==='text'?'default':'outline'} size="sm" onClick={()=>{ exportAll(); setView('text') }}>Text</Button>
            <Button variant={view==='preview'?'default':'outline'} size="sm" onClick={()=>{ exportAll(); setView('preview') }}>Preview</Button>
            <Button size="sm" onClick={exportAll}>Use In Template</Button>
          </div>
        </div>
        {view==='editor' && (<div className="min-h-[480px]" ref={ref} />)}
        {view==='html' && (
          <div className="p-3">
            <textarea className="w-full h-80 border rounded p-2 text-xs font-mono" readOnly value={cached.html} />
          </div>
        )}
        {view==='text' && (
          <div className="p-3">
            <textarea className="w-full h-80 border rounded p-2 text-sm" readOnly value={cached.text} />
          </div>
        )}
        {view==='preview' && (
          <div className="p-3">
            <iframe title="email-preview" className="w-full h-96 border rounded" srcDoc={cached.html} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
