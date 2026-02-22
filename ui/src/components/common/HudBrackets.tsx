/**
 * Four L-shaped corner brackets rendered as absolutely-positioned spans.
 * The parent element must have `position: relative` (Framer Motion motion.div provides this).
 */
export function HudBrackets({
  color = '#8b5cf6',
  size = 10,
  thickness = 1.5,
}: {
  color?: string
  size?: number
  thickness?: number
}) {
  // Each corner: (borderTop, borderBottom, borderLeft, borderRight, top, bottom, left, right)
  const corners = [
    // top-left
    { borderTopWidth: thickness, borderLeftWidth: thickness, top: 0, left: 0 },
    // top-right
    { borderTopWidth: thickness, borderRightWidth: thickness, top: 0, right: 0 },
    // bottom-left
    { borderBottomWidth: thickness, borderLeftWidth: thickness, bottom: 0, left: 0 },
    // bottom-right
    { borderBottomWidth: thickness, borderRightWidth: thickness, bottom: 0, right: 0 },
  ]

  return (
    <>
      {corners.map((corner, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderStyle: 'solid',
            borderColor: color,
            borderWidth: 0,
            opacity: 0.65,
            pointerEvents: 'none',
            ...corner,
          }}
        />
      ))}
    </>
  )
}
