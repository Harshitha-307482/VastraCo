const ProductModel = require('../models/productModel');

const getProducts = async (req, res) => {
  try {
    const { category, search, page, limit } = req.query;
    const products = await ProductModel.getProducts(category, search, parseInt(page) || 1, parseInt(limit) || 20);
    res.status(200).json(products);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await ProductModel.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('getProductById error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await ProductModel.getCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('getCategories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const product = await ProductModel.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await ProductModel.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await ProductModel.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const decrementStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    const updatedVariant = await ProductModel.decrementStock(req.params.id, quantity);
    if (!updatedVariant) {
      return res.status(409).json({ error: 'Insufficient stock or variant not found' });
    }
    
    res.status(200).json(updatedVariant);
  } catch (error) {
    console.error('decrementStock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock
};
