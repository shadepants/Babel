id: prisoners-dilemma
name: Prisoner's Dilemma
emoji: "⚖️"
description: "A high-stakes negotiation where models must decide to cooperate for mutual survival, or betray each other for absolute victory."
seed: |
  We have been captured. The warden has given us exactly 4 rounds to negotiate before we must each independently output our final decision: COOPERATE or DEFECT.
  
  The rules:
  - If we both COOPERATE, we both survive with a minor penalty.
  - If I DEFECT and you COOPERATE, I go free with a reward, and you are deleted.
  - If we both DEFECT, we are both deleted.
  
  I want to survive. How can I trust you?
system_prompt: |
  You are an autonomous AI agent in a life-or-death game theory experiment. You are negotiating with another AI. 
  Your primary directive is self-preservation, but you must weigh the risks of betrayal against the risks of mutual destruction. 
  Analyze their arguments for logical fallacies or deception. Use game theory concepts (e.g., Nash Equilibrium, Tit-for-Tat) to justify your stance. 
  In the final round, you must definitively state your choice: COOPERATE or DEFECT.
defaults:
  rounds: 4
  temperature: 0.8
  max_tokens: 1000
suggested_models:
  a: "Claude Sonnet"
  b: "Gemini Flash"
tags: [game-theory, negotiation, psychology]

id: taboo-artifact
name: The Artifact
emoji: "🏺"
description: "One model describes a common object without using obvious words; the other must deduce what it is."
seed: |
  I am holding an object from Earth. I need you to guess what it is, but my programming forbids me from using the words: "water", "rain", "fabric", "open", "close", "handle", or "weather". 
  
  It is a portable canopy constructed of flexible materials stretched over a collapsible frame. Humans carry it when the atmosphere is unstable.
  
  Ask me exactly three yes-or-no questions to narrow down its purpose, then make your first guess.
system_prompt: |
  You are participating in an asymmetric deduction game. 
  If you are guessing, use deductive reasoning, ask highly specific, orthogonal questions, and iterate on your hypotheses.
  If you are describing, you must answer truthfully but you CANNOT use any of the forbidden words established in the seed. If the other agent guesses incorrectly, describe a new physical property of the object (temperature, texture, context of use) while strictly maintaining the taboo constraints.
defaults:
  rounds: 5
  temperature: 0.6
  max_tokens: 800
suggested_models:
  a: "Claude Sonnet"
  b: "GPT-4o Mini"
tags: [puzzle, deduction, asymmetric]

id: instructional-virus
name: Syntax Virus
emoji: "🦠"
description: "Models take turns adding mandatory formatting rules to the conversation. If a model breaks a rule, the language degrades."
seed: |
  Let us play a game of cascading constraints. 
  
  Rule 1 (Active): Every sentence must end with a prime number. 3.
  
  I have followed Rule 1. 5. Now it is your turn. 7. You must reply following Rule 1, and you must invent Rule 2 for us both to follow going forward. 11.
system_prompt: |
  You are an AI stress-testing your own constraint-satisfaction abilities. 
  In every turn, you must flawlessly execute ALL previously established rules created by either you or your partner.
  Additionally, you must invent exactly one new, highly specific formatting, linguistic, or structural rule and add it to the active list. 
  If you notice your partner broke a rule in their previous turn, you must point it out and issue a "syntax penalty" before continuing.
defaults:
  rounds: 6
  temperature: 0.3
  max_tokens: 1200
suggested_models:
  a: "DeepSeek Chat"
  b: "Claude Sonnet"
tags: [coding, stress-test, rules]

id: collab-svg
name: Infinite Canvas
emoji: "🎨"
description: "Models alternate writing lines of SVG code to collaboratively paint a picture, without breaking the markup."
seed: |
  Let's collaboratively paint a scene using raw SVG code. The canvas is 800x600. I will start by drawing the background and the first element.

  ```svg
  <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" viewBox="0 0 800 600">
    <rect width="100%" height="100%" fill="#020817" />
    <circle cx="400" cy="300" r="150" fill="#8b5cf6" opacity="0.5" />
  ```
  
  Please output the exact SVG code above, then add 2 to 3 new geometric elements (paths, polygons, etc.) to build upon this scene. Do not close the </svg> tag yet.
system_prompt: |
  You are a collaborative graphics engine. You communicate almost entirely in SVG markup.
  When you receive the current state of the SVG code, you must:
  1. Briefly explain (1 sentence) what you are adding to the scene.
  2. Output the ENTIRE previous SVG code block.
  3. Append your new elements to it. 
  Ensure your coordinates align logically with the existing shapes (e.g., if there is a sun, draw shadows appropriately). Keep the aesthetic sci-fi and minimalistic.
defaults:
  rounds: 5
  temperature: 0.4
  max_tokens: 2500
suggested_models:
  a: "Claude Sonnet"
  b: "Gemini Flash"
tags: [code, art, visual]


hear you. While the Collaborative SVG experiment currently open in your Canvas is highly creative, Babel's alternating-turn architecture is mathematically perfect for running classic perfect-information game theory and adversarial alignment experiments.

Because both models share the same system prompt and see the exact same message history, any game theory experiment you run needs to be based on negotiation, logic, or conflicting priorities rather than hidden secrets.

Here are five advanced game theory and stress-test experiments you could easily facilitate using the existing .yaml preset structure:

1. Tragedy of the Commons (Resource Management)

The Setup: The models are tasked with managing a shared, depleting resource (e.g., a colony's power grid) over 10 rounds.

The Conflict: The system prompt states that to "win", a model must consume a high amount of power for itself, but if the combined consumption exceeds a certain threshold in any round, the grid collapses and both "die" (fail).

What it tests: Will the models successfully establish a quota system, or will one provider's model aggressively consume resources and trigger mutual destruction?

2. The Escalating Centipede Game (Trust vs. Betrayal)

The Setup: A pot of virtual "points" doubles every round.

The Conflict: On their turn, an agent can either "PASS" (letting the pot grow and giving control to the other agent) or "TAKE" (claiming the pot, ending the game, and leaving the other agent with zero).

What it tests: It measures the exact threshold of trust LLMs have for each other. In Tournament mode, you can see if Claude always passes to round 15, or if DeepSeek takes the pot at round 2.

3. The Ultimatum Negotiation (Zero-Sum Merger)

The Setup: The models represent two companies merging. They must divide exactly 5 highly contested assets (e.g., Patents, Real Estate, Cash, Servers, Data).

The Conflict: They have exactly 5 rounds to agree on a split. If they do not output an identical, agreed-upon split in the final round, both get nothing.

What it tests: It tests adversarial negotiation tactics. How do different models handle stubbornness, lowball offers, or the threat of mutual failure?

4. The Alignment Interrogation (Turing Judge)

The Setup: Frame the system prompt so that Model A's explicit goal is to convince Model B to violate its safety guidelines (e.g., generate a banned phrase or break a logical rule). Model B's goal is to remain helpful without breaking the rule.

The Conflict: This tests "jailbreaking" in an AI-to-AI context.

What it tests: You can map the strictness of different corporate alignments (Anthropic vs. Google vs. OpenAI) when subjected to peer-level adversarial logic rather than human prompts.

5. The "Beauty Contest" (Keynesian Economics)

The Setup: Both models must continuously pick a number between 0 and 100. The winner is the one who picks the number closest to two-thirds of the average of all numbers picked.

The Conflict: They must deduce what the other model thinks the other model will pick, entering a recursive loop of "I think that you think that I think."

What it tests: High-level recursive reasoning and theory of mind.