import { globalObject } from "../../util.js";
import { Logger } from "../log.js";
import { PipeInfo } from "../pipeline/index.js";
import { AudioContextBasePipe } from "./audio_context_base.js";
import { AudioPlayerSetup, NodeAudioPlayer } from "./index.js";

// Takes the remote WebRTC audio track into the app's AudioContext instead of
// relying on a muted-until-gesture <audio> element: autoplay policies on
// insecure origins (LAN IP access) can keep that element silent forever,
// while the gesture-driven resume on this AudioContext works everywhere.
//
// Two chromium quirks must be handled for a remote WebRTC track to be
// audible through WebAudio:
// 1. crbug.com/121673 - a MediaStreamSource stays silent unless the
//    track also feeds a muted <audio> element (the "pump" below)
// 2. the element-based playout would be blocked by autoplay policies on
//    insecure origins, which is why the AudioContext route is used
//
// The wrapped player owns the only AudioContext (created in its setup):
// AudioNodes must never cross contexts, so the source node is created on
// the player's context and handed over via setSource.
export class TrackSourcePipe extends AudioContextBasePipe implements NodeAudioPlayer {

    static async getInfo(): Promise<PipeInfo> {
        return {
            environmentSupported: "AudioContext" in globalObject() && "createMediaStreamSource" in AudioContext.prototype
        }
    }

    // buildPipeline connects a pipe to what it wraps by requiring
    // baseType == wrapped.type: the player consumes an AudioNode, while what
    // this pipe consumes from the transport is the raw track
    static readonly baseType = "audionode"
    static readonly type = "audiotrack"

    private pendingTrack: MediaStreamTrack | null = null
    private pump: HTMLAudioElement | null = null

    constructor(base: NodeAudioPlayer, logger?: Logger) {
        super(`webrtc_track_source -> ${base.implementationName}`, base, logger)

        this.addPipePassthrough()
    }

    // the inherited setup would create a second AudioContext (nodes can't
    // cross contexts) - forward instead so the player creates the only one,
    // then connect a track that arrived before setup
    setup(setup: AudioPlayerSetup) {
        let result
        const base = this.getBase() as NodeAudioPlayer

        if ("setup" in base && typeof base.setup == "function") {
            result = base.setup(...arguments)
        }

        if (this.pendingTrack) {
            const track = this.pendingTrack
            this.pendingTrack = null
            this.setTrack(track)
        }

        return result
    }

    cleanup(): void {
        this.detachPump()

        const base = this.getBase()
        if (base && "cleanup" in base && typeof base.cleanup == "function") {
            base.cleanup()
        }
    }

    setTrack(track: MediaStreamTrack): void {
        let context: AudioContext
        try {
            context = (this.getBase() as NodeAudioPlayer).getAudioContext()
        } catch (e) {
            // the track listener fires as soon as the track arrives, which
            // can be before the player's setup created the context ->
            // remember the track and connect it in setup()
            this.pendingTrack = track
            return
        }

        // muted pump - keeps the track playout pipeline active so the
        // MediaStreamSource actually receives data (crbug 121673 workaround)
        this.detachPump()
        this.pump = document.createElement("audio")
        this.pump.muted = true
        this.pump.autoplay = true
        this.pump.srcObject = new MediaStream([track])
        this.pump.style.display = "none"
        document.body.appendChild(this.pump)
        this.pump.play().catch(() => { })

        const trackSource = context.createMediaStreamSource(new MediaStream([track]))
        ;(this.getBase() as NodeAudioPlayer).setSource(trackSource)
    }

    detachPump(): void {
        if (this.pump) {
            this.pump.pause()
            this.pump.srcObject = null
            this.pump.remove()
            this.pump = null
        }
    }

    setSource(source: AudioNode): void {
        // required by the abstract base - the track pipe has no upstream node
        // of its own, incoming samples connect through setTrack instead
    }
}
