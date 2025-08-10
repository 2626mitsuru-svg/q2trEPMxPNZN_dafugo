import { useEffect, useRef, useCallback } from 'react';
import type { GameState, Player } from '../types/game';

type Expression = 'neutral' | 'thinking';

interface ExpressionTimer {
  playerId: number;
  timerId: ReturnType<typeof setTimeout> | null;
  lastExpression: Expression | null;
  lastChangeTime: number;
}

// 保持時間（お好みで調整可）
const THINKING_MS: [number, number] = [900, 1400];  // 短め
const NEUTRAL_MS:  [number, number] = [1700, 2500]; // 長め（thinking偏り防止）

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const isAutoTarget = (p: Player) =>
  !p.isHuman && p.hand.length > 0 && !p.isFoulFinished;

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

    const cur = (player.expression as Expression) ?? 'neutral';
    if (cur !== 'neutral' && cur !== 'thinking') {
      // 別表情（talking/happy等）の間は自動切替しない
      clearTimer(playerId);
      return;
    }

    const hold =
      cur === 'thinking'
        ? getAdjustedTime(rand(NEUTRAL_MS[0], NEUTRAL_MS[1])) // thinkingの後はneutralを長め
        : getAdjustedTime(rand(THINKING_MS[0], THINKING_MS[1])); // neutralの後はthinkingを短め

    const timerId = setTimeout(() => {
      // 実行時点の最新stateで安全に更新
      setGameState((prev) => {
        if (!prev) return prev;
        const idx = prev.players.findIndex((p) => p.id === playerId);
        if (idx < 0) return prev;

        const pl = prev.players[idx];
        if (!isAutoTarget(pl)) return prev;

        const curExp = (pl.expression as Expression) ?? 'neutral';
        if (curExp !== 'neutral' && curExp !== 'thinking') {
          // 外部で別表情に変えられた → 自動停止
          clearTimer(playerId);
          return prev;
        }

        const next: Expression = curExp === 'thinking' ? 'neutral' : 'thinking';
        const nextState: GameState = {
          ...prev,
          players: prev.players.map((p, i) =>
            i === idx ? { ...p, expression: next } : p
          ),
        };

        // 連続スケジュール（次のトグル予約）
        timersRef.current.set(playerId, {
          playerId,
          timerId: null, // いったんnull、下で上書き
          lastExpression: next,
          lastChangeTime: Date.now(),
        });

        // 次の予約を即セット
        setTimeout(() => scheduleNext(playerId), 0);
        return nextState;
      });
    }, hold);

    timersRef.current.set(playerId, {
      playerId,
      timerId,
      lastExpression: cur,
      lastChangeTime: Date.now(),
    });
  }, [gameState, getAdjustedTime, setGameState]);

  // ゲーム進行に応じて監視＆（再）スケジュール
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing' || isPaused) {
      // 一時停止 or 非プレイ時は全停止
      timersRef.current.forEach((t) => t.timerId && clearTimeout(t.timerId));
      timersRef.current.clear();
      return;
    }

    gameState.players.forEach((p) => {
      const cur = (p.expression as Expression) ?? 'neutral';
      const existing = timersRef.current.get(p.id);

      // 条件に合わない・別表情なら停止
      if (!isAutoTarget(p) || (cur !== 'neutral' && cur !== 'thinking')) {
        clearTimer(p.id);
        return;
      }

      // まだタイマーがない／表情が変わったら再スケジュール
      if (!existing || existing.lastExpression !== cur || !existing.timerId) {
        clearTimer(p.id);
        scheduleNext(p.id);
      }
    });

    // いないIDのタイマーは掃除
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

  // デバッグフックはそのまま残す
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
