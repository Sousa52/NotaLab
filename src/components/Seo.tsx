import { useEffect } from 'react'

interface SeoProps {
  title: string
  description: string
  path?: string
}

const SITE_NAME = 'NotaLab'
const SITE_URL = 'https://notalab.pt'

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function Seo({ title, description, path = '' }: SeoProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`
    document.title = fullTitle

    setMeta('description', description)
    setMeta('og:title', fullTitle, 'property')
    setMeta('og:description', description, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('og:url', `${SITE_URL}${path}`, 'property')

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${SITE_URL}${path}`)
  }, [title, description, path])

  return null
}
