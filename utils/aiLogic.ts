import { Player, GameState, GameAction, Card } from '../types/game';
import { getCharacterDialogue } from '../data/dialogues';
import { checkRevolution, check8Cut, isValidPlay, canWinWith, isValidCombination, generateJokerCombinations, hasSpadeThree, getEffectiveRank } from './gameLogic';

// Import extracted modules
import { StrategyType, MemoryState, PERSONALITY_CONFIGS, PLAYOUT_COUNTS, LOW_CARD_FIRST_RATES, COMPATIBILITY_CONFIG } from './aiConstants';
import { getMemoryInfo, calculateMemoryBonus } from './aiMemory';
import { evaluateFoulAvoidanceRisk } from './aiFoulAvoidance';
import { canExecuteEightCut } from './aiEightCut';
import { groupCardsByRank, checkRevolutionPotential, selectMoveWithPersonality, simulatePlayouts } from './aiUtilities';

// 🎯 相性補正システム
const getCompatibilityBonus = (player: Player, gameState: GameState): number => {
  const characterId = player.character.id;
  let bonus = 0;
  
  // 2主が存在するかチェック
  const has2nd = gameState.players.some(p => p.character.id === 2 && p.hand.length > 0 && !p.isFoulFinished);
  
  if (has2nd) {
    const config = COMPATIBILITY_CONFIG[characterId];
    if (config) {
      // 温存ボーナス（強カード温存時）
      const strongCards = player.hand.filter(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
      bonus += strongCards.length * config.preservation * 20;
      
      // 定石判断ボーナス
      bonus += config.strategy * 30;
      
      // しばり狙いペナルティ（4主のみ）
      if (config.suitLock && gameState.suitLock) {
        bonus += config.suitLock * 25;
      }
      
      console.log(`🤝 Compatibility bonus for ${player.character.name} vs 2主: +${bonus.toFixed(1)}`);
    }
  }
  
  return bonus;
};

// 🎯 LowCardFirst適用度システム
const getLowCardFirstScore = (cards: Card[], hand: Card[], gameState: GameState, characterId: number): number => {
  const rate = LOW_CARD_FIRST_RATES[characterId] || 0.5;
  const baseScore = evaluateLowCardFirst(cards, hand, gameState);
  const finalScore = baseScore * rate;
  
  console.log(`🎯 LowCardFirst score for ${characterId}: base=${baseScore.toFixed(1)}, rate=${rate}, final=${finalScore.toFixed(1)}`);
  return finalScore;
};

// 🃏 ジョーカー戦略評価
const evaluateJokerStrategy = (cards: Card[], hand: Card[], gameState: GameState): number => {
  let score = 0;
  
  const jokerCards = cards.filter(c => c.suit === 'joker');
  const nonJokerCards = cards.filter(c => c.suit !== 'joker');
  
  if (jokerCards.length === 0) return 0;
  
  console.log(`🃏 Joker strategy evaluation: ${jokerCards.length} jokers, ${nonJokerCards.length} normal cards`);
  
  // ジョーカー単体使用の評価
  if (cards.length === 1 && jokerCards.length === 1) {
    // 相手がスペードの3を持っている可能性を考慮
    const opponentsCount = gameState.players.filter(p => p.hand.length > 0 && p.id !== hand[0]?.id).length;
    if (opponentsCount > 0) {
      score -= 30; // スペードの3対抗リスク
      console.log(`🃏 Joker single: Spade 3 risk penalty -30`);
    }
    
    // 緊急時（手札が少ない）なら使用OK
    if (hand.length <= 3) {
      score += 50; // 緊急時ボーナス
      console.log(`🃏 Joker single: Emergency bonus +50`);
    }
  }
  
  // ジョーカー組み合わせ使用の評価
  if (jokerCards.length > 0 && nonJokerCards.length > 0) {
    const effectiveRank = getEffectiveRank(cards);
    
    // 弱いカードとの組み合わせは高評価
    if (effectiveRank >= 3 && effectiveRank <= 7) {
      score += jokerCards.length * 60; // 弱カード組み合わせボーナス
      console.log(`🃏 Joker combination: Weak card combo bonus +${jokerCards.length * 60}`);
    }
    // 中程度のカードとの組み合わせは中評価
    else if (effectiveRank >= 8 && effectiveRank <= 10) {
      score += jokerCards.length * 40; // 中カード組み合わせボーナス
      console.log(`🃏 Joker combination: Mid card combo bonus +${jokerCards.length * 40}`);
    }
    // 強いカードとの組み合わせは低評価（もったいない）
    else if (effectiveRank >= 11 || effectiveRank === 1 || effectiveRank === 2) {
      score += jokerCards.length * 20; // 強カード組み合わせ（控えめ）
      console.log(`🃏 Joker combination: Strong card combo (cautious) +${jokerCards.length * 20}`);
    }
    
    // 革命の場合は特別評価
    if (cards.length === 4 && checkRevolution(cards)) {
      score += 100; // 革命ボーナス
      console.log(`🃏 Joker combination: Revolution bonus +100`);
    }
  }
  
  // ジョーカー温存価値の評価
  const remainingJokers = hand.filter(c => c.suit === 'joker').length - jokerCards.length;
  if (remainingJokers > 0) {
    score += remainingJokers * 25; // ジョーカー温存価値
    console.log(`🃏 Joker preservation: ${remainingJokers} jokers preserved +${remainingJokers * 25}`);
  }
  
  return score;
};

// ♠3 対抗戦略評価
const evaluateSpadeThreeStrategy = (cards: Card[], hand: Card[], gameState: GameState): number => {
  let score = 0;
  
  // プレイするカードがスペードの3の場合
  if (cards.length === 1 && cards[0].suit === 'spades' && cards[0].rank === 3) {
    // 場にジョーカーが単体で出ている場合は高評価
    if (gameState.field.length === 1 && gameState.field[0].suit === 'joker') {
      score += 150; // ジョーカー対抗ボーナス
      console.log(`♠3 Spade 3 vs Joker: Counter attack bonus +150`);
      
      // 場を流すことで主導権を握れる
      score += 50; // 主導権ボーナス
      console.log(`♠3 Spade 3 vs Joker: Initiative bonus +50`);
    }
  }
  
  // 手札にスペードの3がある場合の保持価値
  if (hasSpadeThree(hand) && !cards.some(c => c.suit === 'spades' && c.rank === 3)) {
    // ジョーカーが場に出る可能性に備えて温存価値
    score += 20; // スペードの3温存価値
    console.log(`♠3 Spade 3 preservation: Anti-joker value +20`);
  }
  
  return score;
};

// 🎯 基本定石LowCardFirst評価
const evaluateLowCardFirst = (cards: Card[], hand: Card[], gameState: GameState): number => {
  let score = 0;
  
  // 🎴 八切りチェック（反則負け対策強化版）
  if (check8Cut(cards)) {
    const eightCutEvaluation = evaluateEightCutInLowCardFirst(cards, hand, gameState);
    console.log(`🎴 Eight cut in LowCardFirst: ${eightCutEvaluation.score} (${eightCutEvaluation.reason})`);
    return eightCutEvaluation.score;
  }
  
  // ジョーカー戦略評価
  score += evaluateJokerStrategy(cards, hand, gameState);
  
  // スペードの3戦略評価
  score += evaluateSpadeThreeStrategy(cards, hand, gameState);
  
  // 強カード（A, 2, Joker）は温存したい（ジョーカー組み合わせ除く）
  const strongCards = cards.filter(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
  const jokerCards = cards.filter(c => c.suit === 'joker');
  const pureStrongCards = strongCards.filter(c => c.suit !== 'joker');
  
  if (pureStrongCards.length > 0) {
    score -= pureStrongCards.length * 50; // 強カード使用ペナルティ
    console.log(`🎯 LowCardFirst: Strong card penalty -${pureStrongCards.length * 50}`);
  }
  
  // 弱カード（3-7、9-10）優先
  const weakCards = cards.filter(c => 
    (c.rank >= 3 && c.rank <= 7) || (c.rank >= 9 && c.rank <= 10)
  );
  if (weakCards.length > 0) {
    score += weakCards.length * 40; // 弱カード使用ボーナス
    console.log(`🎯 LowCardFirst: Weak card bonus +${weakCards.length * 40}`);
  }
  
  // より弱い数字を優先（3が一番弱い）
  const nonJokerCards = cards.filter(c => c.suit !== 'joker');
  if (nonJokerCards.length > 0) {
    const averageRank = nonJokerCards.reduce((sum, c) => sum + c.rank, 0) / nonJokerCards.length;
    const weaknessBonus = Math.max(0, (7 - averageRank) * 10); // 7以下なら追加ボーナス
    score += weaknessBonus;
    console.log(`🎯 LowCardFirst: Weakness bonus +${weaknessBonus.toFixed(1)} (avg rank: ${averageRank.toFixed(1)})`);
  }
  
  // 手札事故防止：強カードが手札に多く残る場合は追加ボーナス
  const handAfterPlay = hand.filter(card => !cards.some(c => c.id === card.id));
  const remainingStrongCards = handAfterPlay.filter(c => c.rank === 14 || c.rank === 2 || c.rank === 1);
  if (remainingStrongCards.length >= 2) {
    score += 30; // 強カード温存ボーナス
    console.log(`🎯 LowCardFirst: Strong card preservation bonus +30`);
  }
  
  return score;
};

// 🎴 八切りのLowCardFirst内評価
const evaluateEightCutInLowCardFirst = (cards: Card[], hand: Card[], gameState: GameState): { score: number, reason: string } => {
  // 仮のプレイヤー情報を作成（関数呼び出し用）
  const tempPlayer: Player = {
    id: -1,
    character: { id: 1, name: 'temp', color: '#000000' } as any,
    hand: hand,
    isHuman: false,
    position: 'bottom-left',
    expression: 'normal',
    message: '',
    messageType: 'normal',
    lastAction: undefined,
    isFoulFinished: false
  };
  
  // 記憶情報を取得（簡易版）
  const memory: MemoryState = {
    highCards: [],
    midCards: [],
    suitFlowHistory: [],
    revolutionSigns: 0,
    playerStyles: {}
  };
  
  // 八切り実行条件をチェック
  const eightCutCheck = canExecuteEightCut(tempPlayer, gameState, memory);
  
  if (eightCutCheck.canExecute) {
    let baseScore = 150;
    let bonusScore = 0;
    
    // 緊急時の大幅ボーナス
    if (eightCutCheck.isEmergency) {
      bonusScore += 100;
      console.log(`🎴 Emergency eight cut bonus: +100`);
    }
    
    // 勝率が高い場合の追加ボーナス
    if (eightCutCheck.winProbability && eightCutCheck.winProbability >= 60) {
      bonusScore += 60;
    } else if (eightCutCheck.winProbability && eightCutCheck.winProbability >= 40) {
      bonusScore += 40;
    } else if (eightCutCheck.winProbability && eightCutCheck.winProbability >= 20) {
      bonusScore += 20;
    }
    
    // 手札枚数による緊急ボーナス
    if (hand.length <= 5) {
      bonusScore += 80;
      console.log(`🎴 Low hand count emergency bonus: +80`);
    } else if (hand.length <= 7) {
      bonusScore += 50;
      console.log(`🎴 Medium hand count bonus: +50`);
    }
    
    const finalScore = baseScore + bonusScore;
    console.log(`🎴 Valid eight cut: base=${baseScore}, bonus=${bonusScore}, final=${finalScore}, reason="${eightCutCheck.reason}"`);
    return { score: finalScore, reason: `Valid: ${eightCutCheck.reason}` };
  } else {
    // 八切りが不適切な場合：減点（緩和版：ペナルティを軽減）
    let penaltyScore = -100;
    
    // 手札枚数による緩和
    if (hand.length <= 7) {
      penaltyScore = -50;
      console.log(`🎴 Eight cut penalty reduced for low hand count: ${penaltyScore}`);
    } else if (hand.length <= 9) {
      penaltyScore = -75;
      console.log(`🎴 Eight cut penalty reduced for medium hand count: ${penaltyScore}`);
    }
    
    console.log(`🎴 Invalid eight cut: penalty=${penaltyScore}, reason="${eightCutCheck.reason}"`);
    return { score: penaltyScore, reason: `Invalid: ${eightCutCheck.reason}` };
  }
};

// ここで他の戦略評価、キャラクター評価、AI思考ロジックの残りの部分を継続...
// 🎯 AI思考ロジック（メイン関数）
export const getAIAction = (player: Player, gameState: GameState): GameAction => {
  console.log(`🤖 Advanced AI thinking for ${player.character.name} (ID: ${player.character.id}) with enhanced foul prevention`);
  
  // 🚫 最優先：反則負け回避チェック
  const foulRisk = evaluateFoulAvoidanceRisk(player, gameState);
  if (foulRisk.shouldPass) {
    console.log(`🚫 FOUL AVOIDANCE: ${player.character.name} choosing to pass - ${foulRisk.reason}`);
    return { type: 'pass', cards: [], playType: 'pass' };
  } else if (foulRisk.riskLevel >= 25) {
    console.log(`🚫 MODERATE FOUL RISK: ${player.character.name} risk level ${foulRisk.riskLevel} - ${foulRisk.reason}`);
  }
  
  // 記憶システム
  const memory = getMemoryInfo(player, gameState);
  
  // 手札分析
  const hand = player.hand;
  const field = gameState.field;
  const isRevolution = gameState.isRevolution;
  const lastPlayCount = gameState.lastPlayCount;
  const lastPlayType = gameState.lastPlayType;
  const suitLock = gameState.suitLock;

  // 全ての合法手を生成
  const legalMoves = generateLegalMoves(hand, field, lastPlayType, lastPlayCount, isRevolution, suitLock);
  
  if (legalMoves.length === 0) {
    return { type: 'pass', cards: [], playType: 'pass' };
  }

  // 手の評価（基本評価のみ）
  let evaluatedMoves = legalMoves.map(move => {
    let score = 0;
    
    // LowCardFirst評価
    score += getLowCardFirstScore(move.cards, player.hand, gameState, player.character.id);
    
    // 記憶活用ボーナス
    score += calculateMemoryBonus(move.cards, memory, player.character.id);
    
    // 相性補正
    score += getCompatibilityBonus(player, gameState);
    
    // 反則上がり回避
    const handAfterPlay = hand.filter(card => !move.cards.some(c => c.id === card.id));
    if (handAfterPlay.length === 0 && !canWinWith(move.cards, isRevolution)) {
      score -= 1000;
      console.log(`🚫 Foul finish penalty: -1000`);
    }

    // 8残りリスク評価
    if (move.cards.some(c => c.rank === 8)) {
      const remainingEights = handAfterPlay.filter(c => c.rank === 8);
      if (remainingEights.length > 0 && handAfterPlay.length <= 3) {
        const riskPenalty = remainingEights.length * handAfterPlay.length * 50;
        score -= riskPenalty;
        console.log(`🚫 Eight remaining risk penalty: -${riskPenalty}`);
      }
    }

    return { ...move, score };
  });

  // プレイアウトシミュレーション（上級キャラクターのみ）
  if ([1, 3, 10, 11].includes(player.character.id)) {
    evaluatedMoves = simulatePlayouts(evaluatedMoves, player.character.id, PLAYOUT_COUNTS);
  }

  // スコアでソート
  evaluatedMoves.sort((a, b) => b.score - a.score);

  // 最終安全チェック：上位の手でも反則負けリスクが高い場合はパス
  const bestMove = evaluatedMoves[0];
  if (bestMove) {
    const handAfterBestMove = hand.filter(card => !bestMove.cards.some(c => c.id === card.id));
    const finalEightCheck = evaluateFoulAvoidanceRisk({
      ...player,
      hand: handAfterBestMove
    }, gameState);
    
    if (finalEightCheck.shouldPass && finalEightCheck.riskLevel >= 60) {
      console.log(`🚫 FINAL SAFETY CHECK: ${player.character.name} choosing to pass instead of risky move - ${finalEightCheck.reason}`);
      return { type: 'pass', cards: [], playType: 'pass' };
    }
  }

  // キャラクター別ランダム性の導入
  const selectedMove = selectMoveWithPersonality(evaluatedMoves, player.character.id, PERSONALITY_CONFIGS);

  console.log(`🤖 ${player.character.name} selected: ${selectedMove.cards.map(c => `${c.rank}${c.suit}`).join(', ')} (score: ${selectedMove.score}) - with enhanced foul prevention`);

  return {
    type: 'play',
    cards: selectedMove.cards,
    playType: selectedMove.playType
  };
};

// 🎯 合法手生成
const generateLegalMoves = (
  hand: Card[], 
  field: Card[], 
  lastPlayType: string | null, 
  lastPlayCount: number, 
  isRevolution: boolean, 
  suitLock: string | null
): { cards: Card[], playType: string }[] => {
  const moves: { cards: Card[], playType: string }[] = [];

  // 1枚出し
  hand.forEach(card => {
    if (isValidPlay([card], field, lastPlayType, lastPlayCount, isRevolution, suitLock as any)) {
      moves.push({ cards: [card], playType: 'single' });
    }
  });

  // 通常のペア・トリプル・革命
  const rankGroups = groupCardsByRank(hand);
  Object.values(rankGroups).forEach(cards => {
    if (cards.length >= 2) {
      // ペア
      const pairCombination = cards.slice(0, 2);
      if (isValidPlay(pairCombination, field, lastPlayType, lastPlayCount, isRevolution, suitLock as any)) {
        moves.push({ cards: pairCombination, playType: 'pair' });
      }
      
      // トリプル
      if (cards.length >= 3) {
        const tripleCombination = cards.slice(0, 3);
        if (isValidPlay(tripleCombination, field, lastPlayType, lastPlayCount, isRevolution, suitLock as any)) {
          moves.push({ cards: tripleCombination, playType: 'triple' });
        }
      }
      
      // 革命（同数字4枚）
      if (cards.length === 4) {
        if (field.length === 0 || lastPlayCount === 4) {
          moves.push({ cards, playType: 'revolution' });
        }
      }
    }
  });

  // ジョーカー組み合わせ
  const jokerCombinations = generateJokerCombinations(hand);
  jokerCombinations.forEach(combination => {
    const { isValid, type } = isValidCombination(combination);
    if (isValid && isValidPlay(combination, field, lastPlayType, lastPlayCount, isRevolution, suitLock as any)) {
      moves.push({ cards: combination, playType: type });
    }
  });

  // ストレート（階段）
  const suitGroups: { [suit: string]: Card[] } = {};
  hand.filter(card => card.suit !== 'joker').forEach(card => {
    if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
    suitGroups[card.suit].push(card);
  });

  Object.values(suitGroups).forEach(suitCards => {
    if (suitCards.length >= 3) {
      suitCards.sort((a, b) => a.rank - b.rank);
      
      for (let i = 0; i <= suitCards.length - 3; i++) {
        for (let length = 3; length <= suitCards.length - i; length++) {
          const straightCards = suitCards.slice(i, i + length);
          
          let isConsecutive = true;
          for (let j = 1; j < straightCards.length; j++) {
            if (straightCards[j].rank !== straightCards[j-1].rank + 1) {
              isConsecutive = false;
              break;
            }
          }
          
          if (isConsecutive && isValidPlay(straightCards, field, lastPlayType, lastPlayCount, isRevolution, suitLock as any)) {
            moves.push({ cards: straightCards, playType: 'straight' });
          }
        }
      }
    }
  });

  console.log(`🎯 Generated ${moves.length} legal moves (enhanced foul prevention)`);
  return moves;
};

// 🎭 AI表情更新関数（ExpressionImage.tsx準拠・統一ルール版）
export const updateAIExpression = (player: Player, gameState: GameState): string => {
  const characterId = player.character.id;
  const handCount = player.hand.length;
  const activePlayers = gameState.players.filter(p => p.hand.length > 0 && !p.isFoulFinished).length;
  
  console.log(`🎭 updateAIExpression for ${player.character.name} (ID: ${characterId}): handCount=${handCount}, activePlayers=${activePlayers}`);

  // 利用可能な表情タイプ: "normal", "happy", "angry", "surprised", "frustrated", "excited", "confident", "thinking", "worried", "nervous"

  // ゲーム終了状況の特別処理
  if (gameState.gamePhase === 'finished') {
    console.log(`🎭 Game finished state - skipping expression update for ${player.character.name}`);
    return player.expression || 'normal';
  }

  // 緊急状況（残り2人決定時）は全キャラクター共通で焦り表情
  if (activePlayers === 2 && handCount > 0) {
    console.log(`🎭 Final two players - ${player.character.name} showing frustrated expression`);
    return 'frustrated';
  }

  // 手札枚数による基本的な表情制御（全キャラクター共通ベース）
  if (handCount === 0) {
    console.log(`🎭 ${player.character.name} finished - maintaining current expression`);
    return player.expression || 'normal';
  } else if (handCount === 1) {
    console.log(`🎭 ${player.character.name} reach (1 card) - confident expression`);
    return 'confident';
  } else if (handCount === 2) {
    console.log(`🎭 ${player.character.name} nearly reach (2 cards) - excited expression`);
    return 'excited';
  }

  // 🎭 Neutral連続防止システム（全キャラクター共通）
  // normalが返される可能性がある場合、thinking表情を適宜挟む
  const shouldMixThinking = (): boolean => {
    // 現在の表情がneutral（またはnormal）かチェック
    const currentExpr = player.expression;
    const isCurrentNeutral = (currentExpr === 'neutral' || currentExpr === 'normal' || !currentExpr);
    
    // 時間ベースと手札数ベースの疑似ランダムでthinkingタイミングを決定
    const timeBasedSeed = Math.floor(Date.now() / 3000); // 3秒ごとに変化
    const handBasedSeed = handCount + characterId;
    const combinedSeed = (timeBasedSeed + handBasedSeed + player.id) % 10;
    
    // 現在neutralなら90%の確率でthinking、そうでなければ35%の確率
    const thinkingProbability = isCurrentNeutral ? 9 : 3.5;
    const shouldThink = combinedSeed < thinkingProbability;
    
    if (shouldThink) {
      console.log(`🎭 Mixing thinking expression for ${player.character.name} (neutral prevention: ${isCurrentNeutral})`);
      return true;
    }
    return false;
  };

  // キャラクター別性格表現（ExpressionImage.tsx対応）
  switch (characterId) {
    case 1: // 1主 - 冷静で戦略的
      if (handCount >= 10) {
        console.log(`🎭 1主 many cards - thinking expression`);
        return 'thinking';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 1主 default - normal expression`);
      return 'normal';

    case 2: // 2主 - やんちゃで直感的
      if (handCount <= 4) {
        console.log(`🎭 2主 few cards - excited expression`);
        return 'excited';
      }
      if (Math.random() < 0.3) {
        console.log(`🎭 2主 random excitement`);
        return 'excited';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 2主 default - normal expression`);
      return 'normal';

    case 3: // 3主 - 理知的
      if (handCount >= 10) {
        console.log(`🎭 3主 many cards - thinking expression`);
        return 'thinking';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 3主 default - normal expression`);
      return 'normal';

    case 4: // 4主 - 慎重で臆病
      if (handCount >= 9) {
        console.log(`🎭 4主 many cards - frustrated expression`);
        return 'frustrated';
      }
      if (handCount >= 6) {
        console.log(`🎭 4主 moderate cards - thinking expression`);
        return 'thinking';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 4主 default - normal expression`);
      return 'normal';

    case 5: // 5主 - 享楽的
      if (Math.random() < 0.2) {
        console.log(`🎭 5主 random happiness`);
        return 'happy';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 5主 default - normal expression`);
      return 'normal';

    case 6: // 6主 - ノリ重視
      if (handCount <= 5) {
        console.log(`🎭 6主 few cards - excited expression`);
        return 'excited';
      }
      if (Math.random() < 0.3) {
        console.log(`🎭 6主 random confidence`);
        return 'confident';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 6主 default - normal expression`);
      return 'normal';

    case 7: // 7主 - 素直で幸運
      if (handCount >= 10) {
        console.log(`🎭 7主 many cards - frustrated expression`);
        return 'frustrated';
      }
      if (handCount <= 4) {
        console.log(`🎭 7主 few cards - happy expression`);
        return 'happy';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 7主 default - normal expression`);
      return 'normal';

    case 8: // 8主 - 運と流れ（表情豊かさ強化版）
      // 🎭 ８主専用の豊かな表情バリエーション
      if (handCount <= 4) {
        console.log(`🎭 8主 few cards - excited expression`);
        return 'excited';
      }
      
      if (handCount >= 9) {
        // 手札が多い時は考え中とnormalを織り交ぜ
        const shouldThink = (player.id + handCount + Date.now()) % 10 < 6; // 60%でthinking
        if (shouldThink) {
          console.log(`🎭 8主 many cards - thinking expression (variation)`);
          return 'thinking';
        } else {
          // neutral防止システム適用
          if (shouldMixThinking()) {
            return 'thinking';
          }
          console.log(`🎭 8主 many cards - normal expression (variation)`);
          return 'normal';
        }
      }
      
      // 中程度の手札（5-8枚）での豊かな表情バリエーション
      if (handCount >= 5 && handCount <= 8) {
        const expressionRoll = (player.id + handCount + Math.floor(Date.now() / 1000)) % 10;
        if (expressionRoll < 3) { // 30%
          console.log(`🎭 8主 moderate cards - thinking expression`);
          return 'thinking';
        } else if (expressionRoll < 5) { // 20%
          console.log(`🎭 8主 moderate cards - happy expression`);
          return 'happy';
        } else { // 50%
          // neutral防止システム適用
          if (shouldMixThinking()) {
            return 'thinking';
          }
          console.log(`🎭 8主 moderate cards - normal expression`);
          return 'normal';
        }
      }
      
      // デフォルトでも少しバリエーション
      const defaultRoll = (player.id + Math.floor(Date.now() / 2000)) % 10;
      if (defaultRoll < 2) { // 20%
        console.log(`🎭 8主 default variation - thinking expression`);
        return 'thinking';
      } else if (defaultRoll < 4) { // 20%
        console.log(`🎭 8主 default variation - happy expression`);
        return 'happy';
      } else { // 60%
        // neutral防止システム適用
        if (shouldMixThinking()) {
          return 'thinking';
        }
        console.log(`🎭 8主 default - normal expression`);
        return 'normal';
      }

    case 9: // 9主 - 派手で革命愛
      if (handCount <= 4) {
        console.log(`🎭 9主 few cards - excited expression`);
        return 'excited';
      }
      if (Math.random() < 0.35) {
        console.log(`🎭 9主 random confidence`);
        return 'confident';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 9主 default - normal expression`);
      return 'normal';

    case 10: // 10主 - 総合力高い
      if (handCount >= 10) {
        console.log(`🎭 10主 many cards - thinking expression`);
        return 'thinking';
      }
      if (handCount <= 4) {
        console.log(`🎭 10主 few cards - confident expression`);
        return 'confident';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 10主 default - normal expression`);
      return 'normal';

    case 11: // 11主 - 静かな勝負師
      if (activePlayers <= 3) {
        console.log(`🎭 11主 endgame - thinking expression`);
        return 'thinking';
      }
      if (handCount <= 4) {
        console.log(`🎭 11主 few cards - confident expression`);
        return 'confident';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 11主 default - normal expression`);
      return 'normal';

    default:
      if (handCount >= 10) {
        console.log(`🎭 Unknown character many cards - frustrated expression`);
        return 'frustrated';
      }
      if (handCount <= 4) {
        console.log(`🎭 Unknown character few cards - confident expression`);
        return 'confident';
      }
      // neutral防止システム適用
      if (shouldMixThinking()) {
        return 'thinking';
      }
      console.log(`🎭 Unknown character default - normal expression`);
      return 'normal';
  }
};

// AIメッセージ生成関数
export const getAIMessage = (player: Player, action: GameAction, gameState: GameState): string => {
  const characterId = player.character.id;
  const characterName = player.character.name;
  
  console.log(`💬 Getting AI message for character ${characterId} (${characterName}), action: ${action.type}`);
  
  if (action.type === 'pass') {
    return getCharacterDialogue(characterId, 'pass');
  } else {
    let messageCategory: keyof typeof import('../data/dialogues').DIALOGUES;
    
    // スペードの3対ジョーカー特殊ルール
    if (action.cards.length === 1 && action.cards[0].suit === 'spades' && action.cards[0].rank === 3 &&
        gameState.field.length === 1 && gameState.field[0].suit === 'joker') {
      messageCategory = 'normalPlay';
      console.log(`💬 Character ${characterId} Spade 3 vs Joker special play`);
    }
    // ジョーカー組み合わせ
    else if (action.cards.some(card => card.suit === 'joker') && action.cards.length > 1) {
      if (checkRevolution(action.cards)) {
        messageCategory = 'revolution';
      } else {
        messageCategory = 'normalPlay';
      }
      console.log(`💬 Character ${characterId} joker combination play`);
    }
    // 革命
    else if (checkRevolution(action.cards)) {
      messageCategory = 'revolution';
    }
    // 8切り
    else if (check8Cut(action.cards)) {
      messageCategory = 'eightCut';
    }
    // ジョーカー単体
    else if (action.cards.some(card => card.suit === 'joker')) {
      messageCategory = 'normalPlay';
    }
    // ストレート
    else if (action.cards.length >= 3 && action.playType === 'straight') {
      messageCategory = 'straight';
    }
    // 通常プレイ
    else {
      messageCategory = 'normalPlay';
    }
    
    console.log(`💬 Character ${characterId} message category: ${messageCategory}`);
    return getCharacterDialogue(characterId, messageCategory);
  }
};

// 反応メッセージ生成関数（dialogues.tsベース）
export const getReactionMessage = (player: Player, reactionType: string): string => {
  const characterId = player.character.id;
  const characterName = player.character.name;
  
  console.log(`💬 Getting reaction message for character ${characterId} (${characterName}), type: ${reactionType}`);
  
  try {
    const message = getCharacterDialogue(characterId, reactionType as any);
    console.log(`💬 ✅ Successfully got message for ${characterName}: "${message}"`);
    return message;
  } catch (error) {
    console.error(`💬 ❌ Failed to get dialogue for character ${characterId} (${characterName}), type ${reactionType}:`, error);
    
    // フォールバック用デフォルトメッセージ
    const defaultMessages: { [key: string]: string } = {
      'pass': 'パス',
      'normalPlay': `...`,
      'straight': 'これで！',
      'revolution': '革命！',
      'eightCut': '８切り！',
      'reactToEightCut': 'うわー！',
      'reactToJoker': 'やられた！',
      'reactToTwo': 'きつい...',
      'reactToStrong': 'すごい！',
      'winAsRich': 'やったー！',
      'winNormal': '上がり！',
      'loseAsPoor': 'くそー！',
      'foulPlay': 'しまった...',
      'fewCardsOwn': 'もう少し！',
      'fewCardsOther': 'やるな！',
      'suitLock': '縛り！',
      'fieldClear': 'よし！',
      'fieldClearOther': 'なるほど',
      'afterWinRich': '気分いい！',
      'afterWinNormal': 'ほっとした',
      'afterFoul': '応援する',
      'gameStart': 'よろしく！',
      'selfEightCut': '八切り成功！',
      'selfRevolution': '革命成功！',
      'selfStrongSingle': '強いカード！',
      'selfLastOne': 'あと一枚！',
      'selfSpadeThree': 'スペード3！',
      'selfPlayFail': '失敗...',
      'nervous': 'ピンチ...',
      'disappointed': '残念...'
    };
    
    const fallbackMessage = defaultMessages[reactionType] || `...`;
    console.log(`💬 Using fallback message for ${characterName}: "${fallbackMessage}"`);
    return fallbackMessage;
  }
};