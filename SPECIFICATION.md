# CANDY (カップル向けライフマネジメントPWA) システム仕様書

本ドキュメントは、Next.js (App Router), TypeScript, Firebase (Firestore / Storage / Auth), LINE API (Login & Messaging API), および Google Apps Script (GAS) を用いて構築されたカップル専用ライフマネジメントWebアプリケーション「**CANDY**」の包括的な全体設計書・システム仕様書である。

---

## 1. システム全体概要

### 1.1. システム目的 & サービスコンセプト
- **サービスコンセプト**: 二人の日常を甘く、心地よく、ストレスフリーに整えるカップル専用ライフマネジメントPWA。
- **解決する課題**:
  - 予定のすれ違いやリマインド漏れによるトラブルの解消。
  - 家計・デート代のワリカンや毎月の予算管理における不公平感・計算手間の撤廃。
  - ゴミ出しの当番忘れや日用品の買い足し忘れの防止。
  - 毎日の体調や気分、二人の思い出（写真・記念日・やりたいこと）の自然な共有。
- **基本原則**:
  - **二者間共有と個人領域の両立**: 各データ（予定、TODO、ウィッシュリスト等）は「自分のみ」と「2人で共有」を柔軟に切り替え可能。
  - **完全無料枠での永続運用**: Firestoreの読み取り回数を極小化し、無料プラン（Sparkプラン & LINE公式アカウント無料枠 月200通）の範囲内で安定運用する最適化設計。
  - **繊細さん向けテキスト配慮**: とげのある表現やネガティブ・批判的な印象を与える文言（「〜が少なすぎる」「失敗」「〜していない」）を排除し、安心感と温かみのある表現（「〜の調整」「〜の確認」「ゆったり配信中🍀」）を徹底。

### 1.2. 主要技術スタック
- **フロントエンド / サーバー**: Next.js 16 (App Router, Turbopack), React 19, TypeScript (Strict)
- **スタイリング**: CSS Modules (`*.module.css`), Font Awesome 6 (アイコン)
- **BaaS / データベース**: Firebase SDK (Web v11) / Cloud Firestore, Firebase Storage, Firebase Authentication
- **認証**: LINE Login API v2.1 + Firebase Custom Token (PWAクロスブラウザ同期対応)
- **サーバーサイド連携**: Firebase Admin SDK (Node.js)
- **外部API連携**: LINE Messaging API (プッシュ通知), Open-Meteo API (天気予報)
- **バックグラウンド実行**: Google Apps Script (GAS) — 5分刻みトリガーによる定時通知・イベントリマインダー監視
- **ホスティング**: Vercel

### 1.3. ブランディング & テーマカラー・UI/UX設計思想
- **基調カラーコード**:
  - プライマリ: `#10b981` (Emerald / 安心感と爽やかさ)
  - セカンダリ: `#f43f5e` (Rose / 温かみと愛情)
  - アクセント: `#f59e0b` (Amber / 太陽・記念日), `#8b5cf6` (Purple / リマインダー), `#06c755` (LINE Green)
  - 背景色: `#f8fafc` (Slate 50), カード背景: `#ffffff`
- **モバイルファースト設計**:
  - スマートフォンでの片手操作に最適化されたボトムアクションバー、タッチターゲット、レスポンシブグリッド。
  - 入力フォームのセレクトボックスや日付・時刻ピッカーはネイティブUIとの親和性を担保。
- **入力要素のデザイン統一**:
  - 背景透過を防ぐため、全フォーム入力要素 (`input`, `textarea`, `select`) は白背景 (`#ffffff`)、角丸 (`8px`〜`12px`)、境界線 (`1.5px solid #e2e8f0`) で統一。
  - 予定や通知の時間指定は `<input type="time" step="300">` により5分刻みに統一。
- **前の画面に戻る導線 (`BackToHome`)**:
  - 画面最下部には一貫した「ホームへ戻る」ボタンコンポーネントを配置し、迷わないナビゲーションを維持。

### 1.4. 認証・ログイン・初期セットアップフロー
1. **LINEログイン (`/login` → `/api/line/login`)**:
   - LINE公式ログインチャネルへの認可リクエストを発行。
   - 外部ブラウザとPWA（ホーム画面追加アプリ）間の認証乖離を解決するため、`pwaAuthSessions` コレクションを介して一時認証セッションを安全に同期。
