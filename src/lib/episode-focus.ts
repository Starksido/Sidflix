/** Scroll the episode dialog itself, without moving the page behind it. */
export function revealEpisode(button: HTMLElement): boolean {
  const dialog = button.closest<HTMLDialogElement>("dialog[data-episode-dialog][open]");
  if (!dialog || !button.isConnected) return false;
  const item = button.getBoundingClientRect(), view = dialog.getBoundingClientRect(), padding = 14;
  const margin = Number.parseFloat(getComputedStyle(button).scrollMarginTop);
  const top = view.top + Math.max(padding, Number.isFinite(margin) ? margin : 0), bottom = view.bottom - padding;
  if (item.top < top || item.height > bottom - top) dialog.scrollTop += item.top - top;
  else if (item.bottom > bottom) dialog.scrollTop += item.bottom - bottom;
  return true;
}

export function focusEpisode(button: HTMLElement | null | undefined) {
  if (!button) return;
  button.focus({ preventScroll: true }); revealEpisode(button);
}
