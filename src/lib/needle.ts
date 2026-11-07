/*
 * The needle drop: the arm swings in, a soft crackle, then the song fades up.
 * The song starts muted inside the tap itself (phones only allow sound from a tap), then unmutes after the crackle.
 */

export const NEEDLE_MS = 550;

let ctx: AudioContext | null = null;

/** About half a second of vinyl surface noise with a few pops, quiet. Made on the spot, no file to load. */
function crackle(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    const seconds = 0.7;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      const hiss = (Math.random() * 2 - 1) * 0.18;
      const pop = Math.random() < 0.0016 ? (Math.random() * 2 - 1) * 0.9 : 0;
      // The needle lands with a soft thump, then the hiss settles.
      const land = i < ctx.sampleRate * 0.03 ? Math.sin(i / 40) * 0.5 * (1 - i / (ctx.sampleRate * 0.03)) : 0;
      data[i] = (hiss + pop + land) * (1 - t * 0.6);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    // No crackle is fine.
  }
}

/** Call from the tap. Resolves when the song is audible, or rejects if it can't play. */
export function dropNeedle(audio: HTMLAudioElement): Promise<void> {
  crackle();
  audio.muted = true;
  const started = audio.play();
  return started.then(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          audio.currentTime = 0;
          audio.muted = false;
          fadeIn(audio);
          resolve();
        }, NEEDLE_MS);
      }),
  );
}

/** Fades the volume up where the browser allows it (iPhones keep volume fixed, so there it just starts). */
function fadeIn(audio: HTMLAudioElement, ms = 900): void {
  try {
    audio.volume = 0.05;
    if (audio.volume !== 0.05) return;
    // A timer, not animation frames: those pause in background tabs and would leave the song nearly silent.
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / ms);
      audio.volume = 0.05 + 0.95 * t * t;
      if (t >= 1 || audio.paused) {
        audio.volume = 1;
        clearInterval(timer);
      }
    }, 30);
  } catch {
    // Volume can't be changed here; it simply plays.
  }
}
