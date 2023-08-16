"use strict";
/// <reference path="csgo.d.ts" /> 
/// <reference path="common/scheduler.ts" />
/// <reference path="avatar.ts" />
/// <reference path="particle_controls.ts" />	
/// <reference path="util_gamemodeflags.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/icon.ts" />
/// <reference path="common/licenseutil.ts" />
/// <reference path="common/sessionutil.ts" />
/// <reference path="controlslibrary.ts" />
/// <reference path="mainmenu_play_workshop.ts" />
var PlayMenu = (function () {
    const k_workshopPanelId = 'gameModeButtonContainer_workshop';
    // Holds handles to panels containing game mode selection buttons. 
    const m_mapSelectionButtonContainers = {};
    // Game mode configs from GameModes.txt.
    let m_gameModeConfigs = {};
    // Array of game mode selection radio button panels.
    let m_arrGameModeRadios = [];
    // Helper functions that get implemented in Init
    let GetMGDetails;
    let GetGameType;
    const m_bPerfectWorld = (MyPersonaAPI.GetLauncherType() === 'perfectworld');
    let m_activeMapGroupSelectionPanelID = null;
    let m_permissions = '';
    // for regular game modes (m_workshop = false)
    let m_serverSetting = '';
    let m_gameModeSetting = '';
    let m_serverPrimeSetting = (GameInterfaceAPI.GetSettingString('ui_playsettings_prime') === '1') ? 1 : 0;
    let m_singleSkirmishMapGroup = null;
    let m_arrSingleSkirmishMapGroups = [];
    // HACK: per-mode selected map state stored directly on the button panels that are children of m_mapSelectionButtonContainers[mode_panel_id]
    const m_gameModeFlags = {};
    // for workshop maps
    let m_isWorkshop = false;
    let m_jsTimerUpdateHandle = false;
    // private queue key.
    let m_challengeKey = '';
    let m_popupChallengeKeyEntryValidate = null;
    const k_workshopModes = {
        classic: 'casual,competitive',
        casual: 'casual',
        competitive: 'competitive',
        wingman: 'scrimcomp2v2',
        deathmatch: 'deathmatch',
        training: 'training',
        coopstrike: 'coopmission',
        custom: 'custom',
        // skirmish modes
        armsrace: 'armsrace',
        demolition: 'demolition',
        flyingscoutsman: 'flyingscoutsman',
        retakes: 'retakes'
    };
    const m_PlayMenuActionBarParticleFX = $('#PlayMenuActionBar_Searching_particles');
    //const m_PlayMenuActionBarParticleFX = $( '#PlayMenuActionBar_OnPress_Particles' );
    //Create a Table of control point positions
    ParticleControls.InitMainMenuTopBar(m_PlayMenuActionBarParticleFX);
    function inDirectChallenge() {
        return _GetDirectChallengeKey() != '';
    }
    function StartSearch() {
        const btnStartSearch = $('#StartMatchBtn');
        if (btnStartSearch === null)
            return;
        btnStartSearch.AddClass('pressed');
        $.DispatchEvent('CSGOPlaySoundEffect', 'mainmenu_press_GO', 'MOUSE');
        ParticleControls.UpdateActionBar(m_PlayMenuActionBarParticleFX, "StartMatchBtn");
        //	PartyMenu.ShowMatchAcceptPopUp();
        if (inDirectChallenge()) {
            _DirectChallengeStartSearch();
            return;
        }
        if (m_isWorkshop) {
            _DisplayWorkshopModePopup();
        }
        else {
            if (m_gameModeSetting !== 'premier') {
                // even though settings are guaranteed to have valid maps/mapgroups, we still don't want a user to start matchmaking without an explicit map selection.
                if (!_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID))) {
                    _NoMapSelectedPopup();
                    btnStartSearch.RemoveClass('pressed');
                    return;
                }
            }
            // force the user to make some decisions here
            if (GameModeFlags.DoesModeUseFlags(_RealGameMode()) && !m_gameModeFlags[m_serverSetting + _RealGameMode()]) // flags entry exists but we dont have one set
             {
                btnStartSearch.RemoveClass('pressed');
                const resumeSearchFnHandle = UiToolkitAPI.RegisterJSCallback(StartSearch);
                _OnGameModeFlagsBtnClicked(resumeSearchFnHandle);
                return;
            }
            let settings = (LobbyAPI.IsSessionActive() && !_GetTournamentOpponent()) ? LobbyAPI.GetSessionSettings() : null;
            let stage = _GetTournamentStage();
            // [premier 2021 mixed mm] - just matchmake into the mapveto map as one of the maps
            // if ( ( !stage || stage === '' )
            // 	&& settings && settings.game && settings.options
            // 	&& settings.options.server !== 'listen'
            // 	&& settings.game.mode === 'competitive'
            // 	&& settings.game.mapgroupname.includes( 'mg_lobby_mapveto' ) )
            // {
            // 	stage = '1';
            // }
            LobbyAPI.StartMatchmaking(MyPersonaAPI.GetMyOfficialTournamentName(), MyPersonaAPI.GetMyOfficialTeamName(), _GetTournamentOpponent(), stage);
        }
    }
    function _Init() {
        // START Disabling this since we use perfect worlds url now to redirect players to community servers.
        // if ( m_bPerfectWorld )
        // {
        // 	$.GetContextPanel().AddClass( 'launcher-type-perfect-world' );
        // 	const elDropDownCommunity = $( '#PlayTopNavDropdown' );
        // 	if ( elDropDownCommunity )
        // 	{
        // 		elDropDownCommunity.RemoveOption( "PlayCommunity" );
        // 	}
        // }
        // END
        // Get map groups for modes out of gamemodes.txt
        const cfg = GameTypesAPI.GetConfig();
        // Game type is not helpful. Nobody cares about a mode being 'classic'. Dig out useful subkeys and
        // store them in a local object for easier access. 
        for (const type in cfg.gameTypes) {
            for (const mode in cfg.gameTypes[type].gameModes) {
                let obj = cfg.gameTypes[type].gameModes[mode];
                m_gameModeConfigs[mode] = obj;
            }
        }
        // Helper to dig up the game type string for a given mode based on gamemodes.txt. 
        // 'Game type' isn't very useful... trying to use it only when required and talk about modes by 'game mode' as often as possible.
        GetGameType = function (mode) {
            for (const gameType in cfg.gameTypes) {
                if (cfg.gameTypes[gameType].gameModes.hasOwnProperty(mode))
                    return gameType;
            }
        };
        GetMGDetails = function (mg) {
            return cfg.mapgroups[mg];
        };
        // Apply the settings from the preferences we read to the session so when we get the update we are
        // in sync with the sessions and not using the session defaults.
        //_ApplyNetworkSessionSettingsFromPreferences();
        const elGameModeSelectionRadios = $('#GameModeSelectionRadios');
        if (elGameModeSelectionRadios !== null) {
            m_arrGameModeRadios = elGameModeSelectionRadios.Children();
        }
        m_arrGameModeRadios = m_arrGameModeRadios.filter(elPanel => !elPanel.BHasClass('mainmenu-top-navbar__play_seperator'));
        m_arrGameModeRadios.forEach(function (entry) {
            entry.SetPanelEvent('onactivate', function () {
                m_isWorkshop = false;
                _LoadGameModeFlagsFromSettings();
                // clear skirmish
                if (!_IsSingleSkirmishString(entry.id)) {
                    m_singleSkirmishMapGroup = null;
                }
                if (entry.id === "JsDirectChallengeBtn") {
                    m_gameModeSetting = 'competitive';
                    _OnDirectChallengeBtn();
                    return;
                }
                else if (_IsSingleSkirmishString(entry.id)) {
                    m_gameModeSetting = 'skirmish';
                    m_singleSkirmishMapGroup = _GetSingleSkirmishMapGroupFromSingleSkirmishString(entry.id);
                }
                else {
                    m_gameModeSetting = entry.id;
                }
                const alert = entry.FindChild('GameModeAlert');
                if ((entry.id === "competitive" || entry.id === 'scrimcomp2v2') && alert && !alert.BHasClass('hidden')) {
                    if (GameInterfaceAPI.GetSettingString('ui_show_unlock_competitive_alert') !== '1') {
                        GameInterfaceAPI.SetSettingString('ui_show_unlock_competitive_alert', '1');
                    }
                }
                // reset the key without triggering a bunch of session update callbacks,
                // it will be pushed into the session settings in _ApplySessionSettings
                m_challengeKey = '';
                _ApplySessionSettings();
            });
        });
        m_arrGameModeRadios.forEach(function (entry) {
            if (_IsSingleSkirmishString(entry.id)) {
                m_arrSingleSkirmishMapGroups.push(_GetSingleSkirmishMapGroupFromSingleSkirmishString(entry.id));
            }
        });
        _SetUpGameModeFlagsRadioButtons();
        const elPrimeButton = $('#id-play-menu-toggle-ranked');
        if (elPrimeButton !== null) {
            const elSlider = elPrimeButton.FindChild('id-slider-btn');
            if (elSlider) {
                elSlider.text = $.Localize('#elevated_status_toggle_prime_only');
                elSlider.SetPanelEvent('onactivate', function () {
                    UiToolkitAPI.HideTextTooltip();
                    //_ApplySessionSettings();
                    ApplyPrimeSetting();
                });
            }
        }
        // Set up Permissions btn
        const elBtnContainer = $('#PermissionsSettings');
        const elPermissionsButton = elBtnContainer.FindChild("id-slider-btn");
        elPermissionsButton.SetPanelEvent('onactivate', function () {
            // UiToolkitAPI.ShowCustomLayoutPopup( 'permission_settings', 'file://{resources}/layout/popups/popup_permissions_settings.xml' );
            const bCurrentlyPrivate = (LobbyAPI.GetSessionSettings().system.access === "private");
            const sNewAccessSetting = bCurrentlyPrivate ? "public" : "private";
            const settings = {
                update: {
                    system: {
                        access: sNewAccessSetting
                    }
                }
            };
            GameInterfaceAPI.SetSettingString('lobby_default_privacy_bits', (sNewAccessSetting === "public") ? "1" : "0");
            LobbyAPI.UpdateSessionSettings(settings);
            $.DispatchEvent('UIPopupButtonClicked', '');
        });
        // Set up practice settings
        const elPracticeSettingsContainer = $('#id-play-menu-practicesettings-container');
        elPracticeSettingsContainer.Children().forEach(function (elChild) {
            if (!elChild.id.startsWith('id-play-menu-practicesettings-'))
                return;
            let strFeatureName = elChild.id;
            strFeatureName = strFeatureName.replace('id-play-menu-practicesettings-', '');
            strFeatureName = strFeatureName.replace('-tooltip', '');
            // "id-play-menu-practicesettings-grenades-tooltip" => '#practicesettings_*grenades*_button'
            const elFeatureFrame = elChild.FindChild('id-play-menu-practicesettings-' + strFeatureName);
            const elFeatureSliderBtn = elFeatureFrame.FindChild('id-slider-btn');
            elFeatureSliderBtn.text = $.Localize('#practicesettings_' + strFeatureName + '_button');
            elFeatureSliderBtn.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.HideTextTooltip();
                const sessionSettings = LobbyAPI.GetSessionSettings();
                const curvalue = (sessionSettings && sessionSettings.options && sessionSettings.options.hasOwnProperty('practicesettings_' + strFeatureName))
                    ? sessionSettings.options['practicesettings_' + strFeatureName] : 0;
                // flip the value setting in the session
                const newvalue = curvalue ? 0 : 1;
                const setting = 'practicesettings_' + strFeatureName;
                const newSettings = { update: { options: {} } };
                newSettings.update.options[setting] = newvalue;
                LobbyAPI.UpdateSessionSettings(newSettings);
            });
        });
        //Set up StartSearch Button
        const btnStartSearch = $('#StartMatchBtn');
        btnStartSearch.SetPanelEvent('onactivate', StartSearch);
        const btnCancel = $.GetContextPanel().FindChildInLayoutFile('PartyCancelBtn');
        btnCancel.SetPanelEvent('onactivate', function () {
            LobbyAPI.StopMatchmaking();
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
            ParticleControls.UpdateActionBar(m_PlayMenuActionBarParticleFX, "RmoveBtnEffects");
        });
        const elWorkshopSearch = $("#WorkshopSearchTextEntry");
        elWorkshopSearch.SetPanelEvent('ontextentrychange', _UpdateWorkshopMapFilter);
        // Set initial state to our session settings
        _SyncDialogsFromSessionSettings(LobbyAPI.GetSessionSettings());
        _ApplySessionSettings();
        // Show the initial popup
        _ShowNewMatchmakingModePopup();
        // if favorites preset button is empty, save whatever we have right now.
        const strFavoriteMaps = GameInterfaceAPI.GetSettingString('ui_playsettings_custom_preset');
        if (strFavoriteMaps === '') {
            _SaveMapSelectionToCustomPreset(true);
        }
        _UpdateGameModeFlagsBtn();
        _UpdateDirectChallengePage();
    }
    ;
    function _SetUpGameModeFlagsRadioButtons() {
        const oFlags = GameModeFlags.GetFlags();
        Object.keys(oFlags).forEach(key => {
            const elParent = $.GetContextPanel().FindChildInLayoutFile('id-gamemode-flag-' + key);
            const mode = oFlags[key];
            mode.flags.forEach(flag => {
                if (!elParent.FindChildInLayoutFile(elParent.id + '-' + flag)) {
                    const btn = $.CreatePanel('RadioButton', elParent, elParent.id + '-' + flag, {
                        class: 'gamemode-setting-radiobutton',
                        group: 'game_mode_flag_' + key,
                        text: '#play_settings_' + key + '_dialog_' + flag
                    });
                    const onActivate = function (nflag) {
                        PlayMenu.OnGameModeFlagOptionActivate(nflag);
                    };
                    const onMouseOver = function (id, flag) {
                        if (key === 'competitive') {
                            UiToolkitAPI.ShowTextTooltip(id, '#play_settings_competitive_dialog_' + flag + '_desc');
                        }
                    };
                    btn.SetPanelEvent('onactivate', onActivate.bind(undefined, flag));
                    btn.SetPanelEvent('onmouseover', onMouseOver.bind(undefined, btn.id, flag));
                    btn.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideTextTooltip(); });
                }
            });
        });
    }
    function _RevertForceDirectChallengeSettings() {
        _LoadGameModeFlagsFromSettings();
    }
    function _TurnOffDirectChallenge() {
        _SetDirectChallengeKey('');
        _RevertForceDirectChallengeSettings();
        _ApplySessionSettings();
        Scheduler.Cancel("directchallenge");
    }
    function _OnDirectChallengeBtn() {
        if (inDirectChallenge()) {
            // _TurnOffDirectChallenge();
            return;
        }
        else {
            // when opening the direct challenge panel, use the saved code, if we have one
            const savedKey = GameInterfaceAPI.GetSettingString('ui_playsettings_directchallengekey');
            if (!savedKey)
                _SetDirectChallengeKey(CompetitiveMatchAPI.GetDirectChallengeCode());
            else
                _SetDirectChallengeKey(savedKey);
            _ApplySessionSettings();
        }
    }
    function _SetDirectChallengeKey(key) {
        let keySource;
        let keySourceLabel;
        let type, id;
        if (key != '') {
            const oReturn = { value: [] };
            const bValid = _IsChallengeKeyValid(key, oReturn, 'set');
            type = oReturn.value[2]; // u for user, g for group
            id = oReturn.value[3]; // xuid if user, clanid if group
            if (bValid) {
                switch (type) {
                    case 'u':
                        keySource = FriendsListAPI.GetFriendName(id);
                        keySourceLabel = $.Localize('#DirectChallenge_CodeSourceLabelUser2');
                        break;
                    case 'g':
                        keySource = MyPersonaAPI.GetMyClanNameById(id);
                        keySourceLabel = $.Localize('#DirectChallenge_CodeSourceLabelClan2');
                        if (!keySource) {
                            keySource = $.Localize("#DirectChallenge_UnknownSource");
                        }
                        break;
                }
            }
            GameInterfaceAPI.SetSettingString('ui_playsettings_directchallengekey', key);
        }
        // toggle the checkbox
        const DirectChallengeCheckBox = $.GetContextPanel().FindChildTraverse('JsDirectChallengeBtn');
        DirectChallengeCheckBox.checked = key != '';
        if (type !== undefined && id != undefined)
            _SetDirectChallengeIcons(type, id);
        $.GetContextPanel().SetDialogVariable('queue-code', key);
        if (keySource)
            $.GetContextPanel().SetDialogVariable('code-source', keySource);
        if (keySourceLabel)
            $.GetContextPanel().SetDialogVariable('code-source-label', keySourceLabel);
        if (id)
            $.GetContextPanel().SetAttributeString('code-xuid', id);
        if (type)
            $.GetContextPanel().SetAttributeString('code-type', type);
        if (key && (m_challengeKey != key)) {
            // do this one frame later
            $.Schedule(0.01, function () {
                const elHeader = $.GetContextPanel().FindChildTraverse("JsDirectChallengeKey");
                if (elHeader && elHeader.IsValid())
                    elHeader.TriggerClass('directchallenge-status__header__queuecode');
            });
        }
        // set style on root
        $.GetContextPanel().SetHasClass('directchallenge', key != '');
        $.Msg("-- challenge key updated: " + key);
        m_challengeKey = key;
    }
    const _ClansInfoUpdated = function () {
        if (m_challengeKey && $.GetContextPanel().GetAttributeString('code-type', '') === 'g') {
            _SetDirectChallengeKey(m_challengeKey);
        }
    };
    const _AddOpenPlayerCardAction = function (elAvatar, xuid) {
        const openCard = function (xuid) {
            // Tell the sidebar to stay open and ignore its on mouse event while the context menu is open
            $.DispatchEvent('SidebarContextMenuActive', true);
            if (xuid !== '') {
                const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, function () {
                    $.DispatchEvent('SidebarContextMenuActive', false);
                });
                contextMenuPanel.AddClass("ContextMenu_NoArrow");
            }
        };
        elAvatar.SetPanelEvent("onactivate", openCard.bind(undefined, xuid));
    };
    function _SetDirectChallengeIcons(type, id) {
        //		const elIcon = $.GetContextPanel().FindChildInLayoutFile( 'JsDirectChallengeIcon' );
        const btn = $("#JsDirectChallengeBtn");
        if (!btn.checked)
            return;
        const elAvatar = $.GetContextPanel().FindChildInLayoutFile('JsDirectChallengeAvatar');
        if (!elAvatar) {
            $.Schedule(0.1, function (type, id) {
                _SetDirectChallengeIcons(type, id);
            }.bind(undefined, type, id));
            return;
        }
        elAvatar.PopulateFromSteamID(id);
        if (!type || !id) {
            elAvatar.SetPanelEvent('onactivate', function () { });
        }
        switch (type) {
            case 'u':
                _AddOpenPlayerCardAction(elAvatar, id);
                break;
            case 'g':
                _AddGoToClanPageAction(elAvatar, id);
                break;
        }
    }
    function _AddGoToClanPageAction(elAvatar, id) {
        elAvatar.SetPanelEvent('onactivate', function () {
            SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser("https://" + SteamOverlayAPI.GetSteamCommunityURL() + "/gid/" + id);
        });
    }
    function _GetDirectChallengeKey() {
        return m_challengeKey;
    }
    function _OnDirectChallengeRandom() {
        UiToolkitAPI.ShowGenericPopupOkCancel($.Localize('#DirectChallenge_CreateNewKey2'), $.Localize('#DirectChallenge_CreateNewKeyMsg'), '', function () {
            _SetDirectChallengeKey(CompetitiveMatchAPI.GenerateDirectChallengeCode());
            _ApplySessionSettings();
        }, function () { });
    }
    function _GetChallengeKeyType(key) {
        const oReturn = { value: [] };
        if (_IsChallengeKeyValid(key.toUpperCase(), oReturn, '')) {
            const type = oReturn.value[2]; // u for user, g for group
            const id = oReturn.value[3]; // xuid if user, clanid if group
            return type;
        }
        else {
            return '';
        }
    }
    function _OnDirectChallengeEdit() {
        function _SubmitCallback(value) {
            _SetDirectChallengeKey(value.toUpperCase());
            _ApplySessionSettings();
            StartSearch();
        }
        const submitCallback = UiToolkitAPI.RegisterJSCallback(_SubmitCallback);
        m_popupChallengeKeyEntryValidate = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_directchallenge_join.xml', '&' + 'submitCallback=' + submitCallback);
    }
    function _OnDirectChallengeCopy() {
        SteamOverlayAPI.CopyTextToClipboard(_GetDirectChallengeKey());
        UiToolkitAPI.ShowTextTooltip('CopyChallengeKey', '#DirectChallenge_Copied2');
    }
    function _IsChallengeKeyValid(key, oReturn = { string: [] }, how = '') {
        const code = CompetitiveMatchAPI.ValidateDirectChallengeCode(key, how);
        const bValid = (typeof code === 'string') && code.includes(',');
        if (bValid) {
            oReturn.value = code.split(',');
        }
        return bValid;
    }
    function _DirectChallengeStartSearch() {
        const oReturn = { value: [] };
        const bValid = _IsChallengeKeyValid(m_challengeKey.toUpperCase(), oReturn, 'set');
        if (!bValid) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'mainmenu_press_GO', 'MOUSE');
            return;
        }
        //		LobbyAPI.UpdateSessionSettings( settings );
        _OnPrivateQueuesUpdate();
        LobbyAPI.StartMatchmaking('', oReturn.value[0], oReturn.value[1], '1');
    }
    function _NoMapSelectedPopup() {
        //No connection to GC so show a message
        UiToolkitAPI.ShowGenericPopupOk($.Localize('#no_maps_selected_title'), $.Localize('#no_maps_selected_text'), '', function () { });
    }
    function _ShowNewMatchmakingModePopup() {
        return; // end of April 2021, Premier is no longer available after Operation Broken Fang
        const setVersionTo = '3';
        const currentVersion = GameInterfaceAPI.GetSettingString('ui_popup_weaponupdate_version');
        if (currentVersion !== setVersionTo) { // force this to only appear once
            GameInterfaceAPI.SetSettingString('ui_popup_weaponupdate_version', setVersionTo);
            UiToolkitAPI.ShowCustomLayoutPopup('prime_status', 'file://{resources}/layout/popups/popup_premier_matchmaking.xml');
            //UiToolkitAPI.ShowCustomLayoutPopupParameters(
            //	'',
            //	'file://{resources}/layout/popups/popup_operation_launch.xml',
            //	'uisettingversion=' + setVersionTo,
            //	'none'
            //);
        }
    }
    ;
    function _SetGameModeRadioButtonAvailableTooltip(gameMode, isAvailable, txtTooltip) {
        const elGameModeSelectionRadios = $('#GameModeSelectionRadios');
        const elTab = elGameModeSelectionRadios ? elGameModeSelectionRadios.FindChildInLayoutFile(gameMode) : null;
        if (elTab) {
            if (!isAvailable && txtTooltip) {
                elTab.SetPanelEvent('onmouseover', function () {
                    UiToolkitAPI.ShowCustomLayoutParametersTooltip(elTab.id, 'GamemodesLockedneedPrime', 'file://{resources}/layout/tooltips/tooltip_title_progressbar.xml', 'titletext=' + '#PlayMenu_unavailable_locked_mode_title' +
                        '&' + 'bodytext=' + txtTooltip +
                        '&' + 'usexp=' + 'true');
                });
                elTab.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideCustomLayoutTooltip('GamemodesLockedneedPrime'); });
            }
            else {
                elTab.SetPanelEvent('onmouseover', function () { });
                elTab.SetPanelEvent('onmouseout', function () { });
            }
        }
    }
    function _SetGameModeRadioButtonVisible(gameMode, isVisible) {
        const elGameModeSelectionRadios = $('#GameModeSelectionRadios');
        const elTab = elGameModeSelectionRadios ? elGameModeSelectionRadios.FindChildInLayoutFile(gameMode) : null;
        if (elTab) {
            elTab.visible = isVisible;
        }
    }
    function _IsGameModeAvailable(serverType, gameMode) {
        let isAvailable = true;
        if (gameMode === "survival") {
            isAvailable = _IsValveOfficialServer(serverType);
            _SetGameModeRadioButtonAvailableTooltip(gameMode, isAvailable, '#PlayMenu_dangerzone_onlineonly');
            if (!isAvailable)
                return false;
        }
        if (gameMode === "cooperative" || gameMode === "coopmission") {
            const questID = GetMatchmakingQuestId();
            const bGameModeMatchesLobby = questID !== 0 && (LobbyAPI.GetSessionSettings().game.mode === gameMode);
            const bAvailable = bGameModeMatchesLobby && MissionsAPI.GetQuestDefinitionField(questID, "gamemode") === gameMode;
            _SetGameModeRadioButtonVisible(gameMode, bAvailable); // hide guardian tab when not playing the mission
            return bAvailable;
        }
        if (gameMode === 'premier') {
            isAvailable = serverType === 'official';
        }
        else if (m_gameModeConfigs[gameMode] &&
            _GetAvailableMapGroups(gameMode, _IsValveOfficialServer(serverType)).length == 0) {
            _SetGameModeRadioButtonAvailableTooltip(gameMode, false, '');
            return false;
        }
        // Rest of this flow deals with disabled/enabled buttons for Private Rank 2
        if (_IsValveOfficialServer(serverType) && // possibly disable the game modes for all matchmaking, for now disable them in official only
            LobbyAPI.BIsHost() && !( // check user is at least Private Rank 2
        MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() >= 2))) {
            // new user experimental funneling
            // end result : unrestricted mode is best, default to casual
            //
            // Make sure this code matches :: uicomponent_settings.cpp
            // UI_SETTINGS_CVAR_ALIAS_WITH_GET_FILTER_FUNC( ui_playsettings_mode_official
            //
            // const nNewPlayerCategory = MyPersonaAPI.GetAccountCategory( 'onramp' );
            // $.Msg( "new user category | " + gameMode + " " + nNewPlayerCategory );
            // 
            // switch ( Math.floor( nNewPlayerCategory / 10 ) )
            // {
            // 	case 1: // only one mode is available, the one that is default
            // 		isAvailable = ( gameMode == GameInterfaceAPI.GetSettingString( "ui_playsettings_mode_" + serverType ) );
            // 		break;
            // 	case 2: // both deathmatch and casual are available modes
            // 		isAvailable = ( gameMode == 'deathmatch' || gameMode == 'casual' );
            // 		break;
            // }
            isAvailable = (gameMode == 'deathmatch' || gameMode == 'casual' || gameMode == 'survival' || gameMode == 'skirmish');
        }
        // Must always call this function to manage enabled state in order to turn off the tooltip
        _SetGameModeRadioButtonAvailableTooltip(gameMode, isAvailable, _IsPlayingOnValveOfficial() ? '#PlayMenu_unavailable_newuser_2' : '');
        return isAvailable;
    }
    function _GetTournamentOpponent() {
        const elTeamDropdown = $.GetContextPanel().FindChildInLayoutFile('TournamentTeamDropdown');
        if (elTeamDropdown.GetSelected() === null)
            return '';
        return elTeamDropdown.GetSelected().GetAttributeString('data', '');
    }
    function _GetTournamentStage() {
        const elStageDropdown = $.GetContextPanel().FindChildInLayoutFile('TournamentStageDropdown');
        if (elStageDropdown.GetSelected() === null)
            return '';
        return elStageDropdown.GetSelected().GetAttributeString('data', '');
    }
    function _UpdateStartSearchBtn(isSearchingForTournament) {
        const btnStartSearch = $.GetContextPanel().FindChildInLayoutFile('StartMatchBtn');
        btnStartSearch.enabled = isSearchingForTournament ? (_GetTournamentOpponent() != '' && _GetTournamentStage() != '') : true;
    }
    function _UpdateTournamentButton(isHost, isSearching, settingsgamemapgroupname) {
        const bIsOfficialCompetitive = _RealGameMode() === "competitive" && _IsPlayingOnValveOfficial();
        const strTeamName = MyPersonaAPI.GetMyOfficialTeamName();
        const strTournament = MyPersonaAPI.GetMyOfficialTournamentName();
        const isInTournament = isHost && strTeamName != "" && strTournament != "";
        $.GetContextPanel().SetHasClass("play-menu__tournament", isInTournament);
        const isSearchingForTournament = bIsOfficialCompetitive && isInTournament;
        const elTeamDropdown = $.GetContextPanel().FindChildInLayoutFile('TournamentTeamDropdown');
        const elStageDropdown = $.GetContextPanel().FindChildInLayoutFile('TournamentStageDropdown');
        if (isInTournament) {
            function AddDropdownOption(elDropdown, entryID, strText, strData, strSelectedData) {
                const newEntry = $.CreatePanel('Label', elDropdown, entryID, { data: strData });
                newEntry.text = strText;
                elDropdown.AddOption(newEntry);
                // set selected
                if (strSelectedData === strData) {
                    elDropdown.SetSelected(entryID);
                }
            }
            const strCurrentOpponent = _GetTournamentOpponent();
            const strCurrentStage = _GetTournamentStage();
            // generate team dropdown
            elTeamDropdown.RemoveAllOptions();
            AddDropdownOption(elTeamDropdown, 'PickOpponent', $.Localize('#SFUI_Tournament_Pick_Opponent'), '', strCurrentOpponent);
            const teamCount = CompetitiveMatchAPI.GetTournamentTeamCount(strTournament);
            for (let i = 0; i < teamCount; i++) {
                const strTeam = CompetitiveMatchAPI.GetTournamentTeamNameByIndex(strTournament, i);
                // don't need to add your own team
                if (strTeamName === strTeam)
                    continue;
                AddDropdownOption(elTeamDropdown, 'team_' + i, strTeam, strTeam, strCurrentOpponent);
            }
            elTeamDropdown.SetPanelEvent('oninputsubmit', _UpdateStartSearchBtn.bind(undefined, isSearchingForTournament));
            // generate stage dropdown
            elStageDropdown.RemoveAllOptions();
            AddDropdownOption(elStageDropdown, 'PickStage', $.Localize('#SFUI_Tournament_Stage'), '', strCurrentStage);
            const stageCount = CompetitiveMatchAPI.GetTournamentStageCount(strTournament);
            for (let i = 0; i < stageCount; i++) {
                const strStage = CompetitiveMatchAPI.GetTournamentStageNameByIndex(strTournament, i);
                AddDropdownOption(elStageDropdown, 'stage_' + i, strStage, strStage, strCurrentStage);
            }
            elStageDropdown.SetPanelEvent('oninputsubmit', _UpdateStartSearchBtn.bind(undefined, isSearchingForTournament));
        }
        elTeamDropdown.enabled = isSearchingForTournament;
        elStageDropdown.enabled = isSearchingForTournament;
        _UpdateStartSearchBtn(isSearchingForTournament);
        _ShowActiveMapSelectionTab(!isSearchingForTournament);
    }
    function _SyncDialogsFromSessionSettings(settings) {
        if (!settings || !settings.game || !settings.system) {
            return;
        }
        m_serverSetting = settings.options.server;
        m_permissions = settings.system.access;
        m_gameModeSetting = settings.game.mode_ui;
        $.GetContextPanel().SetHasClass('premier', m_gameModeSetting === 'premier');
        _SetDirectChallengeKey(settings.options.hasOwnProperty('challengekey') ? settings.options.challengekey : '');
        if (!m_challengeKey) {
            m_serverPrimeSetting = settings.game.prime;
        }
        _setAndSaveGameModeFlags(parseInt(settings.game.gamemodeflags));
        // Figure out if this is a workshop map
        m_isWorkshop = settings.game.mapgroupname
            && settings.game.mapgroupname.includes('@workshop');
        // add the mode and server to the root as a class so we can branch css
        $.GetContextPanel().SwitchClass("gamemode", _RealGameMode());
        $.GetContextPanel().SwitchClass("serversetting", m_serverSetting);
        $.GetContextPanel().SetHasClass("directchallenge", inDirectChallenge());
        // Figure out if this refers to a single skirmish tab
        m_singleSkirmishMapGroup = null;
        if (m_gameModeSetting === 'skirmish' && settings.game.mapgroupname && m_arrSingleSkirmishMapGroups.includes(settings.game.mapgroupname)) {
            m_singleSkirmishMapGroup = settings.game.mapgroupname;
        }
        const isHost = LobbyAPI.BIsHost();
        const isSearching = _IsSearching();
        const isEnabled = !isSearching && isHost ? true : false;
        const elPlayCommunity = $('#PlayCommunity');
        elPlayCommunity.enabled = !isSearching;
        if (m_isWorkshop) {
            _SwitchToWorkshopTab(isEnabled);
            _SelectMapButtonsFromSettings(settings);
        }
        else if (m_gameModeSetting) {
            // Set game mode radio to current game mode
            for (let i = 0; i < m_arrGameModeRadios.length; ++i) {
                const strGameModeForButton = m_arrGameModeRadios[i].id;
                // set tab index to the currently selected mode
                if (inDirectChallenge()) {
                    m_arrGameModeRadios[i].checked = m_arrGameModeRadios[i].id === 'JsDirectChallengeBtn';
                }
                else if (m_singleSkirmishMapGroup) {
                    if (_IsSingleSkirmishString(strGameModeForButton)) {
                        if (m_singleSkirmishMapGroup === _GetSingleSkirmishMapGroupFromSingleSkirmishString(strGameModeForButton)) {
                            m_arrGameModeRadios[i].checked = true;
                        }
                    }
                }
                else if (!_IsSingleSkirmishString(strGameModeForButton)) {
                    if (strGameModeForButton === m_gameModeSetting) {
                        m_arrGameModeRadios[i].checked = true;
                    }
                }
                if (strGameModeForButton === 'competitive' || strGameModeForButton === 'scrimcomp2v2') {
                    const bHide = GameInterfaceAPI.GetSettingString('ui_show_unlock_competitive_alert') === '1' ||
                        MyPersonaAPI.HasPrestige() ||
                        MyPersonaAPI.GetCurrentLevel() !== 2 ||
                        !_IsPlayingOnValveOfficial();
                    if (m_arrGameModeRadios[i].FindChildInLayoutFile('GameModeAlert')) {
                        m_arrGameModeRadios[i].FindChildInLayoutFile('GameModeAlert').SetHasClass('hidden', bHide);
                    }
                }
                // if you are a client or searching, or if the mode isn't allowed, disable the button
                const isAvailable = _IsGameModeAvailable(m_serverSetting, strGameModeForButton);
                m_arrGameModeRadios[i].enabled = isAvailable && isEnabled;
                m_arrGameModeRadios[i].SetHasClass('locked', !isAvailable || !isEnabled);
            }
            // We may have changed active radio above, refresh mapgroup buttons
            _UpdateMapGroupButtons(isEnabled, isSearching, isHost);
            // For Survival we the GC selects the game mode so.
            _CancelRotatingMapGroupSchedule();
            if (settings.game.mode === "survival") {
                _GetRotatingMapGroupStatus(_RealGameMode(), m_singleSkirmishMapGroup, settings.game.mapgroupname);
            }
            _SelectMapButtonsFromSettings(settings);
        }
        else {
            // Default first radio to checked when we don't yet have 
            // a game mode sent by session settings. This should be corrected in 
            // later session updates but we need some default check to avoid JS errors.
            m_arrGameModeRadios[0].checked = true;
        }
        _ShowHideStartSearchBtn(isSearching, isHost);
        _ShowCancelSearchButton(isSearching, isHost);
        // Update tournament button
        _UpdateTournamentButton(isHost, isSearching, settings.game.mapgroupname);
        // Set prime button
        _UpdatePrimeBtn(isSearching, isHost);
        _UpdatePermissionBtnText(settings, isEnabled);
        _UpdatePracticeSettingsBtns(isSearching, isHost);
        // Update LeaderBoards button
        _UpdateLeaderboardBtn(m_gameModeSetting);
        // Update Survival Auto-Fill Squad button
        _UpdateSurvivalAutoFillSquadBtn(m_gameModeSetting);
        //update play type radio
        _SelectActivePlayPlayTypeBtn();
        // _UpdateTopNavRadioBtns();
        //_UpdateBotDifficultyButton();
        _UpdateDirectChallengePage(isSearching, isHost);
        _UpdateGameModeFlagsBtn();
        // $( '#PlayTopNavDropdown' ).enabled = BIsServerTypeDropdownEnabled();
        const elPlayTypeNav = $('#PlayTypeTopNav');
        const aPlayTypeBtns = elPlayTypeNav.Children();
        const bIsTopNavBtsEnabled = IsTopNavBtsEnabled();
        aPlayTypeBtns.forEach(btn => {
            btn.enabled = bIsTopNavBtsEnabled;
        });
        _SetClientViewLobbySettingsTitle(isHost);
        function IsTopNavBtsEnabled() {
            if (_IsPlayingOnValveOfficial() &&
                (m_gameModeSetting === "cooperative" || m_gameModeSetting === "coopmission"))
                return false;
            else
                return isEnabled;
        }
        _OnPrivateQueuesUpdate();
    }
    ;
    function _UpdateDirectChallengePage(isSearching = false, isHost = true) {
        const elBtn = $('#JsDirectChallengeBtn');
        elBtn.enabled = (m_serverSetting === "official") && !m_isWorkshop ? true : false;
        if (m_serverSetting !== "official" || m_isWorkshop) {
            return;
        }
        const fnEnableKey = (id, bEnable) => { const p = $(id); if (p)
            p.enabled = bEnable; };
        const bEnable = !isSearching && isHost;
        fnEnableKey("#RandomChallengeKey", bEnable);
        fnEnableKey("#EditChallengeKey", bEnable);
        fnEnableKey("#ClanChallengeKey", bEnable);
        fnEnableKey("#JsDirectChallengeBtn", bEnable && (MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() >= 2)));
    }
    function _OnClanChallengeKeySelected(key) {
        _SetDirectChallengeKey(key);
        _ApplySessionSettings();
        StartSearch();
    }
    function _OnChooseClanKeyBtn() {
        if (MyPersonaAPI.GetMyClanCount() == 0) {
            UiToolkitAPI.ShowGenericPopupThreeOptions('#DirectChallenge_no_steamgroups', '#DirectChallenge_no_steamgroups_desc', '', '#DirectChallenge_create_steamgroup', function () {
                SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser("https://" + SteamOverlayAPI.GetSteamCommunityURL() + "/actions/GroupCreate");
            }, '#DirectChallenge_openurl2', function () {
                SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser("https://" + SteamOverlayAPI.GetSteamCommunityURL() + "/search/groups");
            }, '#UI_OK', function () { });
            return;
        }
        const clanKey = _GetChallengeKeyType(m_challengeKey) == 'g' ? m_challengeKey : '';
        const elClanSelector = UiToolkitAPI.ShowCustomLayoutPopupParameters('id-popup_directchallenge_steamgroups', 'file://{resources}/layout/popups/popup_directchallenge_steamgroups.xml', 'currentkey=' + clanKey);
        elClanSelector.AddClass("ContextMenu_NoArrow");
    }
    function _CreatePlayerTile(elTile, xuid, delay = 0) {
        $.Msg("DC _CreatePlayerTile ( " + elTile.id + ", " + xuid + " )");
        elTile.BLoadLayout('file://{resources}/layout/simple_player_tile.xml', false, false);
        // This gives the panel enough time to load so we call the init
        $.Schedule(.1, function (elTile, xuid) {
            if (!elTile || !elTile.IsValid())
                return;
            const elAvatar = elTile.FindChildTraverse('JsAvatarImage');
            elAvatar.PopulateFromSteamID(xuid);
            const strName = FriendsListAPI.GetFriendName(xuid);
            elTile.SetDialogVariable('player_name', strName);
            _AddOpenPlayerCardAction(elTile, xuid);
            Scheduler.Schedule(delay, function () {
                if (elTile)
                    elTile.RemoveClass('hidden');
            }, "directchallenge");
        }.bind(undefined, elTile, xuid));
    }
    function _OnPlayerNameChangedUpdate(xuid) {
        $.Msg("MainMenuPlay :: _OnPlayerNameChangedUpdate " + xuid);
        let strName = null;
        const strCodeXuid = $.GetContextPanel().GetAttributeString('code-xuid', '');
        if (strCodeXuid === xuid) {
            if (!strName) // cached resolve
                strName = FriendsListAPI.GetFriendName(xuid);
            $.GetContextPanel().SetDialogVariable('code-source', strName);
        }
        const elMembersContainer = $('#DirectChallengeQueueMembers');
        if (!elMembersContainer)
            return;
        const elUserTile = elMembersContainer.FindChildTraverse(xuid);
        if (!elUserTile)
            return;
        if (!strName) // cached resolve
            strName = FriendsListAPI.GetFriendName(xuid);
        elUserTile.SetDialogVariable('player_name', strName);
        $.Msg("MainMenuPlay :: _OnPlayerNameChangedUpdate :: UPDATED " + strName);
    }
    function _GetPartyID(partyXuid, arrMembers = []) {
        //$.Msg( '_GetPartyID ( ' + partyId + ' )' );
        let partyId = '';
        const partySize = PartyBrowserAPI.GetPartyMembersCount(partyXuid);
        for (let j = 0; j < partySize; j++) {
            const memberXuid = PartyBrowserAPI.GetPartyMemberXuid(partyXuid, j);
            partyId += '_' + memberXuid;
            arrMembers.push(memberXuid);
        }
        return partyId;
    }
    function _OnPrivateQueuesUpdate() {
        $.Msg("DC _OnPrivateQueuesUpdate");
        const elMembersContainer = $.GetContextPanel().FindChildTraverse('DirectChallengeQueueMembers');
        if (!elMembersContainer)
            return;
        const elExplanation = $("#id-directchallenge-explanation");
        if (elExplanation)
            elExplanation.SetHasClass('hidden', _IsSearching());
        const elQueueMembers = $("#id-directchallenge-status__queue-members");
        if (elQueueMembers)
            elQueueMembers.SetHasClass('hidden', !_IsSearching());
        // not searching, clear the display and exit
        if (!_IsSearching()) {
            Scheduler.Cancel("directchallenge");
            const elStatus = $('#id-directchallenge-status');
            if (elStatus)
                elStatus.text = '';
            if (elMembersContainer)
                elMembersContainer.RemoveAndDeleteChildren();
            return;
        }
        const NumberOfParties = PartyBrowserAPI.GetPrivateQueuesCount();
        const NumberOfPlayers = PartyBrowserAPI.GetPrivateQueuesPlayerCount();
        const NumberOfMorePartiesNotShown = PartyBrowserAPI.GetPrivateQueuesMoreParties();
        // set the status line
        const elStatus = $('#id-directchallenge-status');
        if (elStatus) {
            $.GetContextPanel().SetDialogVariableInt('directchallenge_players', NumberOfPlayers);
            $.GetContextPanel().SetDialogVariableInt('directchallenge_moreparties', NumberOfMorePartiesNotShown);
            let strStatus = $.Localize(LobbyAPI.GetMatchmakingStatusString());
            if (NumberOfParties > 0) {
                strStatus += "\t";
                strStatus += $.Localize((NumberOfMorePartiesNotShown > 0) ? "#DirectChallenge_SearchingMembersAndMoreParties2" : "#DirectChallenge_SearchingMembersLabel2", $.GetContextPanel());
            }
            elStatus.text = strStatus;
        }
        // Mark children for sweep
        elMembersContainer.Children().forEach(function (child) {
            $.Msg("DC Marking party " + child.id + " for delete");
            child.SetAttributeInt("marked_for_delete", 1);
        });
        let delay = 0;
        for (let i = NumberOfParties; i-- > 0;) {
            const DELAY_INCREMENT = 0.25;
            const arrMembers = [];
            const partyXuid = PartyBrowserAPI.GetPrivateQueuePartyXuidByIndex(i);
            const partyId = _GetPartyID(partyXuid, arrMembers) /*+ h*/;
            /*
                        partyId += '' + h;
                        if ( h == 2 )
                        {
                            arrMembers.push( arrMembers[0] );
                        }
                        if ( h == 3 )
                        {
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                        }
                        if ( h == 4 )
                        {
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                        }
                        if ( h == 5 )
                        {
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                            arrMembers.push( arrMembers[0] );
                        }
            */
            let elParty = elMembersContainer.FindChild(partyId);
            if (!elParty) {
                elParty = $.CreatePanel('Panel', elMembersContainer, partyId, { class: 'directchallenge__party hidden' });
                elParty.SetHasClass('multi', arrMembers.length > 1);
                elMembersContainer.MoveChildBefore(elParty, elMembersContainer.Children()[0]);
                elParty.SetAttributeString("xuid", partyXuid);
                $.Msg("DC Creating party " + partyXuid + " " + partyId);
                Scheduler.Schedule(delay, function (elParty) {
                    if (elParty && elParty.IsValid())
                        elParty.RemoveClass('hidden');
                }.bind(undefined, elParty), "directchallenge");
                //make tiles for the party members
                //			for ( let u = 0; u < 3; u++ )
                arrMembers.forEach(function (xuid) {
                    if (elParty) {
                        const elTile = $.CreatePanel('Panel', elParty, xuid /*+ u*/, { class: "directchallenge__party__member" });
                        _CreatePlayerTile(elTile, xuid, delay);
                    }
                    delay += DELAY_INCREMENT;
                });
                // elParty.AddClass( 'private-queue-party-with-' + arrMembers.length + '-members' );
            }
            else {
                $.Msg("DC found party " + elParty.id + " " + _GetPartyID(partyXuid) + " and flagging it to keep");
            }
            elParty.SetAttributeInt("marked_for_delete", 0);
        }
        // now remove parties that are no longer in the queue
        elMembersContainer.Children().forEach(function (child) {
            if (child.GetAttributeInt("marked_for_delete", 0) !== 0) {
                $.Msg("DC deleting party " + child.id + " because it's marked for delete");
                child.DeleteAsync(0.0);
            }
        });
    }
    function _SetClientViewLobbySettingsTitle(isHost) {
        const elPanel = $.GetContextPanel().FindChildInLayoutFile('play-lobby-leader-panel');
        if (!elPanel || !elPanel.IsValid()) {
            return;
        }
        if (isHost) {
            elPanel.visible = false;
            return;
        }
        elPanel.visible = true;
        const elTitle = elPanel.FindChildInLayoutFile('play-lobby-leader-text');
        const xuid = PartyListAPI.GetPartySystemSetting("xuidHost");
        const leaderName = FriendsListAPI.GetFriendName(xuid);
        elTitle.text = leaderName;
        const elAvatar = elPanel.FindChildInLayoutFile('lobby-leader-avatar');
        elAvatar.PopulateFromSteamID(xuid);
    }
    ;
    function _GetAvailableMapGroups(gameMode, isPlayingOnValveOfficial) {
        // bad gameMode, return empty array
        const gameModeCfg = m_gameModeConfigs[gameMode];
        if (gameModeCfg === undefined)
            return [];
        const mapgroup = isPlayingOnValveOfficial ? gameModeCfg.mapgroupsMP : gameModeCfg.mapgroupsSP;
        if (mapgroup !== undefined && mapgroup !== null) {
            // remove premier
            delete mapgroup['mg_lobby_mapveto'];
            return Object.keys(mapgroup);
        }
        if ((gameMode === "cooperative" || gameMode === "coopmission") && GetMatchmakingQuestId() > 0) {
            return [LobbyAPI.GetSessionSettings().game.mapgroupname];
        }
        return [];
    }
    ;
    function _GetMapGroupPanelID() {
        if (inDirectChallenge()) {
            return "gameModeButtonContainer_directchallenge";
        }
        else if (m_gameModeSetting === 'premier') {
            return "gameModeButtonContainer_premier";
        }
        const gameModeId = _RealGameMode() + (m_singleSkirmishMapGroup ? '@' + m_singleSkirmishMapGroup : '');
        const panelID = 'gameModeButtonContainer_' + gameModeId + '_' + m_serverSetting;
        return panelID;
    }
    function _OnActivateMapOrMapGroupButton(mapgroupButton) {
        const mapGroupNameClicked = mapgroupButton.GetAttributeString("mapname", '');
        if ($.GetContextPanel().BHasClass('play-menu__lobbymapveto_activated') && mapGroupNameClicked !== 'mg_lobby_mapveto') { // don't allow clicking mapgroups if lobby map veto is activated
            return;
        }
        $.DispatchEvent('CSGOPlaySoundEffect', 'submenu_leveloptions_select', 'MOUSE');
        // Special check for the sibling button between unranked scrimmage and ranked to uncheck the sibling
        let mapGroupName = mapGroupNameClicked;
        if (mapGroupName) {
            const siblingSuffix = '_scrimmagemap';
            if (mapGroupName.toLowerCase().endsWith(siblingSuffix))
                mapGroupName = mapGroupName.substring(0, mapGroupName.length - siblingSuffix.length);
            else
                mapGroupName = mapGroupName + siblingSuffix;
            // Traverse the two-tiered children
            let elParent = mapgroupButton.GetParent();
            if (elParent)
                elParent = elParent.GetParent();
            if (elParent && elParent.GetAttributeString('hassections', '')) {
                elParent.Children().forEach(function (section) {
                    section.Children().forEach(function (tile) {
                        const mapGroupNameSibling = tile.GetAttributeString("mapname", '');
                        if (mapGroupNameSibling.toLowerCase() === mapGroupName.toLowerCase()) { // uncheck the sibling tile
                            tile.checked = false;
                        }
                    });
                });
            }
        }
        _MatchMapSelectionWithQuickSelect();
        if (_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID))) {
            _ApplySessionSettings();
        }
    }
    ;
    function _ShowActiveMapSelectionTab(isEnabled) {
        const panelID = m_activeMapGroupSelectionPanelID;
        for (const key in m_mapSelectionButtonContainers) {
            if (key !== panelID) {
                m_mapSelectionButtonContainers[key].AddClass("hidden");
            }
            else {
                // GetSelectedMapButton( key );
                m_mapSelectionButtonContainers[key].RemoveClass("hidden");
                m_mapSelectionButtonContainers[key].visible = true;
                // Disable if you are client or searching
                m_mapSelectionButtonContainers[key].enabled = isEnabled;
            }
        }
        const isWorkshop = panelID === k_workshopPanelId;
        $('#WorkshopSearchBar').visible = isWorkshop;
        $('#GameModeSelectionRadios').Children().forEach(element => {
            element.enabled = element.enabled && !isWorkshop && !_IsSearching() && LobbyAPI.BIsHost();
        });
        // also show/hide 'visit workshop' button
        $('#WorkshopVisitButton').visible = isWorkshop && !m_bPerfectWorld;
        $('#WorkshopVisitButton').enabled = SteamOverlayAPI.IsEnabled();
    }
    ;
    function _GetMapTileContainer() {
        return $.GetContextPanel().FindChildInLayoutFile(_GetMapGroupPanelID());
    }
    // toggle all of the maps referenced by this quick selection map group
    function _OnMapQuickSelect(mgName) {
        // these are the maps we want to toggle on
        const arrMapsToSelect = _GetMapsFromQuickSelectMapGroup(mgName);
        let bScrolled = false;
        const prevSelection = _GetSelectedMapsForServerTypeAndGameMode(m_serverSetting, _RealGameMode(), true);
        const elMapGroupContainer = _GetMapTileContainer();
        elMapGroupContainer.Children().forEach(function (elMapBtn) {
            let bFound = false;
            // short circuit the search if we clicked on "all"
            if (mgName === "all") {
                bFound = true;
            }
            else if (mgName === "none") {
                bFound = false;
            }
            else {
                arrMapsToSelect.forEach(function (mapname) {
                    if (elMapBtn.GetAttributeString("mapname", "") == mapname) {
                        bFound = true;
                    }
                });
            }
            elMapBtn.checked = bFound;
            // scroll to the first hit.
            if (bFound && !bScrolled) {
                elMapBtn.ScrollParentToMakePanelFit(2, false);
                bScrolled = true;
            }
        });
        //       if we changed any maps...
        const newSelection = _GetSelectedMapsForServerTypeAndGameMode(m_serverSetting, _RealGameMode(), true);
        if (prevSelection != newSelection) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'submenu_leveloptions_select', 'MOUSE');
            // update the highlight state
            _MatchMapSelectionWithQuickSelect();
            if (_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID))) {
                _ApplySessionSettings();
            }
        }
    }
    // remove maps that aren't available from the list and return it
    function _ValidateMaps(arrMapList) {
        let arrMapTileNames = [];
        // make an array of current maptile names
        const arrMapButtons = _GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID);
        arrMapButtons.forEach(elMapTile => arrMapTileNames.push(elMapTile.GetAttributeString("mapname", "")));
        // filter the input maplist against the current maptile name list
        const filteredMapList = arrMapList.filter(strMap => arrMapTileNames.includes(strMap));
        return filteredMapList;
    }
    function _GetMapGroupsWithAttribute(strAttribute, strValue) {
        const arrNewMapgroups = [];
        const elMapGroupContainer = _GetMapTileContainer();
        $.Msg("NewMapsArray building from " + elMapGroupContainer.Children().length + " children for " + strAttribute + " = " + strValue);
        elMapGroupContainer.Children().forEach(function (elMapBtn) {
            const mgName = elMapBtn.GetAttributeString("mapname", "");
            if (GameTypesAPI.GetMapGroupAttribute(mgName, strAttribute) === strValue) {
                $.Msg("NewMapsArray adding " + mgName);
                arrNewMapgroups.push(mgName);
            }
        });
        $.Msg("NewMapsArray built " + arrNewMapgroups.length + " map groups");
        return arrNewMapgroups;
    }
    function _GetMapsFromQuickSelectMapGroup(mgName) {
        if (mgName === ("favorites")) {
            const mapsAsString = GameInterfaceAPI.GetSettingString('ui_playsettings_custom_preset');
            if (mapsAsString === '')
                return [];
            else {
                const arrMapList = mapsAsString.split(',');
                const filteredMapList = _ValidateMaps(arrMapList);
                // save filtered array
                if (arrMapList.length != filteredMapList.length)
                    GameInterfaceAPI.SetSettingString('ui_playsettings_custom_preset', filteredMapList.length > 0 ? filteredMapList.join(',') : "");
                return filteredMapList;
            }
        }
        else if (mgName === "new") {
            return _GetMapGroupsWithAttribute('showtagui', 'new');
        }
        else if (mgName === "hostage") {
            return _GetMapGroupsWithAttribute('icontag', 'hostage');
        }
        else if (mgName === "activeduty") {
            return _GetMapGroupsWithAttribute('grouptype', 'active').filter(x => x !== 'mg_lobby_mapveto');
        }
        else {
            // const mapsAsObject = GetMGDetails( mgName ) ? GetMGDetails( mgName ).maps : {};
            // return Object.keys( mapsAsObject );
            return [];
        }
    }
    // see if any of the quick select buttons matches the current state of selections
    function _MatchMapSelectionWithQuickSelect() {
        // iterate through quick select buttons
        const elQuickSelectContainer = $.GetContextPanel().FindChildInLayoutFile("JsQuickSelectParent");
        if (!elQuickSelectContainer || m_isWorkshop)
            return;
        elQuickSelectContainer.FindChildrenWithClassTraverse('preset-button').forEach(function (elQuickBtn, index, aMapGroups) {
            // get the maps from the button.
            const arrQuickSelectMaps = _GetMapsFromQuickSelectMapGroup(elQuickBtn.id);
            let bMatch = true;
            // go through all of the maps and compare select state with quickselect
            const elMapGroupContainer = _GetMapTileContainer();
            for (let i = 0; i < elMapGroupContainer.Children().length; i++) {
                const elMapBtn = elMapGroupContainer.Children()[i];
                const mapName = elMapBtn.GetAttributeString("mapname", "");
                if (elQuickBtn.id == "none") {
                    if (elMapBtn.checked) {
                        bMatch = false;
                        break;
                    }
                }
                else if (elQuickBtn.id == "all") {
                    if (!elMapBtn.checked) {
                        bMatch = false;
                        break;
                    }
                }
                else {
                    if (elMapBtn.checked != (arrQuickSelectMaps.includes(mapName))) {
                        bMatch = false;
                        break;
                    }
                }
            }
            elQuickBtn.checked = bMatch;
        });
    }
    function _LazyCreateMapListPanel() {
        const serverType = m_serverSetting;
        const gameMode = _RealGameMode();
        // $.Msg( "LazyCreateMapList: " + gameMode + "/" + serverType );
        let strRequireTagNameToReuse = null;
        let strRequireTagValueToReuse = null;
        if ((gameMode === "cooperative") || (gameMode === "coopmission")) {
            strRequireTagNameToReuse = 'map-selection-quest-id';
            strRequireTagValueToReuse = '' + GetMatchmakingQuestId();
        }
        const panelID = _GetMapGroupPanelID();
        if (panelID in m_mapSelectionButtonContainers) {
            let bAllowReuseExistingContainer = true;
            const elExistingContainer = m_mapSelectionButtonContainers[panelID];
            if (elExistingContainer && strRequireTagNameToReuse) {
                const strExistingTagValue = elExistingContainer.GetAttributeString(strRequireTagNameToReuse, '');
                bAllowReuseExistingContainer = (strExistingTagValue === strRequireTagValueToReuse);
            }
            // Also check if we should refresh an embedded leaderboard
            const elFriendLeaderboards = elExistingContainer ? elExistingContainer.FindChildTraverse("FriendLeaderboards") : null;
            if (elFriendLeaderboards) {
                const strEmbeddedLeaderboardName = elFriendLeaderboards.GetAttributeString("type", '');
                if (strEmbeddedLeaderboardName) {
                    LeaderboardsAPI.Refresh(strEmbeddedLeaderboardName);
                }
            }
            if (bAllowReuseExistingContainer)
                return panelID; // we can safely reuse the existing container (most of the time)
            else
                elExistingContainer.DeleteAsync(0.0); // delete old container, and fall through to recreate it
        }
        const container = $.CreatePanel("Panel", $('#MapSelectionList'), panelID, {
            class: 'map-selection-list map-selection-list--inner hidden'
        });
        container.AddClass('map-selection-list--' + serverType + '-' + gameMode);
        $.Msg("LazyCreateMapList added a container: " + gameMode + "/" + serverType + " (panel id = " + panelID + ")");
        m_mapSelectionButtonContainers[panelID] = container;
        // If there is a snippet with the required name, then load it in
        let strSnippetNameOverride;
        if (inDirectChallenge()) {
            strSnippetNameOverride = "MapSelectionContainer_directchallenge";
        }
        else if (m_gameModeSetting === 'premier') {
            strSnippetNameOverride = "MapSelectionContainer_premier";
        }
        else {
            strSnippetNameOverride = "MapSelectionContainer_" + serverType + "_" + gameMode;
        }
        if (container.BHasLayoutSnippet(strSnippetNameOverride)) { // Load the snippet since it exists to override
            $.Msg("LazyCreateMapList loading explicit container snippet: " + gameMode + "/" + serverType + " (panel id = " + panelID + ") = " + strSnippetNameOverride);
            container.BLoadLayoutSnippet(strSnippetNameOverride);
            const elMapTile = container.FindChildTraverse("MapTile");
            if (elMapTile)
                elMapTile.BLoadLayoutSnippet("MapGroupSelection");
            _LoadLeaderboardsLayoutForContainer(container);
        }
        else { // Flag that we didn't load the snippet, so we can use default layout assumptions
            strSnippetNameOverride = '';
        }
        // If there are required tag value pairs for reuse then set them on the newly created container
        if (strRequireTagNameToReuse && strRequireTagValueToReuse) {
            container.SetAttributeString(strRequireTagNameToReuse, strRequireTagValueToReuse);
        }
        const isPlayingOnValveOfficial = _IsValveOfficialServer(serverType);
        const arrMapGroups = _GetAvailableMapGroups(gameMode, isPlayingOnValveOfficial);
        const numTiles = arrMapGroups.length;
        if (gameMode === 'skirmish' && m_singleSkirmishMapGroup) {
            _UpdateOrCreateMapGroupTile(m_singleSkirmishMapGroup, container, null, panelID + m_singleSkirmishMapGroup, numTiles);
        }
        else {
            arrMapGroups.forEach(function (item, index, aMapGroups) {
                if (gameMode === 'skirmish' && m_arrSingleSkirmishMapGroups.includes(aMapGroups[index])) {
                    return;
                }
                let elSectionContainer = null;
                elSectionContainer = container;
                if (strSnippetNameOverride)
                    elSectionContainer = container.FindChildTraverse("MapTile");
                if (elSectionContainer)
                    _UpdateOrCreateMapGroupTile(aMapGroups[index], elSectionContainer, null, panelID + aMapGroups[index], numTiles);
            });
        }
        // Handler that catches OnPropertyTransitionEndEvent event for this panel.
        const fnOnPropertyTransitionEndEvent = function (panelName, propertyName) {
            if (container.id === panelName && propertyName === 'opacity' &&
                !container.id.startsWith("FriendLeaderboards")) {
                // Panel is visible and fully transparent
                if (container.visible === true && container.BIsTransparent()) {
                    container.visible = false;
                    return true;
                }
            }
            return false;
        };
        $.RegisterEventHandler('PropertyTransitionEnd', container, fnOnPropertyTransitionEndEvent);
        return panelID;
    }
    ;
    function _PopulateQuickSelectBar(isSearching, isHost) {
        $.Msg("---------------------- populating quick select");
        const elQuickSelectContainer = $.GetContextPanel().FindChildInLayoutFile("jsQuickSelectionSetsContainer");
        if (!elQuickSelectContainer)
            return;
        if (m_isWorkshop)
            return;
        _MatchMapSelectionWithQuickSelect();
        _EnableDisableQuickSelectBtns(isSearching, isHost);
    }
    function _EnableDisableQuickSelectBtns(isSearching, isHost) {
        const bEnable = !isSearching && isHost;
        const elQuickSelectContainer = $.GetContextPanel().FindChildInLayoutFile("JsQuickSelectParent");
        elQuickSelectContainer.FindChildrenWithClassTraverse('preset-button').forEach(element => element.enabled = bEnable);
    }
    function _SaveMapSelectionToCustomPreset(bSilent = false) {
        // skip if direct challenge mode
        if (inDirectChallenge())
            return;
        //skip if in premier
        if (m_gameModeSetting === 'premier')
            return;
        const selectedMaps = _GetSelectedMapsForServerTypeAndGameMode(m_serverSetting, _RealGameMode(), true);
        if (selectedMaps === "") {
            if (!bSilent)
                $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.buymenu_failure', 'MOUSE');
            _NoMapSelectedPopup();
            return;
        }
        GameInterfaceAPI.SetSettingString('ui_playsettings_custom_preset', selectedMaps);
        if (!bSilent) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
            $.GetContextPanel().FindChildInLayoutFile("jsQuickSelectionSave").TriggerClass('save');
        }
        _MatchMapSelectionWithQuickSelect();
    }
    function _GetPanelTypeForMapGroupTile(gameMode, singleSkirmishMapGroup) {
        const bIsCompetitive = gameMode === 'competitive';
        const bIsSkirmish = gameMode === 'skirmish' && !singleSkirmishMapGroup;
        const bIsWingman = gameMode === 'scrimcomp2v2';
        return (((bIsCompetitive || bIsSkirmish || bIsWingman) && _IsValveOfficialServer(m_serverSetting)) ? "ToggleButton" : "RadioButton");
    }
    ;
    function _UpdateOrCreateMapGroupTile(mapGroupName, container, elTilePanel, newTileID, numTiles) {
        const mg = GetMGDetails(mapGroupName);
        if (!mg)
            return;
        let p = elTilePanel;
        if (!p) {
            const panelType = _GetPanelTypeForMapGroupTile(_RealGameMode(), m_singleSkirmishMapGroup);
            const panelID = newTileID ? newTileID : (container.id + mapGroupName);
            p = $.CreatePanel(panelType, container, panelID);
            p.BLoadLayoutSnippet("MapGroupSelection");
            if (panelType === "RadioButton") {
                // What is my radio group ID?
                let radioGroupID;
                if (panelID.endsWith(mapGroupName))
                    radioGroupID = panelID.substring(0, panelID.length - mapGroupName.length);
                else
                    radioGroupID = container.id;
                const group = "radiogroup_" + radioGroupID;
                p.SetAttributeString("group", group);
            }
        }
        p.SetAttributeString("mapname", mapGroupName);
        p.SetPanelEvent('onactivate', _OnActivateMapOrMapGroupButton.bind(undefined, p));
        p.SetHasClass('map-selection-btn-activedutymap', mg.grouptype === 'active');
        p.FindChildInLayoutFile('ActiveGroupIcon').visible = mg.grouptype === 'active';
        p.FindChildInLayoutFile('MapGroupName').text = $.Localize(mg.nameID);
        UpdateIconsAndScreenshots(p, numTiles, mapGroupName, mg);
        return p;
    }
    ;
    function UpdateIconsAndScreenshots(p, numTiles, mapGroupName, mg) {
        const keysList = Object.keys(mg.maps);
        const iconSize = 200; // HACK make them big enough so they can be resized
        const iconPath = mapGroupName === 'random_classic' ? 'file://{images}/icons/ui/random_map.svg' : 'file://{images}/' + mg.icon_image_path + '.svg';
        let mapGroupIcon = p.FindChildInLayoutFile('MapSelectionButton').FindChildInLayoutFile('MapGroupCollectionIcon');
        if (keysList.length < 2) {
            if (mapGroupIcon) {
                mapGroupIcon.SetImage(iconPath);
            }
            else {
                mapGroupIcon = $.CreatePanel('Image', p.FindChildInLayoutFile('MapSelectionButton'), 'MapGroupCollectionIcon', {
                    defaultsrc: 'file://{images}/icons/ui/random_map.svg',
                    texturewidth: iconSize,
                    textureheight: iconSize,
                    src: iconPath,
                    class: 'map-selection-btn__map-icon'
                });
                p.FindChildInLayoutFile('MapSelectionButton').MoveChildBefore(mapGroupIcon, p.FindChildInLayoutFile('MapGroupCollectionMultiIcons'));
            }
        }
        let mapImage = null;
        let mapIcon = null;
        if (mapGroupName === 'random_classic') {
            mapImage = p.FindChildInLayoutFile('MapGroupImagesCarousel').FindChildInLayoutFile('MapSelectionScreenshot');
            if (!mapImage) {
                mapImage = $.CreatePanel('Panel', p.FindChildInLayoutFile('MapGroupImagesCarousel'), 'MapSelectionScreenshot');
                mapImage.AddClass('map-selection-btn__screenshot');
            }
            mapImage.style.backgroundImage = 'url("file://{images}/map_icons/screenshots/360p/random.png")';
            mapImage.style.backgroundPosition = '50% 0%';
            mapImage.style.backgroundSize = 'auto 100%';
        }
        _SetMapGroupModifierLabelElements(mapGroupName, p);
        // Add map images to carousel.
        for (let i = 0; i < keysList.length; i++) {
            mapImage = p.FindChildInLayoutFile('MapGroupImagesCarousel').FindChildInLayoutFile('MapSelectionScreenshot' + i);
            if (!mapImage) {
                mapImage = $.CreatePanel('Panel', p.FindChildInLayoutFile('MapGroupImagesCarousel'), 'MapSelectionScreenshot' + i);
                mapImage.AddClass('map-selection-btn__screenshot');
            }
            if (m_gameModeSetting === 'survival') {
                mapImage.style.backgroundImage = 'url("file://{resources}/videos/' + keysList[i] + '_preview.webm")';
            }
            else {
                mapImage.style.backgroundImage = 'url("file://{images}/map_icons/screenshots/720p/' + keysList[i] + '.png")';
            }
            mapImage.style.backgroundPosition = '50% 0%';
            mapImage.style.backgroundSize = 'clip_then_cover';
            // This is for map groups icons
            if (keysList.length > 1) {
                const mapIconsContainer = p.FindChildInLayoutFile('MapGroupCollectionMultiIcons');
                mapIconsContainer.SetHasClass('left-right-flow-wrap', numTiles === 1);
                mapIconsContainer.SetHasClass('top-bottom-flow-wrap', numTiles > 1);
                const subMapIconImagePanelID = 'MapIcon' + i;
                mapIcon = mapIconsContainer.FindChildInLayoutFile(subMapIconImagePanelID);
                if (!mapIcon) {
                    mapIcon = $.CreatePanel('Image', mapIconsContainer, subMapIconImagePanelID, {
                        defaultsrc: 'file://{images}/map_icons/map_icon_NONE.png',
                        texturewidth: iconSize,
                        textureheight: iconSize,
                        src: 'file://{images}/map_icons/map_icon_' + keysList[i] + '.svg'
                    });
                }
                mapIcon.AddClass('map-selection-btn__map-icon');
                IconUtil.SetupFallbackMapIcon(mapIcon, 'file://{images}/map_icons/map_icon_' + keysList[i]);
            }
        }
        // Tooltip
        if (mg.tooltipID) {
            p.SetPanelEvent('onmouseover', OnMouseOverMapTile.bind(undefined, p.id, mg.tooltipID, keysList));
            p.SetPanelEvent('onmouseout', OnMouseOutMapTile);
        }
    }
    function OnMouseOverMapTile(id, tooltipText, mapsList) {
        tooltipText = $.Localize(tooltipText);
        const mapNamesList = [];
        if (mapsList.length > 1) {
            mapsList.forEach(function (element) {
                mapNamesList.push($.Localize('#SFUI_Map_' + element));
            });
            const mapGroupsText = mapNamesList.join(', ');
            tooltipText = tooltipText + '<br><br>' + mapGroupsText;
        }
        UiToolkitAPI.ShowTextTooltip(id, tooltipText);
    }
    ;
    function OnMouseOutMapTile() {
        UiToolkitAPI.HideTextTooltip();
    }
    ;
    let m_timerMapGroupHandler = null;
    function _GetRotatingMapGroupStatus(gameMode, singleSkirmishMapGroup, mapgroupname) {
        m_timerMapGroupHandler = null;
        const strSchedule = CompetitiveMatchAPI.GetRotatingOfficialMapGroupCurrentState(gameMode);
        const elTimer = m_mapSelectionButtonContainers[m_activeMapGroupSelectionPanelID].FindChildInLayoutFile('PlayMenuMapRotationTimer');
        if (elTimer) {
            if (strSchedule) {
                const strCurrentMapGroup = strSchedule.split("+")[0];
                const numSecondsRemaining = strSchedule.split("+")[1].split("=")[0];
                const strNextMapGroup = strSchedule.split("=")[1];
                const numWait = FormatText.SecondsToDDHHMMSSWithSymbolSeperator(numSecondsRemaining);
                if (!numWait) {
                    elTimer.AddClass('hidden');
                    return;
                }
                elTimer.RemoveClass('hidden');
                elTimer.SetDialogVariable('map-rotate-timer', numWait);
                const mg = GetMGDetails(strNextMapGroup);
                elTimer.SetDialogVariable('next-mapname', $.Localize(mg.nameID));
                // Find the existing map panel.
                // When the we switch maps recreate the map tile with the appropriate strCurrentMapGroup content.
                const mapGroupPanelID = _GetMapGroupPanelID() + strCurrentMapGroup;
                const mapGroupContainer = m_mapSelectionButtonContainers[m_activeMapGroupSelectionPanelID].FindChildTraverse('MapTile');
                const mapGroupPanel = mapGroupContainer.FindChildInLayoutFile(mapGroupPanelID);
                if (!mapGroupPanel) {
                    mapGroupContainer.RemoveAndDeleteChildren();
                    const btnMapGroup = _UpdateOrCreateMapGroupTile(strCurrentMapGroup, mapGroupContainer, null, mapGroupPanelID, 1);
                    // Since this is the only map group in the survival category then select it.
                    btnMapGroup.checked = true;
                    _UpdateSurvivalAutoFillSquadBtn(m_gameModeSetting);
                }
                m_timerMapGroupHandler = $.Schedule(1, _GetRotatingMapGroupStatus.bind(undefined, gameMode, singleSkirmishMapGroup, mapgroupname));
                // $.Msg( "GET Rotating official current map is " + strCurrentMapGroup + " for " + numSecondsRemaining + " more seconds, next map will be " + strNextMapGroup + 'HANDLE ' + m_timerMapGroupHandler );
            }
            else {
                elTimer.AddClass('hidden');
            }
        }
    }
    ;
    function _StartRotatingMapGroupTimer() {
        _CancelRotatingMapGroupSchedule();
        const activeMapGroup = m_activeMapGroupSelectionPanelID;
        if (_RealGameMode() === "survival"
            && m_mapSelectionButtonContainers && m_mapSelectionButtonContainers[activeMapGroup]
            && m_mapSelectionButtonContainers[activeMapGroup].Children()) {
            const btnSelectedMapGroup = m_mapSelectionButtonContainers[activeMapGroup].Children().filter(entry => entry.GetAttributeString('mapname', '') !== '');
            if (btnSelectedMapGroup[0]) {
                const mapSelectedGroupName = btnSelectedMapGroup[0].GetAttributeString('mapname', '');
                if (mapSelectedGroupName) {
                    _GetRotatingMapGroupStatus(_RealGameMode(), m_singleSkirmishMapGroup, mapSelectedGroupName);
                }
            }
        }
    }
    ;
    function _CancelRotatingMapGroupSchedule() {
        if (m_timerMapGroupHandler) {
            $.CancelScheduled(m_timerMapGroupHandler);
            // $.Msg( "CANCELED m_timerMapGroupHandler " + m_timerMapGroupHandler );
            m_timerMapGroupHandler = null;
        }
    }
    ;
    function _SetMapGroupModifierLabelElements(mapName, elMapPanel) {
        const isUnrankedCompetitive = (_RealGameMode() === 'competitive') && _IsValveOfficialServer(m_serverSetting) && (GameTypesAPI.GetMapGroupAttribute(mapName, 'competitivemod') === 'unranked');
        const isNew = !isUnrankedCompetitive && (GameTypesAPI.GetMapGroupAttribute(mapName, 'showtagui') === 'new');
        elMapPanel.FindChildInLayoutFile('MapGroupNewTag').SetHasClass('hidden', !isNew || mapName === "mg_lobby_mapveto");
        // elMapPanel.FindChildInLayoutFile( 'MapGroupNewTagYellowLarge' ).SetHasClass( 'hidden', mapName !== "mg_lobby_mapveto" );
        elMapPanel.FindChildInLayoutFile('MapGroupNewTagYellowLarge').SetHasClass('hidden', true);
        elMapPanel.FindChildInLayoutFile('MapSelectionTopRowIcons').SetHasClass('tall', mapName === "mg_lobby_mapveto");
        elMapPanel.FindChildInLayoutFile('MapGroupUnrankedTag').SetHasClass('hidden', !isUnrankedCompetitive);
    }
    ;
    function _ReloadLeaderboardLayoutGivenSettings(container, lbName, strTitleOverride, strPointsTitle) {
        const elFriendLeaderboards = container.FindChildTraverse("FriendLeaderboards");
        $.Msg("Reloading embedded leaderboard " + lbName + " title=" + (strTitleOverride ? strTitleOverride : "<none>") + " (points = " + (strPointsTitle ? strPointsTitle : "<default>") + ")");
        elFriendLeaderboards.SetAttributeString("type", lbName);
        if (strPointsTitle)
            elFriendLeaderboards.SetAttributeString("points-title", strPointsTitle);
        if (strTitleOverride)
            elFriendLeaderboards.SetAttributeString("titleoverride", strTitleOverride);
        elFriendLeaderboards.BLoadLayout('file://{resources}/layout/popups/popup_leaderboards.xml', true, false);
        elFriendLeaderboards.AddClass('leaderboard_embedded');
        //	elFriendLeaderboards.AddClass( 'play_menu_survival' );
        elFriendLeaderboards.RemoveClass('Hidden');
    }
    function _LoadLeaderboardsLayoutForContainer(container) {
        if ((m_gameModeSetting === "cooperative") || (m_gameModeSetting === "coopmission")) {
            const questID = GetMatchmakingQuestId();
            if (questID > 0) {
                const lbName = "official_leaderboard_quest_" + questID;
                const elFriendLeaderboards = container.FindChildTraverse("FriendLeaderboards");
                if (elFriendLeaderboards.GetAttributeString("type", '') !== lbName) {
                    const strTitle = '#CSGO_official_leaderboard_mission_embedded';
                    // strTitle = MissionsAPI.GetQuestDefinitionField( questID, "loc_name" );
                    _ReloadLeaderboardLayoutGivenSettings(container, lbName, strTitle, '');
                }
                const elDescriptionLabel = container.FindChildTraverse("MissionDesc");
                elDescriptionLabel.text = MissionsAPI.GetQuestDefinitionField(questID, "loc_description");
                MissionsAPI.ApplyQuestDialogVarsToPanelJS(questID, container);
                /*
                const arrGameElements = OperationUtil.GetQuestGameElements( questID );
                if ( arrGameElements.length > 0 )
                {
                    const elIconContainer = container.FindChildTraverse( "GameElementIcons" );
                    arrGameElements.forEach( function ( info : {icon:string} , idx : number)
                    {
                        $.CreatePanel( 'Image', elIconContainer, 'GameElementIcon_' + idx, {
                            texturewidth: 64,
                            textureheight: 64,
                            src: info.icon,
                            class: 'coop-mission__icon'
                        } );
                    } );
                }
                */
            }
        }
        else if (m_gameModeSetting === "survival") {
            // wait for the leaderboard to be updated matching the autofill preference
        }
    }
    function _UpdateMapGroupButtons(isEnabled, isSearching, isHost) {
        const panelID = _LazyCreateMapListPanel();
        // Update wait time for queued modes
        if ((_RealGameMode() === 'competitive' || _RealGameMode() === 'scrimcomp2v2') && _IsPlayingOnValveOfficial()) {
            _UpdateWaitTime(_GetMapListForServerTypeAndGameMode(panelID));
        }
        if (!inDirectChallenge())
            _SetEnabledStateForMapBtns(m_mapSelectionButtonContainers[panelID], isSearching, isHost);
        // Select this panel
        m_activeMapGroupSelectionPanelID = panelID;
        _ShowActiveMapSelectionTab(isEnabled);
        _PopulateQuickSelectBar(isSearching, isHost);
    }
    ;
    function _SelectMapButtonsFromSettings(settings) {
        // Set mapgroup from selected panels on active map selection list
        const mapsGroups = settings.game.mapgroupname.split(',');
        const aListMaps = _GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID);
        aListMaps.forEach(function (e) {
            // For all buttons who represent a mapgroup that is currently selected
            const mapName = e.GetAttributeString("mapname", "invalid");
            e.checked = mapsGroups.includes(mapName);
        });
    }
    ;
    function _ShowHideStartSearchBtn(isSearching, isHost) {
        let bShow = !isSearching && isHost ? true : false;
        const btnStartSearch = $.GetContextPanel().FindChildInLayoutFile('StartMatchBtn');
        // 'pressed' and 'hidden' both control the visiblilty of the Button.
        // 'pressed' plays an animation that fades the button out so if we are in that state we 
        // and want to show we want to remove that class.
        if (bShow) {
            if (btnStartSearch.BHasClass('pressed')) {
                btnStartSearch.RemoveClass('pressed');
            }
            btnStartSearch.RemoveClass('hidden');
        }
        // If we are already hiding the button by the user having 'pressed' it then don't hide it immediately
        // because the pressed anim will not finish.
        else if (!btnStartSearch.BHasClass('pressed')) {
            btnStartSearch.AddClass('hidden');
        }
        //
        // Show/hide the icons of your competitive team dudes
        //
        //	let panelPlayMenuControlLobbyUserIcons = $.GetContextPanel().FindChildInLayoutFile( 'PlayMenuControlLobbyUserIcons' );
        let numStyleToShow = 0;
        if (!isSearching && (_RealGameMode() === 'competitive') &&
            _IsPlayingOnValveOfficial() && (PartyListAPI.GetCount() >= PartyListAPI.GetPartySessionUiThreshold())) {
            numStyleToShow = PartyListAPI.GetCount();
            if ((numStyleToShow > 5) || (0 == PartyListAPI.GetPartySessionUiThreshold())) { // overcrowded lobbies just show up as full lobbies (and allow testing full party by setting the cvar to 0)
                numStyleToShow = 5;
            }
        }
        numStyleToShow = 0; // suppress the lobby people styles
        for (let j = 1; j <= 5; ++j) {
            //		panelPlayMenuControlLobbyUserIcons.SetHasClass( 'play-menu-controls-lobby-count-' + j, j <= numStyleToShow );
        }
        //	panelPlayMenuControlLobbyUserIcons.SetHasClass( 'play-menu-controls-lobby-count-host', isHost );
    }
    ;
    function _ShowCancelSearchButton(isSearching, isHost) {
        const btnCancel = $.GetContextPanel().FindChildInLayoutFile('PartyCancelBtn');
        //btnCancel.SetHasClass( 'hidden', ( !isSearching || !isHost ) );
        btnCancel.enabled = (isSearching && isHost);
        if (!btnCancel.enabled)
            ParticleControls.UpdateActionBar(m_PlayMenuActionBarParticleFX, "RmoveBtnEffects");
    }
    ;
    function _UpdatePracticeSettingsBtns(isSearching, isHost) {
        // Set up practice settings
        let elPracticeSettingsContainer = $('#id-play-menu-practicesettings-container');
        let sessionSettings = LobbyAPI.GetSessionSettings();
        let bForceHidden = (m_serverSetting !== 'listen') || m_isWorkshop || !LobbyAPI.IsSessionActive() || !sessionSettings;
        elPracticeSettingsContainer.Children().forEach(function (elChild) {
            if (!elChild.id.startsWith('id-play-menu-practicesettings-'))
                return;
            let strFeatureName = elChild.id;
            strFeatureName = strFeatureName.replace('id-play-menu-practicesettings-', '');
            strFeatureName = strFeatureName.replace('-tooltip', '');
            // "id-play-menu-practicesettings-grenades-tooltip" => '#practicesettings_*grenades*_button'
            let elFeatureFrame = elChild.FindChild('id-play-menu-practicesettings-' + strFeatureName);
            let elFeatureSliderBtn = elFeatureFrame.FindChild('id-slider-btn');
            // We hide and exit if you are not playing offline pracitce
            if (bForceHidden || (sessionSettings.game.type !== 'classic')) {
                elChild.visible = false;
                return;
            }
            elChild.visible = true;
            elFeatureSliderBtn.enabled = isHost && !isSearching;
            let curvalue = (sessionSettings && sessionSettings.options && sessionSettings.options.hasOwnProperty('practicesettings_' + strFeatureName))
                ? sessionSettings.options['practicesettings_' + strFeatureName] : 0;
            elFeatureSliderBtn.checked = curvalue ? true : false;
        });
    }
    function _UpdatePrimeBtn(isSearching, isHost) {
        const elPrimePanel = $('#PrimeStatusPanel');
        const elGetPrimeBtn = $('#id-play-menu-get-prime');
        const elPrimeStatus = $('#PrimeStatusLabelContainer');
        const elToogleRankedBtn = $('#id-play-menu-toggle-ranked');
        const elToogleTooltip = $('#id-play-menu-toggle-ranked-tooltip');
        const elRankedLimitedTestWarning = $('#jsLimitedTestWarning');
        const isPrime = (!m_challengeKey && m_serverPrimeSetting) ? true : false;
        // We hide and exit if you are not playing official or you are not connected to GC
        if (!_IsPlayingOnValveOfficial() || !MyPersonaAPI.IsInventoryValid() || inDirectChallenge()) {
            elPrimePanel.visible = false;
            elToogleRankedBtn.visible = false;
            elRankedLimitedTestWarning.visible = false;
            return;
        }
        const LocalPlayerHasPrime = PartyListAPI.GetFriendPrimeEligible(MyPersonaAPI.GetXuid());
        // Show panel
        elPrimePanel.visible = true;
        elPrimePanel.SetHasClass('play-menu-prime-logo-bg', LocalPlayerHasPrime);
        // Show or hide the prime relevent panels based on if you have prime
        elGetPrimeBtn.visible = !LocalPlayerHasPrime;
        elPrimeStatus.visible = LocalPlayerHasPrime;
        elToogleRankedBtn.visible = LocalPlayerHasPrime;
        // Don't have prime show set the upsell button
        if (!LocalPlayerHasPrime) {
            const sPrice = StoreAPI.GetStoreItemSalePrice(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1353, 0), 1, '');
            elGetPrimeBtn.SetDialogVariable("price", sPrice ? sPrice : '$0');
            elGetPrimeBtn.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.HideTextTooltip();
                UiToolkitAPI.ShowCustomLayoutPopup('prime_status', 'file://{resources}/layout/popups/popup_prime_status.xml');
            });
            return;
        }
        // Set setting from matchmaking session
        elToogleRankedBtn.FindChild('id-slider-btn').checked = isPrime ? true : false;
        const bGameModeHaveRankedMatches = SessionUtil.DoesGameModeHavePrimeQueue(_RealGameMode());
        elToogleRankedBtn.visible = bGameModeHaveRankedMatches && MyPersonaAPI.GetBetaType().includes('fullversion');
        elRankedLimitedTestWarning.visible = bGameModeHaveRankedMatches && MyPersonaAPI.GetBetaType().includes('limitedbeta');
        // Enable/Disable button based on if they should be able to set it
        elToogleRankedBtn.FindChild('id-slider-btn').enabled = (bGameModeHaveRankedMatches
            && SessionUtil.AreLobbyPlayersPrime()
            && isHost
            && !isSearching);
        if (SessionUtil.AreLobbyPlayersPrime()) {
            _UpdatePrimeStatus(elPrimeStatus, elToogleTooltip, true);
        }
        else {
            _UpdatePrimeStatus(elPrimeStatus, elToogleTooltip, false);
        }
    }
    ;
    function _UpdatePrimeStatus(elPrimeStatus, elToogleTooltip, bIsEnabled) {
        let elPrimeStatusWarning = $('#PrimeStatusLabelWarning');
        elPrimeStatusWarning.visible = !bIsEnabled;
        elPrimeStatus.SetHasClass('disabled', !bIsEnabled);
        if (bIsEnabled) {
            elPrimeStatus.SetPanelEvent('onmouseover', function () { });
            elPrimeStatus.SetPanelEvent('onmouseout', function () { });
            $('#PrimeStatusLabel').text = $.Localize('#elevated_status_enabled');
            elToogleTooltip.SetPanelEvent('onmouseover', function () { UiToolkitAPI.ShowTextTooltip(elToogleTooltip.id, '#tooltip_prime_only_3'); });
            elToogleTooltip.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideTextTooltip(); });
        }
        else {
            const oPrimeMembers = _GetPrimePartyMembers();
            elPrimeStatusWarning.SetDialogVariableInt('prime_members', oPrimeMembers.prime);
            elPrimeStatusWarning.SetDialogVariableInt('total', oPrimeMembers.total);
            elPrimeStatusWarning.text = $.Localize("#elevated_status_disabled_warning", elPrimeStatusWarning);
            $('#PrimeStatusLabel').text = $.Localize("#elevated_status_disabled", elPrimeStatus);
            elToogleTooltip.SetPanelEvent('onmouseover', function () { UiToolkitAPI.ShowTextTooltip(elToogleTooltip.id, "#elevated_status_enabled_warning_tooltip"); });
            elToogleTooltip.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideTextTooltip(); });
        }
    }
    function _GetPrimePartyMembers() {
        const count = PartyListAPI.GetCount();
        let primeMembers = 0;
        for (let i = 0; i < count; i++) {
            const xuid = PartyListAPI.GetXuidByIndex(i);
            if (PartyListAPI.GetFriendPrimeEligible(xuid)) {
                primeMembers++;
            }
        }
        return { prime: primeMembers, total: count };
    }
    function _IsPrimeChecked() {
        return $('#id-play-menu-toggle-ranked').checked;
    }
    ;
    function _UpdatePermissionBtnText(settings, isEnabled) {
        let elBtnContainer = $('#PermissionsSettings');
        let elBtn = elBtnContainer.FindChild("id-slider-btn");
        elBtn.SetDialogVariable('slide_toggle_text', $.Localize("#permissions_open_party"));
        elBtn.SetSelected(settings.system.access === 'public');
        // Disable if you are a client or searching
        elBtn.enabled = isEnabled;
    }
    ;
    function GetMatchmakingQuestId() {
        const settings = LobbyAPI.GetSessionSettings();
        if (settings && settings.game && settings.game.questid)
            return parseInt(settings.game.questid);
        else
            return 0;
    }
    function _UpdateLeaderboardBtn(gameMode, isOfficalMatchmaking = false) {
        const elLeaderboardButton = $('#PlayMenulLeaderboards');
        //DEVONLY{
        if (gameMode === 'survival' && _IsPlayingOnValveOfficial()) {
            elLeaderboardButton.visible = true;
            function _OnActivate() {
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_leaderboards.xml', 'type=official_leaderboard_survival_squads,official_leaderboard_survival_solo' +
                    '&' + 'titleoverride=#CSGO_official_leaderboard_survival_title' +
                    '&' + 'showglobaloverride=false' +
                    '&' + 'points-title=#Cstrike_TitlesTXT_WINS');
            }
            ;
            elLeaderboardButton.SetPanelEvent('onactivate', _OnActivate);
        }
        else if ((gameMode === 'cooperative' || gameMode === 'coopmission') && GetMatchmakingQuestId() > 0) {
            elLeaderboardButton.visible = true;
            elLeaderboardButton.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_leaderboards.xml', 'type=official_leaderboard_quest_' + GetMatchmakingQuestId());
            });
        }
        else 
        //}DEVONLY
        {
            elLeaderboardButton.visible = false;
        }
    }
    ;
    function _UpdateSurvivalAutoFillSquadBtn(gameMode) {
        const elBtn = $('#SurvivalAutoSquadToggle');
        if (!elBtn) {
            return;
        }
        if (gameMode === 'survival' && _IsPlayingOnValveOfficial() && (PartyListAPI.GetCount() <= 1)) {
            elBtn.visible = true;
            const bAutoFill = !(GameInterfaceAPI.GetSettingString('ui_playsettings_survival_solo') === '1');
            elBtn.checked = bAutoFill;
            elBtn.enabled = !_IsSearching();
            function _OnActivate() {
                const bAutoFill = !(GameInterfaceAPI.GetSettingString('ui_playsettings_survival_solo') === '1');
                GameInterfaceAPI.SetSettingString('ui_playsettings_survival_solo', bAutoFill ? '1' : '0');
                _UpdateSurvivalAutoFillSquadBtn('survival');
            }
            ;
            elBtn.SetPanelEvent('onactivate', _OnActivate);
        }
        else {
            elBtn.visible = false;
        }
        if (gameMode === 'survival') {
            const lbType = ((elBtn.visible && !elBtn.checked) ? 'solo' : 'squads');
            const lbName = "official_leaderboard_survival_" + lbType;
            const container = elBtn.GetParent().GetParent();
            const elFriendLeaderboards = container.FindChildTraverse("FriendLeaderboards");
            const sPreviousType = elFriendLeaderboards.GetAttributeString("type", '');
            if (sPreviousType !== lbName) {
                $.Msg("Reloading survival leaderboard (old type = " + sPreviousType + ", new type = " + lbName + ")");
                _ReloadLeaderboardLayoutGivenSettings(container, lbName, "#CSGO_official_leaderboard_survival_" + lbType, "#Cstrike_TitlesTXT_WINS");
            }
        }
    }
    ;
    function _SetEnabledStateForMapBtns(elMapList, isSearching, isHost) {
        elMapList.SetHasClass('is-client', (isSearching || !isHost));
        const childrenList = _GetMapListForServerTypeAndGameMode();
        const bEnable = !isSearching && isHost;
        childrenList.forEach(element => {
            if (!element.BHasClass('no-lock')) {
                element.enabled = bEnable;
            }
        });
    }
    ;
    function _UpdateWaitTime(elMapList) {
        const childrenList = elMapList;
        for (let i = 0; i < childrenList.length; i++) {
            const elWaitTime = childrenList[i].FindChildTraverse('MapGroupWaitTime');
            const mapName = childrenList[i].GetAttributeString("mapname", "invalid");
            if (mapName === 'invalid') {
                continue;
            }
            const seconds = LobbyAPI.GetMapWaitTimeInSeconds(_RealGameMode(), mapName);
            const numWait = FormatText.SecondsToDDHHMMSSWithSymbolSeperator(seconds);
            if (numWait) {
                elWaitTime.SetDialogVariable("time", numWait);
                elWaitTime.FindChild('MapGroupWaitTimeLabel').text = $.Localize('#matchmaking_expected_wait_time', elWaitTime);
                elWaitTime.RemoveClass('hidden');
            }
            else {
                elWaitTime.AddClass('hidden');
            }
        }
    }
    ;
    function _SelectActivePlayPlayTypeBtn() {
        const aPlayTypeBtns = $('#PlayTypeTopNav').Children();
        aPlayTypeBtns.forEach(btn => {
            if (m_activeMapGroupSelectionPanelID === k_workshopPanelId) {
                btn.checked = btn.id === 'PlayWorkshop';
            }
            else {
                btn.checked = btn.id === 'Play-' + m_serverSetting;
            }
        });
    }
    ;
    function _UpdateTopNavRadioBtns() {
        $('#GameModeSelectionRadios').Children().forEach(btn => {
            if (m_activeMapGroupSelectionPanelID === k_workshopPanelId && btn.id === 'PlayWorkshop') {
                $.DispatchEvent("Activated", btn, "mouse");
                btn.checked = true;
                return;
            }
            else if (btn.id === 'Play-' + m_serverSetting) {
                $.DispatchEvent("Activated", btn, "mouse");
                btn.checked = true;
                return;
            }
        });
    }
    function _IsValveOfficialServer(serverType) {
        return serverType === "official" ? true : false;
    }
    function _IsPlayingOnValveOfficial() {
        return _IsValveOfficialServer(m_serverSetting);
    }
    ;
    function _IsSearching() {
        const searchingStatus = LobbyAPI.GetMatchmakingStatusString();
        return searchingStatus !== '' && searchingStatus !== undefined ? true : false;
    }
    ;
    // Reads the state of the buttons and returns the maplist
    function _GetSelectedMapsForServerTypeAndGameMode(serverType, gameMode, bDontToggleMaps = false) {
        const isPlayingOnValveOfficial = _IsValveOfficialServer(serverType);
        // constmapGroupPanelID = _LazyCreateMapListPanel( serverType, gameMode );
        // constmapContainer = m_mapSelectionButtonContainers[ mapGroupPanelID ];
        const aListMapPanels = _GetMapListForServerTypeAndGameMode();
        // After fresh game launch if we go to a different game mode tab then initialize buttons from our preferences
        if (!_CheckContainerHasAnyChildChecked(aListMapPanels)) {
            // $.Msg( "servertype = " + serverType + ", gameMode = " + gameMode );
            let preferencesMapsForThisMode = GameInterfaceAPI.GetSettingString('ui_playsettings_maps_' + serverType + '_' + gameMode);
            // if no settings for this mode that's ok?
            if (!preferencesMapsForThisMode)
                preferencesMapsForThisMode = '';
            const savedMapIds = preferencesMapsForThisMode.split(',');
            savedMapIds.forEach(function (strMapNameIndividual) {
                const mapsWithThisName = aListMapPanels.filter(function (map) {
                    const mapName = map.GetAttributeString("mapname", "invalid");
                    return mapName === strMapNameIndividual;
                });
                if (mapsWithThisName.length > 0) {
                    if (!bDontToggleMaps)
                        mapsWithThisName[0].checked = true;
                }
            });
            if (aListMapPanels.length > 0 && !_CheckContainerHasAnyChildChecked(aListMapPanels)) {
                if (!bDontToggleMaps)
                    aListMapPanels[0].checked = true;
            }
        }
        const selectedMaps = aListMapPanels.filter(function (e) {
            // For all selected maps (only >1 in competitive queues) 
            return e.checked;
        }).reduce(function (accumulator, e) {
            // make a comma delimited string of selections
            const mapName = e.GetAttributeString("mapname", "invalid");
            return (accumulator) ? (accumulator + "," + mapName) : mapName;
        }, '');
        return selectedMaps;
    }
    ;
    function _GetMapListForServerTypeAndGameMode(mapGroupOverride = null) {
        const mapGroupPanelID = !mapGroupOverride ? _LazyCreateMapListPanel() : mapGroupOverride;
        const elParent = m_mapSelectionButtonContainers[mapGroupPanelID];
        if (_RealGameMode() === 'competitive' && elParent.GetAttributeString('hassections', '')) {
            let aListMapPanels = [];
            elParent.Children().forEach(function (section) {
                section.Children().forEach(function (tile) {
                    if (tile.id != 'play-maps-section-header-container') {
                        aListMapPanels.push(tile);
                    }
                });
            });
            return aListMapPanels;
        }
        else if (_IsPlayingOnValveOfficial() && (_RealGameMode() === 'survival'
            || _RealGameMode() === 'cooperative'
            || _RealGameMode() === 'coopmission')) {
            let elMapTile = elParent.FindChildTraverse("MapTile");
            if (elMapTile)
                return elMapTile.Children();
            else
                return elParent.Children();
        }
        else {
            return elParent.Children();
        }
    }
    ;
    function _GetSelectedWorkshopMapButtons() {
        const mapGroupPanelID = _LazyCreateWorkshopTab();
        const mapContainer = m_mapSelectionButtonContainers[mapGroupPanelID];
        const children = mapContainer.Children();
        if (children.length == 0 || !children[0].GetAttributeString('group', "")) {
            // No workshop maps
            return [];
        }
        // After fresh game launch if we go to a different game mode tab then initialize buttons from our preferences
        if (!_CheckContainerHasAnyChildChecked(children)) {
            let preferencesMapsForThisMode = GameInterfaceAPI.GetSettingString('ui_playsettings_maps_workshop');
            // if no settings for this mode that's ok?
            if (!preferencesMapsForThisMode)
                preferencesMapsForThisMode = '';
            const savedMapIds = preferencesMapsForThisMode.split(',');
            savedMapIds.forEach(function (strMapNameIndividual) {
                const mapsWithThisName = children.filter(function (map) {
                    const mapName = map.GetAttributeString("mapname", "invalid");
                    return mapName === strMapNameIndividual;
                });
                if (mapsWithThisName.length > 0) {
                    mapsWithThisName[0].checked = true;
                }
            });
            if (!_CheckContainerHasAnyChildChecked(children) && children.length > 0) {
                children[0].checked = true;
            }
        }
        const selectedMaps = children.filter(function (e) {
            // For all selected maps (only >1 in competitive queues) 
            return e.checked;
        });
        return Array.from(selectedMaps);
    }
    ;
    function _GetSelectedWorkshopMap() {
        const mapButtons = _GetSelectedWorkshopMapButtons();
        const selectedMaps = mapButtons.reduce(function (accumulator, e) {
            // make a comma delimited string of selections
            const mapName = e.GetAttributeString("mapname", "invalid");
            return (accumulator) ? (accumulator + "," + mapName) : mapName;
        }, '');
        return selectedMaps;
    }
    ;
    function _GetSingleSkirmishIdFromMapGroup(mapGroup) {
        return mapGroup.replace('mg_skirmish_', '');
    }
    ;
    function _GetSingleSkirmishMapGroupFromId(skirmishId) {
        return 'mg_skirmish_' + skirmishId;
    }
    ;
    function _GetSingleSkirmishIdFromSingleSkirmishString(entry) {
        return entry.replace('skirmish_', '');
    }
    ;
    function _GetSingleSkirmishMapGroupFromSingleSkirmishString(entry) {
        return _GetSingleSkirmishMapGroupFromId(_GetSingleSkirmishIdFromSingleSkirmishString(entry));
    }
    ;
    function _IsSingleSkirmishString(entry) {
        return entry.startsWith('skirmish_');
    }
    ;
    //--------------------------------------------------------------------------------------------------
    // Check if container has any child buttons selected
    //--------------------------------------------------------------------------------------------------
    function _CheckContainerHasAnyChildChecked(aMapList) {
        if (aMapList.length < 1)
            return false;
        return aMapList.filter(function (map) {
            return map.checked;
        }).length > 0;
    }
    ;
    function _DivertFromDisabledPremier() {
        const modes = [
            "competitive",
            "scrimcomp2v2",
            "casual",
            "deathmatch"
        ];
        for (let i = 0; i < modes.length; i++) {
            if (_IsGameModeAvailable(m_serverSetting, modes[i])) {
                m_gameModeSetting = modes[i];
                m_singleSkirmishMapGroup = null;
                break;
            }
        }
    }
    //--------------------------------------------------------------------------------------------------
    // Validates session settings and fixes any problems
    //--------------------------------------------------------------------------------------------------
    function _ValidateSessionSettings() {
        if (m_isWorkshop) {
            // workshop is only available offline
            m_serverSetting = "listen";
        }
        if (m_gameModeSetting === 'premier' && !_IsGameModeAvailable(m_serverSetting, 'premier')) {
            _DivertFromDisabledPremier();
        }
        if (!_IsGameModeAvailable(m_serverSetting, m_gameModeSetting)) {
            // Try to get an available game mode from the user setting first
            m_gameModeSetting = GameInterfaceAPI.GetSettingString("ui_playsettings_mode_" + m_serverSetting);
            m_singleSkirmishMapGroup = null;
            if (_IsSingleSkirmishString(_RealGameMode())) {
                m_singleSkirmishMapGroup = _GetSingleSkirmishMapGroupFromSingleSkirmishString(_RealGameMode());
                m_gameModeSetting = 'skirmish';
            }
            if (!_IsGameModeAvailable(m_serverSetting, m_gameModeSetting)) {
                $.Msg('_ValidateSessionSettings doing brute force search because [[ ' + m_serverSetting + ' ' + m_gameModeSetting + ' ]] is unavailable');
                //
                // Make sure this code matches :: uicomponent_settings.cpp
                // UI_SETTINGS_CVAR_ALIAS_WITH_GET_FILTER_FUNC( ui_playsettings_mode_official
                //
                // illegal server/mode combination.
                //
                // find an available mode (using double-quotes to copy/paste with C++)
                const modes = [
                    "deathmatch", "casual",
                    "survival", "skirmish",
                    "scrimcomp2v2", "competitive",
                ];
                for (let i = 0; i < modes.length; i++) {
                    if (_IsGameModeAvailable(m_serverSetting, modes[i])) {
                        m_gameModeSetting = modes[i];
                        m_singleSkirmishMapGroup = null;
                        break;
                    }
                }
            }
        }
        // we don't have a valid setting so read one from disk
        if (!m_gameModeFlags[m_serverSetting + _RealGameMode()])
            _LoadGameModeFlagsFromSettings();
        // filter gamemodeflag values if this mode uses flags
        if (GameModeFlags.DoesModeUseFlags(_RealGameMode())) {
            if (!GameModeFlags.AreFlagsValid(_RealGameMode(), m_gameModeFlags[m_serverSetting + _RealGameMode()])) {
                _setAndSaveGameModeFlags(0);
                $.Msg("Bad gamemodeflag for " + _RealGameMode() + ": " + m_gameModeFlags[m_serverSetting + _RealGameMode()]);
            }
        }
    }
    ;
    function _LoadGameModeFlagsFromSettings() {
        m_gameModeFlags[m_serverSetting + _RealGameMode()] = parseInt(GameInterfaceAPI.GetSettingString('ui_playsettings_flags_' + m_serverSetting + '_' + _RealGameMode()));
    }
    //--------------------------------------------------------------------------------------------------
    // Applies all the session settings
    //--------------------------------------------------------------------------------------------------
    function _ApplySessionSettings() {
        if (m_gameModeSetting === 'scrimcomp2v2') { // Ensure that my rank for Wingman is fetched before I advertise as a player for hire
            MyPersonaAPI.HintLoadPipRanks('wingman');
        }
        else if (m_gameModeSetting === 'survival') { // Ensure that my rank for Wingman is fetched before I advertise as a player for hire
            MyPersonaAPI.HintLoadPipRanks('dangerzone');
        }
        if (!LobbyAPI.BIsHost()) {
            return;
        }
        // Fix any problem settings (invalid game modes, etc)
        _ValidateSessionSettings();
        // $.Msg( "_ApplySessionSettings " + m_serverSetting + "/" + _RealGameMode() );
        const serverType = m_serverSetting;
        let gameMode = _RealGameMode();
        let gameModeFlags = m_gameModeFlags[m_serverSetting + gameMode] ? m_gameModeFlags[m_serverSetting + gameMode] : 0;
        let primePreference = m_serverPrimeSetting;
        let selectedMaps;
        if (m_isWorkshop)
            selectedMaps = _GetSelectedWorkshopMap();
        else if (inDirectChallenge()) {
            selectedMaps = 'mg_lobby_mapveto'; // force mg_lobby_mapveto
            gameModeFlags = 16; // force long match
            primePreference = 0; // force unranked via settings update below
        }
        else if (m_gameModeSetting === 'premier') {
            selectedMaps = 'mg_lobby_mapveto'; // force mg_lobby_mapveto
            primePreference = 1; // force ranked
            m_challengeKey = ''; // clear direct challenge key
        }
        else if (m_singleSkirmishMapGroup) {
            selectedMaps = m_singleSkirmishMapGroup;
        }
        else {
            selectedMaps = _GetSelectedMapsForServerTypeAndGameMode(serverType, gameMode);
        }
        const settings = {
            update: {
                Options: {
                    action: "custommatch",
                    server: serverType,
                    challengekey: _GetDirectChallengeKey(),
                },
                Game: {
                    // prime: MyPersonaAPI.IsInventoryValid() ?_IsPrimeChecked() : '',
                    mode: gameMode,
                    mode_ui: m_gameModeSetting,
                    type: GetGameType(gameMode),
                    mapgroupname: selectedMaps,
                    gamemodeflags: gameModeFlags,
                    prime: primePreference,
                    map: ''
                }
            },
            delete: {}
        };
        if (!inDirectChallenge()) { // we're not in direct challenge so delete the key from the session
            settings.delete = {
                Options: {
                    challengekey: 1
                }
            };
        }
        // TERRIBLE HACK: Ok so the random map feature has been broken for a long time, probably since panorama shipped and maybe even before.
        // It is very rarely used and might have appeared to work because it just loads whatever map is in the 'map' session key when it fails
        // This is the simplest way to just pick a random map from the offline map group entry in GameModes.txt without adding more work
        // to fix this very low value feature. This is fragile, relies on naming conventions in that file and is generally all around terrible
        // but I can't justify doing much more to keep this around. Alternative is to cut it. `
        if (selectedMaps.startsWith("random_")) {
            const arrMapGroups = _GetAvailableMapGroups(gameMode, false);
            const idx = 1 + Math.floor((Math.random() * (arrMapGroups.length - 1)));
            settings.update.Game.map = arrMapGroups[idx].substring(3);
        }
        // Save current choices
        // REI TODO: refactor, doesn't really belong here?
        if (m_isWorkshop) {
            GameInterfaceAPI.SetSettingString('ui_playsettings_maps_workshop', selectedMaps);
        }
        else {
            let singleSkirmishSuffix = '';
            if (m_singleSkirmishMapGroup) {
                singleSkirmishSuffix = '_' + _GetSingleSkirmishIdFromMapGroup(m_singleSkirmishMapGroup);
            }
            GameInterfaceAPI.SetSettingString('ui_playsettings_mode_' + serverType, m_gameModeSetting + singleSkirmishSuffix);
            if (!inDirectChallenge() && m_gameModeSetting !== 'premier') { // do not save the maps for "private queues", otherwise we will overwrite user preferences with "mg_lobby_mapveto"
                GameInterfaceAPI.SetSettingString('ui_playsettings_maps_' + serverType + '_' + m_gameModeSetting + singleSkirmishSuffix, selectedMaps);
            }
        }
        // Broadcast current settings to all clients (including ourselves)
        // This will call back into us via _SessionSettingsUpdate() so we can set up our new state
        LobbyAPI.UpdateSessionSettings(settings);
    }
    ;
    function ApplyPrimeSetting() {
        //if( MyPersonaAPI.IsInventoryValid() )
        //{
        const newvalue = m_serverPrimeSetting ? 0 : 1;
        const settings = { update: { Game: { prime: m_serverPrimeSetting } } };
        settings.update.Game.prime = newvalue; // flip the prime setting in the session
        //settings.update.Game.prime = _IsPrimeChecked();
        LobbyAPI.UpdateSessionSettings(settings);
        GameInterfaceAPI.SetSettingString('ui_playsettings_prime', '' + newvalue);
        //}
    }
    //--------------------------------------------------------------------------------------------------
    // Functions called from outside
    //--------------------------------------------------------------------------------------------------
    function _SessionSettingsUpdate(sessionState) {
        // force all controls to match their associated session settings
        if (sessionState === "ready") {
            if (m_jsTimerUpdateHandle && typeof m_jsTimerUpdateHandle === "number") {
                $.CancelScheduled(m_jsTimerUpdateHandle);
                m_jsTimerUpdateHandle = false;
            }
            _Init(); // late init, needed to create session before populating controls
        }
        // Host changed settings, update our controls to match
        else if (sessionState === "updated") {
            const settings = LobbyAPI.GetSessionSettings();
            _SyncDialogsFromSessionSettings(settings);
        }
        else if (sessionState === "closed") {
            // there is no session so init the lobby.
            //_Init();
            // Queue hide content panel for a half second as we are going to go into the loading screen, and 
            // we don't need dueling transitions.
            m_jsTimerUpdateHandle = $.Schedule(0.5, _HalfSecondDelay_HideContentPanel);
            $.Msg("[CSGO_MainMenu_Play]", "Queue HideContentPanel");
        }
    }
    ;
    function _HalfSecondDelay_HideContentPanel() {
        m_jsTimerUpdateHandle = false;
        $.Msg("[CSGO_MainMenu_Play]", "Dispatch HideContentPanel");
        $.DispatchEvent('HideContentPanel');
    }
    ;
    function _ReadyForDisplay() {
        _StartRotatingMapGroupTimer();
    }
    ;
    function _UnreadyForDisplay() {
        _CancelRotatingMapGroupSchedule();
    }
    ;
    function _OnHideMainMenu() {
        $('#MapSelectionList').FindChildrenWithClassTraverse("map-selection-btn__carousel").forEach(function (entry) {
            entry.SetAutoScrollEnabled(false);
        });
    }
    ;
    function _OnShowMainMenu() {
        $('#MapSelectionList').FindChildrenWithClassTraverse("map-selection-btn__carousel").forEach(function (entry) {
            entry.SetAutoScrollEnabled(true);
        });
    }
    ;
    function _GetPlayType() {
        const aEnabled = $('#PlayTypeTopNav').Children().filter(function (btn) {
            return btn.checked === true;
        });
        if (aEnabled.length > 0 && aEnabled[0]) {
            return aEnabled[0].GetAttributeString('data-type', '(not_found)');
        }
        return ('');
        // constelDropDownEntry = $( '#PlayTopNavDropdown' ).GetSelected();
        // constplayType = elDropDownEntry.GetAttributeString( 'data-type', '(not_found)' );
        // return playType;
    }
    ;
    function _InitializeWorkshopTags(panel, mapInfo) {
        const mapTags = mapInfo.tags ? mapInfo.tags.split(",") : [];
        // Find game modes in tags
        const rawModes = [];
        const modes = [];
        const tags = [];
        for (let i = 0; i < mapTags.length; ++i) {
            // Check if matches a game mode
            // (Use lowercase with spaces and hyphens removed)
            const modeTag = mapTags[i].toLowerCase().split(' ').join('').split('-').join('');
            if (modeTag in k_workshopModes) {
                const gameTypes = k_workshopModes[modeTag].split(',');
                for (let iType = 0; iType < gameTypes.length; ++iType) {
                    if (!rawModes.includes(gameTypes[iType]))
                        rawModes.push(gameTypes[iType]);
                }
                modes.push($.Localize('#CSGO_Workshop_Mode_' + modeTag));
            }
            else {
                tags.push($.HTMLEscape(mapTags[i]));
            }
        }
        // Generate tooltip
        let tooltip = mapInfo.desc ? $.HTMLEscape(mapInfo.desc) : '';
        if (modes.length > 0) {
            if (tooltip)
                tooltip += '<br><br>';
            tooltip += $.Localize("#CSGO_Workshop_Modes");
            tooltip += ' ';
            tooltip += modes.join(', ');
        }
        if (tags.length > 0) {
            if (tooltip)
                tooltip += '<br><br>';
            tooltip += $.Localize("#CSGO_Workshop_Tags");
            tooltip += ' ';
            tooltip += tags.join(', ');
        }
        panel.SetAttributeString('data-tooltip', tooltip); // also used for search filter
        panel.SetAttributeString('data-workshop-modes', rawModes.join(','));
    }
    function _ShowWorkshopMapInfoTooltip(panel) {
        const text = panel.GetAttributeString('data-tooltip', '');
        if (text)
            UiToolkitAPI.ShowTextTooltip(panel.id, text);
    }
    ;
    function _HideWorkshopMapInfoTooltip() {
        UiToolkitAPI.HideTextTooltip();
    }
    ;
    function _LazyCreateWorkshopTab() {
        const panelId = k_workshopPanelId;
        if (panelId in m_mapSelectionButtonContainers)
            return panelId;
        // create workshop tab
        const container = $.CreatePanel("Panel", $('#MapSelectionList'), panelId, {
            class: 'map-selection-list map-selection-list--inner hidden'
        });
        container.AddClass('map-selection-list--workshop');
        $.Msg("LazyCreateWorkshopTab added a container: (panel id = " + panelId + ")");
        m_mapSelectionButtonContainers[panelId] = container;
        const arrMaps = WorkshopAPI.GetAvailableWorkshopMaps();
        for (let idxMap = 0; idxMap < arrMaps.length; ++idxMap) {
            const mapInfo = arrMaps[idxMap];
            const p = $.CreatePanel('RadioButton', container, panelId + '_' + idxMap);
            p.BLoadLayoutSnippet('MapGroupSelection');
            p.SetAttributeString('group', 'radiogroup_' + panelId);
            if (!(mapInfo.imageUrl))
                mapInfo.imageUrl = 'file://{images}/map_icons/screenshots/360p/random.png';
            p.SetAttributeString('mapname', '@workshop/' + mapInfo.workshop_id + '/' + mapInfo.map);
            p.SetAttributeString('addon', mapInfo.workshop_id);
            p.SetPanelEvent('onactivate', _OnActivateMapOrMapGroupButton.bind(undefined, p));
            p.FindChildInLayoutFile('ActiveGroupIcon').visible = false;
            p.FindChildInLayoutFile('MapGroupName').text = mapInfo.name;
            const mapImage = $.CreatePanel('Panel', p.FindChildInLayoutFile('MapGroupImagesCarousel'), 'MapSelectionScreenshot0');
            mapImage.AddClass('map-selection-btn__screenshot');
            mapImage.style.backgroundImage = 'url("' + mapInfo.imageUrl + '")';
            mapImage.style.backgroundPosition = '50% 0%';
            mapImage.style.backgroundSize = 'auto 100%';
            _InitializeWorkshopTags(p, mapInfo);
            p.SetPanelEvent('onmouseover', _ShowWorkshopMapInfoTooltip.bind(null, p));
            p.SetPanelEvent('onmouseout', _HideWorkshopMapInfoTooltip.bind(null));
        }
        if (arrMaps.length == 0) {
            const p = $.CreatePanel('Panel', container, undefined);
            p.BLoadLayoutSnippet('NoWorkshopMaps');
        }
        // filter panels with the current filter
        _UpdateWorkshopMapFilter();
        return panelId;
    }
    ;
    function _SwitchToWorkshopTab(isEnabled) {
        const panelId = _LazyCreateWorkshopTab();
        m_activeMapGroupSelectionPanelID = panelId;
        _ShowActiveMapSelectionTab(isEnabled);
    }
    ;
    function _UpdateGameModeFlagsBtn() {
        const elPanel = $.GetContextPanel().FindChildTraverse('id-gamemode-flag-' + _RealGameMode());
        if (!elPanel || !GameModeFlags.DoesModeUseFlags(_RealGameMode()) || m_isWorkshop) {
            return;
        }
        else {
            let elFlag = (m_gameModeFlags[m_serverSetting + _RealGameMode()]) ? elPanel.FindChildInLayoutFile('id-gamemode-flag-' + _RealGameMode() + '-' + m_gameModeFlags[m_serverSetting + _RealGameMode()]) : null;
            if (elFlag && elFlag.IsValid()) {
                elFlag.checked = true;
            }
            else {
                elPanel.Children().forEach(element => {
                    element.checked = false;
                });
            }
        }
        elPanel.Children().forEach(element => {
            element.enabled = !inDirectChallenge() && !_IsSearching() && LobbyAPI.BIsHost();
        });
    }
    function _setAndSaveGameModeFlags(value) {
        $.Msg('_setAndSaveGameModeFlags ' + value);
        m_gameModeFlags[m_serverSetting + _RealGameMode()] = value;
        _UpdateGameModeFlagsBtn();
        if (!inDirectChallenge())
            GameInterfaceAPI.SetSettingString('ui_playsettings_flags_' + m_serverSetting + '_' + _RealGameMode(), m_gameModeFlags[m_serverSetting + _RealGameMode()].toString());
    }
    function _OnGameModeFlagOptionActivate(value) {
        _setAndSaveGameModeFlags(value);
        _ApplySessionSettings();
    }
    function _OnGameModeFlagsBtnClicked(resumeMatchmakingHandle) {
        function _Callback(value, resumeMatchmakingHandle = '') {
            _setAndSaveGameModeFlags(parseInt(value));
            _ApplySessionSettings();
            if (resumeMatchmakingHandle) {
                UiToolkitAPI.InvokeJSCallback(parseInt(resumeMatchmakingHandle));
                UiToolkitAPI.UnregisterJSCallback(parseInt(resumeMatchmakingHandle));
            }
        }
        const callback = UiToolkitAPI.RegisterJSCallback(_Callback);
        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_play_gamemodeflags.xml', '&callback=' + callback +
            '&searchfn=' + resumeMatchmakingHandle +
            '&textToken=' + '#play_settings_' + _RealGameMode() + '_dialog' +
            GameModeFlags.GetOptionsString(_RealGameMode()) +
            '&currentvalue=' + m_gameModeFlags[m_serverSetting + _RealGameMode()]);
    }
    //REMOVEME
    // function _PlayTopNavDropdownChanged()
    // {
    // 	const playType = _GetPlayType();
    // 	// always turn off private matchmaking when we move away from the comp-private tab
    // 	_TurnOffDirectChallenge();
    // 	if ( playType === 'listen' || playType === 'training' || playType === 'workshop' )
    // 	{
    // 		// Allow playing these with any license
    // 	}
    // 	else
    // 	{
    // 		const restrictions = LicenseUtil.GetCurrentLicenseRestrictions();
    // 		if ( restrictions !== false )
    // 		{
    // 			LicenseUtil.ShowLicenseRestrictions( restrictions );
    // 			// Set selection back to how it was and disallow playing this game type
    // 			_UpdatePlayDropDown();
    // 			return false;
    // 		}
    // 	}
    // 	if ( playType === 'official' || playType === 'listen' )
    // 	{
    // 		m_isWorkshop = false;
    // 		m_serverSetting = playType;
    // 		_ApplySessionSettings();
    // 		return;
    // 	}
    // 	else if ( playType === 'training' )
    // 	{
    // 		UiToolkitAPI.ShowGenericPopupTwoOptionsBgStyle( 'Training',
    // 			'#play_training_confirm',
    // 			'',
    // 			'#OK',
    // 			function()
    // 			{
    // 				LobbyAPI.LaunchTrainingMap();
    // 			},
    // 			'#Cancel_Button',
    // 			function()
    // 			{
    // 			},
    // 			'dim'
    // 		);
    // 	}
    // 	else if ( playType === 'workshop' )
    // 	{
    // 		_SetPlayDropdownToWorkshop();
    // 		return;
    // 	}
    // 	else if ( playType === 'community' )
    // 	{
    // 		if ( '0' === GameInterfaceAPI.GetSettingString( 'player_nevershow_communityservermessage' ) )
    // 		{
    // 			UiToolkitAPI.ShowCustomLayoutPopup( 'server_browser_popup', 'file://{resources}/layout/popups/popup_serverbrowser.xml' );
    // 		}
    // 		else
    // 		{
    // 			if ( m_bPerfectWorld )
    // 			{
    // 				SteamOverlayAPI.OpenURL( 'https://csgo.wanmei.com/communityserver' );
    // 			}
    // 			else
    // 			{
    // 				SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser( 'steam://open/servers' );
    // 			}
    // 		}
    // 	}
    // 	_UpdateGameModeFlagsBtn();
    // 	// don't change selected unless we redraw the maps.
    // 	_UpdatePlayDropDown();
    // };
    function _OnPressOfficialServers() {
        m_isWorkshop = false;
        m_serverSetting = 'official';
        _TurnOffDirectChallenge();
        _ApplySessionSettings();
    }
    function _OnPressListenServers() {
        m_isWorkshop = false;
        m_serverSetting = 'listen';
        _TurnOffDirectChallenge();
        _ApplySessionSettings();
    }
    function _OnPressWorkshop() {
        _TurnOffDirectChallenge();
        _SetPlayDropdownToWorkshop();
        _UpdateDirectChallengePage(_IsSearching(), LobbyAPI.BIsHost());
        _UpdateGameModeFlagsBtn();
        _SelectActivePlayPlayTypeBtn();
    }
    function _OnPressServerBrowser() {
        if ('0' === GameInterfaceAPI.GetSettingString('player_nevershow_communityservermessage')) {
            UiToolkitAPI.ShowCustomLayoutPopup('server_browser_popup', 'file://{resources}/layout/popups/popup_serverbrowser.xml');
        }
        else {
            if (m_bPerfectWorld) {
                SteamOverlayAPI.OpenURL('https://csgo.wanmei.com/communityserver');
            }
            else {
                SteamOverlayAPI.OpenUrlInOverlayOrExternalBrowser('steam://open/servers');
            }
        }
    }
    function _UpdateBotDifficultyButton() {
        const playType = _GetPlayType();
        const elDropDown = $('#BotDifficultyDropdown');
        const bShowBotDifficultyButton = (playType === 'listen' || playType === 'workshop');
        elDropDown.SetHasClass("hidden", !bShowBotDifficultyButton);
        // default bot difficulty
        const botDiff = GameInterfaceAPI.GetSettingString('player_botdifflast_s');
        GameTypesAPI.SetCustomBotDifficulty(parseInt(botDiff));
        elDropDown.SetSelected(botDiff);
    }
    ;
    function _BotDifficultyChanged() {
        const elDropDownEntry = $('#BotDifficultyDropdown').GetSelected();
        const botDiff = elDropDownEntry.id;
        GameTypesAPI.SetCustomBotDifficulty(parseInt(botDiff));
        // save the change to archive cvar
        GameInterfaceAPI.SetSettingString('player_botdifflast_s', botDiff);
    }
    ;
    function _DisplayWorkshopModePopup() {
        // Figure out valid modes
        const elSelectedMaps = _GetSelectedWorkshopMapButtons();
        let modes = [];
        for (let iMap = 0; iMap < elSelectedMaps.length; ++iMap) {
            const mapModes = elSelectedMaps[iMap].GetAttributeString('data-workshop-modes', '').split(',');
            // only include modes that are valid for all selected maps
            if (iMap == 0)
                modes = mapModes;
            else
                modes = modes.filter(function (mode) { return mapModes.includes(mode); });
        }
        const strModes = modes.join(',');
        UiToolkitAPI.ShowCustomLayoutPopupParameters('workshop_map_mode', 'file://{resources}/layout/popups/popup_workshop_mode_select.xml', 'workshop-modes=' + $.HTMLEscape(strModes));
    }
    ;
    function _UpdateWorkshopMapFilter() {
        const filter = $.HTMLEscape($('#WorkshopSearchTextEntry').text).toLowerCase();
        const container = m_mapSelectionButtonContainers[k_workshopPanelId];
        if (!container)
            return; // not initialized yet
        const children = container.Children();
        for (let i = 0; i < children.length; ++i) {
            const panel = children[i];
            // skip things that aren't map buttons (e.g. "no maps subscribed" label)
            const mapname = panel.GetAttributeString('mapname', '');
            if (mapname === '')
                continue;
            // if no filter, always visible
            if (filter === '') {
                panel.visible = true;
                continue;
            }
            // compare the raw ASCII map filename (e.g. "over" matches "de_overpass")
            if (mapname.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            // compare the raw ASCII playable modes (e.g. "flyingscoutsman")
            const modes = panel.GetAttributeString('data-workshop-modes', '');
            if (modes.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            // compare all the text in the tooltip, which includes localized mode names and unlocalized
            // description and tags directly from the map
            const tooltip = panel.GetAttributeString('data-tooltip', '');
            if (tooltip.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            // compare the map name, which (TODO) should be localized if it's an official map,
            // and otherwise the unlocalized name specified by the mapper
            const elMapNameLabel = panel.FindChildTraverse('MapGroupName');
            if (elMapNameLabel && elMapNameLabel.text && elMapNameLabel.text.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            panel.visible = false;
        }
    }
    ;
    function _SetPlayDropdownToWorkshop() {
        // only offline available for workshop maps
        m_serverSetting = 'listen';
        m_isWorkshop = true;
        _UpdatePrimeBtn(false, LobbyAPI.BIsHost());
        _UpdatePracticeSettingsBtns(false, LobbyAPI.BIsHost());
        if (_GetSelectedWorkshopMap()) {
            _ApplySessionSettings();
        }
        else {
            // User has no workshop maps, can't apply session settings but still show UI for workshop tab
            _SwitchToWorkshopTab(true);
        }
        $.GetContextPanel().SwitchClass("gamemode", 'workshop');
        $.GetContextPanel().SwitchClass("serversetting", 'workshop');
    }
    ;
    function _WorkshopSubscriptionsChanged() {
        const panel = m_mapSelectionButtonContainers[k_workshopPanelId];
        if (panel) {
            panel.DeleteAsync(0.0);
            // remove from map
            delete m_mapSelectionButtonContainers[k_workshopPanelId];
        }
        if (m_activeMapGroupSelectionPanelID != k_workshopPanelId) {
            // We'll lazy-recreate the panel the next time the user switches to it.
            return;
        }
        if (!LobbyAPI.IsSessionActive()) {
            // We can't sync session settings if we don't have a session when this event triggers, and this seems to happen when
            // entering a workshop map, during loading.
            // we are now in an inconsistent state? since m_activeMapGroupSelectionPanelID now points to a deleted panel
            // everything seems to work but we should keep an eye on this.
            m_activeMapGroupSelectionPanelID = null;
            return;
        }
        // for now just re-update from session settings.
        _SyncDialogsFromSessionSettings(LobbyAPI.GetSessionSettings());
        // If we are the host, re-apply our curernt settings.  This will select a new map if the user unsubscribed from the current selection.
        if (LobbyAPI.BIsHost()) {
            _ApplySessionSettings();
            // you were on the workshop tab, force yourself back there if something caused it to switch (e.g. you had no selected map)
            _SetPlayDropdownToWorkshop();
        }
    }
    function _InventoryUpdated() {
        _UpdatePrimeBtn(_IsSearching(), LobbyAPI.BIsHost());
        _UpdatePracticeSettingsBtns(_IsSearching(), LobbyAPI.BIsHost());
    }
    function _RealGameMode() {
        return m_gameModeSetting === 'premier' ? 'competitive' : m_gameModeSetting;
    }
    return {
        Init: _Init,
        ClansInfoUpdated: _ClansInfoUpdated,
        SessionSettingsUpdate: _SessionSettingsUpdate,
        ReadyForDisplay: _ReadyForDisplay,
        UnreadyForDisplay: _UnreadyForDisplay,
        OnHideMainMenu: _OnHideMainMenu,
        OnShowMainMenu: _OnShowMainMenu,
        // PlayTopNavDropdownChanged	: _PlayTopNavDropdownChanged,
        BotDifficultyChanged: _BotDifficultyChanged,
        WorkshopSubscriptionsChanged: _WorkshopSubscriptionsChanged,
        InventoryUpdated: _InventoryUpdated,
        SaveMapSelectionToCustomPreset: _SaveMapSelectionToCustomPreset,
        OnMapQuickSelect: _OnMapQuickSelect,
        OnDirectChallengeBtn: _OnDirectChallengeBtn,
        OnDirectChallengeRandom: _OnDirectChallengeRandom,
        OnDirectChallengeCopy: _OnDirectChallengeCopy,
        OnDirectChallengeEdit: _OnDirectChallengeEdit,
        OnClanChallengeKeySelected: _OnClanChallengeKeySelected,
        OnChooseClanKeyBtn: _OnChooseClanKeyBtn,
        OnPlayerNameChangedUpdate: _OnPlayerNameChangedUpdate,
        OnPrivateQueuesUpdate: _OnPrivateQueuesUpdate,
        OnGameModeFlagOptionActivate: _OnGameModeFlagOptionActivate,
        OnPressServerBrowser: _OnPressServerBrowser,
        OnPressOfficialServers: _OnPressOfficialServers,
        OnPressListenServers: _OnPressListenServers,
        OnPressWorkshop: _OnPressWorkshop,
    };
})();
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    PlayMenu.Init();
    $.RegisterEventHandler("ReadyForDisplay", $.GetContextPanel(), PlayMenu.ReadyForDisplay);
    $.RegisterEventHandler("UnreadyForDisplay", $.GetContextPanel(), PlayMenu.UnreadyForDisplay);
    $.RegisterForUnhandledEvent("PanoramaComponent_Lobby_MatchmakingSessionUpdate", PlayMenu.SessionSettingsUpdate);
    $.RegisterForUnhandledEvent("CSGOHideMainMenu", PlayMenu.OnHideMainMenu);
    $.RegisterForUnhandledEvent("CSGOHidePauseMenu", PlayMenu.OnHideMainMenu);
    $.RegisterForUnhandledEvent("CSGOShowMainMenu", PlayMenu.OnShowMainMenu);
    $.RegisterForUnhandledEvent("CSGOShowPauseMenu", PlayMenu.OnShowMainMenu);
    $.RegisterForUnhandledEvent("CSGOWorkshopSubscriptionsChanged", PlayMenu.WorkshopSubscriptionsChanged);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_ClansInfoUpdated', PlayMenu.ClansInfoUpdated);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', PlayMenu.InventoryUpdated);
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', PlayMenu.OnPlayerNameChangedUpdate);
    // direct challenge
    $.RegisterForUnhandledEvent('DirectChallenge_GenRandomKey', PlayMenu.OnDirectChallengeRandom);
    $.RegisterForUnhandledEvent('DirectChallenge_EditKey', PlayMenu.OnDirectChallengeEdit);
    $.RegisterForUnhandledEvent('DirectChallenge_CopyKey', PlayMenu.OnDirectChallengeCopy);
    $.RegisterForUnhandledEvent('DirectChallenge_ChooseClanKey', PlayMenu.OnChooseClanKeyBtn);
    $.RegisterForUnhandledEvent('DirectChallenge_ClanChallengeKeySelected', PlayMenu.OnClanChallengeKeySelected);
    $.RegisterForUnhandledEvent('PanoramaComponent_PartyBrowser_PrivateQueuesUpdate', PlayMenu.OnPrivateQueuesUpdate);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfcGxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3BsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUFtQztBQUNuQyw0Q0FBNEM7QUFDNUMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyw4Q0FBOEM7QUFDOUMsNkNBQTZDO0FBQzdDLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLDJDQUEyQztBQUMzQyxrREFBa0Q7QUFFbEQsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGlCQUFpQixHQUFHLGtDQUFrQyxDQUFDO0lBRTdELG1FQUFtRTtJQUNuRSxNQUFNLDhCQUE4QixHQUE2QixFQUFFLENBQUM7SUFDcEUsd0NBQXdDO0lBQ3hDLElBQUksaUJBQWlCLEdBQWlDLEVBQUUsQ0FBQztJQUN6RCxvREFBb0Q7SUFDcEQsSUFBSSxtQkFBbUIsR0FBZSxFQUFFLENBQUM7SUFDekMsZ0RBQWdEO0lBQ2hELElBQUksWUFBd0MsQ0FBQztJQUM3QyxJQUFJLFdBQTZDLENBQUM7SUFFbEQsTUFBTSxlQUFlLEdBQUcsQ0FBRSxZQUFZLENBQUMsZUFBZSxFQUFFLEtBQUssY0FBYyxDQUFFLENBQUM7SUFDOUUsSUFBSSxnQ0FBZ0MsR0FBbUIsSUFBSSxDQUFDO0lBQzVELElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQztJQUV2Qiw4Q0FBOEM7SUFDOUMsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFDO0lBQzNCLElBQUksb0JBQW9CLEdBQUcsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsQ0FBRSxLQUFLLEdBQUcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxJQUFJLHdCQUF3QixHQUFrQixJQUFJLENBQUM7SUFDbkQsSUFBSSw0QkFBNEIsR0FBYSxF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