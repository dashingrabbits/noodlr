import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  SampleAsset,
  SampleMetadataOverrides,
} from "../../../../integrations/samples/sample.types";
import type { ProjectState } from "../../../ProjectManager/ProjectManager.types";
import type {
  PadGroupId,
  PadGroupsState,
  SceneDefinition,
  SequencerPanelMode,
} from "../../DrumpadController.types";

export type SessionConnectionStatus = "disconnected" | "connecting" | "connected";
export type SessionEndedReason = "owner_left" | "ended_by_host" | "owner_disconnected" | "expired";

export type SharedSessionSample = {
  id: string;
  name: string;
  category: SampleAsset["category"];
  tags: string[];
  relativePath?: string;
  bpm?: number;
  musicalKey?: string;
  mimeType: string;
  dataBase64: string;
};

export type SessionSnapshotPayload = {
  projectState: Partial<ProjectState>;
  sampleMetadataOverrides: SampleMetadataOverrides;
  samples: SharedSessionSample[];
};

export type SessionUpdatePayload = {
  projectState?: Partial<ProjectState>;
  sampleMetadataOverrides?: SampleMetadataOverrides;
  samples?: SharedSessionSample[];
};

export type SessionCreateResponse = {
  type: "session_created";
  sessionId: string;
  revision: number;
  snapshot: SessionSnapshotPayload;
};

export type SessionJoinResponse = {
  type: "session_joined";
  sessionId: string;
  revision: number;
  snapshot: SessionSnapshotPayload;
};

export type SessionUpdateResponse = {
  type: "session_updated";
  sessionId: string;
  revision: number;
  fromClientId: string;
  payload: SessionUpdatePayload;
};

export type SessionLeaveResponse = {
  type: "session_left";
  sessionId: string;
};

export type SessionSyncAckResponse = {
  type: "session_sync_ack";
  sessionId: string;
  revision: number;
};

export type SessionErrorResponse = {
  type: "error";
  message: string;
};

export type SessionEndedResponse = {
  type: "session_ended";
  sessionId: string;
  endedByClientId: string;
  reason: SessionEndedReason;
};

export type SessionServerMessage =
  | SessionCreateResponse
  | SessionJoinResponse
  | SessionUpdateResponse
  | SessionLeaveResponse
  | SessionSyncAckResponse
  | SessionEndedResponse
  | SessionErrorResponse;

export type SessionCreateMessage = {
  type: "create_session";
  clientId: string;
};

export type SessionJoinMessage = {
  type: "join_session";
  clientId: string;
  sessionId: string;
};

export type SessionLeaveMessage = {
  type: "leave_session";
  clientId: string;
  sessionId: string;
};

export type SessionUpsertStateMessage = {
  type: "upsert_state";
  clientId: string;
  sessionId: string;
  payload: {
    projectState?: Partial<ProjectState>;
    sampleMetadataOverrides?: SampleMetadataOverrides;
    samples?: SharedSessionSample[];
  };
};

export type SessionClientMessage =
  | SessionCreateMessage
  | SessionJoinMessage
  | SessionLeaveMessage
  | {
      type: "end_session";
      clientId: string;
      sessionId: string;
    }
  | SessionUpsertStateMessage;

export type PendingSessionAction = {
  kind: "create" | "join";
  resolve: () => void;
  reject: (error: Error) => void;
};

export type UseSessionCollaborationInput = {
  applyProjectState: (
    candidateProjectState: Partial<ProjectState>,
    options?: { selectedProjectId?: string; preserveTransport?: boolean }
  ) => void;
  buildProjectStateSnapshot: () => ProjectState;
  ensureSampleBuffer: (sample: SampleAsset) => Promise<AudioBuffer | null>;
  activePadGroupIdRef: MutableRefObject<PadGroupId>;
  activeSceneRef: MutableRefObject<SceneDefinition | null>;
  importedSampleObjectUrlsRef: MutableRefObject<Set<string>>;
  livePadGroupsStateRef: MutableRefObject<PadGroupsState>;
  sampleAssetsById: Map<string, SampleAsset>;
  sampleMetadataOverrides: SampleMetadataOverrides;
  sequencerPanelModeRef: MutableRefObject<SequencerPanelMode>;
  setImportedSampleAssets: Dispatch<SetStateAction<SampleAsset[]>>;
  setSampleMetadataOverrides: Dispatch<SetStateAction<SampleMetadataOverrides>>;
};

export type UseSessionCollaborationResult = {
  clearSessionEnvironment: () => void;
  clearSessionError: () => void;
  copySessionId: () => Promise<void>;
  handleJoinSession: (sessionId: string) => Promise<void>;
  handleLeaveSession: () => void;
  handleResolveSessionEndPrompt: () => void;
  handleShareSession: () => Promise<void>;
  isSessionEndPromptOpen: boolean;
  isSessionHost: boolean;
  queueSessionSync: () => void;
  sessionConnectionStatus: SessionConnectionStatus;
  sessionError: string | null;
  sessionId: string;
};
