export class ParkAudio {
  private ctx: AudioContext | null = null
  muted = false

  unlock(): void {
    if (this.ctx) return
    const Context = window.AudioContext
    if (!Context) return
    try {
      this.ctx = new Context()
    } catch {
      this.ctx = null
    }
  }

  play(kind: 'collect' | 'ok' | 'no' | 'build'): void {
    if (this.muted || !this.ctx) return
    try {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      const now = this.ctx.currentTime
      const freq = kind === 'no' ? 196 : kind === 'build' ? 523 : kind === 'collect' ? 660 : 440
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      if (kind === 'build') osc.frequency.linearRampToValueAtTime(784, now + 0.18)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      osc.start(now)
      osc.stop(now + 0.24)
    } catch {
      // Audio is optional. A blocked context should not stop play.
    }
  }
}
