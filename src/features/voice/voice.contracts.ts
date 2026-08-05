export interface VoiceCapabilities { ok: boolean; enabled: boolean; available?: boolean; text_fallback?: boolean }
export interface VoiceSession { state_revision?: number; [key: string]: unknown }
export interface VoiceChatResult { ok: boolean; response: string; session: VoiceSession; tool_result?: Record<string, unknown> | null }
