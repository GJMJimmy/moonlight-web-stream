import { globalObject } from "../../util"
import { Logger } from "../log"
import { PipeInfo } from "../pipeline/index"
import { AudioContextBasePipe } from "./audio_context_base"
import { AudioPlayerSetup, TrackAudioPlayer } from "./index"

// On chromium 94-102 the audio element / MediaStream paths are unreliable on
// Android (media gesture policy + silent generator). Prefer the direct
// AudioContext destination pipeline there.
function elementAudioPathUnreliable(): boolean {
    const match = navigator.userAgent.match(/Chrome\/(\d+)\./)
    const major = match ? parseInt(match[1]) : NaN
    return !isNaN(major) && major >= 94 && major < 103
}

export class AudioContextTrackPipe extends AudioContextBasePipe {
    static readonly pipeName = "AudioContextTrackPipe"

    static async getInfo(): Promise<PipeInfo> {
        return {
            environmentSupported: "AudioContext" in globalObject() && "createMediaStreamSource" in AudioContext.prototype && !elementAudioPathUnreliable()
        }
    }

    static readonly baseType = "audiotrack"
    static readonly type = "audionode"

    private destination: MediaStreamAudioDestinationNode | null = null
    private currentSource: AudioNode | null = null

    constructor(base: TrackAudioPlayer, logger?: Logger) {
        super(`audio_context_track -> ${base.implementationName}`, base, logger)

        this.addPipePassthrough()
    }

    setup(setup: AudioPlayerSetup) {
        const result = super.setup(setup)

        if (typeof MediaStreamAudioDestinationNode == "function") {
            // Check for constructor
            this.destination = new MediaStreamAudioDestinationNode(this.getAudioContext(), {
                channelCount: setup.channels,
                channelCountMode: "explicit",
                channelInterpretation: setup.channels > 2 ? "discrete" : "speakers"
            })
        } else {
            this.destination = this.getAudioContext().createMediaStreamDestination();
        }

        (this.getBase() as TrackAudioPlayer).setTrack(this.destination.stream.getTracks()[0])

        if (this.currentSource) {
            this.currentSource.connect(this.destination)
        }

        return result
    }

    setSource(source: AudioNode): void {
        if (this.currentSource && this.destination) {
            this.currentSource.disconnect(this.destination)
        }

        this.currentSource = source

        if (this.destination) {
            source.connect(this.destination)
        }
    }

}
