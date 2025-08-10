/**
 * カスタムフック専用の型定義
 * 
 * 内部実装用の型のみを定義。外部インターフェースはapp.tsで管理。
 */

import { GameState, GameAction, Card } from './game';

// フック設定用の基本型
export interface HookConfig<T = any> {
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  getAdjustedTime: (time: number) => number;
  isPaused: boolean;
  [key: string]: T;
}

// AI処理用の設定
export interface AIProcessingConfig extends HookConfig {
  gameState: GameState | null;
  handleGameActionWithErrorHandling: (action: GameAction) => void;
  passMessageTracker: React.MutableRefObject<any>;
  aiProcessRef: React.MutableRefObject<any>;
}

// ゲームエフェクト用の設定
export interface GameEffectsConfig {
  gameState: GameState | null;
  gameSpeed: number;
  timerRefs: {
    aiProcessRef: React.MutableRefObject<any>;
    eightCutTimerRef: React.MutableRefObject<any>;
    spectatorCommentTimerRef: React.MutableRefObject<any>;
    passMessageTracker: React.MutableRefObject<any>;
  };
  processAITurn: () => void;
  setupEightCutTimer: () => void;
  startContinuousWatchdog: (refresh: () => void, complete: () => void) => void;
  stopWatchdog: () => void;
  clearAllTimers: () => void;
  emergencyRefresh: () => void;
  completeEightCut: () => void;
}

// UI統合用の基本設定
export interface UIIntegrationConfig extends HookConfig {
  gameState: GameState | null;
  clearAllTimers: () => void;
  initializeGame: (characters: number[], humanIndex: number) => void;
  setGameSpeed: (speed: number) => void;
  setIsPaused: (paused: boolean) => void;
  handleGameAction: (action: GameAction) => void;
  emergencyRefresh: () => void;
  resetGame: () => void;
  setDebugMode: (debug: boolean) => void;
  debugMode: boolean;
  handlePauseToggle: () => void;
}