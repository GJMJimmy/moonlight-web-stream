// Minimal stand-in for the cargo-generated bindings (ts-rs).
// Runtime values come from api_bindings.js (official v2.10.0 build).
// Enum declarations are precise; pure types are `any` (erased at runtime).

export type App = any
export type ConfigJs = any
export type ConnectionStatus = any
export type DeleteHostQuery = any
export type DeleteRoleQuery = any
export type DeleteUserRequest = any
export type DetailedHost = any
export type DetailedRole = any
export type DetailedUser = any
export type GeneralClientMessage = any
export type GeneralServerMessage = any
export type GetAppImageQuery = any
export type GetAppsQuery = any
export type GetAppsResponse = any
export type GetHostQuery = any
export type GetHostResponse = any
export type GetHostsResponse = any
export type GetRoleQuery = any
export type GetRoleResponse = any
export type GetRolesResponse = any
export type GetUserQuery = any
export type GetUsersResponse = any
export type LogMessageType = any
export type PatchHostRequest = any
export type PatchRoleRequest = any
export type PatchUserRequest = any
export type PostCancelRequest = any
export type PostCancelResponse = any
export type PostHostRequest = any
export type PostHostResponse = any
export type PostLoginRequest = any
export type PostPairRequest = any
export type PostPairResponse1 = any
export type PostPairResponse2 = any
export type PostRoleRequest = any
export type PostRoleResponse = any
export type PostUserRequest = any
export type PostWakeUpRequest = any
export type RoleType = any
export type StreamCapabilities = any
export type StreamClientMessage = any
export const StreamControllerButton: { readonly BUTTON_A: number, readonly BUTTON_B: number, readonly BUTTON_X: number, readonly BUTTON_Y: number, readonly BUTTON_UP: number, readonly BUTTON_DOWN: number, readonly BUTTON_LEFT: number, readonly BUTTON_RIGHT: number, readonly BUTTON_LB: number, readonly BUTTON_RB: number, readonly BUTTON_PLAY: number, readonly BUTTON_BACK: number, readonly BUTTON_LS_CLK: number, readonly BUTTON_RS_CLK: number, readonly BUTTON_SPECIAL: number, readonly BUTTON_PADDLE1: number, readonly BUTTON_PADDLE2: number, readonly BUTTON_PADDLE3: number, readonly BUTTON_PADDLE4: number, readonly BUTTON_TOUCHPAD: number, readonly BUTTON_MISC: number }
export type StreamControllerButton = number
export const StreamControllerCapabilities: { readonly CAPABILITY_RUMBLE: number, readonly CAPABILITY_TRIGGER_RUMBLE: number }
export type StreamControllerCapabilities = number
export const StreamKeyModifiers: { readonly MASK_SHIFT: number, readonly MASK_CTRL: number, readonly MASK_ALT: number, readonly MASK_META: number }
export type StreamKeyModifiers = number
export const StreamKeys: { readonly VK_LBUTTON: number, readonly VK_RBUTTON: number, readonly VK_CANCEL: number, readonly VK_MBUTTON: number, readonly VK_XBUTTON1: number, readonly VK_XBUTTON2: number, readonly VK_BACK: number, readonly VK_TAB: number, readonly VK_CLEAR: number, readonly VK_RETURN: number, readonly VK_SHIFT: number, readonly VK_CONTROL: number, readonly VK_MENU: number, readonly VK_PAUSE: number, readonly VK_CAPITAL: number, readonly VK_KANA: number, readonly VK_HANGUEL: number, readonly VK_HANGUL: number, readonly VK_JUNJA: number, readonly VK_FINAL: number, readonly VK_HANJA: number, readonly VK_KANJI: number, readonly VK_ESCAPE: number, readonly VK_CONVERT: number, readonly VK_NONCONVERT: number, readonly VK_ACCEPT: number, readonly VK_MODECHANGE: number, readonly VK_SPACE: number, readonly VK_PRIOR: number, readonly VK_NEXT: number, readonly VK_END: number, readonly VK_HOME: number, readonly VK_LEFT: number, readonly VK_UP: number, readonly VK_RIGHT: number, readonly VK_DOWN: number, readonly VK_SELECT: number, readonly VK_PRINT: number, readonly VK_EXECUTE: number, readonly VK_SNAPSHOT: number, readonly VK_INSERT: number, readonly VK_DELETE: number, readonly VK_HELP: number, readonly VK_KEY_0: number, readonly VK_KEY_1: number, readonly VK_KEY_2: number, readonly VK_KEY_3: number, readonly VK_KEY_4: number, readonly VK_KEY_5: number, readonly VK_KEY_6: number, readonly VK_KEY_7: number, readonly VK_KEY_8: number, readonly VK_KEY_9: number, readonly VK_KEY_A: number, readonly VK_KEY_B: number, readonly VK_KEY_C: number, readonly VK_KEY_D: number, readonly VK_KEY_E: number, readonly VK_KEY_F: number, readonly VK_KEY_G: number, readonly VK_KEY_H: number, readonly VK_KEY_I: number, readonly VK_KEY_J: number, readonly VK_KEY_K: number, readonly VK_KEY_L: number, readonly VK_KEY_M: number, readonly VK_KEY_N: number, readonly VK_KEY_O: number, readonly VK_KEY_P: number, readonly VK_KEY_Q: number, readonly VK_KEY_R: number, readonly VK_KEY_S: number, readonly VK_KEY_T: number, readonly VK_KEY_U: number, readonly VK_KEY_V: number, readonly VK_KEY_W: number, readonly VK_KEY_X: number, readonly VK_KEY_Y: number, readonly VK_KEY_Z: number, readonly VK_LWIN: number, readonly VK_RWIN: number, readonly VK_APPS: number, readonly VK_SLEEP: number, readonly VK_NUMPAD0: number, readonly VK_NUMPAD1: number, readonly VK_NUMPAD2: number, readonly VK_NUMPAD3: number, readonly VK_NUMPAD4: number, readonly VK_NUMPAD5: number, readonly VK_NUMPAD6: number, readonly VK_NUMPAD7: number, readonly VK_NUMPAD8: number, readonly VK_NUMPAD9: number, readonly VK_MULTIPLY: number, readonly VK_ADD: number, readonly VK_SEPARATOR: number, readonly VK_SUBTRACT: number, readonly VK_DECIMAL: number, readonly VK_DIVIDE: number, readonly VK_F1: number, readonly VK_F2: number, readonly VK_F3: number, readonly VK_F4: number, readonly VK_F5: number, readonly VK_F6: number, readonly VK_F7: number, readonly VK_F8: number, readonly VK_F9: number, readonly VK_F10: number, readonly VK_F11: number, readonly VK_F12: number, readonly VK_F13: number, readonly VK_F14: number, readonly VK_F15: number, readonly VK_F16: number, readonly VK_F17: number, readonly VK_F18: number, readonly VK_F19: number, readonly VK_F20: number, readonly VK_F21: number, readonly VK_F22: number, readonly VK_F23: number, readonly VK_F24: number, readonly VK_NUMLOCK: number, readonly VK_SCROLL: number, readonly VK_LSHIFT: number, readonly VK_RSHIFT: number, readonly VK_LCONTROL: number, readonly VK_RCONTROL: number, readonly VK_LMENU: number, readonly VK_RMENU: number, readonly VK_BROWSER_BACK: number, readonly VK_BROWSER_FORWARD: number, readonly VK_BROWSER_REFRESH: number, readonly VK_BROWSER_STOP: number, readonly VK_BROWSER_SEARCH: number, readonly VK_BROWSER_FAVORITES: number, readonly VK_BROWSER_HOME: number, readonly VK_VOLUME_MUTE: number, readonly VK_VOLUME_DOWN: number, readonly VK_VOLUME_UP: number, readonly VK_MEDIA_NEXT_TRACK: number, readonly VK_MEDIA_PREV_TRACK: number, readonly VK_MEDIA_STOP: number, readonly VK_MEDIA_PLAY_PAUSE: number, readonly VK_LAUNCH_MAIL: number, readonly VK_MEDIA_SELECT: number, readonly VK_LAUNCH_APP1: number, readonly VK_LAUNCH_APP2: number, readonly VK_OEM_1: number, readonly VK_OEM_PLUS: number, readonly VK_OEM_COMMA: number, readonly VK_OEM_MINUS: number, readonly VK_OEM_PERIOD: number, readonly VK_OEM_2: number, readonly VK_OEM_3: number, readonly VK_ABNT_C1: number, readonly VK_ABNT_C2: number, readonly VK_OEM_4: number, readonly VK_OEM_5: number, readonly VK_OEM_6: number, readonly VK_OEM_7: number, readonly VK_OEM_8: number, readonly VK_OEM_102: number, readonly VK_PROCESSKEY: number, readonly VK_PACKET: number, readonly VK_ATTN: number, readonly VK_CRSEL: number, readonly VK_EXSEL: number, readonly VK_EREOF: number, readonly VK_PLAY: number, readonly VK_ZOOM: number, readonly VK_NONAME: number, readonly VK_PA1: number, readonly VK_OEM_CLEAR: number }
export type StreamKeys = number
export const StreamMouseButton: { readonly LEFT: number, readonly MIDDLE: number, readonly RIGHT: number, readonly X1: number, readonly X2: number }
export type StreamMouseButton = number
export type StreamPermissions = any
export type StreamServerMessage = any
export type StreamSettings = any
export type StreamSignalingMessage = any
export const StreamSupportedVideoCodecs: { readonly H264: number, readonly H264_HIGH8_444: number, readonly H265: number, readonly H265_MAIN10: number, readonly H265_REXT8_444: number, readonly H265_REXT10_444: number, readonly AV1_MAIN8: number, readonly AV1_MAIN10: number, readonly AV1_HIGH8_444: number, readonly AV1_HIGH10_444: number }
export type StreamSupportedVideoCodecs = number
export type StreamerStatsUpdate = any
export const TransportChannelId: { readonly GENERAL: number, readonly STATS: number, readonly HOST_VIDEO: number, readonly HOST_AUDIO: number, readonly MOUSE_RELIABLE: number, readonly MOUSE_ABSOLUTE: number, readonly MOUSE_RELATIVE: number, readonly KEYBOARD: number, readonly TOUCH: number, readonly CONTROLLERS: number, readonly CONTROLLER0: number, readonly CONTROLLER1: number, readonly CONTROLLER2: number, readonly CONTROLLER3: number, readonly CONTROLLER4: number, readonly CONTROLLER5: number, readonly CONTROLLER6: number, readonly CONTROLLER7: number, readonly CONTROLLER8: number, readonly CONTROLLER9: number, readonly CONTROLLER10: number, readonly CONTROLLER11: number, readonly CONTROLLER12: number, readonly CONTROLLER13: number, readonly CONTROLLER14: number, readonly CONTROLLER15: number, readonly RTT: number }
export type TransportChannelId = number
export type UndetailedHost = any
export type UndetailedRole = any
