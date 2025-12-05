// ==UserScript==
// @name        Kyarapu Chasm Neo-Copy (キャラプ キャズム ネオコピー)
// @namespace   https://github.com/chasm-js
// @version     KYARAPU-NCPY-v1.0.8
// @description キャラプのキャラクター複製/貼り付け/再公開/エクスポート/インポート機能を提供します。韓国版Crystallized Chasmの日本版移植です。
// @author      chasm-js, milkyway0308, Serugu
// @match       https://kyarapu.com/builder*
// @match       https://kyarapu.com/my-character*
// @downloadURL https://github.com/Serugu/kyarapu-chasm-jp/raw/main/neocopy.user.js
// @updateURL   https://github.com/Serugu/kyarapu-chasm-jp/raw/main/neocopy.user.js
// @grant       GM_addStyle
// ==/UserScript==

const VERSION = "KYARAPU-NCPY-v1.0.8";

GM_addStyle(`
    #chasm-neocopy-menu {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .chasm-neocopy-btn {
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .chasm-neocopy-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .chasm-neocopy-btn.primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    .chasm-neocopy-btn.secondary {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
    }
    .chasm-neocopy-btn.warning {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
    }
    .chasm-neocopy-btn.info {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
    }
    .chasm-neocopy-dropdown {
        position: relative;
        display: inline-block;
    }
    .chasm-neocopy-dropdown-content {
        display: none;
        position: absolute;
        bottom: calc(100% + 4px);
        right: 0;
        background-color: white;
        min-width: 160px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        border-radius: 8px;
        overflow: hidden;
        z-index: 10002;
    }
    .chasm-neocopy-dropdown-content.show {
        display: block;
    }
    .chasm-neocopy-dropdown-item {
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        font-size: 14px;
    }
    .chasm-neocopy-dropdown-item:hover {
        background-color: #f0f0f0;
    }
    .chasm-neocopy-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        cursor: pointer;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10001;
        transition: transform 0.3s ease;
    }
    .chasm-neocopy-toggle:hover {
        transform: scale(1.1);
    }
    .chasm-neocopy-toggle.active {
        transform: rotate(45deg);
    }
`);

