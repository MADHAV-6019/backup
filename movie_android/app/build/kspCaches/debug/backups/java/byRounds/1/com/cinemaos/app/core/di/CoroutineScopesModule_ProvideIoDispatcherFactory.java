package com.cinemaos.app.core.di;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import kotlinx.coroutines.CoroutineDispatcher;

@ScopeMetadata
@QualifierMetadata("com.cinemaos.app.core.di.IoDispatcher")
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
public final class CoroutineScopesModule_ProvideIoDispatcherFactory implements Factory<CoroutineDispatcher> {
  @Override
  public CoroutineDispatcher get() {
    return provideIoDispatcher();
  }

  public static CoroutineScopesModule_ProvideIoDispatcherFactory create() {
    return InstanceHolder.INSTANCE;
  }

  public static CoroutineDispatcher provideIoDispatcher() {
    return Preconditions.checkNotNullFromProvides(CoroutineScopesModule.INSTANCE.provideIoDispatcher());
  }

  private static final class InstanceHolder {
    private static final CoroutineScopesModule_ProvideIoDispatcherFactory INSTANCE = new CoroutineScopesModule_ProvideIoDispatcherFactory();
  }
}
