import type { CSSProperties } from "react";

export const pageClassName =
  "min-h-screen bg-gradient-to-br from-[#dfddd4] via-[#e7e5db] to-[#d3d0c6] p-3 sm:p-6";
export const contentClassName = "max-w-[1500px] mx-auto";
export const layoutClassName = "grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start";

export const createSliderBackgroundStyle = (value: number): CSSProperties => {
  return {
    background: `linear-gradient(to right, #ff8c2b 0%, #ff8c2b ${value}%, #9ca3af ${value}%, #9ca3af 100%)`,
  };
};

export const getPadButtonClassName = (color: string, isActive: boolean): string => {
  const activeClassName = isActive ? "brightness-150 scale-105 shadow-2xl" : "";
  return `w-full aspect-square rounded-xl ${color} hover:brightness-105 transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center text-[#515a6a] font-bold text-lg shadow-md border border-[#9fa39c] ${activeClassName}`;
};
