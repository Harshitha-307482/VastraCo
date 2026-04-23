const db = require('../db');

const ProductModel = {
  async getProducts(categoryId, search, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (categoryId) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(categoryId);
      paramCount++;
    }

    if (search) {
      query += ` AND p.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  },

  async getProductById(id) {
    const prodResult = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );

    if (prodResult.rows.length === 0) return null;
    const product = prodResult.rows[0];

    const varResult = await db.query(
      `SELECT * FROM product_variants WHERE product_id = $1`,
      [id]
    );
    product.variants = varResult.rows;

    return product;
  },

  async getCategories() {
    const result = await db.query(`SELECT * FROM categories ORDER BY name`);
    return result.rows;
  },

  async createProduct(data) {
    const { name, description, price, category_id, brand, image_url } = data;
    const result = await db.query(
      `INSERT INTO products (name, description, price, category_id, brand, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, category_id, brand, image_url]
    );
    return result.rows[0];
  },

  async updateProduct(id, data) {
    const { name, description, price, category_id, brand, image_url } = data;
    const result = await db.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           category_id = COALESCE($4, category_id),
           brand = COALESCE($5, brand),
           image_url = COALESCE($6, image_url)
       WHERE id = $7 RETURNING *`,
      [name, description, price, category_id, brand, image_url, id]
    );
    return result.rows[0];
  },

  async deleteProduct(id) {
    await db.query(`DELETE FROM products WHERE id = $1`, [id]);
    return true;
  },

  async decrementStock(variantId, quantity) {
    const result = await db.query(
      `UPDATE product_variants 
       SET stock_quantity = stock_quantity - $1 
       WHERE id = $2 AND stock_quantity >= $1 
       RETURNING *`,
      [quantity, variantId]
    );
    return result.rows[0];
  }
};

module.exports = ProductModel;
