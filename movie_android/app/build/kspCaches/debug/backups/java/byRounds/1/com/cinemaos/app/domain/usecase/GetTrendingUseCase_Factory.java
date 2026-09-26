package com.cinemaos.app.domain.usecase;

import com.cinemaos.app.domain.repository.MediaRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class GetTrendingUseCase_Factory implements Factory<GetTrendingUseCase> {
  private final Provider<MediaRepository> repositoryProvider;

  public GetTrendingUseCase_Factory(Provider<MediaRepository> repositoryProvider) {
    this.repositoryProvider = repositoryProvider;
  }

  @Override
  public GetTrendingUseCase get() {
    return newInstance(repositoryProvider.get());
  }

  public static GetTrendingUseCase_Factory create(Provider<MediaRepository> repositoryProvider) {
    return new GetTrendingUseCase_Factory(repositoryProvider);
  }

  public static GetTrendingUseCase newInstance(MediaRepository repository) {
    return new GetTrendingUseCase(repository);
  }
}
