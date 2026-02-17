import type { SessionConnectionStatus } from "../DrumpadController/hooks/session-collaboration";

export const getSessionStatusLabel = (sessionConnectionStatus: SessionConnectionStatus): string => {
  if (sessionConnectionStatus === "connected") {
    return "Connected";
  }

  if (sessionConnectionStatus === "connecting") {
    return "Connecting";
  }

  return "Disconnected";
};

export const getSessionStatusToneClassName = (
  sessionConnectionStatus: SessionConnectionStatus
): string => {
  if (sessionConnectionStatus === "connected") {
    return "border-[#6f8f3b] text-[#46611d] bg-[#e8f2d4]";
  }

  if (sessionConnectionStatus === "connecting") {
    return "border-[#9096a1] text-[#515a6a] bg-[#e8ebef]";
  }

  return "border-[#b8b5aa] text-[#5f5f5f] bg-[#ecebe6]";
};
