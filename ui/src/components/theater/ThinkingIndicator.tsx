import { cn } from '@/lib/utils'

interface ThinkingIndicatorProps {
  speaker: string
  color: 'model-a' | 'model-b'
}

/**
 * Pulsing dots animation shown when a model is generating.
 * Staggered animation-delay creates a wave effect.
 */
export function ThinkingIndicator({ speaker, color }: ThinkingIndicatorProps) {
  const dotColor = color === 'model-a' ? 'bg-model-a' : 'bg-model-b'
  const textColor = color === 'model-a' ? 'text-model-a/70' : 'text-model-b/70'

  return (
    <div className="flex items-center gap-1.5 p-4 animate-fade-in" role="status" aria-live="polite">
      <div className={cn('w-2 h-2 rounded-full animate-pulse-slow', dotColor)} />
      <div className={cn('w-2 h-2 rounded-full animate-pulse-slow', dotColor)} style={{ animationDelay: '0.3s' }} />
      <div className={cn('w-2 h-2 rounded-full animate-pulse-slow', dotColor)} style={{ animationDelay: '0.6s' }} />
      <span className={cn('text-sm ml-2', textColor)}>
        {speaker} is thinking...
      </span>
    </div>
  )
}
