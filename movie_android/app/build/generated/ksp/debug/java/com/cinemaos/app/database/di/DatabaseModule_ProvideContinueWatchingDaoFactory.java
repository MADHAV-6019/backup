package com.cinemaos.app.database.di;

import com.cinemaos.app.database.CinemaDatabase;
import com.cinemaos.app.database.dao.ContinueWatchingDao;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava"
})
public final class DatabaseModule_ProvideContinueWatchingDaoFactory implements Factory<ContinueWatchingDao> {
  private final Provider<CinemaDatabase> databaseProvider;

  public DatabaseModule_ProvideContinueWatchingDaoFactory(
      Provider<CinemaDatabase> databaseProvider) {
    this.databaseProvider = databaseProvider;
  }

  @Override
  public ContinueWatchingDao get() {
    return provideContinueWatchingDao(databaseProvider.get());
  }

  public static DatabaseModule_ProvideContinueWatchingDaoFactory create(
      Provider<CinemaDatabase> databaseProvider) {
    return new DatabaseModule_ProvideContinueWatchingDaoFactory(databaseProvider);
  }

  public static ContinueWatchingDao provideContinueWatchingDao(CinemaDatabase database) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideContinueWatchingDao(database));
  }
}
