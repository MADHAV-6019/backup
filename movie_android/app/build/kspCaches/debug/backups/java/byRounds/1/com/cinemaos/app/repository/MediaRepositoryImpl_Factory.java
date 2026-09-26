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
public final class MediaRepositoryImpl_Factory implements Factory<MediaRepositoryImpl> {
  private final Provider<ProviderManager> providerManagerProvider;

  public MediaRepositoryImpl_Factory(Provider<ProviderManager> providerManagerProvider) {
    this.providerManagerProvider = providerManagerProvider;
  }

  @Override
  public MediaRepositoryImpl get() {
    return newInstance(providerManagerProvider.get());
  }

  public static MediaRepositoryImpl_Factory create(
      Provider<ProviderManager> providerManagerProvider) {
    return new MediaRepositoryImpl_Factory(providerManagerProvider);
  }

  public static MediaRepositoryImpl newInstance(ProviderManager providerManager) {
    return new MediaRepositoryImpl(providerManager);
  }
}
