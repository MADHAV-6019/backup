/// Unified Song model used across the app.
/// All music sources map their data to this common format.
class Song {
  final String id;
  final String title;
  final String artist;
  final String album;
  final String? albumId;
  final Duration duration;
  final String thumbnailUrl;
  final String? highResThumbnailUrl;
  final String streamUrl;
  final String source; // 'jiosaavn' or 'youtube'
  final String sourceId; // Original ID from the source
  final int? year;
  final String? language;
  final bool hasLyrics;
  final Map<String, dynamic>? extras;

  const Song({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    this.albumId,
    required this.duration,
    required this.thumbnailUrl,
    this.highResThumbnailUrl,
    required this.streamUrl,
    required this.source,
    required this.sourceId,
    this.year,
    this.language,
    this.hasLyrics = false,
    this.extras,
  });

  Song copyWith({
    String? id,
    String? title,
    String? artist,
    String? album,
    String? albumId,
    Duration? duration,
    String? thumbnailUrl,
    String? highResThumbnailUrl,
    String? streamUrl,
    String? source,
    String? sourceId,
    int? year,
    String? language,
    bool? hasLyrics,
    Map<String, dynamic>? extras,
  }) {
    return Song(
      id: id ?? this.id,
      title: title ?? this.title,
      artist: artist ?? this.artist,
      album: album ?? this.album,
      albumId: albumId ?? this.albumId,
      duration: duration ?? this.duration,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      highResThumbnailUrl: highResThumbnailUrl ?? this.highResThumbnailUrl,
      streamUrl: streamUrl ?? this.streamUrl,
      source: source ?? this.source,
      sourceId: sourceId ?? this.sourceId,
      year: year ?? this.year,
      language: language ?? this.language,
      hasLyrics: hasLyrics ?? this.hasLyrics,
      extras: extras ?? this.extras,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'artist': artist,
    'album': album,
    'albumId': albumId,
    'duration': duration.inMilliseconds,
    'thumbnailUrl': thumbnailUrl,
    'highResThumbnailUrl': highResThumbnailUrl,
    'streamUrl': streamUrl,
    'source': source,
    'sourceId': sourceId,
    'year': year,
    'language': language,
    'hasLyrics': hasLyrics,
  };

  factory Song.fromJson(Map<String, dynamic> json) => Song(
    id: json['id'] as String,
    title: json['title'] as String,
    artist: json['artist'] as String,
    album: json['album'] as String,
    albumId: json['albumId'] as String?,
    duration: Duration(milliseconds: json['duration'] as int),
    thumbnailUrl: json['thumbnailUrl'] as String,
    highResThumbnailUrl: json['highResThumbnailUrl'] as String?,
    streamUrl: json['streamUrl'] as String,
    source: json['source'] as String,
    sourceId: json['sourceId'] as String,
    year: json['year'] as int?,
    language: json['language'] as String?,
    hasLyrics: json['hasLyrics'] as bool? ?? false,
  );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Song && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Song(title: $title, artist: $artist, source: $source)';
}
