import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/data/repositories/music_repository.dart';

// ---------------------------------------------------------------------------
// Local audio proxy — spins up a tiny HTTP server on localhost that pipes
// youtube_explode's authenticated byte stream to ExoPlayer. This avoids
// 403 errors (ExoPlayer can't use YouTube CDN URLs directly) and avoids
// the need to download the entire file first.
// ---------------------------------------------------------------------------
class _AudioProxyServer {
  HttpServer? _server;
  final MusicRepository _repo;

  _AudioProxyServer(this._repo);

  int get port => _server?.port ?? 0;
  bool get isRunning => _server != null;

  Future<void> start() async {
    if (_server != null) return;
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    debugPrint('[Proxy] 🚀 Started on port ${_server!.port}');
    _server!.listen(_handleRequest);
  }

  void _handleRequest(HttpRequest request) async {
    final songId = request.uri.queryParameters['id'];
    if (songId == null) {
      request.response.statusCode = 400;
      await request.response.close();
      return;
    }

    debugPrint('[Proxy] 📥 Request for songId: $songId');

    try {
      final stream = await _repo.youtube.getAudioStream(songId);
      if (stream == null) {
        debugPrint('[Proxy] ❌ No stream available');
        request.response.statusCode = 404;
        await request.response.close();
        return;
      }

      request.response.headers.contentType = ContentType('audio', 'webm');
      request.response.statusCode = 200;

      int totalBytes = 0;
      await for (final chunk in stream) {
        request.response.add(chunk);
        totalBytes += chunk.length;
      }

      debugPrint('[Proxy] ✅ Streamed ${(totalBytes / 1024).toStringAsFixed(0)} KB');
      await request.response.close();
    } catch (e) {
      debugPrint('[Proxy] ❌ Error: $e');
      try {
        request.response.statusCode = 500;
        await request.response.close();
      } catch (_) {}
    }
  }

  /// Build a localhost URL that ExoPlayer can fetch from
  String buildUrl(String songId) {
    final id = songId.startsWith('yt_') ? songId.substring(3) : songId;
    return 'http://127.0.0.1:${_server!.port}/audio?id=$id';
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
  }
}

