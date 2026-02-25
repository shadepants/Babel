import type { CampaignPreset } from '../api/types'

/**
 * Hardcoded campaign presets for RPG mode.
 * Organized by category: Fantasy (5), Sci-Fi (5), Historical (5), Competitive (4)
 */
export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  // ──────────────────────────────────────────────────────────────
  // FANTASY (5 presets)
  // ──────────────────────────────────────────────────────────────

  {
    id: 'fantasy-classic-rpg',
    name: 'Classic Fantasy RPG',
    description:
      'Traditional high-fantasy adventure with dwarves, elves, dragons, and ancient magic.',
    category: 'fantasy',
    temperature: 1.2,
    maxTokens: 400,
    turnDelay: 1,
    rounds: 12,
    rpgTone: 'cinematic',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'normal',
    campaignHook:
      'A ancient dragon awakens after centuries of slumber. The kingdom calls heroes to its defense.',
    participantTemplate: [
      { name: 'Warrior', role: 'player', char_class: 'Warrior' },
      { name: 'Mage', role: 'player', char_class: 'Mage' },
    ],
  },

  {
    id: 'fantasy-grimdark',
    name: 'Grimdark Fantasy',
    description:
      'Dark, morally ambiguous fantasy where survival is uncertain and consequences are brutal.',
    category: 'fantasy',
    temperature: 1.4,
    maxTokens: 450,
    turnDelay: 1.5,
    rounds: 14,
    rpgTone: 'grimdark',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'deadly',
    campaignHook:
      'The city watch has been investigating a series of gruesome murders. You are the primary suspects.',
    participantTemplate: [
      { name: 'Rogue', role: 'player', char_class: 'Rogue' },
      { name: 'Cleric', role: 'player', char_class: 'Cleric' },
    ],
  },

  {
    id: 'fantasy-whimsical',
    name: 'Whimsical Fantasy',
    description:
      'Lighthearted, comedic fantasy full of absurd situations, talking animals, and unexpected twists.',
    category: 'fantasy',
    temperature: 1.6,
    maxTokens: 380,
    turnDelay: 0.8,
    rounds: 10,
    rpgTone: 'whimsical',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'casual',
    campaignHook:
      'The village bard has accidentally summoned a minor demon—who just wants to be friends.',
    participantTemplate: [
      { name: 'Bard', role: 'player', char_class: 'Bard' },
      { name: 'Ranger', role: 'player', char_class: 'Ranger' },
    ],
  },

  {
    id: 'fantasy-competitive-tournament',
    name: 'Competitive Tournament',
    description:
      'Multi-round combat or skill competition where NPCs are rivals and glory awaits the victor.',
    category: 'fantasy',
    temperature: 1.3,
    maxTokens: 420,
    turnDelay: 1.2,
    rounds: 8,
    rpgTone: 'cinematic',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'normal',
    campaignHook:
      'The annual Grand Tournament has begun. Your rivals are formidable, but victory would make you a legend.',
    participantTemplate: [
      { name: 'Champion', role: 'player', char_class: 'Warrior' },
      { name: 'Challenger', role: 'npc', char_class: 'Rogue' },
    ],
  },

  {
    id: 'fantasy-mystery-tower',
    name: 'Mystery Tower',
    description:
      'Exploration and puzzle-solving in an ancient tower filled with secrets, traps, and forgotten magic.',
    category: 'fantasy',
    temperature: 1.1,
    maxTokens: 410,
    turnDelay: 1.5,
    rounds: 13,
    rpgTone: 'cinematic',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'normal',
    campaignHook:
      'You discover an ancient tower. Its entrance glows with runes. Legends say it contains the cure for the plague.',
    participantTemplate: [
      { name: 'Scholar', role: 'player', char_class: 'Mage' },
      { name: 'Scout', role: 'player', char_class: 'Ranger' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // SCI-FI (5 presets)
  // ──────────────────────────────────────────────────────────────

  {
    id: 'scifi-space-colonization',
    name: 'Space Colonization',
    description:
      'Near-future space exploration: terraform planets, establish outposts, encounter alien life.',
    category: 'scifi',
    temperature: 1.2,
    maxTokens: 430,
    turnDelay: 1,
    rounds: 12,
    rpgTone: 'cinematic',
    rpgSetting: 'scifi',
    rpgDifficulty: 'normal',
    campaignHook:
      'Your colony ship arrives at a new world. First contact with an intelligent alien species changes everything.',
    participantTemplate: [
      { name: 'Captain', role: 'player', char_class: 'Warrior' },
      { name: 'Chief Engineer', role: 'player', char_class: 'Mage' },
    ],
  },

  {
    id: 'scifi-cyberpunk-heist',
    name: 'Cyberpunk Heist',
    description:
      'High-tech noir: corporate intrigue, neural implants, street samurai, and profitable crime.',
    category: 'scifi',
    temperature: 1.4,
    maxTokens: 450,
    turnDelay: 1.2,
    rounds: 11,
    rpgTone: 'grimdark',
    rpgSetting: 'scifi',
    rpgDifficulty: 'deadly',
    campaignHook:
      'A mega-corp AI has gone rogue. You are hired to infiltrate their tower and steal the encryption key.',
    participantTemplate: [
      { name: 'Hacker', role: 'player', char_class: 'Rogue' },
      { name: 'Combat Specialist', role: 'player', char_class: 'Warrior' },
    ],
  },

  {
    id: 'scifi-post-apocalyptic',
    name: 'Post-Apocalyptic Survival',
    description:
      'After civilization collapsed, scavenge for resources, survive mutants, and rebuild hope.',
    category: 'scifi',
    temperature: 1.3,
    maxTokens: 420,
    turnDelay: 1.5,
    rounds: 12,
    rpgTone: 'grimdark',
    rpgSetting: 'scifi',
    rpgDifficulty: 'deadly',
    campaignHook:
      'The bombs fell 50 years ago. Your underground bunker has finally run out of supplies. Time to go outside.',
    participantTemplate: [
      { name: 'Scout', role: 'player', char_class: 'Ranger' },
      { name: 'Medic', role: 'player', char_class: 'Cleric' },
    ],
  },

  {
    id: 'scifi-corporate-espionage',
    name: 'Corporate Espionage',
    description:
      'Modern-day tech corporations, industrial sabotage, whistleblowers, and billion-credit deals.',
    category: 'scifi',
    temperature: 1.2,
    maxTokens: 400,
    turnDelay: 1,
    rounds: 10,
    rpgTone: 'serious',
    rpgSetting: 'scifi',
    rpgDifficulty: 'normal',
    campaignHook:
      'You work for TechCorp. Your rival at NeuralInc has stolen your research. Retaliation is authorized.',
    participantTemplate: [
      { name: 'Lead Developer', role: 'player', char_class: 'Mage' },
      { name: 'Security Officer', role: 'player', char_class: 'Warrior' },
    ],
  },

  {
    id: 'scifi-time-loop',
    name: 'Time Loop Mystery',
    description:
      'Caught in a temporal loop, solve the mystery before the universe resets again—and again.',
    category: 'scifi',
    temperature: 1.3,
    maxTokens: 440,
    turnDelay: 1.3,
    rounds: 13,
    rpgTone: 'cinematic',
    rpgSetting: 'scifi',
    rpgDifficulty: 'normal',
    campaignHook:
      'Your starship was hit by a temporal anomaly. You remember every loop, but no one else does—yet.',
    participantTemplate: [
      { name: 'Physicist', role: 'player', char_class: 'Mage' },
      { name: 'AI Companion', role: 'npc', char_class: 'Bard' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // HISTORICAL (5 presets)
  // ──────────────────────────────────────────────────────────────

  {
    id: 'historical-medieval-court',
    name: 'Medieval Court Intrigue',
    description:
      'Political maneuvering, royal courts, assassinations, and alliances that reshape kingdoms.',
    category: 'historical',
    temperature: 1.2,
    maxTokens: 410,
    turnDelay: 1.2,
    rounds: 12,
    rpgTone: 'serious',
    rpgSetting: 'historical',
    rpgDifficulty: 'normal',
    campaignHook:
      'The king is dead. Three nobles claim the throne. The council meets tomorrow. Choose your ally carefully.',
    participantTemplate: [
      { name: 'Noble', role: 'player', char_class: 'Warrior' },
      { name: 'Advisor', role: 'player', char_class: 'Bard' },
    ],
  },

  {
    id: 'historical-wild-west',
    name: 'Wild West Showdown',
    description:
      'Outlaws, sheriffs, frontier towns, duels at high noon, and fortune in gold or blood.',
    category: 'historical',
    temperature: 1.3,
    maxTokens: 420,
    turnDelay: 1,
    rounds: 11,
    rpgTone: 'cinematic',
    rpgSetting: 'historical',
    rpgDifficulty: 'deadly',
    campaignHook:
      'The railroad company wants your land. You are not giving it up. Neither is the sheriff they hired.',
    participantTemplate: [
      { name: 'Rancher', role: 'player', char_class: 'Warrior' },
      { name: 'Gunslinger', role: 'player', char_class: 'Rogue' },
    ],
  },

  {
    id: 'historical-ancient-rome',
    name: 'Ancient Rome',
    description:
      'Gladiatorial combat, Senate politics, military campaigns, and the glory of empire.',
    category: 'historical',
    temperature: 1.1,
    maxTokens: 400,
    turnDelay: 1.4,
    rounds: 12,
    rpgTone: 'cinematic',
    rpgSetting: 'historical',
    rpgDifficulty: 'normal',
    campaignHook:
      'You are a newly promoted legion commander. Caesar watches your every move. Victory brings power.',
    participantTemplate: [
      { name: 'Legionnaire', role: 'player', char_class: 'Warrior' },
      { name: 'Centurion', role: 'npc', char_class: 'Warrior' },
    ],
  },

  {
    id: 'historical-prohibition-era',
    name: 'Prohibition Era Crime',
    description:
      'Jazz clubs, speakeasies, bootleggers, gangsters, and law enforcement in 1920s America.',
    category: 'historical',
    temperature: 1.4,
    maxTokens: 430,
    turnDelay: 1.2,
    rounds: 11,
    rpgTone: 'grimdark',
    rpgSetting: 'historical',
    rpgDifficulty: 'deadly',
    campaignHook:
      'The mob boss has been murdered. Suspicion falls on everyone. You have 48 hours to find the killer—or die.',
    participantTemplate: [
      { name: 'Detective', role: 'player', char_class: 'Rogue' },
      { name: 'Crime Boss', role: 'npc', char_class: 'Warrior' },
    ],
  },

  {
    id: 'historical-cold-war',
    name: 'Cold War Espionage',
    description:
      '1960s spy thriller: double agents, coded messages, international incidents, and Cold War tension.',
    category: 'historical',
    temperature: 1.2,
    maxTokens: 410,
    turnDelay: 1.3,
    rounds: 12,
    rpgTone: 'serious',
    rpgSetting: 'historical',
    rpgDifficulty: 'deadly',
    campaignHook:
      'Your cover is blown. The agency disavows you. Now you must turn the tables on your enemies.',
    participantTemplate: [
      { name: 'Spy', role: 'player', char_class: 'Rogue' },
      { name: 'Handler', role: 'npc', char_class: 'Bard' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // COMPETITIVE (4 presets)
  // ──────────────────────────────────────────────────────────────

  {
    id: 'competitive-gladiator-arena',
    name: 'Gladiator Arena',
    description:
      'Brutal hand-to-hand combat in the arena. Survive each opponent to become the ultimate champion.',
    category: 'competitive',
    temperature: 1.3,
    maxTokens: 400,
    turnDelay: 0.8,
    rounds: 9,
    rpgTone: 'cinematic',
    rpgSetting: 'fantasy',
    rpgDifficulty: 'deadly',
    campaignHook:
      'You are a slave forced into the arena. Each victory brings you closer to freedom—or death.',
    participantTemplate: [
      { name: 'Gladiator', role: 'player', char_class: 'Warrior' },
      { name: 'Opponent', role: 'npc', char_class: 'Warrior' },
    ],
  },

  {
    id: 'competitive-game-show',
    name: 'Game Show Madness',
    description:
      'Chaotic reality TV game show with bizarre challenges, voting, and a prize pool of millions.',
    category: 'competitive',
    temperature: 1.4,
    maxTokens: 380,
    turnDelay: 0.9,
    rounds: 8,
    rpgTone: 'whimsical',
    rpgSetting: 'scifi',
    rpgDifficulty: 'casual',
    campaignHook:
      'Welcome to "Chaos Factor"! You have won the lottery. Now compete for 10 million credits or humiliation.',
    participantTemplate: [
      { name: 'Contestant', role: 'player', char_class: 'Bard' },
      { name: 'Rival', role: 'npc', char_class: 'Rogue' },
    ],
  },

  {
    id: 'competitive-art-competition',
    name: 'Art Competition',
    description:
      'Elite artists compete for prestige, recognition, and a prestigious award at an international show.',
    category: 'competitive',
    temperature: 1.2,
    maxTokens: 390,
    turnDelay: 1.1,
    rounds: 10,
    rpgTone: 'serious',
    rpgSetting: 'historical',
    rpgDifficulty: 'normal',
    campaignHook:
      'You are a sculptor vying for the Grand Prix. The judges are ruthless. Your rivals are brilliant.',
    participantTemplate: [
      { name: 'Artist', role: 'player', char_class: 'Mage' },
      { name: 'Critic', role: 'npc', char_class: 'Bard' },
    ],
  },

  {
    id: 'competitive-culinary-challenge',
    name: 'Culinary Challenge',
    description:
      'High-stakes cooking competition where technique, creativity, and speed determine the champion.',
    category: 'competitive',
    temperature: 1.3,
    maxTokens: 400,
    turnDelay: 1,
    rounds: 9,
    rpgTone: 'cinematic',
    rpgSetting: 'scifi',
    rpgDifficulty: 'normal',
    campaignHook:
      'The final round of the Galaxy Chefs competition. Your signature dish will make or break your career.',
    participantTemplate: [
      { name: 'Chef', role: 'player', char_class: 'Mage' },
      { name: 'Sous Chef', role: 'npc', char_class: 'Warrior' },
    ],
  },
]
