import { Component } from "./index.js"
import { InputComponent, SelectComponent } from "./input.js"
import { Modal, showModal } from "./modal/index.js"
import { getCurrentLanguage, getTranslations } from "../i18n.js"
import { StreamKeyModifiers, StreamKeys } from "../api_bindings.js"

export type StoredShortcut = {
    name: string
    key: number
    modifiers: number
}

export type ModifierDefinition = {
    id: string
    label: string
    key: number
    mask: number
}

export const MODIFIER_DEFINITIONS: Array<ModifierDefinition> = [
    { id: "ctrl", label: "Ctrl", key: StreamKeys.VK_CONTROL, mask: StreamKeyModifiers.MASK_CTRL },
    { id: "alt", label: "Alt", key: StreamKeys.VK_MENU, mask: StreamKeyModifiers.MASK_ALT },
    { id: "shift", label: "Shift", key: StreamKeys.VK_SHIFT, mask: StreamKeyModifiers.MASK_SHIFT },
    { id: "win", label: "Win", key: StreamKeys.VK_LWIN, mask: StreamKeyModifiers.MASK_META },
]

const STORAGE_KEY = "mlShortcuts"

export function loadShortcuts(): Array<StoredShortcut> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw == null) {
            return []
        }

        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
            return []
        }

        return parsed.filter(x => x != null && typeof x.name == "string" && typeof x.key == "number" && typeof x.modifiers == "number")
    } catch (e) {
        return []
    }
}

export function saveShortcuts(shortcuts: Array<StoredShortcut>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
    } catch (e) { }
}

// Single modal with two views: a list of shortcuts (with reorder mode) and an
// add/edit form. No nested modals - the views swap inside this one modal.
export class ManageShortcutsModal implements Component, Modal<void> {

    private root = document.createElement("div")

    private listDiv = document.createElement("div")
    private formDiv = document.createElement("div")

    private topRow = document.createElement("div")
    private addButton = document.createElement("button")
    private orderButton = document.createElement("button")
    private closeButton = document.createElement("button")

    private reorderMode = false

    constructor() {
        const i = getTranslations(getCurrentLanguage()).stream

        this.root.classList.add("modal-shortcut-manage")

        this.topRow.classList.add("modal-shortcut-manage-top")

        this.addButton.innerText = i.addShortcut
        this.addButton.addEventListener("click", () => {
            this.showForm(null)
        })
        this.topRow.appendChild(this.addButton)

        this.orderButton.innerText = i.changeOrder
        this.orderButton.addEventListener("click", () => {
            this.reorderMode = !this.reorderMode

            const i = getTranslations(getCurrentLanguage()).stream
            this.orderButton.innerText = this.reorderMode ? i.orderDone : i.changeOrder
            this.renderList()
        })
        this.topRow.appendChild(this.orderButton)

        this.root.appendChild(this.topRow)

        this.listDiv.classList.add("modal-shortcut-manage-list")
        this.root.appendChild(this.listDiv)

        this.formDiv.hidden = true
        this.root.appendChild(this.formDiv)

        this.closeButton.innerText = i.close
        this.closeButton.addEventListener("click", () => {
            void showModal(null)
        })
        this.root.appendChild(this.closeButton)

        this.renderList()
    }

    private renderList(): void {
        const i = getTranslations(getCurrentLanguage()).stream
        this.listDiv.replaceChildren()

        const shortcuts = loadShortcuts()

        if (shortcuts.length == 0) {
            const empty = document.createElement("p")
            empty.classList.add("modal-shortcut-manage-empty")
            empty.innerText = i.noShortcuts
            this.listDiv.appendChild(empty)
            return
        }

        for (let index = 0; index < shortcuts.length; index++) {
            const shortcut = shortcuts[index]

            const row = document.createElement("div")
            row.classList.add("modal-shortcut-manage-row")

            const name = document.createElement("span")
            name.innerText = shortcut.name
            row.appendChild(name)

            if (this.reorderMode) {
                const up = document.createElement("button")
                up.innerText = "↑"
                up.disabled = index == 0
                up.addEventListener("click", () => {
                    this.move(index, -1)
                })
                row.appendChild(up)

                const down = document.createElement("button")
                down.innerText = "↓"
                down.disabled = index == shortcuts.length - 1
                down.addEventListener("click", () => {
                    this.move(index, 1)
                })
                row.appendChild(down)
            } else {
                const edit = document.createElement("button")
                edit.innerText = i.editShortcut
                edit.addEventListener("click", () => {
                    this.showForm(shortcut)
                })
                row.appendChild(edit)

                const del = document.createElement("button")
                del.innerText = i.deleteShortcut
                del.addEventListener("click", () => {
                    saveShortcuts(loadShortcuts().filter(x => x.name != shortcut.name))
                    this.renderList()
                })
                row.appendChild(del)
            }

            this.listDiv.appendChild(row)
        }
    }

