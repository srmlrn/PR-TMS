'use client';

import { useEffect, useRef, useState } from 'react';
import type { DisplayBoard, DisplayBoardLane } from '@tms/types';
import { fetchDisplayBoard } from '@/lib/display-api';
import styles from './display.module.css';

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
    setTimeout(() => void ctx.close(), 500);
  } catch {
    /* audio blocked or unavailable */
  }
}

function formatClock(now: Date) {
  return {
    time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

function servingKey(lanes: DisplayBoardLane[]): string {
  return lanes.map((l) => `${l.queueType}:${l.nowServing?.tokenNumber ?? '-'}`).join('|');
}

export default function FrontDeskDisplayPage() {
  const [board, setBoard] = useState<DisplayBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState(formatClock(new Date()));
  const [flashing, setFlashing] = useState(false);
  const prevServingRef = useRef('');
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchDisplayBoard();
        if (cancelled) return;

        const key = servingKey(data.lanes);
        if (prevServingRef.current && prevServingRef.current !== key) {
          playChime();
          setFlashing(true);
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setFlashing(false), 1200);
        }
        prevServingRef.current = key;

        setBoard(data);
        setError(null);
        setConnected(true);
      } catch (err) {
        if (cancelled) return;
        setConnected(false);
        setError(err instanceof Error ? err.message : 'Connection lost');
      }
    };

    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const stats = board?.stats;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            🛕
          </span>
          <div>
            <h1>{board?.tenantName ?? 'Temple Queue'}</h1>
            <p className={styles.date}>{clock.date}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={[styles.live, connected ? styles.liveOk : styles.liveErr].join(' ')}>
            <span className={styles.liveDot} />
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
          <span className={styles.clock}>{clock.time}</span>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error} — retrying every 5s
        </div>
      )}

      <div className={styles.lanes}>
        {(board?.lanes ?? []).map((lane) => (
          <section key={lane.queueType} className={styles.lane}>
            <div className={styles.laneHead}>
              <p className={styles.counter}>{lane.counterLabel}</p>
              {lane.queueType === 'priority' && <span className={styles.vipBadge}>VIP</span>}
            </div>

            <p className={styles.label}>Now serving</p>
            {lane.nowServing ? (
              <div className={[styles.servingCard, flashing ? styles.pulse : ''].filter(Boolean).join(' ')}>
                <span className={styles.token}>{lane.nowServing.tokenNumber}</span>
                {lane.nowServing.priority && <span className={styles.vipTag}>VIP</span>}
              </div>
            ) : (
              <p className={styles.tokenPlaceholder}>—</p>
            )}

            <p className={[styles.label, styles.labelNext].join(' ')}>Up next</p>
            <ul className={styles.nextList}>
              {lane.upNext.map((t) => (
                <li key={t.tokenNumber}>
                  <strong>{t.tokenNumber}</strong>
                  {t.priority && <span className={styles.vipInline}>VIP</span>}
                  {t.estimatedWaitMinutes != null && (
                    <span className={styles.wait}>~{t.estimatedWaitMinutes}m</span>
                  )}
                </li>
              ))}
              {lane.upNext.length === 0 && <li className={styles.muted}>No one waiting</li>}
            </ul>
          </section>
        ))}
      </div>

      <footer className={styles.footer}>
        <div className={styles.stats}>
          <span>
            <strong>{stats?.inQueue ?? '—'}</strong> waiting
          </span>
          <span>
            Avg wait <strong>~{stats?.averageWaitMinutes ?? '—'} min</strong>
          </span>
          <span>
            Served today <strong>{stats?.servedToday ?? '—'}</strong>
          </span>
          <span>
            Calling now <strong>{stats?.calledNow ?? '—'}</strong>
          </span>
        </div>
        {board?.announcements && board.announcements.length > 0 && (
          <div className={styles.tickerWrap}>
            <div className={styles.ticker}>
              {board.announcements.map((msg) => (
                <span key={msg} className={styles.tickerItem}>
                  {msg}
                </span>
              ))}
              {board.announcements.map((msg) => (
                <span key={`${msg}-dup`} className={styles.tickerItem}>
                  {msg}
                </span>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
