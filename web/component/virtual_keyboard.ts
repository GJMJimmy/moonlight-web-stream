import { Component } from "./index.js"
import { StreamKeyModifiers, StreamKeys } from "../api_bindings.js"
import { StreamInput } from "../stream/input.js"

type VirtualKeyDef = {
    label: string
    vk: number
    /** relative width in units (default 1) */
    w?: number
    /** sticky modifier mask */
    mod?: number
    /** label shown on the symbol layer (sent as this key + SHIFT) */
    shiftLabel?: string
    /** fixed label, never changes between layers */
    fixed?: boolean
}

type KeyRow = VirtualKeyDef[]

const MOD_CTRL = { vk: StreamKeys.VK_CONTROL, mask: StreamKeyModifiers.MASK_CTRL }
const MOD_ALT = { vk: StreamKeys.VK_MENU, mask: StreamKeyModifiers.MASK_ALT }
const MOD_SHIFT = { vk: StreamKeys.VK_SHIFT, mask: StreamKeyModifiers.MASK_SHIFT }
const MOD_WIN = { vk: StreamKeys.VK_LWIN, mask: StreamKeyModifiers.MASK_META }

function key(label: string, vk: number, w?: number, shiftLabel?: string): VirtualKeyDef {
    return { label, vk, w, shiftLabel }
}

function modKey(label: string, mod: { vk: number, mask: number }, w?: number): VirtualKeyDef {
    return { label, vk: mod.vk, w, mod: mod.mask, fixed: true }
}

function fixedKey(label: string, vk: number, w?: number): VirtualKeyDef {
    return { label, vk, w, fixed: true }
}

// Classic US layout, main block (6 rows)
const MAIN_LAYOUT: KeyRow[] = [
    [fixedKey("Esc", StreamKeys.VK_ESCAPE), fixedKey("F1", StreamKeys.VK_F1), fixedKey("F2", StreamKeys.VK_F2), fixedKey("F3", StreamKeys.VK_F3), fixedKey("F4", StreamKeys.VK_F4), fixedKey("F5", StreamKeys.VK_F5), fixedKey("F6", StreamKeys.VK_F6), fixedKey("F7", StreamKeys.VK_F7), fixedKey("F8", StreamKeys.VK_F8), fixedKey("F9", StreamKeys.VK_F9), fixedKey("F10", StreamKeys.VK_F10), fixedKey("F11", StreamKeys.VK_F11), fixedKey("F12", StreamKeys.VK_F12)],
    [key("`", StreamKeys.VK_OEM_3, undefined, "~"), key("1", StreamKeys.VK_KEY_1, undefined, "!"), key("2", StreamKeys.VK_KEY_2, undefined, "@"), key("3", StreamKeys.VK_KEY_3, undefined, "#"), key("4", StreamKeys.VK_KEY_4, undefined, "$"), key("5", StreamKeys.VK_KEY_5, undefined, "%"), key("6", StreamKeys.VK_KEY_6, undefined, "^"), key("7", StreamKeys.VK_KEY_7, undefined, "&"), key("8", StreamKeys.VK_KEY_8, undefined, "*"), key("9", StreamKeys.VK_KEY_9, undefined, "("), key("0", StreamKeys.VK_KEY_0, undefined, ")"), key("-", StreamKeys.VK_OEM_MINUS, undefined, "_"), key("=", StreamKeys.VK_OEM_PLUS, undefined, "+"), key("⌫", StreamKeys.VK_BACK, 2)],
    [fixedKey("Tab", StreamKeys.VK_TAB, 1.5), key("Q", StreamKeys.VK_KEY_Q), key("W", StreamKeys.VK_KEY_W), key("E", StreamKeys.VK_KEY_E), key("R", StreamKeys.VK_KEY_R), key("T", StreamKeys.VK_KEY_T), key("Y", StreamKeys.VK_KEY_Y), key("U", StreamKeys.VK_KEY_U), key("I", StreamKeys.VK_KEY_I), key("O", StreamKeys.VK_KEY_O), key("P", StreamKeys.VK_KEY_P), key("[", StreamKeys.VK_OEM_4, undefined, "{"), key("]", StreamKeys.VK_OEM_5, undefined, "}"), key("\\", StreamKeys.VK_OEM_102, undefined, "|")],
    [fixedKey("Caps", StreamKeys.VK_CAPITAL, 1.8), key("A", StreamKeys.VK_KEY_A), key("S", StreamKeys.VK_KEY_S), key("D", StreamKeys.VK_KEY_D), key("F", StreamKeys.VK_KEY_F), key("G", StreamKeys.VK_KEY_G), key("H", StreamKeys.VK_KEY_H), key("J", StreamKeys.VK_KEY_J), key("K", StreamKeys.VK_KEY_K), key("L", StreamKeys.VK_KEY_L), key(";", StreamKeys.VK_OEM_1, undefined, ":"), key("'", StreamKeys.VK_OEM_7, undefined, "\""), fixedKey("Enter", StreamKeys.VK_RETURN, 1.8)],
    [modKey("Shift", MOD_SHIFT, 2.2), key("Z", StreamKeys.VK_KEY_Z), key("X", StreamKeys.VK_KEY_X), key("C", StreamKeys.VK_KEY_C), key("V", StreamKeys.VK_KEY_V), key("B", StreamKeys.VK_KEY_B), key("N", StreamKeys.VK_KEY_N), key("M", StreamKeys.VK_KEY_M), key(",", StreamKeys.VK_OEM_COMMA, undefined, "<"), key(".", StreamKeys.VK_OEM_PERIOD, undefined, ">"), key("/", StreamKeys.VK_OEM_2, undefined, "?"), modKey("Shift", MOD_SHIFT, 2.2)],
    [modKey("Ctrl", MOD_CTRL), modKey("Win", MOD_WIN), modKey("Alt", MOD_ALT), modKey("Sym", MOD_SHIFT, 2), key("Space", StreamKeys.VK_SPACE, 5), modKey("Alt", MOD_ALT), modKey("Ctrl", MOD_CTRL)],
]

