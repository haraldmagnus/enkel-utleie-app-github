import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Building2, MapPin, Users, FileText, Camera, 
  Mail, Trash2, Edit2, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

export default function PropertyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }),
    select: (data) => data[0],
    enabled: !!propertyId
  });

  const { data: agreement } = useQuery({
    queryKey: ['agreement', propertyId],
    queryFn: () => base44.entities.RentalAgreement.filter({ rental_unit_id: propertyId }),
    select: (data) => data[0],
    enabled: !!propertyId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.update(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.RentalUnit.delete(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      navigate(createPageUrl('Properties'));
    }
  });

  const handleInviteTenant = async () => {
    if (!inviteEmail) return;
    
    await base44.users.inviteUser(inviteEmail, 'user');
    updateMutation.mutate({
      tenant_email: inviteEmail,
      status: 'pending_invitation'
    });
    setShowInviteDialog(false);
    setInviteEmail('');
  };

  const handlePhotoUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingType(type);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    const existingPhotos = type === 'move_in' 
      ? (property.move_in_photos || []) 
      : (property.move_out_photos || []);

    updateMutation.mutate({
      [type === 'move_in' ? 'move_in_photos' : 'move_out_photos']: [...existingPhotos, ...uploadedUrls]
    });
    setUploadingType(null);
  };

  const statusColors = {
    vacant: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700'
  };

  if (isLoading || !property) {
    return <div className="p-4">Laster...</div>;
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{property.name}</h1>
            <div className="flex items-center gap-1 text-blue-100 text-sm">
              <MapPin className="w-3 h-3" />
              {property.address}
            </div>
          </div>
          <Badge className={`${statusColors[property.status]} border-0`}>
            {t(property.status)}
          </Badge>
        </div>
        
        {property.monthly_rent && (
          <div className="bg-white/10 rounded-xl p-3 flex items-center justify-between">
            <span className="text-blue-100">Månedlig leie</span>
            <span className="text-xl font-bold">{property.monthly_rent.toLocaleString()} kr</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview">Oversikt</TabsTrigger>
            <TabsTrigger value="photos">Bilder</TabsTrigger>
            <TabsTrigger value="agreement">Avtale</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Tenant Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Leietaker
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property.status === 'vacant' ? (
                  <div className="text-center py-4">
                    <p className="text-slate-500 text-sm mb-3">Ingen leietaker tilknyttet</p>
                    <Button 
                      onClick={() => setShowInviteDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Mail className="w-4 h-4 mr-2" /> {t('inviteTenant')}
                    </Button>
                  </div>
                ) : property.status === 'pending_invitation' ? (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Invitasjon sendt til: <strong>{property.tenant_email}</strong>
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">Venter på at leietaker aksepterer</p>
                  </div>
                ) : (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Leietaker: <strong>{property.tenant_email}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {property.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('description')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">{property.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate(createPageUrl(`EditProperty?id=${propertyId}`))}
              >
                <Edit2 className="w-4 h-4 mr-2" /> {t('edit')}
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            {/* Move-in Photos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4" /> {t('moveInPhotos')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(property.move_in_photos || []).map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt={`Innflytting ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 'move_in')}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    asChild
                    disabled={uploadingType === 'move_in'}
                  >
                    <span>
                      {uploadingType === 'move_in' ? 'Laster opp...' : t('uploadPhotos')}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>

            {/* Move-out Photos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4" /> {t('moveOutPhotos')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(property.move_out_photos || []).map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt={`Utflytting ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
                <label className="block">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e, 'move_out')}
                  />
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    asChild
                    disabled={uploadingType === 'move_out'}
                  >
                    <span>
                      {uploadingType === 'move_out' ? 'Laster opp...' : t('uploadPhotos')}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agreement" className="space-y-4">
            {agreement ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {t('rentalAgreement')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">{t('startDate')}</span>
                    <span className="font-medium">{agreement.start_date}</span>
                  </div>
                  {agreement.end_date && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500">{t('endDate')}</span>
                      <span className="font-medium">{agreement.end_date}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">{t('monthlyRent')}</span>
                    <span className="font-medium">{agreement.monthly_rent?.toLocaleString()} kr</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Utleier signert</span>
                    <span className={agreement.landlord_signed ? 'text-green-600' : 'text-amber-600'}>
                      {agreement.landlord_signed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Leietaker signert</span>
                    <span className={agreement.tenant_signed ? 'text-green-600' : 'text-amber-600'}>
                      {agreement.tenant_signed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm mb-3">Ingen leieavtale opprettet</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate(createPageUrl(`CreateAgreement?propertyId=${propertyId}`))}
                  >
                    {t('createAgreement')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inviteTenant')}</DialogTitle>
            <DialogDescription>
              Skriv inn e-postadressen til leietakeren du vil invitere
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="email"
              placeholder="leietaker@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleInviteTenant}
              disabled={!inviteEmail}
            >
              {t('sendInvitation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett eiendom?</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette denne eiendommen? Dette kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}