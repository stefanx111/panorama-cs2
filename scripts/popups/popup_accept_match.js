"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../util_gamemodeflags.ts" />
/// <reference path="../common/formattext.ts" />
/// <reference path="../common/sessionutil.ts" />
/// <reference path="../popups/popup_premier_pick_ban.ts" />
/// <reference path="../common/teamcolor.ts" />
/// <reference path="../rating_emblem.ts" />
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
        CancelTimerSound();
    };
    const CancelTimerSound = function () {
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
        if (MyPersonaAPI.GetElevatedState() === 'elevated' && SessionUtil.DoesGameModeHavePrimeQueue(m_lobbySettings.game.mode) && ((m_lobbySettings.game.prime !== 1) || !SessionUtil.AreLobbyPlayersPrime())) {
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
        CancelTimerSound();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfYWNjZXB0X21hdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9wdXBfYWNjZXB0X21hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsaURBQWlEO0FBQ2pELGdEQUFnRDtBQUNoRCxpREFBaUQ7QUFDakQsNERBQTREO0FBQzVELCtDQUErQztBQUMvQyw0Q0FBNEM7QUFDNUMscUNBQXFDO0FBRXJDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBRTtJQWdCMUIsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUM7SUFDMUIsSUFBSSw4QkFBOEIsR0FBRyxDQUFDLENBQUM7SUFDdkMsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7SUFDOUIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBQzFCLElBQUksd0JBQXdCLEdBQUcsS0FBSyxDQUFDO0lBQ3JDLElBQUksZUFBZSxHQUEyQixJQUFJLENBQUM7SUFDbkQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLHNCQUFzQixDQUFFLENBQUM7SUFDdEYsSUFBSSxxQkFBcUIsR0FBbUIsS0FBSyxDQUFDO0lBTWxELE1BQU0sS0FBSyxHQUFHO1FBR2IsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLGtCQUFrQixDQUFFLENBQUM7UUFDdEYsYUFBYSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFFeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGtCQUFrQixDQUFFLHFCQUFxQixFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBR3JGLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUUsR0FBRyxDQUFFLENBQUM7UUFFM0MsSUFBSSxHQUFHLEdBQUcsWUFBWSxDQUFFLENBQUMsQ0FBRSxD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