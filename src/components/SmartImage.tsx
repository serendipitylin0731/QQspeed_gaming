import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'

export function SmartImage({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(!src)
  useEffect(() => setFailed(!src), [src])
  if (failed) return <span className={`image-fallback ${className}`} role="img" aria-label="暂无图片"><ImageOff/><small>暂无图片</small></span>
  return <img className={className} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
}
