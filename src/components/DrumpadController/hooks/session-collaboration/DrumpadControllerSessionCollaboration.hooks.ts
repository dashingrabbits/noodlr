import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SampleAsset,
  SampleMetadataOverrides,
} from "../../../../integrations/samples/sample.types";
import { writeSampleMetadataOverrides } from "../../../../integrations/samples/sample.utilities";
import { encodeAudioBufferToWav } from "../../../KitManager/KitManager.utilities";
import { collectProjectReferencedSampleIds } from "../../helpers/project";
import {
  SESSION_MAX_SAMPLES_PER_UPDATE,
  SESSION_SYNC_DEBOUNCE_MS,
} from "./DrumpadControllerSessionCollaboration.constants";
import {
  base64ToBlob,
  blobToBase64,
  createCollaborativeProjectState,
  mergeCollaborativeProjectStateWithLocalView,
  createSampleAssetFromSharedSample,
  createSessionClientId,
  createSessionStateHash,
  getSessionServerUrl,
  inferAudioMimeType,
  isSessionSyncDebugEnabled,
  isValidSessionId,
  normalizeSessionIdInput,
  parseSessionServerMessage,
  readWebSocketMessageText,
} from "./DrumpadControllerSessionCollaboration.utilities";
import type {
  PendingSessionAction,
  SessionClientMessage,
  SessionConnectionStatus,
  SessionServerMessage,
  SessionSnapshotPayload,
  SessionUpdatePayload,
  SharedSessionSample,
  UseSessionCollaborationInput,
  UseSessionCollaborationResult,
} from "./DrumpadControllerSessionCollaboration.types";

