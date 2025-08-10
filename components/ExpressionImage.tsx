import React, { useState, useEffect } from 'react';

// Vercel静的URL設定
const ASSETS_BASE = 'https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app';
const pad2 = (n: number | string) => String(n).padStart(2, '0');
const faceUrl = (id: number | string, expr: string) =>
  `${ASSETS_BASE}/${pad2(id)}/${expr.toLowerCase()}.png`;

export type ExpressionType =
  | "neutral"
  | "happy"
  | "surprised"
  | "confident"
  | "thinking"
  | "nervous"
  | "disappointed"
  | "frustrated"  // nervous にマッピング
  | "worried"     // nervous にマッピング
  | "normal"      // neutral にマッピング
  | "excited"     // happy にマッピング
  | "angry";      // disappointed にマッピング

// 表情マッピング：複数の表情を統一表情にマッピング
const expressionMapping: Record<ExpressionType, string> = {
  neutral: 'neutral',
  happy: 'happy',
  surprised: 'surprised',
  confident: 'confident',
  thinking: 'thinking',
  nervous: 'nervous',
  disappointed: 'disappointed',
  frustrated: 'nervous',     // frustrated → nervous
  worried: 'nervous',        // worried → nervous
  normal: 'neutral',         // normal → neutral
  excited: 'happy',          // excited → happy
  angry: 'disappointed'      // angry → disappointed
};

// 表情を実際のファイル名にマッピングする関数
const mapExpression = (expression: ExpressionType | string | undefined | null): string => {
  // null/undefined チェック
  if (!expression) {
    console.warn('⚠️ ExpressionImage: expression が null/undefined です。neutralにフォールバック。');
    return 'neutral';
  }

  // 文字列として正規化
  const normalizedExpression = String(expression).toLowerCase();
  
  // expressionMapping に存在するかチェック
  if (normalizedExpression in expressionMapping) {
    return expressionMapping[normalizedExpression as ExpressionType];
  }

  // 無効な表情の場合は neutral にフォールバック
  console.warn(`⚠️ ExpressionImage: 不正な表情 "${expression}" が指定されました。neutralにフォールバック。`);
  return 'neutral';
};

interface ExpressionImageProps {
  characterId: number;
  expression: ExpressionType | string | undefined | null;
  className?: string;
  alt?: string;
  scale?: number; // スケール倍率を追加（1.0 = 100%、1.7 = 170%）
}

export function ExpressionImage({ 
  characterId, 
  expression, 
  className = "w-full h-full object-contain drop-shadow-2xl", 
  alt,
  scale = 1.0
}: ExpressionImageProps) {
  // 安全な表情処理
  const safeExpression = expression || 'neutral';
  const mappedExpression = mapExpression(safeExpression);
  const primarySrc = faceUrl(characterId, mappedExpression);
  const fallbackSrc = faceUrl(characterId, 'neutral');
  const altText = alt || `${characterId}番キャラクターの${safeExpression}表情`;

  // characterIdのバリデーション
  if (!characterId || characterId < 1 || characterId > 11) {
    console.warn(`⚠️ ExpressionImage: 不正なcharacterId "${characterId}" が指定されました。`);
    return (
      <div className={`${className} bg-red-200 border-2 border-dashed border-red-400 flex items-center justify-center`}>
        <div className="text-center text-red-600 text-xs">
          <div className="text-2xl">❌</div>
          <div>ID エラー</div>
          <div className="text-xs mt-1">ID: {characterId}</div>
        </div>
      </div>
    );
  }

  // 画像読み込み状態管理
  const [currentSrc, setCurrentSrc] = useState(primarySrc);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // expression/characterId が変更されたらリセット
  useEffect(() => {
    setCurrentSrc(primarySrc);
    setHasError(false);
    setIsLoading(true);
    
    // デバッグログ（マッピング情報も表示）
    if (mappedExpression !== safeExpression) {
      console.log(`🖼️ 表情画像読み込み開始: ${characterId}番${safeExpression} → ${mappedExpression} (マッピング) → ${primarySrc}`);
    } else {
      console.log(`🖼️ 表情画像読み込み開始: ${characterId}番${safeExpression} → ${primarySrc}`);
    }
  }, [primarySrc, characterId, safeExpression, mappedExpression]);

  // エラーハンドリング
  const handleError = () => {
    console.log(`❌ 画像読み込みエラー: ${currentSrc}`);
    
    if (currentSrc === primarySrc && primarySrc !== fallbackSrc) {
      // メイン画像が失敗した場合、フォールバックに切り替え
      console.log(`🔄 フォールバック画像に切り替え: ${fallbackSrc}`);
      setCurrentSrc(fallbackSrc);
    } else {
      // フォールバックも失敗した場合、エラー表示
      console.log(`💥 フォールバック画像も失敗: ${fallbackSrc}`);
      setHasError(true);
    }
    setIsLoading(false);
  };

  // 読み込み成功
  const handleLoad = () => {
    console.log(`✅ 画像読み込み成功: ${currentSrc}`);
    setIsLoading(false);
    setHasError(false);
  };

  // スケール適用時は transform でサイズを調整
  const imageStyle = scale !== 1.0 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'center center'
  } : {};

  // エラー時の表示
  if (hasError) {
    return (
      <div 
        className={`${className} bg-gray-200 border-2 border-dashed border-gray-400 flex items-center justify-center`}
        style={imageStyle}
      >
        <div className="text-center text-gray-500 text-xs">
          <div className="text-2xl">🖼️</div>
          <div>画像エラー</div>
          <div className="text-xs mt-1">
            {characterId}番{safeExpression}
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={altText}
      className={className}
      style={imageStyle}
      onError={handleError}
      onLoad={handleLoad}
      data-character-id={characterId}
      data-expression={safeExpression}
      data-original-src={primarySrc}
      data-current-src={currentSrc}
    />
  );
}

