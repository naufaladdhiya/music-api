const mapSongDBToModel = ({ album_id, ...args }) => ({
  ...args,
  albumId: album_id,
});

const mapAlbumDBToModel = ({ ...args }) => ({
  ...args,
});

module.exports = { mapSongDBToModel, mapAlbumDBToModel };
