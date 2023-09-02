"use strict";
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
    let _m_bShownBefore = false;
    function _msg(text) {
    }
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
        backgroundMap = !backgroundMap ? 'de_dust2_vanity' : backgroundMap + '_vanity';
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
        _ShowNewsAndStore();
        $('#MainMenuNavBarHome').checked = true;
        if (_m_bShownBefore && GameTypesAPI.ShouldShowNewUserPopup()) {
            _NewUser_ShowPopup();
        }
        _m_bShownBefore = true;
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
    const _UpdatePartySearchParticlesType = function (isPremier) {
        const particle_container = $('#party-search-particles');
        if (isPremier) {
            particle_container.SetParticleNameAndRefresh("particles/ui/ui_mainmenu_active_search_gold.vpcf");
        }
        else {
            particle_container.SetParticleNameAndRefresh("particles/ui/ui_mainmenu_active_search.vpcf");
        }
    };
    const _UpdatePartySearchSetControlPointParticles = function (cpArray) {
        const particle_container = $('#party-search-particles');
        particle_container.StopParticlesImmediately(true);
        particle_container.StartParticles();
        for (const [cp, xpos, ypos, zpos] of cpArray) {
            particle_container.SetControlPoint(cp, xpos, ypos, zpos);
        }
        m_isParticleActive = true;
    };
    let m_verticalSpread = 0;
    let m_isParticleActive = false;
    const _UpdatePartySearchParticles = function () {
        const particle_container = $('#party-search-particles');
        let numPlayersActuallyInParty;
        let AddServerErrors = 0;
        var serverWarning = NewsAPI.GetCurrentActiveAlertForUser();
        var isWarning = serverWarning !== '' && serverWarning !== undefined ? true : false;
        let bAttemptPremierMode = LobbyAPI.GetSessionSettings()?.game?.mode_ui === 'premier';
        if (isWarning)
            AddServerErrors = 5;
        let strStatus = LobbyAPI.GetMatchmakingStatusString();
        if ((strStatus === '' || strStatus === null) && (particle_container.type === "ParticleScenePanel")) {
            if (m_isParticleActive) {
                particle_container.StopParticlesImmediately(true);
                m_isParticleActive = false;
            }
            return;
        }
        if (!LobbyAPI.IsSessionActive()) {
            if (m_isParticleActive) {
                particle_container.StopParticlesImmediately(true);
                m_isParticleActive = false;
            }
            return;
        }
        let verticlSpread = 14 + (PartyListAPI.GetCount() - 1) * 5 + AddServerErrors;
        if (m_verticalSpread === verticlSpread && m_isParticleActive)
            return;
        _UpdatePartySearchParticlesType(bAttemptPremierMode);
        m_verticalSpread = verticlSpread;
        let CpArray = [
            [1, verticlSpread, .5, 1],
            [2, 1, .25, 0],
            [16, 15, 230, 15],
        ];
        _UpdatePartySearchSetControlPointParticles(CpArray);
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
    function _UpdateLocalPlayerVanity() {
        const oSettings = ItemInfo.GetOrUpdateVanityCharacterSettings();
        const oLocalPlayer = m_aDisplayLobbyVanityData.filter(storedEntry => { return storedEntry.isLocalPlayer === true; });
        oSettings.playeridx = oLocalPlayer.length > 0 ? oLocalPlayer[0].playeridx : 0;
        oSettings.xuid = MyPersonaAPI.GetXuid();
        oSettings.isLocalPlayer = true;
        _ApplyVanitySettingsToLobbyMetadata(oSettings);
        _UpdatePlayerVanityModel(oSettings);
        _CreatUpdateVanityInfo(oSettings);
    }
    ;
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
            const elVanityPlayerInfo = VanityPlayerInfo.CreateOrUpdateVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), oSettings);
            if (elVanityPlayerInfo) {
                $.GetContextPanel().FindChildInLayoutFile('MainMenuVanityParent').AddBlurPanel(elVanityPlayerInfo.FindChildInLayoutFile('vanity-info-container'));
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
        const particle_container = $('#party-search-particles');
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
    function _OnPlayButtonPressed() {
        if (GameTypesAPI.ShouldForceNewUserTraining()) {
            $.DispatchEvent('OpenPlayMenu');
            $.Schedule(0.1, _NewUser_TrainingMatch);
        }
        else if (GameTypesAPI.ShouldShowNewUserPopup()) {
            _OnHomeButtonPressed();
            _NewUser_ShowPopup();
        }
        else {
            $.DispatchEvent('OpenPlayMenu');
        }
    }
    function _NewUser_ShowPopup() {
        UiToolkitAPI.ShowGenericPopupThreeOptions('#PlayMenu_NewUser_title', '#PlayMenu_NewUser_text', '', '#PlayMenu_NewUser_casual', function () {
            GameTypesAPI.DisableNewUserExperience();
            $.DispatchEvent('OpenPlayMenu');
            $.Schedule(0.1, _NewUser_CasualMatchmaking);
        }, '#PlayMenu_NewUser_training', function () {
            $.DispatchEvent('OpenPlayMenu');
            $.Schedule(0.1, _NewUser_TrainingMatch);
        }, '#PlayMenu_NewUser_other', function () {
            GameTypesAPI.DisableNewUserExperience();
            $.DispatchEvent('OpenPlayMenu');
        });
    }
    function _NewUser_TrainingMatch() {
        const settings = {
            update: {
                Options: {
                    action: 'custommatch',
                    server: 'listen',
                },
                Game: {
                    mode: 'new_user_training',
                    type: 'classic',
                    mapgroupname: 'mg_de_dust2',
                    map: 'de_dust2'
                }
            },
            delete: {}
        };
        LobbyAPI.UpdateSessionSettings(settings);
        LobbyAPI.StartMatchmaking('', '', '', '');
    }
    ;
    function _NewUser_CasualMatchmaking() {
        const settings = {
            update: {
                Options: {
                    action: 'custommatch',
                    server: 'official',
                },
                Game: {
                    mode: 'casual',
                    type: 'classic',
                    mapgroupname: 'mg_dust247',
                    map: 'de_dust2'
                }
            },
            delete: {}
        };
        LobbyAPI.UpdateSessionSettings(settings);
        LobbyAPI.StartMatchmaking('', '', '', '');
    }
    ;
    function _OnLeaderboardStateChange() {
        _msg('leaderboard status: received');
        _UpdateLocalPlayerVanity();
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
        CheckConnection: _CheckConnection,
        OnPlayButtonPressed: _OnPlayButtonPressed,
        UpdateLocalPlayerVanity: _UpdateLocalPlayerVanity,
        OnLeaderboardStateChange: _OnLeaderboardStateChange,
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
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_ProfileUpdated', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', MainMenu.UpdateLocalPlayerVanity);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYWlubWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLGlEQUFpRDtBQUNqRCw4Q0FBOEM7QUFDOUMsb0RBQW9EO0FBQ3BELHlEQUF5RDtBQUN6RCxtQ0FBbUM7QUFDbkMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyw2Q0FBNkM7QUFNN0MsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGdCQUFnQixHQUFHLENBQUUsWUFBWSxDQUFDLGVBQWUsRUFBRSxLQUFLLGNBQWMsQ0FBRSxDQUFDO0lBQy9FLElBQUksWUFBWSxHQUFrQixJQUFJLENBQUM7SUFDdkMsSUFBSSxrQ0FBa0MsR0FBRyxLQUFLLENBQUM7SUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUUsb0JBQW9CLENBQUcsQ0FBQztJQUNyRCxJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQztJQUdsQyxNQUFNLDJCQUEyQixHQUFHLENBQUMsQ0FBRSx5QkFBeUIsQ0FBRyxDQUFDO0lBQ3BFLElBQUksdUJBQXVCLEdBQW1CLEtBQUssQ0FBQztJQUNwRCxJQUFJLGlDQUFpQyxHQUFHLEtBQUssQ0FBQztJQUM5QyxJQUFJLHdCQUF3QixHQUFHLEtBQUssQ0FBQztJQUNyQyxJQUFJLDhCQUE4QixHQUFHLENBQUMsQ0FBQztJQUN2QyxNQUFNLDhCQUE4QixHQUFHO1FBQ3RDLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLHVCQUF1QjtLQUNyRixDQUFDO0lBR0YsSUFBSSxpQ0FBaUMsR0FBa0IsSUFBSSxDQUFDO0lBQzVELElBQUksNENBQTRDLEdBQWtCLElBQUksQ0FBQztJQUN2RSxJQUFJLHNDQUFzQyxHQUFrQixJQUFJLENBQUM7SUFDakUsSUFBSSx3Q0FBd0MsR0FBa0IsSUFBSSxDQUFDO0lBRW5FLElBQUksbUNBQW1DLEdBQWtCLElBQUksQ0FBQztJQUU5RCxJ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