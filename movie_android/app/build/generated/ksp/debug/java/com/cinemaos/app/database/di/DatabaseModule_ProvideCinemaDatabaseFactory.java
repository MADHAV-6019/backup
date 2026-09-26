package com.cinemaos.app.database.di;

import android.content.Context;
import com.cinemaos.app.database.CinemaDatabase;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
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
public final class DatabaseModule_ProvideCinemaDatabaseFactory implements Factory<CinemaDatabase> {
  private final Provider<Context> contextProvider;

  public DatabaseModule_ProvideCinemaDatabaseFactory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public CinemaDatabase get() {
    return provideCinemaDatabase(contextProvider.get());
  }

  public static DatabaseModule_ProvideCinemaDatabaseFactory create(
      Provider<Context> contextProvider) {
    return new DatabaseModule_ProvideCinemaDatabaseFactory(contextProvider);
  }

  public static CinemaDatabase provideCinemaDatabase(Context context) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideCinemaDatabase(context));
  }
}
