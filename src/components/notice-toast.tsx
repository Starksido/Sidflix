"use client";

import { useEffect } from "react";
import { dismissNotice, useNotice } from "@/lib/viewer-store";

export function NoticeToast() {
  const notice = useNotice();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => dismissNotice(notice.id), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {notice && (
        <div className="bg-surface-3 pointer-events-auto flex max-w-md items-center gap-4 rounded-lg px-4 py-3 text-sm shadow-lg shadow-black/50 ring-1 ring-white/10">
          <span>{notice.message}</span>
          {notice.undo && (
            <button
              type="button"
              onClick={() => {
                notice.undo?.();
                dismissNotice(notice.id);
              }}
              className="text-accent hover:text-accent-hover shrink-0 font-semibold"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