2. **コールバック (`/callback` → `/api/line/callback`)**:
   - LINEアクセストークンおよびユーザープロファイルを取得。
   - サーバーサイド (Firebase Admin SDK) で Firebase Custom Token を発行し、クライアント側で `signInWithCustomToken` を実行。
3. **利用規約同意 (`/agreement`)**:
   - 初回ログインユーザーに対し、規約への同意画面を表示 (`agreedAt` タイムスタンプを保存)。
4. **プロフィール必須項目入力ガード (`AuthGuard` & `/user/edit`)**:
   - ニックネーム、PayPay ID、居住地（都道府県・市区町村）、MBTI、誕生日、連絡先、アレルギー、好き嫌いなどの必須情報が未入力の場合、自動的にプロフィール編集画面 (`/user/edit`) へ誘導。

### 1.5. 共通レイアウト & UIコンポーネント
- **`AuthGuard`**: 未認証ユーザーを `/login` へリダイレクトし、プロフィール未設定ユーザーを `/user/edit` へ促すルート保護コンポーネント。
- **`BaseLayout`**: 上部ヘッダー（ハンバーガーメニュー、ユーザー切替、クイックナビ）と通知ドロワーを備えた基本レイアウト。
- **`Header`**: ブランドロゴ、クイックリンク（カレンダー、TODO、ウィッシュリスト、アルバム、記念日、家計簿、ワリカン、ごみ、物件、買い足し、設定等）へのアクセスを提供。
- **`CommonModal` / `showDialog`**: ネイティブ `alert()` を排し、アニメーション付きの共通モーダルダイアログでユーザーにフィードバック。
- **`BackToHome`**: 画面下部の中央に配置される共通ホーム復帰ボタン。

### 1.6. ホーム画面 (`/`, `/home`)
- **ウェルカム & 二人のステータスカード**:
  - 本日の日付、曜日、現在時刻（デジタル/アナログ切替可能）。
  - Open-Meteo API による居住地の当日天気（最高・最低気温、降水確率、アイコン）。
- **体調・気分・ひとこと（DailyStatus）**:
  - 自分とパートナーの今日の気分（1〜5段階の星）、体調（1〜5段階のハート）、ひとことコメント。
  - パートナーのひとことに対して絵文字リアクションを即時付与可能。
- **本日の予定・TODO・記念日**:
  - 今日発生しているスケジュールおよびTODOをアジェンダ形式で一覧表示。
  - 近づいている記念日（○日前、当日、○日経過）をバッジ表示。
- **今日の一枚（Daily Photo）**:
  - アルバム内の写真から、日付ハッシュにより決定論的に選ばれた思い出の1枚を表示。

---

## 2. 権限・セキュリティ・データアクセス制御 (RBAC & Shared Model)

### 2.1. カップル二者間データモデル（自分のみ / 二人で共有）
- **完全2者限定アーキテクチャ**:
  - CANDYは登録ユーザー数が最大2名（カップル本人同士）に限定されたプライベート環境。
  - `firestore.rules` の `canRegister()` により、ユーザー数が2名に達した時点で外部からの新規ユーザー登録を厳格に拒否。
- **データ所有権と共有判定**:
  - `type: "personal" | "couple"`:
    - `"couple"`: パートナーと完全に共有され、双方の画面に表示・編集可能。
    - `"personal"`: 作成者本人のみに表示（相手側には一覧や通知で現れない）。
  - リレーション判定ユーティリティ（`checkEventRelation`, `checkTodoRelation`）により、本人データか共有データかを一元管理。

### 2.2. Cloud Firestore セキュリティルール (`firestore.rules`)
- **認証必須原則 (`isSignedIn()`)**:
  - ほぼ全てのコレクションはログイン済みユーザー（カップルのいずれか）のみ読み取り・書き込みを許可。
- **個人所有データの保護 (`isOwner(uid)`)**:
  - `users/{uid}`, `notificationSettings/{uid}`, `propertyPreferences/{uid}`, `lineMessagingIds/{uid}` は本人のみ更新可能。
- **パートナーによる特定フィールド更新の安全な許可**:
  - `daily_statuses`: パートナーからのコメント (`partnerComment`) やリアクション (`commentReactions`, `partnerCommentReactions`) に限り、相手のドキュメントに対しても部分更新を許可。
- **システム・管理者保護**:
  - `lineMessagingIds`: 書き込みは Admin SDK のみ (`allow write: if false;`)。
  - `lineNotificationLogs`: 読み取りはログイン済みカップルのみ (`allow read: if isSignedIn();`)、書き込みはGAS/Admin SDK専用 (`allow write: if false;`)。

