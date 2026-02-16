import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Building2, MapPin, Users, FileText, Camera, 
  Mail, Trash2, Edit2, Check, X, UserPlus, Wallet
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
import PropertyFinances from '@/components/PropertyFinances';
import ManualTenantForm from '@/components/ManualTenantForm';
import AgreementUpload from '@/components/AgreementUpload';
import DocumentationChecklist from '@/components/DocumentationChecklist';

export default function PropertyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showManualTenantDialog, setShowManualTenantDialog] = useState(false);
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
    
    const cleanEmail = inviteEmail.toLowerCase().trim();
    const isSelfInvite = cleanEmail === user?.email?.toLowerCase();
    
    console.log('🔵 [INVITE DEBUG] ===== STARTING INVITATION =====');
    console.log('🔵 [INVITE DEBUG] Input:', { 
      tenantEmail: cleanEmail,
      propertyId,
      propertyName: property.name,
      landlordId: user.id,
      landlordEmail: user?.email,
      landlordName: user?.full_name,
      isSelfInvite,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Generate unique token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      console.log('🔵 [INVITE DEBUG] Token generated:', { token, expiresAt: expiresAt.toISOString() });
      
      // Create invitation record
      const invitation = await base44.entities.TenantInvitation.create({
        rental_unit_id: propertyId,
        landlord_id: user.id,
        tenant_email: cleanEmail,
        token: token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      });
      
      console.log('✅ [INVITE DEBUG] Invitation record created:', {
        invitationId: invitation.id,
        status: invitation.status
      });
      
      // Generate invitation link
      const inviteUrl = `${window.location.origin}${createPageUrl('Invite')}?token=${token}`;
      console.log('🔵 [INVITE DEBUG] Invite URL:', inviteUrl);
      
      // Check if user exists in system
      let userExists = false;
      let existingUserId = null;
      try {
        const existingUsers = await base44.entities.User.filter({ email: cleanEmail });
        userExists = existingUsers.length > 0;
        existingUserId = existingUsers[0]?.id;
        console.log(`🔵 [INVITE DEBUG] Recipient check:`, {
          email: cleanEmail,
          recipientExists: userExists,
          recipientUserId: existingUserId,
          recipientCount: existingUsers.length
        });
      } catch (e) {
        console.error('❌ [INVITE DEBUG] User existence check failed:', e);
      }
      
      // EMAIL STRATEGY: Core.SendEmail only works for existing users
      console.log('🔵 [INVITE DEBUG] ===== SENDING EMAIL =====');
      console.log('🔵 [INVITE DEBUG] Email strategy:', {
        recipientExists: userExists,
        strategy: userExists ? 'Core.SendEmail (custom property invite)' : 'inviteUser (platform invite only)'
      });
      
      if (userExists) {
        // EXISTING USERS: Send custom property invitation email
        const emailSubject = isSelfInvite 
          ? `Bekreft tilknytning til ${property.name}` 
          : `Invitasjon til ${property.name}`;
        
        const emailBody = `Hei!

${isSelfInvite ? 'Du har knyttet deg som leietaker til følgende bolig:' : 'Du er invitert til å bli leietaker i følgende bolig:'}

📍 ${property.name}
${property.address}
${property.monthly_rent ? `💰 Månedlig leie: ${property.monthly_rent.toLocaleString()} kr` : ''}

Klikk på lenken under for å ${isSelfInvite ? 'bekrefte' : 'akseptere invitasjonen'}:
${inviteUrl}

${user.full_name ? `Utleier: ${user.full_name}` : ''}

⏰ Invitasjonen er gyldig i 7 dager.

---
Utleieoversikt - Din komplette utleieløsning`;

        console.log('🔵 [INVITE DEBUG] Sending custom property email:', {
          emailType: 'CUSTOM_PROPERTY_INVITATION',
          to: cleanEmail,
          subject: emailSubject,
          from_name: user.full_name || 'Utleieoversikt'
        });

        try {
          await base44.integrations.Core.SendEmail({
            to: cleanEmail,
            from_name: user.full_name || 'Utleieoversikt',
            subject: emailSubject,
            body: emailBody.trim()
          });
          console.log('✅ [INVITE DEBUG] Custom property invitation email sent (existing user)');
        } catch (emailError) {
          console.error('❌ [INVITE DEBUG] Core.SendEmail failed:', {
            error: emailError,
            message: emailError.message,
            stack: emailError.stack
          });
          throw new Error(`E-posttjeneste feilet: ${emailError.message}`);
        }
      } else {
        // NEW USERS: Use platform invite (only way to reach external emails)
        console.log('🔵 [INVITE DEBUG] Sending platform invite (NEW USER):', {
          emailType: 'PLATFORM_INVITATION',
          to: cleanEmail,
          role: 'user',
          note: 'Platform will send generic signup email. Property details shown after login via pending invitation check.'
        });

        try {
          await base44.users.inviteUser(cleanEmail, 'user');
          console.log('✅ [INVITE DEBUG] Platform invitation sent (new user will see property details after signup)');
        } catch (platformError) {
          console.error('❌ [INVITE DEBUG] Platform invite failed:', {
            error: platformError,
            message: platformError.message,
            stack: platformError.stack
          });
          throw new Error(`Kunne ikke sende invitasjon: ${platformError.message}`);
        }
      }
      
      // Create in-app notification if user exists
      if (userExists && existingUserId) {
        try {
          await base44.entities.Notification.create({
            user_id: existingUserId,
            type: 'agreement',
            title: 'Ny boliginvitasjon',
            message: `${user.full_name || 'En utleier'} inviterer deg til ${property.name}`,
            rental_unit_id: propertyId,
            related_id: invitation.id,
            read: false
          });
          console.log('✅ [INVITE DEBUG] In-app notification created');
        } catch (notifError) {
          console.log('⚠️ [INVITE DEBUG] Could not create notification:', notifError);
        }
      }
      
      // Update property status
      updateMutation.mutate({
        tenant_email: cleanEmail,
        status: 'pending_invitation'
      });
      
      console.log('✅ [INVITE DEBUG] ===== INVITATION COMPLETE =====');
      console.log('📧 [INVITE DEBUG] Email summary:', {
        recipient: cleanEmail,
        recipientExists: userExists,
        emailType: userExists ? 'custom_property_invitation' : 'platform_generic_invitation',
        inviteUrl,
        note: !userExists ? 'New user will see property details via pending invitation after signup' : 'Existing user got custom property email'
      });
      
      setShowInviteDialog(false);
      setInviteEmail('');
      
      if (isSelfInvite) {
        alert('✅ Invitasjon opprettet!\n\nSjekk e-posten din for å bekrefte.');
      } else if (userExists) {
        alert('✅ Invitasjon sendt!\n\nLeietaker vil motta e-post med boligdetaljer og lenke for å akseptere.');
      } else {
        alert('✅ Invitasjon opprettet!\n\nLeietaker vil motta en e-post for å registrere seg.\n\nBoliginvitasjonen vises automatisk etter registrering.');
      }
    } catch (error) {
      console.error('❌ [INVITE DEBUG] INVITATION FAILED:', {
        error,
        message: error.message,
        stack: error.stack
      });
      alert(error.message || 'Kunne ikke sende invitasjon');
    }
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

      <div className="p-4 pb-24">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs px-1">Oversikt</TabsTrigger>
            <TabsTrigger value="finances" className="text-xs px-1">Økonomi</TabsTrigger>
            <TabsTrigger value="photos" className="text-xs px-1">Bilder</TabsTrigger>
            <TabsTrigger value="agreement" className="text-xs px-1">Avtale</TabsTrigger>
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
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => setShowInviteDialog(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Mail className="w-4 h-4 mr-2" /> {t('inviteTenant')}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowManualTenantDialog(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Sett som utleid manuelt
                      </Button>
                    </div>
                  </div>
                ) : property.status === 'pending_invitation' ? (
                  <div className="bg-yellow-50 p-3 rounded-lg space-y-3">
                    <div>
                      <p className="text-sm text-yellow-800">
                        Invitasjon sendt til: <strong>{property.tenant_email}</strong>
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">Venter på at leietaker aksepterer</p>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        if (confirm('Er du sikker på at du vil kansellere invitasjonen?')) {
                          // Cancel all pending invitations for this property
                          const invitations = await base44.entities.TenantInvitation.filter({
                            rental_unit_id: propertyId,
                            status: 'pending'
                          });
                          
                          for (const inv of invitations) {
                            await base44.entities.TenantInvitation.update(inv.id, {
                              status: 'cancelled'
                            });
                          }
                          
                          updateMutation.mutate({
                            tenant_email: null,
                            status: 'vacant'
                          });
                        }
                      }}
                    >
                      <X className="w-4 h-4 mr-2" /> Kanseller invitasjon
                    </Button>
                  </div>
                ) : property.manual_tenant_name ? (
                  <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                    <p className="text-sm text-blue-800">
                      Leietaker: <strong>{property.manual_tenant_name}</strong>
                    </p>
                    {property.manual_tenant_phone && (
                      <p className="text-xs text-blue-700">Tlf: {property.manual_tenant_phone}</p>
                    )}
                    {property.manual_tenant_email && (
                      <p className="text-xs text-blue-700">E-post: {property.manual_tenant_email}</p>
                    )}
                    {property.manual_lease_start && (
                      <p className="text-xs text-blue-600">
                        Leieperiode: {property.manual_lease_start} {property.manual_lease_end ? `- ${property.manual_lease_end}` : '→'}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowManualTenantDialog(true)}
                      className="mt-2"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Rediger
                    </Button>
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
            {/* Documentation Checklist */}
            <DocumentationChecklist 
              property={property} 
              onUpdate={(data) => updateMutation.mutate(data)}
              isLoading={updateMutation.isPending}
            />

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

          <TabsContent value="finances" className="space-y-4">
            <PropertyFinances propertyId={propertyId} landlordId={user?.id} />
          </TabsContent>

          <TabsContent value="agreement" className="space-y-4">
            {/* Uploaded PDF Agreement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Last opp leieavtale (PDF)</CardTitle>
              </CardHeader>
              <CardContent>
                <AgreementUpload 
                  property={property} 
                  onUpdate={(data) => updateMutation.mutate(data)}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>

            {/* Digital Agreement */}
            {agreement ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Digital {t('rentalAgreement')}
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
                  <p className="text-slate-500 text-sm mb-3">Ingen digital leieavtale opprettet</p>
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

      {/* Manual Tenant Dialog */}
      <ManualTenantForm
        open={showManualTenantDialog}
        onOpenChange={setShowManualTenantDialog}
        property={property}
        onSave={(data) => {
          updateMutation.mutate(data);
          setShowManualTenantDialog(false);
        }}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}