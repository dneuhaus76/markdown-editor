// Markdown-Editor – GPL-3.0 (see LICENSE)
// Pure text transformations for the toolbar actions. No DOM access here so the
// logic stays unit-testable; app.js applies the result to the editor.
// Each function takes the current value + selection range and returns
// { value, selStart, selEnd } describing the new document state.

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Characters that form formatting markers. Used to detect a "gap" between the
// selection and an outer marker pair (e.g. the `_` in `**_hello_**`).
const MARKER_CHARS = /^[*_=~`\[\]!<>u/]*$/;

function isMarkerGap(s) {
  return MARKER_CHARS.test(s);
}

// Search outward from `pos` for `marker`. The gap between pos and the marker
// must consist only of marker characters (other formatting layers).
// dir=-1: search left. dir=+1: search right.
// Returns the index where `marker` starts, or -1 if not found within maxGap.
function findMarkerOutward(value, pos, marker, dir, maxGap) {
  const ml = marker.length;
  for (let gap = 0; gap <= maxGap; gap++) {
    let mStart, gapText;
    if (dir < 0) {
      mStart = pos - gap - ml;
      if (mStart < 0) break;
      gapText = value.slice(mStart + ml, pos);
    } else {
      mStart = pos + gap;
      if (mStart + ml > value.length) break;
      gapText = value.slice(pos, mStart);
    }
    if (isMarkerGap(gapText) && value.slice(mStart, mStart + ml) === marker) {
      return mStart;
    }
  }
  return -1;
}

// Remove `before` at index bStart and `after` at index aEnd from value.
// Returns the new string with both markers stripped (gap content preserved).
function stripOuterMarkers(value, bStart, beforeLen, aEnd, afterLen) {
  const left = value.slice(0, bStart);
  const mid = value.slice(bStart + beforeLen, aEnd);
  const right = value.slice(aEnd + afterLen);
  return left + mid + right;
}

// Check if the selection [start, end) is already enclosed by a pair of the
// same markers (before/after). Counts marker occurrences from document start
// to `start`: for symmetric markers, odd count = inside a pair. For asymmetric
// markers, (opens - closes) > 0 = inside.
function isInsideSamePair(value, start, end, before, after) {
  const prefix = value.slice(0, start);
  if (before === after) {
    let count = 0, i = 0;
    while ((i = prefix.indexOf(before, i)) !== -1) { count++; i += before.length; }
    return count % 2 === 1;
  } else {
    let bCount = 0, aCount = 0, i = 0;
    while ((i = prefix.indexOf(before, i)) !== -1) { bCount++; i += before.length; }
    i = 0;
    while ((i = prefix.indexOf(after, i)) !== -1) { aCount++; i += after.length; }
    return bCount - aCount > 0;
  }
}

// Toggle wrap: if the selection is already wrapped with the same markers,
// remove them; otherwise wrap it. `conflict` names a marker pair that excludes
// the current one (sub/sup) and is replaced when found.
function wrapSelection(value, start, end, before, after, placeholder, conflict) {
  if (typeof value !== 'string') throw new TypeError('transform: value must be a string');
  const sel = value.slice(start, end);

  // Empty selection (cursor placed): expand to the current word.
  // If cursor is on a blank, insert empty markers only (no placeholder text).
  if (!sel) {
    let ws = start, we = end;
    while (ws > 0 && /[\p{L}\p{N}_]/u.test(value[ws - 1])) ws--;
    while (we < value.length && /[\p{L}\p{N}_]/u.test(value[we])) we++;
    if (we > ws) {
      return wrapSelection(value, ws, we, before, after, placeholder, conflict);
    }
    const newText = before + after;
    return { value: value.slice(0, start) + newText + value.slice(end), selStart: start + before.length, selEnd: start + before.length };
  }

  // Conflict: selection already wrapped with the OTHER marker pair -> replace
  // those markers with the new ones (sub/sup exclude each other).
  if (conflict && sel.length >= conflict.before.length + conflict.after.length) {
    const c = conflict;
    let core = sel, pad = 0;
    if (core.startsWith(c.before) && core.endsWith(c.after)) {
      core = core.slice(c.before.length, core.length - c.after.length);
    } else {
      const m = core.match(new RegExp('^\\s*' + escapeRe(c.before) + '(.*)' + escapeRe(c.after) + '\\s*$'));
      if (m) { core = m[1]; pad = 1; }
    }
    if (core !== sel) {
      const rs = start + pad, re = end - pad, text = before + core + after;
      return { value: value.slice(0, rs) + text + value.slice(re), selStart: rs, selEnd: rs + text.length };
    }
  }

  // Selection is exactly the empty marker pair -> remove.
  // Symmetric markers (**, _, ~~): empty pair = one instance of the marker.
  // Asymmetric markers (<u>/</u>): empty pair = before + after.
  const emptyPair = (before === after) ? before : (before + after);
  if (sel === emptyPair || sel === after + before) {
    return { value: value.slice(0, start) + value.slice(end), selStart: start, selEnd: start };
  }

  // Already wrapped (optionally with surrounding whitespace)? -> unwrap.
  if (sel.length >= before.length + after.length) {
    let core = sel, pad = 0;
    if (core.startsWith(before) && core.endsWith(after)) {
      core = core.slice(before.length, core.length - after.length);
    } else {
      const m = core.match(new RegExp('^\\s*' + escapeRe(before) + '(.*)' + escapeRe(after) + '\\s*$'));
      if (m) { core = m[1]; pad = 1; }
    }
    if (core !== sel) {
      const rs = start + pad, re = end - pad, text = core;
      return { value: value.slice(0, rs) + text + value.slice(re), selStart: rs, selEnd: rs + text.length };
    }
  }

  // Markers outside the selection (allowing other formatting layers in between).
  // e.g. **_hello_** with "hello" selected -> remove the ** pair, keep _hello_.
  const bStart = findMarkerOutward(value, start, before, -1, 6);
  const aEnd = findMarkerOutward(value, end, after, +1, 6);
  if (bStart !== -1 && aEnd !== -1) {
    const result = stripOuterMarkers(value, bStart, before.length, aEnd, after.length);
    return { value: result, selStart: bStart, selEnd: bStart + (aEnd - bStart - before.length) };
  }

  // Conflict markers outside the selection -> replace conflict pair with new pair.
  if (conflict) {
    const cbStart = findMarkerOutward(value, start, conflict.before, -1, 6);
    const caEnd = findMarkerOutward(value, end, conflict.after, +1, 6);
    if (cbStart !== -1 && caEnd !== -1) {
      const inner = value.slice(cbStart + conflict.before.length, caEnd);
      const text = before + inner + after;
      const result = value.slice(0, cbStart) + text + value.slice(caEnd + conflict.after.length);
      return { value: result, selStart: cbStart, selEnd: cbStart + text.length };
    }
  }

  // Selection is already enclosed by an outer pair of the same markers (with
  // non-marker text in between) -> do NOT nest, return unchanged.
  if (isInsideSamePair(value, start, end, before, after)) {
    return { value, selStart: start, selEnd: end };
  }

  // Normal insert. Selection covers only the content (without markers) so the
  // next keystroke edits the text, not the whole wrapped block.
  const newText = before + sel + after;
  return { value: value.slice(0, start) + newText + value.slice(end), selStart: start + before.length, selEnd: start + before.length + sel.length };
}

// Toggle a line prefix (headings, list markers).
// Same prefix on all lines -> remove; different prefix of the same kind -> replace.
function prefixLines(value, start, end, prefix) {
  if (typeof value !== 'string') throw new TypeError('transform: value must be a string');
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  const lines = value.slice(lineStart, lineEnd).split('\n');
  // Capture leading whitespace separately so indented list items are recognized.
  const prefixRe = /^(\s*)(#{1,6}\s+|[-*+]\s+|\d+\.\s+)/;
  const text = lines.map(l => {
    const m = l.match(prefixRe);
    if (m) {
      const indent = m[1], marker = m[2];
      if (l.startsWith(indent + prefix)) return indent + l.slice(indent.length + prefix.length); // toggle off
      return indent + prefix + l.slice(indent.length + marker.length);                           // replace same-kind
    }
    const ws = l.match(/^\s*/)[0];
    return ws + prefix + l.slice(ws.length);                                              // add after indent
  }).join('\n');
  const pos = lineStart + text.length;
  return { value: value.slice(0, lineStart) + text + value.slice(lineEnd), selStart: pos, selEnd: pos };
}

// Indent (dir = +1) or outdent (dir = -1) the selected lines by up to 2 spaces.
function indentLines(value, start, end, dir) {
  if (typeof value !== 'string') throw new TypeError('transform: value must be a string');
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  const text = value.slice(lineStart, lineEnd).split('\n')
    .map(l => (dir > 0 ? '  ' + l : l.replace(/^ {1,2}/, ''))).join('\n');
  const pos = lineStart + text.length;
  return { value: value.slice(0, lineStart) + text + value.slice(lineEnd), selStart: pos, selEnd: pos };
}

// Task list: toggle the checkbox after the list marker on each selected line.
function toggleTaskLines(value, start, end) {
  if (typeof value !== 'string') throw new TypeError('transform: value must be a string');
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = value.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = value.length;
  // Allow quote prefixes ("> ") before the list marker.
  const markerRe = /^\s*(?:>\s*)*(?:[-*+]|\d+\.)\s+/;
  const cbRe = /\[[ xX]\]\s+/;
  const text = value.slice(lineStart, lineEnd).split('\n').map(l => {
    const m = l.match(markerRe);
    if (m && cbRe.test(l.slice(m[0].length))) {
      // Remove only the checkbox, keep quote + list marker.
      return l.slice(0, m[0].length) + l.slice(m[0].length).replace(cbRe, '');
    }
    if (m) return l.slice(0, m[0].length) + '[ ] ' + l.slice(m[0].length); // insert checkbox
    return '- [ ] ' + l; // new task line
  }).join('\n');
  const pos = lineStart + text.length;
  return { value: value.slice(0, lineStart) + text + value.slice(lineEnd), selStart: pos, selEnd: pos };
}

// Code block: if the selection is already fenced, strip the fences (toggle off);
// otherwise return null so the caller inserts a fence template.
function codeblockTransform(value, start, end) {
  if (typeof value !== 'string') throw new TypeError('transform: value must be a string');
  const sel = value.slice(start, end);
  const t = sel.match(/^```\n?([\s\S]*?)\n?```\s*$/);
  if (!t) return null;
  return { value: value.slice(0, start) + t[1] + value.slice(end), selStart: start, selEnd: start + t[1].length };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeRe, wrapSelection, prefixLines, indentLines, toggleTaskLines, codeblockTransform };
} else {
  window.Transform = { escapeRe, wrapSelection, prefixLines, indentLines, toggleTaskLines, codeblockTransform };
}