---

## 3. 実装済み機能仕様

### 3.1. 体調・気分・ひとこと共有 (`/home`, `dailyStatus`)
- **目的**: 離れていてもお互いの健康状態や心のコンディションを自然に把握し合う。
- **記録項目**:
  - 気分スコア (1〜5): 落ち込み 〜 最高
  - 体調スコア (1〜5): 不調 〜 快調
  - ひとことメッセージ: 今日の出来事や気持ち
- **インタラクション**:
  - パートナーのひとことに対して絵文字リアクション（👍, ❤️, 🥺, 🎉 等）をタップで即時送信。
  - LINE通知設定がONの場合、ひとこと投稿時にパートナーのLINEへ通知メッセージが自動送信。

### 3.2. カレンダー・予定・スケジュール管理 (`/`, `src/features/calendar/`)
- **目的**: 二人のデート、旅行、記念日、および個人の予定を一つのカレンダーで把握。
- **表示月限定フェッチ＆オンデマンドキャッシュ（パフォーマンス最適化）**:
  - ホーム画面初期表示時は全件ではなく今月分（カレンダーグリッドに必要な前後月含む）に限定して取得（`getEventsByMonth`）。
  - Firestore からの取得データ量・シリアライズ処理・グリッド展開計算コストを削減し、スピナー消去後の表示を大幅に高速化。
  - カレンダーの月切り替え時は未取得月のみオンデマンドで非同期取得し、メモリキャッシュ（`loadedMonthsRef`）に保存・マージすることで快適なページ操作を実現。
  - `CalendarView` の `useMemo` において、グリッドモード時はタイムライン計算をスキップ、タイムラインモード時はグリッド計算をスキップするモード別計算分離を実施。
- **時間単位の厳格な5分刻み設計**:
  - 開始・終了時刻は `<input type="time" step="300">` により5分単位に制限。
  - 端数によるリマインダー判定のすり抜けを防止し、バックグラウンド監視の負荷（5分おき）と完全同期。
- **終日イベントと時刻指定イベント**:
  - `isAllDay: boolean`: 終日予定は時刻を持たず、リマインダー通知の対象外。
  - 日跨ぎ判定 (`startDate <= targetDate && endDate >= targetDate`) により、複数日にまたがる旅行なども正確に帯表示。
- **多彩なビュー表示**:
  - **月間グリッドカレンダー**: 月全体の予定と記念日、ごみ収集日を俯瞰。
  - **タイムラインビュー**: 時間軸に沿って予定を表示（リスト形式 / カラム形式の切替対応）。
  - **デイリーアジェンダ**: 日付をタップした際、その日の予定・TODO・記念日をモーダルで集中確認。

### 3.3. やることリスト・タスク管理 (`/todo`, `src/features/todo/`)
- **目的**: 買い出し、役所手続き、旅行の準備など、二人のタスクを漏れなく管理。
- **機能特徴**:
  - グループ分類（買い物、家事、手続き等）。
  - 期限設定（「期日 (due)」または「当日やる (on)」のモード切替）。
  - ステップ（子タスク）機能: 一つのTODOを複数ステップに分解して進捗チェック。
  - 完了・未完了のワンタップ切り替えとアーカイブ表示。

### 3.4. やりたいことリスト・ウィッシュリスト (`/wishlist`, `src/features/wishlist/`)
- **目的**: 行きたい場所、食べたいもの、欲しいもの、挑戦したいことを記録・共有。
- **機能特徴**:
  - 季節タグ (`spring`, `summer`, `autumn`, `winter`): 季節に合わせた行きたい場所をフィルタリング。
  - 緊急度・優先度 (★1〜★5): いつか行きたい〜すぐにやりたいを視覚化。
  - 達成フラグ (`isAchieved`): 叶えたウィッシュリストを達成済みとして思い出化。

### 3.5. アルバム & 思い出写真管理 (`/albums`, `/albums/[id]`, `src/features/album/`)
- **目的**: 二人の旅行や日常の写真を整理し、いつでも振り返れるデジタルアルバム。
- **機能特徴**:
  - アルバム単位の作成（タイトル、訪問地域：都道府県・市区町村、期間：単日/期間）。
  - Firebase Storage への高画質写真アップロードとメタデータ保存。
  - お気に入り機能 (`favoriteUids`): お互いがお気に入りに登録した写真を瞬時に抽出。
  - 「今日の一枚（Daily Photo）」対象フラグ: 朝のLINE通知やホーム画面にランダム表示する候補アルバムとして設定可能。

