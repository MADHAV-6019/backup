package com.cinemaos.app.core.di;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import kotlinx.coroutines.CoroutineDispatcher;
import kotlinx.coroutines.CoroutineScope;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata({
    "com.cinemaos.app.core.di.ApplicationScope",
    "com.cinemaos.app.core.di.DefaultDispatcher"
})
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
public final class CoroutineScopesModule_ProvideApplicationScopeFactory implements Factory<CoroutineScope> {
  private final Provider<CoroutineDispatcher> defaultDispatcherProvider;

  public CoroutineScopesModule_ProvideApplicationScopeFactory(
      Provider<CoroutineDispatcher> defaultDispatcherProvider) {
    this.defaultDispatcherProvider = defaultDispatcherProvider;
  }

  @Override
  public CoroutineScope get() {
    return provideApplicationScope(defaultDispatcherProvider.get());
  }

  public static CoroutineScopesModule_ProvideApplicationScopeFactory create(
      Provider<CoroutineDispatcher> defaultDispatcherProvider) {
    return new CoroutineScopesModule_ProvideApplicationScopeFactory(defaultDispatcherProvider);
  }

  public static CoroutineScope provideApplicationScope(CoroutineDispatcher defaultDispatcher) {
    return Preconditions.checkNotNullFromProvides(CoroutineScopesModule.INSTANCE.provideApplicationScope(defaultDispatcher));
  }
}
