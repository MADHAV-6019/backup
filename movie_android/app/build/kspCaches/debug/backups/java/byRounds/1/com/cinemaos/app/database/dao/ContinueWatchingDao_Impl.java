package com.cinemaos.app.database.dao;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import com.cinemaos.app.database.entity.ContinueWatchingEntity;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Integer;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class ContinueWatchingDao_Impl implements ContinueWatchingDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<ContinueWatchingEntity> __insertionAdapterOfContinueWatchingEntity;

  private final SharedSQLiteStatement __preparedStmtOfDeleteByMediaId;

  public ContinueWatchingDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfContinueWatchingEntity = new EntityInsertionAdapter<ContinueWatchingEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `continue_watching` (`mediaId`,`title`,`posterUrl`,`isTvShow`,`seasonNumber`,`episodeNumber`,`currentPositionMs`,`durationMs`,`lastWatchedTimestamp`) VALUES (?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final ContinueWatchingEntity entity) {
        statement.bindString(1, entity.getMediaId());
        statement.bindString(2, entity.getTitle());
        statement.bindString(3, entity.getPosterUrl());
        final int _tmp = entity.isTvShow() ? 1 : 0;
        statement.bindLong(4, _tmp);
        if (entity.getSeasonNumber() == null) {
          statement.bindNull(5);
        } else {
          statement.bindLong(5, entity.getSeasonNumber());
        }
        if (entity.getEpisodeNumber() == null) {
          statement.bindNull(6);
        } else {
          statement.bindLong(6, entity.getEpisodeNumber());
        }
        statement.bindLong(7, entity.getCurrentPositionMs());
        statement.bindLong(8, entity.getDurationMs());
        statement.bindLong(9, entity.getLastWatchedTimestamp());
      }
    };
    this.__preparedStmtOfDeleteByMediaId = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM continue_watching WHERE mediaId = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insertOrUpdate(final ContinueWatchingEntity entity,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfContinueWatchingEntity.insert(entity);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteByMediaId(final String mediaId,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteByMediaId.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, mediaId);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfDeleteByMediaId.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<ContinueWatchingEntity>> getAllContinueWatching() {
    final String _sql = "SELECT * FROM continue_watching ORDER BY lastWatchedTimestamp DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"continue_watching"}, new Callable<List<ContinueWatchingEntity>>() {
      @Override
      @NonNull
      public List<ContinueWatchingEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfMediaId = CursorUtil.getColumnIndexOrThrow(_cursor, "mediaId");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfPosterUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "posterUrl");
          final int _cursorIndexOfIsTvShow = CursorUtil.getColumnIndexOrThrow(_cursor, "isTvShow");
          final int _cursorIndexOfSeasonNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "seasonNumber");
          final int _cursorIndexOfEpisodeNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "episodeNumber");
          final int _cursorIndexOfCurrentPositionMs = CursorUtil.getColumnIndexOrThrow(_cursor, "currentPositionMs");
          final int _cursorIndexOfDurationMs = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMs");
          final int _cursorIndexOfLastWatchedTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "lastWatchedTimestamp");
          final List<ContinueWatchingEntity> _result = new ArrayList<ContinueWatchingEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final ContinueWatchingEntity _item;
            final String _tmpMediaId;
            _tmpMediaId = _cursor.getString(_cursorIndexOfMediaId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpPosterUrl;
            _tmpPosterUrl = _cursor.getString(_cursorIndexOfPosterUrl);
            final boolean _tmpIsTvShow;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsTvShow);
            _tmpIsTvShow = _tmp != 0;
            final Integer _tmpSeasonNumber;
            if (_cursor.isNull(_cursorIndexOfSeasonNumber)) {
              _tmpSeasonNumber = null;
            } else {
              _tmpSeasonNumber = _cursor.getInt(_cursorIndexOfSeasonNumber);
            }
            final Integer _tmpEpisodeNumber;
            if (_cursor.isNull(_cursorIndexOfEpisodeNumber)) {
              _tmpEpisodeNumber = null;
            } else {
              _tmpEpisodeNumber = _cursor.getInt(_cursorIndexOfEpisodeNumber);
            }
            final long _tmpCurrentPositionMs;
            _tmpCurrentPositionMs = _cursor.getLong(_cursorIndexOfCurrentPositionMs);
            final long _tmpDurationMs;
            _tmpDurationMs = _cursor.getLong(_cursorIndexOfDurationMs);
            final long _tmpLastWatchedTimestamp;
            _tmpLastWatchedTimestamp = _cursor.getLong(_cursorIndexOfLastWatchedTimestamp);
            _item = new ContinueWatchingEntity(_tmpMediaId,_tmpTitle,_tmpPosterUrl,_tmpIsTvShow,_tmpSeasonNumber,_tmpEpisodeNumber,_tmpCurrentPositionMs,_tmpDurationMs,_tmpLastWatchedTimestamp);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getByMediaId(final String mediaId,
      final Continuation<? super ContinueWatchingEntity> $completion) {
    final String _sql = "SELECT * FROM continue_watching WHERE mediaId = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, mediaId);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<ContinueWatchingEntity>() {
      @Override
      @Nullable
      public ContinueWatchingEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfMediaId = CursorUtil.getColumnIndexOrThrow(_cursor, "mediaId");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfPosterUrl = CursorUtil.getColumnIndexOrThrow(_cursor, "posterUrl");
          final int _cursorIndexOfIsTvShow = CursorUtil.getColumnIndexOrThrow(_cursor, "isTvShow");
          final int _cursorIndexOfSeasonNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "seasonNumber");
          final int _cursorIndexOfEpisodeNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "episodeNumber");
          final int _cursorIndexOfCurrentPositionMs = CursorUtil.getColumnIndexOrThrow(_cursor, "currentPositionMs");
          final int _cursorIndexOfDurationMs = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMs");
          final int _cursorIndexOfLastWatchedTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "lastWatchedTimestamp");
          final ContinueWatchingEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpMediaId;
            _tmpMediaId = _cursor.getString(_cursorIndexOfMediaId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpPosterUrl;
            _tmpPosterUrl = _cursor.getString(_cursorIndexOfPosterUrl);
            final boolean _tmpIsTvShow;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfIsTvShow);
            _tmpIsTvShow = _tmp != 0;
            final Integer _tmpSeasonNumber;
            if (_cursor.isNull(_cursorIndexOfSeasonNumber)) {
              _tmpSeasonNumber = null;
            } else {
              _tmpSeasonNumber = _cursor.getInt(_cursorIndexOfSeasonNumber);
            }
            final Integer _tmpEpisodeNumber;
            if (_cursor.isNull(_cursorIndexOfEpisodeNumber)) {
              _tmpEpisodeNumber = null;
            } else {
              _tmpEpisodeNumber = _cursor.getInt(_cursorIndexOfEpisodeNumber);
            }
            final long _tmpCurrentPositionMs;
            _tmpCurrentPositionMs = _cursor.getLong(_cursorIndexOfCurrentPositionMs);
            final long _tmpDurationMs;
            _tmpDurationMs = _cursor.getLong(_cursorIndexOfDurationMs);
            final long _tmpLastWatchedTimestamp;
            _tmpLastWatchedTimestamp = _cursor.getLong(_cursorIndexOfLastWatchedTimestamp);
            _result = new ContinueWatchingEntity(_tmpMediaId,_tmpTitle,_tmpPosterUrl,_tmpIsTvShow,_tmpSeasonNumber,_tmpEpisodeNumber,_tmpCurrentPositionMs,_tmpDurationMs,_tmpLastWatchedTimestamp);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
