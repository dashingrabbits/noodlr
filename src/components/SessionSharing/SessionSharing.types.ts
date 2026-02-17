import type {
  SessionConnectionStatus,
  SessionJoinRequest,
  SessionParticipant,
} from "../DrumpadController/hooks/session-collaboration";

export interface SessionSharingProps {
  sessionConnectionStatus: SessionConnectionStatus;
  sessionError: string | null;
  sessionId: string;
  isSessionHost: boolean;
  isSessionEndPromptOpen: boolean;
  sessionParticipants: SessionParticipant[];
  onClearSessionError: () => void;
  onCopySessionId: () => Promise<void>;
  onHandleSessionEndDownload: () => Promise<void>;
  onHandleSessionEndDiscard: () => void;
  onJoinSession: (input: SessionJoinRequest) => Promise<void>;
  onKickSessionUser: (targetClientId: string) => void;
  onLeaveSession: () => void;
  onResolveSessionEndPrompt: () => void;
  onShareSession: () => Promise<void>;
}
