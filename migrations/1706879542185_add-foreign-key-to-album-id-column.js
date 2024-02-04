exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addConstraint(
    "songs",
    "fk_playlists.albums_album_id",
    "FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE"
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint("songs", "fk_playlists.albums_album_id");
};
