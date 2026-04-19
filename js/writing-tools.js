/**
 * Aurality Studio — Writing Tools Module
 * Rich text editor, markdown, analytics, collaboration, creative writing, teleprompter.
 * Vanilla JS, Web APIs only.
 */
class WritingTools {
  constructor(containerEl) {
    this.container = typeof containerEl === 'string'
      ? document.querySelector(containerEl)
      : containerEl;
    this.mode = 'richtext'; // richtext | markdown | teleprompter | lyric
    this.versionHistory = [];
    this.maxVersions = 50;
    this.autoSaveInterval = 30000;
    this._autoSaveTimer = null;
    this._undoStack = [];
    this._redoStack = [];
    this._undoMax = 100;
    this._editorEl = null;
    this._toolbarEl = null;
    this._previewEl = null;
    this._analyticsEl = null;
    this._statusBarEl = null;
    this._telepromptSpeed = 2;
    this._telepromptScrollId = null;
    this._telepromptMirrored = false;
    this._telepromptFontSize = 32;
    this._poetryTemplates = this._initPoetryTemplates();
    this._writingPrompts = this._initWritingPrompts();
    this._cmuCache = {};
  }

  /* ------------------------------------------------------------------ */
  /*  INITIALIZATION                                                     */
  /* ------------------------------------------------------------------ */

  init() {
    if (!this.container) {
      console.error('[WritingTools] No container element provided.');
      return this;
    }
    this.container.classList.add('wt-root');
    this._buildToolbar();
    this._buildEditorArea();
    this._buildStatusBar();
    this._bindEditorEvents();
    this._startAutoSave();
    this._pushUndo();
    console.log('[WritingTools] Initialized.');
    return this;
  }

  destroy() {
    clearInterval(this._autoSaveTimer);
    cancelAnimationFrame(this._telepromptScrollId);
    this.container.innerHTML = '';
    this.container.classList.remove('wt-root');
  }

  /* ------------------------------------------------------------------ */
  /*  TOOLBAR                                                            */
  /* ------------------------------------------------------------------ */

