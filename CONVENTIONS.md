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

### 2.2. データ取得とシリアライズ (Firestore)

- Firestoreの `Timestamp` オブジェクトは、Client Component に直接渡せないため、必ずシリアライズ（数値化）する。
- `toPlainObject` ユーティリティを使用し、`createdAt` 等のフィールドを `toMillis()` でミリ秒数値に変換して渡すこと。

### 2.3. searchParams / params の扱い

- App Router の仕様に従い、`searchParams` および `params` は **Promise** として扱い、必ず `await` すること。

### 2.4. 環境変数

- クライアント側で必要な変数は `NEXT_PUBLIC_` プレフィックスを付ける。
- 秘密情報（APIキー等）はプレフィックスなしとし、サーバーサイドでのみ使用する。

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
- **ローディング**: 長時間の処理には `showSpinner` / `hideSpinner` で視覚的フィードバックを行う。

---

## 5. 開発プロセスと品質管理

### 5.1. TypeScript の厳格な運用

- `any` 型の使用を禁止する。Props、APIレスポンス、Firestoreドキュメントには必ず型を定義する。
- 型アサーション (`as AnyType`) は、外部ライブラリの型定義が不十分な場合などの例外を除き回避する。

### 5.2. 検証フロー

1. **ビルドチェック**: `npm run build` でエラーがないことを確認。
2. **動作確認**: `npm run dev` でローカル確認。
3. **データ保全**: 既存データの編集・削除テストは避け、新規作成 → 編集 → 削除のサイクルでテストデータを使用して確認する。

### 5.3. モバイルファースト

- スマートフォンでの操作が主となるため、ブラウザの開発者ツールを用いてスマホサイズでのデザイン・操作性を常に確認する。
