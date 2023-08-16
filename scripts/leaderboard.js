"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="common/teamcolor.ts" />
var Leaderboard;
(function (Leaderboard) {
    function _msg(msg) {
        $.Msg('leaderboard.ts: ' + msg);
    }
    let m_bEventsRegistered = false;
    let m_myXuid = MyPersonaAPI.GetXuid();
    let m_lbType;
    let m_LeaderboardsStateChangeEventHandler;
    let m_FriendsListNameChangedEventHandler;
    let m_LobbyPlayerUpdatedEventHandler;
    function RegisterEventHandlers() {
        if (!m_bEventsRegistered) {
            m_LeaderboardsStateChangeEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', _RefreshLeaderBoard);
            m_FriendsListNameChangedEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', _UpdateName);
            m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", _UpdatePartyList);
            m_bEventsRegistered = true;
            //		_msg( 'registering' );
        }
        UpdateLeaderboard();
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
        //	_msg( 'init' );
        RegisterEventHandlers();
        m_lbType = $.GetContextPanel().GetAttributeString('lbtype', '');
        _SetTitle();
        _InitNavPanels();
        if (m_lbType === 'party') {
            _UpdatePartyList();
            // check local players display name
            if (LeaderboardsAPI.DoesTheLocalPlayerNeedALeaderboardSafeNameSet()) {
                _RegisterLeaderboardSafeName();
            }
        }
        else if (m_lbType === 'general') {
            UpdateLeaderboard();
        }
        _ShowGlobalRank();
    }
    Leaderboard.Init = Init;
    ;
    function _SetTitle() {
        $.GetContextPanel().SetDialogVariable('leaderboard-title', $.Localize('#leaderboard_title_' + String(m_lbType)));
    }
    ;
    function _InitSeasonDropdown() {
        // SEASON
        let elSeasonDropdown = $('#jsNavSeason');
        elSeasonDropdown.visible = true;
        elSeasonDropdown.RemoveAllOptions();
        let seasons = LeaderboardsAPI.GetAllSeasonPremierLeaderboards();
        for (let i = 0; i < seasons.length; i++) {
            let szSeason = seasons[i];
            const elEntry = $.CreatePanel('Label', elSeasonDropdown, szSeason, {
                'class': ''
            });
            elEntry.SetAttributeString('season-suffix', szSeason);
            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#' + szSeason + '_name');
            elSeasonDropdown.AddOption(elEntry);
        }
        elSeasonDropdown.SetSelected(LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard());
    }
    function _InitLocationDropdown() {
        // LOCATION
        let elLocationDropdown = $('#jsNavLocation');
        elLocationDropdown.visible = true;
        elLocationDropdown.RemoveAllOptions();
        let locales = LeaderboardsAPI.GetAllSeasonPremierLeaderboardRegions();
        // ideal, but unsupported
        //	locales.sort( ( a: string, b: string ) => { return a.localeCompare( b ); } );
        locales.sort();
        locales.unshift('World');
        locales.unshift('Friends');
        for (let i = 0; i < locales.length; i++) {
            let szLocale = locales[i];
            const elEntry = $.CreatePanel('Label', elLocationDropdown, szLocale);
            if (!_FindLocalPlayerInLocale(szLocale)) {
                elEntry.style.washColor = 'gray';
            }
            switch (szLocale) {
                case 'World':
                    break;
                case 'Friends':
                    elEntry.SetAttributeString('friendslb', 'true');
                    break;
                default:
                    elEntry.SetAttributeString('location-suffix', '_' + szLocale);
            }
            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#leaderboard_location_' + szLocale);
            elLocationDropdown.AddOption(elEntry);
        }
        elLocationDropdown.SetSelected('World');
    }
    function _FindLocalPlayerInLocale(locale) {
        let arrLBsOfInterest = LeaderboardsAPI.GetPremierLeaderboardsOfInterest();
        for (let i = 0; i < arrLBsOfInterest.length; i++) {
            if (arrLBsOfInterest[i].split('_').slice(-1)[0] === locale.toLowerCase())
                return true;
            if (arrLBsOfInterest[i].split('.').slice(-1)[0] === locale.toLowerCase())
                return true;
        }
        return false;
    }
    function _GetLeaderboardName() {
        // Note: if you want the leaderboard filtered to just friends, add ".friends" to the name.
        let leaderboard = '';
        if (m_lbType === 'general') {
            let elSeasonDropdown = $('#jsNavSeason');
            let elLocationDropdown = $('#jsNavLocation');
            let elSelfToggle = $('#jsToggleSelf');
            let elLocale = elLocationDropdown.GetSelected();
            let elSeason = elSeasonDropdown.GetSelected();
            if (elLocale && elSeason) {
                if (elLocale.GetAttributeString('friendslb', '') === 'true') {
                    leaderboard = elSeason.GetAttributeString('season-suffix', '') + '.friends';
                }
                else {
                    leaderboard = elSeason.GetAttributeString('season-suffix', '') + elLocale.GetAttributeString('location-suffix', '');
                    if (elSelfToggle.IsSelected()) {
                        leaderboard = leaderboard + '.self';
                    }
                }
            }
        }
        else if (m_lbType === 'party') {
            leaderboard = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard() + '.party';
        }
        //	_msg( leaderboard );
        return leaderboard;
    }
    function _InitNavPanels() {
        $('#jsNavSeason').visible = false;
        $('#jsNavLocation').visible = false;
        $('#jsToggleSelf').visible = m_lbType === 'general';
        if (m_lbType === 'party')
            return;
        _InitSeasonDropdown();
        _InitLocationDropdown();
    }
    let _ShowGlobalRank = function () {
        let showRank = $.GetContextPanel().GetAttributeString('showglobaloverride', 'true');
        $.GetContextPanel().SetHasClass('hide-global-rank', showRank === 'false');
    };
    function UpdateLeaderboard() {
        let leaderboard = _GetLeaderboardName();
        $.Msg('Leaderboard:  ' + leaderboard);
        // control the go-to-self button since it's incompatible with .friends leaderboard.
        let bFriendsLb = leaderboard.indexOf('.friends') !== -1;
        $.GetContextPanel().FindChildInLayoutFile('jsToggleSelf').enabled = !bFriendsLb;
        if (bFriendsLb)
            $.GetContextPanel().FindChildInLayoutFile('jsToggleSelf').SetSelected(false);
        let status = LeaderboardsAPI.GetState(leaderboard);
        $.Msg('Leaderboard Status: ' + status);
        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');
        if ("none" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
            LeaderboardsAPI.Refresh(leaderboard);
        }
        else if ("loading" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
        }
        else if ("ready" == status) {
            let count = LeaderboardsAPI.GetCount(leaderboard);
            if (count === 0) {
                elData.SetHasClass('hidden', false);
                elStatus.SetHasClass('hidden', true);
                elLeaderboardList.SetHasClass('hidden', true);
            }
            else {
                elLeaderboardList.SetHasClass('hidden', false);
                elStatus.SetHasClass('hidden', true);
                elData.SetHasClass('hidden', true);
                _FillOutEntries();
            }
            if (1 <= LeaderboardsAPI.HowManyMinutesAgoCached(leaderboard)) {
                LeaderboardsAPI.Refresh(leaderboard);
            }
        }
    }
    Leaderboard.UpdateLeaderboard = UpdateLeaderboard;
    ;
    function _AddPlayer(oPlayer, index) {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = $.CreatePanel("Button", elParent, oPlayer ? oPlayer.XUID : '');
        elEntry.BLoadLayoutSnippet("leaderboard-entry");
        elEntry.SetDialogVariable('player-rank', '');
        elEntry.SetDialogVariable('player-name', '');
        elEntry.SetDialogVariable('player-wins', '');
        elEntry.SetDialogVariable('player-winrate', '');
        elEntry.SetDialogVariable('player-percentile', '');
        elEntry.SetHasClass('no-hover', oPlayer === null);
        elEntry.SetHasClass('background', index % 2 === 0);
        let elAvatar = elEntry.FindChildInLayoutFile('leaderboard-entry-avatar');
        elAvatar.visible = false;
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
            elAvatar.PopulateFromSteamID(oPlayer.XUID);
            elAvatar.visible = m_lbType === 'party';
            let elRatingEmblem = elEntry.FindChildTraverse('jsRatingEmblem');
            if (m_lbType === 'party') {
                const teamColorIdx = PartyListAPI.GetPartyMemberSetting(oPlayer.XUID, 'game/teamcolor');
                const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
                elAvatar.style.border = '2px solid rgb(' + teamColorRgb + ')';
            }
            _AddOpenPlayerCardAction(elEntry, oPlayer.XUID);
            let options;
            // set the cs rating explicitly if from the leaderboard,
            if (m_lbType === 'party') {
                options =
                    {
                        root_panel: elRatingEmblem,
                        xuid: oPlayer.XUID,
                        api: 'partylist',
                        rating_type: 'Premier',
                        do_fx: true,
                    };
            }
            else {
                options =
                    {
                        root_panel: elRatingEmblem,
                        xuid: '',
                        api: 'leaderboard',
                        rating_type: 'Premier',
                        do_fx: true,
                        leaderboard_details: oPlayer
                    };
            }
            RatingEmblem.SetXuid(options);
            elEntry.SetDialogVariable('player-name', oPlayer.displayName ?? FriendsListAPI.GetFriendName(oPlayer.XUID));
            if (oPlayer.rank) {
                elEntry.SetDialogVariable('player-wins', String(oPlayer.matchesWon));
                elEntry.SetDialogVariable('player-rank', String(oPlayer.rank));
                let matchesPlayed = (oPlayer.matchesWon ? oPlayer.matchesWon : 0) +
                    (oPlayer.matchesTied ? oPlayer.matchesTied : 0) +
                    (oPlayer.matchesLost ? oPlayer.matchesLost : 0);
                let winRate = matchesPlayed === 0 ? 0 : oPlayer.matchesWon * 100.00 / matchesPlayed;
                elEntry.SetDialogVariable('player-winrate', winRate.toFixed(2) + '%');
                elEntry.SetDialogVariable('player-percentile', oPlayer.pct.toFixed(0) + '%');
            }
            else {
                elEntry.SetDialogVariable('player-rank', '-');
                elEntry.SetDialogVariable('player-wins', '-');
                elEntry.SetDialogVariable('player-winrate', '-');
                elEntry.SetDialogVariable('player-percentile', '-');
            }
        }
        return elEntry;
    }
    function _UpdatePartyList() {
        if (m_lbType !== 'party')
            return;
        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');
        elLeaderboardList.SetHasClass('hidden', false);
        elStatus.SetHasClass('hidden', true);
        elData.SetHasClass('hidden', true);
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
        if (LobbyAPI.IsSessionActive()) {
            let members = LobbyAPI.GetSessionSettings().members;
            for (let m = 0; m < members.numPlayers; m++) {
                let xuid = members['machine' + m].player0.xuid;
                let oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByXuid(_GetLeaderboardName(), xuid);
                // party member isn't on the leaderboards
                if (!oPlayer.XUID) {
                    oPlayer.XUID = xuid;
                    oPlayer.score = PartyListAPI.GetFriendCompetitiveRank(xuid);
                }
                // don't use locked leaderboard name for party lister
                oPlayer.displayName = PartyListAPI.GetFriendName(xuid);
                const elEntry = _AddPlayer(oPlayer, m);
                elEntry.SetPanelEvent('onmouseover', OnMouseOver.bind(elEntry, oPlayer.XUID));
                elEntry.SetPanelEvent('onmouseout', OnMouseOut);
            }
        }
    }
    function _UpdateName(xuid) {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = elParent.FindChildInLayoutFile(xuid);
        if (elEntry) {
            elEntry.SetDialogVariable('player-name', PartyListAPI.GetFriendName(xuid));
        }
    }
    ;
    function _RegisterLeaderboardSafeName() {
        let data = $.GetContextPanel().Data();
        let bAlreadyAsked = data && data.bPromptedForLeaderboardSafeName;
        if (bAlreadyAsked)
            return;
        UiToolkitAPI.ShowCustomLayoutPopup('', 'file://{resources}/layout/popups/popup_leaderboard_namelock.xml');
        data.bPromptedForLeaderboardSafeName = true;
    }
    function _FillOutEntries() {
        let leaderboard = _GetLeaderboardName();
        let nPlayers = LeaderboardsAPI.GetCount(leaderboard);
        _msg(nPlayers + ' accounts found.');
        const nEntries = Math.max(20, nPlayers);
        let elParent = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        elParent.RemoveAndDeleteChildren();
        for (let i = 0; i < nEntries; i++) {
            if (i < nPlayers) {
                let oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByIndex(_GetLeaderboardName(), i);
                _AddPlayer(oPlayer, i);
            }
            else {
                // empty rows with alternating backgrounds
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
    function _RefreshLeaderBoard(type) {
        if (_GetLeaderboardName() === type) {
            if (m_lbType === 'party') {
                _UpdatePartyList();
            }
            else if (m_lbType === 'general') {
                UpdateLeaderboard();
            }
            return;
        }
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZGVyYm9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFkZXJib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUF5QztBQUN6Qyw0Q0FBNEM7QUFjNUMsSUFBVSxXQUFXLENBa2pCcEI7QUFsakJELFdBQVUsV0FBVztJQUVwQixTQUFTLElBQUksQ0FBRyxHQUFXO1FBRTFCLENBQUMsQ0FBQyxHQUFHLENBQUUsa0JBQWtCLEdBQUcsR0FBRyxDQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO0lBQ2hDLElBQUksUUFBUSxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN0QyxJQUFJLFFBQTJCLENBQUM7SUFFaEMsSUFBSSxxQ0FBNkMsQ0FBQztJQUNsRCxJQUFJLG9DQUE0QyxDQUFDO0lBQ2pELElBQUksZ0NBQXdDLENBQUM7SUFFN0MsU0FBZ0IscUJBQXFCO1FBRXBDLElBQUssQ0FBQyxtQkFBbUIsRUFDekI7WUFDQyxxQ0FBcUMsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsNENBQTRDLEVBQUUsbUJBQW1CLENBQUUsQ0FBQztZQUN6SSxvQ0FBb0MsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsMkNBQTJDLEVBQUUsV0FBVyxDQUFFLENBQUM7WUFDL0gsZ0NBQWdDLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDhDQUE4QyxFQUFFLGdCQUFnQixDQUFFLENBQUM7WUFFbkksbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1lBRTdCLDBCQUEwQjtTQUN4QjtRQUVELGlCQUFpQixFQUFFLENBQUM7SUFFckIsQ0FBQztJQWZlLGlDQUFxQix3QkFlcEMsQ0FBQTtJQUVELFNBQWdCLHVCQUF1QjtRQUV0QyxJQUFLLG1CQUFtQixFQUN4QjtZQUNDLENBQUMsQ0FBQywyQkFBMkIsQ0FBRSw0Q0FBNEMsRUFBRSxxQ0FBcUMsQ0FBRSxDQUFDO1lB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