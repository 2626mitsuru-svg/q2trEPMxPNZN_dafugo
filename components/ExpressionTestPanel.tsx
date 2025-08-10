import React from 'react';
import { ExpressionType } from './ExpressionImage';

interface ExpressionTestPanelProps {
  isVisible: boolean;
  onExpressionSelect: (expression: ExpressionType) => void;
  onClose: () => void;
}

export function ExpressionTestPanel({ 
  isVisible, 
  onExpressionSelect, 
  onClose 
}: ExpressionTestPanelProps) {
  if (!isVisible) return null;

  // 利用可能な表情一覧
  const expressions: { type: ExpressionType; label: string; emoji: string; description: string }[] = [
    { type: 'normal', label: '通常', emoji: '🙂', description: 'ゲーム開始時、通常時' },
    { type: 'happy', label: '嬉しい', emoji: '😊', description: '良い手札、勝ち確' },
    { type: 'thinking', label: '考え中', emoji: '🤔', description: '手札検討中、戦略思考' },
    { type: 'confident', label: '得意気', emoji: '😏', description: '革命・8切り成功時' },
    { type: 'surprised', label: '驚き', emoji: '😲', description: '八切りされた時' },
    { type: 'nervous', label: '緊張', emoji: '😨', description: 'パス時、リスク回避' },
    { type: 'disappointed', label: '失望', emoji: '😞', description: '劣勢時、手札が悪い' },
    { type: 'angry', label: '怒り', emoji: '😠', description: '大貧民確定、反則負け' },
    { type: 'frustrated', label: '困った', emoji: '😰', description: '困った状況' },
    { type: 'worried', label: '心配', emoji: '😟', description: '心配時' },
    { type: 'excited', label: '興奮', emoji: '🤩', description: '興奮状態' },
  ];

  return (
    <div 
      className="fixed inset-0 z-[11000] bg-black/60 flex items-center justify-center p-4" 
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => {
        // 背景クリックでは閉じない
        if (e.target === e.currentTarget) {
          console.log('Background clicked, but preventing close');
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div 
        className="bg-slate-900 border-8 border-white shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden relative" 
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => {
          console.log('Modal content clicked');
          e.stopPropagation();
        }}
      >
        {/* ドラクエ風角装飾 */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full"></div>

        {/* ヘッダー */}
        <div className="p-6 border-b-4 border-white bg-slate-800 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-mono">🎭</div>
              <div
                className="text-2xl font-bold text-white font-mono"
                style={{
                  textShadow: "2px 2px 0px #000",
                }}
              >
                表情確認モード
              </div>
              <div className="px-4 py-2 bg-purple-600 text-white font-bold rounded-full font-mono">
                デバッグ専用
              </div>
            </div>
            <button
              onClick={(e) => {
                console.log('Close button clicked');
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="px-6 py-3 border-4 font-bold bg-red-600 hover:bg-red-700 text-white border-white shadow-lg transition-all duration-200 font-mono cursor-pointer"
              style={{ textShadow: "1px 1px 0px #000", pointerEvents: 'auto' }}
            >
              ❌ 閉じる
            </button>
          </div>
        </div>

        {/* 表情選択エリア */}
        <div className="max-h-[60vh] overflow-y-auto p-6 custom-scrollbar">
          <div className="text-center mb-6">
            <div
              className="text-lg text-white font-mono mb-2"
              style={{
                textShadow: "1px 1px 0px #000",
              }}
            >
              ボタンを押すと全プレイヤーの表情が一斉に切り替わります
            </div>
            <div className="text-sm text-gray-400 font-mono">
              ８主・４主は専用表情、他は共通表情が使用されます
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {expressions.map((expression) => (
              <button
                key={expression.type}
                onClick={(e) => {
                  console.log('Expression button clicked:', expression.type);
                  e.preventDefault();
                  e.stopPropagation();
                  onExpressionSelect(expression.type);
                }}
                className="bg-slate-800 border-2 border-white p-4 hover:bg-slate-700 transition-all duration-200 hover:scale-105 shadow-lg cursor-pointer"
                style={{ pointerEvents: 'auto', zIndex: 1 }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">{expression.emoji}</div>
                  <div
                    className="text-lg font-bold text-white font-mono mb-1"
                    style={{
                      textShadow: "1px 1px 0px #000",
                    }}
                  >
                    {expression.label}
                  </div>
                  <div className="text-xs text-gray-300 font-mono">
                    {expression.description}
                  </div>
                  <div className="mt-2 px-3 py-1 bg-blue-600 text-white font-bold rounded-full font-mono text-xs">
                    {expression.type}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 特別な説明エリア */}
          <div className="mt-8 bg-slate-800 border-2 border-yellow-400 p-4">
            <div
              className="text-lg font-bold text-yellow-400 font-mono mb-3"
              style={{
                textShadow: "1px 1px 0px #000",
              }}
            >
              🎨 専用表情システム情報
            </div>
            <div className="text-sm text-white font-mono space-y-1">
              <div>• <span className="text-yellow-300">８主</span>: 7/8枚完了（87.5%） - ほぼ完成、nervousのみ今後追加予定</div>
              <div>• <span className="text-green-300">４主</span>: 7/7枚完了（100%） - 完全完成！</div>
              <div>• <span className="text-blue-300">他キャラ</span>: 共通表情システム使用</div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t-4 border-white bg-slate-800 text-center">
          <div className="text-gray-400 text-sm font-mono">
            ESCキーまたは「閉じる」ボタンで表情確認モードを終了します
          </div>
        </div>
      </div>
    </div>
  );
}