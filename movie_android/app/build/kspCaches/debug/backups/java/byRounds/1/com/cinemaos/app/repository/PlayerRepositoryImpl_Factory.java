package com.cinemaos.app.repository;

import com.cinemaos.app.repository.provider.ProviderManager;
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
public final class PlayerRepositoryImpl_Factory implements Factory<PlayerRepositoryImpl> {
  private final Provider<ProviderManager> providerManagerProvider;

  public PlayerRepositoryImpl_Factory(Provider<ProviderManager> providerManagerProvider) {
    this.providerManagerProvider = providerManagerProvider;
  }

  @Override
  public PlayerRepositoryImpl get() {
    return newInstance(providerManagerProvider.get());
  }

  public static PlayerRepositoryImpl_Factory create(
      Provider<ProviderManager> providerManagerProvider) {
    return new PlayerRepositoryImpl_Factory(providerManagerProvider);
  }

  public static PlayerRepositoryImpl newInstance(ProviderManager providerManager) {
    return new PlayerRepositoryImpl(providerManager);
  }
}
