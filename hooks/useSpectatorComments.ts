import { useCallback, useEffect } from 'react';
import { GameState } from '../types/game';

interface UseSpectatorCommentsProps {
  gameState: GameState | null;
  isPaused: boolean;
  finalMessagesSet: boolean;
  getAdjustedTime: (baseTime: number) => number;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
}

export const useSpectatorComments = ({
  gameState,
  isPaused,
  finalMessagesSet,
  getAdjustedTime,
  setGameState
}: UseSpectatorCommentsProps) => {

  // 🎯 観戦コメント処理（修正版：詳細ログとエラーハンドリング強化）
  const processSpectatorComments = useCallback(() => {
    console.log('💬 Processing spectator comments...');
    
    // ゲーム状態チェック
    if (!gameState) {
      console.log('💬 ❌ No gameState');
      return;
    }
    
    if (gameState.gamePhase !== 'playing') {
      console.log(`💬 ❌ Game phase is ${gameState.gamePhase}, not playing`);
      return;
    }
    
    if (finalMessagesSet) {
      console.log('💬 ❌ Final messages already set');
      return;
    }
    
    if (isPaused) {
      console.log('💬 ❌ Game is paused');
      return;
    }

    // 上がったプレイヤーを取得（反則上がりも含む）
    const finishedPlayers = gameState.players.filter(player => {
      const isFinished = player.hand.length === 0;
      const isInFinishOrder = gameState.finishOrder.includes(player.id);
      console.log(`💬 Player ${player.character.name}: hand=${player.hand.length}, inFinishOrder=${isInFinishOrder}, isFoul=${player.isFoulFinished}`);
      return isFinished && isInFinishOrder;
    });

    console.log(`💬 Found ${finishedPlayers.length} finished players:`, finishedPlayers.map(p => p.character.name));

    if (finishedPlayers.length === 0) {
      console.log('💬 ❌ No finished players found');
      return;
    }

    // ランダムに選択
    const randomFinishedPlayer = finishedPlayers[Math.floor(Math.random() * finishedPlayers.length)];
    console.log(`💬 Selected player for spectator comment: ${randomFinishedPlayer.character.name}`);
    
    try {
      // 🎯 新しい観戦コメントシステムを使用（手札状況を考慮）
      const { getSpectatorComment, getFewCardsOwnMessage, getFewCardsOtherMessage } = require('../utils/messageManager');
      
      let spectatorMessage = '';
      
      // 手札枚数を考慮したメッセージ選択
      const activePlayers = gameState.players.filter(p => p.hand.length > 0 && !p.isFoulFinished);
      const hasPlayersWithFewCards = activePlayers.some(p => p.hand.length <= 3);
      
      // ランダムでメッセージタイプを選択
      const messageType = Math.random();
      
      if (hasPlayersWithFewCards && messageType < 0.4) {
        // 40%の確率で手札少ない系のコメント
        spectatorMessage = getFewCardsOtherMessage(randomFinishedPlayer);
        console.log(`💬 Using fewCardsOther message for spectator ${randomFinishedPlayer.character.name}`);
      } else {
        // 通常の観戦コメント
        spectatorMessage = getSpectatorComment(randomFinishedPlayer, gameState);
        console.log(`💬 Using normal spectator comment for ${randomFinishedPlayer.character.name}`);
      }
      
      console.log(`💬 Generated spectator message: "${spectatorMessage}"`);
      
      if (!spectatorMessage || spectatorMessage.trim() === '') {
        console.log('💬 ⚠️ Empty spectator message generated, skipping');
        return;
      }
      
      // 上がったプレイヤーに観戦コメントを設定
      setGameState(prevState => {
        if (!prevState) {
          console.log('💬 ❌ No prevState in setGameState');
          return prevState;
        }
        
        const newState = { ...prevState };
        const updatedPlayers = [...newState.players];
        
        // 上がったプレイヤーのメッセージを更新
        const playerIndex = updatedPlayers.findIndex(p => p.id === randomFinishedPlayer.id);
        if (playerIndex >= 0) {
          const currentPlayer = updatedPlayers[playerIndex];
          const currentMessage = currentPlayer.message;
          const currentMessageType = currentPlayer.messageType;
          
          // 🎯 上がった瞬間の「大富豪！」などの特別メッセージ（messageType='special'）は保護
          if (currentMessageType === 'special') {
            // 上がった瞬間のメッセージから十分時間が経った場合のみ観戦コメントに切り替え
            const now = Date.now();
            const lastActionTime = currentPlayer.lastAction?.timestamp || 0;
            const timeSinceFinish = now - lastActionTime;
            
            if (timeSinceFinish < 4000) { // 4秒間は上がりメッセージを保護
              console.log(`💬 🛡️ Protecting finish message for ${randomFinishedPlayer.character.name} (${timeSinceFinish}ms elapsed)`);
              return prevState;
            }
          }
          
          // 現在のメッセージをチェック（同じメッセージの場合はスキップ）
          if (currentMessage === spectatorMessage) {
            console.log(`💬 ⚠️ Same message "${spectatorMessage}" for ${randomFinishedPlayer.character.name}, skipping`);
            return prevState;
          }
          
          // 観戦コメントに更新
          updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            message: spectatorMessage,
            messageType: 'normal' // 観戦コメントは通常メッセージ
          };
          
          console.log(`💬 ✅ Set spectator comment for ${randomFinishedPlayer.character.name}: "${spectatorMessage}"`);
          
          newState.players = updatedPlayers;
          return newState;
        } else {
          console.log(`💬 ❌ Player index not found for ${randomFinishedPlayer.character.name}`);
          return prevState;
        }
      });

      console.log(`💬 ✅ Spectator comment processing completed: ${randomFinishedPlayer.character.name} - "${spectatorMessage}"`);
      
    } catch (error) {
      console.error('💬 ❌ Error in processSpectatorComments:', error);
    }
  }, [gameState, finalMessagesSet, isPaused, setGameState]);

  // 🎯 観戦コメント定期実行タイマー（3秒間隔・デバッグログ強化）
  useEffect(() => {
    console.log(`💬 Setting up spectator timer: gamePhase=${gameState?.gamePhase}, finishOrder=${gameState?.finishOrder.length}, isPaused=${isPaused}`);
    
    if (gameState?.gamePhase === 'playing' && gameState.finishOrder.length > 0 && !isPaused) {
      console.log('💬 ✅ Starting spectator comment timer (3-second interval)');
      
      const spectatorTimer = setInterval(() => {
        console.log('💬 🔄 Spectator timer tick...');
        processSpectatorComments();
      }, getAdjustedTime(3000)); // 3秒間隔に短縮
      
      return () => {
        console.log('💬 🛑 Clearing spectator timer');
        clearInterval(spectatorTimer);
      };
    } else {
      console.log('💬 ❌ Spectator timer not started');
    }
  }, [gameState?.gamePhase, gameState?.finishOrder.length, isPaused, processSpectatorComments, getAdjustedTime]);

  return {
    processSpectatorComments
  };
};