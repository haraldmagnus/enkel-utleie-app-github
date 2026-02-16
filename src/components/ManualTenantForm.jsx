import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';

export default function ManualTenantForm({ open, onOpenChange, property, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    manual_tenant_name: property?.manual_tenant_name || '',
    manual_tenant_phone: property?.manual_tenant_phone || '',
    manual_tenant_email: property?.manual_tenant_email || '',
    manual_lease_start: property?.manual_lease_start || '',
    manual_lease_end: property?.manual_lease_end || '',
    monthly_rent: property?.monthly_rent || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      status: 'occupied',
      monthly_rent: parseFloat(formData.monthly_rent) || property?.monthly_rent
    });
  };

  const handleClearTenant = () => {
    onSave({
      manual_tenant_name: null,
      manual_tenant_phone: null,
      manual_tenant_email: null,
      manual_lease_start: null,
      manual_lease_end: null,
      status: 'vacant'
    });
  };

  const hasTenant = property?.status === 'occupied' && property?.manual_tenant_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {hasTenant ? 'Rediger leietaker' : 'Sett som utleid'}
          </DialogTitle>
          <DialogDescription>
            {hasTenant 
              ? 'Oppdater informasjon om leietakeren eller marker som ledig'
              : 'Legg til leietakerinformasjon manuelt uten at leietaker bruker appen'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Leietakers navn *</Label>
            <Input
              value={formData.manual_tenant_name}
              onChange={(e) => setFormData({ ...formData, manual_tenant_name: e.target.value })}
              placeholder="Ola Nordmann"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Telefon</Label>
              <Input
                value={formData.manual_tenant_phone}
                onChange={(e) => setFormData({ ...formData, manual_tenant_phone: e.target.value })}
                placeholder="12345678"
              />
            </div>
            <div>
              <Label>E-post</Label>
              <Input
                type="email"
                value={formData.manual_tenant_email}
                onChange={(e) => setFormData({ ...formData, manual_tenant_email: e.target.value })}
                placeholder="epost@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Startdato *</Label>
              <Input
                type="date"
                value={formData.manual_lease_start}
                onChange={(e) => setFormData({ ...formData, manual_lease_start: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Sluttdato</Label>
              <Input
                type="date"
                value={formData.manual_lease_end}
                onChange={(e) => setFormData({ ...formData, manual_lease_end: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Månedlig leie (kr)</Label>
            <Input
              type="number"
              value={formData.monthly_rent}
              onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              placeholder={property?.monthly_rent?.toString() || '10000'}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasTenant && (
              <Button 
                type="button" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleClearTenant}
              >
                Marker som ledig
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !formData.manual_tenant_name || !formData.manual_lease_start}
              >
                {isLoading ? 'Lagrer...' : 'Lagre'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}