  _buildToolbar() {
    const tb = document.createElement('div');
    tb.className = 'wt-toolbar';

    const groups = [
      {
        label: 'Format',
        buttons: [
          { cmd: 'bold', icon: 'B', title: 'Bold (Ctrl+B)', style: 'font-weight:bold' },
          { cmd: 'italic', icon: 'I', title: 'Italic (Ctrl+I)', style: 'font-style:italic' },
          { cmd: 'underline', icon: 'U', title: 'Underline (Ctrl+U)', style: 'text-decoration:underline' },
          { cmd: 'strikeThrough', icon: 'S', title: 'Strikethrough', style: 'text-decoration:line-through' },
        ]
      },
      {
        label: 'Heading',
        buttons: [
          { cmd: 'heading', val: 'H1', title: 'Heading 1' },
          { cmd: 'heading', val: 'H2', title: 'Heading 2' },
          { cmd: 'heading', val: 'H3', title: 'Heading 3' },
          { cmd: 'heading', val: 'H4', title: 'Heading 4' },
          { cmd: 'heading', val: 'H5', title: 'Heading 5' },
          { cmd: 'heading', val: 'H6', title: 'Heading 6' },
        ]
      },
      {
        label: 'Lists',
        buttons: [
          { cmd: 'insertUnorderedList', icon: '\u2022', title: 'Bullet list' },
          { cmd: 'insertOrderedList', icon: '1.', title: 'Numbered list' },
          { cmd: 'checklist', icon: '\u2611', title: 'Checklist' },
        ]
      },
      {
        label: 'Insert',
        buttons: [
          { cmd: 'blockquote', icon: '\u201C', title: 'Block quote' },
          { cmd: 'codeblock', icon: '</>', title: 'Code block' },
          { cmd: 'insertTable', icon: '\u2592', title: 'Insert table' },
          { cmd: 'insertImage', icon: '\uD83D\uDDBC', title: 'Insert image' },
          { cmd: 'createLink', icon: '\uD83D\uDD17', title: 'Insert link' },
        ]
      },
      {
        label: 'History',
        buttons: [
          { cmd: 'undo', icon: '\u21B6', title: 'Undo (Ctrl+Z)' },
          { cmd: 'redo', icon: '\u21B7', title: 'Redo (Ctrl+Y)' },
        ]
      },
      {
        label: 'Mode',
        buttons: [
          { cmd: 'mode-richtext', icon: 'RT', title: 'Rich Text mode' },
          { cmd: 'mode-markdown', icon: 'MD', title: 'Markdown mode' },
          { cmd: 'mode-lyric', icon: '\u266A', title: 'Lyric writing mode' },
          { cmd: 'mode-teleprompter', icon: '\u25B6', title: 'Teleprompter mode' },
        ]
      },
      {
        label: 'Export',
        buttons: [
          { cmd: 'export-html', icon: 'HTML', title: 'Export HTML' },
          { cmd: 'export-md', icon: 'MD\u2193', title: 'Export Markdown' },
          { cmd: 'export-txt', icon: 'TXT', title: 'Export plain text' },
          { cmd: 'export-pdf', icon: 'PDF', title: 'Export PDF' },
          { cmd: 'export-docx', icon: 'DOCX', title: 'Export DOCX' },
        ]
      },
      {
        label: 'Tools',
        buttons: [
          { cmd: 'analytics', icon: '\uD83D\uDCCA', title: 'Writing analytics' },
          { cmd: 'versions', icon: '\uD83D\uDCCB', title: 'Version history' },
          { cmd: 'rhyme', icon: '\u266B', title: 'Rhyme finder' },
          { cmd: 'prompt', icon: '\uD83D\uDCA1', title: 'Writing prompt' },
          { cmd: 'nameGen', icon: '\uD83C\uDFF7', title: 'Name generator' },
          { cmd: 'poetry', icon: '\uD83D\uDCDC', title: 'Poetry template' },
        ]
      }
    ];

    groups.forEach(g => {
      const grp = document.createElement('span');
      grp.className = 'wt-toolbar-group';
      grp.setAttribute('data-group', g.label);
      g.buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'wt-btn';
        btn.title = b.title;
        btn.textContent = b.icon || b.val || b.cmd;
        if (b.style) btn.style.cssText = b.style;
        btn.setAttribute('data-cmd', b.cmd);
        if (b.val) btn.setAttribute('data-val', b.val);
        btn.addEventListener('click', e => { e.preventDefault(); this._execCommand(b.cmd, b.val); });
        grp.appendChild(btn);
      });
      tb.appendChild(grp);
    });

    this._toolbarEl = tb;
    this.container.appendChild(tb);
  }

  /* ------------------------------------------------------------------ */
  /*  EDITOR AREA                                                        */
  /* ------------------------------------------------------------------ */

  _buildEditorArea() {
    const wrap = document.createElement('div');
    wrap.className = 'wt-editor-wrap';

    // Main editor (contentEditable)
    const editor = document.createElement('div');
    editor.className = 'wt-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('aria-label', 'Writing editor');
    editor.innerHTML = '<p><br></p>';
    this._editorEl = editor;

    // Markdown preview pane (hidden by default)
    const preview = document.createElement('div');
    preview.className = 'wt-preview';
    preview.style.display = 'none';
    this._previewEl = preview;

    // Analytics panel (hidden by default)
    const analytics = document.createElement('div');
    analytics.className = 'wt-analytics-panel';
    analytics.style.display = 'none';
    this._analyticsEl = analytics;

    // Version history panel
    const versions = document.createElement('div');
    versions.className = 'wt-versions-panel';
    versions.style.display = 'none';
    this._versionsEl = versions;

    wrap.appendChild(editor);
    wrap.appendChild(preview);
    wrap.appendChild(analytics);
    wrap.appendChild(versions);
    this.container.appendChild(wrap);
  }

  _buildStatusBar() {
    const bar = document.createElement('div');
    bar.className = 'wt-status-bar';
    bar.innerHTML = '<span class="wt-stat" data-stat="words">0 words</span>'
      + '<span class="wt-stat" data-stat="chars">0 chars</span>'
      + '<span class="wt-stat" data-stat="sentences">0 sentences</span>'
      + '<span class="wt-stat" data-stat="readtime">0 min read</span>'
      + '<span class="wt-stat" data-stat="mode">Rich Text</span>';
    this._statusBarEl = bar;
    this.container.appendChild(bar);
  }

  /* ------------------------------------------------------------------ */
  /*  EDITOR EVENTS                                                      */
  /* ------------------------------------------------------------------ */

  _bindEditorEvents() {
    let debounce = null;
    this._editorEl.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this._pushUndo();
        this._updateStatusBar();
        if (this.mode === 'markdown') this._renderMarkdownPreview();
        if (this.mode === 'lyric') this._renderLyricOverlay();
      }, 300);
    });

    this._editorEl.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); this.undo(); }
        if (e.key === 'y') { e.preventDefault(); this.redo(); }
        if (e.key === 's') { e.preventDefault(); this._saveVersion(); }
      }
      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '    ');
      }
    });

    this._editorEl.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  COMMAND DISPATCH                                                   */
  /* ------------------------------------------------------------------ */

  _execCommand(cmd, val) {
    this._editorEl.focus();
    switch (cmd) {
      case 'bold':
      case 'italic':
      case 'underline':
      case 'strikeThrough':
      case 'insertUnorderedList':
      case 'insertOrderedList':
        document.execCommand(cmd, false, null);
        break;
      case 'heading':
        document.execCommand('formatBlock', false, val);
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'codeblock':
        this._insertCodeBlock();
        break;
      case 'checklist':
        this._insertChecklist();
        break;
      case 'insertTable':
        this._promptInsertTable();
        break;
      case 'insertImage':
        this._promptInsertImage();
        break;
      case 'createLink':
        this._promptInsertLink();
        break;
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'mode-richtext':
        this.setMode('richtext');
        break;
      case 'mode-markdown':
        this.setMode('markdown');
        break;
      case 'mode-lyric':
        this.setMode('lyric');
        break;
      case 'mode-teleprompter':
        this.setMode('teleprompter');
        break;
      case 'export-html':
        this.exportHTML();
        break;
      case 'export-md':
        this.exportMarkdown();
        break;
      case 'export-txt':
        this.exportTXT();
        break;
      case 'export-pdf':
        this.exportPDF();
        break;
      case 'export-docx':
        this.exportDOCX();
        break;
      case 'analytics':
        this._toggleAnalytics();
        break;
      case 'versions':
        this._toggleVersions();
        break;
      case 'rhyme':
        this._openRhymeFinder();
        break;
      case 'prompt':
        this._showWritingPrompt();
        break;
      case 'nameGen':
        this._showNameGenerator();
        break;
      case 'poetry':
        this._showPoetryTemplates();
        break;
      default:
        console.warn('[WritingTools] Unknown command:', cmd);
    }
    this._pushUndo();
    this._updateStatusBar();
  }

  /* ------------------------------------------------------------------ */
  /*  UNDO / REDO                                                        */
  /* ------------------------------------------------------------------ */

  _pushUndo() {
    const html = this._editorEl.innerHTML;
    if (this._undoStack.length && this._undoStack[this._undoStack.length - 1] === html) return;
    this._undoStack.push(html);
    if (this._undoStack.length > this._undoMax) this._undoStack.shift();
    this._redoStack = [];
  }

  undo() {
    if (this._undoStack.length <= 1) return;
    this._redoStack.push(this._undoStack.pop());
    this._editorEl.innerHTML = this._undoStack[this._undoStack.length - 1];
  }

  redo() {
    if (!this._redoStack.length) return;
    const html = this._redoStack.pop();
    this._undoStack.push(html);
    this._editorEl.innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /*  INSERT HELPERS                                                     */
  /* ------------------------------------------------------------------ */

  _insertCodeBlock() {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = '\n';
    pre.appendChild(code);
    this._insertNodeAtCaret(pre);
  }

  _insertChecklist() {
    const ul = document.createElement('ul');
    ul.className = 'wt-checklist';
    for (let i = 0; i < 3; i++) {
      const li = document.createElement('li');
      li.innerHTML = '<input type="checkbox"> Item ' + (i + 1);
      ul.appendChild(li);
    }
    this._insertNodeAtCaret(ul);
  }

  _promptInsertTable() {
    const rows = parseInt(prompt('Number of rows:', '3'), 10) || 3;
    const cols = parseInt(prompt('Number of columns:', '3'), 10) || 3;
    this._insertTable(rows, cols);
  }

  _insertTable(rows, cols) {
    const table = document.createElement('table');
    table.className = 'wt-table';
    table.style.borderCollapse = 'collapse';
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement(r === 0 ? 'th' : 'td');
        cell.style.border = '1px solid #555';
        cell.style.padding = '6px 10px';
        cell.contentEditable = 'true';
        cell.textContent = r === 0 ? 'Header ' + (c + 1) : '';
        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }
    this._insertNodeAtCaret(table);
  }

  _promptInsertImage() {
    const url = prompt('Image URL:');
    if (!url) return;
    const alt = prompt('Alt text:', '') || '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.style.maxWidth = '100%';
    img.className = 'wt-img';
    this._insertNodeAtCaret(img);
  }

  _promptInsertLink() {
    const url = prompt('Link URL:');
    if (!url) return;
    document.execCommand('createLink', false, url);
  }

  _insertNodeAtCaret(node) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* ------------------------------------------------------------------ */
  /*  MODE SWITCHING                                                     */
  /* ------------------------------------------------------------------ */

  setMode(mode) {
    this.mode = mode;
    this._previewEl.style.display = 'none';
    this._editorEl.classList.remove('wt-lyric-mode', 'wt-teleprompter-mode');
    this._stopTeleprompter();

    switch (mode) {
      case 'richtext':
        this._editorEl.contentEditable = 'true';
        break;
      case 'markdown':
        this._editorEl.contentEditable = 'true';
        this._previewEl.style.display = 'block';
        this._renderMarkdownPreview();
        break;
      case 'lyric':
        this._editorEl.contentEditable = 'true';
        this._editorEl.classList.add('wt-lyric-mode');
        this._renderLyricOverlay();
        break;
      case 'teleprompter':
        this._enterTeleprompterMode();
        break;
    }
    this._updateStatusBar();
  }

  /* ------------------------------------------------------------------ */
  /*  MARKDOWN ENGINE                                                    */
  /* ------------------------------------------------------------------ */

  markdownToHTML(md) {
    let html = md;

    // Code blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = this._escapeHtml(code.trim());
      return '<pre><code class="language-' + (lang || 'text') + '">' + escaped + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Bold + italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Checklists
    html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');

    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)*)/gm, (_, hdr, _sep, body) => {
      const heads = hdr.split('|').filter(c => c.trim()).map(c => '<th>' + c.trim() + '</th>').join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => '<td>' + c.trim() + '</td>').join('');
        return '<tr>' + cells + '</tr>';
      }).join('');
      return '<table class="wt-table"><thead><tr>' + heads + '</tr></thead><tbody>' + rows + '</tbody></table>';
    });

    // Paragraphs
    html = html.replace(/\n\n(?!<)/g, '</p><p>');
    if (!html.startsWith('<')) html = '<p>' + html + '</p>';

    return html;
  }

  htmlToMarkdown(html) {
    let md = html;

    // Strip tags progressively
    md = md.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, lvl, txt) => '#'.repeat(parseInt(lvl)) + ' ' + txt.trim() + '\n\n');
    md = md.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');
    md = md.replace(/<u>([\s\S]*?)<\/u>/gi, '$1');
    md = md.replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~');
    md = md.replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, txt) => '> ' + txt.trim() + '\n\n');
    md = md.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => '```\n' + code.trim() + '\n```\n\n');
    md = md.replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');
    md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    md = md.replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<hr\s*\/?>/gi, '---\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<\/?(ul|ol|table|thead|tbody|tr|th|td|div|span)[^>]*>/gi, '');
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/\n{3,}/g, '\n\n');
    return md.trim();
  }

  _renderMarkdownPreview() {
    const text = this._editorEl.innerText || '';
    this._previewEl.innerHTML = this.markdownToHTML(text);
    this._highlightCodeBlocks(this._previewEl);
  }

  _highlightCodeBlocks(container) {
    const blocks = container.querySelectorAll('pre code');
    blocks.forEach(block => {
      let code = block.textContent;
      // Basic syntax highlighting via regex
      code = this._escapeHtml(code);
      // Keywords
      code = code.replace(/\b(function|const|let|var|return|if|else|for|while|class|import|export|from|default|new|this|async|await|try|catch|throw|switch|case|break|continue)\b/g,
        '<span style="color:#c678dd">$1</span>');
      // Strings
      code = code.replace(/(["'`])(?:(?!\1|\\).|\\.)*?\1/g, '<span style="color:#98c379">$&</span>');
      // Numbers
      code = code.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#d19a66">$1</span>');
      // Comments
      code = code.replace(/(\/\/.*$)/gm, '<span style="color:#5c6370">$1</span>');
      block.innerHTML = code;
    });
  }

  /* ------------------------------------------------------------------ */
  /*  WRITING ANALYTICS                                                  */
  /* ------------------------------------------------------------------ */

  getAnalytics() {
    const text = this._getPlainText();
    const words = this._getWords(text);
    const sentences = this._getSentences(text);
    const paragraphs = this._getParagraphs(text);
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const paragraphCount = paragraphs.length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 238));
    const readability = this._fleschKincaid(words, sentences);
    const vocabulary = this._vocabularyRichness(words);
    const sentiment = this._basicSentiment(text);
    const topWords = this._mostUsedWords(words, 15);

    return {
      chars,
      charsNoSpaces,
      wordCount,
      sentenceCount,
      paragraphCount,
      readingTime,
      readability,
      vocabulary,
      sentiment,
      topWords,
    };
  }

  _getPlainText() {
    return (this._editorEl.innerText || '').trim();
  }

  _getWords(text) {
    if (!text) return [];
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  _getSentences(text) {
    if (!text) return [];
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  }

  _getParagraphs(text) {
    if (!text) return [];
    return text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  _countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  _fleschKincaid(words, sentences) {
    if (!words.length || !sentences.length) return { score: 0, grade: 'N/A', label: 'N/A' };
    const totalSyllables = words.reduce((sum, w) => sum + this._countSyllables(w), 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = totalSyllables / words.length;

    // Flesch Reading Ease
    const ease = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    // Flesch-Kincaid Grade Level
    const grade = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;

    let label = '';
    if (ease >= 90) label = 'Very Easy';
    else if (ease >= 80) label = 'Easy';
    else if (ease >= 70) label = 'Fairly Easy';
    else if (ease >= 60) label = 'Standard';
    else if (ease >= 50) label = 'Fairly Difficult';
    else if (ease >= 30) label = 'Difficult';
    else label = 'Very Difficult';

    return {
      score: Math.round(ease * 10) / 10,
      grade: Math.round(grade * 10) / 10,
      label,
    };
  }

  _vocabularyRichness(words) {
    if (!words.length) return { ttr: 0, hapaxRatio: 0, uniqueCount: 0 };
    const lower = words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')).filter(w => w);
    const freq = {};
    lower.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const uniqueCount = Object.keys(freq).length;
    const hapaxCount = Object.values(freq).filter(c => c === 1).length;
    return {
      ttr: Math.round((uniqueCount / lower.length) * 1000) / 1000,
      hapaxRatio: Math.round((hapaxCount / uniqueCount) * 1000) / 1000,
      uniqueCount,
    };
  }

  _basicSentiment(text) {
    const positive = [
      'good', 'great', 'love', 'happy', 'joy', 'wonderful', 'amazing', 'excellent',
      'beautiful', 'brilliant', 'fantastic', 'delightful', 'kind', 'hope', 'bright',
      'smile', 'laugh', 'peace', 'warm', 'sunshine', 'sweet', 'perfect', 'blessed',
      'grateful', 'inspire', 'proud', 'gentle', 'calm', 'free', 'radiant',
    ];
    const negative = [
      'bad', 'sad', 'hate', 'angry', 'fear', 'terrible', 'awful', 'horrible',
      'pain', 'dark', 'death', 'cry', 'lonely', 'broken', 'hurt', 'suffer',
      'misery', 'grief', 'rage', 'despair', 'bitter', 'cold', 'empty', 'lost',
      'cruel', 'ugly', 'stupid', 'fail', 'worst', 'destroy',
    ];
    const words = text.toLowerCase().split(/\s+/);
    let posCount = 0, negCount = 0;
    words.forEach(w => {
      const clean = w.replace(/[^a-z]/g, '');
      if (positive.includes(clean)) posCount++;
      if (negative.includes(clean)) negCount++;
    });
    const total = posCount + negCount || 1;
    const score = (posCount - negCount) / total;
    let label = 'Neutral';
    if (score > 0.3) label = 'Positive';
    else if (score > 0.1) label = 'Slightly Positive';
    else if (score < -0.3) label = 'Negative';
    else if (score < -0.1) label = 'Slightly Negative';
    return { score: Math.round(score * 100) / 100, label, positive: posCount, negative: negCount };
  }

  _mostUsedWords(words, limit) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'shall', 'can', 'it', 'its', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
      'them', 'his', 'her', 'not', 'no', 'so', 'if', 'as', 'from', 'up',
    ]);
    const freq = {};
    words.forEach(w => {
      const clean = w.toLowerCase().replace(/[^a-z']/g, '');
      if (clean.length > 1 && !stopWords.has(clean)) {
        freq[clean] = (freq[clean] || 0) + 1;
      }
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  }

  _toggleAnalytics() {
    const visible = this._analyticsEl.style.display !== 'none';
    if (visible) {
      this._analyticsEl.style.display = 'none';
      return;
    }
    const a = this.getAnalytics();
    let html = '<h3>Writing Analytics</h3><div class="wt-analytics-grid">';
    html += '<div class="wt-a-card"><strong>' + a.wordCount + '</strong><span>Words</span></div>';
    html += '<div class="wt-a-card"><strong>' + a.chars + '</strong><span>Characters</span></div>';
    html += '<div class="wt-a-card"><strong>' + a.charsNoSpaces + '</strong><span>Chars (no spaces)</span></div>';
    html += '<div class="wt-a-card"><strong>' + a.sentenceCount + '</strong><span>Sentences</span></div>';
    html += '<div class="wt-a-card"><strong>' + a.paragraphCount + '</strong><span>Paragraphs</span></div>';
    html += '<div class="wt-a-card"><strong>' + a.readingTime + ' min</strong><span>Reading Time</span></div>';
    html += '</div>';

    html += '<h4>Readability</h4>';
    html += '<p>Flesch Reading Ease: <strong>' + a.readability.score + '</strong> (' + a.readability.label + ')</p>';
    html += '<p>Grade Level: <strong>' + a.readability.grade + '</strong></p>';

    html += '<h4>Vocabulary Richness</h4>';
    html += '<p>Type-Token Ratio: <strong>' + a.vocabulary.ttr + '</strong></p>';
    html += '<p>Hapax Legomena Ratio: <strong>' + a.vocabulary.hapaxRatio + '</strong></p>';
    html += '<p>Unique Words: <strong>' + a.vocabulary.uniqueCount + '</strong></p>';

    html += '<h4>Sentiment</h4>';
    html += '<p>Score: <strong>' + a.sentiment.score + '</strong> (' + a.sentiment.label + ')</p>';
    html += '<p>Positive words: ' + a.sentiment.positive + ' | Negative words: ' + a.sentiment.negative + '</p>';

    html += '<h4>Most Used Words</h4><ol>';
    a.topWords.forEach(w => { html += '<li>' + w.word + ' (' + w.count + ')</li>'; });
    html += '</ol>';

    html += '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    this._analyticsEl.innerHTML = html;
    this._analyticsEl.style.display = 'block';
  }

  /* ------------------------------------------------------------------ */
  /*  STATUS BAR                                                         */
  /* ------------------------------------------------------------------ */

  _updateStatusBar() {
    const text = this._getPlainText();
    const words = this._getWords(text);
    const sentences = this._getSentences(text);
    const readTime = Math.max(1, Math.ceil(words.length / 238));
    const modeLabels = { richtext: 'Rich Text', markdown: 'Markdown', lyric: 'Lyric', teleprompter: 'Teleprompter' };

    const bar = this._statusBarEl;
    bar.querySelector('[data-stat="words"]').textContent = words.length + ' words';
    bar.querySelector('[data-stat="chars"]').textContent = text.length + ' chars';
    bar.querySelector('[data-stat="sentences"]').textContent = sentences.length + ' sentences';
    bar.querySelector('[data-stat="readtime"]').textContent = readTime + ' min read';
    bar.querySelector('[data-stat="mode"]').textContent = modeLabels[this.mode] || this.mode;
  }

  /* ------------------------------------------------------------------ */
  /*  VERSION HISTORY                                                    */
  /* ------------------------------------------------------------------ */

  _startAutoSave() {
    this._autoSaveTimer = setInterval(() => this._saveVersion(), this.autoSaveInterval);
  }

  _saveVersion() {
    const html = this._editorEl.innerHTML;
    const text = this._getPlainText();
    if (!text.trim()) return;
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      html,
      text,
      wordCount: this._getWords(text).length,
    };
    this.versionHistory.push(entry);
    if (this.versionHistory.length > this.maxVersions) {
      this.versionHistory.shift();
    }
    try {
      localStorage.setItem('wt_versions', JSON.stringify(this.versionHistory));
    } catch (_) { /* quota exceeded, silently continue */ }
  }

  loadVersions() {
    try {
      const data = localStorage.getItem('wt_versions');
      if (data) this.versionHistory = JSON.parse(data);
    } catch (_) { /* corrupted data */ }
  }

  restoreVersion(id) {
    const v = this.versionHistory.find(e => e.id === id);
    if (!v) return;
    this._pushUndo();
    this._editorEl.innerHTML = v.html;
    this._pushUndo();
    this._updateStatusBar();
  }

  _toggleVersions() {
    const visible = this._versionsEl.style.display !== 'none';
    if (visible) { this._versionsEl.style.display = 'none'; return; }
    this.loadVersions();
    let html = '<h3>Version History</h3>';
    if (!this.versionHistory.length) {
      html += '<p>No saved versions yet.</p>';
    } else {
      html += '<div class="wt-version-list">';
      this.versionHistory.slice().reverse().forEach(v => {
        const d = new Date(v.timestamp);
        const label = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        html += '<div class="wt-version-item">';
        html += '<span>' + label + ' (' + v.wordCount + ' words)</span>';
        html += '<button class="wt-btn" data-restore="' + v.id + '">Restore</button>';
        html += '<button class="wt-btn" data-diff="' + v.id + '">Diff</button>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    this._versionsEl.innerHTML = html;
    this._versionsEl.style.display = 'block';

    // Bind restore/diff buttons
    this._versionsEl.querySelectorAll('[data-restore]').forEach(btn => {
      btn.addEventListener('click', () => this.restoreVersion(parseInt(btn.dataset.restore, 10)));
    });
    this._versionsEl.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => this._showDiff(parseInt(btn.dataset.diff, 10)));
    });
  }

  _showDiff(versionId) {
    const v = this.versionHistory.find(e => e.id === versionId);
    if (!v) return;
    const currentText = this._getPlainText();
    const oldText = v.text;
    const diff = this._computeDiff(oldText, currentText);
    const diffHtml = '<h3>Diff View</h3><pre class="wt-diff">' + diff + '</pre>'
      + '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    this._versionsEl.innerHTML = diffHtml;
  }

  _computeDiff(oldStr, newStr) {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const result = [];
    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const oldLine = i < oldLines.length ? oldLines[i] : null;
      const newLine = i < newLines.length ? newLines[i] : null;
      if (oldLine === newLine) {
        result.push('  ' + this._escapeHtml(oldLine || ''));
      } else {
        if (oldLine !== null) result.push('<span style="color:#e06c75">- ' + this._escapeHtml(oldLine) + '</span>');
        if (newLine !== null) result.push('<span style="color:#98c379">+ ' + this._escapeHtml(newLine) + '</span>');
      }
    }
    return result.join('\n');
  }

  /* ------------------------------------------------------------------ */
  /*  EXPORT                                                             */
  /* ------------------------------------------------------------------ */

  exportHTML() {
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document</title>'
      + '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.7;color:#222}'
      + 'pre{background:#f5f5f5;padding:12px;border-radius:4px;overflow-x:auto}'
      + 'code{font-family:monospace}blockquote{border-left:4px solid #ccc;margin-left:0;padding-left:16px;color:#555}'
      + 'table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}'
      + 'img{max-width:100%}</style></head><body>'
      + this._editorEl.innerHTML + '</body></html>';
    this._downloadFile('document.html', html, 'text/html');
  }

  exportMarkdown() {
    const md = this.htmlToMarkdown(this._editorEl.innerHTML);
    this._downloadFile('document.md', md, 'text/markdown');
  }

  exportTXT() {
    this._downloadFile('document.txt', this._getPlainText(), 'text/plain');
  }

  exportPDF() {
    const printWin = window.open('', '_blank');
    if (!printWin) { alert('Please allow popups to export PDF.'); return; }
    printWin.document.write('<!DOCTYPE html><html><head><title>Print</title>'
      + '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.7}'
      + 'pre{background:#f5f5f5;padding:12px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}'
      + '</style></head><body>'
      + this._editorEl.innerHTML + '</body></html>');
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
  }

  exportDOCX() {
    // Minimal DOCX export using a valid Word HTML wrapper
    const content = this._editorEl.innerHTML;
    const docHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
      + 'xmlns:w="urn:schemas-microsoft-com:office:word" '
      + 'xmlns="http://www.w3.org/TR/REC-html40">'
      + '<head><meta charset="utf-8"><title>Document</title>'
      + '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View>'
      + '<w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->'
      + '<style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.6}'
      + 'table{border-collapse:collapse}th,td{border:1px solid #000;padding:4px 8px}</style>'
      + '</head><body>' + content + '</body></html>';
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.doc';
    a.click();
    URL.revokeObjectURL(url);
  }

  _downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ------------------------------------------------------------------ */
  /*  CREATIVE WRITING TOOLS                                             */
  /* ------------------------------------------------------------------ */

  findRhymes(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return [];
    // Phonetic ending patterns for rhyme approximation
    const endings = this._getPhoneticEndings(word);
    const rhymeBank = this._getRhymeBank();
    const results = [];
    rhymeBank.forEach(w => {
      if (w === word) return;
      const wEnd = this._getPhoneticEndings(w);
      if (wEnd.some(e => endings.includes(e))) {
        results.push(w);
      }
    });
    return results.slice(0, 30);
  }

  _getPhoneticEndings(word) {
    const endings = [];
    // Last 2, 3, 4 chars
    if (word.length >= 2) endings.push(word.slice(-2));
    if (word.length >= 3) endings.push(word.slice(-3));
    if (word.length >= 4) endings.push(word.slice(-4));
    // Vowel-consonant pattern from end
    const vowels = 'aeiou';
    let i = word.length - 1;
    while (i >= 0 && !vowels.includes(word[i])) i--;
    if (i >= 0) endings.push(word.slice(i));
    return endings;
  }

  _getRhymeBank() {
    // Common English word bank for rhyming
    return [
      'love', 'above', 'dove', 'shove', 'glove', 'of',
      'heart', 'start', 'part', 'art', 'smart', 'chart', 'dart', 'cart',
      'night', 'light', 'right', 'bright', 'sight', 'fight', 'might', 'tight', 'flight', 'white', 'knight', 'bite', 'kite', 'write', 'quite', 'despite',
      'day', 'way', 'say', 'play', 'stay', 'away', 'may', 'ray', 'gray', 'pray', 'today', 'display', 'okay', 'delay', 'sway', 'clay', 'bay', 'lay', 'pay', 'hey',
      'time', 'rhyme', 'climb', 'prime', 'dime', 'crime', 'mime', 'lime', 'chime', 'sublime',
      'fire', 'desire', 'higher', 'wire', 'tire', 'inspire', 'entire', 'admire', 'acquire', 'choir',
      'rain', 'pain', 'gain', 'brain', 'train', 'chain', 'main', 'plain', 'vain', 'strain', 'explain', 'contain', 'remain', 'sustain', 'obtain', 'refrain',
      'mind', 'find', 'kind', 'behind', 'blind', 'wind', 'grind', 'bind', 'remind', 'defined', 'designed', 'aligned', 'combined', 'resigned',
      'soul', 'whole', 'role', 'goal', 'control', 'scroll', 'patrol', 'console', 'enroll', 'stroll',
      'dream', 'stream', 'team', 'seem', 'scheme', 'theme', 'extreme', 'supreme', 'beam', 'cream', 'gleam', 'scream', 'steam',
      'song', 'long', 'strong', 'wrong', 'belong', 'along', 'prolong',
      'free', 'see', 'be', 'me', 'tree', 'three', 'agree', 'degree', 'key', 'sea', 'guarantee', 'debris',
      'fall', 'call', 'all', 'wall', 'tall', 'small', 'ball', 'hall', 'install', 'recall', 'overall',
      'moon', 'soon', 'tune', 'june', 'noon', 'spoon', 'balloon', 'cartoon', 'lagoon', 'platoon', 'immune', 'commune',
      'deep', 'keep', 'sleep', 'sweep', 'creep', 'leap', 'cheap', 'heap', 'steep', 'sheep', 'weep', 'peep',
      'blue', 'true', 'through', 'new', 'knew', 'grew', 'flew', 'drew', 'clue', 'pursue', 'review', 'venue', 'continue',
      'gold', 'told', 'hold', 'old', 'bold', 'cold', 'fold', 'sold', 'unfold', 'behold', 'controlled',
      'road', 'load', 'code', 'mode', 'node', 'abode', 'episode', 'explode', 'corrode',
      'sound', 'ground', 'found', 'round', 'bound', 'around', 'profound', 'surround', 'compound', 'background',
      'space', 'place', 'face', 'race', 'grace', 'trace', 'embrace', 'replace', 'pace', 'case', 'base', 'chase',
      'world', 'girl', 'pearl', 'curl', 'swirl', 'unfurl', 'whirl',
      'life', 'knife', 'wife', 'strife', 'rife',
      'blood', 'flood', 'mud', 'stud', 'thud', 'bud',
      'eye', 'sky', 'fly', 'high', 'try', 'cry', 'why', 'buy', 'guy', 'die', 'lie', 'tie', 'supply', 'reply', 'deny', 'apply', 'ally', 'satisfy', 'modify', 'amplify', 'justify', 'identify', 'butterfly',
      'run', 'sun', 'fun', 'done', 'one', 'gun', 'won', 'son', 'begun', 'everyone', 'overcome',
      'war', 'star', 'far', 'car', 'bar', 'scar', 'guitar', 'jar', 'bizarre',
      'real', 'feel', 'deal', 'heal', 'steal', 'reveal', 'ideal', 'appeal', 'conceal', 'ordeal',
      'fear', 'hear', 'near', 'clear', 'dear', 'year', 'appear', 'disappear', 'career', 'volunteer', 'pioneer', 'sincere', 'atmosphere', 'severe',
      'change', 'range', 'strange', 'arrange', 'exchange',
      'power', 'hour', 'flower', 'tower', 'shower', 'devour', 'empower',
      'dark', 'spark', 'mark', 'park', 'shark', 'bark', 'embark', 'remark',
      'stone', 'bone', 'alone', 'phone', 'tone', 'zone', 'own', 'grown', 'known', 'shown', 'thrown', 'blown', 'home', 'dome', 'chrome',
    ];
  }

  _openRhymeFinder() {
    const word = prompt('Enter a word to find rhymes:');
    if (!word) return;
    const rhymes = this.findRhymes(word);
    const panel = this._analyticsEl;
    let html = '<h3>Rhymes for "' + this._escapeHtml(word) + '"</h3>';
    if (!rhymes.length) {
      html += '<p>No rhymes found in the local bank. Try a different word.</p>';
    } else {
      html += '<div class="wt-rhyme-list">';
      rhymes.forEach(r => {
        html += '<span class="wt-rhyme-chip" style="cursor:pointer;display:inline-block;margin:3px;padding:4px 10px;background:#333;border-radius:12px">' + r + '</span>';
      });
      html += '</div>';
    }
    html += '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    panel.innerHTML = html;
    panel.style.display = 'block';

    // Click to insert rhyme
    panel.querySelectorAll('.wt-rhyme-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this._editorEl.focus();
        document.execCommand('insertText', false, chip.textContent + ' ');
      });
    });
  }

  countSyllablesInLine(line) {
    return line.split(/\s+/).filter(w => w).reduce((sum, w) => sum + this._countSyllables(w), 0);
  }

  /* ------------------------------------------------------------------ */
  /*  LYRIC WRITING MODE                                                 */
  /* ------------------------------------------------------------------ */

  _renderLyricOverlay() {
    const lines = this._getPlainText().split('\n');
    // Create or update overlay
    let overlay = this.container.querySelector('.wt-lyric-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'wt-lyric-overlay';
      this._editorEl.parentElement.appendChild(overlay);
    }
    let html = '';
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) {
        html += '<div class="wt-lyric-line wt-lyric-blank">&nbsp;</div>';
        return;
      }
      const syllables = this.countSyllablesInLine(trimmed);
      const words = trimmed.split(/\s+/);
      const wordSyllables = words.map(w => this._countSyllables(w));
      const meter = wordSyllables.map(s => {
        let pattern = '';
        for (let j = 0; j < s; j++) pattern += (j % 2 === 0 ? 'da' : 'DUM');
        return pattern;
      }).join('-');

      html += '<div class="wt-lyric-line">';
      html += '<span class="wt-lyric-num">' + (i + 1) + '</span>';
      html += '<span class="wt-lyric-syllable-count">' + syllables + ' syl</span>';
      html += '<span class="wt-lyric-meter">' + meter + '</span>';
      html += '</div>';
    });
    overlay.innerHTML = html;
  }

  /* ------------------------------------------------------------------ */
  /*  POETRY TEMPLATES                                                   */
  /* ------------------------------------------------------------------ */

  _initPoetryTemplates() {
    return {
      haiku: {
        name: 'Haiku',
        description: '3 lines: 5-7-5 syllables',
        lines: ['_____ (5 syllables)', '_______ (7 syllables)', '_____ (5 syllables)'],
        rules: [5, 7, 5],
      },
      sonnet: {
        name: 'Shakespearean Sonnet',
        description: '14 lines of iambic pentameter, ABAB CDCD EFEF GG',
        lines: Array.from({ length: 14 }, (_, i) => {
          const scheme = 'ABABCDCDEFEFGG';
          return 'Line ' + (i + 1) + ' (10 syllables, rhyme ' + scheme[i] + ')';
        }),
        rules: Array(14).fill(10),
      },
      limerick: {
        name: 'Limerick',
        description: '5 lines: AABBA, 8-8-5-5-8 syllables',
        lines: [
          '________ (8 syllables, A)',
          '________ (8 syllables, A)',
          '_____ (5 syllables, B)',
          '_____ (5 syllables, B)',
          '________ (8 syllables, A)',
        ],
        rules: [8, 8, 5, 5, 8],
      },
      freeVerse: {
        name: 'Free Verse',
        description: 'No fixed meter or rhyme. Express freely.',
        lines: ['Write your poem here...', '', 'No rules.', 'Just expression.'],
        rules: [],
      },
      tanka: {
        name: 'Tanka',
        description: '5 lines: 5-7-5-7-7 syllables',
        lines: ['_____ (5)', '_______ (7)', '_____ (5)', '_______ (7)', '_______ (7)'],
        rules: [5, 7, 5, 7, 7],
      },
      villanelle: {
        name: 'Villanelle',
        description: '19 lines: five tercets + quatrain, two refrains',
        lines: [
          'Refrain A1 (line 1)',
          'Line 2 (rhyme b)',
          'Refrain A2 (line 3)',
          '', 'Line 4 (rhyme a)', 'Line 5 (rhyme b)', 'Refrain A1',
          '', 'Line 7 (rhyme a)', 'Line 8 (rhyme b)', 'Refrain A2',
          '', 'Line 10 (rhyme a)', 'Line 11 (rhyme b)', 'Refrain A1',
          '', 'Line 13 (rhyme a)', 'Line 14 (rhyme b)', 'Refrain A2',
          '', 'Line 16 (rhyme a)', 'Line 17 (rhyme b)', 'Refrain A1', 'Refrain A2',
        ],
        rules: [],
      },
    };
  }

  _showPoetryTemplates() {
    const panel = this._analyticsEl;
    let html = '<h3>Poetry Templates</h3><div class="wt-template-list">';
    Object.entries(this._poetryTemplates).forEach(([key, tmpl]) => {
      html += '<div class="wt-template-card" style="margin-bottom:12px;padding:8px;border:1px solid #444;border-radius:6px">';
      html += '<strong>' + tmpl.name + '</strong>';
      html += '<p style="margin:4px 0;font-size:0.9em;color:#aaa">' + tmpl.description + '</p>';
      html += '<button class="wt-btn" data-template="' + key + '">Use Template</button>';
      html += '</div>';
    });
    html += '</div><button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    panel.innerHTML = html;
    panel.style.display = 'block';

    panel.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tmpl = this._poetryTemplates[btn.dataset.template];
        this._editorEl.innerHTML = tmpl.lines.map(l => '<p>' + this._escapeHtml(l) + '</p>').join('');
        this._pushUndo();
        panel.style.display = 'none';
        if (tmpl.rules.length) this.setMode('lyric');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  NAME GENERATOR                                                     */
  /* ------------------------------------------------------------------ */

  generateNames(options = {}) {
    const { count = 10, style = 'fantasy' } = options;
    const generators = {
      fantasy: () => this._fantasyName(),
      modern: () => this._modernName(),
      scifi: () => this._scifiName(),
      mythic: () => this._mythicName(),
    };
    const gen = generators[style] || generators.fantasy;
    const names = [];
    for (let i = 0; i < count; i++) names.push(gen());
    return names;
  }

  _fantasyName() {
    const prefixes = ['Ae', 'Thal', 'Kor', 'Zy', 'El', 'Bri', 'Mor', 'Fen', 'Val', 'Dra', 'Nar', 'Sel', 'Ith', 'Lor', 'Ash', 'Cy', 'Gal', 'Rin', 'Ven', 'Tar'];
    const middles = ['an', 'ri', 'el', 'or', 'in', 'ar', 'en', 'al', 'is', 'on', 'il', 'eth', 'wyn', 'ra', 'na'];
    const suffixes = ['dor', 'wyn', 'thas', 'iel', 'mir', 'oth', 'ria', 'dis', 'lar', 'ven', 'kas', 'dra', 'nis', 'riel', 'then', 'phyr'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const m = Math.random() > 0.4 ? middles[Math.floor(Math.random() * middles.length)] : '';
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    return p + m + s;
  }

  _modernName() {
    const first = ['James', 'Sophia', 'Marcus', 'Elena', 'Noah', 'Aria', 'Ethan', 'Maya', 'Lucas', 'Zara', 'Oliver', 'Ivy', 'Kai', 'Luna', 'Dante', 'Cleo', 'Felix', 'Sage', 'River', 'Quinn'];
    const last = ['Chen', 'Reeves', 'Okafor', 'Vasquez', 'Kim', 'Patel', 'Novak', 'Santos', 'Blake', 'Morgan', 'Hayes', 'Rivera', 'Foster', 'Ward', 'Cole', 'Nash', 'Cruz', 'Banks', 'Stone', 'Vale'];
    return first[Math.floor(Math.random() * first.length)] + ' ' + last[Math.floor(Math.random() * last.length)];
  }

  _scifiName() {
    const prefixes = ['Zyx', 'Nex', 'Ori', 'Vex', 'Qua', 'Xen', 'Tek', 'Syn', 'Kal', 'Dex', 'Rho', 'Psi', 'Tau', 'Sig', 'Axe'];
    const suffixes = ['-7', '-X', 'ion', 'ara', 'ium', 'os', '-Prime', 'ix', 'on', '-9', 'ek', 'ul', 'ax', '-Zero', 'oid'];
    const desig = ['Unit', 'Model', 'Series', 'Gen', 'Class', 'Proto', 'Mark'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    if (Math.random() > 0.5) {
      return desig[Math.floor(Math.random() * desig.length)] + ' ' + p + s;
    }
    return p + s;
  }

  _mythicName() {
    const roots = ['Ares', 'Athena', 'Odin', 'Freya', 'Anubis', 'Isis', 'Indra', 'Kali', 'Amara', 'Seraph', 'Titan', 'Orion', 'Helios', 'Selene', 'Thoth', 'Bastet', 'Fenrir', 'Brynhild', 'Loki', 'Morrigan'];
    const titles = ['the Bold', 'Shadowborn', 'Starcaller', 'of the Flame', 'Ironsworn', 'Dawnbringer', 'the Wanderer', 'Stormweaver', 'the Eternal', 'Moonkeeper'];
    const r = roots[Math.floor(Math.random() * roots.length)];
    return Math.random() > 0.5 ? r + ' ' + titles[Math.floor(Math.random() * titles.length)] : r;
  }

  _showNameGenerator() {
    const panel = this._analyticsEl;
    const styles = ['fantasy', 'modern', 'scifi', 'mythic'];
    let html = '<h3>Name Generator</h3>';
    styles.forEach(style => {
      html += '<h4>' + style.charAt(0).toUpperCase() + style.slice(1) + '</h4><ul>';
      this.generateNames({ count: 5, style }).forEach(n => {
        html += '<li style="cursor:pointer" class="wt-name-pick">' + this._escapeHtml(n) + '</li>';
      });
      html += '</ul>';
    });
    html += '<button class="wt-btn" id="wt-regen-names">Regenerate</button> ';
    html += '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    panel.innerHTML = html;
    panel.style.display = 'block';

    panel.querySelector('#wt-regen-names').addEventListener('click', () => this._showNameGenerator());
    panel.querySelectorAll('.wt-name-pick').forEach(li => {
      li.addEventListener('click', () => {
        this._editorEl.focus();
        document.execCommand('insertText', false, li.textContent);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  WRITING PROMPTS                                                    */
  /* ------------------------------------------------------------------ */

  _initWritingPrompts() {
    return [
      'Write about a sound you heard today that nobody else noticed.',
      'Describe a color without naming it.',
      'A stranger hands you a key. What does it unlock?',
      'Write the opening line of a story set 200 years from now.',
      'Rewrite a childhood memory from someone else\'s perspective.',
      'Write about the space between two musical notes.',
      'Describe an emotion as if it were a landscape.',
      'What would your shadow say if it could speak?',
      'A letter arrives, 10 years late. What does it say?',
      'Write about something lost that was never meant to be found.',
      'Describe silence in a noisy city.',
      'You wake up fluent in a language you\'ve never studied. What happens next?',
      'Tell the story of an object that outlasts its owner.',
      'Write about rain from the perspective of the ground.',
      'A song plays that changes everything. What song? Why?',
      'Describe the taste of a word.',
      'Write a conversation between your past self and future self.',
      'You find a room in your house you\'ve never seen before.',
      'Write about the last sunset.',
      'A single photograph captures an entire life. Describe it.',
      'Write about two strangers who share the same recurring dream.',
      'Describe what gravity feels like to someone who has never experienced it.',
      'Write a love letter to a place.',
      'The ocean sends back something unexpected. What is it?',
      'Write about a door that only opens once.',
      'Describe the sound of time passing.',
      'Write a poem using only questions.',
      'You can hear plants. What are they saying?',
      'Tell the story of the last library on Earth.',
      'Write about a bridge between two impossible things.',
    ];
  }

  _showWritingPrompt() {
    const idx = Math.floor(Math.random() * this._writingPrompts.length);
    const prompt = this._writingPrompts[idx];
    const panel = this._analyticsEl;
    panel.innerHTML = '<h3>Writing Prompt</h3>'
      + '<blockquote style="font-size:1.2em;padding:16px;border-left:4px solid #6c5ce7;margin:16px 0">'
      + this._escapeHtml(prompt) + '</blockquote>'
      + '<button class="wt-btn" id="wt-new-prompt">Another Prompt</button> '
      + '<button class="wt-btn" id="wt-use-prompt">Insert Into Editor</button> '
      + '<button class="wt-btn wt-close-panel" onclick="this.parentElement.style.display=\'none\'">Close</button>';
    panel.style.display = 'block';

    panel.querySelector('#wt-new-prompt').addEventListener('click', () => this._showWritingPrompt());
    panel.querySelector('#wt-use-prompt').addEventListener('click', () => {
      this._editorEl.focus();
      document.execCommand('insertText', false, '\n' + prompt + '\n\n');
      panel.style.display = 'none';
    });
  }

  /* ------------------------------------------------------------------ */
  /*  TELEPROMPTER MODE                                                  */
  /* ------------------------------------------------------------------ */

  _enterTeleprompterMode() {
    this._editorEl.contentEditable = 'false';
    this._editorEl.classList.add('wt-teleprompter-mode');
    this._editorEl.style.fontSize = this._telepromptFontSize + 'px';
    if (this._telepromptMirrored) {
      this._editorEl.style.transform = 'scaleX(-1)';
    }

    // Build teleprompter controls
    let controls = this.container.querySelector('.wt-teleprompter-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'wt-teleprompter-controls';
      this.container.appendChild(controls);
    }
    controls.innerHTML = ''
      + '<button class="wt-btn" id="wt-tp-play">Play</button>'
      + '<button class="wt-btn" id="wt-tp-pause">Pause</button>'
      + '<button class="wt-btn" id="wt-tp-reset">Reset</button>'
      + '<label>Speed: <input type="range" id="wt-tp-speed" min="0.5" max="10" step="0.5" value="' + this._telepromptSpeed + '"></label>'
      + '<label>Size: <input type="range" id="wt-tp-size" min="16" max="72" step="2" value="' + this._telepromptFontSize + '"></label>'
      + '<button class="wt-btn" id="wt-tp-mirror">' + (this._telepromptMirrored ? 'Unmirror' : 'Mirror') + '</button>'
      + '<button class="wt-btn" id="wt-tp-fullscreen">Fullscreen</button>'
      + '<button class="wt-btn" id="wt-tp-exit">Exit</button>';
    controls.style.display = 'flex';

    controls.querySelector('#wt-tp-play').addEventListener('click', () => this._startTeleprompter());
    controls.querySelector('#wt-tp-pause').addEventListener('click', () => this._stopTeleprompter());
    controls.querySelector('#wt-tp-reset').addEventListener('click', () => { this._editorEl.scrollTop = 0; });
    controls.querySelector('#wt-tp-speed').addEventListener('input', e => { this._telepromptSpeed = parseFloat(e.target.value); });
    controls.querySelector('#wt-tp-size').addEventListener('input', e => {
      this._telepromptFontSize = parseInt(e.target.value, 10);
      this._editorEl.style.fontSize = this._telepromptFontSize + 'px';
    });
    controls.querySelector('#wt-tp-mirror').addEventListener('click', () => {
      this._telepromptMirrored = !this._telepromptMirrored;
      this._editorEl.style.transform = this._telepromptMirrored ? 'scaleX(-1)' : 'none';
      controls.querySelector('#wt-tp-mirror').textContent = this._telepromptMirrored ? 'Unmirror' : 'Mirror';
    });
    controls.querySelector('#wt-tp-fullscreen').addEventListener('click', () => this._toggleFullscreen());
    controls.querySelector('#wt-tp-exit').addEventListener('click', () => this.setMode('richtext'));
  }

  _startTeleprompter() {
    this._stopTeleprompter();
    const scroll = () => {
      this._editorEl.scrollTop += this._telepromptSpeed;
      if (this._editorEl.scrollTop < this._editorEl.scrollHeight - this._editorEl.clientHeight) {
        this._telepromptScrollId = requestAnimationFrame(scroll);
      }
    };
    this._telepromptScrollId = requestAnimationFrame(scroll);
  }

  _stopTeleprompter() {
    if (this._telepromptScrollId) {
      cancelAnimationFrame(this._telepromptScrollId);
      this._telepromptScrollId = null;
    }
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  CONTENT GETTERS / SETTERS                                          */
  /* ------------------------------------------------------------------ */

  getHTML() {
    return this._editorEl.innerHTML;
  }

  setHTML(html) {
    this._editorEl.innerHTML = html;
    this._pushUndo();
    this._updateStatusBar();
  }

  getText() {
    return this._getPlainText();
  }

  setText(text) {
    this._editorEl.innerText = text;
    this._pushUndo();
    this._updateStatusBar();
  }

  getMarkdown() {
    return this.htmlToMarkdown(this._editorEl.innerHTML);
  }

  setMarkdown(md) {
    this._editorEl.innerHTML = this.markdownToHTML(md);
    this._pushUndo();
    this._updateStatusBar();
  }

  /* ------------------------------------------------------------------ */
  /*  UTILITY                                                            */
  /* ------------------------------------------------------------------ */

  _escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return str.replace(/[&<>"']/g, c => map[c]);
  }

  /* ------------------------------------------------------------------ */
  /*  INJECT STYLES                                                      */
  /* ------------------------------------------------------------------ */

  static injectStyles() {
    if (document.getElementById('wt-styles')) return;
    const style = document.createElement('style');
    style.id = 'wt-styles';
    style.textContent = `
      .wt-root {
        display: flex; flex-direction: column; height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #e0e0e0; background: #1a1a2e;
      }
      .wt-toolbar {
        display: flex; flex-wrap: wrap; gap: 2px; padding: 6px 8px;
        background: #16213e; border-bottom: 1px solid #333;
      }
      .wt-toolbar-group {
        display: flex; gap: 2px; margin-right: 8px;
        padding-right: 8px; border-right: 1px solid #333;
      }
      .wt-toolbar-group:last-child { border-right: none; }
      .wt-btn {
        background: #0f3460; color: #e0e0e0; border: 1px solid #1a1a4e;
        padding: 4px 8px; border-radius: 4px; cursor: pointer;
        font-size: 12px; min-width: 28px; text-align: center;
        transition: background 0.15s;
      }
      .wt-btn:hover { background: #1a5276; }
      .wt-btn:active { background: #6c5ce7; }
      .wt-editor-wrap {
        flex: 1; display: flex; overflow: hidden; position: relative;
      }
      .wt-editor {
        flex: 1; padding: 20px 24px; overflow-y: auto;
        outline: none; line-height: 1.7; font-size: 15px;
        min-height: 200px; background: #1a1a2e;
      }
      .wt-editor:focus { box-shadow: inset 0 0 0 2px #6c5ce744; }
      .wt-editor blockquote {
        border-left: 4px solid #6c5ce7; margin-left: 0;
        padding-left: 16px; color: #aaa;
      }
      .wt-editor pre {
        background: #0d1117; padding: 12px; border-radius: 6px;
        overflow-x: auto; font-family: 'Fira Code', monospace;
      }
      .wt-editor table { border-collapse: collapse; margin: 12px 0; }
      .wt-editor th, .wt-editor td {
        border: 1px solid #555; padding: 6px 10px;
      }
      .wt-editor th { background: #1e2a3a; }
      .wt-editor img { max-width: 100%; border-radius: 4px; }
      .wt-editor .wt-checklist { list-style: none; padding-left: 4px; }
      .wt-editor .wt-checklist li { display: flex; align-items: center; gap: 8px; }
      .wt-preview {
        flex: 1; padding: 20px 24px; overflow-y: auto;
        border-left: 1px solid #333; background: #12122a;
        line-height: 1.7; font-size: 15px;
      }
      .wt-analytics-panel, .wt-versions-panel {
        position: absolute; top: 0; right: 0; bottom: 0;
        width: 360px; background: #16213e; border-left: 1px solid #333;
        padding: 16px; overflow-y: auto; z-index: 10;
      }
      .wt-analytics-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0;
      }
      .wt-a-card {
        background: #0f3460; padding: 10px; border-radius: 6px; text-align: center;
      }
      .wt-a-card strong { display: block; font-size: 1.4em; color: #6c5ce7; }
      .wt-a-card span { font-size: 0.8em; color: #aaa; }
      .wt-version-item {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 0; border-bottom: 1px solid #333;
      }
      .wt-diff {
        background: #0d1117; padding: 12px; border-radius: 6px;
        font-family: monospace; font-size: 13px; line-height: 1.5;
        white-space: pre-wrap; overflow-x: auto;
      }
      .wt-status-bar {
        display: flex; gap: 16px; padding: 4px 12px;
        background: #0f3460; font-size: 12px; color: #aaa;
        border-top: 1px solid #333;
      }
      .wt-lyric-mode { font-family: 'Courier New', monospace; }
      .wt-lyric-overlay {
        position: absolute; top: 0; right: 0; width: 180px;
        padding: 20px 8px; font-size: 11px; color: #888;
        pointer-events: none; overflow-y: auto; height: 100%;
      }
      .wt-lyric-line { display: flex; gap: 6px; padding: 2px 0; white-space: nowrap; }
      .wt-lyric-num { width: 20px; text-align: right; color: #555; }
      .wt-lyric-syllable-count { color: #6c5ce7; font-weight: bold; }
      .wt-lyric-meter { color: #666; }
      .wt-teleprompter-mode {
        font-size: 32px !important; text-align: center;
        line-height: 2 !important; letter-spacing: 0.5px;
        padding: 60px 40px !important;
      }
      .wt-teleprompter-controls {
        display: flex; gap: 8px; padding: 8px 12px;
        background: #0a0a1a; align-items: center; flex-wrap: wrap;
      }
      .wt-teleprompter-controls label {
        display: flex; align-items: center; gap: 4px; font-size: 12px; color: #aaa;
      }
      .wt-teleprompter-controls input[type="range"] { width: 80px; }
      .wt-close-panel { margin-top: 12px; }
      @media (max-width: 768px) {
        .wt-analytics-panel, .wt-versions-panel { width: 100%; }
        .wt-analytics-grid { grid-template-columns: repeat(2, 1fr); }
        .wt-toolbar { gap: 1px; padding: 4px; }
        .wt-btn { padding: 3px 5px; font-size: 11px; min-width: 24px; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Auto-inject styles on load
WritingTools.injectStyles();

// Export on window
window.WritingTools = WritingTools;
