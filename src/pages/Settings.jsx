import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, LogOut, ChevronRight, ArrowLeftRight, Camera, HelpCircle, FileText, Bell, Star } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import TenantRatingsSection from '@/components/TenantRatingsSection';

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [uploading, setUploading] = useState(false);

  const role = user?.active_role || user?.user_role;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['currentUser'] }); setEditing(false); }
  });

  const handleEdit = () => {
    setForm({
      first_name: user?.first_name || user?.full_name?.split(' ')[0] || '',
      last_name: user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || '',
      phone: user?.phone || ''
    });
    setEditing(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setUploading(false);
  };

  const switchRole = async () => {
    const newRole = role === 'landlord' ? 'tenant' : 'landlord';
    await base44.auth.updateMe({ active_role: newRole, user_role: newRole });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    navigate(createPageUrl(newRole === 'landlord' ? 'Dashboard' : 'TenantDashboard'), { replace: true });
  };

  const toggleRatingOptIn = async () => {
    await base44.auth.updateMe({ rating_opt_in: !user?.rating_opt_in });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  const menuItems = [
    { icon: Bell, label: 'Varsler', to: 'Notifications' },
    { icon: HelpCircle, label: 'Hjelp & Support', to: 'Help' },
    { icon: FileText, label: 'Aktivitetslogg', to: 'ErrorLogs' },
  ];

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center overflow-hidden">
              {user?.profile_photo_url ? (
                <img src={user.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">{user?.full_name?.charAt(0) || '?'}</span>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="w-3 h-3 text-white" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" placeholder="Fornavn" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                  <input className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" placeholder="Etternavn" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <input className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" placeholder="Telefon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Lagre</button>
                  <button onClick={() => setEditing(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-1.5 text-sm font-medium">Avbryt</button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-bold text-gray-900">{user?.full_name}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                {user?.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${role === 'landlord' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {role === 'landlord' ? 'Utleier' : 'Leietaker'}
                </span>
              </>
            )}
          </div>
          {!editing && (
            <button onClick={handleEdit} className="text-blue-600 text-sm font-medium">Rediger</button>
          )}
        </div>
      </div>

      {/* Switch role */}
      <button onClick={switchRole} className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <ArrowLeftRight className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900">Bytt rolle</p>
          <p className="text-xs text-gray-400">Nå aktiv: {role === 'landlord' ? 'Utleier' : 'Leietaker'}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </button>

      {/* Menu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map(({ icon: Icon, label, to }, i) => (
          <Link key={to} to={createPageUrl(to)} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <span className="flex-1 font-medium text-gray-800">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={() => base44.auth.logout()}
        className="w-full bg-white rounded-2xl shadow-sm border border-red-100 p-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
      >
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
          <LogOut className="w-5 h-5 text-red-600" />
        </div>
        <span className="font-medium text-red-600">Logg ut</span>
      </button>
    </div>
  );
}