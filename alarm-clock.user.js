// ==UserScript==
// @name        Kyarapu Crystallized AlarmClock
// @namespace   https://github.com/Serugu/kyarapu-chasm-jp
// @version     KYR-ALRM-v1.0.0
// @description 毎日の出席通知と即時出席ボタンを追加します。
// @author      milkyway0308 (Original), Serugu (JP Port)
// @match       https://kyarapu.com/*
// @require     https://cdn.jsdelivr.net/npm/dexie@latest/dist/dexie.js
// @grant       GM_addStyle
// ==/UserScript==
GM_addStyle(`
    body[data-theme="light"] {
        --chasm-alarm-clock-background: #3E3E3E;
        --chasm-alarm-clock-text: white;
    }

    body[data-theme="dark"] {
        --chasm-alarm-clock-background: #EFEFEF;
        --chasm-alarm-clock-text: black;
    }

    .chasm-alarm-clock-modal {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: var(--chasm-alarm-clock-background);
        color: var(--chasm-alarm-clock-text);
        padding: 15px 20px;
        border-radius: 8px;
        margin-top: 5px;
        width: fit-content;
        white-space: nowrap;
        font-size: 15px;
        cursor: default;
        min-width: 200px;
        min-height: 60px;
        opacity: 1;
        transition: all 0.15s ease-out;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .chasm-alarm-clock-modal[loader] {
        min-width: 60px;
        min-height: 60px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        padding: 0;
    }

    .chasm-alarm-clock-active {
        cursor: pointer;
        pointer-events: all;
        color: #FFA600;
        font-weight: bold;
        margin-top: 5px;
    }

    .chasm-alarm-clock-loading {
        animation: chasm-alarm-rotate 1s infinite linear;
    }

    [ac-fade-in] {
        animation: ac-fade-in 1s; 
    }

    [ac-fade-out] {
        animation: ac-fade-out 0.55s; 
    }

    @keyframes chasm-alarm-rotate { 
        from { 
            transform: rotate(0deg); 
        } 
        to {  
            transform: rotate(360deg); 
        }
    }

    @keyframes ac-fade-in {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes ac-fade-out {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
`);
(function () {
    // =================================================
    //                      SVG
    // =================================================

    function createLoadingIcon() {
        const element = document.createElement("div");
        // https://www.svgrepo.com/svg/448500/loading
        element.innerHTML =
            '<svg width="20px" height="20px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none" class="hds-flight-icon--animation-loading"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g fill="var(--icon_secondary)" fill-rule="evenodd" clip-rule="evenodd"> <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"></path> <path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"></path> </g> </g></svg>';
        element.childNodes[0].classList.add("chasm-alarm-clock-loading");
        return element;
    }

    function createCheckIcon() {
        const element = document.createElement("div");
        // https://www.svgrepo.com/svg/532154/check
        element.innerHTML =
            '<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke="#20d71d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
        element.childNodes[0].classList.add("chasm-alarm-clock-icon");
        return element;
    }

    function createCloseIcon() {
        const element = document.createElement("div");
        // https://www.svgrepo.com/svg/522388/close
        element.innerHTML =
            '<svg width="20px" height="20px" viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M3 21.32L21 3.32001" stroke="#ff0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M3 3.32001L21 21.32" stroke="#ff0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
        element.childNodes[0].classList.add("chasm-alarm-clock-icon");
        return element;
    }

    // =====================================================
    //                      定数
    // =====================================================
    let lastChecked = -1;

    // =====================================================
    //                      設定
    // =====================================================
    const settings = {};

    // IndexedDBを使うのが良いですが、予期せぬ動作や環境によるリスクのためLocalStorageを使用します
    function loadSettings() {
        const loadedSettings = localStorage.getItem("kyarapu-alrm-settings");
        if (loadedSettings) {
            const json = JSON.parse(loadedSettings);
            for (let key of Object.keys(json)) {
                // バージョン互換性サポートのための設定マージ
                settings[key] = json[key];
            }
        }
    }

    function saveSettings() {
        log("設定を保存中...");
        // フィルタリングの必要なし！
        localStorage.setItem("kyarapu-alrm-settings", JSON.stringify(settings));
        log("設定を保存しました");
    }

    // =====================================================
    //                      ユーティリティ
    // =====================================================

    function log(message) {
        console.log(
            "%cKyarapu Crystallized AlarmClock: %cInfo: %c" + message,
            "color: yellow;",
            "color: blue;",
            "color: inherit;"
        );
    }

    function logWarning(message) {
        console.log(
            "%cKyarapu Crystallized AlarmClock: %cWarning: %c" + message,
            "color: yellow;",
            "color: yellow;",
            "color: inherit;"
        );
    }

    function logError(message) {
        console.log(
            "%cKyarapu Crystallized AlarmClock: %cError: %c" + message,
            "color: yellow;",
            "color: red;",
            "color: inherit;"
        );
    }

    /**
     * 対象要素にフェードアウトを適用します。
     * @param {HTMLElement} element 適用する要素
     * @param {undefined | () => void} doBefore フェードアウト適用直前に実行する関数
     */
    function performFadeout(element, doBefore) {
        element.setAttribute("ac-fade-out", "true");
        setTimeout(() => {
            if (doBefore) doBefore();
            element.remove();
        }, 500);
    }

    // =====================================================
    //                Kyarapu依存ユーティリティ
    // =====================================================

    /**
     * クッキーからアクセストークンを抽出して返します。
     * @returns アクセストークン
     */
    function extractAccessToken() {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            const [key, value] = cookie.trim().split("=");
            if (key === "access_token") return value;
        }
        return null;
    }

    // =====================================================
    //                データ通信関数
    // =====================================================
    /**
     * トークンを認証手段として使用してリクエストを送信します。
     * @param {string} method リクエストメソッド
     * @param {string} url リクエストURL
     * @param {any | undefined} body リクエストボディパラメータ
     * @returns {any | Error} パースされた値またはエラー
     */
    async function authFetch(method, url, body) {
        try {
            const param = {
                method: method,
                headers: {
                    Authorization: `Bearer ${extractAccessToken()}`,
                    "Content-Type": "application/json",
                },
            };
            if (body) {
                param.body = JSON.stringify(body);
            }
            const result = await fetch(url, param);
            if (!result.ok)
                return new Error(
                    `HTTPリクエスト失敗 (${result.status}) [${await result.json()}]`
                );
            return await result.json();
        } catch (t) {
            return new Error(`不明なエラー (${t.message ?? JSON.stringify(t)})`);
        }
    }

    // =====================================================
    //                       ロジック
    // =====================================================
    /**
     * 出席確認タスクを開始します。
     * 出席確認タスクは0ティック後、5000ms(5秒)ごとに実行されます。
     */
    function startLoop() {
        checkAttend().then(() => {
            setInterval(checkAttend, 5000);
        });
    }

    /**
     * 出席可否を確認し、モーダルを表示させます。
     * @returns {Promise<void>}
     */
    async function checkAttend() {
        if (!isAttendableTime()) return;
        if (new Date().getDate() !== lastChecked) {
            const isAttendable = await canAttend();
            if (isAttendable instanceof Error) return;
            if (isAttendable) {
                injectElement(document.body);
                log("出席が可能です。モーダルを追加します。");
            }
            lastChecked = new Date().getDate();
            log("出席が確認されました。今日はこれ以上モーダルを表示しません。");
        }
    }

    /**
     * 出席可能な時間かどうかを返します。
     * 6時から23時59分まで出席が可能です。
     * @returns {boolean} 出席可能時間かどうか
     */
    function isAttendableTime() {
        const time = new Date().getHours();
        if (time < 0) return false;
        return true;
    }

    /**
     * 出席可能かどうかをサーバーから取得して返します。
     * @returns {Promise<boolean|Error>} 出席可能かどうか、またはエラー
     */
    async function canAttend() {
        const webResult = await authFetch(
            "GET",
            "https://api.kyarapu.com/kyarapu-gold/events/check-in"
        );
        if (webResult instanceof Error) return webResult;

        if (webResult.data && webResult.data.active === true) {
            return true;
        }
        return false;
    }

    /**
     * 出席を進行します。
     * @param {HTMLElement} container 出席モーダル要素の最上位要素
     */
    function doAttend(container) {
        const childElements = container.childNodes;
        for (let i = 0; i < childElements.length - 1; i++) {
            // childNodesはLive NodeListではないが、削除するとインデックスがずれる可能性があるため
            // ここでは単純にfadeoutを適用するだけ
            performFadeout(childElements[i]);
        }
        setTimeout(() => {
            container.setAttribute("loader", "true");
        }, 400);

        // 最後の要素（クリックしたボタンなど）をフェードアウト
        performFadeout(childElements[childElements.length - 1], () => {
            const loader = createLoadingIcon();
            container.append(loader);
            performAttend().then((result) => {
                if (result) {
                    performFadeout(loader, () => {
                        const check = createCheckIcon();
                        container.append(check);
                        setTimeout(() => {
                            performFadeout(container);
                        }, 2000);
                    });
                } else {
                    performFadeout(loader, () => {
                        const check = createCloseIcon();
                        container.append(check);
                        setTimeout(() => {
                            performFadeout(container);
                        }, 1500);
                    });
                }
            });
        });
    }

    /**
     * APIを通じて出席を行います。
     * @returns {Promise<boolean>} 出席成功可否
     */
    async function performAttend() {
        const result = await authFetch(
            "POST",
            "https://api.kyarapu.com/kyarapu-gold/events/check-in"
        );
        if (result instanceof Error) {
            return false;
        }
        return true;
    }

    // =====================================================
    //                    UI インジェクション
    // =====================================================

    /**
     * 出席要素を作成し、挿入します。
     * @param {HTMLElement} parentElement 挿入する親要素
     */
    function injectElement(parentElement) {
        // 既に存在する場合は作成しない
        if (document.getElementsByClassName("chasm-alarm-clock-modal").length > 0) {
            return;
        }
        const containerElement = document.createElement("div");
        containerElement.className = "chasm-alarm-clock-modal";

        const textElement = document.createElement("p");
        textElement.textContent = "出席チェックが可能です！";
        textElement.style.margin = "0";

        const clickableElement = document.createElement("p");
        clickableElement.textContent = ">> 今すぐ出席する <<";
        clickableElement.className = "chasm-alarm-clock-active";
        clickableElement.style.margin = "5px 0 0 0";

        clickableElement.onclick = () => {
            doAttend(containerElement);
        };

        containerElement.append(textElement);
        containerElement.append(clickableElement);

        containerElement.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        containerElement.setAttribute("ac-fade-in", "true");
        parentElement.append(containerElement);
    }

    // =================================================
    //                      初期化
    // =================================================

    function prepare() {
        loadSettings();
        startLoop();
        log("初期化完了");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", prepare);
    } else {
        prepare();
    }

})();
