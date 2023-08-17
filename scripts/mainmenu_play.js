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
    const m_mapSelectionButtonContainers = {};
    let m_gameModeConfigs = {};
    let m_arrGameModeRadios = [];
    let GetMGDetails;
    let GetGameType;
    const m_bPerfectWorld = (MyPersonaAPI.GetLauncherType() === 'perfectworld');
    let m_activeMapGroupSelectionPanelID = null;
    let m_permissions = '';
    let m_serverSetting = '';
    let m_gameModeSetting = '';
    let m_serverPrimeSetting = (GameInterfaceAPI.GetSettingString('ui_playsettings_prime') === '1') ? 1 : 0;
    let m_singleSkirmishMapGroup = null;
    let m_arrSingleSkirmishMapGroups = [];
    const m_gameModeFlags = {};
    let m_isWorkshop = false;
    let m_jsTimerUpdateHandle = false;
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
        armsrace: 'armsrace',
        demolition: 'demolition',
        flyingscoutsman: 'flyingscoutsman',
        retakes: 'retakes'
    };
    const m_PlayMenuActionBarParticleFX = $('#PlayMenuActionBar_Searching_particles');
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
        if (inDirectChallenge()) {
            _DirectChallengeStartSearch();
            return;
        }
        if (m_isWorkshop) {
            _DisplayWorkshopModePopup();
        }
        else {
            if (m_gameModeSetting !== 'premier') {
                if (!_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID))) {
                    _NoMapSelectedPopup();
                    btnStartSearch.RemoveClass('pressed');
                    return;
                }
            }
            if (GameModeFlags.DoesModeUseFlags(_RealGameMode()) && !m_gameModeFlags[m_serverSetting + _RealGameMode()]) {
                btnStartSearch.RemoveClass('pressed');
                const resumeSearchFnHandle = UiToolkitAPI.RegisterJSCallback(StartSearch);
                _OnGameModeFlagsBtnClicked(resumeSearchFnHandle);
                return;
            }
            let settings = (LobbyAPI.IsSessionActive() && !_GetTournamentOpponent()) ? LobbyAPI.GetSessionSettings() : null;
            let stage = _GetTournamentStage();
            LobbyAPI.StartMatchmaking(MyPersonaAPI.GetMyOfficialTournamentName(), MyPersonaAPI.GetMyOfficialTeamName(), _GetTournamentOpponent(), stage);
        }
    }
    function _Init() {
        const cfg = GameTypesAPI.GetConfig();
        for (const type in cfg.gameTypes) {
            for (const mode in cfg.gameTypes[type].gameModes) {
                let obj = cfg.gameTypes[type].gameModes[mode];
                m_gameModeConfigs[mode] = obj;
            }
        }
        GetGameType = function (mode) {
            for (const gameType in cfg.gameTypes) {
                if (cfg.gameTypes[gameType].gameModes.hasOwnProperty(mode))
                    return gameType;
            }
        };
        GetMGDetails = function (mg) {
            return cfg.mapgroups[mg];
        };
        const elGameModeSelectionRadios = $('#GameModeSelectionRadios');
        if (elGameModeSelectionRadios !== null) {
            m_arrGameModeRadios = elGameModeSelectionRadios.Children();
        }
        m_arrGameModeRadios = m_arrGameModeRadios.filter(elPanel => !elPanel.BHasClass('mainmenu-top-navbar__play_seperator'));
        m_arrGameModeRadios.forEach(function (entry) {
            entry.SetPanelEvent('onactivate', function () {
                m_isWorkshop = false;
                _LoadGameModeFlagsFromSettings();
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
                    ApplyPrimeSetting();
                });
            }
        }
        const elBtnContainer = $('#PermissionsSettings');
        const elPermissionsButton = elBtnContainer.FindChild("id-slider-btn");
        elPermissionsButton.SetPanelEvent('onactivate', function () {
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
        const elPracticeSettingsContainer = $('#id-play-menu-practicesettings-container');
        elPracticeSettingsContainer.Children().forEach(function (elChild) {
            if (!elChild.id.startsWith('id-play-menu-practicesettings-'))
                return;
            let strFeatureName = elChild.id;
            strFeatureName = strFeatureName.replace('id-play-menu-practicesettings-', '');
            strFeatureName = strFeatureName.replace('-tooltip', '');
            const elFeatureFrame = elChild.FindChild('id-play-menu-practicesettings-' + strFeatureName);
            const elFeatureSliderBtn = elFeatureFrame.FindChild('id-slider-btn');
            elFeatureSliderBtn.text = $.Localize('#practicesettings_' + strFeatureName + '_button');
            elFeatureSliderBtn.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.HideTextTooltip();
                const sessionSettings = LobbyAPI.GetSessionSettings();
                const curvalue = (sessionSettings && sessionSettings.options && sessionSettings.options.hasOwnProperty('practicesettings_' + strFeatureName))
                    ? sessionSettings.options['practicesettings_' + strFeatureName] : 0;
                const newvalue = curvalue ? 0 : 1;
                const setting = 'practicesettings_' + strFeatureName;
                const newSettings = { update: { options: {} } };
                newSettings.update.options[setting] = newvalue;
                LobbyAPI.UpdateSessionSettings(newSettings);
            });
        });
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
        _SyncDialogsFromSessionSettings(LobbyAPI.GetSessionSettings());
        _ApplySessionSettings();
        _ShowNewMatchmakingModePopup();
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
            return;
        }
        else {
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
            type = oReturn.value[2];
            id = oReturn.value[3];
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
            $.Schedule(0.01, function () {
                const elHeader = $.GetContextPanel().FindChildTraverse("JsDirectChallengeKey");
                if (elHeader && elHeader.IsValid())
                    elHeader.TriggerClass('directchallenge-status__header__queuecode');
            });
        }
        $.GetContextPanel().SetHasClass('directchallenge', key != '');
        m_challengeKey = key;
    }
    const _ClansInfoUpdated = function () {
        if (m_challengeKey && $.GetContextPanel().GetAttributeString('code-type', '') === 'g') {
            _SetDirectChallengeKey(m_challengeKey);
        }
    };
    const _AddOpenPlayerCardAction = function (elAvatar, xuid) {
        const openCard = function (xuid) {
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
            const type = oReturn.value[2];
            const id = oReturn.value[3];
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
        _OnPrivateQueuesUpdate();
        LobbyAPI.StartMatchmaking('', oReturn.value[0], oReturn.value[1], '1');
    }
    function _NoMapSelectedPopup() {
        UiToolkitAPI.ShowGenericPopupOk($.Localize('#no_maps_selected_title'), $.Localize('#no_maps_selected_text'), '', function () { });
    }
    function _ShowNewMatchmakingModePopup() {
        return;
        const setVersionTo = '3';
        const currentVersion = GameInterfaceAPI.GetSettingString('ui_popup_weaponupdate_version');
        if (currentVersion !== setVersionTo) {
            GameInterfaceAPI.SetSettingString('ui_popup_weaponupdate_version', setVersionTo);
            UiToolkitAPI.ShowCustomLayoutPopup('prime_status', 'file://{resources}/layout/popups/popup_premier_matchmaking.xml');
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
            _SetGameModeRadioButtonVisible(gameMode, bAvailable);
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
        if (_IsValveOfficialServer(serverType) &&
            LobbyAPI.BIsHost() && !(MyPersonaAPI.HasPrestige() || (MyPersonaAPI.GetCurrentLevel() >= 2))) {
            isAvailable = (gameMode == 'deathmatch' || gameMode == 'casual' || gameMode == 'survival' || gameMode == 'skirmish');
        }
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
                if (strSelectedData === strData) {
                    elDropdown.SetSelected(entryID);
                }
            }
            const strCurrentOpponent = _GetTournamentOpponent();
            const strCurrentStage = _GetTournamentStage();
            elTeamDropdown.RemoveAllOptions();
            AddDropdownOption(elTeamDropdown, 'PickOpponent', $.Localize('#SFUI_Tournament_Pick_Opponent'), '', strCurrentOpponent);
            const teamCount = CompetitiveMatchAPI.GetTournamentTeamCount(strTournament);
            for (let i = 0; i < teamCount; i++) {
                const strTeam = CompetitiveMatchAPI.GetTournamentTeamNameByIndex(strTournament, i);
                if (strTeamName === strTeam)
                    continue;
                AddDropdownOption(elTeamDropdown, 'team_' + i, strTeam, strTeam, strCurrentOpponent);
            }
            elTeamDropdown.SetPanelEvent('oninputsubmit', _UpdateStartSearchBtn.bind(undefined, isSearchingForTournament));
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
        m_isWorkshop = settings.game.mapgroupname
            && settings.game.mapgroupname.includes('@workshop');
        $.GetContextPanel().SwitchClass("gamemode", _RealGameMode());
        $.GetContextPanel().SwitchClass("serversetting", m_serverSetting);
        $.GetContextPanel().SetHasClass("directchallenge", inDirectChallenge());
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
            for (let i = 0; i < m_arrGameModeRadios.length; ++i) {
                const strGameModeForButton = m_arrGameModeRadios[i].id;
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
                const isAvailable = _IsGameModeAvailable(m_serverSetting, strGameModeForButton);
                m_arrGameModeRadios[i].enabled = isAvailable && isEnabled;
                m_arrGameModeRadios[i].SetHasClass('locked', !isAvailable || !isEnabled);
            }
            _UpdateMapGroupButtons(isEnabled, isSearching, isHost);
            _CancelRotatingMapGroupSchedule();
            if (settings.game.mode === "survival") {
                _GetRotatingMapGroupStatus(_RealGameMode(), m_singleSkirmishMapGroup, settings.game.mapgroupname);
            }
            _SelectMapButtonsFromSettings(settings);
        }
        else {
            m_arrGameModeRadios[0].checked = true;
        }
        _ShowHideStartSearchBtn(isSearching, isHost);
        _ShowCancelSearchButton(isSearching, isHost);
        _UpdateTournamentButton(isHost, isSearching, settings.game.mapgroupname);
        _UpdatePrimeBtn(isSearching, isHost);
        _UpdatePermissionBtnText(settings, isEnabled);
        _UpdatePracticeSettingsBtns(isSearching, isHost);
        _UpdateLeaderboardBtn(m_gameModeSetting);
        _UpdateSurvivalAutoFillSquadBtn(m_gameModeSetting);
        _SelectActivePlayPlayTypeBtn();
        _UpdateDirectChallengePage(isSearching, isHost);
        _UpdateGameModeFlagsBtn();
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
        elTile.BLoadLayout('file://{resources}/layout/simple_player_tile.xml', false, false);
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
        let strName = null;
        const strCodeXuid = $.GetContextPanel().GetAttributeString('code-xuid', '');
        if (strCodeXuid === xuid) {
            if (!strName)
                strName = FriendsListAPI.GetFriendName(xuid);
            $.GetContextPanel().SetDialogVariable('code-source', strName);
        }
        const elMembersContainer = $('#DirectChallengeQueueMembers');
        if (!elMembersContainer)
            return;
        const elUserTile = elMembersContainer.FindChildTraverse(xuid);
        if (!elUserTile)
            return;
        if (!strName)
            strName = FriendsListAPI.GetFriendName(xuid);
        elUserTile.SetDialogVariable('player_name', strName);
    }
    function _GetPartyID(partyXuid, arrMembers = []) {
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
        const elMembersContainer = $.GetContextPanel().FindChildTraverse('DirectChallengeQueueMembers');
        if (!elMembersContainer)
            return;
        const elExplanation = $("#id-directchallenge-explanation");
        if (elExplanation)
            elExplanation.SetHasClass('hidden', _IsSearching());
        const elQueueMembers = $("#id-directchallenge-status__queue-members");
        if (elQueueMembers)
            elQueueMembers.SetHasClass('hidden', !_IsSearching());
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
        elMembersContainer.Children().forEach(function (child) {
            child.SetAttributeInt("marked_for_delete", 1);
        });
        let delay = 0;
        for (let i = NumberOfParties; i-- > 0;) {
            const DELAY_INCREMENT = 0.25;
            const arrMembers = [];
            const partyXuid = PartyBrowserAPI.GetPrivateQueuePartyXuidByIndex(i);
            const partyId = _GetPartyID(partyXuid, arrMembers);
            let elParty = elMembersContainer.FindChild(partyId);
            if (!elParty) {
                elParty = $.CreatePanel('Panel', elMembersContainer, partyId, { class: 'directchallenge__party hidden' });
                elParty.SetHasClass('multi', arrMembers.length > 1);
                elMembersContainer.MoveChildBefore(elParty, elMembersContainer.Children()[0]);
                elParty.SetAttributeString("xuid", partyXuid);
                Scheduler.Schedule(delay, function (elParty) {
                    if (elParty && elParty.IsValid())
                        elParty.RemoveClass('hidden');
                }.bind(undefined, elParty), "directchallenge");
                arrMembers.forEach(function (xuid) {
                    if (elParty) {
                        const elTile = $.CreatePanel('Panel', elParty, xuid, { class: "directchallenge__party__member" });
                        _CreatePlayerTile(elTile, xuid, delay);
                    }
                    delay += DELAY_INCREMENT;
                });
            }
            else {
            }
            elParty.SetAttributeInt("marked_for_delete", 0);
        }
        elMembersContainer.Children().forEach(function (child) {
            if (child.GetAttributeInt("marked_for_delete", 0) !== 0) {
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
        const gameModeCfg = m_gameModeConfigs[gameMode];
        if (gameModeCfg === undefined)
            return [];
        const mapgroup = isPlayingOnValveOfficial ? gameModeCfg.mapgroupsMP : gameModeCfg.mapgroupsSP;
        if (mapgroup !== undefined && mapgroup !== null) {
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
        if ($.GetContextPanel().BHasClass('play-menu__lobbymapveto_activated') && mapGroupNameClicked !== 'mg_lobby_mapveto') {
            return;
        }
        $.DispatchEvent('CSGOPlaySoundEffect', 'submenu_leveloptions_select', 'MOUSE');
        let mapGroupName = mapGroupNameClicked;
        if (mapGroupName) {
            const siblingSuffix = '_scrimmagemap';
            if (mapGroupName.toLowerCase().endsWith(siblingSuffix))
                mapGroupName = mapGroupName.substring(0, mapGroupName.length - siblingSuffix.length);
            else
                mapGroupName = mapGroupName + siblingSuffix;
            let elParent = mapgroupButton.GetParent();
            if (elParent)
                elParent = elParent.GetParent();
            if (elParent && elParent.GetAttributeString('hassections', '')) {
                elParent.Children().forEach(function (section) {
                    section.Children().forEach(function (tile) {
                        const mapGroupNameSibling = tile.GetAttributeString("mapname", '');
                        if (mapGroupNameSibling.toLowerCase() === mapGroupName.toLowerCase()) {
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
                m_mapSelectionButtonContainers[key].RemoveClass("hidden");
                m_mapSelectionButtonContainers[key].visible = true;
                m_mapSelectionButtonContainers[key].enabled = isEnabled;
            }
        }
        const isWorkshop = panelID === k_workshopPanelId;
        $('#WorkshopSearchBar').visible = isWorkshop;
        $('#GameModeSelectionRadios').Children().forEach(element => {
            element.enabled = element.enabled && !isWorkshop && !_IsSearching() && LobbyAPI.BIsHost();
        });
        $('#WorkshopVisitButton').visible = isWorkshop && !m_bPerfectWorld;
        $('#WorkshopVisitButton').enabled = SteamOverlayAPI.IsEnabled();
    }
    ;
    function _GetMapTileContainer() {
        return $.GetContextPanel().FindChildInLayoutFile(_GetMapGroupPanelID());
    }
    function _OnMapQuickSelect(mgName) {
        const arrMapsToSelect = _GetMapsFromQuickSelectMapGroup(mgName);
        let bScrolled = false;
        const prevSelection = _GetSelectedMapsForServerTypeAndGameMode(m_serverSetting, _RealGameMode(), true);
        const elMapGroupContainer = _GetMapTileContainer();
        elMapGroupContainer.Children().forEach(function (elMapBtn) {
            let bFound = false;
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
            if (bFound && !bScrolled) {
                elMapBtn.ScrollParentToMakePanelFit(2, false);
                bScrolled = true;
            }
        });
        const newSelection = _GetSelectedMapsForServerTypeAndGameMode(m_serverSetting, _RealGameMode(), true);
        if (prevSelection != newSelection) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'submenu_leveloptions_select', 'MOUSE');
            _MatchMapSelectionWithQuickSelect();
            if (_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID))) {
                _ApplySessionSettings();
            }
        }
    }
    function _ValidateMaps(arrMapList) {
        let arrMapTileNames = [];
        const arrMapButtons = _GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID);
        arrMapButtons.forEach(elMapTile => arrMapTileNames.push(elMapTile.GetAttributeString("mapname", "")));
        const filteredMapList = arrMapList.filter(strMap => arrMapTileNames.includes(strMap));
        return filteredMapList;
    }
    function _GetMapGroupsWithAttribute(strAttribute, strValue) {
        const arrNewMapgroups = [];
        const elMapGroupContainer = _GetMapTileContainer();
        elMapGroupContainer.Children().forEach(function (elMapBtn) {
            const mgName = elMapBtn.GetAttributeString("mapname", "");
            if (GameTypesAPI.GetMapGroupAttribute(mgName, strAttribute) === strValue) {
                arrNewMapgroups.push(mgName);
            }
        });
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
            return [];
        }
    }
    function _MatchMapSelectionWithQuickSelect() {
        const elQuickSelectContainer = $.GetContextPanel().FindChildInLayoutFile("JsQuickSelectParent");
        if (!elQuickSelectContainer || m_isWorkshop)
            return;
        elQuickSelectContainer.FindChildrenWithClassTraverse('preset-button').forEach(function (elQuickBtn, index, aMapGroups) {
            const arrQuickSelectMaps = _GetMapsFromQuickSelectMapGroup(elQuickBtn.id);
            let bMatch = true;
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
            const elFriendLeaderboards = elExistingContainer ? elExistingContainer.FindChildTraverse("FriendLeaderboards") : null;
            if (elFriendLeaderboards) {
                const strEmbeddedLeaderboardName = elFriendLeaderboards.GetAttributeString("type", '');
                if (strEmbeddedLeaderboardName) {
                    LeaderboardsAPI.Refresh(strEmbeddedLeaderboardName);
                }
            }
            if (bAllowReuseExistingContainer)
                return panelID;
            else
                elExistingContainer.DeleteAsync(0.0);
        }
        const container = $.CreatePanel("Panel", $('#MapSelectionList'), panelID, {
            class: 'map-selection-list map-selection-list--inner hidden'
        });
        container.AddClass('map-selection-list--' + serverType + '-' + gameMode);
        m_mapSelectionButtonContainers[panelID] = container;
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
        if (container.BHasLayoutSnippet(strSnippetNameOverride)) {
            container.BLoadLayoutSnippet(strSnippetNameOverride);
            const elMapTile = container.FindChildTraverse("MapTile");
            if (elMapTile)
                elMapTile.BLoadLayoutSnippet("MapGroupSelection");
            _LoadLeaderboardsLayoutForContainer(container);
        }
        else {
            strSnippetNameOverride = '';
        }
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
        const fnOnPropertyTransitionEndEvent = function (panelName, propertyName) {
            if (container.id === panelName && propertyName === 'opacity' &&
                !container.id.startsWith("FriendLeaderboards")) {
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
        if (inDirectChallenge())
            return;
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
        const iconSize = 200;
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
                const mapGroupPanelID = _GetMapGroupPanelID() + strCurrentMapGroup;
                const mapGroupContainer = m_mapSelectionButtonContainers[m_activeMapGroupSelectionPanelID].FindChildTraverse('MapTile');
                const mapGroupPanel = mapGroupContainer.FindChildInLayoutFile(mapGroupPanelID);
                if (!mapGroupPanel) {
                    mapGroupContainer.RemoveAndDeleteChildren();
                    const btnMapGroup = _UpdateOrCreateMapGroupTile(strCurrentMapGroup, mapGroupContainer, null, mapGroupPanelID, 1);
                    btnMapGroup.checked = true;
                    _UpdateSurvivalAutoFillSquadBtn(m_gameModeSetting);
                }
                m_timerMapGroupHandler = $.Schedule(1, _GetRotatingMapGroupStatus.bind(undefined, gameMode, singleSkirmishMapGroup, mapgroupname));
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
            m_timerMapGroupHandler = null;
        }
    }
    ;
    function _SetMapGroupModifierLabelElements(mapName, elMapPanel) {
        const isUnrankedCompetitive = (_RealGameMode() === 'competitive') && _IsValveOfficialServer(m_serverSetting) && (GameTypesAPI.GetMapGroupAttribute(mapName, 'competitivemod') === 'unranked');
        const isNew = !isUnrankedCompetitive && (GameTypesAPI.GetMapGroupAttribute(mapName, 'showtagui') === 'new');
        elMapPanel.FindChildInLayoutFile('MapGroupNewTag').SetHasClass('hidden', !isNew || mapName === "mg_lobby_mapveto");
        elMapPanel.FindChildInLayoutFile('MapGroupNewTagYellowLarge').SetHasClass('hidden', true);
        elMapPanel.FindChildInLayoutFile('MapSelectionTopRowIcons').SetHasClass('tall', mapName === "mg_lobby_mapveto");
        elMapPanel.FindChildInLayoutFile('MapGroupUnrankedTag').SetHasClass('hidden', !isUnrankedCompetitive);
    }
    ;
    function _ReloadLeaderboardLayoutGivenSettings(container, lbName, strTitleOverride, strPointsTitle) {
        const elFriendLeaderboards = container.FindChildTraverse("FriendLeaderboards");
        elFriendLeaderboards.SetAttributeString("type", lbName);
        if (strPointsTitle)
            elFriendLeaderboards.SetAttributeString("points-title", strPointsTitle);
        if (strTitleOverride)
            elFriendLeaderboards.SetAttributeString("titleoverride", strTitleOverride);
        elFriendLeaderboards.BLoadLayout('file://{resources}/layout/popups/popup_leaderboards.xml', true, false);
        elFriendLeaderboards.AddClass('leaderboard_embedded');
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
                    _ReloadLeaderboardLayoutGivenSettings(container, lbName, strTitle, '');
                }
                const elDescriptionLabel = container.FindChildTraverse("MissionDesc");
                elDescriptionLabel.text = MissionsAPI.GetQuestDefinitionField(questID, "loc_description");
                MissionsAPI.ApplyQuestDialogVarsToPanelJS(questID, container);
            }
        }
        else if (m_gameModeSetting === "survival") {
        }
    }
    function _UpdateMapGroupButtons(isEnabled, isSearching, isHost) {
        const panelID = _LazyCreateMapListPanel();
        if ((_RealGameMode() === 'competitive' || _RealGameMode() === 'scrimcomp2v2') && _IsPlayingOnValveOfficial()) {
            _UpdateWaitTime(_GetMapListForServerTypeAndGameMode(panelID));
        }
        if (!inDirectChallenge())
            _SetEnabledStateForMapBtns(m_mapSelectionButtonContainers[panelID], isSearching, isHost);
        m_activeMapGroupSelectionPanelID = panelID;
        _ShowActiveMapSelectionTab(isEnabled);
        _PopulateQuickSelectBar(isSearching, isHost);
    }
    ;
    function _SelectMapButtonsFromSettings(settings) {
        const mapsGroups = settings.game.mapgroupname.split(',');
        const aListMaps = _GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID);
        aListMaps.forEach(function (e) {
            const mapName = e.GetAttributeString("mapname", "invalid");
            e.checked = mapsGroups.includes(mapName);
        });
    }
    ;
    function _ShowHideStartSearchBtn(isSearching, isHost) {
        let bShow = !isSearching && isHost ? true : false;
        const btnStartSearch = $.GetContextPanel().FindChildInLayoutFile('StartMatchBtn');
        if (bShow) {
            if (btnStartSearch.BHasClass('pressed')) {
                btnStartSearch.RemoveClass('pressed');
            }
            btnStartSearch.RemoveClass('hidden');
        }
        else if (!btnStartSearch.BHasClass('pressed')) {
            btnStartSearch.AddClass('hidden');
        }
        let numStyleToShow = 0;
        if (!isSearching && (_RealGameMode() === 'competitive') &&
            _IsPlayingOnValveOfficial() && (PartyListAPI.GetCount() >= PartyListAPI.GetPartySessionUiThreshold())) {
            numStyleToShow = PartyListAPI.GetCount();
            if ((numStyleToShow > 5) || (0 == PartyListAPI.GetPartySessionUiThreshold())) {
                numStyleToShow = 5;
            }
        }
        numStyleToShow = 0;
        for (let j = 1; j <= 5; ++j) {
        }
    }
    ;
    function _ShowCancelSearchButton(isSearching, isHost) {
        const btnCancel = $.GetContextPanel().FindChildInLayoutFile('PartyCancelBtn');
        btnCancel.enabled = (isSearching && isHost);
        if (!btnCancel.enabled)
            ParticleControls.UpdateActionBar(m_PlayMenuActionBarParticleFX, "RmoveBtnEffects");
    }
    ;
    function _UpdatePracticeSettingsBtns(isSearching, isHost) {
        let elPracticeSettingsContainer = $('#id-play-menu-practicesettings-container');
        let sessionSettings = LobbyAPI.GetSessionSettings();
        let bForceHidden = (m_serverSetting !== 'listen') || m_isWorkshop || !LobbyAPI.IsSessionActive() || !sessionSettings;
        elPracticeSettingsContainer.Children().forEach(function (elChild) {
            if (!elChild.id.startsWith('id-play-menu-practicesettings-'))
                return;
            let strFeatureName = elChild.id;
            strFeatureName = strFeatureName.replace('id-play-menu-practicesettings-', '');
            strFeatureName = strFeatureName.replace('-tooltip', '');
            let elFeatureFrame = elChild.FindChild('id-play-menu-practicesettings-' + strFeatureName);
            let elFeatureSliderBtn = elFeatureFrame.FindChild('id-slider-btn');
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
        if (!_IsPlayingOnValveOfficial() || !MyPersonaAPI.IsInventoryValid() || inDirectChallenge()) {
            elPrimePanel.visible = false;
            elToogleRankedBtn.visible = false;
            elRankedLimitedTestWarning.visible = false;
            return;
        }
        const LocalPlayerHasPrime = PartyListAPI.GetFriendPrimeEligible(MyPersonaAPI.GetXuid());
        elPrimePanel.visible = true;
        elPrimePanel.SetHasClass('play-menu-prime-logo-bg', LocalPlayerHasPrime);
        elGetPrimeBtn.visible = !LocalPlayerHasPrime;
        elPrimeStatus.visible = LocalPlayerHasPrime;
        elToogleRankedBtn.visible = LocalPlayerHasPrime;
        if (!LocalPlayerHasPrime) {
            const sPrice = StoreAPI.GetStoreItemSalePrice(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1353, 0), 1, '');
            elGetPrimeBtn.SetDialogVariable("price", sPrice ? sPrice : '$0');
            elGetPrimeBtn.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.HideTextTooltip();
                UiToolkitAPI.ShowCustomLayoutPopup('prime_status', 'file://{resources}/layout/popups/popup_prime_status.xml');
            });
            return;
        }
        elToogleRankedBtn.FindChild('id-slider-btn').checked = isPrime ? true : false;
        const bGameModeHaveRankedMatches = SessionUtil.DoesGameModeHavePrimeQueue(_RealGameMode());
        elToogleRankedBtn.visible = bGameModeHaveRankedMatches && MyPersonaAPI.GetBetaType().includes('fullversion');
        elRankedLimitedTestWarning.visible = bGameModeHaveRankedMatches && MyPersonaAPI.GetBetaType().includes('limitedbeta');
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
    function _GetSelectedMapsForServerTypeAndGameMode(serverType, gameMode, bDontToggleMaps = false) {
        const isPlayingOnValveOfficial = _IsValveOfficialServer(serverType);
        const aListMapPanels = _GetMapListForServerTypeAndGameMode();
        if (!_CheckContainerHasAnyChildChecked(aListMapPanels)) {
            let preferencesMapsForThisMode = GameInterfaceAPI.GetSettingString('ui_playsettings_maps_' + serverType + '_' + gameMode);
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
            return e.checked;
        }).reduce(function (accumulator, e) {
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
            return [];
        }
        if (!_CheckContainerHasAnyChildChecked(children)) {
            let preferencesMapsForThisMode = GameInterfaceAPI.GetSettingString('ui_playsettings_maps_workshop');
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
            return e.checked;
        });
        return Array.from(selectedMaps);
    }
    ;
    function _GetSelectedWorkshopMap() {
        const mapButtons = _GetSelectedWorkshopMapButtons();
        const selectedMaps = mapButtons.reduce(function (accumulator, e) {
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
    function _ValidateSessionSettings() {
        if (m_isWorkshop) {
            m_serverSetting = "listen";
        }
        if (m_gameModeSetting === 'premier' && !_IsGameModeAvailable(m_serverSetting, 'premier')) {
            _DivertFromDisabledPremier();
        }
        if (!_IsGameModeAvailable(m_serverSetting, m_gameModeSetting)) {
            m_gameModeSetting = GameInterfaceAPI.GetSettingString("ui_playsettings_mode_" + m_serverSetting);
            m_singleSkirmishMapGroup = null;
            if (_IsSingleSkirmishString(_RealGameMode())) {
                m_singleSkirmishMapGroup = _GetSingleSkirmishMapGroupFromSingleSkirmishString(_RealGameMode());
                m_gameModeSetting = 'skirmish';
            }
            if (!_IsGameModeAvailable(m_serverSetting, m_gameModeSetting)) {
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
        if (!m_gameModeFlags[m_serverSetting + _RealGameMode()])
            _LoadGameModeFlagsFromSettings();
        if (GameModeFlags.DoesModeUseFlags(_RealGameMode())) {
            if (!GameModeFlags.AreFlagsValid(_RealGameMode(), m_gameModeFlags[m_serverSetting + _RealGameMode()])) {
                _setAndSaveGameModeFlags(0);
            }
        }
    }
    ;
    function _LoadGameModeFlagsFromSettings() {
        m_gameModeFlags[m_serverSetting + _RealGameMode()] = parseInt(GameInterfaceAPI.GetSettingString('ui_playsettings_flags_' + m_serverSetting + '_' + _RealGameMode()));
    }
    function _ApplySessionSettings() {
        if (m_gameModeSetting === 'scrimcomp2v2') {
            MyPersonaAPI.HintLoadPipRanks('wingman');
        }
        else if (m_gameModeSetting === 'survival') {
            MyPersonaAPI.HintLoadPipRanks('dangerzone');
        }
        if (!LobbyAPI.BIsHost()) {
            return;
        }
        _ValidateSessionSettings();
        const serverType = m_serverSetting;
        let gameMode = _RealGameMode();
        let gameModeFlags = m_gameModeFlags[m_serverSetting + gameMode] ? m_gameModeFlags[m_serverSetting + gameMode] : 0;
        let primePreference = m_serverPrimeSetting;
        let selectedMaps;
        if (m_isWorkshop)
            selectedMaps = _GetSelectedWorkshopMap();
        else if (inDirectChallenge()) {
            selectedMaps = 'mg_lobby_mapveto';
            gameModeFlags = 16;
            primePreference = 0;
        }
        else if (m_gameModeSetting === 'premier') {
            selectedMaps = 'mg_lobby_mapveto';
            primePreference = 1;
            m_challengeKey = '';
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
        if (!inDirectChallenge()) {
            settings.delete = {
                Options: {
                    challengekey: 1
                }
            };
        }
        if (selectedMaps.startsWith("random_")) {
            const arrMapGroups = _GetAvailableMapGroups(gameMode, false);
            const idx = 1 + Math.floor((Math.random() * (arrMapGroups.length - 1)));
            settings.update.Game.map = arrMapGroups[idx].substring(3);
        }
        if (m_isWorkshop) {
            GameInterfaceAPI.SetSettingString('ui_playsettings_maps_workshop', selectedMaps);
        }
        else {
            let singleSkirmishSuffix = '';
            if (m_singleSkirmishMapGroup) {
                singleSkirmishSuffix = '_' + _GetSingleSkirmishIdFromMapGroup(m_singleSkirmishMapGroup);
            }
            GameInterfaceAPI.SetSettingString('ui_playsettings_mode_' + serverType, m_gameModeSetting + singleSkirmishSuffix);
            if (!inDirectChallenge() && m_gameModeSetting !== 'premier') {
                GameInterfaceAPI.SetSettingString('ui_playsettings_maps_' + serverType + '_' + m_gameModeSetting + singleSkirmishSuffix, selectedMaps);
            }
        }
        LobbyAPI.UpdateSessionSettings(settings);
    }
    ;
    function ApplyPrimeSetting() {
        const newvalue = m_serverPrimeSetting ? 0 : 1;
        const settings = { update: { Game: { prime: m_serverPrimeSetting } } };
        settings.update.Game.prime = newvalue;
        LobbyAPI.UpdateSessionSettings(settings);
        GameInterfaceAPI.SetSettingString('ui_playsettings_prime', '' + newvalue);
    }
    function _SessionSettingsUpdate(sessionState) {
        if (sessionState === "ready") {
            if (m_jsTimerUpdateHandle && typeof m_jsTimerUpdateHandle === "number") {
                $.CancelScheduled(m_jsTimerUpdateHandle);
                m_jsTimerUpdateHandle = false;
            }
            _Init();
        }
        else if (sessionState === "updated") {
            const settings = LobbyAPI.GetSessionSettings();
            _SyncDialogsFromSessionSettings(settings);
        }
        else if (sessionState === "closed") {
            m_jsTimerUpdateHandle = $.Schedule(0.5, _HalfSecondDelay_HideContentPanel);
        }
    }
    ;
    function _HalfSecondDelay_HideContentPanel() {
        m_jsTimerUpdateHandle = false;
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
    }
    ;
    function _InitializeWorkshopTags(panel, mapInfo) {
        const mapTags = mapInfo.tags ? mapInfo.tags.split(",") : [];
        const rawModes = [];
        const modes = [];
        const tags = [];
        for (let i = 0; i < mapTags.length; ++i) {
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
        panel.SetAttributeString('data-tooltip', tooltip);
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
        const container = $.CreatePanel("Panel", $('#MapSelectionList'), panelId, {
            class: 'map-selection-list map-selection-list--inner hidden'
        });
        container.AddClass('map-selection-list--workshop');
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
        const botDiff = GameInterfaceAPI.GetSettingString('player_botdifflast_s');
        GameTypesAPI.SetCustomBotDifficulty(parseInt(botDiff));
        elDropDown.SetSelected(botDiff);
    }
    ;
    function _BotDifficultyChanged() {
        const elDropDownEntry = $('#BotDifficultyDropdown').GetSelected();
        const botDiff = elDropDownEntry.id;
        GameTypesAPI.SetCustomBotDifficulty(parseInt(botDiff));
        GameInterfaceAPI.SetSettingString('player_botdifflast_s', botDiff);
    }
    ;
    function _DisplayWorkshopModePopup() {
        const elSelectedMaps = _GetSelectedWorkshopMapButtons();
        let modes = [];
        for (let iMap = 0; iMap < elSelectedMaps.length; ++iMap) {
            const mapModes = elSelectedMaps[iMap].GetAttributeString('data-workshop-modes', '').split(',');
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
            return;
        const children = container.Children();
        for (let i = 0; i < children.length; ++i) {
            const panel = children[i];
            const mapname = panel.GetAttributeString('mapname', '');
            if (mapname === '')
                continue;
            if (filter === '') {
                panel.visible = true;
                continue;
            }
            if (mapname.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            const modes = panel.GetAttributeString('data-workshop-modes', '');
            if (modes.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
            const tooltip = panel.GetAttributeString('data-tooltip', '');
            if (tooltip.toLowerCase().includes(filter)) {
                panel.visible = true;
                continue;
            }
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
        m_serverSetting = 'listen';
        m_isWorkshop = true;
        _UpdatePrimeBtn(false, LobbyAPI.BIsHost());
        _UpdatePracticeSettingsBtns(false, LobbyAPI.BIsHost());
        if (_GetSelectedWorkshopMap()) {
            _ApplySessionSettings();
        }
        else {
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
            delete m_mapSelectionButtonContainers[k_workshopPanelId];
        }
        if (m_activeMapGroupSelectionPanelID != k_workshopPanelId) {
            return;
        }
        if (!LobbyAPI.IsSessionActive()) {
            m_activeMapGroupSelectionPanelID = null;
            return;
        }
        _SyncDialogsFromSessionSettings(LobbyAPI.GetSessionSettings());
        if (LobbyAPI.BIsHost()) {
            _ApplySessionSettings();
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
    $.RegisterForUnhandledEvent('DirectChallenge_GenRandomKey', PlayMenu.OnDirectChallengeRandom);
    $.RegisterForUnhandledEvent('DirectChallenge_EditKey', PlayMenu.OnDirectChallengeEdit);
    $.RegisterForUnhandledEvent('DirectChallenge_CopyKey', PlayMenu.OnDirectChallengeCopy);
    $.RegisterForUnhandledEvent('DirectChallenge_ChooseClanKey', PlayMenu.OnChooseClanKeyBtn);
    $.RegisterForUnhandledEvent('DirectChallenge_ClanChallengeKeySelected', PlayMenu.OnClanChallengeKeySelected);
    $.RegisterForUnhandledEvent('PanoramaComponent_PartyBrowser_PrivateQueuesUpdate', PlayMenu.OnPrivateQueuesUpdate);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfcGxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3BsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUFtQztBQUNuQyw0Q0FBNEM7QUFDNUMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyw4Q0FBOEM7QUFDOUMsNkNBQTZDO0FBQzdDLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLDJDQUEyQztBQUMzQyxrREFBa0Q7QUFFbEQsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGlCQUFpQixHQUFHLGtDQUFrQyxDQUFDO0lBRzdELE1BQU0sOEJBQThCLEdBQTZCLEVBQUUsQ0FBQztJQUVwRSxJQUFJLGlCQUFpQixHQUFpQyxFQUFFLENBQUM7SUFFekQsSUFBSSxtQkFBbUIsR0FBZSxFQUFFLENBQUM7SUFFekMsSUFBSSxZQUF3QyxDQUFDO0lBQzdDLElBQUksV0FBNkMsQ0FBQztJQUVsRCxNQUFNLGVBQWUsR0FBRyxDQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUUsS0FBSyxjQUFjLENBQUUsQ0FBQztJQUM5RSxJQUFJLGdDQUFnQyxHQUFtQixJQUFJLENBQUM7SUFDNUQsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBR3ZCLElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUN6QixJQUFJLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztJQUMzQixJQUFJLG9CQUFvQixHQUFHLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsdUJBQXVCLENBQUUsS0FBSyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsSUFBSSx3QkFBd0IsR0FBa0IsSUFBSSxDQUFDO0lBQ25ELElBQUksNEJBQTRCLEdBQWEsRUFBRSxDQUFDO0lBR2hELE1BQU0sZUFBZSxHQUE4QixFQUFFLENBQUM7SUFHdEQsSUFBSSxZQUFZLEdBQUcsS0FB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