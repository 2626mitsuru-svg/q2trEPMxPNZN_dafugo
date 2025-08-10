export interface Card {
  id: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';
  rank: number; // 1-13, ジョーカーは14
}

export interface Character {
  id: number;
  name: string;
  avatar: string;
  color: string;
  description: string;
  personality: 'strategic_aggressive' | 'chaotic_early' | 'analytical_patient' | 'cautious_defensive' | 'energetic_momentum' | 'studious_basic' | 'lucky_instinct' | 'experimental_bold' | 'master_tactical' | 'quiet_endgame';
  monteCarloConfig: {
    playoutCount: number; // プレイアウト回数
    temperatureParam: number; // softmax温度パラメータ
    epsilonGreedy?: number; // ε-greedy確率（使用する場合）
    evaluationWeights: {
      w1: number; // 基本評価重み1
      w2: number; // 基本評価重み2  
      w3: number; // 基本評価重み3
      w4: number; // 基本評価重み4
      w5?: number; // 基本評価重み5（任意）
    };
    specialRules: {
      preferRevolution: boolean; // 革命を好むか
      prefer8Cut: boolean; // 8切りを好むか
      preferSuitLock: boolean; // マーク縛りを好むか
      conserveStrong: boolean; // 強いカードを温存するか
      aggressiveEarly: boolean; // 序盤積極的か
    };
  };
}

export interface Player {
  id: number;
  character: Character;
  hand: Card[];
  isHuman: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  expression: 'normal' | 'happy' | 'angry' | 'surprised' | 'frustrated' | 'excited' | 'confident' | 'thinking' | 'worried' | 'nervous' | 'disappointed';
  currentExpression?: 'normal' | 'happy' | 'angry' | 'surprised' | 'frustrated' | 'excited' | 'confident' | 'thinking' | 'worried' | 'nervous' | 'disappointed'; // デバッグ用表情オーバーライド
  message: string;
  messageType: 'normal' | 'action' | 'special';
  lastAction?: {
    type: 'play' | 'pass';
    description: string;
    timestamp: number;
  };
  isFoulFinished: boolean; // 反則上がりフラグ
  reactionEmoji?: string; // 表情右上の反応絵文字
  // 旧式のhasPassed削除（新しいpassFlagsで管理）
}

export interface EightCutState {
  isActive: boolean;
  eightCards: Card[];
  playerId: number;
  playerName: string;
  startTime: number;
}

export interface GameState {
  players: Player[];
  
  // === 新設計：指示に従った状態管理 ===
  active: number[]; // 上がっていないプレイヤーIDの環状リスト（席順を保つ）
  turn: number; // いまの手番のプレイヤーID（active[]の中）
  fieldSet: Card[] | null; // 場のカードセット or null（null=新しい場／流れ直後）
  lastPlayer: number | null; // 最後に出したプレイヤーID or null
  passFlags: { [playerId: number]: boolean }; // その「場」に対してパス中か
  
  // === 既存の互換性維持 ===
  currentPlayer: number; // turn と同期（UI互換性のため）
  field: Card[]; // fieldSet と同期（UI互換性のため）
  playHistory: PlayHistory[];
  lastPlayType: PlayType | null;
  lastPlayCount: number;
  isRevolution: boolean;
  suitLock: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null;
  gamePhase: 'playing' | 'finished';
  turnsPassed: number; // 廃止予定（新設計では使用しない）
  winner: Player | null;
  finishOrder: number[]; // プレイヤーIDの配列（上がり順序）
  eightCutState?: EightCutState; // 八切り演出状態
  lastCardPlayerId: number; // 廃止予定（lastPlayerで代替）
}

export type PlayType = 'single' | 'pair' | 'triple' | 'straight' | 'pass';

export interface GameAction {
  type: 'play' | 'pass';
  cards: Card[];
  playType: PlayType;
}

export interface PlayHistory {
  playerId: number;
  cards: Card[];
  playType: PlayType;
  playerName: string;
  playerColor: string;
  timestamp: number;
}