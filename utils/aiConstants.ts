import { Card } from '../types/game';

// 🎯 定石タイプの定義
export type StrategyType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'LowCardFirst';

// 🧠 記憶システムの型定義
export interface MemoryState {
  highCards: Card[]; // ジョーカー、2、Aの出現記録
  midCards: Card[]; // 5-10の出現記録
  suitFlowHistory: string[]; // マークの流れ履歴
  revolutionSigns: number; // 同数字複数枚の出現頻度
  playerStyles: { [playerId: number]: string }; // 他プレイヤーの傾向
}

// 🚫 反則負け回避システムの型定義
export interface FoulAvoidanceInfo {
  eightCards: Card[]; // 手札の8
  riskLevel: number; // リスクレベル（0-100）
  shouldPass: boolean; // パスすべきかどうか
  reason: string; // 判断理由
  handAfterBestPlay: Card[]; // 最適プレイ後の手札
  worstCaseScenario: boolean; // 最悪ケース（8しか残らない）
}

// 🧠 キャラクター別記憶力設定
export const MEMORY_CONFIG: { [key: number]: { 
  probability: number, 
  tendencies: string[],
  level: string,
  usage: string 
} } = {
  1: { 
    probability: 0.5, 
    tendencies: ['HighCard', 'SuitFlow'],
    level: 'normal',
    usage: 'balanced'
  },
  2: { 
    probability: 0.2,
    tendencies: ['RevolutionSigns'],
    level: 'very_low',
    usage: 'aggressive'
  },
  3: { 
    probability: 0.95,
    tendencies: ['HighCard', 'RevolutionSigns', 'SuitFlow', 'PlayerStyle'],
    level: 'very_high',
    usage: 'analytical'
  },
  4: { 
    probability: 0.75,
    tendencies: ['HighCard', 'RevolutionSigns'],
    level: 'high',
    usage: 'defensive'
  },
  5: { 
    probability: 0.4,
    tendencies: ['SuitFlow', 'MidCard'],
    level: 'low',
    usage: 'hedonistic'
  },
  6: { 
    probability: 0.1,
    tendencies: [],
    level: 'very_low',
    usage: 'none'
  },
  7: { 
    probability: 0.4,
    tendencies: ['SuitFlow'],
    level: 'low',
    usage: 'basic'
  },
  8: { 
    probability: 0.8, 
    tendencies: ['HighCard', 'SuitFlow', 'MidCard'],
    level: 'very_high',
    usage: 'instinct'
  },
  9: { 
    probability: 0.3,
    tendencies: ['RevolutionSigns', 'HighCard'],
    level: 'low',
    usage: 'experimental'
  },
  10: { 
    probability: 0.85,
    tendencies: ['HighCard', 'SuitFlow', 'PlayerStyle', 'MidCard'],
    level: 'high',
    usage: 'tactical'
  },
  11: { 
    probability: 0.5, 
    tendencies: ['HighCard', 'PlayerStyle'],
    level: 'normal',
    usage: 'endgame'
  }
};

// 🎯 LowCardFirst適用度
export const LOW_CARD_FIRST_RATES: { [key: number]: number } = {
  1: 0.70,   // 1主：中（70%）
  2: 0.30,   // 2主：低（30%）
  3: 0.90,   // 3主：高（90%）
  4: 0.70,   // 4主：中（70%）
  5: 0.60,   // 5主：中（60%）
  6: 0.10,   // 6主：極低（10%）
  7: 0.80,   // 7主：中〜高（80%）
  8: 0.90,   // 8主：高（90%）
  9: 0.30,   // 9主：低（30%）
  10: 0.85,  // 10主：高（85%）
  11: 0.80   // 11主：高（80%）
};

