import { randomBytes } from "node:crypto";
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { z } from "zod";

const DEFAULT_PORT = 8787;
const MAX_WS_PAYLOAD_BYTES = 32 * 1024 * 1024;
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_SESSION_SAMPLES = 512;
const MAX_SAMPLES_PER_UPDATE = 16;
const MAX_SAMPLE_BYTES = 24 * 1024 * 1024;
const MAX_SAMPLE_NAME_LENGTH = 120;
const MAX_SAMPLE_ID_LENGTH = 256;
const MAX_SAMPLE_TAGS = 32;
const MAX_TAG_LENGTH = 48;
const MAX_RELATIVE_PATH_LENGTH = 512;
const MAX_MUSICAL_KEY_LENGTH = 16;
const MAX_USERNAME_LENGTH = 32;
const MAX_MESSAGES_PER_MINUTE = 240;
const MAX_CHAT_MESSAGES_PER_MINUTE = 20;
const MAX_CHAT_MESSAGE_LENGTH = 500;
const MAX_CHAT_HISTORY_MESSAGES = 300;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PEERS_PER_SESSION = 12;
const SOCKET_OPEN_STATE = 1;

const ALLOWED_SAMPLE_CATEGORIES = [
  "kicks",
  "808s",
  "loops",
  "one shots",
  "chops",
  "hats",
  "snares",
  "fx",
  "crash",
  "tom",
  "bass",
  "vox",
  "vocals",
  "uncategorized",
];

const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/aac",
];

const SESSION_END_REASONS = ["owner_left", "ended_by_host", "owner_disconnected", "expired"];

const sessionIdSchema = z.string().regex(/^[A-Za-z0-9_-]{24,80}$/);
const clientIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,80}$/);
const usernameSchema = z.string().trim().min(1).max(MAX_USERNAME_LENGTH);

const sharedSampleSchema = z.object({
  id: z.string().min(1).max(MAX_SAMPLE_ID_LENGTH),
  name: z.string().min(1).max(MAX_SAMPLE_NAME_LENGTH),
  category: z.enum(ALLOWED_SAMPLE_CATEGORIES),
  tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).max(MAX_SAMPLE_TAGS),
  relativePath: z.string().max(MAX_RELATIVE_PATH_LENGTH).optional(),
  bpm: z.number().min(20).max(320).optional(),
  musicalKey: z.string().max(MAX_MUSICAL_KEY_LENGTH).optional(),
  mimeType: z.enum(ALLOWED_AUDIO_MIME_TYPES),
  dataBase64: z.string().min(1),
});

const createSessionMessageSchema = z.object({
  type: z.literal("create_session"),
  clientId: clientIdSchema,
});

