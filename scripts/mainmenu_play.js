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
        const isPrime = (!m_challengeKey && m_serverPrimeSetting) ? true : false;
        if (!_IsPlayingOnValveOfficial() || !MyPersonaAPI.IsInventoryValid() || inDirectChallenge()) {
            elPrimePanel.visible = false;
            elToogleRankedBtn.visible = false;
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
        elToogleRankedBtn.visible = bGameModeHaveRankedMatches;
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
    function _ValidateSessionSettings() {
        if (m_isWorkshop) {
            m_serverSetting = "listen";
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
                    "premier",
                    "competitive",
                    "scrimcomp2v2",
                    "casual",
                    "deathmatch",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfcGxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3BsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG1DQUFtQztBQUNuQyw0Q0FBNEM7QUFDNUMsa0NBQWtDO0FBQ2xDLDhDQUE4QztBQUM5Qyw4Q0FBOEM7QUFDOUMsNkNBQTZDO0FBQzdDLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLGtEQUFrRDtBQUVsRCxJQUFJLFFBQVEsR0FBRyxDQUFFO0lBRWhCLE1BQU0saUJBQWlCLEdBQUcsa0NBQWtDLENBQUM7SUFHN0QsTUFBTSw4QkFBOEIsR0FBNkIsRUFBRSxDQUFDO0lBRXBFLElBQUksaUJBQWlCLEdBQWlDLEVBQUUsQ0FBQztJQUV6RCxJQUFJLG1CQUFtQixHQUFlLEVBQUUsQ0FBQztJQUV6QyxJQUFJLFlBQXdDLENBQUM7SUFDN0MsSUFBSSxXQUE2QyxDQUFDO0lBRWxELE1BQU0sZUFBZSxHQUFHLENBQUUsWUFBWSxDQUFDLGVBQWUsRUFBRSxLQUFLLGNBQWMsQ0FBRSxDQUFDO0lBQzlFLElBQUksZ0NBQWdDLEdBQW1CLElBQUksQ0FBQztJQUM1RCxJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7SUFHdkIsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFDO0lBQzNCLElBQUksb0JBQW9CLEdBQUcsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsQ0FBRSxLQUFLLEdBQUcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxJQUFJLHdCQUF3QixHQUFrQixJQUFJLENBQUM7SUFDbkQsSUFBSSw0QkFBNEIsR0FBYSxFQUFFLENBQUM7SUFHaEQsTUFBTSxlQUFlLEdBQThCLEVBQUUsQ0FBQztJQUd0RCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7SUFFekIs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