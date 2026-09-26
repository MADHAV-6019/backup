import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/core/services/music_source.dart';
import 'package:melody_flow/data/sources/jiosaavn/jiosaavn_source.dart';
import 'package:melody_flow/data/sources/youtube/youtube_source.dart';

/// Aggregates results from all music sources.
class MusicRepository {
  final JioSaavnSource _jiosaavn;
  final YouTubeSource _youtube;

  MusicRepository({
    JioSaavnSource? jiosaavn,
    YouTubeSource? youtube,
  })  : _jiosaavn = jiosaavn ?? JioSaavnSource(),
        _youtube = youtube ?? YouTubeSource();

  JioSaavnSource get jiosaavn => _jiosaavn;
  YouTubeSource get youtube => _youtube;

  Future<List<Song>> searchAll(String query,
      {int page = 1, int limit = 20}) async {
    debugPrint('[Repo] 🔍 Searching all sources: "$query"');

    final results = await Future.wait([
      _jiosaavn.searchSongs(query, page: page, limit: limit),
      _youtube.searchSongs(query, page: page, limit: limit),
    ]);

    final allSongs = <Song>[];
    final jiosaavnSongs = results[0];
    final youtubeSongs = results[1];

    debugPrint('[Repo] JioSaavn: ${jiosaavnSongs.length}, YouTube: ${youtubeSongs.length}');

    // Interleave results
    int i = 0, j = 0;
    while (i < jiosaavnSongs.length || j < youtubeSongs.length) {
      if (i < jiosaavnSongs.length) {
        allSongs.add(jiosaavnSongs[i++]);
      }
      if (j < youtubeSongs.length) {
        allSongs.add(youtubeSongs[j++]);
      }
    }

    debugPrint('[Repo] ✅ Total results: ${allSongs.length}');
    return allSongs;
  }

  Future<List<Song>> searchSource(String query, String source,
      {int page = 1, int limit = 20}) async {
    switch (source) {
      case 'jiosaavn':
        return _jiosaavn.searchSongs(query, page: page, limit: limit);
      case 'youtube':
        return _youtube.searchSongs(query, page: page, limit: limit);
      default:
        return searchAll(query, page: page, limit: limit);
    }
  }

  Future<List<Song>> getTrending({int limit = 20}) async {
    debugPrint('[Repo] 📈 Fetching trending...');

    final results = await Future.wait([
      _jiosaavn.getTrending(limit: limit),
      _youtube.getTrending(limit: limit ~/ 2),
    ]);

    final combined = [...results[0], ...results[1]];
    debugPrint('[Repo] ✅ Trending: ${combined.length} songs');
    return combined;
  }

  Future<String> resolveStreamUrl(Song song) async {
    debugPrint('[Repo] 🔗 Resolving stream URL for: "${song.title}" (source=${song.source}, sourceId=${song.sourceId})');

    if (song.streamUrl.isNotEmpty) {
      debugPrint('[Repo] Already has stream URL');
      return song.streamUrl;
    }

    final MusicSource? source = _getSource(song.source);
    if (source != null) {
      final url = await source.getStreamUrl(song.sourceId);
      debugPrint('[Repo] ${url.isEmpty ? "❌ Failed to resolve" : "✅ Resolved stream URL"}');
      return url;
    }

    debugPrint('[Repo] ❌ Unknown source: ${song.source}');
    return '';
  }

  /// Downloads YouTube audio bytes using youtube_explode's authenticated client.
  /// Returns null if the song is not from YouTube or if download fails.
  Future<Uint8List?> getYouTubeAudioBytes(Song song) async {
    if (song.source != 'youtube') return null;
    debugPrint('[Repo] 🎵 Downloading YouTube audio for: "${song.title}"');
    return _youtube.getAudioBytes(song.sourceId);
  }

  /// Returns a raw audio byte stream for progressive playback.
  /// Starts playing immediately while downloading in background.
  Future<Stream<List<int>>?> getYouTubeAudioStream(Song song) async {
    if (song.source != 'youtube') return null;
    debugPrint('[Repo] ▶️ Getting audio stream for: "${song.title}"');
    return _youtube.getAudioStream(song.sourceId);
  }

  Future<List<Song>> getSuggestions(Song song, {int limit = 10}) async {
    final MusicSource? source = _getSource(song.source);
    if (source != null) {
      return source.getSuggestions(song.sourceId, limit: limit);
    }
    return [];
  }

  MusicSource? _getSource(String sourceName) {
    switch (sourceName) {
      case 'jiosaavn':
        return _jiosaavn as MusicSource;
      case 'youtube':
        return _youtube as MusicSource;
      default:
        return null;
    }
  }

  void dispose() {
    _youtube.dispose();
  }
}
