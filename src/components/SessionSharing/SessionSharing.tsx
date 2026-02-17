import { memo, useCallback, useMemo, useState } from "react";
import { Copy, Download, Link2, LogIn, LogOut, Share2, Trash2 } from "lucide-react";
import type { SessionSharingProps } from "./SessionSharing.types";
import {
  sessionCardClassName,
  sessionInputClassName,
  sessionLabelClassName,
  sessionPrimaryButtonClassName,
  sessionSecondaryButtonClassName,
  sessionStatusBadgeBaseClassName,
} from "./SessionSharing.styles";
import { getSessionStatusLabel, getSessionStatusToneClassName } from "./SessionSharing.utilities";

const SessionSharing = ({
  sessionConnectionStatus,
  sessionError,
  sessionId,
  isSessionHost,
  isSessionEndPromptOpen,
  sessionParticipants,
  onClearSessionError,
  onCopySessionId,
  onHandleSessionEndDownload,
  onHandleSessionEndDiscard,
  onJoinSession,
  onKickSessionUser,
  onLeaveSession,
  onResolveSessionEndPrompt,
  onShareSession,
}: SessionSharingProps) => {
  const [joinSessionIdDraft, setJoinSessionIdDraft] = useState("");
  const [joinSessionUserNameDraft, setJoinSessionUserNameDraft] = useState("");
  const [isSessionActionPending, setIsSessionActionPending] = useState(false);

  const runSessionAction = useCallback(
    async (action: () => Promise<void>) => {
      setIsSessionActionPending(true);
      onClearSessionError();

      try {
        await action();
      } catch {
        // Session error state is set in the collaboration hook.
      } finally {
        setIsSessionActionPending(false);
      }
    },
    [onClearSessionError]
  );

  const sessionStatusLabel = useMemo(
    () => getSessionStatusLabel(sessionConnectionStatus),
    [sessionConnectionStatus]
  );
  const sessionStatusToneClassName = useMemo(
    () => getSessionStatusToneClassName(sessionConnectionStatus),
    [sessionConnectionStatus]
  );
  const leaveButtonLabel = isSessionHost ? "End Session" : "Leave";
  const isConnected = sessionConnectionStatus === "connected";
  const connectionDotClassName = isConnected ? "bg-[#4f8a2d]" : "bg-[#b13f2f]";

  return (
    <div className={sessionCardClassName}>
      <div className="mb-2 flex items-center justify-between">
        <label className={sessionLabelClassName}>SESSION</label>
        <span className={`${sessionStatusBadgeBaseClassName} ${sessionStatusToneClassName}`}>
          <span
            aria-hidden
            className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${connectionDotClassName}`}
          />
          {sessionStatusLabel}
        </span>
      </div>
      <div className="mb-2 flex gap-2">
        <button
          onClick={() => {
            void runSessionAction(onShareSession);
          }}
          disabled={isSessionActionPending}
          className={`${sessionPrimaryButtonClassName} flex-1 inline-flex items-center justify-center gap-1`}
        >
          <Share2 size={14} />
          Share Session
        </button>
        <button
          onClick={onLeaveSession}
          disabled={isSessionActionPending || !sessionId}
          className={`${sessionSecondaryButtonClassName} flex-1 inline-flex items-center justify-center gap-1`}
        >
          <LogOut size={14} />
          {leaveButtonLabel}
        </button>
      </div>
      <div className="mb-2 flex gap-2">
        <input
          type="text"
          value={joinSessionIdDraft}
          onChange={(event) => {
            setJoinSessionIdDraft(event.target.value);
            if (sessionError) {
              onClearSessionError();
            }
          }}
          placeholder="Paste session ID"
          className={`${sessionInputClassName} flex-1`}
        />
        <input
          type="text"
          value={joinSessionUserNameDraft}
          onChange={(event) => {
            setJoinSessionUserNameDraft(event.target.value);
            if (sessionError) {
              onClearSessionError();
            }
          }}
          placeholder="Username"
          className={`${sessionInputClassName} flex-1`}
        />
        <button
          onClick={() => {
            const normalizedSessionId = joinSessionIdDraft.trim();
            const normalizedUserName = joinSessionUserNameDraft.trim();
            if (!normalizedSessionId || !normalizedUserName) {
              return;
            }

            void runSessionAction(async () => {
              await onJoinSession({
                sessionId: normalizedSessionId,
                username: normalizedUserName,
              });
            });
          }}
          disabled={isSessionActionPending}
          className={`${sessionPrimaryButtonClassName} inline-flex items-center justify-center gap-1`}
        >
          <LogIn size={14} />
          Join
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={sessionId || "No active session"}
          readOnly
          className={`${sessionInputClassName} flex-1`}
        />
        <button
          onClick={() => {
            void runSessionAction(onCopySessionId);
          }}
          disabled={isSessionActionPending || !sessionId}
          className={`${sessionSecondaryButtonClassName} inline-flex items-center justify-center gap-1`}
          aria-label="Copy session ID"
        >
          <Copy size={14} />
          Copy
        </button>
      </div>
      {isConnected && sessionParticipants.length > 0 ? (
        <div className="mt-2 rounded-md border border-[#b8b5aa] bg-[#f4f3ee] p-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#515a6a]">
            Users In Session
          </div>
          <ul className="space-y-1">
            {sessionParticipants.map((participant) => (
              <li
                key={participant.clientId}
                className="flex items-center justify-between gap-2 text-[11px] text-[#515a6a]"
              >
                <span className="truncate">
                  {participant.isHost ? "Host" : participant.username}
                  {participant.isSelf ? " (You)" : ""}
                </span>
                {isSessionHost && !participant.isHost ? (
                  <button
                    type="button"
                    onClick={() => onKickSessionUser(participant.clientId)}
                    className="rounded-md border border-[#b86557] bg-[#d88778] px-2 py-0.5 text-[10px] font-bold text-[#fdf7f5] transition-colors hover:bg-[#c87363]"
                  >
                    Kick
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {sessionError ? (
        <p className="mt-2 text-[11px] text-[#a6382f] inline-flex items-center gap-1">
          <Link2 size={12} />
          {sessionError}
        </p>
      ) : null}
      {isSessionEndPromptOpen ? (
        <div className="mt-3 rounded-md border border-[#d7b389] bg-[#fff7eb] p-2">
          <p className="text-[11px] text-[#7a5a31]">
            Session ended. Download the project, then clear shared samples and metadata.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                void runSessionAction(onHandleSessionEndDownload);
              }}
              disabled={isSessionActionPending}
              className={`${sessionPrimaryButtonClassName} flex-1 inline-flex items-center justify-center gap-1`}
            >
              <Download size={13} />
              Download
            </button>
            <button
              onClick={() => {
                onHandleSessionEndDiscard();
              }}
              disabled={isSessionActionPending}
              className={`${sessionSecondaryButtonClassName} flex-1 inline-flex items-center justify-center gap-1`}
            >
              <Trash2 size={13} />
              Discard
            </button>
          </div>
          <button
            onClick={onResolveSessionEndPrompt}
            className="mt-2 text-[10px] text-[#7a5a31] underline"
          >
            Remind me later
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default memo(SessionSharing);
