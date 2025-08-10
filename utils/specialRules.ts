// utils/specialRules.ts
// @ts-nocheck

/** 場の特別処理（ダミー版）。そのまま state を返すだけ。 */
export function executeFieldFlow(state: any, _payload: any = {}): any {
  return state;
}

/** 8切り判定（未実装ダミー） */
export function isEightCut(_cards: any): boolean {
  return false;
}

/** 革命判定（未実装ダミー） */
export function isRevolution(_cards: any): boolean {
  return false;
}

/** スペード3がジョーカーに勝つか（未実装ダミー） */
export function canSpade3BeatJoker(_cards: any): boolean {
  return false;
}