export const useSessionCollaboration = ({
  activePadGroupIdRef,
  activeSceneRef,
  applyProjectState,
  buildProjectStateSnapshot,
  ensureSampleBuffer,
  importedSampleObjectUrlsRef,
  livePadGroupsStateRef,
  sampleAssetsById,
  sampleMetadataOverrides,
  sequencerPanelModeRef,
  setImportedSampleAssets,
  setSampleMetadataOverrides,
}: UseSessionCollaborationInput): UseSessionCollaborationResult => {
  const [sessionConnectionStatus, setSessionConnectionStatus] =
    useState<SessionConnectionStatus>("disconnected");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [isSessionHost, setIsSessionHost] = useState(false);
  const [isSessionEndPromptOpen, setIsSessionEndPromptOpen] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingSessionActionRef = useRef<PendingSessionAction | null>(null);
  const intentionalSocketCloseRef = useRef(false);
  const clientIdRef = useRef(createSessionClientId());
  const uploadedSampleIdsRef = useRef<Set<string>>(new Set());
  const sessionSampleIdsRef = useRef<Set<string>>(new Set());
  const remoteSampleObjectUrlByIdRef = useRef<Map<string, string>>(new Map());
  const syncTimerRef = useRef<number | null>(null);
  const syncQueuedRef = useRef(false);
  const forceSyncQueuedRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const flushSessionSyncRef = useRef<(forceSync?: boolean) => Promise<void>>(async () => {
    return;
  });
  const localStateVersionRef = useRef(0);
  const isApplyingRemoteUpdateRef = useRef(false);
  const lastSyncedStateHashRef = useRef("");
  const remoteStateVersionRef = useRef(0);
  const debugEnabledRef = useRef(isSessionSyncDebugEnabled());

  const debugSync = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!debugEnabledRef.current) {
      return;
    }

    console.info(`[session-sync] ${event}`, payload || {});
  }, []);

  const resetSyncSchedulingState = useCallback(() => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }

    syncQueuedRef.current = false;
    forceSyncQueuedRef.current = false;
    syncInFlightRef.current = false;
  }, []);

  const resetSessionState = useCallback(() => {
    setSessionConnectionStatus("disconnected");
    setSessionId("");
    setIsSessionHost(false);
    uploadedSampleIdsRef.current.clear();
    resetSyncSchedulingState();
    lastSyncedStateHashRef.current = "";
    remoteStateVersionRef.current = 0;
    localStateVersionRef.current = 0;
  }, [resetSyncSchedulingState]);

  const rejectPendingSessionAction = useCallback((message: string) => {
    const pendingAction = pendingSessionActionRef.current;
    if (!pendingAction) {
      return;
    }

    pendingSessionActionRef.current = null;
    pendingAction.reject(new Error(message));
  }, []);

  const resolvePendingSessionAction = useCallback((kind: PendingSessionAction["kind"]) => {
    const pendingAction = pendingSessionActionRef.current;
    if (!pendingAction || pendingAction.kind !== kind) {
      return;
    }

    pendingSessionActionRef.current = null;
    pendingAction.resolve();
  }, []);

  const sendSocketMessage = useCallback((message: SessionClientMessage): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const closeSocketConnection = useCallback(
    (options?: { keepError?: boolean }) => {
      const socket = socketRef.current;
      if (socket) {
        intentionalSocketCloseRef.current = true;
        socket.close();
        socketRef.current = null;
      }

      if (!options?.keepError) {
        setSessionError(null);
      }

      rejectPendingSessionAction("Session connection closed.");
      resetSessionState();
    },
    [rejectPendingSessionAction, resetSessionState]
  );

  const clearSessionEnvironment = useCallback(() => {
    remoteSampleObjectUrlByIdRef.current.forEach((objectUrl) => {
      window.URL.revokeObjectURL(objectUrl);
      importedSampleObjectUrlsRef.current.delete(objectUrl);
    });
    remoteSampleObjectUrlByIdRef.current.clear();

    setImportedSampleAssets((previous) => {
      if (!sessionSampleIdsRef.current.size) {
        return previous;
      }

      return previous.filter((sample) => !sessionSampleIdsRef.current.has(sample.id));
    });

    setSampleMetadataOverrides(() => {
      const nextOverrides: SampleMetadataOverrides = {};
      writeSampleMetadataOverrides(nextOverrides);
      return nextOverrides;
    });

    sessionSampleIdsRef.current.clear();
    setIsSessionEndPromptOpen(false);
    setSessionError(null);
  }, [
    importedSampleObjectUrlsRef,
    setImportedSampleAssets,
    setSampleMetadataOverrides,
  ]);

  const buildSharedSamplePayload = useCallback(
    async (sample: SampleAsset): Promise<SharedSessionSample | null> => {
      let sourceBlob: Blob | null = null;
      let sourceMimeType = inferAudioMimeType(null, sample.name, sample.previewUrl);

      try {
        const response = await fetch(sample.previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch sample payload: ${sample.name}`);
        }

        sourceMimeType = inferAudioMimeType(
          response.headers.get("content-type"),
          sample.name,
          sample.previewUrl
        );

        const responseBlob = await response.blob();
        sourceBlob =
          responseBlob.type && responseBlob.type.startsWith("audio/")
            ? responseBlob
            : new Blob([responseBlob], { type: sourceMimeType });
      } catch {
        const sampleBuffer = await ensureSampleBuffer(sample);
        if (!sampleBuffer) {
          return null;
        }

        const wavBuffer = encodeAudioBufferToWav(sampleBuffer);
        sourceMimeType = "audio/wav";
        sourceBlob = new Blob([wavBuffer], { type: sourceMimeType });
      }

      const dataBase64 = await blobToBase64(sourceBlob);
      return {
        id: sample.id,
        name: sample.name,
        category: sample.category,
        tags: sample.tags,
        relativePath: sample.relativePath,
        bpm: sample.bpm,
        musicalKey: sample.musicalKey,
        mimeType: sourceMimeType,
        dataBase64,
      };
    },
    [ensureSampleBuffer]
  );

  const applyIncomingSessionSnapshot = useCallback(
    (snapshot: SessionSnapshotPayload | SessionUpdatePayload) => {
      remoteStateVersionRef.current += 1;
      const inboundVersion = remoteStateVersionRef.current;
      isApplyingRemoteUpdateRef.current = true;
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      syncQueuedRef.current = false;
      forceSyncQueuedRef.current = false;

      try {
        const incomingSamples = Array.isArray(snapshot.samples) ? snapshot.samples : [];
        if (incomingSamples.length > 0) {
          setImportedSampleAssets((previous) => {
            const nextImportedById = new Map(previous.map((sample) => [sample.id, sample]));

            incomingSamples.forEach((sharedSample) => {
              const existingObjectUrl = remoteSampleObjectUrlByIdRef.current.get(sharedSample.id);
              if (existingObjectUrl) {
                window.URL.revokeObjectURL(existingObjectUrl);
                importedSampleObjectUrlsRef.current.delete(existingObjectUrl);
              }

              const sampleBlob = base64ToBlob(sharedSample.dataBase64, sharedSample.mimeType);
              const sampleObjectUrl = window.URL.createObjectURL(sampleBlob);
              importedSampleObjectUrlsRef.current.add(sampleObjectUrl);
              remoteSampleObjectUrlByIdRef.current.set(sharedSample.id, sampleObjectUrl);
              sessionSampleIdsRef.current.add(sharedSample.id);

              nextImportedById.set(
                sharedSample.id,
                createSampleAssetFromSharedSample(sharedSample, sampleObjectUrl)
              );
              uploadedSampleIdsRef.current.add(sharedSample.id);
            });

            return Array.from(nextImportedById.values());
          });
        }

        const incomingProjectState = snapshot.projectState;
        const incomingMetadataOverrides = snapshot.sampleMetadataOverrides;
        if (incomingProjectState !== undefined && incomingMetadataOverrides !== undefined) {
          const localActivePadGroupId = activePadGroupIdRef.current;
          const localPadGroupsState = livePadGroupsStateRef.current;
          const localActivePadGroupState = localPadGroupsState[localActivePadGroupId];
          const localProjectState = {
            activePadGroupId: localActivePadGroupId,
            activePatternId: localActivePadGroupState?.activePatternId ?? "",
            activeSceneId: activeSceneRef.current?.id,
            sequencerPanelMode: sequencerPanelModeRef.current,
            padGroups: localPadGroupsState,
          };
          const collaborativeIncomingProjectState =
            createCollaborativeProjectState(incomingProjectState);
          const incomingProjectStateWithLocalView = mergeCollaborativeProjectStateWithLocalView(
            collaborativeIncomingProjectState,
            localProjectState
          );
          const inboundStateHash = createSessionStateHash(
            collaborativeIncomingProjectState,
            incomingMetadataOverrides
          );
          if (
            inboundStateHash === lastSyncedStateHashRef.current &&
            incomingSamples.length === 0
          ) {
            debugSync("skip_remote_state_reapply", { inboundVersion });
            return;
          }

          setSampleMetadataOverrides(() => {
            writeSampleMetadataOverrides(incomingMetadataOverrides);
            return incomingMetadataOverrides;
          });

          applyProjectState(incomingProjectStateWithLocalView, {
            preserveTransport: true,
          });
          lastSyncedStateHashRef.current = inboundStateHash;
          localStateVersionRef.current += 1;
          debugSync("apply_remote_state", {
            inboundVersion,
            sampleCount: incomingSamples.length,
          });
        } else if (incomingSamples.length > 0) {
          debugSync("apply_remote_samples_only", {
            inboundVersion,
            sampleCount: incomingSamples.length,
          });
        }
      } finally {
        window.setTimeout(() => {
          if (remoteStateVersionRef.current === inboundVersion) {
            isApplyingRemoteUpdateRef.current = false;
          }
        }, 0);
      }
    },
    [
      activePadGroupIdRef,
      activeSceneRef,
      applyProjectState,
      debugSync,
      importedSampleObjectUrlsRef,
      livePadGroupsStateRef,
      sequencerPanelModeRef,
      setImportedSampleAssets,
      setSampleMetadataOverrides,
    ]
  );

  const flushSessionSync = useCallback(
    async (forceSync = false) => {
      const socket = socketRef.current;
      if (
        !socket ||
        socket.readyState !== WebSocket.OPEN ||
        sessionConnectionStatus !== "connected" ||
        !sessionId ||
        isApplyingRemoteUpdateRef.current
      ) {
        return;
      }

      if (syncInFlightRef.current) {
        syncQueuedRef.current = true;
        forceSyncQueuedRef.current = forceSyncQueuedRef.current || forceSync;
        return;
      }

      syncInFlightRef.current = true;

      try {
        const outboundLocalStateVersion = localStateVersionRef.current;
        const outboundVersion = remoteStateVersionRef.current;
        const projectState = createCollaborativeProjectState(buildProjectStateSnapshot());
        const nextStateHash = createSessionStateHash(projectState, sampleMetadataOverrides);
        const referencedSampleIds = collectProjectReferencedSampleIds(projectState);
        const sampleIdsPendingUpload = referencedSampleIds.filter((sampleId) => {
          return sampleAssetsById.has(sampleId) && !uploadedSampleIdsRef.current.has(sampleId);
        });
        const sampleIdsForCurrentUpdate = sampleIdsPendingUpload.slice(0, SESSION_MAX_SAMPLES_PER_UPDATE);

        const shouldSendStateUpdate = forceSync || nextStateHash !== lastSyncedStateHashRef.current;
        if (!shouldSendStateUpdate && sampleIdsForCurrentUpdate.length === 0) {
          return;
        }

        const uploadedSamples: SharedSessionSample[] = [];
        for (const sampleId of sampleIdsForCurrentUpdate) {
          const sample = sampleAssetsById.get(sampleId);
          if (!sample) {
            continue;
          }

          const sharedSamplePayload = await buildSharedSamplePayload(sample);
          if (!sharedSamplePayload) {
            continue;
          }

          uploadedSamples.push(sharedSamplePayload);
        }

        if (outboundVersion !== remoteStateVersionRef.current || isApplyingRemoteUpdateRef.current) {
          syncQueuedRef.current = true;
          forceSyncQueuedRef.current = forceSyncQueuedRef.current || shouldSendStateUpdate;
          return;
        }

        if (outboundLocalStateVersion !== localStateVersionRef.current) {
          syncQueuedRef.current = true;
          forceSyncQueuedRef.current = forceSyncQueuedRef.current || shouldSendStateUpdate;
          return;
        }

        const upsertPayload: {
          projectState?: Partial<ReturnType<typeof buildProjectStateSnapshot>>;
          sampleMetadataOverrides?: SampleMetadataOverrides;
          samples?: SharedSessionSample[];
        } = {
          ...(uploadedSamples.length > 0 ? { samples: uploadedSamples } : {}),
        };

        if (shouldSendStateUpdate) {
          upsertPayload.projectState = projectState;
          upsertPayload.sampleMetadataOverrides = sampleMetadataOverrides;
        }

        const didSend = sendSocketMessage({
          type: "upsert_state",
          clientId: clientIdRef.current,
          sessionId,
          payload: upsertPayload,
        });

        if (!didSend) {
          throw new Error("Session connection is not ready for sync.");
        }

        if (shouldSendStateUpdate) {
          lastSyncedStateHashRef.current = nextStateHash;
        }
        debugSync("send_upsert_state", {
          shouldSendStateUpdate,
          uploadedSampleCount: uploadedSamples.length,
          localStateVersion: localStateVersionRef.current,
          remoteStateVersion: remoteStateVersionRef.current,
        });
        uploadedSamples.forEach((sample) => uploadedSampleIdsRef.current.add(sample.id));

        if (sampleIdsPendingUpload.length > sampleIdsForCurrentUpdate.length) {
          syncQueuedRef.current = true;
          forceSyncQueuedRef.current = true;
        }
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : "Unable to sync session state.");
      } finally {
        syncInFlightRef.current = false;

        if (syncQueuedRef.current) {
          const nextForceSync = forceSyncQueuedRef.current;
          syncQueuedRef.current = false;
          forceSyncQueuedRef.current = false;
          window.setTimeout(() => {
            void flushSessionSyncRef.current(nextForceSync);
          }, 0);
        }
      }
    },
    [
      buildProjectStateSnapshot,
      buildSharedSamplePayload,
      debugSync,
      sampleAssetsById,
      sampleMetadataOverrides,
      sendSocketMessage,
      sessionConnectionStatus,
      sessionId,
    ]
  );

  const queueSessionSync = useCallback(() => {
    if (
      sessionConnectionStatus !== "connected" ||
      !sessionId ||
      isApplyingRemoteUpdateRef.current
    ) {
      return;
    }

    localStateVersionRef.current += 1;
    syncQueuedRef.current = true;

    if (syncTimerRef.current !== null) {
      return;
    }

      syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null;

      if (!syncQueuedRef.current) {
        return;
      }

      syncQueuedRef.current = false;
      void flushSessionSyncRef.current(forceSyncQueuedRef.current);
      forceSyncQueuedRef.current = false;
    }, SESSION_SYNC_DEBOUNCE_MS);
  }, [flushSessionSync, sessionConnectionStatus, sessionId]);

  useEffect(() => {
    flushSessionSyncRef.current = flushSessionSync;
  }, [flushSessionSync]);

  const openSocketConnection = useCallback(async (): Promise<WebSocket> => {
    const existingSocket = socketRef.current;
    if (
      existingSocket &&
      (existingSocket.readyState === WebSocket.OPEN ||
        existingSocket.readyState === WebSocket.CONNECTING)
    ) {
      closeSocketConnection({ keepError: true });
    }

    const wsUrl = getSessionServerUrl();
    if (!wsUrl) {
      throw new Error("Missing session server URL.");
    }

    setSessionError(null);
    setSessionConnectionStatus("connecting");

    const socket = await new Promise<WebSocket>((resolve, reject) => {
      const nextSocket = new WebSocket(wsUrl);

      nextSocket.onopen = () => {
        resolve(nextSocket);
      };

      nextSocket.onerror = () => {
        reject(new Error("Unable to connect to the session server."));
      };
    });

    socketRef.current = socket;
    setSessionConnectionStatus("connected");

    socket.onmessage = (event) => {
      void (async () => {
        try {
          const messageText = await readWebSocketMessageText(event.data);
          const rawPayload = JSON.parse(messageText) as unknown;
          const parsedMessage = parseSessionServerMessage(rawPayload);
          if (!parsedMessage) {
            return;
          }

          const message = parsedMessage as SessionServerMessage;
          if (message.type === "session_created") {
            setSessionId(message.sessionId);
            setIsSessionHost(true);
            setIsSessionEndPromptOpen(false);
            uploadedSampleIdsRef.current = new Set(
              message.snapshot.samples.map((sample) => sample.id)
            );
            resolvePendingSessionAction("create");
            forceSyncQueuedRef.current = true;
            queueSessionSync();
            debugSync("session_created", {
              sessionId: message.sessionId,
              revision: message.revision,
            });
            return;
          }

          if (message.type === "session_joined") {
            setSessionId(message.sessionId);
            setIsSessionHost(false);
            setIsSessionEndPromptOpen(false);
            uploadedSampleIdsRef.current = new Set(
              message.snapshot.samples.map((sample) => sample.id)
            );
            applyIncomingSessionSnapshot(message.snapshot);
            resolvePendingSessionAction("join");
            debugSync("session_joined", {
              sessionId: message.sessionId,
              revision: message.revision,
            });
            return;
          }

          if (message.type === "session_updated") {
            uploadedSampleIdsRef.current = new Set([
              ...uploadedSampleIdsRef.current,
              ...(message.payload.samples ?? []).map((sample) => sample.id),
            ]);
            applyIncomingSessionSnapshot(message.payload);
            debugSync("session_updated", {
              sessionId: message.sessionId,
              revision: message.revision,
              hasStatePayload:
                message.payload.projectState !== undefined &&
                message.payload.sampleMetadataOverrides !== undefined,
              sampleCount: message.payload.samples?.length ?? 0,
            });
            return;
          }

          if (message.type === "session_sync_ack") {
            debugSync("session_sync_ack", {
              sessionId: message.sessionId,
              revision: message.revision,
            });
            return;
          }

          if (message.type === "session_left") {
            closeSocketConnection();
            return;
          }

          if (message.type === "session_ended") {
            setIsSessionEndPromptOpen(true);
            closeSocketConnection({ keepError: true });
            return;
          }

          if (message.type === "error") {
            setSessionError(message.message);
            rejectPendingSessionAction(message.message);
            closeSocketConnection({ keepError: true });
          }
        } catch (error) {
          setSessionError(error instanceof Error ? error.message : "Session message parse error.");
        }
      })();
    };

    socket.onclose = () => {
      const wasIntentional = intentionalSocketCloseRef.current;
      intentionalSocketCloseRef.current = false;
      socketRef.current = null;

      if (!wasIntentional) {
        setSessionError("Session disconnected. Reconnect to continue sharing.");
        rejectPendingSessionAction("Session connection lost.");
      }

      resetSessionState();
    };

    socket.onerror = () => {
      setSessionError("Session server connection error.");
    };

    return socket;
  }, [
    applyIncomingSessionSnapshot,
    closeSocketConnection,
    debugSync,
    queueSessionSync,
    rejectPendingSessionAction,
    resetSessionState,
    resolvePendingSessionAction,
  ]);

  const handleShareSession = useCallback(async () => {
    try {
      const socket = await openSocketConnection();

      await new Promise<void>((resolve, reject) => {
        pendingSessionActionRef.current = {
          kind: "create",
          resolve,
          reject,
        };

        const didSend = sendSocketMessage({
          type: "create_session",
          clientId: clientIdRef.current,
        });

        if (!didSend) {
          pendingSessionActionRef.current = null;
          reject(new Error("Unable to create a new session."));
        }
      });

      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error("Session server is unavailable.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create a new session.";
      setSessionError(message);
      throw error;
    }
  }, [openSocketConnection, sendSocketMessage]);

  const handleJoinSession = useCallback(
    async (candidateSessionId: string) => {
      try {
        const normalizedSessionId = normalizeSessionIdInput(candidateSessionId);
        if (!isValidSessionId(normalizedSessionId)) {
          throw new Error("Session ID format is invalid.");
        }

        const socket = await openSocketConnection();

        await new Promise<void>((resolve, reject) => {
          pendingSessionActionRef.current = {
            kind: "join",
            resolve,
            reject,
          };

          const didSend = sendSocketMessage({
            type: "join_session",
            clientId: clientIdRef.current,
            sessionId: normalizedSessionId,
          });

          if (!didSend) {
            pendingSessionActionRef.current = null;
            reject(new Error("Unable to join the session."));
          }
        });

        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error("Session server is unavailable.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to join the session.";
        setSessionError(message);
        throw error;
      }
    },
    [openSocketConnection, sendSocketMessage]
  );

  const handleLeaveSession = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !sessionId) {
      closeSocketConnection();
      return;
    }

    if (isSessionHost) {
      const didSend = sendSocketMessage({
        type: "end_session",
        clientId: clientIdRef.current,
        sessionId,
      });

      if (!didSend) {
        setIsSessionEndPromptOpen(true);
        closeSocketConnection({ keepError: true });
      }

      return;
    }

    sendSocketMessage({
      type: "leave_session",
      clientId: clientIdRef.current,
      sessionId,
    });
    closeSocketConnection();
  }, [closeSocketConnection, isSessionHost, sendSocketMessage, sessionId]);

  const copySessionId = useCallback(async () => {
    try {
      if (!sessionId) {
        throw new Error("No active session to copy.");
      }

      if (!navigator.clipboard) {
        throw new Error("Clipboard API is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to copy session ID.";
      setSessionError(message);
      throw error;
    }
  }, [sessionId]);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  const handleResolveSessionEndPrompt = useCallback(() => {
    setIsSessionEndPromptOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      remoteSampleObjectUrlByIdRef.current.forEach((objectUrl) => {
        window.URL.revokeObjectURL(objectUrl);
        importedSampleObjectUrlsRef.current.delete(objectUrl);
      });
      remoteSampleObjectUrlByIdRef.current.clear();
      sessionSampleIdsRef.current.clear();
      closeSocketConnection({ keepError: true });
    };
  }, [closeSocketConnection, importedSampleObjectUrlsRef]);

  return {
    clearSessionEnvironment,
    clearSessionError,
    copySessionId,
    handleJoinSession,
    handleLeaveSession,
    handleResolveSessionEndPrompt,
    handleShareSession,
    isSessionEndPromptOpen,
    isSessionHost,
    queueSessionSync,
    sessionConnectionStatus,
    sessionError,
    sessionId,
  };
};
