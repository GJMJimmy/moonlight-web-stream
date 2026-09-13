import { LogMessageType } from "../api_bindings"

export type LogMessageInfo = {
    type?: LogMessageType
}

export type LogListener = (fullRawText: string, type: LogMessageType | null) => void

export class Logger {

    static __consoleHooked = false

    constructor() { }

    debug(message: string, info?: LogMessageInfo) {
        Logger.logToScreen(message)
        this.callListeners(message, info?.type)
    }

    private callListeners(message: string, type?: LogMessageType) {
        for (const listener of this.infoListeners) {
            listener(message, type ?? null)
        }
    }

    private infoListeners: Array<LogListener> = []
    addInfoListener(listener: LogListener) {
        this.infoListeners.push(listener)
    }
    removeInfoListener(listener: LogListener) {
        const index = this.infoListeners.indexOf(listener)
        if (index != -1) {
            this.infoListeners.splice(index, 1)
        }
    }

    static logToScreen(message: string) {
        try {
            let enabled = false
            try {
                enabled = location.search.indexOf("debug=1") != -1 || localStorage.getItem("__dbglog") == "1"
            } catch (e) { }
            if (!enabled) return
            if (!Logger.__consoleHooked) {
                Logger.__consoleHooked = true
                for (const level of ["error", "warn"] as const) {
                    const original = console[level].bind(console)
                    console[level] = (...args: Array<any>) => {
                        try { Logger.logToScreen("[console." + level + "] " + args.map(a => (typeof a === "string" ? a : String(a))).join(" ")) } catch (e) { }
                        original(...args)
                    }
                }
            }
            let el = document.getElementById("__dbglog")
            if (!el) {
                if (!document.body) return
                el = document.createElement("div")
                el.id = "__dbglog"
                el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:rgba(0,0,0,.8);color:#7fff7f;font:11px/1.35 monospace;max-height:45%;overflow-y:auto;pointer-events:none;white-space:pre-wrap;word-break:break-all;padding:4px 6px;"
                document.body.appendChild(el)
            }
            const line = document.createElement("div")
            line.textContent = message
            el.appendChild(line)
            while (el.childNodes.length > 80 && el.firstChild) el.removeChild(el.firstChild)
            el.scrollTop = el.scrollHeight
        } catch (e) { }
    }
}