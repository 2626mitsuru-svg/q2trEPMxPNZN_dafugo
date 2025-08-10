import React from 'react';
import { GameSetup } from './GameSetup';
import { GameBoard } from './GameBoard';
import { GameLoading } from './GameLoading';
import { GameError } from './GameError';
import { GamePhaseProps } from '../types/app';

interface GamePhaseRendererProps extends GamePhaseProps {
  gamePhase: string;
  resetGame: () => void;
  emergencyRefresh: () => void;
}

export const GamePhaseRenderer: React.FC<GamePhaseRendererProps> = ({
  gamePhase,
  gameState,
  config,
  handlers,
  debugHandlers,
  aiProcessInfo,
  resetGame,
  emergencyRefresh
}) => {
  console.log(`🎮 Current game phase: ${gamePhase}, gameState phase: ${gameState?.gamePhase}`);
  console.log(`🎯 Selected characters count: ${config.selectedCharacters.length}, human index: ${config.humanPlayerIndex}`);
  
  switch (gamePhase) {
    case 'setup':
      return <GameSetup onStartGame={handlers.handleGameSetupComplete} />;
    
    case 'playing':
      if (!gameState) {
        return (
          <GameLoading 
            selectedCharacters={config.selectedCharacters}
            humanPlayerIndex={config.humanPlayerIndex}
          />
        );
      }
      return (
        <GameBoard
          gameState={gameState}
          onGameAction={handlers.handleGameActionWithErrorHandling}
          onBackToSetup={resetGame}
          gameSpeed={config.gameSpeed}
          onSpeedChange={handlers.handleSpeedChange}
          onEmergencyRefresh={emergencyRefresh}
          debugMode={config.debugMode}
          onDebugModeToggle={debugHandlers.handleDebugModeToggle}
          debugActions={debugHandlers.debugActions}
          isPaused={config.isPaused}
          aiProcessInfo={aiProcessInfo}
          expressionTestMode={debugHandlers.expressionTestMode}
          setExpressionTestMode={debugHandlers.setExpressionTestMode}
        />
      );

    default:
      return <GameError gamePhase={gamePhase} />;
  }
};