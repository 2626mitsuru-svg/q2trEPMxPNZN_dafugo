import { useEffect } from 'react';
import { useGameCore } from './useGameCore';
import { useGameUI } from './useGameUI';
import { useGameEffects } from './useGameEffects';

/**
 * アプリケーション全体の統合フック
 * 
 * ゲームコアとUIの統合、循環依存の解決を行う
 */
export const useAppIntegration = () => {
  // === ゲームコア機能 ===
  const gameCore = useGameCore();
  
  // === ゲームUI機能 ===
  const gameUI = useGameUI({
    setGameState: gameCore.setGameState,
    getAdjustedTime: gameCore.getAdjustedTime,
    isPaused: gameCore.isPaused,
    gameState: gameCore.gameState,
    clearAllTimers: gameCore.clearAllTimers,
    initializeGame: gameCore.initializeGame,
    setGameSpeed: gameCore.setGameSpeed,
    setIsPaused: gameCore.setIsPaused,
    handleGameAction: gameCore.handleGameAction,
    emergencyRefresh: gameCore.emergencyRefresh,
    resetGame: gameCore.resetGame,
    setDebugMode: gameCore.setDebugMode,
    debugMode: gameCore.debugMode,
    handlePauseToggle: () => gameCore.setIsPaused(!gameCore.isPaused)
  });

  // === 循環依存解決：UIハンドラーをゲームアクションに注入 ===
  useEffect(() => {
    // UIハンドラーをゲームコアに注入
    gameCore.updateUIHandlers({
      setReactionEmoji: gameUI.setReactionEmoji,
      processSelfPlayReactions: gameUI.processSelfPlayReactions,
      processOtherPlayersReactions: gameUI.processOtherPlayersReactions,
      processResponseToMyPlay: gameUI.processResponseToMyPlay
    });
    console.log('🔄 UI handlers successfully injected into game core');
  }, [gameCore, gameUI]);

  // === ゲームエフェクト管理 ===
  useGameEffects({
    gameState: gameCore.gameState,
    gameSpeed: gameCore.gameSpeed,
    timerRefs: {
      aiProcessRef: gameCore.aiProcessRef,
      eightCutTimerRef: gameCore.eightCutTimerRef,
      spectatorCommentTimerRef: gameCore.spectatorCommentTimerRef,
      passMessageTracker: gameCore.passMessageTracker
    },
    processAITurn: gameCore.processAITurn,
    setupEightCutTimer: gameCore.setupEightCutTimer,
    startContinuousWatchdog: gameCore.startContinuousWatchdog,
    stopWatchdog: gameCore.stopWatchdog,
    clearAllTimers: gameCore.clearAllTimers,
    emergencyRefresh: gameCore.emergencyRefresh,
    completeEightCut: gameCore.completeEightCut
  });

  return {
    // ゲームコア（状態・ロジック）
    gameCore,
    
    // ゲームUI（エフェクト・ハンドラー）
    gameUI,
    
    // 統合されたハンドラー
    integrationHandlers: {
      handlePauseToggle: () => gameCore.setIsPaused(!gameCore.isPaused)
    }
  };
};