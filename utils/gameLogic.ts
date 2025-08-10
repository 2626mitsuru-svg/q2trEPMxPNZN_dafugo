import { Card, Suit, Rank, GameState, PlayType } from '../types/game';

// カードデッキを作成
export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const deck: Card[] = [];

  // 通常のカード
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`
      });
    }
  }

  // ジョーカー2枚
  deck.push({ suit: 'joker', rank: 14, id: 'joker-1' });
  deck.push({ suit: 'joker', rank: 14, id: 'joker-2' });

  // シャッフル
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// カードの強さを取得（革命状態を考慮）
export function getCardStrength(card: Card, isRevolution: boolean = false): number {
  if (card.suit === 'joker') {
    return isRevolution ? 1 : 15; // 革命時は最弱、通常時は最強
  }

  let strength = card.rank;
  
  // Aは14、2は15として扱う
  if (card.rank === 1) strength = 14;
  if (card.rank === 2) strength = 15;

  if (isRevolution) {
    // 革命時は強さを逆転（3が最強、2が最弱）
    if (card.rank === 2) return 2; // 2は革命時でも2番目に弱い
    if (card.rank === 1) return 3; // Aは革命時3番目に弱い
    return 16 - strength; // その他は逆転
  }

  return strength;
}

// カードの組み合わせが有効かチェック（ジョーカー組み合わせ対応）
export function isValidCombination(cards: Card[]): { isValid: boolean, type: PlayType } {
  if (cards.length === 0) {
    return { isValid: false, type: 'single' };
  }

  if (cards.length === 1) {
    return { isValid: true, type: 'single' };
  }

  // ペア・トリプル・革命チェック（ジョーカー組み合わせ対応）
  if (cards.length >= 2 && cards.length <= 4) {
    return checkMultipleCards(cards);
  }

  // ストレート（階段）チェック（3枚以上、同じマーク、連番）
  if (cards.length >= 3) {
    return checkStraight(cards);
  }

  return { isValid: false, type: 'single' };
}

// ペア・トリプル・革命チェック（ジョーカー組み合わせ対応）
function checkMultipleCards(cards: Card[]): { isValid: boolean, type: PlayType } {
  const nonJokerCards = cards.filter(card => card.suit !== 'joker');
  const jokerCount = cards.length - nonJokerCards.length;
  
  // ジョーカーのみの場合は無効
  if (nonJokerCards.length === 0) {
    return { isValid: false, type: 'single' };
  }
  
  // 通常カードが全て同じランクかチェック
  const firstRank = nonJokerCards[0].rank;
  const allSameRank = nonJokerCards.every(card => card.rank === firstRank);
  
  if (allSameRank) {
    // ジョーカーは同じランクとして扱う
    switch (cards.length) {
      case 2:
        return { isValid: true, type: 'pair' };
      case 3:
        return { isValid: true, type: 'triple' };
      case 4:
        return { isValid: true, type: 'revolution' };
      default:
        return { isValid: false, type: 'single' };
    }
  }
  
  return { isValid: false, type: 'single' };
}

// ストレート判定（厳密）
function checkStraight(cards: Card[]): { isValid: boolean, type: PlayType } {
  // ジョーカーは使えない
  if (cards.some(card => card.suit === 'joker')) {
    return { isValid: false, type: 'single' };
  }

  // 同じマークかチェック
  const suit = cards[0].suit;
  if (!cards.every(card => card.suit === suit)) {
    return { isValid: false, type: 'single' };
  }

  // ランクをソート
  const sortedRanks = cards.map(card => card.rank).sort((a, b) => a - b);
  
  // 連番かチェック
  for (let i = 1; i < sortedRanks.length; i++) {
    if (sortedRanks[i] !== sortedRanks[i-1] + 1) {
      return { isValid: false, type: 'single' };
    }
  }
  
  return { isValid: true, type: 'straight' };
}

// プレイが有効かチェック（継続条件込み・スペードの3対抗ルール対応）
export function isValidPlay(
  cards: Card[],
  fieldCards: Card[],
  lastPlayType: string | null,
  lastPlayCount: number,
  isRevolution: boolean = false,
  suitLock: Suit | null = null
): boolean {
  if (cards.length === 0) return false;

  // 組み合わせの有効性チェック
  const { isValid, type } = isValidCombination(cards);
  if (!isValid) return false;

  // 場が空の場合は何でも出せる
  if (fieldCards.length === 0) {
    // マーク縛りがある場合は縛りチェック
    if (suitLock) {
      return checkSuitRestriction(cards, suitLock);
    }
    return true;
  }

  // 🃏 スペードの3対ジョーカー特殊ルール
  if (isSpade3VsJokerPlay(cards, fieldCards)) {
    console.log(`♠3 vs Joker: Special rule applied - field cleared`);
    return true;
  }

  // 継続条件チェック
  if (lastPlayType && lastPlayCount > 0) {
    // 枚数が一致しているかチェック
    if (cards.length !== lastPlayCount) return false;

    // 出し方のタイプが一致しているかチェック
    if (type !== lastPlayType) return false;

    // ストレートの場合、同じマークである必要がある
    if (type === 'straight') {
      const fieldSuit = fieldCards.find(card => card.suit !== 'joker')?.suit;
      const playSuit = cards.find(card => card.suit !== 'joker')?.suit;
      if (fieldSuit && playSuit && fieldSuit !== playSuit) return false;
    }
  }

  // マーク縛りチェック
  if (suitLock && !checkSuitRestriction(cards, suitLock)) {
    return false;
  }

  // 強さの比較（ジョーカー組み合わせ考慮）
  const fieldStrength = calculateCombinationStrength(fieldCards, isRevolution);
  const playStrength = calculateCombinationStrength(cards, isRevolution);

  return playStrength > fieldStrength;
}

// スペードの3対ジョーカー特殊ルール判定
function isSpade3VsJokerPlay(playCards: Card[], fieldCards: Card[]): boolean {
  // 場にジョーカーが単体で出ている場合のみ
  if (fieldCards.length !== 1 || fieldCards[0].suit !== 'joker') {
    return false;
  }
  
  // プレイするカードがスペードの3単体の場合
  return playCards.length === 1 && 
         playCards[0].suit === 'spades' && 
         playCards[0].rank === 3;
}

// 組み合わせ全体の強さを計算（ジョーカー組み合わせ対応）
function calculateCombinationStrength(cards: Card[], isRevolution: boolean): number {
  if (cards.length === 0) return 0;
  
  const nonJokerCards = cards.filter(card => card.suit !== 'joker');
  const jokerCount = cards.length - nonJokerCards.length;
  
  if (nonJokerCards.length === 0) {
    // ジョーカーのみの場合
    return getCardStrength(cards[0], isRevolution);
  }
  
  // 通常カードの代表値を使用（ジョーカーは同じランクとして扱う）
  const representativeCard = nonJokerCards[0];
  return getCardStrength(representativeCard, isRevolution);
}

// マーク縛りの制限チェック
function checkSuitRestriction(cards: Card[], suitLock: Suit): boolean {
  // ジョーカーは常に有効
  return cards.every(card => card.suit === suitLock || card.suit === 'joker');
}

// 革命チェック（同じ数字4枚・ジョーカー組み合わせ対応）
export function checkRevolution(cards: Card[]): boolean {
  if (cards.length !== 4) return false;

  const nonJokerCards = cards.filter(card => card.suit !== 'joker');
  const jokerCount = cards.length - nonJokerCards.length;
  
  // ジョーカーのみの場合は革命にならない
  if (nonJokerCards.length === 0) return false;
  
  // 通常カードが全て同じランクかチェック（ジョーカーは同じランクとして扱う）
  const firstRank = nonJokerCards[0].rank;
  return nonJokerCards.every(card => card.rank === firstRank);
}

// 8切りチェック
export function check8Cut(cards: Card[]): boolean {
  return cards.some(card => card.rank === 8);
}

// スペードの3対ジョーカー強制場流れチェック
export function checkSpade3VsJoker(playCards: Card[], fieldCards: Card[]): boolean {
  return isSpade3VsJokerPlay(playCards, fieldCards);
}

// マーク縛りチェック（修正版）
export function checkSuitLock(
  currentCards: Card[], 
  previousCards: Card[], 
  gameState: GameState
): Suit | null {
  // 場が流れた場合は縛り解除
  if (previousCards.length === 0) return null;
  
  // 既に縛りがある場合は継続
  if (gameState.suitLock) return gameState.suitLock;

  // 前回と今回のカードの主要マークを取得（ジョーカー以外）
  const getPrimarySuit = (cards: Card[]): Suit | null => {
    const nonJokerCards = cards.filter(card => card.suit !== 'joker');
    return nonJokerCards.length > 0 ? nonJokerCards[0].suit : null;
  };

  const previousSuit = getPrimarySuit(previousCards);
  const currentSuit = getPrimarySuit(currentCards);

  // 同じマークが連続した場合、縛り発動
  if (previousSuit && currentSuit && previousSuit === currentSuit) {
    return currentSuit;
  }

  return null;
}

// 上がりに使えるカードかチェック（反則上がり判定）
export function canWinWith(cards: Card[], isRevolution: boolean = false): boolean {
  // 反則上がりの条件をチェック
  for (const card of cards) {
    // 1. ジョーカーで上がると反則
    if (card.rank === 14) {
      console.log(`🚫 Foul finish: Cannot win with Joker`);
      return false;
    }
    
    // 2. 8で上がると反則（枚数問わず）
    if (card.rank === 8) {
      console.log(`🚫 Foul finish: Cannot win with 8`);
      return false;
    }
    
    // 3. 通常時に2で上がると反則
    if (!isRevolution && card.rank === 2) {
      console.log(`🚫 Foul finish: Cannot win with 2 in normal state`);
      return false;
    }
    
    // 4. 革命時に3で上がると反則
    if (isRevolution && card.rank === 3) {
      console.log(`🚫 Foul finish: Cannot win with 3 in revolution state`);
      return false;
    }
  }
  
  // すべてのカードが反則上がりに該当しない場合は正常上がり
  console.log(`✅ Valid finish: Cards are allowed for winning`);
  return true;
}

// ゲーム終了チェック
export function checkGameEnd(players: any[]): { isFinished: boolean, rankings: any[] } {
  const finishedPlayers = players.filter(player => player.hand.length === 0);
  const remainingPlayers = players.filter(player => player.hand.length > 0);

  // 2人以下が残った場合、ゲーム終了
  if (remainingPlayers.length <= 2) {
    // 残りのプレイヤーを手札の少ない順でランキング
    const sortedRemaining = remainingPlayers.sort((a, b) => a.hand.length - b.hand.length);
    const rankings = [...finishedPlayers, ...sortedRemaining];
    
    return { 
      isFinished: true, 
      rankings 
    };
  }

  return { isFinished: false, rankings: [] };
}

// プレイヤーの役職を決定
export function getPlayerRole(rank: number): string {
  switch (rank) {
    case 0: return '大富豪';
    case 1: return '富豪';
    case 2: return '貧民';
    case 3: return '大貧民';
    default: return '平民';
  }
}

// ジョーカーを使った組み合わせ候補を生成
export function generateJokerCombinations(hand: Card[]): Card[][] {
  const jokers = hand.filter(card => card.suit === 'joker');
  const nonJokers = hand.filter(card => card.suit !== 'joker');
  const combinations: Card[][] = [];
  
  if (jokers.length === 0) return combinations;
  
  // ランク別にグループ化
  const rankGroups: { [rank: number]: Card[] } = {};
  nonJokers.forEach(card => {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  });
  
  // 各ランクについて、ジョーカーと組み合わせる
  Object.values(rankGroups).forEach(rankCards => {
    // ペア組み合わせ（1枚 + ジョーカー1枚）
    if (rankCards.length >= 1 && jokers.length >= 1) {
      combinations.push([rankCards[0], jokers[0]]);
    }
    
    // トリプル組み合わせ
    if (rankCards.length >= 1 && jokers.length >= 2) {
      combinations.push([rankCards[0], jokers[0], jokers[1]]);
    }
    if (rankCards.length >= 2 && jokers.length >= 1) {
      combinations.push([rankCards[0], rankCards[1], jokers[0]]);
    }
    
    // 革命組み合わせ（4枚）
    if (rankCards.length >= 1 && jokers.length >= 3) {
      combinations.push([rankCards[0], jokers[0], jokers[1], jokers[2]]);
    }
    if (rankCards.length >= 2 && jokers.length >= 2) {
      combinations.push([rankCards[0], rankCards[1], jokers[0], jokers[1]]);
    }
    if (rankCards.length >= 3 && jokers.length >= 1) {
      combinations.push([rankCards[0], rankCards[1], rankCards[2], jokers[0]]);
    }
  });
  
  return combinations;
}

// スペードの3が手札にあるかチェック
export function hasSpadeThree(hand: Card[]): boolean {
  return hand.some(card => card.suit === 'spades' && card.rank === 3);
}

// ジョーカーを含む手の実際のランクを取得
export function getEffectiveRank(cards: Card[]): number {
  const nonJokerCards = cards.filter(card => card.suit !== 'joker');
  if (nonJokerCards.length === 0) {
    // ジョーカーのみの場合はジョーカーのランクを返す
    return 14;
  }
  // 通常カードの代表値を返す
  return nonJokerCards[0].rank;
}

// デバッグ用：カード情報を文字列で表示
export function cardToString(card: Card): string {
  if (card.suit === 'joker') return 'JOKER';
  
  const suitSymbols = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣'
  };
  
  const rankNames = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K'
  };
  
  const rankStr = rankNames[card.rank as keyof typeof rankNames] || card.rank.toString();
  return `${rankStr}${suitSymbols[card.suit as keyof typeof suitSymbols]}`;
}