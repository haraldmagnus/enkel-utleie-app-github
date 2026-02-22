import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Building2, MapPin, Users, FileText, Camera, 
  Mail, Trash2, Edit2, Check, X, UserPlus, Wallet, BedDouble
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import RentSplitEditor from '@/components/RentSplitEditor';
import SharedHousingRooms from '@/components/SharedHousingRooms';

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
  const [showRentSplitDialog, setShowRentSplitDialog] = useState(false);
  const [rentSplits, setRentSplits] = useState([]);
  const [showCoLandlordDialog, setShowCoLandlordDialog] = useState(false);
  const [coLandlordEmail, setCoLandlordEmail] = useState('');
  const [togglingShared, setTogglingShared] = useState(false);

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

  const { data: coLandlords = [] } = useQuery({
    queryKey: ['coLandlords', propertyId],
    queryFn: async () => {
      const ids = property?.landlord_ids || [];
      if (ids.length <= 1) return [];
      const others = ids.filter(id => id !== user?.id);
      const users = await Promise.all(others.map(id => base44.entities.User.filter({ id }).then(r => r[0])));
      return users.filter(Boolean);
    },
    enabled: !!property && !!user
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
      
      // Generate links
      const signupUrl = `${window.location.origin}${createPageUrl('RoleSelection')}`;
      console.log('🔵 [INVITE DEBUG] Generated links:', { 
        inviteUrl, 
        signupUrl,
        willIncludeSignupLink: !userExists 
      });
      
      // UNIFIED PROPERTY INVITATION EMAIL (single source of truth)
      console.log('🔵 [INVITE DEBUG] ===== SENDING EMAIL =====');
      const emailSubject = isSelfInvite 
        ? `Bekreft tilknytning til ${property.name}` 
        : `Invitasjon til ${property.name}`;
      
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 100%;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">
                ${isSelfInvite ? '🏠 Bekreft boligtilknytning' : '🏠 Ny boliginvitasjon'}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
                Hei!
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #1f2937; line-height: 1.6;">
                ${isSelfInvite 
                  ? 'Du har knyttet deg som leietaker til følgende bolig:' 
                  : 'Du er invitert til å bli leietaker i følgende bolig:'}
              </p>

              <!-- Property Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #2563eb; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1e40af;">
                      ${property.name}
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 15px; color: #4b5563;">
                      📍 ${property.address}
                    </p>
                    ${property.monthly_rent ? `
                    <p style="margin: 0; font-size: 16px; color: #059669; font-weight: 600;">
                      💰 ${property.monthly_rent.toLocaleString()} kr/måned
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${user.full_name ? `
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">
                <strong>Utleier:</strong> ${user.full_name}
              </p>
              ` : ''}

              ${!userExists ? `
              <!-- New user: Show both buttons -->
              <div style="margin: 32px 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #78350f; font-weight: 600;">
                  📝 Steg 1: Registrer deg i appen
                </p>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #78350f;">
                  Du har ikke konto ennå. Klikk her for å registrere deg først:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${signupUrl}" style="display: inline-block; background-color: #f59e0b; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(245,158,11,0.3);">
                        Registrer deg gratis
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="margin: 32px 0; padding: 16px; background-color: #dbeafe; border-radius: 8px; border-left: 3px solid #2563eb;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #1e40af; font-weight: 600;">
                  🏠 Steg 2: Aksepter boliginvitasjonen
                </p>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #1e40af;">
                  Etter registrering, aksepter invitasjonen:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">
                        Aksepter invitasjon
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; text-align: center; font-style: italic;">
                💡 Invitasjonen vil også vente på deg i appen etter registrering
              </p>
              ` : `
              <!-- Existing user: Show only accept button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(37,99,235,0.3);">
                      ${isSelfInvite ? 'Bekreft tilknytning' : 'Aksepter invitasjon'}
                    </a>
                  </td>
                </tr>
              </table>
              `}

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #9ca3af; text-align: center;">
                ⏰ Invitasjonen er gyldig i 7 dager
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Utleieoversikt - Din komplette utleieløsning
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

      console.log('🔵 [INVITE DEBUG] Email details:', {
        emailType: 'PROPERTY_INVITATION',
        to: cleanEmail,
        subject: emailSubject,
        from_name: user.full_name || 'Utleieoversikt',
        recipientExists: userExists,
        bodyLength: emailBody.length,
        includesSignupLink: !userExists,
        includesInviteLink: true
      });

      try {
        const emailResult = await base44.integrations.Core.SendEmail({
          to: cleanEmail,
          from_name: 'Enkel Utleie',
          subject: emailSubject,
          body: emailBody.trim()
        });
        console.log('✅ [INVITE DEBUG] Property invitation email sent successfully:', emailResult);
      } catch (emailError) {
        console.error('❌ [INVITE DEBUG] SendEmail failed:', {
          error: emailError,
          message: emailError.message,
          stack: emailError.stack,
          response: emailError.response
        });
        throw new Error(`E-posttjeneste feilet: ${emailError.message}`);
      }
      
      // CRITICAL: DO NOT send platform invitation email (prevents double email)
      console.log('🔵 [INVITE DEBUG] Platform invite: SKIPPED (prevents double email)');
      console.log('ℹ️ [INVITE DEBUG] User will register via invite link if needed');
      
      // Create in-app notification ONLY if user exists (otherwise it will be created at signup/login)
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
          console.log('✅ [INVITE DEBUG] In-app notification created for existing user');
        } catch (notifError) {
          console.log('⚠️ [INVITE DEBUG] Could not create notification:', notifError);
        }
        
        // Create chat message for inbox (only for existing users)
        try {
          await base44.entities.ChatMessage.create({
            rental_unit_id: propertyId,
            sender_id: user.id,
            sender_name: user.full_name || 'Utleier',
            message: `Hei! Du er invitert til å bli leietaker i ${property.name}. Aksepter invitasjonen for å få tilgang.`,
            read: false
          });
          console.log('✅ [INVITE DEBUG] Chat message created for existing user inbox');
        } catch (chatError) {
          console.log('⚠️ [INVITE DEBUG] Could not create chat message:', chatError);
        }
      } else {
        console.log('ℹ️ [INVITE DEBUG] Skipping in-app notification/chat for new user (will be created at login)');
      }
      
      // Update property status - append to existing tenant emails
      const existingEmails = property.tenant_emails || (property.tenant_email ? [property.tenant_email] : []);
      const updatedEmails = [...new Set([...existingEmails, cleanEmail])];
      updateMutation.mutate({
        tenant_email: cleanEmail,
        tenant_emails: updatedEmails,
        status: 'pending_invitation'
      });
      
      console.log('✅ [INVITE DEBUG] ===== INVITATION COMPLETE =====');
      console.log('📧 [INVITE DEBUG] Email summary:', {
        recipient: cleanEmail,
        recipientExists: userExists,
        emailsSent: 1,
        emailType: userExists ? 'existing_user_invite_only' : 'new_user_signup_and_invite',
        linksInEmail: userExists ? 1 : 2,
        signupLink: userExists ? null : signupUrl,
        inviteUrl
      });
      
      setShowInviteDialog(false);
      setInviteEmail('');
      
      if (isSelfInvite) {
        alert('✅ Invitasjon opprettet!\n\nSjekk e-posten din for å bekrefte.');
      } else {
        alert('✅ Invitasjon sendt!\n\nLeietaker vil motta én e-post med lenke for å akseptere.');
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

      <div className="p-4 pb-24 space-y-6">
        {/* OVERSIKT */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Oversikt</h2>
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
                    <div className="flex gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowManualTenantDialog(true)}
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Rediger
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Fjerne leietaker fra denne boligen? Historiske regnskapsdata beholdes.')) {
                            updateMutation.mutate({
                              manual_tenant_name: null,
                              manual_tenant_phone: null,
                              manual_tenant_email: null,
                              manual_lease_start: null,
                              manual_lease_end: null,
                              status: 'vacant'
                            });
                          }
                        }}
                      >
                        <X className="w-3 h-3 mr-1" /> Fjern leietaker
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* All tenants */}
                    <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                      {(property.tenant_emails || (property.tenant_email ? [property.tenant_email] : [])).map((email, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <p className="text-sm text-blue-800">
                            <strong>Leietaker {i + 1}:</strong> {email}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-red-500 hover:text-red-700 px-2"
                            onClick={async () => {
                              if (confirm(`Fjerne ${email} som leietaker?`)) {
                                const updatedEmails = (property.tenant_emails || []).filter(e => e !== email);
                                const updatedTenantIds = (property.tenant_ids || []).filter(id => {
                                  const matchingTenant = updatedEmails.length === 0;
                                  return !matchingTenant;
                                });
                                updateMutation.mutate({
                                  tenant_emails: updatedEmails,
                                  tenant_email: updatedEmails[0] || null,
                                  status: updatedEmails.length === 0 ? 'vacant' : 'occupied',
                                  rent_splits: (property.rent_splits || []).filter(s => s.user_email !== email)
                                });
                              }
                            }}
                          >
                            Fjern
                          </Button>
                        </div>
                      ))}
                    </div>
                    {/* Add another tenant button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <Mail className="w-4 h-4 mr-2" /> Legg til leietaker
                    </Button>
                    {/* Rent split */}
                    {(property.tenant_emails || []).length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          const existing = property.rent_splits || [];
                          const emails = property.tenant_emails || [];
                          const splits = emails.map(email => {
                            const found = existing.find(s => s.user_email === email);
                            return found || { user_email: email, user_name: email, percentage: Math.round(100 / emails.length), amount: 0 };
                          });
                          setRentSplits(splits);
                          setShowRentSplitDialog(true);
                        }}
                      >
                        <Wallet className="w-4 h-4 mr-2" /> Sett husleiefordeling
                      </Button>
                    )}
                    {property.rent_splits && property.rent_splits.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                        <p className="text-xs font-medium text-slate-500">Husleiefordeling:</p>
                        {property.rent_splits.map((s, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span>{s.user_name || s.user_email}</span>
                            <span>{s.percentage}% ({Math.round((property.monthly_rent || 0) * s.percentage / 100).toLocaleString()} kr)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Co-Landlords Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Medutleiere
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coLandlords.length === 0 ? (
                  <p className="text-sm text-slate-500 mb-3">Ingen medutleiere tilknyttet</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {coLandlords.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{u.full_name || u.email}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 text-xs px-2"
                          onClick={async () => {
                            if (confirm(`Fjerne ${u.email} som medutleier?`)) {
                              const updatedIds = (property.landlord_ids || []).filter(id => id !== u.id);
                              updateMutation.mutate({ landlord_ids: updatedIds });
                            }
                          }}
                        >
                          Fjern
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCoLandlordDialog(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Legg til medutleier
                </Button>
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
        </div>

        {/* ØKONOMI */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Økonomi</h2>
          <PropertyFinances propertyId={propertyId} landlordId={user?.id} property={property} onUpdateProperty={(data) => updateMutation.mutate(data)} />
        </div>

        {/* BILDER */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Bilder</h2>
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
        </div>

        {/* AVTALE */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Avtale</h2>
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
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Leietaker signert</span>
                    <span className={agreement.tenant_signed ? 'text-green-600' : 'text-amber-600'}>
                      {agreement.tenant_signed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </span>
                  </div>
                  {agreement.status === 'draft' && (
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                      onClick={() => navigate(createPageUrl(`CreateAgreement?propertyId=${propertyId}&agreementId=${agreement.id}`))}
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Åpne og ferdigstill utkast
                    </Button>
                  )}
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
        </div>
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

      {/* Rent Split Dialog */}
      <Dialog open={showRentSplitDialog} onOpenChange={setShowRentSplitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Husleiefordeling</DialogTitle>
            <DialogDescription>
              Angi hvor stor andel av husleien ({property?.monthly_rent?.toLocaleString()} kr) hver leietaker skal betale.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <RentSplitEditor
              splits={rentSplits}
              onChange={setRentSplits}
              totalAmount={property?.monthly_rent || 0}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRentSplitDialog(false)}>Avbryt</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const total = rentSplits.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
                if (Math.abs(total - 100) > 0.01) return alert('Andeler må summere til 100%');
                updateMutation.mutate({ rent_splits: rentSplits });
                setShowRentSplitDialog(false);
              }}
            >
              Lagre fordeling
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Co-Landlord Dialog */}
      <Dialog open={showCoLandlordDialog} onOpenChange={setShowCoLandlordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til medutleier</DialogTitle>
            <DialogDescription>
              Skriv inn e-postadressen til medutleieren du vil legge til. De må allerede ha en konto i appen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="email"
              placeholder="medutleier@example.com"
              value={coLandlordEmail}
              onChange={(e) => setCoLandlordEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCoLandlordDialog(false); setCoLandlordEmail(''); }}>
              {t('cancel')}
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!coLandlordEmail}
              onClick={async () => {
                const cleanEmail = coLandlordEmail.toLowerCase().trim();

                // Sjekk om det allerede finnes en aktiv invitasjon
                const existingInvites = await base44.entities.CoLandlordInvitation.filter({
                  rental_unit_id: propertyId,
                  co_landlord_email: cleanEmail,
                  status: 'pending'
                });
                if (existingInvites.length > 0) {
                  alert('Det er allerede sendt en invitasjon til denne e-postadressen som ikke er besvart ennå.');
                  return;
                }

                // Sjekk om bruker allerede er medutleier
                const existingIds = property.landlord_ids || [property.landlord_id];
                const existingUsers = await base44.entities.User.filter({ email: cleanEmail });
                if (existingUsers.length > 0 && existingIds.includes(existingUsers[0].id)) {
                  alert('Denne brukeren er allerede tilknyttet eiendommen som utleier.');
                  return;
                }

                // Opprett invitasjon
                const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 7);

                const invitation = await base44.entities.CoLandlordInvitation.create({
                  rental_unit_id: propertyId,
                  inviting_landlord_id: user.id,
                  co_landlord_email: cleanEmail,
                  token,
                  status: 'pending',
                  expires_at: expiresAt.toISOString()
                });

                const inviteUrl = `${window.location.origin}${createPageUrl('AcceptCoLandlord')}?token=${token}`;

                // Send e-post
                try {
                  await base44.integrations.Core.SendEmail({
                    to: cleanEmail,
                    from_name: 'Enkel Utleie',
                    subject: `Invitasjon til å bli medutleier på ${property.name}`,
                    body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
<table width="600" style="background:white;border-radius:12px;overflow:hidden;margin:auto;">
  <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center;">
    <h1 style="margin:0;color:white;font-size:22px;">🏠 Invitasjon til medutleier</h1>
  </td></tr>
  <tr><td style="padding:32px 24px;">
    <p style="font-size:16px;color:#1f2937;">Hei!</p>
    <p style="font-size:15px;color:#374151;">${user?.full_name || 'En utleier'} inviterer deg til å bli medutleier på:</p>
    <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1e40af;">${property.name}</p>
      <p style="margin:0;font-size:14px;color:#4b5563;">📍 ${property.address}</p>
      ${property.monthly_rent ? `<p style="margin:8px 0 0;font-size:15px;color:#059669;font-weight:600;">💰 ${property.monthly_rent.toLocaleString()} kr/måned</p>` : ''}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
          Aksepter invitasjon
        </a>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#9ca3af;text-align:center;">⏰ Invitasjonen er gyldig i 7 dager</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:13px;color:#9ca3af;">Enkel Utleie – Din komplette utleieløsning</p>
  </td></tr>
</table></body></html>`
                  });
                } catch (e) {
                  console.error('E-post feilet:', e);
                }

                // In-app notifikasjon (hvis bruker finnes)
                if (existingUsers.length > 0) {
                  try {
                    await base44.entities.Notification.create({
                      user_id: existingUsers[0].id,
                      type: 'agreement',
                      title: 'Invitasjon til å bli medutleier',
                      message: `${user?.full_name || 'En utleier'} inviterer deg til å bli medutleier på ${property.name}`,
                      rental_unit_id: propertyId,
                      related_id: invitation.id,
                      read: false
                    });
                  } catch (e) {
                    console.error('Notifikasjon feilet:', e);
                  }
                }

                setShowCoLandlordDialog(false);
                setCoLandlordEmail('');
                alert(`✅ Invitasjon sendt til ${cleanEmail}! De må akseptere før de får tilgang.`);
              }}
            >
              Legg til
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