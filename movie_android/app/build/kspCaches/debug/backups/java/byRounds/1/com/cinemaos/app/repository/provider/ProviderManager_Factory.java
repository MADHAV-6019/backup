package com.cinemaos.app.repository.provider;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

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
public final class ProviderManager_Factory implements Factory<ProviderManager> {
  private final Provider<DefaultCinemaProvider> defaultProvider;

  public ProviderManager_Factory(Provider<DefaultCinemaProvider> defaultProvider) {
    this.defaultProvider = defaultProvider;
  }

  @Override
  public ProviderManager get() {
    return newInstance(defaultProvider.get());
  }

  public static ProviderManager_Factory create(Provider<DefaultCinemaProvider> defaultProvider) {
    return new ProviderManager_Factory(defaultProvider);
  }

  public static ProviderManager newInstance(DefaultCinemaProvider defaultProvider) {
    return new ProviderManager(defaultProvider);
  }
}
