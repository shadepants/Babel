interface RoundDividerProps {
  round: number
}

/**
 * Horizontal divider between rounds with centered round number.
 */
export function RoundDivider({ round }: RoundDividerProps) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-border-custom" />
      <span className="text-xs text-text-dim font-medium px-2">
        Round {round}
      </span>
      <div className="flex-1 h-px bg-border-custom" />
    </div>
  )
}
