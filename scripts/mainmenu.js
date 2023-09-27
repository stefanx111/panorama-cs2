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
            SetHideTranstionOnLeftColumn();
        }
    };
    function SetHideTranstionOnLeftColumn() {
        const elLeftColumn = $.FindChildInContext('#JsLeftColumn');
        const fnOnPropertyTransitionEndEvent = function (panelName, propertyName) {
            if (elLeftColumn.id === panelName && propertyName === 'opacity') {
                if (elLeftColumn.visible === true && elLeftColumn.BIsTransparent()) {
                    elLeftColumn.visible = false;
                    elLeftColumn.SetReadyForDisplay(false);
                    return true;
                }
            }
            return false;
        };
        $.RegisterEventHandler('PropertyTransitionEnd', elLeftColumn, fnOnPropertyTransitionEndEvent);
    }
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
        let savedMapName = GameInterfaceAPI.GetSettingString('ui_mainmenu_bkgnd_movie');
        let backgroundMap = !savedMapName ? 'de_dust2_vanity' : savedMapName + '_vanity';
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
            _PlayBackgroundMapSound(savedMapName);
        }
        else if (elMapPanel.Data().loadedMap !== backgroundMap) {
            elMapPanel.SwitchMap(backgroundMap);
            elMapPanel.Data().loadedMap = backgroundMap;
            _PlayBackgroundMapSound(savedMapName);
        }
        if (backgroundMap === 'de_nuke_vanity') {
            elMapPanel.FireEntityInput('main_light', 'SetBrightness', '2');
            elMapPanel.FireEntityInput('main_light', 'Enable');
        }
        InspectModelImage.HidePanelItemEntities(elMapPanel);
        return elMapPanel;
    };
    let m_backgroundMapSoundHandle = null;
    const _PlayBackgroundMapSound = function (backgroundMap) {
        let soundName = 'UIPanorama.BG_' + backgroundMap;
        if (m_backgroundMapSoundHandle) {
            UiToolkitAPI.StopSoundEvent(m_backgroundMapSoundHandle, 0.1);
            m_backgroundMapSoundHandle = null;
        }
        m_backgroundMapSoundHandle = UiToolkitAPI.PlaySoundEvent(soundName);
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
        _UpdateInventoryBtnAlert();
        _GcLogonNotificationReceived();
        _DeleteSurvivalEndOfMatch();
        _ShowHideAlertForNewEventForWatchBtn();
        _UpdateUnlockCompAlert();
        _FetchTournamentData();
        _ShowFloatingPanels();
        $('#MainMenuNavBarHome').checked = true;
        if (_m_bShownBefore && GameTypesAPI.ShouldShowNewUserPopup()) {
            _NewUser_ShowTrainingCompletePopup();
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
        if (tab === 'JsInventory' || tab === 'JsMainMenuStore' || tab === 'JsLoadout') {
            const restrictions = LicenseUtil.GetCurrentLicenseRestrictions();
            if (restrictions !== false) {
                LicenseUtil.ShowLicenseRestrictions(restrictions);
                return false;
            }
        }
        if (tab === 'JsInventory' || tab === 'JsPlayerStats' || tab === 'JsLoadout' || tab === 'JsMainMenuStore') {
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
        if (tab === 'JsPlayerStats') {
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
                if (XmlName === 'mainmenu_store_fullscreen') {
                    soundName = 'UIPanorama.tab_mainmenu_shop';
                }
                else if (XmlName === 'loadout_grid') {
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
        _HideFloatingPanels();
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
        _ShowFloatingPanels();
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
        _CheckRankUpRedemptionStore();
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
    const _ShowFloatingPanels = function () {
        $.FindChildInContext('#JsLeftColumn').SetHasClass('hidden', false);
        $.FindChildInContext('#JsActiveMissionPanel').SetHasClass('hidden', false);
        $.FindChildInContext('#MainMenuVanityInfo').SetHasClass('hidden', false);
        const elVanityButton = $.FindChildInContext('#VanityControls');
        if (elVanityButton) {
            elVanityButton.visible = true;
        }
        $.FindChildInContext('#JsStreamContainer').SetHasClass('hidden', false);
    };
    const _HideFloatingPanels = function () {
        $.FindChildInContext('#JsLeftColumn').SetHasClass('hidden', true);
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
        if (particle_container.type !== "ParticleScenePanel")
            return;
        let numPlayersActuallyInParty;
        let AddServerErrors = 0;
        var serverWarning = NewsAPI.GetCurrentActiveAlertForUser();
        var isWarning = serverWarning !== '' && serverWarning !== undefined ? true : false;
        let bAttemptPremierMode = LobbyAPI.GetSessionSettings()?.game?.mode_ui === 'premier';
        if (isWarning)
            AddServerErrors = 5;
        let strStatus = LobbyAPI.GetMatchmakingStatusString();
        const bShowParticles = strStatus != null && (strStatus.endsWith("searching") || strStatus.endsWith("registering") || strStatus.endsWith("reserved"));
        if (!bShowParticles) {
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
            if (MyPersonaAPI.GetClientLogonFatalError()) {
                _ShowVanity();
            }
            return;
        }
        if (_m_bVanityAnimationAlreadyStarted) {
            return;
        }
        _ShowVanity();
    };
    function _ShowVanity() {
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (!vanityPanel) {
            return;
        }
        _m_bVanityAnimationAlreadyStarted = true;
        if (vanityPanel.BHasClass('hidden')) {
            vanityPanel.RemoveClass('hidden');
        }
        _UpdateLocalPlayerVanity();
    }
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
        _UpdateStoreAlert();
    };
    function _CheckRankUpRedemptionStore() {
        if (_m_bHasPopupNotification)
            return;
        if (!$('#MainMenuNavBarHome').checked)
            return;
        const objStore = InventoryAPI.GetCacheTypeElementJSOByIndex("PersonalStore", 0);
        if (!objStore)
            return;
        if (!MyPersonaAPI.IsConnectedToGC() || !MyPersonaAPI.IsInventoryValid())
            return;
        const genTime = objStore.generation_time;
        const balance = objStore.redeemable_balance;
        const prevClientGenTime = Number(GameInterfaceAPI.GetSettingString("cl_redemption_reset_timestamp"));
        if (prevClientGenTime != genTime && balance > 0) {
            _m_bHasPopupNotification = true;
            const RankUpRedemptionStoreClosedCallbackHandle = UiToolkitAPI.RegisterJSCallback(MainMenu.OnRankUpRedemptionStoreClosed);
            UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_rankup_redemption_store.xml', 'callback=' + RankUpRedemptionStoreClosedCallbackHandle);
        }
    }
    function _OnRankUpRedemptionStoreClosed() {
        _m_bHasPopupNotification = false;
        _msg('_OnRankUpRedemptionStoreClosed');
    }
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
        UiToolkitAPI.ShowCustomLayoutPopupParameters('popup-inspect-' + caseId, 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=' + toolid + ',' + caseId +
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
        JsInspectCallback = UiToolkitAPI.RegisterJSCallback(function () {
            let idtoUse = storeId ? storeId : caseId;
            let elPanel = $.GetContextPanel().FindChildInLayoutFile('PopupManager').FindChildInLayoutFile('popup-inspect-' + idtoUse);
            elPanel.visible = true;
            elPanel.SetHasClass('hide-for-lootlist', false);
        });
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
            '&' + 'inspectonly=true' +
            '&' + 'allowsave=false' +
            '&' + 'showequip=false' +
            '&' + 'showitemcert=false' +
            '&' + blurOperationPanel +
            '&' + 'extrapopupfullscreenstyle=' + extrapopupfullscreenstyle +
            '&' + 'showmarketlink=' + showMarketLinkDefault +
            '&' + 'callback=' + JsInspectCallback +
            '&' + 'caseidforlootlist=' + caseId);
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
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
            '&' + 'inspectonly=true' +
            '&' + 'allowsave=false' +
            '&' + 'showequip=false' +
            '&' + 'showitemcert=true' +
            '&' + 'workshopPreview=' + workshopPreview);
    };
    const _UpdateSubscriptionAlert = function () {
        return;
        const elNavBar = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarTop'), elAlert = elNavBar.FindChildInLayoutFile('MainMenuSubscriptionAlert');
        elAlert.SetDialogVariable("alert_value", $.Localize("#Store_Price_New"));
        const hideAlert = GameInterfaceAPI.GetSettingString('ui_show_subscription_alert') === '1' ? true : false;
        elAlert.SetHasClass('hidden', hideAlert);
    };
    function _UpdateStoreAlert() {
        let hideAlert;
        const objStore = InventoryAPI.GetCacheTypeElementJSOByIndex("PersonalStore", 0);
        const gcConnection = MyPersonaAPI.IsConnectedToGC();
        const validInventory = MyPersonaAPI.IsInventoryValid();
        hideAlert = !gcConnection || !validInventory || !objStore || objStore.redeemable_balance === 0;
        const elNavBar = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarTop');
        const elAlert = elNavBar.FindChildInLayoutFile('MainMenuStoreAlert');
        elAlert.SetDialogVariable("alert_value", $.Localize("#Store_Price_New"));
        elAlert.SetHasClass('hidden', hideAlert);
    }
    ;
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
    function _UpdateNotifications() {
        _msg('_UpdateNotifications');
        if (_m_notificationSchedule == false) {
            _LoopUpdateNotifications();
        }
    }
    const _LoopUpdateNotifications = function () {
        _UpdatePopupnotification();
        _UpdateNotificationBar();
        const REDEMPTION_ENABLED = true;
        if (REDEMPTION_ENABLED) {
            _CheckRankUpRedemptionStore();
        }
        _m_notificationSchedule = $.Schedule(1, _LoopUpdateNotifications);
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
            _OnHomeButtonPressed();
            _NewUser_ShowForceTrainingPopup();
        }
        else if (GameTypesAPI.ShouldShowNewUserPopup()) {
            _OnHomeButtonPressed();
            _NewUser_ShowTrainingCompletePopup();
        }
        else {
            $.DispatchEvent('OpenPlayMenu');
        }
    }
    function _NewUser_ShowForceTrainingPopup() {
        UiToolkitAPI.ShowGenericPopupOkCancel('#ForceNewUserTraining_title', '#ForceNewUserTraining_text', '', () => {
            $.DispatchEvent('OpenPlayMenu');
            $.Schedule(0.1, _NewUser_TrainingMatch);
        }, () => { });
    }
    function _NewUser_ShowTrainingCompletePopup() {
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
                    mode_ui: 'casual',
                    type: 'classic',
                    gamemodeflags: 0,
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
        OnRankUpRedemptionStoreClosed: _OnRankUpRedemptionStoreClosed
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
    $.RegisterForUnhandledEvent('ShowStoreStatusPanel', MainMenu.ShowStoreStatusPanel);
    $.RegisterForUnhandledEvent('HideStoreStatusPanel', MainMenu.HideStoreStatusPanel);
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