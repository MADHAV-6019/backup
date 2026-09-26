import '../models/song.dart';
import '../models/playlist.dart';

/// Abstract interface for all music sources.
/// JioSaavn and YouTube each implement this.
abstract class MusicSource {
  String get sourceName;

  /// Search for songs by query.
  Future<List<Song>> searchSongs(String query, {int page = 1, int limit = 20});

  /// Get trending/popular songs.
  Future<List<Song>> getTrending({int limit = 20});

  /// Get the stream URL for a song.
  Future<String> getStreamUrl(String songId);

  /// Get song details by ID.
  Future<Song?> getSongDetails(String songId);

  /// Get songs from a playlist.
  Future<Playlist?> getPlaylist(String playlistId);

  /// Get song suggestions/recommendations.
  Future<List<Song>> getSuggestions(String songId, {int limit = 10});
}
