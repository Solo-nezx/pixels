import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockGames } from '../data/mockData';
import { X, Save, Trash2, Plus, Star } from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { 
    t, 
    auth, 
    login, 
    userGames, 
    allGames,
    logGame, 
    removeUserGame, 
    showToast,
    language 
  } = useApp();

  const currentUser = auth.user!;

  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [banner, setBanner] = useState(currentUser.banner);

  // New game log form state
  const [selectedGameId, setSelectedGameId] = useState(allGames[0]?.id || mockGames[0].id);
  const [newRating, setNewRating] = useState(5);
  const [newHours, setNewHours] = useState(10);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      ...currentUser,
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatar: avatar.trim(),
      banner: banner.trim(),
    });
    showToast(language === 'ar' ? 'تم تحديث الملف الشخصي!' : 'Profile updated!');
    onClose();
  };

  const handleAddGame = () => {
    logGame(selectedGameId, newRating, newHours, 'completed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t('editProfile')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          
          {/* Display Name */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('displayName')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Username Handle */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('usernameHandle')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
              {t('bioText')}
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          {/* Avatar & Banner URLs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
                {t('avatarUrl')}
              </label>
              <input
                type="url"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
            <div>
              <label className="font-semibold text-[var(--color-text-primary)] mb-1 block">
                {t('bannerUrl')}
              </label>
              <input
                type="url"
                value={banner}
                onChange={e => setBanner(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>

          {/* Manage Showcase Games List */}
          <div className="pt-3 border-t border-[var(--color-border)]">
            <label className="font-bold text-sm text-[var(--color-text-primary)] mb-2 block">
              Manage Logged Games Showcase
            </label>

            {/* Quick Add Game to Showcase */}
            <div className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] mb-3 space-y-2">
              <span className="font-semibold text-[var(--color-text-primary)] block">Add Game to Showcase</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedGameId}
                  onChange={e => setSelectedGameId(e.target.value)}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-1.5 text-xs text-[var(--color-text-primary)]"
                >
                  {allGames.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--color-text-secondary)]">Rating:</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newRating}
                    onChange={e => setNewRating(Number(e.target.value))}
                    className="w-12 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-1 text-center text-xs text-[var(--color-text-primary)]"
                  />
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[var(--color-text-secondary)]">Hours:</span>
                  <input
                    type="number"
                    min="1"
                    value={newHours}
                    onChange={e => setNewHours(Number(e.target.value))}
                    className="w-16 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-1 text-center text-xs text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddGame}
                className="w-full py-1.5 bg-[#7C3AED]/10 text-[#7C3AED] font-bold rounded-lg border border-[#7C3AED]/30 hover:bg-[#7C3AED]/20 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Update Game</span>
              </button>
            </div>

            {/* List of currently logged games */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {userGames.map(log => {
                const g = allGames.find(game => game.id === log.gameId) || mockGames.find(game => game.id === log.gameId);
                if (!g) return null;
                return (
                  <div key={log.gameId} className="p-2 rounded-xl bg-[var(--color-bg)] flex items-center justify-between text-xs border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <img
                        src={g.coverUrl}
                        alt={g.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80';
                        }}
                        className="w-8 h-10 object-cover rounded"
                      />
                      <div>
                        <p className="font-bold text-[var(--color-text-primary)] truncate max-w-[150px]">{g.title}</p>
                        <p className="text-[10px] text-[var(--color-text-secondary)]">★ {log.rating} • {log.hoursPlayed}h</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUserGame(log.gameId)}
                      className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#7C3AED] text-white font-bold rounded-xl hover:bg-[#6D28D9] shadow-lg shadow-[#7C3AED]/30 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveChanges')}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
