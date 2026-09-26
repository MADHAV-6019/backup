package com.cinemaos.app.core.di;

import android.content.Context;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
@QualifierMetadata("dagger.hilt.android.qualifiers.ApplicationContext")
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
public final class CoreModule_ProvideApplicationContextFactory implements Factory<Context> {
  private final Provider<Context> contextProvider;

  public CoreModule_ProvideApplicationContextFactory(Provider<Context> contextProvider) {
    this.contextProvider = contextProvider;
  }

  @Override
  public Context get() {
    return provideApplicationContext(contextProvider.get());
  }

  public static CoreModule_ProvideApplicationContextFactory create(
      Provider<Context> contextProvider) {
    return new CoreModule_ProvideApplicationContextFactory(contextProvider);
  }

  public static Context provideApplicationContext(Context context) {
    return Preconditions.checkNotNullFromProvides(CoreModule.INSTANCE.provideApplicationContext(context));
  }
}
