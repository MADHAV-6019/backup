package com.cinemaos.app.viewmodels;

import com.cinemaos.app.domain.usecase.SearchUseCase;
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
public final class SearchViewModel_Factory implements Factory<SearchViewModel> {
  private final Provider<SearchUseCase> searchUseCaseProvider;

  public SearchViewModel_Factory(Provider<SearchUseCase> searchUseCaseProvider) {
    this.searchUseCaseProvider = searchUseCaseProvider;
  }

  @Override
  public SearchViewModel get() {
    return newInstance(searchUseCaseProvider.get());
  }

  public static SearchViewModel_Factory create(Provider<SearchUseCase> searchUseCaseProvider) {
    return new SearchViewModel_Factory(searchUseCaseProvider);
  }

  public static SearchViewModel newInstance(SearchUseCase searchUseCase) {
    return new SearchViewModel(searchUseCase);
  }
}
