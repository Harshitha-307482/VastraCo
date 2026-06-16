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

    // Alter table to add EKS Outfit Planner metadata columns if they don't exist
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS occasion JSONB DEFAULT '[]'::jsonb;
    `);

    // Check if seed data is needed (we check for a minimum catalog count of 200)
    const prodCheck = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCheck.rows[0].count) < 200) {
      console.log('Clearing old catalog and seeding new 200+ product catalog...');
      
      await client.query('TRUNCATE TABLE product_variants CASCADE');
      await client.query('TRUNCATE TABLE products CASCADE');
      await client.query('TRUNCATE TABLE categories CASCADE');

      const categoryConfig = {
        // Men's Wear
        "Shirts": { gender: "Male", count: 12, basePrice: 1299, styles: ["Formal", "Casual"], brands: ["Raymond", "Allen Solly", "Peter England"], colors: ["White", "Blue", "Black", "Grey", "Pink"], occasions: ["Office", "Farewell", "Interview"], photo: "photo-1596755094514-f87e32f85e2c" },
        "T-Shirts": { gender: "Male", count: 12, basePrice: 699, styles: ["Casual", "Sporty"], brands: ["Nike", "Adidas", "Puma", "Levis"], colors: ["Black", "White", "Red", "Grey", "Green"], occasions: ["Casual Outing", "College"], photo: "photo-1521572267360-ee0c2909d518" },
        "Polo T-Shirts": { gender: "Male", count: 8, basePrice: 999, styles: ["Casual", "Sporty"], brands: ["Polo Ralph Lauren", "Lacoste", "U.S. Polo"], colors: ["Navy", "Red", "Green", "White", "Yellow"], occasions: ["Casual Outing", "College"], photo: "photo-1581655353564-df123a1eb820" },
        "Blazers": { gender: "Male", count: 8, basePrice: 3999, styles: ["Formal", "Western"], brands: ["Raymond", "Louis Philippe", "Zara"], colors: ["Navy", "Black", "Grey", "Beige"], occasions: ["Wedding", "Farewell", "Office", "Engagement"], photo: "photo-1591047139829-d91aecb6caea" },
        "Suits": { gender: "Male", count: 8, basePrice: 6999, styles: ["Formal", "Western"], brands: ["Raymond", "Van Heusen", "Louis Philippe"], colors: ["Black", "Navy", "Charcoal"], occasions: ["Wedding", "Engagement", "Farewell"], photo: "photo-1594938298603-c8148c4dae35" },
        "Trousers": { gender: "Male", count: 10, basePrice: 1499, styles: ["Formal"], brands: ["Park Avenue", "Blackberrys", "Van Heusen"], colors: ["Black", "Grey", "Beige", "Navy"], occasions: ["Office", "Interview", "Wedding"], photo: "photo-1624378439575-d8705ad7ae80" },
        "Jeans": { gender: "Male", count: 10, basePrice: 1999, styles: ["Casual"], brands: ["Levis", "Wrangler", "Pepe Jeans"], colors: ["Blue", "Black", "Grey"], occasions: ["Casual Outing", "College"], photo: "photo-1541099649105-f69ad21f3246" },
        "Chinos": { gender: "Male", count: 8, basePrice: 1599, styles: ["Casual", "Formal"], brands: ["Zara", "Tommy Hilfiger", "U.S. Polo"], colors: ["Beige", "Khaki", "Olive", "Navy"], occasions: ["Casual Outing", "College", "Office"], photo: "photo-1479064555552-3ef4979f8908" },
        "Kurta": { gender: "Male", count: 8, basePrice: 1799, styles: ["Traditional"], brands: ["Manyavar", "FabIndia", "Biba"], colors: ["Yellow", "White", "Red", "Blue", "Orange"], occasions: ["Wedding", "Festive", "Engagement"], photo: "photo-1603415526960-f7e0328c63b1" },
        "Sherwani": { gender: "Male", count: 5, basePrice: 8999, styles: ["Traditional"], brands: ["Manyavar", "Sabyasachi"], colors: ["Beige", "Gold", "Maroon", "Cream"], occasions: ["Wedding", "Engagement"], photo: "photo-1610030470390-34444c9b2923" },
        "Jackets": { gender: "Male", count: 8, basePrice: 2499, styles: ["Casual", "Western"], brands: ["Woodland", "Wildcraft", "Jack & Jones"], colors: ["Black", "Brown", "Olive"], occasions: ["Casual Outing", "College"], photo: "photo-1551028719-00167b16eac5" },
        
        // Women's Wear
        "Sarees": { gender: "Female", count: 12, basePrice: 2999, styles: ["Traditional"], brands: ["Suta", "Nalli", "FabIndia"], colors: ["Red", "Gold", "Black", "Green", "Pink"], occasions: ["Wedding", "Festive", "Farewell"], photo: "photo-1610030469983-98e550d6193c" },
        "Lehengas": { gender: "Female", count: 8, basePrice: 7999, styles: ["Traditional"], brands: ["Kalki Fashion", "Biba", "Manyavar"], colors: ["Pink", "Gold", "Red", "Blue"], occasions: ["Wedding", "Engagement", "Festive"], photo: "photo-1611601679655-7c8bc197f0c6" },
        "Kurtis": { gender: "Female", count: 12, basePrice: 999, styles: ["Traditional", "Casual"], brands: ["W", "Aurelia", "Biba"], colors: ["Blue", "Yellow", "White", "Pink", "Green"], occasions: ["College", "Casual Outing", "Office"], photo: "photo-1583391733958-d25e07fac0ec" },
        "Salwar Suits": { gender: "Female", count: 10, basePrice: 1999, styles: ["Traditional"], brands: ["Biba", "Libas", "W"], colors: ["Red", "Blue", "Green", "Beige"], occasions: ["Festive", "Wedding", "Casual Outing"], photo: "photo-1610030469983-98e550d6193c" },
        "Anarkalis": { gender: "Female", count: 8, basePrice: 3499, styles: ["Traditional"], brands: ["Libas", "Biba", "Manyavar"], colors: ["Blue", "Green", "Maroon", "Yellow"], occasions: ["Wedding", "Engagement", "Festive"], photo: "photo-1613206484394-b2586bf7fbfa" },
        "Dresses": { gender: "Female", count: 12, basePrice: 1799, styles: ["Casual", "Western"], brands: ["Zara", "H&M", "Vero Moda"], colors: ["Red", "Black", "Yellow", "Pink", "Floral"], occasions: ["Casual Outing", "College", "Farewell"], photo: "photo-1572804013309-59a88b7e92f1" },
        "Gowns": { gender: "Female", count: 8, basePrice: 4999, styles: ["Western"], brands: ["Mango", "Zara", "Vero Moda"], colors: ["Black", "Red", "Navy", "Silver"], occasions: ["Wedding", "Farewell", "Engagement"], photo: "photo-1566174053879-31528523f8ae" },
        "Skirts": { gender: "Female", count: 8, basePrice: 1299, styles: ["Casual", "Western"], brands: ["H&M", "Only", "Zara"], colors: ["Black", "Blue", "Grey", "Red"], occasions: ["Casual Outing", "College"], photo: "photo-1583496661160-fb5886a0aaaa" },
        "Crop Tops": { gender: "Female", count: 8, basePrice: 799, styles: ["Casual", "Western"], brands: ["Forever 21", "H&M", "Zara"], colors: ["White", "Black", "Pink", "Yellow"], occasions: ["Casual Outing", "College"], photo: "photo-1515886657613-9f3515b0c78f" },
        "Blouses": { gender: "Female", count: 10, basePrice: 899, styles: ["Traditional"], brands: ["Nalli", "Suta"], colors: ["Gold", "Red", "Black", "Green", "Pink"], occasions: ["Wedding", "Festive", "Farewell"], photo: "photo-1503342217505-b0a15ec3261c" },
        
        // Footwear
        "Formal Shoes": { gender: "Male", count: 6, basePrice: 2499, styles: ["Formal"], brands: ["Bata", "Hush Puppies", "Clarks"], colors: ["Black", "Brown", "Tan"], occasions: ["Office", "Interview", "Wedding"], photo: "photo-1533867617858-e7b97e060509" },
        "Loafers": { gender: "Unisex", count: 6, basePrice: 1999, styles: ["Casual", "Formal"], brands: ["Woodland", "Bata", "Clarks"], colors: ["Tan", "Brown", "Black", "Navy"], occasions: ["Casual Outing", "College", "Office"], photo: "photo-1531310197839-ccf54634509e" },
        "Sneakers": { gender: "Unisex", count: 8, basePrice: 2999, styles: ["Casual", "Sporty"], brands: ["Nike", "Adidas", "Puma", "Converse"], colors: ["White", "Black", "Grey", "Red"], occasions: ["Casual Outing", "College"], photo: "photo-1549298916-b41d501d3772" },
        "Heels": { gender: "Female", count: 6, basePrice: 1999, styles: ["Formal", "Western"], brands: ["Catwalk", "Inc.5", "Metro"], colors: ["Black", "Gold", "Silver", "Nude"], occasions: ["Wedding", "Farewell", "Engagement"], photo: "photo-1543163521-1bf539c55dd2" },
        "Flats": { gender: "Female", count: 6, basePrice: 999, styles: ["Casual", "Traditional"], brands: ["Catwalk", "Bata", "Metro"], colors: ["Beige", "Black", "Pink", "Gold"], occasions: ["Casual Outing", "College", "Festive"], photo: "photo-1560343090-f0409e92791a" },
        "Sandals": { gender: "Unisex", count: 6, basePrice: 1299, styles: ["Casual", "Traditional"], brands: ["Bata", "Woodland", "Crocs"], colors: ["Brown", "Black", "Tan"], occasions: ["Casual Outing", "Festive"], photo: "photo-1603252109303-2751441dd157" },
        
        // Accessories
        "Watches": { gender: "Unisex", count: 8, basePrice: 3499, styles: ["Formal", "Western"], brands: ["Titan", "Casio", "Fossil"], colors: ["Silver", "Black", "Gold", "Brown"], occasions: ["Office", "Wedding", "Farewell"], photo: "photo-1524805444758-089113d48a6d" },
        "Belts": { gender: "Unisex", count: 6, basePrice: 799, styles: ["Formal", "Casual"], brands: ["Levi's", "Bata", "Tommy Hilfiger"], colors: ["Black", "Brown", "Tan"], occasions: ["Office", "Casual Outing", "Wedding"], photo: "photo-1624222247566-5f8240026814" },
        "Wallets": { gender: "Unisex", count: 6, basePrice: 999, styles: ["Casual", "Formal"], brands: ["Hidesign", "Wildhorn", "Titan"], colors: ["Black", "Brown", "Tan"], occasions: ["Casual Outing", "Office"], photo: "photo-1627124112126-efd6ad15583b" },
        "Sunglasses": { gender: "Unisex", count: 6, basePrice: 1499, styles: ["Casual", "Western"], brands: ["Ray-Ban", "Fastrack", "Oakley"], colors: ["Black", "Brown", "Gold"], occasions: ["Casual Outing", "College", "Wedding"], photo: "photo-1511499767150-a48a237f0083" },
        "Earrings": { gender: "Female", count: 10, basePrice: 499, styles: ["Traditional"], brands: ["Giva", "Tanishq", "Voylla"], colors: ["Gold", "Silver", "Pink"], occasions: ["Wedding", "Festive", "Farewell"], photo: "photo-1535632066927-ab7c9ab60908" },
        "Bangles": { gender: "Female", count: 10, basePrice: 599, styles: ["Traditional"], brands: ["Tanishq", "FabIndia"], colors: ["Red", "Gold", "Green", "Pink"], occasions: ["Wedding", "Festive", "Engagement"], photo: "photo-1599643478518-a784e5dc4c8f" },
        "Necklaces": { gender: "Female", count: 8, basePrice: 2499, styles: ["Traditional"], brands: ["Giva", "Tanishq"], colors: ["Gold", "Silver", "White"], occasions: ["Wedding", "Engagement", "Festive"], photo: "photo-1599643478518-a784e5dc4c8f" },
        "Rings": { gender: "Unisex", count: 10, basePrice: 999, styles: ["Casual", "Formal"], brands: ["Giva", "Tanishq"], colors: ["Silver", "Gold"], occasions: ["Wedding", "Engagement", "Casual Outing"], photo: "photo-1605100804763-247f67b3557e" },
        "Handbags": { gender: "Female", count: 8, basePrice: 2999, styles: ["Western"], brands: ["Lavie", "Caprese", "Lino Perros"], colors: ["Black", "Beige", "Tan", "Pink"], occasions: ["Office", "Casual Outing", "Farewell"], photo: "photo-1584917865442-de89df76afd3" },
        "Clutches": { gender: "Female", count: 6, basePrice: 1499, styles: ["Traditional", "Western"], brands: ["Lavie", "Caprese"], colors: ["Gold", "Silver", "Black", "Red"], occasions: ["Wedding", "Farewell", "Engagement"], photo: "photo-1566150905458-1bf1fc15a7a5" }
      };

      const categories = Object.keys(categoryConfig);
      const catMap = {};

      for (const catName of categories) {
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const res = await client.query(
          'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id',
          [catName, slug]
        );
        catMap[catName] = res.rows[0].id;
      }

      console.log('Seeding products...');
      for (const catName of categories) {
        const config = categoryConfig[catName];
        
        for (let i = 0; i < config.count; i++) {
          const brand = config.brands[i % config.brands.length];
          const color = config.colors[i % config.colors.length];
          const style = config.styles[i % config.styles.length];
          const offsetPrice = config.basePrice + Math.floor(Math.random() * (config.basePrice * 0.4)) - Math.floor(config.basePrice * 0.15);
          const price = Math.round(offsetPrice / 10) * 10 - 1; // Round to nice ends in 9
          
          const name = `${brand} ${color} ${style} ${catName.replace(/s$/, '')} V-${i+1}`;
          const description = `A premium ${style.toLowerCase()} ${catName.toLowerCase()} designed by ${brand}. Crafted with high-grade materials in ${color.toLowerCase()}, perfect for ${config.occasions.join(' or ')} wear. Offers unmatched comfort and durability.`;
          const imageUrl = `https://images.unsplash.com/${config.photo}?w=500&auto=format&fit=crop&q=60`;
          
          const pResult = await client.query(
            `INSERT INTO products (name, description, price, category_id, brand, image_url, gender, style, occasion) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [name, description, price, catMap[catName], brand, imageUrl, config.gender, style, JSON.stringify(config.occasions)]
          );
          const productId = pResult.rows[0].id;

          // Seed 3 variants for each product
          let sizes = ['S', 'M', 'L', 'XL'];
          if (catName.includes("Shoes") || catName.includes("Loafers") || catName.includes("Sneakers") || catName.includes("Heels") || catName.includes("Flats") || catName.includes("Sandals")) {
            sizes = ['7', '8', '9', '10'];
          } else if (["Watches", "Belts", "Wallets", "Sunglasses", "Earrings", "Bangles", "Necklaces", "Rings", "Handbags", "Clutches"].includes(catName)) {
            sizes = ['One Size'];
          }

          const varColors = [color];
          // Get other colors
          for (const c of config.colors) {
            if (varColors.length < 3 && c !== color) {
              varColors.push(c);
            }
          }

          for (let j = 0; j < varColors.length; j++) {
            const size = sizes[j % sizes.length];
            const varColor = varColors[j];
            const stock = Math.floor(Math.random() * 80) + 20; // 20 to 100
            const sku = `SKU-${productId.substring(0, 5)}-${size.replace(/\s+/g, '')}-${varColor}-${j}`;

            await client.query(
              `INSERT INTO product_variants (product_id, size, color, stock_quantity, sku) 
               VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
              [productId, size, varColor, stock, sku]
            );
          }
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