### 3.6. 記念日・カウントダウン管理 (`/anniversaries`, `src/features/anniversaries/`)
- **目的**: 付き合った日、プロポーズ記念日、誕生日、入籍日などの大切な節目を祝う。
- **機能特徴**:
  - 日付設定 (`MM-DD`): 毎年巡ってくる記念日を自動計算。
  - カウントダウン・経過日数表示: 「あと○日！」「付き合ってから○○日目」をリアルタイム表示。
  - 朝の定時LINE通知において、記念日当日および前日に自動リマインド。

### 3.7. 二人の家計簿・予算管理 (`/budget`, `src/features/budget/`)
- **目的**: 同棲生活・新婚生活における毎月の固定費・変動費・収入の計画と実績を透明化。
- **データ構造の3層化**:
  1. `defaultBudgets`: 毎月の基本となるデフォルト予算マスタ（家賃、光熱費、食費等の標準額）。
  2. `monthlyBudgets`: 特定の年月（YYYY-MM）に調整した月別予算。
  3. `actualBudgets`: 実際に発生した日々の支出・収入実績。
- **負担割合 (`splitRatio`) の個別設定**:
  - 項目ごとに「自分○% : 相手○%」の負担割合を設定可能（デフォルト50:50）。
  - 各自の負担すべき金額と実際の支払い額から、月末の差額精算を自動算出。
- **送金エビデンス添付 & 楽天銀行 振込履歴の分割送金対応**:
  - 支出実績にレシートや明細の写真・PDFを添付して記録可能。
  - 月間精算時の送金エビデンスとして「楽天銀行の振込履歴・振込完了スクリーンショット」を登録。
  - 送金の分割払いに対応し、1回目（N円）、2回目（M円）…と回数・金額・メモ・スクショ画像をセットで複数登録・管理可能。
  - 目標精算額に対する送金済み合計額および残額をリアルタイム表示し、残額クイック入力や個別履歴削除をサポート。

### 3.8. ワリカン精算・立替計算 (`/settlement`, `/settlement/[id]`, `src/features/settlement/`)
- **目的**: 旅行やイベント、大きな買い物の立替払いをスムーズかつスマートに精算。
- **機能特徴**:
  - イベント単位の管理（例:「北海道旅行」「家具家電購入」）。
  - 明細登録（支払者、金額、日付、領収書画像）。
  - **希望ワリカン比率連動**:
    - 均等割り (50:50)、自分の希望比率、相手の希望比率をワンタップで切り替え。
    - 「AさんがBさんに○○円送金」という最終清算額を自動算出。
  - PayPayリンク・IDコピー機能による迅速な送金導線。
  - 送金完了証明書（スクリーンショット）のアップロードと完了ステータス化。

### 3.9. 暮らし機能・ごみ収集カレンダー (`/garbage`, `src/features/garbage/`)
- **目的**: 地域やマンションごとに複雑なゴミ出しルールを完全にシステム化し、出し忘れをゼロに。
- **柔軟な収集周期ルール**:
  - 毎週指定曜日（例: 毎週火・金）。
  - 隔週指定曜日（基準日からの2週間隔判定）。
  - 第N曜日（例: 第2・第4水曜日）。
  - 収集月指定（毎月、偶数月のみ、奇数月のみ、指定月のみ）。
- **ビジュアル & 分別ガイド**:
  - ごみ種別ごとのカラーコードと Font Awesome アイコン。
  - 分別方法・出し方の注意点テキストおよび分別表写真（複数枚対応）。
- **LINE通知連携**:
  - 夜の定時通知で「明日のごみ出し」、朝の定時通知で「今日のごみ出し」を自動配信。

### 3.10. 買い足しリマインド機能 (`/stock`, `src/features/stock/`)
- **目的**: トイレットペーパー、洗剤、調味料などの生活消耗品のストック切れを未然に防止。
- **周期予測アルゴリズム**:
  - カテゴリ分類（日用品、キッチン、バス・洗面等）。
  - 前回購入日 (`lastPurchasedDate`) と使い切りサイクル日数 (`cycleDays`) を登録。
  - 次回購入目安日を自動算出し、「そろそろ買い足し時期です（○日前）」をLINE通知で事前にお知らせ。
  - 買い物完了時に「今日購入した」ボタンを押すことで、次回サイクルが自動更新。

