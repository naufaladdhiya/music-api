const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const { mapAlbumDBToModel } = require("../../utils");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class AlbumService {
  constructor() {
    this._pool = new Pool();
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const results = await this._pool.query({
      text: "INSERT INTO albums VALUES($1, $2, $3, $4, $5) RETURNING id",
      values: [id, name, year, createdAt, updatedAt],
    });

    if (!results.rows[0].id)
      throw new InvariantError("Album gagal ditambahkan");

    return results.rows[0].id;
  }

  async getAlbumById(id) {
    const albumQuery = await this._pool.query({
      text: "SELECT * FROM albums WHERE id = $1",
      values: [id],
    });

    const songsQuery = await this._pool.query({
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    });

    if (!albumQuery.rows.length)
      throw new NotFoundError("Album tidak ditemukan");

    const { name, year, performer } = albumQuery.rows[0];

    return {
      ...mapAlbumDBToModel({ name, year, performer }),
      songs: songsQuery.rows,
    };
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const result = await this._pool.query({
      text: "UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id",
      values: [name, year, updatedAt, id],
    });

    if (!result.rows.length)
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
  }

  async deleteAlbumById(id) {
    const results = await this._pool.query({
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    });

    if (!results.rows.length)
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
  }
}

module.exports = AlbumService;
