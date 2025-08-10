import { useEffect, useRef, useCallback } from 'react';
import type { GameState, Player } from '../types/game';

type Expression = 'neutral' | 'thinking';

interface ExpressionTimer {
  playerId: number;
  timerId: ReturnType<typeof setTimeout> | null;
  lastExpression: Expression | null;
  lastChangeTime: number;
}

// 保持時間（ほぼ2秒にしたいなら [1800,2200] などに）
const THINKING_MS: [number, number] = [1000, 2000];
const NEUTRAL_MS:  [number, number] = [600, 1200];

// 初回キック（neutralのまま長く見える対策）
const FIRST_TICK_MS: [number, number] = [300, 600];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const isAutoTarget = (p: Player) =>
  !p.isHuman && p.hand.length > 0 && !p.isFoulFinished;

// "normal"/undefined を neutral 扱いに、その他（talking等）は自動オフ
const normalizeExp = (exp: any): Expression | 'other' => {
  if (exp === 'thinking') return 'thinking';
  if (exp === 'neutral' || exp === 'normal' || exp == null || exp === '') return 'neutral';
  return 'other';
};

export const useExpressionAutoSwitch = (
  gameState: GameState | null,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  getAdjustedTime: (time: number) => number,
  isPaused: boolean
) => {
  const timersRef = useRef<Map<number, ExpressionTimer>>(new Map());

  const clearTimer = (playerId: number) => {
    const t = timersRef.current.get(playerId);
    if (t?.timerId) clearTimeout(t.timerId);
    timersRef.current.delete(playerId);
  };

  // 次の切替を予約（neutral↔thinking を交互に）
  const scheduleNext = useCallback((playerId: number) => {
    const g = gameState;
    if (!g) return;

    const player = g.players.find((p) => p.id === playerId);
    if (!player || !isAutoTarget(player)) {
      clearTimer(playerId);
      return;
    }

    const curNorm = normalizeExp(player.expression);
    if (curNorm === 'other') { clearTimer(playerId); return; }

    const hold =
      curNorm === 'thinking'
        ? getAdjustedTime(rand(NEUTRAL_MS[0], NEUTRAL_MS[1])) // thinking の後は neutral を保持
        : getAdjustedTime(rand(THINKING_MS[0], THINKING_MS[1])); // neutral の後は thinking を保持

    const timerId = setTimeout(() => {
      // 実行時点の最新stateで安全に更新
      setGameState((prev) => {
        if (!prev) return prev;
        const idx = prev.players.findIndex((p) => p.id === playerId);
        if (idx < 0) return prev;

        const pl = prev.players[idx];
        if (!isAutoTarget(pl)) return prev;

        const curExpNorm = normalizeExp(pl.expression);
        if (curExpNorm === 'other') { clearTimer(playerId); return prev; }

        const next: Expression = curExpNorm === 'thinking' ? 'neutral' : 'thinking';
        const nextState: GameState = {
          ...prev,
          players: prev.players.map((p, i) =>
            i === idx ? { ...p, expression: next } : p
          ),
        };

 // 次のトグルは useEffect の監視で再スケジュール（即時呼び出しはしない）
 timersRef.current.set(playerId, {
   playerId,
   timerId: null,
   lastExpression: next,
   lastChangeTime: Date.now(),
 });

        return nextState;
      });
    }, hold);

    timersRef.current.set(playerId, {
      playerId,
      timerId,
      lastExpression: curNorm, // 正規化後を記録
      lastChangeTime: Date.now(),
    });
  }, [gameState, getAdjustedTime, setGameState]);

  // 監視＆（再）スケジュール
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing' || isPaused) {
      timersRef.current.forEach((t) => t.timerId && clearTimeout(t.timerId));
      timersRef.current.clear();
      return;
    }

    gameState.players.forEach((p) => {
      const curNorm = normalizeExp(p.expression);
      const existing = timersRef.current.get(p.id);

      if (!isAutoTarget(p) || curNorm === 'other') {
        clearTimer(p.id);
        return;
      }

      // 表情が変わった／タイマー無しなら張り直し
      if (!existing || existing.lastExpression !== curNorm || !existing.timerId) {
        clearTimer(p.id);
        scheduleNext(p.id);
      }
    });

    // いないIDの掃除
    Array.from(timersRef.current.keys()).forEach((id) => {
      if (!gameState.players.some((p) => p.id === id)) clearTimer(id);
    });
  }, [gameState, isPaused, scheduleNext]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => t.timerId && clearTimeout(t.timerId));
      timersRef.current.clear();
    };
  }, []);

  // デバッグ
  const getTimerStatus = useCallback(() => {
    const timers = Array.from(timersRef.current.values());
    console.log(
      '🎭 Current expression timers:',
      timers.map((t) => ({
        playerId: t.playerId,
        lastExpression: t.lastExpression,
        hasTimer: !!t.timerId,
        elapsedTime: Date.now() - t.lastChangeTime,
      })),
    );
    return timers;
  }, []);

  return { getTimerStatus };
};
