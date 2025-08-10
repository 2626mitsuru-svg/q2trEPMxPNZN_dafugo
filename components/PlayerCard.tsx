import { Player as PlayerType, Card as CardType } from "../types/game";
import { Card } from "./Card";
import { ExpressionImage, ExpressionType } from "./ExpressionImage";

interface PlayerCardProps {
  player: PlayerType;
  isCurrentPlayer: boolean;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  showDebugHand?: boolean;
  // 追加: ゲーム終了情報
  finishOrder?: number[];
  // 追加: 全プレイヤー情報（反則負け判定用）
  allPlayers?: PlayerType[];
  // 追加: 組み合わせ台詞表示用
  introDialogue?: string | null;
}

export function PlayerCard({
  player,
  isCurrentPlayer,
  position,
  showDebugHand = false,
  finishOrder = [],
  allPlayers = [],
  introDialogue = null,
}: PlayerCardProps) {
  // 反則負けを考慮した実際の順位を計算する関数（新規追加）
  const calculateActualRank = (targetPlayer: PlayerType): number => {
    console.log(`🏆 PlayerCard: Calculating actual rank for ${targetPlayer.character.name} (ID: ${targetPlayer.id})`);
    console.log(`🏆 PlayerCard: Player isFoulFinished: ${targetPlayer.isFoulFinished}`);
    console.log(`🏆 PlayerCard: FinishOrder: [${finishOrder.map(id => {
      const p = allPlayers.find(ap => ap.id === id);
      return `${id}:${p?.character.name}${p?.isFoulFinished ? '(反則)' : ''}`;
    }).join(', ')}]`);
    
    // 反則負けの場合は問答無用で最下位（4位・大貧民）
    if (targetPlayer.isFoulFinished) {
      console.log(`🏆 PlayerCard: ${targetPlayer.character.name} is foul finished -> rank 4 (大貧民)`);
      return 3; // 0-based index で 3 = 4位
    }
    
    // 正常上がりの場合：finishOrderから反則負けを除外して順位を計算
    const normalFinishOrder = finishOrder.filter(id => {
      const finishedPlayer = allPlayers.find(p => p.id === id);
      return finishedPlayer && !finishedPlayer.isFoulFinished;
    });
    
    console.log(`🏆 PlayerCard: Normal finish order (excluding foul): [${normalFinishOrder.map(id => {
      const p = allPlayers.find(ap => ap.id === id);
      return `${id}:${p?.character.name}`;
    }).join(', ')}]`);
    
    const normalRank = normalFinishOrder.indexOf(targetPlayer.id);
    console.log(`🏆 PlayerCard: ${targetPlayer.character.name} normal rank in finish order: ${normalRank}`);
    
    if (normalRank === -1) {
      // まだ上がっていない場合は暫定順位
      console.log(`🏆 PlayerCard: ${targetPlayer.character.name} has not finished yet`);
      return -1;
    }
    
    console.log(`🏆 PlayerCard: ${targetPlayer.character.name} final actual rank: ${normalRank} (${normalRank + 1}位)`);
    return normalRank; // 0-based index（0=1位、1=2位、2=3位）
  };

  // プレイヤーの上がり状態を判定（反則負け対応修正版）
  const getPlayerFinishStatus = () => {
    const finishRank = finishOrder.indexOf(player.id);

    // finishOrderに含まれていない場合はまだゲーム中
    if (finishRank === -1) return null;

    // 反則負けの場合は問答無用で大貧民表示
    if (player.isFoulFinished) {
      console.log(`🏆 PlayerCard: ${player.character.name} showing foul finish as 大貧民`);
      return {
        type: "foul",
        rank: 4, // 実際の順位は4位（大貧民）
        title: "⚰️ 反則負け",
        description: "禁止カードで上がり → 大貧民",
        color: "#8b0000", // 地獄の暗い赤
        bgColor: "#8b0000", // 地獄の暗い赤
        borderColor: "#7f0000", // より暗い赤
      };
    }

    // 正常上がりの場合：実際の順位を計算
    const actualRank = calculateActualRank(player);
    
    if (actualRank === -1) {
      // まだ上がっていない（通常はここに来ないが安全のため）
      return {
        type: "finished",
        rank: finishRank + 1,
        title: "✨ 上がり！",
        description: "",
        color: player.character.color,
        bgColor: player.character.color,
        borderColor: player.character.color,
      };
    }

    console.log(`🏆 PlayerCard: ${player.character.name} actual rank: ${actualRank}, displaying as rank ${actualRank + 1}`);

    switch (actualRank) {
      case 0: // 1位（大富豪）
        return {
          type: "daifugo",
          rank: 1,
          title: "🏆 優勝！大富豪",
          description: "見事な勝利！",
          color: "#f893ffff", // amber-400
          bgColor: "#fbbf24",
          borderColor: "#ff76d1ff",
        };
      case 1: // 2位（富豪）
        return {
          type: "fugo",
          rank: 2,
          title: "🥈 2位！富豪",
          description: "素晴らしい結果！",
          color: "#fbbf24", // amber-400
          bgColor: "#fbbf24", // 修正：重複していたcolorプロパティを削除
          borderColor: "#f59e0b",
        };
      case 2: // 3位（貧民）※反則負けがいると最後の正常上がりが貧民になる
        return {
          type: "hinmin",
          rank: 3,
          title: "😔 貧民",
          description: "次回に期待！",
          color: "#67a3c1", // 彩度の低い水色
          bgColor: "#67a3c1",
          borderColor: "#5b91a8",
        };
      case 3: // 4位（大貧民）- 正常上がりでは通常ここに来ないが安全のため
        return {
          type: "daihinmin",
          rank: 4,
          title: "😭 大貧民",
          description: "また頑張ろう...",
          color: "#4a5568", // 灰色
          bgColor: "#4a5568",
          borderColor: "#2d3748",
        };
      default:
        return {
          type: "finished",
          rank: actualRank + 1,
          title: "✨ 上がり！",
          description: "",
          color: player.character.color,
          bgColor: player.character.color,
          borderColor: player.character.color,
        };
    }
  };

  const finishStatus = getPlayerFinishStatus();
  const isFinished = finishOrder.includes(player.id); // 修正：finishOrderに含まれていれば上がり扱い

const getPlayerCardStyle = () => {
  const base =
    "h-full relative overflow-visible transition-all duration-500 rounded-lg border-8 p-6 shadow-2xl";

  if (isFinished && finishStatus) {
    // 上がった人（勝敗種別で少し色味を変える）
    if (finishStatus.type === "foul") {
      return `${base} bg-gradient-to-br from-gray-200/90 via-gray-300/85 to-gray-400/80 border-gray-400`;
    }
    if (finishStatus.type === "daifugo") {
      return `${base} bg-gradient-to-br from-pink-100 via-yellow-50 to-amber-100 border-pink-300`;
    }
    if (finishStatus.type === "fugo") {
      return `${base} bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100 border-yellow-400`;
    }
    // 3-4位など
    return `${base} bg-gradient-to-br from-white via-gray-50 to-slate-100 border-gray-300`;
  }

  // まだプレイ中
  if (isCurrentPlayer) {
    // 自分のターンは分かりやすく強め
    return `${base} bg-gradient-to-br from-white via-yellow-50 to-orange-100 border-white ring-2 ring-yellow-300/60 ring-offset-2 ring-offset-white`;
  }

  // それ以外（人間/CPUでわずかにトーンを変える）
  return `${base} ${
    player.isHuman
      ? "bg-gradient-to-br from-white via-blue-50 to-blue-100"
      : "bg-gradient-to-br from-white via-purple-50 to-purple-100"
  } border-white/80`;
};


  const getBorderColor = () => {
    if (isFinished && finishStatus) {
      return finishStatus.color;
    }

    if (isCurrentPlayer) {
      return player.character.color;
    } else {
      return `${player.character.color}60`;
    }
  };

  const getExpressionType = (
    expression: PlayerType["expression"],
  ): ExpressionType => {
    // デバッグ用表情オーバーライドが設定されている場合は最優先
    if (player.currentExpression) {
      console.log(`🎭 PlayerCard: Using currentExpression override for ${player.character.name}: ${player.currentExpression}`);
      return player.currentExpression as ExpressionType;
    }
    
    // 上がったプレイヤーの表情調整（より詳細に・照れ笑い追加・怒り表情も活用）
    if (isFinished && finishStatus) {
      if (finishStatus.type === "foul")
        return "disappointed"; // 反則負け - がっかり・失望の表情
      if (finishStatus.type === "daifugo")
        return "confident"; // 大富豪 - 照れ笑い（勝利の得意気表情）
      if (finishStatus.type === "fugo") return "confident"; // 富豪 - 照れ笑い（勝利の得意気表情）
      if (finishStatus.type === "hinmin")
        return "nervous"; // 貧民 - 動揺・心配そうな表情
      if (finishStatus.type === "daihinmin")
        return "disappointed"; // 大貧民 - がっかり・失望の表情
      if (finishStatus.rank <= 4) return "happy"; // その他上がり
    }

    // 特別なケース：メッセージタイプに応じて表情を調整（特殊アクション成功時に照れ笑い）
    if (player.messageType === "special") {
      const message = player.message.toLowerCase();
      if (message.includes("革命")) {
        return "confident"; // 革命成功 - 照れ笑い（得意気）
      } else if (message.includes("８切り")) {
        return "confident"; // 八切り成功 - 照れ笑い（得意気）
      } else if (message.includes("縛り")) {
        return "confident"; // 縛り成功 - 照れ笑い（得意気）
      } else if (
        message.includes("勝") ||
        message.includes("上がり")
      ) {
        return "confident"; // 勝利関連メッセージ - 照れ笑い
      }
    }

    // 🎭 ８主専用の表情豊かさシステム
    if (player.character.id === 8) {
      // 発言中の表情バリエーション（normalとthinkingを織り交ぜる）
      if (player.message && expression === "normal") {
        // メッセージの内容と長さに応じて thinking を織り交ぜる
        const messageLength = player.message.length;
        const messageContent = player.message.toLowerCase();
        
        // 考えを含む発言は thinking 寄りに
        if (messageContent.includes("どうしよう") || 
            messageContent.includes("うーん") || 
            messageContent.includes("悩む") ||
            messageContent.includes("考え") ||
            messageContent.includes("困った")) {
          return "thinking";
        }
        
        // 長い発言（15文字以上）は考え中表情を織り交ぜる
        if (messageLength >= 15) {
          // プレイヤーIDとメッセージ長さを使った擬似ランダム（30%の確率でthinking）
          const shouldUseThinking = (player.id + messageLength) % 10 < 3;
          if (shouldUseThinking) {
            return "thinking";
          }
        }
        
        // 複雑な戦略的発言は thinking 表情に
        if (messageContent.includes("戦略") ||
            messageContent.includes("作戦") ||
            messageContent.includes("計画") ||
            messageContent.includes("予測") ||
            messageContent.includes("読み")) {
          return "thinking";
        }
      }
      
      // 自分のターン中の思考表現を豊かに
      if (isCurrentPlayer && (expression === "normal" || expression === "thinking")) {
        // ターン中は基本的に考え中表情をメインに
        const cardCount = player.hand.length;
        
        // 手札が多い時（6枚以上）は悩み深く thinking
        if (cardCount >= 6) {
          return "thinking";
        }
        
        // 手札が中程度（3-5枚）はnormalとthinkingを適度に
        if (cardCount >= 3) {
          // プレイヤーIDとカード数による擬似ランダム（40%でthinking）
          const shouldUseThinking = (player.id + cardCount) % 10 < 4;
          return shouldUseThinking ? "thinking" : "normal";
        }
      }
    }

    // 通常の表情（7種類フル活用・細分化）
    switch (expression) {
      case "happy":
        return "happy"; // 基本の嬉しい表情
      case "worried":
        return "frustrated"; // 心配 → 汗をかいて困った表情
      case "confident":
        return "confident"; // 自信満々 → 照れ笑い（得意気）
      case "thinking":
        return "thinking"; // 考え中 → 基本表情
      case "excited":
        return "excited"; // 興奮 → 最高の笑顔
      case "frustrated":
        return "frustrated"; // イライラ・困った → 汗をかいて困った表情
      case "angry":
        return "angry"; // 怒り → 明確な怒り表情
      case "surprised":
        return "surprised"; // 驚き → ガーン！な驚き表情
      default:
        return "normal"; // デフォルト → 基本表情
    }

    // カード残り枚数に応じた表情調整（ゲーム状況を考慮）
    const cardCount = player.hand.length;

    if (cardCount === 1) {
      // リーチ状態：照れ笑い（勝利が近い得意気な表情）
      return "confident";
    } else if (cardCount === 2) {
      // 残り2枚：少し緊張だが希望もある
      return expression === "worried"
        ? "frustrated"
        : "happy";
    }

    // ゲーム終盤（残り2人）の緊張感を表現
    // この判定は現在のplayerの状況から推測（手札が多い場合は劣勢の可能性）
    if (cardCount >= 5) {
      // 手札が多く残っている場合は焦り気味の表情をベースに
      if (
        expression === "normal" ||
        expression === "thinking"
      ) {
        return "frustrated"; // 少し焦りを含んだデフォルト表情
      }
    }

    return "normal"; // 最終的なフォールバック
  };

  const isTopPosition = position.includes("top");
  const isRightPosition = position.includes("right");
  const isBottomPosition = position.includes("bottom");

  // **新しい手札表示ロジック（完全再構築版・手札残り順位表示対応）**
  const renderHandCards = () => {
    const cardCount = player.hand.length;
    const hasRank = isFinished && finishStatus;
    const hasCards = cardCount > 0;

    // 順位表示（手札は非表示なので中央に配置）
    const rankDisplay = hasRank ? (
      <div
        className="absolute flex items-center justify-center animate-rank-show"
        style={{
          // 順位表示の位置：手札は非表示なので中央に配置
          ...(isTopPosition
            ? { bottom: "12px" }
            : { top: "12px" }),
          left: "12px",
          right: "12px",
          height: "60px", // 手札がないので大きく表示
          zIndex: 100,
        }}
      >
        <div
          className={`px-6 py-2 transform transition-all duration-300 relative overflow-visible ${
            finishStatus.type === "daifugo"
              ? "animate-pulse"
              : ""
          }`}
          style={{
            backgroundColor: "transparent",
            filter:
              finishStatus.type === "daifugo"
                ? "drop-shadow(0 0 15px rgba(255, 107, 107, 0.5)) drop-shadow(0 0 20px rgba(72, 219, 251, 0.5))"
                : finishStatus.type === "fugo"
                  ? "drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))"
                  : finishStatus.type === "hinmin"
                    ? "drop-shadow(0 0 8px rgba(103, 163, 193, 0.5))"
                    : finishStatus.type === "daihinmin"
                      ? "drop-shadow(0 0 6px rgba(75, 85, 99, 0.4))"
                      : finishStatus.type === "foul"
                        ? "drop-shadow(0 0 15px rgba(139, 0, 0, 0.6)) drop-shadow(0 0 20px rgba(220, 20, 60, 0.5))"
                        : "none",
          }}
        >
          <div className="text-center relative">
            <div
              className={`giant-rank-text font-black leading-none tracking-wider ${
                finishStatus.type === "daifugo"
                  ? "text-rainbow text-stroke-rainbow"
                  : finishStatus.type === "fugo"
                    ? "text-gold-gradient text-glow-gold text-stroke-gold"
                    : finishStatus.type === "hinmin"
                      ? "text-blue-gradient text-glow-blue text-stroke-blue"
                      : finishStatus.type === "daihinmin"
                        ? "text-gray-gradient text-stroke-gray"
                        : finishStatus.type === "foul"
                          ? "text-fire-gradient text-glow-fire text-stroke-fire"
                          : "text-stroke-gray"
              }`}
              style={{
                fontSize: "40px", // 手札が非表示なので常に大きく表示
                letterSpacing: "0.02em",
                fontFamily:
                  '"Impact", "Arial Black", "Meiryo", sans-serif',
              }}
            >
              {finishStatus.type === "daifugo"
                ? "大富豪！"
                : finishStatus.type === "fugo"
                  ? "富豪！"
                  : finishStatus.type === "hinmin"
                    ? "貧民…"
                    : finishStatus.type === "daihinmin"
                      ? "大貧民…"
                      : finishStatus.type === "foul"
                        ? "反則負け！"
                        : "上がり！"}
            </div>
          </div>
        </div>
      </div>
    ) : null;

    // 手札表示のロジック（順位確定時は非表示）
    const cardsDisplay = hasCards && !hasRank ? (
      <div
        className="absolute"
        style={{
          // 位置制御：順位がない場合の通常位置
          ...(isTopPosition
            ? { bottom: "0px" }
            : { top: "12px" }),
          left: "12px",
          width: `${Math.max(50, cardCount * 12 + 32)}px`,
          height: "60px",
          zIndex: 10,
        }}
      >
        {player.hand.map((card, index) => {
          const cardSpacing = 12;

          return (
            <div
              key={card.id}
              className="absolute transition-all duration-200"
              style={{
                left: isRightPosition
                  ? `${(cardCount - 1 - index) * cardSpacing}px`
                  : `${index * cardSpacing}px`,
                top: "0px",
                zIndex: 15 + index,
                transform: "scale(1)",
              }}
            >
              {showDebugHand ? (
                <Card
                  card={card}
                  size="small"
                  isSelected={false}
                  isPlayable={false}
                />
              ) : (
                <div className="w-8 h-12 rounded-md border-2 border-white/50 shadow-md flex items-center justify-center text-lg bg-gradient-to-br from-gray-700 to-gray-800">
                  🂠
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : null;

    // 順位表示と手札表示の両方または片方を返す
    return (
      <>
        {rankDisplay}
        {cardsDisplay}
      </>
    );
  };

  // 最後のアクション表示用の関数
  const getLastActionDisplay = () => {
    if (!player.lastAction) {
      return "-";
    }

    const description = player.lastAction.description;
    if (description.length > 8) {
      return description.substring(0, 6) + "...";
    }
    return description;
  };

  // 最後のアク��ョンの背景色を決定
  const getLastActionBgColor = () => {
    if (!player.lastAction) {
      return "#6b7280"; // gray-500 - アクションなし
    }

    if (player.lastAction.type === "pass") {
      return "#f59e0b"; // amber-500 - パス
    } else {
      return player.character.color; // プレイヤーカラー - カード出し
    }
  };

  return (
    <>
      {/* 表情エリア（最優先・z-index: 50） */}
      <div
        className="absolute z-50"
        style={{
          // position固定で、プレイヤーカードの外側に配置
          width: "160px",
          height: "160px",
          ...(position === "top-left" && {
            top: "-30px",
            left: "-30px",
          }),
          ...(position === "top-right" && {
            top: "-30px",
            right: "-30px",
          }),
          ...(position === "bottom-left" && {
            bottom: "-30px",
            left: "-30px",
          }),
          ...(position === "bottom-right" && {
            bottom: "-30px",
            right: "-30px",
          }),
        }}
      >
        <div
          className="rounded-full flex items-center justify-center border-[6px] shadow-2xl relative bg-white expression-main w-full h-full overflow-hidden"
          style={{
            borderColor:
              isFinished && finishStatus
                ? finishStatus.color
                : player.character.color,
            boxShadow: (() => {
              if (isFinished && finishStatus) {
                if (finishStatus.type === "daifugo") {
                  return "0 0 30px rgba(251, 191, 36, 0.6), 0 0 60px rgba(251, 191, 36, 0.4)"; // ゴールド
                } else if (finishStatus.type === "fugo") {
                  return "0 0 30px rgba(148, 163, 184, 0.6), 0 0 60px rgba(148, 163, 184, 0.4)"; // シルバー
                } else if (finishStatus.type === "foul") {
                  return "0 0 25px rgba(139, 0, 0, 0.8), 0 0 50px rgba(220, 20, 60, 0.6)"; // 地獄の赤い炎
                }
              }

              return isCurrentPlayer
                ? `0 0 30px ${player.character.color}50, 0 0 60px ${player.character.color}30`
                : `0 0 20px ${player.character.color}30`;
            })(),
            filter:
              isFinished && finishStatus?.type === "foul"
                ? "grayscale(70%) brightness(0.8)"
                : "none",
          }}
        >

{/* 画像の上に重ねる枠（サイズは親に完全フィット） */}
<div
  className="pointer-events-none absolute inset-0 rounded-full z-10"
  style={{
    // キャラカラー or リザルトカラー
    boxShadow: `inset 0 0 0 3px ${finishStatus?.color ?? player.character.color}`,
  }}
/>


          {/* 背景グラデーション */}
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background:
                isFinished && finishStatus
                  ? `radial-gradient(circle, ${finishStatus.color}20 0%, ${finishStatus.color}10 50%, transparent 70%)`
                  : `radial-gradient(circle, ${player.character.color}20 0%, ${player.character.color}10 50%, transparent 70%)`,
            }}
          ></div>

          {/* 表情画像を表示（70%大きく・円形枠でトリミング） */}
          <div className="relative z-10 w-24 h-24 flex items-center justify-center">
            <ExpressionImage
              characterId={player.character.id}
              expression={getExpressionType(player.expression)}
              alt={`${player.character.name}の表情`}
              className="w-full h-full object-contain drop-shadow-2xl"
              scale={1.7}
            />
          </div>
        </div>

        {/* 反応絵文字オーバーレイ（表情枠の外側に配置） */}
        {player.reactionEmoji && (
          <div className="reaction-emoji-container animate-reaction-pop">
            <span className="animate-reaction-pulse">
              {player.reactionEmoji}
            </span>
          </div>
        )}
      </div>

      {/* 吹き出しエリア（最優先・z-index: 55） */}
      {/* DEBUG: Add console log for introDialogue */}
      {(() => {
        if (introDialogue) {
          console.log(`🎭 PlayerCard: Player ${player.character.name} (ID: ${player.id}) received introDialogue: "${introDialogue}"`);
        }
        if (player.message) {
          console.log(`🎭 PlayerCard: Player ${player.character.name} (ID: ${player.id}) has regular message: "${player.message}"`);
        }
        return null;
      })()}
      {(player.message || introDialogue) && (
        <div
            className="absolute z-[200] pointer-events-none" // ← z-55 をやめて z-[200]
           style={{
    zIndex: 200,
            // 表情エリアと重ならない位置に配置
            ...(position === "top-left" && {
              top: "140px",
              left: "-30px",
              width: "300px",
            }),
            ...(position === "top-right" && {
              top: "140px",
              right: "-30px",
              width: "300px",
            }),
            ...(position === "bottom-left" && {
              bottom: "140px",
              left: "-30px",
              width: "300px",
            }),
            ...(position === "bottom-right" && {
              bottom: "140px",
              right: "-30px",
              width: "300px",
            }),
          }}
        >
          <div className="relative">
            <div
              className={`px-5 py-4 rounded-xl border-3 shadow-xl relative text-lg font-medium ${
                introDialogue 
                  ? "bg-yellow-50 border-amber-300 text-gray-800" 
                  : "bg-white border-gray-300 text-gray-800"
              }`}
              style={{
                boxShadow: introDialogue
                  ? "0 10px 25px rgba(251, 191, 36, 0.2), 0 0 0 2px rgba(251, 191, 36, 0.3)"
                  : "0 10px 25px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(255, 255, 255, 0.8)",
                lineHeight: "1.4",
              }}
            >
              <div className={`absolute inset-0 rounded-xl pointer-events-none ${
                introDialogue
                  ? "bg-gradient-to-r from-amber-100/40 via-yellow-50/20 to-amber-100/40"
                  : "bg-gradient-to-r from-white/60 via-transparent to-white/60"
              }`}></div>
              <span className="relative z-10 leading-relaxed">
                {(() => {
                  const displayText = introDialogue || player.message;
                  console.log(`🎭 PlayerCard: Displaying text for ${player.character.name}: "${displayText}" (introDialogue: "${introDialogue}", message: "${player.message}")`);
                  return displayText;
                })()}
              </span>
            </div>
            {/* 吹き出しの尻尾 */}
            <div
              className="absolute w-8 h-8 transform rotate-45 border-l-3 border-b-3 shadow-md bg-white border-gray-300"
              style={{
                [isRightPosition ? "right" : "left"]: "30px",
                [isBottomPosition ? "bottom" : "top"]: "-16px",
              }}
            />
          </div>
        </div>
      )}

      {/* プレイヤー情報エリア（3番目優先・z-index: 40・控えめスタイル） */}
      <div
        className="absolute z-40"
        style={{
          // 吹き出しエリアから離れた位置に配置（調整済み：表情枠により近く）
          ...(position === "top-left" && {
            top: "25px",
            left: "150px", // 180px → 150px（30px左に移動）
            width: "170px",
          }),
          ...(position === "top-right" && {
            top: "25px",
            right: "150px", // 180px → 150px（30px右に移動）
            width: "170px",
          }),
          ...(position === "bottom-left" && {
            bottom: "25px",
            left: "150px", // 180px → 150px（30px左に移動）
            width: "170px",
          }),
          ...(position === "bottom-right" && {
            bottom: "25px",
            right: "150px", // 180px → 150px（30px右に移動）
            width: "170px",
          }),
        }}
      >
        <div
          className="bg-white/90 border-2 border-gray-300 rounded-lg shadow-md p-3 relative backdrop-blur-sm"
          style={{
            borderColor:
              isFinished && finishStatus
                ? finishStatus.borderColor
                : `${player.character.color}60`,
            boxShadow: `0 4px 12px rgba(0, 0, 0, 0.1)`,
          }}
        >
          {/* プレイヤー名と履歴欄（横並び表示） */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="text-xl font-bold truncate leading-tight"
              style={{
                color:
                  isFinished && finishStatus?.type === "foul"
                    ? "#6b7280"
                    : player.character.color,
              }}
              title={player.character.name}
            >
              {player.character.name}
            </div>

            {/* 全プレイヤーCPUのため、YOUバッジを削除 */}

            {/* 最後のアクション表示（名前の右側） */}
            <div
              className="text-white text-xs px-2 py-0.5 rounded-full border border-white shadow-sm font-mono font-bold flex-shrink-0"
              style={{
                backgroundColor: getLastActionBgColor(),
                fontSize: "10px",
                minWidth: "40px",
                maxWidth: "60px",
                textAlign: "center",
                textShadow: "1px 1px 0px rgba(0, 0, 0, 0.6)",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
              title={
                player.lastAction?.description ||
                "まだアクションがありません"
              }
            >
              {getLastActionDisplay()}
            </div>
          </div>

          {/* 手札数表示（常に表示） */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-md px-3 py-2 text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm font-medium text-gray-600">
                残り
              </span>
              <span
                className="text-2xl font-bold font-mono text-red-600"
                style={{
                  textShadow: "1px 1px 1px rgba(0, 0, 0, 0.2)",
                }}
              >
                {player.hand.length}
              </span>
              <span className="text-sm font-medium text-gray-600">
                枚
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 現在のプレイヤー表示（完全独立・上がったプレイヤーには表示しない） */}
      {isCurrentPlayer && !isFinished && (
        <div
          className="absolute -top-2 -right-2 z-[999] w-12 h-12 rounded-full border-4 animate-bounce flex items-center justify-center text-xl font-bold shadow-2xl"
          style={{
            backgroundColor: player.character.color,
            borderColor: "white",
            color: "white",
            boxShadow: `0 0 20px ${player.character.color}60`,
            // 各プレイヤーの中央に向かって内側の角に配置（はみでる）
            ...(position === "top-left" && {
              bottom: "-25px",
              right: "-25px",
            }), // 右下の角
            ...(position === "top-right" && {
              bottom: "-25px",
              left: "-25px",
            }), // 左下の角
            ...(position === "bottom-left" && {
              top: "-25px",
              right: "-25px",
            }), // 右上の角
            ...(position === "bottom-right" && {
              top: "-25px",
              left: "-25px",
            }), // 左上の角
          }}
        >
          ▶
        </div>
      )}

      {/* プレイヤーカード本体（手札を含む） */}
      <div
        className={getPlayerCardStyle()}
        style={{
          borderColor: getBorderColor(),
          boxShadow: isCurrentPlayer
            ? `0 0 30px ${player.character.color}50, 0 0 60px ${player.character.color}20`
            : undefined,
        }}
      >
        {/* 新しい手札表示ロジック */}
        {renderHandCards()}
      </div>
    </>
  );
}