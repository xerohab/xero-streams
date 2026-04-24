import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all adult images
    const allAdultImages = await base44.asServiceRole.entities.Image.filter({ is_adult: true }, "", 1000);
    
    // Filter for .jpg and .jpeg files
    const imagesToDelete = allAdultImages.filter(img => {
      const url = img.image_url?.toLowerCase() || '';
      return url.endsWith('.jpg') || url.endsWith('.jpeg');
    });

    // Delete each image
    for (const img of imagesToDelete) {
      await base44.asServiceRole.entities.Image.delete(img.id);
    }

    return Response.json({ 
      success: true, 
      deletedCount: imagesToDelete.length,
      message: `Deleted ${imagesToDelete.length} image${imagesToDelete.length !== 1 ? 's' : ''}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});