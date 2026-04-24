import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all adult images
    const allAdultImages = await base44.asServiceRole.entities.Image.list("-created_date", 1000);
    
    // Filter for .jpg and .jpeg files
    const imagesToDelete = allAdultImages.filter(img => {
      if (!img.is_adult) return false;
      const url = img.image_url?.toLowerCase() || '';
      return url.endsWith('.jpg') || url.endsWith('.jpeg');
    });

    // Delete each image with delay to avoid rate limits
    let deleted = 0;
    for (const img of imagesToDelete) {
      try {
        await base44.asServiceRole.entities.Image.delete(img.id);
        deleted++;
        // Add small delay between deletes
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Failed to delete image ${img.id}:`, err.message);
      }
    }

    return Response.json({ 
      success: true, 
      deletedCount: deleted,
      message: `Deleted ${deleted} image${deleted !== 1 ? 's' : ''}`
    });
  } catch (error) {
    console.error("Delete function error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});