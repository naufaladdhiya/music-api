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

    const results = await this._pool.query({
      text: "INSERT INTO albums VALUES($1, $2, $3, $4, $4) RETURNING id",
      values: [id, name, year, createdAt],
    });

    if (!results.rows[0].id)
      throw new InvariantError("Album gagal ditambahkan");

    return results.rows[0].id;
  }

  async getAlbumById(id) {
    const albumQuery = await this._pool.query({
      text: "SELECT id, name, year FROM albums WHERE id = $1",
      values: [id],
    });

    const songsQuery = await this._pool.query({
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    });

    if (!albumQuery.rows.length)
      throw new NotFoundError("Album tidak ditemukan");

    return {
      ...albumQuery.rows.map(mapAlbumDBToModel)[0],
      songs: songsQuery.rows,
    };
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const result = await this._pool.query({
      text: "UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id",
      values: [name, year, updatedAt, id],
    });

    if (!result.rowCount)
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
  }

  async deleteAlbumById(id) {
    const results = await this._pool.query({
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    });

    if (!results.rowCount)
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
  }
}

module.exports = AlbumService;
