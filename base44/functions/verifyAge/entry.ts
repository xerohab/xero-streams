import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_base64 } = await req.json();
    if (!image_base64) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Decode base64 to binary
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const imageBlob = new Blob([bytes], { type: 'image/jpeg' });

    // Call Didit age estimation API
    const diditForm = new FormData();
    diditForm.append('user_image', imageBlob, 'selfie.jpg');
    diditForm.append('age_estimation_decline_threshold', '18');
    diditForm.append('face_liveness_score_decline_threshold', '30');
    diditForm.append('save_api_request', 'true');
    diditForm.append('vendor_data', user.email);

    const diditRes = await fetch('https://verification.didit.me/v3/age-estimation/', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('DIDIT_API_KEY'),
      },
      body: diditForm,
    });

    const result = await diditRes.json();

    if (!diditRes.ok) {
      return Response.json({ error: 'Didit API error', details: result }, { status: 400 });
    }

    const status = result?.age_estimation?.status;
    const estimatedAge = result?.age_estimation?.age_estimation;
    const approved = status === 'Approved';

    if (approved) {
      await base44.asServiceRole.entities.User.update(user.id, { age_verified: true });
    }

    return Response.json({ approved, status, estimated_age: estimatedAge });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});