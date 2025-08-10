import React from 'react';

interface GameLoadingProps {
  selectedCharacters: number[];
  humanPlayerIndex: number;
}

export const GameLoading: React.FC<GameLoadingProps> = ({ 
  selectedCharacters, 
  humanPlayerIndex 
}) => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto"></div>
        <p className="mt-4 text-xl">ゲームを初期化中...</p>
        <p className="mt-2 text-sm text-gray-400">
          キャラクター: {selectedCharacters.length}/4, 
          人間プレイヤー: {humanPlayerIndex >= 0 ? `位置${humanPlayerIndex}` : '未設定'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          もし長時間この画面が続く場合は、ページをリロードしてください
        </p>
      </div>
    </div>
  );
};