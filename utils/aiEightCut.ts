import { Player, GameState, Card } from '../types/game';
import { MemoryState, EIGHT_CUT_TENDENCIES } from './aiConstants';
import { evaluateFoulAvoidanceRisk } from './aiFoulAvoidance';

// 🎯 八切り後の勝率計算
export const calculateWinProbabilityAfterEightCut = (player: Player, gameState: GameState): number => {
  const hand = player.hand;
  const handAfterEightCut = hand.filter(c => c.rank !== 8);
  
  let winScore = 0;
  
  // 基本勝率スコア計算
  const handCount = handAfterEightCut.length;
  if (handCount <= 2) {
    winScore += 70;
  } else if (handCount <= 4) {
    winScore += 50;
  } else if (handCount <= 6) {
    winScore += 30;
  } else if (handCount <= 8) {
    winScore += 15;
  } else {
    winScore += 5;
  }
  
  // 強カード所持ボーナス
  const strongCards = handAfterEightCut.filter(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
  winScore += strongCards.length * 20;
  
  // 連番・ペア所持ボーナス
  const rankGroups = handAfterEightCut.reduce((groups, card) => {
    if (!groups[card.rank]) groups[card.rank] = [];
    groups[card.rank].push(card);
    return groups;
  }, {} as { [rank: number]: Card[] });
  
  // ペア・トリプル評価
  Object.values(rankGroups).forEach(cards => {
    if (cards.length >= 2) {
      winScore += cards.length * 12;
    }
  });
  
  // 相手の状況を考慮
  const opponents = gameState.players.filter(p => p.id !== player.id && p.hand.length > 0 && !p.isFoulFinished);
  const opponentThreat = opponents.reduce((threat, opponent) => {
    if (opponent.hand.length <= 3) {
      return threat + 10;
    } else if (opponent.hand.length <= 5) {
      return threat + 5;
    }
    return threat;
  }, 0);
  
  winScore -= opponentThreat;
  
  const finalProbability = Math.max(0, Math.min(100, winScore));
  
  console.log(`🎴 Win probability calculation: handAfter=${handCount}, strong=${strongCards.length}, winScore=${winScore}, threat=${opponentThreat}, final=${finalProbability}%`);
  
  return finalProbability;
};

// 🎯 簡易後続アクション評価
export const evaluateSimpleFollowUpActions = (player: Player, gameState: GameState) => {
  const hand = player.hand;
  const handAfterEightCut = hand.filter(c => c.rank !== 8);
  
  const hasStrongCards = handAfterEightCut.some(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
  const hasPairs = Object.values(handAfterEightCut.reduce((groups, card) => {
    if (!groups[card.rank]) groups[card.rank] = [];
    groups[card.rank].push(card);
    return groups;
  }, {} as { [rank: number]: Card[] })).some(cards => cards.length >= 2);
  const canWin = handAfterEightCut.length <= 3;
  
  const hasAnyOption = hasStrongCards || hasPairs || canWin || handAfterEightCut.length <= 2;
  
  return {
    hasStrongCards,
    hasPairs,
    canWin,
    hasAnyOption,
    simpleScore: (hasStrongCards ? 20 : 0) + (hasPairs ? 15 : 0) + (canWin ? 30 : 0) + (handAfterEightCut.length <= 2 ? 25 : 0)
  };
};

// 🎯 後続アクション評価
export const evaluateFollowUpActions = (player: Player, gameState: GameState, memory: MemoryState) => {
  const hand = player.hand;
  const handAfterEightCut = hand.filter(c => c.rank !== 8);
  
  // マーク縛り成立可能性
  const suitGroups = handAfterEightCut.reduce((groups, card) => {
    if (!groups[card.suit]) groups[card.suit] = [];
    groups[card.suit].push(card);
    return groups;
  }, {} as { [suit: string]: Card[] });
  
  const multiSuitOptions = Object.values(suitGroups).filter(cards => cards.length >= 2);
  const singleSuitOptions = Object.values(suitGroups).filter(cards => cards.length === 1);
  const suitLockPotential = multiSuitOptions.length > 0 || singleSuitOptions.length >= 3;
  
  // 連番成立可能性
  let straightPotential = false;
  Object.values(suitGroups).forEach(suitCards => {
    if (suitCards.length >= 2) {
      suitCards.sort((a, b) => a.rank - b.rank);
      for (let i = 0; i <= suitCards.length - 2; i++) {
        let consecutive = true;
        for (let j = 1; j < 2; j++) {
          if (i + j < suitCards.length && suitCards[i + j].rank !== suitCards[i].rank + j) {
            consecutive = false;
            break;
          }
        }
        if (consecutive && i + 1 < suitCards.length) {
          straightPotential = true;
          break;
        }
      }
    }
  });
  
  // 強カード準備
  const strongCards = handAfterEightCut.filter(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
  const strongCardReady = strongCards.length > 0;
  
  // 上がり可能性
  const winningMove = handAfterEightCut.length <= 4;
  
  // コンボセットアップ
  const rankGroups = handAfterEightCut.reduce((groups, card) => {
    if (!groups[card.rank]) groups[card.rank] = [];
    groups[card.rank].push(card);
    return groups;
  }, {} as { [rank: number]: Card[] });
  
  const comboSetup = Object.values(rankGroups).some(cards => cards.length >= 2);
  
  // 弱カード処理可能性
  const weakCards = handAfterEightCut.filter(c => c.rank >= 3 && c.rank <= 7);
  const weakCardOptions = weakCards.length >= 2;
  
  return {
    suitLockPotential,
    straightPotential,
    strongCardReady,
    winningMove,
    comboSetup,
    weakCardOptions,
    totalScore: (suitLockPotential ? 25 : 0) + 
                (straightPotential ? 30 : 0) + 
                (strongCardReady ? 25 : 5) +
                (winningMove ? 40 : 0) + 
                (comboSetup ? 20 : 5) +
                (weakCardOptions ? 15 : 0) +
                (handAfterEightCut.length <= 5 ? 10 : 0)
  };
};

// 🎯 キャラクター別八切り傾向チェック
export const checkCharacterEightCutTendency = (characterId: number, handCount: number, gameState: GameState, relaxedMode: boolean = false): boolean => {
  const baseConfig = {
    minHandCount: relaxedMode ? 10 : 8,
    aggressive: false,
    strategic: false
  };
  
  const tendency = EIGHT_CUT_TENDENCIES[characterId] || baseConfig;
  const minHandCount = relaxedMode ? tendency.minHandCountRelaxed : tendency.minHandCount;
  
  // 手札数制限チェック
  if (handCount > minHandCount) {
    console.log(`🎴 Character ${characterId} eight cut rejected: ${handCount} > ${minHandCount} (relaxed: ${relaxedMode})`);
    return false;
  }
  
  // 戦略的キャラクターの追加条件
  if (tendency.strategic && !relaxedMode) {
    const activePlayers = gameState.players.filter(p => p.hand.length > 0 && !p.isFoulFinished).length;
    
    if (activePlayers > 2 && handCount > minHandCount - 2) {
      console.log(`🎴 Strategic character ${characterId} eight cut rejected: not endgame and hand count ${handCount} > ${minHandCount - 2}`);
      return false;
    }
  }
  
  // 積極的でないキャラクターの条件
  if (!tendency.aggressive && !relaxedMode) {
    const opponentsInReach = gameState.players.filter(p => 
      p.hand.length <= 3 && p.hand.length > 0 && !p.isFoulFinished
    ).length;
    
    if (opponentsInReach > 0 && handCount > 7) {
      console.log(`🎴 Non-aggressive character ${characterId} eight cut rejected: opponents in reach and hand count ${handCount} > 7`);
      return false;
    }
  }
  
  console.log(`🎴 Character ${characterId} eight cut tendency check passed: hand=${handCount}, relaxed=${relaxedMode}`);
  return true;
};

// 🎴 八切り実行条件チェック
export const canExecuteEightCut = (player: Player, gameState: GameState, memory: MemoryState): { canExecute: boolean, reason: string, winProbability?: number, isEmergency?: boolean } => {
  const hand = player.hand;
  const handCount = hand.length;
  const characterId = player.character.id;
  
  console.log(`🎴 Eight cut evaluation for ${player.character.name}: handCount=${handCount}`);
  
  // 前提条件: 8を持っているか
  const eightCards = hand.filter(c => c.rank === 8);
  if (eightCards.length === 0) {
    return { canExecute: false, reason: 'No 8 cards available' };
  }
  
  // 反則負け回避チェック（最優先）
  const foulRisk = evaluateFoulAvoidanceRisk(player, gameState);
  if (foulRisk.shouldPass && foulRisk.riskLevel >= 40) {
    console.log(`🚫 Eight cut blocked by foul avoidance: ${foulRisk.reason}`);
    return { 
      canExecute: false, 
      reason: `Foul avoidance: ${foulRisk.reason} (risk: ${foulRisk.riskLevel})` 
    };
  }
  
  // 緊急時判定：手札5枚以下は無条件で八切り許可
  if (handCount <= 5) {
    console.log(`🚨 Emergency eight cut approved: ${handCount} cards ≤ 5`);
    return { 
      canExecute: true, 
      reason: `Emergency mode: only ${handCount} cards left`, 
      isEmergency: true 
    };
  }
  
  // 危険域判定：手札6-7枚は緩和された条件で八切り許可
  if (handCount <= 7) {
    const simpleFollowUp = evaluateSimpleFollowUpActions(player, gameState);
    console.log(`🚨 Danger zone (${handCount} cards): simple follow-up evaluation:`, simpleFollowUp);
    
    if (simpleFollowUp.hasAnyOption) {
      console.log(`🚨 Danger zone eight cut approved: ${handCount} cards ≤ 7 with basic options`);
      return { 
        canExecute: true, 
        reason: `Danger zone: ${handCount} cards with basic follow-up options`, 
        isEmergency: true 
      };
    }
  }
  
  // 初手判定
  const isEarlyGame = gameState.playHistory.length <= 3;
  
  if (isEarlyGame) {
    console.log(`🎴 Early game detected (${gameState.playHistory.length} plays) - checking relaxed conditions`);
    
    const winProbability = calculateWinProbabilityAfterEightCut(player, gameState);
    console.log(`🎴 Early game win probability after eight cut: ${winProbability}%`);
    
    if (winProbability < 70) {
      console.log(`🎴 Early game eight cut rejected: win probability ${winProbability}% < 70%`);
      return { 
        canExecute: false, 
        reason: `Early game - win probability too low (${winProbability}% < 70%)`, 
        winProbability 
      };
    } else {
      console.log(`🎴 Early game eight cut approved: win probability ${winProbability}% >= 70%`);
      return { 
        canExecute: true, 
        reason: `Early game - acceptable win probability (${winProbability}%)`, 
        winProbability 
      };
    }
  }
  
  // 中盤制限
  if (handCount > 10) {
    console.log(`🎴 Eight cut rejected: too many cards (${handCount} > 10)`);
    return { canExecute: false, reason: `Too early - ${handCount} cards > 10` };
  }
  
  // 後続アクション見込みの評価
  const followUpActions = evaluateFollowUpActions(player, gameState, memory);
  console.log(`🎴 Follow-up actions evaluation:`, followUpActions);
  
  const hasViableFollowUp = followUpActions.totalScore >= 30 || 
                           followUpActions.suitLockPotential || 
                           followUpActions.straightPotential || 
                           followUpActions.strongCardReady || 
                           followUpActions.winningMove ||
                           followUpActions.comboSetup;
  
  if (!hasViableFollowUp) {
    console.log(`🎴 Eight cut rejected: insufficient follow-up potential (score: ${followUpActions.totalScore})`);
    return { canExecute: false, reason: `Insufficient follow-up potential (score: ${followUpActions.totalScore}/30)` };
  }
  
  // キャラクター別の八切り傾向チェック
  const characterAllowsEightCut = checkCharacterEightCutTendency(characterId, handCount, gameState, true);
  if (!characterAllowsEightCut) {
    console.log(`🎴 Eight cut rejected: character ${characterId} tendency does not favor eight cut`);
    return { canExecute: false, reason: `Character ${characterId} does not favor eight cut` };
  }
  
  console.log(`🎴 Eight cut approved for ${player.character.name}: hand=${handCount}, followUp=viable`);
  return { 
    canExecute: true, 
    reason: `Mid-game valid eight cut: hand=${handCount}, viable follow-ups available` 
  };
};