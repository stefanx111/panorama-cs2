"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../util_gamemodeflags.ts" />
/// <reference path="../common/formattext.ts" />
/// <reference path="../common/sessionutil.ts" />
/// <reference path="../popups/popup_premier_pick_ban.ts" />
/// <reference path="../common/teamcolor.ts" />
/// <reference path="../avatar.ts" />
const PopupAcceptMatch = (function () {
    let m_hasPressedAccept = false;
    let m_numPlayersReady = 0;
    let m_numTotalClientsInReservation = 0;
    let m_numSecondsRemaining = 0;
    let m_isReconnect = false;
    let m_isNqmmAnnouncementOnly = false;
    let m_lobbySettings = null;
    const m_elTimer = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchCountdown');
    let m_jsTimerUpdateHandle = false;
    const _Init = function () {
        const elPlayerSlots = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchSlots');
        elPlayerSlots.RemoveAndDeleteChildren();
        const settings = $.GetContextPanel().GetAttributeString('map_and_isreconnect', '');
        const settingsList = settings.split(',');
        let map = settingsList[0];
        if (map.charAt(0) === '@') {
            m_isNqmmAnnouncementOnly = true;
            m_hasPressedAccept = true;
            map = map.substr(1);
        }
        m_isReconnect = settingsList[1] === 'true' ? true : false;
        m_lobbySettings = LobbyAPI.GetSessionSettings();
        if (!m_isReconnect && m_lobbySettings && m_lobbySettings.game) {
            const elAgreement = $.GetContextPanel().FindChildInLayoutFile('Agreement');
            elAgreement.visible = true;
            const elAgreementComp = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchAgreementCompetitive');
            elAgreementComp.visible = m_lobbySettings.game.mode === "competitive";
        }
        $.DispatchEvent("ShowReadyUpPanel", "");
        _SetMatchData(map);
        if (m_isNqmmAnnouncementOnly) {
            $('#AcceptMatchDataContainer').SetHasClass('auto', true);
            _UpdateUiState();
            $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_confirmed_casual', 'MOUSE', 6.0);
            m_jsTimerUpdateHandle = $.Schedule(4.5, _OnNqmmAutoReadyUp);
        }
        _PopulatePlayerList();
    };
    function _PopulatePlayerList() {
        let numPlayers = LobbyAPI.GetConfirmedMatchPlayerCount();
        if (!numPlayers || numPlayers <= 2)
            return;
        $.GetContextPanel().SetHasClass("accept-match-with-player-list", true);
        $.GetContextPanel().FindChildInLayoutFile('id-map-draft-phase-teams').RemoveClass('hidden');
        let iYourXuidTeamIdx = 0;
        const yourXuid = MyPersonaAPI.GetXuid();
        for (let i = 0; i < numPlayers; ++i) {
            const xuidPlayer = LobbyAPI.GetConfirmedMatchPlayerByIdx(i);
            if (xuidPlayer && xuidPlayer === yourXuid)
                iYourXuidTeamIdx = (i < (numPlayers / 2)) ? 0 : 1;
        }
        for (let i = 0; i < numPlayers; ++i) {
            let xuid = LobbyAPI.GetConfirmedMatchPlayerByIdx(i);
            if (!xuid) {
                continue;
            }
            const iThisPlayerTeamIdx = (i < (numPlayers / 2)) ? 0 : 1;
            const teamPanelId = (iYourXuidTeamIdx === iThisPlayerTeamIdx) ? 'id-map-draft-phase-your-team' : 'id-map-draft-phase-other-team';
            const elTeammates = $.GetContextPanel().FindChildInLayoutFile(teamPanelId).FindChild('id-map-draft-phase-avatars');
            _MakeAvatar(xuid, elTeammates, true);
        }
    }
    const _MakeAvatar = function (xuid, elTeammates, bisTeamLister = false) {
        const panelType = bisTeamLister ? 'Button' : 'Panel';
        const elAvatar = $.CreatePanel(panelType, elTeammates, xuid);
        elAvatar.BLoadLayoutSnippet('SmallAvatar');
        if (bisTeamLister) {
            _AddOpenPlayerCardAction(elAvatar, xuid);
        }
        elAvatar.FindChildTraverse('JsAvatarImage').PopulateFromSteamID(xuid);
        const elTeamColor = elAvatar.FindChildInLayoutFile('JsAvatarTeamColor');
        elTeamColor.visible = false;
        const strName = FriendsListAPI.GetFriendName(xuid);
        elAvatar.SetDialogVariable('teammate_name', strName);
    };
    const _AddOpenPlayerCardAction = function (elAvatar, xuid) {
        elAvatar.SetPanelEvent("onactivate", () => {
            $.DispatchEvent('SidebarContextMenuActive', true);
            if (xuid !== "0") {
                const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, () => $.DispatchEvent('SidebarContextMenuActive', false));
                contextMenuPanel.AddClass("ContextMenu_NoArrow");
            }
        });
    };
    const _UpdateUiState = function () {
        const btnAccept = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchBtn');
        const elPlayerSlots = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchSlots');
        let bHideTimer = false;
        let bShowPlayerSlots = m_hasPressedAccept || m_isReconnect;
        if (m_isNqmmAnnouncementOnly) {
            bShowPlayerSlots = false;
            bHideTimer = true;
        }
        btnAccept.SetHasClass('hidden', m_hasPressedAccept || m_isReconnect);
        elPlayerSlots.SetHasClass('hidden', !bShowPlayerSlots);
        if (bShowPlayerSlots) {
            _UpdatePlayerSlots(elPlayerSlots);
            bHideTimer = true;
        }
        m_elTimer.GetChild(0).text = "0:" + ((m_numSecondsRemaining < 10) ? "0" : "") + m_numSecondsRemaining;
        m_elTimer.SetHasClass("hidden", bHideTimer || (m_numSecondsRemaining <= 0));
        if (m_jsTimerUpdateHandle) {
            $.CancelScheduled(m_jsTimerUpdateHandle);
            m_jsTimerUpdateHandle = false;
        }
    };
    const _UpdateTimeRemainingSeconds = function () {
        m_numSecondsRemaining = LobbyAPI.GetReadyTimeRemainingSeconds();
    };
    const _OnTimerUpdate = function () {
        m_jsTimerUpdateHandle = false;
        _UpdateTimeRemainingSeconds();
        _UpdateUiState();
        if (m_numSecondsRemaining > 0) {
            if (m_hasPressedAccept) {
                $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_waitquiet', 'MOUSE', 1.0);
            }
            else {
                $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_beep', 'MOUSE', 1.0);
            }
            m_jsTimerUpdateHandle = $.Schedule(1.0, _OnTimerUpdate);
        }
    };
    const _FriendsListNameChanged = function (xuid) {
        if (!xuid)
            return;
        const elNameLabel = $.GetContextPanel().FindChildTraverse('xuid');
        if (!elNameLabel)
            return;
        const strName = FriendsListAPI.GetFriendName(xuid);
        elNameLabel.SetDialogVariable('teammate_name', strName);
    };
    const _ReadyForMatch = function (shouldShow, playersReadyCount, numTotalClientsInReservation) {
        if (!shouldShow) {
            if (m_jsTimerUpdateHandle) {
                $.CancelScheduled(m_jsTimerUpdateHandle);
                m_jsTimerUpdateHandle = false;
            }
            $.DispatchEvent("CloseAcceptPopup");
            $.DispatchEvent('UIPopupButtonClicked', '');
            return;
        }
        if (m_hasPressedAccept && m_numPlayersReady && (playersReadyCount > m_numPlayersReady)) {
            $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_person', 'MOUSE', 1.0);
        }
        if (playersReadyCount == 1 && numTotalClientsInReservation == 1 && (m_numTotalClientsInReservation > 1)) {
            numTotalClientsInReservation = m_numTotalClientsInReservation;
            playersReadyCount = m_numTotalClientsInReservation;
        }
        m_numPlayersReady = playersReadyCount;
        m_numTotalClientsInReservation = numTotalClientsInReservation;
        _UpdateTimeRemainingSeconds();
        _UpdateUiState();
        m_jsTimerUpdateHandle = $.Schedule(1.0, _OnTimerUpdate);
    };
    const _UpdatePlayerSlots = function (elPlayerSlots) {
        for (let i = 0; i < m_numTotalClientsInReservation; i++) {
            let Slot = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchSlot' + i);
            if (!Slot) {
                Slot = $.CreatePanel('Panel', elPlayerSlots, 'AcceptMatchSlot' + i);
                Slot.BLoadLayoutSnippet('AcceptMatchPlayerSlot');
            }
            Slot.SetHasClass('accept-match__slots__player--accepted', (i < m_numPlayersReady));
        }
        const labelPlayersAccepted = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchPlayersAccepted');
        labelPlayersAccepted.SetDialogVariableInt('accepted', m_numPlayersReady);
        labelPlayersAccepted.SetDialogVariableInt('slots', m_numTotalClientsInReservation);
        labelPlayersAccepted.text = $.Localize('#match_ready_players_accepted', labelPlayersAccepted);
    };
    const _SetMatchData = function (map) {
        if (!m_lobbySettings || !m_lobbySettings.game)
            return;
        const labelData = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchModeMap');
        let strLocalize = '#match_ready_match_data';
        labelData.SetDialogVariable('mode', $.Localize('#SFUI_GameMode_' + m_lobbySettings.game.mode));
        const flags = parseInt(m_lobbySettings.game.gamemodeflags);
        if (GameModeFlags.DoesModeUseFlags(m_lobbySettings.game.mode) && flags) {
            labelData.SetDialogVariable('modifier', $.Localize('#play_setting_gamemodeflags_' + m_lobbySettings.game.mode + '_' + flags));
            strLocalize = '#match_ready_match_data_modifier';
        }
        if (MyPersonaAPI.GetElevatedState() === 'elevated' && SessionUtil.DoesGameModeHavePrimeQueue(m_lobbySettings.game.mode) && ((m_lobbySettings.game.prime !== 1) || !SessionUtil.AreLobbyPlayersPrime() || (MyPersonaAPI.GetBetaType() === 'limitedbeta'))) {
            $.GetContextPanel().FindChildInLayoutFile('AcceptMatchWarning').RemoveClass('hidden');
        }
        labelData.SetDialogVariable('map', $.Localize('#SFUI_Map_' + map));
        if ((m_lobbySettings.game.mode === 'competitive') && (map === 'lobby_mapveto')) {
            $('#AcceptMatchModeIcon').SetImage("file://{images}/icons/ui/competitive_teams.svg");
            if (m_lobbySettings.options && m_lobbySettings.options.challengekey) {
                strLocalize = '#match_ready_match_data_map';
                labelData.SetDialogVariable('map', $.Localize('#SFUI_Lobby_LeaderMatchmaking_Type_PremierPrivateQueue'));
            }
        }
        labelData.text = $.Localize(strLocalize, labelData);
        const imgMap = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchMapImage');
        imgMap.style.backgroundImage = 'url("file://{images}/map_icons/screenshots/360p/' + map + '.png")';
    };
    const _OnNqmmAutoReadyUp = function () {
        m_jsTimerUpdateHandle = false;
        LobbyAPI.SetLocalPlayerReady('deferred');
        $.DispatchEvent("CloseAcceptPopup");
        $.DispatchEvent('UIPopupButtonClicked', '');
    };
    const _OnAcceptMatchPressed = function () {
        m_hasPressedAccept = true;
        $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_person', 'MOUSE', 1.0);
        LobbyAPI.SetLocalPlayerReady('accept');
    };
    const _ShowPreMatchInterface = function () {
        PremierPickBan.Init();
        $.GetContextPanel().FindChildInLayoutFile('id-accept-match').AddClass('hide');
    };
    return {
        Init: _Init,
        ReadyForMatch: _ReadyForMatch,
        FriendsListNameChanged: _FriendsListNameChanged,
        OnAcceptMatchPressed: _OnAcceptMatchPressed,
        ShowPreMatchInterface: _ShowPreMatchInterface
    };
})();
(function () {
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', PopupAcceptMatch.FriendsListNameChanged);
    $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ReadyUpForMatch', PopupAcceptMatch.ReadyForMatch);
    $.RegisterForUnhandledEvent('MatchAssistedAccept', PopupAcceptMatch.OnAcceptMatchPressed);
    $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ShowPreMatchInterface', PopupAcceptMatch.ShowPreMatchInterface);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfYWNjZXB0X21hdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9wdXBfYWNjZXB0X21hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsaURBQWlEO0FBQ2pELGdEQUFnRDtBQUNoRCxpREFBaUQ7QUFDakQsNERBQTREO0FBQzVELCtDQUErQztBQUMvQyxxQ0FBcUM7QUFFckMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFFO0lBZ0IxQixJQUFJLGtCQUFrQixHQUFHLEtBQUssQ0FBQztJQUMvQixJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQztJQUMxQixJQUFJLDhCQUE4QixHQUFHLENBQUMsQ0FBQztJQUN2QyxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQztJQUM5QixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDMUIsSUFBSSx3QkFBd0IsR0FBRyxLQUFLLENBQUM7SUFDckMsSUFBSSxlQUFlLEdBQTJCLElBQUksQ0FBQztJQUNuRCxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMscUJBQXFCLENBQUUsc0JBQXNCLENBQUUsQ0FBQztJQUN0RixJQUFJLHFCQUFxQixHQUFtQixLQUFLLENBQUM7SUFNbEQsTUFBTSxLQUFLLEdBQUc7UUFHYixNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMscUJBQXFCLENBQUUsa0JBQWtCLENBQUUsQ0FBQztRQUN0RixhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUV4QyxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsa0JBQWtCLENBQUUscUJBQXFCLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFHckYsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUUzQyxJQUFJLEdBQUcsR0FBRyxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDNUIsSUFB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