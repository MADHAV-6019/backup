import 'package:flutter/material.dart';
import 'package:melody_flow/core/models/song.dart';
import 'package:melody_flow/data/repositories/music_repository.dart';

/// Manages search state across sources.
class SearchProvider extends ChangeNotifier {
  final MusicRepository _repo;

  String _query = '';
  List<Song> _results = [];
  bool _isSearching = false;
  String _activeSource = 'all';
  String? _error;

  SearchProvider({MusicRepository? repo})
      : _repo = repo ?? MusicRepository();

  String get query => _query;
  List<Song> get results => _results;
  bool get isSearching => _isSearching;
  String get activeSource => _activeSource;
  String? get error => _error;
  bool get hasResults => _results.isNotEmpty;

  Future<void> search(String query) async {
    if (query.trim().isEmpty) {
      clearSearch();
      return;
    }

    _query = query.trim();
    _isSearching = true;
    _error = null;
    notifyListeners();

    try {
      if (_activeSource == 'all') {
        _results = await _repo.searchAll(_query);
      } else {
        _results = await _repo.searchSource(_query, _activeSource);
      }
    } catch (e) {
      _error = 'Search failed. Please try again.';
      _results = [];
    }

    _isSearching = false;
    notifyListeners();
  }

  Future<void> setSource(String source) async {
    _activeSource = source;
    notifyListeners();

    if (_query.isNotEmpty) {
      await search(_query);
    }
  }

  void clearSearch() {
    _query = '';
    _results = [];
    _error = null;
    _isSearching = false;
    notifyListeners();
  }
}
