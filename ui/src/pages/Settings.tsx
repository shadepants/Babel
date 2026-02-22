import { Link } from 'react-router-dom'

/**
 * Settings page — placeholder for Phase 5/6.
 * Will include: default models, default rounds, API key management,
 * theme preferences, export settings.
 */
export default function Settings() {
  return (
    <div className="flex-1 p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/" className="text-sm text-text-dim hover:text-accent transition-colors">
          &larr; Seed Lab
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-3">Settings</h1>
        <p className="text-sm text-text-dim mt-1">App-wide preferences and configuration</p>
      </div>

      <div className="bg-bg-card border border-border-custom rounded-lg p-8 text-center space-y-3">
        <p className="text-text-dim text-lg">Coming Soon</p>
        <p className="text-text-dim text-sm">
          Default models, API keys, theme preferences, and more.
        </p>
      </div>
    </div>
  )
}
