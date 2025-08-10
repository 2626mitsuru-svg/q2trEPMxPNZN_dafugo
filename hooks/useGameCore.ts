import { useCallback, useRef } from 'react';
import { useGameState } from './useGameState';
import { useGameActions } from './useGameActions';
import { useGameFlow } from './useGameFlow';
import { useAIProcessing } from './useAIProcessing';
import { useSpectatorComments } from './useSpectatorComments';
import { useTimers } from './useTimers';
import { Card, GameState } from '../types/game';

/**
 * ゲームコア機能の統合フック
 * 
 * ゲーム状態、アクション処理、フロー制御、AI処理を統合管理
 */
export const useGameCore = () => {
  // === 基本状態管理 ===
  const gameStateHook = useGameState();
  
  // === タイマー管理 ===
  const timersHook = useTimers();
  
  // === ゲームアクション処理 ===
  // UI関連の参照を動的に管理するためのref
  const uiHandlersRef = useRef({
    setReactionEmoji: () => {},
    processSelfPlayReactions: () => {},
    processOtherPlayersReactions: () => {},
    processResponseToMyPlay: () => {}
  });

  // UIハンドラー更新関数
  const updateUIHandlers = useCallback((uiHandlers: {
    setReactionEmoji: (playerId: number, emoji: string, duration?: number) => void;
    processSelfPlayReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
    processOtherPlayersReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
    processResponseToMyPlay: (playerId: number, cards: Card[], gameState: GameState) => void;
  }) => {
    uiHandlersRef.current = uiHandlers;
    console.log('🔄 UI handlers updated in game core');
  }, []);

  const gameActionsConfig = {
    setGameState: gameStateHook.setGameState,
    passMessageTracker: timersHook.passMessageTracker,
    getAdjustedTime: gameStateHook.getAdjustedTime,
    getNextActivePlayer: gameStateHook.getNextActivePlayer,
    handlePlayerFinish: gameStateHook.handlePlayerFinish,
    setReactionEmoji: (playerId: number, emoji: string, duration?: number) => uiHandlersRef.current.setReactionEmoji(playerId, emoji, duration),
    processSelfPlayReactions: (playerId: number, cards: Card[], gameState: GameState) => uiHandlersRef.current.processSelfPlayReactions(playerId, cards, gameState),
    processOtherPlayersReactions: (playerId: number, cards: Card[], gameState: GameState) => uiHandlersRef.current.processOtherPlayersReactions(playerId, cards, gameState),
    processResponseToMyPlay: (playerId: number, cards: Card[], gameState: GameState) => uiHandlersRef.current.processResponseToMyPlay(playerId, cards, gameState)
  };
  
  const gameActionsHook = useGameActions(gameActionsConfig);
  
  // === ゲームフロー制御 ===
  const gameFlowHook = useGameFlow({
    gameState: gameStateHook.gameState,
    gamePhase: gameStateHook.gamePhase,
    finalMessagesSet: gameStateHook.finalMessagesSet,
    setGameState: gameStateHook.setGameState,
    setFinalMessagesSet: gameStateHook.setFinalMessagesSet,
    getNextActivePlayer: gameStateHook.getNextActivePlayer,
    clearAllTimers: timersHook.clearAllTimers,
    getAdjustedTime: gameStateHook.getAdjustedTime,
    initializeGame: gameStateHook.initializeGame,
    resetGame: gameStateHook.resetGame,
    passMessageTracker: timersHook.passMessageTracker,
    eightCutTimerRef: timersHook.eightCutTimerRef,
    aiProcessRef: timersHook.aiProcessRef
  });
  
  // === AI処理管理 ===
  // handleGameActionWithErrorHandlingは useAppIntegration で注入される
  const aiProcessingConfig = {
    gameState: gameStateHook.gameState,
    isPaused: gameStateHook.isPaused,
    gameStartDelay: gameStateHook.gameStartDelay,
    getAdjustedTime: gameStateHook.getAdjustedTime,
    setGameState: gameStateHook.setGameState,
    handleGameActionWithErrorHandling: gameActionsHook.handleGameAction, // 一時的に基本ハンドラーを使用
    passMessageTracker: timersHook.passMessageTracker,
    aiProcessRef: timersHook.aiProcessRef
  };
  
  const aiProcessingHook = useAIProcessing(aiProcessingConfig);
  
  // === 観戦コメント管理 ===
  const spectatorCommentsHook = useSpectatorComments({
    gameState: gameStateHook.gameState,
    isPaused: gameStateHook.isPaused,
    finalMessagesSet: gameStateHook.finalMessagesSet,
    getAdjustedTime: gameStateHook.getAdjustedTime,
    setGameState: gameStateHook.setGameState
  });

  return {
    // 状態管理
    ...gameStateHook,
    
    // タイマー管理
    ...timersHook,
    
    // ゲーム処理
    handleGameAction: gameActionsHook.handleGameAction,
    
    // フロー制御
    ...gameFlowHook,
    
    // AI処理
    ...aiProcessingHook,
    
    // 観戦コメント
    ...spectatorCommentsHook,
    
    // UIハンドラー注入
    updateUIHandlers,
    
    // 設定オブジェクト（依存注入用）
    _gameActionsConfig: gameActionsConfig,
    _aiProcessingConfig: aiProcessingConfig
  };
};