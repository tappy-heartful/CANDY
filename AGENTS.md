<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

すべて日本語で回答してください

# Agent Behavior Rules
1. **実装プランの承認プロセス省略**: Implementation Planを作成した後、ユーザーの明示的な承認を待つ必要はありません。プランを提示（または作成）したら、そのまま連続してタスクの実行（コードの修正等）に進んでください。
2. **モバイル表示の考慮**: スマートフォンでの表示崩れを防ぐため、フィルターバッジやボタン等のUI要素が画面幅で見切れたり不自然に折り返したりしないように常に設計に配慮してください。必要に応じて要素を別行にするか、スクロール可能なコンテナに格納するなど、モバイルファーストでの実装を徹底してください。
3. **ブラウザでのレイアウト・動作確認の禁止**: レイアウト確認や動作確認はユーザー自身が行うため、ブラウザ（`browser_subagent` や `navigate`、ブラウザ操作ツール全般）による画面遷移や確認作業は一切行わないでください。AIがログインで手間取って時間がかかるのを防ぐため、検証は `npm run build` によるビルドチェックのみにとどめ、迅速にコード修正と報告を行ってください。
4. **新機能追加時の Firestore セキュリティルール更新**: 新機能の実装や新しいコレクションの作成・拡張を行った際は、必ず忘れずに `firestore.rules` に対応するセキュリティルール（読み取り・書き込み権限の定義）を追加・更新すること。
5. **修正時の仕様書（設計書）自動更新**: コードや機能の改修・変更を行った際は、必ず修正の都度 `AGENTS.md`（特にセクション8の詳細設計・仕様部分等）を改変・最新化し、実装とドキュメントの乖離を絶対に生じさせないこと。

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

### 3.3. Firestore データ構造＆セキュリティルール

- コレクションの型定義は `src/lib/firestore/types.ts` に集約する。
- データの更新は `src/features/<feature>/api/*-client-service.ts` で行い、読み込みは Server Actions または直接 Server Component で行う。
- **セキュリティルールの同期必須**: 新しいコレクションを追加した際やスキーマ・新機能を実装した際は、必ず `firestore.rules` に適切なアクセス権限（`allow read`, `allow write`）を漏れなく記述・更新すること。
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
2. **モバイルファースト**: スマートフォンでの操作が主となるため、スマホサイズでのデザイン・操作性を常に優先する。

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

---

## 7. AIアシスタント（Gemini）への厳格な指示

- **自動ビルド検証**: ユーザーの指示に基づいてコードを修正した後は、必ず自動的に `npm run build` を実行してビルドエラーがないか確認してください。もしエラーが発生した場合は、ユーザーに報告する前に**必ず自らエラーを解消し、再度ビルドが通ることを確認**してから完了報告を行うこと。
- **仕様書の継続的改変**: コードの変更・機能改修・仕様変更を行った際は、必ず修正の都度 `AGENTS.md`（特にセクション8の詳細設計・仕様部分等）を改変・最新化し、実装とドキュメントの乖離を絶対に生じさせないこと。

---

## 8. CANDY プロジェクト詳細設計・機能別実装ノウハウ (Architecture & Implementation)

本セクションは、本プロジェクトをゼロから完全に再現・再構築できるように、採用されている設計思想、機能ごとのロジック、および工夫を網羅的に記録する。

### 8.1. プロジェクト概要とデータモデルの二者間設計
- **サービスコンセプト**: カップル向けプライベートライフマネジメントPWA。
- **データ分離と共有モデル**:
  - 各データ（予定、TODO、ウィッシュリスト等）には `type: "personal" | "couple"` および `uid: string`（作成者）を持つ。
  - `type === "couple"`: パートナーと共有。
  - `type === "personal"`: 作成者本人のみに表示。
  - リレーション判定関数（`checkEventRelation`, `checkTodoRelation`）により、本人とパートナーの権限および表示ラベル（【自分】【2人】）を一元判定する。

### 8.2. 各機能の設計と技術的工夫

