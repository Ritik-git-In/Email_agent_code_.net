"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { LABEL_COLOR_PALETTE, pickTextColor } from "@/lib/gmail/labels";

export type ColorChoice = { bg: string; text: string };

export function ColorPicker({
  value,
  onChange,
}: {
  value: ColorChoice;
  onChange: (c: ColorChoice) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);

  function pickPalette(c: ColorChoice) {
    onChange(c);
    setCustomOpen(false);
  }

  function pickCustom(bg: string) {
    onChange({ bg, text: pickTextColor(bg) });
  }

  const isPaletteMatch = LABEL_COLOR_PALETTE.some(
    (c) => c.bg.toLowerCase() === value.bg.toLowerCase(),
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-10 gap-1.5">
        {LABEL_COLOR_PALETTE.map((c) => (
          <button
            key={c.bg}
            type="button"
            onClick={() => pickPalette(c)}
            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
              value.bg.toLowerCase() === c.bg.toLowerCase()
                ? "border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
            style={{ backgroundColor: c.bg }}
            aria-label={c.bg}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCustomOpen((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Palette className="h-3 w-3" />
          {customOpen ? "Hide custom" : "Custom color"}
        </button>
        {!isPaletteMatch && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            ⚠ Custom color — Gmail may reject if not in their palette
          </span>
        )}
      </div>

      {customOpen && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-2 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={value.bg}
              onChange={(e) => pickCustom(e.target.value)}
              className="h-9 w-12 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            <input
              type="text"
              value={value.bg}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) pickCustom(v);
                else pickCustom(value.bg);
              }}
              placeholder="#a1b2c3"
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-mono"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Gmail restricts label colors to a fixed palette. Stick to the swatches above for guaranteed acceptance.
          </p>
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: value.bg, color: value.text }}
          >
            Preview
          </div>
        </div>
      )}
    </div>
  );
}