### 3.11. 理想の物件・引越し条件管理 (`/ideal-property`, `src/features/ideal-property/`)
- **目的**: 二人が将来住みたい街や間取り、譲れないこだわり条件をすり合わせる。
- **詳細スコアリング機能**:
  - 賃料（上限・下限・共益費込）、間取り、建物種別、構造、駅徒歩、専有面積、築年数、方位。
  - 設備カテゴリ別こだわり度設定（冷暖房、収納、セキュリティ、建物設備、キッチン、バス・トイレ等）。
  - パートナーの希望条件と並べて比較し、一致点と妥協点を可視化。

### 3.12. 投資・資産シミュレーション (`/investment`, `src/features/investment/`)
- **目的**: 二人の将来の資産形成（つみたてNISA、インデックス投資、老後資金）を可視化。
- **複利シミュレーションロジック**:
  - 想定年利 (%)、開始年齢・年、終了年齢・年を設定。
  - 年齢ごとの年間投資額テーブル（ライフステージに応じた増減）を入力。
  - 複利運用計算による将来の資産推移グラフと元本・運用益の内訳を即座にシミュレーション。

### 3.13. 二人のメモ帳・共有メモ (`/memo`, `/memo/[id]`, `/memo/new`, `/memo/edit/[id]`, `src/features/memo/`)
- **目的**: Wi-Fiパスワード、家電の型番、合鍵の場所、料理レシピなどの永続的な共有メモ。
- **機能特徴**:
  - Markdown形式対応のテキストエディタ。
  - パートナー編集許可フラグ (`partnerEditable`): 共同編集または閲覧専用の切り替え。
  - リアルタイム検索・フィルタリング。

### 3.14. ユーザープロファイル・パートナー設定 (`/user/edit`, `src/features/user/`)
- **目的**: プロフィール情報の管理、パートナーとの相互理解、緊急連絡先の確保。
- **登録項目**:
  - 基本情報: ニックネーム、表示名、PayPay ID、居住地（都道府県・市区町村）、誕生日、MBTI。
  - ヘルスケア: アレルギー、服用中の薬、既往歴、緊急連絡先電話番号。
  - ライフスタイル: 好きな食べ物・苦手な食べ物、嬉しいこと・嫌なこと、得意なこと・苦手なこと、好きな場所・苦手な場所。
  - アプリ環境設定: 時計テーマ（デジタル/アナログ、デザインテーマ）、希望ワリカン率 (0〜100%)、カレンダー初期ビュー。

### 3.15. 通知設定 & LINE Messaging API 連携 (`/settings`, `src/features/settings/`)
- **目的**: 個人ごとの通知受信希望時間や通知項目の柔軟なカスタマイズ。
- **設定項目**:
  - **朝の定時通知**: 有効/無効、配信時刻 (`05:00`〜`11:55`, 5分刻み)。
  - **夜のお休み通知**: 有効/無効、配信時刻 (`19:00`〜`23:55`, 5分刻み)。
  - **イベント直前リマインダー**: 有効/無効、何分前通知（0分前=開始時刻、5分前、10分前、15分前、30分前、60分前などを複数選択可能）。
  - **ひとこと通知**: パートナーのひとこと投稿通知、リアクション通知の受信可否。

### 3.16. LINE送信履歴 & 配信枠管理 (`/settings/line-logs`, `src/features/line-logs/`)
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

---

## 4. バックグラウンドバッチ・外部API連携アーキテクチャ

### 4.1. LINE公式アカウント2系統分離運用設計
日常の定時通知で重要な予定リマインダーが埋もれてしまうのを防ぐため、LINEトークルームを物理的に2つに分離。
1. **定期通知用公式アカウント (Channel A)**:
   - 朝の定時通知（天気、予定、TODO、記念日、買い足し、今日の一枚）。
   - 夜のお休み通知（明日の予定、明日のごみ出し、明日のTODO）。
   - 体調・ひとこと共有通知。
2. **イベント通知用公式アカウント (Channel B)**:
   - 予定開始N分前（0〜60分前、5分刻み）の直前リマインダー専用。
   - トーク一覧で個別に通知ON/OFFやピン留めが可能。

