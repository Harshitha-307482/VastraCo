const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PRODUCT_DB_HOST || 'localhost',
  port: process.env.PRODUCT_DB_PORT || 5432,
  database: process.env.PRODUCT_DB_NAME || 'products_db',
  user: process.env.PRODUCT_DB_USER || 'vastraco_product',
  password: process.env.PRODUCT_DB_PASSWORD || 'products_pass_123',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to Product DB, initializing tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        brand VARCHAR(100),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(10) NOT NULL,
        color VARCHAR(50) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        sku VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Check if seed data is needed
    const catCheck = await client.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      
      // Seed Categories
      const categories = [
        "Men's Shirts", "Women's Dresses", "Jeans", "Ethnic Wear", "Accessories"
      ];
      
      const catMap = {};
      for (const catName of categories) {
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const res = await client.query(
          'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
          [catName, slug]
        );
        catMap[catName] = res.rows[0].id;
      }

      // Seed Products and Variants
      const seedProducts = [
        { name: "Classic White Formal Shirt", price: 1499.00, cat: "Men's Shirts", brand: "Raymond", img: "https://images.unsplash.com/photo-1596755094514-f87e32f85e2c?w=500&auto=format&fit=crop&q=60" },
        { name: "Blue Oxford Cotton Shirt", price: 1299.00, cat: "Men's Shirts", brand: "Peter England", img: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=60" },
        { name: "Linen Blend Casual Shirt", price: 1799.00, cat: "Men's Shirts", brand: "FabIndia", img: "https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=500&auto=format&fit=crop&q=60" },
        { name: "Checked Flannel Shirt", price: 1199.00, cat: "Men's Shirts", brand: "Highlander", img: "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=500&auto=format&fit=crop&q=60" },
        
        { name: "Floral Print Maxi Dress", price: 2499.00, cat: "Women's Dresses", brand: "Vero Moda", img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&auto=format&fit=crop&q=60" },
        { name: "Elegant Black Evening Gown", price: 4999.00, cat: "Women's Dresses", brand: "Mango", img: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&auto=format&fit=crop&q=60" },
        { name: "Summer Midi Sundress", price: 1899.00, cat: "Women's Dresses", brand: "Only", img: "https://images.unsplash.com/photo-1605763240000-7e93b172d754?w=500&auto=format&fit=crop&q=60" },
        { name: "Polka Dot Wrap Dress", price: 2199.00, cat: "Women's Dresses", brand: "H&M", img: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=500&auto=format&fit=crop&q=60" },
        
        { name: "Slim Fit Blue Jeans", price: 1999.00, cat: "Jeans", brand: "Levi's", img: "https://images.unsplash.com/photo-1542272604-780c8e5016f4?w=500&auto=format&fit=crop&q=60" },
        { name: "Distressed Black Denim", price: 2299.00, cat: "Jeans", brand: "Jack & Jones", img: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=500&auto=format&fit=crop&q=60" },
        { name: "High-Rise Flared Jeans", price: 1899.00, cat: "Jeans", brand: "Kraus", img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&auto=format&fit=crop&q=60" },
        { name: "Straight Cut Vintage Wash", price: 2499.00, cat: "Jeans", brand: "Wrangler", img: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=60" },
        
        { name: "Silk Embroidered Kurta Set", price: 3499.00, cat: "Ethnic Wear", brand: "Biba", img: "https://images.unsplash.com/photo-1583391733958-d25e07fac0ec?w=500&auto=format&fit=crop&q=60" },
        { name: "Cotton Printed Saree", price: 1599.00, cat: "Ethnic Wear", brand: "Suta", img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&auto=format&fit=crop&q=60" },
        { name: "Men's Festive Kurta Pajama", price: 2199.00, cat: "Ethnic Wear", brand: "Manyavar", img: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=500&auto=format&fit=crop&q=60" },
        { name: "Designer Lehenga Choli", price: 8999.00, cat: "Ethnic Wear", brand: "Kalki", img: "https://images.unsplash.com/photo-1613206484394-b2586bf7fbfa?w=500&auto=format&fit=crop&q=60" },
        
        { name: "Leather Crossbody Bag", price: 2999.00, cat: "Accessories", brand: "Hidesign", img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop&q=60" },
        { name: "Polarized Aviator Sunglasses", price: 1499.00, cat: "Accessories", brand: "Ray-Ban", img: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=60" },
        { name: "Minimalist Analog Watch", price: 3999.00, cat: "Accessories", brand: "Fossil", img: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&auto=format&fit=crop&q=60" },
        { name: "Woven Pattern Belt", price: 899.00, cat: "Accessories", brand: "Tommy Hilfiger", img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=60" }
      ];

      for (let i = 0; i < seedProducts.length; i++) {
        const p = seedProducts[i];
        const res = await client.query(
          'INSERT INTO products (name, description, price, category_id, brand, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [p.name, 'A beautiful ' + p.name + ' designed for ultimate comfort and style.', p.price, catMap[p.cat], p.brand, p.img]
        );
        const productId = res.rows[0].id;
        
        // Seed 3 variants for each
        const sizes = ['S', 'M', 'L', 'XL'];
        const colors = ['Black', 'White', 'Blue', 'Red', 'Green'];
        
        for (let j = 0; j < 3; j++) {
          const size = sizes[Math.floor(Math.random() * sizes.length)];
          const color = colors[Math.floor(Math.random() * colors.length)];
          const stock = Math.floor(Math.random() * 91) + 10; // 10 to 100
          const sku = \`SKU-\${productId.substring(0, 5)}-\${size}-\${color}-\${j}\`;
          
          await client.query(
            'INSERT INTO product_variants (product_id, size, color, stock_quantity, sku) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
            [productId, size, color, stock, sku]
          );
        }
      }
      console.log('Seed data inserted.');
    }
    
    console.log('Product DB initialization complete.');
  } catch (err) {
    console.error('Error initializing Product DB', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
  pool
};
