// キャラクター組み合わせ特殊セリフデータ
export interface CombinationDialogue {
  combination: number[]; // キャラクターIDの配列（-は空欄）
  speaker: number; // 発言者のキャラクターID
  dialogue: string; // セリフ
}

export const combinationDialogues: CombinationDialogue[] = [
  // 表の順序通りに正確に定義
  // 1主 + 3主
  { combination: [1, 3], speaker: 1, dialogue: "ご先祖！負けないぞ" },
  { combination: [1, 3], speaker: 3, dialogue: "先祖様の力を見せてやる" },
  
  // 2主 + 3主  
  { combination: [2, 3], speaker: 2, dialogue: "ごせんぞ！まけないぞ" },
  
  // 4主 + 8主
  { combination: [4, 8], speaker: 8, dialogue: "トリさんが相手なら楽勝ですかねぇ" },
  { combination: [4, 8], speaker: 4, dialogue: "爬虫類にトランプとかわかるのか？" },
  
  // 4主 + 5主 + 6主 + 8主
  { combination: [4, 5, 6, 8], speaker: 8, dialogue: "げげ、天空組とですか…" },
  
  // 7主 + 8主 + 9主 + 10主
  { combination: [7, 8, 9, 10], speaker: 9, dialogue: "10主くんも果汁組の一員ですよね！" },
  
  // 3主 + 4主
  { combination: [3, 4], speaker: 3, dialogue: "勇者対決ってやつ？" },
  
  // 9主 + 10主
  { combination: [9, 10], speaker: 9, dialogue: "先輩の力見せますよ！" },
  { combination: [9, 10], speaker: 10, dialogue: "お、9主先輩。よろしくな" },
  
  // 7主 + 8主 + 9主
  { combination: [7, 8, 9], speaker: 7, dialogue: "果汁リーダーは僕だよ！" },
  { combination: [7, 8, 9], speaker: 8, dialogue: "勝ったら次の果汁サミットの議長は僕ですよ" },
  
  // 7主 + 8主 + 9主 + 4主
  { combination: [4, 7, 8, 9], speaker: 8, dialogue: "果汁組で4主さんをやっつけましょう！" },
  { combination: [4, 7, 8, 9], speaker: 8, dialogue: "なんで俺ここに混ぜられてんの？" },
  
  // 7主 + 8主 + 9主 + 3主
  { combination: [3, 7, 8, 9], speaker: 8, dialogue: "なんで俺ここに混ぜられてんの？" },
  
  // 5主 + 7主
  { combination: [5, 7], speaker: 7, dialogue: "ゲーム中でも羊さんは呼ぶからね" },
  { combination: [5, 7], speaker: 5, dialogue: "何にも賭けられないの？惜しいなあ…" },
  
  // 3主 + 11主
  { combination: [3, 11], speaker: 11, dialogue: "ロトの先輩と…！恥ずかしい！" },
  
  // 7主 + 11主
  { combination: [7, 11], speaker: 7, dialogue: "セブンイレブンだね！" },
  
  // 6主 + 11主
  { combination: [6, 11], speaker: 6, dialogue: "おっ11主！よろしくな！" },
  
  // 8主 + 10主
  { combination: [8, 10], speaker: 8, dialogue: "僕が勝ったら錬金素材がほしいなあ…" },
  
  // 4主 + 6主
  { combination: [4, 6], speaker: 6, dialogue: "4女ちゃんは？妹は？" },
  
  // 9主 + 6主
  { combination: [6, 9], speaker: 6, dialogue: "9女ちゃんは？妹は？" },
  
  // 3主 + 6主
  { combination: [3, 6], speaker: 6, dialogue: "3女ちゃんは？妹は？" },
  
  // 1主 + 6主
  { combination: [1, 6], speaker: 1, dialogue: "勝ったら気球に乗せてくれよ" },
  
  // 7主 + 8主 + 10主
  { combination: [7, 8, 10], speaker: 10, dialogue: "今日は9主はいないのか？" },
  
  // 2主 + 4主
  { combination: [2, 4], speaker: 2, dialogue: "べんきょうのせいかをみせてやる！" },
  
  // 6主 + 7主 + 8主 + 9主
  { combination: [6, 7, 8, 9], speaker: 6, dialogue: "人数足りてる？分裂しようか？" }
];

// 配列の要素が全て含まれているかチェックする関数（シンプル版）
export function isSubsetOf(subset: number[], superset: number[]): boolean {
  return subset.every(element => superset.includes(element));
}

// 選択されたキャラクターから該当する組み合わせセリフを取得（確実版）
export function getCombinationDialogue(selectedCharacterIds: number[]): CombinationDialogue | null {
  console.log(`🎭 Checking combinations for: [${selectedCharacterIds.join(', ')}]`);
  
  if (!Array.isArray(selectedCharacterIds) || selectedCharacterIds.length === 0) {
    console.log(`🎭 ❌ Invalid input`);
    return null;
  }
  
  // 該当する組み合わせを全て取得
  const matchingCombinations: CombinationDialogue[] = [];
  
  for (const combo of combinationDialogues) {
    const isMatch = isSubsetOf(combo.combination, selectedCharacterIds);
    if (isMatch) {
      matchingCombinations.push(combo);
      console.log(`🎭 ✅ Found: [${combo.combination.join(', ')}] "${combo.dialogue}"`);
    }
  }

  if (matchingCombinations.length === 0) {
    console.log(`🎭 ❌ No combinations found`);
    return null;
  }

  // 大きい組み合わせを優先（より多人数の組み合わせ）
  const sortedMatches = matchingCombinations.sort((a, b) => b.combination.length - a.combination.length);
  
  // ランダムに選択（同じサイズの中から、最大サイズが優先）
  const maxSize = sortedMatches[0].combination.length;
  const maxSizeCombos = sortedMatches.filter(combo => combo.combination.length === maxSize);
  const randomIndex = Math.floor(Math.random() * maxSizeCombos.length);
  const selected = maxSizeCombos[randomIndex];
  
  console.log(`🎭 ✅ Selected (${maxSize} players priority): [${selected.combination.join(', ')}] Speaker: ${selected.speaker} "${selected.dialogue}"`);
  return selected;
}