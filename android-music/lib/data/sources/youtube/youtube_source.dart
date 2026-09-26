import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart' hide Playlist;
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/core/models/playlist.dart';
import 'package:melody_flow/core/services/music_source.dart';

/// YouTube Music source using youtube_explode_dart for search & streaming.
///
/// Key insight: YouTube CDN rejects direct HTTP requests from non-YouTube
/// clients (403 Forbidden). We MUST use youtube_explode's own authenticated
/// StreamsClient to download audio bytes — it uses the same HTTP client
/// that successfully negotiated the stream manifest.
class YouTubeSource implements MusicSource {
  final YoutubeExplode _yt;

  YouTubeSource({YoutubeExplode? yt})
      : _yt = yt ?? YoutubeExplode();

  @override
  String get sourceName => 'youtube';

  @override
  Future<List<Song>> searchSongs(String query,
      {int page = 1, int limit = 20}) async {
    try {
      debugPrint('[YouTube Music] 🔍 Searching: "$query" (limit=$limit)');
      final searchResults = await _yt.search.search('$query official audio');
      final songs = <Song>[];

      for (final video in searchResults.take(limit)) {
        songs.add(_mapVideoToSong(video));
      }
      debugPrint('[YouTube Music] ✅ Found ${songs.length} results');
      return songs;
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Search error: $e');
      return [];
    }
  }

  @override
  Future<List<Song>> getTrending({int limit = 20}) async {
    try {
      debugPrint('[YouTube Music] 📈 Fetching trending (limit=$limit)');
      final searchResults = await _yt.search.search('top music hits 2025 official audio');
      final songs = <Song>[];

      for (final video in searchResults.take(limit)) {
        songs.add(_mapVideoToSong(video));
      }
      debugPrint('[YouTube Music] ✅ Got ${songs.length} trending songs');
      return songs;
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Trending error: $e');
      return [];
    }
  }

  @override
  Future<String> getStreamUrl(String songId) async {
    final videoId = songId.startsWith('yt_') ? songId.substring(3) : songId;
    debugPrint('[YouTube Music] 🎵 Resolving direct stream URL for: $videoId');

    try {
      final manifest =
          await _yt.videos.streamsClient.getManifest(VideoId(videoId));

      debugPrint('[YouTube Music] Audio-only: ${manifest.audioOnly.length}, Muxed: ${manifest.muxed.length}');

      StreamInfo? targetStream;

      // Pick the LOWEST bitrate audio for fastest loading on slow connections
      final audioStreams = manifest.audioOnly.sortByBitrate();
      if (audioStreams.isNotEmpty) {
        targetStream = audioStreams.first; // Lowest bitrate = smallest file
        debugPrint('[YouTube Music] Selected: ${(targetStream as AudioOnlyStreamInfo).bitrate}, '
            'size: ${targetStream.size}');
      } else if (manifest.muxed.isNotEmpty) {
        targetStream = manifest.muxed.sortByBitrate().first;
        debugPrint('[YouTube Music] Using muxed (lowest quality)');
      }

      if (targetStream == null) {
        debugPrint('[YouTube Music] ❌ No streams available');
        return '';
      }

      final url = targetStream.url.toString();
      debugPrint('[YouTube Music] ✅ Got direct CDN URL (${url.length} chars)');
      return url;
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Stream URL error: $e');
      return '';
    }
  }

