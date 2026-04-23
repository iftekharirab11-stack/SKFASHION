const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { uploadImage, uploadToSupabase } = require('../middleware/upload');

/**
 * @route GET /api/products
 * @desc Get all products with optional filtering
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('products').select(`
      *,
      categories!inner(name),
      brands!inner(name)
    `);

    // Apply filters from query parameters
    const { category, brand, minPrice, maxPrice, search, sort } = req.query;

    if (category) {
      query = query.eq('categories.name', category);
    }

    if (brand) {
      query = query.eq('brands.name', brand);
    }

    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      case 'name-az':
        query = query.order('name', { ascending: true });
        break;
      case 'name-za':
        query = query.order('name', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: products, error } = await query;

    if (error) throw error;

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/products/:id
 * @desc Get single product by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!inner(name),
        brands!inner(name),
        product_images(*)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Private (Admin only)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // In a full implementation, we would check admin role here
    // For now, we'll proceed with authentication only
    
    const {
      name,
      description,
      price,
      categoryId,
      brandId,
      stock,
      sku,
      isFeatured,
      isNewArrival
    } = req.body;

    // Validate required fields
    if (!name || !price === 0 || !categoryId || !brandId || !sku) {
      return res.status(400).json({ 
        error: 'Name, price, category, brand, and SKU are required' 
      });
    }

    // Check if SKU already exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingProduct) {
      return res.status(400).json({ 
        error: 'Product with this SKU already exists' 
      });
    }

    // Create new product
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert([
        {
          name,
          description,
          price: parseFloat(price),
          category_id: categoryId,
          brand_id: brandId,
          stock: parseInt(stock) || 0,
          sku,
          is_featured: isFeatured || false,
          is_new_arrival: isNewArrival || false
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error.message 
    });
  }
});

/**
 * @route PUT /api/products/:id
 * @desc Update a product
 * @access Private (Admin only)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Build update object from request body
    const allowedFields = [
      'name', 'description', 'price', 'category_id', 'brand_id', 
      'stock', 'sku', 'is_featured', 'is_new_arrival'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = 
          field === 'price' || field === 'stock' 
            ? parseFloat(req.body[field]) 
            : req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields to update' 
      });
    }

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
      }

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: error.message 
    });
  }
});

/**
 * @route DELETE /api/products/:id
 * @desc Delete a product
 * @access Private (Admin only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: product, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      error: 'Failed to delete product',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/products/:id/images
 * @desc Upload images for a product
 * @access Private (Admin only)
 */
router.post('/:id/images', authenticateToken, uploadImage('image'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: product, error: findError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadToSupabase(req.file, `product_${id}`);

    // Save image URL to product_images table
    const { data: productImage, error } = await supabase
      .from('product_images')
      .insert([
        {
          product_id: id,
          image_url: imageUrl,
          is_primary: false // Will be set to true if this is the first image
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Check if this is the first image, if so make it primary
    const { count } = await supabase
      .from('product_images')
      .select('id', { count: 'exact' })
      .eq('product_id', id);

    if (count === 1) {
      await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', productImage.id);
    }

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: productImage
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

module.exports = router;