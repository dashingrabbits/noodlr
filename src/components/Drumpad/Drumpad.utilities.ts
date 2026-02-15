export const PAD_NAME_MAX_LENGTH = 12;

export const sanitizePadName = (value: string): string => {
  return value.slice(0, PAD_NAME_MAX_LENGTH);
};

export const resolvePadDisplayName = (defaultLabel: string, currentName: string): string => {
  return currentName.trim() ? currentName : defaultLabel;
};