/// Manages audio playback state with just_audio.
class PlayerProvider extends ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();
  final MusicRepository _repo;
  late final _AudioProxyServer _proxy;

  List<Song> _queue = [];
  int _currentIndex = -1;
  bool _isPlaying = false;
  bool _isLoading = false;
  bool _isShuffle = false;
  String? _error;
  LoopMode _loopMode = LoopMode.off;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;

  /// Generation counter for cancellation
  int _playGeneration = 0;

  PlayerProvider({MusicRepository? repo})
      : _repo = repo ?? MusicRepository() {
    _proxy = _AudioProxyServer(_repo);
    _setupListeners();
    _initProxy();
  }

  Future<void> _initProxy() async {
    try {
      await _proxy.start();
    } catch (e) {
      debugPrint('[MelodyFlow] ❌ Proxy start failed: $e');
    }
  }

  AudioPlayer get audioPlayer => _player;
  List<Song> get queue => _queue;
  int get currentIndex => _currentIndex;
  Song? get currentSong =>
      _currentIndex >= 0 && _currentIndex < _queue.length
          ? _queue[_currentIndex]
          : null;
  bool get isPlaying => _isPlaying;
  bool get isLoading => _isLoading;
  bool get isShuffle => _isShuffle;
  String? get error => _error;
  LoopMode get loopMode => _loopMode;
  Duration get position => _position;
  Duration get duration => _duration;
  bool get hasNext => _currentIndex < _queue.length - 1;
  bool get hasPrevious => _currentIndex > 0;

  double get progress {
    if (_duration.inMilliseconds == 0) return 0;
    return _position.inMilliseconds / _duration.inMilliseconds;
  }

  Future<void> playSong(Song song) async {
    _queue = [song];
    _currentIndex = 0;
    await _loadAndPlay(song);
  }

  Future<void> playQueue(List<Song> songs, {int startIndex = 0}) async {
    if (songs.isEmpty) return;
    _queue = List.from(songs);
    _currentIndex = startIndex.clamp(0, songs.length - 1);
    await _loadAndPlay(_queue[_currentIndex]);
  }

  void addToQueue(Song song) {
    _queue.add(song);
    notifyListeners();
  }

  Future<void> playNext() async {
    if (!hasNext) {
      if (_loopMode == LoopMode.all && _queue.isNotEmpty) {
        _currentIndex = 0;
        await _loadAndPlay(_queue[_currentIndex]);
      }
      return;
    }
    _currentIndex++;
    await _loadAndPlay(_queue[_currentIndex]);
  }

  Future<void> playPrevious() async {
    if (_position.inSeconds > 3) {
      await seek(Duration.zero);
      return;
    }
    if (!hasPrevious) return;
    _currentIndex--;
    await _loadAndPlay(_queue[_currentIndex]);
  }

  Future<void> togglePlayPause() async {
    if (_isPlaying) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> seekToProgress(double value) async {
    final position = Duration(
      milliseconds: (_duration.inMilliseconds * value).round(),
    );
    await seek(position);
  }

  void toggleShuffle() {
    _isShuffle = !_isShuffle;
    if (_isShuffle && _queue.length > 1) {
      final current = _queue[_currentIndex];
      _queue.shuffle();
      _queue.remove(current);
      _queue.insert(0, current);
      _currentIndex = 0;
    }
    notifyListeners();
  }

  void cycleLoopMode() {
    switch (_loopMode) {
      case LoopMode.off:
        _loopMode = LoopMode.all;
        _player.setLoopMode(LoopMode.all);
        break;
      case LoopMode.all:
        _loopMode = LoopMode.one;
        _player.setLoopMode(LoopMode.one);
        break;
      case LoopMode.one:
        _loopMode = LoopMode.off;
        _player.setLoopMode(LoopMode.off);
        break;
    }
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Map<String, String> _getHeadersForSource(String source) {
    const userAgent =
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

    switch (source) {
      case 'jiosaavn':
        return {
          'User-Agent': userAgent,
          'Referer': 'https://www.jiosaavn.com/',
          'Origin': 'https://www.jiosaavn.com',
          'Accept': '*/*',
        };
      default:
        return {'User-Agent': userAgent};
    }
  }

  bool _isRetrying = false;

  Future<void> _loadAndPlay(Song song) async {
    final gen = ++_playGeneration;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('[MelodyFlow] 🎵 Loading: "${song.title}" by ${song.artist}');

      await _player.stop();

      if (song.source == 'youtube') {
        // ─── YouTube: use local proxy to stream ───
        if (!_proxy.isRunning) {
          await _proxy.start();
        }

        final proxyUrl = _proxy.buildUrl(song.sourceId);
        debugPrint('[MelodyFlow] ▶️ Playing via local proxy: $proxyUrl');

        if (gen != _playGeneration) return;

        await _player.setAudioSource(AudioSource.uri(Uri.parse(proxyUrl)));
        _player.play();
        _isLoading = false;
        _isRetrying = false;
        notifyListeners();
        debugPrint('[MelodyFlow] ✅ Playback started!');
      } else {
        // ─── JioSaavn / other: URL-based ───
        String url = song.streamUrl;

        if (url.isEmpty) {
          debugPrint('[MelodyFlow] 🔗 Resolving stream URL...');
          url = await _repo.resolveStreamUrl(song);
          if (gen != _playGeneration) return;
          if (url.isNotEmpty) {
            _queue[_currentIndex] = song.copyWith(streamUrl: url);
          }
        }

        if (url.isEmpty) {
          _error = 'Could not load "${song.title}".';
          _isLoading = false;
          notifyListeners();
          return;
        }

        final headers = _getHeadersForSource(song.source);
        if (gen != _playGeneration) return;

        await _player.setAudioSource(
            AudioSource.uri(Uri.parse(url), headers: headers));
        _player.play();
        _isLoading = false;
        _isRetrying = false;
        notifyListeners();
        debugPrint('[MelodyFlow] ✅ Playback started!');
      }
    } catch (e, stackTrace) {
      if (gen != _playGeneration) return;
      debugPrint('[MelodyFlow] ❌ ERROR: $e');
      debugPrint('[MelodyFlow] Stack: $stackTrace');

      if (!_isRetrying) {
        _isRetrying = true;
        final freshSong = song.copyWith(streamUrl: '');
        if (_currentIndex >= 0 && _currentIndex < _queue.length) {
          _queue[_currentIndex] = freshSong;
        }
        await _loadAndPlay(freshSong);
        return;
      }

      _isRetrying = false;
      _error = 'Playback failed for "${song.title}"';
      _isLoading = false;
      notifyListeners();
    }
  }

  void _setupListeners() {
    _player.playingStream.listen((playing) {
      _isPlaying = playing;
      notifyListeners();
    });

    _player.positionStream.listen((pos) {
      _position = pos;
      notifyListeners();
    });

    _player.durationStream.listen((dur) {
      _duration = dur ?? Duration.zero;
      notifyListeners();
    });

    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        if (_loopMode != LoopMode.one) {
          playNext();
        }
      }
    });

    _player.playbackEventStream.listen(
      (event) {},
      onError: (Object e, StackTrace stackTrace) {
        debugPrint('[MelodyFlow] ❌ Playback error: $e');
        _error = 'Audio playback error';
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  @override
  void dispose() {
    _player.dispose();
    _proxy.stop();
    _repo.dispose();
    super.dispose();
  }
}

String formatDuration(Duration duration) {
  final minutes = duration.inMinutes;
  final seconds = duration.inSeconds.remainder(60);
  return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
}
