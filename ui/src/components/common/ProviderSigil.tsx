import type { ReactNode } from 'react'
import { getProvider } from '@/lib/modelProvider'

interface ProviderSigilProps {
  model: string
  size?: number
  /** Stroke/fill color. Defaults to currentColor so it inherits from CSS. */
  color?: string
  className?: string
}

/**
 * Tiny geometric glyph identifying the AI provider of a given model string.
 * Renders a 16x16 SVG with a stroke-based icon unique to each provider family.
 *
 * anthropic=triangle, openai=hexagon, google=2x2 grid, meta=twin ovals,
 * mistral=diamond, xai=X, unknown=circle
 */
export function ProviderSigil({ model, size = 14, color = 'currentColor', className }: ProviderSigilProps) {
  const provider = getProvider(model)

  // Shared stroke props for most glyphs (pure stroke, no fill)
  const sw = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  let glyph: ReactNode

  switch (provider) {
    case 'anthropic':
      // Upward triangle — echoes Claude's "A" letterform
      glyph = <polygon points="8,2 14,14 2,14" {...sw} />
      break

    case 'openai':
      // Hexagon — geometric, abstracts the OpenAI circle motif
      glyph = <polygon points="13.2,5 8,2 2.8,5 2.8,11 8,14 13.2,11" {...sw} />
      break

    case 'google':
      // 2x2 filled square grid — reduced from Google's colour-block logo
      glyph = (
        <>
          <rect x="2" y="2" width="5" height="5" fill={color} />
          <rect x="9" y="2" width="5" height="5" fill={color} />
          <rect x="2" y="9" width="5" height="5" fill={color} />
          <rect x="9" y="9" width="5" height="5" fill={color} />
        </>
      )
      break

    case 'meta':
      // Twin ovals side-by-side — infinity / Meta logo abstraction
      glyph = (
        <>
          <ellipse cx="5.5" cy="8" rx="3.5" ry="2.5" {...sw} />
          <ellipse cx="10.5" cy="8" rx="3.5" ry="2.5" {...sw} />
        </>
      )
      break

    case 'mistral':
      // Rotated diamond — distinct from the hexagon, sharp wind-blade feel
      glyph = <polygon points="8,2 14,8 8,14 2,8" {...sw} />
      break

    case 'xai':
      // Literal X — matches the brand name
      glyph = (
        <>
          <line x1="3" y1="3" x2="13" y2="13" {...sw} />
          <line x1="13" y1="3" x2="3" y2="13" {...sw} />
        </>
      )
      break

    default:
      // Circle — neutral fallback for unknown providers
      glyph = <circle cx="8" cy="8" r="5" {...sw} />
  }

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {glyph}
    </svg>
  )
}
