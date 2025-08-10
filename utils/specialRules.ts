import { GameState, Player, Card, GameAction } from '../types/game';
import { checkRevolution, check8Cut, checkSuitLock, canWinWith } from './gameLogic';
import { getAIMessage } from './aiLogic';

// 着席順（playersの並び）を基準に、baseIdの"次席"から回して最初に見つかるアクティブを返す
function getNextActiveAfter(
  baseId: number | null,
  players: Player[],
  active: number[]
): number {
  if (active.length === 0) return -1;
  if (baseId === null) return active[0];
  const seatOrder = players.map(p => p.id);
  const baseIdx = seatOrder.indexOf(baseId);
  const start = baseIdx >= 0 ? (baseIdx + 1) % seatOrder.length : 0;
  for (let k = 0; k < seatOrder.length; k++) {
    const idx = (start + k) % seatOrder.length;
    const candidate = seatOrder[idx];
    if (active.includes(candidate)) return candidate;
  }
  return active[0];
}

export interface SpecialRuleResult {
  isEightCut: boolean;
  needsReaction: boolean;
  updatedState: Partial<GameState>;
  playerUpdates: Partial<Player>;
}

/**
 * 特殊ルール処理（革命、8切り、マーク縛り等）
 */
export function processSpecialRules(
  action: GameAction,
  currentPlayer: Player,
  gameState: GameState
): SpecialRuleResult {
  let isEightCut = false;
  let needsReaction = false;
  const updatedState: Partial<GameState> = {};
  const playerUpdates: Partial<Player> = {};

  // 革命処理
  if (checkRevolution(action.cards)) {
    updatedState.isRevolution = !gameState.isRevolution;
    playerUpdates.message = currentPlayer.isHuman ? '革命成功！' : getAIMessage(currentPlayer, action, gameState);
    playerUpdates.messageType = 'special';
    playerUpdates.expression = 'confident';
    needsReaction = true;
    
    console.log(`🎭 Revolution triggered by ${currentPlayer.character.name}`);
    return { isEightCut, needsReaction, updatedState, playerUpdates };
  }

  // 8切り処理
  if (check8Cut(action.cards)) {
    updatedState.eightCutState = {
      isActive: true,
      eightCards: [...action.cards],
      playerId: currentPlayer.id,
      playerName: currentPlayer.character.name,
      startTime: Date.now()
    };
    
    playerUpdates.message = currentPlayer.isHuman ? '８切り！' : getAIMessage(currentPlayer, action, gameState);
    playerUpdates.messageType = 'special';
    playerUpdates.expression = 'confident';
    isEightCut = true;
    needsReaction = true;
    
    console.log(`🎴 Eight cut triggered by ${currentPlayer.character.name}`);
    return { isEightCut, needsReaction, updatedState, playerUpdates };
  }

  // マーク縛り処理
  try {
    const suitLock = checkSuitLock(action.cards, gameState.field, gameState);
    if (suitLock && !gameState.suitLock) {
      updatedState.suitLock = suitLock;
      needsReaction = true;
      console.log(`🔒 Suit lock activated: ${suitLock}`);
    }
  } catch (error) {
    console.warn('Warning: checkSuitLock error:', error);
  }

  // 通常プレイ
  playerUpdates.message = currentPlayer.isHuman ? '' : getAIMessage(currentPlayer, action, gameState);
  playerUpdates.messageType = 'action';

  return { isEightCut, needsReaction, updatedState, playerUpdates };
}

/**
 * 上がりチェック処理
 */
export function processFinishCheck(
  action: GameAction,
  currentPlayer: Player,
  gameState: GameState
): { isFinished: boolean; isFoul: boolean; shouldUpdateFinishOrder: boolean } {
  if (currentPlayer.hand.length > 0) {
    return { isFinished: false, isFoul: false, shouldUpdateFinishOrder: false };
  }

  const isValidFinish = canWinWith(action.cards, gameState.isRevolution);
  const isAlreadyInOrder = gameState.finishOrder.includes(currentPlayer.id);

  if (isValidFinish) {
    console.log(`🏁 Player ${currentPlayer.character.name} finished normally`);
    return { isFinished: true, isFoul: false, shouldUpdateFinishOrder: !isAlreadyInOrder };
  } else {
    console.log(`🚫 Player ${currentPlayer.character.name} finished with foul`);
    return { isFinished: true, isFoul: true, shouldUpdateFinishOrder: !isAlreadyInOrder };
  }
}

/**
 * 場流れ条件チェック
 */
