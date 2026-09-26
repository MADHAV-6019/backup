package com.cinemaos.app.viewmodels;

import androidx.lifecycle.SavedStateHandle;
import com.cinemaos.app.database.dao.ContinueWatchingDao;
import com.cinemaos.app.domain.repository.PlayerRepository;
import com.cinemaos.app.player.PlayerManager;
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
public final class PlayerViewModel_Factory implements Factory<PlayerViewModel> {
  private final Provider<PlayerRepository> repositoryProvider;

  private final Provider<ContinueWatchingDao> continueWatchingDaoProvider;

  private final Provider<PlayerManager> playerManagerProvider;

  private final Provider<SavedStateHandle> savedStateHandleProvider;

  public PlayerViewModel_Factory(Provider<PlayerRepository> repositoryProvider,
      Provider<ContinueWatchingDao> continueWatchingDaoProvider,
      Provider<PlayerManager> playerManagerProvider,
      Provider<SavedStateHandle> savedStateHandleProvider) {
    this.repositoryProvider = repositoryProvider;
    this.continueWatchingDaoProvider = continueWatchingDaoProvider;
    this.playerManagerProvider = playerManagerProvider;
    this.savedStateHandleProvider = savedStateHandleProvider;
  }

  @Override
  public PlayerViewModel get() {
    return newInstance(repositoryProvider.get(), continueWatchingDaoProvider.get(), playerManagerProvider.get(), savedStateHandleProvider.get());
  }

  public static PlayerViewModel_Factory create(Provider<PlayerRepository> repositoryProvider,
      Provider<ContinueWatchingDao> continueWatchingDaoProvider,
      Provider<PlayerManager> playerManagerProvider,
      Provider<SavedStateHandle> savedStateHandleProvider) {
    return new PlayerViewModel_Factory(repositoryProvider, continueWatchingDaoProvider, playerManagerProvider, savedStateHandleProvider);
  }

  public static PlayerViewModel newInstance(PlayerRepository repository,
      ContinueWatchingDao continueWatchingDao, PlayerManager playerManager,
      SavedStateHandle savedStateHandle) {
    return new PlayerViewModel(repository, continueWatchingDao, playerManager, savedStateHandle);
  }
}
