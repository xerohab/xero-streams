import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all adult images
    const allImages = await base44.asServiceRole.entities.Image.list('-created_date', 1000);
    
    // Filter images that start with "PICS by Gigafans.net"
    const imagesToDelete = allImages.filter(img => 
      img.title && img.title.startsWith('PICS by Gigafans.net')
    );

    // Delete them
    for (const img of imagesToDelete) {
      await base44.asServiceRole.entities.Image.delete(img.id);
    }

    return Response.json({ 
      success: true, 
      deleted: imagesToDelete.length,
      message: `Deleted ${imagesToDelete.length} image${imagesToDelete.length !== 1 ? 's' : ''} from Gigafans`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});