  /// Returns a raw audio byte stream using youtube_explode's authenticated
  /// HTTP client. This enables progressive playback — start playing as soon
  /// as enough data is buffered while the rest downloads in background.
  Future<Stream<List<int>>?> getAudioStream(String songId, {int retryCount = 0}) async {
    final videoId = songId.startsWith('yt_') ? songId.substring(3) : songId;
    debugPrint('[YouTube Music] 🎵 Getting audio stream for: $videoId');

    try {
      final manifest =
          await _yt.videos.streamsClient.getManifest(VideoId(videoId));

      debugPrint('[YouTube Music] Audio-only: ${manifest.audioOnly.length}, Muxed: ${manifest.muxed.length}');

      StreamInfo? targetStream;

      final audioStreams = manifest.audioOnly.sortByBitrate();
      if (audioStreams.isNotEmpty) {
        final idx = audioStreams.length > 2
            ? audioStreams.length ~/ 2
            : audioStreams.length - 1;
        targetStream = audioStreams[idx];
        debugPrint('[YouTube Music] Selected: ${(targetStream as AudioOnlyStreamInfo).bitrate}, '
            'size: ${targetStream.size}');
      } else if (manifest.muxed.isNotEmpty) {
        targetStream = manifest.muxed.sortByBitrate().last;
        debugPrint('[YouTube Music] Using muxed (no audio-only)');
      }

      if (targetStream == null) {
        debugPrint('[YouTube Music] ❌ No streams available');
        return null;
      }

      return _yt.videos.streamsClient.get(targetStream);
    } catch (e) {
      // Rate limiting — wait and retry
      if (e.toString().contains('RequestLimitExceeded') && retryCount < 2) {
        final waitSecs = 5 * (retryCount + 1); // 5s, 10s
        debugPrint('[YouTube Music] ⏳ Rate limited. Waiting ${waitSecs}s before retry...');
        await Future.delayed(Duration(seconds: waitSecs));
        return getAudioStream(songId, retryCount: retryCount + 1);
      }
      debugPrint('[YouTube Music] ❌ Stream error: $e');
      return null;
    }
  }

  /// Downloads the full audio as bytes using youtube_explode's authenticated
  /// HTTP client. This is the ONLY reliable way to get YouTube audio because
  /// the CDN rejects requests from non-YouTube HTTP clients (Dio, ExoPlayer).
  Future<Uint8List?> getAudioBytes(String songId) async {
    final videoId = songId.startsWith('yt_') ? songId.substring(3) : songId;
    debugPrint('[YouTube Music] 🎵 Downloading audio bytes for: $videoId');

    try {
      final manifest =
          await _yt.videos.streamsClient.getManifest(VideoId(videoId));

      debugPrint('[YouTube Music] Audio-only: ${manifest.audioOnly.length}, Muxed: ${manifest.muxed.length}');

      // Pick the best audio-only stream
      StreamInfo? targetStream;

      final audioStreams = manifest.audioOnly.sortByBitrate();
      if (audioStreams.isNotEmpty) {
        // Pick medium quality — good balance of quality and size
        final idx = audioStreams.length > 2
            ? audioStreams.length ~/ 2
            : audioStreams.length - 1;
        targetStream = audioStreams[idx];
        debugPrint('[YouTube Music] Selected audio stream: ${(targetStream as AudioOnlyStreamInfo).bitrate}, '
            'size: ${targetStream.size}');
      } else if (manifest.muxed.isNotEmpty) {
        targetStream = manifest.muxed.sortByBitrate().last;
        debugPrint('[YouTube Music] Using muxed stream (no audio-only available)');
      }

      if (targetStream == null) {
        debugPrint('[YouTube Music] ❌ No streams available');
        return null;
      }

      // Use youtube_explode's own HTTP client to download the bytes
      // This uses the same authenticated session that got the manifest
      debugPrint('[YouTube Music] ⏳ Downloading via youtube_explode streamsClient...');
      final stream = _yt.videos.streamsClient.get(targetStream);
      final chunks = <List<int>>[];
      int totalBytes = 0;

      await for (final chunk in stream) {
        chunks.add(chunk);
        totalBytes += chunk.length;
        // Log progress every ~1MB
        if (totalBytes % (1024 * 1024) < chunk.length) {
          debugPrint('[YouTube Music] Downloaded ${(totalBytes / 1024 / 1024).toStringAsFixed(1)} MB...');
        }
      }

      final bytes = Uint8List(totalBytes);
      int offset = 0;
      for (final chunk in chunks) {
        bytes.setRange(offset, offset + chunk.length, chunk);
        offset += chunk.length;
      }

      debugPrint('[YouTube Music] ✅ Downloaded ${(bytes.length / 1024 / 1024).toStringAsFixed(1)} MB');
      return bytes;
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Audio download error: $e');
      return null;
    }
  }

