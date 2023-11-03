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
/// <reference path="rating_emblem.ts" />
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
                if (!_CheckContainerHasAnyChildChecked(_GetMapListForServerTypeAndGameMode(m_activeMapGroupSelectionPanelID)) && !m_isWorkshop) {
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
                let targetLevel = 2;
                let showbar = true;
                if (gameMode === 'premier') {
                    targetLevel = 10;
                    if (MyPersonaAPI.GetElevatedState() !== 'elevated') {
                        txtTooltip += '_nonprime';
                        showbar = false;
                    }
                }
                elTab.SetPanelEvent('onmouseover', function () {
                    UiToolkitAPI.ShowCustomLayoutParametersTooltip(elTab.id, 'GamemodesLockedneedPrime', 'file://{resources}/layout/tooltips/tooltip_title_progressbar.xml', 'titletext=' + '#PlayMenu_unavailable_locked_mode_title' +
                        '&' + 'bodytext=' + txtTooltip +
                        '&' + 'usexp=' + 'true' +
                        '&' + 'targetlevel=' + targetLevel +
                        '&' + 'showbar=' + (showbar ? 'true' : 'false'));
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
        if (gameMode === "cooperative" || gameMode === "coopmission") {
            const questID = GetMatchmakingQuestId();
            const bGameModeMatchesLobby = questID !== 0 && (LobbyAPI.GetSessionSettings().game.mode === gameMode);
            const bAvailable = bGameModeMatchesLobby && MissionsAPI.GetQuestDefinitionField(questID, "gamemode") === gameMode;
            _SetGameModeRadioButtonVisible(gameMode, bAvailable);
            return bAvailable;
        }
        else if (m_gameModeConfigs[gameMode] &&
            _GetAvailableMapGroups(gameMode, _IsValveOfficialServer(serverType)).length == 0) {
            _SetGameModeRadioButtonAvailableTooltip(gameMode, false, '');
            return false;
        }
        if (_IsValveOfficialServer(serverType) &&
            LobbyAPI.BIsHost()) {
            if (gameMode === 'premier') {
                isAvailable = ((MyPersonaAPI.GetElevatedState() === 'elevated') &&
                    (MyPersonaAPI.HasPrestige() || MyPersonaAPI.GetCurrentLevel() >= 10));
            }
            else if (MyPersonaAPI.HasPrestige()) {
                isAvailable = true;
            }
            else if (MyPersonaAPI.GetCurrentLevel() < 2) {
                isAvailable = (gameMode == 'deathmatch' || gameMode == 'casual');
            }
        }
        else if (!_IsValveOfficialServer(serverType)) {
            (isAvailable = (gameMode != 'premier'));
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
        _setAndSaveGameModeFlags(parseInt(settings.game.gamemodeflags));
        $.GetContextPanel().SwitchClass("gamemode", m_isWorkshop ? "workshop" : _RealGameMode());
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
        _UpdateReplayNewUserTrainingBtn(m_gameModeSetting);
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
        _PipRankUpdate();
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
        $.Schedule(.1, () => {
            if (!elTile || !elTile.IsValid())
                return;
            const elAvatar = elTile.FindChildTraverse('JsAvatarImage');
            elAvatar.PopulateFromSteamID(xuid);
            const strName = FriendsListAPI.GetFriendName(xuid);
            elTile.SetDialogVariable('player_name', strName);
            _AddOpenPlayerCardAction(elTile, xuid);
            Scheduler.Schedule(delay, function () {
                if (elTile && elTile.IsValid())
                    elTile.RemoveClass('hidden');
            }, "directchallenge");
        });
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
                Scheduler.Schedule(delay, () => {
                    if (elParty && elParty.IsValid())
                        elParty.RemoveClass('hidden');
                }, "directchallenge");
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
    function _UpdateRatingEmblem(p, mapGroupName) {
        let elRatingEmblem = p.FindChildTraverse('jsRatingEmblem');
        if (!elRatingEmblem || !elRatingEmblem.IsValid())
            return;
        elRatingEmblem.visible = m_serverSetting == 'official' &&
            m_gameModeSetting === 'competitive' &&
            !m_isWorkshop &&
            LobbyAPI.GetSessionSettings() &&
            LobbyAPI.GetSessionSettings().hasOwnProperty('game') &&
            LobbyAPI.GetSessionSettings().game.hasOwnProperty('prime') &&
            LobbyAPI.GetSessionSettings().game.prime;
        let options = {
            root_panel: p,
            xuid: MyPersonaAPI.GetXuid(),
            api: 'mypersona',
            rating_type: 'Competitive',
            rating_map: mapGroupName,
            full_details: true
        };
        RatingEmblem.SetXuid(options);
        let winCountString = RatingEmblem.GetWinCountString(p);
        p.SetDialogVariable('map-win-count', winCountString);
        p.SetHasClass('show-win-count', winCountString != '');
    }
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
        if (!_IsPlayingOnValveOfficial() || !MyPersonaAPI.IsInventoryValid() || inDirectChallenge() || m_isWorkshop) {
            elPrimePanel.visible = false;
            return;
        }
        const LocalPlayerHasPrime = PartyListAPI.GetFriendPrimeEligible(MyPersonaAPI.GetXuid());
        elPrimePanel.visible = true;
        elPrimePanel.SetHasClass('play-menu-prime-logo-bg', LocalPlayerHasPrime);
        elGetPrimeBtn.visible = !LocalPlayerHasPrime;
        elPrimeStatus.visible = LocalPlayerHasPrime;
        if (!LocalPlayerHasPrime) {
            const sPrice = StoreAPI.GetStoreItemSalePrice(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1353, 0), 1, '');
            elGetPrimeBtn.SetDialogVariable("price", sPrice ? sPrice : '$0');
            elGetPrimeBtn.SetPanelEvent('onactivate', function () {
                UiToolkitAPI.HideTextTooltip();
                UiToolkitAPI.ShowCustomLayoutPopup('prime_status', 'file://{resources}/layout/popups/popup_prime_status.xml');
            });
        }
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
    function _UpdateReplayNewUserTrainingBtn(gameMode) {
        const elButton = $('#PlayMenuReplayNewUserTrainingButton');
        if (gameMode === 'competitive' && m_serverSetting === 'listen' && !m_isWorkshop) {
            elButton.visible = true;
            elButton.SetPanelEvent('onactivate', () => {
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
            });
        }
        else {
            elButton.visible = false;
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
        if (m_serverSetting === 'official' && !m_isWorkshop && !inDirectChallenge()) {
            if (m_gameModeSetting === 'scrimcomp2v2') {
                MyPersonaAPI.HintLoadPipRanks('wingman');
            }
            else if (m_gameModeSetting === 'competitive') {
                MyPersonaAPI.HintLoadPipRanks('competitive');
            }
        }
        if (!LobbyAPI.BIsHost()) {
            return;
        }
        _ValidateSessionSettings();
        const serverType = m_serverSetting;
        let gameMode = _RealGameMode();
        let gameModeFlags = m_gameModeFlags[m_serverSetting + gameMode] ? m_gameModeFlags[m_serverSetting + gameMode] : 0;
        let primePreference = PartyListAPI.GetFriendPrimeEligible(MyPersonaAPI.GetXuid()) ? 1 : 0;
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
    function _PipRankUpdate() {
        if (m_serverSetting == 'official' &&
            m_gameModeSetting === 'competitive') {
            const activeMapGroup = m_activeMapGroupSelectionPanelID;
            const btnSelectedMapGroup = m_mapSelectionButtonContainers[activeMapGroup].Children();
            btnSelectedMapGroup.forEach(function (elPanel) {
                const mapGroupName = elPanel.GetAttributeString('mapname', '').replace(/^mg_/, '');
                _UpdateRatingEmblem(elPanel, mapGroupName);
            });
        }
    }
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
            if (typeof mapInfo !== 'object') {
                continue;
            }
            const p = $.CreatePanel('RadioButton', container, panelId + '_' + idxMap);
            p.BLoadLayoutSnippet('MapGroupSelection');
            p.SetAttributeString('group', 'radiogroup_' + panelId);
            if (!mapInfo.hasOwnProperty('imageUrl') || !mapInfo.imageUrl)
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
        if (elSelectedMaps.length === 0) {
            UiToolkitAPI.ShowGenericPopupTwoOptions($.Localize('#SFUI_Maps_Workshop_Title'), $.Localize('#SFUI_No_Subscribed_Maps_Desc'), '', '#CSGO_Workshop_Visit', 
            // @ts-ignore: Unreachable code error
            function () { $.DispatchEvent('CSGOOpenSteamWorkshop'); }, "OK", function () { });
            $('#StartMatchBtn').RemoveClass('pressed');
            return;
        }
        for (let iMap = 0; iMap < elSelectedMaps.length; ++iMap) {
            const mapModes = elSelectedMaps[iMap].GetAttributeString('data-workshop-modes', '').split(',');
            if (iMap == 0)
                modes = mapModes;
            else
                modes = modes.filter(function (mode) { return mapModes.includes(mode); });
        }
        const strModes = modes.join(',');
        UiToolkitAPI.ShowCustomLayoutPopupParameters('workshop_map_mode', 'file://{resources}/layout/popups/popup_workshop_mode_select.xml', 'workshop-modes=' + $.HTMLEscape(strModes));
        $('#StartMatchBtn').RemoveClass('pressed');
    }
    ;
    function _UpdateWorkshopMapFilter() {
        const elTextLabel = $('#WorkshopSearchTextEntry');
        const filter = $.HTMLEscape(elTextLabel.text).toLowerCase();
        const container = m_mapSelectionButtonContainers[k_workshopPanelId];
        const elCanelBtn = $('#WorkshopSearchTextEntryCanel');
        elCanelBtn.SetHasClass('hide', filter == '');
        elCanelBtn.SetPanelEvent('onactivate', () => { elTextLabel.text = '', _UpdateWorkshopMapFilter; });
        if (!container) {
            return;
        }
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
        $.GetContextPanel().SwitchClass("serversetting", m_serverSetting);
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
    function _OnClearFilterText() {
        const elTextLabel = $('#WorkshopSearchTextEntry');
        const elCanelBtn = $('#WorkshopSearchTextEntryCanel');
        elCanelBtn.SetPanelEvent('onactivate', () => { elTextLabel.text = '', _UpdateWorkshopMapFilter; });
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
        PipRankUpdate: _PipRankUpdate,
        OnClearFilterText: _OnClearFilterText
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
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_PipRankUpdate', PlayMenu.PipRankUpdate);
    $.RegisterForUnhandledEvent('DirectChallenge_GenRandomKey', PlayMenu.OnDirectChallengeRandom);
    $.RegisterForUnhandledEvent('DirectChallenge_EditKey', PlayMenu.OnDirectChallengeEdit);
    $.RegisterForUnhandledEvent('DirectChallenge_CopyKey', PlayMenu.OnDirectChallengeCopy);
    $.RegisterForUnhandledEvent('DirectChallenge_ChooseClanKey', PlayMenu.OnChooseClanKeyBtn);
    $.RegisterForUnhandledEvent('DirectChallenge_ClanChallengeKeySelected', PlayMenu.OnClanChallengeKeySelected);
    $.RegisterForUnhandledEvent('PanoramaComponent_PartyBrowser_PrivateQueuesUpdate', PlayMenu.OnPrivateQueuesUpdate);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfcGxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3BsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw0Q0FBNEM7QUFDNUMsa0NBQWtDO0FBQ2xDLDZDQUE2QztBQUM3Qyw4Q0FBOEM7QUFDOUMsNkNBQTZDO0FBQzdDLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLGtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFFekMsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGlCQUFpQixHQUFHLGtDQUFrQyxDQUFDO0lBRzdELE1BQU0sOEJBQThCLEdBQW9DLEVBQUUsQ0FBQztJQUUzRSxJQUFJLGlCQUFpQixHQUF1QyxFQUFFLENBQUM7SUFFL0QsSUFBSSxtQkFBbUIsR0FBYyxFQUFFLENBQUM7SUFFeEMsSUFBSSxZQUE0QyxDQUFDO0lBQ2pELElBQUksV0FBbUQsQ0FBQztJQUV4RCxNQUFNLGVBQWUsR0FBRyxDQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUUsS0FBSyxjQUFjLENBQUUsQ0FBQztJQUM5RSxJQUFJLGdDQUFnQyxHQUFrQixJQUFJLENBQUM7SUFDM0QsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBR3ZCLElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUN6QixJQUFJLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztJQUMzQixJQUFJLHdCQUF3QixHQUFrQixJQUFJLENBQUM7SUFDbkQsSUFBSSw0QkFBNEIsR0FBYSxFQUFFLENBQUM7SUFHaEQsTUFBTSxlQUFlLEdBQWdDLEVBQUUsQ0FBQztJQUd4RCxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7SUFFekIsSUFBSSxxQkFBcUIsR0FBcUIsS0FBSyxDQUFDO0lBR3BELElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztJQUN4QixJQUFJLGdDQUFnQyxHQUFHLElBQUksQ0FBQztJQUU1QyxNQUFNLGVBQWUsR0FB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