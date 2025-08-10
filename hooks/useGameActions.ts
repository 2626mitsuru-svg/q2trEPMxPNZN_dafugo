import { useCallback } from 'react';
import { GameState, GameAction, Card } from '../types/game';
import { processGameAction } from '../utils/gameActionHandlers';
import { executeAllReactions, triggerRevolutionReaction, triggerEightCutReaction } from '../utils/reactionManager';
import { updateAIExpression } from '../utils/aiLogic';

export interface GameActionsConfig {
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  passMessageTracker: React.MutableRefObject<any>;
  getAdjustedTime: (time: number) => number;
  getNextActivePlayer: (currentTurn: number, active: number[], passFlags: { [id: number]: boolean }) => number;
  handlePlayerFinish: (playerId: number, gameState: GameState) => GameState;
  
  // リアクション関数群
  setReactionEmoji: (playerId: number, emoji: string, duration?: number) => void;
  processSelfPlayReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processOtherPlayersReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processResponseToMyPlay: (playerId: number, cards: Card[], gameState: GameState) => void;
}

export const useGameActions = (config: GameActionsConfig) => {
  // メインのゲームアクション処理
  const handleGameAction = useCallback((action: GameAction) => {
    console.log(`🎮 Handling game action: ${action.type}`);

    try {
      config.setGameState(prevState => {
        if (!prevState) return prevState;

        console.log(`🎯 Current turn: ${prevState.turn} (${prevState.players[prevState.turn].character.name}), active: [${prevState.active.join(',')}]`);
        
        // アクション処理実行
        const actionHandlerConfig = {
          passMessageTracker: config.passMessageTracker,
          getNextActivePlayer: config.getNextActivePlayer,
          handlePlayerFinish: config.handlePlayerFinish
        };
        
        const { updates, actionMeta } = processGameAction(action, prevState, actionHandlerConfig);
        
        // パス禁止の場合は状態を変更せずreturn
        if (actionMeta.passRejected) {
          return prevState;
        }
        
        const newState = { ...prevState, ...updates };
        
        // リアクション処理（非同期）- 上がり時は除外
        if (action.type === 'play') {
          const currentPlayer = prevState.players[prevState.turn];
          
          // 上がり時チェック：手札がなくなったかどうか
          const handAfterPlay = currentPlayer.hand.length - action.cards.length;
          const isFinishing = handAfterPlay === 0;
          
          if (!isFinishing) {
            const reactionConfig = {
              setReactionEmoji: config.setReactionEmoji,
              processSelfPlayReactions: config.processSelfPlayReactions,
              processOtherPlayersReactions: config.processOtherPlayersReactions,
              processResponseToMyPlay: config.processResponseToMyPlay,
              getAdjustedTime: config.getAdjustedTime
            };
            
            // 特殊ルールのリアクション
            if (actionMeta.updatedState?.isRevolution !== undefined) {
              triggerRevolutionReaction(currentPlayer.id, reactionConfig);
            } else if (actionMeta.isEightCut) {
              triggerEightCutReaction(currentPlayer.id, reactionConfig);
            }
            
            // 統合リアクション処理
            executeAllReactions(
              currentPlayer.id,
              action.cards,
              newState,
              reactionConfig,
              actionMeta.needsReaction || false
            );
          } else {
            console.log(`🏁 Skipping reactions for ${currentPlayer.character.name}: player is finishing game`);
          }
        }
        
        return newState;
      });
    } catch (error) {
      console.error('💥 Critical error in handleGameAction:', error);
      // エラー時の処理は呼び出し元に委ねる
      throw error;
    }
  }, [config]);

  return {
    handleGameAction
  };
};