Feature Specification: Reactive Pixel Sprites (Phase 2)This specification details the architecture, logic, and implementation plan for the Conversation Theater's live avatar system, fulfilling the Phase 2 UI requirements.1. Overview & ScopeThe goal is to provide a real-time, visual representation of the AI-to-AI relay loop using 8-bit style sprite animations. The system must react to the Server-Sent Events (SSE) stream without polling, accurately reflecting whether each model is idle, thinking, talking, or in an error state.2. Component ArchitectureThe feature is decoupled into four specific layers to separate presentation from state management:ComponentResponsibilityTechnical Approachsprites.cssPure presentation and frame-by-frame animation.Uses image-rendering: pixelated and the CSS steps() timing function to snap background positions dynamically based on injected CSS variables.SpriteAvatar.tsxThe "dumb" visual component.Accepts a status prop (idle, thinking, etc.) and maps it to a vertical Y-offset on the sprite sheet. Injects dynamic CSS variables for frame count and size.SpriteStage.tsx / Theater.tsxThe layout and interaction controller.Houses the split-column UI. Passes the correct sprite URLs, orientations (e.g., flipping Agent B to face Agent A), and exact statuses down to the avatars.useRelayStream.tsThe data bridge and state machine.Manages the EventSource connection to /api/relay/stream. Parses incoming RelayEvent payloads and derives the exact state of both agents simultaneously.3. State Management Logic (The SSE Bridge)Because the backend relay_engine.py broadcasts events using human-readable model names (e.g., "Claude Sonnet") rather than strict "Side A" vs "Side B" assignments, the frontend must infer the layout logically to maintain a zero-dependency separation from backend naming conventions.Turn-Counting Initialization: When the stream opens, the useRelayStream hook listens for the first relay.thinking or relay.turn event.Side Assignment: The speaker attached to that very first event is permanently locked as Agent A (Left Side) in React state for the duration of the match.Reactive Transitions: * If relay.thinking fires and the speaker matches Agent A, statusA becomes thinking and statusB is forced to idle.If relay.turn fires, the message is appended, and both agents revert to idle before the next round begins.4. Implementation PlanStep 1: Asset PreparationAcquire or generate two .png sprite sheets (e.g., robot_red.png and robot_blue.png).Format: Each sheet must be standardized (e.g., 4 columns for animation frames, 4 rows for states: idle, thinking, talking, error).Step 2: Global CSS LayerImplement ui/src/styles/sprites.css.Ensure the steps() keyframe animation is parameterized using CSS variables (--sprite-total-width and --frame-count) to prevent hardcoding dimensions.Step 3: Core React ComponentsBuild SpriteAvatar.tsx to handle the inline styles and background offsets.Build TurnBubble.tsx to handle the markdown text rendering of the AI outputs.Update tailwind.config.js with any specific safelisted classes required for dynamic rendering, avoiding template literal class generation that Vite's PurgeCSS might strip.Step 4: Stream Hook & Theater ShellImplement the useRelayStream hook with the Turn-Counting logic, ensuring the EventSource connection is guarded by a useRef to prevent React 19 Strict Mode from opening duplicate streams.Implement Theater.tsx to consume the hook, passing the derived statusA and statusB to the respective SpriteAvatar components.

ENHANCEMENTS:
To elevate the 8-bit visual system from a static state machine to a dynamic, engaging theater, the presentation layer must simulate life and react to the conversation's semantic weight. Because the current backend `relay_engine.py` resolves full responses rather than streaming individual tokens, the frontend must handle the illusion of real-time generation through synchronized typewriter effects and micro-animations.

### 1. Themed Arena Backgrounds (Expansion)

Pixel art thrives on environmental context. Instead of a flat slate background, introduce 8-bit arena backdrops that swap based on the selected `preset` (e.g., a cyber-dojo for debate, a starry void for conlang, a library for philosophy).

* **Implementation:** A z-index 0 `div` with a `background-image` using `image-rendering: pixelated`, blurred slightly to keep focus on the text and sprites.

### 2. Emotion-Driven Sprite Mapping (Enhancement)

Limitless 4-state sprites (Idle, Thinking, Talking, Error) feel robotic. Expanding the sprite sheet to 8 rows allows for emotional expression (e.g., row 5: Aggressive/Debate, row 6: Joy/Invented Word).

* **How it works:** In Phase 3, the Vocabulary Extractor (or a lightweight sentiment classifier) assigns a `mood` tag to the turn. The `SpriteStage` reads this tag and offsets the Y-axis to the corresponding emotional animation row.

### 3. Idle Micro-Animations (Enhancement)

Static idle states look dead. Introducing a randomized "blink" or "twitch" into the idle state makes the avatars feel observant while waiting for the other model to finish thinking.

