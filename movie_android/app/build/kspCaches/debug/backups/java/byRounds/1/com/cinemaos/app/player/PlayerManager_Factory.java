package com.cinemaos.app.player;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;

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
public final class PlayerManager_Factory implements Factory<PlayerManager> {
  @Override
  public PlayerManager get() {
    return newInstance();
  }

  public static PlayerManager_Factory create() {
    return InstanceHolder.INSTANCE;
  }

  public static PlayerManager newInstance() {
    return new PlayerManager();
  }

  private static final class InstanceHolder {
    private static final PlayerManager_Factory INSTANCE = new PlayerManager_Factory();
  }
}
