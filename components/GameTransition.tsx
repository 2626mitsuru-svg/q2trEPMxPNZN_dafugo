import { useState, useEffect } from 'react';
import { GameState } from '../types/game';

interface GameTransitionProps {
  gameState: GameState;
  onTransitionComplete: () => void;
}

export function GameTransition({ gameState, onTransitionComplete }: GameTransitionProps) {
  const [phase, setPhase] = useState<'fadeOut' | 'move' | 'fadeIn'>('fadeOut');

  useEffect(() => {
    const transitionSequence = async () => {
      // フェーズ1: イントロ画面をフェードアウト
      setPhase('fadeOut');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // フェーズ2: キャラクターを移動
      setPhase('move');
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // フェーズ3: ゲーム画面をフェードイン
      setPhase('fadeIn');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // 遷移完了
      onTransitionComplete();
    };

    transitionSequence();
  }, [onTransitionComplete]);

  const positions = [
    { from: 'bottom-4 right-4', to: 'bottom-8 right-8' },
    { from: 'bottom-4 left-4', to: 'bottom-8 left-8' },
    { from: 'top-4 left-4', to: 'top-8 left-8' },
    { from: 'top-4 right-4', to: 'top-8 right-8' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景の変化 */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${
          phase === 'fadeOut' 
            ? 'bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900' 
            : phase === 'move'
            ? 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800'
            : 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'
        }`}
      >
        {/* ドット絵風パターン背景 */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === 'fadeOut' ? 'opacity-10' : 'opacity-20'
        }`}>
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                radial-gradient(circle at 75% 75%, white 2px, transparent 2px)
              `,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 20px 20px'
            }}
          />
        </div>
      </div>

      {/* 遷移メッセージ */}
      {phase === 'move' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="bg-slate-900 border-8 border-white p-8 shadow-2xl relative animate-pulse">
            {/* ドラクエ風角装飾（角丸） */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>

            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-4 font-mono animate-bounce" style={{
                textShadow: '2px 2px 0px #000'
              }}>
                🎮 戦いの舞台へ... 🎮
              </div>
              <div className="flex justify-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* キャラクター移動演出 */}
      {gameState.players.map((player, index) => (
        <div
          key={player.id}
          className={`absolute w-80 h-80 z-10 transition-all duration-1200 ease-in-out ${
            phase === 'fadeOut' 
              ? `${positions[index].from} opacity-100 scale-100`
              : phase === 'move'
              ? `${positions[index].to} opacity-80 scale-90`
              : `${positions[index].to} opacity-100 scale-100`
          }`}
        >
          <TransitionCharacterCard 
            player={player} 
            phase={phase}
          />
        </div>
      ))}

      {/* 中央エリアのフェードイン */}
      {phase === 'fadeIn' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-64 z-20">
          <div 
            className="w-full h-full border-8 border-white bg-slate-800 shadow-2xl relative animate-fade-in opacity-0"
            style={{ 
              animation: 'fadeIn 0.8s ease-in-out 0.2s forwards'
            }}
            className="rounded-xl"
          >
            {/* ドラクエ風角装飾 */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full"></div>

            <div className="flex items-center justify-center h-full">
              <div className="text-white text-center font-mono">
                <div className="text-2xl mb-2">🎴</div>
                <div className="text-lg">カード場</div>
                <div className="text-sm opacity-70 mt-2">準備中...</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 遷移中のキャラクターカード
interface TransitionCharacterCardProps {
  player: any;
  phase: 'fadeOut' | 'move' | 'fadeIn';
}

function TransitionCharacterCard({ player, phase }: TransitionCharacterCardProps) {
  const getCardStyle = () => {
    if (phase === 'fadeOut') {
      return {
        background: `linear-gradient(135deg, ${player.character.color}30, ${player.character.color}15, #374155)`,
        borderColor: 'white',
        boxShadow: `0 0 20px ${player.character.color}60`
      };
    } else if (phase === 'move') {
      return {
        background: `linear-gradient(135deg, ${player.character.color}50, ${player.character.color}30, #1e293b)`,
        borderColor: 'white',
        boxShadow: `0 0 30px ${player.character.color}80`
      };
    } else {
      return {
        background: `linear-gradient(135deg, ${player.character.color}40, ${player.character.color}20, #0f172a)`,
        borderColor: 'white',
        boxShadow: `0 0 40px ${player.character.color}90`
      };
    }
  };

  return (
    <div 
      className={`h-full border-8 p-6 shadow-2xl relative transition-all duration-800 ${
        phase === 'move' ? 'animate-pulse' : ''
      }`}
      style={getCardStyle()}
    >
      {/* 移動中のエフェクト */}
      {phase === 'move' && (
        <>
          <div 
            className="absolute -inset-4 border-4 border-yellow-400 animate-ping opacity-50 rounded-xl"
          />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </>
      )}

      {/* キャラクター情報 */}
      <div className="text-center mb-4">
        <div 
          className={`w-24 h-24 mx-auto border-8 flex items-center justify-center text-4xl shadow-xl transition-all duration-800 ${
            phase === 'move' ? 'animate-spin' : ''
          }`}
          style={{ 
            backgroundColor: `${player.character.color}60`,
            borderColor: 'white'
          }}
          className="rounded-lg"
        >
          {player.character.avatar}
        </div>
        
        <div className="mt-3">
          <div 
            className="font-bold text-xl mb-1 font-mono text-white"
            style={{ 
              color: player.character.color,
              textShadow: '2px 2px 0px #000'
            }}
          >
            {player.character.name}
          </div>
          {player.isHuman && (
            <div className="inline-block px-3 py-1 bg-green-600 text-white border-2 border-white font-bold text-xs font-mono shadow-lg">
              あなた
            </div>
          )}
        </div>
      </div>

      {/* 手札枚数表示（フェードイン時） */}
      {phase === 'fadeIn' && (
        <div className="text-center">
          <div className="inline-block px-4 py-2 bg-slate-700 border-4 border-white text-white font-mono font-bold text-lg shadow-xl animate-bounce">
            {player.hand.length}枚
          </div>
        </div>
      )}
    </div>
  );
}