// Navigation cluster, 4 rows x 3 columns (aligned with the main rows)
const NAV_LAYOUT: (VirtualKeyDef | null)[][] = [
    [fixedKey("Ins", StreamKeys.VK_INSERT), fixedKey("Home", StreamKeys.VK_HOME), fixedKey("PgUp", StreamKeys.VK_PRIOR)],
    [fixedKey("Del", StreamKeys.VK_DELETE), fixedKey("End", StreamKeys.VK_END), fixedKey("PgDn", StreamKeys.VK_NEXT)],
    [null, fixedKey("↑", StreamKeys.VK_UP), null],
    [fixedKey("←", StreamKeys.VK_LEFT), fixedKey("↓", StreamKeys.VK_DOWN), fixedKey("→", StreamKeys.VK_RIGHT)],
]

export class VirtualKeyboard implements Component {

    private root = document.createElement("div")
    private mainDiv = document.createElement("div")
    private navDiv = document.createElement("div")

    private visible = false
    private style: "labeled" | "blank" = "labeled"
    private opacity = 75
    private symbolLayer = false

    private activeModifiers = new Map<number, number>()
    private symButton: HTMLButtonElement | null = null

    constructor(private getInput: () => StreamInput | null) {
        this.root.classList.add("virtual-keyboard")
        this.root.hidden = true

        this.mainDiv.classList.add("vk-main")
        this.navDiv.classList.add("vk-nav")
        this.root.appendChild(this.mainDiv)
        this.root.appendChild(this.navDiv)

        this.build(this.mainDiv, MAIN_LAYOUT)
        this.build(this.navDiv, NAV_LAYOUT)

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

        if (!visible) {
            this.releaseSticky()
            this.setSymbolLayer(false)
        }
    }

    setStyle(style: "labeled" | "blank"): void {
        this.style = style
        this.root.classList.toggle("vk-blank", style === "blank")
    }

    setScale(percent: number): void {
        // per-keycap inline sizing: CSS variable inheritance updates proved
        // unreliable on older webviews, direct pixel widths always repaint
        const scale = Math.max(50, Math.min(150, percent)) / 100
        const unit = Math.min((window.innerWidth * 0.96 - 32) / 15.5, 52) * scale
        this.root.style.setProperty("--vk-unit", unit + "px")
        this.root.style.fontSize = unit * 0.3 + "px"
        for (const element of this.root.querySelectorAll<HTMLElement>(".vk-key, .vk-empty")) {
            const w = parseFloat(element.style.getPropertyValue("--w") || element.dataset.w || "1")
            element.style.width = w * unit + "px"
            element.style.height = unit + "px"
        }
    }

