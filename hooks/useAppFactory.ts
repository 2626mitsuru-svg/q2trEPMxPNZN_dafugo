import { useMemo } from 'react';
import { 
  GameConfig, 
  CoreHandlers, 
  UIHandlers, 
  DebugHandlers,
  AIProcessInfo,
  AppConfiguration
} from '../types/app';

interface AppFactoryInput {
  // 基本設定
  gameConfig: GameConfig;
  
  // ハンドラー群
  coreHandlers: CoreHandlers;
  uiHandlers: UIHandlers;  
  debugHandlers: DebugHandlers;
  
  // AI処理参照
  aiProcessRef: React.MutableRefObject<any>;
}

/**
 * アプリケーション設定統合ファクトリー
 * 
 * すべての設定オブジェクトを統合して返す軽量ファクトリー
 */
export const useAppFactory = (input: AppFactoryInput): AppConfiguration => {
  // AI処理情報の動的生成
  const aiProcessInfo: AIProcessInfo = useMemo(() => ({
    isProcessing: input.aiProcessRef.current?.isProcessing || false,
    processCount: input.aiProcessRef.current?.processCount || 0,
    lastActivityTime: input.aiProcessRef.current?.lastActivityTime || 0
  }), [
    input.aiProcessRef.current?.isProcessing,
    input.aiProcessRef.current?.processCount,
    input.aiProcessRef.current?.lastActivityTime
  ]);

  // 設定オブジェクトの統合
  return useMemo(() => ({
    gameConfig: input.gameConfig,
    coreHandlers: input.coreHandlers,
    uiHandlers: input.uiHandlers,
    debugHandlers: input.debugHandlers,
    aiProcessInfo
  }), [input.gameConfig, input.coreHandlers, input.uiHandlers, input.debugHandlers, aiProcessInfo]);
};