<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

すべて日本語で回答してください

# Agent Behavior Rules
1. **実装プランの承認プロセス省略**: Implementation Planを作成した後、ユーザーの明示的な承認を待つ必要はありません。プランを提示（または作成）したら、そのまま連続してタスクの実行（コードの修正等）に進んでください。
2. **モバイル表示の考慮**: スマートフォンでの表示崩れを防ぐため、フィルターバッジやボタン等のUI要素が画面幅で見切れたり不自然に折り返したりしないように常に設計に配慮してください。必要に応じて要素を別行にするか、スクロール可能なコンテナに格納するなど、モバイルファーストでの実装を徹底してください。

# CANDY プロジェクト規約 (Project Conventions)

本ドキュメントは、Next.js (App Router), TypeScript, Firebase (Firestore), および LINE API を活用したプロフェッショナルな開発のための厳格な規約を定義する。

## 1. 基本アーキテクチャ (Core Architecture)

### 1.1. Feature-based Architecture

機能単位でコードをカプセル化し、保守性を高める。

- `src/features/<feature_name>/` 配下に以下の構成を持つ：
  - `api/`:
    - `*-server-actions.ts`: サーバーサイドでのデータ取得・ロジック（`"use server"`）
    - `*-client-service.ts`: クライアントサイドでの書き込み処理等
  - `components/`: その機能固有のUIコンポーネント（パス名：`Kebab-case` または `PascalCase`）
  - `views/`:
    - `*ListClient.tsx`: 一覧画面のメインロジック
    - `*EditClient.tsx`: 編集画面のメインロジック
    - `*ConfirmClient.tsx`: 詳細・確認画面のメインロジック
  - `lib/`: その機能固有のロジック、検索エンジン等
  - `types/`: 機能固有の型定義

### 1.2. 共通ディレクトリ構成

- `src/app/`: ルーティング定義。各ディレクトリの `page.tsx` は最小限のサーバーコンポーネントとし、`features` の `views` を呼び出す。
  - `loading.tsx`: ページのデータ取得中に自動表示されるローディングUI。
  - `error.tsx`: ページでエラーが発生した際のフォールバックUI（`"use client"` が必要）。
  - `not-found.tsx`: `notFound()` を呼んだときのカスタム404UI。
- `src/components/`:
  - `Form/`: 共通入力コンポーネント (`AppInput.tsx`, `FormField.tsx`)
  - `Layout/`: 共通レイアウトコンポーネント (`BaseLayout.tsx`, `ConfirmLayout.tsx`)
  - `Common/`: モーダル、ダイアログ等
- `src/lib/`:
  - `firestore/`: `index.ts`, `types.ts`, `utils.ts`
  - `line.ts`: Messaging API 連携
  - `firebase.ts`: Firebase 初期化設定
- `src/hooks/`: `useAppForm.ts` (バリデーション込) 等
- `src/contexts/`: `AuthContext.tsx` 等

---

## 2. 命名・実装の厳密なルール

### 2.1. ファイル・変数命名

- **コンポーネントファイル**: `PascalCase` (例: `UserListClient.tsx`)
- **ユーティリティ・API**: `kebab-case` (例: `user-server-actions.ts`)
- **CSS Modules**: `*.module.css`
- **関数名**: `camelCase` (動詞から始める: `getUserData`, `handleUpdate`)
- **型・インターフェース**: `PascalCase`

### 2.2. Server vs Client Components

- **原則**: コンポーネントツリーの**できるだけ末端（葉）**に `"use client"` を適用する。
- ページ全体を Client Component にせず、インタラクティブな部分のみを切り出す。
- `import 'server-only'` を活用し、サーバー用コードがクライアントに混入するのを防ぐ。
- **Hydrationエラーの回避**: サーバーとクライアントでレンダリング結果が異なる（`Date.now()` をJSXで直接使う等）のを避け、ブラウザ依存の処理は `useEffect` 内で行う。

### 2.3. ナビゲーションとデータ更新

- **内部リンク**: 必ず `next/link` の `<Link>` を使用し、クライアントサイドルーティングを行う。
- **プログラム遷移**: `useRouter().push()` を使用する。
- **データ最新化**: Firestore書き込み後に同じページの表示を最新化したい場合は、`router.refresh()` を実行してサーバーコンポーネントを再読み込みさせる。

### 2.4. データ取得とシリアライズ (Firestore)

- Firestoreの `Timestamp` オブジェクトは、Client Component に直接渡せないため、必ずシリアライズ（数値化）する。
- `toPlainObject` ユーティリティを使用し、`createdAt` 等のフィールドを `toMillis()` でミリ秒数値に変換して渡すこと。

### 2.5. searchParams / params の扱い

- App Router の仕様に従い、`searchParams` および `params` は **Promise** として扱い、必ず `await` すること。

### 2.6. 環境変数

- クライアント側で必要な変数は `NEXT_PUBLIC_` プレフィックスを付ける。
- 秘密情報（APIキー等）はプレフィックスなしとし、サーバーサイドでのみ使用する。

### 2.7. 画像の最適化

- 画像は原則として `next/image` の `<Image>` を使用し、自動最適化を行う。
- LINEプロフィール画像などの外部URLでドメイン設定が困難な場合に限り、通常の `<img>` を使用する。

---

## 3. LINE / Firestore 連携規約

### 3.1. LINE Messaging API

- サーバーサイド (`src/lib/line.ts`) で実装し、`fetch` API を用いて通信を行う。
- メッセージ送信失敗時にアプリケーション全体の処理をブロックしないよう、適切なエラーハンドリング（ログ出力のみに留める等）を行う。

