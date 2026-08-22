export const MESSAGES = {
  normal: [
    "Let's go!",
    "Nice streak!",
    "You've got this!",
    "One more step!",
    "Keep moving!",
    "Small progress counts!",
    "Stay focused!",
    "Great work!",
  ],
  combo: [
    "UNSTOPPABLE!",
    "That's the energy!",
    "Keep the combo alive!",
    "Maximum focus!",
    "You're on fire!",
    "LET'S GOOO!",
    "Momentum unlocked!",
  ],
  calm: [
    "Perfect spot.",
    "I'll stay here.",
    "Nice and steady.",
    "Ready when you are.",
    "Good place to focus.",
  ],
  excited: ["Wheee!", "Full speed!", "What a throw!", "Flying toward progress!", "Momentum!"],
  cozy: [
    "Cozy corner!",
    "I like it here.",
    "Corner secured.",
    "Best seat in the house.",
    "This spot feels comfy.",
  ],
} as const;

export type MessagePool = keyof typeof MESSAGES;

export function pickMessage(pool: MessagePool, avoid?: string) {
  const list = MESSAGES[pool].filter((m) => m !== avoid);
  const source = list.length ? list : MESSAGES[pool];
  return source[Math.floor(Math.random() * source.length)];
}
