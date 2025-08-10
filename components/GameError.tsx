import React from 'react';
import { GamePhase } from '../types/app';

interface GameErrorProps {
  gamePhase: GamePhase | string;
}

export const GameError: React.FC<GameErrorProps> = ({ gamePhase }) => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-xl">Unknown game phase: {gamePhase}</p>
    </div>
  );
};