    setOpacity(percent: number): void {
        this.opacity = percent
        // applied as an alpha on the panel background - keycap interiors stay
        // fully transparent in blank mode regardless of this value
        this.root.style.setProperty("--vk-opacity", String(Math.max(0, Math.min(100, percent)) / 100))
    }

    private build(container: HTMLElement, layout: KeyRow[]): void {
        for (const row of layout) {
            const rowDiv = document.createElement("div")
            rowDiv.classList.add("vk-row")

            for (const def of row) {
                if (def == null) {
                    const empty = document.createElement("div")
                    empty.classList.add("vk-empty")
                    rowDiv.appendChild(empty)
                    continue
                }

                const button = document.createElement("button")
                button.classList.add("vk-key")
                if (def.w != null) {
                    button.style.setProperty("--w", String(def.w))
                }
                if (def.mod != null) {
                    button.dataset.vk = String(def.vk)
                }
                button.type = "button"
                button.dataset.label = def.label
                if (def.shiftLabel != null) {
                    button.dataset.shiftLabel = def.shiftLabel
                }

                const text = document.createElement("span")
                text.innerText = def.label
                button.appendChild(text)

                if (def.label === "Sym") {
                    this.symButton = button
                }

                // React to the raw events: touchstart is the earliest and most
                // reliable signal on touch devices (preventDefault also stops
                // the synthetic mouse/click duplicates), mousedown covers mouse.
                button.addEventListener("touchstart", event => {
                    event.stopPropagation()
                    event.preventDefault()
                    this.onKeyClick(def, button)
                }, { passive: false })
                button.addEventListener("mousedown", event => {
                    event.stopPropagation()
                    this.onKeyClick(def, button)
                })

                rowDiv.appendChild(button)
            }

            container.appendChild(rowDiv)
        }
    }

    private onKeyClick(def: VirtualKeyDef, button: HTMLButtonElement): void {
        if (def.mod != null) {
            // Sym is a layer switch, not a held modifier
            if (def.label === "Sym") {
                this.setSymbolLayer(!this.symbolLayer)
                return
            }

            this.toggleSticky(def.vk, def.mod, button)
            return
        }

        // symbol layer: send the key + SHIFT, then leave the layer
        const wasSymbol = this.symbolLayer
        this.tapKey(def.vk, wasSymbol)
        if (wasSymbol) {
            this.setSymbolLayer(false)
        }
    }

    private setSymbolLayer(active: boolean): void {
        this.symbolLayer = active
        this.root.classList.toggle("vk-symbol", active)

        if (this.symButton) {
            this.symButton.classList.toggle("vk-mod-active", active)
        }

        // swap keycap labels between the two layers
        for (const button of this.root.querySelectorAll<HTMLButtonElement>(".vk-key[data-label]")) {
            const base = button.dataset.label!
            const shift = button.dataset.shiftLabel
            const span = button.querySelector("span")
            if (span) {
                span.innerText = active && shift != null ? shift : base
            }
        }
    }

    private toggleSticky(vk: number, mask: number, button: HTMLButtonElement): void {
        if (this.activeModifiers.has(vk)) {
            this.activeModifiers.delete(vk)
            this.setActiveVisual(button, false)

            // release the held modifier
            const input = this.getInput()
            input?.sendKey(false, vk, mask)
        } else {
            this.activeModifiers.set(vk, mask)
            this.setActiveVisual(button, true)

            const input = this.getInput()
            input?.sendKey(true, vk, mask)
        }
    }

    // class + inline style: some older webviews repaint class-only changes
    // lazily, the inline background makes the state change immediate
    private setActiveVisual(button: HTMLButtonElement, active: boolean): void {
        if (active) {
            button.classList.add("vk-mod-active")
            button.style.backgroundColor = "var(--accent)"
            button.style.color = "#ffffff"
        } else {
            button.classList.remove("vk-mod-active")
            button.style.backgroundColor = ""
            button.style.color = ""
        }
    }

