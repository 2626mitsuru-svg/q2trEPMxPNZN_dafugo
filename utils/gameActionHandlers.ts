import { GameState, Player, Card, GameAction } from '../types/game';
import { updateAIExpression, getAIMessage } from './aiLogic';
import { cardToString } from './gameLogic';
import { processSpecialRules, processFinishCheck, checkFieldFlow, executeFieldFlow } from './specialRules';

export interface ActionHandlerConfig {
  passMessageTracker: React.MutableRefObject<any>;
  getNextActivePlayer: (currentTurn: number, active: number[], passFlags: { [id: number]: boolean }) => number;
  handlePlayerFinish: (playerId: number, gameState: GameState) => GameState;
}

/**
 * カードプレイ処理
 */
export function handleCardPlay(
  action: GameAction,
  gameState: GameState,
  config: ActionHandlerConfig
): Partial<GameState> {
  const currentPlayer = gameState.players[gameState.turn];
  console.log(`🃏 Player ${currentPlayer.character.name} playing cards`);
  
  const updates: Partial<GameState> = {};
  
  // 手札からカード除去
  const updatedPlayers = [...gameState.players];
  updatedPlayers[gameState.turn] = {
    ...currentPlayer,
    hand: currentPlayer.hand.filter(card => 
      !action.cards.some(playedCard => playedCard.id === card.id)
    )
  };
  
  // fieldSet を更新、lastPlayer を更新
  updates.fieldSet = [...action.cards];
  updates.lastPlayer = currentPlayer.id;
  
  // 互換性維持
  updates.field = [...action.cards];
  updates.lastPlayType = action.playType;
  updates.lastPlayCount = action.cards.length;
  updates.turnsPassed = 0;
  updates.lastCardPlayerId = currentPlayer.id;
  
  // カードを出したときは全員のパス状態をリセット
  const newPassFlags = { ...gameState.passFlags };
  Object.keys(newPassFlags).forEach(id => {
    newPassFlags[parseInt(id)] = false;
  });
  updates.passFlags = newPassFlags;
  
  config.passMessageTracker.current = {};
  
  console.log(`🃏 Updated: fieldSet=${updates.fieldSet?.length} cards, lastPlayer=${updates.lastPlayer}`);
  
  // 特殊ルール処理
  const specialRuleResult = processSpecialRules(action, currentPlayer, gameState);
  
  // プレイヤー更新適用
  updatedPlayers[gameState.turn] = {
    ...updatedPlayers[gameState.turn],
    ...specialRuleResult.playerUpdates
  };
  
  // ゲーム状態更新適用
  Object.assign(updates, specialRuleResult.updatedState);
  
  // 上がりチェック
  const finishResult = processFinishCheck(action, updatedPlayers[gameState.turn], gameState);
  
  if (finishResult.isFinished) {
    if (finishResult.isFoul) {
      updatedPlayers[gameState.turn].isFoulFinished = true;
    }
    
    if (finishResult.shouldUpdateFinishOrder) {
      updates.finishOrder = [...gameState.finishOrder, currentPlayer.id];
    }
    
    // 🎯 上がった瞬間のセリフ設定（「大富豪！」と同時に表示）- AIと人間両方に適用
    const tempGameState = { ...gameState, ...updates, players: updatedPlayers };
    
    let finishMessage: string;
    let finishExpression: string;
    
    if (finishResult.isFoul) {
      // 反則上がりの場合
      const { getCharacterDialogue } = require('../data/dialogues');
      finishMessage = getCharacterDialogue(currentPlayer.character.id, 'foulPlay');
      finishExpression = 'disappointed'; // 反則上がりはがっかり・失望の表情
    } else {
      // 正常上がりの場合
      const currentFinishOrder = tempGameState.finishOrder.filter((id: number) => {
        const finishedPlayer = tempGameState.players[id];
        return !finishedPlayer.isFoulFinished;
      });
      
      const currentRank = currentFinishOrder.indexOf(currentPlayer.id);
      const { getCharacterDialogue } = require('../data/dialogues');
      
      if (currentRank === 0) {
        // 大富豪（1位）
        finishMessage = getCharacterDialogue(currentPlayer.character.id, 'winAsRich');
        finishExpression = 'confident';
      } else {
        // その他の順位（富豪、貧民）
        finishMessage = getCharacterDialogue(currentPlayer.character.id, 'winNormal');
        finishExpression = 'happy';
      }
    }
    
    updatedPlayers[gameState.turn].message = finishMessage;
    updatedPlayers[gameState.turn].messageType = 'special';
    updatedPlayers[gameState.turn].expression = finishExpression;
    console.log(`🏁 Set finish message for ${currentPlayer.character.name} (${currentPlayer.isHuman ? 'HUMAN' : 'AI'}): "${finishMessage}"`);
    
    // ✨ 上がった瞬間のメッセージを強調表示するため、一定時間後に観戦コメントに切り替え
    if (!finishResult.isFoul) {
      setTimeout(() => {
        console.log(`💬 Switching to spectator comment for ${currentPlayer.character.name} after finish message display`);
        // この処理はApp.tsxの観戦コメント処理に委ねる
      }, 2000);
    }
    
    // activeリストから除外（原子的に処理）→ 以降の"次手番算出"は行わない
    const tempState = { ...gameState, ...updates, players: updatedPlayers };
    const finishedState = config.handlePlayerFinish(currentPlayer.id, tempState);
    Object.assign(updates, finishedState);
    return updates; // ← 早期returnで二重進行やC飛ばしを防止
  } else {
    updates.players = updatedPlayers;
    
    // 次のプレイヤー決定（8切りでない場合）
    if (gameState.gamePhase === 'playing' && !specialRuleResult.isEightCut) {
      const nextPlayer = config.getNextActivePlayer(gameState.turn, gameState.active, newPassFlags);
      updates.turn = nextPlayer;
      updates.currentPlayer = nextPlayer; // 互換性維持
      console.log(`🔄 Next turn: ${nextPlayer} (${gameState.players[nextPlayer].character.name})`);
    }
  }
  
  return {
    ...updates,
    specialRuleResult // リアクション処理用
  };
}

