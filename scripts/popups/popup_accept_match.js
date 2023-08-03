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
    //DEVONLY{
    let spoof10 = false;
    //}DEVONLY
    const _Init = function () {
        // reset dialog
        const elPlayerSlots = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchSlots');
        elPlayerSlots.RemoveAndDeleteChildren();
        const settings = $.GetContextPanel().GetAttributeString('map_and_isreconnect', '');
        // $.Msg( 'PopupAcceptMatch ' + settings );
        const settingsList = settings.split(',');
        let map = settingsList[0];
        if (map.charAt(0) === '@') {
            m_isNqmmAnnouncementOnly = true;
            m_hasPressedAccept = true;
            map = map.substr(1);
        }
        // If its a recconect we don't need to show the Accept button
        m_isReconnect = settingsList[1] === 'true' ? true : false;
        m_lobbySettings = LobbyAPI.GetSessionSettings();
        //DEVONLY{
        if (spoof10) {
            m_isNqmmAnnouncementOnly = false;
            m_hasPressedAccept = true;
            m_isReconnect = false;
        }
        //}DEVONLY
        if (!m_isReconnect && m_lobbySettings && m_lobbySettings.game) {
            // agreement parent panel
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
        $.Msg('AcceptMatch._PopulatePlayerList');
        let numPlayers = LobbyAPI.GetConfirmedMatchPlayerCount();
        //DEVONLY{
        if (spoof10) {
            numPlayers = 10;
            _UpdateTimeRemainingSeconds();
            _UpdateUiState();
        }
        //}DEVONLY
        if (!numPlayers || numPlayers <= 2)
            return;
        $.GetContextPanel().SetHasClass("accept-match-with-player-list", true);
        $.GetContextPanel().FindChildInLayoutFile('id-map-draft-phase-teams').RemoveClass('hidden');
        let iYourXuidTeamIdx = 0;
        const yourXuid = MyPersonaAPI.GetXuid();
        // yourXuid should always be on one of the teams
        for (let i = 0; i < numPlayers; ++i) {
            const xuidPlayer = LobbyAPI.GetConfirmedMatchPlayerByIdx(i);
            if (xuidPlayer && xuidPlayer === yourXuid)
                iYourXuidTeamIdx = (i < (numPlayers / 2)) ? 0 : 1;
        }
        // Go through each team we care about and update the players
        for (let i = 0; i < numPlayers; ++i) {
            let xuid = LobbyAPI.GetConfirmedMatchPlayerByIdx(i);
            if (!xuid) {
                //DEVONLY{
                if (spoof10)
                    xuid = yourXuid;
                else
                    //}DEVONLY
                    continue;
            }
            // check if you are in the player list and assing the correct list.
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
        $.Msg('Accept: created player entry ' + xuid + ' = ' + strName);
        elAvatar.SetDialogVariable('teammate_name', strName);
    };
    const _AddOpenPlayerCardAction = function (elAvatar, xuid) {
        elAvatar.SetPanelEvent("onactivate", () => {
            // Tell the sidebar to stay open and ignore its on mouse event while the context menu is open
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
        //DEVONLY{
        if (spoof10)
            m_numSecondsRemaining = 10;
        //}DEVONLY
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
        $.Msg('Accept: name changed for ' + xuid);
        if (!xuid)
            return;
        const elNameLabel = $.GetContextPanel().FindChildTraverse('xuid');
        if (!elNameLabel)
            return;
        const strName = FriendsListAPI.GetFriendName(xuid);
        $.Msg('Accept: updated name for ' + xuid + ' = ' + strName);
        elNameLabel.SetDialogVariable('teammate_name', strName);
    };
    const _ReadyForMatch = function (shouldShow, playersReadyCount, numTotalClientsInReservation) {
        // Called from event PanoramaComponent_Lobby_ReadyUpForMatch.
        // We are not supposed to show so hide and leave
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
            // $.Msg( "Accept: popup_accept_match_person("+playersReadyCount+">"+m_numPlayersReady+")\n" );
            $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'popup_accept_match_person', 'MOUSE', 1.0);
        }
        if (playersReadyCount == 1 && numTotalClientsInReservation == 1 && (m_numTotalClientsInReservation > 1)) { // This is a special notification that we should immediately connect to the match
            // Try reusing the match size if configured and spoof everybody as "ready"
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
        //DEVONLY{
        if (spoof10) {
            m_numTotalClientsInReservation = 10;
            m_numPlayersReady = 3;
        }
        //}DEVONLY
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
    // Called from $.RegisterForUnhandledEvent( 'ServerReserved', PopupAcceptMatch.SetMatchData )
    const _SetMatchData = function (map) {
        if (!m_lobbySettings || !m_lobbySettings.game)
            return;
        const labelData = $.GetContextPanel().FindChildInLayoutFile('AcceptMatchModeMap');
        let strLocalize = '#match_ready_match_data';
        $.Msg('Accept: mode=' + m_lobbySettings.game.mode + ', map=' + map + ' (' + GameTypesAPI.GetMapGroupAttribute('mg_' + map, 'competitivemod') + ')');
        labelData.SetDialogVariable('mode', $.Localize('#SFUI_GameMode_' + m_lobbySettings.game.mode));
        // Not using Skirmish mode any more.
        // if ( ( m_lobbySettings.game.mode === 'competitive' ) &&
        // 	( GameTypesAPI.GetMapGroupAttribute( 'mg_'+map, 'competitivemod' ) === 'unranked' ) )
        // {
        // 	labelData.SetDialogVariable ( 'mode', $.Localize( '#SFUI_RankType_Modifier_Unranked' ) );
        // 	// labelData.SetDialogVariable ( 'modifier', $.Localize( '#SFUI_RankType_Modifier_Unranked' ) );
        // 	// strLocalize = '#match_ready_match_data_modifier';
        // 	$.GetContextPanel().FindChildInLayoutFile( 'AcceptMatchWarning' ).RemoveClass( 'hidden' );
        // }
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
                // It's a Private Matchmaking with challenge key, show it as such
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
        $.Msg('Show ShowPreMatchInterface');
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
    /*
    UI_COMPONENT_DECLARE_EVENT2( Lobby, ReadyUpForMatch, "shouldShow", bool, "numPlayersReady", int32 );
    Spams once we learn of a new readiness, including when you click ready (if it sends successfully that is).
    */
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', PopupAcceptMatch.FriendsListNameChanged);
    $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ReadyUpForMatch', PopupAcceptMatch.ReadyForMatch);
    $.RegisterForUnhandledEvent('MatchAssistedAccept', PopupAcceptMatch.OnAcceptMatchPressed);
    $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ShowPreMatchInterface', PopupAcceptMatch.ShowPreMatchInterface);
    /*
    Test states
    $.Schedule( .1,PopupAcceptMatch.ReadyForMatch.bind( undefined, true, 1 ) );
    $.Schedule( 1,PopupAcceptMatch.ReadyForMatch.bind( undefined, true, 2 ) );
    $.Schedule( 2,PopupAcceptMatch.ReadyForMatch.bind( undefined, true, 3 ) );
    $.Schedule( 3,PopupAcceptMatch.ReadyForMatch.bind( undefined, true, 5 ) );
    */
})();