// 🎯 キャラクター別八切り傾向
export const EIGHT_CUT_TENDENCIES: { [key: number]: { 
  minHandCount: number, 
  minHandCountRelaxed: number,
  aggressive: boolean, 
  strategic: boolean 
} } = {
  1: { minHandCount: 8, minHandCountRelaxed: 9, aggressive: false, strategic: true },
  2: { minHandCount: 9, minHandCountRelaxed: 10, aggressive: true, strategic: false },
  3: { minHandCount: 7, minHandCountRelaxed: 8, aggressive: false, strategic: true },
  4: { minHandCount: 8, minHandCountRelaxed: 9, aggressive: false, strategic: true },
  5: { minHandCount: 8, minHandCountRelaxed: 9, aggressive: true, strategic: false },
  6: { minHandCount: 9, minHandCountRelaxed: 10, aggressive: true, strategic: false },
  7: { minHandCount: 8, minHandCountRelaxed: 9, aggressive: false, strategic: false },
  8: { minHandCount: 7, minHandCountRelaxed: 8, aggressive: false, strategic: true },
  9: { minHandCount: 9, minHandCountRelaxed: 10, aggressive: true, strategic: false },
  10: { minHandCount: 7, minHandCountRelaxed: 8, aggressive: false, strategic: true },
  11: { minHandCount: 8, minHandCountRelaxed: 9, aggressive: false, strategic: true }
};

// 🎯 キャラクター別リスク調整係数
export const CHARACTER_RISK_MODIFIERS: { [key: number]: number } = {
  1: 0.8,   // 1主：冷静（リスク低減）
  2: 1.3,   // 2主：やんちゃ（リスク増）
  3: 0.6,   // 3主：賢い（リスク大幅低減）
  4: 0.7,   // 4主：慎重（リスク低減）
  5: 1.1,   // 5主：享楽的（リスク微増）
  6: 1.4,   // 6主：ノリ重視（リスク増）
  7: 0.9,   // 7主：未熟だが基本重視（リスク微減）
  8: 0.7,   // 8主：改良により慎重（リスク低減）
  9: 1.2,   // 9主：冒険好き（リスク増）
  10: 0.6,  // 10主：王道（リスク大幅低減）
  11: 0.8   // 11主：様子見（リスク低減）
};

// 🎯 キャラクター別選択方式設定
export const PERSONALITY_CONFIGS: { [key: number]: { method: string, param: number } } = {
  1: { method: 'softmax', param: 0.8 },   // 1主：softmax（τ=0.8）
  2: { method: 'epsilon', param: 0.3 },   // 2主：ε-greedy（ε=0.3）
  3: { method: 'softmax', param: 0.6 },   // 3主：softmax（τ=0.6）
  4: { method: 'softmax', param: 0.7 },   // 4主：softmax（τ=0.7）
  5: { method: 'softmax', param: 1.0 },   // 5主：softmax（τ=1.0）やや気まぐれ
  6: { method: 'epsilon', param: 0.4 },   // 6主：ε-greedy（ε=0.4）
  7: { method: 'softmax', param: 0.85 },  // 7主：softmax（τ=0.85）
  8: { method: 'softmax', param: 0.7 },   // 8主：softmax（τ=0.7）
  9: { method: 'epsilon', param: 0.3 },   // 9主：ε-greedy（ε=0.3）
  10: { method: 'softmax', param: 0.65 }, // 10主：softmax（τ=0.65）
  11: { method: 'softmax', param: 0.75 }  // 11主：softmax（τ=0.75）
};

// 🎯 プレイアウト回数設定
export const PLAYOUT_COUNTS: { [key: number]: number } = {
  1: 30,   // 1主：バランス型
  2: 20,   // 2主：速攻型
  3: 50,   // 3主：高精度分析型
  4: 25,   // 4主：基本型
  5: 15,   // 5主：直感型
  6: 20,   // 6主：速攻型
  7: 25,   // 7主：基本型
  8: 15,   // 8主：直感型
  9: 30,   // 9主：バランス型
  10: 45,  // 10主：戦術的分析型
  11: 50   // 11主：高精度分析型
};

// 🎯 相性補正設定
export const COMPATIBILITY_CONFIG: { [key: number]: { 
  preservation: number, 
  strategy: number,
  suitLock?: number 
} } = {
  1: { preservation: 0.2, strategy: 0.1 },      // 1主：温存傾向 +0.2、定石判断 +0.1
  3: { preservation: 0.1, strategy: 0.2 },      // 3主：温存傾向 +0.1、定石判断 +0.2
  4: { preservation: 0.2, strategy: 0.1, suitLock: -0.1 }, // 4主：温存傾向 +0.2、定石判断 +0.1、しばり狙い -0.1
  8: { preservation: 0.2, strategy: 0.1 }       // 8主：温存傾向 +0.2、定石判断 +0.1
};