    private activeMask(): number {
        let mask = 0
        for (const maskValue of this.activeModifiers.values()) {
            mask |= maskValue
        }
        return mask
    }

    private tapKey(vk: number, forceShift: boolean): void {
        const input = this.getInput()
        if (!input) {
            return
        }

        let mask = this.activeMask()
        if (forceShift) {
            mask |= StreamKeyModifiers.MASK_SHIFT
        }

        input.sendKey(true, vk, mask)
        input.sendKey(false, vk, mask)

        // auto-release: like a real keyboard, held modifiers come up after
        // the next regular key was pressed
        this.releaseSticky()
    }

    // Releases held sticky modifiers (panel hidden / regular key pressed)
    releaseSticky(): void {
        const input = this.getInput()

        if (input) {
            for (const [vk, mask] of this.activeModifiers) {
                input.sendKey(false, vk, mask)
            }
        }
        this.activeModifiers.clear()

        for (const button of this.root.querySelectorAll<HTMLElement>(".vk-key.vk-mod-active")) {
            button.classList.remove("vk-mod-active")
            button.style.backgroundColor = ""
            button.style.color = ""
        }
    }
}

export type DragPosition = {
    x: number
    y: number
}

// Makes the floating toggle draggable with a tap/drag distinction:
// moving less than the threshold and releasing counts as a tap (onTap),
// dragging further repositions the button and reports the new position.
// Touch and mouse are handled with their raw events - the synthetic click
// after a touch is unreliable on older webviews. Stops propagation so the
// stream input handlers on document never see the interaction.
export function makeDraggableToggle(
    button: HTMLElement,
    onTap: () => void,
    getStoredPosition: () => DragPosition | null,
    onPositionChange: (position: DragPosition) => void,
): void {
    const DRAG_THRESHOLD = 6

    let active = false
    let moved = false
    let startX = 0
    let startY = 0
    let originLeft = 0
    let originTop = 0

    const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

    const applyPosition = (left: number, top: number) => {
        button.style.left = clamp(left, window.innerWidth - button.offsetWidth) + "px"
        button.style.top = clamp(top, window.innerHeight - button.offsetHeight) + "px"
        button.style.right = "auto"
    }

    // restore a stored position (clamped into the current viewport)
    const stored = getStoredPosition()
    if (stored && stored.x >= 0 && stored.y >= 0) {
        applyPosition(stored.x, stored.y)
    }

    const start = (x: number, y: number) => {
        active = true
        moved = false
        startX = x
        startY = y
        const rect = button.getBoundingClientRect()
        originLeft = rect.left
        originTop = rect.top
    }

    const move = (x: number, y: number) => {
        if (!active) {
            return
        }

        const dx = x - startX
        const dy = y - startY

        if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
            return
        }

        moved = true
        applyPosition(originLeft + dx, originTop + dy)
    }

    const end = () => {
        if (!active) {
            return
        }

        active = false

        if (moved) {
            const rect = button.getBoundingClientRect()
            onPositionChange({ x: Math.round(rect.left), y: Math.round(rect.top) })
        } else {
            onTap()
        }
    }

    button.addEventListener("touchstart", event => {
        event.stopPropagation()
        event.preventDefault()
        start(event.touches[0].clientX, event.touches[0].clientY)
    }, { passive: false })

    button.addEventListener("touchmove", event => {
        event.stopPropagation()
        event.preventDefault()
        move(event.touches[0].clientX, event.touches[0].clientY)
    }, { passive: false })

    button.addEventListener("touchend", event => {
        event.stopPropagation()
        event.preventDefault()
        end()
    }, { passive: false })

    button.addEventListener("mousedown", event => {
        event.stopPropagation()
        event.preventDefault()
        start(event.clientX, event.clientY)
    })

    window.addEventListener("mousemove", event => {
        if (!active) {
            return
        }
        event.stopPropagation()
        move(event.clientX, event.clientY)
    })

    window.addEventListener("mouseup", event => {
        if (!active) {
            return
        }
        event.stopPropagation()
        end()
    })
}