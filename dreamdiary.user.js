// ==UserScript==
// @name         Kyarapu Crystallized DreamDiary
// @namespace    https://github.com/Serugu/kyarapu-chasm-jp
// @version      KYR-DDIA-v1.0.4
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

    console.log("[ChasmDD] Script Loaded");
    let hasLoggedInjection = false;

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

        .chasm-toast-container {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        }

        .chasm-toast {
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 13px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: chasm-toast-in 0.3s ease-out forwards;
            pointer-events: auto;
        }

        @keyframes chasm-toast-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes chasm-toast-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-10px); } }
    `);

    // --- Services ---
    const Toast = {
        show(msg) {
            let container = document.querySelector('.chasm-toast-container') || document.createElement('div');
            if (!container.parentElement) {
                container.className = 'chasm-toast-container';
                document.body.appendChild(container);
            }
            const t = document.createElement('div');
            t.className = 'chasm-toast';
            t.textContent = msg;
            container.appendChild(t);
            setTimeout(() => {
                t.style.animation = 'chasm-toast-out 0.3s ease-in forwards';
                t.addEventListener('animationend', () => {
                    t.remove();
                    if (container.children.length === 0) container.remove();
                });
            }, 2500);
        }
    };

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
        const modalTA = document.querySelector('textarea[placeholder*="忘れてはいけない"], textarea[placeholder*="キャラに必ず覚えておいてほしい"]');
        if (modalTA && modalTA.offsetParent) return modalTA;

        const chatTA = document.querySelector('textarea[placeholder*="チャットを送信する"], textarea[placeholder*="メッセージ"]');
        if (chatTA && chatTA.offsetParent) return chatTA;

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
                <button class="chasm-dd-btn chasm-dd-btn-primary" id="chasm-save-btn">保存</button>
            </div>
        `;

        const select = container.querySelector('.chasm-dd-select');
        const delBtn = container.querySelector('#chasm-del-btn');
        const saveBtn = container.querySelector('#chasm-save-btn');
        const input = container.querySelector('#chasm-new-name');

        delBtn.onclick = async () => {
            if (select.value === "#custom") return Toast.show("既存のノートを選択してください");
            if (!confirm(`「${select.options[select.selectedIndex].text}」を削除しますか？`)) return;
            await dbDeleteNote(select.value);
            await dbSetSelected(charId, "#custom");
            await updateSelectOptions(container, textArea, charId);
            Toast.show("削除しました");
        };

        saveBtn.onclick = async () => {
            const name = input.value.trim();
            const content = textArea.value.trim();
            if (!name || !content) return Toast.show("名前と内容を入力してください");
            const isGlobal = confirm("【全キャラ共通】として保存しますか？\n（キャンセルならこのキャラ専用）");
            const bound = isGlobal ? "#global" : charId;
            await dbSaveNote(bound, name, content);
            await dbSetSelected(charId, `${bound}!+${name}`);
            await updateSelectOptions(container, textArea, charId);
            input.value = "";
            Toast.show("保存しました");
        };

        if (textArea.parentElement) {
            textArea.parentElement.insertBefore(container, textArea);
            updateSelectOptions(container, textArea, charId);
            if (!hasLoggedInjection) {
                console.log("[ChasmDD] Initial UI Injection Successful");
                hasLoggedInjection = true;
            }
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
