"use client"
import * as React from 'react'

export default function DeleteAccountSection(){
  async function onDelete(){
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
    // Placeholder: call API when implemented
    alert('Account deletion flow not yet implemented.')
  }
  return (
    <div className="rounded-md border bg-white p-4">
      <h2 className="text-base font-medium text-red-600">Delete account</h2>
      <p className="text-sm text-red-600/90 mb-3">This action is permanent and cannot be undone.</p>
      <button onClick={onDelete} type="button" className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2">Delete account</button>
    </div>
  )
}

