import { GameState, GameAction, Card } from './game';

// === アプリケーション共通型定義 ===

export type GamePhase = 'setup' | 'playing';

// 基本設定（CPU専用）
export interface GameConfig {
  selectedCharacters: number[];
  gameSpeed: number;
  debugMode: boolean;
  isPaused: boolean;
  finalMessagesSet: boolean;
}

// 参照オブジェクト
export interface TimerRefs {
  aiProcessRef: React.MutableRefObject<any>;
  eightCutTimerRef: React.MutableRefObject<any>;
  spectatorCommentTimerRef: React.MutableRefObject<any>;
  passMessageTracker: React.MutableRefObject<any>;
}

// === ハンドラー型定義 ===

export interface CoreHandlers {
  handleGameAction: (action: GameAction) => void;
  completeEightCut: () => void;
  emergencyRefresh: () => void;
  setupEightCutTimer: () => void;
}

export interface UIHandlers {
  handleGameActionWithErrorHandling: (action: GameAction) => void;
  handleGameSetupComplete: (characters: number[]) => void;
  handleSpeedChange: (speed: number) => void;
  handlePauseToggle: () => void;
  setReactionEmoji: (playerId: number, emoji: string, duration?: number) => void;
  processOtherPlayersReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processSelfPlayReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processResponseToMyPlay: (playerId: number, cards: Card[], gameState: GameState) => void;
}

export interface DebugHandlers {
  debugActions: any;
  handleDebugModeToggle: () => void;
  expressionTestMode: boolean;
  setExpressionTestMode: (mode: boolean) => void;
}

// AI処理情報
export interface AIProcessInfo {
  isProcessing: boolean;
  processCount: number;
  lastActivityTime: number;
}

// === 統合設定型 ===

export interface AppConfiguration {
  gameConfig: GameConfig;
  coreHandlers: CoreHandlers;
  uiHandlers: UIHandlers;
  debugHandlers: DebugHandlers;
  aiProcessInfo: AIProcessInfo;
}

// ゲームフェーズレンダラー用プロップス
export interface GamePhaseProps {
  gameState: GameState | null;
  config: GameConfig;
  handlers: CoreHandlers & UIHandlers;
  debugHandlers: DebugHandlers;
  aiProcessInfo: AIProcessInfo;
  resetGame: () => void;
  emergencyRefresh: () => void;
}