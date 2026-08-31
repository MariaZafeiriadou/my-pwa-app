import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import './App.css';

function App() {
  // --- 1. STATES (Η ΜΝΗΜΗ ΤΗΣ ΕΦΑΡΜΟΓΗΣ) ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'library' | 'settings'>('search');

  // STATES ΓΙΑ DASHBOARD, ΦΙΛΤΡΑ ΚΑΙ MIXES
  const [popularTracks, setPopularTracks] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'none' | 'title' | 'artist'>('none');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  // STATES ΓΙΑ ΤΟ LOGIN / SIGN IN
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');

  // STATES ΓΙΑ SETTINGS
  const [userFullName, setUserFullName] = useState('User');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [audioQuality, setAudioQuality] = useState<'low' | 'normal' | 'high'>('high');
  const [equalizer, setEqualizer] = useState<'balanced' | 'bass' | 'vocal'>('balanced');

  // STATES ΓΙΑ PWA INSTALL & LYRICS VIEW
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [translateLyrics, setTranslateLyrics] = useState(false);

  // --- 2. REFS & LIVE QUERIES ---
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const offlineTracks = useLiveQuery(() => db.tracks.toArray());

  // --- 3. DATA PROCESSING (ΦΙΛΤΡΑΡΙΣΜΑ & ΤΑΞΙΝΟΜΗΣΗ ΒΙΒΛΙΟΘΗΚΗΣ) ---
  const getProcessedTracks = () => {
    let tracks = offlineTracks ? [...offlineTracks] : [];
    if (showOnlyFavorites) {
      tracks = tracks.filter(t => t.isFavorite);
    }
    if (librarySearchTerm.trim()) {
      const query = librarySearchTerm.toLowerCase();
      tracks = tracks.filter(t => 
        (t.title || '').toLowerCase().includes(query) || 
        (t.artist || '').toLowerCase().includes(query)
      );
    }
    if (sortBy === 'title') {
      tracks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'artist') {
      tracks.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    }
    return tracks;
  };

  const processedTracks = getProcessedTracks();

  // --- 4. EFFECTS (ΦΟΡΤΩΣΗ ΔΕΔΟΜΕΝΩΝ) ---
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const activeUser = localStorage.getItem('user_session');
    if (activeUser) {
      setIsLoggedIn(true);
      setUsername(activeUser);
      
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const currentData = users.find((u: any) => u.username.toLowerCase() === activeUser.toLowerCase());
      if (currentData && currentData.fullName) {
        setUserFullName(currentData.fullName);
      } else {
        setUserFullName(activeUser);
      }
    }

    const savedQuality = localStorage.getItem('setting_quality') || 'high';
    const savedEq = localStorage.getItem('setting_eq') || 'balanced';
    setAudioQuality(savedQuality as any);
    setEqualizer(savedEq as any);

    const history = JSON.parse(localStorage.getItem('track_history') || '[]');
    setRecentlyPlayed(history);

    // Αρχική φόρτωση με σταθερό Jamendo API
    const client_id = 'b2e656fd';
    
    fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&limit=6&order=popularity_total`)
      .then(res => res.json())
      .then(data => { if (data.results) setPopularTracks(data.results); })
      .catch(err => console.error(err));

    fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&limit=6&order=releasedate_desc`)
      .then(res => res.json())
      .then(data => { if (data.results) setNewReleases(data.results); })
      .catch(err => console.error(err));

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // --- 5. HELPERS & FORMATTING ---
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `🌅 Καλημέρα, ${userFullName}!`;
    if (hour < 18) return `☀️ Καλησπέρα, ${userFullName}!`;
    return `🌙 Καλησπέρα, ${userFullName}!`;
  };

  const getLyrics = (track: any, translated: boolean) => {
    if (!track) return '';
    if (track.lyrics && track.lyrics !== "Οι στίχοι δεν βρέθηκαν για αυτό το κομμάτι." && track.lyrics !== "No lyrics available for this track.") {
      return track.lyrics;
    }
    const trackTitle = track.title || track.name || 'Music';
    if (translated) {
      return `[Verse 1]\nNow playing: "${trackTitle}"\nWalking down the neon streets\nListening to the sync of the beats\nOffline mode but my heart is online\nEverything is going to be just fine...\n\n[Chorus]\nTrackSync is playing in my head\nAll the worries are now dead\nFeel the rhythm, feel the glow\nLet the music take control\nYeah, let it flow...`;
    }
    return `[Στίχος 1]\nΤώρα ακούγεται: "${trackTitle}"\nΠερπατώντας στους δρόμους με τα νέον\nΑκούγοντας τον συγχρονισμό των ρυθμών\nOffline λειτουργία αλλά η καρδιά μου είναι online\nΌλα θα πάνε μια χαρά...\n\n[Ρεφρέν]\nΤο TrackSync παίζει μες στο μυαλό μου\nΌλες οι έγνοιες χάθηκαν πια\nΝιώσε τον ρυθμό, νιώσε τη λάμψη\nΆφησε τη μουσική να σε παρασύρει\nΝαι, να σε παρασύρει...`;
  };

  const updateHistory = (track: any) => {
    const history = JSON.parse(localStorage.getItem('track_history') || '[]');
    const filtered = history.filter((t: any) => (t.id || t.name) !== (track.id || track.name));
    const updated = [track, ...filtered].slice(0, 6);
    localStorage.setItem('track_history', JSON.stringify(updated));
    setRecentlyPlayed(updated);
  };

  // --- 6. AUDIO & PLAYBACK ACTIONS ---
  const playTrack = (track: any) => {
    if (currentTrack?.playingUrl) {
      URL.revokeObjectURL(currentTrack.playingUrl);
    }
    const url = track.audioBlob
      ? URL.createObjectURL(track.audioBlob)
      : (track.audio || track.audio_url);
    setCurrentTrack({ ...track, playingUrl: url });
    setIsPlaying(true);
    
    updateHistory(track);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.load();
      audioPlayerRef.current.play();
    }
  };

  const playNext = () => {
    let currentList = searchResults.length > 0 ? searchResults : popularTracks;
    if (activeTab === 'library') currentList = processedTracks;
    
    if (currentList.length === 0 || !currentTrack) return;
    const currentIndex = currentList.findIndex(
      t => (t.id || t.name) === (currentTrack.id || currentTrack.name)
    );
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * currentList.length);
    } else {
      nextIndex = (currentIndex + 1) % currentList.length;
    }
    playTrack(currentList[nextIndex]);
  };

  const playPrevious = () => {
    let currentList = searchResults.length > 0 ? searchResults : popularTracks;
    if (activeTab === 'library') currentList = processedTracks;

    if (currentList.length === 0 || !currentTrack) return;
    const currentIndex = currentList.findIndex(
      t => (t.id || t.name) === (currentTrack.id || currentTrack.name)
    );
    const prevIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    playTrack(currentList[prevIndex]);
  };

  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setCurrentTime(audioPlayerRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioPlayerRef.current) {
      setDuration(audioPlayerRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioPlayerRef.current) {
      const newMute = !isMuted;
      setIsMuted(newMute);
      audioPlayerRef.current.muted = newMute;
    }
  };

  // --- 7. DATABASE & API ACTIONS ---
  const searchMusic = async (customTerm?: string) => {
    const query = customTerm || searchTerm;
    if (!query.trim()) return;
    setLoading(true);
    if (customTerm) setSearchTerm(customTerm);
    try {
      const client_id = 'b2e656fd';
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&limit=12&search=${encodeURIComponent(query.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) setSearchResults(data.results);
    } catch (err) {
      console.error(err);
      alert('Σφάλμα κατά την αναζήτηση.');
    } finally {
      setLoading(false);
    }
  };

  const saveOffline = async (track: any) => {
    try {
      const response = await fetch(track.audio || track.audio_url);
      const blob = await response.blob();

      let lyricsData = "Οι στίχοι δεν βρέθηκαν για αυτό το κομμάτι.";
      try {
        const artist = encodeURIComponent(track.artist_name);
        const title = encodeURIComponent(track.name);
        const lyricsRes = await fetch(`https://api.lyrics.ovh/v1/${artist}/${title}`);
        
        if (lyricsRes.ok) {
          const lyricsJson = await lyricsRes.json();
          if (lyricsJson.lyrics) {
            lyricsData = lyricsJson.lyrics;
          }
        }
      } catch (e) {
        console.log("Δεν κατέστη δυνατή η λήψη στίχων.");
      }

      await db.tracks.add({
        title: track.name,
        artist: track.artist_name,
        cover: track.image,
        audioBlob: blob,
        lyrics: lyricsData, 
        isFavorite: false,
      });
      alert('Αποθηκεύτηκε επιτυχώς για Offline αναπαραγωγή (Μαζί με τους στίχους)!');
    } catch (error) {
      console.error(error);
      alert('Σφάλμα κατά την αποθήκευση του κομματιού.');
    }
  };

  const deleteTrack = async (id: any) => {
    await db.tracks.delete(id);
  };

  const toggleFavorite = async (track: any) => {
    try {
      const newFavoriteStatus = !track.isFavorite;
      await db.tracks.update(track.id, { isFavorite: newFavoriteStatus });
      if (currentTrack && currentTrack.id === track.id) {
        setCurrentTrack({ ...currentTrack, isFavorite: newFavoriteStatus });
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  // --- 8. AUTH & SETTINGS ACTIONS ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim()) {
      alert('Παρακαλώ συμπληρώστε όλα τα πεδία!');
      return;
    }

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');

    if (authMode === 'register') {
      const userExists = users.some((u: any) => u.username.toLowerCase() === formUsername.toLowerCase());
      if (userExists) {
        alert('Το όνομα χρήστη υπάρχει ήδη!');
        return;
      }
      const displayName = formFullName.trim() ? formFullName : formUsername;
      users.push({ username: formUsername, password: formPassword, fullName: displayName });
      localStorage.setItem('mock_users', JSON.stringify(users));
      
      localStorage.setItem('user_session', formUsername);
      setIsLoggedIn(true);
      setUsername(formUsername);
      setUserFullName(displayName);
      setFormUsername('');
      setFormPassword('');
      setFormFullName('');
      alert('Η εγγραφή ολοκληρώθηκε επιτυχώς! Καλώς ήρθατε.');
    } else {
      const validUser = users.find((u: any) => u.username.toLowerCase() === formUsername.toLowerCase() && u.password === formPassword);
      
      if (validUser || (formUsername.toLowerCase() === 'μαρία' && formPassword === '1234') || (formUsername.toLowerCase() === 'maria' && formPassword === '1234')) {
        const finalName = validUser?.fullName || 'Μαρία';
        localStorage.setItem('user_session', formUsername);
        setIsLoggedIn(true);
        setUsername(formUsername);
        setUserFullName(finalName);
        setFormUsername('');
        setFormPassword('');
      } else {
        alert('Λάθος username ή password! (Δοκιμάστε εγγραφή ή username: maria / κωδικός: 1234)');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setIsLoggedIn(false);
    setUsername('');
    setShowLyrics(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const userIndex = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
    
    if (userIndex !== -1) {
      users[userIndex].fullName = userFullName;
      localStorage.setItem('mock_users', JSON.stringify(users));
      alert('Profile updated successfully!');
    } else {
      users.push({ username: username, password: '1234', fullName: userFullName });
      localStorage.setItem('mock_users', JSON.stringify(users));
      alert('Profile created and updated successfully!');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const userIndex = users.findIndex((u: any) => u.username.toLowerCase() === username.toLowerCase());
    const currentPassInDB = userIndex !== -1 ? users[userIndex].password : '1234';

    if (oldPassword !== currentPassInDB) {
      alert('Current password is incorrect!');
      return;
    }
    if (!newPassword.trim()) {
      alert('New password cannot be empty!');
      return;
    }
    if (userIndex !== -1) {
      users[userIndex].password = newPassword;
    } else {
      users.push({ username: username, password: newPassword, fullName: userFullName });
    }
    localStorage.setItem('mock_users', JSON.stringify(users));
    alert('Password changed successfully!');
    setOldPassword('');
    setNewPassword('');
  };

  const handleQualityChange = (quality: 'low' | 'normal' | 'high') => {
    setAudioQuality(quality);
    localStorage.setItem('setting_quality', quality);
  };

  const handleEqChange = (eq: 'balanced' | 'bass' | 'vocal') => {
    setEqualizer(eq);
    localStorage.setItem('setting_eq', eq);
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('App installation accepted');
    }
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // --- 9. CONDITION RENDERING: AUTHENTICATION SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        {authMode === 'login' ? (
          <div className="auth-card glass">
            <div className="auth-header">
              <img src="/pwa-192x192.png" alt="logo" className="auth-logo" />
              <h2>Track<span>Sync</span></h2>
              <p>Welcome back! Please login to your account.</p>
            </div>
            <form onSubmit={handleAuth} className="auth-form">
              <div className="form-group">
                <label>Username</label>
                <input type="text" placeholder="Enter your username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
              </div>
              <button type="submit" className="auth-submit-btn">Sign In</button>
            </form>
            <div className="auth-toggle">
              <p>Don't have an account? <span onClick={() => { setAuthMode('register'); setFormUsername(''); setFormPassword(''); setFormFullName(''); }}>Register here</span></p>
            </div>
          </div>
        ) : (
          <div className="auth-card glass" style={{ borderColor: 'var(--accent-magenta)' }}>
            <div className="auth-header">
              <img src="/pwa-192x192.png" alt="logo" className="auth-logo" />
              <h2>Track<span>Sync</span></h2>
              <p style={{ color: 'var(--accent-magenta)' }}>Create a brand new account!</p>
            </div>
            <form onSubmit={handleAuth} className="auth-form">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name (e.g. Maria)" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Choose Username</label>
                <input type="text" placeholder="Create a unique username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Create Password</label>
                <input type="password" placeholder="Choose a strong password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
              </div>
              <button type="submit" className="auth-submit-btn" style={{ background: 'linear-gradient(90deg, var(--accent-magenta), #6366f1)' }}>Sign Up</button>
            </form>
            <div className="auth-toggle">
              <p>Already have an account? <span onClick={() => { setAuthMode('login'); setFormUsername(''); setFormPassword(''); setFormFullName(''); }}>Login here</span></p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 10. MAIN APPLICATION UI (WHEN LOGGED IN) ---
  return (
    <div className="app-layout">

      {/* 1. SIDEBAR LEFT */}
      <aside className="sidebar glass">
        <div className="brand-sidebar">
          <img src="/pwa-192x192.png" alt="logo" />
          <h2>Track<span>Sync</span></h2>
        </div>

        <nav className="side-nav">
          <button className={activeTab === 'search' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('search'); setSearchResults([]); setSearchTerm(''); setShowLyrics(false); }}>🔍 Discover</button>
          <button className={activeTab === 'library' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('library'); setShowLyrics(false); }}>📚 My Library</button>
          <button className={activeTab === 'settings' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('settings'); setShowLyrics(false); }}>⚙️ Settings</button>
        </nav>

        {/* Custom PWA Install Button & Network Status */}
        <div className="sidebar-footer">
          {showInstallBtn && (
            <button className="pwa-install-sidebar-btn" onClick={handleInstallApp}>✨ Install TrackSync</button>
          )}
          <div className="status-container">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>
      </aside>

      {/* 2. MAIN VIEW (CENTER) */}
      <main className="main-view">
        <header className="view-header">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search Artists or Genres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMusic()}
            />
            <button onClick={() => searchMusic()}>{loading ? '...' : 'Search'}</button>
          </div>
        </header>

        <div className="scroll-content">
          <div className="content-wrapper">

            {/* SPOTIFY LYRICS PANEL */}
            {showLyrics && currentTrack ? (
              <div className="spotify-lyrics-container">
                <div className="lyrics-control-top-bar">
                  <button className="lyrics-lang-toggle-btn" onClick={() => setTranslateLyrics(!translateLyrics)}>
                    🌐 {translateLyrics ? "Show Original" : "Translate to English"}
                  </button>
                  <button className="lyrics-close-panel-btn" onClick={() => setShowLyrics(false)}>✕ Close Lyrics</button>
                </div>
                <div className="lyrics-scrolling-body">
                  <h2 className="lyrics-track-title-heading">{currentTrack.title || currentTrack.name}</h2>
                  <p className="lyrics-track-artist-subheading">{currentTrack.artist || currentTrack.artist_name}</p>
                  <pre className="lyrics-text-pre-block">
                    {getLyrics(currentTrack, translateLyrics)}
                  </pre>
                </div>
              </div>
            ) : (
              <>
                {/* TAB: Discover */}
                {activeTab === 'search' && (
                  <section className="results-section">
                    {searchResults.length === 0 ? (
                      <div className="dashboard-home">
                        <h1 className="greeting-title">{getGreeting()}</h1>
                        
                        <div className="genre-chips">
                          <button onClick={() => searchMusic('Lo-Fi')}>☕ Lo-Fi</button>
                          <button onClick={() => searchMusic('Chillout')}>🌊 Chill</button>
                          <button onClick={() => searchMusic('Rock')}>🎸 Rock</button>
                          <button onClick={() => searchMusic('Electronic')}>⚡ Pop</button>
                        </div>

                        <div className="dashboard-block">
                          <h2>Your Daily Mixes</h2>
                          <div className="mixes-container">
                            <div className="mix-card mix-1" onClick={() => searchMusic('Chillout')}>
                              <div className="mix-cover">🎧</div>
                              <h4>Daily Mix 1</h4>
                              <p>Chillout, Ambient and relaxing melodies.</p>
                            </div>
                            <div className="mix-card mix-2" onClick={() => searchMusic('Rock')}>
                              <div className="mix-cover">🎸</div>
                              <h4>Daily Mix 2</h4>
                              <p>Rock, Alternative and energetic beats.</p>
                            </div>
                            <div className="mix-card mix-3" onClick={() => searchMusic('Lo-Fi')}>
                              <div className="mix-cover">☕</div>
                              <h4>Daily Mix 3</h4>
                              <p>Lo-Fi, Focus and study soundscapes.</p>
                            </div>
                          </div>
                        </div>

                        {/* Ενότητα: Ιστορικό */}
                        {recentlyPlayed.length > 0 && (
                          <div className="dashboard-block">
                            <h2>Recently Played</h2>
                            <div className="grid-container">
                              {recentlyPlayed.map((track, idx) => (
                                <div key={`hist-${idx}`} className="glass-card result-card">
                                  <img src={track.cover || track.image} alt="cover" />
                                  <div className="card-details">
                                    <h4>{track.title || track.name}</h4>
                                    <p>{track.artist || track.artist_name}</p>
                                  </div>
                                  <div className="card-actions">
                                    <button onClick={() => playTrack(track)}>▶</button>
                                    {!track.audioBlob && (
                                      <button onClick={() => saveOffline(track)}>↓</button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="dashboard-block">
                          <h2>Popular Hits</h2>
                          <div className="grid-container">
                            {popularTracks.map(track => (
                              <div key={`pop-${track.id}`} className="glass-card result-card">
                                <img src={track.image} alt="cover" />
                                <div className="card-details">
                                  <h4>{track.name}</h4>
                                  <p>{track.artist_name}</p>
                                </div>
                                <div className="card-actions">
                                  <button onClick={() => playTrack(track)}>▶</button>
                                  <button onClick={() => saveOffline(track)}>↓</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="dashboard-block">
                          <h2>Fresh Drops</h2>
                          <div className="grid-container">
                            {newReleases.map(track => (
                              <div key={`new-${track.id}`} className="glass-card result-card">
                                <img src={track.image} alt="cover" />
                                <div className="card-details">
                                  <h4>{track.name}</h4>
                                  <p>{track.artist_name}</p>
                                </div>
                                <div className="card-actions">
                                  <button onClick={() => playTrack(track)}>▶</button>
                                  <button onClick={() => saveOffline(track)}>↓</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h2>Search Results</h2>
                          <button className="clear-search-btn" onClick={() => { setSearchResults([]); setSearchTerm(''); }}>← Back Home</button>
                        </div>
                        <div className="grid-container">
                          {searchResults.map(track => (
                            <div key={track.id} className="glass-card result-card">
                              <img src={track.image} alt="cover" />
                              <div className="card-details">
                                <h4>{track.name}</h4>
                                <p>{track.artist_name}</p>
                                <div className="genre-tag">{track.musicinfo?.genre || 'Music'}</div>
                              </div>
                              <div className="card-actions">
                                <button onClick={() => playTrack(track)}>▶</button>
                                <button onClick={() => saveOffline(track)}>↓</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'library' && (
                  <section className="library-section">
                    <div className="library-controls-bar">
                      <h2>Offline Collections</h2>
                      <div className="filter-sort-group">
                        <input type="text" placeholder="🔍 Search in library..." value={librarySearchTerm} onChange={(e) => setLibrarySearchTerm(e.target.value)} className="library-search-input" />
                        <button className={`filter-btn ${showOnlyFavorites ? 'active' : ''}`} onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}>
                          {showOnlyFavorites ? '❤️ Favorites Only' : '🤍 Show All'}
                        </button>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="sort-select">
                          <option value="none">Sort by: Default</option>
                          <option value="title">Title (A-Z)</option>
                          <option value="artist">Artist (A-Z)</option>
                        </select>
                      </div>
                    </div>
                    <div className="list-container">
                      {processedTracks.length === 0 && <p className="empty-state-text">No tracks match your filters.</p>}
                      {processedTracks.map(track => (
                        <div key={track.id} className={`glass-row ${currentTrack?.id === track.id ? 'active-row' : ''}`} onClick={() => playTrack(track)}>
                          <img src={track.cover} alt="cover" className="row-cover" />
                          <div className="row-info">
                            <strong>{track.title}</strong>
                            <span>{track.artist}</span>
                          </div>
                          <div className="row-status">
                            <button className="fav-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(track); }}>
                              {track.isFavorite ? '❤️' : '🤍'}
                            </button>
                            {currentTrack?.id === track.id ? <span className="playing-icon">•••</span> : <span className="offline-icon">✓</span>}
                            <button className="delete-btn-small" onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === 'settings' && (
                  <section className="settings-section">
                    <h2>Settings</h2>
                    <div className="settings-block glass">
                      <h3>👤 Profile Details</h3>
                      <form onSubmit={handleUpdateProfile} className="settings-form">
                        <div className="form-group-row">
                          <div className="input-field-block">
                            <label>Display Name (Full Name)</label>
                            <input type="text" value={userFullName} onChange={(e) => setUserFullName(e.target.value)} placeholder="Your display name" />
                          </div>
                          <button type="submit" className="settings-save-btn">Save Name</button>
                        </div>
                      </form>
                    </div>
                    <div className="settings-block glass">
                      <h3>🔑 Security & Password</h3>
                      <form onSubmit={handleChangePassword} className="settings-form">
                        <div className="form-group-column">
                          <div className="input-field-block">
                            <label>Current Password</label>
                            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" />
                          </div>
                          <div className="input-field-block">
                            <label>New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                          </div>
                          <button type="submit" className="settings-save-btn password-btn">Update Password</button>
                        </div>
                      </form>
                    </div>
                    <div className="settings-block glass">
                      <h3>🔊 Audio Settings</h3>
                      <div className="setting-row">
                        <div className="setting-desc">
                          <h4>Audio Quality</h4>
                          <p>Adjust your streaming audio bitrate quality.</p>
                        </div>
                        <div className="setting-actions-toggle">
                          <button className={`toggle-option-btn ${audioQuality === 'low' ? 'active' : ''}`} onClick={() => handleQualityChange('low')}>Low</button>
                          <button className={`toggle-option-btn ${audioQuality === 'normal' ? 'active' : ''}`} onClick={() => handleQualityChange('normal')}>Normal</button>
                          <button className={`toggle-option-btn ${audioQuality === 'high' ? 'active' : ''}`} onClick={() => handleQualityChange('high')}>High (HD)</button>
                        </div>
                      </div>
                      <div className="setting-row" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px' }}>
                        <div className="setting-desc">
                          <h4>Equalizer Preset</h4>
                          <p>Choose an equalizer model to adjust acoustic frequency response.</p>
                        </div>
                        <div className="setting-actions-toggle">
                          <button className={`toggle-option-btn ${equalizer === 'balanced' ? 'active' : ''}`} onClick={() => handleEqChange('balanced')}>Balanced</button>
                          <button className={`toggle-option-btn ${equalizer === 'bass' ? 'active' : ''}`} onClick={() => handleEqChange('bass')}>Bass Booster</button>
                          <button className={`toggle-option-btn ${equalizer === 'vocal' ? 'active' : ''}`} onClick={() => handleEqChange('vocal')}>Vocal Clear</button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* 3. RIGHT SIDEBAR (NOW PLAYING PANEL) */}
      {currentTrack && !showLyrics && (
        <aside className="right-sidebar glass">
          <div className="right-sidebar-header">
            <h3>Now Playing</h3>
          </div>
          <div className="right-sidebar-content">
            <img src={currentTrack.cover || currentTrack.image} alt="large cover" className="large-cover" />
            <div className="right-track-details">
              <h3>{currentTrack.title || currentTrack.name}</h3>
              <p>{currentTrack.artist || currentTrack.artist_name}</p>
            </div>
            <div className="right-sidebar-badge">
              <span>High Quality Audio</span>
            </div>
          </div>
        </aside>
      )}

      {/* 4. PLAYER BAR */}
      {currentTrack && (
        <footer className="player-bar glass">
          <img src={currentTrack.cover || currentTrack.image} alt="cover" />
          <div className="player-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong>{currentTrack.title || currentTrack.name}</strong>
              {currentTrack.audioBlob && (
                <button className="fav-btn-player" onClick={() => toggleFavorite(currentTrack)}>
                  {currentTrack.isFavorite ? '❤️' : '🤍'}
                </button>
              )}
            </div>
            <span>{currentTrack.artist || currentTrack.artist_name}</span>
          </div>

          <div className="player-controls">
            <button className={`control-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>🔀</button>
            <button className="control-btn" onClick={playPrevious}>⏮</button>
            <button className="main-play-btn" onClick={togglePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
            <button className="control-btn" onClick={playNext}>⏭</button>
            <button className={`control-btn ${isRepeat ? 'active' : ''}`} onClick={() => setIsRepeat(!isRepeat)}>🔁</button>
          </div>

          <div className="seekbar-container">
            <span>{formatTime(currentTime)}</span>
            <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="seekbar" />
            <span>{formatTime(duration)}</span>
          </div>

          <div className="volume-control">
            <button className={`control-btn lyrics-trigger-footer-btn ${showLyrics ? 'active' : ''}`} onClick={() => setShowLyrics(!showLyrics)} title="Lyrics">
              🎤
            </button>
            <button className="control-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="volume-slider" />
          </div>

          <audio
            ref={audioPlayerRef}
            src={currentTrack.playingUrl}
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => isRepeat ? audioPlayerRef.current?.play() : playNext()}
          />
        </footer>
      )}

    </div>
  );
}

const triggerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-offline-actions');
      console.log('Background sync registered successfully');
    } catch (err) {
      console.error('Background sync failed:', err);
    }
  }
};

export default App;
