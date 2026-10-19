import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { initials, colorFor } from './ui.js';
import Login from './pages/Login.jsx';
import MyLeave from './pages/MyLeave.jsx';
import Approvals from './pages/Approvals.jsx';
import Calendar from './pages/Calendar.jsx';
import Users from './pages/Users.jsx';

const THEME_KEY = 'leave_theme';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

function Toasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const id = Math.random();
      setItems((cur) => [...cur, { id, ...e.detail }]);
      setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-dot" /> {t.message}
        </div>
      ))}
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="icon-btn" onClick={onToggle} aria-label="Toggle light/dark theme"
      title={theme === 'dark' ? 'switch to light' : 'switch to dark'}>
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  const [tab, setTab] = useState('mine');

  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    setTab('mine');
  };

  if (!ready) return <p className="center loading">loading…</p>;
  if (!user) {
    return (
      <>
        <Login onLogin={setUser} />
        <div className="floating-theme"><ThemeToggle theme={theme} onToggle={toggleTheme} /></div>
        <Toasts />
      </>
    );
  }

  const isReviewer = user.role === 'manager' || user.role === 'admin';
  const tabs = [
    ['mine', 'my leave'],
    ...(isReviewer ? [['approvals', 'approvals']] : []),
    ['calendar', 'calendar'],
    ...(user.role === 'admin' ? [['users', 'people']] : []),
  ];

  return (
    <div className="app">
      <header>
        <h1 className="wordmark">leavehub<span className="dot">.</span></h1>
        <nav>
          {tabs.map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="who">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <span className="avatar" style={{ '--c': colorFor(user.name) }}>{initials(user.name)}</span>
          <span className="who-name">{user.name}<small>{user.role}</small></span>
          <button className="ghost" onClick={logout}>log out</button>
        </div>
      </header>
      <main key={tab} className="page">
        {tab === 'mine' && <MyLeave user={user} />}
        {tab === 'approvals' && <Approvals />}
        {tab === 'calendar' && <Calendar />}
        {tab === 'users' && <Users />}
      </main>
      <Toasts />
    </div>
  );
}
