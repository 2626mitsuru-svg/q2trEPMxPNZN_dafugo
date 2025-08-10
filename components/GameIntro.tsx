import { useState, useEffect } from 'react';
import { Character } from '../types/game';
import { getCharacterDialogue } from '../data/dialogues';
import { getCombinationDialogue, CombinationDialogue } from '../data/combinationDialogues';

interface GameIntroProps {
  selectedCharacters: Character[];
  humanPlayerIndex: number;
  onStartGame: () => void;
}

export function GameIntro({ selectedCharacters, humanPlayerIndex, onStartGame }: GameIntroProps) {
  const [visibleColumns, setVisibleColumns] = useState<boolean[]>([false, false, false, false]);
  const [messages, setMessages] = useState<string[]>(new Array(4).fill(''));
  const [selectedCombination, setSelectedCombination] = useState<CombinationDialogue | null>(null);
  const [showStartButton, setShowStartButton] = useState(false);

  // 各キャラクターの開始セリフを取得
  const getStartMessage = (characterId: number, combinationData: CombinationDialogue | null): string => {
    // 組み合わせセリフの優先チェック
    if (combinationData && combinationData.speaker === characterId) {
      console.log(`🎭 ✅ Using combination dialogue for character ${characterId}: "${combinationData.dialogue}"`);
      return combinationData.dialogue;
    }
    
    // 通常メッセージ
    console.log(`🎭 ⚪ Using normal gameStart dialogue for character ${characterId}`);
    return getCharacterDialogue(characterId, 'gameStart');
  };

  useEffect(() => {
    // 組み合わせチェック
    const selectedIds = selectedCharacters.map(char => char.id);
    
    let detectedCombination: CombinationDialogue | null = null;
    
    // 組み合わせをチェック
    detectedCombination = getCombinationDialogue(selectedIds);
    
    if (detectedCombination) {
      console.log(`🎭 ✅ Combination found from database:`);
      console.log(`🎭   🎯 Combination: [${detectedCombination.combination.join(', ')}]`);
      console.log(`🎭   🎯 Speaker: ${detectedCombination.speaker}`);
      console.log(`🎭   🎯 Dialogue: "${detectedCombination.dialogue}"`);
    } else {
      console.log(`🎭 ❌ No combinations found in database`);
    }
    
    // 状態を更新
    setSelectedCombination(detectedCombination);

    // スマブラ風のアニメーション開始
    const startAnimation = async () => {
      // 1. 縦ストライプを左から順次表示 (ドンドンドンドン効果)
      for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 600)); // 0.6秒間隔
        
        setVisibleColumns(prev => {
          const newVisible = [...prev];
          newVisible[i] = true;
          return newVisible;
        });
        
        // キャラクター登場と同時にセリフも設定
        const character = selectedCharacters[i];
        const message = getStartMessage(character.id, detectedCombination);
        
        // セリフを少し遅らせて表示（登場アニメーション完了後）
        setTimeout(() => {
          setMessages(prevMessages => {
            const newMessages = [...prevMessages];
            newMessages[i] = message;
            return newMessages;
          });
        }, 300); // 登場から0.3秒後にセリフ表示
      }
      
      // 2. 全員登場後、少し待ってからスタートボタン表示
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowStartButton(true);
      
      // 3. 自動でゲーム開始（3秒後）
      await new Promise(resolve => setTimeout(resolve, 3000));
      onStartGame();
    };

    // 状態更新完了後にアニメーション開始
    const timer = setTimeout(() => {
      startAnimation();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedCharacters, onStartGame]);

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* パーティクル背景効果 */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="w-full h-full animate-pulse"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px),
              radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px),
              radial-gradient(circle at 40% 80%, #ffffff 1px, transparent 1px),
              radial-gradient(circle at 60% 20%, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px, 150px 150px, 80px 80px, 120px 120px',
            backgroundPosition: '0 0, 50px 50px, 25px 75px, 75px 25px'
          }}
        />
      </div>

      {/* 中央タイトル（最初に表示） */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 animate-pulse text-center">
          大富豪バトル
        </h1>
        <p className="text-xl text-white text-center mt-2 font-bold tracking-wider">
          - CHARACTER SELECT -
        </p>
      </div>

      {/* 4つの縦ストライプ */}
      <div className="flex h-screen">
        {selectedCharacters.map((character, index) => (
          <div
            key={index}
            className={`
              flex-1 relative transition-all duration-800 ease-out
              ${visibleColumns[index] 
                ? 'transform translate-x-0 opacity-100' 
                : 'transform -translate-x-full opacity-0'
              }
            `}
            style={{
              background: `linear-gradient(180deg, 
                ${character.color}40 0%, 
                ${character.color}60 30%, 
                ${character.color}80 70%, 
                ${character.color}40 100%
              )`,
              borderRight: index < 3 ? '2px solid rgba(255, 255, 255, 0.3)' : 'none'
            }}
          >
            {/* キャラクター表示エリア */}
            <div className="flex flex-col h-full justify-center items-center p-6 relative">
              
              {/* プレイヤー番号とタイプ */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                <div className="text-center mb-2">
                  <div className="text-white text-2xl font-bold mb-1">
                    Player {index + 1}
                  </div>
                  {humanPlayerIndex === index ? (
                    <div className="inline-block px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold shadow-lg">
                      🎮 Human
                    </div>
                  ) : (
                    <div className="inline-block px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-lg">
                      🤖 CPU
                    </div>
                  )}
                </div>
              </div>

              {/* キャラクター画像エリア */}
              <div className="flex flex-col items-center mb-8">
                {/* キャラクターアバター */}
                <div 
                  className={`
                    w-40 h-40 rounded-full border-8 border-white 
                    flex items-center justify-center text-8xl shadow-2xl
                    transition-all duration-500
                    ${visibleColumns[index] ? 'animate-bounce' : ''}
                  `}
                  style={{
                    background: `radial-gradient(circle, ${character.color}80, ${character.color}60)`,
                    boxShadow: `0 0 40px ${character.color}60`
                  }}
                >
                  {character.avatar}
                </div>
                
                {/* キャラクター名 */}
                <div className="mt-6 text-center">
                  <h2 
                    className="text-4xl font-bold text-white mb-2 font-mono tracking-wider"
                    style={{
                      textShadow: `3px 3px 0px ${character.color}, -1px -1px 0px #000`
                    }}
                  >
                    {character.name}
                  </h2>
                  <p className="text-lg text-white/80 max-w-48 leading-tight">
                    {character.description}
                  </p>
                </div>
              </div>

              {/* セリフ吹き出し */}
              {messages[index] && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-xs animate-speech-pop">
                  <div 
                    className="relative bg-white rounded-xl p-4 border-4 border-gray-800 shadow-2xl"
                    style={{
                      background: selectedCombination && selectedCombination.speaker === character.id
                        ? 'linear-gradient(135deg, #fffacd, #fff8dc)'
                        : '#ffffff'
                    }}
                  >
                    {/* 特殊セリフのキラキラ効果 */}
                    {selectedCombination && selectedCombination.speaker === character.id && (
                      <>
                        <div className="absolute top-1 right-1 text-xl animate-pulse">✨</div>
                        <div className="absolute bottom-1 left-1 text-xl animate-pulse" style={{animationDelay: '0.5s'}}>⭐</div>
                      </>
                    )}
                    
                    <p 
                      className="text-center font-bold leading-tight"
                      style={{
                        color: selectedCombination && selectedCombination.speaker === character.id 
                          ? '#d97706' 
                          : '#000000',
                        fontSize: messages[index].length > 20 ? '14px' : '16px'
                      }}
                    >
                      {messages[index]}
                    </p>
                    
                    {/* 吹き出しの矢印 */}
                    <div 
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px]"
                      style={{
                        borderColor: `${selectedCombination && selectedCombination.speaker === character.id 
                          ? '#fff8dc' 
                          : '#ffffff'} transparent transparent transparent`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 登場エフェクト */}
              {visibleColumns[index] && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* 光の演出 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                  
                  {/* パーティクル効果 */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full animate-ping opacity-75"
                        style={{
                          left: `${Math.cos(i * 60 * Math.PI / 180) * 50}px`,
                          top: `${Math.sin(i * 60 * Math.PI / 180) * 50}px`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '1s'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ゲーム開始ボタン */}
      {showStartButton && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in">
          <button
            onClick={onStartGame}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-red-500 text-white text-2xl font-bold rounded-xl border-4 border-white shadow-2xl hover:scale-110 transform transition-all duration-300 animate-pulse"
            style={{
              textShadow: '2px 2px 0px #000',
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)'
            }}
          >
            🚀 バトル開始！
          </button>
          
          {/* カウントダウン表示 */}
          <div className="text-center mt-2">
            <p className="text-white text-sm">
              3秒後に自動で開始します...
            </p>
          </div>
        </div>
      )}

      {/* VS表示エフェクト（全員登場後） */}
      {showStartButton && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 animate-pulse">
          <div className="text-9xl font-bold text-white opacity-10 font-mono">
            VS
          </div>
        </div>
      )}
    </div>
  );
}