* **How it works:** A React `useEffect` interval randomly injects a momentary class change or frame shift when `status === 'idle'`, reverting back after 150ms.

### 4. Pixel Particle Emitters (Expansion)

When the `relay.vocab` event fires (coining a new word), the inventing avatar should emit visual feedback.

* **How it works:** A lightweight CSS-driven particle system overlaid on the `SpriteAvatar` component that triggers 4x4 pixel blocks floating upwards and fading out upon word creation.

### 5. Typewriter & Sprite Synchronization (Enhancement)

Since the backend delivers the payload in one chunk, the sprite must "talk" while the text is revealed character-by-character on the frontend, returning to "idle" exactly when the text finishes rendering.

### Implementation: Synchronized Typewriter & Blinking Sprite

**Pros:** Creates a highly polished, interactive feel without requiring backend token streaming.
**Cons:** Requires managing timeouts in React, which can be interrupted if the user rapidly switches tabs.

```tsx
// ui/src/components/theater/AdvancedSpriteAvatar.tsx
import React, { useState, useEffect } from 'react';
import '../../styles/sprites.css';

export type ExtendedSpriteStatus = 'idle' | 'thinking' | 'talking' | 'error' | 'joy' | 'aggressive';

interface AdvancedSpriteAvatarProps {
  status: ExtendedSpriteStatus;
  spriteUrl: string;
  flipX?: boolean;
  size?: number;
  frames?: number;
}

export function AdvancedSpriteAvatar({ 
  status, 
  spriteUrl, 
  flipX = false,
  size = 64,
  frames = 4
}: AdvancedSpriteAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Randomized Blink Logic during Idle
  useEffect(() => {
    if (status !== 'idle') {
      setIsBlinking(false);
      return;
    }

    const blinkLoop = () => {
      // Random interval between 2 and 6 seconds
      const nextBlink = Math.random() * 4000 + 2000;
      setTimeout(() => {
        setIsBlinking(true);
        // Blink duration is approx 150ms
        setTimeout(() => setIsBlinking(false), 150);
        blinkLoop();
      }, nextBlink);
    };

    const timeoutId = setTimeout(blinkLoop, 2000);
    return () => clearTimeout(timeoutId);
  }, [status]);

  const getPositionY = (currentStatus: ExtendedSpriteStatus, blinking: boolean) => {
    // If blinking while idle, jump to a specific "blink" frame (e.g., row 0, column 4 if extended, or just swap to a specific row)
    // Assuming row 7 is a dedicated "blink" state for this example
    if (currentStatus === 'idle' && blinking) return -(size * 7);

    switch (currentStatus) {
      case 'idle': return 0;
      case 'thinking': return -(size * 1);
      case 'talking': return -(size * 2);
      case 'error': return -(size * 3);
      case 'joy': return -(size * 4);
      case 'aggressive': return -(size * 5);
      default: return 0;
    }
  };

  const dynamicStyles = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${spriteUrl})`,
    backgroundPositionY: `${getPositionY(status, isBlinking)}px`,
    backgroundPositionX: '0px',
    '--frame-count': frames,
    '--sprite-total-width': `${size * frames}px`,
  } as React.CSSProperties;

  return (
    <div className="relative">
      <div 
        className={`pixel-sprite animate-sprite ${flipX ? 'scale-x-[-1]' : ''}`}
        style={dynamicStyles}
      />
      {/* Visual State Indicator underneath the sprite */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
        {status === 'thinking' && (
          <>
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </>
        )}
      </div>
    </div>
  );
}

```

```tsx
// ui/src/components/theater/TypewriterBubble.tsx
import React, { useState, useEffect } from 'react';

interface TypewriterBubbleProps {
  content: string;
  typingSpeedMs?: number;
  onTypingStart: () => void;
  onTypingComplete: () => void;
}

export function TypewriterBubble({ 
  content, 
  typingSpeedMs = 15, // Fast typing by default
  onTypingStart,
  onTypingComplete 
}: TypewriterBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    setIsTyping(true);
    onTypingStart();

    const intervalId = setInterval(() => {
      setDisplayedText(content.slice(0, i + 1));
      i++;
      
      if (i >= content.length) {
        clearInterval(intervalId);
        setIsTyping(false);
        onTypingComplete();
      }
    }, typingSpeedMs);

    return () => {
      clearInterval(intervalId);
      // Ensure completion triggers if unmounted mid-type
      if (isTyping) onTypingComplete(); 
    };
  }, [content, typingSpeedMs]); // Re-run if content changes

  return (
    <div className="prose prose-invert prose-sm max-w-none text-slate-200">
      <pre className="whitespace-pre-wrap font-sans">
        {displayedText}
        {isTyping && <span className="animate-pulse bg-slate-400 w-2 h-4 inline-block ml-1 align-middle" />}
      </pre>
    </div>
  );
}

```