### 4.2. Google Apps Script (GAS) 定期通知バッチ (`gas/lineNotifications.js`)
- **実行トリガー**: 時間主導型トリガーにより**5分おき**に `checkAllNotifications` を自動実行。
- **処理シーケンス**:
  1. Firestoreから通知設定および当日・翌日の予定・ごみ・買い足しデータを取得。
  2. 現在時刻とユーザーごとの設定時刻を照合。
  3. 送信対象メッセージを組み立て（Flex Message または テキスト + 画像）。
  4. LINE Messaging API (Push Message) を呼び出して送信。
  5. 送信実績を `lineNotificationLogs` コレクションへ書き込み。

### 4.3. 「今日の一枚（Daily Photo）」決定論的選定アルゴリズム
- **課題**: 二人がそれぞれ異なる起床時間（例: 彼氏7:00、彼女8:00）に朝の通知を受け取っても、同じ日の思い出写真は同一である必要がある。
- **解決策**:
  - 当日の日付文字列（`YYYY-MM-DD`）からDJB2ハッシュアルゴリズムを用いて一意の整数シード値を生成。
  - アルバム内の対象写真リスト長で剰余計算を行い、インデックスを決定。
  - 実行時刻や受信者に関わらず、**同一日であれば常に同一の写真**が確実に選定・添付される。

### 4.4. 居住地連動型 Open-Meteo 天気予報 API 連携
- **仕組み**:
  - ユーザープロファイルの都道府県コード・市区町村コードから、マスタに保持された緯度・経度を特定。
  - Open-Meteo API を呼び出し、当日JST基準の天気コード (WMO)、最高気温、最低気温、降水確率 (POP) を取得。
  - 朝の通知メッセージおよびホーム画面に天気アイコン付きで整形表示。

### 4.5. Firestore従量課金爆発防止・無料枠最適化設計 (Read Explosion Prevention)
Firestoreの読み取り回数を完全無料枠（50,000回/日）の数％以内に抑えるための3大設計原則：
1. **日付範囲クエリの徹底**:
   - `getDocuments('events')` などの全件スキャンを完全禁止。
   - 必ず `where("startDate", "<=", tomorrow)` かつ `where("endDate", ">=", today)` による範囲限定クエリのみ実行。
2. **GASスクリプトキャッシュ (`CacheService`) の活用**:
   - `users`, `notificationSettings`, `garbageSchedules` などの頻繁に変わらないマスタデータは、GASの `CacheService.getScriptCache()` に15分〜1時間キャッシュ。
3. **5分刻み統一によるトリガー間隔の最適化**:
   - 予定・通知時刻をすべて「5分刻み」に統一したことで、GASのトリガー間隔を1分から5分へ緩和。
   - 実行回数・通信回数を **1/5（1日1,440回 → 288回）** に激減させ、GASの90分/日実行時間制限エラーも完全回避。

### 4.6. GASタイマージッター（遅延ゆらぎ）対策 & 二重送信防止設計
- **ジッター対策**:
  - Googleの仕様上、GASの時間主導型トリガーは最大30〜50秒程度の起動遅延が発生する。
  - `currentTime === targetTime` のピンポイント一致判定は行わず、`lastCheckTime < targetTime && targetTime <= currentTime` の「区間（時間の幅）」判定を採用してすり抜けを防止。
- **二重送信防止フラグ**:
  - 送信成功時、GASスクリプトプロパティに `LAST_SENT_MORNING_${uid}` 等のキーで送信日（`YYYY-MM-DD`）を記録。
  - 同一日に複数回バッチが起動しても、同日内の二重送信を物理的にブロック。

---

## 5. データモデル (Cloud Firestore) - コレクション定義マトリクス

