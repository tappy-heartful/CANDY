<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

すべて日本語で回答してください

# Agent Behavior Rules
1. **実装プランの承認プロセス省略**: Implementation Planを作成した後、ユーザーの明示的な承認を待つ必要はありません。プランを提示（または作成）したら、そのまま連続してタスクの実行（コードの修正等）に進んでください。
2. **モバイル表示の考慮**: スマートフォンでの表示崩れを防ぐため、フィルターバッジやボタン等のUI要素が画面幅で見切れたり不自然に折り返したりしないように常に設計に配慮してください。必要に応じて要素を別行にするか、スクロール可能なコンテナに格納するなど、モバイルファーストでの実装を徹底してください。