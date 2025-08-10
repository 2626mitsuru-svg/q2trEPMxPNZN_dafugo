import { useRef, useCallback } from 'react';

export const useTimers = () => {
  // AI処理管理のためのRef
  const aiProcessRef = useRef<{
    isProcessing: boolean;
    currentTimeoutId: NodeJS.Timeout | null;
    watchdogIntervalId: NodeJS.Timeout | null;
    lastActivityTime: number;
    processCount: number;
  }>({
    isProcessing: false,
    currentTimeoutId: null,
    watchdogIntervalId: null,
    lastActivityTime: Date.now(),
    processCount: 0
  });

  // 各種タイマーRef
  const eightCutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spectatorCommentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emojiClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // パスメッセージ管理用のRef
  const passMessageTracker = useRef<{
    [playerId: number]: {
      hasPassedThisTurn: boolean;
      passMessageShown: boolean;
      lastPassTime: number;
    }
  }>({});

  // 全てのタイマーをクリア
  const clearAllTimers = useCallback(() => {
    console.log('🧹 Clearing all timers...');
    
    if (aiProcessRef.current.currentTimeoutId) {
      clearTimeout(aiProcessRef.current.currentTimeoutId);
      aiProcessRef.current.currentTimeoutId = null;
    }
    
    if (aiProcessRef.current.watchdogIntervalId) {
      clearInterval(aiProcessRef.current.watchdogIntervalId);
      aiProcessRef.current.watchdogIntervalId = null;
    }

    if (eightCutTimerRef.current) {
      clearTimeout(eightCutTimerRef.current);
      eightCutTimerRef.current = null;
    }

    if (spectatorCommentTimerRef.current) {
      clearTimeout(spectatorCommentTimerRef.current);
      spectatorCommentTimerRef.current = null;
    }

    if (reactionTimerRef.current) {
      clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }

    if (emojiClearTimerRef.current) {
      clearTimeout(emojiClearTimerRef.current);
      emojiClearTimerRef.current = null;
    }
    
    aiProcessRef.current.isProcessing = false;
    aiProcessRef.current.lastActivityTime = Date.now();
    aiProcessRef.current.processCount = 0;
    passMessageTracker.current = {};
    
    console.log('✅ All timers cleared');
  }, []);

  // 継続的な監視を開始
  const startContinuousWatchdog = useCallback((emergencyRefresh: () => void, completeEightCut: () => void) => {
    if (aiProcessRef.current.watchdogIntervalId) {
      clearInterval(aiProcessRef.current.watchdogIntervalId);
    }
    
    aiProcessRef.current.watchdogIntervalId = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - aiProcessRef.current.lastActivityTime;
      
      // 八切りタイマーが動作中かチェック
      const isEightCutActive = eightCutTimerRef.current !== null;
      
      if (isEightCutActive) {
        // 八切り中は通常のwatchdogをスキップ、ただし完全にフリーズした場合は対処
        if (timeSinceLastActivity > 10000) {
          console.log(`⏰ Watchdog: Eight cut seems frozen, force completing (${timeSinceLastActivity}ms)`);
          completeEightCut();
        }
      } else {
        // 通常のwatchdog処理
        if (timeSinceLastActivity > 3000 && aiProcessRef.current.isProcessing) {
          console.log(`⏰ Watchdog: Auto-refresh triggered! (${timeSinceLastActivity}ms since last activity)`);
          emergencyRefresh();
        }
        
        if (aiProcessRef.current.isProcessing && timeSinceLastActivity > 5000) {
          console.log(`⏰ Watchdog: Force refresh due to timeout!`);
          emergencyRefresh();
        }
      }
    }, 1000);
    
    console.log('⏰ Continuous watchdog started (checking every 1 second, with eight cut handling)');
  }, []);

  // 監視停止
  const stopWatchdog = useCallback(() => {
    if (aiProcessRef.current.watchdogIntervalId) {
      clearInterval(aiProcessRef.current.watchdogIntervalId);
      aiProcessRef.current.watchdogIntervalId = null;
      console.log('⏰ Watchdog stopped');
    }
  }, []);

  return {
    // Refs
    aiProcessRef,
    eightCutTimerRef,
    spectatorCommentTimerRef,
    reactionTimerRef,
    emojiClearTimerRef,
    passMessageTracker,
    
    // Actions
    clearAllTimers,
    startContinuousWatchdog,
    stopWatchdog
  };
};