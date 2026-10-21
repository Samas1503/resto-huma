// Beep de alerta para comandas nuevas (Web Audio API pura, sin dependencias).
// Dos tonos cortos tipo campanita de cocina.
let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

export function beepComanda(): void {
  const ac = getAudioContext();
  if (!ac) return;
  // El contexto puede arrancar "suspended" por la política de autoplay del
  // browser: se reanuda y recién ahí se agendan los tonos. Si no hubo gesto
  // de usuario todavía, resume() rechaza y simplemente no suena.
  ac
    .resume()
    .then(() => {
      const t0 = ac.currentTime;
      [880, 1174.66].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const start = t0 + i * 0.22;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
        osc.connect(gain).connect(ac.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    })
    .catch(() => {});
}