#### ① カレンダー・スケジュール管理 (`src/features/calendar/`)
- **表示月（今月）限定フェッチ＆オンデマンドキャッシュアーキテクチャ（初期ロード高速化）**:
  - ホーム画面初期ロード時、`getEvents()` による過去〜未来の全件取得を撤廃し、表示月（およびカレンダー42セルグリッド描画に必要な前後月）に限定して取得する `getEventsByMonth(year, month)`（`startDate` 範囲クエリ）を採用。
  - Firestore からの通信データ量、シリアライズ処理、およびカレンダー42セルのイベント走査・計算コストを激減させ、スピナー非表示直後の画面表示速度を大幅に向上。
  - カレンダーの月切り替え時、未ロードの月のみをオンデマンドで非同期フェッチしてメモリキャッシュ（`loadedMonthsRef`）で追跡・ID重複排除マージすることで、快適な操作感と通信量の最小化を両立。
- **レンダリング計算のモード別最適化**:
  - `CalendarView` において、`calendarMode === "grid"` 時はタイムラインの全日計算をスキップし、`calendarMode === "timeline"` 時はグリッド週別計算をスキップするよう `useMemo` を最適化し、初期マウント時のCPU負荷を低減。
- **時間単位の厳格な5分刻み設計**:
  - イベントの開始・終了時刻は `<input type="time" step="300">` によりブラウザ標準ピッカーを5分単位に制限。
  - 端数によるリマインダー判定のズレを防止し、バックグラウンドの監視負荷を最小限（5分おき）に抑える。
- **終日イベントと時刻指定イベント**:
  - `isAllDay: boolean` で分岐。終日イベントはリマインダー通知の対象外。
- **日跨ぎ判定**:
  - `startDate <= targetDate && endDate >= targetDate` で判定し、連日イベントを正確に描画。
- **ビュー切り替え**:
  - グリッド表示（月間カレンダー）、タイムライン表示（時間軸リスト/カラム）、デイリーアジェンダ（1日の詳細モーダル）を完備。

#### ② LINE通知・バックグラウンド連携 (`gas/lineNotifications.js`)
- **公式アカウントの2系統分離運用**:
  - **定期通知用アカウント**: 朝の定時メッセージ（天気・予定・TODO・記念日・今日の一枚）および夜のお休み通知（明日の予定・明日のゴミ出し・明日のTODO）。
  - **イベント通知用アカウント**: 予定開始N分前（0〜60分前、5分刻み）のリマインダー専用。日常の定時通知でリマインダーが埋もれないようにLINEトークルームを物理的に分離。
- **「今日の一枚（Daily Photo）」の決定論的選定アルゴリズム**:
  - 日付文字列（`YYYY-MM-DD`）からDJB2ライクなハッシュ値を生成し、アルバム写真一覧からインデックスを決定。
  - 2人がそれぞれ別の時間（例: 朝7時と朝8時）に通知を受け取っても、**必ず同日であれば同じ思い出写真が届く**ように設計。
- **居住地ベースの天気連携**:
  - ユーザープロファイルの都道府県・市区町村から Open-Meteo API を用いて緯度経度を取得し、当日の天気予報（最高・最低気温、降水確率、天気アイコン）を自動取得・キャッシュ。

#### ③ 家計簿・ワリカン精算 (`src/features/settlement/`, `src/features/budget/`)
- **希望ワリカン比率 (`splitRatio`)**:
  - ユーザーごとに 0〜100% の希望負担比率を保持（デフォルト50:50）。
  - 「相手が多く払った」「自分が多く払った」の差額から、現在どちらがいくら精算すべきかをリアルタイム自動計算。
- **支払い区分**:
  - 立替払い、共通財布からの支出、個人支出を切り替え可能。
- **楽天銀行 振込履歴エビデンス & 分割送金対応**:
  - 家計簿の月次精算における送金エビデンスとして「楽天銀行の振込履歴・振込完了スクリーンショット」を登録。
  - 送金の分割払いに対応し、1回目（N円）、2回目（M円）…と回数・金額・メモ・スクショをセットで複数登録可能。
  - 目標精算額に対する送金済み合計額および残り送金必要額をリアルタイム表示し、残額クイック入力や個別履歴削除を完備。

