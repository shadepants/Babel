import { useState, useEffect, useRef } from 'react'

interface TypewriterTextProps {
  text: string
  /** Only animates when true. Past turns get full text instantly. */
  active: boolean
  /** ms per character. Default 10ms. */
  speedMs?: number
  onComplete?: () => void
}

/**
 * Reveals text character-by-character when active=true.
 * Shows a blinking cursor while typing.
 * Calls onComplete when typing finishes.
 */
export function TypewriterText({ text, active, speedMs = 10, onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState(active ? '' : text)
  const [typing, setTyping]       = useState(active)
  const cbRef = useRef(onComplete)
  cbRef.current = onComplete

  useEffect(() => {
    if (!active) {
      setDisplayed(text)
      setTyping(false)
      return
    }
    setDisplayed('')
    setTyping(true)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        setTyping(false)
        cbRef.current?.()
      }
    }, speedMs)
    return () => clearInterval(id)
  }, [text, active, speedMs])

  return (
    <>
      {displayed}
      {typing && (
        <span
          className="sprite-cursor inline-block w-px h-[1em] bg-current align-middle ml-0.5 opacity-70"
          aria-hidden="true"
        />
      )}
    </>
  )
}
