import { useState } from 'react';
import { Character } from '../types/game';
import { CHARACTERS } from '../data/characters';
import { Button } from './ui/button';
import { ExpressionImage } from './ExpressionImage';

interface GameSetupProps {
  onStartGame: (selectedCharacters: Character[]) => void;
}

export function GameSetup({ onStartGame }: GameSetupProps) {
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [hoveredCharacter, setHoveredCharacter] = useState<number | null>(null);

  const handleCharacterSelect = (character: Character) => {
    if (selectedCharacters.find(c => c.id === character.id)) {
      setSelectedCharacters(prev => prev.filter(c => c.id !== character.id));
    } else if (selectedCharacters.length < 4) {
      setSelectedCharacters(prev => [...prev, character]);
    }
  };

  const handleStartGame = () => {
    if (selectedCharacters.length === 4) {
      onStartGame(selectedCharacters);
    }
  };

  const handleRandomSelection = () => {
    // 現在の選択をリセット
    setSelectedCharacters([]);
    
    // 全キャラクターからランダムに4人選択
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5);
    const randomSelected = shuffled.slice(0, 4);
    
    // アニメーション効果のため少し遅延して設定
    setTimeout(() => {
      setSelectedCharacters(randomSelected);
    }, 100);
  };

  const isCharacterSelected = (character: Character) => {
    return selectedCharacters.find(c => c.id === character.id) !== undefined;
  };

  const getCharacterExpression = (character: Character) => {
    const isSelected = isCharacterSelected(character);
    const isHovered = hoveredCharacter === character.id;
    
    if (isSelected) return 'confident';
    if (isHovered) return 'happy';
    return 'neutral';
  };

  // personality を読みやすい形式に変換する関数
  const formatPersonality = (personality: string) => {
    const personalityMap: { [key: string]: string } = {
      'strategic_aggressive': '戦略的',
      'chaotic_early': '直感派',
      'analytical_patient': '分析型',
      'cautious_defensive': '慎重派',
      'energetic_momentum': '勢い型',
      'studious_basic': '堅実型',
      'lucky_instinct': '運任せ',
      'experimental_bold': '実験的',
      'master_tactical': '達人級',
      'quiet_endgame': '終盤型'
    };
    return personalityMap[personality] || '未知';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl animate-float background-orb" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-float background-orb" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-float background-orb" />
      </div>

      {/* メインコンテンツエリア - ヘッダー削除により拡張 */}
      <div className="flex flex-col h-screen relative z-10">
        {/* キャラクター選択グリッド（上部） - 固定高さ480px */}
        <div className="h-[480px] px-6 py-4">
          <div className="max-w-8xl mx-auto h-full flex items-center">
            {/* キャラクターグリッド - 6列、縦間隔を詰める */}
            <div className="grid grid-cols-6 gap-x-6 gap-y-1 max-w-7xl mx-auto">
              {CHARACTERS.map((character) => {
                const selected = isCharacterSelected(character);
                const expression = getCharacterExpression(character);
                
                return (
                  <div
                    key={character.id}
                    className="animate-fade-in character-card"
                    style={{ animationDelay: `${character.id * 0.08}s` }}
                  >
                    <div
                      className={`
                        relative group cursor-pointer transition-all duration-400 transform-gpu
                        ${selected 
                          ? 'scale-105 z-20' 
                          : 'hover:scale-110 hover:z-10'
                        }
                      `}
                      onClick={() => handleCharacterSelect(character)}
                      onMouseEnter={() => setHoveredCharacter(character.id)}
                      onMouseLeave={() => setHoveredCharacter(null)}
                    >
                      {/* メインキャラクターカード - さらに大きく */}
                      <div className={`
                        relative w-40 h-56 rounded-xl overflow-hidden border-4 transition-all duration-400 backdrop-blur-sm
                        ${selected
                          ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50 bg-gradient-to-br from-yellow-900/70 to-orange-900/70'
                          : 'border-slate-500 group-hover:border-blue-400 bg-gradient-to-br from-slate-800/90 to-slate-700/90 group-hover:shadow-xl group-hover:shadow-blue-400/30'
                        }
                      `}>
                        
                        {/* 背景グラデーション */}
                        <div 
                          className="absolute inset-0 opacity-25"
                          style={{
                            background: selected 
                              ? `radial-gradient(circle at center, ${character.color}50, transparent 70%)`
                              : 'radial-gradient(circle at center, rgba(148, 163, 184, 0.3), transparent 70%)'
                          }}
                        />

                        {/* 表情画像 - さらに大きく */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-28 h-28">
                          <div className={`
                            w-full h-full rounded-full border-4 overflow-hidden transition-all duration-300
                            ${selected 
                              ? 'border-yellow-300 shadow-lg shadow-yellow-400/60' 
                              : 'border-slate-400 group-hover:border-blue-300'
                            }
                          `}>
                            <ExpressionImage
                              characterId={character.id}
                              expression={expression}
                              alt={`${character.name}の表情`}
                              className="w-full h-full object-cover"
                              scale={1.3}
                            />
                          </div>
                        </div>

                        {/* キャラクター情報 - 説明文削除、間隔詰め */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                          <h3 className={`
                            text-center font-bold text-lg mb-1 transition-colors duration-300
                            ${selected ? 'text-yellow-300' : 'text-white group-hover:text-blue-200'}
                          `}>
                            {character.name}
                          </h3>
                          <div className="flex items-center justify-center">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: character.color }}
                            />
                          </div>
                        </div>

                        {/* 選択済みオーバーレイ */}
                        {selected && (
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/25 to-orange-400/25 flex items-center justify-center animate-fade-in">
                            <div className="bg-yellow-400 text-black rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold animate-bounce-gentle">
                              ✓
                            </div>
                          </div>
                        )}

                        {/* ホバーエフェクト */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-blue-400/15 group-hover:to-purple-400/15 transition-all duration-400 rounded-xl" />
                        
                        {/* ホバー時のリング */}
                        <div className={`
                          absolute inset-0 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100
                          ${!selected ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
                        `} />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* ランダム選択ボタン - 11番キャラクターの右に配置 */}
              <div className="animate-fade-in flex items-center justify-center" style={{ animationDelay: '0.88s' }}>
                <Button
                  onClick={handleRandomSelection}
                  className={`
                    relative w-40 h-56 rounded-xl overflow-hidden border-4 border-purple-500 
                    bg-gradient-to-br from-purple-800/90 to-indigo-800/90 
                    hover:border-purple-400 hover:shadow-xl hover:shadow-purple-400/30
                    transition-all duration-400 transform-gpu hover:scale-110
                    text-white font-bold text-lg group backdrop-blur-sm
                  `}
                >
                  {/* 背景グラデーション */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 opacity-50" />
                  
                  {/* 魔法陣風の背景 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <div className="w-32 h-32 border-2 border-purple-400 rounded-full animate-spin-slow">
                      <div className="w-20 h-20 border-2 border-purple-300 rounded-full m-auto mt-6 animate-spin-reverse" />
                    </div>
                  </div>
                  
                  {/* アイコンとテキスト */}
                  <div className="relative z-10 flex flex-col items-center justify-center h-full p-4">
                    <div className="text-4xl mb-4 animate-bounce-gentle">🎲</div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-200 mb-1">ランダム</div>
                      <div className="text-xl font-bold text-purple-200">選択</div>
                    </div>
                    <div className="text-sm text-purple-300 mt-3 opacity-80">4人自動選出</div>
                  </div>
                  
                  {/* ホバーエフェクト */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-purple-400/15 group-hover:to-pink-400/15 transition-all duration-400 rounded-xl" />
                  
                  {/* ホバー時のリング */}
                  <div className="absolute inset-0 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 ring-2 ring-purple-400 ring-opacity-60" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* CPU専用プレイヤー枠エリア（下部） - ヘッダー削除 */}
        <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border-t-2 border-slate-600 px-6 py-4 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-6">
              {[0, 1, 2, 3].map((slotIndex) => {
                const character = selectedCharacters[slotIndex];
                const hasCharacter = character !== undefined;
                
                return (
                  <div
                    key={slotIndex}
                    className="relative group transition-all duration-400 animate-fade-in player-slot"
                    style={{ animationDelay: `${slotIndex * 0.15}s` }}
                  >
                    {/* CPUプレイヤーカード */}
                    <div className={`
                      relative h-52 rounded-xl border-4 overflow-hidden transition-all duration-400 backdrop-blur-sm
                      ${hasCharacter
                        ? 'border-blue-400 bg-gradient-to-br from-blue-900/60 to-cyan-800/60 shadow-lg shadow-blue-400/30'
                        : 'border-slate-500 bg-gradient-to-br from-slate-700/60 to-slate-600/60 border-dashed'
                      }
                    `}>
                      {hasCharacter ? (
                        <>
                          {/* キャラクター表示 */}
                          <div className="flex flex-col items-center justify-center h-full p-4">
                            {/* 表情画像 */}
                            <div className="w-20 h-20 mb-3">
                              <div className="w-full h-full rounded-full border-4 overflow-hidden transition-all duration-300 border-blue-300 shadow-lg shadow-blue-400/60">
                                <ExpressionImage
                                  characterId={character.id}
                                  expression="confident"
                                  alt={`${character.name}の表情`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            
                            <h3 
                              className="text-xl font-bold mb-1 text-center truncate w-full"
                              style={{ color: character.color }}
                            >
                              {character.name}
                            </h3>
                            <div className="flex items-center justify-center">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: character.color }}
                              />
                            </div>
                          </div>
                          
                          {/* CPUタイプ表示 */}
                          <div className="absolute top-2 left-2">
                            <div className="px-2 py-1 rounded-full text-xs font-bold transition-all duration-300 backdrop-blur-sm bg-blue-500/95 text-white shadow-md">
                              🤖 CPU
                            </div>
                          </div>
                        </>
                      ) : (
                        /* 空スロット */
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 transition-colors duration-300">
                          <div className="text-5xl mb-4 opacity-60 transition-opacity duration-300">
                            🤖
                          </div>
                          <p className="text-xl font-semibold">CPU {slotIndex + 1}</p>
                          <p className="text-base mt-2 opacity-70">キャラクターを選択</p>
                        </div>
                      )}
                    </div>
                    
                    {/* プレイヤー番号ラベル */}
                    <div className="text-center mt-3">
                      <div className={`
                        inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-300
                        ${hasCharacter 
                          ? 'bg-blue-500/25 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-600/25 text-slate-400 border border-slate-500/40'
                        }
                      `}>
                        <span className="mr-1.5">{slotIndex + 1}</span>
                        <div className={`
                          w-1.5 h-1.5 rounded-full
                          ${hasCharacter ? 'bg-blue-400' : 'bg-slate-500'}
                        `} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            

          </div>
        </div>

        {/* ゲーム開始ボタン（CPU専用プレイヤー枠エリア直下） */}
        <div className="bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 border-t-2 border-slate-600 px-6 py-6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex justify-center">
            <Button
              onClick={handleStartGame}
              disabled={selectedCharacters.length !== 4}
              size="lg"
              className={`
                px-12 py-5 text-2xl font-bold rounded-xl transition-all duration-500 transform-gpu backdrop-blur-sm border-3
                ${selectedCharacters.length === 4
                  ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-400 hover:via-orange-400 hover:to-red-400 text-white shadow-2xl hover:scale-110 border-yellow-400 button-glow-effect'
                  : 'bg-slate-700/60 text-slate-400 cursor-not-allowed border-slate-600'
                }
              `}
            >
              {selectedCharacters.length === 4 ? (
                <div className="flex items-center space-x-2">
                  <span>⚔️</span>
                  <span>バトル開始！</span>
                  <span>⚔️</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>キャラクターを選択 ({selectedCharacters.length}/4)</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 選択状況インジケーター */}
      <div className="absolute top-8 right-8 z-20 animate-slide-in-top">
        <div className="bg-slate-900/85 rounded-xl p-5 border-3 border-slate-600 backdrop-blur-sm shadow-xl">
          <h3 className="text-lg font-bold text-yellow-400 mb-4 text-center">⚡ 選択状況</h3>
          <div className="flex space-x-3 mb-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`
                  w-4 h-4 rounded-full border-2 transition-all duration-300
                  ${index < selectedCharacters.length
                    ? 'bg-green-400 border-green-300 shadow-lg shadow-green-400/60 animate-pulse'
                    : 'bg-slate-600 border-slate-500'
                  }
                `}
              />
            ))}
          </div>
          <p className="text-center text-base font-semibold">
            <span className="text-green-400">{selectedCharacters.length}</span>
            <span className="text-slate-400"> / </span>
            <span className="text-blue-400">4</span>
            <span className="text-slate-400"> 選択済み</span>
          </p>
          
          {selectedCharacters.length === 4 && (
            <div className="mt-4 pt-4 border-t border-slate-600">
              <div className="text-center">
                <div className="text-2xl animate-bounce-gentle">🎉</div>
                <p className="text-sm text-green-400 font-semibold mt-1">準備完了！</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}