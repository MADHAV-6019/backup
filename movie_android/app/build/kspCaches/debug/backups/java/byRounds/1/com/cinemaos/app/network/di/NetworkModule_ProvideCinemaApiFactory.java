package com.cinemaos.app.network.di;

import com.cinemaos.app.network.CinemaApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import retrofit2.Retrofit;

@ScopeMetadata("javax.inject.Singleton")
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
public final class NetworkModule_ProvideCinemaApiFactory implements Factory<CinemaApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideCinemaApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public CinemaApi get() {
    return provideCinemaApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideCinemaApiFactory create(Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideCinemaApiFactory(retrofitProvider);
  }

  public static CinemaApi provideCinemaApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideCinemaApi(retrofit));
  }
}
