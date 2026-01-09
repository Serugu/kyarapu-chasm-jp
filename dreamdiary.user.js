// ==UserScript==
// @name         Kyarapu Crystallized DreamDiary
// @namespace    https://github.com/Serugu/kyarapu-chasm-jp
// @version      KYR-DDIA-v1.0.8
// @description  ユーザーノートの保存・読み込み機能を追加します。
// @author       milkyway0308 (Original), Serugu (JP Port)
// @match        https://kyarapu.com/*
// @downloadURL  https://github.com/Serugu/kyarapu-chasm-jp/raw/main/dreamdiary.user.js
// @updateURL    https://github.com/Serugu/kyarapu-chasm-jp/raw/main/dreamdiary.user.js
// @require      https://cdn.jsdelivr.net/npm/dexie@latest/dist/dexie.js
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";


    GM_addStyle(`
        :root {
            --chasm-dd-bg: #2c2f33;
            --chasm-dd-text: #ffffff;
            --chasm-dd-border: #444444;
            --chasm-dd-accent: #5865f2;
            --chasm-dd-hover: #4752c4;
            --chasm-dd-danger: #ed4245;
        }
        
        body[data-theme="light"] {
            --chasm-dd-bg: #f2f3f5;
            --chasm-dd-text: #2e3338;
            --chasm-dd-border: #e3e5e8;
        }

        .chasm-dd-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px;
            background-color: var(--chasm-dd-bg);
            border: 1px solid var(--chasm-dd-border);
            border-radius: 8px;
            margin-bottom: 8px;
            color: var(--chasm-dd-text);
            font-size: 13px;
            z-index: 1000;
            width: 100%;
            box-sizing: border-box;
        }

        .chasm-dd-row {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .chasm-dd-select {
            flex-grow: 1;
            padding: 4px 6px;
            border-radius: 4px;
            border: 1px solid var(--chasm-dd-border);
            background-color: var(--chasm-dd-bg);
            color: var(--chasm-dd-text);
            font-size: 13px;
        }

        .chasm-dd-input {
            flex-grow: 1;
            padding: 4px 6px;
            border-radius: 4px;
            border: 1px solid var(--chasm-dd-border);
            background-color: var(--chasm-dd-bg);
            color: var(--chasm-dd-text);
            font-size: 13px;
        }

        .chasm-dd-btn {
            padding: 4px 10px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-weight: bold;
            color: white;
            transition: background-color 0.2s;
            white-space: nowrap;
            font-size: 11px;
        }

        .chasm-dd-btn-primary {
            background-color: var(--chasm-dd-accent);
        }
        .chasm-dd-btn-primary:hover {
            background-color: var(--chasm-dd-hover);
        }

        .chasm-dd-btn-danger {
            background-color: var(--chasm-dd-danger);
        }
        .chasm-dd-btn-danger:hover {
            background-color: #c03537;
        }

        /* Toastify Injection Styles */
        .chasm-toastify-track {
            transform: translateY(-200%);
            transition: transform 0.4s;
        }
        .chasm-toastify-track[completed="true"] {
            transform: translateY(0);
            transition: transform 0.4s;
        }

        .chasm-dd-checkbox-row {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            cursor: pointer;
            user-select: none;
        }
        .chasm-dd-checkbox-row input {
            cursor: pointer;
        }
    `);

    // --- Services ---
    /**
     * KyarapuのToastifyコンテナにフックして通知を統合するクラス
     */
    class ToastifyInjector {
        static findInjector() {
            if (document.__toastifyInjector) return document.__toastifyInjector;
            document.__toastifyInjector = new ToastifyInjector();
            return document.__toastifyInjector;
        }

        constructor() {
            this.#init();
        }

        #trackNotification() {
            const current = new Date().getTime();
            const toastifies = document.getElementsByClassName("Toastify");
            if (toastifies.length <= 0) return;

            const rootNode = toastifies[0];
            if (rootNode.childNodes.length > 0) {
                if (rootNode.getElementsByClassName("chasm-toastify-track").length != rootNode.childNodes.length) {
                    for (const element of Array.from(rootNode.getElementsByClassName("chasm-toastify-track"))) {
                        if (element.hasAttribute("completed")) {
                            element.removeAttribute("completed");
                            element.removeAt = current + 1000;
                        }
                    }
                }
            }

            for (const element of Array.from(rootNode.getElementsByClassName("chasm-toastify-track"))) {
                if (element.expireAt < current && element.hasAttribute("completed")) {
                    element.removeAttribute("completed");
                    element.removeAt = current + 1000;
                } else if (element.removeAt < current) {
                    element.remove();
                }
            }
        }

        #init() {
            setInterval(() => this.#trackNotification(), 50);
        }

        show(message, expires = 3000) {
            const textNode = document.createElement("p");
            textNode.textContent = message;
            textNode.style = "color: #FFFFFF; text-align: center; font-size: 14px; line-height: 140%; font-weight: 600; white-space: pre-line; margin: 0;";

            const containerNode = document.createElement("div");
            // Kyarapuのデフォルトトースト色に近似（ダークモード想定）
            containerNode.style = "background-color: rgba(30, 30, 30, 0.95); padding: 12px 20px; border-radius: 8px; width: fit-content; max-width: 90vw; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.3);";
            containerNode.append(textNode);

            const wrapperNode = document.createElement("div");
            wrapperNode.className = "Toastify__toast-container Toastify__toast-container--top-center chasm-toastify-track";
            wrapperNode.style.cssText = "background: transparent; min-width: 300px; height: fit-content; border-radius: 10px; display: flex; justify-content: center; left: 50%; transform: translateX(-50%); position: fixed; top: 20px; z-index: 9999;";
            wrapperNode.append(containerNode);

            wrapperNode.expireAt = new Date().getTime() + expires;

            const toastifies = document.getElementsByClassName("Toastify");
            let rootNode;

            if (toastifies.length <= 0) {
                // コンテナがない場合は一時的にbodyにフォールバック（または作成検討）
                rootNode = document.createElement("div");
                rootNode.className = "Toastify";
                document.body.append(rootNode);
            } else {
                rootNode = toastifies[0];
                // 既存の通知をクリア（FILOロジック）
                for (const element of Array.from(rootNode.childNodes)) {
                    element.remove();
                }
            }

            rootNode.append(wrapperNode);
            setTimeout(() => {
                wrapperNode.setAttribute("completed", "true");
            }, 50);
        }
    }

    const Toast = ToastifyInjector.findInjector();

    // --- Database (Dexie) ---
    let db;
    async function initDb() {
        if (typeof Dexie === 'undefined') return;
        db = new Dexie("chasm-dream-diary");
        await db.version(1).stores({
            noteStore: `keyName, noteName, boundCharacter, noteContent, savedAt`,
            lastSelected: `boundCharacter, selected`,
        });
    }

    async function dbGetNotes(character) {
        const res = await db.noteStore.where("boundCharacter").anyOf("#global", character).sortBy("savedAt");
        return res.reverse();
    }

    async function dbGetSelected(character) {
        const res = await db.lastSelected.where("boundCharacter").anyOf(character).toArray();
        return res.length > 0 ? res[0].selected : undefined;
    }

    async function dbSetSelected(character, key) {
        await db.lastSelected.put({ boundCharacter: character, selected: key });
    }

    async function dbGetNote(keyName) {
        const data = await db.noteStore.where("keyName").anyOf(keyName).toArray();
        return data.length > 0 ? data[0] : null;
    }

    async function dbDeleteNote(keyName) {
        await db.noteStore.delete(keyName);
    }

    async function dbSaveNote(character, name, content) {
        await db.noteStore.put({
            keyName: `${character}!+${name}`,
            noteName: name,
            boundCharacter: character,
            noteContent: content,
            savedAt: Date.now(),
        });
    }

    // --- Logic ---
    function getCharId() {
        const m = location.pathname.match(/\/u\/([a-zA-Z0-9]+)/);
        return m ? m[1] : null;
    }

    function getTargetTextArea() {
        // #web-modal配下のtextareaのみをターゲットにする
        const modal = document.getElementById('web-modal');
        if (!modal) return null;

        const modalTA = modal.querySelector('textarea[placeholder*="忘れてはいけない"], textarea[placeholder*="キャラに必ず覚えておいてほしい"]');
        if (modalTA && modalTA.offsetParent) return modalTA;

        return null;
    }

    async function updateSelectOptions(container, textArea, charId) {
        const select = container.querySelector('.chasm-dd-select');
        const inputRow = container.querySelector('.chasm-dd-input-row');
        const notes = await dbGetNotes(charId);
        const lastSelected = await dbGetSelected(charId);

        select.innerHTML = '<option value="#custom">カスタム (新規作成/編集)</option>';

        const globalGroup = document.createElement('optgroup');
        globalGroup.label = "共通ノート";
        notes.filter(n => n.boundCharacter === '#global').forEach(n => {
            const o = document.createElement('option');
            o.value = n.keyName; o.textContent = n.noteName;
            globalGroup.appendChild(o);
        });
        if (globalGroup.children.length > 0) select.appendChild(globalGroup);

        const localGroup = document.createElement('optgroup');
        localGroup.label = "キャラ専用ノート";
        notes.filter(n => n.boundCharacter !== '#global').forEach(n => {
            const o = document.createElement('option');
            o.value = n.keyName; o.textContent = n.noteName;
            localGroup.appendChild(o);
        });
        if (localGroup.children.length > 0) select.appendChild(localGroup);

        if (lastSelected) select.value = lastSelected;
        inputRow.style.display = (select.value === "#custom") ? "flex" : "none";

        select.onchange = async () => {
            const key = select.value;
            await dbSetSelected(charId, key);
            inputRow.style.display = (key === "#custom") ? "flex" : "none";
            if (key !== "#custom") {
                const note = await dbGetNote(key);
                if (note) {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                    setter.call(textArea, note.noteContent);
                    ['input', 'change', 'blur'].forEach(e => textArea.dispatchEvent(new Event(e, { bubbles: true })));
                    Toast.show(`「${note.noteName}」を読み込みました`);
                }
            }
        };
    }

    function injectUI() {
        const textArea = getTargetTextArea();
        const charId = getCharId();
        if (!textArea || !charId) return;

        const existing = document.getElementById('chasm-dd-ui');
        if (existing) {
            if (existing.nextElementSibling === textArea || existing.parentElement === textArea.parentElement) {
                return;
            } else {
                existing.remove();
            }
        }

        const container = document.createElement('div');
        container.id = 'chasm-dd-ui';
        container.className = 'chasm-dd-container';

        container.innerHTML = `
            <div class="chasm-dd-row">
                <select class="chasm-dd-select"></select>
                <button class="chasm-dd-btn chasm-dd-btn-danger" id="chasm-del-btn">削除</button>
            </div>
            <div class="chasm-dd-row chasm-dd-input-row" style="display: none;">
                <input type="text" class="chasm-dd-input" placeholder="新ノート名..." id="chasm-new-name">
                <label class="chasm-dd-checkbox-row">
                    <input type="checkbox" id="chasm-is-global"> 全キャラ共通
                </label>
                <button class="chasm-dd-btn chasm-dd-btn-primary" id="chasm-save-btn">保存</button>
            </div>
        `;

        const select = container.querySelector('.chasm-dd-select');
        const delBtn = container.querySelector('#chasm-del-btn');
        const saveBtn = container.querySelector('#chasm-save-btn');
        const input = container.querySelector('#chasm-new-name');
        const globalCheck = container.querySelector('#chasm-is-global');

        delBtn.onclick = async (e) => {
            if (e) e.preventDefault();
            const key = select.value;

            if (!key || key === "#custom") {
                Toast.show("削除対象のノートを選択してください");
                return;
            }

            const selectedOption = select.options[select.selectedIndex];
            const name = selectedOption ? selectedOption.text : "選択中のノート";

            try {
                await dbDeleteNote(key);
                await dbSetSelected(charId, "#custom");
                await updateSelectOptions(container, textArea, charId);
                Toast.show(`「${name}」を削除しました`);
            } catch (err) {
                Toast.show("削除に失敗しました");
            }
        };

        saveBtn.onclick = async (e) => {
            e.preventDefault();
            const name = input.value.trim();
            const content = textArea.value.trim();
            if (!name || !content) return Toast.show("名前と内容を入力してください");

            const isGlobal = globalCheck.checked;
            const bound = isGlobal ? "#global" : charId;

            try {
                await dbSaveNote(bound, name, content);
                await dbSetSelected(charId, `${bound}!+${name}`);
                await updateSelectOptions(container, textArea, charId);
                input.value = "";
                globalCheck.checked = false;
                Toast.show(`「${name}」を${isGlobal ? '共通' : 'キャラ専用'}として保存しました`);
            } catch (err) {
                Toast.show("保存に失敗しました");
            }
        };

        if (textArea.parentElement) {
            textArea.parentElement.insertBefore(container, textArea);
            updateSelectOptions(container, textArea, charId);
        }
    }

    // --- Boot ---
    async function main() {
        await initDb();

        const observer = new MutationObserver(() => injectUI());
        observer.observe(document.body, { childList: true, subtree: true });

        setInterval(injectUI, 1500);
        injectUI();
    }

    main();
})();
