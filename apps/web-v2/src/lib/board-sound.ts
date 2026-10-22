/**
 * QUOI     — les sons du tableau de l'équipe : le carillon d'une carte faite, qui monte d'un
 *            demi-ton à chaque carte de la journée ; la fanfare du paquet vidé ; le froissement
 *            du mélange. Et le choix « son coupé », retenu par le navigateur.
 * POURQUOI — prototype validé par Uriel le 22/10/2026 : une récompense qu'on entend. Synthétisés
 *            par le navigateur (Web Audio) : aucun fichier, aucune dépendance.
 * ATTENTION — un navigateur n'ouvre le son qu'après un geste : chaque son part d'un clic.
 */

const STORAGE_KEY = 'fellowship.board.sound'
/** Le mi de la 5e octave : la première carte de la journée. */
const FIRST_NOTE = 659.25
const LOUDNESS = 0.42

let context: AudioContext | null = null
let output: GainNode | null = null

/** Le contexte audio, créé au premier son, avec un léger écho qui donne de l'air. */
function audio(): { ctx: AudioContext; out: GainNode } {
  if (!context || !output) {
    context = new AudioContext()
    output = context.createGain()
    output.gain.value = LOUDNESS
    const delay = context.createDelay()
    delay.delayTime.value = 0.13
    const feedback = context.createGain()
    feedback.gain.value = 0.22
    const tone = context.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 2600
    output.connect(context.destination)
    output.connect(delay)
    delay.connect(tone)
    tone.connect(feedback)
    feedback.connect(delay)
    tone.connect(context.destination)
  }
  if (context.state === 'suspended') void context.resume()
  return { ctx: context, out: output }
}

/** Une note de cloche : une sinusoïde, et son octave en triangle pour la brillance. */
function bell(freq: number, at: number, length: number, level: number) {
  const { ctx, out } = audio()
  const gain = ctx.createGain()
  const body = ctx.createOscillator()
  const shine = ctx.createOscillator()
  const shineLevel = ctx.createGain()
  body.type = 'sine'
  shine.type = 'triangle'
  body.frequency.value = freq
  shine.frequency.value = freq * 2.01
  shineLevel.gain.value = 0.12
  body.connect(gain)
  shine.connect(shineLevel).connect(gain)
  gain.connect(out)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(level, at + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  for (const osc of [body, shine]) {
    osc.start(at)
    osc.stop(at + length + 0.05)
  }
}

/** Un souffle de papier : du bruit filtré qui descend. */
function whoosh(at: number) {
  const { ctx, out } = audio()
  const length = 0.28
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const source = ctx.createBufferSource()
  const band = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  band.type = 'bandpass'
  band.Q.value = 1.4
  band.frequency.setValueAtTime(2200, at)
  band.frequency.exponentialRampToValueAtTime(380, at + length)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.linearRampToValueAtTime(0.09, at + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  source.buffer = buffer
  source.connect(band).connect(gain).connect(out)
  source.start(at)
}

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    // Sans stockage, le choix vaut pour la page ouverte.
  }
}

/** La `step`-ième carte de la journée (0 pour la première) : une quinte, un demi-ton plus haut à chaque fois. */
export function playChime(step: number) {
  if (!isSoundOn()) return
  const { ctx } = audio()
  const t = ctx.currentTime
  const base = FIRST_NOTE * Math.pow(2, Math.min(step, 12) / 12)
  bell(base, t, 0.5, 0.5)
  bell(base * 1.5, t + 0.085, 0.75, 0.42)
  whoosh(t + 0.3)
}

/** Le paquet vidé : un arpège majeur, puis l'accord à l'octave. */
export function playFanfare() {
  if (!isSoundOn()) return
  const { ctx } = audio()
  const t = ctx.currentTime + 0.05
  const base = 523.25
  ;[1, 1.25, 1.5, 2].forEach((ratio, i) => bell(base * ratio, t + i * 0.09, 1.1, 0.4))
  ;[1, 1.25, 1.5].forEach((ratio) => bell(base * 2 * ratio, t + 0.42, 1.6, 0.18))
}

/** Le paquet qu'on rebat : trois froissements. */
export function playShuffle() {
  if (!isSoundOn()) return
  const { ctx } = audio()
  ;[0, 0.06, 0.12].forEach((d) => whoosh(ctx.currentTime + d))
}
