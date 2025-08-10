import { useState, useEffect } from "react";
import {
  GameState,
  Player as PlayerType,
  Card as CardType,
  GameAction,
} from "../types/game";
import { Card } from "./Card";
import { PlayerCard } from "./PlayerCard";
import { Button } from "./ui/button";
import {
  isValidPlay,
  checkRevolution,
  check8Cut,
  checkSuitLock,
  canWinWith,
  cardToString,
} from "../utils/gameLogic";
import { getRankComment, getCharacterDialogue } from "../data/dialogues";
import { ExpressionType } from "./ExpressionImage";
import { ExpressionTestPanel } from "./ExpressionTestPanel";
import { getCombinationDialogue } from "../data/combinationDialogues";
import { CHARACTERS } from "../data/characters";

interface GameBoardProps {
  gameState: GameState;
  onGameAction: (action: GameAction) => void;
  onBackToSetup: () => void;
  gameSpeed: number;
  onSpeedChange: (speed: number) => void;
  onEmergencyRefresh: () => void;
  debugMode: boolean;
  onDebugModeToggle: () => void;
  debugActions: {
    forceNextTurn: () => void;
    toggleRevolution: () => void;
    toggleSuitLock: () => void;
    clearField: () => void;
    togglePause: () => void;
    toggleExpressionTestMode: () => void;
    setAllPlayersExpression: (expression: ExpressionType) => void;
  };
  aiProcessInfo: {
    isProcessing: boolean;
    processCount: number;
    lastActivityTime: number;
  };
  isPaused: boolean;
  expressionTestMode?: boolean;
  setExpressionTestMode?: (mode: boolean) => void;
}

