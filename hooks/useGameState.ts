import { useState, useCallback } from 'react';
import { GameState, Player, Character } from '../types/game';
import { createDeck } from '../utils/gameLogic';

type AppGamePhase = 'setup' | 'playing' | 'finished';

export const useGameState = () => {
  const [gamePhase, setGamePhase] = useState<AppGamePhase>('setup');
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [finalMessagesSet, setFinalMessagesSet] = useState<boolean>(false);
  const [gameStartDelay, setGameStartDelay] = useState<boolean>(false);

  // 速度に応じた時間計算
  const getAdjustedTime = useCallback((baseTime: number): number => {
    return Math.max(100, baseTime / gameSpeed);
  }, [gameSpeed]);

  // 🎯 アクティブリスト操作（指示準拠）
  const getActiveList = useCallback((players: Player[]): number[] => {
    return players
      .filter(p => p.hand.length > 0 && !p.isFoulFinished)
      .map(p => p.id)
      .sort((a, b) => a - b); // 席順（ID順）を保つ
  }, []);

  // 🎯 次のアクティブプレイヤー取得（指示準拠）
  const getNextActivePlayer = useCallback((currentTurn: number, active: number[], passFlags: { [id: number]: boolean }): number => {
    console.log(`🔄 Finding next active player from turn=${currentTurn}, active=[${active.join(',')}]`);
    
    if (active.length <= 1) {
      console.log(`🔄 Only ${active.length} active players, returning current or first`);
      return active[0] || currentTurn;
    }
    
    const currentIndex = active.indexOf(currentTurn);
    if (currentIndex === -1) {
      console.log(`🔄 Current turn ${currentTurn} not in active list, returning first active`);
      return active[0];
    }
    
    // 環状リストで次のプレイヤーを探す（パスしていない人）
    for (let i = 1; i <= active.length; i++) {
      const nextIndex = (currentIndex + i) % active.length;
      const candidate = active[nextIndex];
      
      if (!passFlags[candidate]) {
        console.log(`🔄 Found next active unPassed player: ${candidate}`);
        return candidate;
      }
    }
    
    // 全員がパスしている場合（場流れ条件）
    console.log(`🔄 All active players passed - field should flow`);
    return active[0]; // 安全のため先頭を返す
  }, []);

  // 🎯 場流れ判定（指示準拠）
  const shouldFlowField = useCallback((active: number[], passFlags: { [id: number]: boolean }): boolean => {
    const N = active.length;
    const passedCount = active.filter(id => passFlags[id]).length;
    
    console.log(`🎯 Flow check: N=${N}, passedCount=${passedCount}`);
    
    if (N === 2) {
      // 2人の場合：相手がパスしたら即場流し
      return passedCount >= 1;
    } else if (N > 2) {
      // 3人以上の場合：(N-1)人がパスしたら場流し
      return passedCount >= (N - 1);
    }
    
    return false;
  }, []);

  // ゲーム初期化（指示準拠の新設計）- CPU専用
  const initializeGame = useCallback((
    charactersParam?: Character[]
  ) => {
    console.log('🎮 Initializing CPU-only game with new turn system...');
    
    const charactersToUse = charactersParam || selectedCharacters;
    
    if (!charactersToUse || charactersToUse.length !== 4) {
      console.error('❌ Invalid characters for initialization');
      return;
    }

    if (charactersParam) setSelectedCharacters(charactersParam);

    const deck = createDeck();
    const positions = ['bottom-right', 'bottom-left', 'top-left', 'top-right'] as const;
    
    const players: Player[] = charactersToUse.map((character, index) => ({
      id: index,
      character,
      hand: deck.slice(index * 13, (index + 1) * 13).sort((a, b) => {
        if (a.suit === 'joker') return 1;
        if (b.suit === 'joker') return -1;
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.suit.localeCompare(b.suit);
      }),
      isHuman: false, // 全プレイヤーCPU
      position: positions[index],
      expression: 'normal' as const,
      message: '',
      messageType: 'normal' as const,
      lastAction: undefined,
      isFoulFinished: false,
      reactionEmoji: undefined
    }));

    // スターティングプレイヤーの決定（スペードの3保持者）
    const startingPlayer = players.findIndex(player => 
      player.hand.some(card => card.rank === 3 && card.suit === 'spades')
    );
    const finalStartingPlayer = startingPlayer >= 0 ? startingPlayer : 0;
    
    // 🎯 新設計：指示準拠の状態初期化
    const active = getActiveList(players);
    const turn = finalStartingPlayer;
    const fieldSet = null; // 新しい場でスタート
    const lastPlayer = null; // まだ誰も出していない
    const passFlags: { [id: number]: boolean } = {};
    active.forEach(id => { passFlags[id] = false; });

    console.log(`🎮 Game initialized: turn=${turn}, active=[${active.join(',')}], fieldSet=${fieldSet}`);

    const newGameState: GameState = {
      players,
      
      // === 新設計状態 ===
      active,
      turn,
      fieldSet,
      lastPlayer,
      passFlags,
      
      // === 互換性維持 ===
      currentPlayer: turn,
      field: [],
      playHistory: [],
      lastPlayType: null,
      lastPlayCount: 0,
      isRevolution: false,
      suitLock: null,
      gamePhase: 'playing',
      turnsPassed: 0,
      winner: null,
      finishOrder: [],
      lastCardPlayerId: turn
    };

    setGameState(newGameState);
    setFinalMessagesSet(false);
    setGamePhase('playing');
    
    // ゲーム開始遅延を設定（4秒間AI処理を遅延）
    setGameStartDelay(true);
    console.log('🎭 Game start delay activated - AI processing will be delayed for 4 seconds');
    
    setTimeout(() => {
      setGameStartDelay(false);
      console.log('🎭 Game start delay deactivated - AI processing can now begin');
    }, 4000);
    
    console.log('✅ CPU-only game initialization completed with new turn system!');
  }, [selectedCharacters, getActiveList]);

  // ゲームリセット
  const resetGame = useCallback(() => {
    console.log('🔄 Resetting game...');
    setGameState(null);
    setGamePhase('setup');
    setSelectedCharacters([]);
    setGameSpeed(1);
    setDebugMode(false);
    setIsPaused(false);
    setFinalMessagesSet(false);
    setGameStartDelay(false);
    console.log('✅ Game reset completed');
  }, []);

  // 🎯 上がり処理：activeリストから除外（指示準拠）
  const handlePlayerFinish = useCallback((playerId: number, gameState: GameState): GameState => {
    console.log(`🏁 Player ${playerId} finished, removing from active list`);
    
    const newState = { ...gameState };
    
    // activeリストから除外
    newState.active = newState.active.filter(id => id !== playerId);
    
    // passFlags から除外
    delete newState.passFlags[playerId];
    
    // turnが上がった本人だった場合は次席に移す
    if (newState.turn === playerId) {
      if (newState.active.length > 0) {
        newState.turn = getNextActivePlayer(playerId, newState.active, newState.passFlags);
        console.log(`🏁 Turn moved from finished player to: ${newState.turn}`);
      }
    }
    
    // 互換性維持
    newState.currentPlayer = newState.turn;
    
    // 🎯 ゲーム終了判定：残り1人の場合は最後の人も自動的に順位確定
    if (newState.active.length <= 1) {
      console.log(`🏁 Game ending: ${newState.active.length} players remain`);
      
      // 残り1人がいる場合、その人を大貧民（最下位）として finishOrder に追加
      if (newState.active.length === 1) {
        const lastPlayerId = newState.active[0];
        const lastPlayer = newState.players[lastPlayerId];
        console.log(`🏁 Adding last player ${lastPlayer.character.name} to finishOrder as 大貧民`);
        
        // finishOrder に追加（大貧民として）
        if (!newState.finishOrder.includes(lastPlayerId)) {
          newState.finishOrder = [...newState.finishOrder, lastPlayerId];
        }
        
        // 大貧民確定時の表情設定
        const updatedPlayers = [...newState.players];
        updatedPlayers[lastPlayerId] = {
          ...updatedPlayers[lastPlayerId],
          expression: 'disappointed' // 大貧民確定時はがっかり・失望の表情
        };
        newState.players = updatedPlayers;
        
        console.log(`🎭 Set disappointed expression for 大貧民: ${lastPlayer.character.name}`);
        
        // activeリストをクリア
        newState.active = [];
        
        // passFlags をクリア
        newState.passFlags = {};
      }
      
      newState.gamePhase = 'finished';
      console.log(`🏁 Game finished! Final order: [${newState.finishOrder.join(',')}]`);
    }
    
    return newState;
  }, [getNextActivePlayer]);

  return {
    // State
    gamePhase,
    selectedCharacters,
    gameState,
    gameSpeed,
    debugMode,
    isPaused,
    finalMessagesSet,
    gameStartDelay,
    
    // Setters
    setGamePhase,
    setSelectedCharacters,
    setGameState,
    setGameSpeed,
    setDebugMode,
    setIsPaused,
    setFinalMessagesSet,
    setGameStartDelay,
    
    // Computed
    getAdjustedTime,
    
    // Actions
    initializeGame,
    resetGame,
    
    // 🎯 新設計の関数群
    getActiveList,
    getNextActivePlayer,
    shouldFlowField,
    handlePlayerFinish
  };
};