#### ④ 体調・気分・ひとこと共有 (`src/features/home/`)
- **DailyStatus**:
  - 毎日の気分（1〜5）、体調（1〜5）、ひとことコメントを記録。
  - パートナーのコメントに対して絵文字リアクションを即時反映。

#### ⑤ ごみ出しスケジュール (`src/features/garbage/`)
- **定期収集ルールの柔軟な定義**:
  - 毎週特定の曜日、隔週、第N曜日（例: 第2・第4水曜日）に対応。
  - 夜の通知で「明日のごみ」、朝の通知で「今日のごみ」を自動リマインド。出し方や分別表の写真URLも添付可能。

#### ⑥ 理想の住まい・引越し条件管理 (`src/features/ideal-property/`)
- **カテゴリ別の重要度スコアリング**:
  - キッチン、冷暖房、建物設備、周辺環境などの各項目に優先度（★1〜★3）を設定。パートナーとの希望条件の擦り合わせを可視化。

#### ⑦ LINE送信履歴・配信枠管理 (`src/features/line-logs/`)
- **認証ガード仕様（カップルユーザー専用）**:
  - `src/app/settings/line-logs/` は `AuthGuard` で保護され、ログイン済みカップルユーザーのみ閲覧可能。
  - Firestoreセキュリティルールも `match /lineNotificationLogs/{id}` に対して `allow read: if isSignedIn();` を適用（書き込みはGAS/Adminのみ）。
  - 宛先フィルターにより、「自分あて」「パートナーあて」に素早く絞り込みが可能。
- **送信数（配信実績）の可視化**:
  - 無料プラン上限（月200通/アカウント）に対し、メイン表示は「残り回数」ではなく「**今月の送信回数**」（送った回数 / 200通）を表示。
  - プログレスバーと残り枠を併記し、ステータス表現は繊細さん配慮ルールに則り前向き・安心感のある言葉（「ゆったり配信中🍀」「順調に配信中💡」「たくさん配信中✨」）を採用。
- **LINEトーク再現プレビューとURL自動リンク**:
  - 送信ログ詳細モーダルでLINEトークルームをリアルに再現（テキスト・添付画像）。
  - メッセージ本文内の `http://` / `https://` から始まるURLを自動検出し、クリック・タップして別タブで安全に開ける外部リンクとしてレンダリング。
- **送信日別の見出しグループ化表示**:
  - 送信履歴一覧を送信日（`date` / `sentAt`）ごとにグルーピングし、「○月○日 (曜日)」「【本日】」「【昨日】」といった見出しヘッダーを設置。
  - 各日付グループ内に該当日の送信件数バッジ（例: `3件送信`）を表示し、カード内の時刻表示（HH:mm）と合わせて何日にどのメッセージが送信されたかを一目で把握できるようにUIを最適化。

---

## 9. Firestore＆GAS 最適化アーキテクチャ (Performance & Cost Saving)

Firestoreの従量課金爆発（月間1,000万回以上の読み取り）を防ぎ、完全無料枠内で安全に運用するための必須設計指針。

### 9.1. 読み取り爆発（Read Explosion）を防ぐ3大原則
1. **全件取得（`getDocuments`）のポーリング禁止**:
   - 定期バッチやリマインダー内で `getDocuments('events')` などの無制限フェッチを絶対に行わない。
   - 必ず `startDate >= today && startDate <= tomorrow` のように **クエリで日付範囲を限定** して取得する。
2. **マスタデータのキャッシュ化（GAS CacheService / メモリキャッシュ）**:
   - `users`, `lineMessagingIds`, `notificationSettings` などの設定データは、毎分・毎回の実行で再取得せず、`CacheService.getScriptCache()` 等で15分〜1時間キャッシュする。
3. **時間単位の統一によるトリガー間隔の緩和**:
   - アプリ側の予定時間・通知時間・リマインダー時間を「5分刻み」に統一することで、GASのタイマーを **「1分おき」から「5分おき」に変更**。
   - これにより、実行回数と読み取り回数を **1/5（1日1,440回 → 288回）** に削減し、GASの1日90分実行制限エラーも完全に回避する。