!(function () {
    "use strict";

    const API_BASE_URL = "https://api.kyarapu.com";

    // =====================================================
    //                      ユーティリティ
    // =====================================================
    function log(message) {
        console.log(
            "%cKyarapu Chasm Neo-Copy: %cInfo: %c" + message,
            "color: #667eea;",
            "color: blue;",
            "color: inherit;"
        );
    }

    function logWarning(message) {
        console.log(
            "%cKyarapu Chasm Neo-Copy: %cWarning: %c" + message,
            "color: #667eea;",
            "color: yellow;",
            "color: inherit;"
        );
    }

    function logError(message) {
        console.log(
            "%cKyarapu Chasm Neo-Copy: %cError: %c" + message,
            "color: #667eea;",
            "color: red;",
            "color: inherit;"
        );
    }

    /**
     * クッキーから値を取得
     */
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    /**
     * アクセストークンを取得
     */
    function getAccessToken() {
        return getCookie("access_token");
    }

    /**
     * __NEXT_DATA__からキャラクターデータを取得
     */
    function getNextData() {
        const nextDataScript = document.getElementById("__NEXT_DATA__");
        if (!nextDataScript) return null;
        try {
            return JSON.parse(nextDataScript.textContent);
        } catch (e) {
            logError("__NEXT_DATA__の解析に失敗しました");
            return null;
        }
    }

    /**
     * URLからキャラクターIDを抽出
     */
    function getCharacterIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('character');
    }

    /**
     * 現在のページがビルダー（編集）ページかどうか
     */
    function isBuilderPage() {
        return window.location.pathname.includes('/builder');
    }

    /**
     * 新規キャラクター作成モードかどうか
     * URLの type=create パラメータで判定
     */
    function isNewCharacter() {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        return type === 'create';
    }

    /**
     * Neo-Copy機能が利用可能なページかどうか
     * - ビルダーページでキャラクターIDがある場合
     */
    function isNeoCopyAvailable() {
        const characterId = getCharacterIdFromUrl();
        const isBuilder = isBuilderPage();
        log(`ページ判定: isBuilder=${isBuilder}, characterId=${characterId}`);
        return isBuilder && characterId;
    }

    /**
     * 認証付きfetchリクエスト
     */
    async function authFetch(method, url, body = null) {
        const token = getAccessToken();
        if (!token) {
            throw new Error("認証トークンが見つかりません。ログインしてください。");
        }

        // wrtn-idを取得（cookieから）
        const wrtnId = getCookie("__w_id") || "";
        const mixpanelId = getCookie("Mixpanel-Distinct-Id") || "";

        const options = {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "platform": "web",
                "wrtn-locale": "ja-JP",
                "x-wrtn-id": wrtnId,
                "mixpanel-distinct-id": mixpanelId,
            },
            credentials: 'include'
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        log(`API呼び出し: ${method} ${url}`);
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // 204 No Contentの場合はnullを返す
        if (response.status === 204) {
            log("API成功 (204 No Content)");
            return { success: true };
        }

        const text = await response.text();
        if (!text) {
            return { success: true };
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            return { success: true, raw: text };
        }
    }

    // =====================================================
    //                  キャラクターデータ操作
    // =====================================================

    /**
     * __NEXT_DATA__からキャラクターデータを取得
     */
    function getCharacterDataFromPage() {
        const nextData = getNextData();
        if (!nextData) {
            log("__NEXT_DATA__が見つかりません");
            return null;
        }

        log("__NEXT_DATA__を解析中...");
        console.log("pageProps keys:", Object.keys(nextData.props?.pageProps || {}));

        // initialSavedDataを最優先で確認（編集ページで最も信頼できる）
        if (nextData.props?.pageProps?.initialSavedData) {
            const data = nextData.props.pageProps.initialSavedData;
            log(`initialSavedDataから取得: ${data.name || '名前不明'}`);
            console.log("Character data structure:", Object.keys(data));
            return data;
        }

        // fallbackからキャラクターデータを探す
        const fallback = nextData.props?.pageProps?.fallback;
        if (fallback) {
            console.log("fallback keys:", Object.keys(fallback));
            
            // /characters/me/{id} キーを探す
            for (const key of Object.keys(fallback)) {
                if (key.startsWith('/characters/me/')) {
                    const data = fallback[key];
                    log(`fallback[${key}]から取得: ${data?.name || '名前不明'}`);
                    console.log("Character data structure:", Object.keys(data || {}));
                    // dataがラップされている場合（{data: {...}}形式）
                    if (data && data.data && typeof data.data === 'object') {
                        return data.data;
                    }
                    return data;
                }
            }
        }

        log("キャラクターデータが見つかりませんでした");
        return null;
    }

    /**
     * APIからキャラクターデータを取得
     */
    async function fetchCharacterData(characterId) {
        try {
            const url = `${API_BASE_URL}/kyarapu/characters/me/${characterId}`;
            log(`APIからデータ取得中: ${url}`);
            const response = await authFetch('GET', url);
            console.log("API response structure:", Object.keys(response || {}));
            
            // レスポンスがラップされている場合
            if (response && response.data && typeof response.data === 'object' && response.data.name) {
                return response.data;
            }
            return response;
        } catch (error) {
            logError(`キャラクターデータの取得に失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * キャラクターデータを更新（貼り付け用）
     * APIが期待する形式に変換して送信
     * 新規キャラ（type=create）の場合はPOST、既存キャラ（type=edit）の場合はPATCH
     */
    async function updateCharacterData(characterId, data) {
        try {
            const isNew = isNewCharacter();
            log(`更新データを準備中... (${isNew ? '新規作成モード' : '編集モード'})`);

            // APIが期待する形式に変換
            const updateData = {
                name: data.name || "",
                description: data.description || "",
                characterDetails: data.characterDetails || "",
                customPrompt: data.customPrompt || "",
                visibility: data.visibility || "private",
                tags: data.tags || [],
                chatExamples: data.chatExamples || [],
                situationImages: data.situationImages || [],
                startingSets: data.startingSets || [],
                keywordBook: data.keywordBook || [],
                isCommentBlocked: data.isCommentBlocked || false,
            };

            // categories → categoryIds (オブジェクト配列 → ID配列)
            if (data.categories && Array.isArray(data.categories)) {
                updateData.categoryIds = data.categories.map(cat => cat._id);
            } else if (data.categoryIds) {
                updateData.categoryIds = data.categoryIds;
            } else {
                updateData.categoryIds = [];
            }

            // profileImage → profileImageUrl (オブジェクト → URL文字列)
            if (data.profileImage && data.profileImage.origin) {
                updateData.profileImageUrl = data.profileImage.origin;
            } else if (data.profileImageUrl) {
                updateData.profileImageUrl = data.profileImageUrl;
            }

            // promptTemplate → 文字列に変換
            if (data.promptTemplate && typeof data.promptTemplate === 'object') {
                updateData.promptTemplate = data.promptTemplate.template || "custom";
            } else if (data.promptTemplate) {
                updateData.promptTemplate = data.promptTemplate;
            } else {
                updateData.promptTemplate = "custom";
            }

            // startingSetsから_idを削除（新規作成されるため）
            if (updateData.startingSets && Array.isArray(updateData.startingSets)) {
                updateData.startingSets = updateData.startingSets.map(set => {
                    const newSet = { ...set };
                    delete newSet._id;
                    return newSet;
                });
            }

            // situationImagesの処理（blurImageUrl等を削除）
            if (updateData.situationImages && Array.isArray(updateData.situationImages)) {
                updateData.situationImages = updateData.situationImages.map(img => ({
                    situation: img.situation || "",
                    keyword: img.keyword || "",
                    imageUrl: img.imageUrl || "",
                    isBlind: img.isBlind || false,
                    blurSigma: img.blurSigma || 70
                }));
            }

            console.log("送信するデータ:", updateData);
            console.log("更新するフィールド:", Object.keys(updateData));

            let url, method, response;

            if (isNew) {
                // 新規キャラクターの場合: POST /kyarapu/characters
                url = `${API_BASE_URL}/kyarapu/characters`;
                method = 'POST';
                log(`新規キャラ作成: POST ${url}`);
                response = await authFetch(method, url, updateData);
                
                // POSTのレスポンスは { data: {...}, status: "success" } 形式
                if (response && response.data) {
                    log(`新規キャラ作成成功: ${response.data.name} (ID: ${response.data._id})`);
                }
            } else {
                // 既存キャラクターの場合: PATCH /kyarapu/characters/{id}
                url = `${API_BASE_URL}/kyarapu/characters/${characterId}`;
                method = 'PATCH';
                log(`既存キャラ更新: PATCH ${url}`);
                response = await authFetch(method, url, updateData);
            }

            return response;
        } catch (error) {
            logError(`キャラクターデータの更新に失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 公開設定を変更
     */
    async function updateVisibility(characterId, visibility) {
        try {
            const url = `${API_BASE_URL}/kyarapu/characters/${characterId}`;
            const response = await authFetch('PATCH', url, { visibility: visibility });
            return response;
        } catch (error) {
            logError(`公開設定の変更に失敗: ${error.message}`);
            throw error;
        }
    }

    // =====================================================
    //                      主要機能
    // =====================================================

    /**
     * JSONをクリップボードにコピー
     */
    async function copyToClipboard() {
        const characterId = getCharacterIdFromUrl();
        if (!characterId) {
            alert("キャラクターIDが見つかりません。編集ページで実行してください。");
            return;
        }

        try {
            // まずページからデータを取得試行
            let characterData = getCharacterDataFromPage();

            // ページから取得できなければAPIから取得
            if (!characterData) {
                characterData = await fetchCharacterData(characterId);
            }

            if (!characterData) {
                alert("キャラクターデータの取得に失敗しました。");
                return;
            }

            const jsonString = JSON.stringify(characterData, null, 2);
            await navigator.clipboard.writeText(jsonString);
            alert(`✅ キャラクターデータをクリップボードにコピーしました。\n\nキャラクター名: ${characterData.name}\nデータサイズ: ${jsonString.length}文字`);
            log(`キャラクターデータをコピーしました: ${characterData.name}`);
        } catch (error) {
            alert(`❌ コピーに失敗しました: ${error.message}`);
            logError(error.message);
        }
    }

    /**
     * クリップボードからJSONを貼り付け
     */
    async function pasteFromClipboard() {
        const characterId = getCharacterIdFromUrl();
        if (!characterId) {
            alert("キャラクターIDが見つかりません。編集ページで実行してください。");
            return;
        }

        log(`貼り付け開始 - キャラクターID: ${characterId}`);

        let clipboardText;
        try {
            clipboardText = await navigator.clipboard.readText();
            log(`クリップボードから読み取り成功: ${clipboardText.length}文字`);
            console.log("クリップボード内容（先頭500文字）:", clipboardText.substring(0, 500));
        } catch (e) {
            logError(`クリップボード読み取りエラー: ${e.message}`);
            alert(`❌ クリップボードの読み取りに失敗しました。\n\nエラー: ${e.message}\n\nブラウザの権限設定を確認してください。`);
            return;
        }

        if (!clipboardText || clipboardText.trim() === '') {
            alert("❌ クリップボードが空です。先にJSONコピーを実行してください。");
            return;
        }

        let pasteData;
        try {
            pasteData = JSON.parse(clipboardText);
            log("JSONパース成功");
            console.log("パースしたデータのキー:", Object.keys(pasteData));
        } catch (e) {
            logError(`JSONパースエラー: ${e.message}`);
            console.log("パース失敗したテキスト:", clipboardText.substring(0, 200));
            alert(`❌ クリップボードのデータがJSON形式ではありません。\n\nエラー: ${e.message}\n\nコンソールログを確認してください。`);
            return;
        }

        // エクスポートファイルかどうか確認
        if (pasteData.version && pasteData.exported && pasteData.prompt) {
            pasteData = pasteData.prompt;
        }

        if (!pasteData.name) {
            alert("❌ 有効なキャラクターデータではありません。");
            return;
        }

        const confirmMessage = `以下のデータを現在のキャラクターに上書きしますか？\n\n` +
            `貼り付けるキャラクター名: ${pasteData.name}\n\n` +
            `⚠️ この操作は元に戻せません。`;

        if (!confirm(confirmMessage)) {
            return;
        }

        if (!confirm("最終確認: 本当に上書きしますか？")) {
            return;
        }

        try {
            const isNew = isNewCharacter();
            const result = await updateCharacterData(characterId, pasteData);
            
            if (isNew) {
                alert("✅ キャラクターデータを新規作成しました。\nページを更新して変更を確認してください。");
            } else {
                alert("✅ キャラクターデータを貼り付けました。\nページを更新して変更を確認してください。");
            }

            if (confirm("ページを更新しますか？")) {
                window.location.reload();
            }
        } catch (error) {
            alert(`❌ 貼り付けに失敗しました: ${error.message}`);
            logError(error.message);
            console.error(error);
        }
    }

    /**
     * ファイルにエクスポート
     */
    async function exportToFile() {
        const characterId = getCharacterIdFromUrl();
        if (!characterId) {
            alert("キャラクターIDが見つかりません。編集ページで実行してください。");
            return;
        }

        try {
            let characterData = getCharacterDataFromPage();
            if (!characterData) {
                characterData = await fetchCharacterData(characterId);
            }

            if (!characterData) {
                alert("キャラクターデータの取得に失敗しました。");
                return;
            }

            const exportData = {
                version: VERSION,
                exported: new Date().toISOString(),
                type: "character",
                prompt: characterData
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `kyarapu_${characterData.name.replace(/[^a-zA-Z0-9ぁ-んァ-ン一-龯]/g, '_')}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert(`✅ エクスポートが完了しました。\n\nキャラクター名: ${characterData.name}`);
            log(`ファイルにエクスポートしました: ${characterData.name}`);
        } catch (error) {
            alert(`❌ エクスポートに失敗しました: ${error.message}`);
            logError(error.message);
        }
    }

    /**
     * ファイルからインポート
     */
    async function importFromFile() {
        const characterId = getCharacterIdFromUrl();
        if (!characterId) {
            alert("キャラクターIDが見つかりません。編集ページで実行してください。");
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    let characterData;
                    if (data.version && data.prompt) {
                        // エクスポートファイル形式
                        characterData = data.prompt;
                    } else if (data.name) {
                        // 直接のキャラクターデータ
                        characterData = data;
                    } else {
                        alert("❌ 無効なファイル形式です。");
                        return;
                    }

                    const confirmMessage = `以下のファイルをインポートしますか？\n\n` +
                        `キャラクター名: ${characterData.name}\n` +
                        (data.version ? `バージョン: ${data.version}\n` : '') +
                        (data.exported ? `エクスポート日時: ${new Date(data.exported).toLocaleString()}\n` : '') +
                        `\n⚠️ この操作は元に戻せません。`;

                    if (!confirm(confirmMessage)) {
                        return;
                    }

                    if (!confirm("最終確認: 本当にインポートしますか？")) {
                        return;
                    }

                    const isNew = isNewCharacter();
                    await updateCharacterData(characterId, characterData);
                    
                    if (isNew) {
                        alert("✅ インポート＆新規作成が完了しました。\nページを更新して変更を確認してください。");
                    } else {
                        alert("✅ インポートが完了しました。\nページを更新して変更を確認してください。");
                    }

                    if (confirm("ページを更新しますか？")) {
                        window.location.reload();
                    }
                } catch (error) {
                    alert(`❌ インポートに失敗しました: ${error.message}`);
                    logError(error.message);
                }
            };

            reader.onerror = () => {
                alert("❌ ファイルの読み込みに失敗しました。");
            };

            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * 再公開（公開設定変更）
     */
    async function republish(visibility) {
        const characterId = getCharacterIdFromUrl();
        if (!characterId) {
            alert("キャラクターIDが見つかりません。編集ページで実行してください。");
            return;
        }

        const visibilityNames = {
            'public': '公開',
            'private': '非公開',
            'linkonly': 'リンク公開'
        };

        if (!confirm(`公開設定を「${visibilityNames[visibility]}」に変更しますか？`)) {
            return;
        }

        try {
            await updateVisibility(characterId, visibility);
            alert(`✅ 公開設定を「${visibilityNames[visibility]}」に変更しました。`);
            log(`公開設定を変更しました: ${visibility}`);
        } catch (error) {
            alert(`❌ 公開設定の変更に失敗しました: ${error.message}`);
            logError(error.message);
        }
    }

    // =====================================================
    //                      UI作成
    // =====================================================

    function createUI() {
        // 既存のUIがあれば削除
        const existingMenu = document.getElementById('chasm-neocopy-menu');
        if (existingMenu) existingMenu.remove();
        const existingToggle = document.getElementById('chasm-neocopy-toggle');
        if (existingToggle) existingToggle.remove();

        // Neo-Copy機能が利用可能でなければUIを表示しない
        if (!isNeoCopyAvailable()) {
            log("Neo-Copy機能が利用できないページです（ビルダーページでキャラクターIDが必要）");
            return;
        }

        // トグルボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'chasm-neocopy-toggle';
        toggleBtn.className = 'chasm-neocopy-toggle';
        toggleBtn.innerHTML = '✦';
        toggleBtn.title = 'Kyarapu Chasm Neo-Copy';

        // メニューコンテナ
        const menuContainer = document.createElement('div');
        menuContainer.id = 'chasm-neocopy-menu';
        menuContainer.style.display = 'none';

        // JSONコピーボタン
        const copyBtn = document.createElement('button');
        copyBtn.className = 'chasm-neocopy-btn primary';
        copyBtn.innerHTML = '📋 JSONコピー';
        copyBtn.onclick = copyToClipboard;

        // JSON貼り付けボタン
        const pasteBtn = document.createElement('button');
        pasteBtn.className = 'chasm-neocopy-btn warning';
        pasteBtn.innerHTML = '📥 JSON貼り付け';
        pasteBtn.onclick = pasteFromClipboard;

        // 全ドロップダウンを閉じるヘルパー関数
        const closeAllDropdowns = () => {
            document.querySelectorAll('.chasm-neocopy-dropdown-content').forEach(d => {
                d.classList.remove('show');
            });
        };

        // ファイル管理ドロップダウン
        const fileDropdown = document.createElement('div');
        fileDropdown.className = 'chasm-neocopy-dropdown';

        const fileBtn = document.createElement('button');
        fileBtn.className = 'chasm-neocopy-btn secondary';
        fileBtn.innerHTML = '📁 ファイル管理 ▾';

        const fileDropdownContent = document.createElement('div');
        fileDropdownContent.className = 'chasm-neocopy-dropdown-content';

        // クリックでトグル
        fileBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = fileDropdownContent.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen) {
                fileDropdownContent.classList.add('show');
            }
        };

        const exportItem = document.createElement('button');
        exportItem.className = 'chasm-neocopy-dropdown-item';
        exportItem.innerHTML = '📤 エクスポート';
        exportItem.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exportToFile();
        };

        const importItem = document.createElement('button');
        importItem.className = 'chasm-neocopy-dropdown-item';
        importItem.innerHTML = '📥 インポート';
        importItem.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            importFromFile();
        };

        fileDropdownContent.appendChild(exportItem);
        fileDropdownContent.appendChild(importItem);
        fileDropdown.appendChild(fileBtn);
        fileDropdown.appendChild(fileDropdownContent);

        // 再公開ドロップダウン
        const publishDropdown = document.createElement('div');
        publishDropdown.className = 'chasm-neocopy-dropdown';

        const publishBtn = document.createElement('button');
        publishBtn.className = 'chasm-neocopy-btn info';
        publishBtn.innerHTML = '🌐 再公開 ▾';

        const publishDropdownContent = document.createElement('div');
        publishDropdownContent.className = 'chasm-neocopy-dropdown-content';

        // クリックでトグル
        publishBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = publishDropdownContent.classList.contains('show');
            closeAllDropdowns();
            if (!isOpen) {
                publishDropdownContent.classList.add('show');
            }
        };

        const publicItem = document.createElement('button');
        publicItem.className = 'chasm-neocopy-dropdown-item';
        publicItem.innerHTML = '🌍 公開';
        publicItem.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            republish('public');
        };

        const linkOnlyItem = document.createElement('button');
        linkOnlyItem.className = 'chasm-neocopy-dropdown-item';
        linkOnlyItem.innerHTML = '🔗 リンク公開';
        linkOnlyItem.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            republish('linkonly');
        };

        const privateItem = document.createElement('button');
        privateItem.className = 'chasm-neocopy-dropdown-item';
        privateItem.innerHTML = '🔒 非公開';
        privateItem.onclick = (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            republish('private');
        };

        publishDropdownContent.appendChild(publicItem);
        publishDropdownContent.appendChild(linkOnlyItem);
        publishDropdownContent.appendChild(privateItem);
        publishDropdown.appendChild(publishBtn);
        publishDropdown.appendChild(publishDropdownContent);

        // 外側をクリックしたらドロップダウンを閉じる
        document.addEventListener('click', closeAllDropdowns);

        // メニューに追加
        menuContainer.appendChild(publishDropdown);
        menuContainer.appendChild(fileDropdown);
        menuContainer.appendChild(pasteBtn);
        menuContainer.appendChild(copyBtn);

        // DOMに追加
        document.body.appendChild(menuContainer);
        document.body.appendChild(toggleBtn);

        // トグル機能
        let isMenuOpen = false;
        toggleBtn.onclick = () => {
            isMenuOpen = !isMenuOpen;
            menuContainer.style.display = isMenuOpen ? 'flex' : 'none';
            toggleBtn.classList.toggle('active', isMenuOpen);
        };

        log(`UI初期化完了 (${VERSION})`);
    }

    // =====================================================
    //                      初期化
    // =====================================================

    function initialize() {
        // ページ読み込み完了後にUI作成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createUI);
        } else {
            createUI();
        }

        // URL変更を監視（SPAナビゲーション対応）
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(createUI, 500);
            }
        }).observe(document.body, { childList: true, subtree: true });

        log(`Kyarapu Chasm Neo-Copy ${VERSION} 初期化完了`);
    }

    initialize();
})();