const joinSessionMessageSchema = z.object({
  type: z.literal("join_session"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
  username: usernameSchema,
});

const leaveSessionMessageSchema = z.object({
  type: z.literal("leave_session"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
});

const endSessionMessageSchema = z.object({
  type: z.literal("end_session"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
});

const kickUserMessageSchema = z.object({
  type: z.literal("kick_user"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
  targetClientId: clientIdSchema,
});

const sendChatMessageSchema = z.object({
  type: z.literal("send_chat_message"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
  message: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

const upsertStateMessageSchema = z.object({
  type: z.literal("upsert_state"),
  clientId: clientIdSchema,
  sessionId: sessionIdSchema,
  payload: z
    .object({
      projectState: z.record(z.string(), z.unknown()).optional(),
      sampleMetadataOverrides: z.record(z.string(), z.unknown()).optional(),
      samples: z.array(sharedSampleSchema).max(MAX_SAMPLES_PER_UPDATE).optional(),
    })
    .refine(
      (payload) =>
        payload.projectState !== undefined ||
        payload.sampleMetadataOverrides !== undefined ||
        (payload.samples?.length ?? 0) > 0,
      {
        message: "Payload must include projectState/sampleMetadataOverrides and/or samples.",
      }
    )
    .refine(
      (payload) =>
        (payload.projectState === undefined) === (payload.sampleMetadataOverrides === undefined),
      {
        message: "projectState and sampleMetadataOverrides must be provided together.",
      }
    ),
});

const clientMessageSchema = z.union([
  createSessionMessageSchema,
  joinSessionMessageSchema,
  leaveSessionMessageSchema,
  endSessionMessageSchema,
  kickUserMessageSchema,
  sendChatMessageSchema,
  upsertStateMessageSchema,
]);

const sessions = new Map();
const clientStateBySocket = new WeakMap();

const allowedOrigins = (process.env.SESSION_SERVER_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (originHeader) => {
  if (!allowedOrigins.length) {
    return true;
  }

  if (!originHeader) {
    return false;
  }

  return allowedOrigins.includes(originHeader);
};

const makeSessionId = () => randomBytes(24).toString("base64url");
const now = () => Date.now();
const debugEnabled = process.env.SESSION_SERVER_DEBUG === "1";

const debugLog = (event, payload = {}) => {
  if (!debugEnabled) {
    return;
  }

  console.log(`[session-server] ${event}`, payload);
};

const sanitizeJson = (value, label) => {
  const json = JSON.stringify(value);
  if (!json) {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (json.length > MAX_JSON_BYTES) {
    throw new Error(`${label} exceeds the maximum payload size.`);
  }
  return JSON.parse(json);
};

const sanitizeSharedSample = (sample) => {
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(sample.dataBase64)) {
    throw new Error(`Sample "${sample.name}" contains invalid base64 data.`);
  }

  const normalizedBase64 = sample.dataBase64.replace(/\s+/g, "");
  const binary = Buffer.from(normalizedBase64, "base64");
  if (!binary.length) {
    throw new Error(`Sample "${sample.name}" is empty.`);
  }
  if (binary.length > MAX_SAMPLE_BYTES) {
    throw new Error(`Sample "${sample.name}" exceeds the max size (${MAX_SAMPLE_BYTES} bytes).`);
  }

  return {
    ...sample,
    dataBase64: normalizedBase64,
  };
};

const serializeSessionSnapshot = (session) => ({
  projectState: session.projectState,
  sampleMetadataOverrides: session.sampleMetadataOverrides,
  samples: Array.from(session.samplesById.values()),
});

const serializeChatHistory = (session) => {
  return [...session.chatMessages];
};

const serializeSessionParticipants = (session) => {
  return Array.from(session.participantNamesByClientId.entries())
    .map(([clientId, username]) => ({
      clientId,
      username,
      isHost: clientId === session.ownerClientId,
    }))
    .sort((left, right) => {
      if (left.isHost && !right.isHost) {
        return -1;
      }
      if (!left.isHost && right.isHost) {
        return 1;
      }

      return left.username.localeCompare(right.username);
    });
};

const broadcastSessionParticipants = (session) => {
  const participants = serializeSessionParticipants(session);
  for (const peer of session.clients) {
    sendMessage(peer, {
      type: "session_participants",
      sessionId: session.id,
      participants,
    });
  }
};

const reserveParticipantUsername = (session, requestedUsername, clientId) => {
  if (clientId === session.ownerClientId) {
    return "Host";
  }

  const normalizedBase = requestedUsername.trim().slice(0, MAX_USERNAME_LENGTH) || "User";
  const existingUsernames = new Set(
    Array.from(session.participantNamesByClientId.entries())
      .filter(([existingClientId]) => existingClientId !== clientId)
      .map(([, username]) => username.toLowerCase())
  );

  let candidate = normalizedBase;
  let suffix = 2;
  while (existingUsernames.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;
    const maxBaseLength = Math.max(1, MAX_USERNAME_LENGTH - suffixText.length);
    candidate = `${normalizedBase.slice(0, maxBaseLength)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
};

const sendMessage = (socket, message) => {
  if (socket.readyState !== SOCKET_OPEN_STATE) {
    return;
  }

  socket.send(JSON.stringify(message));
};

const broadcastSessionUpdate = (session, senderSocket, payload, senderClientId) => {
  for (const peer of session.clients) {
    if (peer === senderSocket) {
      continue;
    }

    sendMessage(peer, {
      type: "session_updated",
      sessionId: session.id,
      revision: session.revision,
      fromClientId: senderClientId,
      payload,
    });
  }
};

const attachSocketToSession = (socket, sessionId, clientId, username) => {
  const clientState = clientStateBySocket.get(socket);
  if (!clientState) {
    return;
  }

  if (clientState.sessionId && sessions.has(clientState.sessionId)) {
    const existingSession = sessions.get(clientState.sessionId);
    if (existingSession) {
      existingSession.clients.delete(socket);
      if (clientState.clientId) {
        existingSession.participantNamesByClientId.delete(clientState.clientId);
      }
      existingSession.updatedAt = now();
      broadcastSessionParticipants(existingSession);
    }
  }

  const targetSession = sessions.get(sessionId);
  if (!targetSession) {
    throw new Error("Session not found.");
  }

  if (targetSession.clients.size >= MAX_PEERS_PER_SESSION) {
    throw new Error("Session has reached the maximum number of peers.");
  }

  targetSession.clients.add(socket);
  targetSession.participantNamesByClientId.set(
    clientId,
    reserveParticipantUsername(targetSession, username, clientId)
  );
  targetSession.updatedAt = now();
  clientState.clientId = clientId;
  clientState.sessionId = sessionId;
};

const detachSocketFromSession = (socket) => {
  const clientState = clientStateBySocket.get(socket);
  if (!clientState?.sessionId) {
    return null;
  }

  const priorSessionId = clientState.sessionId;
  const priorClientId = clientState.clientId;
  const session = sessions.get(clientState.sessionId);
  if (session) {
    session.clients.delete(socket);
    if (clientState.clientId) {
      session.participantNamesByClientId.delete(clientState.clientId);
    }
    session.updatedAt = now();
  }

  clientState.sessionId = null;
  return { priorSessionId, priorClientId };
};

const rateLimitSocket = (socket) => {
  const state = clientStateBySocket.get(socket);
  if (!state) {
    return true;
  }

  const currentTime = now();
  const elapsed = currentTime - state.messageWindowStartedAt;
  if (elapsed >= 60_000) {
    state.messageWindowStartedAt = currentTime;
    state.messageCount = 0;
  }

  state.messageCount += 1;
  return state.messageCount <= MAX_MESSAGES_PER_MINUTE;
};

const rateLimitChatMessages = (socket) => {
  const state = clientStateBySocket.get(socket);
  if (!state) {
    return true;
  }

  const currentTime = now();
  const elapsed = currentTime - state.chatMessageWindowStartedAt;
  if (elapsed >= 60_000) {
    state.chatMessageWindowStartedAt = currentTime;
    state.chatMessageCount = 0;
  }

  state.chatMessageCount += 1;
  return state.chatMessageCount <= MAX_CHAT_MESSAGES_PER_MINUTE;
};

const clearSessionData = (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.samplesById.clear();
  session.chatMessages.length = 0;
  session.participantNamesByClientId.clear();
  session.projectState = {};
  session.sampleMetadataOverrides = {};
  session.updatedAt = now();
  sessions.delete(sessionId);
};

const endSession = (sessionId, endedByClientId, reason) => {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  const peers = Array.from(session.clients);
  const normalizedReason = SESSION_END_REASONS.includes(reason) ? reason : "ended_by_host";

  peers.forEach((peer) => {
    sendMessage(peer, {
      type: "session_ended",
      sessionId,
      endedByClientId,
      reason: normalizedReason,
    });
  });

  peers.forEach((peer) => {
    const peerState = clientStateBySocket.get(peer);
    if (peerState) {
      peerState.sessionId = null;
    }

    if (peer.readyState === SOCKET_OPEN_STATE) {
      try {
        peer.close(1000, "Session ended");
      } catch {
        // Ignore peer close failures.
      }
    }
  });

  clearSessionData(sessionId);
};

const pruneIdleSessions = () => {
  const currentTime = now();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.clients.size > 0) {
      continue;
    }

    if (currentTime - session.updatedAt > SESSION_TTL_MS) {
      endSession(sessionId, "system", "expired");
    }
  }
};

setInterval(pruneIdleSessions, 60_000).unref();

const app = Fastify({ logger: false });

await app.register(fastifyWebsocket, {
  options: {
    maxPayload: MAX_WS_PAYLOAD_BYTES,
  },
});

app.get("/health", async () => {
  return { ok: true, sessions: sessions.size };
});

app.get("/", { websocket: true }, (socket, request) => {
  const originHeader = request.headers.origin;
  if (!isOriginAllowed(originHeader)) {
    socket.close(1008, "Forbidden origin");
    return;
  }

  clientStateBySocket.set(socket, {
    clientId: null,
    sessionId: null,
    messageCount: 0,
    messageWindowStartedAt: now(),
    chatMessageCount: 0,
    chatMessageWindowStartedAt: now(),
  });

  socket.on("message", (rawPayload) => {
    try {
      if (!rateLimitSocket(socket)) {
        throw new Error("Rate limit exceeded.");
      }

      const payloadText = typeof rawPayload === "string" ? rawPayload : rawPayload.toString("utf8");
      if (payloadText.length > MAX_WS_PAYLOAD_BYTES) {
        throw new Error("Message exceeds maximum payload size.");
      }

      const parsedPayload = JSON.parse(payloadText);
      const message = clientMessageSchema.parse(parsedPayload);

      if (message.type === "create_session") {
        const sessionId = makeSessionId();
        sessions.set(sessionId, {
          id: sessionId,
          ownerClientId: message.clientId,
          revision: 0,
          updatedAt: now(),
          projectState: {},
          sampleMetadataOverrides: {},
          samplesById: new Map(),
          chatMessages: [],
          participantNamesByClientId: new Map(),
          clients: new Set(),
        });

        attachSocketToSession(socket, sessionId, message.clientId, "Host");
        const session = sessions.get(sessionId);
        sendMessage(socket, {
          type: "session_created",
          sessionId,
          revision: session.revision,
          snapshot: serializeSessionSnapshot(session),
          chatHistory: serializeChatHistory(session),
          participants: serializeSessionParticipants(session),
        });
        return;
      }

      if (message.type === "join_session") {
        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        attachSocketToSession(socket, message.sessionId, message.clientId, message.username);
        sendMessage(socket, {
          type: "session_joined",
          sessionId: session.id,
          revision: session.revision,
          snapshot: serializeSessionSnapshot(session),
          chatHistory: serializeChatHistory(session),
          participants: serializeSessionParticipants(session),
        });
        broadcastSessionParticipants(session);
        return;
      }

      if (message.type === "leave_session") {
        const clientState = clientStateBySocket.get(socket);
        if (!clientState || clientState.sessionId !== message.sessionId) {
          throw new Error("Socket is not joined to the requested session.");
        }

        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        if (session.ownerClientId === clientState.clientId) {
          endSession(session.id, clientState.clientId ?? message.clientId, "owner_left");
          return;
        }

        detachSocketFromSession(socket);
        sendMessage(socket, {
          type: "session_left",
          sessionId: message.sessionId,
        });
        broadcastSessionParticipants(session);
        return;
      }

      if (message.type === "end_session") {
        const clientState = clientStateBySocket.get(socket);
        if (!clientState || clientState.sessionId !== message.sessionId) {
          throw new Error("Socket is not joined to the requested session.");
        }

        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        if (session.ownerClientId !== clientState.clientId) {
          throw new Error("Only the session owner can end the session.");
        }

        endSession(session.id, clientState.clientId ?? message.clientId, "ended_by_host");
        return;
      }

      if (message.type === "kick_user") {
        const clientState = clientStateBySocket.get(socket);
        if (!clientState || clientState.sessionId !== message.sessionId) {
          throw new Error("Socket is not joined to the requested session.");
        }

        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        if (session.ownerClientId !== clientState.clientId) {
          throw new Error("Only the session owner can kick users.");
        }

        if (message.targetClientId === session.ownerClientId) {
          throw new Error("Session owner cannot be kicked.");
        }

        const targetSocket = Array.from(session.clients).find((peer) => {
          const peerState = clientStateBySocket.get(peer);
          return peerState?.clientId === message.targetClientId;
        });

        if (!targetSocket) {
          throw new Error("Target user not found in this session.");
        }

        const targetState = clientStateBySocket.get(targetSocket);
        if (targetState) {
          targetState.sessionId = null;
        }

        session.clients.delete(targetSocket);
        session.participantNamesByClientId.delete(message.targetClientId);
        session.updatedAt = now();

        sendMessage(targetSocket, {
          type: "session_kicked",
          sessionId: session.id,
          kickedByClientId: clientState.clientId ?? message.clientId,
        });

        if (targetSocket.readyState === SOCKET_OPEN_STATE) {
          try {
            targetSocket.close(1000, "Kicked by host");
          } catch {
            // Ignore peer close failures.
          }
        }

        broadcastSessionParticipants(session);
        return;
      }

      if (message.type === "upsert_state") {
        const clientState = clientStateBySocket.get(socket);
        if (!clientState || clientState.sessionId !== message.sessionId) {
          throw new Error("Socket is not joined to the requested session.");
        }

        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        const hasStatePayload =
          message.payload.projectState !== undefined &&
          message.payload.sampleMetadataOverrides !== undefined;
        if (hasStatePayload) {
          session.projectState = sanitizeJson(message.payload.projectState, "projectState");
          session.sampleMetadataOverrides = sanitizeJson(
            message.payload.sampleMetadataOverrides,
            "sampleMetadataOverrides"
          );
        }

        const incomingSamples = message.payload.samples ?? [];
        const newSampleCount = incomingSamples.filter(
          (sample) => !session.samplesById.has(sample.id)
        ).length;

        if (session.samplesById.size + newSampleCount > MAX_SESSION_SAMPLES) {
          throw new Error(`Session sample limit exceeded (${MAX_SESSION_SAMPLES}).`);
        }

        const sanitizedSamples = incomingSamples.map((sample) => sanitizeSharedSample(sample));
        for (const sample of sanitizedSamples) {
          session.samplesById.set(sample.id, sample);
        }

        session.revision += 1;
        session.updatedAt = now();

        const incrementalPayload = {
          ...(hasStatePayload
            ? {
                projectState: session.projectState,
                sampleMetadataOverrides: session.sampleMetadataOverrides,
              }
            : {}),
          ...(sanitizedSamples.length > 0 ? { samples: sanitizedSamples } : {}),
        };

        debugLog("upsert_state", {
          sessionId: session.id,
          revision: session.revision,
          hasStatePayload,
          sampleCount: sanitizedSamples.length,
          fromClientId: clientState.clientId ?? message.clientId,
        });

        broadcastSessionUpdate(
          session,
          socket,
          incrementalPayload,
          clientState.clientId ?? message.clientId
        );

        sendMessage(socket, {
          type: "session_sync_ack",
          sessionId: session.id,
          revision: session.revision,
        });
        return;
      }

      if (message.type === "send_chat_message") {
        const clientState = clientStateBySocket.get(socket);
        if (!clientState || clientState.sessionId !== message.sessionId) {
          throw new Error("Socket is not joined to the requested session.");
        }

        if (!rateLimitChatMessages(socket)) {
          throw new Error("Chat rate limit exceeded. Please slow down.");
        }

        const session = sessions.get(message.sessionId);
        if (!session) {
          throw new Error("Session not found.");
        }

        const senderClientId = clientState.clientId ?? message.clientId;
        const senderUsername = session.participantNamesByClientId.get(senderClientId) || "User";
        const chatMessage = {
          id: randomBytes(12).toString("base64url"),
          senderClientId,
          senderUsername,
          message: message.message.trim(),
          createdAt: new Date().toISOString(),
        };

        session.chatMessages.push(chatMessage);
        if (session.chatMessages.length > MAX_CHAT_HISTORY_MESSAGES) {
          session.chatMessages.splice(0, session.chatMessages.length - MAX_CHAT_HISTORY_MESSAGES);
        }
        session.updatedAt = now();

        for (const peer of session.clients) {
          sendMessage(peer, {
            type: "chat_message",
            sessionId: session.id,
            chatMessage,
          });
        }

        debugLog("chat_message", {
          sessionId: session.id,
          senderClientId,
          messageLength: chatMessage.message.length,
        });
      }
    } catch (error) {
      sendMessage(socket, {
        type: "error",
        message: error instanceof Error ? error.message : "Invalid message payload.",
      });
    }
  });

  socket.on("close", () => {
    const clientState = clientStateBySocket.get(socket);
    const priorSessionId = clientState?.sessionId ?? null;
    const priorClientId = clientState?.clientId ?? "unknown";

    detachSocketFromSession(socket);
    clientStateBySocket.delete(socket);

    if (!priorSessionId) {
      return;
    }

    const session = sessions.get(priorSessionId);
    if (!session) {
      return;
    }

    if (session.ownerClientId === priorClientId) {
      endSession(priorSessionId, priorClientId, "owner_disconnected");
      return;
    }

    broadcastSessionParticipants(session);
  });
});

const port = Number(process.env.PORT || process.env.SESSION_SERVER_PORT || DEFAULT_PORT);
await app.listen({ port, host: "0.0.0.0" });

console.log(`[session-server] listening on port ${port}`);
if (allowedOrigins.length) {
  console.log(`[session-server] allowed origins: ${allowedOrigins.join(", ")}`);
} else {
  console.log("[session-server] allowed origins: * (all)");
}
