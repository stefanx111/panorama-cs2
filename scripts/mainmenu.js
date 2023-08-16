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
//--------------------------------------------------------------------------------------------------
// Header Tab navagation and xml loading
//--------------------------------------------------------------------------------------------------
var MainMenu = (function () {
    const _m_bPerfectWorld = (MyPersonaAPI.GetLauncherType() === "perfectworld");
    let _m_activeTab = null;
    let _m_sideBarElementContextMenuActive = false;
    const _m_elContentPanel = $('#JsMainMenuContent');
    let _m_playedInitalFadeUp = false;
    // notification
    const _m_elNotificationsContainer = $('#NotificationsContainer');
    let _m_notificationSchedule = false;
    let _m_bVanityAnimationAlreadyStarted = false;
    let _m_bHasPopupNotification = false;
    let _m_tLastSeenDisconnectedFromGC = 0;
    const _m_NotificationBarColorClasses = [
        "NotificationRed", "NotificationYellow", "NotificationGreen", "NotificationLoggingOn"
    ];
    // on show register events handlers
    let _m_LobbyPlayerUpdatedEventHandler = null;
    let _m_LobbyMatchmakingSessionUpdateEventHandler = null;
    let _m_LobbyForceRestartVanityEventHandler = null;
    let _m_LobbyMainMenuSwitchVanityEventHandler = null;
    // 'UISceneFrameBoundary' register event handler
    let _m_UiSceneFrameBoundaryEventHandler = null;
    let _m_storePopupElement = null;
    let m_TournamentPickBanPopup = null;
    let _m_hOnEngineSoundSystemsRunningRegisterHandle = null;
    let _m_jobFetchTournamentData = null;
    const TOURNAMENT_FETCH_DELAY = 10;
    // Update notification when xml is loaded
    const nNumNewSettings = UpdateSettingsMenuAlert();
    const m_MainMenuTopBarParticleFX = $('#MainMenuNavigateParticles');
    //Create a Table of control point positions
    //ParticleControls.InitMainMenuTopBar( m_MainMenuTopBarParticleFX );
    ParticleControls.UpdateMainMenuTopBar(m_MainMenuTopBarParticleFX, '');
    let _m_bShownBefore = false;
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
            // CSGO_SOURCE2_PORT - TODO: find source2 mechanism for checking sound systems are running
            /* CSGO_SOURCE2_UNSUPPORTED
            if ( GameInterfaceAPI.GetEngineSoundSystemsRunning() )
            CSGO_SOURCE2_UNSUPPORTED */
            //{
            // Only show this right after first fade up
            //$.Msg( "Main menu : on init fade up, everything is ready" );
            //_ShowOperationLaunchPopup();
            //}
            /* CSGO_SOURCE2_UNSUPPORTED
            else
            {
                $.Msg( "Main menu : registering for EngineSoundSystemsRunning listener, sound systems and config not ready yet" );
                _m_hOnEngineSoundSystemsRunningRegisterHandle = $.RegisterForUnhandledEvent( "PanoramaComponent_GameInterface_EngineSoundSystemsRunning", MainMenu.ShowOperationLaunchPopup );
            }
            CSGO_SOURCE2_UNSUPPORTED */
        }
    };
    function _FetchTournamentData() {
        $.Msg("---- fetching tournament data");
        // somehow we got called but a job is already pending. Abort.
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
        // initialize from user preferences (filter func in C++ ensures valid movie name / China / etc.)
        let backgroundMap = GameInterfaceAPI.GetSettingString('ui_mainmenu_bkgnd_movie');
        // default to dust 2 is there is nothing set
        backgroundMap = !backgroundMap ? 'de_dust2_vanity' : backgroundMap + '_vanity';
        $.Msg('backgroundMap: ' + backgroundMap);
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
        // Extra lighting for de_nuke_vanity
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
            // _m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent( "PanoramaComponent_Lobby_PlayerUpdated", MainMenu.LobbyPlayerUpdated );
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
        /* CSGO_SOURCE2_UNSUPPORTED
        // Make the ambience sound on movies play
        GameInterfaceAPI.SetSettingString( 'panorama_play_movie_ambient_sound', '1' );

        // Set convars to play main menu dsp effects. These are overridden
        // by the game engine when we enter a map.
        GameInterfaceAPI.SetSettingString( 'dsp_room', '29' );
        CSGO_SOURCE2_UNSUPPORTED */
        //GameInterfaceAPI.SetSettingString( 'snd_soundmixer', 'MainMenu_Mix' );
        _RegisterOnShowEvents();
        _m_bVanityAnimationAlreadyStarted = false; // make sure we start main character animation
        _LobbyPlayerUpdated();
        _OnInitFadeUp();
        // make sure play button is visible in the mainmenu
        $('#MainMenuNavBarPlay').SetHasClass('pausemenu-navbar__btn-small--hidden', false);
        _UpdateNotifications();
        _ShowWeaponUpdatePopup();
        _UpdateInventoryBtnAlert();
        // Trigger one time processing
        _GcLogonNotificationReceived();
        //Delete survival pausemenu end of match stats panel instance if it exists
        _DeleteSurvivalEndOfMatch();
        //Delete pause menu mission panel
        _DeletePauseMenuMissionPanel();
        //Should show new events tab alert on the the watch nav bar btn
        _ShowHideAlertForNewEventForWatchBtn();
        //Show hide the unlocked competitive alert on play button
        _UpdateUnlockCompAlert();
        _FetchTournamentData();
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
            && (strFatalError !== "ShowGameLicenseNoOnlineLicensePW") // special exception that doesn't show the dialog, but we need to display anti-addiction popup
            && (strFatalError !== "ShowGameLicenseNoOnlineLicense") // special exception that doesn't show the dialog, but we need to display anti-addiction popup
        ) {
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
                // This handles a once on main menu notification from attempting to log in to GC,
                // suppress the dialog in this case because user will be reminded every time they try
                // to do anything for multiplayer
                //// _OnGcLogonNotificationReceived_ShowLicenseYesNoBox( "#SFUI_LoginLicenseAssist_NoOnlineLicense_PW", "https://community.csgo.com.cn/join/pwlink_csgo" );
            }
            else if (strFatalError === "ShowGameLicenseNoOnlineLicense") {
                // This handles a once on main menu notification from attempting to log in to GC,
                // suppress the dialog in this case because user will be reminded every time they try
                // to do anything for multiplayer
                //// _OnGcLogonNotificationReceived_ShowLicenseYesNoBox( "#SFUI_LoginLicenseAssist_NoOnlineLicense", "https://store.steampowered.com/app/730/" );
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
            if (nAntiAddictionTrackingState != 2 /*k_EPerfectWorldAccountState_Addict*/) {
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
        // don't generate another dialog when a previous one is still displayed
        if (_m_panelGameMustExitDialog && _m_panelGameMustExitDialog.IsValid())
            return;
        // don't generate more than a certain number of quit dialogs
        if (_m_numGameMustExitNowForAntiAddictionHandled >= 100)
            return;
        ++_m_numGameMustExitNowForAntiAddictionHandled;
        // generate a dialog and remember a handle to it so that we could avoid generating more
        _m_panelGameMustExitDialog =
            UiToolkitAPI.ShowGenericPopupOneOptionBgStyle("#GameUI_QuitConfirmationTitle", "#UI_AntiAddiction_ExitGameNowMessage", "", "#GameUI_Quit", function () { GameInterfaceAPI.ConsoleCommand("quit"); }, "dim");
        $.Msg("JS: Game Must Exit Now Dialog Displayed: " + _m_panelGameMustExitDialog);
    };
    const _OnGcLogonNotificationReceived_ShowLicenseYesNoBox = function (strTextMessage, pszOverlayUrlToOpen) {
        UiToolkitAPI.ShowGenericPopupTwoOptionsBgStyle("#CSGO_Purchasable_Game_License_Short", strTextMessage, "", "#UI_Yes", function () { SteamOverlayAPI.OpenURL(pszOverlayUrlToOpen); }, "#UI_No", function () { }, "dim");
    };
    const _OnGcLogonNotificationReceived_ShowFaqCallback = function () {
        // Show the knowledgebase
        SteamOverlayAPI.OpenURL("https://support.steampowered.com/kb_article.php?ref=6026-IFKZ-7043&l=schinese");
        // Show the message box again in case user gets lost in Steam Overlay
        _m_bGcLogonNotificationReceivedOnce = false;
        _GcLogonNotificationReceived();
    };
    const _OnHideMainMenu = function () {
        $.Msg("[CSGO_MainMenu]", "Hide main menu");
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (vanityPanel) {
            CharacterAnims.CancelScheduledAnim(vanityPanel);
        }
        // We are hiding the main menu, so hide the content panel immediately.
        // Otherwise the slide out anim plays the next time the main menu is shown.
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
        // only allow to queue while in game if I'm in a listen server by myself
        // OFFLINE WARMUP: we removed the offline warmup feature, so don't show play button in pause menu for now
        $('#MainMenuNavBarPlay').SetHasClass('pausemenu-navbar__btn-small--hidden', true);
        $('#MainMenuNavBarSwitchTeams').SetHasClass('pausemenu-navbar__btn-small--hidden', (bTraining || bQueuedMatchmaking || bGotvSpectating));
        // Call vote option is only enables in multiplayer matches
        // Training technically has to be a multiplayer match because scaleform only works in "gametime" and not "realtime"
        // This means we can't make the training single player because it would cause us to "pause" which freezes all scaleform and hence breaks the game
        $('#MainMenuNavBarVote').SetHasClass('pausemenu-navbar__btn-small--hidden', (bTraining || /*!bMultiplayer || */ bGotvSpectating));
        // Report a community server is only enabled in community server and not GOTV Spectating
        $('#MainMenuNavBarReportServer').SetHasClass('pausemenu-navbar__btn-small--hidden', !bIsCommunityServer);
        // Invoking server browser is only enabled if user is already playing on a community server
        // $( '#MainMenuNavBarShowCommunityServerBrowser' )!.SetHasClass( 'pausemenu-navbar__btn-small--hidden', !bIsCommunityServer );
        // If in Survival then update the end of match instance here
        _UpdateSurvivalEndOfMatchInstance();
        // If on a mission then show the active mission
        _AddPauseMenuMissionPanel();
        // Reset to Home
        _OnHomeButtonPressed();
    };
    const _OnHidePauseMenu = function () {
        $.GetContextPanel().RemoveClass('MainMenuRootPanel--PauseMenuMode');
        //Delete pause menu mission panel
        _DeletePauseMenuMissionPanel();
        // UiToolkitAPI.HideCustomLayoutTooltip( 'TooltipActiveMission' );
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
                //No connection to GC so show a message
                UiToolkitAPI.ShowGenericPopupOk($.Localize('#SFUI_SteamConnectionErrorTitle'), $.Localize('#SFUI_Steam_Error_LinkUnexpected'), '', function () { });
                return false;
            }
        }
        // Otherwise tabs can open
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
        $.Msg("[CSGO_MainMenu]", 'tabToShow: ' + tab + ' XmlName = ' + XmlName);
        if (!_BCheckTabCanBeOpenedRightNow(tab)) {
            _OnHomeButtonPressed();
            return; // validate that tabs can be opened (GC connection / China free-to-play / etc.)
        }
        if (tab === 'JsPlayerStats' && !_CanOpenStatsPanel()) {
            return;
        }
        $.DispatchEvent('PlayMainMenuMusic', true, false);
        // Turn off ambient sound on movies.
        GameInterfaceAPI.SetSettingString('panorama_play_movie_ambient_sound', '0');
        // Check to see if tab to show exists.
        // If not load the xml file.
        if (!$.GetContextPanel().FindChildInLayoutFile(tab)) {
            const newPanel = $.CreatePanel('Panel', _m_elContentPanel, tab);
            /* 	CSGO_SOURCE2_UNSUPPORTED
            newPanel.Data().elMainMenuRoot = $.GetContextPanel();
            CSGO_SOURCE2_UNSUPPORTED */
            $.Msg("[CSGO_MainMenu]", 'Created Panel with id: ' + newPanel.id);
            newPanel.BLoadLayout('file://{resources}/layout/' + XmlName + '.xml', false, false);
            newPanel.SetReadyForDisplay(false); // Start unready to received the first ready for display event
            newPanel.RegisterForReadyEvents(true);
            // Handler that catches OnPropertyTransitionEndEvent event for this panel.
            // Check if the panel is transparent then collapse it.
            $.RegisterEventHandler('PropertyTransitionEnd', newPanel, function (panel, propertyName) {
                if (newPanel.id === panel.id && propertyName === 'opacity') {
                    // Panel is visible and fully transparent
                    if (newPanel.visible === true && newPanel.BIsTransparent()) {
                        // Set visibility to false and unload resources
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
        // If a we have a active tab and it is different from the selected tab hide it.
        // Then show the selected tab
        if (_m_activeTab !== tab) {
            //Trigger sound event for the new panel
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
            // If the tab exists then hide it
            if (_m_activeTab) {
                $.GetContextPanel().CancelDrag();
                const panelToHide = $.GetContextPanel().FindChildInLayoutFile(_m_activeTab);
                panelToHide.AddClass('mainmenu-content--hidden');
                $.Msg("[CSGO_MainMenu]", 'HidePanel: ' + _m_activeTab);
            }
            //Show selected tab
            _m_activeTab = tab;
            const activePanel = $.GetContextPanel().FindChildInLayoutFile(tab);
            activePanel.RemoveClass('mainmenu-content--hidden');
            // Force a reload of any resources since we're about to display the panel
            activePanel.visible = true;
            activePanel.SetReadyForDisplay(true);
            $.Msg("[CSGO_MainMenu]", 'ShowPanel: ' + _m_activeTab);
            // pause main menu character anim/rendering	
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
        // Uncheck the active button in the main menu navbar.
        const elActiveNavBarBtn = _GetActiveNavBarButton();
        if (elActiveNavBarBtn && elActiveNavBarBtn.id !== 'MainMenuNavBarHome') {
            elActiveNavBarBtn.checked = false;
        }
        _DimMainMenuBackground(true);
        // If the tab exists then hide it
        if (_m_activeTab) {
            $.GetContextPanel().CancelDrag();
            const panelToHide = $.GetContextPanel().FindChildInLayoutFile(_m_activeTab);
            panelToHide.AddClass('mainmenu-content--hidden');
            $.Msg("[CSGO_MainMenu]", 'HidePanel: ' + _m_activeTab);
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
    //--------------------------------------------------------------------------------------------------
    // Function called from top bar button presses
    //--------------------------------------------------------------------------------------------------
    const _ShowHideNavDrawer = function () {
        UiToolkitAPI.ShowCustomLayoutPopup('', 'file://{resources}/layout/popups/popup_navdrawer.xml');
    };
    // Sidebar expand and minimize
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
        // #JsMainMenuContent being null implies this call to _MinimizeSidebar is due to onmouseout event
        // being dispatched as part of panel being destroyed on game exit, so just return, otherwise js
        // result is js exceptions 
        if (_m_elContentPanel == null) {
            return;
        }
        // If a context menu that is opened from an element is the Sidebar
        // then do not minimize the Sidebar.
        if (_m_sideBarElementContextMenuActive) {
            return;
        }
        const elSidebar = $('#JsMainMenuSidebar');
        if (!elSidebar.BHasClass('mainmenu-sidebar--minimized')) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'sidemenu_slideout', 'MOUSE');
        }
        elSidebar.AddClass('mainmenu-sidebar--minimized');
        _SlideSearchPartyParticles(false);
        //mainMenuContent.style.clip = 'rect( 0%, 100%, 100%, 0% );'
        //$( '#JsPartyControls' ).style.clip = 'rect( 0%, 100%, 100%, 0% );'
        $.DispatchEvent('SidebarIsCollapsed', true);
        _DimMainMenuBackground(true);
    };
    const _OnSideBarElementContextMenuActive = function (bActive) {
        // Store state of context menu, open or closed.
        _m_sideBarElementContextMenuActive = bActive;
        // A context menu that is opened from an element is the Sidebar is now closed.
        // We check to see if the curser is outside the bounds of the Sidebar.
        // If it is then we minimze the sidebar.
        // Needs a delayy after the context menu closes to check if the curser is over Sidebar.
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
    //--------------------------------------------------------------------------------------------------
    // Icon buttons functions
    //--------------------------------------------------------------------------------------------------
    function _OnHomeButtonPressed() {
        $.DispatchEvent('HideContentPanel');
        ParticleControls.UpdateMainMenuTopBar(m_MainMenuTopBarParticleFX, '');
        // resume main menu character anim/rendering	
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
        //$.Msg( "[CSGO_MainMenu]", 'QuitGame: You pressed ' + msg + '\n' );
        GameInterfaceAPI.ConsoleCommand('quit');
    }
    //--------------------------------------------------------------------------------------------------
    // Set up child panels
    //--------------------------------------------------------------------------------------------------
    const _InitFriendsList = function () {
        const friendsList = $.CreatePanel('Panel', $.FindChildInContext('#mainmenu-sidebar__blur-target'), 'JsFriendsList');
        friendsList.BLoadLayout('file://{resources}/layout/friendslist.xml', false, false);
    };
    const _InitNewsAndStore = function () {
        // Has MainMenuModeOnly style
        _AddStream();
        // Has MainMenuModeOnly style
        const elNews = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsNewsPanel');
        elNews.BLoadLayout('file://{resources}/layout/mainmenu_news.xml', false, false);
        // Has MainMenuModeOnly style
        const elLastMatch = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsLastMatch', {
            useglobalcontext: 'true'
        });
        elLastMatch.BLoadLayout('file://{resources}/layout/mainmenu_lastmatch.xml', false, false);
        // Has MainMenuModeOnly style
        const elStore = $.CreatePanel('Panel', $.FindChildInContext('#JsNewsContainer'), 'JsStorePanel');
        elStore.BLoadLayout('file://{resources}/layout/mainmenu_store.xml', false, false);
        // Has MainMenuModeOnly style
        // START Disabled for shipping May 15th 2021 when we are turning off redemtions of tokens.
        // const elOperationStoreBalanceReminder = $.CreatePanel( 'Panel', $.FindChildInContext( '#JsNewsContainer' ), 'JsOpBalance' );
        // elOperationStoreBalanceReminder .BLoadLayout( 'file://{resources}/layout/mainmenu_operation_balance_reminder.xml', false, false );
        // END
        // $.FindChildInContext( '#JsNewsContainer' )!.OnPropertyTransitionEndEvent = function ( panelName, propertyName )
        // {
        //     if ( elNews.id === panelName && propertyName === 'opacity' )
        //     {
        //         // Panel is visible and fully transparent
        //         if ( elNews.visible === true && elNews.BIsTransparent() )
        //         {
        //             // Set visibility to false and unload resources
        //             elNews.visible = false;
        //             elNews.SetReadyForDisplay( false );
        //             return true;
        //         }
        //     }
        //     return false;
        // };
        // toggle for featured panel
        const bFeaturedPanelIsActive = false;
        if (bFeaturedPanelIsActive) {
            // mainmenu_tournament_pass_status.xm Not used here for 2021 Stokholm tournament
            //_AddFeaturedPanel( 'mainmenu_tournament_pass_status.xml', 'JsTournamentPanel');
            _AddFeaturedPanel('operation/operation_mainmenu.xml', 'JsOperationPanel');
        }
        // no strings in english for perfect world, therefore no watch notice panel
        // if ( _m_bPerfectWorld )
        // {
        _AddWatchNoticePanel();
        // }
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
        // Tell the children panel if they need to change thier styles to accommodate the featured panel.
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
        // const elQuitutton = $.FindChildInContext( '#MainMenuNavBarQuit' );
        // if ( elQuitutton )
        // {
        // 	elQuitutton.visible = true;
        // }
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
        // const elQuitutton = $.FindChildInContext( '#MainMenuNavBarQuit' );
        // if ( elQuitutton )
        // {
        // 	elQuitutton.visible = false;
        // }
        $.FindChildInContext('#JsStreamContainer').SetHasClass('hidden', true);
    };
    // Set parnet news panel style to account for playing the stream
    // Will shrink the news and hide the matchlister and featured
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
    //--------------------------------------------------------------------------------------------------
    // Party searching particles
    //--------------------------------------------------------------------------------------------------
    const _UpdatePartySearchParticlesType = function (isPremier) {
        let particle_container = $('#party-search-particles');
        if (isPremier) {
            particle_container.SetParticleNameAndRefresh("particles/ui/ui_mainmenu_active_search_gold.vpcf");
        }
        else {
            particle_container.SetParticleNameAndRefresh("particles/ui/ui_mainmenu_active_search.vpcf");
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
        //Set the type of effect
        //Gold for premier 
        //Green for regular
        let bAttemptPremierMode = LobbyAPI.GetSessionSettings()?.game?.mode_ui === 'premier';
        _UpdatePartySearchParticlesType(bAttemptPremierMode);
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
            // ui_mainmenu_active_search.vpcf - Cp 1 ( VERTICAL SPREAD, LifeSpan Scale (0-3), SpeedMult ), Cp 2 ( Radius Scale, Alpha Scale , Desaturation Scale ), Cp 16 ( R, G, B )
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
    //--------------------------------------------------------------------------------------------------
    // Setup player panel
    //--------------------------------------------------------------------------------------------------
    const _ForceRestartVanity = function () {
        if (GameStateAPI.IsLocalPlayerPlayingMatch()) {
            return;
        }
        _m_bVanityAnimationAlreadyStarted = false;
        _InitVanity();
    };
    // set up a panel that approximates hovering over character model
    function _RigVanityHover(vanityPanel) {
        // if ( !vanityPanel || !vanityPanel.IsValid() )
        // 	return;
        // const elHover = $( "#id-mainmenu-vanity-hover" );
        // if ( !elHover || !elHover.IsValid )
        // 	return;
        // const OnMouseOver = function()
        // {
        // 	if ( $( '#VanityControls' ) )
        // 	{
        // 		$( '#VanityControls' ).AddClass( 'pulse-vanity-controls')
        // 	}
        // };
        // const OnMouseOut = function()
        // {
        // 	if ( $( '#VanityControls' ) )
        // 	{
        // 		$( '#VanityControls' ).RemoveClass( 'pulse-vanity-controls')
        // 	}
        // };
        // elHover.SetPanelEvent( 'onmouseover', OnMouseOver );
        // elHover.SetPanelEvent( 'onmouseout', OnMouseOut );
    }
    let m_aDisplayLobbyVanityData = [];
    const _InitVanity = function () {
        if (MatchStatsAPI.GetUiExperienceType()) {
            return;
        }
        $.Msg("[CSGO_MainMenu]", "_InitVanity: called");
        if (!MyPersonaAPI.IsInventoryValid()) {
            $.Msg("[CSGO_MainMenu]", "_InitVanity: inventory not valid yet");
            return;
        }
        if (_m_bVanityAnimationAlreadyStarted) {
            $.Msg("[CSGO_MainMenu]", "_InitVanity: vanity animation already started, not restarting");
            return;
        }
        const vanityPanel = $('#JsMainmenu_Vanity');
        if (!vanityPanel) {
            $.Msg("[CSGO_MainMenu]", "_InitVanity: failed to find panel 'JsMainmenu_Vanity'");
            return;
        }
        // Kick off animating character
        $.Msg("[CSGO_MainMenu]", "_InitVanity: kicking off character animation");
        _m_bVanityAnimationAlreadyStarted = true;
        if (vanityPanel.BHasClass('hidden')) {
            vanityPanel.RemoveClass('hidden');
        }
        _UpdateLocalPlayerVanity();
    };
    function _UpdateLocalPlayerVanity() {
        // Force vanity settings to be processed and validated
        const oSettings = ItemInfo.GetOrUpdateVanityCharacterSettings();
        // See if local player is in a lobby with more that one person
        // then use the lobby position for them otherwise put them in the center 0 position
        const oLocalPlayer = m_aDisplayLobbyVanityData.filter(storedEntry => { return storedEntry.isLocalPlayer === true; });
        oSettings.playeridx = oLocalPlayer.length > 0 ? oLocalPlayer[0].playeridx : 0;
        // stomp these settings
        oSettings.xuid = MyPersonaAPI.GetXuid();
        oSettings.isLocalPlayer = true;
        // Apply vanity settings in the lobby metadata for showing 'self'
        _ApplyVanitySettingsToLobbyMetadata(oSettings);
        _UpdatePlayerVanityModel(oSettings);
        _CreatUpdateVanityInfo(oSettings);
    }
    ;
    const _ApplyVanitySettingsToLobbyMetadata = function (oSettings) {
        // Push vanity settings into the lobby metadata
        PartyListAPI.SetLocalPlayerVanityPresence(oSettings.team, oSettings.charItemId, oSettings.glovesItemId, oSettings.loadoutSlot, oSettings.weaponItemId);
    };
    const _UpdatePlayerVanityModel = function (oSettings) {
        const vanityPanel = _UpdateBackgroundMap();
        vanityPanel.SetActiveCharacter(oSettings.playeridx);
        oSettings.panel = vanityPanel;
        $.Msg("_InitVanity: successfully parsed vanity info: " + oSettings);
        CharacterAnims.PlayAnimsOnPanel(oSettings);
    };
    const _CreatUpdateVanityInfo = function (oSettings) {
        $.Schedule(.1, () => {
            const elVanityPlayerInfo = VanityPlayerInfo.CreateOrUpdateVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), oSettings);
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
            $.Msg('NEW LOBBY_DATA' + JSON.stringify(aCurrentLobbyVanityData));
            $.Msg('OLD DISPLAY_DATA' + JSON.stringify(m_aDisplayLobbyVanityData));
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
            // Makes sure we have data for the models before we update.
            if (aCurrentLobbyVanityData[i]) {
                // If there is no data then make an object to hold it.
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
                    // Delete info when xuid changes
                    VanityPlayerInfo.DeleteVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), aCurrentLobbyVanityData[i].playeridx);
                    if (aCurrentLobbyVanityData[i].isLocalPlayer) {
                        // up date local player if thier position moves
                        _UpdateLocalPlayerVanity();
                    }
                }
                m_aDisplayLobbyVanityData[i].xuid = aCurrentLobbyVanityData[i].xuid;
                // for all not local players update the vanity model only when the vanity date is different
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
        $.Msg('NEW DISPLAY_DATA' + JSON.stringify(m_aDisplayLobbyVanityData));
    };
    const _ClearLobbyPlayers = function () {
        // no lobby members so clear any displayed data that we have
        m_aDisplayLobbyVanityData.forEach((element, index) => {
            _ClearLobbyVanityModel(index);
        });
        $.Msg('DELETED DISPLAY_DATA' + JSON.stringify(m_aDisplayLobbyVanityData));
        m_aDisplayLobbyVanityData = [];
    };
    const _ClearLobbyVanityModel = function (index) {
        VanityPlayerInfo.DeleteVanityInfoPanel($.GetContextPanel().FindChildInLayoutFile('MainMenuVanityInfo'), index);
        $.Msg('CLEAR VANITY MODEL INDEX: ' + index);
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
            playeridx: index // since player model one is 0 the lobby models start at 1'
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
    // TODO: Update displayed player equipement for ourselves and partymembers 
    const _OnEquipSlotChanged = function () {
    };
    const _OpenPlayMenu = function () {
        // Play menu is not accessible when in the game server
        if (MatchStatsAPI.GetUiExperienceType())
            return;
        _InsureSessionCreated();
        _NavigateToTab('JsPlay', 'mainmenu_play');
        // pause main menu character anim/rendering	
        _PauseMainMenuCharacter();
    };
    const _OpenWatchMenu = function () {
        _PauseMainMenuCharacter();
        _NavigateToTab('JsWatch', 'mainmenu_watch');
    };
    const _OpenInventory = function () {
        // pause main menu character anim/rendering	
        _PauseMainMenuCharacter();
        _NavigateToTab('JsInventory', 'mainmenu_inventory');
    };
    const _OpenStatsMenu = function () {
        // pause main menu character anim/rendering	
        _PauseMainMenuCharacter();
        _NavigateToTab('JsPlayerStats', 'mainmenu_playerstats');
    };
    const _OpenSubscriptionUpsell = function () {
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_subscription_upsell.xml', '');
    };
    const _ShowLoadoutForItem = function (itemId) {
        // If the loadout is not created, we will make it when we press the loadout button.
        // Then refire the event after it is made
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
        $.Msg("[CSGO_MainMenu]", 'Created Panel with id: ' + newPanel.id);
        newPanel.BLoadLayout('file://{resources}/layout/' + XmlName + '.xml', false, false);
        newPanel.RegisterForReadyEvents(true);
        newPanel.AddClass('mainmenu-content--hidden');
        // Handler that catches OnPropertyTransitionEndEvent event for this panel.
        // Check if the panel is transparent then collapse it. 
        $.RegisterEventHandler('PropertyTransitionEnd', newPanel, function (panelName, propertyName) {
            if (newPanel.id === panelName && propertyName === 'opacity') {
                // Panel is visible and fully transparent
                if (newPanel.visible === true && newPanel.BIsTransparent()) {
                    // Set visibility to false and unload resources
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
    //--------------------------------------------------------------------------------------------------
    // Update inventory 
    //--------------------------------------------------------------------------------------------------
    const _InventoryUpdated = function () {
        _ForceRestartVanity();
        _UpdateInventoryBtnAlert();
        _UpdateSubscriptionAlert();
    };
    const _UpdateInventoryBtnAlert = function () {
        const aNewItems = AcknowledgeItems.GetItems();
        // const aOperationItems = aNewItems.filter( item => 'quest_reward' === ItemInfo.GetItemPickUpMethod( item.id ) );
        // Commenting out for operation 10 as its has a store and no rewards from gameplay
        // When we show the main menu if we have any operation items that were rewarding from gameplay
        // if ( aOperationItems.length > 0 && !GameStateAPI.IsConnectedOrConnectingToServer() )
        // {
        // 	_ShowAcknowledgePopup( '', '' );
        // }
        const count = aNewItems.length;
        const elNavBar = $.GetContextPanel().FindChildInLayoutFile('MainMenuNavBarTop'), elAlert = elNavBar.FindChildInLayoutFile('MainMenuInvAlert');
        elAlert.SetDialogVariable("alert_value", count.toString());
        // elAlert.FindChildInLayoutFile('MainMenuInvAlertText').text = count;
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
        $.Msg("[CSGO_MainMenu]", 'params: ' + params);
        const ParamsList = params.split(',');
        const keyId = ParamsList[0];
        const caseId = ParamsList[1];
        const storeId = ParamsList[2];
        const blurOperationPanel = ParamsList[3];
        const extrapopupfullscreenstyle = ParamsList[4];
        // Anything after 3 id params for the callback is used for operation popup currently
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
        // If you are coming from a decode panel when we are done with the inpsect we want to open that panel up again.
        // Since these are pop ups we have closed the decode and will need to open it again.
        // params andf key and case id
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
        // if there's no active popup notification, check if we should show one
        if (!_m_bHasPopupNotification) {
            const popupNotification = _GetPopupNotification();
            if (popupNotification != null) {
                const elPopup = UiToolkitAPI.ShowGenericPopupOneOption(popupNotification.title, popupNotification.msg, popupNotification.color_class, '#SFUI_MainMenu_ConfirmBan', popupNotification.callback);
                // We control labels for all of these, safe to use html
                if (popupNotification.html)
                    elPopup.EnableHTML();
                _m_bHasPopupNotification = true;
            }
        }
    }
    function _GetNotificationBarData() {
        const notification = { color_class: "", title: "", tooltip: "", link: "" };
        if (LicenseUtil.GetCurrentLicenseRestrictions() === false) {
            //
            // Establishing connection to GC spinner - only show it up if the user has no license problems
            //
            const bIsConnectedToGC = MyPersonaAPI.IsConnectedToGC();
            $('#MainMenuInput').SetHasClass('GameClientConnectingToGC', !bIsConnectedToGC);
            if (bIsConnectedToGC) { // We are connected to GC, no need to track reconnection attempts
                _m_tLastSeenDisconnectedFromGC = 0;
            }
            else if (!_m_tLastSeenDisconnectedFromGC) { // We just got disconnected from GC, start tracking disconnection attempts
                _m_tLastSeenDisconnectedFromGC = +new Date(); // current UTC timestamp in milliseconds (seconds * 1000)
            }
            else if (Math.abs((+new Date()) - _m_tLastSeenDisconnectedFromGC) > 7000) { // We have been disconnected for 7+ seconds
                notification.color_class = "NotificationLoggingOn";
                notification.title = $.Localize("#Store_Connecting_ToGc");
                notification.tooltip = $.Localize("#Store_Connecting_ToGc_Tooltip");
                return notification;
            }
        }
        //
        // VAC banned account warning
        //
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
        //
        // Game client out-of-date warning
        //
        if (NewsAPI.IsNewClientAvailable()) {
            notification.color_class = "NotificationYellow";
            notification.title = $.Localize("#SFUI_MainMenu_Outofdate_Title");
            notification.tooltip = $.Localize("#SFUI_MainMenu_Outofdate_Body");
            return notification;
        }
        //
        // Cooldown countdown warning
        //
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
            // add time to title if cooldown expires within 50 days (all permanent cooldowns have 60+ days and don't expire)
            //if ( nBanRemaining <= 49*24*3600 )
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
        // update color bar
        _m_NotificationBarColorClasses.forEach(function (strColorClass) {
            const bVisibleColor = notification && notification.color_class;
            _m_elNotificationsContainer.SetHasClass(strColorClass, !!bVisibleColor);
        });
        // setup new notification
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
    //--------------------------------------------------------------------------------------------------
    // Acknowledge popup
    //--------------------------------------------------------------------------------------------------
    let _m_acknowledgePopupHandler = null;
    const _ShowAcknowledgePopup = function (type = '', itemid = '') {
        if (type === 'xpgrant') { // Custom message when player used 'xpgrant' item
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
            // FIXME: do we need dismiss event? 
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
        return; // end of August 2018, MP5 announcement has done its job
        const setVersionTo = '1';
        const currentVersion = GameInterfaceAPI.GetSettingString('ui_popup_weaponupdate_version');
        if (currentVersion !== setVersionTo) {
            /* CSGO_SOURCE2_UNSUPPORTED
                        // this is for the MP5
                        $.Schedule( 1.75, showMp5Popup );
            
                        function showMp5Popup ()
                        {
                            const defIndex = 23;
                            UiToolkitAPI.ShowCustomLayoutPopupParameters(
                                '',
                                'file://{resources}/layout/popups/popup_weapon_update.xml',
                                'defindex=' + defIndex +
                                '&' + 'uisettingversion=' + setVersionTo,
                                'none'
                            );
                        }
            CSGO_SOURCE2_UNSUPPORTED */
        }
    };
    const _ShowOperationLaunchPopup = function () {
        if (_m_hOnEngineSoundSystemsRunningRegisterHandle) {
            $.Msg("Main menu : unregistering from EngineSoundSystemsRunning listener - safe to check config");
            $.UnregisterForUnhandledEvent("PanoramaComponent_GameInterface_EngineSoundSystemsRunning", _m_hOnEngineSoundSystemsRunningRegisterHandle);
            _m_hOnEngineSoundSystemsRunningRegisterHandle = null;
        }
        // return; // end of March 2021, operation announcement movie has done it's job, using it for Premier Upsell
        const setVersionTo = '2109'; // Year '21, Month 09, must be numeric
        // CSGO_SOURCE2_PORT disable operation fang video for now
        /* CSGO_SOURCE2_UNSUPPORTED
                const currentVersion = GameInterfaceAPI.GetSettingString( 'ui_popup_weaponupdate_version' );
                if ( currentVersion !== setVersionTo )
                {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters(
                        '',
                        'file://{resources}/layout/popups/popup_operation_launch.xml',
                        'uisettingversion=' + setVersionTo,
                        'none'
                    );
                }
        CSGO_SOURCE2_UNSUPPORTED */
        GameInterfaceAPI.SetSettingString('ui_popup_weaponupdate_version', setVersionTo); // CSGO_SOURCE2_PORT always set version to 2
    };
    const _ShowUpdateWelcomePopup = function () {
        const setVersionTo = '2303'; // Year '23, Month 03, must be numeric
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
    //--------------------------------------------------------------------------------------------------
    // Mission in Pause menu 
    //--------------------------------------------------------------------------------------------------
    function _AddPauseMenuMissionPanel() {
        let elPanel = null;
        const missionId = GameStateAPI.GetActiveQuestID();
        $.Msg('GameStateAPI.GetActiveQuestID(): ' + missionId);
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
        //Dirty Cp 3
        particle_container.SetControlPoint(3, 0, 0, 0);
        particle_container.SetControlPoint(3, 1, 0, 0);
    };
    //--------------------------------------------------------------------------------------------------
    // Survival End Of Match instance in Pause menu 
    //--------------------------------------------------------------------------------------------------
    const _ResetSurvivalEndOfMatch = function () {
        _DeleteSurvivalEndOfMatch();
        function CreateEndOfMatchPanel() {
            const elPanel = $('#PauseMenuSurvivalEndOfMatch');
            if (!elPanel) {
                /* CSGO_SOURCE2_UNSUPPORTED
                elPanel = $.CreatePanel(
                    'CSGOSurvivalEndOfMatch',
                    $( '#MainMenuBackground' ),
                    'PauseMenuSurvivalEndOfMatch',
                    {
                        class: 'PauseMenuModeOnly'
                    }
                );

                elPanel.SetAttributeString( 'pausemenu', 'true' );
                */
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
        //const btn = $.GetContextPanel().FindChildInLayoutFile( 'MainMenuNavBarWatch' );
        //const alert = btn.FindChildInLayoutFile( 'MainMenuWatchAlert' );
        //
        //const showAlert = GameInterfaceAPI.GetSettingString( 'ui_new_events_alert_seen' );
        //const shouldHide = showAlert === '0' ? false : true;
        //
        //alert.SetHasClass( 'hidden', shouldHide );
    };
    const _WatchBtnPressedUpdateAlert = function () {
        // GameInterfaceAPI.SetSettingString( 'ui_new_events_alert_seen', '1' );
        _ShowHideAlertForNewEventForWatchBtn();
    };
    const _StatsBtnPressedUpdateAlert = function () {
        // GameInterfaceAPI.SetSettingString( 'ui_new_events_alert_seen', '1' );
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
    //--------------------------------------------------------------------------------------------------
    function _OnGoToCharacterLoadoutPressed() {
        if (!MyPersonaAPI.IsInventoryValid() || !MyPersonaAPI.IsConnectedToGC()) {
            //No connection to GC so show a message
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
            // Show the home screen behind the popup.
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
        UpdateLocalPlayerVanity: _UpdateLocalPlayerVanity
    };
})();
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
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
    /* CSGO_SOURCE2_UNSUPPORTED
    $.RegisterForUnhandledEvent( 'ShowStoreStatusPanel', MainMenu.ShowStoreStatusPanel );
    $.RegisterForUnhandledEvent( 'HideStoreStatusPanel', MainMenu.HideStoreStatusPanel );

    $.RegisterForUnhandledEvent( 'ShowVoteContextMenu', MainMenu.ShowVote );
    $.RegisterForUnhandledEvent( 'ShowTournamentStore', MainMenu.ShowTournamentStore );
    CSGO_SOURCE2_UNSUPPORTED */
    //	$.RegisterForUnhandledEvent( 'OnMapConfigLoaded', MainMenu.ResetSurvivalEndOfMatch );
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
    // MainMenu.PreloadSettings(); // <vitaliy 2023-03-17> -- we must load options much later when cloud configs were fully processed
    MainMenu.MinimizeSidebar();
    MainMenu.InitFriendsList();
    MainMenu.InitNewsAndStore();
    $.RegisterForUnhandledEvent('CSGOMainMenuEscapeKeyPressed', MainMenu.OnEscapeKeyPressed);
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_ProfileUpdated', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', MainMenu.UpdateLocalPlayerVanity);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', MainMenu.UpdateLocalPlayerVanity);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYWlubWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLGlEQUFpRDtBQUNqRCw4Q0FBOEM7QUFDOUMsb0RBQW9EO0FBQ3BELHlEQUF5RDtBQUN6RCxtQ0FBbUM7QUFDbkMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyw2Q0FBNkM7QUFFN0Msb0dBQW9HO0FBQ3BHLHdDQUF3QztBQUN4QyxvR0FBb0c7QUFFcEcsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGdCQUFnQixHQUFHLENBQUUsWUFBWSxDQUFDLGVBQWUsRUFBRSxLQUFLLGNBQWMsQ0FBRSxDQUFDO0lBQy9FLElBQUksWUFBWSxHQUFrQixJQUFJLENBQUM7SUFDdkMsSUFBSSxrQ0FBa0MsR0FBRyxLQUFLLENBQUM7SUFDL0MsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUUsb0JBQW9CLENBQUcsQ0FBQztJQUNyRCxJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQztJQUVsQyxlQUFlO0lBQ2YsTUFBTSwyQkFBMkIsR0FBRyxDQUFDLENBQUUseUJBQXlCLENBQUcsQ0FBQztJQUNwRSxJQUFJLHVCQUF1QixHQUFtQixLQUFLLENBQUM7SUFDcEQsSUFBSSxpQ0FBaUMsR0FBRyxLQUFLLENBQUM7SUFDOUMsSUFBSSx3QkFBd0IsR0FBRyxLQUFLLENBQUM7SUFDckMsSUFBSSw4QkFBOEIsR0FBRyxDQUFDLENBQUM7SUFDdkMsTUFBTSw4QkFBOEIsR0FBRztRQUN0QyxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSx1QkFBdUI7S0FDckYsQ0FBQztJQUVGLG1DQUFtQztJQUNuQyxJQUFJLGlDQUFpQyxHQUFrQixJQUFJLENBQUM7SUFDNUQsSUFBSSw0Q0FBNEMsR0FBa0IsSUFBSSxDQUFDO0lBQ3ZFLElBQUksc0NBQXNDLEdBQWtCLElBQUksQ0FBQztJQUNqRSxJQUFJLHdD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