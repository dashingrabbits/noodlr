import type { SessionConnectionStatus } from "../DrumpadController/hooks/session-collaboration";

export interface SessionSharingProps {
  sessionConnectionStatus: SessionConnectionStatus;
  sessionError: string | null;
  sessionId: string;
  isSessionHost: boolean;
  isSessionEndPromptOpen: boolean;
  onClearSessionError: () => void;
  onCopySessionId: () => Promise<void>;
  onHandleSessionEndDownload: () => Promise<void>;
  onHandleSessionEndDiscard: () => void;
  onJoinSession: (sessionId: string) => Promise<void>;
  onLeaveSession: () => void;
  onResolveSessionEndPrompt: () => void;
  onShareSession: () => Promise<void>;
}
