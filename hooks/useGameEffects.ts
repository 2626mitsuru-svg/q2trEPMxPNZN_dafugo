import { useEffect } from 'react';
import { GameState } from '../types/game';
import { TimerRefs } from '../types/app';

interface GameEffectsConfig {
  gameState: GameState | null;
  gameSpeed: number;
  timerRefs: TimerRefs;
  processAITurn: () => void;
  setupEightCutTimer: () => void;
  startContinuousWatchdog: (emergencyRefresh: () => void, completeEightCut: () => void) => void;
  stopWatchdog: () => void;
  clearAllTimers: () => void;
  emergencyRefresh: () => void;
  completeEightCut: () => void;
}

export const useGameEffects = ({
  gameState,
  gameSpeed,
  timerRefs,
  processAITurn,
  setupEightCutTimer,
  startContinuousWatchdog,
  stopWatchdog,
  clearAllTimers,
  emergencyRefresh,
  completeEightCut
}: GameEffectsConfig) => {
  
  // AI処理トリガー（八切り中は除外）
  useEffect(() => {
    if (gameState?.gamePhase === 'playing' && !gameState.eightCutState?.isActive) {
      const currentPlayer = gameState.players[gameState.turn];
      if (!currentPlayer.isHuman && currentPlayer.hand.length > 0 && !currentPlayer.isFoulFinished) {
        const delay = setTimeout(() => processAITurn(), 300);
        return () => clearTimeout(delay);
      }
    }
  }, [gameState?.turn, gameState?.gamePhase, gameState?.eightCutState?.isActive, processAITurn]);

  // 八切り処理トリガー
  useEffect(() => {
    if (gameState?.eightCutState?.isActive && !timerRefs.eightCutTimerRef.current) {
      console.log('🎴 Eight cut detected, setting up timer...');
      setupEightCutTimer();
    }
  }, [gameState?.eightCutState?.isActive, setupEightCutTimer, timerRefs.eightCutTimerRef]);

  // ゲームフロー監視
  useEffect(() => {
    if (gameState?.gamePhase === 'playing') {
      startContinuousWatchdog(emergencyRefresh, completeEightCut);
    } else {
      stopWatchdog();
      if (gameState?.gamePhase === 'finished') {
        clearAllTimers();
      }
    }
    return () => stopWatchdog();
  }, [gameState?.gamePhase, startContinuousWatchdog, stopWatchdog, emergencyRefresh, completeEightCut, clearAllTimers]);

  // スピード変更時のタイマークリア
  useEffect(() => {
    clearAllTimers();
  }, [gameSpeed, clearAllTimers]);

  // コンポーネント終了時のクリーンアップ
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);
};