// デバッグ用：表情システム状況確認
export function getExpressionSystemStatus() {
  console.log('🎭 表情システム - Vercel静的URL統一完了（マッピング機能付き）');
  console.log('');
  console.log('🌐 ベースURL:', ASSETS_BASE);
  console.log('📋 表情タイプ（12種）:', 'neutral | happy | surprised | confident | thinking | nervous | disappointed | frustrated | worried | normal | excited | angry');
  console.log('🎯 対象キャラクター: 01-11番（全キャラクター統一処理）');
  console.log('🔄 フォールバック: neutral.pngに1回だけ切り替え');
  console.log('');
  
  console.log('🔀 表情マッピング:');
  Object.entries(expressionMapping).forEach(([original, mapped]) => {
    if (original !== mapped) {
      console.log(`   ${original} → ${mapped} (マッピング)`);
    } else {
      console.log(`   ${original} → ${mapped}`);
    }
  });
  console.log('');
  
  const testCases = [
    { id: 1, expr: 'neutral' as ExpressionType },
    { id: 4, expr: 'thinking' as ExpressionType },
    { id: 8, expr: 'frustrated' as ExpressionType },
    { id: 11, expr: 'worried' as ExpressionType }
  ];
  
  console.log('📸 URL生成例（マッピング適用後）:');
  testCases.forEach(({ id, expr }) => {
    const mapped = mapExpression(expr);
    console.log(`   ${id}番${expr}: ${faceUrl(id, mapped)} ${expr !== mapped ? `(${expr} → ${mapped})` : ''}`);
  });
  
  console.log('');
  console.log('✅ 全キャラクター統一システム + 拡張マッピング機能完成！');
  console.log('');
  console.log('🆕 新しく追加された表情マッピング:');
  console.log('   normal → neutral (通常状態)');
  console.log('   excited → happy (興奮状態)');
  console.log('   angry → disappointed (怒り状態)');
  console.log('   frustrated → nervous (イライラ状態)');
  console.log('   worried → nervous (心配状態)');
}

// 指定キャラクターの全表情URL確認（マッピング情報含む）
export function testCharacterExpressions(characterId: number) {
  const expressions: ExpressionType[] = [
    'neutral', 'happy', 'surprised', 'confident', 'thinking', 'nervous', 'disappointed', 
    'frustrated', 'worried', 'normal', 'excited', 'angry'
  ];
  
  console.log(`🎭 ${characterId}番キャラクターの表情URL一覧 (マッピング情報含む):`);
  expressions.forEach(expr => {
    const mappedExpr = mapExpression(expr);
    const url = faceUrl(characterId, mappedExpr);
    if (mappedExpr !== expr) {
      console.log(`${expr}: ${url} (${expr} → ${mappedExpr})`);
    } else {
      console.log(`${expr}: ${url}`);
    }
  });
}

// 画像読み込みテスト（実際にHTTPリクエストを送信）
export async function testImageLoading(characterId: number, expression: ExpressionType | string | undefined | null) {
  const mappedExpression = mapExpression(expression);
  const url = faceUrl(characterId, mappedExpression);
  const safeExpression = expression || 'neutral';
  const mappingInfo = safeExpression !== mappedExpression ? ` (${safeExpression} → ${mappedExpression})` : '';
  console.log(`🔍 画像読み込みテスト開始: ${url}${mappingInfo}`);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      console.log(`✅ 画像読み込み成功: ${characterId}番${safeExpression}${mappingInfo} (${response.status})`);
      return true;
    } else {
      console.log(`❌ 画像読み込み失敗: ${characterId}番${safeExpression}${mappingInfo} (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 画像読み込みエラー: ${characterId}番${safeExpression}${mappingInfo}`, error);
    return false;
  }
}

