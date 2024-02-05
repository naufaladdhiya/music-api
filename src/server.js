require("dotenv").config();

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");

const albums = require("./api/albums");
const AlbumService = require("./services/postgres/AlbumService");
const AlbumsValidator = require("./validator/albums");

const songs = require("./api/songs");
const SongService = require("./services/postgres/SongService");
const SongsValidator = require("./validator/songs");

const user = require("./api/users");
const UserService = require("./services/postgres/UserService");
const UserValidator = require("./validator/users");

const authentiations = require("./api/authentications");
const AuthenticationService = require("./services/postgres/AuthenticationService");
const TokenManager = require("./tokenize/TokenManager");
const AuthenticationsValidator = require("./validator/authentications");

const playlists = require("./api/playlists");
const PlaylistService = require("./services/postgres/PlaylistService");
const PlaylistsValidator = require("./validator/playlists");

const collaborations = require("./api/collaborations");
const CollaborationService = require("./services/postgres/CollaborationService");
const CollaborationsValidator = require("./validator/collaborations");

const ClientError = require("./exceptions/ClientError");

const init = async () => {
  const songsService = new SongService();
  const albumsService = new AlbumService();
  const usersService = new UserService();
  const authenticationsService = new AuthenticationService();
  const collaborationsService = new CollaborationService();
  const playlistsService = new PlaylistService(collaborationsService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
  ]);

  server.auth.strategy("songs_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  server.ext("onPreResponse", (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request;

    // penanganan client error secara internal.
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: "fail",
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: user,
      options: {
        service: usersService,
        validator: UserValidator,
      },
    },
    {
      plugin: authentiations,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        playlistsService,
        songsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        usersService,
        validator: CollaborationsValidator,
      },
    },
  ]);

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
