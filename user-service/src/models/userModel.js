const db = require('../db');
const bcrypt = require('bcrypt');

const UserModel = {
  async createUser(name, email, password) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async updateProfile(id, name) {
    const result = await db.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role, created_at`,
      [name, id]
    );
    return result.rows[0];
  }
};

module.exports = UserModel;
