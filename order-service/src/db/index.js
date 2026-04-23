const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.ORDER_DB_HOST || 'localhost',
  port: process.env.ORDER_DB_PORT || 5432,
  database: process.env.ORDER_DB_NAME || 'orders_db',
  user: process.env.ORDER_DB_USER || 'vastraco_order',
  password: process.env.ORDER_DB_PASSWORD || 'orders_pass_123',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to Order DB, initializing tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        total_amount NUMERIC(10, 2) NOT NULL,
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        variant_id INTEGER NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        size VARCHAR(10),
        color VARCHAR(50),
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL
      );
    `);

    // Check if seed data is needed
    const orderCheck = await client.query('SELECT COUNT(*) FROM orders');
    if (parseInt(orderCheck.rows[0].count) === 0) {
      console.log('Seeding initial order data...');

      // We use placeholder UUIDs for user and product for the seed data
      const mockUserId = '11111111-1111-1111-1111-111111111111';
      const mockProductId = '22222222-2222-2222-2222-222222222222';

      const orderRes = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, shipping_address)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          mockUserId,
          'delivered',
          1499.00,
          JSON.stringify({ street: '123 Fashion St', city: 'Bangalore', state: 'Karnataka', zip: '560001' })
        ]
      );

      const orderId = orderRes.rows[0].id;

      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, product_name, size, color, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [orderId, mockProductId, 1, 'Classic White Formal Shirt', 'L', 'White', 1, 1499.00]
      );

      console.log('Order seed data inserted.');
    }

    console.log('Order DB initialization complete.');
  } catch (err) {
    console.error('Error initializing Order DB', err);
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
