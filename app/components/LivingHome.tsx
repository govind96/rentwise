'use client';

import { useEffect, useRef, useState } from 'react';

export default function LivingHome() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ refresh: () => void; dispose: () => void } | null>(null);
  const [evening, setEvening] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const state = useRef({ evening, paused: paused || reduced });

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    state.current = { evening, paused: paused || reduced };
    scene.current?.refresh();
  }, [evening, paused, reduced]);

  useEffect(() => {
    let cancelled = false;
    import('./living-home-scene').then(({ mountHome }) => {
      if (cancelled || !host.current) return;
      try {
        scene.current = mountHome(host.current, () => state.current);
        setStatus('ready');
      } catch { setStatus('fallback'); }
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; scene.current?.dispose(); scene.current = null; };
  }, []);

  return <section className={`living-home ${evening ? 'evening' : ''}`} aria-label="Animated miniature home">
    <div className="home-scene-heading"><span><i />A little place. A lot of life.</span><small>RentWise, at home</small></div>
    <div className="home-scene-stage" ref={host} aria-hidden="true" />
    {status !== 'ready' && <div className="home-scene-fallback"><span>Rooms for new beginnings.</span><p>{status === 'loading' ? 'Make yourself at home.' : 'A calmer day for you and your residents.'}</p><a href="/dashboard?demo=1">Explore the workspace →</a></div>}
    <div className="home-scene-footer">
      <div className="scene-time" role="group" aria-label="Scene lighting">
        <button type="button" aria-pressed={!evening} onClick={() => setEvening(false)}>☀ Day</button>
        <button type="button" aria-pressed={evening} onClick={() => setEvening(true)}>☾ Evening</button>
      </div>
      <button type="button" className="scene-motion" disabled={reduced || status !== 'ready'} aria-label={reduced ? 'Motion disabled by your device preference' : paused ? 'Play scene animation' : 'Pause scene animation'} onClick={() => setPaused(!paused)}>{reduced || paused ? '▷' : 'Ⅱ'}<span>{reduced ? 'Still view' : paused ? 'Play' : 'Pause'}</span></button>
    </div>
    <p className="scene-caption">{evening ? 'Lights on. Everyone feels at home.' : 'Space to settle in. Room to grow.'}</p>
  </section>;
}
