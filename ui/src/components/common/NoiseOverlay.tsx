/** Fixed film grain overlay — applied globally, renders above stars but below all UI (z-100) */
export function NoiseOverlay() {
  return <div className="noise-layer" aria-hidden="true" />
}
