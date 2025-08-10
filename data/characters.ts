import { Character } from "../types/game";

export const CHARACTERS: Character[] = [
  {
    id: 1,
    name: "1主",
    avatar: "👨‍💼",
    personality: "strategic_aggressive",
    description: "大人びた冷静さを保ちながら、ここぞという場面での大胆な勝負を楽しむ。序盤は安全に、中盤以降は状況を見て大胆な革命や複数枚出しを試みる。",
    color: "#191970",
    monteCarloConfig: {
      playoutCount: 30, // 10-50回の中央値
      temperatureParam: 0.8,
      evaluationWeights: {
        w1: 3, // 手札残数の期待値
        w2: 2, // 相手の平均手札残数差
        w3: 1, // 革命状態時の自手札の強さ
        w4: 2, // 流れを取っている回数
        w5: 1  // ジョーカーや2を早く出しすぎたペナルティ
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: true,
        preferSuitLock: true,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 2,
    name: "2主",
    avatar: "🧒",
    personality: "chaotic_early",
    description: "直感的に動くことが多く、序盤から仕掛けてくるが、終盤での勝負勘は鋭く、意外と粘り強い。",
    color: "#1e90ff",
    monteCarloConfig: {
      playoutCount: 20, // 序盤重視なので少し少なめ
      temperatureParam: 1.0, // やんちゃさのためのランダム性
      epsilonGreedy: 0.2, // 20%ランダム
      evaluationWeights: {
        w1: 2, // しばり・8切り・革命の成立回数
        w2: 2, // 相手のパス確率
        w3: 3, // 残り1枚になったターン数
        w4: 1, // 手札内の階段数
        w5: 1  // パス回数ペナルティ
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: true,
        preferSuitLock: true,
        conserveStrong: false,
        aggressiveEarly: true
      }
    }
  },
  {
    id: 3,
    name: "3主",
    avatar: "👩‍🎓",
    personality: "analytical_patient",
    description: "全体の流れを冷静に観察し、自分が勝てるタイミングまでしっかり溜めて動く。無駄打ちはほぼしない。",
    color: "#0000cd",
    monteCarloConfig: {
      playoutCount: 50, // 分析重視で多めのプレイアウト
      temperatureParam: 0.5, // 最適解重視
      evaluationWeights: {
        w1: 5, // 残りターンでの勝利確率
        w2: 2, // 相手のトップの手札枚数差
        w3: 3, // ジョーカーや2の温存状態
        w4: 2  // しばり中の支配率
      },
      specialRules: {
        preferRevolution: false,
        prefer8Cut: false,
        preferSuitLock: false,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 4,
    name: "4主",
    avatar: "👨‍🔬",
    personality: "cautious_defensive",
    description: "常に安全策を取る堅実型。勝ち筋よりリスク回避を優先するが、そのぶん終盤の一手が間に合わず負けることも。",
    color: "#3cb371",
    monteCarloConfig: {
      playoutCount: 25, // 安全重視の中程度
      temperatureParam: 1.0, // 迷いやすさを表現
      evaluationWeights: {
        w1: 3, // 自分のパス回避回数
        w2: 3, // ジョーカーと2の温存率
        w3: 1, // 相手が2を出した直後の手の強さ
        w4: 2, // 階段の保存数
        w5: 4  // 抱え落ちリスクペナルティ
      },
      specialRules: {
        preferRevolution: false,
        prefer8Cut: false,
        preferSuitLock: false,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 5,
    name: "5主",
    avatar: "🍷",
    personality: "strategic_aggressive", // 元のhedonisticから変更
    description: "余裕のある大人の戦い方。時には大胆に、時には慎重に、状況に応じて柔軟に対応する。",
    color: "#7b68ee",
    monteCarloConfig: {
      playoutCount: 35,
      temperatureParam: 0.7,
      evaluationWeights: {
        w1: 3,
        w2: 2,
        w3: 2,
        w4: 2,
        w5: 1
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: false,
        preferSuitLock: true,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 6,
    name: "6主",
    avatar: "👨‍🎤",
    personality: "energetic_momentum",
    description: "気さくで勢い重視の兄貴肌。序盤の様子見はせず、ノリで勝負に出る。思い切りはあるが、雑になりすぎない。",
    color: "#00bfff",
    monteCarloConfig: {
      playoutCount: 20, // 速攻重視
      temperatureParam: 1.2, // ノリの良さ
      epsilonGreedy: 0.4, // 40%気まぐれ
      evaluationWeights: {
        w1: 4, // 手札消化数
        w2: 3, // 階段成立
        w3: 2, // パスさせた人数
        w4: 1  // ノリ出し成功回数
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: true,
        preferSuitLock: true,
        conserveStrong: false,
        aggressiveEarly: true
      }
    }
  },
  {
    id: 7,
    name: "7主",
    avatar: "🍀",
    personality: "studious_basic",
    description: "勉強中の身。盤面をしっかり見るが、詰めが甘いところも。たまに運で助かる場面あり。",
    color: "#20b2aa",
    monteCarloConfig: {
      playoutCount: 25, // 基本に忠実
      temperatureParam: 1.0, // 間違うこともある
      evaluationWeights: {
        w1: 3, // 自手札消化
        w2: 2, // 相手の残りカード数のばらつき
        w3: 1, // 流れ継続率
        w4: 1  // 場に出たジョーカー枚数
      },
      specialRules: {
        preferRevolution: false,
        prefer8Cut: false,
        preferSuitLock: false,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 8,
    name: "8主",
    avatar: "🎲",
    personality: "lucky_instinct",
    description: "なぜか上手くいくラッキーボーイ。成功体験に乗っかって勢いで攻めていくタイプ。深い読みはしない。",
    color: "#ff8c00",
    monteCarloConfig: {
      playoutCount: 15, // 運重視で少なめ
      temperatureParam: 1.5, // 運任せ感
      epsilonGreedy: 0.5, // 50%運任せ
      evaluationWeights: {
        w1: 4, // 成功パターンの再現度
        w2: 2, // パスさせた数
        w3: 3  // 革命などの賭けが通った回数
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: true,
        preferSuitLock: false,
        conserveStrong: false,
        aggressiveEarly: true
      }
    }
  },
  {
    id: 9,
    name: "9主",
    avatar: "🌟",
    personality: "experimental_bold",
    description: "常に新しい手を試したくなる性分。革命、しばり、連続出しなど派手な展開を好み、負けても悔いなし。",
    color: "#da70d6",
    monteCarloConfig: {
      playoutCount: 30, // 実験的だがそれなりに考える
      temperatureParam: 1.5, // 冒険的な手が選ばれやすく
      evaluationWeights: {
        w1: 2, // 流れ支配率
        w2: 4, // 革命後に場を制した回数
        w3: 2, // 8切り頻度
        w4: 2  // 連続出し成功回数
      },
      specialRules: {
        preferRevolution: true,
        prefer8Cut: true,
        preferSuitLock: true,
        conserveStrong: false,
        aggressiveEarly: true
      }
    }
  },
  {
    id: 10,
    name: "10主",
    avatar: "👑",
    personality: "master_tactical",
    description: "戦略的に非常に優れた判断を行うが、他人の奇襲や運に弱い。不運が重なって負けることも。",
    color: "#b22222",
    monteCarloConfig: {
      playoutCount: 45, // 高レベルの分析
      temperatureParam: 0.6, // 安定しているが運に左右される
      evaluationWeights: {
        w1: 4, // 勝利期待値
        w2: 2, // 相手のトップの残りカード数
        w3: -3, // 革命成立後の被ダメージ
        w4: 2  // 盤面支配率
      },
      specialRules: {
        preferRevolution: false,
        prefer8Cut: false,
        preferSuitLock: false,
        conserveStrong: true,
        aggressiveEarly: false
      }
    }
  },
  {
    id: 11,
    name: "11主",
    avatar: "🎯",
    personality: "quiet_endgame",
    description: "普段はあまり目立たず慎重に動くが、終盤に一気に勝ちをもぎ取る。静かな勝負師。",
    color: "#9932cc",
    monteCarloConfig: {
      playoutCount: 50, // 高精度分析（40→50に増加）
      temperatureParam: 0.7, // より正確な判断（0.8→0.7に変更）
      epsilonGreedy: 0.15, // 計算重視（0.2→0.15に変更）
      evaluationWeights: {
        w1: 3, // 残り3ターンでの勝率
        w2: 4, // "今勝負すれば通る"スコア
        w3: 2, // 温存カードの出し時評価
        w4: 3  // 強手の抱え落ちリスク（新規追加）
      },
      specialRules: {
        preferRevolution: false,
        prefer8Cut: false,
        preferSuitLock: false,
        conserveStrong: true,
        aggressiveEarly: false,
        // 11主専用特殊設定
        enableAdvancedTiming: true, // 差し込みタイミング検知
        focusOnEndgame: true, // 終盤重視モード
        analyzeOpponentHands: true // 相手手札分析強化
      }
    }
  },
];

export const getRandomCharacters = (
  count: number,
): Character[] => {
  const shuffled = [...CHARACTERS].sort(
    () => Math.random() - 0.5,
  );
  return shuffled.slice(0, count);
};