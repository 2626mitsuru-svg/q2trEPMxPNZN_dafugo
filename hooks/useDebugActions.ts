import { useCallback, useState } from 'react';
import { GameState } from '../types/game';
import { ExpressionType } from '../components/ExpressionImage';

interface UseDebugActionsProps {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
  debugMode: boolean;
  emergencyRefresh: () => void;
  handlePauseToggle: () => void;
}

export const useDebugActions = ({
  gameState,
  setGameState,
  setDebugMode,
  debugMode,
  emergencyRefresh,
  handlePauseToggle
}: UseDebugActionsProps) => {

  // 表情確認モード用の状態
  const [expressionTestMode, setExpressionTestMode] = useState(false);

  // デバッグ機能群
  const debugActions = {
    forceNextTurn: () => emergencyRefresh(),
    
    toggleRevolution: () => {
      if (!gameState) return;
      setGameState(prev => prev ? { ...prev, isRevolution: !prev.isRevolution } : prev);
    },
    
    toggleSuitLock: () => {
      if (!gameState) return;
      setGameState(prev => prev ? { 
        ...prev, 
        suitLock: prev.suitLock ? null : 'spades' 
      } : prev);
    },
    
    clearField: () => {
      if (!gameState) return;
      setGameState(prev => {
        if (!prev) return prev;
        const newState = {
          ...prev,
          fieldSet: null,
          field: [],
          lastPlayType: null,
          lastPlayCount: 0,
          suitLock: null,
          turnsPassed: 0,
          eightCutState: undefined
        };
        // passFlags リセット
        Object.keys(newState.passFlags).forEach(id => {
          newState.passFlags[parseInt(id)] = false;
        });
        newState.players.forEach(player => {
          player.lastAction = undefined;
        });
        return newState;
      });
    },
    
    togglePause: handlePauseToggle,

    // 表情確認機能
    toggleExpressionTestMode: () => {
      setExpressionTestMode(!expressionTestMode);
    },

    setAllPlayersExpression: (expression: ExpressionType) => {
      console.log('useDebugActions: setAllPlayersExpression called with:', expression);
      if (!gameState) {
        console.log('useDebugActions: No gameState, returning');
        return;
      }
      setGameState(prev => {
        if (!prev) {
          console.log('useDebugActions: No prev state, returning');
          return prev;
        }
        console.log('useDebugActions: Updating expressions for all players');
        const newState = { ...prev };
        // 全プレイヤーの表情を指定された表情に設定
        newState.players = newState.players.map((player, index) => {
          console.log(`useDebugActions: Setting currentExpression for player ${index} (${player.character.name}) from "${player.currentExpression || 'undefined'}" to "${expression}"`);
          const updatedPlayer = {
            ...player,
            currentExpression: expression
          };
          console.log(`useDebugActions: Player ${index} updated:`, {
            name: updatedPlayer.character.name,
            currentExpression: updatedPlayer.currentExpression,
            originalExpression: updatedPlayer.expression
          });
          return updatedPlayer;
        });
        console.log('useDebugActions: Expression update complete, new state:', {
          playerExpressions: newState.players.map(p => ({
            name: p.character.name,
            currentExpression: p.currentExpression,
            originalExpression: p.expression
          }))
        });
        return newState;
      });
    }
  };

  const handleDebugModeToggle = useCallback(() => {
    setDebugMode(!debugMode);
  }, [setDebugMode, debugMode]);

  return {
    debugActions,
    handleDebugModeToggle,
    expressionTestMode,
    setExpressionTestMode
  };
};