export function checkFieldFlow(
  active: number[],
  passFlags: { [id: number]: boolean }
): boolean {
  const N = active.length;
  const passedCount = active.filter(id => passFlags[id]).length;
  
  console.log(`🎯 Flow check: N=${N}, passedCount=${passedCount}`);
  
  if (N === 2) {
    // 2人の場合：相手がパスしたら即場流し
    return passedCount >= 1;
  } else if (N > 2) {
    // 3人以上の場合：(N-1)人がパスしたら場流し
    return passedCount >= (N - 1);
  }
  
  return false;
}

/**
 * 場流し処理（セリフ設定付き）
 */
export function executeFieldFlow(
  gameState: GameState,
  passMessageTracker: React.MutableRefObject<any>,
  getFieldClearMessage?: (player: Player) => string,
  getFieldClearOtherMessage?: (player: Player) => string
): Partial<GameState> {
  console.log(`🎯 Flowing field, lastPlayer was: ${gameState.lastPlayer}`);
  
  const updates: Partial<GameState> = {
    fieldSet: null, // 新しい場
    field: [], // 互換性維持
    lastPlayType: null,
    lastPlayCount: 0,
    suitLock: null,
    turnsPassed: 0,
  };

  // 全員のパス状態をリセット
  const newPassFlags = { ...gameState.passFlags };
  Object.keys(newPassFlags).forEach(id => {
    newPassFlags[parseInt(id)] = false;
  });
  updates.passFlags = newPassFlags;

  // プレイヤーアクション履歴をクリア & セリフ設定
  const updatedPlayers = gameState.players.map(player => ({
    ...player,
    lastAction: undefined
  }));

  // lastPlayer から再開の決定
  let nextTurnPlayer: number;
  if (gameState.lastPlayer !== null && gameState.active.includes(gameState.lastPlayer)) {
    // lastPlayer がまだアクティブ → その人から新しい場を作る
    nextTurnPlayer = gameState.lastPlayer;
    console.log(`🎯 Restarting from lastPlayer: ${gameState.lastPlayer}`);
  } else {
    // lastPlayer が上がり等で非アクティブ → "次席"の現アクティブへ委譲（C飛ばし防止）
    nextTurnPlayer = getNextActiveAfter(gameState.lastPlayer, updatedPlayers, gameState.active);
    console.log(`🎯 Hand-off from lastPlayer to next active seat: ${nextTurnPlayer}`);
  }

  // 🎯 場が流れた後のセリフ設定（手札枚数を考慮）
  if (getFieldClearMessage && getFieldClearOtherMessage) {
    gameState.active.forEach(playerId => {
      const player = updatedPlayers[playerId];
      if (player && player.hand.length > 0 && !player.isFoulFinished) {
        if (playerId === nextTurnPlayer) {
          // 自分のターンになるプレイヤー
          if (!player.isHuman) {
            // 自分の手札が少ない場合は専用セリフ
            if (player.hand.length <= 3) {
              const { getCharacterDialogue } = require('../data/dialogues');
              player.message = getCharacterDialogue(player.character.id, 'fewCardsOwn');
              player.expression = 'excited';
              console.log(`💬 Set fewCardsOwn message for ${player.character.name}: "${player.message}"`);
            } else {
              player.message = getFieldClearMessage(player);
              player.expression = 'confident';
              console.log(`💬 Set field clear message for ${player.character.name}: "${player.message}"`);
            }
            player.messageType = 'normal';
          }
        } else {
          // 他のプレイヤー（場を流された側）
          if (!player.isHuman) {
            // 他のプレイヤーの手札が少ない場合をチェック
            const otherPlayersWithFewCards = gameState.active.some(id => {
              const otherPlayer = updatedPlayers[id];
              return otherPlayer && id !== playerId && otherPlayer.hand.length <= 3 && !otherPlayer.isFoulFinished;
            });
            
            if (otherPlayersWithFewCards && Math.random() < 0.6) {
              const { getCharacterDialogue } = require('../data/dialogues');
              player.message = getCharacterDialogue(player.character.id, 'fewCardsOther');
              player.expression = 'nervous';
              console.log(`💬 Set fewCardsOther message for ${player.character.name}: "${player.message}"`);
            } else {
              player.message = getFieldClearOtherMessage(player);
              player.expression = 'normal';
              console.log(`💬 Set field clear other message for ${player.character.name}: "${player.message}"`);
            }
            player.messageType = 'normal';
          }
        }
      }
    });
  }

  updates.players = updatedPlayers;
  updates.turn = nextTurnPlayer;
  updates.currentPlayer = nextTurnPlayer; // 互換性維持

  passMessageTracker.current = {};

  // 互換性維持
  updates.lastCardPlayerId = gameState.lastPlayer || nextTurnPlayer;

  console.log(`🎯 Field flowed: turn=${updates.turn}, fieldSet=${updates.fieldSet} (must play)`);
  
  return updates;
}