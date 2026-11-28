// Markdown-Editor – GPL-3.0 (see LICENSE)
// Shared constants (one config point).
(function () {
  'use strict';

  window.MDConfig = Object.freeze({
    STORAGE_KEY: 'md-editor-content',
    SPLIT_KEY: 'md-editor-split',
    COLS_KEY: 'md-editor-cols',
    RENDER_DEBOUNCE_MS: 150,
    SAVE_DEBOUNCE_MS: 500,
    UNDO_LIMIT: 100,
    PX_PER_MM: 96 / 25.4,
    A4_HEIGHT_MM: 297,
    MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  });

})();
