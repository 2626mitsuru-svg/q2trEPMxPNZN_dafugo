import { useCallback } from 'react';
import { Character, GameAction } from '../types/game';

interface UseEventHandlersProps {
  clearAllTimers: () => void;
  initializeGame: (characters: Character[]) => void;
  setGameSpeed: React.Dispatch<React.SetStateAction<number>>;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  handleGameAction: (action: GameAction) => void;
  emergencyRefresh: () => void;
  resetGame: () => void;
}

export const useEventHandlers = ({
  clearAllTimers,
  initializeGame,
  setGameSpeed,
  setIsPaused,
  handleGameAction,
  emergencyRefresh,
  resetGame
}: UseEventHandlersProps) => {

  // ゲームアクション処理のラッパー（エラーハンドリング付き）
  const handleGameActionWithErrorHandling = useCallback((action: GameAction) => {
    try {
      handleGameAction(action);
    } catch (error) {
      console.error('💥 Critical error in game action:', error);
      emergencyRefresh();
    }
  }, [handleGameAction, emergencyRefresh]);

  // ゲームセットアップ完了ハンドラー（CPU専用）
  const handleGameSetupComplete = useCallback((characters: Character[]) => {
    console.log('🎮 Setup complete, starting CPU-only game with new turn system');
    console.log('Selected characters:', characters.map(c => c.name));
    console.log('All players are CPU controlled');
    
    if (!characters || characters.length !== 4) {
      console.error('❌ Invalid characters array:', characters);
      return;
    }
    
    clearAllTimers();
    initializeGame(characters);
  }, [clearAllTimers, initializeGame]);

  // スピード変更ハンドラー
  const handleSpeedChange = useCallback((newSpeed: number) => {
    console.log(`⚡ Speed changing to ${newSpeed}x`);
    clearAllTimers();
    setGameSpeed(newSpeed);
  }, [clearAllTimers, setGameSpeed]);

  // ポーズ切り替えハンドラー
  const handlePauseToggle = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev;
      if (newPaused) clearAllTimers();
      return newPaused;
    });
  }, [setIsPaused, clearAllTimers]);

  return {
    handleGameActionWithErrorHandling,
    handleGameSetupComplete,
    handleSpeedChange,
    handlePauseToggle
  };
};