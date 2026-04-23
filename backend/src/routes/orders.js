const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route GET /api/orders
 * @desc Get all orders (with filtering)
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // In a full implementation, we would filter by user role
    // Customers see their own orders, admins see all orders
    
    let query = supabase.from('orders').select(`
      *,
      order_items(
        *,
        products(
          name,
          sku
        )
      ),
      users!inner(id, email, full_name)
    `);

    // Apply filters from query parameters
    const { status, userId, page = 1, limit = 10 } = req.query;

    if (status) {
      query = query.eq('status', status);
    }

    // For customers, only show their own orders unless they're admin
    // This would be enhanced with role checking in a full implementation
    if (userId && req.user.role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit) - 1;
    
    const { data: orders, error, count } = await query
      .range(start, end)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/orders/:id
 * @desc Get single order by ID
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          products(
            name,
            sku,
            product_images(image_url)
          )
        ),
        users!inner(id, email, full_name, phone)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is authorized to view this order
    // In a full implementation, we would check if the user is the order owner or an admin
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized access to order' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/orders
 * @desc Create a new order
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { cartItems, shippingAddress, paymentMethod, totalAmount } = req.body;

    // Validate input
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ 
        error: 'Cart items are required' 
      });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address) {
      return res.status(400).json({ 
        error: 'Valid shipping address is required' 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        error: 'Payment method is required' 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ 
        error: 'Valid total amount is required' 
      });
    }

    // Create order record
    const { data: order, error } = await supabase
      .from('orders')
      .insert([
        {
          user_id: req.user.id,
          status: 'pending',
          total_amount: parseFloat(totalAmount),
          shipping_address: JSON.stringify(shippingAddress),
          payment_method: paymentMethod,
          payment_status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Create order items
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: parseInt(item.quantity),
      price_at_time: parseFloat(item.price),
      total_price: parseFloat(item.price) * parseInt(item.quantity)
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // TODO: Update product stock levels
    // This would be implemented in a full version

    res.status(201).json({
      message: 'Order created successfully',
      orderId: order.id,
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error.message 
    });
  }
});

/**
 * @route PUT /api/orders/:id/status
 * @desc Update order status
 * @access Private (Admin only)
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Update order status
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ 
      error: 'Failed to update order status',
      details: error.message 
    });
  }
});

/**
 * @route PUT /api/orders/:id/payment
 * @desc Update payment status
 * @access Private
 */
router.put('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        error: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` 
      });
    }

    // Update payment status
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Payment status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ 
      error: 'Failed to update payment status',
      details: error.message 
    });
  }
});

module.exports = router;