/**
 * パス処理
 */
export function handlePass(
  action: GameAction,
  gameState: GameState,
  config: ActionHandlerConfig
): Partial<GameState> | null {
  const currentPlayer = gameState.players[gameState.turn];
  console.log(`🎯 Player ${currentPlayer.character.name} attempting to pass`);
  
  // fieldSet = null（新しい場）ではパス禁止
  if (gameState.fieldSet === null) {
    console.error(`🚫 PASS FORBIDDEN: fieldSet is null (new field), player must play`);
    return null; // パスを無効化
  }
  
  const updates: Partial<GameState> = {};
  
  // パス状態にする
  const newPassFlags = { ...gameState.passFlags };
  newPassFlags[currentPlayer.id] = true;
  updates.passFlags = newPassFlags;
  
  console.log(`🎯 Player ${currentPlayer.character.name} passed, passFlags:`, newPassFlags);
  
  // パスメッセージ処理
  const currentTime = Date.now();
  if (!config.passMessageTracker.current[currentPlayer.id]) {
    config.passMessageTracker.current[currentPlayer.id] = {
      hasPassedThisTurn: false,
      passMessageShown: false,
      lastPassTime: 0
    };
  }
  
  const passInfo = config.passMessageTracker.current[currentPlayer.id];
  
  const updatedPlayers = [...gameState.players];
  const playerUpdate = { ...currentPlayer };
  
  if (currentPlayer.isHuman) {
    playerUpdate.message = '';
  } else if (!passInfo.passMessageShown) {
    playerUpdate.message = getAIMessage(currentPlayer, action, gameState);
    passInfo.passMessageShown = true;
    passInfo.lastPassTime = currentTime;
  }
  
  playerUpdate.messageType = 'normal';
  
  // パス時の表情
  if (!currentPlayer.isHuman) {
    playerUpdate.expression = currentPlayer.character.id === 8 ? 'nervous' : 'frustrated';
  }
  
  updatedPlayers[gameState.turn] = playerUpdate;
  updates.players = updatedPlayers;
  
  // 場流れ判定
  const shouldFlow = checkFieldFlow(gameState.active, newPassFlags);
  console.log(`🎯 Should flow field: ${shouldFlow}`);
  
  if (shouldFlow) {
    // 場を流す処理（セリフ設定付き）
    const { getFieldClearMessage, getFieldClearOtherMessage } = require('./messageManager');
    const flowUpdates = executeFieldFlow(gameState, config.passMessageTracker, getFieldClearMessage, getFieldClearOtherMessage);
    Object.assign(updates, flowUpdates);
  } else {
    // 通常の次プレイヤー
    const nextPlayer = config.getNextActivePlayer(gameState.turn, gameState.active, newPassFlags);
    updates.turn = nextPlayer;
    updates.currentPlayer = nextPlayer; // 互換性維持
    console.log(`🎯 Next turn (no flow): ${nextPlayer} (${gameState.players[nextPlayer].character.name})`);
  }
  
  return updates;
}

/**
 * ゲームアクション統合処理
 */
export function processGameAction(
  action: GameAction,
  gameState: GameState,
  config: ActionHandlerConfig
): { updates: Partial<GameState>; actionMeta: any } {
  const currentPlayer = gameState.players[gameState.turn];
  
  // アクション記録
  const actionRecord = {
    type: action.type,
    description: action.type === 'pass' ? 'パス！' : (action.cards[0] ? cardToString(action.cards[0]) : '不明'),
    timestamp: Date.now()
  };
  
  // 履歴記録
  const historyEntry = {
    playerId: currentPlayer.id,
    cards: action.type === 'pass' ? [] : [...action.cards],
    playType: action.playType,
    playerName: currentPlayer.character.name,
    playerColor: currentPlayer.character.color,
    timestamp: Date.now()
  };
  
  let updates: Partial<GameState>;
  let actionMeta: any = {};
  
  if (action.type === 'play') {
    const result = handleCardPlay(action, gameState, config);
    updates = result;
    actionMeta = result.specialRuleResult || {};
  } else {
    const result = handlePass(action, gameState, config);
    if (!result) {
      // パス禁止の場合
      return { updates: {}, actionMeta: { passRejected: true } };
    }
    updates = result;
  }
  
  // 共通更新処理
  const updatedPlayers = updates.players ? [...updates.players] : [...gameState.players];
  updatedPlayers[gameState.turn] = {
    ...updatedPlayers[gameState.turn],
    lastAction: actionRecord
  };
  
  updates.players = updatedPlayers;
  updates.playHistory = [...gameState.playHistory, historyEntry];
  
  // 表情更新
  if (updates.gamePhase === 'playing' && !currentPlayer.isHuman) {
    const newExpression = updateAIExpression(updatedPlayers[gameState.turn], { ...gameState, ...updates });
    updatedPlayers[gameState.turn].expression = newExpression;
  }
  
  return { updates, actionMeta };
}