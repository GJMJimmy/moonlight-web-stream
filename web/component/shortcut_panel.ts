import { Component } from "./index.js"
import { showModal } from "./modal/index.js"
import { getCurrentLanguage, getTranslations } from "../i18n.js"
import { StreamKeys } from "../api_bindings.js"
import { StreamInput } from "../stream/input.js"
import { Api } from "../api.js"
import { ManageShortcutsModal, MODIFIER_DEFINITIONS, ModifierDefinition, StoredShortcut, loadShortcuts, loadShortcutsAsync } from "./manage_shortcuts_modal.js"

export class ShortcutPanel implements Component {

    private div = document.createElement("div")
    private modifierDiv = document.createElement("div")
    private customDiv = document.createElement("div")
    private manageDiv = document.createElement("div")

    private visible = false
    private activeModifiers = new Map<string, ModifierDefinition>()

    private manageModal: ManageShortcutsModal

    constructor(private getInput: () => StreamInput | null, private getApi: () => Api) {
        this.manageModal = new ManageShortcutsModal(this.getApi)

        this.div.classList.add("sidebar-stream-shortcuts")
        this.div.hidden = true

        this.modifierDiv.classList.add("sidebar-stream-shortcuts-buttons")
        this.modifierDiv.classList.add("sidebar-stream-shortcuts-modifiers")
        this.div.appendChild(this.modifierDiv)

        this.customDiv.classList.add("sidebar-stream-shortcuts-buttons")
        this.customDiv.classList.add("sidebar-stream-shortcuts-custom")
        this.div.appendChild(this.customDiv)

        this.manageDiv.classList.add("sidebar-stream-shortcuts-addrow")
        this.div.appendChild(this.manageDiv)

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

        const manageButton = document.createElement("button")
        manageButton.innerText = i.manageShortcuts
        manageButton.addEventListener("click", async () => {
            await showModal(this.manageModal)

            // The modal may have changed, added or reordered shortcuts -
            // re-fetch from the server (falls back to local on failure)
            await loadShortcutsAsync(this.getApi()).catch(() => { })
            this.refresh()
        })
        this.manageDiv.appendChild(manageButton)

        this.refresh()

        const releaseOn = () => this.releaseAll()
        window.addEventListener("blur", releaseOn)
        window.addEventListener("beforeunload", releaseOn)
    }

    // Shows/hides the panel. Hiding releases all held modifiers. The first
    // expansion loads the per-user shortcuts from the server - the panel is
    // created as a sidebar field initializer, where app is not assigned yet.
    toggle(): boolean {
        this.setVisible(!this.visible)

        if (this.visible) {
            void loadShortcutsAsync(this.getApi()).then(() => this.refresh()).catch(() => { })
        }

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
        while (this.customDiv.children.length > 1) {
            this.customDiv.removeChild(this.customDiv.lastChild!)
        }

        for (const shortcut of loadShortcuts()) {
            const button = document.createElement("button")
            button.innerText = shortcut.name
            button.addEventListener("click", () => {
                this.sendCombo(shortcut)
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