export function GameBoard({
  gameState,
  onGameAction,
  onBackToSetup,
  gameSpeed,
  onSpeedChange,
  onEmergencyRefresh,
  debugMode,
  onDebugModeToggle,
  debugActions,
  aiProcessInfo,
  isPaused,
  expressionTestMode = false,
  setExpressionTestMode,
}: GameBoardProps) {
  // 人間プレイヤー操作関連を削除（CPU専用観戦モード）
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // 組み合わせ台詞システム（最小限）
  const [introDialogues, setIntroDialogues] = useState<{[playerId: number]: string}>({});
  const [showIntroDialogues, setShowIntroDialogues] = useState(false);
  const [dialogueInitialized, setDialogueInitialized] = useState(false);
  
  // ローカルステートの代わりにpropsのexpressionTestModeとsetExpressionTestModeを使用

  // カード演出の状態管理
  const [previousFieldCards, setPreviousFieldCards] = useState<
    CardType[]
  >([]);
  const [isCardAnimating, setIsCardAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<
    "none" | "stacking" | "clearing"
  >("none");
  const [showPreviousCards, setShowPreviousCards] =
    useState(false);

  const currentPlayer =
    gameState.players[gameState.currentPlayer];
  // 全プレイヤーCPUのため、isHumanTurnは常にfalse

  // 残り手札がある人数をカウント（反則上がりを除く）
  const remainingPlayers = gameState.players.filter(
    (player) =>
      player.hand.length > 0 && !player.isFoulFinished,
  );

  // ゲーム開始前の組み合わせ台詞システム
  useEffect(() => {
    console.log('🎭 GameBoard: useEffect triggered');
    console.log('🎭 GameBoard: dialogueInitialized:', dialogueInitialized);
    console.log('🎭 GameBoard: gameState.players.length:', gameState.players.length);
    
    if (!dialogueInitialized && gameState.players.length === 4) {
      console.log('🎭 GameBoard: ✅ Conditions met - starting NEW dialogue initialization logic');
      // キャラクターIDを取得
      const characterIds = gameState.players.map(player => {
        const character = CHARACTERS.find(char => char.name === player.character.name);
        return character ? character.id : 0;
      }).filter(id => id > 0);

      console.log('🎭 GameBoard: Character IDs for combination check:', characterIds);

      // 組み合わせ台詞を取得
      const dialogue = getCombinationDialogue(characterIds);
      console.log('🎭 GameBoard: Combination dialogue result:', dialogue ? `Found (speaker: ${dialogue.speaker})` : 'None');
      
      console.log('🎭 GameBoard: 📝 NEW LOGIC - Starting dialogue setup for all players');
      
      const allDialogues: {[playerId: number]: string} = {};
      
      // 【新しいロジック】まず全プレイヤーにgameStart台詞を設定
      gameState.players.forEach(player => {
        const character = CHARACTERS.find(char => char.name === player.character.name);
        
        if (character) {
          const gameStartDialogue = getCharacterDialogue(character.id, 'gameStart');
          console.log(`🎭 GameBoard: Setting gameStart for ${character.name}: "${gameStartDialogue}"`);
          allDialogues[player.id] = gameStartDialogue;
        } else {
          console.log(`🎭 GameBoard: ❌ CHARACTER NOT FOUND for player:`, player.character.name);
        }
      });
      
      // 【新しいロジック】組み合わせ台詞がある場合は該当発言者のみ上書き
      if (dialogue) {
        console.log('🎭 GameBoard: ✅ Combination dialogue found - overriding speaker');
        
        // 発言者を特定
        const speakerCharacter = CHARACTERS.find(char => char.id === dialogue.speaker);
        const speakerPlayer = gameState.players.find(player => player.character.name === speakerCharacter?.name);
        
        if (speakerCharacter && speakerPlayer) {
          console.log(`🎭 GameBoard: Overriding ${speakerCharacter.name}: "${dialogue.dialogue}"`);
          
          // 発言者の台詞を組み合わせ台詞で上書き
          allDialogues[speakerPlayer.id] = dialogue.dialogue;
        } else {
          console.log('🎭 GameBoard: ❌ Could not find speaker character or player');
        }
      } else {
        console.log('🎭 GameBoard: No combination dialogue - all players use gameStart');
      }
      
      console.log('🎭 GameBoard: Final dialogues setup:', Object.keys(allDialogues).map(key => {
        const player = gameState.players.find(p => p.id === parseInt(key));
        return `${player?.character.name}: "${allDialogues[parseInt(key)]}"`;
      }).join(', '));
      
      setIntroDialogues(allDialogues);
      setShowIntroDialogues(true);
      
      console.log('🎭 GameBoard: ✅ Dialogues set - should display for 4 seconds');
      
      // 4秒後に台詞を非表示
      setTimeout(() => {
        console.log('🎭 GameBoard: ⏰ 4 seconds elapsed - hiding dialogues');
        setShowIntroDialogues(false);
        setIntroDialogues({});
      }, 4000);
      
      setDialogueInitialized(true);
      console.log('🎭 GameBoard: ✅ Dialogue initialization completed');
    } else {
      console.log('🎭 GameBoard: ❌ Conditions not met for dialogue initialization');
    }
    
    console.log('🎭 GameBoard: useEffect ended');
  }, [gameState.players, dialogueInitialized]);

  // デバッグ用: 台詞関連状態の監視
  useEffect(() => {
    console.log('🎭 GameBoard: 🔄 State change detected');
    console.log('🎭 GameBoard: showIntroDialogues:', showIntroDialogues);
    console.log('🎭 GameBoard: introDialogues keys:', Object.keys(introDialogues));
    console.log('🎭 GameBoard: introDialogues content:', introDialogues);
    
    if (showIntroDialogues && Object.keys(introDialogues).length > 0) {
      console.log('🎭 GameBoard: 🎤 Dialogues should be visible now:');
      Object.entries(introDialogues).forEach(([playerId, dialogue]) => {
        const player = gameState.players.find(p => p.id === parseInt(playerId));
        console.log(`🎭 GameBoard: Player ${player?.character.name} (ID: ${playerId}): "${dialogue}"`);
      });
    }
  }, [showIntroDialogues, introDialogues, gameState.players]);

  // カードが変更された時のアニメーション処理
  useEffect(() => {
    const currentCards = gameState.field;
    const prevCards = previousFieldCards;

    // 八切り演出中はカードアニメーションをスキップ
    if (gameState.eightCutState?.isActive) {
      setPreviousFieldCards(currentCards);
      return;
    }

    // 場がクリアされた場合（八切り・全員パス）
    if (currentCards.length === 0 && prevCards.length > 0) {
      setIsCardAnimating(true);
      setAnimationPhase("clearing");
      setShowPreviousCards(true);

      // クリアアニメーション完了後
      setTimeout(() => {
        setIsCardAnimating(false);
        setAnimationPhase("none");
        setShowPreviousCards(false);
        setPreviousFieldCards([]);
      }, 600);
      return;
    }

    // カードが新しく出された場合（重ね演出）
    if (
      currentCards.length > 0 &&
      prevCards.length > 0 &&
      JSON.stringify(currentCards) !== JSON.stringify(prevCards)
    ) {
      setIsCardAnimating(true);
      setAnimationPhase("stacking");
      setShowPreviousCards(true);

      // 重ねアニメーション完了後、前のカードを隠す
      setTimeout(() => {
        setShowPreviousCards(false);
        setIsCardAnimating(false);
        setAnimationPhase("none");
        setPreviousFieldCards(currentCards);
      }, 500);
    } else {
      // 初回表示時はシンプルに表示（アニメーションなし）
      setPreviousFieldCards(currentCards);
    }
  }, [gameState.field, gameState.eightCutState?.isActive]);

  // ESCキーで履歴とメニューと表情確認パネルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expressionTestMode && setExpressionTestMode) {
          setExpressionTestMode(false);
        } else if (showHistory) {
          setShowHistory(false);
        } else if (showMenu) {
          setShowMenu(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
  }, [showHistory, showMenu, expressionTestMode, setExpressionTestMode]);

  // 人間プレイヤー操作機能削除（CPU専用観戦モード）

  // 役職を取得する関数（修正版・上がり順序ベース）
  const getPlayerRole = (rank: number): string => {
    switch (rank) {
      case 0:
        return "大富豪";
      case 1:
        return "富豪";
      case 2:
        return "貧民";
      case 3:
        return "大貧民";
      default:
        return "平民";
    }
  };

  // ドラクエ風背景スタイル
  const getBackgroundStyle = () => {
    if (gameState.isRevolution) {
      return "bg-gradient-to-br from-red-600 via-orange-500 via-yellow-400 via-green-500 via-blue-500 via-indigo-600 to-purple-600";
    }
    return "bg-gradient-to-br from-slate-700 via-slate-800 to-gray-900";
  };

  // 速度表示テキスト
  const getSpeedText = (speed: number): string => {
    if (speed >= 8) return "🚀 高速";
    if (speed >= 4) return "⚡ 速い";
    if (speed >= 2) return "🏃 普通";
    return "🚶 ゆっくり";
  };

  // 順位ソート関数（finishOrderベース、反則上がり考慮）
  const getSortedPlayers = () => {
    return gameState.players.slice().sort((a, b) => {
      const aIndex = gameState.finishOrder.indexOf(a.id);
      const bIndex = gameState.finishOrder.indexOf(b.id);

      // 両方とも上がっている場合は上がり順で比較
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // 片方だけ上がっている場合は上がっている方が上位
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // 両方とも上がっていない場合は手札数で比較
      return a.hand.length - b.hand.length;
    });
  };

  // カード表示用のヘルパー関数
  const renderFieldCards = () => {
    // ゲーム終了時は最優先で「ゲーム終了！」を表示
    if (gameState.gamePhase === "finished") {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center">
            <div className="text-6xl mb-4 font-mono">🏁</div>
            <div
              className="text-white font-bold text-3xl font-mono"
              style={{
                textShadow:
                  "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
              }}
            >
              ゲーム終了！
            </div>
            <div
              className="text-lg text-gray-300 font-mono mt-2"
              style={{
                textShadow: "1px 1px 0px #000",
              }}
            >
              プレイヤーの感想をご覧ください
            </div>
          </div>
        </div>
      );
    }

    // 八切り演出中は８のカードを表示（固定サイズ対応）
    if (gameState.eightCutState?.isActive) {
      return (
        <div className="flex justify-center items-center gap-4 w-full h-full">
          {gameState.eightCutState.eightCards.map((card) => (
            <div key={card.id} className="transform scale-110">
              <Card card={card} size="large" />
            </div>
          ))}
        </div>
      );
    }

    // 場クリア演出中（八切り・全員パス・固定サイズ対応）
    if (animationPhase === "clearing" && showPreviousCards) {
      return (
        <div className="flex justify-center items-center gap-4 w-full h-full">
          {previousFieldCards.map((card) => (
            <div
              key={card.id}
              className="animate-card-fade-down"
            >
              <Card card={card} size="large" />
            </div>
          ))}
        </div>
      );
    }

    // 通常時のカード表示（重ね演出対応・固定サイズ対応）
    if (gameState.field.length > 0 || showPreviousCards) {
      return (
        <div className="relative flex justify-center items-center gap-4 w-full h-full">
          {/* 前のカード（後ろに薄く表示） */}
          {showPreviousCards &&
            animationPhase === "stacking" &&
            previousFieldCards.map((card) => (
              <div
                key={`prev-${card.id}`}
                className="absolute animate-card-fade-behind"
                style={{ zIndex: 1 }}
              >
                <Card card={card} size="large" />
              </div>
            ))}

          {/* 現在のカード（前面に表示） */}
          {gameState.field.map((card) => (
            <div
              key={card.id}
              className={`${
                animationPhase === "stacking"
                  ? "animate-card-stack-in"
                  : ""
              }`}
              style={{ zIndex: 2 }}
            >
              <Card card={card} size="large" />
            </div>
          ))}
        </div>
      );
    }

    // カードがない場合の表示（通常時）
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="text-4xl mb-2 font-mono">🎯</div>
          <div
            className="text-white font-bold text-lg font-mono"
            style={{
              textShadow: "1px 1px 0px #000",
            }}
          >
            CPU対戦を観戦中...
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen ${getBackgroundStyle()} relative overflow-hidden transition-all duration-1000 ${isPaused ? "filter grayscale-50" : ""}`}
    >
      {/* ドット絵風パターン背景 */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, white 2px, transparent 2px)
            `,
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 20px 20px",
          }}
        />
      </div>

      {/* 革命時の特別エフェクト（ドット絵風） */}
      {gameState.isRevolution && (
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-yellow-400 animate-ping rounded-full"></div>
          <div className="absolute top-3/4 right-1/4 w-6 h-6 bg-pink-400 animate-bounce rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 w-10 h-10 bg-cyan-400 transform rotate-45"></div>
        </div>
      )}

      {/* 一時停止オーバーレイ */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900 border-8 border-white p-8 shadow-2xl rounded-xl pointer-events-auto">
            <div className="text-center">
              <div className="text-6xl mb-4 font-mono">⏸️</div>
              <div
                className="text-3xl font-bold text-white mb-4 font-mono"
                style={{
                  textShadow:
                    "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
                }}
              >
                ゲーム一時停止中
              </div>
              <div
                className="text-lg text-white font-mono"
                style={{
                  textShadow: "1px 1px 0px #000",
                }}
              >
                デバッグメニューから再開できます
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 履歴表示モーダル */}
      {showHistory && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-8 border-white shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden relative">
            {/* ドラクエ風角装飾 */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>

            {/* ヘッダー */}
            <div className="p-6 border-b-4 border-white bg-slate-800 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-mono">📜</div>
                  <div
                    className="text-2xl font-bold text-white font-mono"
                    style={{
                      textShadow: "2px 2px 0px #000",
                    }}
                  >
                    ゲーム履歴
                  </div>
                  <div className="px-4 py-2 bg-blue-600 text-white font-bold rounded-full font-mono">
                    {gameState.playHistory.length} 回
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="px-6 py-3 border-4 font-bold bg-red-600 hover:bg-red-700 text-white border-white shadow-lg transition-all duration-200 font-mono"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  ❌ 閉じる
                </button>
              </div>
            </div>

            {/* 履歴内容 */}
            <div className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar">
              {gameState.playHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 font-mono">
                    🎯
                  </div>
                  <div
                    className="text-xl text-white font-mono"
                    style={{
                      textShadow: "1px 1px 0px #000",
                    }}
                  >
                    まだ履歴がありません
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameState.playHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-slate-800 border-2 border-white p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-blue-600 text-white font-bold rounded-full font-mono text-sm">
                          {index + 1}
                        </div>
                        <div
                          className="text-lg font-bold font-mono"
                          style={{
                            color: entry.playerColor,
                            textShadow: "1px 1px 0px #000",
                          }}
                        >
                          {entry.playerName}
                        </div>
                        <div className="flex items-center gap-3">
                          {entry.playType === "pass" ? (
                            <div className="px-3 py-1 bg-gray-600 text-white font-bold rounded font-mono text-sm">
                              パス
                            </div>
                          ) : (
                            <>
                              {/* カード画像部分 */}
                              <div className="flex gap-1">
                                {entry.cards.map(
                                  (card, cardIndex) => (
                                    <div
                                      key={cardIndex}
                                      className="transform scale-50 origin-center"
                                    >
                                      <Card
                                        card={card}
                                        size="small"
                                      />
                                    </div>
                                  ),
                                )}
                              </div>
                              {/* カード名テキスト部分 */}
                              <div
                                className="text-white font-mono"
                                style={{
                                  textShadow:
                                    "1px 1px 0px #000",
                                }}
                              >
                                {entry.cards
                                  .map((card) =>
                                    cardToString(card),
                                  )
                                  .join(", ")}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 font-mono">
                        {new Date(
                          entry.timestamp,
                        ).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="p-4 border-t-4 border-white bg-slate-800 text-center">
              <div className="text-gray-400 text-sm font-mono">
                ESCキーまたは「閉じる」ボタンで履歴を閉じます
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 表情確認パネル */}
      <ExpressionTestPanel
        isVisible={expressionTestMode || false}
        onExpressionSelect={(expression) => {
          console.log('GameBoard: Expression selected:', expression);
          try {
            debugActions.setAllPlayersExpression(expression);
            console.log('GameBoard: setAllPlayersExpression called successfully');
          } catch (error) {
            console.error('GameBoard: Error setting expression:', error);
          }
        }}
        onClose={() => {
          console.log('GameBoard: ExpressionTestPanel closing');
          if (setExpressionTestMode) {
            setExpressionTestMode(false);
          }
        }}
      />



      {/* デバッグメニューモーダル */}
      {showMenu && (
        <div className="fixed inset-0 z-[10500] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-8 border-white shadow-2xl max-w-md w-full overflow-hidden relative">
            {/* ドラクエ風角装飾 */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>

            {/* ヘッダー */}
            <div className="p-6 border-b-4 border-white bg-slate-800 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-mono">⚙️</div>
                  <div
                    className="text-2xl font-bold text-white font-mono"
                    style={{
                      textShadow: "2px 2px 0px #000",
                    }}
                  >
                    デバッグメニュー
                  </div>
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="px-4 py-2 border-4 font-bold bg-red-600 hover:bg-red-700 text-white border-white shadow-lg transition-all duration-200 font-mono"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  ❌
                </button>
              </div>
            </div>

            {/* メニュー内容 */}
            <div className="p-6 space-y-4">
              {/* デバッグ機能一覧 */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    debugActions.forceNextTurn();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🔄 ターン強制進行
                </button>

                <button
                  onClick={() => {
                    debugActions.toggleRevolution();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🔀 革命切り替え
                </button>

                <button
                  onClick={() => {
                    debugActions.toggleSuitLock();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🃏 マーク縛り切り替え
                </button>

                <button
                  onClick={() => {
                    debugActions.clearField();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🗑️ 場をクリア
                </button>

                <button
                  onClick={() => {
                    if (setExpressionTestMode) {
                      setExpressionTestMode(true);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🎭 表情確認
                </button>

                <button
                  onClick={() => {
                    debugActions.togglePause();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  ⏸️ 一時停止切り替え
                </button>
              </div>

              {/* その他機能 */}
              <div className="border-t-2 border-white pt-4 space-y-3">
                <button
                  onClick={() => {
                    setShowHistory(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  📜 ゲーム履歴
                </button>

                <button
                  onClick={() => {
                    onDebugModeToggle();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white border-2 border-white font-bold font-mono shadow-lg transition-all duration-200"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🐛 デバッグモード終了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* デバッグメニューボタン（右下固定） */}
      {debugMode && (
        <div className="absolute bottom-4 right-4 z-[100]">
          <button
            onClick={() => setShowMenu(true)}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white border-4 border-white font-bold font-mono shadow-lg transition-all duration-200"
            style={{ textShadow: "1px 1px 0px #000" }}
          >
            ⚙️ メニュー
          </button>
        </div>
      )}

      {/* 新しいレイアウト：白枠ベース（表情エリア対応・マージン拡大） */}
      <div className="h-screen relative">
        {/* 左上エリア - プレイヤー2（マージン拡大：表情エリア160px+はみ出し40px=200pxを考慮して80pxマージン） */}
        <div className="absolute top-16 left-16 w-80 h-80 z-30">
          <PlayerCard
            player={gameState.players[2]}
            isCurrentPlayer={gameState.currentPlayer === 2}
            position="top-left"
            showDebugHand={debugMode}
            finishOrder={gameState.finishOrder}
            allPlayers={gameState.players}
            introDialogue={(() => {
              const dialogue = showIntroDialogues ? (introDialogues[gameState.players[2].id] || null) : null;
              if (dialogue) console.log(`🎭 GameBoard: Passing introDialogue to Player 2 (${gameState.players[2].character.name}): "${dialogue}"`);
              return dialogue;
            })()}
          />
        </div>

        {/* 右上エリア - プレイヤー3（マージン拡大） */}
        <div className="absolute top-16 right-16 w-80 h-80 z-30">
          <PlayerCard
            player={gameState.players[3]}
            isCurrentPlayer={gameState.currentPlayer === 3}
            position="top-right"
            showDebugHand={debugMode}
            finishOrder={gameState.finishOrder}
            allPlayers={gameState.players}
            introDialogue={(() => {
              const dialogue = showIntroDialogues ? (introDialogues[gameState.players[3].id] || null) : null;
              if (dialogue) console.log(`🎭 GameBoard: Passing introDialogue to Player 3 (${gameState.players[3].character.name}): "${dialogue}"`);
              return dialogue;
            })()}
          />
        </div>

        {/* 左下エリア - プレイヤー1（マージン拡大） */}
        <div className="absolute bottom-16 left-16 w-80 h-80 z-30">
          <PlayerCard
            player={gameState.players[1]}
            isCurrentPlayer={gameState.currentPlayer === 1}
            position="bottom-left"
            showDebugHand={debugMode}
            finishOrder={gameState.finishOrder}
            allPlayers={gameState.players}
            introDialogue={(() => {
              const dialogue = showIntroDialogues ? (introDialogues[gameState.players[1].id] || null) : null;
              if (dialogue) console.log(`🎭 GameBoard: Passing introDialogue to Player 1 (${gameState.players[1].character.name}): "${dialogue}"`);
              return dialogue;
            })()}
          />
        </div>

        {/* 右下エリア - プレイヤー0（CPU）（マージン拡大） */}
        <div className="absolute bottom-16 right-16 w-80 h-80 z-30">
          <PlayerCard
            player={gameState.players[0]}
            isCurrentPlayer={gameState.currentPlayer === 0}
            position="bottom-right"
            showDebugHand={debugMode}
            finishOrder={gameState.finishOrder}
            allPlayers={gameState.players}
            introDialogue={(() => {
              const dialogue = showIntroDialogues ? (introDialogues[gameState.players[0].id] || null) : null;
              if (dialogue) console.log(`🎭 GameBoard: Passing introDialogue to Player 0 (${gameState.players[0].character.name}): "${dialogue}"`);
              return dialogue;
            })()}
          />
        </div>

        {/* 速度調整コントロール（中央上部・横長・位置微調整） */}
        <div
          className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900 border-4 border-white p-4 shadow-2xl"
          style={{ width: "600px" }}
        >
          <div className="flex items-center gap-6">
            {/* 左側タイトルとプリセットボタン */}
            <div className="flex items-center gap-4">
              <div
                className="text-white text-sm font-bold font-mono"
                style={{
                  textShadow: "1px 1px 0px #000",
                }}
              >
                ⚙️ ゲーム速度
              </div>

              {/* 速度プリセットボタン（横並び） */}
              <div className="flex gap-2">
                {[
                  { speed: 0.5, label: "🚶", text: "ゆっくり" },
                  { speed: 1, label: "🏃", text: "普通" },
                  { speed: 2, label: "⚡", text: "速い" },
                  { speed: 4, label: "🚀", text: "高速" },
                ].map(({ speed, label, text }) => (
                  <button
                    key={speed}
                    onClick={() => onSpeedChange(speed)}
                    className={`px-3 py-2 text-xs font-bold transition-all duration-200 border-2 font-mono min-w-16 ${
                      gameSpeed === speed
                        ? "bg-yellow-500 text-black border-white shadow-lg scale-105"
                        : "bg-gray-700 text-white border-gray-400 hover:bg-gray-600"
                    }`}
                    style={{
                      textShadow:
                        gameSpeed === speed
                          ? "1px 1px 0px #000"
                          : undefined,
                    }}
                  >
                    <div>{label}</div>
                    <div className="text-xs">{text}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 中央：カスタムスライダー */}
            <div className="flex-1 mx-4">
              <input
                type="range"
                min="0.25"
                max="8"
                step="0.25"
                value={gameSpeed}
                onChange={(e) =>
                  onSpeedChange(parseFloat(e.target.value))
                }
                className="w-full h-3 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((gameSpeed - 0.25) / (8 - 0.25)) * 100}%, #4b5563 ${((gameSpeed - 0.25) / (8 - 0.25)) * 100}%, #4b5563 100%)`,
                }}
              />
            </div>

            {/* 右側：現在の速度表示 */}
            <div
              className="text-white text-sm font-mono text-center"
              style={{
                textShadow: "1px 1px 0px #000",
                minWidth: "80px",
              }}
            >
              <div>{getSpeedText(gameSpeed)}</div>
              <div className="text-xs">({gameSpeed}x)</div>
            </div>
          </div>
        </div>

        {/* 中央のゲーム情報とカード場（白枠ベース・圧縮サイズ・位置微調整） */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[60vw] z-10"
          style={{ marginTop: "20px" }}
        >
          <div className="bg-slate-900 rounded-none p-6 border-8 border-white shadow-2xl relative h-[500px] flex flex-col">
            {/* ドラクエ風角装飾（白・角丸） */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>

            {/* ターンインジケーター（全プレイヤー表示・履歴付き・適切サイズ） */}
            <div className="text-center mb-3 min-h-[130px] flex flex-col justify-center">
              {/* 状態表示タイトル */}
              <div
                className="text-lg font-bold text-white mb-3 font-mono"
                style={{
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                }}
              >
                {isPaused
                  ? "⏸️ 一時停止中"
                  : gameState.eightCutState?.isActive
                    ? `🎴 ${gameState.eightCutState.playerName} の八切り！`
                    : gameState.gamePhase === "finished"
                      ? "🏁 ゲーム終了"
                      : "📍 現在のターン"}
              </div>

              {/* 全プレイヤーのターンインジケーター（履歴付き・適切サイズ） */}
              <div className="flex items-center justify-center gap-5">
                {gameState.players.map((player, index) => {
                  const isCurrentTurn =
                    gameState.currentPlayer === index &&
                    !isPaused &&
                    !gameState.eightCutState?.isActive &&
                    gameState.gamePhase === "playing";
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2"
                    >
                      {/* プレイヤー名と履歴のコンテナ */}
                      <div className="relative">
                        {/* プレイヤー名（適切サイズ・読みやすい影） */}
                        <div
                          className={`px-5 py-3 border-2 font-bold font-mono transition-all duration-300 text-lg ${
                            isCurrentTurn
                              ? "bg-white text-black border-yellow-400 shadow-xl scale-110"
                              : "bg-slate-600 text-gray-200 border-gray-500"
                          }`}
                          style={{
                            color: isCurrentTurn
                              ? "#000"
                              : player.character.color,
                            textShadow: isCurrentTurn
                              ? "1px 1px 1px rgba(0,0,0,0.5)"
                              : "1px 1px 2px rgba(0,0,0,0.8)",
                            borderWidth: "2px",
                          }}
                        >
                          {player.character.name}
                        </div>

                        {/* プレイヤーの履歴表示（右上） */}
                        {player.lastAction && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div
                              className={`px-2 py-1 text-xs font-bold font-mono border rounded-full shadow-lg transition-all duration-200 ${
                                player.lastAction.type ===
                                "play"
                                  ? "bg-blue-600 text-white border-blue-400"
                                  : "bg-gray-600 text-white border-gray-400"
                              }`}
                              style={{
                                textShadow:
                                  "1px 1px 0px rgba(0,0,0,0.5)",
                                fontSize: "11px",
                                minWidth: "28px",
                                textAlign: "center",
                              }}
                            >
                              {player.lastAction.description}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* アクティブプレイヤーの矢印（点滅・拡大版） */}
                      {isCurrentTurn && (
                        <div
                          className="text-2xl text-yellow-400 animate-pulse font-mono"
                          style={{
                            textShadow:
                              "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000",
                          }}
                        >
                          ▶
                        </div>
                      )}

                      {/* プレイヤー間の区切り（最後以外・拡大版） */}
                      {index < gameState.players.length - 1 &&
                        !isCurrentTurn && (
                          <div className="text-gray-600 text-xl font-mono">
                            -
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 特殊状態表示（固定高さ・圧縮） */}
            <div className="flex justify-center gap-3 mb-2 min-h-[25px] items-center">
              {gameState.suitLock && (
                <div
                  className="px-3 py-1 bg-orange-600 text-white font-bold font-mono text-sm"
                  style={{
                    textShadow: "1px 1px 0px #000",
                  }}
                >
                  🔒{" "}
                  {gameState.suitLock === "spades"
                    ? "♠"
                    : gameState.suitLock === "hearts"
                      ? "♥"
                      : gameState.suitLock === "diamonds"
                        ? "♦"
                        : "♣"}{" "}
                  縛り発動中
                </div>
              )}
              {gameState.isRevolution && (
                <div
                  className="px-3 py-1 bg-red-600 text-white font-bold font-mono text-sm"
                  style={{
                    textShadow: "1px 1px 0px #000",
                  }}
                >
                  🔄 革命状態
                </div>
              )}
            </div>

            {/* 継続条件表示（八切り時は特別表示・固定高さ・圧縮） */}
            <div className="flex justify-center mb-2 min-h-[25px] items-center">
              {isPaused ? (
                <div
                  className="px-3 py-1 bg-gray-600 text-white font-bold font-mono text-sm"
                  style={{
                    textShadow: "1px 1px 0px #000",
                  }}
                >
                  ⏸️ ゲーム一時停止中
                </div>
              ) : gameState.eightCutState?.isActive ? (
                <div
                  className="px-3 py-1 bg-orange-600 text-white font-bold font-mono text-sm"
                  style={{
                    textShadow: "1px 1px 0px #000",
                  }}
                >
                  🎴 八切り！場が流れます
                </div>
              ) : (
                gameState.lastPlayType &&
                gameState.gamePhase === "playing" && (
                  <div className="px-3 py-1 bg-slate-800 text-white font-medium font-mono text-sm">
                    📋{" "}
                    {gameState.lastPlayType === "single"
                      ? "1枚出し"
                      : gameState.lastPlayType === "pair"
                        ? "ペア出し"
                        : gameState.lastPlayType === "triple"
                          ? "トリプル出し"
                          : "ストレート出し"}{" "}
                    で継続中 ({gameState.lastPlayCount}枚)
                  </div>
                )
              )}
            </div>

            {/* カード表示エリア（演出対応版・元のサイズに戻す・マージン圧縮） */}
            <div className="flex justify-center items-center gap-4 mb-2 min-h-[240px] w-full bg-black border-4 border-white p-6 relative overflow-hidden flex-1">
              {/* ドット絵風装飾（白・角丸） */}
              <div className="absolute top-2 left-2 w-4 h-4 bg-white rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 bg-white rounded-full"></div>
              <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 bg-white rounded-full"></div>

              {/* カード表示（演出付き） */}
              {renderFieldCards()}
            </div>

            {/* アクションボタンエリア（CPU専用観戦モードのため削除） */}

            {/* メニューボタン（黒白・漢字使用・固定高さ・圧縮） */}
            <div className="flex justify-center gap-3 min-h-[30px] items-start">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 border-2 font-medium bg-black hover:bg-gray-800 text-white border-white shadow-md transition-all duration-200 font-mono text-sm"
              >
                📜 履歴 {showHistory ? "非表示" : "表示"} (
                {gameState.playHistory.length})
              </button>
              <button
                onClick={onEmergencyRefresh}
                className="px-4 py-2 border-2 font-medium bg-yellow-600 hover:bg-yellow-700 text-white border-white shadow-md transition-all duration-200 font-mono text-sm"
              >
                🔄 リフレッシュ
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-4 py-2 border-2 font-medium bg-gray-800 hover:bg-black text-white border-white shadow-md transition-all duration-200 font-mono text-sm"
              >
                🔧 メニュー
              </button>

              {/* ゲーム終了時の「もう一回！」ボタン */}
              {gameState.gamePhase === "finished" && (
                <button
                  onClick={onBackToSetup}
                  className="px-6 py-2 border-4 font-bold bg-green-600 hover:bg-green-700 text-white border-white shadow-lg transition-all duration-200 font-mono text-sm animate-bounce"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🎮 もう一回！
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 🔧メニュー表示（中央配置・高z-index対応） */}
        {showMenu && (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-8 border-white p-6 shadow-2xl max-w-md w-full modal-animate-in relative">
              {/* ドラクエ風角装飾 */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
              
              <div
                className="text-white font-bold mb-4 font-mono text-2xl text-center"
                style={{
                  textShadow: "2px 2px 0px #000",
                }}
              >
                🔧 ゲームメニュー
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full px-6 py-3 border-4 font-bold bg-gray-600 hover:bg-gray-700 text-white border-white shadow-lg transition-all duration-200 font-mono text-base"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  ❌ メニューを閉じる
                </button>
                <button
                  onClick={onBackToSetup}
                  className="w-full px-6 py-3 border-4 font-bold bg-red-600 hover:bg-red-700 text-white border-white shadow-lg transition-all duration-200 font-mono text-base"
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🏠 セットアップに戻る
                </button>
                <button
                  onClick={onDebugModeToggle}
                  className={`w-full px-6 py-3 border-4 font-bold shadow-lg transition-all duration-200 font-mono text-base ${
                    debugMode
                      ? "bg-yellow-600 hover:bg-yellow-700 text-black border-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white border-white"
                  }`}
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  🐛 デバッグモード {debugMode ? "OFF" : "ON"}
                </button>
                <button
                  onClick={debugActions.togglePause}
                  className={`w-full px-6 py-3 border-4 font-bold shadow-lg transition-all duration-200 font-mono text-base ${
                    isPaused
                      ? "bg-green-600 hover:bg-green-700 text-white border-white"
                      : "bg-orange-600 hover:bg-orange-700 text-white border-white"
                  }`}
                  style={{ textShadow: "1px 1px 0px #000" }}
                >
                  {isPaused ? "▶️ 再開" : "⏸️ 一時停止"}
                </button>
                {debugMode && (
                  <div className="space-y-2 pt-4 border-t-4 border-white">
                    <div className="text-sm text-gray-300 font-mono mb-3 text-center font-bold">
                      🔧 デバッグ機能
                    </div>
                    <button
                      onClick={debugActions.forceNextTurn}
                      className="w-full px-4 py-2 border-2 font-medium bg-blue-600 hover:bg-blue-700 text-white border-white text-sm font-mono shadow-md transition-all duration-200"
                      style={{ textShadow: "1px 1px 0px #000" }}
                    >
                      ⏭️ 強制ターン送り
                    </button>
                    <button
                      onClick={debugActions.toggleRevolution}
                      className="w-full px-4 py-2 border-2 font-medium bg-purple-600 hover:bg-purple-700 text-white border-white text-sm font-mono shadow-md transition-all duration-200"
                      style={{ textShadow: "1px 1px 0px #000" }}
                    >
                      🔄 革命切替
                    </button>
                    <button
                      onClick={debugActions.clearField}
                      className="w-full px-4 py-2 border-2 font-medium bg-gray-600 hover:bg-gray-700 text-white border-white text-sm font-mono shadow-md transition-all duration-200"
                      style={{ textShadow: "1px 1px 0px #000" }}
                    >
                      🗑️ 場をクリア
                    </button>
                    <div className="text-xs text-yellow-300 font-mono mt-3 p-3 border-2 border-yellow-400 bg-yellow-900/30 rounded">
                      <div className="font-bold mb-1">📊 AI処理状況</div>
                      状態: {aiProcessInfo.isProcessing ? "実行中" : "待機中"}
                      <br />
                      処理回数: {aiProcessInfo.processCount}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}