import { Component } from "./index.js"
import { InputComponent, SelectComponent } from "./input.js"
import { setContextMenu } from "./context_menu.js"
import { FormModal } from "./modal/form.js"
import { showModal } from "./modal/index.js"
import { getCurrentLanguage, getTranslations } from "../i18n.js"
import { StreamKeyModifiers, StreamKeys } from "../api_bindings.js"
import { StreamInput } from "../stream/input.js"

type StoredShortcut = {
    name: string
    key: number
    modifiers: number
}

const STORAGE_KEY = "mlShortcuts"

type ModifierDefinition = {
    id: string
    label: string
    key: number
    mask: number
}

const MODIFIER_DEFINITIONS: Array<ModifierDefinition> = [
    { id: "ctrl", label: "Ctrl", key: StreamKeys.VK_CONTROL, mask: StreamKeyModifiers.MASK_CTRL },
    { id: "alt", label: "Alt", key: StreamKeys.VK_MENU, mask: StreamKeyModifiers.MASK_ALT },
    { id: "shift", label: "Shift", key: StreamKeys.VK_SHIFT, mask: StreamKeyModifiers.MASK_SHIFT },
    { id: "win", label: "Win", key: StreamKeys.VK_LWIN, mask: StreamKeyModifiers.MASK_META },
]

function loadShortcuts(): Array<StoredShortcut> {
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

function saveShortcuts(shortcuts: Array<StoredShortcut>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
    } catch (e) { }
}

class AddShortcutModal extends FormModal<StoredShortcut> {

    private nameInput: InputComponent
    private keyDropdown: SelectComponent
    private modifierChecks: Array<{ def: ModifierDefinition, input: InputComponent }> = []

    constructor() {
        super()

        const i = getTranslations(getCurrentLanguage()).stream

        this.nameInput = new InputComponent("shortcutName", "text", i.shortcutName)

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

        this.keyDropdown = new SelectComponent("shortcutKey", keyList, {
            hasSearch: true,
            displayName: i.shortcutKey
        })

        for (const def of MODIFIER_DEFINITIONS) {
            this.modifierChecks.push({ def, input: new InputComponent("shortcutModifier" + def.id, "checkbox", def.label) })
        }
    }

    mountForm(form: HTMLFormElement): void {
        this.nameInput.mount(form)
        this.keyDropdown.mount(form)

        for (const check of this.modifierChecks) {
            check.input.mount(form)
        }
    }

    reset(): void {
        this.nameInput.reset()
        this.keyDropdown.reset()

        for (const check of this.modifierChecks) {
            check.input.setChecked(false)
        }
    }

    submit(): StoredShortcut | null {
        const name = this.nameInput.getValue().trim()
        if (name.length == 0) {
            return null
        }

        const keyString = this.keyDropdown.getValue()
        if (keyString == null) {
            return null
        }

        let modifiers = 0
        for (const check of this.modifierChecks) {
            if (check.input.isChecked()) {
                modifiers |= check.def.mask
            }
        }

        return { name, key: parseInt(keyString), modifiers }
    }
}

export class ShortcutPanel implements Component {

    private div = document.createElement("div")
    private modifierDiv = document.createElement("div")
    private customDiv = document.createElement("div")
    private addDiv = document.createElement("div")

    private visible = false
    private activeModifiers = new Map<string, ModifierDefinition>()

