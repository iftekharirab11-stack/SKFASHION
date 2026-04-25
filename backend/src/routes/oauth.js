const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');
const { jwtSecret } = require('../config/env');

/**
 * @route POST /api/oauth/facebook
 * @desc Exchange Supabase OAuth access token for app JWT
 * @access Public
 */
router.post('/facebook', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // Get user info from Supabase using the access token
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(access_token);

    if (userError || !userData.user) {
      return res.status(401).json({ error: 'Invalid OAuth token' });
    }

    const supabaseUser = userData.user;
    const email = supabaseUser.email;
    const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split('@')[0];
    const avatarUrl = supabaseUser.user_metadata?.avatar_url || supabaseUser.identities?.[0]?.identity_data?.avatar_url;

    // Check if user exists in our database
    const { createClient } = require('@supabase/supabase-js');
    const { supabaseUrl, supabaseAnonKey } = require('../config/env');
    const publicSupabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: existingUser } = await publicSupabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    let user;
    let token;

    if (existingUser) {
      // User exists - update last login (if column exists) and generate new JWT
      user = existingUser;
      
      // Update avatar if available and column exists
      if (avatarUrl && !user.avatar_url) {
        try {
          await publicSupabase
            .from('users')
            .update({ avatar_url: avatarUrl })
            .eq('id', user.id);
        } catch (e) {
          console.log('Could not update avatar:', e.message);
        }
      }
    } else {
      // Create new user from OAuth
      const { data: newUser, error: insertError } = await publicSupabase
        .from('users')
        .insert([
          {
            email,
            password: null, // OAuth users don't have password
            full_name: fullName,
            phone: null,
            role: 'customer',
            is_verified: true, // OAuth users are verified by provider
            avatar_url: avatarUrl,
            provider: 'facebook',
            provider_id: supabaseUser.id
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating OAuth user:', insertError);
        return res.status(500).json({ error: 'Failed to create user account' });
      }

      user = newUser;
    }

    // Generate app JWT
    token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth-callback.html?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url
    }))}`;

    res.json({
      success: true,
      redirect_url: redirectUrl
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      error: 'OAuth authentication failed',
      details: error.message 
    });
  }
});

module.exports = router;