### 3.2. LINE ログイン

- APIルート (`/api/line/login`, `/api/line/callback`) を通じて実装する。
- 認証状態は `AuthContext` で管理し、`AuthGuard` コンポーネントでページアクセスを制御する。

### 3.3. Firestore データ構造

- コレクションの型定義は `src/lib/firestore/types.ts` に集約する。
- データの更新は `src/features/<feature>/api/*-client-service.ts` で行い、読み込みは Server Actions または直接 Server Component で行う。
- セキュリティのため、管理者権限 (`isAdmin`) のチェックを厳格に行う。

---

## 4. UI/UX 規約 (Professional Standard)

### 4.1. 一貫性のあるレイアウト

- 共通のレイアウトコンポーネントを使用し、画面遷移時の違和感を排除する。
  - `EditFormLayout`: 編集・新規登録画面
  - `ConfirmLayout`: 詳細・確認画面
  - `SearchableListLayout`: 検索機能付き一覧画面

### 4.2. インタラクションとフィードバック

- **アイコン必須**: 各画面のタイトル (`h1`) には、その機能を示す Font Awesome アイコンを必ず付与する。
- **プレースホルダー**: すべての入力項目に `placeholder` を設定し、入力例を提示する。
- **ダイアログ/トースト**: `alert()` は使用禁止。共通の `showDialog()` または `CommonModal` を使用する。
  - ダイアログはユーザーの明示的な操作（ボタン押下等）のタイミングで出す。
- **ローディング**: 長時間の処理には `showSpinner` / `hideSpinner` で視覚的フィードバックを行う。
- **パンくずリスト**: 各ページの `useEffect` 内で `setBreadcrumbs` を呼び出し、適切なナビゲーションを表示する。
- **未設定状態の案内**: データが存在しない場合は、単に空にするのではなく、状況を説明するメッセージやアクションを促す表示を行う。
- **繊細さん向けのテキスト配慮（ネガティブ表現の禁止）**: とげのある表現や、ネガティブ・批判的な印象を与える文言（例:「〜が少なすぎる」「失敗しました」「〜していない」）は避け、優しくソフト、かつ前向きまたはフラットな表現（例:「本来の負担額に合わせるため」「〜の調整」「〜を確認できませんでした」）を徹底する。

### 4.3. スタイル規約 (CSS Modules)

- **原則**: 各画面（`src/features/**/views/*` および `src/app/**/page.tsx`）のデザインは、必ず同階層の `*.module.css` に分離して管理する。
- **コンポーネントも同様**: `src/components/**` や `src/features/**/components/**` のUIも、可能な限り `*.module.css` を使用する。
- **禁止**: `style jsx`（styled-jsx）および `style={{ ... }}` の多用は禁止（例外は、どうしても動的に変える必要がある最小限のインライン値のみ）。
- **globals.css の役割**: `globals.css` はレイアウトの土台・共通トークン・共通クラス（`page-container`, `content-card` 等）に限定し、画面固有の装飾は置かない。

---

## 5. 開発プロセスと品質管理

### 5.1. TypeScript の厳格な運用

- `any` 型の使用を禁止する。Props、APIレスポンス、Firestoreドキュメントには必ず型を定義する。
- 型アサーション (`as AnyType`) は、外部ライブラリの型定義が不十分な場合などの例外を除き回避する。

### 5.2. 検証フロー

1. **ビルドチェック**: `npm run build` でエラーがないことを確認。
2. **モバイルファースト**: スマートフォンでの操作が主となるため、ブラウザの開発者ツールを用いてスマホサイズでのデザイン・操作性を常に確認する。

---

## 6. React / Next.js ベストプラクティス

### 6.1. Hooks の厳格な運用 (Rules of Hooks)

- **最上位での呼び出し**: 全ての Hooks (`useState`, `useEffect`, `useContext` 等) は、必ず関数コンポーネントの先頭で呼び出すこと。
- **条件分岐・ループ内禁止**: `if` 文や `for` 文、早期リターンの後に Hooks を配置してはならない。
- **カスタム Hooks**: 複数のコンポーネントで共有されるロジックや、複雑な副作用はカスタム Hooks (`use*`) として抽出し、可読性と再利用性を高める。

### 6.2. サーバー/クライアントの責務分離

- **Data Fetching**: データの取得は可能な限り Server Components で行い、Props として Client Components に渡す。
- **インタラクションの最小化**: `"use client"` を指定するコンポーネントは、イベントハンドラやブラウザ API を必要とする最小単位に留める。
- **モジュール境界**: サーバー専用のライブラリや秘密情報を含むコードには `import 'server-only'` を付与し、クライアントへの漏洩をビルド時に防ぐ。

### 6.3. パフォーマンスと UX

- **Image Optimization**: 画像には `next/image` の `<Image />` を使用し、`width`, `height`, `priority` (LCP要素の場合) を適切に設定する。
- **Prefetching**: 内部リンクには `next/link` を使用し、ページ遷移の高速化を図る。
- **Suspense / Loading**: データ取得中の UI 状態を `loading.tsx` または `<Suspense>` で明示的に管理し、Layout Shift を最小限に抑える。

### 6.4. クリーンコードと保守性

- **コンポーネントの分割**: 1つのファイルが長くなりすぎる（目安として 200行以上）場合は、責務ごとにコンポーネントを分割する。
- **絶対パスインポート**: インポートパスには `@/` エイリアスを使用し、階層の深さによらず一貫性を保つ。
- **早期リターン**: 複雑な条件分岐を避け、エラー状態や非表示状態は関数の冒頭で早期リターンする（ただし Hooks の呼び出し順序に注意）。
