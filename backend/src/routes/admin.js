const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { checkAdminRole } = require('../middleware/admin');

/**
 * @route GET /api/admin/stats
 * @desc Get dashboard statistics
 * @access Private (Admin only)
 */
router.get('/stats', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    // Get counts for dashboard
    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: totalOrders },
      { count: pendingOrders }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact' }),
      supabaseAdmin.from('products').select('id', { count: 'exact' }),
      supabaseAdmin.from('orders').select('id', { count: 'exact' }),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')
    ]);

    // Get recent orders
    const { data: recentOrders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        created_at,
        status,
        total_amount,
        users!inner(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordersError) throw ordersError;

    res.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0
      },
      recentOrders: recentOrders || []
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch admin statistics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/admin/users
 * @desc Get all users
 * @access Private (Admin only)
 */
router.get('/users', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit) - 1;
    
    const { data: users, error, count } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_verified, created_at')
      .range(start, end)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      users: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
});

/**
 * @route PUT /api/admin/users/:id/role
 * @desc Update user role
 * @access Private (Admin only)
 */
router.put('/users/:id/role', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['admin', 'customer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ 
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
      });
    }

    // Prevent users from removing their own admin access
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ 
        error: 'Cannot remove your own admin privileges' 
      });
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/admin/products/low-stock
 * @desc Get products with low stock
 * @access Private (Admin only)
 */
router.get('/products/low-stock', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { threshold = 5 } = req.query;
    
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, stock')
      .lte('stock', parseInt(threshold))
      .order('stock', { ascending: true });

    if (error) throw error;

    res.json({ products: products || [] });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch low stock products',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/admin/settings
 * @desc Get system settings
 * @access Private (Admin only)
 */
router.get('/settings', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .single();

    if (error) throw error;

    res.json({ settings: settings || {} });
  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch settings',
      details: error.message 
    });
  }
});

/**
 * @route PUT /api/admin/settings
 * @desc Update system settings
 * @access Private (Admin only)
 */
router.put('/settings', authenticateToken, checkAdminRole, async (req, res) => {
  try {
    const { data: updatedSettings, error } = await supabaseAdmin
      .from('settings')
      .update(req.body)
      .eq('id', 1) // Assuming single settings row with id=1
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: error.message 
    });
  }
});

module.exports = router;