import React from 'react';
import { GamePhaseRenderer } from './components/GamePhaseRenderer';
import { useAppIntegration } from './hooks/useAppIntegration';
import { useAppFactory } from './hooks/useAppFactory';

/**
 * メインアプリケーションコンポーネント
 * 
 * 大富豪ゲームの統合制御を行う。
 * - 高レベルカスタムフックによる機能統合
 * - ファクトリーパターンによる設定管理
 * - 循環依存を解決した階層構造
 */
export default function App() {
  // === アプリケーション全体統合 ===
  const { gameCore, gameUI, integrationHandlers } = useAppIntegration();

  // === 設定オブジェクトファクトリー ===
  const appConfig = useAppFactory({
    gameConfig: {
      selectedCharacters: gameCore.selectedCharacters,
      gameSpeed: gameCore.gameSpeed,
      debugMode: gameCore.debugMode,
      isPaused: gameCore.isPaused,
      finalMessagesSet: gameCore.finalMessagesSet
    },
    coreHandlers: {
      handleGameAction: gameCore.handleGameAction,
      completeEightCut: gameCore.completeEightCut,
      emergencyRefresh: gameCore.emergencyRefresh,
      setupEightCutTimer: gameCore.setupEightCutTimer
    },
    uiHandlers: {
      handleGameActionWithErrorHandling: gameUI.handleGameActionWithErrorHandling,
      handleGameSetupComplete: gameUI.handleGameSetupComplete,
      handleSpeedChange: gameUI.handleSpeedChange,
      handlePauseToggle: integrationHandlers.handlePauseToggle,
      setReactionEmoji: gameUI.setReactionEmoji,
      processOtherPlayersReactions: gameUI.processOtherPlayersReactions,
      processSelfPlayReactions: gameUI.processSelfPlayReactions,
      processResponseToMyPlay: gameUI.processResponseToMyPlay
    },
    debugHandlers: {
      debugActions: gameUI.debugActions,
      handleDebugModeToggle: gameUI.handleDebugModeToggle,
      expressionTestMode: gameUI.expressionTestMode,
      setExpressionTestMode: gameUI.setExpressionTestMode
    },
    aiProcessRef: gameCore.aiProcessRef
  });

  // === レンダリング ===
  return (
    <GamePhaseRenderer
      gamePhase={gameCore.gamePhase}
      gameState={gameCore.gameState}
      config={appConfig.gameConfig}
      handlers={{ ...appConfig.coreHandlers, ...appConfig.uiHandlers }}
      debugHandlers={appConfig.debugHandlers}
      aiProcessInfo={appConfig.aiProcessInfo}
      resetGame={gameCore.resetGame}
      emergencyRefresh={gameCore.emergencyRefresh}
    />
  );
}