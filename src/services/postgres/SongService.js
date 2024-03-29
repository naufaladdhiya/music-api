const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const { mapSongDBToModel } = require("../../utils/index");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class SongService {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({ title, year, performer, genre, duration, albumId }) {
    const id = `song-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const result = await this._pool.query({
      text: "INSERT INTO songs VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      values: [
        id,
        title,
        year,
        performer,
        genre,
        duration,
        albumId,
        createdAt,
        updatedAt,
      ],
    });
    if (!result.rows[0].id) throw new InvariantError("Lagu gagal ditambahkan");

    return result.rows[0].id;
  }

  async getSongs(title, performer) {
    let query = "";
    if (title && performer) {
      query = {
        text: "SELECT id, title, performer FROM songs WHERE LOWER(title) LIKE $1 AND LOWER(performer) LIKE $2",
        values: [`%${title.toLowerCase()}%`, `%${performer.toLowerCase()}%`],
      };
    } else if (title) {
      query = {
        text: "SELECT id, title, performer FROM songs WHERE LOWER(title) LIKE $1",
        values: [`%${title.toLowerCase()}%`],
      };
    } else if (performer) {
      query = {
        text: "SELECT id, title, performer FROM songs WHERE LOWER(performer) LIKE $1",
        values: [`%${performer.toLowerCase()}%`],
      };
    } else {
      query = "SELECT id, title, performer FROM songs";
    }
    const result = await this._pool.query(query);
    return result.rows;
  }

  async getSongById(id) {
    const result = await this._pool.query({
      text: "SELECT * FROM songs WHERE id = $1",
      values: [id],
    });
    if (!result.rowCount) throw new NotFoundError("Lagu tidak ditemukan");

    return mapSongDBToModel(result.rows[0]);
  }

  async editSongById(id, { title, year, performer, genre, duration, albumId }) {
    const updatedAt = new Date().toISOString();
    const result = await this._pool.query({
      text: "UPDATE songs SET title = $1, year = $2, performer = $3, genre = $4, duration = $5, album_id = $6, updated_at = $7 WHERE id = $8 RETURNING id",
      values: [title, year, performer, genre, duration, albumId, updatedAt, id],
    });
    if (!result.rowCount)
      throw new NotFoundError("Gagal memperbarui lagu. Id tidak ditemukan");
  }

  async deleteSongById(id) {
    const result = await this._pool.query({
      text: "DELETE FROM songs WHERE id = $1 RETURNING id",
      values: [id],
    });
    if (!result.rowCount)
      throw new NotFoundError("Lagu gagal dihapus. Id tidak ditemukan");
  }
}

module.exports = SongService;
