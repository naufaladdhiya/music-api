const { nanoid } = require("nanoid");
const { Pool } = require("pg");

const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");
const AuthorizationError = require("../../exceptions/AuthorizationError");

class PlaylistService {
  constructor(collaborationService) {
    this._pool = new Pool();
    this._collaborationService = collaborationService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const result = await this._pool.query({
      text: "INSERT INTO playlists VALUES($1, $2, $3) RETURNING id",
      values: [id, name, owner],
    });

    if (!result.rowCount)
      throw new InvariantError("Playlist gagal ditambahkan");

    return result.rows[0].id;
  }

  async getPlaylists(user) {
    const result = await this._pool.query({
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      LEFT JOIN users ON users.id = playlists.owner
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [user],
    });

    return result.rows;
  }

  async deletePlaylistById(id) {
    const result = await this._pool.query({
      text: "DELETE FROM playlists WHERE id = $1 RETURNING id",
      values: [id],
    });

    if (!result.rowCount)
      throw new NotFoundError("Playlist gagal dihapus. Id tidak ditemukan");
  }

  async addSongToPlaylist(playlistId, songId) {
    const result = await this._pool.query({
      text: "INSERT INTO playlistsongs (playlist_id, song_id) VALUES ($1, $2) RETURNING id",
      values: [playlistId, songId],
    });

    if (!result.rowCount)
      throw new InvariantError("Lagu gagal ditambahkan ke playlist");
  }

  async getSongsFromPlaylist(playlistId) {
    const resultFromPlaylist = await this._pool.query({
      text: `SELECT platlists.id, playlists.name, songs.id, songs.title, songs.performer FROM playlists
      LEFT JOIN playlistsongs ON playlistsongs.playlist_id = playlists.id
      WHERE playlists.id = $1`,
      values: [playlistId],
    });

    const result = await this._pool.query({
      text: `SELECT songs.id, songs.title, songs.performer FROM songs
      LEFT JOIN playlistsongs ON playlistsongs.song_id = songs.id
      WHERE playlistsongs.playlist_id = $1`,
      values: [playlistId],
    });

    if (!resultFromPlaylist.rowCount)
      throw new NotFoundError("Playlist tidak ditemukan");

    return { ...resultFromPlaylist.rows[0], songs: result.rows };
  }

  async deleteSongFromPlaylist(playlistId, songId) {
    const result = await this._pool.query({
      text: "DELETE FROM playlistsongs WHERE playlist_id = $1 AND song_id = $2 RETURNING id",
      values: [playlistId, songId],
    });

    if (!result.rowCount)
      throw new InvariantError("Lagu gagal dihapus dari playlist");
  }

  async verifyPlaylistOwner(id, owner) {
    const result = await this._pool.query({
      text: "SELECT * FROM playlists WHERE id = $1",
      values: [id],
    });
    if (!result.rowCount) throw new NotFoundError("Playlist tidak ditemukan");

    const playlist = result.rows[0];
    if (playlist.owner !== owner)
      throw new AuthorizationError("Anda tidak berhak mengakses resource ini");
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      try {
        await this._collaborationService.verifyCollaborator(playlistId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistService;