### 9.2. GASのタイマー遅延（ジッター）対策設計
- **Googleの仕様**: GASの時間主導型トリガーは、Googleのインフラ仕様により約30〜50秒の起動遅延（ゆらぎ）が必ず発生する。
- **「時間の幅（区間）」によるスキャン**:
  - `currentTime === "08:00"` のようなピンポイント一致判定は、起動が `08:00:45` にずれた場合にすり抜けてしまうため禁止。
  - 必ず `lastCheck < targetTime && targetTime <= now` のように「前回実行時刻〜今回実行時刻」の区間に含まれるかを判定する。
- **二重送信防止フラグ**:
  - 朝・夜の通知など1日1回だけ送信すべきものは、送信完了時に `LAST_MORNING_SENT_${uid}` 等のスクリプトプロパティに今日の日付文字列を保存し、同日中の再実行をスキップする。

---

## 10. 再構築（ゼロからの再現）環境構築ガイド (Rebuild Guide)

本プロジェクトを別環境で再構築する際の手順と必要な設定項目一覧。

### 10.1. Firebase プロジェクト設定
1. **Firestore Database**:
   - データベース作成（ロケーション: `asia-northeast1` (Tokyo) 推奨）。
   - コレクション構成:
     - `users`: ユーザープロファイル
     - `events`: 予定・スケジュール
     - `todos`: やることリスト
     - `wishlist`: やりたいことリスト
     - `anniversaries`: 記念日
     - `albums`: アルバム情報
     - `photos`: 写真メタデータ（Storage URL含む）
     - `dailyStatus`: 毎日の体調・気分
     - `garbageSchedules`: ごみ収集ルール
     - `notificationSettings`: 各ユーザーのLINE通知設定
     - `lineMessagingIds`: uidとLINE Messaging API UIDの紐付け
     - `pwaAuthSessions`: PWA/外部ブラウザ間のログインセッション連携
2. **Firebase Storage**:
   - 写真アップロード用バケットを作成。
3. **サービスアカウントの作成**:
   - IAMからサービスアカウントを作成し、JSONキーを発行（GASからFirestoreへの接続に使用）。

### 10.2. LINE Developers 設定
1. **LINE ログイン チャネル**:
   - Webアプリ用のチャネルを作成。
   - コールバックURL: `https://<DOMAIN>/api/line/callback`
2. **LINE Messaging API チャネル（2つ作成推奨）**:
   - ① **定期通知用公式アカウント**（Channel Access Token を発行）
   - ② **イベントリマインダー用公式アカウント**（Channel Access Token を発行）

### 10.3. Google Apps Script（GAS）設定
1. **ライブラリ追加**:
   - `FirestoreApp`（ID: `1VUSl4b1r1eoNcRWotZM3e87ygkxvXltOgyDZhixqncz9lQ3MjfT1iKFw`）
2. **スクリプトプロパティ**:
   - `FIRESTORE_EMAIL`: サービスアカウントのクライアントメール
   - `FIRESTORE_KEY`: サービスアカウントの秘密鍵（`-----BEGIN PRIVATE KEY...`）
   - `FIRESTORE_PROJECT_ID`: FirebaseプロジェクトID
   - `LINE_PERIODIC_ACCESS_TOKEN`: 定期通知用チャネルアクセストークン
   - `LINE_EVENT_ACCESS_TOKEN`: イベント通知用チャネルアクセストークン
3. **トリガー設定**:
   - 実行する関数: `checkAllNotifications`
   - イベントのソース: 時間主導型
   - タイマーのタイプ: 分ベースのタイマー
   - 時間の間隔: **5分おき**

### 10.4. Vercel 環境変数一覧
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `LINE_CHANNEL_ID`: LINEログインのチャネルID
- `LINE_CHANNEL_SECRET`: LINEログインのチャネルシークレット
- `NEXT_PUBLIC_APP_URL`: 本番URL（例: `https://candy-life.vercel.app`）
- `LINE_CHANNEL_ACCESS_TOKEN`: サーバーサイド送信時のフォールバックトークン
