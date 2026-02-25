import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HudBrackets } from '@/components/common/HudBrackets'
import { ScrambleText } from '@/components/common/ScrambleText'

interface EndSessionModalProps {
  isOpen: boolean
  matchId: string
  preset: string | null
  stats: {
    turns: number
    rounds: number
    vocab: number
  }
}

export function EndSessionModal({ isOpen, matchId, preset, stats }: EndSessionModalProps) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-zinc-950 border border-accent/30 rounded-lg overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.2)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
            
            <div className="p-8 space-y-8 text-center">
              <div className="space-y-2">
                <h2 className="font-display font-black tracking-[0.2em] text-2xl text-text-primary uppercase italic">
                  <ScrambleText>Session Complete</ScrambleText>
                </h2>
                <p className="font-mono text-[10px] text-accent/60 tracking-widest uppercase">
                  // research protocol concluded
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5">
                <div className="space-y-1">
                  <div className="font-mono text-xl font-bold text-text-primary">{stats.turns}</div>
                  <div className="font-mono text-[8px] text-text-dim/60 uppercase tracking-tighter">Turns</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-xl font-bold text-text-primary">{stats.rounds}</div>
                  <div className="font-mono text-[8px] text-text-dim/60 uppercase tracking-tighter">Rounds</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono text-xl font-bold text-text-primary">{stats.vocab}</div>
                  <div className="font-mono text-[8px] text-text-dim/60 uppercase tracking-tighter">Words</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <HudBrackets color="#8b5cf6" size={8} />
                  <Button 
                    className="w-full bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 font-mono text-[10px] tracking-widest uppercase h-10"
                    onClick={() => navigate(`/analytics/${matchId}`)}
                  >
                    View Full Analytics
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="border-white/10 hover:bg-white/5 text-text-dim font-mono text-[10px] tracking-widest uppercase"
                    onClick={() => navigate(`/configure/${preset ?? 'custom'}?remix=${matchId}`)}
                  >
                    Remix
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white/10 hover:bg-white/5 text-text-dim font-mono text-[10px] tracking-widest uppercase"
                    onClick={() => navigate('/')}
                  >
                    Exit to Lab
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 px-8 py-3 flex justify-center">
               <span className="font-mono text-[9px] text-text-dim/30 tracking-[0.3em]">
                 BABEL // NEURAL_CORPUS_v2
               </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
