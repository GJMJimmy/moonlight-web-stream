import { globalObject } from "../../util.js";
import { Logger } from "../log.js";
import { PipeInfo } from "../pipeline/index.js";
import { AudioContextBasePipe } from "./audio_context_base.js";
import { NodeAudioPlayer } from "./index.js";

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
// The source is created when the track arrives via the transport's track
// listener - the track is live at that point.
export class TrackSourcePipe extends AudioContextBasePipe implements NodeAudioPlayer {

    static async getInfo(): Promise<PipeInfo> {
        return {
            environmentSupported: "AudioContext" in globalObject() && "createMediaStreamSource" in AudioContext.prototype
        }
    }

    static readonly baseType = "audiotrack"
    static readonly type = "audionode"

    private currentSource: MediaStreamAudioSourceNode | null = null

    constructor(base: NodeAudioPlayer, logger?: Logger) {
        super(`webrtc_track_source -> ${base.implementationName}`, base, logger)

        this.addPipePassthrough()
    }

    private pump: HTMLAudioElement | null = null

    setTrack(track: MediaStreamTrack): void {
        const ctx: any = this.getAudioContext()

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

        const trackSource = ctx.createMediaStreamSource(new MediaStream([track]))
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
