import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();
    
    console.log('🔵 [SEND EMAIL] Request:', {
      to,
      subject,
      from_name,
      bodyLength: body?.length,
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    if (!to || !subject || !body) {
      return Response.json({ 
        error: 'Missing required fields: to, subject, body' 
      }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('❌ [SEND EMAIL] RESEND_API_KEY not configured');
      return Response.json({ 
        error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.',
        code: 'RESEND_NOT_CONFIGURED'
      }, { status: 500 });
    }

    // Send via Resend
    console.log('🔵 [SEND EMAIL] Sending via Resend...');
    
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${from_name || 'Utleieoversikt'} <onboarding@resend.dev>`,
        to: [to],
        subject: subject,
        html: body,
      }),
    });

    const resendData = await resendResponse.json();
    
    console.log('🔵 [SEND EMAIL] Resend response:', {
      status: resendResponse.status,
      ok: resendResponse.ok,
      data: resendData
    });

    if (!resendResponse.ok) {
      console.error('❌ [SEND EMAIL] Resend failed:', resendData);
      return Response.json({ 
        error: `Email provider failed: ${resendData.message || 'Unknown error'}`,
        details: resendData,
        code: 'RESEND_FAILED'
      }, { status: 500 });
    }

    console.log('✅ [SEND EMAIL] Email sent successfully:', {
      messageId: resendData.id,
      to,
      subject
    });

    return Response.json({
      success: true,
      messageId: resendData.id,
      provider: 'resend'
    });

  } catch (error) {
    console.error('❌ [SEND EMAIL] Exception:', {
      error: error.message,
      stack: error.stack
    });
    
    return Response.json({ 
      error: error.message,
      code: 'EXCEPTION'
    }, { status: 500 });
  }
});