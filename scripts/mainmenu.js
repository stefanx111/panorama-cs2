/// <reference path="csgo.d.ts" />
/// <reference path="common/characteranims.ts" />
/// <reference path="common/licenseutil.ts" />
/// <reference path="common/promoted_settings.ts" />
/// <reference path="popups/popup_acknowledge_item.ts" />
/// <reference path="inspect.ts" />
/// <reference path="avatar.ts" />
/// <reference path="vanity_player_info.ts" />
/// <reference path="particle_controls.ts" />
var MainMenu = (function () {
    const _m_bPerfectWorld = (MyPersonaAPI.GetLauncherType() === "perfectworld");
    let _m_activeTab = null;
    let _m_sideBarElementContextMenuActive = false;
    const _m_elContentPanel = $('#JsMainMenuContent');
    let _m_playedInitalFadeUp = false;
    const _m_elNotificationsContainer = $('#NotificationsContainer');
    let _m_notificationSchedule = false;
    let _m_bVanityAnimationAlreadyStarted = false;
    let _m_bHasPopupNotification = false;
    let _m_tLastSeenDisconnectedFromGC = 0;
    const _m_NotificationBarColorClasses = [
        "NotificationRed", "NotificationYellow", "NotificationGreen", "NotificationLoggingOn"
    ];
    let _m_LobbyPlayerUpdatedEventHandler = null;
    let _m_LobbyMatchmakingSessionUpdateEventHandler = null;
    let _m_LobbyForceRestartVanityEventHandler = null;
    let _m_LobbyMainMenuSwitchVanityEventHandler = null;
    let _m_UiSceneFrameBoundaryEventHandler = null;
    let _m_storePopupElement = null;
    let m_TournamentPickBanPopup = null;
    let _m_hOnEngineSoundSystemsRunningRegisterHandle = null;
    let _m_jobFetchTournamentData = null;
    const TOURNAMENT_FETCH_DELAY = 10;
    const nNumNewSettings = UpdateSettingsMenuAlert();
    const m_MainMenuTopBarParticleFX = $('#MainMenuNavigateParticles');
    ParticleControls.UpdateMainMenuTopBar(m_MainMenuTopBarParticleFX, '');
    function UpdateSettingsMenuAlert() {
        let elNewSettingsAlert = $("#MainMenuSettingsAlert");
        if (elNewSettingsAlert) {
            let nNewSettings = PromotedSettingsUtil.GetUnacknowledgedPromotedSettings().length;
            elNewSettingsAlert.SetHasClass("has-new-settings", nNewSettings > 0);
            elNewSettingsAlert.SetDialogVariable("num_settings", nNewSettings.toString());
            return nNewSettings;
        }
        return 0;
    }
    if (nNumNewSettings > 0) {
        const hPromotedSettingsViewedEvt = $.RegisterForUnhandledEvent("MainMenu_PromotedSettingsViewed", function () {
            UpdateSettingsMenuAlert();
            $.UnregisterForUnhandledEvent("MainMenu_PromotedSettingsViewed", hPromotedSettingsViewedEvt);
        });
    }
    const _OnInitFadeUp = function () {
        if (!_m_playedInitalFadeUp) {
            $('#MainMenuContainerPanel').TriggerClass('show');
            _m_playedInitalFadeUp = true;
            _RegisterOnShowEvents();
            _UpdateBackgroundMap();
            _ShowUpdateWelcomePopup();
        }
    };
    function _FetchTournamentData() {
        if (_m_jobFetchTournamentData)
            return;
        TournamentsAPI.RequestTournaments();
        _m_jobFetchTournamentData = $.Schedule(TOURNAMENT_FETCH_DELAY, function () {
            _m_jobFetchTournamentData = null;
            _FetchTournamentData();
        });
    }
    function _StopFetchingTournamentData() {
        if (_m_jobFetchTournamentData) {
            $.CancelScheduled(_m_jobFetchTournamentData);
            _m_jobFetchTournamentData = null;
        }
    }
    const _UpdateBackgroundMap = function () {
        let backgroundMap = GameInterfaceAPI.GetSettingString('ui_mainmenu_bkgnd_movie');
        backgroundMap = !backgroundMap ? 'de_dust2_vanity' : 'de_' + backgroundMap + '_vanity';
        let elMapPanel = $('#JsMainmenu_Vanity');
        if (!(elMapPanel && elMapPanel.IsValid())) {
            elMapPanel = $.CreatePanel('MapVanityPreviewPanel', $('#JsMainmenu_Vanity-Container'), 'JsMainmenu_Vanity', {
                "require-composition-layer": "true",
                "pin-fov": "vertical",
                class: 'align-preview',
                camera: 'cam_default',
                player: "true",
                playermodel: "",
                map: backgroundMap,
                playername: "vanity_character",
                animgraphcharactermode: 'main-menu',
                initial_entity: 'vanity_character',
                mouse_rotate: 'false',
                parallax_degrees: ".5",
                parallax_offset: "200.0"
            });
            elMapPanel.Data().loadedMap = backgroundMap;
        }
        else if (elMapPanel.Data().loadedMap !== backgroundMap) {
            elMapPanel.SwitchMap(backgroundMap);
            elMapPanel.Data().loadedMap = backgroundMap;
        }
        if (backgroundMap === 'de_nuke_vanity') {
            elMapPanel.FireEntityInput('main_light', 'SetBrightness', '2');
            elMapPanel.FireEntityInput('main_light', 'Enable');
        }
        InspectModelImage.HidePanelItemEntities(elMapPanel);
        return elMapPanel;
    };
    const _RegisterOnShowEvents = function () {
        if (!_m_LobbyMatchmakingSessionUpdateEventHandler && !GameStateAPI.IsLocalPlayerPlayingMatch()) {
            _m_LobbyMatchmakingSessionUpdateEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_Lobby_MatchmakingSessionUpdate", MainMenu.LobbyPlayerUpdated);
            _m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", MainMenu.LobbyPlayerUpdated);
            _m_LobbyForceRestartVanityEventHandler = $.RegisterForUnhandledEvent("ForceRestartVanity", MainMenu.ForceRestartVanity);
            _m_LobbyMainMenuSwitchVanityEventHandler = $.RegisterForUnhandledEvent("MainMenuSwitchVanity", MainMenu.SwitchVanity);
        }
        if (!_m_UiSceneFrameBoundaryEventHandler) {
            _m_UiSceneFrameBoundaryEventHandler = $.RegisterForUnhandledEvent("UISceneFrameBoundary", _OnUISceneFrameBoundary);
        }
    };
    const _OnShowMainMenu = function () {
        $.DispatchEvent('PlayMainMenuMusic', true, true);
        _RegisterOnShowEvents();
        _m_bVanityAnimationAlreadyStarted = false;
        _LobbyPlayerUpdated();
        _OnInitFadeUp();
        $('#MainMenuNavBarPlay').SetHasClass('pausemenu-navbar__btn-small--hidden', false);
        _UpdateNotifications();
        _ShowWeaponUpdatePopup();
        _UpdateInventoryBtnAlert();
        _GcLogonNotificationReceived();
        _DeleteSurvivalEndOfMatch();
        _DeletePauseMenuMissionPanel();
        _ShowHideAlertForNewEventForWatchBtn();
        _UpdateUnlockCompAlert();
        _FetchTournamentData();
        $('#MainMenuNavBarHome').checked = true;
    };
    const _TournamentDraftUpdate = function () {
        if (!m_TournamentPickBanPopup || !m_TournamentPickBanPopup.IsValid()) {
            m_TournamentPickBanPopup = UiToolkitAPI.ShowCustomLayoutPopup('tournament_pickban_popup', 'file://{resources}/layout/popups/popup_tournament_pickban.xml');
        }
    };
    let _m_bGcLogonNotificationReceivedOnce = false;
    const _GcLogonNotificationReceived = function () {
        if (_m_bGcLogonNotificationReceivedOnce)
            return;
        const strFatalError = MyPersonaAPI.GetClientLogonFatalError();
        if (strFatalError
            && (strFatalError !== "ShowGameLicenseNoOnlineLicensePW")
            && (strFatalError !== "ShowGameLicenseNoOnlineLicense")) {
            _m_bGcLogonNotificationReceivedOnce = true;
            if (strFatalError === "ShowGameLicenseNeedToLinkAccountsWithMoreInfo") {
                UiToolkitAPI.ShowGenericPopupThreeOptionsBgStyle("#CSGO_Purchasable_Game_License_Short", "#SFUI_LoginLicenseAssist_PW_NeedToLinkAccounts_WW_hint", "", "#UI_Yes", function () { SteamOverlayAPI.OpenURL("https://community.csgo.com.cn/join/pwlink_csgo"); }, "#UI_No", function () { }, "#ShowFAQ", function () { _OnGcLogonNotificationReceived_ShowFaqCallback(); }, "dim");
            }
            else if (strFatalError === "ShowGameLicenseNeedToLinkAccounts") {
                _OnGcLogonNotificationReceived_ShowLicenseYesNoBox("#SFUI_LoginLicenseAssist_PW_NeedToLinkAccounts", "https://community.csgo.com.cn/join/pwlink_csgo");
            }
            else if (strFatalError === "ShowGameLicenseHasLicensePW") {
                _OnGcLogonNotificationReceived_ShowLicenseYesNoBox("#SFUI_LoginLicenseAssist_HasLicense_PW", "https://community.csgo.com.cn/join/pwlink_csgo?needlicense=1");
            }
            else if (strFatalError === "ShowGameLicenseNoOnlineLicensePW") {
            }
            else if (strFatalError === "ShowGameLicenseNoOnlineLicense") {
            }
            else {
                UiToolkitAPI.ShowGenericPopupOneOptionBgStyle("#SFUI_LoginPerfectWorld_Title_Error", strFatalError, "", "#GameUI_Quit", function () { GameInterfaceAPI.ConsoleCommand("quit"); }, "dim");
            }
            return;
        }
        const nAntiAddictionTrackingState = MyPersonaAPI.GetTimePlayedTrackingState();
        if (nAntiAddictionTrackingState > 0) {
            _m_bGcLogonNotificationReceivedOnce = true;
            const pszDialogTitle = "#SFUI_LoginPerfectWorld_Title_Info";
            let pszDialogMessageText = "#SFUI_LoginPerfectWorld_AntiAddiction1";
            let pszOverlayUrlToOpen = null;
            if (nAntiAddictionTrackingState != 2) {
                pszDialogMessageText = "#SFUI_LoginPerfectWorld_AntiAddiction2";
                pszOverlayUrlToOpen = "https://community.csgo.com.cn/join/pwcompleteaccountinfo";
            }
            if (pszOverlayUrlToOpen) {
                UiToolkitAPI.ShowGenericPopupYesNo(pszDialogTitle, pszDialogMessageText, "", function () { SteamOverlayAPI.OpenURL(pszOverlayUrlToOpen); }, function () { });
            }
            else {
                UiToolkitAPI.ShowGenericPopup(pszDialogTitle, pszDialogMessageText, "");
            }
            return;
        }
    };
    let _m_numGameMustExitNowForAntiAddictionHandled = 0;
    let _m_panelGameMustExitDialog = null;
    const _GameMustExitNowForAntiAddiction = function () {
        if (_m_panelGameMustExitDialog && _m_panelGameMustExitDialog.IsValid())
            return;
        if (_m_numGameMustExitNowForAntiAddictionHandled >= 100)
            return;
        ++_m_numGameMustExitNowForAntiAddictionHandled;
        _m_panelGameMustExitDialog =
            UiToolkitAPI.ShowGenericPopupOneOptionBgStyle("#GameUI_QuitConfirmationTitle", "#UI_AntiAddiction_ExitGameNowMessage", "", "#GameUI_Quit", function () { GameInterfaceAPI.ConsoleCommand("quit"); }, "dim");
    };
    const _OnGcLogonNotificationReceived_ShowLicenseYesNoBox = function (strTextMessage, pszOverlayUrlToOpen) {
        UiToolkitAPI.ShowGenericPopupTwoOptionsBgStyle("#CSGO_Purchasable_Game_License_Short", strTextMessage, "", "#UI_Yes", function () { SteamOverlayAPI.OpenURL(pszOverlayUrlToOpen); }, "#UI_No", function () { }, "dim");
    };
    const _OnGcLogonNotificationReceived_ShowFaqCallback = function () {
        SteamOverlayAPI.OpenURL("https://support.steampowered.com/kb_article.php?ref=6026-IFKZ-7043&l=schinese");
        _m_bGcLogonNotificationReceivedOnce = false;
        _GcLogonNotificationReceived();
    };
    const _OnHideMainMenu = function () {
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (vanityPanel) {
            CharacterAnims.CancelScheduledAnim(vanityPanel);
        }
        _m_elContentPanel.RemoveClass('mainmenu-content--animate');
        _m_elContentPanel.AddClass('mainmenu-content--offscreen');
        _CancelNotificationSchedule();
        _UnregisterShowEvents();
        UiToolkitAPI.CloseAllVisiblePopups();
        _StopFetchingTournamentData();
    };
    const _UnregisterShowEvents = function () {
        if (_m_LobbyMatchmakingSessionUpdateEventHandler) {
            $.UnregisterForUnhandledEvent("PanoramaComponent_Lobby_MatchmakingSessionUpdate", _m_LobbyMatchmakingSessionUpdateEventHandler);
            _m_LobbyMatchmakingSessionUpdateEventHandler = null;
        }
        if (_m_LobbyPlayerUpdatedEventHandler) {
            $.UnregisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", _m_LobbyPlayerUpdatedEventHandler);
            _m_LobbyPlayerUpdatedEventHandler = null;
        }
        if (_m_LobbyForceRestartVanityEventHandler) {
            $.UnregisterForUnhandledEvent("ForceRestartVanity", _m_LobbyForceRestartVanityEventHandler);
            _m_LobbyForceRestartVanityEventHandler = null;
        }
        if (_m_LobbyMainMenuSwitchVanityEventHandler) {
            $.UnregisterForUnhandledEvent("MainMenuSwitchVanity", _m_LobbyMainMenuSwitchVanityEventHandler);
            _m_LobbyMainMenuSwitchVanityEventHandler = null;
        }
        if (_m_UiSceneFrameBoundaryEventHandler) {
            $.UnregisterForUnhandledEvent("UISceneFrameBoundary", _m_UiSceneFrameBoundaryEventHandler);
            _m_UiSceneFrameBoundaryEventHandler = null;
        }
    };
    const _OnShowPauseMenu = function () {
        const elContextPanel = $.GetContextPanel();
        elContextPanel.AddClass('MainMenuRootPanel--PauseMenuMode');
        const bMultiplayer = elContextPanel.IsMultiplayer();
        const bQueuedMatchmaking = GameStateAPI.IsQueuedMatchmaking();
        const bTraining = elContextPanel.IsTraining();
        const bGotvSpectating = elContextPanel.IsGotvSpectating();
        const bIsCommunityServer = !_m_bPerfectWorld && MatchStatsAPI.IsConnectedToCommunityServer();
        $('#MainMenuNavBarPlay').SetHasClass('pausemenu-navbar__btn-small--hidden', true);
        $('#MainMenuNavBarSwitchTeams').SetHasClass('pausemenu-navbar__btn-small--hidden', (bTraining || bQueuedMatchmaking || bGotvSpectating));
        $('#MainMenuNavBarVote').SetHasClass('pausemenu-navbar__btn-small--hidden', (bTraining || bGotvSpectating));
        $('#MainMenuNavBarReportServer').SetHasClass('pausemenu-navbar__btn-small--hidden', !bIsCommunityServer);
        _UpdateSurvivalEndOfMatchInstance();
        _AddPauseMenuMissionPanel();
        _OnHomeButtonPressed();
    };
    const _OnHidePauseMenu = function () {
        $.GetContextPanel().RemoveClass('MainMenuRootPanel--PauseMenuMode');
        _DeletePauseMenuMissionPanel();
        _OnHomeButtonPressed();
    };
    const _BCheckTabCanBeOpenedRightNow = function (tab) {
        if (tab === 'JsInventory') {
            const restrictions = LicenseUtil.GetCurrentLicenseRestrictions();
            if (restrictions !== false) {
                LicenseUtil.ShowLicenseRestrictions(restrictions);
                return false;
            }
        }
        if (tab === 'JsInventory' || tab === 'JsPlayerStats' || tab === 'JsLoadout') {
            if (!MyPersonaAPI.IsInventoryValid() || !MyPersonaAPI.IsConnectedToGC()) {
                UiToolkitAPI.ShowGenericPopupOk($.Localize('#SFUI_SteamConnectionErrorTitle'), $.Localize('#SFUI_Steam_Error_LinkUnexpected'), '', function () { });
                return false;
            }
        }
        return true;
    };
    const _CanOpenStatsPanel = function () {
        if (GameInterfaceAPI.GetSettingString('ui_show_subscription_alert') !== '1') {
            GameInterfaceAPI.SetSettingString('ui_show_subscription_alert', '1');
        }
        _UpdateSubscriptionAlert();
        const rtRecurringSubscriptionNextBillingCycle = InventoryAPI.GetCacheTypeElementFieldByIndex('RecurringSubscription', 0, 'time_next_cycle');
        if (!rtRecurringSubscriptionNextBillingCycle) {
            $.DispatchEvent('OpenSubscriptionUpsell');
            const rtTimeInitiated = InventoryAPI.GetCacheTypeElementFieldByIndex('RecurringSubscription', 0, 'time_initiated');
            if (rtTimeInitiated)
                return true;
            else
                return false;
        }
        return true;
    };
    const _NavigateToTab = function (tab, XmlName) {
        if (!_BCheckTabCanBeOpenedRightNow(tab)) {
            _OnHomeButtonPressed();
            return;
        }
        if (tab === 'JsPlayerStats' && !_CanOpenStatsPanel()) {
            return;
        }
        $.DispatchEvent('PlayMainMenuMusic', true, false);
        GameInterfaceAPI.SetSettingString('panorama_play_movie_ambient_sound', '0');
        if (!$.GetContextPanel().FindChildInLayoutFile(tab)) {
            const newPanel = $.CreatePanel('Panel', _m_elContentPanel, tab);
            newPanel.BLoadLayout('file://{resources}/layout/' + XmlName + '.xml', false, false);
            newPanel.SetReadyForDisplay(false);
            newPanel.RegisterForReadyEvents(true);
            $.RegisterEventHandler('PropertyTransitionEnd', newPanel, function (panel, propertyName) {
                if (newPanel.id === panel.id && propertyName === 'opacity') {
                    if (newPanel.visible === true && newPanel.BIsTransparent()) {
                        newPanel.visible = false;
                        newPanel.SetReadyForDisplay(false);
                        return true;
                    }
                    else if (newPanel.visible === true) {
                        $.DispatchEvent('MainMenuTabShown', tab);
                    }
                }
                return false;
            });
        }
        ParticleControls.UpdateMainMenuTopBar(m_MainMenuTopBarParticleFX, tab);
        if (_m_activeTab !== tab) {
            if (XmlName) {
                let soundName = '';
                if (XmlName === 'loadout_grid') {
                    soundName = 'UIPanorama.tab_mainmenu_loadout';
                }
                else {
                    soundName = 'tab_' + XmlName.replace('/', '_');
                }
                $.DispatchEvent('CSGOPlaySoundEffect', soundName, 'MOUSE');
            }
            if (_m_activeTab) {
                $.GetContextPanel().CancelDrag();
                const panelToHide = $.GetContextPanel().FindChildInLayoutFile(_m_activeTab);
                panelToHide.AddClass('mainmenu-content--hidden');
            }
            _m_activeTab = tab;
            const activePanel = $.GetContextPanel().FindChildInLayoutFile(tab);
            activePanel.RemoveClass('mainmenu-content--hidden');
            activePanel.visible = true;
            activePanel.SetReadyForDisplay(true);
            _PauseMainMenuCharacter();
        }
        _ShowContentPanel();
    };
    const _ShowContentPanel = function () {
        if (_m_elContentPanel.BHasClass('mainmenu-content--offscreen')) {
            _m_elContentPanel.AddClass('mainmenu-content--animate');
            _m_elContentPanel.RemoveClass('mainmenu-content--offscreen');
        }
        $.GetContextPanel().AddClass("mainmenu-content--open");
        $.DispatchEvent('ShowContentPanel');
        _DimMainMenuBackground(false);
        _HideNewsAndStore();
    };
    const _OnHideContentPanel = function () {
        _m_elContentPanel.AddClass('mainmenu-content--animate');
        _m_elContentPanel.AddClass('mainmenu-content--offscreen');
        $.GetContextPanel().RemoveClass("mainmenu-content--open");
        const elActiveNavBarBtn = _GetActiveNavBarButton();
        if (elActiveNavBarBtn && elActiveNavBarBtn.id !== 'MainMenuNavBarHome') {
            elActiveNavBarBtn.checked = false;
        }
        _DimMainMenuBackground(true);
        if (_m_activeTab) {
            $.GetContextPanel().CancelDrag();
            const panelToHide = $.GetContextPanel().FindChildInLayoutFile(_m_activeTab);
            panelToHide.AddClass('mainmenu-content--hidden');
        }
        _m_activeTab = '';
        _ShowNewsAndStore();
    };
    const _GetActiveNavBarButton = function () {
        const elNavBar = $('#MainMenuNavBarTop');
        const children = elNavBar.Children();
        const count = children.length;
        for (let i = 0; i < count; i++) {
            if (children[i].IsSelected()) {
                return children[i];
            }
        }
    };
    const _ShowHideNavDrawer = function () {
        UiToolkitAPI.ShowCustomLayoutPopup('', 'file://{resources}/layout/popups/popup_navdrawer.xml');
    };
    const _ExpandSidebar = function (AutoClose = false) {
        const elSidebar = $('#JsMainMenuSidebar');
        if (elSidebar.BHasClass('mainmenu-sidebar--minimized')) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'sidemenu_slidein', 'MOUSE');
        }
        elSidebar.RemoveClass('mainmenu-sidebar--minimized');
        _SlideSearchPartyParticles(true);
        $.DispatchEvent('SidebarIsCollapsed', false);
        _DimMainMenuBackground(false);
        if (AutoClose) {
            $.Schedule(1, _MinimizeSidebar);
        }
    };
    const _MinimizeSidebar = function () {
        if (_m_elContentPanel == null) {
            return;
        }
        if (_m_sideBarElementContextMenuActive) {
            return;
        }
        const elSidebar = $('#JsMainMenuSidebar');
        if (!elSidebar.BHasClass('mainmenu-sidebar--minimized')) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'sidemenu_slideout', 'MOUSE');
        }
        elSidebar.AddClass('mainmenu-sidebar--minimized');
        _SlideSearchPartyParticles(false);
        $.DispatchEvent('SidebarIsCollapsed', true);
        _DimMainMenuBackground(true);
    };
    const _OnSideBarElementContextMenuActive = function (bActive) {
        _m_sideBarElementContextMenuActive = bActive;
        $.Schedule(0.25, () => {
            if (!$('#JsMainMenuSidebar').BHasHoverStyle())
                _MinimizeSidebar();
        });
        _DimMainMenuBackground(false);
    };
    const _DimMainMenuBackground = function (removeDim) {
        if (removeDim && _m_elContentPanel.BHasClass('mainmenu-content--offscreen') &&
            $('#mainmenu-content__blur-target').BHasHoverStyle() === false) {
            $('#MainMenuBackground').RemoveClass('Dim');
        }
        else
            $('#MainMenuBackground').AddClass('Dim');
    };
    function _OnHomeButtonPressed() {
        $.DispatchEvent('HideContentPanel');
        ParticleControls.UpdateMainMenuTopBar(m_MainMenuTopBarParticleFX, '');
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (vanityPanel) {
            vanityPanel.Pause();
        }
        $('#MainMenuNavBarHome').checked = true;
    }
    function _OnQuitButtonPressed() {
        UiToolkitAPI.ShowGenericPopupOneOptionCustomCancelBgStyle('#UI_ConfirmExitTitle', '#UI_ConfirmExitMessage', '', '#UI_Quit', function () {
            QuitGame('Option1');
        }, '#UI_Return', function () {
        }, 'dim');
    }
    function QuitGame(msg) {
        GameInterfaceAPI.ConsoleCommand('quit');
    }
    const _InitFriendsList = function () {
        const friendsList = $.CreatePanel('Panel', $.FindChildInContext('#mainmenu-sidebar__blur-target'), 'JsFriendsList');
        friendsList.BLoadLayout('file://{resources}/layout/friendslist.xml', false, false);
    };
    const _InitNewsAndStore = function () {
        _AddStream();
        const elNews = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsNewsPanel');
        elNews.BLoadLayout('file://{resources}/layout/mainmenu_news.xml', false, false);
        const elLastMatch = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsLastMatch', {
            useglobalcontext: 'true'
        });
        elLastMatch.BLoadLayout('file://{resources}/layout/mainmenu_lastmatch.xml', false, false);
        const elStore = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsStorePanel');
        elStore.BLoadLayout('file://{resources}/layout/mainmenu_store.xml', false, false);
        const bFeaturedPanelIsActive = false;
        if (bFeaturedPanelIsActive) {
            _AddFeaturedPanel('operation/operation_mainmenu.xml', 'JsOperationPanel');
        }
        _AddWatchNoticePanel();
        _ShowNewsAndStore();
    };
    const _AddStream = function () {
        const elStream = $.CreatePanel('Panel', $.FindChildInContext('#JsStreamContainer'), 'JsStreamPanel', {
            useglobalcontext: 'true'
        });
        elStream.BLoadLayout('file://{resources}/layout/mainmenu_stream.xml', false, false);
    };
    const _AddFeaturedPanel = function (xmlPath, panelId) {
        const featuredXML = 'file://{resources}/layout/' + xmlPath;
        const elPanel = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), panelId, {
            useglobalcontext: 'true'
        });
        elPanel.BLoadLayout(featuredXML, false, false);
        $.FindChildInContext('#JsNewsContainer').MoveChildBefore(elPanel, $.FindChildInContext('#JsNewsPanel'));
        const overrideStyle = (featuredXML.indexOf('tournament') !== -1 || featuredXML.indexOf('operation') !== -1) ?
            '' :
            'news-panel-style-feature-panel-visible';
        if (overrideStyle !== '') {
            $.FindChildInContext('#JsNewsContainer').SetHasClass(overrideStyle, true);
        }
    };
    const _HideMainMenuNewsPanel = function () {
        const elNews = $.FindChildInContext('#JsNewsContainer');
        elNews.SetHasClass('news-panel--hide-news-panel', true);
        elNews.SetHasClass('news-panel-style-feature-panel-visible', false);
    };
    const _AddWatchNoticePanel = function () {
        const WatchNoticeXML = 'file://{resources}/layout/mainmenu_watchnotice.xml';
        const elPanel = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsWatchNoticePanel');
        $.FindChildInContext('#JsNewsContainer').MoveChildAfter(elPanel, $("#JsNewsPanel"));
        elPanel.BLoadLayout(WatchNoticeXML, false, false);
    };
    const _ShowNewsAndStore = function () {
        $.FindChildInContext('#JsNewsContainer').SetHasClass('hidden', false);
        $.FindChildInContext('#JsActiveMissionPanel').SetHasClass('hidden', false);
        $.FindChildInContext('#MainMenuVanityInfo').SetHasClass('hidden', false);
        const elVanityButton = $.FindChildInContext('#VanityControls');
        if (elVanityButton) {
            elVanityButton.visible = true;
        }
        $.FindChildInContext('#JsStreamContainer').SetHasClass('hidden', false);
    };
    const _HideNewsAndStore = function () {
        $.FindChildInContext('#JsNewsContainer').SetHasClass('hidden', true);
        $.FindChildInContext('#JsActiveMissionPanel').SetHasClass('hidden', true);
        $.FindChildInContext('#JsActiveMissionPanel').SetHasClass('hidden', true);
        $.FindChildInContext('#MainMenuVanityInfo').SetHasClass('hidden', true);
        const elVanityButton = $.FindChildInContext('#VanityControls');
        if (elVanityButton) {
            elVanityButton.visible = false;
        }
        $.FindChildInContext('#JsStreamContainer').SetHasClass('hidden', true);
    };
    const _OnSteamIsPlaying = function () {
        const elNewsContainer = $.FindChildInContext('#JsNewsContainer');
        if (elNewsContainer) {
            elNewsContainer.SetHasClass('mainmenu-news-container-stream-active', EmbeddedStreamAPI.IsVideoPlaying());
        }
    };
    const _ResetNewsEntryStyle = function () {
        const elNewsContainer = $.FindChildInContext('#JsNewsContainer');
        if (elNewsContainer) {
            elNewsContainer.RemoveClass('mainmenu-news-container-stream-active');
        }
    };
    const _UpdatePartySearchSetControlPointParticles = function (cp, xpos, ypos, zpos) {
        let particle_container = $('#party-search-particles');
        particle_container.StopParticlesImmediately(true);
        particle_container.StartParticles();
        particle_container.SetControlPoint(cp, 0, 1 + ypos, zpos);
        particle_container.SetControlPoint(cp, xpos, ypos, zpos);
    };
    let m_numPlayersActuallyInParty = 0;
    const _UpdatePartySearchParticles = function () {
        let particle_container = $('#party-search-particles');
        let numPlayersActuallyInParty;
        let AddServerErrors = 0;
        var serverWarning = NewsAPI.GetCurrentActiveAlertForUser();
        var isWarning = serverWarning !== '' && serverWarning !== undefined ? true : false;
        if (isWarning)
            AddServerErrors = 5;
        let strStatus = LobbyAPI.GetMatchmakingStatusString();
        if ((strStatus === '' || strStatus === null) && particle_container.type === "ParticleScenePanel") {
            particle_container.StopParticlesImmediately(true);
            return;
        }
        if (!LobbyAPI.IsSessionActive() || strStatus === '' || strStatus === null) {
            particle_container.StopParticlesImmediately(true);
            return;
        }
        else {
            particle_container.StartParticles();
        }
        numPlayersActuallyInParty = PartyListAPI.GetCount();
        if (numPlayersActuallyInParty > 0 && m_numPlayersActuallyInParty != numPlayersActuallyInParty) {
            m_numPlayersActuallyInParty = numPlayersActuallyInParty;
            let verticlSpread = 14 + (numPlayersActuallyInParty - 1) * 5 + AddServerErrors;
            _UpdatePartySearchSetControlPointParticles(1, verticlSpread, .5, 1);
            _UpdatePartySearchSetControlPointParticles(2, 1, .25, 0);
            _UpdatePartySearchSetControlPointParticles(16, 15, 230, 15);
        }
        else {
            let verticlSpread = 14 + (numPlayersActuallyInParty - 1) * 5 + AddServerErrors;
            _UpdatePartySearchSetControlPointParticles(1, verticlSpread, .5, 1);
            _UpdatePartySearchSetControlPointParticles(2, 1, .25, 0);
            particle_container.SetControlPoint(3, 0, 1, 0);
            particle_container.SetControlPoint(3, 1, 0, 0);
        }
    };
    const _ForceRestartVanity = function () {
        if (GameStateAPI.IsLocalPlayerPlayingMatch()) {
            return;
        }
        _m_bVanityAnimationAlreadyStarted = false;
        _InitVanity();
    };
    function _RigVanityHover(vanityPanel) {
    }
    let m_aDisplayLobbyVanityData = [];
    const _InitVanity = function () {
        if (MatchStatsAPI.GetUiExperienceType()) {
            return;
        }
        if (!MyPersonaAPI.IsInventoryValid()) {
            return;
        }
        if (_m_bVanityAnimationAlreadyStarted) {
            return;
        }
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (!vanityPanel) {
            return;
        }
        _m_bVanityAnimationAlreadyStarted = true;
        if (vanityPanel.BHasClass('hidden')) {
            vanityPanel.RemoveClass('hidden');
        }
        _UpdateLocalPlayerVanity();
    };
    const _UpdateLocalPlayerVanity = function () {
        const oSettings = ItemInfo.GetOrUpdateVanityCharacterSettings();
        const oLocalPlayer = m_aDisplayLobbyVanityData.filter(storedEntry => { return storedEntry.isLocalPlayer === true; });
        oSettings.playeridx = oLocalPlayer.length > 0 ? oLocalPlayer[0].playeridx : 0;
        oSettings.xuid = MyPersonaAPI.GetXuid();
        oSettings.isLocalPlayer = true;
        _ApplyVanitySettingsToLobbyMetadata(oSettings);
        _UpdatePlayerVanityModel(oSettings);
        _CreatUpdateVanityInfo(oSettings);
    };
    const _ApplyVanitySettingsToLobbyMetadata = function (oSettings) {
        PartyListAPI.SetLocalPlayerVanityPresence(oSettings.team, oSettings.charItemId, oSettings.glovesItemId, oSettings.loadoutSlot, oSettings.weaponItemId);
    };
    const _UpdatePlayerVanityModel = function (oSettings) {
        const vanityPanel = _UpdateBackgroundMap();
        vanityPanel.SetActiveCharacter(oSettings.playeridx);
        oSettings.panel = vanityPanel;
        CharacterAnims.PlayAnimsOnPanel(oSettings);
    };
    const _CreatUpdateVanityInfo = function (oSettings) {
        $.Schedule(.1, () => {
            const elVanityPlayerInfo = VanityPlayerInfo.CreateUpdateVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), oSettings);
            if (elVanityPlayerInfo) {
                $.GetContextPanel().FindChildInLayoutFile('MainMenuVanityParent').AddBlurPanel(elVanityPlayerInfo.FindChildInLayoutFile('vanity-info-name'));
            }
        });
    };
    const _LobbyPlayerUpdated = function () {
        _UpdatePartySearchParticles();
        let numPlayersActuallyInParty = PartyListAPI.GetCount();
        if (!LobbyAPI.IsSessionActive() || MatchStatsAPI.GetUiExperienceType() || numPlayersActuallyInParty < 1 || !numPlayersActuallyInParty) {
            _ClearLobbyPlayers();
            _m_bVanityAnimationAlreadyStarted = false;
            $.Schedule(.1, _InitVanity);
            return;
        }
        const maxSlots = 5;
        const aCurrentLobbyVanityData = [];
        if (numPlayersActuallyInParty > 0) {
            numPlayersActuallyInParty = (numPlayersActuallyInParty > maxSlots) ? maxSlots : numPlayersActuallyInParty;
            for (let k = 0; k < numPlayersActuallyInParty; k++) {
                const xuid = PartyListAPI.GetXuidByIndex(k);
                aCurrentLobbyVanityData.push({
                    xuid: xuid,
                    isLocalPlayer: xuid === MyPersonaAPI.GetXuid(),
                    playeridx: k,
                    vanity_data: PartyListAPI.GetPartyMemberVanity(xuid)
                });
            }
            _CompareLobbyPlayers(aCurrentLobbyVanityData);
        }
        else {
            _ClearLobbyPlayers();
            _ForceRestartVanity();
        }
    };
    const _CompareLobbyPlayers = function (aCurrentLobbyVanityData) {
        const maxSlots = 5;
        for (let i = 0; i < maxSlots; i++) {
            if (aCurrentLobbyVanityData[i]) {
                if (!m_aDisplayLobbyVanityData[i]) {
                    m_aDisplayLobbyVanityData[i] = {
                        xuid: "",
                        playeridx: 0,
                        vanity_data: "",
                        isLocalPlayer: false
                    };
                }
                m_aDisplayLobbyVanityData[i].playeridx = aCurrentLobbyVanityData[i].playeridx;
                m_aDisplayLobbyVanityData[i].isLocalPlayer = aCurrentLobbyVanityData[i].isLocalPlayer;
                if (m_aDisplayLobbyVanityData[i].xuid !== aCurrentLobbyVanityData[i].xuid) {
                    VanityPlayerInfo.DeleteVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), aCurrentLobbyVanityData[i].playeridx);
                    if (aCurrentLobbyVanityData[i].isLocalPlayer) {
                        _UpdateLocalPlayerVanity();
                    }
                }
                m_aDisplayLobbyVanityData[i].xuid = aCurrentLobbyVanityData[i].xuid;
                if (m_aDisplayLobbyVanityData[i].vanity_data !== aCurrentLobbyVanityData[i].vanity_data) {
                    if (!aCurrentLobbyVanityData[i].isLocalPlayer && aCurrentLobbyVanityData[i].vanity_data) {
                        _UpdateVanityFromLobbyUpdate(aCurrentLobbyVanityData[i].vanity_data, aCurrentLobbyVanityData[i].playeridx, aCurrentLobbyVanityData[i].xuid);
                    }
                }
                _CreatUpdateVanityInfo(aCurrentLobbyVanityData[i]);
                m_aDisplayLobbyVanityData[i].vanity_data = aCurrentLobbyVanityData[i].vanity_data;
            }
            else if (m_aDisplayLobbyVanityData[i]) {
                _ClearLobbyVanityModel(m_aDisplayLobbyVanityData[i].playeridx);
                delete m_aDisplayLobbyVanityData[i];
            }
        }
    };
    const _ClearLobbyPlayers = function () {
        m_aDisplayLobbyVanityData.forEach((element, index) => {
            _ClearLobbyVanityModel(index);
        });
        m_aDisplayLobbyVanityData = [];
    };
    const _ClearLobbyVanityModel = function (index) {
        VanityPlayerInfo.DeleteVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), index);
        $('#JsMainmenu_Vanity').SetActiveCharacter(index);
        $('#JsMainmenu_Vanity').RemoveCharacterModel();
    };
    const _UpdateVanityFromLobbyUpdate = function (strVanityData, index, xuid) {
        const arrVanityInfo = strVanityData.split(',');
        const oSettings = {
            xuid: xuid,
            team: arrVanityInfo[0],
            charItemId: arrVanityInfo[1],
            glovesItemId: arrVanityInfo[2],
            loadoutSlot: arrVanityInfo[3],
            weaponItemId: arrVanityInfo[4],
            playeridx: index
        };
        _UpdatePlayerVanityModel(oSettings);
    };
    const _PlayerActivityVoice = function (xuid) {
        const vanityPanel = $('#JsMainmenu_Vanity');
        const elAvatar = vanityPanel.FindChildInLayoutFile('JsPlayerVanityAvatar-' + xuid);
        if (elAvatar && elAvatar.IsValid()) {
            VanityPlayerInfo.UpdateVoiceIcon(elAvatar, xuid);
        }
    };
    const _OnUISceneFrameBoundary = function () {
        const maxSlots = 5;
        const elVanityPanel = $('#JsMainmenu_Vanity');
        if (elVanityPanel && elVanityPanel.IsValid()) {
            const elVanityPlayerInfoParent = $.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo');
            for (let i = 0; i < maxSlots; i++) {
                if (elVanityPanel.SetActiveCharacter(i) === true) {
                    const oPanelPos = elVanityPanel.GetBonePositionInPanelSpace('pelvis');
                    oPanelPos.y -= 0.0;
                    VanityPlayerInfo.SetVanityInfoPanelPos(elVanityPlayerInfoParent, i, oPanelPos);
                }
            }
        }
    };
    const _OnEquipSlotChanged = function () {
    };
    const _OpenPlayMenu = function () {
        if (MatchStatsAPI.GetUiExperienceType())
            return;
        _InsureSessionCreated();
        _NavigateToTab('JsPlay', 'mainmenu_play');
        _PauseMainMenuCharacter();
        $.DispatchEvent('OnOpenPlayMenu');
    };
    const _OpenWatchMenu = function () {
        _PauseMainMenuCharacter();
        _NavigateToTab('JsWatch', 'mainmenu_watch');
    };
    const _OpenInventory = function () {
        _PauseMainMenuCharacter();
        _NavigateToTab('JsInventory', 'mainmenu_inventory');
    };
    const _OpenStatsMenu = function () {
        _PauseMainMenuCharacter();
        _NavigateToTab('JsPlayerStats', 'mainmenu_playerstats');
    };
    const _OpenSubscriptionUpsell = function () {
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_subscription_upsell.xml', '');
    };
    const _ShowLoadoutForItem = function (itemId) {
        if (!$.GetContextPanel().FindChildInLayoutFile('JsLoadout')) {
            $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarLoadout'), "mouse");
            $.DispatchEvent("ShowLoadoutForItem", itemId);
            return;
        }
        $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarLoadout'), "mouse");
    };
    const _OpenSettings = function () {
        MainMenu.NavigateToTab('JsSettings', 'settings/settings');
    };
    const _PreloadSettings = function () {
        const tab = 'JsSettings';
        const XmlName = 'settings/settings';
        const newPanel = $.CreatePanel('Panel', _m_elContentPanel, tab);
        newPanel.BLoadLayout('file://{resources}/layout/' + XmlName + '.xml', false, false);
        newPanel.RegisterForReadyEvents(true);
        newPanel.AddClass('mainmenu-content--hidden');
        $.RegisterEventHandler('PropertyTransitionEnd', newPanel, function (panelName, propertyName) {
            if (newPanel.id === panelName && propertyName === 'opacity') {
                if (newPanel.visible === true && newPanel.BIsTransparent()) {
                    newPanel.visible = false;
                    newPanel.SetReadyForDisplay(false);
                    return true;
                }
                else if (newPanel.visible === true) {
                    $.DispatchEvent('MainMenuTabShown', tab);
                }
            }
            return false;
        });
    };
    const _InsureSessionCreated = function () {
        if (!LobbyAPI.IsSessionActive()) {
            LobbyAPI.CreateSession();
        }
    };
    const _OnEscapeKeyPressed = function () {
        if (_m_activeTab)
            _OnHomeButtonPressed();
        else
            GameInterfaceAPI.ConsoleCommand("gameui_hide");
    };
    const _InventoryUpdated = function () {
        _ForceRestartVanity();
        _UpdateInventoryBtnAlert();
        _UpdateSubscriptionAlert();
    };
    const _UpdateInventoryBtnAlert = function () {
        const aNewItems = AcknowledgeItems.GetItems();
        const count = aNewItems.length;
        const elNavBar = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarTop'), elAlert = elNavBar.FindChildInLayoutFile('MainMenuInvAlert');
        elAlert.SetDialogVariable("alert_value", count.toString());
        elAlert.SetHasClass('hidden', count < 1);
    };
    const _OnInventoryInspect = function (id) {
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', `itemid=${id}&inspectonly=true&viewfunc=primary`);
    };
    const _OnShowXrayCasePopup = function (toolid, caseId, bShowPopupWarning = false) {
        const showpopup = bShowPopupWarning ? 'yes' : 'no';
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=' + toolid + ',' + caseId +
            '&' + 'asyncworktype=decodeable' +
            '&' + 'isxraymode=yes' +
            '&' + 'showxraypopup=' + showpopup);
    };
    let JsInspectCallback = -1;
    const _OnLootlistItemPreview = function (id, params) {
        if (JsInspectCallback != -1) {
            UiToolkitAPI.UnregisterJSCallback(JsInspectCallback);
            JsInspectCallback = -1;
        }
        const ParamsList = params.split(',');
        const keyId = ParamsList[0];
        const caseId = ParamsList[1];
        const storeId = ParamsList[2];
        const blurOperationPanel = ParamsList[3];
        const extrapopupfullscreenstyle = ParamsList[4];
        const aParamsForCallback = ParamsList.slice(5);
        const showMarketLinkDefault = _m_bPerfectWorld ? 'false' : 'true';
        JsInspectCallback = UiToolkitAPI.RegisterJSCallback(() => _OpenDecodeAfterInspect(keyId, caseId, storeId, extrapopupfullscreenstyle, aParamsForCallback));
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
            '&' + 'inspectonly=true' +
            '&' + 'allowsave=false' +
            '&' + 'showequip=false' +
            '&' + 'showitemcert=false' +
            '&' + blurOperationPanel +
            '&' + 'extrapopupfullscreenstyle=' + extrapopupfullscreenstyle +
            '&' + 'showmarketlink=' + showMarketLinkDefault +
            '&' + 'callback=' + JsInspectCallback);
    };
    const _OpenDecodeAfterInspect = function (keyId, caseId, storeId, extrapopupfullscreenstyle, aParamsForCallback) {
        const backtostoreiteminspectsettings = storeId ?
            '&' + 'asyncworkitemwarning=no' +
                '&' + 'asyncforcehide=true' +
                '&' + 'storeitemid=' + storeId +
                '&' + 'extrapopupfullscreenstyle=' + extrapopupfullscreenstyle
            : '';
        const backtodecodeparams = aParamsForCallback.length > 0 ?
            '&' + aParamsForCallback.join('&') :
            '';
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=' + keyId + ',' + caseId +
            '&' + 'asyncworktype=decodeable' +
            backtostoreiteminspectsettings +
            backtodecodeparams);
    };
    const _WeaponPreviewRequest = function (id, bWorkshopItemPreview = false) {
        const workshopPreview = bWorkshopItemPreview ? 'true' : 'false';
        UiToolkitAPI.CloseAllVisiblePopups();
        if (ItemInfo.ItemHasCapability(id, 'decodable')) {
            UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
                '&' + 'asyncworktype=decodeable');
            return;
        }
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
            '&' + 'inspectonly=true' +
            '&' + 'allowsave=false' +
            '&' + 'showequip=false' +
            '&' + 'showitemcert=true' +
            '&' + 'workshopPreview=' + workshopPreview);
    };
    const _UpdateSubscriptionAlert = function () {
        const elNavBar = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarTop'), elAlert = elNavBar.FindChildInLayoutFile('MainMenuSubscriptionAlert');
        elAlert.SetDialogVariable("alert_value", $.Localize("#Store_Price_New"));
        const hideAlert = GameInterfaceAPI.GetSettingString('ui_show_subscription_alert') === '1' ? true : false;
        elAlert.SetHasClass('hidden', hideAlert);
    };
    function _CancelNotificationSchedule() {
        if (_m_notificationSchedule !== false) {
            $.CancelScheduled(_m_notificationSchedule);
            _m_notificationSchedule = false;
        }
    }
    function _AcknowledgePenaltyNotificationsCallback() {
        CompetitiveMatchAPI.ActionAcknowledgePenalty();
        _m_bHasPopupNotification = false;
    }
    function _AcknowledgeMsgNotificationsCallback() {
        MyPersonaAPI.ActionAcknowledgeNotifications();
        _m_bHasPopupNotification = false;
    }
    function _GetPopupNotification() {
        const popupNotification = {
            title: "",
            msg: "",
            color_class: "NotificationYellow",
            callback: function () { },
            html: false
        };
        const nBanRemaining = CompetitiveMatchAPI.GetCooldownSecondsRemaining();
        if (nBanRemaining < 0) {
            popupNotification.title = "#SFUI_MainMenu_Competitive_Ban_Confirm_Title";
            popupNotification.msg = $.Localize("#SFUI_CooldownExplanationReason_Expired_Cooldown") + $.Localize(CompetitiveMatchAPI.GetCooldownReason());
            popupNotification.callback = _AcknowledgePenaltyNotificationsCallback;
            popupNotification.html = true;
            return popupNotification;
        }
        const strNotifications = MyPersonaAPI.GetMyNotifications();
        if (strNotifications !== "") {
            const arrayOfNotifications = strNotifications.split(',');
            arrayOfNotifications.forEach(function (notificationType) {
                if (notificationType !== "6") {
                    popupNotification.color_class = 'NotificationBlue';
                }
                popupNotification.title = '#SFUI_PersonaNotification_Title_' + notificationType;
                popupNotification.msg = '#SFUI_PersonaNotification_Msg_' + notificationType;
                popupNotification.callback = _AcknowledgeMsgNotificationsCallback;
                return true;
            });
            return popupNotification;
        }
        return null;
    }
    function _UpdatePopupnotification() {
        if (!_m_bHasPopupNotification) {
            const popupNotification = _GetPopupNotification();
            if (popupNotification != null) {
                const elPopup = UiToolkitAPI.ShowGenericPopupOneOption(popupNotification.title, popupNotification.msg, popupNotification.color_class, '#SFUI_MainMenu_ConfirmBan', popupNotification.callback);
                if (popupNotification.html)
                    elPopup.EnableHTML();
                _m_bHasPopupNotification = true;
            }
        }
    }
    function _GetNotificationBarData() {
        const notification = { color_class: "", title: "", tooltip: "", link: "" };
        if (LicenseUtil.GetCurrentLicenseRestrictions() === false) {
            const bIsConnectedToGC = MyPersonaAPI.IsConnectedToGC();
            $('#MainMenuInput').SetHasClass('GameClientConnectingToGC', !bIsConnectedToGC);
            if (bIsConnectedToGC) {
                _m_tLastSeenDisconnectedFromGC = 0;
            }
            else if (!_m_tLastSeenDisconnectedFromGC) {
                _m_tLastSeenDisconnectedFromGC = +new Date();
            }
            else if (Math.abs((+new Date()) - _m_tLastSeenDisconnectedFromGC) > 7000) {
                notification.color_class = "NotificationLoggingOn";
                notification.title = $.Localize("#Store_Connecting_ToGc");
                notification.tooltip = $.Localize("#Store_Connecting_ToGc_Tooltip");
                return notification;
            }
        }
        const nIsVacBanned = MyPersonaAPI.IsVacBanned();
        if (nIsVacBanned != 0) {
            notification.color_class = "NotificationRed";
            if (nIsVacBanned == 1) {
                notification.title = $.Localize("#SFUI_MainMenu_Vac_Title");
                notification.tooltip = $.Localize("#SFUI_MainMenu_Vac_Info");
                notification.link = "https://help.steampowered.com/faqs/view/647C-5CC1-7EA9-3C29";
            }
            else {
                notification.title = $.Localize("#SFUI_MainMenu_GameBan_Title");
                notification.tooltip = $.Localize("#SFUI_MainMenu_GameBan_Info");
                notification.link = "https://help.steampowered.com/faqs/view/4E54-0B96-D0A4-1557";
            }
            return notification;
        }
        if (NewsAPI.IsNewClientAvailable()) {
            notification.color_class = "NotificationYellow";
            notification.title = $.Localize("#SFUI_MainMenu_Outofdate_Title");
            notification.tooltip = $.Localize("#SFUI_MainMenu_Outofdate_Body");
            return notification;
        }
        const nBanRemaining = CompetitiveMatchAPI.GetCooldownSecondsRemaining();
        if (nBanRemaining > 0) {
            notification.tooltip = CompetitiveMatchAPI.GetCooldownReason();
            const strType = CompetitiveMatchAPI.GetCooldownType();
            if (strType == "global") {
                notification.title = $.Localize("#SFUI_MainMenu_Global_Ban_Title");
                notification.color_class = "NotificationRed";
            }
            else if (strType == "green") {
                notification.title = $.Localize("#SFUI_MainMenu_Temporary_Ban_Title");
                notification.color_class = "NotificationGreen";
            }
            else if (strType == "competitive") {
                notification.title = $.Localize("#SFUI_MainMenu_Competitive_Ban_Title");
                notification.color_class = "NotificationYellow";
            }
            if (!CompetitiveMatchAPI.CooldownIsPermanent()) {
                const title = notification.title;
                if (CompetitiveMatchAPI.ShowFairPlayGuidelinesForCooldown()) {
                    notification.link = "https://blog.counter-strike.net/index.php/fair-play-guidelines/";
                }
                notification.title = title + ' ' + FormatText.SecondsToSignificantTimeString(nBanRemaining);
            }
            return notification;
        }
        return null;
    }
    function _UpdateNotificationBar() {
        const notification = _GetNotificationBarData();
        _m_NotificationBarColorClasses.forEach(function (strColorClass) {
            const bVisibleColor = notification && notification.color_class;
            _m_elNotificationsContainer.SetHasClass(strColorClass, !!bVisibleColor);
        });
        if (notification !== null) {
            if (notification.link) {
                const btnClickableLink = $.FindChildInContext('#ClickableLinkButton');
                btnClickableLink.enabled = true;
                btnClickableLink.SetPanelEvent('onactivate', () => SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser(notification.link));
                notification.title = "<span class='fairplay-link'>" + notification.title + "</span>";
            }
            $.FindChildInContext('#MainMenuNotificationTitle').text = notification.title;
        }
        _m_elNotificationsContainer.SetHasClass('hidden', notification === null);
    }
    const _UpdateNotifications = function () {
        _m_notificationSchedule = $.Schedule(1.0, _UpdateNotifications);
        _UpdatePopupnotification();
        _UpdateNotificationBar();
    };
    let _m_acknowledgePopupHandler = null;
    const _ShowAcknowledgePopup = function (type = '', itemid = '') {
        if (type === 'xpgrant') {
            UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_acknowledge_xpgrant.xml', 'none');
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_new_item', 'MOUSE');
            return;
        }
        let updatedItemTypeAndItemid = '';
        if (itemid && type)
            updatedItemTypeAndItemid = 'ackitemid=' + itemid + '&acktype=' + type;
        if (!_m_acknowledgePopupHandler) {
            let jsPopupCallbackHandle;
            jsPopupCallbackHandle = UiToolkitAPI.RegisterJSCallback(MainMenu.ResetAcknowlegeHandler);
            _m_acknowledgePopupHandler = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_acknowledge_item.xml', updatedItemTypeAndItemid + '&callback=' + jsPopupCallbackHandle);
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_new_item', 'MOUSE');
        }
    };
    const _ResetAcknowlegeHandler = function () {
        _m_acknowledgePopupHandler = null;
    };
    const _ShowNotificationBarTooltip = function () {
        const notification = _GetNotificationBarData();
        if (notification !== null) {
            UiToolkitAPI.ShowTextTooltip('NotificationsContainer', notification.tooltip);
        }
    };
    const _ShowVote = function () {
        const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('MainMenuNavBarVote', '', 'file://{resources}/layout/context_menus/context_menu_vote.xml', '', function () {
        });
        contextMenuPanel.AddClass("ContextMenu_NoArrow");
    };
    const _HideStoreStatusPanel = function () {
        if (_m_storePopupElement && _m_storePopupElement.IsValid()) {
            _m_storePopupElement.DeleteAsync(0);
        }
        _m_storePopupElement = null;
    };
    const _ShowStoreStatusPanel = function (strText, bAllowClose, bCancel, strOkCmd) {
        _HideStoreStatusPanel();
        let paramclose = '0';
        if (bAllowClose) {
            paramclose = '1';
        }
        let paramcancel = '0';
        if (bCancel) {
            paramcancel = '1';
        }
        _m_storePopupElement = UiToolkitAPI.ShowCustomLayoutPopupParameters('store_popup', 'file://{resources}/layout/popups/popup_store_status.xml', 'text=' + strText +
            '&' + 'allowclose=' + paramclose +
            '&' + 'cancel=' + paramcancel +
            '&' + 'okcmd=' + strOkCmd);
    };
    const _ShowWeaponUpdatePopup = function () {
        return;
        const setVersionTo = '1';
        const currentVersion = GameInterfaceAPI.GetSettingString('ui_popup_weaponupdate_version');
        if (currentVersion !== setVersionTo) {
        }
    };
    const _ShowOperationLaunchPopup = function () {
        if (_m_hOnEngineSoundSystemsRunningRegisterHandle) {
            $.UnregisterForUnhandledEvent("PanoramaComponent_GameInterface_EngineSoundSystemsRunning", _m_hOnEngineSoundSystemsRunningRegisterHandle);
            _m_hOnEngineSoundSystemsRunningRegisterHandle = null;
        }
        const setVersionTo = '2109';
        GameInterfaceAPI.SetSettingString('ui_popup_weaponupdate_version', setVersionTo);
    };
    const _ShowUpdateWelcomePopup = function () {
        const setVersionTo = '2303';
        const currentVersion = GameInterfaceAPI.GetSettingString('ui_popup_weaponupdate_version');
        if (currentVersion !== setVersionTo) {
            UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_welcome_launch.xml', 'uisettingversion=' + setVersionTo);
        }
    };
    const _PauseMainMenuCharacter = function () {
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (vanityPanel && UiToolkitAPI.IsPanoramaInECOMode()) {
            vanityPanel.Pause();
        }
    };
    const _ShowTournamentStore = function () {
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_tournament_store.xml', '');
    };
    function _AddPauseMenuMissionPanel() {
        let elPanel = null;
        const missionId = GameStateAPI.GetActiveQuestID();
        const oGameState = GameStateAPI.GetTimeDataJSO();
        if (!$.GetContextPanel().FindChildInLayoutFile('JsActiveMission') && missionId && oGameState && oGameState.gamephase !== 5) {
            elPanel = $.CreatePanel('Panel', $('#JsActiveMissionPanel'), 'JsActiveMission');
            elPanel.AddClass('PauseMenuModeOnly');
            elPanel.BLoadLayout('file://{resources}/layout/operation/operation_active_mission.xml', false, false);
        }
        else {
            elPanel = $.GetContextPanel().FindChildInLayoutFile('JsActiveMission');
        }
        if (missionId && elPanel && elPanel.IsValid()) {
            elPanel.SetAttributeString('missionid', missionId.toString());
        }
    }
    function _DeletePauseMenuMissionPanel() {
        if ($.GetContextPanel().FindChildInLayoutFile('JsActiveMission')) {
            $.GetContextPanel().FindChildInLayoutFile('JsActiveMission').DeleteAsync(0.0);
        }
    }
    const _SlideSearchPartyParticles = function (bSlidout) {
        let particle_container = $('#party-search-particles');
        particle_container.SetHasClass("mainmenu-party-search-particle--slide-out", bSlidout);
        particle_container.SetControlPoint(3, 0, 0, 0);
        particle_container.SetControlPoint(3, 1, 0, 0);
    };
    const _ResetSurvivalEndOfMatch = function () {
        _DeleteSurvivalEndOfMatch();
        function CreateEndOfMatchPanel() {
            const elPanel = $('#PauseMenuSurvivalEndOfMatch');
            if (!elPanel) {
            }
            _UpdateSurvivalEndOfMatchInstance();
        }
        $.Schedule(0.1, CreateEndOfMatchPanel);
    };
    const _DeleteSurvivalEndOfMatch = function () {
        if ($('#PauseMenuSurvivalEndOfMatch')) {
            $('#PauseMenuSurvivalEndOfMatch').DeleteAsync(0.0);
        }
    };
    function _UpdateSurvivalEndOfMatchInstance() {
        const elSurvivalPanel = $('#PauseMenuSurvivalEndOfMatch');
        if (elSurvivalPanel && elSurvivalPanel.IsValid()) {
            // @ts-ignore remove after survival_endofmatch.js is TypeScript
            elSurvivalPanel.matchStatus.UpdateFromPauseMenu();
        }
    }
    const _ShowHideAlertForNewEventForWatchBtn = function () {
    };
    const _WatchBtnPressedUpdateAlert = function () {
        _ShowHideAlertForNewEventForWatchBtn();
    };
    const _StatsBtnPressedUpdateAlert = function () {
        _ShowHideAlertForNewEventForWatchBtn();
    };
    const _UpdateUnlockCompAlert = function () {
        const btn = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarPlay');
        const alert = btn.FindChildInLayoutFile('MainMenuPlayAlert');
        alert.SetDialogVariable("alert_value", $.Localize("#Store_Price_New"));
        if (!MyPersonaAPI.IsConnectedToGC()) {
            alert.AddClass('hidden');
            return;
        }
        const bHide = GameInterfaceAPI.GetSettingString('ui_show_unlock_competitive_alert') === '1' ||
            MyPersonaAPI.HasPrestige() ||
            MyPersonaAPI.GetCurrentLevel() !== 2;
        alert.SetHasClass('hidden', bHide);
    };
    function _SwitchVanity(team) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
        GameInterfaceAPI.SetSettingString('ui_vanitysetting_team', team);
        _ForceRestartVanity();
    }
    function _GoToCharacterLoadout(team) {
        _OpenInventory();
        let teamName = ((team == '2') ? 't' : 'ct');
        $.DispatchEvent("ShowLoadoutForItem", LoadoutAPI.GetItemID(teamName, 'customplayer'));
    }
    function _OnGoToCharacterLoadoutPressed() {
        if (!MyPersonaAPI.IsInventoryValid() || !MyPersonaAPI.IsConnectedToGC()) {
            UiToolkitAPI.ShowGenericPopupOk($.Localize('#SFUI_SteamConnectionErrorTitle'), $.Localize('#SFUI_Steam_Error_LinkUnexpected'), '', function () { });
            return;
        }
        const team = GameInterfaceAPI.GetSettingString('ui_vanitysetting_team') == 't' ? 2 : 3;
        const elVanityContextMenu = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('id-vanity-contextmenu', '', 'file://{resources}/layout/context_menus/context_menu_mainmenu_vanity.xml', 'type=catagory' +
            '&' + 'team=' + team, function () { });
        elVanityContextMenu.AddClass("ContextMenu_NoArrow");
    }
    function _CheckConnection() {
        if (!MyPersonaAPI.IsConnectedToGC()) {
            if (!_BCheckTabCanBeOpenedRightNow(_m_activeTab)) {
                _OnHomeButtonPressed();
            }
        }
    }
    return {
        OnInitFadeUp: _OnInitFadeUp,
        OnShowMainMenu: _OnShowMainMenu,
        OnHideMainMenu: _OnHideMainMenu,
        OnShowPauseMenu: _OnShowPauseMenu,
        OnHidePauseMenu: _OnHidePauseMenu,
        NavigateToTab: _NavigateToTab,
        PreloadSettings: _PreloadSettings,
        ShowContentPanel: _ShowContentPanel,
        OnHideContentPanel: _OnHideContentPanel,
        GetActiveNavBarButton: _GetActiveNavBarButton,
        ShowHideNavDrawer: _ShowHideNavDrawer,
        ExpandSidebar: _ExpandSidebar,
        MinimizeSidebar: _MinimizeSidebar,
        OnSideBarElementContextMenuActive: _OnSideBarElementContextMenuActive,
        InitFriendsList: _InitFriendsList,
        InitNewsAndStore: _InitNewsAndStore,
        InitVanity: _InitVanity,
        ForceRestartVanity: _ForceRestartVanity,
        OnEquipSlotChanged: _OnEquipSlotChanged,
        OpenPlayMenu: _OpenPlayMenu,
        OpenWatchMenu: _OpenWatchMenu,
        OpenStatsMenu: _OpenStatsMenu,
        OpenInventory: _OpenInventory,
        OpenSettings: _OpenSettings,
        OnHomeButtonPressed: _OnHomeButtonPressed,
        OnQuitButtonPressed: _OnQuitButtonPressed,
        OnEscapeKeyPressed: _OnEscapeKeyPressed,
        GameMustExitNowForAntiAddiction: _GameMustExitNowForAntiAddiction,
        GcLogonNotificationReceived: _GcLogonNotificationReceived,
        InventoryUpdated: _InventoryUpdated,
        LobbyPlayerUpdated: _LobbyPlayerUpdated,
        OnInventoryInspect: _OnInventoryInspect,
        OnShowXrayCasePopup: _OnShowXrayCasePopup,
        WeaponPreviewRequest: _WeaponPreviewRequest,
        OnLootlistItemPreview: _OnLootlistItemPreview,
        UpdateNotifications: _UpdateNotifications,
        ShowAcknowledgePopup: _ShowAcknowledgePopup,
        ShowOperationLaunchPopup: _ShowOperationLaunchPopup,
        ResetAcknowlegeHandler: _ResetAcknowlegeHandler,
        ShowNotificationBarTooltip: _ShowNotificationBarTooltip,
        ShowVote: _ShowVote,
        ShowStoreStatusPanel: _ShowStoreStatusPanel,
        HideStoreStatusPanel: _HideStoreStatusPanel,
        UpdateBackgroundMap: _UpdateBackgroundMap,
        PauseMainMenuCharacter: _PauseMainMenuCharacter,
        ShowTournamentStore: _ShowTournamentStore,
        TournamentDraftUpdate: _TournamentDraftUpdate,
        ResetSurvivalEndOfMatch: _ResetSurvivalEndOfMatch,
        OnGoToCharacterLoadoutPressed: _OnGoToCharacterLoadoutPressed,
        ResetNewsEntryStyle: _ResetNewsEntryStyle,
        OnSteamIsPlaying: _OnSteamIsPlaying,
        WatchBtnPressedUpdateAlert: _WatchBtnPressedUpdateAlert,
        StatsBtnPressedUpdateAlert: _StatsBtnPressedUpdateAlert,
        HideMainMenuNewsPanel: _HideMainMenuNewsPanel,
        ShowLoadoutForItem: _ShowLoadoutForItem,
        SwitchVanity: _SwitchVanity,
        GoToCharacterLoadout: _GoToCharacterLoadout,
        OpenSubscriptionUpsell: _OpenSubscriptionUpsell,
        UpdateUnlockCompAlert: _UpdateUnlockCompAlert,
        PlayerActivityVoice: _PlayerActivityVoice,
        CheckConnection: _CheckConnection
    };
})();
(function () {
    $.LogChannel("CSGO_MainMenu", "LV_DEFAULT", "#aaff80");
    $.RegisterForUnhandledEvent('HideContentPanel', MainMenu.OnHideContentPanel);
    $.RegisterForUnhandledEvent('SidebarContextMenuActive', MainMenu.OnSideBarElementContextMenuActive);
    $.RegisterForUnhandledEvent('OpenPlayMenu', MainMenu.OpenPlayMenu);
    $.RegisterForUnhandledEvent('OpenInventory', MainMenu.OpenInventory);
    $.RegisterForUnhandledEvent('OpenWatchMenu', MainMenu.OpenWatchMenu);
    $.RegisterForUnhandledEvent('OpenStatsMenu', MainMenu.OpenStatsMenu);
    $.RegisterForUnhandledEvent('OpenSubscriptionUpsell', MainMenu.OpenSubscriptionUpsell);
    $.RegisterForUnhandledEvent('CSGOShowMainMenu', MainMenu.OnShowMainMenu);
    $.RegisterForUnhandledEvent('CSGOHideMainMenu', MainMenu.OnHideMainMenu);
    $.RegisterForUnhandledEvent('CSGOShowPauseMenu', MainMenu.OnShowPauseMenu);
    $.RegisterForUnhandledEvent('CSGOHidePauseMenu', MainMenu.OnHidePauseMenu);
    $.RegisterForUnhandledEvent('OpenSidebarPanel', MainMenu.ExpandSidebar);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_GameMustExitNowForAntiAddiction', MainMenu.GameMustExitNowForAntiAddiction);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_GcLogonNotificationReceived', MainMenu.GcLogonNotificationReceived);
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', MainMenu.UpdateUnlockCompAlert);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', MainMenu.InventoryUpdated);
    $.RegisterForUnhandledEvent('InventoryItemPreview', MainMenu.OnInventoryInspect);
    $.RegisterForUnhandledEvent('LootlistItemPreview', MainMenu.OnLootlistItemPreview);
    $.RegisterForUnhandledEvent('ShowXrayCasePopup', MainMenu.OnShowXrayCasePopup);
    $.RegisterForUnhandledEvent('PanoramaComponent_Inventory_WeaponPreviewRequest', MainMenu.WeaponPreviewRequest);
    $.RegisterForUnhandledEvent("PanoramaComponent_TournamentMatch_DraftUpdate", MainMenu.TournamentDraftUpdate);
    $.RegisterForUnhandledEvent('ShowLoadoutForItem', MainMenu.ShowLoadoutForItem);
    $.RegisterForUnhandledEvent('ShowAcknowledgePopup', MainMenu.ShowAcknowledgePopup);
    $.RegisterForUnhandledEvent('UnloadLoadingScreenAndReinit', MainMenu.ResetSurvivalEndOfMatch);
    $.RegisterForUnhandledEvent('MainMenu_OnGoToCharacterLoadoutPressed', MainMenu.OnGoToCharacterLoadoutPressed);
    $.RegisterForUnhandledEvent("PanoramaComponent_EmbeddedStream_VideoPlaying", MainMenu.OnSteamIsPlaying);
    $.RegisterForUnhandledEvent("StreamPanelClosed", MainMenu.ResetNewsEntryStyle);
    $.RegisterForUnhandledEvent("HideMainMenuNewsPanel", MainMenu.HideMainMenuNewsPanel);
    $.RegisterForUnhandledEvent("CSGOMainInitBackgroundMovie", MainMenu.UpdateBackgroundMap);
    $.RegisterForUnhandledEvent("MainMenuGoToSettings", MainMenu.OpenSettings);
    $.RegisterForUnhandledEvent("MainMenuGoToCharacterLoadout", MainMenu.GoToCharacterLoadout);
    $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_PlayerActivityVoice", MainMenu.PlayerActivityVoice);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_UpdateConnectionToGC', MainMenu.CheckConnection);
    MainMenu.MinimizeSidebar();
    MainMenu.InitVanity();
    MainMenu.MinimizeSidebar();
    MainMenu.InitFriendsList();
    MainMenu.InitNewsAndStore();
    $.RegisterForUnhandledEvent('CSGOMainMenuEscapeKeyPressed', MainMenu.OnEscapeKeyPressed);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYWlubWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxrQ0FBa0M7QUFDbEMsaURBQWlEO0FBQ2pELDhDQUE4QztBQUM5QyxvREFBb0Q7QUFDcEQseURBQXlEO0FBQ3pELG1DQUFtQztBQUNuQyxrQ0FBa0M7QUFDbEMsOENBQThDO0FBQzlDLDZDQUE2QztBQU03QyxJQUFJLFFBQVEsR0FBRyxDQUFFO0lBRWhCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBRSxZQUFZLENBQUMsZUFBZSxFQUFFLEtBQUssY0FBYyxDQUFFLENBQUM7SUFDL0UsSUFBSSxZQUFZLEdBQWtCLElBQUksQ0FBQztJQUN2QyxJQUFJLGtDQUFrQyxHQUFHLEtBQUssQ0FBQztJQUMvQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBRSxvQkFBb0IsQ0FBRyxDQUFDO0lBQ3JELElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDO0lBR2xDLE1BQU0sMkJBQTJCLEdBQUcsQ0FBQyxDQUFFLHlCQUF5QixDQUFHLENBQUM7SUFDcEUsSUFBSSx1QkFBdUIsR0FBbUIsS0FBSyxDQUFDO0lBQ3BELElBQUksaUNBQWlDLEdBQUcsS0FBSyxDQUFDO0lBQzlDLElBQUksd0JBQXdCLEdBQUcsS0FBSyxDQUFDO0lBQ3JDLElBQUksOEJBQThCLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sOEJBQThCLEdBQUc7UUFDdEMsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsdUJBQXVCO0tBQ3JGLENBQUM7SUFHRixJQUFJLGlDQUFpQyxHQUFrQixJQUFJLENBQUM7SUFDNUQsSUFBSSw0Q0FBNEMsR0FBa0IsSUFBSSxDQUFDO0lBQ3ZFLElBQUksc0NBQXNDLEdBQWtCLElBQUksQ0FBQztJQUNqRSxJQUFJLHdDQUF3QyxHQUFrQixJQUFJLENBQUM7SUFFbkUsSUFBSSxtQ0FBbUMsR0FBa0IsSUFBSSxDQUFDO0lBRTlELElB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