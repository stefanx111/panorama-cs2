"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="common/teamcolor.ts" />
var Leaderboard;
(function (Leaderboard) {
    function _msg(msg) {
        $.Msg('Leaderboard: ' + msg);
    }
    let m_bEventsRegistered = false;
    let m_season = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard();
    let m_myXuid = MyPersonaAPI.GetXuid();
    let m_lbType;
    let m_LeaderboardsStateChangeEventHandler;
    let m_FriendsListNameChangedEventHandler;
    let m_LobbyPlayerUpdatedEventHandler;
    function RegisterEventHandlers() {
        if (!m_bEventsRegistered) {
            m_LeaderboardsStateChangeEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', Leaderboard.RefreshLeaderBoard);
            m_FriendsListNameChangedEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', Leaderboard.UpdateName);
            m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", Init);
            m_bEventsRegistered = true;
            _msg('registering');
        }
    }
    Leaderboard.RegisterEventHandlers = RegisterEventHandlers;
    function UnregisterEventHandlers() {
        if (m_bEventsRegistered) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', m_LeaderboardsStateChangeEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', m_FriendsListNameChangedEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_PartyList_RebuildPartyList', m_LobbyPlayerUpdatedEventHandler);
            m_bEventsRegistered = false;
            _msg('unregistering');
        }
    }
    Leaderboard.UnregisterEventHandlers = UnregisterEventHandlers;
    function Init() {
        _msg('init');
        RegisterEventHandlers();
        m_lbType = $.GetContextPanel().GetAttributeString('lbtype', '');
        if (m_season === '') {
            $.Msg('Leaderboard: No leaderboard type specified');
            return;
        }
        _SetTitle();
        _SetPointsTitle();
        // _MakeTabs( aTypes );
        _UpdateLeaderboard();
        _UpdateParty();
        _FillNavPanels();
        _ShowGlobalRank();
    }
    Leaderboard.Init = Init;
    ;
    function _GetInternalLBName() {
        if (m_lbType !== 'party')
            return m_season;
        return m_season + '.party';
        // Note: if you want the leaderboard filtered to just friends, add ".friends" to the name.
    }
    function _UpdateParty() {
        if (m_lbType !== 'party')
            return;
        function OnMouseOver(xuid) {
            $.DispatchEvent('LeaderboardHoverPlayer', xuid);
        }
        ;
        function OnMouseOut() {
            $.DispatchEvent('LeaderboardHoverPlayer', '');
        }
        ;
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        elParent.RemoveAndDeleteChildren();
        let count = 5;
        if (LobbyAPI.IsSessionActive()) {
            let members = LobbyAPI.GetSessionSettings().members;
            for (let m = 0; m < count; m++) {
                if (m < members.numPlayers) {
                    let oPlayer = {};
                    oPlayer.xuid = members['machine' + m].player0.xuid;
                    let sPartyLBName = _GetInternalLBName();
                    oPlayer.score = LeaderboardsAPI.GetEntryScoreByXuid(sPartyLBName, oPlayer.xuid);
                    oPlayer.globalpct = LeaderboardsAPI.GetEntryGlobalPctByXuid(sPartyLBName, oPlayer.xuid);
                    let detailsHandle = LeaderboardsAPI.GetEntryDetailsHandleByXuid(sPartyLBName, oPlayer.xuid);
                    oPlayer.MatchesWon = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesWon');
                    oPlayer.MatchesTied = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesTied');
                    oPlayer.MatchesLost = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesLost');
                    let RankWindowStats = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'RankWindowStats');
                    oPlayer.windowStats = MatchDraftAPI.DecodePackedWindowStats(1, RankWindowStats);
                    const elEntry = _AddPlayer(oPlayer, m);
                    elEntry.SetPanelEvent('onmouseover', OnMouseOver.bind(elEntry, oPlayer.xuid));
                    elEntry.SetPanelEvent('onmouseout', OnMouseOut);
                }
                else {
                    _AddPlayer(null, m);
                }
            }
        }
    }
    function _SetTitle() {
        $.GetContextPanel().SetDialogVariable('leaderboard-title', $.Localize('#leaderboard_title_' + String(m_lbType)));
    }
    ;
    let _SetPointsTitle = function () {
        let strPointsTitle = $.GetContextPanel().GetAttributeString('points-title', '');
        if (strPointsTitle !== '') {
            //		$.GetContextPanel().FindChildInLayoutFile( 'id-list-column-header-points' ).text = $.Localize( strPointsTitle );
        }
    };
    function _FillNavPanels() {
        $('#jsNavSeason').visible = false;
        $('#jsNavLocation').visible = false;
        if (m_lbType !== 'general')
            return;
        // SEASON
        let elSeasonDropdown = $('#jsNavSeason');
        elSeasonDropdown.visible = true;
        elSeasonDropdown.RemoveAllOptions();
        let nSeasons = LeaderboardsAPI.GetAllSeasonPremierLeaderboardsCount();
        for (let i = 0; i < nSeasons; i++) {
            let szSeason = LeaderboardsAPI.GetSeasonPremierLeaderboardByIndex(i);
            _msg(szSeason);
            const elEntry = $.CreatePanel('Label', elSeasonDropdown, szSeason, {
                'class': ''
            });
            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#' + szSeason + '_name');
            elSeasonDropdown.AddOption(elEntry);
        }
        elSeasonDropdown.SetSelected(LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard());
        // LOCATION
        $('#jsNavLocation').visible = true;
    }
    let _ShowGlobalRank = function () {
        let showRank = $.GetContextPanel().GetAttributeString('showglobaloverride', 'true');
        $.GetContextPanel().SetHasClass('hide-global-rank', showRank === 'false');
    };
    let _UpdateLeaderboard = function () {
        let internalLBName = _GetInternalLBName();
        $.Msg('Leaderboard:  ' + internalLBName);
        let status = LeaderboardsAPI.GetState(internalLBName);
        $.Msg('Leaderboard Status: ' + status);
        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');
        if ("none" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
            LeaderboardsAPI.Refresh(internalLBName);
        }
        if ("loading" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
        }
        if ("ready" == status) {
            let count = LeaderboardsAPI.GetCount(internalLBName);
            if (count === 0 && m_lbType !== 'party') {
                elData.SetHasClass('hidden', false);
                elStatus.SetHasClass('hidden', true);
                elLeaderboardList.SetHasClass('hidden', true);
            }
            else if (m_lbType === 'general') {
                elLeaderboardList.SetHasClass('hidden', false);
                elStatus.SetHasClass('hidden', true);
                elData.SetHasClass('hidden', true);
                _FillOutEntries();
            }
            else if (m_lbType === 'party') {
                elLeaderboardList.SetHasClass('hidden', false);
                elStatus.SetHasClass('hidden', true);
                elData.SetHasClass('hidden', true);
                _UpdateParty();
            }
            if (1 <= LeaderboardsAPI.HowManyMinutesAgoCached(internalLBName)) {
                LeaderboardsAPI.Refresh(internalLBName);
            }
        }
    };
    function _AddPlayer(oPlayer, index) {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = $.CreatePanel("Button", elParent, oPlayer ? oPlayer.xuid : '');
        elEntry.BLoadLayoutSnippet("leaderboard-entry");
        elEntry.SetDialogVariable('player-rank', '');
        elEntry.SetDialogVariable('player-name', '');
        elEntry.SetDialogVariable('player-wins', '');
        elEntry.SetDialogVariable('player-winrate', '');
        elEntry.SetDialogVariable('player-percentile', '');
        let elAvatar = elEntry.FindChildInLayoutFile('leaderboard-entry-avatar');
        elAvatar.visible = false;
        elEntry.SetHasClass('no-hover', oPlayer === null);
        elEntry.SetHasClass('background', index % 2 === 0);
        if (oPlayer) {
            function _AddOpenPlayerCardAction(elPanel, xuid) {
                let openCard = function (xuid) {
                    // Tell the sidebar to stay open and ignore its on mouse event while the context menu is open
                    $.DispatchEvent('SidebarContextMenuActive', true);
                    if (xuid !== 0) {
                        let contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, function () {
                            $.DispatchEvent('SidebarContextMenuActive', false);
                        });
                        contextMenuPanel.AddClass("ContextMenu_NoArrow");
                    }
                };
                elPanel.SetPanelEvent("onactivate", openCard.bind(undefined, xuid));
                elPanel.SetPanelEvent("oncontextmenu", openCard.bind(undefined, xuid));
            }
            elEntry.enabled = true;
            elAvatar.PopulateFromSteamID(oPlayer.xuid);
            elAvatar.visible = true;
            let elRatingEmblem = elEntry.FindChildTraverse('jsRatingEmblem');
            if (m_lbType === 'party') {
                const teamColorIdx = PartyListAPI.GetPartyMemberSetting(oPlayer.xuid, 'game/teamcolor');
                const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
                elAvatar.style.border = '2px solid rgb(' + teamColorRgb + ')';
            }
            _AddOpenPlayerCardAction(elEntry, oPlayer.xuid);
            elEntry.SetDialogVariable('player-name', FriendsListAPI.GetFriendName(oPlayer.xuid));
            elEntry.SetDialogVariable('player-rank', String(index + 1));
            // set the cs rating explicitly if from the leaderboard,
            if (m_lbType === 'party') {
                elRatingEmblem.SetAttributeString('api', 'partylist');
                RatingEmblem.SetXuid(elRatingEmblem, oPlayer.xuid);
            }
            else {
                elRatingEmblem.SetAttributeString('api', 'leaderboard');
                RatingEmblem.SetXuid(elRatingEmblem, oPlayer.xuid, m_season);
            }
            if (oPlayer.score > 0) {
                elEntry.SetDialogVariable('player-wins', String(oPlayer.MatchesWon));
                let winRate = oPlayer.MatchesWon * 100.00 / (oPlayer.MatchesWon + oPlayer.MatchesTied + oPlayer.MatchesLost);
                elEntry.SetDialogVariable('player-winrate', winRate.toFixed(2) + '%');
                elEntry.SetDialogVariable('player-percentile', oPlayer.globalpct.toFixed(0) + '%');
            }
            else {
                elEntry.SetDialogVariable('player-wins', '-');
                elEntry.SetDialogVariable('player-winrate', '-');
                elEntry.SetDialogVariable('player-percentile', '-');
            }
        }
        return elEntry;
    }
    function _FillOutEntries() {
        let internalLBName = _GetInternalLBName();
        let nPlayers = LeaderboardsAPI.GetCount(internalLBName);
        const nEntries = Math.max(21, nPlayers);
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        elParent.RemoveAndDeleteChildren();
        for (let i = 0; i < nEntries; i++) {
            if (i < nPlayers) {
                let oPlayer = {};
                oPlayer.xuid = LeaderboardsAPI.GetEntryXuidByIndex(internalLBName, i);
                oPlayer.score = LeaderboardsAPI.GetEntryScoreByIndex(internalLBName, i); // cs rating
                oPlayer.globalpct = LeaderboardsAPI.GetEntryGlobalPctByIndex(internalLBName, i); // global pct
                let detailsHandle = LeaderboardsAPI.GetEntryDetailsHandleByIndex(internalLBName, i); // global pct
                oPlayer.MatchesWon = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesWon');
                oPlayer.MatchesTied = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesTied');
                oPlayer.MatchesLost = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'MatchesLost');
                let RankWindowStats = LeaderboardsAPI.GetDetailsMatchEntryStat(detailsHandle, 'RankWindowStats');
                oPlayer.windowStats = MatchDraftAPI.DecodePackedWindowStats(1, RankWindowStats);
                $.Msg('leaderboard spidergraph stats: ' + oPlayer.windowStats);
                _AddPlayer(oPlayer, i);
            }
            else {
                _AddPlayer(null, i);
            }
        }
        _HighightMySelf();
    }
    ;
    let _HighightMySelf = function () {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = elParent.FindChildInLayoutFile(m_myXuid);
        if (elEntry) {
            elEntry.AddClass('local-player');
            elEntry.ScrollParentToMakePanelFit(1, false);
        }
    };
    function RefreshLeaderBoard(type) {
        if (m_season === type) {
            _UpdateLeaderboard();
            return;
        }
    }
    Leaderboard.RefreshLeaderBoard = RefreshLeaderBoard;
    ;
    function UpdateName(xuid) {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = elParent.FindChildInLayoutFile(xuid);
        if (elEntry) {
            elEntry.SetDialogVariable('player-name', FriendsListAPI.GetFriendName(xuid));
        }
    }
    Leaderboard.UpdateName = UpdateName;
    ;
})(Leaderboard || (Leaderboard = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    $.RegisterForUnhandledEvent("CSGOHideMainMenu", Leaderboard.UnregisterEventHandlers);
    $.RegisterForUnhandledEvent("CSGOShowMainMenu", Leaderboard.RegisterEventHandlers);
    $.Schedule(0.1, Leaderboard.Init); // too early and we can't pull the attribute 'type' from the panel
})();
