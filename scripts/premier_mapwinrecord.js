"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/teamcolor.ts" />
/// <reference path="common/formattext.ts"/>
var PremierMapWinRecord;
(function (PremierMapWinRecord) {
    function _msg(msg) {
        $.Msg('premier_mapwinrecord.ts: ' + msg);
    }
    const m_numMaps = 7;
    const spiderGraph = $('#jsMapWinsSpiderGraph');
    var m_LobbyPlayerUpdatedEventHandler;
    var m_LeaderboardHoverPlayerEventHandler;
    var m_bEventsRegistered = false;
    function Init() {
        $.RegisterForUnhandledEvent("CSGOHideMainMenu", UnregisterEventHandlers);
        $.RegisterForUnhandledEvent("CSGOShowMainMenu", RegisterEventHandlers);
        RegisterEventHandlers();
        $.Schedule(1, Draw);
    }
    PremierMapWinRecord.Init = Init;
    function RegisterEventHandlers() {
        if (!m_bEventsRegistered) {
            m_LobbyPlayerUpdatedEventHandler = $.RegisterForUnhandledEvent("PanoramaComponent_FriendsList_ProfileUpdated", Draw);
            m_LeaderboardHoverPlayerEventHandler = $.RegisterForUnhandledEvent("LeaderboardHoverPlayer", _HighlightPlayer);
            m_bEventsRegistered = true;
        }
    }
    PremierMapWinRecord.RegisterEventHandlers = RegisterEventHandlers;
    function UnregisterEventHandlers() {
        if (m_bEventsRegistered) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_FriendsList_ProfileUpdated', m_LobbyPlayerUpdatedEventHandler);
            $.UnregisterForUnhandledEvent('LeaderboardHoverPlayer', m_LeaderboardHoverPlayerEventHandler);
            m_bEventsRegistered = false;
        }
    }
    PremierMapWinRecord.UnregisterEventHandlers = UnregisterEventHandlers;
    function Draw() {
        _DrawParty();
        _MakeMapPanels();
    }
    PremierMapWinRecord.Draw = Draw;
    ;
    function _HighlightPlayer(xuid) {
        _DrawParty(xuid);
    }
    const oAlpha = {
        'normal': { 'outer': 0.5, 'inner': 0.1 },
        'dim': { 'outer': 0.2, 'inner': 0 },
        'hilit': { 'outer': 1, 'inner': 0.2 },
    };
    function _DrawPlayerPlot(arrValues, rgb, max, plotType = 'normal') {
        let rgbColorOuter = 'rgba(' + rgb + ',' + oAlpha[plotType].outer + ')';
        let rgbColorInner = 'rgba(' + rgb + ',' + oAlpha[plotType].inner + ')';
        arrValues = arrValues.map(a => a / max);
        const options = {
            line_color: rgbColorOuter,
            line_thickness: 3,
            line_softness: 10,
            fill_color_inner: rgbColorInner,
            fill_color_outer: rgbColorInner,
        };
        spiderGraph.DrawGraphPoly(arrValues, options);
    }
    function _GetMapsList() {
        return Object.keys(FriendsListAPI.GetFriendCompetitivePremierWindowStatsObject("0"));
    }
    function _DrawGuides(maxWinsInASingleMap) {
        spiderGraph.ClearJS('rgba(0,0,0,0)');
        const options = {
            bkg_color: "#00000080",
            spokes_color: '#ffffff10',
            spoke_thickness: 2,
            spoke_softness: 100,
            spoke_length_scale: 1.2,
            guideline_color: '#ffffff10',
            guideline_thickness: 2,
            guideline_softness: 100,
            guideline_count: maxWinsInASingleMap + 1,
            deadzone_percent: 0.1,
            scale: 0.70
        };
        spiderGraph.SetGraphOptions(options);
        spiderGraph.DrawGraphBackground(m_numMaps);
    }
    function _SetTitle(totalWins) {
        const pLabel = $('#jsMapWinsLabel');
        if (totalWins === 0) {
            pLabel.text = $.Localize("#mapwinrecord_graph_title_no_wins");
        }
        else {
            pLabel.text = FormatText.FormatPluralLoc("#mapwinrecord_graph_title:p", totalWins);
        }
    }
    function _DrawParty(highlightedPlayerXuid = '') {
        if (LobbyAPI.IsSessionActive()) {
            const party = LobbyAPI.GetSessionSettings().members;
            const nPlayers = party.numPlayers;
            //	let leaderboard = LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard();
            //	const nPlayers = LeaderboardsAPI.GetCount( leaderboard );
            let totalWins = 0;
            let maxWinsInASingleMap = 3; // min 3
            let mapList = _GetMapsList();
            // first pass: find scale for graph
            for (let p = 0; p < nPlayers; p++) {
                let xuid = party['machine' + p].player0.xuid;
                //		let oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByIndex( leaderboard, p );
                //		let xuid = oPlayer.XUID!;
                let RankWindowObject = PartyListAPI.GetFriendCompetitivePremierWindowStatsObject(xuid);
                let playerWins = mapList.map((mapName) => { return Number(RankWindowObject[mapName] | 0); });
                totalWins = totalWins + playerWins.reduce((a, b) => a + b, 0);
                maxWinsInASingleMap = Math.max(maxWinsInASingleMap, Math.max.apply(null, playerWins));
                //		_msg( playerWins.toString() );
            }
            _DrawGuides(maxWinsInASingleMap);
            _SetTitle(totalWins);
            // second pass: draw players at scale
            for (let p = 0; p < nPlayers; p++) {
                let xuid = party['machine' + p].player0.xuid;
                //		let oPlayer = LeaderboardsAPI.GetEntryDetailsObjectByIndex( leaderboard, p );
                //		let xuid = oPlayer.XUID!;
                let RankWindowObject = FriendsListAPI.GetFriendCompetitivePremierWindowStatsObject(xuid);
                let playerWins = mapList.map((mapName) => { return Number(RankWindowObject[mapName] | 0); });
                const teamColorIdx = PartyListAPI.GetPartyMemberSetting(xuid, 'game/teamcolor');
                const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
                let hilite = highlightedPlayerXuid === '' ? 'normal' : highlightedPlayerXuid === xuid ? 'hilit' : 'dim';
                _DrawPlayerPlot(playerWins, teamColorRgb, maxWinsInASingleMap, hilite);
            }
        }
    }
    function _MakeMapPanels() {
        let arrMaps = _GetMapsList();
        let elMapContainer = $.GetContextPanel().FindChildTraverse('jsMapWinsSpiderGraph');
        elMapContainer.RemoveAndDeleteChildren();
        for (let s = 0; s < m_numMaps; s++) {
            let elMap = $.CreatePanel('Panel', elMapContainer, String(s));
            elMap.BLoadLayoutSnippet('snippet-mwr-map');
            let elMapImage = elMap.FindChildInLayoutFile('mwr-map__image');
            let imageName = arrMaps[s];
            elMapImage.SetImage("file://{images}/map_icons/map_icon_" + imageName + ".svg");
            elMapImage.style.backgroundPosition = '50% 50%';
            elMapImage.style.backgroundSize = 'auto 150%';
            elMap.style.flowChildren = 'up';
            elMap.SetDialogVariable('map-name', $.Localize('#SFUI_Map_' + imageName));
            let vPos = spiderGraph.GraphPositionToUIPosition(s, 1.3);
            elMap.SetPositionInPixels(vPos.x, vPos.y, 0);
        }
    }
})(PremierMapWinRecord || (PremierMapWinRecord = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    PremierMapWinRecord.Init();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlbWllcl9tYXB3aW5yZWNvcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcmVtaWVyX21hcHdpbnJlY29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLDRDQUE0QztBQUM1Qyw0Q0FBNEM7QUFlNUMsSUFBVSxtQkFBbUIsQ0E0TTVCO0FBNU1ELFdBQVUsbUJBQW1CO0lBRzVCLFNBQVMsSUFBSSxDQUFHLEdBQVc7UUFFMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBRSwyQkFBMkIsR0FBRyxHQUFHLENBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBRSx1QkFBdUIsQ0FBbUIsQ0FBQztJQUNsRSxJQUFJLGdDQUF3QyxDQUFDO0lBQzdDLElBQUksb0NBQTRDLENBQUM7SUFDakQsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7SUFJaEMsU0FBZ0IsSUFBSTtRQUVuQixDQUFDLENBQUMseUJBQXlCLENBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLENBQUUsQ0FBQztRQUMzRSxDQUFDLENBQUMseUJBQXlCLENBQUUsa0JBQWtCLEVBQUUscUJBQXFCLENBQUUsQ0FBQztRQUV6RSxxQkFBcUIsRUFBRSxDQUFDO1FBRXhCLENBQUMsQ0FBQyxRQUFRLENBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFSZSx3QkFBSSxPQVFuQixDQUFBO0lBRUQsU0FBZ0IscUJBQXFCO1FBRXBDLElBQUssQ0FBQyxtQkFBbUIsRUFDekI7WUFDQyxnQ0FBZ0MsR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUUsOENBQThDLEVBQUUsSUFBSSxDQUFFLENBQUM7WUFDdkgsb0NBQW9DLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHdCQUF3QixFQUFFLGdCQUFnQixDQUFFLENBQUM7WUFFakgsbUJBQW1CLEdBQUcsSUFBSSxDQUFD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