    private move(index: number, delta: number): void {
        const list = loadShortcuts()
        const target = index + delta

        if (target < 0 || target >= list.length) {
            return
        }

        const [item] = list.splice(index, 1)
        list.splice(target, 0, item)
        saveShortcuts(list)

        this.renderList()
    }

    // editing == null -> add a new shortcut, otherwise edit the given one
    private showForm(editing: StoredShortcut | null): void {
        const i = getTranslations(getCurrentLanguage()).stream
        const m = getTranslations(getCurrentLanguage()).modal

        this.listDiv.hidden = true
        this.topRow.hidden = true
        this.formDiv.hidden = false
        this.formDiv.replaceChildren()

        const form = document.createElement("form")
        form.addEventListener("submit", event => event.preventDefault())

        const nameInput = new InputComponent("shortcutName", "text", i.shortcutName, {
            value: editing?.name
        })

        const keyList = []
        for (const keyNameRaw in StreamKeys) {
            const keyName = keyNameRaw as keyof typeof StreamKeys
            const keyValue = StreamKeys[keyName]

            const PREFIX = "VK_"

            let name: string = keyName
            if (name.startsWith(PREFIX)) {
                name = name.slice(PREFIX.length)
            }

            keyList.push({
                value: keyValue.toString(),
                name
            })
        }

        // The datalist select matches by key NAME (see SelectComponent.getValue),
        // so prefill the name - e.g. "KEY_X" - not the numeric value
        let preselectedKeyName: string | undefined
        if (editing != null) {
            for (const keyNameRaw in StreamKeys) {
                if (StreamKeys[keyNameRaw as keyof typeof StreamKeys] == editing.key) {
                    preselectedKeyName = keyNameRaw.startsWith("VK_") ? keyNameRaw.slice(3) : keyNameRaw
                    break
                }
            }
        }

        const keyDropdown = new SelectComponent("shortcutKey", keyList, {
            hasSearch: true,
            displayName: i.shortcutKey,
            preSelectedOption: preselectedKeyName
        })

        const modifierChecks: Array<{ def: ModifierDefinition, input: InputComponent }> = []
        for (const def of MODIFIER_DEFINITIONS) {
            modifierChecks.push({
                def,
                input: new InputComponent("shortcutModifier" + def.id, "checkbox", def.label, {
                    checked: editing != null && (editing.modifiers & def.mask) != 0
                })
            })
        }

        nameInput.mount(form)
        keyDropdown.mount(form)
        for (const check of modifierChecks) {
            check.input.mount(form)
        }

        const submitButton = document.createElement("button")
        submitButton.type = "submit"
        submitButton.innerText = m.ok
        form.appendChild(submitButton)

        const cancelButton = document.createElement("button")
        cancelButton.type = "button"
        cancelButton.innerText = m.cancel
        cancelButton.addEventListener("click", () => {
            this.showList()
        })
        form.appendChild(cancelButton)

        form.addEventListener("submit", () => {
            const name = nameInput.getValue().trim()
            if (name.length == 0) {
                return
            }

            const keyString = keyDropdown.getValue()
            if (keyString == null) {
                return
            }

            let modifiers = 0
            for (const check of modifierChecks) {
                if (check.input.isChecked()) {
                    modifiers |= check.def.mask
                }
            }

            const stored: StoredShortcut = { name, key: parseInt(keyString), modifiers }
            const list = loadShortcuts()

            // When editing, replace by the original name; when adding,
            // an existing name is overwritten
            const originalName = editing != null ? editing.name : name
            const existing = list.findIndex(x => x.name == originalName)
            if (existing != -1) {
                list[existing] = stored
            } else {
                list.push(stored)
            }
            saveShortcuts(list)

            this.showList()
        })

        this.formDiv.appendChild(form)
    }

    private showList(): void {
        this.formDiv.hidden = true
        this.listDiv.hidden = false
        this.topRow.hidden = false

        this.renderList()
    }

    onFinish(signal: AbortSignal): Promise<void> {
        return new Promise(resolve => {
            const done = () => resolve()

            this.closeButton.addEventListener("click", done, { once: true, signal })
            signal.addEventListener("abort", done, { once: true })
        })
    }

    mount(parent: HTMLElement): void {
        // Reopening the modal always starts at the list view
        this.reorderMode = false
        const i = getTranslations(getCurrentLanguage()).stream
        this.orderButton.innerText = i.changeOrder

        this.showList()
        parent.appendChild(this.root)
    }
    unmount(parent: HTMLElement): void {
        parent.removeChild(this.root)
    }
}
