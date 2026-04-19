/**
 * Aurality Studio - Vector Design Tools Module
 * All-in-one creative super-app design toolkit
 * Vanilla JS, Web APIs only, no frameworks
 */

class DesignTools {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'design-tools-root';
      document.body.appendChild(this.container);
    }

    // State
    this.layers = [];
    this.activeLayerId = null;
    this.selectedElements = [];
    this.currentTool = 'select';
    this.zoom = 1;
    this.panOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.gridSize = 20;
    this.snapToGrid = false;
    this.showGrid = false;
    this.smartGuides = true;
    this.clipboard = [];
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 50;
    this.artboard = { width: 1080, height: 1080 };
    this.fill = '#4A90D9';
    this.stroke = '#333333';
    this.strokeWidth = 2;
    this.fontSize = 24;
    this.fontFamily = 'Inter';
    this.drawingPoints = [];
    this.isDrawing = false;
    this.dragStart = null;
    this.dragElement = null;
    this.resizeHandle = null;
    this.rotateActive = false;
    this.savedPalettes = [];
    this.loadedFonts = new Set(['Inter', 'Arial', 'Georgia', 'Courier New']);
    this.templates = this._getTemplates();
    this.artboardPresets = this._getArtboardPresets();

    this._idCounter = 0;
    this._init();
  }

  // ─── Initialization ──────────────────────────────────────────────

  _init() {
    this._buildUI();
    this._createSVGCanvas();
    this._bindEvents();
    this._addDefaultLayer();
    this._renderLayerPanel();
    this._updateToolbar();
  }

  _generateId() {
    return `dt-${++this._idCounter}-${Date.now().toString(36)}`;
  }

  // ─── UI Construction ─────────────────────────────────────────────

  _buildUI() {
    this.container.innerHTML = '';
    this.container.classList.add('dt-container');

    // Inject styles
    if (!document.getElementById('dt-styles')) {
      const style = document.createElement('style');
      style.id = 'dt-styles';
      style.textContent = this._getStyles();
      document.head.appendChild(style);
    }

    // Top toolbar
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'dt-toolbar';
    this.container.appendChild(this.toolbar);

    // Main area: left panel + canvas + right panel
    const main = document.createElement('div');
    main.className = 'dt-main';
    this.container.appendChild(main);

    this.leftPanel = document.createElement('div');
    this.leftPanel.className = 'dt-panel dt-left-panel';
    main.appendChild(this.leftPanel);

    this.canvasWrap = document.createElement('div');
    this.canvasWrap.className = 'dt-canvas-wrap';
    main.appendChild(this.canvasWrap);

    this.rightPanel = document.createElement('div');
    this.rightPanel.className = 'dt-panel dt-right-panel';
    main.appendChild(this.rightPanel);

    // Bottom bar
    this.bottomBar = document.createElement('div');
    this.bottomBar.className = 'dt-bottom-bar';
    this.container.appendChild(this.bottomBar);

    this._buildToolbar();
    this._buildLeftPanel();
    this._buildRightPanel();
    this._buildBottomBar();
  }

  _buildToolbar() {
    const tools = [
      { id: 'select', icon: '\u25B3', label: 'Select (V)' },
      { id: 'rectangle', icon: '\u25A1', label: 'Rectangle (R)' },
      { id: 'circle', icon: '\u25CB', label: 'Circle (C)' },
      { id: 'ellipse', icon: '\u2B2D', label: 'Ellipse (E)' },
      { id: 'polygon', icon: '\u2B23', label: 'Polygon (P)' },
      { id: 'star', icon: '\u2606', label: 'Star (S)' },
      { id: 'line', icon: '\u2571', label: 'Line (L)' },
      { id: 'arrow', icon: '\u2192', label: 'Arrow (A)' },
      { id: 'pen', icon: '\u270E', label: 'Pen Tool (N)' },
      { id: 'text', icon: 'T', label: 'Text (T)' },
      { id: 'eyedropper', icon: '\uD83D\uDCA7', label: 'Eyedropper (I)' },
    ];

    const toolGroup = document.createElement('div');
    toolGroup.className = 'dt-tool-group';

    tools.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'dt-tool-btn';
      btn.dataset.tool = t.id;
      btn.title = t.label;
      btn.textContent = t.icon;
      btn.addEventListener('click', () => this.setTool(t.id));
      toolGroup.appendChild(btn);
    });

    this.toolbar.appendChild(toolGroup);

    // Separator
    this.toolbar.appendChild(this._sep());

    // Fill & stroke
    const colorGroup = document.createElement('div');
    colorGroup.className = 'dt-tool-group dt-color-group';

    const fillLabel = document.createElement('span');
    fillLabel.textContent = 'Fill:';
    fillLabel.className = 'dt-label';
    colorGroup.appendChild(fillLabel);

    this.fillInput = document.createElement('input');
    this.fillInput.type = 'color';
    this.fillInput.value = this.fill;
    this.fillInput.className = 'dt-color-input';
    this.fillInput.addEventListener('input', e => { this.fill = e.target.value; this._applyToSelected('fill', this.fill); });
    colorGroup.appendChild(this.fillInput);

    const strokeLabel = document.createElement('span');
    strokeLabel.textContent = 'Stroke:';
    strokeLabel.className = 'dt-label';
    colorGroup.appendChild(strokeLabel);

    this.strokeInput = document.createElement('input');
    this.strokeInput.type = 'color';
    this.strokeInput.value = this.stroke;
    this.strokeInput.className = 'dt-color-input';
    this.strokeInput.addEventListener('input', e => { this.stroke = e.target.value; this._applyToSelected('stroke', this.stroke); });
    colorGroup.appendChild(this.strokeInput);

    const swLabel = document.createElement('span');
    swLabel.textContent = 'Width:';
    swLabel.className = 'dt-label';
    colorGroup.appendChild(swLabel);

    this.strokeWidthInput = document.createElement('input');
    this.strokeWidthInput.type = 'number';
    this.strokeWidthInput.min = 0;
    this.strokeWidthInput.max = 50;
    this.strokeWidthInput.value = this.strokeWidth;
    this.strokeWidthInput.className = 'dt-num-input';
    this.strokeWidthInput.addEventListener('input', e => { this.strokeWidth = +e.target.value; this._applyToSelected('stroke-width', this.strokeWidth); });
    colorGroup.appendChild(this.strokeWidthInput);

    this.toolbar.appendChild(colorGroup);

    // Separator
    this.toolbar.appendChild(this._sep());

    // Actions
    const actionGroup = document.createElement('div');
    actionGroup.className = 'dt-tool-group';

    const actions = [
      { label: 'Undo', action: () => this.undo() },
      { label: 'Redo', action: () => this.redo() },
      { label: 'Delete', action: () => this.deleteSelected() },
      { label: 'Duplicate', action: () => this.duplicateSelected() },
      { label: 'Group', action: () => this.groupSelected() },
      { label: 'Ungroup', action: () => this.ungroupSelected() },
    ];

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'dt-action-btn';
      btn.textContent = a.label;
      btn.addEventListener('click', a.action);
      actionGroup.appendChild(btn);
    });

    this.toolbar.appendChild(actionGroup);
  }

  _buildLeftPanel() {
    this.leftPanel.innerHTML = '';

    // Tool options
    const optSection = this._panelSection('Tool Options');
    this.toolOptionsEl = document.createElement('div');
    this.toolOptionsEl.className = 'dt-tool-options';
    optSection.appendChild(this.toolOptionsEl);
    this.leftPanel.appendChild(optSection);

    // Layers
    const layerSection = this._panelSection('Layers');
    this.layerListEl = document.createElement('div');
    this.layerListEl.className = 'dt-layer-list';
    layerSection.appendChild(this.layerListEl);

    const layerActions = document.createElement('div');
    layerActions.className = 'dt-layer-actions';
    [
      { label: '+ Add', action: () => { this.addLayer(); this._renderLayerPanel(); } },
      { label: 'Delete', action: () => { this.deleteLayer(this.activeLayerId); this._renderLayerPanel(); } },
      { label: 'Up', action: () => { this.moveLayerUp(this.activeLayerId); this._renderLayerPanel(); } },
      { label: 'Down', action: () => { this.moveLayerDown(this.activeLayerId); this._renderLayerPanel(); } },
    ].forEach(a => {
      const b = document.createElement('button');
      b.className = 'dt-sm-btn';
      b.textContent = a.label;
      b.addEventListener('click', a.action);
      layerActions.appendChild(b);
    });
    layerSection.appendChild(layerActions);
    this.leftPanel.appendChild(layerSection);

    // Alignment
    const alignSection = this._panelSection('Align');
    const alignBtns = document.createElement('div');
    alignBtns.className = 'dt-align-btns';
    const aligns = [
      { label: 'L', title: 'Align Left', fn: () => this.alignSelected('left') },
      { label: 'CX', title: 'Center H', fn: () => this.alignSelected('center') },
      { label: 'R', title: 'Align Right', fn: () => this.alignSelected('right') },
      { label: 'T', title: 'Align Top', fn: () => this.alignSelected('top') },
      { label: 'CY', title: 'Center V', fn: () => this.alignSelected('middle') },
      { label: 'B', title: 'Align Bottom', fn: () => this.alignSelected('bottom') },
      { label: 'DH', title: 'Distribute H', fn: () => this.distributeSelected('horizontal') },
      { label: 'DV', title: 'Distribute V', fn: () => this.distributeSelected('vertical') },
    ];
    aligns.forEach(a => {
      const b = document.createElement('button');
      b.className = 'dt-align-btn';
      b.title = a.title;
      b.textContent = a.label;
      b.addEventListener('click', a.fn);
      alignBtns.appendChild(b);
    });
    alignSection.appendChild(alignBtns);
    this.leftPanel.appendChild(alignSection);
  }

  _buildRightPanel() {
    this.rightPanel.innerHTML = '';

    // Color system
    const colorSection = this._panelSection('Color');
    this._buildColorSystem(colorSection);
    this.rightPanel.appendChild(colorSection);

    // Typography
    const typoSection = this._panelSection('Typography');
    this._buildTypographyPanel(typoSection);
    this.rightPanel.appendChild(typoSection);

    // Templates
    const tplSection = this._panelSection('Templates');
    this._buildTemplatePanel(tplSection);
    this.rightPanel.appendChild(tplSection);

    // Export
    const expSection = this._panelSection('Export');
    this._buildExportPanel(expSection);
    this.rightPanel.appendChild(expSection);
  }

  _buildBottomBar() {
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'dt-label';
    zoomLabel.textContent = 'Zoom:';
    this.bottomBar.appendChild(zoomLabel);

    this.zoomDisplay = document.createElement('span');
    this.zoomDisplay.className = 'dt-zoom-display';
    this.zoomDisplay.textContent = '100%';
    this.bottomBar.appendChild(this.zoomDisplay);

    const zoomBtns = [
      { label: '-', fn: () => this.setZoom(this.zoom - 0.1) },
      { label: 'Fit', fn: () => this.fitToCanvas() },
      { label: '+', fn: () => this.setZoom(this.zoom + 0.1) },
    ];
    zoomBtns.forEach(z => {
      const b = document.createElement('button');
      b.className = 'dt-sm-btn';
      b.textContent = z.label;
      b.addEventListener('click', z.fn);
      this.bottomBar.appendChild(b);
    });

    this.bottomBar.appendChild(this._sep());

    // Grid toggle
    const gridBtn = document.createElement('button');
    gridBtn.className = 'dt-sm-btn';
    gridBtn.textContent = 'Grid';
    gridBtn.addEventListener('click', () => { this.showGrid = !this.showGrid; this._renderGrid(); gridBtn.classList.toggle('active', this.showGrid); });
    this.bottomBar.appendChild(gridBtn);

    const snapBtn = document.createElement('button');
    snapBtn.className = 'dt-sm-btn';
    snapBtn.textContent = 'Snap';
    snapBtn.addEventListener('click', () => { this.snapToGrid = !this.snapToGrid; snapBtn.classList.toggle('active', this.snapToGrid); });
    this.bottomBar.appendChild(snapBtn);

    const guidesBtn = document.createElement('button');
    guidesBtn.className = 'dt-sm-btn';
    guidesBtn.textContent = 'Guides';
    guidesBtn.addEventListener('click', () => { this.smartGuides = !this.smartGuides; guidesBtn.classList.toggle('active', this.smartGuides); });
    this.bottomBar.appendChild(guidesBtn);

    this.bottomBar.appendChild(this._sep());

    // Artboard size
    const abLabel = document.createElement('span');
    abLabel.className = 'dt-label';
    abLabel.textContent = 'Artboard:';
    this.bottomBar.appendChild(abLabel);

    this.artboardSelect = document.createElement('select');
    this.artboardSelect.className = 'dt-select';
    Object.entries(this.artboardPresets).forEach(([name, size]) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${size.width}x${size.height})`;
      this.artboardSelect.appendChild(opt);
    });
    this.artboardSelect.addEventListener('change', e => {
      const preset = this.artboardPresets[e.target.value];
      if (preset) this.setArtboard(preset.width, preset.height);
    });
    this.bottomBar.appendChild(this.artboardSelect);

    // Coordinates
    this.coordsDisplay = document.createElement('span');
    this.coordsDisplay.className = 'dt-coords';
    this.coordsDisplay.textContent = 'X: 0  Y: 0';
    this.bottomBar.appendChild(this.coordsDisplay);
  }

  // ─── Panel Builders ──────────────────────────────────────────────

  _buildColorSystem(parent) {
    // Hex input
    const hexRow = document.createElement('div');
    hexRow.className = 'dt-row';
    const hexLabel = document.createElement('label');
    hexLabel.textContent = 'Hex:';
    hexLabel.className = 'dt-label';
    this.hexInput = document.createElement('input');
    this.hexInput.type = 'text';
    this.hexInput.value = this.fill;
    this.hexInput.className = 'dt-text-input';
    this.hexInput.addEventListener('change', e => {
      const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
      this.fill = val;
      this.fillInput.value = val;
    });
    hexRow.appendChild(hexLabel);
    hexRow.appendChild(this.hexInput);
    parent.appendChild(hexRow);

    // RGB sliders
    ['R', 'G', 'B'].forEach((ch, i) => {
      const row = document.createElement('div');
      row.className = 'dt-row';
      const label = document.createElement('label');
      label.textContent = ch + ':';
      label.className = 'dt-label';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = 255;
      slider.value = parseInt(this.fill.slice(1 + i * 2, 3 + i * 2), 16) || 0;
      slider.className = 'dt-slider';
      slider.dataset.channel = ch;
      slider.addEventListener('input', () => this._updateColorFromSliders());
      row.appendChild(label);
      row.appendChild(slider);
      parent.appendChild(row);
    });

    // Gradient editor
    const gradRow = document.createElement('div');
    gradRow.className = 'dt-row';
    const gradLabel = document.createElement('label');
    gradLabel.textContent = 'Gradient:';
    gradLabel.className = 'dt-label';
    const gradType = document.createElement('select');
    gradType.className = 'dt-select dt-select-sm';
    ['none', 'linear', 'radial'].forEach(t => {
      const o = document.createElement('option');
      o.value = t;
      o.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      gradType.appendChild(o);
    });
    this.gradientType = gradType;
    gradRow.appendChild(gradLabel);
    gradRow.appendChild(gradType);
    parent.appendChild(gradRow);

    const gradColors = document.createElement('div');
    gradColors.className = 'dt-row';
    this.gradStart = document.createElement('input');
    this.gradStart.type = 'color';
    this.gradStart.value = '#4A90D9';
    this.gradStart.className = 'dt-color-input';
    this.gradEnd = document.createElement('input');
    this.gradEnd.type = 'color';
    this.gradEnd.value = '#D94A90';
    this.gradEnd.className = 'dt-color-input';
    const applyGrad = document.createElement('button');
    applyGrad.textContent = 'Apply';
    applyGrad.className = 'dt-sm-btn';
    applyGrad.addEventListener('click', () => this._applyGradient());
    gradColors.appendChild(this.gradStart);
    gradColors.appendChild(this.gradEnd);
    gradColors.appendChild(applyGrad);
    parent.appendChild(gradColors);

    // Palette generator
    const palRow = document.createElement('div');
    palRow.className = 'dt-row';
    const palLabel = document.createElement('label');
    palLabel.textContent = 'Palette:';
    palLabel.className = 'dt-label';
    this.paletteMode = document.createElement('select');
    this.paletteMode.className = 'dt-select dt-select-sm';
    ['complementary', 'analogous', 'triadic', 'tetradic', 'monochromatic'].forEach(m => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m.charAt(0).toUpperCase() + m.slice(1);
      this.paletteMode.appendChild(o);
    });
    const genPal = document.createElement('button');
    genPal.textContent = 'Generate';
    genPal.className = 'dt-sm-btn';
    genPal.addEventListener('click', () => this._generatePalette());
    palRow.appendChild(palLabel);
    palRow.appendChild(this.paletteMode);
    palRow.appendChild(genPal);
    parent.appendChild(palRow);

    this.paletteDisplay = document.createElement('div');
    this.paletteDisplay.className = 'dt-palette-display';
    parent.appendChild(this.paletteDisplay);

    // Saved palettes
    const savePalBtn = document.createElement('button');
    savePalBtn.textContent = 'Save Palette';
    savePalBtn.className = 'dt-sm-btn';
    savePalBtn.addEventListener('click', () => this._savePalette());
    parent.appendChild(savePalBtn);

    this.savedPaletteDisplay = document.createElement('div');
    this.savedPaletteDisplay.className = 'dt-saved-palettes';
    parent.appendChild(this.savedPaletteDisplay);
  }

  _buildTypographyPanel(parent) {
    // Font family
    const fontRow = document.createElement('div');
    fontRow.className = 'dt-row';
    const fontLabel = document.createElement('label');
    fontLabel.textContent = 'Font:';
    fontLabel.className = 'dt-label';
    this.fontSelect = document.createElement('select');
    this.fontSelect.className = 'dt-select';
    const defaultFonts = [
      'Inter', 'Arial', 'Georgia', 'Courier New', 'Helvetica', 'Times New Roman',
      'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Playfair Display',
      'Oswald', 'Raleway', 'Merriweather', 'Nunito', 'Ubuntu', 'Dancing Script',
      'Bebas Neue', 'Abril Fatface', 'Pacifico', 'Lobster', 'Comfortaa',
    ];
    defaultFonts.forEach(f => {
      const o = document.createElement('option');
      o.value = f;
      o.textContent = f;
      this.fontSelect.appendChild(o);
    });
    this.fontSelect.value = this.fontFamily;
    this.fontSelect.addEventListener('change', e => {
      this.fontFamily = e.target.value;
      this._loadGoogleFont(this.fontFamily);
      this._applyTextProp('font-family', this.fontFamily);
    });
    fontRow.appendChild(fontLabel);
    fontRow.appendChild(this.fontSelect);
    parent.appendChild(fontRow);

    // Custom font loader
    const customFontRow = document.createElement('div');
    customFontRow.className = 'dt-row';
    this.customFontInput = document.createElement('input');
    this.customFontInput.type = 'text';
    this.customFontInput.placeholder = 'Google Font name...';
    this.customFontInput.className = 'dt-text-input';
    const loadFontBtn = document.createElement('button');
    loadFontBtn.textContent = 'Load';
    loadFontBtn.className = 'dt-sm-btn';
    loadFontBtn.addEventListener('click', () => {
      const name = this.customFontInput.value.trim();
      if (name) this._loadGoogleFont(name);
    });
    customFontRow.appendChild(this.customFontInput);
    customFontRow.appendChild(loadFontBtn);
    parent.appendChild(customFontRow);

    // Font size
    const sizeRow = document.createElement('div');
    sizeRow.className = 'dt-row';
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Size:';
    sizeLabel.className = 'dt-label';
    this.fontSizeInput = document.createElement('input');
    this.fontSizeInput.type = 'number';
    this.fontSizeInput.min = 6;
    this.fontSizeInput.max = 500;
    this.fontSizeInput.value = this.fontSize;
    this.fontSizeInput.className = 'dt-num-input';
    this.fontSizeInput.addEventListener('input', e => {
      this.fontSize = +e.target.value;
      this._applyTextProp('font-size', this.fontSize + 'px');
    });
    sizeRow.appendChild(sizeLabel);
    sizeRow.appendChild(this.fontSizeInput);
    parent.appendChild(sizeRow);

    // Bold / Italic
    const styleRow = document.createElement('div');
    styleRow.className = 'dt-row';
    const boldBtn = document.createElement('button');
    boldBtn.className = 'dt-sm-btn';
    boldBtn.textContent = 'B';
    boldBtn.style.fontWeight = 'bold';
    boldBtn.addEventListener('click', () => this._toggleTextProp('font-weight', 'bold', 'normal'));
    const italicBtn = document.createElement('button');
    italicBtn.className = 'dt-sm-btn';
    italicBtn.textContent = 'I';
    italicBtn.style.fontStyle = 'italic';
    italicBtn.addEventListener('click', () => this._toggleTextProp('font-style', 'italic', 'normal'));
    styleRow.appendChild(boldBtn);
    styleRow.appendChild(italicBtn);
    parent.appendChild(styleRow);

    // Letter spacing
    const spacingRow = document.createElement('div');
    spacingRow.className = 'dt-row';
    const spacingLabel = document.createElement('label');
    spacingLabel.textContent = 'Spacing:';
    spacingLabel.className = 'dt-label';
    this.letterSpacingInput = document.createElement('input');
    this.letterSpacingInput.type = 'number';
    this.letterSpacingInput.value = 0;
    this.letterSpacingInput.min = -10;
    this.letterSpacingInput.max = 50;
    this.letterSpacingInput.step = 0.5;
    this.letterSpacingInput.className = 'dt-num-input';
    this.letterSpacingInput.addEventListener('input', e => this._applyTextProp('letter-spacing', e.target.value + 'px'));
    spacingRow.appendChild(spacingLabel);
    spacingRow.appendChild(this.letterSpacingInput);
    parent.appendChild(spacingRow);

    // Line height
    const lhRow = document.createElement('div');
    lhRow.className = 'dt-row';
    const lhLabel = document.createElement('label');
    lhLabel.textContent = 'Line H:';
    lhLabel.className = 'dt-label';
    this.lineHeightInput = document.createElement('input');
    this.lineHeightInput.type = 'number';
    this.lineHeightInput.value = 1.4;
    this.lineHeightInput.min = 0.5;
    this.lineHeightInput.max = 5;
    this.lineHeightInput.step = 0.1;
    this.lineHeightInput.className = 'dt-num-input';
    this.lineHeightInput.addEventListener('input', e => this._applyTextLineHeight(+e.target.value));
    lhRow.appendChild(lhLabel);
    lhRow.appendChild(this.lineHeightInput);
    parent.appendChild(lhRow);

    // Text effects
    const fxLabel = document.createElement('label');
    fxLabel.textContent = 'Text Effects:';
    fxLabel.className = 'dt-label';
    parent.appendChild(fxLabel);

    const fxRow = document.createElement('div');
    fxRow.className = 'dt-row';
    [
      { label: 'Shadow', fn: () => this._applyTextEffect('shadow') },
      { label: 'Outline', fn: () => this._applyTextEffect('outline') },
      { label: 'Grad Fill', fn: () => this._applyTextEffect('gradient') },
      { label: 'On Path', fn: () => this._textOnPath() },
    ].forEach(fx => {
      const b = document.createElement('button');
      b.className = 'dt-sm-btn';
      b.textContent = fx.label;
      b.addEventListener('click', fx.fn);
      fxRow.appendChild(b);
    });
    parent.appendChild(fxRow);
  }

  _buildTemplatePanel(parent) {
    const cats = Object.keys(this.templates);
    this.templateCatSelect = document.createElement('select');
    this.templateCatSelect.className = 'dt-select';
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      this.templateCatSelect.appendChild(o);
    });
    this.templateCatSelect.addEventListener('change', () => this._renderTemplates());
    parent.appendChild(this.templateCatSelect);

    this.templateListEl = document.createElement('div');
    this.templateListEl.className = 'dt-template-list';
    parent.appendChild(this.templateListEl);
    this._renderTemplates();
  }

  _buildExportPanel(parent) {
    const formats = ['SVG', 'PNG', 'JPEG', 'PDF'];
    formats.forEach(fmt => {
      const btn = document.createElement('button');
      btn.className = 'dt-export-btn';
      btn.textContent = `Export ${fmt}`;
      btn.addEventListener('click', () => this.export(fmt.toLowerCase()));
      parent.appendChild(btn);
    });

    const cssBtn = document.createElement('button');
    cssBtn.className = 'dt-export-btn';
    cssBtn.textContent = 'Copy CSS';
    cssBtn.addEventListener('click', () => this.copyCSSOfSelected());
    parent.appendChild(cssBtn);
  }

  // ─── SVG Canvas ──────────────────────────────────────────────────

  _createSVGCanvas() {
    this.svgNS = 'http://www.w3.org/2000/svg';

    this.svg = document.createElementNS(this.svgNS, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('class', 'dt-svg-canvas');
    this.svg.style.cursor = 'default';

    // Defs for gradients, patterns, filters
    this.defs = document.createElementNS(this.svgNS, 'defs');
    this.svg.appendChild(this.defs);

    // Grid pattern
    this._createGridPattern();

    // Artboard background
    this.artboardGroup = document.createElementNS(this.svgNS, 'g');
    this.artboardGroup.setAttribute('class', 'dt-artboard-group');

    this.artboardBg = document.createElementNS(this.svgNS, 'rect');
    this.artboardBg.setAttribute('width', this.artboard.width);
    this.artboardBg.setAttribute('height', this.artboard.height);
    this.artboardBg.setAttribute('fill', '#ffffff');
    this.artboardBg.setAttribute('stroke', '#ccc');
    this.artboardBg.setAttribute('stroke-width', '1');
    this.artboardGroup.appendChild(this.artboardBg);

    // Grid overlay
    this.gridRect = document.createElementNS(this.svgNS, 'rect');
    this.gridRect.setAttribute('width', this.artboard.width);
    this.gridRect.setAttribute('height', this.artboard.height);
    this.gridRect.setAttribute('fill', 'url(#dt-grid-pattern)');
    this.gridRect.setAttribute('pointer-events', 'none');
    this.gridRect.style.display = 'none';
    this.artboardGroup.appendChild(this.gridRect);

    // Layer container
    this.layerContainer = document.createElementNS(this.svgNS, 'g');
    this.layerContainer.setAttribute('class', 'dt-layers');
    this.artboardGroup.appendChild(this.layerContainer);

    // Smart guides layer
    this.guidesGroup = document.createElementNS(this.svgNS, 'g');
    this.guidesGroup.setAttribute('class', 'dt-guides');
    this.guidesGroup.setAttribute('pointer-events', 'none');
    this.artboardGroup.appendChild(this.guidesGroup);

    // Selection handles layer
    this.handlesGroup = document.createElementNS(this.svgNS, 'g');
    this.handlesGroup.setAttribute('class', 'dt-handles');
    this.handlesGroup.setAttribute('pointer-events', 'none');
    this.artboardGroup.appendChild(this.handlesGroup);

    this.svg.appendChild(this.artboardGroup);
    this.canvasWrap.appendChild(this.svg);

    this._updateViewBox();
  }

  _createGridPattern() {
    const pattern = document.createElementNS(this.svgNS, 'pattern');
    pattern.setAttribute('id', 'dt-grid-pattern');
    pattern.setAttribute('width', this.gridSize);
    pattern.setAttribute('height', this.gridSize);
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');

    const path = document.createElementNS(this.svgNS, 'path');
    path.setAttribute('d', `M ${this.gridSize} 0 L 0 0 0 ${this.gridSize}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(0,0,0,0.08)');
    path.setAttribute('stroke-width', '0.5');
    pattern.appendChild(path);

    this.defs.appendChild(pattern);
  }

  _updateViewBox() {
    const padding = 100;
    const vbX = -padding + this.panOffset.x;
    const vbY = -padding + this.panOffset.y;
    const vbW = (this.artboard.width + padding * 2) / this.zoom;
    const vbH = (this.artboard.height + padding * 2) / this.zoom;
    this.svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  }

  // ─── Event Binding ───────────────────────────────────────────────

  _bindEvents() {
    this.svg.addEventListener('mousedown', e => this._onMouseDown(e));
    this.svg.addEventListener('mousemove', e => this._onMouseMove(e));
    this.svg.addEventListener('mouseup', e => this._onMouseUp(e));
    this.svg.addEventListener('dblclick', e => this._onDblClick(e));
    this.svg.addEventListener('wheel', e => this._onWheel(e), { passive: false });
    this.svg.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('keydown', e => this._onKeyDown(e));
    document.addEventListener('keyup', e => this._onKeyUp(e));
  }

  _getSVGPoint(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = this.svg.getScreenCTM().inverse();
    const svgPt = pt.matrixTransform(ctm);
    return { x: svgPt.x, y: svgPt.y };
  }

  _snapPoint(pt) {
    if (!this.snapToGrid) return pt;
    return {
      x: Math.round(pt.x / this.gridSize) * this.gridSize,
      y: Math.round(pt.y / this.gridSize) * this.gridSize,
    };
  }

  _onMouseDown(e) {
    const pt = this._getSVGPoint(e);
    const snapped = this._snapPoint(pt);

    // Middle mouse or space+click for pan
    if (e.button === 1 || (e.button === 0 && e.spaceKey)) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.svg.style.cursor = 'grabbing';
      return;
    }

    if (this.currentTool === 'select') {
      this._handleSelectDown(e, pt);
    } else if (this.currentTool === 'eyedropper') {
      this._handleEyedropper(pt);
    } else if (this.currentTool === 'pen') {
      this._handlePenDown(snapped);
    } else if (this.currentTool === 'text') {
      this._handleTextDown(snapped);
    } else {
      this.isDrawing = true;
      this.drawStart = snapped;
      this._saveState();
    }
  }

  _onMouseMove(e) {
    const pt = this._getSVGPoint(e);
    const snapped = this._snapPoint(pt);

    this.coordsDisplay.textContent = `X: ${Math.round(pt.x)}  Y: ${Math.round(pt.y)}`;

    if (this.isPanning) {
      const dx = (e.clientX - this.panStart.x) / this.zoom;
      const dy = (e.clientY - this.panStart.y) / this.zoom;
      this.panOffset.x -= dx;
      this.panOffset.y -= dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this._updateViewBox();
      return;
    }

    if (this.dragElement && this.currentTool === 'select') {
      this._handleDrag(pt);
      return;
    }

    if (this.resizeHandle && this.currentTool === 'select') {
      this._handleResize(pt);
      return;
    }

    if (this.isDrawing) {
      this._handleShapeDraw(snapped);
    }

    if (this.smartGuides && this.selectedElements.length > 0) {
      this._renderSmartGuides(pt);
    }
  }

  _onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.svg.style.cursor = 'default';
      return;
    }

    if (this.isDrawing) {
      this.isDrawing = false;
      this._finalizeShape();
    }

    if (this.dragElement) {
      this.dragElement = null;
    }

    if (this.resizeHandle) {
      this.resizeHandle = null;
    }

    this.guidesGroup.innerHTML = '';
  }

  _onDblClick(e) {
    const pt = this._getSVGPoint(e);
    if (this.currentTool === 'pen' && this.drawingPoints.length > 1) {
      this._finalizePenPath();
    }
    // Double-click text to edit
    const target = e.target;
    if (target.tagName === 'text' || target.closest('text')) {
      this._editTextInline(target.closest('text') || target);
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.setZoom(this.zoom + delta);
  }

  _onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z') { e.preventDefault(); this.undo(); }
    else if (ctrl && e.key === 'y') { e.preventDefault(); this.redo(); }
    else if (ctrl && e.key === 'c') { e.preventDefault(); this.copy(); }
    else if (ctrl && e.key === 'v') { e.preventDefault(); this.paste(); }
    else if (ctrl && e.key === 'a') { e.preventDefault(); this.selectAll(); }
    else if (ctrl && e.key === 'g') { e.preventDefault(); this.groupSelected(); }
    else if (ctrl && e.shiftKey && e.key === 'G') { e.preventDefault(); this.ungroupSelected(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); }
    else if (e.key === 'v' || e.key === 'V') { this.setTool('select'); }
    else if (e.key === 'r') { this.setTool('rectangle'); }
    else if (e.key === 'c' && !ctrl) { this.setTool('circle'); }
    else if (e.key === 'e') { this.setTool('ellipse'); }
    else if (e.key === 'p' && !ctrl) { this.setTool('polygon'); }
    else if (e.key === 's' && !ctrl) { this.setTool('star'); }
    else if (e.key === 'l') { this.setTool('line'); }
    else if (e.key === 'a' && !ctrl) { this.setTool('arrow'); }
    else if (e.key === 'n') { this.setTool('pen'); }
    else if (e.key === 't') { this.setTool('text'); }
    else if (e.key === 'i') { this.setTool('eyedropper'); }
    else if (e.key === ' ') { e.preventDefault(); this._spaceHeld = true; }

    // Arrow key nudge
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && this.selectedElements.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      this._nudgeSelected(dx, dy);
    }
  }

  _onKeyUp(e) {
    if (e.key === ' ') this._spaceHeld = false;
  }

  // ─── Tool Handlers ───────────────────────────────────────────────

  _handleSelectDown(e, pt) {
    const target = e.target;

    // Check if clicking a handle
    if (target.classList && target.classList.contains('dt-handle')) {
      this.resizeHandle = target.dataset.handle;
      this.resizeStart = pt;
      this.resizeOriginal = this._getElementBBox(this.selectedElements[0]);
      return;
    }

    // Check if clicking an element
    const el = this._findElementAt(target);
    if (el) {
      if (!e.shiftKey) {
        this.selectedElements = [el];
      } else {
        const idx = this.selectedElements.indexOf(el);
        if (idx >= 0) this.selectedElements.splice(idx, 1);
        else this.selectedElements.push(el);
      }
      this.dragElement = el;
      this.dragStart = pt;
      this.dragOriginalPos = this._getElementPosition(el);
      this._saveState();
    } else {
      this.selectedElements = [];
    }
    this._renderSelectionHandles();
  }

  _findElementAt(target) {
    if (target === this.svg || target === this.artboardBg || target === this.gridRect) return null;
    // Walk up to find element directly in a layer group
    let el = target;
    while (el && el.parentNode !== this.layerContainer) {
      if (el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('dt-layer-group')) {
        return el;
      }
      el = el.parentNode;
    }
    return target.dataset && target.dataset.dtId ? target : null;
  }

  _handleDrag(pt) {
    if (!this.dragElement || !this.dragStart) return;
    const dx = pt.x - this.dragStart.x;
    const dy = pt.y - this.dragStart.y;

    const snappedDx = this.snapToGrid ? Math.round(dx / this.gridSize) * this.gridSize : dx;
    const snappedDy = this.snapToGrid ? Math.round(dy / this.gridSize) * this.gridSize : dy;

    this._moveElement(this.dragElement, this.dragOriginalPos.x + snappedDx, this.dragOriginalPos.y + snappedDy);
    this._renderSelectionHandles();
  }

  _handleResize(pt) {
    if (!this.resizeOriginal || !this.selectedElements.length) return;
    const el = this.selectedElements[0];
    const orig = this.resizeOriginal;
    const dx = pt.x - this.resizeStart.x;
    const dy = pt.y - this.resizeStart.y;
    const handle = this.resizeHandle;

    let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height;

    if (handle.includes('e')) newW = Math.max(10, orig.width + dx);
    if (handle.includes('w')) { newW = Math.max(10, orig.width - dx); newX = orig.x + dx; }
    if (handle.includes('s')) newH = Math.max(10, orig.height + dy);
    if (handle.includes('n')) { newH = Math.max(10, orig.height - dy); newY = orig.y + dy; }

    this._resizeElement(el, newX, newY, newW, newH);
    this._renderSelectionHandles();
  }

  _handleShapeDraw(pt) {
    if (!this.drawStart) return;

    const x = Math.min(this.drawStart.x, pt.x);
    const y = Math.min(this.drawStart.y, pt.y);
    const w = Math.abs(pt.x - this.drawStart.x);
    const h = Math.abs(pt.y - this.drawStart.y);

    if (!this._tempShape) {
      this._tempShape = this._createShapeElement(this.currentTool, x, y, w, h);
      this._getActiveLayerGroup().appendChild(this._tempShape);
    } else {
      this._updateShapeElement(this._tempShape, this.currentTool, x, y, w, h, this.drawStart, pt);
    }
  }

  _finalizeShape() {
    if (this._tempShape) {
      this._tempShape.dataset.dtId = this._generateId();
      this.selectedElements = [this._tempShape];
      this._renderSelectionHandles();
      this._tempShape = null;
    }
  }

  _handlePenDown(pt) {
    this.drawingPoints.push(pt);
    if (this.drawingPoints.length === 1) {
      // Start new path
      this._tempPath = document.createElementNS(this.svgNS, 'path');
      this._tempPath.setAttribute('fill', 'none');
      this._tempPath.setAttribute('stroke', this.stroke);
      this._tempPath.setAttribute('stroke-width', this.strokeWidth);
      this._getActiveLayerGroup().appendChild(this._tempPath);
    }
    this._updatePenPath();
  }

  _updatePenPath() {
    if (!this._tempPath || this.drawingPoints.length < 1) return;
    let d = `M ${this.drawingPoints[0].x} ${this.drawingPoints[0].y}`;
    for (let i = 1; i < this.drawingPoints.length; i++) {
      const prev = this.drawingPoints[i - 1];
      const curr = this.drawingPoints[i];
      const cx = (prev.x + curr.x) / 2;
      const cy = (prev.y + curr.y) / 2;
      d += ` Q ${prev.x} ${prev.y} ${cx} ${cy}`;
    }
    // Add last point
    if (this.drawingPoints.length > 1) {
      const last = this.drawingPoints[this.drawingPoints.length - 1];
      d += ` L ${last.x} ${last.y}`;
    }
    this._tempPath.setAttribute('d', d);
  }

  _finalizePenPath() {
    if (this._tempPath) {
      this._tempPath.dataset.dtId = this._generateId();
      this._tempPath.setAttribute('fill', this.fill);
      this.selectedElements = [this._tempPath];
      this._renderSelectionHandles();
      this._tempPath = null;
      this.drawingPoints = [];
      this._saveState();
    }
  }

  _handleTextDown(pt) {
    const text = document.createElementNS(this.svgNS, 'text');
    text.setAttribute('x', pt.x);
    text.setAttribute('y', pt.y);
    text.setAttribute('font-family', this.fontFamily);
    text.setAttribute('font-size', this.fontSize);
    text.setAttribute('fill', this.fill);
    text.setAttribute('stroke', this.stroke !== '#333333' ? this.stroke : 'none');
    text.setAttribute('stroke-width', this.stroke !== '#333333' ? this.strokeWidth : 0);
    text.textContent = 'Text';
    text.dataset.dtId = this._generateId();
    this._getActiveLayerGroup().appendChild(text);
    this.selectedElements = [text];
    this._renderSelectionHandles();
    this._saveState();
    // Immediately enter edit mode
    setTimeout(() => this._editTextInline(text), 50);
  }

  _handleEyedropper(pt) {
    // Sample color from clicked element
    const els = document.elementsFromPoint(
      pt.x * this.svg.getScreenCTM().a + this.svg.getScreenCTM().e,
      pt.y * this.svg.getScreenCTM().d + this.svg.getScreenCTM().f
    );
    for (const el of els) {
      if (el === this.svg || el === this.artboardBg) continue;
      const fill = el.getAttribute('fill');
      if (fill && fill !== 'none' && !fill.startsWith('url')) {
        this.fill = fill;
        this.fillInput.value = fill;
        this.hexInput.value = fill;
        this.setTool('select');
        return;
      }
    }
  }

  // ─── Shape Creation ──────────────────────────────────────────────

  _createShapeElement(tool, x, y, w, h) {
    let el;
    switch (tool) {
      case 'rectangle':
        el = document.createElementNS(this.svgNS, 'rect');
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        el.setAttribute('width', w || 1);
        el.setAttribute('height', h || 1);
        el.setAttribute('rx', 0);
        break;
      case 'circle':
        el = document.createElementNS(this.svgNS, 'circle');
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('r', Math.max(w, h) / 2 || 1);
        break;
      case 'ellipse':
        el = document.createElementNS(this.svgNS, 'ellipse');
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('rx', w / 2 || 1);
        el.setAttribute('ry', h / 2 || 1);
        break;
      case 'polygon':
        el = document.createElementNS(this.svgNS, 'polygon');
        el.setAttribute('points', this._polygonPoints(x + w / 2, y + h / 2, Math.min(w, h) / 2, 6));
        break;
      case 'star':
        el = document.createElementNS(this.svgNS, 'polygon');
        el.setAttribute('points', this._starPoints(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4, 5));
        break;
      case 'line':
        el = document.createElementNS(this.svgNS, 'line');
        el.setAttribute('x1', x);
        el.setAttribute('y1', y);
        el.setAttribute('x2', x + w);
        el.setAttribute('y2', y + h);
        el.setAttribute('fill', 'none');
        break;
      case 'arrow':
        el = document.createElementNS(this.svgNS, 'g');
        el.setAttribute('class', 'dt-arrow');
        const line = document.createElementNS(this.svgNS, 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', y);
        line.setAttribute('x2', x + w);
        line.setAttribute('y2', y + h);
        el.appendChild(line);
        const arrowHead = this._createArrowHead(x, y, x + w, y + h);
        el.appendChild(arrowHead);
        break;
      default:
        el = document.createElementNS(this.svgNS, 'rect');
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        el.setAttribute('width', w || 1);
        el.setAttribute('height', h || 1);
    }

    if (tool !== 'line' && tool !== 'arrow') {
      el.setAttribute('fill', this.fill);
    }
    el.setAttribute('stroke', this.stroke);
    el.setAttribute('stroke-width', this.strokeWidth);
    el.style.cursor = 'move';

    return el;
  }

  _updateShapeElement(el, tool, x, y, w, h, start, end) {
    switch (tool) {
      case 'rectangle':
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        el.setAttribute('width', w);
        el.setAttribute('height', h);
        break;
      case 'circle': {
        const r = Math.max(w, h) / 2;
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('r', r);
        break;
      }
      case 'ellipse':
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('rx', w / 2);
        el.setAttribute('ry', h / 2);
        break;
      case 'polygon':
        el.setAttribute('points', this._polygonPoints(x + w / 2, y + h / 2, Math.min(w, h) / 2, 6));
        break;
      case 'star':
        el.setAttribute('points', this._starPoints(x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4, 5));
        break;
      case 'line':
        el.setAttribute('x1', start.x);
        el.setAttribute('y1', start.y);
        el.setAttribute('x2', end.x);
        el.setAttribute('y2', end.y);
        break;
      case 'arrow': {
        const ln = el.querySelector('line');
        if (ln) {
          ln.setAttribute('x1', start.x);
          ln.setAttribute('y1', start.y);
          ln.setAttribute('x2', end.x);
          ln.setAttribute('y2', end.y);
        }
        const oldHead = el.querySelector('polygon');
        if (oldHead) oldHead.remove();
        el.appendChild(this._createArrowHead(start.x, start.y, end.x, end.y));
        break;
      }
    }
  }

  _createArrowHead(x1, y1, x2, y2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 15;
    const p1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
    const p1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
    const p2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
    const p2y = y2 - headLen * Math.sin(angle + Math.PI / 6);

    const head = document.createElementNS(this.svgNS, 'polygon');
    head.setAttribute('points', `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`);
    head.setAttribute('fill', this.stroke);
    return head;
  }

  _polygonPoints(cx, cy, r, sides) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i / sides) - Math.PI / 2;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }

  _starPoints(cx, cy, outerR, innerR, points) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i / points) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  }

  // ─── Element Manipulation ────────────────────────────────────────

  _getElementBBox(el) {
    if (!el) return { x: 0, y: 0, width: 0, height: 0 };
    try {
      const bbox = el.getBBox();
      return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
    } catch {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  }

  _getElementPosition(el) {
    const tag = el.tagName;
    switch (tag) {
      case 'rect':
        return { x: +el.getAttribute('x'), y: +el.getAttribute('y') };
      case 'circle':
      case 'ellipse':
        return { x: +el.getAttribute('cx'), y: +el.getAttribute('cy') };
      case 'text':
        return { x: +el.getAttribute('x'), y: +el.getAttribute('y') };
      case 'line':
        return { x: +el.getAttribute('x1'), y: +el.getAttribute('y1') };
      default: {
        const bbox = this._getElementBBox(el);
        return { x: bbox.x, y: bbox.y };
      }
    }
  }

  _moveElement(el, x, y) {
    const tag = el.tagName;
    switch (tag) {
      case 'rect':
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        break;
      case 'circle':
        el.setAttribute('cx', x);
        el.setAttribute('cy', y);
        break;
      case 'ellipse':
        el.setAttribute('cx', x);
        el.setAttribute('cy', y);
        break;
      case 'text':
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        break;
      case 'line':
        const dx = x - +el.getAttribute('x1');
        const dy = y - +el.getAttribute('y1');
        el.setAttribute('x1', x);
        el.setAttribute('y1', y);
        el.setAttribute('x2', +el.getAttribute('x2') + dx);
        el.setAttribute('y2', +el.getAttribute('y2') + dy);
        break;
      default:
        // Use transform for groups and paths
        const bbox = this._getElementBBox(el);
        const tdx = x - bbox.x;
        const tdy = y - bbox.y;
        el.setAttribute('transform', `translate(${tdx}, ${tdy})`);
    }
  }

  _resizeElement(el, x, y, w, h) {
    const tag = el.tagName;
    switch (tag) {
      case 'rect':
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        el.setAttribute('width', w);
        el.setAttribute('height', h);
        break;
      case 'circle':
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('r', Math.max(w, h) / 2);
        break;
      case 'ellipse':
        el.setAttribute('cx', x + w / 2);
        el.setAttribute('cy', y + h / 2);
        el.setAttribute('rx', w / 2);
        el.setAttribute('ry', h / 2);
        break;
      case 'text':
        el.setAttribute('x', x);
        el.setAttribute('y', y + h);
        el.setAttribute('font-size', h * 0.8);
        break;
    }
  }

  _nudgeSelected(dx, dy) {
    this._saveState();
    this.selectedElements.forEach(el => {
      const pos = this._getElementPosition(el);
      this._moveElement(el, pos.x + dx, pos.y + dy);
    });
    this._renderSelectionHandles();
  }

  _applyToSelected(attr, value) {
    this.selectedElements.forEach(el => {
      if (el.tagName === 'g') {
        el.querySelectorAll('*').forEach(child => child.setAttribute(attr, value));
      } else {
        el.setAttribute(attr, value);
      }
    });
  }

  // ─── Selection Handles ───────────────────────────────────────────

  _renderSelectionHandles() {
    this.handlesGroup.innerHTML = '';
    if (this.selectedElements.length === 0) return;

    this.selectedElements.forEach(el => {
      const bbox = this._getElementBBox(el);
      if (!bbox.width && !bbox.height) return;

      // Selection outline
      const outline = document.createElementNS(this.svgNS, 'rect');
      outline.setAttribute('x', bbox.x - 2);
      outline.setAttribute('y', bbox.y - 2);
      outline.setAttribute('width', bbox.width + 4);
      outline.setAttribute('height', bbox.height + 4);
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#4A90D9');
      outline.setAttribute('stroke-width', 1 / this.zoom);
      outline.setAttribute('stroke-dasharray', `${4 / this.zoom}`);
      outline.setAttribute('pointer-events', 'none');
      this.handlesGroup.appendChild(outline);

      // Corner and edge handles
      const handleSize = 8 / this.zoom;
      const handles = [
        { x: bbox.x, y: bbox.y, cursor: 'nw-resize', handle: 'nw' },
        { x: bbox.x + bbox.width / 2, y: bbox.y, cursor: 'n-resize', handle: 'n' },
        { x: bbox.x + bbox.width, y: bbox.y, cursor: 'ne-resize', handle: 'ne' },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2, cursor: 'e-resize', handle: 'e' },
        { x: bbox.x + bbox.width, y: bbox.y + bbox.height, cursor: 'se-resize', handle: 'se' },
        { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height, cursor: 's-resize', handle: 's' },
        { x: bbox.x, y: bbox.y + bbox.height, cursor: 'sw-resize', handle: 'sw' },
        { x: bbox.x, y: bbox.y + bbox.height / 2, cursor: 'w-resize', handle: 'w' },
      ];

      handles.forEach(h => {
        const rect = document.createElementNS(this.svgNS, 'rect');
        rect.setAttribute('x', h.x - handleSize / 2);
        rect.setAttribute('y', h.y - handleSize / 2);
        rect.setAttribute('width', handleSize);
        rect.setAttribute('height', handleSize);
        rect.setAttribute('fill', '#fff');
        rect.setAttribute('stroke', '#4A90D9');
        rect.setAttribute('stroke-width', 1 / this.zoom);
        rect.setAttribute('cursor', h.cursor);
        rect.setAttribute('pointer-events', 'all');
        rect.setAttribute('class', 'dt-handle');
        rect.dataset.handle = h.handle;
        this.handlesGroup.appendChild(rect);
      });

      // Rotation handle
      const rotX = bbox.x + bbox.width / 2;
      const rotY = bbox.y - 25 / this.zoom;
      const rotLine = document.createElementNS(this.svgNS, 'line');
      rotLine.setAttribute('x1', rotX);
      rotLine.setAttribute('y1', bbox.y);
      rotLine.setAttribute('x2', rotX);
      rotLine.setAttribute('y2', rotY);
      rotLine.setAttribute('stroke', '#4A90D9');
      rotLine.setAttribute('stroke-width', 1 / this.zoom);
      rotLine.setAttribute('pointer-events', 'none');
      this.handlesGroup.appendChild(rotLine);

      const rotHandle = document.createElementNS(this.svgNS, 'circle');
      rotHandle.setAttribute('cx', rotX);
      rotHandle.setAttribute('cy', rotY);
      rotHandle.setAttribute('r', 5 / this.zoom);
      rotHandle.setAttribute('fill', '#4A90D9');
      rotHandle.setAttribute('cursor', 'grab');
      rotHandle.setAttribute('pointer-events', 'all');
      rotHandle.setAttribute('class', 'dt-handle');
      rotHandle.dataset.handle = 'rotate';
      this.handlesGroup.appendChild(rotHandle);
    });
  }

  // ─── Smart Guides ────────────────────────────────────────────────

  _renderSmartGuides(pt) {
    this.guidesGroup.innerHTML = '';
    if (!this.smartGuides || this.selectedElements.length === 0) return;

    const selBBox = this._getElementBBox(this.selectedElements[0]);
    const selCx = selBBox.x + selBBox.width / 2;
    const selCy = selBBox.y + selBBox.height / 2;
    const threshold = 5;

    // Check alignment with artboard center
    const abCx = this.artboard.width / 2;
    const abCy = this.artboard.height / 2;

    if (Math.abs(selCx - abCx) < threshold) {
      this._drawGuide(abCx, 0, abCx, this.artboard.height);
    }
    if (Math.abs(selCy - abCy) < threshold) {
      this._drawGuide(0, abCy, this.artboard.width, abCy);
    }

    // Check alignment with other elements
    const layerGroup = this._getActiveLayerGroup();
    if (!layerGroup) return;
    const children = layerGroup.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (this.selectedElements.includes(child)) continue;
      const bbox = this._getElementBBox(child);
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;

      if (Math.abs(selCx - cx) < threshold) {
        this._drawGuide(cx, Math.min(selBBox.y, bbox.y) - 20, cx, Math.max(selBBox.y + selBBox.height, bbox.y + bbox.height) + 20);
      }
      if (Math.abs(selCy - cy) < threshold) {
        this._drawGuide(Math.min(selBBox.x, bbox.x) - 20, cy, Math.max(selBBox.x + selBBox.width, bbox.x + bbox.width) + 20, cy);
      }
      // Edge alignment
      if (Math.abs(selBBox.x - bbox.x) < threshold) {
        this._drawGuide(bbox.x, Math.min(selBBox.y, bbox.y) - 10, bbox.x, Math.max(selBBox.y + selBBox.height, bbox.y + bbox.height) + 10);
      }
      if (Math.abs(selBBox.x + selBBox.width - (bbox.x + bbox.width)) < threshold) {
        const ex = bbox.x + bbox.width;
        this._drawGuide(ex, Math.min(selBBox.y, bbox.y) - 10, ex, Math.max(selBBox.y + selBBox.height, bbox.y + bbox.height) + 10);
      }
    }
  }

  _drawGuide(x1, y1, x2, y2) {
    const line = document.createElementNS(this.svgNS, 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#FF4081');
    line.setAttribute('stroke-width', 0.5 / this.zoom);
    line.setAttribute('stroke-dasharray', `${3 / this.zoom}`);
    this.guidesGroup.appendChild(line);
  }

  // ─── Layer Management ────────────────────────────────────────────

  addLayer(name) {
    const id = this._generateId();
    const layer = {
      id,
      name: name || `Layer ${this.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
    };
    this.layers.push(layer);

    const g = document.createElementNS(this.svgNS, 'g');
    g.setAttribute('id', id);
    g.setAttribute('class', 'dt-layer-group');
    g.dataset.layerId = id;
    this.layerContainer.appendChild(g);

    this.activeLayerId = id;
    this._renderLayerPanel();
    return id;
  }

  _addDefaultLayer() {
    if (this.layers.length === 0) {
      this.addLayer('Layer 1');
    }
  }

  deleteLayer(layerId) {
    if (this.layers.length <= 1) return;
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx < 0) return;
    this.layers.splice(idx, 1);
    const g = this.layerContainer.querySelector(`[data-layer-id="${layerId}"]`);
    if (g) g.remove();
    this.activeLayerId = this.layers[Math.max(0, idx - 1)].id;
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  moveLayerUp(layerId) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx >= this.layers.length - 1) return;
    [this.layers[idx], this.layers[idx + 1]] = [this.layers[idx + 1], this.layers[idx]];
    this._reorderLayerDOM();
  }

  moveLayerDown(layerId) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx <= 0) return;
    [this.layers[idx], this.layers[idx - 1]] = [this.layers[idx - 1], this.layers[idx]];
    this._reorderLayerDOM();
  }

  _reorderLayerDOM() {
    this.layers.forEach(layer => {
      const g = this.layerContainer.querySelector(`[data-layer-id="${layer.id}"]`);
      if (g) this.layerContainer.appendChild(g);
    });
    this._renderLayerPanel();
  }

  setLayerVisibility(layerId, visible) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.visible = visible;
    const g = this.layerContainer.querySelector(`[data-layer-id="${layerId}"]`);
    if (g) g.style.display = visible ? '' : 'none';
    this._renderLayerPanel();
  }

  setLayerOpacity(layerId, opacity) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;
    layer.opacity = opacity;
    const g = this.layerContainer.querySelector(`[data-layer-id="${layerId}"]`);
    if (g) g.style.opacity = opacity;
  }

  _getActiveLayerGroup() {
    if (!this.activeLayerId) this._addDefaultLayer();
    return this.layerContainer.querySelector(`[data-layer-id="${this.activeLayerId}"]`);
  }

  _renderLayerPanel() {
    this.layerListEl.innerHTML = '';
    [...this.layers].reverse().forEach(layer => {
      const row = document.createElement('div');
      row.className = `dt-layer-row${layer.id === this.activeLayerId ? ' active' : ''}`;
      row.addEventListener('click', () => {
        this.activeLayerId = layer.id;
        this._renderLayerPanel();
      });

      const visBtn = document.createElement('button');
      visBtn.className = 'dt-vis-btn';
      visBtn.textContent = layer.visible ? '\u25C9' : '\u25CE';
      visBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.setLayerVisibility(layer.id, !layer.visible);
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'dt-layer-name';
      nameSpan.textContent = layer.name;

      const opacityInput = document.createElement('input');
      opacityInput.type = 'range';
      opacityInput.min = 0;
      opacityInput.max = 1;
      opacityInput.step = 0.05;
      opacityInput.value = layer.opacity;
      opacityInput.className = 'dt-opacity-slider';
      opacityInput.addEventListener('input', e => {
        e.stopPropagation();
        this.setLayerOpacity(layer.id, +e.target.value);
      });

      row.appendChild(visBtn);
      row.appendChild(nameSpan);
      row.appendChild(opacityInput);
      this.layerListEl.appendChild(row);
    });
  }

  // ─── Alignment & Distribution ────────────────────────────────────

  alignSelected(direction) {
    if (this.selectedElements.length < 1) return;
    this._saveState();

    const boxes = this.selectedElements.map(el => ({ el, bbox: this._getElementBBox(el) }));

    if (this.selectedElements.length === 1) {
      // Align to artboard
      const { el, bbox } = boxes[0];
      switch (direction) {
        case 'left': this._moveElement(el, 0, bbox.y); break;
        case 'center': this._moveElement(el, (this.artboard.width - bbox.width) / 2, bbox.y); break;
        case 'right': this._moveElement(el, this.artboard.width - bbox.width, bbox.y); break;
        case 'top': this._moveElement(el, bbox.x, 0); break;
        case 'middle': this._moveElement(el, bbox.x, (this.artboard.height - bbox.height) / 2); break;
        case 'bottom': this._moveElement(el, bbox.x, this.artboard.height - bbox.height); break;
      }
    } else {
      const minX = Math.min(...boxes.map(b => b.bbox.x));
      const maxX = Math.max(...boxes.map(b => b.bbox.x + b.bbox.width));
      const minY = Math.min(...boxes.map(b => b.bbox.y));
      const maxY = Math.max(...boxes.map(b => b.bbox.y + b.bbox.height));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      boxes.forEach(({ el, bbox }) => {
        switch (direction) {
          case 'left': this._moveElement(el, minX, bbox.y); break;
          case 'center': this._moveElement(el, centerX - bbox.width / 2, bbox.y); break;
          case 'right': this._moveElement(el, maxX - bbox.width, bbox.y); break;
          case 'top': this._moveElement(el, bbox.x, minY); break;
          case 'middle': this._moveElement(el, bbox.x, centerY - bbox.height / 2); break;
          case 'bottom': this._moveElement(el, bbox.x, maxY - bbox.height); break;
        }
      });
    }
    this._renderSelectionHandles();
  }

  distributeSelected(axis) {
    if (this.selectedElements.length < 3) return;
    this._saveState();

    const boxes = this.selectedElements.map(el => ({ el, bbox: this._getElementBBox(el) }));

    if (axis === 'horizontal') {
      boxes.sort((a, b) => a.bbox.x - b.bbox.x);
      const totalWidth = boxes.reduce((sum, b) => sum + b.bbox.width, 0);
      const minX = boxes[0].bbox.x;
      const maxX = boxes[boxes.length - 1].bbox.x + boxes[boxes.length - 1].bbox.width;
      const space = (maxX - minX - totalWidth) / (boxes.length - 1);
      let currentX = minX;
      boxes.forEach(({ el, bbox }) => {
        this._moveElement(el, currentX, bbox.y);
        currentX += bbox.width + space;
      });
    } else {
      boxes.sort((a, b) => a.bbox.y - b.bbox.y);
      const totalHeight = boxes.reduce((sum, b) => sum + b.bbox.height, 0);
      const minY = boxes[0].bbox.y;
      const maxY = boxes[boxes.length - 1].bbox.y + boxes[boxes.length - 1].bbox.height;
      const space = (maxY - minY - totalHeight) / (boxes.length - 1);
      let currentY = minY;
      boxes.forEach(({ el, bbox }) => {
        this._moveElement(el, bbox.x, currentY);
        currentY += bbox.height + space;
      });
    }
    this._renderSelectionHandles();
  }

  // ─── Undo/Redo ───────────────────────────────────────────────────

  _saveState() {
    const state = this.layerContainer.innerHTML;
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(this.layerContainer.innerHTML);
    const state = this.undoStack.pop();
    this.layerContainer.innerHTML = state;
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(this.layerContainer.innerHTML);
    const state = this.redoStack.pop();
    this.layerContainer.innerHTML = state;
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  // ─── Clipboard ───────────────────────────────────────────────────

  copy() {
    this.clipboard = this.selectedElements.map(el => el.cloneNode(true));
  }

  paste() {
    if (this.clipboard.length === 0) return;
    this._saveState();
    const group = this._getActiveLayerGroup();
    const pasted = [];
    this.clipboard.forEach(el => {
      const clone = el.cloneNode(true);
      clone.dataset.dtId = this._generateId();
      // Offset paste position
      const pos = this._getElementPosition(clone);
      this._moveElement(clone, pos.x + 20, pos.y + 20);
      group.appendChild(clone);
      pasted.push(clone);
    });
    this.selectedElements = pasted;
    this._renderSelectionHandles();
  }

  // ─── Group/Ungroup ───────────────────────────────────────────────

  groupSelected() {
    if (this.selectedElements.length < 2) return;
    this._saveState();
    const group = document.createElementNS(this.svgNS, 'g');
    group.dataset.dtId = this._generateId();
    group.setAttribute('class', 'dt-group');
    group.style.cursor = 'move';

    const parent = this.selectedElements[0].parentNode;
    parent.appendChild(group);

    this.selectedElements.forEach(el => group.appendChild(el));
    this.selectedElements = [group];
    this._renderSelectionHandles();
  }

  ungroupSelected() {
    this.selectedElements.forEach(el => {
      if (el.tagName === 'g' && el.classList.contains('dt-group')) {
        this._saveState();
        const parent = el.parentNode;
        const children = [...el.children];
        children.forEach(child => parent.insertBefore(child, el));
        el.remove();
        this.selectedElements = children;
      }
    });
    this._renderSelectionHandles();
  }

  // ─── Delete / Duplicate / Select All ─────────────────────────────

  deleteSelected() {
    if (this.selectedElements.length === 0) return;
    this._saveState();
    this.selectedElements.forEach(el => el.remove());
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  duplicateSelected() {
    this.copy();
    this.paste();
  }

  selectAll() {
    const group = this._getActiveLayerGroup();
    if (!group) return;
    this.selectedElements = [...group.children];
    this._renderSelectionHandles();
  }

  // ─── Text Editing ────────────────────────────────────────────────

  _editTextInline(textEl) {
    const bbox = this._getElementBBox(textEl);
    const ctm = this.svg.getScreenCTM();
    const screenX = bbox.x * ctm.a + ctm.e;
    const screenY = bbox.y * ctm.d + ctm.f;

    const input = document.createElement('textarea');
    input.className = 'dt-text-editor';
    input.value = textEl.textContent;
    input.style.position = 'fixed';
    input.style.left = screenX + 'px';
    input.style.top = screenY + 'px';
    input.style.width = Math.max(200, bbox.width * ctm.a) + 'px';
    input.style.height = Math.max(40, bbox.height * ctm.d) + 'px';
    input.style.fontSize = (textEl.getAttribute('font-size') || 24) * ctm.a + 'px';
    input.style.fontFamily = textEl.getAttribute('font-family') || 'Inter';
    input.style.color = textEl.getAttribute('fill') || '#000';
    input.style.zIndex = 10000;
    input.style.background = 'rgba(255,255,255,0.95)';
    input.style.border = '2px solid #4A90D9';
    input.style.padding = '4px';
    input.style.outline = 'none';
    input.style.resize = 'both';

    document.body.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const newText = input.value.trim();
      if (newText) {
        this._saveState();
        // Handle multiline text
        const lines = newText.split('\n');
        textEl.textContent = '';
        if (lines.length === 1) {
          textEl.textContent = lines[0];
        } else {
          const lineH = +(textEl.getAttribute('font-size') || 24) * 1.4;
          lines.forEach((line, i) => {
            const tspan = document.createElementNS(this.svgNS, 'tspan');
            tspan.textContent = line;
            tspan.setAttribute('x', textEl.getAttribute('x'));
            tspan.setAttribute('dy', i === 0 ? 0 : lineH);
            textEl.appendChild(tspan);
          });
        }
      }
      input.remove();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.removeEventListener('blur', commit);
        input.remove();
      }
    });
  }

  _applyTextProp(prop, value) {
    this.selectedElements.forEach(el => {
      if (el.tagName === 'text') {
        el.setAttribute(prop, value);
        el.querySelectorAll('tspan').forEach(ts => ts.setAttribute(prop, value));
      }
    });
  }

  _toggleTextProp(prop, onVal, offVal) {
    this.selectedElements.forEach(el => {
      if (el.tagName === 'text') {
        const current = el.getAttribute(prop);
        el.setAttribute(prop, current === onVal ? offVal : onVal);
      }
    });
  }

  _applyTextLineHeight(lh) {
    this.selectedElements.forEach(el => {
      if (el.tagName === 'text') {
        const fontSize = +(el.getAttribute('font-size') || 24);
        const tspans = el.querySelectorAll('tspan');
        tspans.forEach((ts, i) => {
          if (i > 0) ts.setAttribute('dy', fontSize * lh);
        });
      }
    });
  }

  _applyTextEffect(effect) {
    this.selectedElements.forEach(el => {
      if (el.tagName !== 'text') return;
      switch (effect) {
        case 'shadow': {
          const filterId = 'dt-shadow-' + this._generateId();
          const filter = document.createElementNS(this.svgNS, 'filter');
          filter.setAttribute('id', filterId);
          const feOffset = document.createElementNS(this.svgNS, 'feDropShadow');
          feOffset.setAttribute('dx', 2);
          feOffset.setAttribute('dy', 2);
          feOffset.setAttribute('stdDeviation', 2);
          feOffset.setAttribute('flood-color', 'rgba(0,0,0,0.5)');
          filter.appendChild(feOffset);
          this.defs.appendChild(filter);
          el.setAttribute('filter', `url(#${filterId})`);
          break;
        }
        case 'outline':
          el.setAttribute('stroke', this.stroke);
          el.setAttribute('stroke-width', 2);
          el.setAttribute('paint-order', 'stroke');
          break;
        case 'gradient': {
          const gradId = 'dt-textgrad-' + this._generateId();
          const grad = document.createElementNS(this.svgNS, 'linearGradient');
          grad.setAttribute('id', gradId);
          const stop1 = document.createElementNS(this.svgNS, 'stop');
          stop1.setAttribute('offset', '0%');
          stop1.setAttribute('stop-color', this.gradStart.value);
          const stop2 = document.createElementNS(this.svgNS, 'stop');
          stop2.setAttribute('offset', '100%');
          stop2.setAttribute('stop-color', this.gradEnd.value);
          grad.appendChild(stop1);
          grad.appendChild(stop2);
          this.defs.appendChild(grad);
          el.setAttribute('fill', `url(#${gradId})`);
          break;
        }
      }
    });
  }

  _textOnPath() {
    if (this.selectedElements.length < 1) return;
    const textEl = this.selectedElements.find(el => el.tagName === 'text');
    if (!textEl) return;

    this._saveState();
    const bbox = this._getElementBBox(textEl);
    const pathId = 'dt-textpath-' + this._generateId();

    // Create an arc path
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height;
    const r = bbox.width / 2;
    const path = document.createElementNS(this.svgNS, 'path');
    path.setAttribute('id', pathId);
    path.setAttribute('d', `M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'none');
    this.defs.appendChild(path);

    const content = textEl.textContent;
    textEl.textContent = '';
    const textPath = document.createElementNS(this.svgNS, 'textPath');
    textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${pathId}`);
    textPath.setAttribute('href', `#${pathId}`);
    textPath.textContent = content;
    textEl.appendChild(textPath);
  }

  // ─── Google Fonts ────────────────────────────────────────────────

  _loadGoogleFont(fontName) {
    if (this.loadedFonts.has(fontName)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
    this.loadedFonts.add(fontName);

    // Add to font selector if not already there
    const exists = [...this.fontSelect.options].some(o => o.value === fontName);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = fontName;
      opt.textContent = fontName;
      this.fontSelect.appendChild(opt);
      this.fontSelect.value = fontName;
    }
  }

  // ─── Color System ────────────────────────────────────────────────

  _updateColorFromSliders() {
    const sliders = this.rightPanel.querySelectorAll('.dt-slider');
    const r = +sliders[0].value;
    const g = +sliders[1].value;
    const b = +sliders[2].value;
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    this.fill = hex;
    this.fillInput.value = hex;
    this.hexInput.value = hex;
  }

  _applyGradient() {
    if (this.selectedElements.length === 0) return;
    this._saveState();
    const type = this.gradientType.value;
    if (type === 'none') {
      this._applyToSelected('fill', this.fill);
      return;
    }

    const gradId = 'dt-grad-' + this._generateId();
    let grad;
    if (type === 'linear') {
      grad = document.createElementNS(this.svgNS, 'linearGradient');
      grad.setAttribute('x1', '0%');
      grad.setAttribute('y1', '0%');
      grad.setAttribute('x2', '100%');
      grad.setAttribute('y2', '100%');
    } else {
      grad = document.createElementNS(this.svgNS, 'radialGradient');
      grad.setAttribute('cx', '50%');
      grad.setAttribute('cy', '50%');
      grad.setAttribute('r', '50%');
    }
    grad.setAttribute('id', gradId);

    const stop1 = document.createElementNS(this.svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', this.gradStart.value);

    const stop2 = document.createElementNS(this.svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', this.gradEnd.value);

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    this.defs.appendChild(grad);

    this._applyToSelected('fill', `url(#${gradId})`);
  }

  _generatePalette() {
    const baseHex = this.fill;
    const hsl = this._hexToHSL(baseHex);
    const mode = this.paletteMode.value;
    let colors = [];

    switch (mode) {
      case 'complementary':
        colors = [
          hsl,
          { h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l },
        ];
        break;
      case 'analogous':
        colors = [
          { h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l },
          hsl,
          { h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l },
        ];
        break;
      case 'triadic':
        colors = [
          hsl,
          { h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l },
          { h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l },
        ];
        break;
      case 'tetradic':
        colors = [
          hsl,
          { h: (hsl.h + 90) % 360, s: hsl.s, l: hsl.l },
          { h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l },
          { h: (hsl.h + 270) % 360, s: hsl.s, l: hsl.l },
        ];
        break;
      case 'monochromatic':
        colors = [
          { h: hsl.h, s: hsl.s, l: Math.max(10, hsl.l - 30) },
          { h: hsl.h, s: hsl.s, l: Math.max(10, hsl.l - 15) },
          hsl,
          { h: hsl.h, s: hsl.s, l: Math.min(90, hsl.l + 15) },
          { h: hsl.h, s: hsl.s, l: Math.min(90, hsl.l + 30) },
        ];
        break;
    }

    this._currentPalette = colors.map(c => this._hslToHex(c.h, c.s, c.l));
    this._renderPalette(this._currentPalette);
  }

  _renderPalette(colors) {
    this.paletteDisplay.innerHTML = '';
    colors.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.className = 'dt-swatch';
      swatch.style.backgroundColor = hex;
      swatch.title = hex;
      swatch.addEventListener('click', () => {
        this.fill = hex;
        this.fillInput.value = hex;
        this.hexInput.value = hex;
      });
      this.paletteDisplay.appendChild(swatch);
    });
  }

  _savePalette() {
    if (!this._currentPalette || this._currentPalette.length === 0) return;
    this.savedPalettes.push([...this._currentPalette]);
    this._renderSavedPalettes();
  }

  _renderSavedPalettes() {
    this.savedPaletteDisplay.innerHTML = '';
    this.savedPalettes.forEach((palette, idx) => {
      const row = document.createElement('div');
      row.className = 'dt-saved-palette-row';
      palette.forEach(hex => {
        const s = document.createElement('div');
        s.className = 'dt-swatch-sm';
        s.style.backgroundColor = hex;
        s.title = hex;
        s.addEventListener('click', () => {
          this.fill = hex;
          this.fillInput.value = hex;
          this.hexInput.value = hex;
        });
        row.appendChild(s);
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'x';
      delBtn.className = 'dt-swatch-del';
      delBtn.addEventListener('click', () => { this.savedPalettes.splice(idx, 1); this._renderSavedPalettes(); });
      row.appendChild(delBtn);
      this.savedPaletteDisplay.appendChild(row);
    });
  }

  // Color conversion utilities
  _hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  // ─── Templates ───────────────────────────────────────────────────

  _getTemplates() {
    return {
      'Social Media': [
        { name: 'Instagram Post', width: 1080, height: 1080, elements: this._instagramPostTemplate },
        { name: 'Instagram Story', width: 1080, height: 1920, elements: this._instagramStoryTemplate },
        { name: 'Facebook Cover', width: 820, height: 312, elements: this._facebookCoverTemplate },
        { name: 'Twitter Header', width: 1500, height: 500, elements: this._twitterHeaderTemplate },
        { name: 'YouTube Thumbnail', width: 1280, height: 720, elements: this._youtubeThumbnailTemplate },
        { name: 'LinkedIn Banner', width: 1584, height: 396, elements: this._linkedinBannerTemplate },
      ],
      'Print': [
        { name: 'Business Card', width: 1050, height: 600, elements: this._businessCardTemplate },
        { name: 'Flyer (A5)', width: 1748, height: 2480, elements: this._flyerTemplate },
        { name: 'Poster (A3)', width: 3508, height: 4961, elements: this._posterTemplate },
        { name: 'Letterhead', width: 2550, height: 3300, elements: this._letterheadTemplate },
      ],
      'Logo Maker': [
        { name: 'Icon (Square)', width: 512, height: 512, elements: this._logoSquareTemplate },
        { name: 'Badge', width: 600, height: 600, elements: this._badgeTemplate },
        { name: 'Wordmark', width: 800, height: 300, elements: this._wordmarkTemplate },
      ],
    };
  }

  _renderTemplates() {
    const cat = this.templateCatSelect.value;
    const templates = this.templates[cat] || [];
    this.templateListEl.innerHTML = '';
    templates.forEach(tpl => {
      const btn = document.createElement('button');
      btn.className = 'dt-template-btn';
      btn.textContent = `${tpl.name} (${tpl.width}x${tpl.height})`;
      btn.addEventListener('click', () => this._loadTemplate(tpl));
      this.templateListEl.appendChild(btn);
    });
  }

  _loadTemplate(tpl) {
    this._saveState();
    this.setArtboard(tpl.width, tpl.height);

    // Clear current layer
    const group = this._getActiveLayerGroup();
    group.innerHTML = '';

    // Call the template builder
    if (typeof tpl.elements === 'function') {
      tpl.elements.call(this, group, tpl.width, tpl.height);
    }

    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  // Template element builders
  get _instagramPostTemplate() {
    return function(group, w, h) {
      // Background
      const bg = this._makeRect(group, 0, 0, w, h, '#1a1a2e', 'none', 0);
      // Accent shape
      this._makeCircle(group, w * 0.7, h * 0.3, 200, '#e94560', 'none', 0);
      // Title text
      this._makeText(group, w * 0.1, h * 0.45, 'Your Title Here', 64, '#ffffff', 'Montserrat');
      // Subtitle
      this._makeText(group, w * 0.1, h * 0.55, 'Add your subtitle', 32, '#cccccc', 'Inter');
      // CTA bar
      this._makeRect(group, w * 0.1, h * 0.7, w * 0.8, 60, '#e94560', 'none', 0);
      this._makeText(group, w * 0.35, h * 0.7 + 42, 'Learn More', 28, '#ffffff', 'Inter');
    };
  }

  get _instagramStoryTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#0f3460', 'none', 0);
      this._makeRect(group, 40, 40, w - 80, h - 80, 'none', '#e94560', 3);
      this._makeText(group, w * 0.15, h * 0.35, 'SWIPE UP', 72, '#ffffff', 'Bebas Neue');
      this._makeText(group, w * 0.2, h * 0.42, 'For More Details', 36, '#cccccc', 'Inter');
      this._makeCircle(group, w / 2, h * 0.65, 80, '#e94560', 'none', 0);
      this._makeText(group, w / 2 - 15, h * 0.65 + 10, '\u2191', 48, '#ffffff', 'Inter');
    };
  }

  get _facebookCoverTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#16213e', 'none', 0);
      this._makeRect(group, 0, h - 4, w, 4, '#e94560', 'none', 0);
      this._makeText(group, 40, h / 2 + 15, 'Your Brand Name', 48, '#ffffff', 'Montserrat');
      this._makeText(group, 40, h / 2 + 50, 'Tagline goes here', 24, '#8899aa', 'Inter');
    };
  }

  get _twitterHeaderTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#2d3436', 'none', 0);
      this._makeRect(group, 0, 0, w * 0.4, h, '#6c5ce7', 'none', 0);
      this._makeText(group, 60, h / 2 + 20, 'Brand', 64, '#ffffff', 'Montserrat');
      this._makeText(group, w * 0.45, h / 2 + 10, 'Connect with us', 36, '#dfe6e9', 'Inter');
    };
  }

  get _youtubeThumbnailTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#2d3436', 'none', 0);
      this._makeRect(group, 0, 0, w, h * 0.15, '#d63031', 'none', 0);
      this._makeText(group, 40, h * 0.12, 'NEW VIDEO', 36, '#ffffff', 'Bebas Neue');
      this._makeText(group, w * 0.1, h * 0.55, 'VIDEO TITLE', 72, '#ffffff', 'Montserrat');
      this._makeCircle(group, w * 0.85, h * 0.75, 50, '#d63031', 'none', 0);
      this._makeText(group, w * 0.85 - 20, h * 0.75 + 10, '\u25B6', 36, '#ffffff', 'Inter');
    };
  }

  get _linkedinBannerTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#0077b5', 'none', 0);
      this._makeText(group, 60, h / 2 + 20, 'Professional Title', 48, '#ffffff', 'Inter');
      this._makeText(group, 60, h / 2 + 60, 'Company | Role | Location', 24, '#b3d9f2', 'Inter');
    };
  }

  get _businessCardTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#ffffff', '#e0e0e0', 1);
      this._makeRect(group, 0, 0, 8, h, '#4A90D9', 'none', 0);
      this._makeText(group, 40, 80, 'John Doe', 36, '#333333', 'Montserrat');
      this._makeText(group, 40, 120, 'Creative Director', 18, '#777777', 'Inter');
      this._makeText(group, 40, h - 80, 'john@example.com', 14, '#4A90D9', 'Inter');
      this._makeText(group, 40, h - 55, '+1 (555) 123-4567', 14, '#666666', 'Inter');
      this._makeText(group, 40, h - 30, 'www.example.com', 14, '#666666', 'Inter');
    };
  }

  get _flyerTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#ffffff', 'none', 0);
      this._makeRect(group, 0, 0, w, h * 0.4, '#1a1a2e', 'none', 0);
      this._makeText(group, w * 0.1, h * 0.2, 'EVENT TITLE', 96, '#ffffff', 'Montserrat');
      this._makeText(group, w * 0.1, h * 0.28, 'Subtitle description here', 36, '#cccccc', 'Inter');
      this._makeText(group, w * 0.1, h * 0.5, 'Date: January 1, 2026', 28, '#333333', 'Inter');
      this._makeText(group, w * 0.1, h * 0.55, 'Location: Venue Name', 28, '#333333', 'Inter');
      this._makeText(group, w * 0.1, h * 0.6, 'Time: 7:00 PM', 28, '#333333', 'Inter');
      this._makeRect(group, w * 0.1, h * 0.75, w * 0.8, 80, '#e94560', 'none', 0);
      this._makeText(group, w * 0.3, h * 0.75 + 55, 'REGISTER NOW', 36, '#ffffff', 'Montserrat');
    };
  }

  get _posterTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#0f3460', 'none', 0);
      this._makeCircle(group, w / 2, h * 0.3, 400, '#e94560', 'none', 0);
      this._makeText(group, w * 0.15, h * 0.55, 'POSTER TITLE', 144, '#ffffff', 'Bebas Neue');
      this._makeText(group, w * 0.15, h * 0.62, 'Supporting text goes here', 48, '#cccccc', 'Inter');
    };
  }

  get _letterheadTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#ffffff', 'none', 0);
      this._makeRect(group, 0, 0, w, 120, '#4A90D9', 'none', 0);
      this._makeText(group, 80, 80, 'Company Name', 48, '#ffffff', 'Montserrat');
      this._makeRect(group, 0, h - 80, w, 80, '#f0f0f0', 'none', 0);
      this._makeText(group, 80, h - 30, '123 Street | City, State | phone | email', 14, '#888888', 'Inter');
    };
  }

  get _logoSquareTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#1a1a2e', 'none', 0);
      this._makeCircle(group, w / 2, h / 2, 180, 'none', '#4A90D9', 6);
      this._makeText(group, w / 2 - 60, h / 2 + 20, 'LOGO', 64, '#4A90D9', 'Montserrat');
    };
  }

  get _badgeTemplate() {
    return function(group, w, h) {
      this._makeCircle(group, w / 2, h / 2, 280, '#1a1a2e', '#4A90D9', 4);
      this._makeCircle(group, w / 2, h / 2, 250, 'none', '#4A90D9', 2);
      this._makeText(group, w / 2 - 80, h / 2 - 10, 'BRAND', 48, '#ffffff', 'Bebas Neue');
      this._makeText(group, w / 2 - 50, h / 2 + 30, 'EST. 2026', 20, '#4A90D9', 'Inter');
    };
  }

  get _wordmarkTemplate() {
    return function(group, w, h) {
      this._makeRect(group, 0, 0, w, h, '#ffffff', '#eeeeee', 1);
      this._makeText(group, 40, h / 2 + 25, 'brandname', 72, '#333333', 'Montserrat');
      this._makeRect(group, 36, h / 2 + 35, 250, 4, '#4A90D9', 'none', 0);
    };
  }

  // Template helper methods
  _makeRect(group, x, y, w, h, fill, stroke, sw) {
    const rect = document.createElementNS(this.svgNS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', sw);
    rect.dataset.dtId = this._generateId();
    rect.style.cursor = 'move';
    group.appendChild(rect);
    return rect;
  }

  _makeCircle(group, cx, cy, r, fill, stroke, sw) {
    const circle = document.createElementNS(this.svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', sw);
    circle.dataset.dtId = this._generateId();
    circle.style.cursor = 'move';
    group.appendChild(circle);
    return circle;
  }

  _makeText(group, x, y, text, size, fill, font) {
    this._loadGoogleFont(font);
    const t = document.createElementNS(this.svgNS, 'text');
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('font-size', size);
    t.setAttribute('fill', fill);
    t.setAttribute('font-family', font);
    t.textContent = text;
    t.dataset.dtId = this._generateId();
    t.style.cursor = 'move';
    group.appendChild(t);
    return t;
  }

  // ─── Export ──────────────────────────────────────────────────────

  export(format) {
    switch (format) {
      case 'svg': this._exportSVG(); break;
      case 'png': this._exportRaster('png'); break;
      case 'jpeg': this._exportRaster('jpeg'); break;
      case 'pdf': this._exportPDF(); break;
    }
  }

  _exportSVG() {
    const svgClone = this._buildExportSVG();
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    this._downloadBlob(blob, 'design.svg');
  }

  _exportRaster(format) {
    const svgClone = this._buildExportSVG();
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    canvas.width = this.artboard.width;
    canvas.height = this.artboard.height;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        this._downloadBlob(blob, `design.${format === 'jpeg' ? 'jpg' : 'png'}`);
      }, `image/${format}`, format === 'jpeg' ? 0.95 : undefined);
    };
    img.src = url;
  }

  _exportPDF() {
    // Lightweight PDF generation without external library
    const svgClone = this._buildExportSVG();
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    canvas.width = this.artboard.width;
    canvas.height = this.artboard.height;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const w = this.artboard.width;
      const h = this.artboard.height;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Minimal PDF structure
      const ptW = w * 72 / 96;
      const ptH = h * 72 / 96;

      // Extract base64 image data
      const base64 = imgData.split(',')[1];
      const binaryStr = atob(base64);
      const imgBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) imgBytes[i] = binaryStr.charCodeAt(i);

      const pdfParts = [];
      const offsets = [];

      const addObj = (content) => {
        offsets.push(pdfParts.reduce((s, p) => s + p.length, 0));
        pdfParts.push(content);
      };

      pdfParts.push('%PDF-1.4\n');

      addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
      addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
      addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`);

      const stream = `q ${ptW} 0 0 ${ptH} 0 0 cm /Img Do Q`;
      addObj(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

      addObj(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);

      const headerLen = pdfParts.reduce((s, p) => s + p.length, 0);
      const endStream = `\nendstream\nendobj\n`;

      const xrefStart = headerLen + imgBytes.length + endStream.length;
      const xref = `xref\n0 6\n0000000000 65535 f \n` +
        offsets.map(o => o.toString().padStart(10, '0') + ' 00000 n \n').join('') +
        `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(pdfParts.join(''));
      const endBytes = encoder.encode(endStream);
      const xrefBytes = encoder.encode(xref);

      const pdf = new Uint8Array(headerBytes.length + imgBytes.length + endBytes.length + xrefBytes.length);
      pdf.set(headerBytes, 0);
      pdf.set(imgBytes, headerBytes.length);
      pdf.set(endBytes, headerBytes.length + imgBytes.length);
      pdf.set(xrefBytes, headerBytes.length + imgBytes.length + endBytes.length);

      const blob = new Blob([pdf], { type: 'application/pdf' });
      this._downloadBlob(blob, 'design.pdf');
    };
    img.src = url;
  }

  _buildExportSVG() {
    const svgClone = document.createElementNS(this.svgNS, 'svg');
    svgClone.setAttribute('xmlns', this.svgNS);
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgClone.setAttribute('width', this.artboard.width);
    svgClone.setAttribute('height', this.artboard.height);
    svgClone.setAttribute('viewBox', `0 0 ${this.artboard.width} ${this.artboard.height}`);

    // Clone defs
    svgClone.appendChild(this.defs.cloneNode(true));

    // Background
    const bg = document.createElementNS(this.svgNS, 'rect');
    bg.setAttribute('width', this.artboard.width);
    bg.setAttribute('height', this.artboard.height);
    bg.setAttribute('fill', '#ffffff');
    svgClone.appendChild(bg);

    // Clone all layers
    this.layers.forEach(layer => {
      if (!layer.visible) return;
      const g = this.layerContainer.querySelector(`[data-layer-id="${layer.id}"]`);
      if (g) svgClone.appendChild(g.cloneNode(true));
    });

    return svgClone;
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyCSSOfSelected() {
    if (this.selectedElements.length === 0) return;
    const el = this.selectedElements[0];
    const bbox = this._getElementBBox(el);
    const fill = el.getAttribute('fill') || 'none';
    const stroke = el.getAttribute('stroke') || 'none';
    const sw = el.getAttribute('stroke-width') || 0;
    const fontFamily = el.getAttribute('font-family') || '';
    const fontSize = el.getAttribute('font-size') || '';
    const opacity = el.style.opacity || 1;
    const transform = el.getAttribute('transform') || '';

    let css = `/* Generated by Aurality Design Tools */\n`;
    css += `.element {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${bbox.x}px;\n`;
    css += `  top: ${bbox.y}px;\n`;
    css += `  width: ${bbox.width}px;\n`;
    css += `  height: ${bbox.height}px;\n`;

    if (fill !== 'none') {
      if (fill.startsWith('url(')) {
        css += `  /* gradient fill - see SVG gradient definition */\n`;
      } else {
        css += `  background-color: ${fill};\n`;
      }
    }
    if (stroke !== 'none') {
      css += `  border: ${sw}px solid ${stroke};\n`;
    }
    if (fontFamily) css += `  font-family: '${fontFamily}', sans-serif;\n`;
    if (fontSize) css += `  font-size: ${fontSize}px;\n`;
    if (opacity != 1) css += `  opacity: ${opacity};\n`;

    if (el.tagName === 'circle') {
      css += `  border-radius: 50%;\n`;
    } else if (el.tagName === 'ellipse') {
      css += `  border-radius: 50%;\n`;
    }

    if (transform) css += `  transform: ${transform};\n`;

    css += `}\n`;

    navigator.clipboard.writeText(css).then(() => {
      this._showToast('CSS copied to clipboard');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = css;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      this._showToast('CSS copied to clipboard');
    });
  }

  // ─── Artboard ────────────────────────────────────────────────────

  setArtboard(width, height) {
    this.artboard.width = width;
    this.artboard.height = height;
    this.artboardBg.setAttribute('width', width);
    this.artboardBg.setAttribute('height', height);
    this.gridRect.setAttribute('width', width);
    this.gridRect.setAttribute('height', height);
    this._updateViewBox();
    this.fitToCanvas();
  }

  _getArtboardPresets() {
    return {
      'Instagram Post': { width: 1080, height: 1080 },
      'Instagram Story': { width: 1080, height: 1920 },
      'Facebook Post': { width: 1200, height: 630 },
      'Facebook Cover': { width: 820, height: 312 },
      'Twitter Post': { width: 1200, height: 675 },
      'Twitter Header': { width: 1500, height: 500 },
      'YouTube Thumbnail': { width: 1280, height: 720 },
      'LinkedIn Banner': { width: 1584, height: 396 },
      'Pinterest Pin': { width: 1000, height: 1500 },
      'Letter (8.5x11)': { width: 2550, height: 3300 },
      'A4': { width: 2480, height: 3508 },
      'A3': { width: 3508, height: 4961 },
      'Business Card': { width: 1050, height: 600 },
      'Poster 24x36': { width: 7200, height: 10800 },
      'Web 1920x1080': { width: 1920, height: 1080 },
      'Mobile 375x812': { width: 375, height: 812 },
      'Square 1024': { width: 1024, height: 1024 },
    };
  }

  // ─── Zoom & Pan ──────────────────────────────────────────────────

  setZoom(level) {
    this.zoom = Math.max(0.1, Math.min(5, level));
    this.zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
    this._updateViewBox();
    this._renderSelectionHandles();
  }

  fitToCanvas() {
    const wrapRect = this.canvasWrap.getBoundingClientRect();
    const scaleX = wrapRect.width / (this.artboard.width + 200);
    const scaleY = wrapRect.height / (this.artboard.height + 200);
    this.zoom = Math.min(scaleX, scaleY);
    this.panOffset = { x: 0, y: 0 };
    this.zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
    this._updateViewBox();
  }

  // ─── Grid ────────────────────────────────────────────────────────

  _renderGrid() {
    this.gridRect.style.display = this.showGrid ? '' : 'none';
  }

  // ─── Tool Management ─────────────────────────────────────────────

  setTool(tool) {
    this.currentTool = tool;
    this._updateToolbar();
    this._updateToolOptions();

    // Cancel any active drawing
    if (tool !== 'pen') {
      if (this._tempPath && this.drawingPoints.length > 1) {
        this._finalizePenPath();
      }
      this.drawingPoints = [];
      this._tempPath = null;
    }

    // Cursor
    const cursors = {
      select: 'default',
      rectangle: 'crosshair',
      circle: 'crosshair',
      ellipse: 'crosshair',
      polygon: 'crosshair',
      star: 'crosshair',
      line: 'crosshair',
      arrow: 'crosshair',
      pen: 'crosshair',
      text: 'text',
      eyedropper: 'crosshair',
    };
    this.svg.style.cursor = cursors[tool] || 'default';
  }

  _updateToolbar() {
    this.toolbar.querySelectorAll('.dt-tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
    });
  }

  _updateToolOptions() {
    this.toolOptionsEl.innerHTML = '';

    if (this.currentTool === 'polygon') {
      const row = document.createElement('div');
      row.className = 'dt-row';
      const label = document.createElement('label');
      label.textContent = 'Sides:';
      label.className = 'dt-label';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 3;
      input.max = 20;
      input.value = 6;
      input.className = 'dt-num-input';
      input.id = 'dt-polygon-sides';
      row.appendChild(label);
      row.appendChild(input);
      this.toolOptionsEl.appendChild(row);
    }

    if (this.currentTool === 'star') {
      const row = document.createElement('div');
      row.className = 'dt-row';
      const label = document.createElement('label');
      label.textContent = 'Points:';
      label.className = 'dt-label';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 3;
      input.max = 20;
      input.value = 5;
      input.className = 'dt-num-input';
      input.id = 'dt-star-points';
      row.appendChild(label);
      row.appendChild(input);
      this.toolOptionsEl.appendChild(row);

      const row2 = document.createElement('div');
      row2.className = 'dt-row';
      const label2 = document.createElement('label');
      label2.textContent = 'Inner R:';
      label2.className = 'dt-label';
      const input2 = document.createElement('input');
      input2.type = 'range';
      input2.min = 10;
      input2.max = 90;
      input2.value = 40;
      input2.className = 'dt-slider';
      input2.id = 'dt-star-inner';
      row2.appendChild(label2);
      row2.appendChild(input2);
      this.toolOptionsEl.appendChild(row2);
    }

    if (this.currentTool === 'rectangle') {
      const row = document.createElement('div');
      row.className = 'dt-row';
      const label = document.createElement('label');
      label.textContent = 'Radius:';
      label.className = 'dt-label';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 0;
      input.max = 200;
      input.value = 0;
      input.className = 'dt-num-input';
      input.id = 'dt-rect-radius';
      input.addEventListener('input', e => {
        this.selectedElements.forEach(el => {
          if (el.tagName === 'rect') el.setAttribute('rx', e.target.value);
        });
      });
      row.appendChild(label);
      row.appendChild(input);
      this.toolOptionsEl.appendChild(row);
    }
  }

  // ─── Toast Notification ──────────────────────────────────────────

  _showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'dt-toast';
    toast.textContent = message;
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ─── Utility ─────────────────────────────────────────────────────

  _panelSection(title) {
    const section = document.createElement('div');
    section.className = 'dt-section';
    const header = document.createElement('div');
    header.className = 'dt-section-header';
    header.textContent = title;
    let collapsed = false;
    const content = document.createElement('div');
    content.className = 'dt-section-content';
    header.addEventListener('click', () => {
      collapsed = !collapsed;
      content.style.display = collapsed ? 'none' : '';
      header.classList.toggle('collapsed', collapsed);
    });
    section.appendChild(header);
    section.appendChild(content);
    // Return content so callers can append to it
    section.appendChild = function(child) {
      content.appendChild(child);
      return child;
    };
    return section;
  }

  _sep() {
    const sep = document.createElement('div');
    sep.className = 'dt-separator';
    return sep;
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Programmatically add a shape to the canvas
   */
  addShape(type, options = {}) {
    const { x = 100, y = 100, width = 200, height = 200, fill, stroke, strokeWidth } = options;
    this._saveState();
    const el = this._createShapeElement(type, x, y, width, height);
    if (fill) el.setAttribute('fill', fill);
    if (stroke) el.setAttribute('stroke', stroke);
    if (strokeWidth) el.setAttribute('stroke-width', strokeWidth);
    el.dataset.dtId = this._generateId();
    this._getActiveLayerGroup().appendChild(el);
    this.selectedElements = [el];
    this._renderSelectionHandles();
    return el;
  }

  /**
   * Programmatically add text
   */
  addText(content, options = {}) {
    const { x = 100, y = 100, fontSize = 32, fontFamily = 'Inter', fill = '#333' } = options;
    this._saveState();
    this._loadGoogleFont(fontFamily);
    const group = this._getActiveLayerGroup();
    const t = this._makeText(group, x, y, content, fontSize, fill, fontFamily);
    this.selectedElements = [t];
    this._renderSelectionHandles();
    return t;
  }

  /**
   * Get canvas state as serialized data
   */
  getState() {
    return {
      artboard: { ...this.artboard },
      layers: this.layers.map(l => ({ ...l })),
      svg: this.layerContainer.innerHTML,
      defs: this.defs.innerHTML,
    };
  }

  /**
   * Restore canvas from serialized state
   */
  loadState(state) {
    if (!state) return;
    this.artboard = state.artboard || this.artboard;
    this.layers = state.layers || this.layers;
    this.layerContainer.innerHTML = state.svg || '';
    if (state.defs) this.defs.innerHTML = state.defs;
    this.setArtboard(this.artboard.width, this.artboard.height);
    this._renderLayerPanel();
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  /**
   * Clear the entire canvas
   */
  clear() {
    this._saveState();
    this.layers.forEach(layer => {
      const g = this.layerContainer.querySelector(`[data-layer-id="${layer.id}"]`);
      if (g) g.innerHTML = '';
    });
    this.selectedElements = [];
    this._renderSelectionHandles();
  }

  /**
   * Destroy the instance and clean up
   */
  destroy() {
    const style = document.getElementById('dt-styles');
    if (style) style.remove();
    this.container.innerHTML = '';
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }

  // ─── Styles ──────────────────────────────────────────────────────

  _getStyles() {
    return `
      .dt-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100vh;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        overflow: hidden;
        user-select: none;
      }
      .dt-toolbar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #181825;
        border-bottom: 1px solid #313244;
        flex-shrink: 0;
        overflow-x: auto;
        flex-wrap: wrap;
      }
      .dt-tool-group {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .dt-color-group {
        gap: 6px;
      }
      .dt-tool-btn {
        width: 34px;
        height: 34px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #cdd6f4;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .dt-tool-btn:hover { background: #313244; }
      .dt-tool-btn.active { background: #4A90D9; color: #fff; border-color: #5ba0e9; }
      .dt-action-btn {
        padding: 4px 10px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .dt-action-btn:hover { background: #45475a; }
      .dt-main {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .dt-panel {
        width: 240px;
        min-width: 200px;
        background: #1e1e2e;
        border-right: 1px solid #313244;
        overflow-y: auto;
        flex-shrink: 0;
        scrollbar-width: thin;
        scrollbar-color: #45475a #1e1e2e;
      }
      .dt-right-panel {
        border-right: none;
        border-left: 1px solid #313244;
      }
      .dt-canvas-wrap {
        flex: 1;
        background: #11111b;
        overflow: hidden;
        position: relative;
      }
      .dt-svg-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .dt-bottom-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: #181825;
        border-top: 1px solid #313244;
        flex-shrink: 0;
        font-size: 11px;
        overflow-x: auto;
      }
      .dt-label {
        color: #a6adc8;
        font-size: 11px;
        white-space: nowrap;
      }
      .dt-color-input {
        width: 28px;
        height: 28px;
        border: 1px solid #45475a;
        border-radius: 4px;
        padding: 0;
        cursor: pointer;
        background: none;
      }
      .dt-color-input::-webkit-color-swatch-wrapper { padding: 2px; }
      .dt-color-input::-webkit-color-swatch { border-radius: 2px; border: none; }
      .dt-num-input {
        width: 56px;
        padding: 3px 6px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 12px;
        outline: none;
      }
      .dt-num-input:focus { border-color: #4A90D9; }
      .dt-text-input {
        flex: 1;
        padding: 3px 6px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 12px;
        outline: none;
        min-width: 60px;
      }
      .dt-text-input:focus { border-color: #4A90D9; }
      .dt-select {
        padding: 3px 6px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 12px;
        outline: none;
        max-width: 180px;
      }
      .dt-select-sm { max-width: 90px; }
      .dt-slider {
        flex: 1;
        accent-color: #4A90D9;
        height: 4px;
      }
      .dt-sm-btn {
        padding: 3px 8px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 11px;
        cursor: pointer;
        transition: background 0.15s;
        white-space: nowrap;
      }
      .dt-sm-btn:hover { background: #45475a; }
      .dt-sm-btn.active { background: #4A90D9; border-color: #5ba0e9; }
      .dt-separator {
        width: 1px;
        height: 24px;
        background: #45475a;
        margin: 0 4px;
        flex-shrink: 0;
      }
      .dt-section {
        border-bottom: 1px solid #313244;
      }
      .dt-section-header {
        padding: 8px 12px;
        font-weight: 600;
        font-size: 12px;
        color: #a6adc8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .dt-section-header::after {
        content: '\\25BC';
        font-size: 8px;
        transition: transform 0.2s;
      }
      .dt-section-header.collapsed::after {
        transform: rotate(-90deg);
      }
      .dt-section-header:hover { background: rgba(255,255,255,0.03); }
      .dt-section-content { padding: 8px 12px; }
      .dt-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      .dt-layer-list {
        max-height: 200px;
        overflow-y: auto;
      }
      .dt-layer-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .dt-layer-row:hover { background: #313244; }
      .dt-layer-row.active { background: #4A90D9; color: #fff; }
      .dt-layer-name { flex: 1; font-size: 12px; }
      .dt-vis-btn {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 14px;
        padding: 0 2px;
      }
      .dt-opacity-slider {
        width: 50px;
        accent-color: #4A90D9;
      }
      .dt-layer-actions {
        display: flex;
        gap: 4px;
        padding: 6px 8px;
        flex-wrap: wrap;
      }
      .dt-align-btns {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
      }
      .dt-align-btn {
        padding: 4px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 10px;
        cursor: pointer;
        text-align: center;
        transition: background 0.15s;
      }
      .dt-align-btn:hover { background: #4A90D9; }
      .dt-palette-display {
        display: flex;
        gap: 4px;
        margin: 6px 0;
        flex-wrap: wrap;
      }
      .dt-swatch {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color 0.15s, transform 0.1s;
      }
      .dt-swatch:hover { border-color: #fff; transform: scale(1.1); }
      .dt-swatch-sm {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        cursor: pointer;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .dt-swatch-sm:hover { border-color: #fff; }
      .dt-saved-palette-row {
        display: flex;
        gap: 3px;
        margin: 4px 0;
        align-items: center;
      }
      .dt-swatch-del {
        background: none;
        border: none;
        color: #f38ba8;
        cursor: pointer;
        font-size: 12px;
        padding: 0 4px;
      }
      .dt-saved-palettes {
        margin-top: 6px;
      }
      .dt-template-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
      }
      .dt-template-btn {
        padding: 6px 10px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 11px;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
      }
      .dt-template-btn:hover { background: #4A90D9; }
      .dt-export-btn {
        display: block;
        width: 100%;
        padding: 8px 12px;
        margin-bottom: 4px;
        border: 1px solid #45475a;
        border-radius: 4px;
        background: #313244;
        color: #cdd6f4;
        font-size: 12px;
        cursor: pointer;
        text-align: center;
        transition: background 0.15s;
      }
      .dt-export-btn:hover { background: #4A90D9; }
      .dt-tool-options {
        min-height: 30px;
      }
      .dt-zoom-display {
        font-weight: 600;
        color: #cdd6f4;
        min-width: 40px;
        text-align: center;
      }
      .dt-coords {
        margin-left: auto;
        color: #a6adc8;
        font-family: 'Courier New', monospace;
      }
      .dt-text-editor {
        box-sizing: border-box;
        line-height: 1.3;
        overflow: hidden;
      }
      .dt-toast {
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 8px 20px;
        background: #313244;
        color: #cdd6f4;
        border-radius: 6px;
        font-size: 13px;
        opacity: 0;
        transition: opacity 0.3s, transform 0.3s;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .dt-toast.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .dt-handle {
        pointer-events: all !important;
      }
      /* Scrollbar styling */
      .dt-panel::-webkit-scrollbar { width: 6px; }
      .dt-panel::-webkit-scrollbar-track { background: transparent; }
      .dt-panel::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
      .dt-panel::-webkit-scrollbar-thumb:hover { background: #585b70; }
      /* Responsive */
      @media (max-width: 900px) {
        .dt-panel { width: 180px; min-width: 140px; }
      }
      @media (max-width: 600px) {
        .dt-left-panel, .dt-right-panel { display: none; }
      }
    `;
  }
}

// Export to window
window.DesignTools = DesignTools;