  @override
  Future<Song?> getSongDetails(String songId) async {
    try {
      final videoId = songId.startsWith('yt_') ? songId.substring(3) : songId;
      final video = await _yt.videos.get(VideoId(videoId));
      return _mapVideoInfoToSong(video);
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Song details error: $e');
      return null;
    }
  }

  @override
  Future<Playlist?> getPlaylist(String playlistId) async {
    try {
      final playlist = await _yt.playlists.get(PlaylistId(playlistId));
      final videos =
          await _yt.playlists.getVideos(PlaylistId(playlistId)).toList();

      return Playlist(
        id: 'yt_$playlistId',
        name: playlist.title,
        description: playlist.description,
        imageUrl:
            videos.isNotEmpty ? videos.first.thumbnails.highResUrl : null,
        songs: videos.map((v) => _mapVideoToSong(v)).toList(),
        source: sourceName,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Playlist error: $e');
      return null;
    }
  }

  @override
  Future<List<Song>> getSuggestions(String songId, {int limit = 10}) async {
    try {
      final videoId = songId.startsWith('yt_') ? songId.substring(3) : songId;
      final video = await _yt.videos.get(VideoId(videoId));
      final results =
          await _yt.search.search('${video.title} similar music');
      final songs = <Song>[];

      for (final v in results.take(limit)) {
        if (v.id.value != videoId) {
          songs.add(_mapVideoToSong(v));
        }
      }
      return songs;
    } catch (e) {
      debugPrint('[YouTube Music] ❌ Suggestions error: $e');
      return [];
    }
  }

  Song _mapVideoToSong(Video video) {
    return Song(
      id: 'yt_${video.id.value}',
      title: _cleanTitle(video.title),
      artist: video.author,
      album: '',
      duration: video.duration ?? Duration.zero,
      thumbnailUrl: video.thumbnails.mediumResUrl,
      highResThumbnailUrl: video.thumbnails.highResUrl,
      streamUrl: '', // Resolved lazily on play
      source: sourceName,
      sourceId: video.id.value,
    );
  }

  Song _mapVideoInfoToSong(Video video) {
    return Song(
      id: 'yt_${video.id.value}',
      title: _cleanTitle(video.title),
      artist: video.author,
      album: '',
      duration: video.duration ?? Duration.zero,
      thumbnailUrl: video.thumbnails.mediumResUrl,
      highResThumbnailUrl: video.thumbnails.maxResUrl,
      streamUrl: '',
      source: sourceName,
      sourceId: video.id.value,
      year: video.uploadDate?.year,
    );
  }

  String _cleanTitle(String title) {
    return title
        .replaceAll(
            RegExp(r'\s*\(Official\s*(Music\s*)?Video\)',
                caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*\[Official\s*(Music\s*)?Video\]',
                caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*\|\s*Official\s*(Music\s*)?Video',
                caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*-\s*Official\s*(Music\s*)?Video',
                caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*\(Official\s*Audio\)', caseSensitive: false), '')
        .replaceAll(
            RegExp(r'\s*\[Official\s*Audio\]', caseSensitive: false), '')
        .replaceAll(
            RegExp(r'\s*\(Lyric(s)?\s*(Video)?\)', caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*\[Lyric(s)?\s*(Video)?\]', caseSensitive: false),
            '')
        .replaceAll(
            RegExp(r'\s*\(Audio\)', caseSensitive: false), '')
        .replaceAll(
            RegExp(r'\s*\[Audio\]', caseSensitive: false), '')
        .trim();
  }

  void dispose() {
    _yt.close();
  }
}
