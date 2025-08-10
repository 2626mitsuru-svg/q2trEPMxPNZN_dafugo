import { Player, GameState } from '../types/game';
import { MemoryState, MEMORY_CONFIG } from './aiConstants';

// 🧠 記憶情報取得システム
export const getMemoryInfo = (player: Player, gameState: GameState): MemoryState => {
  const characterId = player.character.id;
  
  const config = MEMORY_CONFIG[characterId] || { 
    probability: 0.3, 
    tendencies: ['HighCard'],
    level: 'low',
    usage: 'basic'
  };
  
  const memorySuccess = Math.random() < config.probability;

  console.log(`🧠 Memory check for ${player.character.name}: success=${memorySuccess} (${config.probability}), level=${config.level}, tendencies=[${config.tendencies.join(', ')}], usage=${config.usage}`);

  // 記憶に失敗した場合は空の情報を返す
  if (!memorySuccess) {
    return {
      highCards: [],
      midCards: [],
      suitFlowHistory: [],
      revolutionSigns: 0,
      playerStyles: {}
    };
  }

  // プレイ履歴から記憶傾向に応じた情報を抽出
  const memory: MemoryState = {
    highCards: [],
    midCards: [],
    suitFlowHistory: [],
    revolutionSigns: 0,
    playerStyles: {}
  };

  // HighCard記憶：Joker/2/Aの出現
  if (config.tendencies.includes('HighCard')) {
    memory.highCards = gameState.playHistory
      .flatMap(h => h.cards)
      .filter(card => card.rank === 14 || card.rank === 2 || card.rank === 1);
    console.log(`🧠 HighCard memory: ${memory.highCards.length} high cards observed`);
  }

  // MidCard記憶：5-10の出現
  if (config.tendencies.includes('MidCard')) {
    memory.midCards = gameState.playHistory
      .flatMap(h => h.cards)
      .filter(card => card.rank >= 5 && card.rank <= 10);
    console.log(`🧠 MidCard memory: ${memory.midCards.length} mid cards observed`);
  }

  // SuitFlow記憶：マークの流れ
  if (config.tendencies.includes('SuitFlow')) {
    memory.suitFlowHistory = gameState.playHistory
      .filter(h => h.cards.length > 0 && h.cards[0].suit !== 'joker')
      .map(h => h.cards[0].suit);
    console.log(`🧠 SuitFlow memory: [${memory.suitFlowHistory.slice(-3).join(', ')}] recent suits`);
  }

  // RevolutionSigns記憶：複数枚出現頻度
  if (config.tendencies.includes('RevolutionSigns')) {
    memory.revolutionSigns = gameState.playHistory
      .reduce((count, h) => {
        if (h.cards.length >= 2) {
          const firstRank = h.cards[0].rank;
          const sameRankCount = h.cards.filter(c => c.rank === firstRank).length;
          return count + (sameRankCount >= 2 ? 1 : 0);
        }
        return count;
      }, 0);
    console.log(`🧠 RevolutionSigns memory: ${memory.revolutionSigns} multiple card patterns observed`);
  }

  // PlayerStyle記憶：他プレイヤーの傾向分析
  if (config.tendencies.includes('PlayerStyle')) {
    gameState.players.forEach(p => {
      if (p.id !== player.id) {
        const playerActions = gameState.playHistory.filter(h => h.playerId === p.id);
        if (playerActions.length >= 2) {
          const aggressiveActions = playerActions.filter(a => 
            a.cards.length >= 2 || a.cards.some(c => c.rank === 14 || c.rank === 2)
          ).length;
          
          if (aggressiveActions > playerActions.length / 2) {
            memory.playerStyles[p.id] = 'aggressive';
          } else {
            memory.playerStyles[p.id] = 'conservative';
          }
        }
      }
    });
    console.log(`🧠 PlayerStyle memory: ${Object.entries(memory.playerStyles).map(([id, style]) => `${id}:${style}`).join(', ')}`);
  }

  return memory;
};

// 🧠 記憶活用ボーナス
export const calculateMemoryBonus = (cards: any[], memory: MemoryState, characterId: number): number => {
  let bonus = 0;

  // 強カード記憶活用（1主、3主、4主、8主、10主、11主）
  if ([1, 3, 4, 8, 10, 11].includes(characterId) && memory.highCards.length > 6) {
    const strongCards = cards.filter(c => c.rank === 14 || c.rank === 2);
    const jokerCards = cards.filter(c => c.suit === 'joker');
    
    if (strongCards.length > 0) {
      if (jokerCards.length > 0 && strongCards.length > jokerCards.length) {
        bonus += 20;
        console.log(`🧠 HighCard memory bonus (joker combo): +20`);
      } else {
        bonus += 30;
        console.log(`🧠 HighCard memory bonus: +30`);
      }
    }
    
    // スペードの3対抗戦略の記憶活用
    if (cards.length === 1 && cards[0].suit === 'spades' && cards[0].rank === 3) {
      bonus += 25;
      console.log(`🧠 Spade 3 memory bonus: +25`);
    }
  }

  // 革命サイン記憶活用（2主、4主、7主、9主）
  if ([2, 4, 7, 9].includes(characterId) && memory.revolutionSigns >= 2) {
    if (cards.length === 4 && cards.every(c => c.rank === cards[0].rank)) {
      bonus += 40;
      console.log(`🧠 RevolutionSigns memory bonus: +40`);
    }
  }

  // マーク縛り記憶活用（1主、3主、5主、8主、10主）
  if ([1, 3, 5, 8, 10].includes(characterId) && memory.suitFlowHistory.length >= 3) {
    const lastSuits = memory.suitFlowHistory.slice(-2);
    if (lastSuits[0] === lastSuits[1] && cards[0].suit === lastSuits[0]) {
      bonus += 25;
      console.log(`🧠 SuitFlow memory bonus: +25`);
    }
  }

  return bonus;
};