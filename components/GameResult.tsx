import { useState, useEffect } from 'react';
import { Player } from '../types/game';
import { getReactionMessage } from '../utils/aiLogic';

interface GameResultProps {
  players: Player[];
  finishOrder: number[];
  onPlayAgain: () => void;
}

export function GameResult({ players, finishOrder, onPlayAgain }: GameResultProps) {
  const [phase, setPhase] = useState<'intro' | 'reveal' | 'complete' | 'waiting'>('intro');
  const [revealIndex, setRevealIndex] = useState(-1);

  // 順位名を取得
  const getRankName = (index: number) => {
    switch (index) {
      case 0: return '大富豪';
      case 1: return '富豪';
      case 2: return '貧民';
      case 3: return '大貧民';
      default: return `${index + 1}位`;
    }
  };

  // 順位色を取得
  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-blue-400';
      case 2: return 'text-green-400';
      case 3: return 'text-red-400';
      default: return 'text-white';
    }
  };

  // 順位に応じたプレイヤーを取得
  const getPlayerByRank = (rankIndex: number) => {
    if (rankIndex >= finishOrder.length) return null;
    const playerId = finishOrder[rankIndex];
    return players.find(p => p.id === playerId) || null;
  };

  // キャラクター別の上がり後セリフを取得
  const getPlayerFinishMessage = (player: Player, rankIndex: number) => {
    if (player.isFoulFinished) {
      return getReactionMessage(player, 'afterFoul');
    } else if (rankIndex === 0) {
      return getReactionMessage(player, 'afterWinRich');
    } else {
      return getReactionMessage(player, 'afterWinNormal');
    }
  };

  useEffect(() => {
    // RESULT表示フェーズ（2秒）
    const introTimer = setTimeout(() => {
      setPhase('reveal');
      setRevealIndex(0);
    }, 2000);

    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (phase === 'reveal' && revealIndex >= 0) {
      if (revealIndex < finishOrder.length - 1) {
        // 次の順位を1.2秒後に表示
        const revealTimer = setTimeout(() => {
          setRevealIndex(prev => prev + 1);
        }, 1200);
        return () => clearTimeout(revealTimer);
      } else {
        // 全順位表示完了後、2秒待って「もう一回」ボタン表示
        const completeTimer = setTimeout(() => {
          setPhase('waiting');
        }, 2000);
        return () => clearTimeout(completeTimer);
      }
    }
  }, [phase, revealIndex, finishOrder.length]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      {/* 背景のキラキラエフェクト */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* メインコンテンツ */}
      <div className="relative z-10 text-center w-full max-w-4xl mx-auto px-8">
        {/* RESULT表示フェーズ */}
        {phase === 'intro' && (
          <div className="animate-fade-in">
            <div className="text-8xl font-bold text-white mb-8 font-mono animate-bounce" 
                 style={{
                   textShadow: '4px 4px 0px #000, -4px -4px 0px #000, 4px -4px 0px #000, -4px 4px 0px #000, 0 0 20px rgba(255,255,0,0.8)'
                 }}>
              RESULT
            </div>
            <div className="text-2xl text-yellow-400 font-mono animate-pulse">
              ゲーム終了！
            </div>
          </div>
        )}

        {/* 順位発表フェーズ */}
        {phase === 'reveal' && (
          <div className="space-y-8">
            <div className="text-6xl font-bold text-white mb-12 font-mono" 
                 style={{
                   textShadow: '3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000'
                 }}>
              最終結果
            </div>

            {/* 順位リスト */}
            <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto">
              {finishOrder.map((playerId, index) => {
                const player = players.find(p => p.id === playerId);
                const isRevealed = index <= revealIndex;
                const isCurrentReveal = index === revealIndex;
                
                if (!player) return null;

                return (
                  <div
                    key={playerId}
                    className={`
                      relative bg-slate-800 border-4 border-white rounded-xl p-6 transition-all duration-500
                      ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
                      ${isCurrentReveal ? 'animate-bounce shadow-2xl' : ''}
                    `}
                    style={{
                      borderColor: player.character.color,
                      boxShadow: isCurrentReveal ? `0 0 30px ${player.character.color}` : undefined,
                      animationDelay: isCurrentReveal ? '0s' : undefined
                    }}
                  >
                    {/* 順位バッジ */}
                    <div className={`
                      absolute -top-6 left-1/2 transform -translate-x-1/2
                      px-4 py-2 rounded-full border-4 border-white
                      font-mono font-bold text-xl
                      ${getRankColor(index)}
                      ${index === 0 ? 'bg-yellow-600' : 
                        index === 1 ? 'bg-blue-600' : 
                        index === 2 ? 'bg-green-600' : 'bg-red-600'}
                    `}>
                      {getRankName(index)}
                    </div>

                    {/* プレイヤー情報 */}
                    <div className="pt-4">
                      <div className="text-3xl font-bold mb-2 font-mono" 
                           style={{ 
                             color: player.character.color,
                             textShadow: '2px 2px 0px #000' 
                           }}>
                        {player.character.name}
                      </div>
                      
                      {/* 反則上がりマーク */}
                      {player.isFoulFinished && (
                        <div className="text-red-400 font-bold mb-2 animate-pulse">
                          ⚠️ 反則上がり
                        </div>
                      )}
                      
                      {/* キャラクター別の最終メッセージ */}
                      <div className="text-lg text-white bg-slate-900 rounded-lg p-3 font-mono"
                           style={{ textShadow: '1px 1px 0px #000' }}>
                        {getPlayerFinishMessage(player, index)}
                      </div>
                    </div>

                    {/* キラキラエフェクト */}
                    {isCurrentReveal && (
                      <>
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
                            style={{
                              left: `${20 + Math.random() * 60}%`,
                              top: `${20 + Math.random() * 60}%`,
                              animationDelay: `${Math.random() * 0.5}s`
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 待機フェーズ - もう一回ボタン表示 */}
        {phase === 'waiting' && (
          <div className="animate-fade-in">
            <div className="text-4xl font-bold text-white mb-8 font-mono" 
                 style={{
                   textShadow: '3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000'
                 }}>
              お疲れさまでした！
            </div>
            
            {/* もう一回ボタン */}
            <button
              onClick={onPlayAgain}
              className="
                bg-gradient-to-r from-yellow-500 to-yellow-600 
                hover:from-yellow-400 hover:to-yellow-500
                text-black font-bold text-2xl
                px-12 py-4 rounded-xl
                border-4 border-white
                shadow-2xl hover:shadow-yellow-400/50
                transform hover:scale-105 transition-all duration-300
                font-mono animate-pulse
              "
              style={{
                textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
              }}
            >
              🎮 もう一回！
            </button>
            
            <div className="text-lg text-yellow-300 font-mono mt-6 opacity-80">
              クリックでキャラクター選択に戻ります
            </div>
          </div>
        )}
      </div>

      {/* 下部の演出エフェクト */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-yellow-600/20 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />
    </div>
  );
}