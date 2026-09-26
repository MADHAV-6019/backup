package com.cinemaos.app.viewmodels;

import com.cinemaos.app.domain.usecase.GetTrendingUseCase;
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
public final class HomeViewModel_Factory implements Factory<HomeViewModel> {
  private final Provider<GetTrendingUseCase> getTrendingUseCaseProvider;

  public HomeViewModel_Factory(Provider<GetTrendingUseCase> getTrendingUseCaseProvider) {
    this.getTrendingUseCaseProvider = getTrendingUseCaseProvider;
  }

  @Override
  public HomeViewModel get() {
    return newInstance(getTrendingUseCaseProvider.get());
  }

  public static HomeViewModel_Factory create(
      Provider<GetTrendingUseCase> getTrendingUseCaseProvider) {
    return new HomeViewModel_Factory(getTrendingUseCaseProvider);
  }

  public static HomeViewModel newInstance(GetTrendingUseCase getTrendingUseCase) {
    return new HomeViewModel(getTrendingUseCase);
  }
}
