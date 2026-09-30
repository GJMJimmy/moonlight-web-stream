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
// The source is created when the track arrives via the transport's track
// listener - the track is live at that point, which avoids the chromium bug
// where a MediaStreamSource created before the track becomes active stays
// silent (crbug.com/121673). The track is NOT attached to any audio element
// at the same time: chromium routes silence into a MediaStreamSource while
// the same track feeds a muted element.
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

    setTrack(track: MediaStreamTrack): void {
        // 'as any': this tsc version mis-infers the getAudioContext() return
        // type in this context; the runtime API is correct
        const ctx: any = this.getAudioContext()
        const trackSource = ctx.createMediaStreamSource(new MediaStream([track]))
        ;(this.getBase() as NodeAudioPlayer).setSource(trackSource)
    }

    setSource(source: AudioNode): void {
        // required by the abstract base - the track pipe has no upstream node
        // of its own, incoming samples connect through setTrack instead
    }
}
