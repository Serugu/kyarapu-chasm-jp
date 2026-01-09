# Kyarapu Chasm JP

日本版[「キャラプ」]( https://kyarapu.com)向けのユーザースクリプト集です。
[韓国版Crystallized Chasm](https://github.com/milkyway0308/crystallized-chasm)の各機能を日本版に移植・最適化しています。

---

## 📦 スクリプト一覧

### 1. Neo-Copy (neocopy.user.js)
キャラクターデータの管理支援ツール

👉 **[インストール](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/neocopy.user.js)**

**機能:**
- **📋 JSONコピー**: キャラクターデータをJSON形式でクリップボードにコピー
- **📥 JSON貼り付け**: クリップボードのJSONデータを現在のキャラクターに上書き
- **📁 ファイル管理**:
  - **📤 エクスポート**: キャラクターデータをJSONファイルとして保存
  - **📥 インポート**: 保存したJSONファイルを読み込んで適用
- **🌐 再公開**: 公開設定（公開/リンク公開/非公開）をワンクリックで変更

### 2. Crystallized Counter (counter.user.js)
チャットのターン数（AIの応答回数）をカウントして表示

👉 **[インストール](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/counter.user.js)**

**機能:**
- ⏱️ チャット画面上部にターン数を表示
- 💾 カウントはIndexedDBに保存（ページをリロードしても維持）
- 🔄 リアルタイムでカウント更新

### 3. Kyarapu Chasm Burner (burner.user.js)
AIを使用してチャットの履歴を要約し、キャラクターの記憶として保存・圧縮するツール（通称: バーナー）

👉 **[インストール](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/burner.user.js)**

**機能:**
- 🔥 チャット履歴をAI（Gemini / OpenRouter）で要約
- 📝 要約内容を編集してキャラクターのメモリに送信
- 🎭 userのペルソナ（プロフィール）を簡単に切り替え・編集

### 4. Kyarapu Crystallized DreamDiary (dreamdiary.user.js)
ユーザーノートを保存・管理するツール

👉 **[インストール](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/dreamdiary.user.js)**

**機能:**
- 📔 **ノート保存**: キャラクターごとに複数のユーザーノートを保存
- 🌍 **共通ノート**: 全キャラクターで共通して使用できるノートを作成可能
- 📥 **自動読み込み**: 選択したノートの内容をテキストエリアに一瞬で反映

### 5. Kyarapu AlarmClock (alarm-clock.user.js)
毎日の出席通知と即時出席ボタンを追加

👉 **[インストール](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/alarm-clock.user.js)**

**機能:**
- ⏰ **出席通知**: ログインボーナスが受け取り可能な時に通知を表示
- ⚡ **即時出席**: 画面遷移なしでその場ですぐに出席チェックを完了

---

## 🚀 インストール方法

1. ブラウザ拡張機能 **Tampermonkey** をインストールしてください。
   - [Chrome版](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox版](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)
   - [Edge版](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. 上記の各スクリプトの「インストール」リンクをクリック

3. Tampermonkeyのインストール画面で「インストール」ボタンをクリック

---

## 📖 使い方

### Neo-Copy
1. キャラプの **キャラクター編集画面** (`/builder?character=...`) を開く
2. 画面右下の **「✦」ボタン** をクリック
3. メニューから機能を選択

#### 🆕 新規キャラクター作成時の注意点
新規作成画面 (`?type=create`) で貼り付け/インポートを行うと、データは**下書き保存**されます。
1. 「JSON貼り付け」または「インポート」を実行
2. 「下書き保存しました」というメッセージを確認
3. ページをリロード（F5）
4. 画面上部の **「登録」ボタン** をクリックして公開/非公開を確定

### Crystallized Counter
- チャット画面を開くと、自動的に画面上部中央にカウンターが表示されます
- ターン数はAIの応答回数をカウントします（ユーザーの発言は含まない）

### Kyarapu Chasm Burner
- キャラクターのチャット画面サイドバーに「🔥 キャズムバーナー」ボタンが追加されます
- クリックすると設定・実行画面が開きます
- **APIキーの設定**: Google Gemini API または OpenRouter APIキーが必要です
- **ペルソナ切替**: サイドバーからuserプロフィールの切り替えや編集が可能です

### DreamDiary
- チャット画面の入力欄、またはサイドバーの「ユーザーノート」モーダル内にUIが表示されます
- **保存**: 「カスタム」を選択中にノート名を入力して「保存」をクリック。全キャラ共通にするか選択できます。
- **読み込み**: ドロップダウンから保存済みノートを選択すると、自動的に入力欄へ反映されます。
- **削除**: 不要になったノートを選択して「削除」をクリックしてください。

### AlarmClock
- ログインボーナスが受け取り可能な時間帯（通常 06:00 ～ 23:59）になると、画面右下に出席を促す通知が表示されます。
- **今すぐ出席する**: クリックすると即座にAPI経由で出席チェックを完了し、ボーナス（ゴールド等）を受け取ります。
- すでに出席済みの場合は表示されません。

---

## ⚠️ 注意事項

- このスクリプトは非公式です。運営元とは一切関係ありません。
- APIの仕様変更により、予告なく機能しなくなる可能性があります。
- キャラクターの上書き機能は**元に戻せません**。重要なデータは必ずバックアップを取ってください。
- **自己責任**でご利用ください。

---

## 📜 ライセンス

元のスクリプト (Crystallized Chasm) のライセンスに準拠します。
Original work by chasm-js & milkyway0308.
Ported to JP version by Serugu.
