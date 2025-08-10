import { GameState, Player, Card } from '../types/game';

export interface ReactionConfig {
  setReactionEmoji: (playerId: number, emoji: string, duration?: number) => void;
  processSelfPlayReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processOtherPlayersReactions: (playerId: number, cards: Card[], gameState: GameState) => void;
  processResponseToMyPlay: (playerId: number, cards: Card[], gameState: GameState) => void;
  getAdjustedTime: (time: number) => number;
}

/**
 * 革命発生時のリアクション処理
 */
export function triggerRevolutionReaction(
  playerId: number,
  config: ReactionConfig
): void {
  setTimeout(() => config.setReactionEmoji(playerId, '‼️', 4000), 300);
}

/**
 * 8切り発生時のリアクション処理
 */
export function triggerEightCutReaction(
  playerId: number,
  config: ReactionConfig
): void {
  setTimeout(() => config.setReactionEmoji(playerId, '🎵', 4000), 300);
}

/**
 * 自分のプレイに対するリアクション処理の統合実行
 */
export function processSelfPlayReactions(
  playerId: number,
  cards: Card[],
  gameState: GameState,
  config: ReactionConfig
): void {
  if (gameState.gamePhase === 'playing') {
    setTimeout(() => {
      config.processSelfPlayReactions(playerId, cards, gameState);
    }, config.getAdjustedTime(120));
  }
}

/**
 * 他プレイヤーのプレイに対するリアクション処理の統合実行
 */
export function processOtherPlayersReactions(
  playerId: number,
  cards: Card[],
  gameState: GameState,
  config: ReactionConfig,
  needsReaction: boolean
): void {
  if (needsReaction && gameState.gamePhase === 'playing') {
    setTimeout(() => {
      config.processOtherPlayersReactions(playerId, cards, gameState);
      config.processResponseToMyPlay(playerId, cards, gameState);
    }, config.getAdjustedTime(200));
  }
}

/**
 * 全リアクション処理の統合実行
 */
export function executeAllReactions(
  playerId: number,
  cards: Card[],
  gameState: GameState,
  config: ReactionConfig,
  needsReaction: boolean
): void {
  // 自分のプレイリアクション
  processSelfPlayReactions(playerId, cards, gameState, config);
  
  // 他プレイヤーのリアクション
  processOtherPlayersReactions(playerId, cards, gameState, config, needsReaction);
}