const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");

const NotFoundError = require("../../exceptions/NotFoundError");
const AuthenticationError = require("../../exceptions/AuthenticationError");

class UserService {
  constructor() {
    this._pool = new Pool();
  }

  async addUser({ username, password, fullname }) {
    await this.verifyExistUser(username);

    const id = `user-${nanoid(16)}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = {
      text: "INSERT INTO users VALUES($1, $2, $3, $4) RETURNING id",
      values: [id, username, hashedPassword, fullname],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) throw new InvariantError("User gagal ditambahkan");

    return result.rows[0].id;
  }

  async verifyExistUser(username) {
    const query = {
      text: "SELECT username FROM users WHERE username = $1",
      values: [username],
    };

    const result = await this._pool.query(query);

    if (result.rowCount)
      throw new InvariantError(
        "Gagal menambahkan user. Username sudah digunakan."
      );
  }

  async getUserById(userId) {
    const query = {
      text: "SELECT id, username, fullname FROM users WHERE id = $1",
      values: [userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) throw new NotFoundError("User tidak ditemukan");

    return result.rows[0];
  }

  async verifyUserCredential(username, password) {
    const query = {
      text: "SELECT id, password FROM users WHERE username = $1",
      values: [username],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount)
      throw new AuthenticationError("Kredensial yang Anda berikan salah");

    const { id, password: hashedPassword } = result.rows[0];
    const matchedPassword = await bcrypt.compare(password, hashedPassword);

    if (!matchedPassword)
      throw new AuthenticationError("Kredensial yang Anda berikan salah");

    return id;
  }
}

module.exports = UserService;
