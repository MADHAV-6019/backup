import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:html_unescape/html_unescape.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/core/models/playlist.dart';
import 'package:melody_flow/core/services/music_source.dart';

/// JioSaavn music source using public JioSaavn API endpoints.
/// No API key required — uses free, open-source hosted APIs.
class JioSaavnSource implements MusicSource {
  final Dio _dio;
  final HtmlUnescape _unescape = HtmlUnescape();

  /// Multiple API endpoints to try in order
  static const List<String> _apiEndpoints = [
    'https://saavn.dev',
    'https://saavn.me',
  ];

  /// Currently active endpoint
  int _currentEndpointIndex = 0;

  JioSaavnSource({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 10),
            ));

  String get _baseUrl => _apiEndpoints[_currentEndpointIndex];

  @override
  String get sourceName => 'jiosaavn';

  /// Makes a GET request, trying each API endpoint on failure
  Future<Response?> _getWithFallback(String path,
      {Map<String, dynamic>? queryParams}) async {
    for (int i = 0; i < _apiEndpoints.length; i++) {
      final endpoint = _apiEndpoints[(_currentEndpointIndex + i) % _apiEndpoints.length];
      try {
        debugPrint('[JioSaavn] Trying: $endpoint$path');
        final response = await _dio.get(
          '$endpoint$path',
          queryParameters: queryParams,
        );
        if (response.statusCode == 200) {
          // Remember this working endpoint
          _currentEndpointIndex = (_currentEndpointIndex + i) % _apiEndpoints.length;
          return response;
        }
      } catch (e) {
        debugPrint('[JioSaavn] ⚠️ $endpoint failed: $e');
        continue;
      }
    }
    return null;
  }

  @override
  Future<List<Song>> searchSongs(String query,
      {int page = 1, int limit = 20}) async {
    try {
      debugPrint('[JioSaavn] 🔍 Searching: "$query" (page=$page, limit=$limit)');
      final response = await _getWithFallback('/api/search/songs',
          queryParams: {
        'query': query,
        'page': page,
        'limit': limit,
      });

      if (response != null && response.data is Map) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] is Map) {
          final data = responseData['data'] as Map<String, dynamic>;
          final results = data['results'];
          if (results is! List) {
            debugPrint('[JioSaavn] Results is not a list: ${results.runtimeType}');
            return [];
          }
          debugPrint('[JioSaavn] ✅ Found ${results.length} results');
          return results
              .whereType<Map<String, dynamic>>()
              .map((item) {
                try {
                  return _mapToSong(item);
                } catch (e) {
                  debugPrint('[JioSaavn] ⚠️ Skipping song: $e');
                  return null;
                }
              })
              .whereType<Song>()
              .toList();
        }
      }
      debugPrint('[JioSaavn] ❌ All endpoints failed for search');
      return [];
    } catch (e) {
      debugPrint('[JioSaavn] ❌ Search error: $e');
      return [];
    }
  }

  @override
  Future<List<Song>> getTrending({int limit = 20}) async {
    try {
      debugPrint('[JioSaavn] 📈 Fetching trending (limit=$limit)');
      final response = await _getWithFallback('/api/search/songs',
          queryParams: {
        'query': 'trending hits',
        'limit': limit,
      });

      if (response != null && response.data is Map) {
        final responseData = response.data as Map<String, dynamic>;
        if (responseData['success'] == true && responseData['data'] is Map) {
          final data = responseData['data'] as Map<String, dynamic>;
          final results = data['results'];
          if (results is! List) return [];
          debugPrint('[JioSaavn] ✅ Got ${results.length} trending songs');
          return results
              .whereType<Map<String, dynamic>>()
              .map((item) {
                try {
                  return _mapToSong(item);
                } catch (e) {
                  debugPrint('[JioSaavn] ⚠️ Skipping song: $e');
                  return null;
                }
              })
              .whereType<Song>()
              .toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('[JioSaavn] ❌ Trending error: $e');
      return [];
    }
  }

  @override
  Future<String> getStreamUrl(String songId) async {
    try {
      debugPrint('[JioSaavn] 🎵 Getting stream URL for songId: $songId');
      final response = await _getWithFallback('/api/songs/$songId');

      if (response != null && response.data['success'] == true) {
        final data = response.data['data'];
        final songs = data is List ? data : [data];
        if (songs.isNotEmpty) {
          final url = _extractBestQualityUrl(songs[0]);
          debugPrint('[JioSaavn] ${url.isEmpty ? "❌ No download URL found" : "✅ Stream URL resolved (${url.length} chars)"}');
          return url;
        }
      }
      debugPrint('[JioSaavn] ❌ Failed to get stream URL');
      return '';
    } catch (e) {
      debugPrint('[JioSaavn] ❌ Stream URL error: $e');
      return '';
    }
  }

  @override
  Future<Song?> getSongDetails(String songId) async {
    try {
      final response = await _getWithFallback('/api/songs/$songId');
      if (response != null && response.data['success'] == true) {
        final data = response.data['data'];
        final songs = data is List ? data : [data];
        if (songs.isNotEmpty) {
          return _mapToSong(songs[0]);
        }
      }
      return null;
    } catch (e) {
      debugPrint('[JioSaavn] ❌ Song details error: $e');
      return null;
    }
  }

  @override
  Future<Playlist?> getPlaylist(String playlistId) async {
    try {
      final response = await _getWithFallback('/api/playlists',
          queryParams: {'id': playlistId});
      if (response != null && response.data['success'] == true) {
        final data = response.data['data'];
        final songs = (data['songs'] as List<dynamic>?)
                ?.map((item) => _mapToSong(item))
                .toList() ??
            [];

        return Playlist(
          id: playlistId,
          name: _unescape.convert(data['name'] ?? 'Unknown'),
          description: data['description'] != null
              ? _unescape.convert(data['description'])
              : null,
          imageUrl: _extractImageUrl(data['image']),
          songs: songs,
          source: sourceName,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  @override
  Future<List<Song>> getSuggestions(String songId, {int limit = 10}) async {
    try {
      final response = await _getWithFallback(
          '/api/songs/$songId/suggestions',
          queryParams: {'limit': limit});
      if (response != null && response.data['success'] == true) {
        final results = response.data['data'] as List<dynamic>?;
        if (results == null) return [];
        return results.map((item) => _mapToSong(item)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Song _mapToSong(Map<String, dynamic> item) {
    final rawDownload = item['downloadUrl'];
    final downloadUrls = rawDownload is List ? rawDownload : <dynamic>[];
    String streamUrl = '';

    // Extract the best quality download URL
    if (downloadUrls.isNotEmpty) {
      for (int i = downloadUrls.length - 1; i >= 0; i--) {
        final entry = downloadUrls[i];
        if (entry is Map) {
          final url = (entry['url'] ?? entry['link'] ?? '').toString();
          if (url.isNotEmpty) {
            streamUrl = url;
            break;
          }
        } else if (entry is String && entry.isNotEmpty) {
          streamUrl = entry;
          break;
        }
      }
    }

    final artists = item['artists'];
    String artistStr = '';
    if (artists is Map && artists['primary'] is List) {
      artistStr = (artists['primary'] as List)
          .map((a) => a is Map ? (a['name'] ?? '') : a.toString())
          .join(', ');
    } else if (artists is String) {
      artistStr = artists;
    } else if (item['primaryArtists'] != null) {
      artistStr = item['primaryArtists'].toString();
    } else if (item['artist'] != null) {
      artistStr = item['artist'].toString();
    }

    // Safely parse duration — could be int, String, or double
    int durationSeconds = 0;
    final rawDuration = item['duration'];
    if (rawDuration is int) {
      durationSeconds = rawDuration;
    } else if (rawDuration is double) {
      durationSeconds = rawDuration.round();
    } else if (rawDuration != null) {
      durationSeconds = int.tryParse(rawDuration.toString()) ?? 0;
    }

    // Safely parse album name
    String albumName = '';
    final rawAlbum = item['album'];
    if (rawAlbum is Map) {
      albumName = (rawAlbum['name'] ?? '').toString();
    } else if (rawAlbum is String) {
      albumName = rawAlbum;
    }

    return Song(
      id: 'js_${item['id']}',
      title: _unescape
          .convert((item['name'] ?? item['title'] ?? 'Unknown').toString()),
      artist: _unescape
          .convert(artistStr.isEmpty ? 'Unknown Artist' : artistStr),
      album: _unescape.convert(albumName),
      albumId: rawAlbum is Map ? rawAlbum['id']?.toString() : null,
      duration: Duration(seconds: durationSeconds),
      thumbnailUrl: _extractImageUrl(item['image']),
      highResThumbnailUrl: _extractHighResImageUrl(item['image']),
      streamUrl: streamUrl,
      source: sourceName,
      sourceId: item['id'].toString(),
      year: int.tryParse((item['year'] ?? '').toString()),
      language: item['language']?.toString(),
      hasLyrics: item['hasLyrics'] == true || item['hasLyrics'] == 'true',
    );
  }

  String _extractBestQualityUrl(Map<String, dynamic> item) {
    final downloadUrls = item['downloadUrl'] as List<dynamic>? ?? [];
    if (downloadUrls.isNotEmpty) {
      for (int i = downloadUrls.length - 1; i >= 0; i--) {
        final url =
            (downloadUrls[i]['url'] ?? downloadUrls[i]['link'] ?? '')
                .toString();
        if (url.isNotEmpty) return url;
      }
    }
    return '';
  }

  String _extractImageUrl(dynamic image) {
    if (image is List && image.isNotEmpty) {
      final idx = image.length > 2 ? 2 : image.length - 1;
      final entry = image[idx];
      if (entry is Map) {
        return (entry['url'] ?? entry['link'] ?? '').toString();
      } else if (entry is String) {
        return entry;
      }
    }
    if (image is String) return image;
    if (image is Map) {
      return (image['url'] ?? image['link'] ?? '').toString();
    }
    return '';
  }

  String _extractHighResImageUrl(dynamic image) {
    if (image is List && image.isNotEmpty) {
      final entry = image.last;
      if (entry is Map) {
        return (entry['url'] ?? entry['link'] ?? '').toString();
      } else if (entry is String) {
        return entry;
      }
    }
    if (image is String) return image;
    if (image is Map) {
      return (image['url'] ?? image['link'] ?? '').toString();
    }
    return '';
  }
}
