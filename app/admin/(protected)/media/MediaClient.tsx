'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type MediaAsset = {
  path: string
  public_url: string
  size_bytes: number | null
  content_type: string | null
}

export default function MediaClient({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    setError('')

    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')
      setMessage('Image uploaded.')
      router.refresh()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-toolbarCard">
        <div>
          <p className="admin-sectionEyebrow">Media</p>
          <h2 className="admin-sectionTitle">Product image library</h2>
          <p className="admin-sectionText">Upload product photos here, then copy an image link into a product. Uploading alone does not change the storefront.</p>
        </div>
        <label className={`admin-button admin-button--primary${uploading ? ' is-disabled' : ''}`}>
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={upload} disabled={uploading} style={{ display: 'none' }} />
        </label>
        {message ? <p className="admin-inlineMessage admin-inlineMessage--success">{message}</p> : null}
        {error ? <p className="admin-inlineMessage admin-inlineMessage--error">{error}</p> : null}
      </section>

      <section className="admin-surface">
        {assets.length === 0 ? <div className="admin-emptyState"><h3>No uploaded photos yet</h3><p>Upload your first product photo. The sample packaging illustrations are built into the site and are not stored in this library.</p></div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
          {assets.map((asset) => (
            <article key={asset.path} className="admin-surface" style={{ padding: '10px' }}>
              <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: '8px', overflow: 'hidden', background: 'var(--admin-surface-muted)' }}>
                <Image src={asset.public_url} alt={asset.path} fill unoptimized style={{ objectFit: 'cover' }} />
              </div>
              <div className="admin-mediaActions"><a href={asset.public_url} target="_blank" rel="noopener noreferrer">Open image ↗</a><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(asset.public_url); setMessage('Image link copied. Paste it into a product image field.'); setError('') } catch { setError('Could not copy. Open the image and copy its address.') } }}>Copy link</button></div>
              <p className="admin-sectionText" style={{ marginTop: '8px', wordBreak: 'break-word' }}>{asset.path}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
