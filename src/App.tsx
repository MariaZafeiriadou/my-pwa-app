import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import './App.css';

function App() {
  // --- 1. STATES ---
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
  
  const [activeTab, setActiveTab] = useState<'home' | 'library' | 'favorites' | 'settings'>(() => {
    return (localStorage.getItem('active_tab') as any) || 'home';
  });

  // STATES ΓΙΑ PLAYLISTS
  const [librarySubTab, setLibrarySubTab] = useState<'all' | 'playlists'>('all');
  const [playlists, setPlaylists] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('user_playlists') || '[]');
    } catch {
      return [];
    }
  });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);

  // STATES ΓΙΑ ΤΟ POPUP MODAL
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<any | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalNewPlaylistName, setModalNewPlaylistName] = useState('');

  // STATES ΓΙΑ DASHBOARD
  const [popularTracks, setPopularTracks] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  // AUTH STATES
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');

  // SETTINGS STATES
  const [userFullName, setUserFullName] = useState('User');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [audioQuality, setAudioQuality] = useState<'low' | 'normal' | 'high'>('high');
  const [downloadQuality, setDownloadQuality] = useState<'normal' | 'high'>('high');
  const [equalizer, setEqualizer] = useState<'balanced' | 'bass' | 'vocal' | 'electronic' | 'acoustic'>('balanced');
  const [volumeNormalization, setVolumeNormalization] = useState(true);
  const [explicitFilter, setExplicitFilter] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  // PWA & LYRICS
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [translateLyrics, setTranslateLyrics] = useState(false);

  // --- 2. REFS & LIVE QUERIES ---
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const offlineTracks = useLiveQuery(() => db.tracks.toArray());

  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);

  const getProcessedTracks = () => {
    let tracks = offlineTracks ? [...offlineTracks] : [];
    if (librarySearchTerm.trim()) {
      const query = librarySearchTerm.toLowerCase();
      tracks = tracks.filter(t => 
        (t.title || '').toLowerCase().includes(query) || 
        (t.artist || '').toLowerCase().includes(query)
      );
    }
    return tracks;
  };

  const processedTracks = getProcessedTracks();
  const favoriteTracks = offlineTracks ? offlineTracks.filter(t => t.isFavorite) : [];

  const isTrackFavorite = (track: any) => {
    if (!offlineTracks) return false;
    const trackTitle = (track.name || track.title || '').toLowerCase();
    const found = offlineTracks.find(t => (t.title || '').toLowerCase() === trackTitle);
    return found ? !!found.isFavorite : false;
  };

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

  const createPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const updated = [...playlists, { id: Date.now(), name: newPlaylistName.trim(), tracks: [] }];
    setPlaylists(updated);
    localStorage.setItem('user_playlists', JSON.stringify(updated));
    setNewPlaylistName('');
    alert('Η playlist δημιουργήθηκε επιτυχώς!');
  };

  const deletePlaylist = (id: number) => {
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated);
    localStorage.setItem('user_playlists', JSON.stringify(updated));
    if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
  };

  const addToLikedSongs = async (track: any) => {
    try {
      const trackTitle = track.name || track.title;
      const existing = await db.tracks.where('title').equalsIgnoreCase(trackTitle).first();

      if (existing) {
        await db.tracks.update(existing.id!, { isFavorite: true });
      } else {
        let audioSrc = track.audio || track.audio_url;
        let blob = null;
        try {
          if (audioSrc) {
            const resp = await fetch(audioSrc);
            blob = await resp.blob();
          }
        } catch {
          // Fallback
        }

        await db.tracks.add({
          title: trackTitle,
          artist: track.artist_name || track.artist,
          cover: track.image || track.cover,
          audioBlob: blob,
          lyrics: track.lyrics || "Οι στίχοι δεν βρέθηκαν.",
          isFavorite: true,
        });
      }
      alert('Προστέθηκε στα Liked Songs!');
      setShowPlaylistModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const addTrackToPlaylist = (playlistId: number, track: any) => {
    const updated = playlists.map(p => {
      if (p.id === playlistId) {
        const exists = p.tracks.some((t: any) => (t.id || t.title || t.name) === (track.id || track.title || track.name));
        if (!exists) {
          return { ...p, tracks: [...p.tracks, track] };
        }
      }
      return p;
    });
    setPlaylists(updated);
    localStorage.setItem('user_playlists', JSON.stringify(updated));
    alert('Το τραγούδι προστέθηκε στη λίστα!');
    setShowPlaylistModal(false);
  };

  const createPlaylistFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNewPlaylistName.trim()) return;
    const newPl = { id: Date.now(), name: modalNewPlaylistName.trim(), tracks: trackToAddToPlaylist ? [trackToAddToPlaylist] : [] };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    localStorage.setItem('user_playlists', JSON.stringify(updated));
    setModalNewPlaylistName('');
    setShowPlaylistModal(false);
    alert('Η λίστα δημιουργήθηκε και το τραγούδι προστέθηκε!');
  };

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
      return `[Verse 1]\nNow playing: "${trackTitle}"\nWalking down the neon streets\nListening to the sync of the beats\nOffline mode but my heart is online\nEverything is going to be just fine...\n\n[Chorus]\nBeatsync is playing in my head\nAll the worries are now dead\nFeel the rhythm, feel the glow\nLet the music take control\nYeah, let it flow...`;
    }
    return `[Στίχος 1]\nΤώρα ακούγεται: "${trackTitle}"\nΠερπατώντας στους δρόμους με τα νέον\nΑκούγοντας τον συγχρονισμό των ρυθμών\nOffline λειτουργία αλλά η καρδιά μου είναι online\nΌλα θα πάνε μια χαρά...\n\n[Ρεφρέν]\nΤο Beatsync παίζει μες στο μυαλό μου\nΌλες οι έγνοιες χάθηκαν πια\nΝιώσε τον ρυθμό, νιώσε τη λάμψη\nΆφησε τη μουσική να σε παρασύρει\nΝαι, να σε παρασύρει...`;
  };

  const updateHistory = (track: any) => {
    const history = JSON.parse(localStorage.getItem('track_history') || '[]');
    const filtered = history.filter((t: any) => (t.id || t.name) !== (track.id || track.name));
    const updated = [track, ...filtered].slice(0, 6);
    localStorage.setItem('track_history', JSON.stringify(updated));
    setRecentlyPlayed(updated);
  };

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
    let currentList = popularTracks;
    if (activeTab === 'library') currentList = processedTracks;
    if (activeTab === 'favorites') currentList = favoriteTracks;
    
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
    let currentList = popularTracks;
    if (activeTab === 'library') currentList = processedTracks;
    if (activeTab === 'favorites') currentList = favoriteTracks;

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

  const searchMusic = async (queryTerm: string) => {
    if (!queryTerm.trim()) return;
    setLoading(true);
    setSearchTerm(queryTerm);
    try {
      const client_id = 'b2e656fd';
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${client_id}&format=json&limit=12&search=${encodeURIComponent(queryTerm.trim())}`;
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
        const artist = encodeURIComponent(track.artist_name || track.artist);
        const title = encodeURIComponent(track.name || track.title);
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
        title: track.name || track.title,
        artist: track.artist_name || track.artist,
        cover: track.image || track.cover,
        audioBlob: blob,
        lyrics: lyricsData, 
        isFavorite: false,
      });
      alert('Αποθηκεύτηκε επιτυχώς για Offline αναπαραγωγή!');
    } catch (error) {
      console.error(error);
      alert('Σφάλμα κατά την αποθήκευση του κομματιού.');
    }
  };

  const deleteTrack = async (id: any) => {
    await db.tracks.delete(id);
  };

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
      alert('Η εγγραφή ολοκληρώθηκε επιτυχώς!');
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
        alert('Λάθος username ή password!');
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

  if (!isLoggedIn) {
    return (
      <div className="auth-container">
        {authMode === 'login' ? (
          <div className="auth-card glass">
            <div className="auth-header">
              <img src="/pwa-192x192.png" alt="logo" className="auth-logo" />
              <h2>Beatsync</h2>
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
              <h2>Beatsync</h2>
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

  return (
    <div className="app-layout">

      {/* 1. SIDEBAR LEFT (ΣΤΑΘΕΡΟ ΜΕΝΟΥ) */}
      <aside className="sidebar glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '240px' }}>
        <div>
          <div className="brand-sidebar" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/pwa-192x192.png" alt="logo" />
            <h2>Beatsync</h2>
          </div>

          <nav className="side-nav">
            <button className={activeTab === 'home' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('home'); setSearchResults([]); setSearchTerm(''); setShowLyrics(false); }}>
              🏠 <span>Home</span>
            </button>
            <button className={activeTab === 'library' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('library'); setShowLyrics(false); }}>
              📚 <span>My Library</span>
            </button>
            <button className={activeTab === 'favorites' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('favorites'); setShowLyrics(false); }}>
              ❤️ <span>Liked Songs</span>
            </button>
            <button className={activeTab === 'settings' && !showLyrics ? 'active' : ''} onClick={() => { setActiveTab('settings'); setShowLyrics(false); }}>
              ⚙️ <span>Settings</span>
            </button>
          </nav>

          <div className="sidebar-playlists-section" style={{ padding: '10px 15px', marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Playlists</p>
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {playlists.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>No playlists yet</span>
              ) : (
                playlists.map(pl => (
                  <button 
                    key={pl.id} 
                    onClick={() => { setActiveTab('library'); setLibrarySubTab('playlists'); setSelectedPlaylist(pl); }}
                    style={{ background: 'none', border: 'none', color: '#d1d5db', textAlign: 'left', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    📂 {pl.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          {showInstallBtn && (
            <button className="pwa-install-sidebar-btn" onClick={handleInstallApp}>✨ Install Beatsync</button>
          )}
          <div className="status-container">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>🚪 <span>Logout</span></button>
        </div>
      </aside>

      {/* 2. MAIN VIEW (CENTER) */}
      <main className="main-view">
        <header className="view-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* ΤΟ ΒΕΛΑΚΙ ΕΜΦΑΝΙΖΕΤΑΙ ΜΟΝΟ ΑΝ ΔΕΝ ΕΙΜΑΣΤΕ ΣΤΗΝ ΑΡΧΙΚΗ */}
            {activeTab !== 'home' && (
              <button 
                onClick={() => { setActiveTab('home'); setSearchResults([]); setSearchTerm(''); setShowLyrics(false); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Επιστροφή στην Αρχική"
              >
                ◀
              </button>
            )}
          </div>

          <div className="search-bar" style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
            <input
              type="text"
              placeholder="Search Artists or Genres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  searchMusic(searchTerm);
                }
              }}
            />
            <button onClick={() => searchMusic(searchTerm)}>{loading ? '...' : 'Search'}</button>
          </div>
        </header>

        <div className="scroll-content">
          <div className="content-wrapper">

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
                {activeTab === 'home' && (
                  <section className="results-section">
                    {searchResults.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h2>Search Results for "{searchTerm}"</h2>
                          <button className="clear-search-btn" onClick={() => { setSearchResults([]); setSearchTerm(''); }}>Clear Results</button>
                        </div>
                        <div className="grid-container">
                          {searchResults.map(track => {
                            const isFav = isTrackFavorite(track);
                            return (
                              <div key={track.id} className="glass-card result-card">
                                <img src={track.image} alt="cover" />
                                <div className="card-details">
                                  <h4>{track.name}</h4>
                                  <p>{track.artist_name}</p>
                                  <div className="genre-tag">{track.musicinfo?.genre || 'Music'}</div>
                                </div>
                                <div className="card-actions">
                                  <button onClick={() => playTrack(track)}>▶</button>
                                  <button onClick={() => { setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }} title="Προσθήκη / Αγαπημένο">
                                    {isFav ? '❤️' : '🤍'}
                                  </button>
                                  <button onClick={() => saveOffline(track)}>↓</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="dashboard-home">
                        <h1 className="greeting-title">{getGreeting()}</h1>
                        
                        <div className="dashboard-block">
                          <h2>Quick Access</h2>
                          <div className="mixes-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                            <div className="mix-card" onClick={() => setActiveTab('favorites')} style={{ cursor: 'pointer', background: 'rgba(239, 68, 68, 0.15)', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '24px' }}>❤️</div>
                              <div>
                                <h4 style={{ margin: 0 }}>Liked Songs</h4>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{favoriteTracks.length} tracks</p>
                              </div>
                            </div>
                            <div className="mix-card" onClick={() => setActiveTab('library')} style={{ cursor: 'pointer', background: 'rgba(59, 130, 246, 0.15)', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '24px' }}>📥</div>
                              <div>
                                <h4 style={{ margin: 0 }}>Downloaded</h4>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{offlineTracks?.length || 0} tracks</p>
                              </div>
                            </div>
                            <div className="mix-card" onClick={() => { setActiveTab('library'); setLibrarySubTab('playlists'); }} style={{ cursor: 'pointer', background: 'rgba(168, 85, 247, 0.15)', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '24px' }}>📂</div>
                              <div>
                                <h4 style={{ margin: 0 }}>My Playlists</h4>
                                <p style={{ fontSize: '12px', color: '#9ca3af' }}>{playlists.length} lists</p>
                              </div>
                            </div>
                          </div>
                        </div>

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

                        {recentlyPlayed.length > 0 && (
                          <div className="dashboard-block">
                            <h2>Recently Played</h2>
                            <div className="grid-container">
                              {recentlyPlayed.map((track, idx) => {
                                const isFav = isTrackFavorite(track);
                                return (
                                  <div key={`hist-${idx}`} className="glass-card result-card">
                                    <img src={track.cover || track.image} alt="cover" />
                                    <div className="card-details">
                                      <h4>{track.title || track.name}</h4>
                                      <p>{track.artist || track.artist_name}</p>
                                    </div>
                                    <div className="card-actions">
                                      <button onClick={() => playTrack(track)}>▶</button>
                                      <button onClick={() => { setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }} title="Προσθήκη / Αγαπημένο">
                                        {isFav ? '❤️' : '🤍'}
                                      </button>
                                      {!track.audioBlob && (
                                        <button onClick={() => saveOffline(track)}>↓</button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="dashboard-block">
                          <h2>Popular Hits</h2>
                          <div className="grid-container">
                            {popularTracks.map(track => {
                              const isFav = isTrackFavorite(track);
                              return (
                                <div key={`pop-${track.id}`} className="glass-card result-card">
                                  <img src={track.image} alt="cover" />
                                  <div className="card-details">
                                    <h4>{track.name}</h4>
                                    <p>{track.artist_name}</p>
                                  </div>
                                  <div className="card-actions">
                                    <button onClick={() => playTrack(track)}>▶</button>
                                    <button onClick={() => { setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }} title="Προσθήκη / Αγαπημένο">
                                      {isFav ? '❤️' : '🤍'}
                                    </button>
                                    <button onClick={() => saveOffline(track)}>↓</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="dashboard-block">
                          <h2>Fresh Drops</h2>
                          <div className="grid-container">
                            {newReleases.map(track => {
                              const isFav = isTrackFavorite(track);
                              return (
                                <div key={`new-${track.id}`} className="glass-card result-card">
                                  <img src={track.image} alt="cover" />
                                  <div className="card-details">
                                    <h4>{track.name}</h4>
                                    <p>{track.artist_name}</p>
                                  </div>
                                  <div className="card-actions">
                                    <button onClick={() => playTrack(track)}>▶</button>
                                    <button onClick={() => { setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }} title="Προσθήκη / Αγαπημένο">
                                      {isFav ? '❤️' : '🤍'}
                                    </button>
                                    <button onClick={() => saveOffline(track)}>↓</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'library' && (
                  <section className="library-section">
                    <div className="library-controls-bar">
                      <h2>My Library</h2>
                      <div className="library-subtabs" style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
                        <button 
                          className={`filter-btn ${librarySubTab === 'all' ? 'active' : ''}`} 
                          onClick={() => { setLibrarySubTab('all'); setSelectedPlaylist(null); }}
                        >
                          📥 Downloaded ({offlineTracks?.length || 0})
                        </button>
                        <button 
                          className={`filter-btn ${librarySubTab === 'playlists' ? 'active' : ''}`} 
                          onClick={() => setLibrarySubTab('playlists')}
                        >
                          📂 Playlists ({playlists.length})
                        </button>
                      </div>
                    </div>

                    {librarySubTab === 'playlists' ? (
                      <div className="playlists-view">
                        {/* ΔΙΟΡΘΩΜΕΝΗ ΦΟΡΜΑ ΔΗΜΙΟΥΡΓΙΑΣ PLAYLIST */}
                        <form onSubmit={createPlaylist} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <input 
                            type="text" 
                            placeholder="New playlist name..." 
                            value={newPlaylistName} 
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="library-search-input"
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', width: '250px' }}
                          />
                          <button type="submit" className="settings-save-btn" style={{ padding: '10px 20px', background: 'var(--accent, #aa3bff)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create Playlist</button>
                        </form>

                        {selectedPlaylist ? (
                          <div className="selected-playlist-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                              <h3>📂 Playlist: {selectedPlaylist.name}</h3>
                              <button className="clear-search-btn" onClick={() => setSelectedPlaylist(null)}>← Back to Playlists</button>
                            </div>
                            <div className="list-container">
                              {selectedPlaylist.tracks.length === 0 && <p className="empty-state-text">No tracks in this playlist yet.</p>}
                              {selectedPlaylist.tracks.map((track: any, idx: number) => (
                                <div key={`pl-track-${idx}`} className="glass-row" onClick={() => playTrack(track)}>
                                  <img src={track.cover || track.image} alt="cover" className="row-cover" />
                                  <div className="row-info">
                                    <strong>{track.title || track.name}</strong>
                                    <span>{track.artist || track.artist_name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="grid-container">
                            {playlists.map(pl => (
                              <div key={pl.id} className="glass-card result-card" onClick={() => setSelectedPlaylist(pl)} style={{ cursor: 'pointer' }}>
                                <div style={{ fontSize: '32px', marginBottom: '10px' }}>💿</div>
                                <div className="card-details">
                                  <h4>{pl.name}</h4>
                                  <p>{pl.tracks.length} tracks</p>
                                </div>
                                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                                  <button onClick={() => deletePlaylist(pl.id)} title="Delete playlist">🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="list-container">
                        {processedTracks.length === 0 && <p className="empty-state-text">No downloaded tracks found.</p>}
                        {processedTracks.map(track => (
                          <div key={track.id} className={`glass-row ${currentTrack?.id === track.id ? 'active-row' : ''}`} onClick={() => playTrack(track)}>
                            <img src={track.cover} alt="cover" className="row-cover" />
                            <div className="row-info">
                              <strong>{track.title}</strong>
                              <span>{track.artist}</span>
                            </div>
                            <div className="row-status">
                              <button className="fav-btn" onClick={(e) => { e.stopPropagation(); setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }}>
                                {track.isFavorite ? '❤️' : '🤍'}
                              </button>

                              {currentTrack?.id === track.id ? <span className="playing-icon">•••</span> : <span className="offline-icon">✓</span>}
                              <button className="delete-btn-small" onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}>🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {activeTab === 'favorites' && (
                  <section className="library-section">
                    <h2>❤️ Liked Songs</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '20px' }}>Your favorite music collection</p>
                    <div className="list-container">
                      {favoriteTracks.length === 0 && <p className="empty-state-text">No favorite tracks yet. Click the heart icon on any song!</p>}
                      {favoriteTracks.map(track => (
                        <div key={track.id} className={`glass-row ${currentTrack?.id === track.id ? 'active-row' : ''}`} onClick={() => playTrack(track)}>
                          <img src={track.cover} alt="cover" className="row-cover" />
                          <div className="row-info">
                            <strong>{track.title}</strong>
                            <span>{track.artist}</span>
                          </div>
                          <div className="row-status">
                            <button className="fav-btn" onClick={(e) => { e.stopPropagation(); setTrackToAddToPlaylist(track); setShowPlaylistModal(true); }}>
                              ❤️
                            </button>
                            {currentTrack?.id === track.id ? <span className="playing-icon">•••</span> : <span className="offline-icon">✓</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {activeTab === 'settings' && (
                  <section className="settings-section">
                    <h2>Settings & Preferences</h2>
                    
                    <div className="settings-block glass">
                      <h3>👤 Profile Details</h3>
                      <form onSubmit={handleUpdateProfile} className="settings-form">
                        <div className="form-group-row">
                          <div className="input-field-block">
                            <label>Display Name</label>
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
                            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Current password" />
                          </div>
                          <div className="input-field-block">
                            <label>New Password</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" />
                          </div>
                          <button type="submit" className="settings-save-btn password-btn">Update Password</button>
                        </div>
                      </form>
                    </div>

                    <div className="settings-block glass">
                      <h3>🔊 Audio & Playback Settings</h3>
                      
                      <div className="setting-row">
                        <div className="setting-desc">
                          <h4>Streaming Quality</h4>
                          <p>Choose audio bitrate for online streaming.</p>
                        </div>
                        <div className="setting-actions-toggle">
                          <button className={`toggle-option-btn ${audioQuality === 'low' ? 'active' : ''}`} onClick={() => setAudioQuality('low')}>Low</button>
                          <button className={`toggle-option-btn ${audioQuality === 'normal' ? 'active' : ''}`} onClick={() => setAudioQuality('normal')}>Normal</button>
                          <button className={`toggle-option-btn ${audioQuality === 'high' ? 'active' : ''}`} onClick={() => setAudioQuality('high')}>High (HD)</button>
                        </div>
                      </div>

                      <div className="setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                        <div className="setting-desc">
                          <h4>Download Quality</h4>
                          <p>Quality of offline stored files.</p>
                        </div>
                        <div className="setting-actions-toggle">
                          <button className={`toggle-option-btn ${downloadQuality === 'normal' ? 'active' : ''}`} onClick={() => setDownloadQuality('normal')}>Normal</button>
                          <button className={`toggle-option-btn ${downloadQuality === 'high' ? 'active' : ''}`} onClick={() => setDownloadQuality('high')}>High</button>
                        </div>
                      </div>

                      <div className="setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                        <div className="setting-desc">
                          <h4>Volume Normalization</h4>
                          <p>Set the same volume level for all tracks.</p>
                        </div>
                        <button 
                          onClick={() => setVolumeNormalization(!volumeNormalization)}
                          style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', background: volumeNormalization ? '#10b981' : '#374151', color: '#fff', cursor: 'pointer' }}
                        >
                          {volumeNormalization ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                        <div className="setting-desc">
                          <h4>Autoplay</h4>
                          <p>Enjoy endless music. Similar tracks play automatically when your music ends.</p>
                        </div>
                        <button 
                          onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                          style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', background: autoplayEnabled ? '#10b981' : '#374151', color: '#fff', cursor: 'pointer' }}
                        >
                          {autoplayEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <div className="setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '15px' }}>
                        <div className="setting-desc">
                          <h4>Explicit Content Filter</h4>
                          <p>Allow or block explicit content in search and mixes.</p>
                        </div>
                        <button 
                          onClick={() => setExplicitFilter(!explicitFilter)}
                          style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', background: explicitFilter ? '#ef4444' : '#374151', color: '#fff', cursor: 'pointer' }}
                        >
                          {explicitFilter ? 'Restricted' : 'Allowed'}
                        </button>
                      </div>
                    </div>

                    <div className="settings-block glass">
                      <h3>🎛️ Equalizer Presets</h3>
                      <div className="setting-row">
                        <div className="setting-desc">
                          <h4>Acoustic Model</h4>
                          <p>Adjust acoustic frequency response.</p>
                        </div>
                        <div className="setting-actions-toggle" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button className={`toggle-option-btn ${equalizer === 'balanced' ? 'active' : ''}`} onClick={() => setEqualizer('balanced')}>Balanced</button>
                          <button className={`toggle-option-btn ${equalizer === 'bass' ? 'active' : ''}`} onClick={() => setEqualizer('bass')}>Bass</button>
                          <button className={`toggle-option-btn ${equalizer === 'vocal' ? 'active' : ''}`} onClick={() => setEqualizer('vocal')}>Vocal</button>
                          <button className={`toggle-option-btn ${equalizer === 'electronic' ? 'active' : ''}`} onClick={() => setEqualizer('electronic')}>Electronic</button>
                          <button className={`toggle-option-btn ${equalizer === 'acoustic' ? 'active' : ''}`} onClick={() => setEqualizer('acoustic')}>Acoustic</button>
                        </div>
                      </div>
                    </div>

                    <div className="settings-block glass">
                      <h3>💾 Storage & Cache</h3>
                      <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4>IndexedDB Cache Storage</h4>
                          <p style={{ fontSize: '12px', color: '#9ca3af' }}>Manage offline downloaded tracks and cache size.</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm('Θέλετε να διαγραφούν όλα τα προσωρινά δεδομένα cache;')) {
                              localStorage.removeItem('track_history');
                              alert('Το cache εκκαθαρίστηκε επιτυχώς!');
                              window.location.reload();
                            }
                          }}
                          style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          Clear Cache
                        </button>
                      </div>
                    </div>

                  </section>
                )}
              </>
            )}

          </div>
        </div>
      </main>

      {/* --- SPOTIFY STYLE POPUP MODAL (ΑΝΟΙΓΕΙ ΜΕ ΤΗΝ ΚΑΡΔΙΑ) --- */}
      {showPlaylistModal && trackToAddToPlaylist && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass" style={{ background: '#181920', padding: '24px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#f3f4f6' }}>Save to playlist...</h3>
              <button onClick={() => setShowPlaylistModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Song: <strong>{trackToAddToPlaylist.title || trackToAddToPlaylist.name}</strong>
            </p>

            <input 
              type="text" 
              placeholder="🔍 Search playlists..." 
              value={modalSearchTerm} 
              onChange={(e) => setModalSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', marginBottom: '16px', boxSizing: 'border-box' }}
            />

            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* ΜΟΝΙΜΗ MOCK-UP ΕΠΙΛΟΓΗ ΓΙΑ LIKED SONGS */}
              <div 
                onClick={() => addToLikedSongs(trackToAddToPlaylist)}
                style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ fontWeight: 500, color: '#fff' }}>❤️ Liked Songs</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{favoriteTracks.length} tracks</span>
              </div>

              {/* ΥΠΑΡΧΟΥΣΕΣ PLAYLISTS */}
              {playlists
                .filter(p => p.name.toLowerCase().includes(modalSearchTerm.toLowerCase()))
                .map(pl => (
                  <div 
                    key={pl.id} 
                    onClick={() => addTrackToPlaylist(pl.id, trackToAddToPlaylist)}
                    style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                  >
                    <span style={{ fontWeight: 500, color: '#fff' }}>📂 {pl.name}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{pl.tracks.length} tracks</span>
                  </div>
                ))
              }
            </div>

            <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />

            <form onSubmit={createPlaylistFromModal} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="New playlist name..." 
                value={modalNewPlaylistName} 
                onChange={(e) => setModalNewPlaylistName(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
              />
              <button type="submit" style={{ padding: '10px 16px', background: 'var(--accent, #aa3bff)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create</button>
            </form>
          </div>
        </div>
      )}

      {/* 3. RIGHT SIDEBAR */}
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
              <button className="fav-btn-player" onClick={() => { setTrackToAddToPlaylist(currentTrack); setShowPlaylistModal(true); }} title="Αγαπημένο / Προσθήκη">
                {isTrackFavorite(currentTrack) ? '❤️' : '🤍'}
              </button>
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

export default App;