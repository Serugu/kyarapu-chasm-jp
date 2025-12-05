# Kyarapu Chasm JP

日本版「キャラプ (kyarapu.com)」向けのユーザースクリプト集です。
韓国版Crystallized Chasmの各機能を日本版に移植・最適化しています。

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

---

## 🚀 インストール方法

1. ブラウザ拡張機能 **Tampermonkey** (または Violentmonkey) をインストールしてください。
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
