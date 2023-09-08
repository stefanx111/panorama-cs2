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
    function _msg(text) {
        $.Msg('mainmenu.ts: ' + text);
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
            SetHideTranstionOnLeftColumn();
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
    function SetHideTranstionOnLeftColumn() {
        const elLeftColumn = $.FindChildInContext('#JsLeftColumn');
        // Handler that catches OnPropertyTransitionEndEvent event for this panel.
        const fnOnPropertyTransitionEndEvent = function (panelName, propertyName) {
            if (elLeftColumn.id === panelName && propertyName === 'opacity') {
                // Panel is visible and fully transparent
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
        // _ShowWeaponUpdatePopup();
        _UpdateInventoryBtnAlert();
        // Trigger one time processing
        _GcLogonNotificationReceived();
        //Delete survival pausemenu end of match stats panel instance if it exists
        _DeleteSurvivalEndOfMatch();
        //Delete pause menu mission panel
        // _DeletePauseMenuMissionPanel();
        //Should show new events tab alert on the the watch nav bar btn
        _ShowHideAlertForNewEventForWatchBtn();
        //Show hide the unlocked competitive alert on play button
        _UpdateUnlockCompAlert();
        _FetchTournamentData();
        _ShowFloatingPanels();
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
        _HideFloatingPanels();
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
        // Inital show for 
        // _ShowFloatingPanels();
        // NOT USED IN S2
        // Has MainMenuModeOnly style
        //_AddStream();
        // Has MainMenuModeOnly style
        // const elNews = $.CreatePanel( 'Panel', $.FindChildInContext( '#JsNewsContainer' )!, 'JsNewsPanel' );
        // elNews.BLoadLayout( 'file://{resources}/layout/mainmenu_news.xml', false, false );
        // NOT USED IN S2
        // Has MainMenuModeOnly style
        // const elLastMatch = $.CreatePanel( 'Panel', $.FindChildInContext( '#JsNewsContainer' )!, 'JsLastMatch', {
        // 	useglobalcontext: 'true'
        // } );
        // NOT USED IN S2
        // elLastMatch.BLoadLayout( 'file://{resources}/layout/mainmenu_lastmatch.xml', false, false );
        // NOT USED IN S2
        // Has MainMenuModeOnly style
        //const elStore = $.CreatePanel( 'Panel', $.FindChildInContext( '#JsNewsContainer' )!, 'JsStorePanel' );
        //elStore.BLoadLayout( 'file://{resources}/layout/mainmenu_store.xml', false, false );
        // NOT USED IN S2
        // Has MainMenuModeOnly style
        // START Disabled for shipping May 15th 2021 when we are turning off redemtions of tokens.
        // const elOperationStoreBalanceReminder = $.CreatePanel( 'Panel', $.FindChildInContext( '#JsNewsContainer' ), 'JsOpBalance' );
        // elOperationStoreBalanceReminder .BLoadLayout( 'file://{resources}/layout/mainmenu_operation_balance_reminder.xml', false, false );
        // END
        // NOT USED IN S2
        // toggle for featured panel
        //const bFeaturedPanelIsActive = false;
        //if ( bFeaturedPanelIsActive )
        //{
        // mainmenu_tournament_pass_status.xm Not used here for 2021 Stokholm tournament
        // _AddFeaturedPanel( 'operation/operation_mainmenu.xml', 'JsOperationPanel' );
        //}
        // no strings in english for perfect world, therefore no watch notice panel
        // if ( _m_bPerfectWorld )
        // {
        //	_AddWatchNoticePanel();
        // }
        // NOT USED IN S2
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
    const _ShowFloatingPanels = function () {
        $.FindChildInContext('#JsLeftColumn').SetHasClass('hidden', false);
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
    const _HideFloatingPanels = function () {
        $.FindChildInContext('#JsLeftColumn').SetHasClass('hidden', true);
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
        //Set the type of effect
        //Gold for premier 
        //Green for regular
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
        // } else 
        // {
        // 	particle_container.StartParticles();
        // 	m_isParticleActive = true;
        // }
        let verticlSpread = 14 + (PartyListAPI.GetCount() - 1) * 5 + AddServerErrors;
        if (m_verticalSpread === verticlSpread && m_isParticleActive)
            return;
        _UpdatePartySearchParticlesType(bAttemptPremierMode);
        m_verticalSpread = verticlSpread;
        // ui_mainmenu_active_search.vpcf - Cp 1 ( VERTICAL SPREAD, LifeSpan Scale (0-3), SpeedMult ), Cp 2 ( Radius Scale, Alpha Scale , Desaturation Scale ), Cp 16 ( R, G, B )
        let CpArray = [
            [1, verticlSpread, .5, 1],
            [2, 1, .25, 0],
            [16, 15, 230, 15], //set the color for search
        ];
        _UpdatePartySearchSetControlPointParticles(CpArray);
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
        $.Msg('_ForceRestartVanity');
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
            if (MyPersonaAPI.GetClientLogonFatalError()) {
                //Shows default settings vanity since you will not get valid inventory in this state
                _ShowVanity();
            }
            return;
        }
        if (_m_bVanityAnimationAlreadyStarted) {
            $.Msg("[CSGO_MainMenu]", "_InitVanity: vanity animation already started, not restarting");
            return;
        }
        _ShowVanity();
    };
    function _ShowVanity() {
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
    }
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
        $.Msg('__InventoryUpdated-ForceRestartVanity');
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
        const particle_container = $('#party-search-particles');
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