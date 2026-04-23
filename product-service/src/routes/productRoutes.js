const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Categories
router.get('/categories', productController.getCategories);

// Products
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', productController.createProduct); // Admin only in real app
router.put('/products/:id', productController.updateProduct); // Admin only in real app
router.delete('/products/:id', productController.deleteProduct); // Admin only in real app

// Internal Stock management
router.put('/products/variant/:id/stock', productController.decrementStock);

module.exports = router;
