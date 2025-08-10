import { Player, GameState, Card } from '../types/game';
import { FoulAvoidanceInfo, CHARACTER_RISK_MODIFIERS } from './aiConstants';
import { canWinWith } from './gameLogic';

// 🚫 8残り予測・反則負け回避判定
export const evaluateFoulAvoidanceRisk = (player: Player, gameState: GameState): FoulAvoidanceInfo => {
  const hand = player.hand;
  const eightCards = hand.filter(c => c.rank === 8);
  
  console.log(`🚫 Evaluating foul avoidance for ${player.character.name}: ${eightCards.length} eights in hand`);
  
  if (eightCards.length === 0) {
    return {
      eightCards: [],
      riskLevel: 0,
      shouldPass: false,
      reason: 'No eights in hand',
      handAfterBestPlay: [],
      worstCaseScenario: false
    };
  }
  
  const totalCards = hand.length;
  const nonEightCards = hand.filter(c => c.rank !== 8);
  
  console.log(`🚫 Hand analysis: total=${totalCards}, eights=${eightCards.length}, nonEights=${nonEightCards.length}`);
  
  // 出せるカードの分析（8以外で）
  const playableNonEightCards = nonEightCards.filter(card => 
    // 簡易判定：場が空かカードが強い場合
    gameState.field.length === 0 || card.rank >= gameState.field[0]?.rank
  );
  
  // ペア・トリプル・ストレートの分析
  const rankGroups = nonEightCards.reduce((groups, card) => {
    if (!groups[card.rank]) groups[card.rank] = [];
    groups[card.rank].push(card);
    return groups;
  }, {} as { [rank: number]: Card[] });
  
  const suitGroups = nonEightCards.reduce((groups, card) => {
    if (!groups[card.suit]) groups[card.suit] = [];
    groups[card.suit].push(card);
    return groups;
  }, {} as { [suit: string]: Card[] });
  
  const pairOptions = Object.values(rankGroups).filter(cards => cards.length >= 2).length;
  const straightOptions = Object.values(suitGroups).filter(cards => cards.length >= 3).length;
  
  console.log(`🚫 Play options: single=${playableNonEightCards.length}, pairs=${pairOptions}, straights=${straightOptions}`);
  
  // リスク評価
  let riskLevel = 0;
  let reasons: string[] = [];
  
  // リスク要因1: 手札が少なく8の比率が高い
  const eightRatio = eightCards.length / totalCards;
  if (totalCards <= 4 && eightRatio >= 0.5) {
    riskLevel += 40;
    reasons.push(`High eight ratio in few cards (${eightRatio.toFixed(1)})`);
  } else if (totalCards <= 6 && eightRatio >= 0.33) {
    riskLevel += 25;
    reasons.push(`Moderate eight ratio (${eightRatio.toFixed(1)})`);
  }
  
  // リスク要因2: 出せる非8カードが少ない
  if (playableNonEightCards.length === 0 && totalCards <= 3) {
    riskLevel += 50;
    reasons.push('No playable non-eight cards in few cards');
  } else if (playableNonEightCards.length <= 1 && totalCards <= 4) {
    riskLevel += 30;
    reasons.push('Very few playable non-eight cards');
  }
  
  // リスク要因3: 最悪ケースシミュレーション
  let worstCaseScenario = false;
  if (totalCards <= 3 && eightCards.length >= 1) {
    const remainingAfterBestCase = totalCards - nonEightCards.length;
    if (remainingAfterBestCase === eightCards.length && eightCards.length > 0) {
      worstCaseScenario = true;
      riskLevel += 60;
      reasons.push('Worst case: only eights would remain');
    }
  }
  
  // リスク要因4: コンボ不足
  if (pairOptions === 0 && straightOptions === 0 && totalCards <= 5) {
    riskLevel += 20;
    reasons.push('No combo options available');
  }
  
  // リスク要因5: 革命状態での8の危険度
  if (gameState.isRevolution && eightCards.length > 0) {
    riskLevel += 15;
    reasons.push('Revolution state increases eight risk');
  }
  
  // リスク要因6: 相手の手札状況
  const opponentsInReach = gameState.players.filter(p => 
    p.id !== player.id && p.hand.length <= 3 && !p.isFoulFinished
  ).length;
  
  if (opponentsInReach > 0 && totalCards <= 4) {
    riskLevel += opponentsInReach * 10;
    reasons.push(`${opponentsInReach} opponents in reach`);
  }
  
  // キャラクター別リスク調整
  const modifier = CHARACTER_RISK_MODIFIERS[player.character.id] || 1.0;
  riskLevel = Math.round(riskLevel * modifier);
  
  console.log(`🚫 Risk calculation: base risk factors, modifier=${modifier}, final=${riskLevel}`);
  console.log(`🚫 Risk reasons: [${reasons.join(', ')}]`);
  
  // パス判定
  let shouldPass = false;
  let passReason = '';
  
  if (riskLevel >= 50) {
    shouldPass = true;
    passReason = 'High foul risk - emergency pass';
  } else if (riskLevel >= 35 && totalCards <= 3) {
    shouldPass = true;
    passReason = 'Moderate risk in few cards - precautionary pass';
  } else if (worstCaseScenario) {
    shouldPass = true;
    passReason = 'Worst case scenario - avoiding certain foul';
  }
  
  // 例外：必ず勝てる手がある場合はパスしない
  if (shouldPass) {
    const winningMoves = nonEightCards.filter(card => {
      const handAfterPlay = hand.filter(c => c.id !== card.id);
      return handAfterPlay.length === 0 && canWinWith([card], gameState.isRevolution);
    });
    
    if (winningMoves.length > 0) {
      shouldPass = false;
      passReason = 'Winning move available - not passing';
      console.log(`🚫 Override: winning move available with ${winningMoves.map(c => `${c.rank}${c.suit}`).join(', ')}`);
    }
  }
  
  const finalReason = passReason || `Risk level ${riskLevel} (${reasons.join(', ')})`;
  
  console.log(`🚫 Foul avoidance decision: shouldPass=${shouldPass}, risk=${riskLevel}, worst=${worstCaseScenario}`);
  console.log(`🚫 Reason: ${finalReason}`);
  
  return {
    eightCards,
    riskLevel,
    shouldPass,
    reason: finalReason,
    handAfterBestPlay: nonEightCards,
    worstCaseScenario
  };
};