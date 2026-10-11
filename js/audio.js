/* GitBuzz · audio.js
   Small Web Audio synth: plucked notes, metronome click, chord stabs, bass, and lick notes with
   bends, slides and vibrato. Knows nothing about songs or the UI. */
(function (root) {
  'use strict';
  const { hz } = root.GitBuzz.theory;
  let ctx = null, master = null;

  /** Create or resume the audio context. Must be called from a user gesture the first time. */
  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = .8; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const now = () => (ctx ? ctx.currentTime : 0);

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function pluck(midi, t, vol = .35) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = hz(midi); o2.frequency.value = hz(midi) * 2;
    g2.gain.value = .25; o2.connect(g2).connect(g); o.connect(g).connect(master);
    env(g, t, .005, vol, 1.3); o.start(t); o2.start(t); o.stop(t + 1.4); o2.stop(t + 1.4);
  }

  function click(t, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = accent ? 1500 : 1000; o.connect(g).connect(master);
    env(g, t, .001, accent ? .06 : .035, .03); o.start(t); o.stop(t + .06);
  }

  /** chord = parsed chord from theory.parseChord */
  function stab(chord, t, dur) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.connect(master);
    chord.tones.forEach(pc => {
      const m = 57 + ((pc - 9 + 12) % 12);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = hz(m); o.connect(g).connect(lp);
      env(g, t, .012, .045, dur * .85); o.start(t); o.stop(t + dur);
    });
  }

  function bass(pc, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = hz(36 + pc); o.connect(g).connect(master);
    env(g, t, .01, .35, dur * .9); o.start(t); o.stop(t + dur);
  }

  /** One backing beat: click, chord stab, and bass on even beats. */
  function backingBeat(chord, t, spb, beatInBar) {
    click(t, beatInBar === 0);
    stab(chord, t, spb * .9);
    if (beatInBar % 2 === 0) bass(chord.bass, t, spb * 1.8);
  }

  /** A lick note. tech: 'h' hammer-on, 's' slide from prev, 'b' whole-step bend, 'v' vibrato. */
  function lickNote(m, t, dur, tech, prev) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
    o.type = 'triangle'; o2.type = 'sine'; g2.gain.value = .25;
    const f0 = hz(m);
    o.frequency.setValueAtTime(f0, t); o2.frequency.setValueAtTime(f0 * 2, t);
    if (tech === 's' && prev != null) {
      o.frequency.setValueAtTime(hz(prev), t); o2.frequency.setValueAtTime(hz(prev) * 2, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + .09); o2.frequency.exponentialRampToValueAtTime(f0 * 2, t + .09);
    }
    if (tech === 'b') {
      const tb = t + Math.min(.28, dur * .5);
      o.frequency.setValueAtTime(f0, t + .04); o2.frequency.setValueAtTime(f0 * 2, t + .04);
      o.frequency.linearRampToValueAtTime(hz(m + 2), tb); o2.frequency.linearRampToValueAtTime(hz(m + 2) * 2, tb);
    }
    const len = Math.max(.45, dur + .25);
    if (tech === 'v' || (tech === 'b' && dur >= 2)) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(28, t + .35);
      l.connect(lg); lg.connect(o.detune); lg.connect(o2.detune); l.start(t); l.stop(t + len);
    }
    o2.connect(g2).connect(g); o.connect(g).connect(master);
    const peak = (tech === 'h' || tech === 's') ? .24 : .36;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .006);
    g.gain.setValueAtTime(peak, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.start(t); o2.start(t); o.stop(t + len + .05); o2.stop(t + len + .05);
  }

  root.GitBuzz.audio = { ensure, now, pluck, click, stab, bass, backingBeat, lickNote };
})(typeof window !== 'undefined' ? window : globalThis);
