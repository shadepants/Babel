import { useEffect, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

/**
 * Ambient star field — mounts once at the app root as a fixed background layer.
 * Stays alive across all page navigations. Pointer-events disabled so it
 * never interferes with UI interactions.
 */
export function StarField() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <Particles
      id="babel-starfield"
      className="fixed inset-0 -z-10 pointer-events-none"
      options={{
        fullScreen: false,
        background: {
          color: { value: 'transparent' },
        },
        particles: {
          number: {
            value: 160,
            density: { enable: true },
          },
          color: {
            value: ['#ffffff', '#c4b5fd', '#67e8f9', '#fde68a'],
          },
          opacity: {
            value: { min: 0.05, max: 0.9 },
            animation: {
              enable: true,
              speed: 0.5,
              sync: false,
            },
          },
          size: {
            value: { min: 0.5, max: 2.5 },
          },
          move: {
            enable: true,
            speed: 0.12,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'out' },
          },
        },
        detectRetina: true,
      }}
    />
  )
}
