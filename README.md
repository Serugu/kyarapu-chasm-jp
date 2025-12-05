# Kyarapu Chasm Neo-Copy (キャラプ キャズム ネオコピー)

日本版「キャラプ (kyarapu.com)」向けのキャラクター管理支援ツールです。
韓国版Crystallized ChasmのNeo-Copy機能を日本版に移植・最適化したユーザースクリプトです。

## ✨ 機能一覧

- **📋 JSONコピー**: キャラクターデータをJSON形式でクリップボードにコピー
- **📥 JSON貼り付け**: クリップボードのJSONデータを現在のキャラクターに上書き
- **📁 ファイル管理**:
  - **📤 エクスポート**: キャラクターデータをJSONファイルとして保存
  - **📥 インポート**: 保存したJSONファイルを読み込んで適用
- **🌐 再公開**: 公開設定（公開/リンク公開/非公開）をワンクリックで変更

## 🚀 インストール方法

1. ブラウザ拡張機能 **Tampermonkey** (または Violentmonkey) をインストールしてください。
   - [Chrome版](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox版](https://addons.mozilla.org/ja/firefox/addon/tampermonkey/)
   - [Edge版](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. 以下のリンクをクリックしてスクリプトをインストールしてください。
   
   👉 **[インストール (neocopy.user.js)](https://github.com/Serugu/kyarapu-chasm-jp/raw/main/neocopy.user.js)**

3. Tampermonkeyのインストール画面が開くので、「インストール」ボタンをクリックします。

## 📖 使い方

1. キャラプの **キャラクター編集画面** (`/builder?character=...`) を開きます。
2. 画面右下に表示される **「✦」ボタン** をクリックします。
3. メニューから使用したい機能を選択します。

### 🆕 新規キャラクター作成時の注意点 (v1.2.0以降)

新規作成画面 (`?type=create`) で貼り付け/インポートを行うと、データは**下書き保存**されます。
以下の手順で登録を完了させてください。

1. 「JSON貼り付け」または「インポート」を実行
2. 「下書き保存しました」というメッセージを確認
3. ページをリロード（F5）
4. 画面上部の **「登録」ボタン** を手動でクリックして公開/非公開を確定

※ 既存キャラクター (`?type=edit`) の場合は、従来通り貼り付けと同時に即時更新されます。

## ⚠️ 注意事項

- このスクリプトは非公式です。運営元とは一切関係ありません。
- APIの仕様変更により、予告なく機能しなくなる可能性があります。
- キャラクターの上書き機能は**元に戻せません**。重要なデータは必ずエクスポートしてバックアップを取ってから操作してください。
- **自己責任**でご利用ください。

## 📜 ライセンス

元のスクリプト (Crystallized Chasm) のライセンスに準拠します。
Original work by chasm-js & milkyway0308.
Ported to JP version by Serugu.
