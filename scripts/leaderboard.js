"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="common/teamcolor.ts" />
var Leaderboard;
(function (Leaderboard) {
    function _msg(msg) {
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
    let m_bScrollToSelf = false;
    function RegisterEventHandlers() {
        _msg('RegisterEventHandlers');
        if (!m_bEventsRegistered) {
            m_LeaderboardsDirtyEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_Dirty', OnLeaderboardDirty);
            m_LeaderboardsStateChangeEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', OnLeaderboardStateChange);
            m_FriendsListNameChangedEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', _UpdateName);
            m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_PartyList_RebuildPartyList", _UpdatePartyList);
            m_NameLockEventHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', _UpdateNameLockButton);
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
            $.UnregisterForUnhandledEvent('PanoramaComponent_PartyList_RebuildPartyList', m_LobbyPlayerUpdatedEventHandler);
            $.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', m_NameLockEventHandler);
            m_bEventsRegistered = false;
        }
    }
    Leaderboard.UnregisterEventHandlers = UnregisterEventHandlers;
    function Init() {
        _msg('init');
        RegisterEventHandlers();
        m_lbType = $.GetContextPanel().GetAttributeString('lbtype', '');
        _SetTitle();
        _InitNavPanels();
        _UpdateLeaderboardName();
        $.Schedule(0.5, _UpdateNameLockButton);
        if (m_lbType === 'party') {
            _UpdatePartyList();
            if (LeaderboardsAPI.DoesTheLocalPlayerNeedALeaderboardSafeNameSet()) {
                _AutomaticLeaderboardNameLockPopup();
            }
        }
        else if (m_lbType === 'general') {
            UpdateLeaderboardList();
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
        let elLocationDropdown = $('#jsNavLocation');
        elLocationDropdown.visible = true;
        elLocationDropdown.RemoveAllOptions();
        let locales = LeaderboardsAPI.GetAllSeasonPremierLeaderboardRegions();
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
        elLocationDropdown.SetSelected('Friends');
    }
    function _FindLocalPlayerInLocale(locale) {
        let arrLBsOfInterest = LeaderboardsAPI.GetPremierLeaderboardsOfInterest();
        let elSeasonDropdown = $('#jsNavSeason');
        let elSeason = elSeasonDropdown.GetSelected();
        let lb = elSeason.GetAttributeString('leaderboard', '');
        for (let i = 0; i < arrLBsOfInterest.length; i++) {
            switch (locale) {
                case 'World':
                    if (arrLBsOfInterest[i] === lb)
                        return true;
                    break;
                case 'Friends':
                    if (arrLBsOfInterest[i].split('.').slice(-1)[0] === 'friends')
                        return true;
                    break;
                default:
                    if (arrLBsOfInterest[i].split('_').slice(-1)[0] === locale)
                        return true;
            }
        }
        return false;
    }
    function _GetRootPanel() {
        let parent = $.GetContextPanel().GetParent();
        let newParent;
        while (newParent = parent.GetParent())
            parent = newParent;
        return parent;
    }
    function _UpdateLeaderboardName(bSelf = false) {
        if (m_lbType === 'general') {
            let elSeasonDropdown = $('#jsNavSeason');
            let elLocationDropdown = $('#jsNavLocation');
            let elLocale = elLocationDropdown.GetSelected();
            let elSeason = elSeasonDropdown.GetSelected();
            if (elLocale && elSeason) {
                if (elLocale.GetAttributeString('friendslb', '') === 'true') {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + '.friends';
                }
                else {
                    m_leaderboardName = elSeason.GetAttributeString('leaderboard', '') + elLocale.GetAttributeString('location-suffix', '');
                }
                m_leaderboardName = m_leaderboardName + (bSelf ? '.self' : '');
            }
        }
        else if (m_lbType === 'party') {
            m_leaderboardName = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard() + '.party';
        }
        _msg(m_leaderboardName);
        return m_leaderboardName;
    }
    function _UpdateNameLockButton() {
        let elNameButton = _GetRootPanel().FindChildTraverse('lbNameButton');
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
            elNameButton.SetPanelEvent('onmouseover', onMouseOver.bind(undefined, elNameButton.id, tooltipText));
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
        if (lb.slice(-5) === '.self')
            lb = lb.replace(/\.self$/, '');
        let arrLBsOfInterest = LeaderboardsAPI.GetPremierLeaderboardsOfInterest();
        let bPresent = arrLBsOfInterest.includes(lb);
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
            elEntry.SetDialogVariable('player-rank', oPlayer.hasOwnProperty('rank') ? String(oPlayer.rank) : '-');
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
            {
                elEntry.SetDialogVariable('player-percentile', (oPlayer.hasOwnProperty('pct') && oPlayer.pct && oPlayer.pct > 0) ? oPlayer.pct.toFixed(0) + '%' : '-');
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
                if (!oPlayer.XUID) {
                    oPlayer.XUID = xuid;
                }
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
        if (m_bScrollToSelf) {
            let myIndex = LeaderboardsAPI.GetIndexByXuid(m_leaderboardName, m_myXuid);
            if (myIndex !== -1) {
                const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
                $.DispatchEvent('ScrollToDelayLoadListItem', elList, myIndex, 'topleft', true);
            }
            m_bScrollToSelf = false;
        }
        else {
            $.DispatchEvent('ScrollToDelayLoadListItem', elList, 0, 'topleft', true);
        }
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
    function OnLeaderboardChange() {
        m_bScrollToSelf = false;
        _UpdateLeaderboardName();
        UpdateLeaderboardList();
    }
    Leaderboard.OnLeaderboardChange = OnLeaderboardChange;
    function GoToSelf() {
        m_bScrollToSelf = true;
        let myIndex = LeaderboardsAPI.GetIndexByXuid(m_leaderboardName, m_myXuid);
        if (myIndex === -1) {
            _UpdateLeaderboardName(true);
            UpdateLeaderboardList();
        }
        else {
            const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
            $.DispatchEvent('ScrollToDelayLoadListItem', elList, myIndex, 'topleft', true);
        }
    }
    Leaderboard.GoToSelf = GoToSelf;
    function GoToTop() {
        m_bScrollToSelf = false;
        if (m_leaderboardName.slice(-5) === '.self') {
            _UpdateLeaderboardName(false);
            UpdateLeaderboardList();
        }
        else {
            const elList = $.GetContextPanel().FindChildInLayoutFile('id-leaderboard-entries');
            $.DispatchEvent('ScrollToDelayLoadListItem', elList, 0, 'topleft', true);
        }
    }
    Leaderboard.GoToTop = GoToTop;
})(Leaderboard || (Leaderboard = {}));
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), Leaderboard.ReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), Leaderboard.UnReadyForDisplay);
    Leaderboard.Init();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZGVyYm9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFkZXJib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUF5QztBQUN6Qyw0Q0FBNEM7QUFjNUMsSUFBVSxXQUFXLENBOHZCcEI7QUE5dkJELFdBQVUsV0FBVztJQUVwQixTQUFTLElBQUksQ0FBRyxHQUFXO0lBRzNCLENBQUM7SUFFRCxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztJQUNoQyxJQUFJLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdEMsSUFBSSxRQUEyQixDQUFDO0lBRWhDLElBQUksK0JBQXVDLENBQUM7SUFDNUMsSUFBSSxxQ0FBNkMsQ0FBQztJQUNsRCxJQUFJLG9DQUE0QyxDQUFDO0lBQ2pELElBQUksZ0NBQXdDLENBQUM7SUFDN0MsSUFBSSxzQkFBOEIsQ0FBQztJQUVuQyxJQUFJLGlCQUFpQixHQUFXLEVBQUUsQ0FBQztJQUVuQyxJQUFJLGVBQWUsR0FBWSxLQUFLLENBQUM7SUFFckMsU0FBZ0IscUJBQXFCO1FBRXBDLElBQUksQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO1FBRWhDLElBQUssQ0FBQyxtQkFBbUIsRUFDekI7WUFDQywrQkFBK0IsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsc0NBQXNDLEVBQUUsa0JBQWtCLENBQUUsQ0FBQztZQUM1SCxxQ0FBcUMsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsNENBQTRDLEVBQUUsd0JBQXdCLENBQUUsQ0FBQztZQUM5SSxvQ0FBb0MsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsMkNBQTJDLEVBQUUsV0FBVyxDQUFFLENBQUM7WUFDL0gsZ0NBQWdDLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDhDQUE4QyxFQUFFLGdCQUFnQixDQUFFLENBQUM7WUFDbkksc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDBEQUEw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