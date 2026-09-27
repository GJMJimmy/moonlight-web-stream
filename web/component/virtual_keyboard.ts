import { Component } from "./index.js"
import { StreamKeyModifiers, StreamKeys } from "../api_bindings.js"
import { StreamInput } from "../stream/input.js"

type VirtualKeyDef = {
    label: string
    vk: number
    /** relative width (default 1) */
    w?: number
    /** sticky modifier key */
    mod?: number
}

type KeyRow = VirtualKeyDef[]

const MOD_CTRL = { vk: StreamKeys.VK_CONTROL, mask: StreamKeyModifiers.MASK_CTRL }
const MOD_ALT = { vk: StreamKeys.VK_MENU, mask: StreamKeyModifiers.MASK_ALT }
const MOD_SHIFT = { vk: StreamKeys.VK_SHIFT, mask: StreamKeyModifiers.MASK_SHIFT }
const MOD_WIN = { vk: StreamKeys.VK_LWIN, mask: StreamKeyModifiers.MASK_META }

function key(label: string, vk: number, w?: number): VirtualKeyDef {
    return { label, vk, w }
}

function modKey(label: string, mod: { vk: number, mask: number }, w?: number): VirtualKeyDef {
    return { label, vk: mod.vk, w, mod: mod.mask }
}

// Classic PC keyboard layout (US)
const LAYOUT: KeyRow[] = [
    [key("Esc", StreamKeys.VK_ESCAPE), key("F1", StreamKeys.VK_F1), key("F2", StreamKeys.VK_F2), key("F3", StreamKeys.VK_F3), key("F4", StreamKeys.VK_F4), key("F5", StreamKeys.VK_F5), key("F6", StreamKeys.VK_F6), key("F7", StreamKeys.VK_F7), key("F8", StreamKeys.VK_F8), key("F9", StreamKeys.VK_F9), key("F10", StreamKeys.VK_F10), key("F11", StreamKeys.VK_F11), key("F12", StreamKeys.VK_F12)],
    [key("`", StreamKeys.VK_OEM_3), key("1", StreamKeys.VK_KEY_1), key("2", StreamKeys.VK_KEY_2), key("3", StreamKeys.VK_KEY_3), key("4", StreamKeys.VK_KEY_4), key("5", StreamKeys.VK_KEY_5), key("6", StreamKeys.VK_KEY_6), key("7", StreamKeys.VK_KEY_7), key("8", StreamKeys.VK_KEY_8), key("9", StreamKeys.VK_KEY_9), key("0", StreamKeys.VK_KEY_0), key("-", StreamKeys.VK_OEM_MINUS), key("=", StreamKeys.VK_OEM_PLUS), key("⌫", StreamKeys.VK_BACK, 2)],
    [key("Tab", StreamKeys.VK_TAB, 1.5), key("Q", StreamKeys.VK_KEY_Q), key("W", StreamKeys.VK_KEY_W), key("E", StreamKeys.VK_KEY_E), key("R", StreamKeys.VK_KEY_R), key("T", StreamKeys.VK_KEY_T), key("Y", StreamKeys.VK_KEY_Y), key("U", StreamKeys.VK_KEY_U), key("I", StreamKeys.VK_KEY_I), key("O", StreamKeys.VK_KEY_O), key("P", StreamKeys.VK_KEY_P), key("[", StreamKeys.VK_OEM_4), key("]", StreamKeys.VK_OEM_5), key("\\", StreamKeys.VK_OEM_102)],
    [key("Caps", StreamKeys.VK_CAPITAL, 1.8), key("A", StreamKeys.VK_KEY_A), key("S", StreamKeys.VK_KEY_S), key("D", StreamKeys.VK_KEY_D), key("F", StreamKeys.VK_KEY_F), key("G", StreamKeys.VK_KEY_G), key("H", StreamKeys.VK_KEY_H), key("J", StreamKeys.VK_KEY_J), key("K", StreamKeys.VK_KEY_K), key("L", StreamKeys.VK_KEY_L), key(";", StreamKeys.VK_OEM_1), key("'", StreamKeys.VK_OEM_7), key("Enter", StreamKeys.VK_RETURN, 1.8)],
    [modKey("Shift", MOD_SHIFT, 2.2), key("Z", StreamKeys.VK_KEY_Z), key("X", StreamKeys.VK_KEY_X), key("C", StreamKeys.VK_KEY_C), key("V", StreamKeys.VK_KEY_V), key("B", StreamKeys.VK_KEY_B), key("N", StreamKeys.VK_KEY_N), key("M", StreamKeys.VK_KEY_M), key(",", StreamKeys.VK_OEM_COMMA), key(".", StreamKeys.VK_OEM_PERIOD), key("/", StreamKeys.VK_OEM_2), modKey("Shift", MOD_SHIFT, 2.2)],
    [modKey("Ctrl", MOD_CTRL), modKey("Win", MOD_WIN), modKey("Alt", MOD_ALT), key("Space", StreamKeys.VK_SPACE, 6), modKey("Alt", MOD_ALT), modKey("Ctrl", MOD_CTRL)],
    [key("Del", StreamKeys.VK_DELETE), key("↑", StreamKeys.VK_UP), key("←", StreamKeys.VK_LEFT), key("↓", StreamKeys.VK_DOWN), key("→", StreamKeys.VK_RIGHT)],
]

