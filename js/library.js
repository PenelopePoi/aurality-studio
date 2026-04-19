/**
 * Aurality Studio — Library
 * IndexedDB track library: import, BPM/key analysis, search, playlists, crates, history.
 */
class Library {
  constructor() {
    this.db = null;
    this.tracks = [];
    this.playlists = [];
    this.history = [];
    this.currentPlaylist = null;
    this.searchQuery = '';
    this.sortField = 'name';
    this.sortDirection = 'asc';
    this.DB_NAME = 'AuralityStudio';
    this.DB_VERSION = 1;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
          trackStore.createIndex('name', 'name', { unique: false });
          trackStore.createIndex('artist', 'artist', { unique: false });
          trackStore.createIndex('bpm', 'bpm', { unique: false });
          trackStore.createIndex('key', 'key', { unique: false });
          trackStore.createIndex('genre', 'genre', { unique: false });
          trackStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        }

        if (!db.objectStoreNames.contains('audioData')) {
          db.createObjectStore('audioData', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('cuepoints')) {
          db.createObjectStore('cuepoints', { keyPath: 'trackId' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._loadAll().then(resolve);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async _loadAll() {
    this.tracks = await this._getAll('tracks');
    this.playlists = await this._getAll('playlists');
    const historyItems = await this._getAll('history');
    this.history = historyItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 500);
  }

  // Import a file
  async importTrack(file) {
    const id = 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const arrayBuffer = await file.arrayBuffer();

    // Parse basic metadata from filename
    let name = file.name.replace(/\.[^/.]+$/, '');
    let artist = 'Unknown';
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      artist = parts[0].trim();
      name = parts.slice(1).join(' - ').trim();
    }

    const trackMeta = {
      id,
      name,
      artist,
      filename: file.name,
      fileType: file.type,
      fileSize: file.size,
      duration: 0,
      bpm: 0,
      key: '',
      genre: '',
      energy: 0,
      dateAdded: Date.now(),
      lastPlayed: null,
      playCount: 0,
      rating: 0,
      comment: '',
      color: ''
    };

    // Store audio data separately (large blob)
    await this._put('audioData', { id, data: arrayBuffer });
    await this._put('tracks', trackMeta);

    this.tracks.push(trackMeta);
    return trackMeta;
  }

  // Update track metadata after analysis
  async updateTrack(id, updates) {
    const track = this.tracks.find(t => t.id === id);
    if (!track) return;
    Object.assign(track, updates);
    await this._put('tracks', track);
  }

  // Get audio data for playback
  async getAudioData(trackId) {
    const record = await this._get('audioData', trackId);
    return record ? record.data : null;
  }

  // Delete track
  async deleteTrack(id) {
    await this._delete('tracks', id);
    await this._delete('audioData', id);
    await this._delete('cuepoints', id);
    this.tracks = this.tracks.filter(t => t.id !== id);
  }

  // Save cue points for a track
  async saveCuePoints(trackId, cuePoint, hotCues) {
    await this._put('cuepoints', { trackId, cuePoint, hotCues });
  }

  // Load cue points
  async loadCuePoints(trackId) {
    return this._get('cuepoints', trackId);
  }

  // Record play to history
  async recordPlay(trackId) {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;
    track.playCount = (track.playCount || 0) + 1;
    track.lastPlayed = Date.now();
    await this._put('tracks', track);

    const historyEntry = {
      trackId,
      trackName: track.name,
      artist: track.artist,
      timestamp: Date.now()
    };
    await this._add('history', historyEntry);
    this.history.unshift(historyEntry);
    if (this.history.length > 500) this.history.pop();
  }

  // Playlists
  async createPlaylist(name) {
    const pl = {
      id: 'pl_' + Date.now(),
      name,
      trackIds: [],
      created: Date.now()
    };
    await this._put('playlists', pl);
    this.playlists.push(pl);
    return pl;
  }

  async addToPlaylist(playlistId, trackId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (!pl.trackIds.includes(trackId)) {
      pl.trackIds.push(trackId);
      await this._put('playlists', pl);
    }
  }

  async removeFromPlaylist(playlistId, trackId) {
    const pl = this.playlists.find(p => p.id === playlistId);
    if (!pl) return;
    pl.trackIds = pl.trackIds.filter(id => id !== trackId);
    await this._put('playlists', pl);
  }

  async deletePlaylist(playlistId) {
    await this._delete('playlists', playlistId);
    this.playlists = this.playlists.filter(p => p.id !== playlistId);
  }

  // Search and filter
  search(query) {
    this.searchQuery = query.toLowerCase();
    return this.getFilteredTracks();
  }

  getFilteredTracks() {
    let result = [...this.tracks];

    // Apply search
    if (this.searchQuery) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(this.searchQuery) ||
        t.artist.toLowerCase().includes(this.searchQuery) ||
        (t.genre || '').toLowerCase().includes(this.searchQuery) ||
        (t.key || '').toLowerCase().includes(this.searchQuery)
      );
    }

    // Apply playlist filter
    if (this.currentPlaylist) {
      const pl = this.playlists.find(p => p.id === this.currentPlaylist);
      if (pl) {
        result = result.filter(t => pl.trackIds.includes(t.id));
      }
    }

    // Sort
    result.sort((a, b) => {
      let va = a[this.sortField] || '';
      let vb = b[this.sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return this.sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  sort(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    return this.getFilteredTracks();
  }

  // IndexedDB helpers
  _transaction(store, mode = 'readonly') {
    return this.db.transaction(store, mode).objectStore(store);
  }

  _get(store, key) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  _getAll(store) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  _put(store, data) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(store, 'readwrite').put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  _add(store, data) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(store, 'readwrite').add(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  _delete(store, key) {
    return new Promise((resolve, reject) => {
      const req = this._transaction(store, 'readwrite').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // Get total library stats
  getStats() {
    return {
      totalTracks: this.tracks.length,
      totalPlaylists: this.playlists.length,
      totalPlays: this.tracks.reduce((s, t) => s + (t.playCount || 0), 0),
      totalDuration: this.tracks.reduce((s, t) => s + (t.duration || 0), 0)
    };
  }
}

window.AuralityLibrary = Library;
