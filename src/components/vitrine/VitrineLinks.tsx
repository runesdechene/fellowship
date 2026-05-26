import {
  Globe,
  ShoppingBag,
  Instagram,
  Facebook,
  Link,
  ExternalLink,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { linkHost, linkTypeIcon } from '@/lib/vitrine'
import type { VitrineLink } from '@/types/database'

// Local lucide icon map keyed by the string names linkTypeIcon() returns
const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Globe,
  ShoppingBag,
  Instagram,
  Facebook,
  Link,
}

function LinkIcon({ type }: { type: VitrineLink['type'] }) {
  const name = linkTypeIcon(type)
  const Icon = ICON_MAP[name] ?? Link
  return <Icon />
}

interface VitrineLinksProps {
  links: VitrineLink[]
}

export function VitrineLinks({ links }: VitrineLinksProps) {
  if (links.length === 0) return null

  return (
    <div className="v-card">
      <h2>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5" />
          <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5" />
        </svg>
        Liens
      </h2>
      <div className="v-links">
        {links.map((l, i) => (
          <a
            key={i}
            className="v-linkrow"
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="v-li">
              <LinkIcon type={l.type} />
            </span>
            <span className="v-lt">
              <b>{l.label}</b>
              <span>{linkHost(l.url)}</span>
            </span>
            <ExternalLink className="v-lext" />
          </a>
        ))}
      </div>
    </div>
  )
}
