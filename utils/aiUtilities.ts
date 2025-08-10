import { Card } from '../types/game';

// 🎯 ユーティリティ関数
export const groupCardsByRank = (cards: Card[]): { [rank: number]: Card[] } => {
  return cards.reduce((groups, card) => {
    if (!groups[card.rank]) {
      groups[card.rank] = [];
    }
    groups[card.rank].push(card);
    return groups;
  }, {} as { [rank: number]: Card[] });
};

// 🎯 革命可能性チェック関数
export const checkRevolutionPotential = (hand: Card[]): boolean => {
  const rankCounts = groupCardsByRank(hand);
  return Object.values(rankCounts).some(cards => cards.length >= 4);
};

// 🎯 キャラクター別選択システム
export const selectMoveWithPersonality = (
  moves: { cards: Card[], playType: string, score: number }[], 
  characterId: number,
  personalityConfigs: { [key: number]: { method: string, param: number } }
) => {
  moves.sort((a, b) => b.score - a.score);

  const config = personalityConfigs[characterId] || { method: 'softmax', param: 1.0 };

  console.log(`🎲 Character ${characterId} using ${config.method} selection (param: ${config.param})`);

  if (config.method === 'epsilon') {
    if (Math.random() < config.param) {
      const randomIndex = Math.floor(Math.random() * Math.min(moves.length, 3));
      console.log(`🎲 ε-greedy: random selection (${randomIndex})`);
      return moves[randomIndex];
    } else {
      console.log(`🎲 ε-greedy: best move selection`);
      return moves[0];
    }
  } else {
    // Softmax選択
    const temperature = config.param;
    const expScores = moves.map(move => Math.exp(move.score / temperature));
    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);
    const probabilities = expScores.map(exp => exp / sumExp);
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < moves.length; i++) {
      cumulative += probabilities[i];
      if (rand <= cumulative) {
        console.log(`🎲 Softmax: selected move ${i} (prob: ${probabilities[i].toFixed(3)})`);
        return moves[i];
      }
    }
    
    console.log(`🎲 Softmax: fallback to best move`);
    return moves[0];
  }
};

// 🎯 プレイアウトシミュレーション
export const simulatePlayouts = (
  moves: { cards: Card[], playType: string, score: number }[], 
  characterId: number,
  playoutCounts: { [key: number]: number }
): { cards: Card[], playType: string, score: number }[] => {
  
  const playoutCount = playoutCounts[characterId] || 25;
  console.log(`🎲 Running ${playoutCount} playouts for character ${characterId}`);
  
  // 簡易シミュレーション：上位候補のみ詳細評価
  const topMoves = moves.slice(0, Math.min(5, moves.length));
  
  return topMoves.map(move => {
    let simulationBonus = 0;
    
    // 基本的なシミュレーション結果を加算
    if (move.cards.length === 0) {
      simulationBonus += 500; // 即勝利
    } else if (move.cards.length <= 2) {
      simulationBonus += 200; // 勝利圏内
    }
    
    return {
      ...move,
      score: move.score + simulationBonus
    };
  }).concat(moves.slice(5)); // 下位の手はそのまま
};