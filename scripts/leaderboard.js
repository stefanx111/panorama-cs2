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
        RegisterEventHandlers();
        _SetTitle();
        _InitNavPanels();
        _UpdateLeaderboardName();
        if (m_lbType === 'party') {
            _UpdatePartyList();
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
    function _UpdateLeaderboardName() {
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
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), Leaderboard.ReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), Leaderboard.UnReadyForDisplay);
    Leaderboard.Init();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZGVyYm9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsZWFkZXJib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHlDQUF5QztBQUN6Qyw0Q0FBNEM7QUFjNUMsSUFBVSxXQUFXLENBd3RCcEI7QUF4dEJELFdBQVUsV0FBVztJQUVwQixTQUFTLElBQUksQ0FBRyxHQUFXO0lBRzNCLENBQUM7SUFFRCxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQztJQUNoQyxJQUFJLFFBQVEsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdEMsSUFBSSxRQUEyQixDQUFDO0lBRWhDLElBQUksK0JBQXVDLENBQUM7SUFDNUMsSUFBSSxxQ0FBNkMsQ0FBQztJQUNsRCxJQUFJLG9DQUE0QyxDQUFDO0lBQ2pELElBQUksZ0NBQXdDLENBQUM7SUFDN0MsSUFBSSxzQkFBOEIsQ0FBQztJQUVuQyxJQUFJLGlCQUFpQixHQUFXLEVBQUUsQ0FBQztJQUVuQyxTQUFnQixxQkFBcUI7UUFFcEMsSUFBSSxDQUFFLHVCQUF1QixDQUFFLENBQUM7UUFFaEMsSUFBSyxDQUFDLG1CQUFtQixFQUN6QjtZQUNDLCtCQUErQixHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxzQ0FBc0MsRUFBRSxrQkFBa0IsQ0FBRSxDQUFDO1lBQzVILHFDQUFxQyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw0Q0FBNEMsRUFBRSx3QkFBd0IsQ0FBRSxDQUFDO1lBQzlJLG9DQUFvQyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSwyQ0FBMkMsRUFBRSxXQUFXLENBQUUsQ0FBQztZQUUvSCxJQUFLLFFBQVEsS0FBSyxPQUFPLEVBQ3pCO2dCQUNDLGdDQUFnQyxHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw4Q0FBOEMsRUFBRSxnQkFBZ0IsQ0FBRSxDQUFDO2FBQ25JO1lBRUQsSUFBSyxRQUFRLEtBQUssU0FBUyxFQUMzQjtnQkFDQyxz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