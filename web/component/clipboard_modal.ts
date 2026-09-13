import { Component } from "./index.js"
import { showNotification } from "./notification.js"
import { Modal, showModal } from "./modal/index.js"
import { getCurrentLanguage, getTranslations } from "../i18n.js"
import { buildUrl } from "../config_.js"

export class ClipboardModal implements Component, Modal<void> {

    private root = document.createElement("div")
    private hint = document.createElement("p")
    private textarea = document.createElement("textarea")
    private closeButton = document.createElement("button")

    private visible = false
    private lastSeq = -1
    private applyingRemote = false
    private sendTimer: number | null = null

    constructor() {
        const i = getTranslations(getCurrentLanguage()).stream

        this.root.classList.add("modal-clipboard")

        this.hint.innerText = i.clipboardSyncHint
        this.root.appendChild(this.hint)

        this.textarea.addEventListener("input", this.onInput.bind(this))
        this.root.appendChild(this.textarea)

        const closeButton = document.createElement("button")
        closeButton.innerText = i.close
        closeButton.addEventListener("click", () => {
            void showModal(null)
        })
        this.root.appendChild(closeButton)
    }

    // The textarea mirrors the host clipboard. Local edits are pushed to the
    // host (debounced); incoming host changes overwrite the textarea.
    private onInput(): void {
        if (this.applyingRemote) {
            return
        }

        if (this.sendTimer != null) {
            clearTimeout(this.sendTimer)
        }

        const text = this.textarea.value
        this.sendTimer = window.setTimeout(async () => {
            this.sendTimer = null

            try {
                const res = await fetch(buildUrl("/api/clipboard"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                })

                if (!res.ok) {
                    throw String(res.status)
                }

                showNotification(I18N().clipboardSent, "info")
            } catch (e) {
                showNotification(I18N().clipboardSendFailed, "error", e)
            }
        }, 600)
    }

    private async pollLoop(signal: AbortSignal): Promise<void> {
        while (!signal.aborted) {
            try {
                const res = await fetch(buildUrl("/api/clipboard"))

                if (res.ok) {
                    const data = await res.json()

                    if (typeof data.seq == "number" && data.seq != this.lastSeq) {
                        this.lastSeq = data.seq

                        // Don't clobber text the user is currently typing
                        if (this.sendTimer == null) {
                            this.applyingRemote = true
                            this.textarea.value = data.text ?? ""
                            this.applyingRemote = false
                        }
                    }
                }
            } catch (e) { }

            await new Promise(resolve => setTimeout(resolve, 1500))
        }
    }

    onFinish(signal: AbortSignal): Promise<void> {
        this.visible = true
        void this.pollLoop(signal)

        return new Promise(resolve => {
            this.closeButton.addEventListener("click", () => resolve(), { once: true, signal })
        })
    }

    mount(parent: HTMLElement): void {
        parent.appendChild(this.root)
    }
    unmount(parent: HTMLElement): void {
        parent.removeChild(this.root)

        // Flush a pending edit when the modal closes
        if (this.sendTimer != null) {
            clearTimeout(this.sendTimer)
            this.onInput()
        }
        this.visible = false
    }
}

function I18N() {
    return getTranslations(getCurrentLanguage()).stream
}
