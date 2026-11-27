import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Alert, LoadingSpinner } from '../../components/ui';

export function MyProfilePage() {
  const { memberProfile, appUser, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (memberProfile) {
      setName(memberProfile.name);
      setPhone(memberProfile.phone || '');
    }
  }, [memberProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const { error: rpcError } = await supabase.rpc('update_my_profile', {
        p_name: name.trim(),
        p_phone: phone.trim() || null,
      });
      if (rpcError) throw rpcError;
      await refreshProfile();
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!memberProfile) return <LoadingSpinner label="Loading profile..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your library membership details and update contact info</p>
        </div>
      </div>

      <Alert type="error" message={error} />
      <Alert type="success" message={success} />

      <div className="card" style={{ maxWidth: '580px' }}>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profile-id" className="form-label">
                Member ID
              </label>
              <input
                id="profile-id"
                type="text"
                className="form-control"
                value={`#${memberProfile.member_id}`}
                disabled
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-type" className="form-label">
                Membership Type
              </label>
              <input
                id="profile-type"
                type="text"
                className="form-control"
                value={memberProfile.membership_type}
                disabled
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="profile-email" className="form-label">
              Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              className="form-control"
              value={appUser?.email || memberProfile.email}
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-name" className="form-label">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-phone" className="form-label">
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