| コレクション名 | ドキュメントID | 主なフィールド | 読み取り権限 | 書き込み/更新権限 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` | `displayName`, `nickname`, `pictureUrl`, `paypayId`, `mbti`, `birthday`, `phone`, `emergencyContact`, `allergies`, `favoriteFoods`, `dislikedFoods`, `prefectureCode`, `municipalityCode`, `splitRatio`, `clockTheme`, `clockType` | ログイン済みカップル | 本人のみ (`isOwner`) |
| `events` | 自動採番 | `title`, `isAllDay`, `startDate`, `startTime`, `endDate`, `endTime`, `note`, `link`, `type` (personal/couple), `uid` | ログイン済みカップル | ログイン済みカップル |
| `daily_statuses` | 自動採番 | `uid`, `date`, `mood` (1-5), `health` (1-5), `comment`, `partnerComment`, `commentReactions`, `partnerCommentReactions` | ログイン済みカップル | 本人 / パートナー一部更新 |
| `todos` | 自動採番 | `title`, `note`, `date`, `dateMode` (due/on), `steps` (TodoStep[]), `isCompleted`, `type` (personal/couple), `groupId`, `uid` | ログイン済みカップル | ログイン済みカップル |
| `wishlist` | 自動採番 | `title`, `note`, `isAchieved`, `urgency` (1-5), `season` (spring-winter), `type`, `groupId`, `uid` | ログイン済みカップル | 作成者本人のみ |
| `groups` | 自動採番 | `name`, `type` (todo/wishlist/anniversary), `uid` | ログイン済みカップル | 作成者本人のみ |
| `anniversaries` | 自動採番 | `title`, `date` (MM-DD), `note`, `uid` | ログイン済みカップル | 作成者本人のみ |
| `albums` | 自動採番 | `name`, `prefectureCode`, `municipalityCode`, `dateMode`, `startDate`, `endDate`, `showOnHome`, `includeInDailyPhoto`, `uid` | ログイン済みカップル | 作成者本人のみ |
| `photos` | 自動採番 | `albumId`, `url`, `takenAt`, `latitude`, `longitude`, `favoriteUids` (uid[]), `uid` | ログイン済みカップル | 本人 / お気に入り更新 |
| `prefectures` | コード | `code`, `name` | ログイン済みカップル | 管理者のみ |
| `municipalities` | コード | `code`, `name`, `prefCode` | ログイン済みカップル | 管理者のみ |
| `investments` | `uid` | `annualRate`, `startAge`, `startYear`, `endAge`, `endYear`, `investments` ({ [age]: amount }), `uid` | ログイン済みカップル | 作成者本人のみ |
| `propertyPreferences` | `uid` | `rentMin`, `rentMax`, `roomLayouts`, `buildingTypes`, `stationWalkMin`, 設備こだわりスコア群 (1-3) | ログイン済みカップル | 本人のみ (`isOwner`) |
| `notificationSettings` | `uid` | `morningEnabled`, `morningTime`, `nightEnabled`, `nightTime`, `eventReminderEnabled`, `eventReminderMinutes` (number[]), `dailyStatusEnabled` | ログイン済みカップル | 本人のみ (`isOwner`) |
| `settlementEvents` | 自動採番 | `name`, `isSettled`, `settlementMode`, `settledRatio`, `proofUrl`, `uid` | ログイン済みカップル | ログイン済みカップル |
| `settlementItems` | 自動採番 | `eventId`, `title`, `amount`, `type` (expense/income), `payerUid`, `date`, `time`, `receiptUrl`, `uid` | ログイン済みカップル | 作成者本人のみ |
| `defaultBudgets` | 自動採番 | `coupleKey`, `uid`, `category` (fixed/variable/income), `type`, `name`, `amount`, `splitRatio` | ログイン済みカップル | ログイン済みカップル |
| `monthlyBudgets` | 自動採番 | `coupleKey`, `uid`, `year`, `month`, `category`, `type`, `name`, `amount`, `splitRatio` | ログイン済みカップル | ログイン済みカップル |
| `actualBudgets` | 自動採番 | `coupleKey`, `uid`, `year`, `month`, `date`, `category`, `type`, `name`, `amount`, `splitRatio`, `proofUrl` | ログイン済みカップル | ログイン済みカップル |
| `budgetSettlementProofs`| 自動採番 | `coupleKey`, `year`, `month`, `payments` (BudgetSettlementPayment[]), `proofUrl`, `uploadedUid` | ログイン済みカップル | ログイン済みカップル |
| `memos` | 自動採番 | `coupleKey`, `title`, `content`, `partnerEditable`, `uid` | ログイン済みカップル | 本人 / 編集許可時パートナー |
| `garbageSchedules` | 自動採番 | `name`, `color`, `icon`, `monthType`, `weekType`, `nthWeeks`, `daysOfWeek`, `note`, `imageUrls`, `uid` | ログイン済みカップル | ログイン済みカップル |
| `replenishmentCategories`| 自動採番 | `name`, `order`, `uid` | ログイン済みカップル | ログイン済みカップル |
| `replenishments` | 自動採番 | `name`, `categoryId`, `lastPurchasedDate`, `cycleDays`, `reminderDaysBefore`, `notifyEnabled`, `note`, `uid` | ログイン済みカップル | ログイン済みカップル |
| `lineNotificationLogs` | 自動採番 | `accountType`, `accountName`, `notificationTitle`, `recipientUid`, `recipientName`, `messages`, `messageCount`, `summary`, `status`, `sentAt`, `yearMonth` | ログイン済みカップル (`isSignedIn()`) | GAS/Admin専用 (`false`) |
| `lineMessagingIds` | `uid` | `lineMessagingId`, `updatedAt` | 本人のみ (`isOwner`) | Admin SDK専用 (`false`) |
| `pwaAuthSessions` | 自動採番 | `token`, `uid`, `createdAt` | 作成後15分以内のみ | Admin SDK専用 (`false`) |

---

## 6. 再構築（ゼロからの再現）環境構築ガイド (Rebuild Guide)

### 6.1. Firebase プロジェクト設定
1. **Firestore Database**:
   - ロケーション: `asia-northeast1` (Tokyo) 推奨。
   - `firestore.rules` をデプロイ。
2. **Firebase Storage**:
   - 写真・レシート・証明画像アップロード用バケットを作成。
   - ルール: 認証済みユーザーのみ読み書き許可。
3. **サービスアカウントの作成**:
   - Google Cloud Console IAM からサービスアカウントを作成。
   - 役割: `Cloud Datastore ユーザー` (または Firebase Admin)。
   - 秘密鍵 JSON を発行（GAS設定に使用）。

### 6.2. LINE Developers チャネル設定
1. **LINE ログイン チャネル**:
   - チャネルタイプ: LINEログイン
   - コールバックURL: `https://<DOMAIN>/api/line/callback`
   - スコープ: `profile`, `openid`
