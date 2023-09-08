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
        if (m_gameModeSetting === 'competitive')
            _UpdateRatingEmblem(p, mapGroupName);
        return p;
    }
    ;
    function _UpdateRatingEmblem(p, mapGroupName) {
        let elRatingEmblem = p.FindChildTraverse('jsRatingEmblem');
        if (!elRatingEmblem || !elRatingEmblem.IsValid())
            return;
        elRatingEmblem.visible = m_serverSetting == 'official' && m_gameModeSetting === 'competitive';
        let options = {
            root_panel: p,
            xuid: MyPersonaAPI.GetXuid(),
            api: 'mypersona',
            rating_type: 'Competitive',
            rating_map: mapGroupName,
        };
        RatingEmblem.SetXuid(options);
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
        PipRankUpdate: _PipRankUpdate
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfcGxheS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3BsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw0Q0FBNEM7QUFDNUMsa0NBQWtDO0FBQ2xDLDZDQUE2QztBQUM3Qyw4Q0FBOEM7QUFDOUMsNkNBQTZDO0FBQzdDLHVDQUF1QztBQUN2Qyw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLGtEQUFrRDtBQUNsRCx5Q0FBeUM7QUFFekMsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGlCQUFpQixHQUFHLGtDQUFrQyxDQUFDO0lBRzdELE1BQU0sOEJBQThCLEdBQW9DLEVBQUUsQ0FBQztJQUUzRSxJQUFJLGlCQUFpQixHQUF1QyxFQUFFLENBQUM7SUFFL0QsSUFBSSxtQkFBbUIsR0FBYyxFQUFFLENBQUM7SUFFeEMsSUFBSSxZQUE0QyxDQUFDO0lBQ2pELElBQUksV0FBbUQsQ0FBQztJQUV4RCxNQUFNLGVBQWUsR0FBRyxDQUFFLFlBQVksQ0FBQyxlQUFlLEVBQUUsS0FBSyxjQUFjLENBQUUsQ0FBQztJQUM5RSxJQUFJLGdDQUFnQyxHQUFrQixJQUFJLENBQUM7SUFDM0QsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBR3ZCLElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUN6QixJQUFJLGlCQUFpQixHQUFHLEVBQUUsQ0FBQztJQUMzQixJQUFJLG9CQUFvQixHQUFHLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsdUJBQXVCLENBQUUsS0FBSyxHQUFHLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUcsSUFBSSx3QkFBd0IsR0FBa0IsSUFBSSxDQUFDO0lBQ25ELElBQUksNEJBQTRCLEdBQWEsRUFBRSxDQUFDO0lBR2hELE1BQU0sZUFBZSxHQUFnQyxFQUFFLENBQUM7SUFHeEQsSUFBSSxZQUFZLEdBQUcsS0FB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