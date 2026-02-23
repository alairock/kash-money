import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';

export const AdminProfile = () => {
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(currentUser?.displayName || '');
  }, [currentUser?.displayName]);

  const handleSave = async () => {
    if (!currentUser) {
      setError('You must be signed in to update your profile.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateProfile(currentUser, { displayName: name.trim() });
      setMessage('✅ Name updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="glass-dark rounded-xl p-8">
        <h2 className="mb-6 text-2xl font-bold">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Email</label>
            <input
              type="text"
              value={currentUser?.email || ''}
              disabled
              className="w-full cursor-not-allowed rounded-lg bg-white/5 px-4 py-2 text-white/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/80">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg glass-effect px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary rounded-lg px-6 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Name'}
          </button>

          {message && <p className="text-sm font-semibold text-green-300">{message}</p>}
          {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
};
