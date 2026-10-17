// Sound & Vibration Alarm for Rest Timer
let audioCtx = null
let activeOscillators = []
let activeTimeouts = []

export function stopRestAlarm() {
  activeTimeouts.forEach(t => clearTimeout(t))
  activeTimeouts = []

  activeOscillators.forEach(osc => {
    try {
      osc.stop()
      osc.disconnect()
    } catch {}
  })
  activeOscillators = []

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0)
    } catch {}
  }
}

export function playLoudRestAlarm() {
  stopRestAlarm()

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    if (!audioCtx) {
      audioCtx = new AudioCtx()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }

    const ctx = audioCtx
    const now = ctx.currentTime

    // Loud, authoritative gym buzzer pattern lasting ~3.4 seconds (4 distinct pulses)
    const bursts = [
      { start: 0.0, dur: 0.45, freqs: [880, 1320] },
      { start: 0.8, dur: 0.45, freqs: [880, 1320] },
      { start: 1.6, dur: 0.45, freqs: [880, 1320] },
      { start: 2.4, dur: 0.95, freqs: [987.77, 1479.98, 1975.53] } // Climax finale burst
    ]

    bursts.forEach(burst => {
      const bStart = now + burst.start
      const bEnd = bStart + burst.dur

      burst.freqs.forEach(freq => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Triangle wave gives punchy, audible electronic gym timer chime without distortion
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, bStart)

        // Envelope: instant punchy attack at high volume (~0.85), sustained tone, clean release
        gain.gain.setValueAtTime(0.001, bStart)
        gain.gain.linearRampToValueAtTime(0.85, bStart + 0.03)
        gain.gain.setValueAtTime(0.85, bEnd - 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, bEnd)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(bStart)
        osc.stop(bEnd)
        activeOscillators.push(osc)
      })
    })

    // Mobile vibration pattern matching the 4 bursts over 3.4 seconds
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([450, 350, 450, 350, 450, 350, 950])
      } catch {}
    }

    // Auto-clean after 3.8s
    const cleanupTimer = setTimeout(() => {
      stopRestAlarm()
    }, 3800)
    activeTimeouts.push(cleanupTimer)
  } catch (err) {
    console.warn('Audio alarm error:', err)
  }
}

export function playCountdownBeep(isFinal = false) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    if (!audioCtx) audioCtx = new AudioCtx()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const freq = isFinal ? 880 : 440
    const dur = isFinal ? 0.35 : 0.15

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)

    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + dur)
  } catch {}
}

export function triggerHapticFeedback(pattern = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {}
  }
}
