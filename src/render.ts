/**
 * Best-effort chemistry text renderer.
 *
 * The original Word bank lost its sub/superscript formatting when exported as
 * plain text. This formatter restores common patterns *conservatively*:
 *   - charges / signs after a letter or ")"  -> superscript   (Ca2+, e-, Cl-)
 *   - digits directly after a letter or ")"  -> subscript      (H2SO4, Al2O3)
 *
 * It intentionally does NOT touch digit-then-letter tokens (3s, 2px, 1A),
 * decimals, or numbers separated by spaces, which avoids corrupting orbital
 * names, group labels and measurement values.
 *
 * This is a display convenience only. It is not a chemical validator: any
 * rendered formula is still subject to human review.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatChem(raw: string): string {
  let s = escapeHtml(raw);

  // Superscript charges: optional digits then a single +/- attached to a letter
  // or closing paren, and NOT followed by another letter (so "X-ray" survives).
  // Must come before subscript handling.
  s = s.replace(
    /([A-Za-z)\]])(\d*[+\-−])(?![A-Za-z])/g,
    (_m, base: string, charge: string) => `${base}<sup>${charge.replace("−", "-")}</sup>`
  );

  // Subscripts: digits directly after a letter or closing paren.
  s = s.replace(/([A-Za-z)\]])(\d+)/g, (_m, base: string, num: string) => `${base}<sub>${num}</sub>`);

  // Restore blank markers for readability.
  s = s.replace(/_+/g, '<span class="blank">______</span>');

  return s;
}