export class VirtualKeyboard implements Component {

    private root = document.createElement("div")

    private visible = false
    private style: "labeled" | "blank" = "labeled"
    private opacity = 75

    private activeModifiers = new Map<number, number>()

    constructor(private getInput: () => StreamInput | null) {
        this.root.classList.add("virtual-keyboard")
        this.root.hidden = true

        this.build()

        const stop = (event: Event) => event.stopPropagation()
        // The stream binds its touch/mouse input handlers to `document` -
        // without stopping these here every tap on a key is swallowed by
        // them (preventDefault kills the synthetic click as well)
        for (const type of ["keydown", "keyup", "keypress", "click", "mousedown", "mouseup", "mousemove", "wheel", "contextmenu", "touchstart", "touchend", "touchmove", "touchcancel"]) {
            this.root.addEventListener(type, stop)
        }
    }

    mount(parent: HTMLElement): void {
        parent.appendChild(this.root)
    }
    unmount(parent: HTMLElement): void {
        parent.removeChild(this.root)
    }

    toggle(): boolean {
        this.setVisible(!this.visible)
        return this.visible
    }

    setVisible(visible: boolean): void {
        this.visible = visible
        this.root.hidden = !visible
    }

    setStyle(style: "labeled" | "blank"): void {
        this.style = style
        this.root.classList.toggle("vk-blank", style === "blank")
    }

    setOpacity(percent: number): void {
        this.opacity = percent
        this.root.style.opacity = String(Math.max(0, Math.min(100, percent)) / 100)
    }

    private build(): void {
        for (const row of LAYOUT) {
            const rowDiv = document.createElement("div")
            rowDiv.classList.add("vk-row")

            for (const def of row) {
                const button = document.createElement("button")
                button.classList.add("vk-key")
                button.style.setProperty("--w", String(def.w ?? 1))
                button.type = "button"

                const text = document.createElement("span")
                text.innerText = def.label
                button.appendChild(text)

                // pointerdown fires immediately for touch and mouse alike -
                // the synthetic click after a touch can be delayed or lost
                // on older webviews, which made sticky keys feel broken
                button.addEventListener("pointerdown", event => {
                    event.stopPropagation()
                    this.onKeyClick(def, button)
                })

                rowDiv.appendChild(button)
            }

            this.root.appendChild(rowDiv)
        }
    }

    private onKeyClick(def: VirtualKeyDef, button: HTMLButtonElement): void {
        if (def.mod != null) {
            this.toggleSticky(def.vk, def.mod, button)
            return
        }

        this.tapKey(def.vk)
    }

    private toggleSticky(vk: number, mask: number, button: HTMLButtonElement): void {
        if (this.activeModifiers.has(vk)) {
            this.activeModifiers.delete(vk)
            button.classList.remove("vk-mod-active")

            // release the held modifier
            const input = this.getInput()
            input?.sendKey(false, vk, mask)
        } else {
            this.activeModifiers.set(vk, mask)
            button.classList.add("vk-mod-active")

            const input = this.getInput()
            input?.sendKey(true, vk, mask)
        }
    }

    private activeMask(): number {
        let mask = 0
        for (const maskValue of this.activeModifiers.values()) {
            mask |= maskValue
        }
        return mask
    }

    private tapKey(vk: number): void {
        const input = this.getInput()
        if (!input) {
            return
        }

        const mask = this.activeMask()
        input.sendKey(true, vk, mask)
        input.sendKey(false, vk, mask)
    }

    // Releases held sticky modifiers (panel hidden / page closed)
    releaseSticky(): void {
        const input = this.getInput()

        if (input) {
            for (const [vk, mask] of this.activeModifiers) {
                input.sendKey(false, vk, mask)
            }
        }
        this.activeModifiers.clear()

        for (const button of this.root.querySelectorAll(".vk-key.vk-mod-active")) {
            button.classList.remove("vk-mod-active")
        }
    }
}
