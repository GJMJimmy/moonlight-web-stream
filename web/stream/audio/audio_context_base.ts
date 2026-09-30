
import { Logger } from "../log.js";
import { Pipe } from "../pipeline/index.js";
import { addPipePassthrough } from "../pipeline/pipes.js";
import { StatValue } from "../stats.js";
import { AudioPlayerSetup, NodeAudioPlayer } from "./index.js";

export abstract class AudioContextBasePipe implements NodeAudioPlayer {

    readonly implementationName: string

    private logger: Logger | null = null

    private base: Pipe | null
    private audioContext: AudioContext | null = null

    // registry of every live AudioContext this page created, for the
    // global gesture-resume fallback and diagnostics
    static readonly liveContexts = new Set<AudioContext>()

    static diagnoseAudio(): { total: number, running: number, suspended: number, closed: number, interrupted: number } {
        let running = 0, suspended = 0, closed = 0, interrupted = 0
        for (const context of AudioContextBasePipe.liveContexts) {
            if (context.state === "running") running++
            else if (context.state === "suspended") suspended++
            else if (context.state === "closed") closed++
            else interrupted++
        }
        return { total: AudioContextBasePipe.liveContexts.size, running, suspended, closed, interrupted }
    }

    static resumeAllAudio(): void {
        for (const context of AudioContextBasePipe.liveContexts) {
            if (context.state === "suspended") {
                context.resume().catch(() => { })
            }
        }
    }

    constructor(implementationName: string, base: Pipe | null, logger?: Logger) {
        this.logger = logger ?? null

        this.implementationName = implementationName
        this.base = base
    }

    protected addPipePassthrough() {
        addPipePassthrough(this, ["mount", "unmount"])
    }

    setup(setup: AudioPlayerSetup) {
        try {
            this.audioContext = new AudioContext({
                latencyHint: "interactive",
                sampleRate: setup.sampleRate
            })
        } catch (e: any) {
            this.logger?.debug(`Failed to setup audio node with latency hint "interactive". Trying to setup without latency hint. ${"toString" in e && typeof e.toString == "function" ? e.toString() : e}`)
        }

        if (!this.audioContext) {
            this.audioContext = new AudioContext({
                sampleRate: setup.sampleRate
            })
        }

        AudioContextBasePipe.liveContexts.add(this.audioContext)

        if (this.base && "setup" in this.base && typeof this.base.setup == "function") {
            return this.base.setup(...arguments)
        }
    }
    cleanup(): void {
        AudioContextBasePipe.liveContexts.delete(this.audioContext!)
        this.audioContext?.close()
    }

    onUserInteraction(): void {
        this.audioContext?.resume().catch(() => {})
        if (this.base && "onUserInteraction" in this.base && typeof this.base.onUserInteraction == "function") {
            return this.base.onUserInteraction(...arguments)
        }
    }

    abstract setSource(source: AudioNode): void

    async reportStats(statsObject: Record<string, StatValue>): Promise<void> {
        // Both values are in secs -> we convert into ms
        if (this.audioContext?.baseLatency) {
            statsObject.audioContextBaseLatencyMs = this.audioContext.baseLatency * 100
        } else {
            statsObject.audioContextBaseLatencyMs = "null"
        }
        if (this.audioContext?.outputLatency) {
            statsObject.audioContextOutputLatencyMs = this.audioContext.outputLatency * 100
        } else {
            statsObject.audioContextOutputLatencyMs = "null"
        }

        if (this.base && "reportStats" in this.base && typeof this.base.reportStats == "function") {
            // @ts-ignore
            return await this.base.reportStats(...arguments)
        }
    }

    getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.logger?.debug("Failed to get audio context", { type: "fatal" })
            throw "Failed to get audio context."
        }
        return this.audioContext
    }

    getBase(): Pipe | null {
        return this.base
    }

    // -- Only definition look addPipePassthrough
    mount(_parent: HTMLElement): void { }
    unmount(_parent: HTMLElement): void { }
}