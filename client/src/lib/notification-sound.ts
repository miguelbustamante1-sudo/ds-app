let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export async function playNotificationChime(): Promise<void> {
  try {
    const context = getContext();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();

    const now = context.currentTime;

    // Two-note ascending chime (C5 → E5)
    const notes = [523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {
    // Audio unavailable — fail silently
  }
}
