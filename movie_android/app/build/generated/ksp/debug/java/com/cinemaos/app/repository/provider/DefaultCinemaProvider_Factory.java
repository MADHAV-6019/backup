package com.cinemaos.app.repository.provider;

import com.cinemaos.app.network.CinemaApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import kotlinx.serialization.json.Json;

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
public final class DefaultCinemaProvider_Factory implements Factory<DefaultCinemaProvider> {
  private final Provider<CinemaApi> apiProvider;

  private final Provider<Json> jsonProvider;

  public DefaultCinemaProvider_Factory(Provider<CinemaApi> apiProvider,
      Provider<Json> jsonProvider) {
    this.apiProvider = apiProvider;
    this.jsonProvider = jsonProvider;
  }

  @Override
  public DefaultCinemaProvider get() {
    return newInstance(apiProvider.get(), jsonProvider.get());
  }

  public static DefaultCinemaProvider_Factory create(Provider<CinemaApi> apiProvider,
      Provider<Json> jsonProvider) {
    return new DefaultCinemaProvider_Factory(apiProvider, jsonProvider);
  }

  public static DefaultCinemaProvider newInstance(CinemaApi api, Json json) {
    return new DefaultCinemaProvider(api, json);
  }
}