2. **LINE Messaging API チャネル（2つ作成）**:
   - ① **定期通知用公式アカウント**: 朝・夜の定時通知用（長期 Channel Access Token を発行）。
   - ② **イベント通知用公式アカウント**: 予定直前リマインダー用（長期 Channel Access Token を発行）。

### 6.3. Google Apps Script（GAS）設定手順
1. **新規GASプロジェクト作成**:
   - コードファイルに `gas/lineNotifications.js` の内容を配置。
2. **ライブラリ追加**:
   - `FirestoreApp` (スクリプトID: `1VUSl4b1r1eoNcRWotZM3e87ygkxvXltOgyDZhixqncz9lQ3MjfT1iKFw`)
3. **スクリプトプロパティの設定**:
   - `FIRESTORE_EMAIL`: サービスアカウントのクライアントメール
   - `FIRESTORE_KEY`: サービスアカウントの秘密鍵 (`-----BEGIN PRIVATE KEY...`)
   - `FIRESTORE_PROJECT_ID`: FirebaseプロジェクトID
   - `LINE_PERIODIC_ACCESS_TOKEN`: 定期通知用チャネルアクセストークン
   - `LINE_EVENT_ACCESS_TOKEN`: イベント通知用チャネルアクセストークン
4. **トリガー作成**:
   - 実行関数: `checkAllNotifications`
   - イベントのソース: 時間主導型
   - タイマーのタイプ: 分ベースのタイマー
   - 時間の間隔: **5分おき**

### 6.4. Vercel 環境変数一覧
| 変数名 | 説明 | 例 / 形式 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key | `AIzaSy...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `candy-xxxx.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | `candy-xxxx` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | `candy-xxxx.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | `1:123456789012:web:xxxx` |
| `LINE_CHANNEL_ID` | LINEログイン チャネルID | `200xxxxxxx` |
| `LINE_CHANNEL_SECRET` | LINEログイン チャネルシークレット | `xxxxxxxxxxxxxxxxxxxxxxxx` |
| `NEXT_PUBLIC_APP_URL` | 本番WebアプリURL | `https://candy-life.vercel.app` |
| `LINE_CHANNEL_ACCESS_TOKEN` | サーバーサイド送信フォールバック用 | `Bearer xxxxx...` |

---

## 7. 規約とドキュメント管理ルール

1. **仕様書の継続的改変原則**:
   - コードや機能の改修・変更を行った際は、必ず修正の都度 `AGENTS.md` および本 `SPECIFICATION.md` を改変・最新化し、実装とドキュメントの乖離を絶対に生じさせないこと。
2. **自動ビルド検証原則**:
   - コード修正後は、必ず自動的に `npm run build` を実行してビルドエラーがないことを確認してから完了報告を行うこと。
