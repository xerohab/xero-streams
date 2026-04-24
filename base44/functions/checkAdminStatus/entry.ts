import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns whether the current user is an admin at the platform level
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ isAdmin: false, role: null });

    // Use service role to get the true platform role for this user
    const users = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (!users || users.length === 0) return Response.json({ isAdmin: false, role: 'user' });

    const platformUser = users[0];
    const platformRole = platformUser.role; // This is the true platform-level role

    return Response.json({ isAdmin: platformRole === 'admin', role: platformRole });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});