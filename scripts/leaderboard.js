"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="common/teamcolor.ts" />
const regionToRegionName = {
    'namc': 'NorthAmerica',
    'samc': 'SouthAmerica',
    'euro': 'Europe',
    'asia': 'Asia',
    'ausc': 'Australia',
    'afrc': 'Africa',
    'cn': 'China',
};
var Leaderboard;
(function (Leaderboard) {
    function _msg(msg) {
        $.Msg('leaderboard.ts: ' + msg);
    }
    let m_bEventsRegistered = false;
    let m_myXuid = MyPersonaAPI.GetXuid();
    let m_lbType;
    let m_LeaderboardsDirtyEventHandler;
    let m_LeaderboardsStateChangeEventHandler;
    let m_FriendsListNameChangedEventHandler;
    let m_LobbyPlayerUpdatedEventHandler;
    let m_NameLockEventHandler;
    let m_leaderboardName = '';
    function RegisterEventHandlers() {
        _msg('RegisterEventHandlers');
        if (!m_bEventsRegistered) {
            m_LeaderboardsDirtyEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_Dirty', OnLeaderboardDirty);
            m_LeaderboardsStateChangeEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', OnLeaderboardStateChange);
            m_FriendsListNameChangedEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', _UpdateName);
            if (m_lbType === 'party') {
                m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", _UpdatePartyList);
            }
            if (m_lbType === 'general') {
                m_NameLockEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', _UpdateNameLockButton);
            }
            m_bEventsRegistered = true;
        }
    }
    Leaderboard.RegisterEventHandlers = RegisterEventHandlers;
    function UnregisterEventHandlers() {
        _msg('UnregisterEventHandlers');
        if (m_bEventsRegistered) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_Leaderboards_Dirty', m_LeaderboardsDirtyEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', m_LeaderboardsStateChangeEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', m_FriendsListNameChangedEventHandler);
            if (m_lbType === 'party') {
                $.UnregisterForUnhandledEvent('PanoramaComponent_PartyList_RebuildPartyList', m_LobbyPlayerUpdatedEventHandler);
            }
            if (m_lbType === 'general') {
                $.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', m_NameLockEventHandler);
            }
            m_bEventsRegistered = false;
        }
    }
    Leaderboard.UnregisterEventHandlers = UnregisterEventHandlers;
    function Init() {
        _msg('init');
        m_lbType = $.GetContextPanel().GetAttributeString('lbtype', '');
        RegisterEventHandlers(); // this is also done in ReadyForDisplay which will fire later (but we make sure to not double-register)
        _SetTitle();
        _InitNavPanels();
        _UpdateLeaderboardName();
        if (m_lbType === 'party') {
            _UpdatePartyList();
            // check local players display name
            if (LeaderboardsAPI.DoesTheLocalPlayerNeedALeaderboardSafeNameSet()) {
                _AutomaticLeaderboardNameLockPopup();
            }
        }
        else if (m_lbType === 'general') {
            UpdateLeaderboardList();
            $.Schedule(0.5, _UpdateNameLockButton);
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
        let lbs = LeaderboardsAPI.GetAllSeasonPremierLeaderboards();
        for (let i = 0; i < lbs.length; i++) {
            let szLb = lbs[i];
            const elEntry = $.CreatePanel('Label', elSeasonDropdown, szLb, {
                'class': ''
            });
            elEntry.SetAttributeString('leaderboard', szLb);
            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#' + szLb + '_name');
            elSeasonDropdown.AddOption(elEntry);
        }
        elSeasonDropdown.SetSelected(LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard());
    }
    function _InitLocationDropdown() {
        // LOCATION
        let elLocationDropdown = $('#jsNavLocation');
        elLocationDropdown.visible = true;
        elLocationDropdown.RemoveAllOptions();
        let regions = LeaderboardsAPI.GetAllSeasonPremierLeaderboardRegions();
        // ideal, but unsupported
        //	regions.sort( ( a: string, b: string ) => { return a.regionCompare( b ); } );
        regions.sort();
        regions.unshift('World');
        regions.unshift('Friends');
        let defaultRegion = 'World';
        for (let i = 0; i < regions.length; i++) {
            const szRegion = regions[i];
            const elEntry = $.CreatePanel('Label', elLocationDropdown, szRegion);
            const bCurrentRegion = _FindLocalPlayerInRegion(szRegion);
            elEntry.SetHasClass('of-interest', bCurrentRegion);
            switch (szRegion) {
                case 'World':
                    elEntry.SetAttributeString('leaderboard-class', szRegion.toLowerCase());
                    break;
                case 'Friends':
                    elEntry.SetAttributeString('friendslb', 'true');
                    elEntry.SetAttributeString('leaderboard-class', 'friends');
                    break;
                default:
                    elEntry.SetAttributeString('location-suffix', '_' + szRegion);
                    elEntry.SetAttributeString('leaderboard-class', szRegion.toLowerCase());
                    if (bCurrentRegion) {
                        defaultRegion = szRegion;
                    }
            }
            elEntry.SetAcceptsFocus(true);
            elEntry.text = $.Localize('#leaderboard_region_' + szRegion);
            elLocationDropdown.AddOption(elEntry);
        }
        if (MyPersonaAPI.GetLauncherType() === "perfectworld") {
            defaultRegion = 'friends';
        }
        elLocationDropdown.SetSelected(defaultRegion);
    }
    function _getRegionFromLeaderboardName(lbname) {
        return lbname.split('_').slice(-1)[0];
    }
    function _isLeaderboardTheFriendsLeaderboard(lbname) {
        return lbname.split('.').slice(-1)[0] === 'friends';
    }
    function _FindLocalPlayerInRegion(region) {
        let arrLBsOfInterest = LeaderboardsAPI.GetPremierLeaderboardsOfInterest();
        let elSeasonDropdown = $('#jsNavSeason');
        let elSeason = elSeasonDropdown.GetSelected();
        let lb = elSeason.GetAttributeString('leaderboard', '');
        for (let i = 0; i < arrLBsOfInterest.length; i++) {
            switch (region) {
                case 'World':
                    if (arrLBsOfInterest[i] === lb)
                        return true;
                    break;
                case 'Friends':
                    if (_isLeaderboardTheFriendsLeaderboard(arrLBsOfInterest[i]))
                        return true;
                    break;
                default:
                    if (_getRegionFromLeaderboardName(arrLBsOfInterest[i]) === region)
                        return true;
            }
        }
        return false;
    }
    function _UpdateLeaderboardName() {
        // Note: if you want the leaderboard filtered to just friends, add ".friends" to the name.
        if (m_lbType === 'general') {
            let elSeasonDropdown = $('#jsNavSeason');
            let elLocationDropdown = $('#jsNavLocation');
            let elregion = elLocationDropdown.GetSelected();
            let elSeason = elSeasonDropdown.GetSelected();
            if (elregion && elSeason) {
                if (elregion.GetAttributeString('friendslb', '') === 'true') {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + '.friends';
                }
                else {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + elregion.GetAttributeString('location-suffix', '');
                }
                $.GetContextPanel().SwitchClass('region', elregion.GetAttributeString('leaderboard-class', ''));
            }
        }
        else if (m_lbType === 'party') {
            m_leaderboardName = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard() + '.party';
        }
        _msg(m_leaderboardName);
        return m_leaderboardName;
    }
    function _UpdateNameLockButton() {
        let elNameButton = $.GetContextPanel().FindChildTraverse('lbNameButton');
        elNameButton.visible = true;
        let status = MyPersonaAPI.GetMyLeaderboardNameStatus();
        let needsName = LeaderboardsAPI.DoesTheLocalPlayerNeedALeaderboardSafeNameSet();
        let showButton = status !== '' || needsName;
        elNameButton.visible = showButton;
        elNameButton.SetHasClass('no-hover', status !== '');
        elNameButton.ClearPanelEvent('onactivate');
        let buttonText = '';
        if (status) {
            let name = MyPersonaAPI.GetMyLeaderboardName();
            elNameButton.SetDialogVariable('leaderboard-name', name);
            buttonText = $.Localize('#leaderboard_namelock_button_hasname', elNameButton);
            let tooltipText = '';
            switch (status) {
                case 'submitted':
                    elNameButton.SwitchClass('status', 'submitted');
                    tooltipText = $.Localize('#leaderboard_namelock_button_tooltip_submitted');
                    break;
                case 'approved':
                    elNameButton.SwitchClass('status', 'approved');
                    tooltipText = $.Localize('#leaderboard_namelock_button_tooltip_approved');
                    break;
            }
            function onMouseOver(id, tooltipText) {
                UiToolkitAPI.ShowTextTooltip(id, tooltipText);
            }
            ;
            elNameButton.SetPanelEvent('onmouseover', onMouseOver.bind(elNameButton, elNameButton.id, tooltipText));
            elNameButton.SetPanelEvent('onmouseout', function () {
                UiToolkitAPI.HideTextTooltip();
            });
        }
        else if (needsName) {
            buttonText = $.Localize('#leaderboard_namelock_button_needsname');
            elNameButton.SetPanelEvent('onactivate', _NameLockPopup);
        }
        elNameButton.SetDialogVariable('leaderboard_namelock_button', buttonText);
    }
    function _InitNavPanels() {
        $('#jsNavSeason').visible = false;
        $('#jsNavLocation').visible = false;
        $('#jsGoToTop').visible = m_lbType === 'general';
        $('#jsGoToMe').visible = m_lbType === 'general';
        if (m_lbType === 'party')
            return;
        _InitSeasonDropdown();
        _InitLocationDropdown();
    }
    let _ShowGlobalRank = function () {
        let showRank = $.GetContextPanel().GetAttributeString('showglobaloverride', 'true');
        $.GetContextPanel().SetHasClass('hide-global-rank', showRank === 'false');
    };
    function _UpdateGoToMeButton() {
        let lb = m_leaderboardName;
        let arrLBsOfInterest = LeaderboardsAPI.GetPremierLeaderboardsOfInterest();
        let myIndex = LeaderboardsAPI.GetIndexByXuid(lb, m_myXuid);
        let bPresent = arrLBsOfInterest.includes(lb) && myIndex !== -1;
        $.GetContextPanel().FindChildInLayoutFile('jsGoToMe').enabled = bPresent;
    }
    function UpdateLeaderboardList() {
        _msg('-------------- UpdateLeaderboardList ' + m_leaderboardName);
        _UpdateGoToMeButton();
        let status = LeaderboardsAPI.GetState(m_leaderboardName);
        _msg(status + '');
        let elStatus = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-loading');
        let elData = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-nodata');
        let elLeaderboardList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-list');
        if ("none" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
            LeaderboardsAPI.Refresh(m_leaderboardName);
            _msg('leaderboard status: requested');
        }
        else if ("loading" == status) {
            elStatus.SetHasClass('hidden', false);
            elData.SetHasClass('hidden', true);
            elLeaderboardList.SetHasClass('hidden', true);
        }
        else if ("ready" == status) {
            let count = LeaderboardsAPI.GetCount(m_leaderboardName);
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
            if (1 <= LeaderboardsAPI.HowManyMinutesAgoCached(m_leaderboardName)) {
                LeaderboardsAPI.Refresh(m_leaderboardName);
                _msg('leaderboard status: requested');
            }
        }
    }
    Leaderboard.UpdateLeaderboardList = UpdateLeaderboardList;
    ;
    function _AddPlayer(elEntry, oPlayer, index) {
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
                    if (xuid && (xuid !== 0)) {
                        // Tell the sidebar to stay open and ignore its on mouse event while the context menu is open
                        $.DispatchEvent('SidebarContextMenuActive', true);
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
            if (m_lbType === 'party' && oPlayer.XUID) {
                elAvatar.PopulateFromSteamID(oPlayer.XUID);
                elAvatar.visible = true;
            }
            else {
                elAvatar.visible = false;
            }
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
                        leaderboard_details: oPlayer,
                        full_details: false
                    };
            }
            else {
                options =
                    {
                        root_panel: elRatingEmblem,
                        rating_type: 'Premier',
                        do_fx: true,
                        leaderboard_details: oPlayer,
                        full_details: false
                    };
            }
            RatingEmblem.SetXuid(options);
            elEntry.SetDialogVariable('player-name', oPlayer.displayName ?? FriendsListAPI.GetFriendName(oPlayer.XUID));
            elEntry.Data().allowNameUpdates = !oPlayer.hasOwnProperty('displayName');
            elEntry.SetDialogVariable('player-wins', oPlayer.hasOwnProperty('matchesWon') ? String(oPlayer.matchesWon) : '-');
            let bHasRank = oPlayer.hasOwnProperty('rank') && oPlayer.rank > 0;
            elEntry.SetDialogVariableInt('player-rank', bHasRank ? oPlayer.rank : 0);
            elEntry.FindChildTraverse('jsPlayerRank').text = bHasRank ? $.Localize('{d:player-rank}', elEntry) : '-';
            let canShowWinRate = oPlayer.hasOwnProperty('matchesWon') && oPlayer.hasOwnProperty('matchesTied') && oPlayer.hasOwnProperty('matchesLost');
            if (canShowWinRate) {
                let matchesPlayed = (oPlayer.matchesWon ? oPlayer.matchesWon : 0) +
                    (oPlayer.matchesTied ? oPlayer.matchesTied : 0) +
                    (oPlayer.matchesLost ? oPlayer.matchesLost : 0);
                let winRate = matchesPlayed === 0 ? 0 : oPlayer.matchesWon * 100.00 / matchesPlayed;
                elEntry.SetDialogVariable('player-winrate', winRate.toFixed(2) + '%');
            }
            else {
                elEntry.SetDialogVariable('player-winrate', '-');
            }
            elEntry.SetDialogVariable('player-percentile', (oPlayer.hasOwnProperty('pct') && oPlayer.pct && oPlayer.pct > 0) ? oPlayer.pct.toFixed(0) + '%' : '-');
            elEntry.SetDialogVariable('player-region', (oPlayer.hasOwnProperty('region')) ? $.Localize('#leaderboard_region_abbr_' + regionToRegionName[oPlayer.region]) : '-');
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
        let elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        if (LobbyAPI.IsSessionActive()) {
            let members = LobbyAPI.GetSessionSettings().members;
            function GetPartyLBRow(idx) {
                let oPlayer = null;
                let machine = 'machine' + idx;
                let bValidPartyPlayer = members.hasOwnProperty(machine) && members[machine].hasOwnProperty('player0') &&
                    members[machine].player0.hasOwnProperty('xuid');
                if (!bValidPartyPlayer)
                    return null;
                let xuid = members[machine].player0.xuid;
                oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByXuid(m_leaderboardName, xuid);
                // party member isn't on the leaderboards
                if (!oPlayer.XUID) {
                    oPlayer.XUID = xuid;
                }
                // ... and always use the most up-to-date data from the party for the fields we can use
                if (PartyListAPI.GetFriendCompetitiveRankType(xuid) === "Premier") {
                    var partyScore = PartyListAPI.GetFriendCompetitiveRank(xuid);
                    var partyWins = PartyListAPI.GetFriendCompetitiveWins(xuid);
                    if (partyScore || partyWins) {
                        oPlayer.score = PartyListAPI.GetFriendCompetitiveRank(xuid);
                        oPlayer.matchesWon = PartyListAPI.GetFriendCompetitiveWins(xuid);
                        oPlayer.rankWindowStats = PartyListAPI.GetFriendCompetitivePremierWindowStatsObject(xuid);
                        _msg('PartyList player ' + xuid + ' score=' + oPlayer.score + ' wins=' + oPlayer.matchesWon + ' data={' + JSON.stringify(oPlayer) + '}');
                    }
                }
                return oPlayer;
            }
            elList.SetLoadListItemFunction(function (parent, nPanelIdx, reusePanel) {
                let oPlayer = GetPartyLBRow(nPanelIdx);
                if (!reusePanel || reusePanel.IsValid()) {
                    reusePanel = $.CreatePanel("Button", elList, oPlayer ? oPlayer.XUID : '');
                    reusePanel.BLoadLayoutSnippet("leaderboard-entry");
                }
                _AddPlayer(reusePanel, oPlayer, nPanelIdx);
                reusePanel.SetPanelEvent('onmouseover', oPlayer ? OnMouseOver.bind(reusePanel, oPlayer.XUID) : OnMouseOut);
                reusePanel.SetPanelEvent('onmouseout', OnMouseOut);
                return reusePanel;
            });
            elList.UpdateListItems(PartyListAPI.GetCount());
        }
    }
    function OnLeaderboardDirty(type) {
        _msg('OnLeaderboardDirty');
        if (m_leaderboardName && m_leaderboardName === type) {
            LeaderboardsAPI.Refresh(m_leaderboardName);
        }
    }
    function ReadyForDisplay() {
        _msg("ReadyForDisplay");
        RegisterEventHandlers();
        if (m_leaderboardName) {
            LeaderboardsAPI.Refresh(m_leaderboardName);
        }
    }
    Leaderboard.ReadyForDisplay = ReadyForDisplay;
    ;
    function UnReadyForDisplay() {
        _msg("UnReadyForDisplay");
        UnregisterEventHandlers();
    }
    Leaderboard.UnReadyForDisplay = UnReadyForDisplay;
    ;
    function _UpdateName(xuid) {
        let elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        let elEntry = elList.FindChildInLayoutFile(xuid);
        if (elEntry && elEntry.Data().allowNameUpdates) {
            elEntry.SetDialogVariable('player-name', FriendsListAPI.GetFriendName(xuid));
        }
    }
    ;
    function _NameLockPopup() {
        UiToolkitAPI.ShowCustomLayoutPopup('', 'file://{resources}/layout/popups/popup_leaderboard_namelock.xml');
    }
    function _AutomaticLeaderboardNameLockPopup() {
        let data = $.GetContextPanel().Data();
        let bAlreadyAsked = data && data.bPromptedForLeaderboardSafeName;
        if (bAlreadyAsked)
            return;
        _NameLockPopup();
        data.bPromptedForLeaderboardSafeName = true;
    }
    function _FillOutEntries() {
        let nPlayers = LeaderboardsAPI.GetCount(m_leaderboardName);
        _msg(nPlayers + ' accounts found.');
        const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        elList.SetLoadListItemFunction(function (parent, nPanelIdx, reusePanel) {
            let oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByIndex(m_leaderboardName, nPanelIdx);
            if (!reusePanel || !reusePanel.IsValid()) {
                reusePanel = $.CreatePanel("Button", elList, oPlayer ? oPlayer.XUID : '');
                reusePanel.BLoadLayoutSnippet("leaderboard-entry");
            }
            _AddPlayer(reusePanel, oPlayer, nPanelIdx);
            reusePanel.SetHasClass('local-player', (oPlayer ? oPlayer.XUID : '') === m_myXuid);
            return reusePanel;
        });
        elList.UpdateListItems(nPlayers);
        $.DispatchEvent('ScrollToDelayLoadListItem', elList, 0, 'topleft', true);
    }
    ;
    function OnLeaderboardStateChange(type) {
        _msg('OnLeaderboardStateChange');
        _msg('leaderboard status: received');
        if (m_leaderboardName === type) {
            if (m_lbType === 'party') {
                _UpdatePartyList();
            }
            else if (m_lbType === 'general') {
                UpdateLeaderboardList();
            }
            return;
        }
    }
    Leaderboard.OnLeaderboardStateChange = OnLeaderboardStateChange;
    ;
    // called when we change one of the dropdowns and want a different leaderboard
    function OnLeaderboardChange() {
        _UpdateLeaderboardName();
        UpdateLeaderboardList();
    }
    Leaderboard.OnLeaderboardChange = OnLeaderboardChange;
    function GoToSelf() {
        let myIndex = LeaderboardsAPI.GetIndexByXuid(m_leaderboardName, m_myXuid);
        const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        $.DispatchEvent('ScrollToDelayLoadListItem', elList, myIndex, 'topleft', true);
    }
    Leaderboard.GoToSelf = GoToSelf;
    function GoToTop() {
        const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
        $.DispatchEvent('ScrollToDelayLoadListItem', elList, 0, 'topleft', true);
    }
    Leaderboard.GoToTop = GoToTop;
})(Leaderboard || (Leaderboard = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), Leaderboard.ReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), Leaderboard.UnReadyForDisplay);
    Leaderboard.Init();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZGVyYm9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFkZXJib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUF5QztBQUN6Qyw0Q0FBNEM7QUFjNUMsTUFBTSxrQkFBa0IsR0FBOEI7SUFDckQsTUFBTSxFQUFFLGNBQWM7SUFDdEIsTUFBTSxFQUFFLGNBQWM7SUFDdEIsTUFBTSxFQUFFLFFBQVE7SUFDaEIsTUFBTSxFQUFFLE1BQU07SUFDZCxNQUFNLEVBQUUsV0FBVztJQUNuQixNQUFNLEVBQUUsUUFBUTtJQUNoQixJQUFJLEVBQUUsT0FBTztDQUNiLENBQUE7QUFFRCxJQUFVLFdBQVcsQ0E4dUJwQjtBQTl1QkQsV0FBVSxXQUFXO0lBRXBCLFNBQVMsSUFBSSxDQUFHLEdBQVc7UUFFMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxrQkFBa0IsR0FBRyxHQUFHLENBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7SUFDaEMsSUFBSSxRQUFRLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3RDLElBQUksUUFBMkIsQ0FBQztJQUVoQyxJQUFJLCtCQUF1QyxDQUFDO0lBQzVDLElBQUkscUNBQTZDLENBQUM7SUFDbEQsSUFBSSxvQ0FBNEMsQ0FBQztJQUNqRCxJQUFJLGdDQUF3QyxDQUFDO0lBQzdDLElBQUksc0JBQThCLENBQUM7SUFFbkMsSUFBSSxpQkFBaUIsR0FBVyxFQUFFLENBQUM7SUFFbkMsU0FBZ0IscUJBQXFCO1FBRXBDLElBQUksQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO1FBRWhDLElBQUssQ0FBQyxtQkFBbUIsRUFDekI7WUFDQywrQkFBK0IsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsc0NBQXNDLEVBQUUsa0JBQWtCLENBQUUsQ0FBQztZQUM1SCxxQ0FBcUMsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsNENBQTRDLEVB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