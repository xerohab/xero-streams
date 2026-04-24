import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { url } = await req.json();
    
    if (!url) {
      return Response.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return Response.json({ error: `Failed to fetch directory: ${response.statusText}` }, { status: response.status });
    }

    const html = await response.text();
    
    // Extract image URLs from HTML - supports common directory listing patterns
    const imageRegex = /href=["']([^"']*\.(jpg|jpeg|png|gif|webp))["']/gi;
    const matches = Array.from(html.matchAll(imageRegex));
    
    if (matches.length === 0) {
      return Response.json({ images: [], error: null });
    }

    const baseUrl = new URL(url);
    const images = matches.map((match, idx) => {
      let imagePath = match[1];
      let fullUrl = imagePath;
      
      if (!imagePath.startsWith('http')) {
        if (imagePath.startsWith('/')) {
          fullUrl = `${baseUrl.protocol}//${baseUrl.host}${imagePath}`;
        } else {
          fullUrl = `${url.endsWith('/') ? url : url + '/'}${imagePath}`;
        }
      }
      
      const filename = imagePath.split('/').pop().split('.')[0];
      
      return {
        image_url: fullUrl,
        title: filename.replace(/[-_]/g, ' '),
        sort_order: idx,
      };
    });

    return Response.json({ images });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});