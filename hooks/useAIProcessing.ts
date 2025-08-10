import { useCallback, useRef } from 'react';
import { GameState, GameAction, PlayerType } from '../types/game';
import { getAIAction, getAIMessage } from '../utils/aiLogic';
import { cardToString } from '../utils/gameLogic';

interface UseAIProcessingProps {
  gameState: GameState | null;
  isPaused: boolean;
  gameStartDelay: boolean;
  getAdjustedTime: (baseTime: number) => number;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  handleGameActionWithErrorHandling: (action: GameAction) => void;
  passMessageTracker: React.MutableRefObject<Record<number, { passMessageShown: boolean }>>;
  aiProcessRef: React.MutableRefObject<{
    isProcessing: boolean;
    processCount: number;
    lastActivityTime: number;
    currentTimeoutId: NodeJS.Timeout | null;
  }>;
}

export const useAIProcessing = ({
  gameState,
  isPaused,
  gameStartDelay,
  getAdjustedTime,
  setGameState,
  handleGameActionWithErrorHandling,
  passMessageTracker,
  aiProcessRef
}: UseAIProcessingProps) => {
  
  const processAITurn = useCallback(() => {
    if (!gameState || gameState.gamePhase !== 'playing' || isPaused || gameStartDelay) {
      console.log(`🤖 AI processing skipped: gameState=${!!gameState}, phase=${gameState?.gamePhase}, paused=${isPaused}, gameStartDelay=${gameStartDelay}`);
      return;
    }

    if (gameState.eightCutState?.isActive) {
      console.log('🤖 AI processing skipped: eight cut is active');
      return;
    }

    const currentPlayer = gameState.players[gameState.turn];
    if (currentPlayer.isHuman || currentPlayer.hand.length === 0 || currentPlayer.isFoulFinished) {
      console.log(`🤖 AI processing skipped: isHuman=${currentPlayer.isHuman}, handLength=${currentPlayer.hand.length}, isFoul=${currentPlayer.isFoulFinished}`);
      return;
    }
    
    if (aiProcessRef.current.isProcessing) {
      console.log(`🤖 AI processing skipped: already processing`);
      return;
    }

    console.log(`🤖 AI processing turn for ${currentPlayer.character.name}, fieldSet: ${gameState.fieldSet ? 'exists' : 'null'}`);

    aiProcessRef.current.isProcessing = true;
    aiProcessRef.current.lastActivityTime = Date.now();
    aiProcessRef.current.processCount++;

    // 思考中メッセージ
    const passInfo = passMessageTracker.current[currentPlayer.id];
    const shouldShowThinking = !passInfo?.passMessageShown;
    
    if (shouldShowThinking) {
      setGameState(prev => {
        if (!prev || prev.turn !== currentPlayer.id) return prev;
        const newState = { ...prev };
        newState.players[newState.turn].message = '…';
        newState.players[newState.turn].messageType = 'normal';
        return newState;
      });
    }

    const thinkingTime = getAdjustedTime(800 + Math.random() * 600);
    
    aiProcessRef.current.currentTimeoutId = setTimeout(() => {
      if (!aiProcessRef.current.isProcessing) return;

      try {
        const aiAction = getAIAction(currentPlayer, gameState);
        
        // fieldSet=nullの場合はパスを強制的にplayに変換（新しい場ではパス禁止）
        if (aiAction.type === 'pass' && gameState.fieldSet === null) {
          console.log(`🚫 AI tried to pass on null fieldSet (new field), forcing play action`);
          // 手札から最も弱いカードを選択
          const sortedHand = [...currentPlayer.hand].sort((a, b) => {
            if (gameState.isRevolution) {
              return a.value - b.value; // 革命時は数字の小さいカードが強い
            } else {
              return b.value - a.value; // 通常時は数字の大きいカードが強い
            }
          });
          const weakestCard = sortedHand[sortedHand.length - 1]; // 最も弱いカード
          
          if (weakestCard) {
            aiAction.type = 'play';
            aiAction.cards = [weakestCard];
            aiAction.playType = 'single';
            console.log(`🚫 Forced AI to play weakest card: ${cardToString(weakestCard)} (revolution: ${gameState.isRevolution})`);
          }
        }
        
        if (aiAction.type !== 'pass') {
          const message = getAIMessage(currentPlayer, aiAction, gameState);
          setGameState(prev => {
            if (!prev || prev.turn !== currentPlayer.id) return prev;
            const newState = { ...prev };
            newState.players[newState.turn].message = message;
            newState.players[newState.turn].messageType = 'action';
            return newState;
          });
        }

        const executeTime = getAdjustedTime(700);
        aiProcessRef.current.currentTimeoutId = setTimeout(() => {
          if (!aiProcessRef.current.isProcessing) return;
          
          try {
            handleGameActionWithErrorHandling(aiAction);
          } catch (error) {
            console.error('💥 AI action execution error:', error);
            if (gameState.fieldSet !== null) {
              handleGameActionWithErrorHandling({ type: 'pass', cards: [], playType: 'pass' });
            }
          } finally {
            aiProcessRef.current.isProcessing = false;
            aiProcessRef.current.currentTimeoutId = null;
            aiProcessRef.current.lastActivityTime = Date.now();
          }
        }, executeTime);

      } catch (error) {
        console.error('💥 AI logic error:', error);
        if (gameState.fieldSet !== null) {
          handleGameActionWithErrorHandling({ type: 'pass', cards: [], playType: 'pass' });
        }
        aiProcessRef.current.isProcessing = false;
        aiProcessRef.current.currentTimeoutId = null;
      }
    }, thinkingTime);
  }, [gameState, getAdjustedTime, handleGameActionWithErrorHandling, isPaused, gameStartDelay, aiProcessRef, setGameState, passMessageTracker]);

  return {
    processAITurn
  };
};