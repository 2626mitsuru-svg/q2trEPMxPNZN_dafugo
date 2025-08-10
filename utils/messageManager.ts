import { Player, GameState } from '../types/game';
import { getReactionMessage } from './aiLogic';
import { getRankComment, getCharacterDialogue } from '../data/dialogues';

// 反則負けを考慮した実際の順位を計算
export const calculateActualRank = (player: Player, gameState: GameState): number => {
  console.log(`🏆 Calculating actual rank for ${player.character.name}`);
  
  if (player.isFoulFinished) {
    return 3; // 反則負けは4位
  }
  
  const normalFinishOrder = gameState.finishOrder.filter(id => {
    const finishedPlayer = gameState.players[id];
    return !finishedPlayer.isFoulFinished;
  });
  
  const normalRank = normalFinishOrder.indexOf(player.id);
  return normalRank === -1 ? -1 : normalRank;
};

// 役職を取得
export const getPlayerRole = (player: Player, gameState: GameState): string => {
  if (player.isFoulFinished) {
    return '大貧民';
  }
  
  const actualRank = calculateActualRank(player, gameState);
  
  if (actualRank === -1) return '';
  
  const roles = ['大富豪', '富豪', '貧民', '大貧民'];
  return roles[actualRank] || '大貧民';
};

// 🎯 場が流れて自分のターンになった時のセリフ
export const getFieldClearMessage = (player: Player): string => {
  console.log(`💬 Getting field clear message for ${player.character.name}`);
  return getCharacterDialogue(player.character.id, 'fieldClear');
};

// 🎯 場が流れて他人が有効だった時のセリフ
export const getFieldClearOtherMessage = (player: Player): string => {
  console.log(`💬 Getting field clear other message for ${player.character.name}`);
  return getCharacterDialogue(player.character.id, 'fieldClearOther');
};

// 🎯 自分の手札が残り少ない時のセリフ
export const getFewCardsOwnMessage = (player: Player): string => {
  console.log(`💬 Getting few cards own message for ${player.character.name}`);
  return getCharacterDialogue(player.character.id, 'fewCardsOwn');
};

// 🎯 他プレイヤーの手札が少ない時のセリフ
export const getFewCardsOtherMessage = (player: Player): string => {
  console.log(`💬 Getting few cards other message for ${player.character.name}`);
  return getCharacterDialogue(player.character.id, 'fewCardsOther');
};

// 🎯 上がった瞬間のセリフ（順位確定時ではなく上がり瞬間）
export const getFinishMessage = (player: Player, gameState: GameState): string => {
  console.log(`🏁 Getting finish message for ${player.character.name}`);
  
  if (player.isFoulFinished) {
    // 反則上がりの場合
    return getCharacterDialogue(player.character.id, 'foulPlay');
  }
  
  // 正常上がりの場合、現在の順位を計算
  const currentFinishOrder = gameState.finishOrder.filter(id => {
    const finishedPlayer = gameState.players[id];
    return !finishedPlayer.isFoulFinished;
  });
  
  const currentRank = currentFinishOrder.indexOf(player.id);
  
  if (currentRank === 0) {
    // 大富豪（1位）
    return getCharacterDialogue(player.character.id, 'winAsRich');
  } else {
    // その他の順位（富豪、貧民）
    return getCharacterDialogue(player.character.id, 'winNormal');
  }
};

// 🎯 上がり後の観戦コメント（既存機能の活用）
export const getSpectatorComment = (player: Player, gameState: GameState): string => {
  console.log(`👀 Getting spectator comment for ${player.character.name}`);
  
  if (player.isFoulFinished) {
    return getCharacterDialogue(player.character.id, 'afterFoul');
  }
  
  const actualRank = calculateActualRank(player, gameState);
  if (actualRank === 0) {
    return getCharacterDialogue(player.character.id, 'afterWinRich');
  } else {
    return getCharacterDialogue(player.character.id, 'afterWinNormal');
  }
};

// ゲーム終了時の最終セリフ設定
export const setFinalGameMessages = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>,
  setFinalMessagesSet: React.Dispatch<React.SetStateAction<boolean>>
) => {
  console.log('🏆 Setting final game messages...');
  
  const newState = { ...gameState };
  
  newState.players = newState.players.map(player => {
    let finalMessage: string;
    let finalExpression: string;
    
    if (player.isFoulFinished) {
      finalMessage = getReactionMessage(player, 'foulPlay');
      finalExpression = 'disappointed'; // 反則負けはがっかり・失望の表情
    } else {
      const actualRank = calculateActualRank(player, newState);
      finalMessage = getRankComment(player.character.id, actualRank);
      
      // 🎭 ８主専用の最終表情バリエーション
      if (player.character.id === 8) {
        if (actualRank === 0) {
          // 大富豪: より得意気に confident を強調
          finalExpression = 'confident';
        } else if (actualRank === 1) {
          // 富豪: 満足そうに confident または happy
          finalExpression = Math.random() < 0.6 ? 'confident' : 'happy';
        } else if (actualRank === 2) {
          // 貧民: 動揺・心配そうな表情
          finalExpression = 'nervous';
        } else {
          // 大貧民: がっかり・失望の表情
          finalExpression = 'disappointed';
        }
      } else {
        // 他のキャラクターは従来通り
        if (actualRank === 0) {
          finalExpression = 'confident';
        } else if (actualRank === 1) {
          finalExpression = 'happy';
        } else if (actualRank === 2) {
          // 貧民: 動揺・心配そうな表情
          finalExpression = 'nervous';
        } else {
          // 大貧民: がっかり・失望の表情
          finalExpression = 'disappointed';
        }
      }
    }
    
    return {
      ...player,
      message: finalMessage,
      messageType: 'special' as const,
      expression: finalExpression as any
    };
  });
  
  setGameState(newState);
  setFinalMessagesSet(true);
  console.log('🏆 Final game messages set successfully!');
};