    constructor(private getInput: () => StreamInput | null) {
        this.div.classList.add("sidebar-stream-shortcuts")
        this.div.hidden = true

        this.modifierDiv.classList.add("sidebar-stream-shortcuts-buttons")
        this.div.appendChild(this.modifierDiv)

        this.customDiv.classList.add("sidebar-stream-shortcuts-buttons")
        this.customDiv.classList.add("sidebar-stream-shortcuts-custom")
        this.div.appendChild(this.customDiv)

        this.addDiv.classList.add("sidebar-stream-shortcuts-addrow")
        this.div.appendChild(this.addDiv)

        for (const def of MODIFIER_DEFINITIONS) {
            const button = document.createElement("button")
            button.innerText = def.label
            button.addEventListener("click", () => {
                this.toggleModifier(def, button)
            })
            this.modifierDiv.appendChild(button)
        }

        const tabButton = document.createElement("button")
        tabButton.innerText = "Tab"
        tabButton.addEventListener("click", () => {
            this.tapKey(StreamKeys.VK_TAB)
        })
        this.customDiv.appendChild(tabButton)

        const i = getTranslations(getCurrentLanguage()).stream

        const addButton = document.createElement("button")
        addButton.innerText = i.addShortcut
        addButton.addEventListener("click", async () => {
            const result = await showModal(new AddShortcutModal())
            if (result == null) {
                return
            }

            const list = loadShortcuts()
            const existing = list.findIndex(x => x.name == result.name)
            if (existing != -1) {
                list[existing] = result
            } else {
                list.push(result)
            }
            saveShortcuts(list)
            this.refresh()
        })
        this.addDiv.appendChild(addButton)

        this.refresh()

        const releaseOn = () => this.releaseAll()
        window.addEventListener("blur", releaseOn)
        window.addEventListener("beforeunload", releaseOn)
    }

    // Shows/hides the panel. Hiding releases all held modifiers.
    toggle(): boolean {
        this.setVisible(!this.visible)
        return this.visible
    }

    setVisible(visible: boolean): void {
        this.visible = visible
        this.div.hidden = !visible

        if (!visible) {
            this.releaseAll()
        }
    }

    mount(parent: HTMLElement): void {
        parent.appendChild(this.div)
    }
    unmount(parent: HTMLElement): void {
        parent.removeChild(this.div)
    }

    // Rebuilds the custom shortcut buttons (in the order they were added).
    // The Tab button is the first child and stays in place.
    private refresh(): void {
        const i = getTranslations(getCurrentLanguage()).stream

        while (this.customDiv.children.length > 1) {
            this.customDiv.removeChild(this.customDiv.lastChild!)
        }

        for (const shortcut of loadShortcuts()) {
            const button = document.createElement("button")
            button.innerText = shortcut.name
            button.addEventListener("click", () => {
                this.sendCombo(shortcut)
            })
            button.addEventListener("contextmenu", event => {
                const i = getTranslations(getCurrentLanguage()).stream

                setContextMenu(event, {
                    elements: [{
                        name: i.deleteShortcut,
                        callback: () => {
                            saveShortcuts(loadShortcuts().filter(x => x.name != shortcut.name))
                            this.refresh()
                        }
                    }]
                })
            })
            this.customDiv.appendChild(button)
        }
    }

    private toggleModifier(def: ModifierDefinition, button: HTMLButtonElement): void {
        const input = this.getInput()
        if (!input) {
            return
        }

        if (this.activeModifiers.has(def.id)) {
            this.activeModifiers.delete(def.id)
            button.classList.remove("shortcut-active")
            input.sendKey(false, def.key, def.mask)
        } else {
            this.activeModifiers.set(def.id, def)
            button.classList.add("shortcut-active")
            input.sendKey(true, def.key, def.mask)
        }
    }

    private activeMask(): number {
        let mask = 0
        for (const def of this.activeModifiers.values()) {
            mask |= def.mask
        }
        return mask
    }

    private tapKey(key: number): void {
        const input = this.getInput()
        if (!input) {
            return
        }

        const mask = this.activeMask()
        input.sendKey(true, key, mask)
        input.sendKey(false, key, mask)
    }

    private sendCombo(shortcut: StoredShortcut): void {
        const input = this.getInput()
        if (!input) {
            return
        }

        const mods = MODIFIER_DEFINITIONS.filter(def => (shortcut.modifiers & def.mask) != 0)

        for (const def of mods) {
            input.sendKey(true, def.key, def.mask)
        }

        input.sendKey(true, shortcut.key, shortcut.modifiers)
        input.sendKey(false, shortcut.key, shortcut.modifiers)

        for (const def of mods.slice().reverse()) {
            input.sendKey(false, def.key, def.mask)
        }
    }

    private releaseAll(): void {
        const input = this.getInput()

        if (input) {
            for (const def of this.activeModifiers.values()) {
                input.sendKey(false, def.key, def.mask)
            }
        }
        this.activeModifiers.clear()

        for (const button of this.div.querySelectorAll("button.shortcut-active")) {
            button.classList.remove("shortcut-active")
        }
    }
}
