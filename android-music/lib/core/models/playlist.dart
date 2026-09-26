import 'song.dart';

/// Represents a playlist in the app.
class Playlist {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final List<Song> songs;
  final String? source;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isUserCreated;

  const Playlist({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.songs = const [],
    this.source,
    required this.createdAt,
    required this.updatedAt,
    this.isUserCreated = false,
  });

  Playlist copyWith({
    String? id,
    String? name,
    String? description,
    String? imageUrl,
    List<Song>? songs,
    String? source,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isUserCreated,
  }) {
    return Playlist(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      songs: songs ?? this.songs,
      source: source ?? this.source,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isUserCreated: isUserCreated ?? this.isUserCreated,
    );
  }

  int get songCount => songs.length;

  Duration get totalDuration =>
      songs.fold(Duration.zero, (sum, song) => sum + song.duration);

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'imageUrl': imageUrl,
    'songs': songs.map((s) => s.toJson()).toList(),
    'source': source,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'isUserCreated': isUserCreated,
  };

  factory Playlist.fromJson(Map<String, dynamic> json) => Playlist(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    imageUrl: json['imageUrl'] as String?,
    songs: (json['songs'] as List<dynamic>?)
            ?.map((s) => Song.fromJson(s as Map<String, dynamic>))
            .toList() ??
        [],
    source: json['source'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    isUserCreated: json['isUserCreated'] as bool? ?? false,
  );
}

/// Search result wrapping songs from multiple sources.
class SearchResult {
  final String query;
  final List<Song> songs;
  final bool hasMore;
  final int page;

  const SearchResult({
    required this.query,
    required this.songs,
    this.hasMore = false,
    this.page = 1,
  });
}
