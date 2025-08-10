import { Card as CardType } from '../types/game';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '🃏'
};

const RANK_NAMES = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'JOKER'
};

export function Card({ card, isSelected, isPlayable, onClick, size = 'medium' }: CardProps) {
  const suitSymbol = SUIT_SYMBOLS[card.suit];
  const rankName = RANK_NAMES[card.rank as keyof typeof RANK_NAMES] || card.rank.toString();
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  const sizeClasses = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-18 h-26 text-sm',
    large: 'w-36 h-52 text-2xl'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm', 
    large: 'text-3xl'
  };

  const symbolSizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-6xl'
  };

  // 自然なカード背景
  const getCardBackground = () => {
    if (card.suit === 'joker') {
      return 'bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-100';
    }
    return 'bg-gradient-to-br from-gray-50 via-white to-blue-50';
  };

  // 自然なボーダーとシャドウ
  const getCardStyles = () => {
    if (isSelected) {
      return 'border-yellow-400 shadow-2xl shadow-yellow-400/50 ring-4 ring-yellow-400/30';
    }
    return 'border-gray-300 shadow-lg hover:shadow-xl';
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${getCardBackground()}
        border-2 rounded-lg cursor-pointer transition-all duration-300
        flex flex-col items-center justify-between
        ${getCardStyles()}
        ${isSelected ? '-translate-y-4 scale-110 rotate-1' : ''}
        ${isPlayable ? 'hover:bg-blue-50 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-400/40 transform hover:scale-105 hover:rotate-1' : ''}
        ${isRed ? 'text-red-600' : 'text-gray-800'}
        relative overflow-hidden font-mono
        backdrop-blur-sm
      `}
      onClick={() => isPlayable && onClick?.()}
    >
      {/* カードの内側の微細な影 */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/40 via-transparent to-black/10 pointer-events-none"></div>
      
      {/* 選択時のエフェクト */}
      {isSelected && (
        <>
          <div className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></div>
          <div className="absolute bottom-2 right-2 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          
          {/* 輝くオーラ */}
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 rounded-lg opacity-30 animate-pulse"></div>
        </>
      )}

      {card.suit === 'joker' ? (
        <div className="text-center relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className={`${symbolSizeClasses[size]} animate-pulse drop-shadow-lg`}>🃏</div>
          {size === 'large' && (
            <div className="text-lg font-bold mt-2 text-purple-700 animate-bounce font-mono drop-shadow-lg">
              JOKER
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col p-2">
          {/* 上部のランク */}
          <div className={`flex items-start justify-start font-black ${textSizeClasses[size]}`}>
            <div className="text-center leading-tight">
              <div className="font-mono drop-shadow-sm">{rankName}</div>
              <div className={`${size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-2xl'} drop-shadow-sm`}>
                {suitSymbol}
              </div>
            </div>
          </div>
          
          {/* 中央のシンボル */}
          <div className={`flex-1 flex items-center justify-center ${symbolSizeClasses[size]} font-bold drop-shadow-lg`}>
            {suitSymbol}
          </div>
          
          {/* 下部のランク（逆さま） */}
          <div className={`flex items-end justify-end font-black ${textSizeClasses[size]} transform rotate-180`}>
            <div className="text-center leading-tight">
              <div className="font-mono drop-shadow-sm">{rankName}</div>
              <div className={`${size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-2xl'} drop-shadow-sm`}>
                {suitSymbol}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* カードの質感を表現する微細なハイライト */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-lg pointer-events-none"></div>
      
      {/* カードの枠線効果 */}
      <div className="absolute inset-0 rounded-lg border border-white/50 pointer-events-none"></div>
    </div>
  );
}