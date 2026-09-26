import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:melody_flow/core/models/song.dart';

/// Manages favorites and library state with Hive local storage.
class LibraryProvider extends ChangeNotifier {
  static const String _favoritesBoxName = 'favorites';
  static const String _recentBoxName = 'recent_songs';
  Box<String>? _favoritesBox;
  Box<String>? _recentBox;

  List<Song> _favorites = [];
  List<Song> _recentSongs = [];
  bool _isLoaded = false;

  List<Song> get favorites => _favorites;
  List<Song> get recentSongs => _recentSongs;
  bool get isLoaded => _isLoaded;

  Future<void> init() async {
    _favoritesBox = await Hive.openBox<String>(_favoritesBoxName);
    _recentBox = await Hive.openBox<String>(_recentBoxName);
    _loadFavorites();
    _loadRecent();
    _isLoaded = true;
    notifyListeners();
  }

  bool isFavorite(Song song) {
    return _favorites.any((s) => s.id == song.id);
  }

  Future<void> toggleFavorite(Song song) async {
    if (isFavorite(song)) {
      await removeFavorite(song);
    } else {
      await addFavorite(song);
    }
  }

  Future<void> addFavorite(Song song) async {
    if (!isFavorite(song)) {
      _favorites.insert(0, song);
      await _favoritesBox?.put(song.id, jsonEncode(song.toJson()));
      notifyListeners();
    }
  }

  Future<void> removeFavorite(Song song) async {
    _favorites.removeWhere((s) => s.id == song.id);
    await _favoritesBox?.delete(song.id);
    notifyListeners();
  }

  Future<void> addToRecent(Song song) async {
    _recentSongs.removeWhere((s) => s.id == song.id);
    _recentSongs.insert(0, song);

    if (_recentSongs.length > 50) {
      _recentSongs = _recentSongs.sublist(0, 50);
    }

    await _recentBox?.put(song.id, jsonEncode(song.toJson()));

    if ((_recentBox?.length ?? 0) > 50) {
      final keysToRemove = _recentBox!.keys.toList().sublist(50);
      for (final key in keysToRemove) {
        await _recentBox!.delete(key);
      }
    }

    notifyListeners();
  }

  void _loadFavorites() {
    if (_favoritesBox == null) return;
    _favorites = _favoritesBox!.values
        .map((json) {
          try {
            return Song.fromJson(jsonDecode(json) as Map<String, dynamic>);
          } catch (_) {
            return null;
          }
        })
        .whereType<Song>()
        .toList();
  }

  void _loadRecent() {
    if (_recentBox == null) return;
    _recentSongs = _recentBox!.values
        .map((json) {
          try {
            return Song.fromJson(jsonDecode(json) as Map<String, dynamic>);
          } catch (_) {
            return null;
          }
        })
        .whereType<Song>()
        .toList();
  }
}
