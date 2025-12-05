// ==UserScript==
// @name        Kyarapu Crystallized Counter
// @namespace   https://github.com/Serugu/kyarapu-chasm-jp
// @version     KYARAPU-CNTR-JP-v1.3.1
// @description キャラプのチャットにターンカウンターを追加します。韓国版Crystallized Chasmの日本版移植です。
// @author      milkyway0308 (Original), Serugu (JP Port)
// @match       https://kyarapu.com/*
// @downloadURL https://github.com/Serugu/kyarapu-chasm-jp/raw/main/counter.user.js
// @updateURL   https://github.com/Serugu/kyarapu-chasm-jp/raw/main/counter.user.js
// @require     https://cdn.jsdelivr.net/npm/dexie@latest/dist/dexie.js
// @grant       GM_addStyle
// ==/UserScript==
!(async function () {
  let lastDetectedMessageCount = {};
  const db = new Dexie("chasm-counter");
  await db.version(1).stores({
    chatStore: `combinedId, chatId, messageId`,
    chatData: `chatId, time`,
  });
  
  const API_BASE_URL = "https://api.kyarapu.com";

  // =====================================================
  //                      ユーティリティ
  // =====================================================
  function log(message) {
    console.log(
      "%cChasm Crystallized Counter: %cInfo: %c" + message,
      "color: cyan;",
      "color: blue;",
      "color: inherit;"
    );
  }

  function logWarning(message) {
    console.log(
      "%cChasm Crystallized Counter: %cWarning: %c" + message,
      "color: cyan;",
      "color: yellow;",
      "color: inherit;"
    );
  }

  function logError(message) {
    console.log(
      "%cChasm Crystallized Counter: %cError: %c" + message,
      "color: cyan;",
      "color: red;",
      "color: inherit;"
    );
  }

  /**
   * 指定したノードまたは要素に変更オブザーバーを登録します。
   * @param {*} observeTarget 変更検知対象
   * @param {*} lambda 実行するラムダ式
   */
  function attachObserver(observeTarget, lambda) {
    const Observer = window.MutationObserver || window.WebKitMutationObserver;
    if (observeTarget && Observer) {
      let instance = new Observer(lambda);
      instance.observe(observeTarget, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }
  }

  /**
   * 指定したノードまたは要素にURL変更検知型の変更オブザーバーを登録します。
   * この関数で登録されたオブザーバーは、以前と現在のURLが異なる場合のみ動作します。
   * @param {*} runIfFirst 初回初期化時に実行するかどうか
   * @param {*} node 変更検知対象
   * @param {*} lambda 実行するラムダ式
   */
  function attachHrefObserver(node, lambda) {
    let oldHref = location.href;
    attachObserver(node, () => {
      if (oldHref !== location.href) {
        oldHref = location.href;
        lambda();
      }
    });
  }

  // =====================================================
  //                  Crack依存ユーティリティ
  // =====================================================

  /**
   * 現在のURLがチャットのURLかどうかを返します。
   * キャラプ日本版のURLパターン: /u/{userId}/c/{chatId}
   * @returns チャットURL一致可否
   */
  function isChatPath() {
    return /\/u\/[a-f0-9]+\/c\/[a-f0-9]+/.test(location.pathname);
  }

  /**
   * URLからチャットIDを抽出します。
   * @returns チャットID
   */
  function extractChatId() {
    const match = location.pathname.match(/\/u\/[a-f0-9]+\/c\/([a-f0-9]+)/);
    return match ? match[1] : null;
  }

  // 互換性のために残す（両方同じ関数を指す）
  function isStoryPath() {
    return false; // キャラプにはストーリーチャットがない
  }

  function isCharacterPath() {
    return isChatPath();
  }

  /**
   * 現在のテーマがダークモードかどうかを返します。
   * @returns ダークモードが適用されているかどうか
   */
  function isDarkMode() {
    return document.body.getAttribute("data-theme") === "dark";
  }

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

  async function retryAuthFetch(maxRetry, method, url, body) {
    let count = 0;
    let result = undefined;
    while (count++ < maxRetry) {
      try {
        const fetched = await authFetch(method, url, body);
        if (fetched instanceof Error) {
          result = fetched;
        } else {
          return fetched;
        }
      } catch (e) {
        result = e;
      }
    }
    return result;
  }

  function getRenderedMessageCount() {
    // キャラプ日本版: message-item クラスでメッセージをカウント
    const messageItems = document.getElementsByClassName("message-item");
    if (messageItems.length > 0) {
      return messageItems.length;
    }
    // フォールバック: character-message-list の子要素をカウント
    const messageList = document.getElementById("character-message-list");
    if (messageList) {
      return messageList.children.length;
    }
    return 0;
  }

  /**
   * 2つのクラスを受け取り、より多くのコンポーネントが存在するコンポーネント配列を返します。
   * @param {string} clsFirst 1番目のクラス
   * @param {string} clsSecond 2番目のクラス
   * @returns {HTMLElement[]} より多くの数のコンポーネント配列
   */
  function getHigherNodes(clsFirst, clsSecond) {
    const selectedFirst = document.getElementsByClassName(clsFirst);
    const selectedSecond = document.getElementsByClassName(clsSecond);
    return selectedFirst.length > selectedSecond.length
      ? selectedFirst
      : selectedSecond;
  }

  // =====================================================
  //                      設定
  // =====================================================
  const settings = {
    enableStoryCounter: true,
    enableCharacterCounter: true,
  };

  // IndexedDBを使うのが良いですが、予期せぬ動作や環境によるリスクのためLocalStorageを使用します
  function loadSettings() {
    const loadedSettings = localStorage.getItem("chasm-cntr-settings");
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
    localStorage.setItem("chasm-cntr-settings", JSON.stringify(settings));
    log("設定を保存しました");
  }

  function isCharacterCounterEnabled() {
    return settings.enableCharacterCounter && isChatPath();
  }

  function isStoryCounterEnabled() {
    return false; // キャラプにはストーリーチャットがない
  }

  function isChatCounterEnabled() {
    return settings.enableCharacterCounter && isChatPath();
  }

  // =====================================================
  //                      ロジック
  // =====================================================

  function getChattingLogState(chatId) {
    let currentLoadingData = lastDetectedMessageCount[chatId];
    if (!currentLoadingData) {
      currentLoadingData = lastDetectedMessageCount[chatId] = {
        isLoading: false,
        lastDetected: -1,
      };
    }
    return currentLoadingData;
  }

  function isRenderedMessageChanged(chatId) {
    const state = getChattingLogState(chatId);
    const rendered = getRenderedMessageCount();
    if (rendered != state.lastDetected) {
      return true;
    }
    return false;
  }

  function setCachedRenderedMessage(chatId, count) {
    getChattingLogState(chatId).lastDetected = count;
  }

  function isChattingLogLoading(chatId) {
    return getChattingLogState(chatId).isLoading;
  }

  function setChattingLogLoading(chatId, loading) {
    getChattingLogState(chatId).isLoading = loading;
  }

  function invalidateOthers() {
    if (!isChatPath()) {
      for (let key in Object.getOwnPropertyNames(lastDetectedMessageCount)) {
        delete lastDetectedMessageCount[key];
      }
    } else {
      const chatRoomId = extractChatId();
      for (let key of Object.keys(lastDetectedMessageCount)) {
        if (chatRoomId !== key) {
          delete lastDetectedMessageCount[key];
        }
      }
    }
  }

  async function doFetchMessageCounts(chatId, turnIndicatorElement) {
    try {
      if (!isRenderedMessageChanged(chatId) || isChattingLogLoading(chatId)) {
        return;
      }
      setCachedRenderedMessage(chatId, getRenderedMessageCount());
      setChattingLogLoading(chatId, true);
      const count = await fetchMessageCount(chatId, (count) => {
        turnIndicatorElement.textContent = `${count}ターン`;
      });
      turnIndicatorElement.textContent = `${count}ターン`;
    } catch (err) {
      if (turnIndicatorElement.textContent !== "エラー!") {
        turnIndicatorElement.textContent = "エラー!";
      }
      console.error(err);
    }
    setChattingLogLoading(chatId, false);
  }
  /**
   *
   * @param {string} chatRoomId
   * @param {string} messageId
   */
  async function isMessageCached(chatRoomId, messageId) {
    return (
      (await db.chatStore
        .where("combinedId")
        .equals(`${chatRoomId}+${messageId}`)
        .count()) > 0
    );
  }

  async function setMessageCached(chatRoomId, messageId) {
    await db.chatStore.put({
      combinedId: `${chatRoomId}+${messageId}`,
      chatId: chatRoomId,
      messageId: messageId,
    });
  }

  async function getMessageCount(chatRoomId) {
    return await db.chatStore.where("chatId").equals(chatRoomId).count();
  }

  // Will update later - Auto delete expired data to reduce internal web storage limit
  async function setLastAccess(chatRoomId) {
    await db.chatData.put({
      chatId: chatRoomId,
      time: new Date().getTime(),
    });
  }

  async function setMessageCount(chatRoomId) {
    await db.chatData.put({
      chatId: chatRoomId,
      time: new Date().getTime(),
    });
  }

  /**
   * キャラプ日本版API用のメッセージカウント取得
   * エンドポイント: /kyarapu-chat/chats/{chatId}/messages
   * レスポンス構造: data.list (韓国版は data.messages)
   */
  async function fetchMessageCount(chatId, liveReceiver) {
    await setLastAccess(chatId);
    let chatCounts = await getMessageCount(chatId);
    let changed = false;
    let url = `${API_BASE_URL}/kyarapu-chat/chats/${chatId}/messages?limit=20`;
    let continueFetch = true;
    while (continueFetch) {
      const result = await retryAuthFetch(3, "GET", url);
      if (!result || result instanceof Error) {
        throw result ?? new Error("Unknown error from request");
      }
      // 日本版は data.list を使用
      const dataMessages = result.data.list || result.data.messages || [];
      for (let message of dataMessages) {
        const messageId = message._id;
        if (message.role === "user") continue;
        if (!(await isMessageCached(chatId, messageId))) {
          await setMessageCached(chatId, messageId);
          changed = true;
          liveReceiver(++chatCounts);
          // Let's add some "Modification animation"
          await new Promise((resolve) => setTimeout(resolve, 2));
        } else {
          // Message ID already cached, stop fetching
          continueFetch = false;
          break;
        }
      }
      // ページネーション: nextCursor を使用
      if (result.data.nextCursor) {
        url = `${API_BASE_URL}/kyarapu-chat/chats/${chatId}/messages?limit=20&cursorId=${result.data.nextCursor}`;
        // Waiting 50ms to avoid ratelimiting
        await new Promise((resolve) => setTimeout(resolve, 50));
      } else {
        break;
      }
    }
    return chatCounts;
  }

  // キャラプでは fetchMessageCount と同じ
  async function fetchCharacterMessageCount(chatId, liveReceiver) {
    return await fetchMessageCount(chatId, liveReceiver);
  }

  // =====================================================
  //                      SVG
  // =====================================================
  // https://www.svgrepo.com/svg/446075/time-history
  function createHistorySvg() {
    return `<svg width="16px" height="16px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="var(--text_primary)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>time-history</title> <g id="Layer_2" data-name="Layer 2"> <g id="invisible_box" data-name="invisible box"> <rect width="48" height="48" fill="none"></rect> </g> <g id="icons_Q2" data-name="icons Q2"> <path d="M46,24A22,22,0,0,1,4.3,33.7a2,2,0,0,1,.5-2.6,2,2,0,0,1,3,.7A18,18,0,1,0,10.6,12h5.3A2.1,2.1,0,0,1,18,13.7,2,2,0,0,1,16,16H6a2,2,0,0,1-2-2V4.1A2.1,2.1,0,0,1,5.7,2,2,2,0,0,1,8,4V8.9A22,22,0,0,1,46,24Z"></path> <path d="M34,32a1.7,1.7,0,0,1-1-.3L22,25.1V14a2,2,0,0,1,4,0v8.9l9,5.4a1.9,1.9,0,0,1,.7,2.7A1.9,1.9,0,0,1,34,32Z"></path> </g> </g> </g></svg>`;
  }

  // https://www.svgrepo.com/svg/491399/dot-small
  function createDotSvg() {
    return `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="var(--text_primary)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 9.5C13.3807 9.5 14.5 10.6193 14.5 12C14.5 13.3807 13.3807 14.5 12 14.5C10.6193 14.5 9.5 13.3807 9.5 12C9.5 10.6193 10.6193 9.5 12 9.5Z" fill="#FFFFFF"></path> </g></svg>`;
  }

  // =====================================================
  //                      UI
  // =====================================================
  function createLoadingDivision() {
    const div = document.createElement("div");
    div.style.cssText =
      "display: flex; flex-direction: row; width: fit-content; height: fit-content; align-content: center;";
    let element = document.createElement("div");
    element.innerHTML = createDotSvg();
    element.style.cssText = "width: 16px; height: 16px;";
    element.classList.add("chasm-counter-dot-01");
    div.append(element);
    element = document.createElement("div");
    element.innerHTML = createDotSvg();
    element.style.cssText = "width: 16px; height: 16px;";
    element.classList.add("chasm-counter-dot-02");
    div.append(element);
    element = document.createElement("div");
    element.innerHTML = createDotSvg();
    element.style.cssText = "width: 16px; height: 16px;";
    element.classList.add("chasm-counter-dot-03");
    div.append(element);
    return div;
  }

  // =====================================================
  //                 Element Injection
  // =====================================================

  /**
   * カウンターを固定位置で表示する
   * キャラプ日本版ではCSSクラス名が異なるため、固定位置表示を使用
   */
  function injectElement() {
    const chatRoomId = extractChatId();
    if (!chatRoomId) {
      log("チャットIDが見つかりません");
      return;
    }

    // 既にカウンターが存在する場合は更新のみ
    if (document.getElementById("chasm-counter-indicator")) {
      const messageNode = document.getElementById(
        "chasm-counter-indicator-container"
      );
      if (!messageNode) return;
      doFetchMessageCounts(chatRoomId, messageNode);
      return;
    }

    // 固定位置でカウンターを作成（中央配置）
    const element = document.createElement("div");
    element.id = "chasm-counter-indicator";
    element.style.cssText = `
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: row;
      align-items: center;
      background: var(--surface_secondary, rgba(0,0,0,0.7));
      padding: 6px 12px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;

    const icon = document.createElement("div");
    icon.style.cssText = "width: 16px; height: 16px; display: flex; align-items: center;";
    icon.innerHTML = createHistorySvg();
    element.append(icon);

    const text = document.createElement("div");
    text.id = "chasm-counter-indicator-container";
    text.style.cssText =
      "color: var(--text_primary, #fff); margin-left: 6px; font-size: 14px; font-weight: 500;";
    text.textContent = "--";
    element.append(text);

    document.body.append(element);
    log(`カウンターを挿入しました (chatId: ${chatRoomId})`);
    doFetchMessageCounts(chatRoomId, text);
  }

  // =====================================================
  //                   Initialization
  // =====================================================

  /**
   * カウンター要素を削除する
   */
  function removeCounter() {
    const counter = document.getElementById("chasm-counter-indicator");
    if (counter) {
      counter.remove();
      log("カウンターを削除しました（チャットページ外）");
    }
  }

  function setup() {
    if (!isChatCounterEnabled()) {
      removeCounter();
      return;
    }
    injectElement();
  }

  function prepare() {
    setup();
    attachObserver(document, () => {
      setup();
    });
    
    // チャットIDが変わった場合のみリセット（クエリパラメータ変更では維持）
    let lastChatId = extractChatId();
    attachHrefObserver(document, () => {
      const currentChatId = extractChatId();
      if (lastChatId !== currentChatId) {
        lastChatId = currentChatId;
        invalidateOthers();
        const textNode = document.getElementById(
          "chasm-counter-indicator-container"
        );
        if (textNode) {
          textNode.textContent = "--";
        }
      }
    });
  }

  function addMenu() {
    // キャラプ日本版ではModalManagerが使えないため、設定メニューは無効化
    // 将来的にキャラプ用の設定UIを実装予定
    log("設定メニューは現在キャラプ日本版では利用できません");
  }

  document.testClear = async () => {
    return await db.chatStore.clear();
  };

  loadSettings();
  addMenu();
  "loading" === document.readyState
    ? document.addEventListener("DOMContentLoaded", prepare)
    : prepare(),
    window.addEventListener("load", prepare);

  // =================================================
  //                  メニュー強制追加
  // =================================================
  // キャラプ日本版ではModalManagerが使えないため、メニュー追加は無効化
  // function __updateModalMenu() { ... }
  // function __doModalMenuInit() { ... }
  log("Kyarapu Crystallized Counter 初期化完了");
})();