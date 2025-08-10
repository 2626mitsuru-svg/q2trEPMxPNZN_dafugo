import { useUIEffects } from './useUIEffects';
import { useEventHandlers } from './useEventHandlers';
import { useDebugActions } from './useDebugActions';
import { useExpressionAutoSwitch } from './useExpressionAutoSwitch';
import { UIIntegrationConfig } from '../types/hooks';

/**
 * ゲームUI機能の統合フック
 * 
 * UIエフェクト、イベントハンドラー、デバッグ機能を統合管理
 */
export const useGameUI = (config: UIIntegrationConfig) => {
  // === UI エフェクト管理 ===
  const uiEffectsHook = useUIEffects(
    config.setGameState, 
    config.getAdjustedTime, 
    config.isPaused
  );

  // === 表情自動切り替えシステム ===
  const expressionAutoSwitch = useExpressionAutoSwitch(
    config.gameState,
    config.setGameState,
    config.getAdjustedTime,
    config.isPaused
  );
  
  // === イベントハンドラー ===
  const eventHandlersHook = useEventHandlers({
    clearAllTimers: config.clearAllTimers,
    initializeGame: config.initializeGame,
    setGameSpeed: config.setGameSpeed,
    setIsPaused: config.setIsPaused,
    handleGameAction: config.handleGameAction,
    emergencyRefresh: config.emergencyRefresh,
    resetGame: config.resetGame
  });

  // === デバッグ機能管理 ===
  const debugActionsHook = useDebugActions({
    gameState: config.gameState,
    setGameState: config.setGameState,
    setDebugMode: config.setDebugMode,
    debugMode: config.debugMode,
    emergencyRefresh: config.emergencyRefresh,
    handlePauseToggle: config.handlePauseToggle
  });

  return {
    // UI エフェクト
    ...uiEffectsHook,
    
    // イベントハンドラー
    ...eventHandlersHook,
    
    // デバッグ機能
    ...debugActionsHook,
    
    // 表情自動切り替え
    ...expressionAutoSwitch
  };
};