import { useCallback } from 'react';
import { Player, GameState, Card } from '../types/game';
import { updateAIExpression, getReactionMessage } from '../utils/aiLogic';
import { check8Cut, checkRevolution, hasSpadeThree, canWinWith } from '../utils/gameLogic';


export const useUIEffects = (
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  getAdjustedTime: (time: number) => number,
  isPaused: boolean
) => {
  // 反応絵文字の設定と自動クリア
  const setReactionEmoji = useCallback((playerId: number, emoji: string, duration: number = 4000) => {
    setGameState(prevState => {
      if (!prevState) return prevState;
      
      const newState = { ...prevState };
      const playerIndex = newState.players.findIndex(p => p.id === playerId);
      
      if (playerIndex >= 0) {
        newState.players[playerIndex].reactionEmoji = emoji;
        console.log(`😊 Set reaction emoji for ${newState.players[playerIndex].character.name}: ${emoji}`);
        
        setTimeout(() => {
          setGameState(laterState => {
            if (!laterState) return laterState;
            const finalState = { ...laterState };
            const finalPlayerIndex = finalState.players.findIndex(p => p.id === playerId);
            if (finalPlayerIndex >= 0 && finalState.players[finalPlayerIndex].reactionEmoji === emoji) {
              finalState.players[finalPlayerIndex].reactionEmoji = undefined;
              console.log(`😐 Cleared reaction emoji for ${finalState.players[finalPlayerIndex].character.name}`);
            }
            return finalState;
          });
        }, getAdjustedTime(duration));
      }
      
      return newState;
    });
  }, [setGameState, getAdjustedTime]);

  // 表情を一定時間後にnormalに戻す共通関数
  const resetExpressionToNormal = useCallback((playerId: number, delay: number = 3000) => {
    setTimeout(() => {
      setGameState(laterState => {
        if (!laterState) return laterState;
        const finalState = { ...laterState };
        const playerIndex = finalState.players.findIndex(p => p.id === playerId);
        if (playerIndex >= 0 && !finalState.players[playerIndex].isHuman) {
          finalState.players[playerIndex].expression = 'normal';
          console.log(`🎭 Reset expression to normal for ${finalState.players[playerIndex].character.name}`);
        }
        return finalState;
      });
    }, getAdjustedTime(delay));
  }, [setGameState, getAdjustedTime]);

  // 1. 自分が強いカードを出した時のリアクション
  const processSelfPlayReactions = useCallback((
    currentPlayerId: number,
    cards: Card[],
    currentGameState: GameState
  ) => {
    if (isPaused) return;

    console.log(`💪 Processing self play reactions for player ${currentPlayerId}`);

    setGameState(prevState => {
      if (!prevState) return prevState;
      
      const newState = { ...prevState };
      const playerIndex = newState.players.findIndex(p => p.id === currentPlayerId);
      
      if (playerIndex >= 0) {
        const player = newState.players[playerIndex];
        let reactionMessage = '';
        let reactionExpression: any = 'normal';
        let emojiType = '';
        let duration = 3000;

        // カードを出した後の手札枚数を計算
        const handAfterPlay = player.hand.length - cards.length;
        
        console.log(`🃏 Player ${player.character.name}: current hand=${player.hand.length}, playing=${cards.length}, after=${handAfterPlay}`);

        // 8切り成功
        if (check8Cut(cards)) {
          reactionMessage = getReactionMessage(player, 'selfEightCut');
          reactionExpression = 'confident';
          emojiType = '🎵';
          duration = 4000;
        }
        // 革命成立
        else if (checkRevolution(cards)) {
          reactionMessage = getReactionMessage(player, 'selfRevolution');
          reactionExpression = 'confident';
          emojiType = '💥';
          duration = 4000;
        }
        // 手札残り1枚（上がる時：最後のカード）- ただし、正式な上がりメッセージがある場合は優先
        else if (handAfterPlay === 0) {
          // 既に適切な上がりメッセージが設定されている場合はスキップ
          if (player.message && (player.message.includes('大富豪') || player.message.includes('上がり') || player.messageType === 'special')) {
            console.log(`🏁 Player ${player.character.name} already has finish message: "${player.message}" - skipping selfLastOne reaction`);
            return; // 早期退出して上がりメッセージを保護
          }
          
          reactionMessage = getReactionMessage(player, 'selfLastOne');
          reactionExpression = 'excited';
          emojiType = '🔥';
          duration = 4000;
          console.log(`🔥 Player ${player.character.name} saying final card message!`);
        }
        // 強カード単騎（2・A・Joker）
        else if (cards.length === 1 && (cards[0].rank === 2 || cards[0].rank === 1 || cards[0].rank === 14)) {
          reactionMessage = getReactionMessage(player, 'selfStrongSingle');
          reactionExpression = Math.random() < 0.5 ? 'confident' : 'excited';
          emojiType = '⚡';
          duration = 3500;
        }
        // スペードの3
        else if (cards.length === 1 && cards[0].suit === 'spades' && cards[0].rank === 3) {
          reactionMessage = getReactionMessage(player, 'selfSpadeThree');
          reactionExpression = 'excited';
          emojiType = '✨';
          duration = 3500;
        }
        // 反則負けリスクのある弱い手札を出してしまった（手札残り少ない時に弱いカード、ただし上がり時は除外）
        else if (handAfterPlay > 0 && handAfterPlay <= 2 && cards.length === 1 && 
                 cards[0].rank >= 3 && cards[0].rank <= 10 && 
                 cards[0].rank !== 8) {
          reactionMessage = getReactionMessage(player, 'selfPlayFail');
          reactionExpression = 'frustrated';
          emojiType = '💦';
          duration = 3000;
        }
        // 通常のプレイ後にthinkingを時々挟む（中程度の手札の時）
        else if (handAfterPlay >= 4 && handAfterPlay <= 8 && Math.random() < 0.25) {
          reactionMessage = getReactionMessage(player, 'normalPlay');
          reactionExpression = 'thinking';
          emojiType = '';
          duration = 2500;
          console.log(`🎭 Self: ${player.character.name} thinking after normal play`);
        }

        // リアクションがある場合のみ適用（上がりメッセージを保護）
        if (reactionMessage) {
          if (!player.isHuman) {
            // 重要な上がりメッセージが既に設定されている場合は上書きしない
            const hasFinishMessage = player.messageType === 'special' && 
              (player.message.includes('大富豪') || player.message.includes('上がり') || 
               player.message.includes('富豪') || player.message.includes('反則'));
            
            if (!hasFinishMessage) {
              player.message = reactionMessage;
              player.messageType = 'special';
              player.expression = reactionExpression;
              console.log(`💪 Self reaction for ${player.character.name}: ${reactionMessage} (${reactionExpression})`);
              
              // 絵文字追加
              if (emojiType) {
                setTimeout(() => setReactionEmoji(currentPlayerId, emojiType, duration), 300);
              }

              // 表情リセット
              resetExpressionToNormal(currentPlayerId, duration);
            } else {
              console.log(`🏁 Protected finish message for ${player.character.name}: "${player.message}" - skipping reaction message`);
            }
          }
        }
      }
      
      return newState;
    });
  }, [setGameState, getReactionMessage, setReactionEmoji, resetExpressionToNormal, isPaused]);

  // 2. 自分の場に他人がアクションした時のリアクション
  const processResponseToMyPlay = useCallback((
    responsePlayerId: number,
    responseCards: Card[],
    currentGameState: GameState
  ) => {
    if (isPaused) return;

    // 直前のプレイヤーを特定（前のターンの人）
    const activePlayers = currentGameState.players.filter(p => p.hand.length > 0 && !p.isFoulFinished);
    let previousPlayerId = -1;

    // 現在のプレイヤーから逆順で直前のプレイヤーを探す
    const currentPlayerIndex = activePlayers.findIndex(p => p.id === responsePlayerId);
    if (currentPlayerIndex > 0) {
      previousPlayerId = activePlayers[currentPlayerIndex - 1].id;
    } else if (currentPlayerIndex === 0 && activePlayers.length > 1) {
      previousPlayerId = activePlayers[activePlayers.length - 1].id;
    }

    if (previousPlayerId === -1) return;

    console.log(`🔄 Processing response reaction: ${responsePlayerId} responded to ${previousPlayerId}`);

    const delay = getAdjustedTime(1200); // 少し遅らせて反応

    setTimeout(() => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        
        const newState = { ...prevState };
        const previousPlayerIndex = newState.players.findIndex(p => p.id === previousPlayerId);
        
        if (previousPlayerIndex >= 0) {
          const previousPlayer = newState.players[previousPlayerIndex];
          
          if (!previousPlayer.isHuman && previousPlayer.hand.length > 0 && !previousPlayer.isFoulFinished) {
            let reactionMessage = '';
            let reactionExpression: any = 'normal';
            let emojiType = '';
            let duration = 3000;

            // thinking表情を適宜挟む確率計算（自分のプレイに対する反応時）
            const shouldShowThinkingResponse = Math.random() < 0.4; // 40%の確率でthinking

            // 8切りで返された
            if (check8Cut(responseCards)) {
              reactionMessage = getReactionMessage(previousPlayer, 'nervous');
              if (shouldShowThinkingResponse) {
                reactionExpression = 'thinking';
                console.log(`🎭 Response: ${previousPlayer.character.name} thinking about eight cut response`);
              } else {
                reactionExpression = 'nervous';
              }
              emojiType = Math.random() < 0.5 ? '❗️' : '💦';
              duration = 4000;
            }
            // スペードの3で返された
            else if (responseCards.length === 1 && responseCards[0].suit === 'spades' && responseCards[0].rank === 3) {
              reactionMessage = getReactionMessage(previousPlayer, 'disappointed');
              if (shouldShowThinkingResponse) {
                reactionExpression = 'thinking';
                console.log(`🎭 Response: ${previousPlayer.character.name} thinking about spade 3 response`);
              } else {
                reactionExpression = 'disappointed';
              }
              emojiType = '💦';
              duration = 3500;
            }
            // 革命返し
            else if (checkRevolution(responseCards)) {
              reactionMessage = getReactionMessage(previousPlayer, 'disappointed');
              if (shouldShowThinkingResponse) {
                reactionExpression = 'thinking';
                console.log(`🎭 Response: ${previousPlayer.character.name} thinking about revolution response`);
              } else {
                reactionExpression = 'disappointed';
              }
              emojiType = '💦';
              duration = 4000;
            }
            // 強い手で上書き
            else if (responseCards.length >= 3 || (responseCards.length === 1 && (responseCards[0].rank === 2 || responseCards[0].rank === 1 || responseCards[0].rank === 14))) {
              reactionMessage = getReactionMessage(previousPlayer, 'nervous');
              if (shouldShowThinkingResponse) {
                reactionExpression = 'thinking';
                console.log(`🎭 Response: ${previousPlayer.character.name} thinking about strong response`);
              } else {
                reactionExpression = 'frustrated';
              }
              emojiType = Math.random() < 0.5 ? '❗️' : '💦';
              duration = 3500;
            }

            // リアクションがある場合のみ適用
            if (reactionMessage) {
              previousPlayer.message = reactionMessage;
              previousPlayer.messageType = 'normal';
              previousPlayer.expression = reactionExpression;
              console.log(`🔄 Response reaction for ${previousPlayer.character.name}: ${reactionMessage} (${reactionExpression})`);
              
              // 絵文字追加
              if (emojiType) {
                setTimeout(() => setReactionEmoji(previousPlayerId, emojiType, duration), 200);
              }

              // 表情リセット
              resetExpressionToNormal(previousPlayerId, duration);
            }
          }
        }
        
        return newState;
      });
    }, delay);
  }, [setGameState, getAdjustedTime, getReactionMessage, setReactionEmoji, resetExpressionToNormal, isPaused]);

  // 3. 他プレイヤーの反応処理（拡張版）
  const processOtherPlayersReactions = useCallback((
    actionPlayerId: number, 
    actionCards: Card[], 
    currentGameState: GameState
  ) => {
    if (isPaused) {
      console.log('⏸️ Player reactions skipped: game is paused');
      return;
    }

    // 反応すべき状況を判定（拡張版）
    let reactionType: string | null = null;
    
    if (check8Cut(actionCards)) {
      reactionType = 'reactToEightCut';
    } else if (actionCards.length === 1 && actionCards[0].rank === 2) {
      reactionType = 'reactToTwo';
    } else if (actionCards.some(card => card.rank === 14)) {
      reactionType = 'reactToJoker';
    } else if (actionCards.length >= 3 || (actionCards.length === 2 && actionCards[0].rank >= 12)) {
      reactionType = 'reactToStrong';
    }

    if (!reactionType) return;

    console.log(`💬 Processing reactions to ${reactionType} from player ${actionPlayerId}`);

    const otherPlayers = currentGameState.players.filter((player, index) => {
      const isNotActionPlayerById = player.id !== actionPlayerId;
      const isNotActionPlayerByIndex = index !== actionPlayerId;
      const isNotHuman = !player.isHuman;
      const hasCards = player.hand.length > 0;
      const isNotFoulFinished = !player.isFoulFinished;
      
      return isNotActionPlayerById && isNotActionPlayerByIndex && isNotHuman && hasCards && isNotFoulFinished;
    });

    if (otherPlayers.length === 0) return;

    const numberOfReactions = Math.min(
      Math.floor(Math.random() * 2) + 1,
      otherPlayers.length
    );

    const shuffledPlayers = [...otherPlayers].sort(() => Math.random() - 0.5);
    const reactingPlayers = shuffledPlayers.slice(0, numberOfReactions);

    reactingPlayers.forEach((player, index) => {
      const delay = getAdjustedTime(800 + index * 600);

      setTimeout(() => {
        setGameState(prevState => {
          if (!prevState) return prevState;
          
          const newState = { ...prevState };
          const playerIndex = newState.players.findIndex(p => p.id === player.id);
          
          if (playerIndex >= 0) {
            const reactingPlayer = newState.players[playerIndex];
            
            if (reactingPlayer.id !== actionPlayerId && !reactingPlayer.isHuman && 
                reactingPlayer.hand.length > 0 && !reactingPlayer.isFoulFinished) {
              
              newState.players[playerIndex].message = getReactionMessage(player, reactionType!);
              newState.players[playerIndex].messageType = 'action';
              
              // 表情更新（拡張版・thinking追加）
              let reactionExpression: any = 'normal';
              let expressionDuration = 3000;
              let emojiChoice = '';
              
              // thinking表情を適宜挟む確率計算
              const shouldShowThinking = Math.random() < 0.3; // 30%の確率でthinking
              
              if (reactionType === 'reactToEightCut') {
                if (shouldShowThinking) {
                  reactionExpression = 'thinking';
                  console.log(`🎭 Reaction: ${reactingPlayer.character.name} thinking about eight cut`);
                } else {
                  reactionExpression = 'surprised';
                }
                expressionDuration = 4000;
                emojiChoice = Math.random() < 0.5 ? '❗️' : '💦';
              } else if (reactionType === 'reactToTwo') {
                if (shouldShowThinking) {
                  reactionExpression = 'thinking';
                  console.log(`🎭 Reaction: ${reactingPlayer.character.name} thinking about strong card`);
                } else {
                  reactionExpression = 'frustrated';
                }
                emojiChoice = '❗️';
              } else if (reactionType === 'reactToJoker') {
                if (shouldShowThinking) {
                  reactionExpression = 'thinking';
                  console.log(`🎭 Reaction: ${reactingPlayer.character.name} thinking about joker`);
                } else {
                  reactionExpression = 'surprised';
                }
                expressionDuration = 3500;
                emojiChoice = '❗️';
              } else if (reactionType === 'reactToStrong') {
                if (shouldShowThinking) {
                  reactionExpression = 'thinking';
                  console.log(`🎭 Reaction: ${reactingPlayer.character.name} thinking about strong play`);
                } else {
                  reactionExpression = 'frustrated';
                }
                emojiChoice = Math.random() < 0.5 ? '❗️' : '💦';
              }
              
              newState.players[playerIndex].expression = reactionExpression;
              
              // 絵文字表示
              if (emojiChoice) {
                setTimeout(() => setReactionEmoji(reactingPlayer.id, emojiChoice, expressionDuration), 200);
              }
              
              // 表情リセット
              resetExpressionToNormal(reactingPlayer.id, expressionDuration);
            }
          }
          
          return newState;
        });
      }, delay);
    });
  }, [setGameState, getAdjustedTime, isPaused, setReactionEmoji, resetExpressionToNormal, getReactionMessage]);

  return {
    setReactionEmoji,
    processOtherPlayersReactions,
    processSelfPlayReactions,
    processResponseToMyPlay
  };
};