import { useCallback, useEffect } from 'react';
import { GameState, Character } from '../types/game';
import { executeFieldFlow } from '../utils/specialRules';
import { setFinalGameMessages } from '../utils/messageManager';

interface UseGameFlowProps {
  gameState: GameState | null;
  gamePhase: string;
  finalMessagesSet: boolean;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setFinalMessagesSet: React.Dispatch<React.SetStateAction<boolean>>;
  getNextActivePlayer: (currentId: number, active: number[], passFlags: Record<number, boolean>) => number;
  clearAllTimers: () => void;
  getAdjustedTime: (baseTime: number) => number;
  initializeGame: (characters: Character[], humanIndex: number) => void;
  resetGame: () => void;
  passMessageTracker: React.MutableRefObject<Record<number, { passMessageShown: boolean }>>;
  eightCutTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  aiProcessRef: React.MutableRefObject<{
    isProcessing: boolean;
    processCount: number;
    lastActivityTime: number;
    currentTimeoutId: NodeJS.Timeout | null;
  }>;
}

export const useGameFlow = ({
  gameState,
  gamePhase,
  finalMessagesSet,
  setGameState,
  setFinalMessagesSet,
  getNextActivePlayer,
  clearAllTimers,
  getAdjustedTime,
  initializeGame,
  resetGame,
  passMessageTracker,
  eightCutTimerRef,
  aiProcessRef
}: UseGameFlowProps) => {

  // 八切り演出の完了処理
  const completeEightCut = useCallback(() => {
    console.log('🎴 Starting eight cut completion process...');
    
    if (eightCutTimerRef.current) {
      console.log('🎴 Clearing eight cut timer');
      clearTimeout(eightCutTimerRef.current);
      eightCutTimerRef.current = null;
    }
    
    setGameState(prevState => {
      if (!prevState) {
        console.log('🎴 ❌ No prevState in completeEightCut');
        return prevState;
      }
      
      if (!prevState.eightCutState) {
        console.log('🎴 ❌ No eightCutState in completeEightCut');
        return prevState;
      }
      
      console.log('🎴 Processing eight cut completion...');
      const newState = { ...prevState };
      const eightCutPlayerId = newState.eightCutState.playerId;
      
      console.log(`🎴 Eight cut player: ${eightCutPlayerId} (${newState.players[eightCutPlayerId]?.character.name})`);
      
      // 場を流す処理（分離された関数を使用、セリフ付き）
      const { getFieldClearMessage, getFieldClearOtherMessage } = require('../utils/messageManager');
      console.log('🎴 Executing field flow...');
      const flowUpdates = executeFieldFlow(newState, passMessageTracker, getFieldClearMessage, getFieldClearOtherMessage);
      Object.assign(newState, flowUpdates);
      
      console.log(`🎴 Field flowed: fieldSet=${newState.fieldSet}, active players: [${newState.active.join(',')}]`);
      
      // ８を出したプレイヤーから再開
      const eightCutPlayer = newState.players[eightCutPlayerId];
      if (eightCutPlayer && eightCutPlayer.hand.length > 0 && !eightCutPlayer.isFoulFinished) {
        newState.turn = eightCutPlayerId;
        newState.lastPlayer = eightCutPlayerId;
        console.log(`🎴 Continuing with eight cut player: ${eightCutPlayerId}`);
      } else {
        // 8切りプレイヤーが上がっている場合は次のアクティブプレイヤー
        const nextPlayer = getNextActivePlayer(eightCutPlayerId, newState.active, newState.passFlags);
        newState.turn = nextPlayer;
        newState.lastPlayer = eightCutPlayerId;
        console.log(`🎴 Eight cut player finished, next player: ${nextPlayer}`);
      }
      
      // 互換性維持
      newState.currentPlayer = newState.turn;
      newState.lastCardPlayerId = newState.lastPlayer || newState.turn;
      
      // 八切り状態をクリア
      newState.eightCutState = undefined;
      
      // AI処理状態をリセット
      aiProcessRef.current.isProcessing = false;
      aiProcessRef.current.lastActivityTime = Date.now();
      
      console.log(`🎴 ✅ Eight cut completed successfully!`);
      console.log(`🎴 Current turn: ${newState.turn} (${newState.players[newState.turn]?.character.name})`);
      console.log(`🎴 Field state: ${newState.fieldSet ? 'has cards' : 'empty (new field)'}`);
      
      return newState;
    });
  }, [setGameState, eightCutTimerRef, passMessageTracker, getNextActivePlayer, aiProcessRef]);

  // 緊急リフレッシュ機能
  const emergencyRefresh = useCallback(() => {
    console.log('🚨 Emergency refresh triggered!');
    clearAllTimers();
    
    setGameState(prevState => {
      if (!prevState || prevState.gamePhase !== 'playing') return prevState;
      
      const newState = { ...prevState };
      const nextPlayer = getNextActivePlayer(newState.turn, newState.active, newState.passFlags);
      newState.turn = nextPlayer;
      newState.currentPlayer = nextPlayer;
      
      newState.players.forEach(player => {
        player.message = '';
        player.messageType = 'normal';
      });
      
      newState.eightCutState = undefined;
      
      return newState;
    });
  }, [clearAllTimers, setGameState, getNextActivePlayer]);

  // 8切りタイマー設定（分離された処理用）
  const setupEightCutTimer = useCallback(() => {
    console.log('🎴 Setting up eight cut timer...');
    if (eightCutTimerRef.current) {
      clearTimeout(eightCutTimerRef.current);
      eightCutTimerRef.current = null;
    }
    
    // AI処理を停止
    aiProcessRef.current.isProcessing = false;
    if (aiProcessRef.current.currentTimeoutId) {
      clearTimeout(aiProcessRef.current.currentTimeoutId);
      aiProcessRef.current.currentTimeoutId = null;
    }
    
    // 八切りタイマーを設定（500ms後に完了処理実行）
    eightCutTimerRef.current = setTimeout(() => {
      console.log('🎴 Eight cut timer executed, calling completeEightCut');
      completeEightCut();
    }, getAdjustedTime(500));
    
    console.log('🎴 Eight cut timer set for 500ms');
  }, [completeEightCut, getAdjustedTime, aiProcessRef, eightCutTimerRef]);

  // ゲーム終了時の最終メッセージ設定
  useEffect(() => {
    if (gameState?.gamePhase === 'finished' && gameState.finishOrder.length === 4 && !finalMessagesSet) {
      console.log(`🏁 Game finished with all 4 players ranked in finishOrder`);
      clearAllTimers();
      const timer = setTimeout(() => {
        if (gameState) {
          console.log('🎭 Setting final game messages with expressions...');
          setFinalGameMessages(gameState, setGameState, setFinalMessagesSet);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [gameState?.gamePhase, gameState?.finishOrder.length, finalMessagesSet, clearAllTimers, setGameState, setFinalMessagesSet, gameState]);

  // ゲーム完了時のタイマークリア
  useEffect(() => {
    if (gameState?.finishOrder.length === 4) {
      clearAllTimers();
    }
  }, [gameState?.finishOrder.length, clearAllTimers]);

  return {
    completeEightCut,
    emergencyRefresh,
    setupEightCutTimer
  };
};