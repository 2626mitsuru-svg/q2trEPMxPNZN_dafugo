import { useEffect, useRef, useCallback } from 'react';
import { GameState, Player } from '../types/game';

interface ExpressionTimer {
  playerId: number;
  timerId: NodeJS.Timeout | null;
  lastExpression: string;
  lastChangeTime: number;
}

/**
 * 表情自動切り替えシステム
 * 
 * neutralの表情が2秒以上続いた場合に自動的にthinkingに切り替える
 */
export const useExpressionAutoSwitch = (
  gameState: GameState | null,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  getAdjustedTime: (time: number) => number,
  isPaused: boolean
) => {
  const expressionTimersRef = useRef<Map<number, ExpressionTimer>>(new Map());

  // プレイヤーの表情を自動的にthinkingに切り替える
  const switchToThinking = useCallback((playerId: number) => {
    setGameState(prevState => {
      if (!prevState) return prevState;
      
      const newState = { ...prevState };
      const playerIndex = newState.players.findIndex(p => p.id === playerId);
      
      if (playerIndex >= 0) {
        const player = newState.players[playerIndex];
        const currentExpr = player.expression;
        
        // neutralまたはnormalの場合のみthinkingに切り替え
        if (currentExpr === 'neutral' || currentExpr === 'normal' || !currentExpr) {
          newState.players[playerIndex].expression = 'thinking';
          console.log(`🎭 Auto-switched ${player.character.name} from ${currentExpr || 'undefined'} to thinking (2sec timeout)`);
        }
      }
      
      return newState;
    });
  }, [setGameState]);

  // 特定プレイヤーの表情タイマーをセットアップ
  const setupExpressionTimer = useCallback((playerId: number, currentExpression: string) => {
    const timers = expressionTimersRef.current;
    const existingTimer = timers.get(playerId);
    
    // 既存のタイマーをクリア
    if (existingTimer?.timerId) {
      clearTimeout(existingTimer.timerId);
    }
    
    // neutralまたはnormalの場合のみタイマーを設定
    const isNeutralType = currentExpression === 'neutral' || currentExpression === 'normal' || !currentExpression;
    
    if (isNeutralType && !isPaused) {
      const timerId = setTimeout(() => {
        switchToThinking(playerId);
        // タイマー実行後はクリア
        timers.delete(playerId);
      }, getAdjustedTime(2000)); // 2秒後に切り替え
      
      timers.set(playerId, {
        playerId,
        timerId,
        lastExpression: currentExpression,
        lastChangeTime: Date.now()
      });
      
      console.log(`🕐 Started expression timer for player ${playerId} (${currentExpression} → thinking in 2s)`);
    } else {
      // neutral以外の表情の場合はタイマーを削除
      timers.delete(playerId);
      console.log(`🕐 Cleared expression timer for player ${playerId} (non-neutral: ${currentExpression})`);
    }
  }, [switchToThinking, getAdjustedTime, isPaused]);

  // 全てのプレイヤーの表情を監視
  useEffect(() => {
    if (!gameState || gameState.gamePhase !== 'playing') {
      // ゲーム中でない場合は全タイマークリア
      expressionTimersRef.current.forEach(timer => {
        if (timer.timerId) {
          clearTimeout(timer.timerId);
        }
      });
      expressionTimersRef.current.clear();
      return;
    }

    // 各プレイヤーの表情をチェック
    gameState.players.forEach(player => {
      if (!player.isHuman && player.hand.length > 0 && !player.isFoulFinished) {
        const currentExpression = player.expression || 'neutral';
        const existingTimer = expressionTimersRef.current.get(player.id);
        
        // 表情が変わった場合はタイマーをリセット
        if (!existingTimer || existingTimer.lastExpression !== currentExpression) {
          setupExpressionTimer(player.id, currentExpression);
        }
      } else {
        // 人間プレイヤーまたは終了したプレイヤーのタイマーはクリア
        const existingTimer = expressionTimersRef.current.get(player.id);
        if (existingTimer?.timerId) {
          clearTimeout(existingTimer.timerId);
          expressionTimersRef.current.delete(player.id);
        }
      }
    });
  }, [gameState, setupExpressionTimer]);

  // ゲーム一時停止時の処理
  useEffect(() => {
    if (isPaused) {
      // 一時停止時は全タイマーを一時停止
      expressionTimersRef.current.forEach(timer => {
        if (timer.timerId) {
          clearTimeout(timer.timerId);
          timer.timerId = null;
        }
      });
      console.log('🎭 Expression auto-switch paused');
    } else {
      // 再開時はタイマーを再セットアップ
      if (gameState?.gamePhase === 'playing') {
        expressionTimersRef.current.forEach((timer, playerId) => {
          if (!timer.timerId) {
            const player = gameState.players.find(p => p.id === playerId);
            if (player && !player.isHuman) {
              setupExpressionTimer(playerId, player.expression || 'neutral');
            }
          }
        });
        console.log('🎭 Expression auto-switch resumed');
      }
    }
  }, [isPaused, gameState, setupExpressionTimer]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      expressionTimersRef.current.forEach(timer => {
        if (timer.timerId) {
          clearTimeout(timer.timerId);
        }
      });
      expressionTimersRef.current.clear();
      console.log('🎭 Expression auto-switch cleanup completed');
    };
  }, []);

  // デバッグ用：現在のタイマー状態を取得
  const getTimerStatus = useCallback(() => {
    const timers = Array.from(expressionTimersRef.current.values());
    console.log('🎭 Current expression timers:', timers.map(t => ({
      playerId: t.playerId,
      lastExpression: t.lastExpression,
      hasTimer: !!t.timerId,
      elapsedTime: Date.now() - t.lastChangeTime
    })));
    return timers;
  }, []);

  return {
    getTimerStatus
  };
};