// 複数キャラクター・複数表情の読み込みテスト
export async function testMultipleImages(characterIds: number[], expressions: (ExpressionType | string | undefined | null)[]) {
  console.log('🧪 複数画像読み込みテスト開始（マッピング適用）...');
  
  const results: { [key: string]: boolean } = {};
  
  for (const id of characterIds) {
    for (const expr of expressions) {
      const key = `${id}-${expr}`;
      results[key] = await testImageLoading(id, expr);
      
      // 少し待機してサーバーに負荷をかけないように
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  const totalTests = Object.keys(results).length;
  const successCount = Object.values(results).filter(Boolean).length;
  const failureCount = totalTests - successCount;
  
  console.log('');
  console.log('📊 複数画像読み込みテスト結果:');
  console.log(`✅ 成功: ${successCount}/${totalTests} (${((successCount/totalTests)*100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${failureCount}/${totalTests} (${((failureCount/totalTests)*100).toFixed(1)}%)`);
  
  // 失敗した画像を表示（マッピング情報含む）
  if (failureCount > 0) {
    console.log('');
    console.log('❌ 読み込み失敗画像一覧:');
    Object.entries(results).forEach(([key, success]) => {
      if (!success) {
        const [id, expr] = key.split('-');
        const mappedExpr = mapExpression(expr);
        const url = faceUrl(Number(id), mappedExpr);
        const safeExpr = expr || 'neutral';
        console.log(`   ${id}番${safeExpr}: ${url} ${safeExpr !== mappedExpr ? `(${safeExpr} → ${mappedExpr})` : ''}`);
      }
    });
  }
  
  return results;
}

// 簡単なテスト関数（よく使用されるキャラクター・表情で）
export async function quickImageTest() {
  const testCharacters = [1, 4, 8, 11];
  const testExpressions: (ExpressionType | string | undefined | null)[] = [
    'neutral', 'happy', 'thinking', 'confident', 'frustrated', 'worried', 
    'normal', 'excited', 'angry', undefined, null, 'invalid_expression'
  ];
  
  console.log('⚡ クイック画像テスト開始（マッピング機能テスト含む）...');
  return await testMultipleImages(testCharacters, testExpressions);
}

// エラーハンドリングテスト関数
export function testErrorHandling() {
  console.log('🧪 エラーハンドリングテスト開始...');
  
  const testCases = [
    { id: 1, expr: undefined, description: 'undefined expression' },
    { id: 2, expr: null, description: 'null expression' },
    { id: 3, expr: '', description: 'empty string expression' },
    { id: 4, expr: 'invalid_expression', description: 'invalid expression' },
    { id: 5, expr: 'normal', description: 'normal → neutral mapping' },
    { id: 6, expr: 'excited', description: 'excited → happy mapping' },
    { id: 7, expr: 'angry', description: 'angry → disappointed mapping' },
    { id: 0, expr: 'neutral', description: 'invalid characterId (0)' },
    { id: 12, expr: 'neutral', description: 'invalid characterId (12)' },
    { id: -1, expr: 'neutral', description: 'invalid characterId (-1)' }
  ];
  
  console.log('🎯 テストケース:');
  testCases.forEach(({ id, expr, description }, index) => {
    console.log(`${index + 1}. ${description}: characterId=${id}, expression="${expr}"`);
    const mappedExpr = mapExpression(expr);
    console.log(`   → マッ��ング結果: "${mappedExpr}"`);
    if (id >= 1 && id <= 11) {
      console.log(`   → URL: ${faceUrl(id, mappedExpr)}`);
    } else {
      console.log(`   → URL: characterId が無効のため生成不可`);
    }
    console.log('');
  });
  
  console.log('✅ エラーハンドリングテスト完了');
}

// 表情マッピングの詳細表示
export function showExpressionMapping() {
  console.log('🔀 表情マッピング詳細:');
  console.log('');
  console.log('📌 実際の画像ファイル（7種類）:');
  console.log('  neutral.png, happy.png, surprised.png, confident.png, thinking.png, nervous.png, disappointed.png');
  console.log('');
  console.log('📝 表情コードで指定可能（12種類）:');
  const mappingEntries = Object.entries(expressionMapping);
  const directMappings = mappingEntries.filter(([orig, mapped]) => orig === mapped);
  const aliasedMappings = mappingEntries.filter(([orig, mapped]) => orig !== mapped);
  
  console.log('  直接マッピング（7種類の実画像ファイル）:');
  directMappings.forEach(([expr]) => {
    console.log(`    "${expr}" → ${expr}.png`);
  });
  
  console.log('  エイリアスマッピング（5種類の代替表情）:');
  aliasedMappings.forEach(([orig, mapped]) => {
    console.log(`    "${orig}" → ${mapped}.png (${orig}は${mapped}の代替)`);
  });
  
  console.log('');
  console.log('💡 使用例（新しく追加されたマッピング）:');
  console.log('  <ExpressionImage characterId={1} expression="normal" />');
  console.log('  → https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/neutral.png');
  console.log('');
  console.log('  <ExpressionImage characterId={1} expression="excited" />');
  console.log('  → https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/happy.png');
  console.log('');
  console.log('  <ExpressionImage characterId={1} expression="angry" />');
  console.log('  → https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/disappointed.png');
  console.log('');
  console.log('  <ExpressionImage characterId={1} expression="frustrated" />');
  console.log('  → https://tx-ys-dy8-e6-s9-b-daifugogo.vercel.app/01/nervous.png');
}