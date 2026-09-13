import { Component } from "./index.js"
import { showNotification } from "./notification.js"
import { Modal, showModal } from "./modal/index.js"
import { getCurrentLanguage, getTranslations } from "../i18n.js"
import { buildUrl } from "../config_.js"

export class ClipboardModal implements Component, Modal<void> {

    private root = document.createElement("div")

    private hostLabel = document.createElement("p")
    private hostText = document.createElement("textarea")
    private copyButton = document.createElement("button")

    private sendLabel = document.createElement("p")
    private sendText = document.createElement("textarea")
    private sendButton = document.createElement("button")

    private closeButton = document.createElement("button")

    private lastSeq = -1

    constructor() {
        const i = getTranslations(getCurrentLanguage()).stream

        this.root.classList.add("modal-clipboard")

        this.hostLabel.innerText = i.clipboardHostToDevice
        this.root.appendChild(this.hostLabel)

        this.hostText.classList.add("textlike")
        this.hostText.readOnly = true
        this.root.appendChild(this.hostText)

        this.copyButton.innerText = i.clipboardCopy
        this.copyButton.addEventListener("click", this.onCopy.bind(this))
        this.root.appendChild(this.copyButton)

        this.sendLabel.innerText = i.clipboardDeviceToHost
        this.root.appendChild(this.sendLabel)

        this.sendText.classList.add("textlike")
        this.root.appendChild(this.sendText)

        this.sendButton.innerText = i.clipboardSend
        this.sendButton.addEventListener("click", this.onSend.bind(this))
        this.root.appendChild(this.sendButton)

        this.closeButton.innerText = i.close
        this.closeButton.addEventListener("click", () => {
            void showModal(null)
        })
        this.root.appendChild(this.closeButton)
    }

    private async onCopy(): Promise<void> {
        const text = this.hostText.value
        if (!text) {
            return
        }

        try {
            await navigator.clipboard.writeText(text)
            showNotification(I18N().clipboardCopied, "info")
        } catch (e) {
            // Clipboard API needs a secure context - fall back to selecting the
            // text and using execCommand, otherwise the user copies manually.
            this.hostText.focus()
            this.hostText.select()
            let copied = false
            try {
                copied = document.execCommand("copy")
            } catch (e2) { }
            showNotification(copied ? I18N().clipboardCopied : I18N().clipboardCopyHint, copied ? "info" : "warn")
        }
    }

    private async onSend(): Promise<void> {
        const text = this.sendText.value
        if (!text) {
            return
        }

        try {
            const res = await fetch(buildUrl("/api/clipboard"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            })

            if (!res.ok) {
                throw String(res.status)
            }

            this.sendText.value = ""
            showNotification(I18N().clipboardSent, "info")
        } catch (e) {
            showNotification(I18N().clipboardSendFailed, "error", e)
        }
    }

    private async pollLoop(signal: AbortSignal): Promise<void> {
        while (!signal.aborted) {
            try {
                const res = await fetch(buildUrl("/api/clipboard"))

                if (res.ok) {
                    const data = await res.json()

                    if (typeof data.seq == "number" && data.seq != this.lastSeq) {
                        const firstUpdate = this.lastSeq == -1
                        this.lastSeq = data.seq
                        this.hostText.value = data.text ?? ""

                        if (!firstUpdate && data.text) {
                            showNotification(I18N().clipboardUpdated, "info")
                        }
                    }
                }
            } catch (e) { }

            await new Promise(resolve => setTimeout(resolve, 1500))
        }
    }

    onFinish(signal: AbortSignal): Promise<void> {
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
    }
}

function I18N() {
    return getTranslations(getCurrentLanguage()).stream
}
