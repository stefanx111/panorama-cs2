"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="rating_emblem.ts" />
/*
globals

$
MockAdapter
GameStateAPI
InventoryAPI
GameInterfaceAPI
dictPlayerStatusImage
UiToolkitAPI
MatchStatsAPI
GameTypesAPI
MissionsAPI
dictRoundResultImage
StoreAPI
LeaderboardsAPI
MyPersonaAPI
*/
var Scoreboard = (function () {
    function _msg(text) {
        $.Msg('Scoreboard.ts: ' + text);
    }
    const _m_cP = $.GetContextPanel();
    let _m_LocalPlayerID = ''; // xuid of local player for highlighting.
    function GetLocalPlayerId() {
        if (_m_LocalPlayerID === '')
            _m_LocalPlayerID = GameStateAPI.GetLocalPlayerXuid();
        return _m_LocalPlayerID;
    }
    // object to keep track of team data
    //
    class Team_t {
        m_CommendLeaderboards = {
            'leader': [],
            'teacher': [],
            'friendly': [],
        };
        m_teamName;
        constructor(teamName) {
            this.m_teamName = teamName;
        }
        // only call for the local player's team because we only want to show local player team commendations
        CalculateAllCommends() {
            ['leader', 'teacher', 'friendly'].forEach(stat => {
                // const playerTeamName = MockAdapter.GetPlayerTeamName( _m_TopCommends[ stat ] );
                // const BestIsSameTeam = localTeamName == playerTeamName;
                this._SortCommendLeaderboard(stat);
                this._ChangeCommendDisplay(_m_TopCommends[stat], stat, false);
                _m_TopCommends[stat] = this._GetCommendBestXuid(stat);
                this._ChangeCommendDisplay(_m_TopCommends[stat], stat, true); // new on
            });
        }
        UpdateCommendForPlayer(xuid, stat, value) {
            if (value == 0)
                return;
            let playerCommend = this.m_CommendLeaderboards[stat].find(p => p.m_xuid === xuid);
            if (!playerCommend) {
                this.m_CommendLeaderboards[stat].push({ m_xuid: xuid, m_value: value });
            }
            else {
                playerCommend.m_value = value;
            }
        }
        DeletePlayerFromCommendsLeaderboards(xuid) {
            ['leader', 'teacher', 'friendly'].forEach(stat => {
                let index = this.m_CommendLeaderboards[stat].findIndex(p => p.m_xuid === xuid);
                if (index != -1) {
                    this.m_CommendLeaderboards[stat].splice(index, 1);
                }
            });
        }
        _ChangeCommendDisplay(xuid, stat, turnon) {
            let oPlayer = _m_oPlayers.GetPlayerByXuid(xuid);
            if (!oPlayer)
                return;
            let elPlayer = oPlayer.m_elPlayer;
            if (!elPlayer || !elPlayer.IsValid())
                return;
            let elCommendationImage = elPlayer.FindChildTraverse('id-sb-name__commendations__' + stat);
            if (!elCommendationImage || !elCommendationImage.IsValid())
                return;
            elCommendationImage.SetHasClass('hidden', !turnon);
        }
        _SortCommendLeaderboard(stat) {
            // SORT
            this.m_CommendLeaderboards[stat].sort(function (a, b) { return b.m_value - a.m_value; });
        }
        _GetCommendBestXuid(stat) {
            switch (stat) {
                case 'leader': return this._GetCommendTopLeaderXuid();
                case 'teacher': return this._GetCommendTopTeacherXuid();
                case 'friendly': return this._GetCommendTopFriendlyXuid();
                default: return "0";
            }
        }
        _GetCommendTopLeaderXuid() {
            let clb = this.m_CommendLeaderboards['leader'];
            return clb[0] ? clb[0].m_xuid : "0";
        }
        _GetCommendTopTeacherXuid() {
            let clb = this.m_CommendLeaderboards['teacher'];
            let teacher0 = clb[0] ? clb[0].m_xuid : "0";
            let teacher1 = clb[1] ? clb[1].m_xuid : "0";
            if (teacher0 != this._GetCommendTopLeaderXuid())
                return teacher0;
            else
                return teacher1;
        }
        _GetCommendTopFriendlyXuid() {
            let clb = this.m_CommendLeaderboards['friendly'];
            let friendly0 = clb[0] ? clb[0].m_xuid : "0";
            let friendly1 = clb[1] ? clb[1].m_xuid : "0";
            let friendly2 = clb[2] ? clb[2].m_xuid : "0";
            if (friendly0 != this._GetCommendTopLeaderXuid() && friendly0 != this._GetCommendTopTeacherXuid())
                return friendly0;
            else if (friendly1 != this._GetCommendTopLeaderXuid() && friendly1 != this._GetCommendTopTeacherXuid())
                return friendly1;
            else
                return friendly2;
        }
    }
    class Player_t {
        m_xuid;
        m_elPlayer = undefined; // panel of the player's row
        m_elTeam = undefined; // panel of the player's team, also parent of player row/panel
        m_oStats = {}; // collection of the players stat values
        m_oElStats = {}; // collection of the player's cell panels
        m_isMuted = false; // muted state;
        m_oMatchStats = undefined;
        constructor(xuid) {
            this.m_xuid = xuid;
        }
        GetStatNum(stat, dflt = 0) {
            const val = this.m_oStats[stat];
            return typeof val === "number" && isFinite(val) ? val : dflt;
        }
        GetStatText(stat, dflt = "") {
            const val = this.m_oStats[stat];
            return typeof val === "string" ? val : val != null ? val.toString() : dflt;
        }
    }
    class AllPlayers_t {
        m_arrPlayers = [];
        AddPlayer(xuid) {
            let newPlayer = new Player_t(xuid);
            let teamName = GameStateAPI.GetPlayerTeamName(xuid);
            if (IsTeamASpecTeam(teamName))
                teamName = 'Spectator';
            let elTeam = _m_cP.FindChildInLayoutFile('players-table-' + teamName);
            if (!elTeam || !elTeam.IsValid()) {
                elTeam = _m_cP.FindChildInLayoutFile('players-table-ANY');
            }
            newPlayer.m_elTeam = elTeam;
            this.m_arrPlayers.push(newPlayer);
            return newPlayer;
        }
        GetPlayerByIndex(i) {
            return this.m_arrPlayers[i];
        }
        GetPlayerByXuid(xuid) {
            return this.m_arrPlayers.find(p => p.m_xuid === xuid);
        }
        GetPlayerIndexByPlayerSlot(slot) {
            let xuid = GameStateAPI.GetPlayerXuidStringFromPlayerSlot(slot);
            return this.GetPlayerIndexByXuid(xuid);
        }
        GetPlayerIndexByXuid(xuid) {
            return this.m_arrPlayers.findIndex(p => p.m_xuid === xuid);
        }
        GetCount() {
            return this.m_arrPlayers.length;
        }
        DeletePlayerByXuid(xuid) {
            let oPlayer = this.GetPlayerByXuid(xuid);
            const teamName = oPlayer?.m_oStats?.teamname;
            if (teamName && _m_oTeams[teamName]) {
                _m_oTeams[teamName].DeletePlayerFromCommendsLeaderboards(xuid);
            }
            let i = this.GetPlayerIndexByXuid(xuid);
            if (this.m_arrPlayers[i].m_elPlayer && this.m_arrPlayers[i].m_elPlayer.IsValid()) {
                this.m_arrPlayers[i].m_elPlayer.DeleteAsync(.0);
            }
            this.m_arrPlayers.splice(i, 1);
        }
        DeleteMissingPlayers(oPlayerList) {
            const players = Object.values(oPlayerList).flatMap(team => Object.values(team ?? {}));
            const sXuids = new Set(players.filter(xuid => !!xuid));
            for (const player of this.m_arrPlayers) {
                if (!sXuids.has(player.m_xuid)) {
                    // $.Msg( "SCOREBOARD: Deleting missing player " + player.m_name );
                    this.DeletePlayerByXuid(player.m_xuid);
                }
            }
        }
    }
    let _m_bInit = false;
    let _m_oUpdateStatFns = {}; // dict of stat update functions. we iterate through these when updating a player.
    let _m_updatePlayerIndex = 0; // pointer to next player to update
    let _m_oTeams = {}; // a collection of teams
    let _m_arrSortingPausedRefGetCounter = 0; // Pause the player sorting when > 0
    let _m_hDenyInputToGame = null; // Handle used by the player card context menu to deny input to the game 
    let _m_dataSetCurrent = 0;
    let _m_dataSetGetCount = 0;
    let _m_areTeamsSwapped = false;
    let _m_maxRounds = 0;
    let _m_oPlayers; // object that contains players
    let _m_RoundUpdated = {}; // keeping track of which rounds have been updated so we don't updated multiple times per round
    let _m_TopCommends = {
        'leader': "0",
        'teacher': "0",
        'friendly': "0",
    };
    let _m_overtime = 0;
    let _m_updatePlayerHandler = null;
    let _m_haveViewers = false;
    let FAKEMODE = '';
    //DEVONLY{
    FAKEMODE = '';
    //}DEVONLY
    const sortOrder_default = {
        'dc': 0,
        'score': 0,
        'risc': 0,
        'mvps': 0,
        'kills': 0,
        'assists': 0,
        'deaths': -1,
        'leader': 0,
        'teacher': 0,
        'friendly': 0,
        'rank': 0,
        'idx': -1,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties
        'damage': 0,
        'avgrisc': 0,
        'money': 0,
        'hsp': 0,
        'kdr': 0,
        'adr': 0,
        'utilitydamage': 0,
        'enemiesflashed': 0,
    };
    const sortOrder_reverse = {
        'dc': 0,
        'score': -1,
        'risc': -1,
        'mvps': -1,
        'kills': -1,
        'assists': -1,
        'deaths': 0,
        'leader': -1,
        'teacher': -1,
        'friendly': -1,
        'rank': -1,
        'idx': 0,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties	
        'damage': 0,
        'avgrisc': 0,
        'money': 0,
        'hsp': 0,
        'kdr': 0,
        'adr': 0,
        'utilitydamage': 0,
        'enemiesflashed': 0,
    };
    const sortOrder_dm = {
        'dc': 0,
        'score': 0,
        'idx': -1,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties	
        'hsp': 0,
        'kdr': 0,
        'kills': 0,
        'assists': 0,
        'deaths': -1,
        'rank': 0,
    };
    const sortOrder_gg = {
        'dc': 0,
        'gglevel': 0,
        'ggleader': 0,
        'idx': -1,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties
        'hsp': 0,
        'kdr': 0,
        'score': 0,
        'kills': 0,
        'assists': 0,
        'deaths': -1, // reverse
    };
    const sortOrder_tmm = {
        'dc': 0,
        'damage': 0,
        'kills': 0,
        'risc': 0,
        'mvps': 0,
        'assists': 0,
        'deaths': -1,
        'leader': 0,
        'teacher': 0,
        'friendly': 0,
        'rank': 0,
        'idx': -1,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties	
        'score': 0,
        'avgrisc': 0,
        'money': 0,
        'hsp': 0,
        'kdr': 0,
        'adr': 0,
        'utilitydamage': 0,
        'enemiesflashed': 0,
    };
    let _m_sortOrder = sortOrder_default; // which player sort we're using
    _Reset();
    function _Reset() {
        _m_bInit = false;
        _m_oPlayers = new AllPlayers_t();
        _m_oUpdateStatFns = {};
        _m_updatePlayerIndex = 0;
        _m_oTeams = {};
        _m_arrSortingPausedRefGetCounter = 0;
        _m_hDenyInputToGame = null;
        _m_dataSetCurrent = 0;
        _m_dataSetGetCount = 0;
        _m_areTeamsSwapped = false;
        _m_maxRounds = 0;
        _m_sortOrder = sortOrder_default;
        _m_overtime = 0;
        _m_RoundUpdated = {};
        _m_TopCommends = {
            'leader': "0",
            'teacher': "0",
            'friendly': "0",
        };
        _m_cP.RemoveAndDeleteChildren();
        _m_cP.m_bSnippetLoaded = false;
        //DEVONLY{
        if (FAKEMODE === 'Premier') {
            MockAdapter.AddTable('scoreboard_premier', {
                k_GetPlayerCompetitiveRanking: 1234,
                k_GetPlayerCompetitiveRankType: {
                    0: FAKEMODE
                },
            });
            MockAdapter.SetMockData('scoreboard_premier');
        }
        //}DEVONLY
    }
    function _Helper_LoadSnippet(element, snippet) {
        if (element && !element.m_bSnippetLoaded) {
            element.BLoadLayoutSnippet(snippet);
            element.m_bSnippetLoaded = true;
        }
    }
    //
    // get a jso of teams and their players
    //
    function _PopulatePlayerList() {
        const playerData = GameStateAPI.GetPlayerDataJSO();
        const teamNames = Object.keys(playerData);
        if (teamNames.length === 0)
            return;
        _m_oPlayers.DeleteMissingPlayers(playerData);
        for (const teamName of teamNames) {
            if (!ShouldCreateTeamForMode(teamName))
                continue;
            CreateTeam(teamName);
            for (const xuid of Object.values(playerData[teamName])) {
                if (xuid == null || xuid === "0")
                    continue;
                const oPlayer = _m_oPlayers.GetPlayerByXuid(xuid);
                // if it is a new player, add to the list of players
                if (!oPlayer) {
                    _CreateNewPlayer(xuid);
                }
                else if (oPlayer.m_oStats['teamname'] != teamName) // changed teams
                 {
                    _ChangeTeams(oPlayer, teamName);
                }
            }
        }
        // Create these entries so CTs can still score without any players
        if (ShouldCreateTeamForMode('CT'))
            CreateTeam('CT');
        if (ShouldCreateTeamForMode('TERRORIST'))
            CreateTeam('TERRORIST');
        function CreateTeam(teamName) {
            if (!_m_oTeams[teamName])
                _m_oTeams[teamName] = new Team_t(teamName);
        }
        function ShouldCreateTeamForMode(team) {
            let mode = GameStateAPI.GetGameModeInternalName(false);
            if (mode == 'cooperative' || mode == 'coopmission') {
                return team.toUpperCase() === GameStateAPI.GetCooperativePlayerTeamName().toUpperCase();
            }
            return true;
        }
    }
    function _ChangeTeams(oPlayer, newTeam) {
        // nm if no change.
        if (oPlayer.m_oStats['teamname'] == newTeam)
            return;
        let xuid = oPlayer.m_xuid;
        let oldTeam = oPlayer.m_oStats['teamname'];
        let elPlayer = oPlayer.m_elPlayer;
        // update the stat on the player
        oPlayer.m_oStats['teamname'] = newTeam;
        // update the commendation lists
        if (oldTeam in _m_oTeams) {
            _m_oTeams[oldTeam].DeletePlayerFromCommendsLeaderboards(xuid);
        }
        // reset commendations so they get picked up in UpdateAllStats and entered into new team
        oPlayer.m_oStats['leader'] = -1;
        oPlayer.m_oStats['teacher'] = -1;
        oPlayer.m_oStats['friendly'] = -1;
        if (!elPlayer || !elPlayer.IsValid())
            return;
        // update the player's row class for team color
        if (oldTeam)
            elPlayer.RemoveClass('sb-team--' + oldTeam);
        elPlayer.AddClass('sb-team--' + newTeam);
        // hide spectators in tournament matches
        if (IsTeamASpecTeam(newTeam) && MatchStatsAPI.IsTournamentMatch()) {
            elPlayer.AddClass('hidden');
            return;
        }
        // move the player row panel to the new team
        //
        let elTeam = _m_cP.FindChildInLayoutFile('players-table-' + newTeam);
        if (!elTeam && !IsTeamASpecTeam(newTeam)) {
            elTeam = _m_cP.FindChildInLayoutFile('players-table-ANY');
        }
        if (elTeam && elTeam.IsValid()) {
            oPlayer.m_elTeam = elTeam;
            elPlayer.SetParent(elTeam);
            elPlayer.RemoveClass('hidden');
        }
        else {
            elPlayer.AddClass('hidden');
        }
        // update all player stats
        let idx = _m_oPlayers.GetPlayerIndexByXuid(xuid);
        _UpdateAllStatsForPlayer(idx, true); // will recurse but ok because will exit early
        _SortPlayer(idx);
    }
    function _CreateNewPlayer(xuid) {
        let oPlayer = _m_oPlayers.AddPlayer(xuid);
        _NewPlayerPanel(oPlayer);
        let idx = _m_oPlayers.GetPlayerIndexByXuid(xuid);
        _UpdateAllStatsForPlayer(idx, true);
        _SortPlayer(idx);
        // only use the first stat ( after 'dc' ) in sortorder
        let sortOrder = Object.keys(_m_sortOrder)[1]; // 0 is 'dc'
        $.Msg('sorting by ' + Object.keys(_m_sortOrder));
        _HighlightSortStatLabel(sortOrder);
    }
    //
    // function that walks over list of players, one each call, and updates them.
    // refresh the player list every go-through
    //
    function _UpdateNextPlayer() {
        _m_oPlayers.DeleteMissingPlayers(GameStateAPI.GetPlayerDataJSO());
        if (_m_updatePlayerIndex >= _m_oPlayers.GetCount()) {
            _PopulatePlayerList();
            _m_updatePlayerIndex = 0;
        }
        _UpdatePlayer(_m_updatePlayerIndex);
        _m_updatePlayerIndex++;
    }
    function _UpdateAllPlayers_delayed(bSilent = false) {
        // eslint-disable-next-line no-unused-vars
        $.Schedule(0.01, () => _UpdateAllPlayers(bSilent));
    }
    ////////////////////////////////////////////////
    function _UpdateAllPlayers(bSilent) {
        if (!_m_bInit)
            return;
        _PopulatePlayerList();
        _m_updatePlayerIndex = 0;
        // traverse the dictionary we made and update each player
        // this could update player row positions, so disable position 
        // animation first to avoid catch-up effect
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let elPlayer = _m_oPlayers.GetPlayerByIndex(i).m_elPlayer;
            if (elPlayer && elPlayer.IsValid())
                elPlayer.RemoveClass('sb-row--transition');
        }
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            _UpdatePlayer(i, bSilent);
            //	$.Msg( "UPDATE ALL PLAYERS: Updating player " + i );
        }
        //	re-enable position animation
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let elPlayer = _m_oPlayers.GetPlayerByIndex(i).m_elPlayer;
            if (elPlayer && elPlayer.IsValid())
                elPlayer.AddClass('sb-row--transition');
        }
    }
    // highlight a stat
    function _Pulse(el) {
        el.RemoveClass('sb-pulse-highlight');
        el.AddClass('sb-pulse-highlight');
    }
    function _UpdatePlayerByPlayerSlot(slot) {
        let index = _m_oPlayers.GetPlayerIndexByPlayerSlot(slot);
        _UpdatePlayer(index, true);
    }
    function _UpdatePlayerByPlayerSlot_delayed(slot) {
        // we need to delay the update because the gameresource updates after the game event that we're reacting to.
        // If we don't delay, the data will not be new 
        // eslint-disable-next-line no-unused-vars
        $.Schedule(0.01, () => _UpdatePlayerByPlayerSlot(slot));
    }
    ////////////////////////////////////////////////
    //
    // update a player
    // also creates the player row if it does not yet exist.
    //
    function _UpdatePlayer(idx, bSilent = false) {
        let oPlayer = _m_oPlayers.GetPlayerByIndex(idx);
        if (!oPlayer)
            return;
        bSilent = bSilent && _m_cP.visible;
        let xuid = oPlayer.m_xuid;
        oPlayer.m_oMatchStats = MatchStatsAPI.GetPlayerStatsJSO(xuid);
        // if ( xuid === 0 )
        // {
        // 	return;
        // }
        _UpdateAllStatsForPlayer(idx, bSilent);
        _SortPlayer(idx);
    }
    ////////////////////////////////////////////////
    function _UpdateSpectatorButtons() {
        let elButtonPanel = $('#spec-button-group');
        if (!elButtonPanel || !elButtonPanel.IsValid())
            return;
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        let bQ = (GameStateAPI.IsLocalPlayerHLTV() && nCameraMan > -1);
        if (bQ) {
            elButtonPanel.visible = true;
            UpdateCasterButtons();
        }
        else {
            elButtonPanel.visible = false;
        }
    }
    function _lessthan(x, y) {
        x = Number(x);
        y = Number(y);
        if (isNaN(x))
            return (!isNaN(y));
        if (isNaN(y))
            return false;
        return (x < y);
    }
    // NOTE: Sort player only supports numeric stat comparison
    //
    function _SortPlayer(idx) {
        if (_m_arrSortingPausedRefGetCounter != 0)
            return;
        let oPlayer = _m_oPlayers.GetPlayerByIndex(idx);
        let elTeam = oPlayer.m_elTeam;
        if (!elTeam || !elTeam.IsValid())
            return;
        let elPlayer = oPlayer.m_elPlayer;
        if (!elPlayer || !elPlayer.IsValid())
            return;
        // insert player into sorted position
        let children = elTeam.Children();
        for (let i = 0; i < children.length; i++) {
            // dont sort against ourselves
            if (oPlayer.m_xuid === children[i].m_xuid)
                continue;
            let oCompareTargetPlayer = _m_oPlayers.GetPlayerByXuid(children[i].m_xuid);
            if (!oCompareTargetPlayer)
                continue;
            for (let stat in _m_sortOrder) {
                let p1stat = oPlayer.m_oStats[stat];
                let p2stat = oCompareTargetPlayer.m_oStats[stat];
                if (_m_sortOrder[stat] === -1) // reverse 
                 {
                    // swap
                    let tmp = p1stat;
                    p1stat = p2stat;
                    p2stat = tmp;
                }
                if (_lessthan(p2stat, p1stat)) {
                    if (children[i - 1] != elPlayer) {
                        //	$.Msg( "moving player " + oPlayer.m_oStats[ 'name' ] + " to " + oCompareTargetPlayer.m_oStats[ 'name' ] );
                        elTeam.MoveChildBefore(elPlayer, children[i]);
                        // 	$.Msg( "  " + MockAdapter.GetPlayerName( elPlayer.m_xuid ) +
                        // 		":" +
                        // 		stat +
                        // 		":" +
                        // 		p1stat +
                        // 		" > " +
                        // 		MockAdapter.GetPlayerName( children[ i ].m_xuid ) +
                        // 		":" +
                        // 		stat +
                        // 		":" +
                        // 		p2stat
                        //  );
                    }
                    return;
                }
                else if (_lessthan(p1stat, p2stat)) {
                    // $.Msg( MockAdapter.GetPlayerName( elPlayer.m_xuid ) +
                    // 	":" +
                    // 	stat +
                    // 	":" +
                    // 	p1stat +
                    // 	" < " +
                    // 	MockAdapter.GetPlayerName( children[ i ].m_xuid ) +
                    // 	":" +
                    // 	stat +
                    // 	":" +
                    // 	p2stat
                    //);
                    break;
                }
            }
        }
    }
    function IsTeamASpecTeam(teamname) {
        return (teamname === 'Spectator' ||
            teamname === 'Unassigned' ||
            teamname === 'Unknown' ||
            teamname === 'UNKNOWN TEAM' ||
            teamname === '');
    }
    ////////////////////////////////////////////////
    function _UpdateAllStatsForPlayer(idx, bSilent = false) {
        let oPlayer = _m_oPlayers.GetPlayerByIndex(idx);
        for (let stat in _m_oUpdateStatFns) {
            //$.Msg( "scoreboard: " + oPlayer.m_oStats[ 'name' ] + " " + stat + " " + oPlayer.m_oStats[ stat ] )
            if (typeof (_m_oUpdateStatFns[stat]) === 'function') {
                _m_oUpdateStatFns[stat](oPlayer, bSilent);
            }
        }
    }
    // an update method for simple text labels ( e.g. kills, deaths, assists )
    function _GenericUpdateStat(oPlayer, stat, fnGetStat, bSilent = false) {
        // create a label in the panel if it doesn't exist
        let elPanel = oPlayer.m_oElStats[stat];
        if (!elPanel || !elPanel.IsValid())
            return;
        let elLabel = elPanel.FindChildTraverse('label');
        let newStatValue = fnGetStat(oPlayer.m_xuid);
        if (newStatValue !== oPlayer.m_oStats[stat]) {
            if (!bSilent) {
                if (elLabel && elLabel.IsValid()) {
                    _Pulse(elLabel);
                }
            }
            oPlayer.m_oStats[stat] = newStatValue;
            if (elLabel && elLabel.IsValid()) {
                elLabel.text = newStatValue.toString();
            }
        }
    }
    function _GetMatchStatFn(stat) {
        function _fn(xuid) {
            let oPlayer = _m_oPlayers.GetPlayerByXuid(xuid);
            let allstats = oPlayer.m_oMatchStats;
            if (allstats)
                return (allstats[stat] == -1) ? '-' : allstats[stat];
            return '-';
        }
        return _fn;
    }
    // this adds a stat-updating function to _m_oUpdateStatFns, 
    // which is a dictionary of stats that gets iterated on in _UpdateAllStatsForPlayer
    //
    function _CreateStatUpdateFn(stat) {
        //		$.Msg( "---SB----registering " + stat );
        let fn;
        switch (stat) {
            case 'musickit':
                fn = oPlayer => {
                    if (MockAdapter.IsFakePlayer(oPlayer.m_xuid))
                        return;
                    let ownerXuid = oPlayer.m_xuid;
                    let isLocalPlayer = oPlayer.m_xuid == GetLocalPlayerId();
                    let isBorrowed = false;
                    let borrowedXuid = "0";
                    let borrowedPlayerSlot = parseInt(GameInterfaceAPI.GetSettingString('cl_borrow_music_from_player_slot'));
                    if (borrowedPlayerSlot >= 0 && isLocalPlayer) {
                        borrowedXuid = GameStateAPI.GetPlayerXuidStringFromPlayerSlot(borrowedPlayerSlot);
                        if (MockAdapter.IsPlayerConnected(borrowedXuid)) {
                            ownerXuid = borrowedXuid;
                            isBorrowed = true;
                        }
                    }
                    let newStatValue = InventoryAPI.GetMusicIDForPlayer(ownerXuid);
                    if (newStatValue !== oPlayer.m_oStats[stat]) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        // update local music kit display
                        if (isLocalPlayer) {
                            let elMusicKit = $('#id-sb-meta__musickit');
                            if (!elMusicKit || !elMusicKit.IsValid())
                                return;
                            let isValidMusicKit = newStatValue > 0;
                            elMusicKit.SetHasClass('hidden', !isValidMusicKit);
                            if (isValidMusicKit) {
                                // set cancel borrow state
                                _m_cP.FindChildTraverse('id-sb-meta__musickit-unborrow').SetHasClass('hidden', !isBorrowed);
                                let imagepath = 'file://{images}/' + InventoryAPI.GetItemInventoryImageFromMusicID(newStatValue) + '.png';
                                $('#id-sb-meta__musickit-image').SetImage(imagepath);
                                $('#id-sb-meta__musickit-name').text = $.Localize(InventoryAPI.GetMusicNameFromMusicID(newStatValue));
                            }
                        }
                    }
                    let elPlayer = oPlayer.m_elPlayer;
                    if (elPlayer && elPlayer.IsValid()) {
                        ////////////////////////////////
                        // ICON ON NAME LABEL
                        ////////////////////////////////
                        let elMusicKitIcon = elPlayer.FindChildTraverse('id-sb-name__musickit');
                        if (elMusicKitIcon && elMusicKitIcon.IsValid()) {
                            elMusicKitIcon.SetHasClass('hidden', newStatValue <= 1);
                        }
                    }
                };
                break;
            case 'teamname':
                fn = oPlayer => {
                    let newStatValue = MockAdapter.GetPlayerTeamName(oPlayer.m_xuid);
                    _ChangeTeams(oPlayer, newStatValue);
                };
                break;
            case 'ping':
                fn = oPlayer => {
                    let elPlayer = oPlayer.m_elPlayer;
                    if (!elPlayer || !elPlayer.IsValid())
                        return;
                    let elPanel = oPlayer.m_oElStats[stat];
                    if (!elPanel || !elPanel.IsValid())
                        return;
                    let elLabel = elPanel.FindChildTraverse('label');
                    if (!elLabel)
                        return;
                    let szCustomLabel = _GetCustomStatTextValue('ping', oPlayer.m_xuid);
                    elLabel.SetHasClass('sb-row__cell--ping__label--bot', !!szCustomLabel); // TODO: fix this style to use same function making rules
                    if (szCustomLabel) {
                        //						$.Msg( szCustomLabel, oPlayer.m_xuid  );
                        elLabel.text = $.Localize(szCustomLabel);
                        oPlayer.m_oStats[stat] = szCustomLabel; // We have to set this otherwise _GenericUpdateStat will not update the actual label
                    }
                    else {
                        _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerPing, true);
                    }
                };
                break;
            case 'kills':
                fn = function (oPlayer, bSilent = false) {
                    _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerKills, bSilent);
                };
                break;
            case 'assists':
                fn = function (oPlayer, bSilent = false) {
                    _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerAssists, bSilent);
                };
                break;
            case 'deaths':
                fn = function (oPlayer, bSilent = false) {
                    _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerDeaths, bSilent);
                };
                break;
            case '3k':
            case '4k':
            case '5k':
            case 'adr':
            case 'hsp':
            case 'utilitydamage':
            case 'enemiesflashed':
            case 'damage':
                fn = function (oPlayer, bSilent = false) {
                    _GenericUpdateStat(oPlayer, stat, _GetMatchStatFn(stat), bSilent);
                };
                break;
            case 'kdr':
                fn = function (oPlayer, bSilent = false) {
                    let kdr;
                    if (_m_overtime == 0) {
                        // using matchstats version of kdr which is consistent with other stats:
                        // does not deduct for suicides and updates at the end of the round.
                        let kdrFn = _GetMatchStatFn('kdr');
                        kdr = kdrFn(oPlayer.m_xuid);
                        if (typeof kdr == 'number' && kdr > 0) {
                            kdr = kdr / 100.0;
                        }
                    }
                    else {
                        //
                        // for overtime support we use kills/deaths and NOT matchstats because
                        // kdr that does not match visible kills and deaths is confusing.
                        // This is a stop gap for Majors. A proper solution would rethink kills/deaths/etc on the player resource.
                        //	
                        let denom = oPlayer.GetStatNum('deaths') || 1;
                        kdr = oPlayer.GetStatNum('kills') / denom;
                    }
                    if (typeof kdr == 'number') {
                        kdr = kdr.toFixed(2);
                    }
                    _GenericUpdateStat(oPlayer, stat, () => { return kdr; }, bSilent);
                };
                break;
            case 'mvps':
                fn = function (oPlayer, bSilent = false) {
                    let newStatValue = MockAdapter.GetPlayerMVPs(oPlayer.m_xuid);
                    if (newStatValue !== oPlayer.m_oStats[stat]) {
                        let elMVPPanel = oPlayer.m_oElStats[stat];
                        if (!elMVPPanel || !elMVPPanel.IsValid())
                            return;
                        // create the star image
                        let elMVPStarImage = elMVPPanel.FindChildTraverse('star-image');
                        if (!elMVPStarImage || !elMVPStarImage.IsValid())
                            return;
                        // create the numerator label
                        let elMVPStarNumberLabel = elMVPPanel.FindChildTraverse('star-count');
                        if (!elMVPStarNumberLabel || !elMVPStarNumberLabel.IsValid())
                            return;
                        //////////////
                        oPlayer.m_oStats[stat] = newStatValue;
                        elMVPStarImage.SetHasClass('hidden', newStatValue == 0);
                        elMVPStarNumberLabel.SetHasClass('hidden', newStatValue == 0);
                        elMVPStarNumberLabel.text = newStatValue.toString();
                        if (!bSilent) {
                            _Pulse(elMVPStarImage);
                            _Pulse(elMVPStarNumberLabel);
                        }
                    }
                };
                break;
            case 'status':
                fn = oPlayer => {
                    // 	None,
                    // 	Dead,
                    // 	Bomb,
                    // 	Dominated,
                    // 	DominatedDead,
                    // 	Nemesis,
                    // 	NemesisDead,
                    // 	Defuser,
                    // 	SwitchTeams,
                    // 	SwitchTeamsDead,
                    // 	MatchmakingTwoStackSmallParty,
                    // 	MatchmakingTwoStackParty,
                    // 	MatchmakingThreeStackParty,
                    // 	MatchmakingFourStackParty,
                    // 	MatchmakingFiveStackParty,
                    // 	Disconnected,
                    // 	ScoreboardStatusMax
                    let newStatValue = MockAdapter.GetPlayerStatus(oPlayer.m_xuid);
                    // uncomment to debug DC sorting.
                    //		newStatValue = GameStateAPI.GetPlayerSlot( oPlayer.m_xuid ) % 3 ? 15 : newStatValue; // for sorting
                    if (newStatValue !== oPlayer.m_oStats[stat]) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPlayer = oPlayer.m_elPlayer;
                        if (!elPlayer || !elPlayer.IsValid())
                            return;
                        elPlayer.SetHasClass('sb-player-status-dead', newStatValue === 1);
                        // stylize and set status of players on condition of connection status
                        elPlayer.SetHasClass('sb-player-status-disconnected', newStatValue === 15);
                        oPlayer.m_oStats['dc'] = newStatValue === 15 ? 0 : 1; // for sorting
                        let elPanel = oPlayer.m_oElStats[stat];
                        if (!elPanel || !elPanel.IsValid())
                            return;
                        let elStatusImage = elPanel.FindChildTraverse('image');
                        if (!elStatusImage || !elStatusImage.IsValid())
                            return;
                        // set the image
                        elStatusImage.SetImage(dictPlayerStatusImage[newStatValue]);
                    }
                };
                break;
            case 'score':
                fn = oPlayer => {
                    _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerScore);
                };
                break;
            case 'money':
                fn = oPlayer => {
                    // create a label in the panel if it doesn't exist
                    let elPanel = oPlayer.m_oElStats[stat];
                    if (!elPanel || !elPanel.IsValid())
                        return;
                    // This code is really cludgey - it doesn't really update, but rather creates
                    // or updates labels, but is a copy of generic update stat code so should probably use that
                    // <fix this>
                    let elLabel = elPanel.FindChildTraverse('label');
                    if (!elLabel || !elLabel.IsValid())
                        return;
                    let newStatValue = MockAdapter.GetPlayerMoney(oPlayer.m_xuid);
                    if (newStatValue !== oPlayer.m_oStats[stat]) {
                        if (newStatValue >= 0) {
                            elLabel.SetHasClass('hidden', false);
                            elLabel.SetDialogVariableInt('stat_d_money', newStatValue);
                        }
                        else {
                            elLabel.SetHasClass('hidden', true);
                        }
                    }
                    oPlayer.m_oStats[stat] = newStatValue;
                };
                break;
            case 'name':
                fn = oPlayer => {
                    if (!oPlayer.m_elPlayer || !oPlayer.m_elPlayer.IsValid())
                        return;
                    oPlayer.m_elPlayer.SetHasClass('sb-row--localplayer', oPlayer.m_xuid === GetLocalPlayerId());
                    let elPanel = oPlayer.m_oElStats[stat];
                    if (!elPanel || !elPanel.IsValid())
                        return;
                    ////////////////////////////////
                    // NAME
                    ////////////////////////////////
                    oPlayer.m_elPlayer.SetDialogVariableInt('player_slot', GameStateAPI.GetPlayerSlot(oPlayer.m_xuid));
                    /////////////////////// dbug to show player models
                    //DEVONLY{
                    //					const model = MockAdapter.GetPlayerModel( oPlayer.m_xuid );
                    //					elNameLabel.text = model;
                    //}DEVONLY
                };
                break;
            case 'leader':
            case 'teacher':
            case 'friendly':
                fn = oPlayer => {
                    let newStatValue;
                    if (GameStateAPI.IsDemoOrHltv() || IsTeamASpecTeam(GameStateAPI.GetPlayerTeamName(GetLocalPlayerId())))
                        return;
                    if (!GameStateAPI.IsXuidValid(oPlayer.m_xuid)) {
                        // if ( 0 ) // for testing give bots commend values equal to their userid
                        // 	newStatValue = oPlayer.m_xuid;
                        // else
                        return;
                    }
                    else {
                        switch (stat) {
                            case 'leader':
                                newStatValue = GameStateAPI.GetPlayerCommendsLeader(oPlayer.m_xuid);
                                break;
                            case 'teacher':
                                newStatValue = GameStateAPI.GetPlayerCommendsTeacher(oPlayer.m_xuid);
                                break;
                            case 'friendly':
                                newStatValue = GameStateAPI.GetPlayerCommendsFriendly(oPlayer.m_xuid);
                                break;
                        }
                    }
                    // new value? Update it.
                    if (oPlayer.m_oStats[stat] != newStatValue) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let oTeam = _m_oTeams[oPlayer.GetStatText('teamname')];
                        if (oTeam)
                            oTeam.UpdateCommendForPlayer(oPlayer.m_xuid, stat, newStatValue);
                    }
                };
                break;
            case 'flair':
                fn = oPlayer => {
                    // Don't access InventoryAPI while state is latched --
                    // we could be referring to a player who has already disconnected.
                    if (GameStateAPI.IsLatched())
                        return;
                    let newStatValue = InventoryAPI.GetFlairItemId(oPlayer.m_xuid);
                    if (oPlayer.m_oStats[stat] !== newStatValue) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPanel = oPlayer.m_oElStats[stat];
                        if (!elPanel || !elPanel.IsValid())
                            return;
                        let elFlairImage = elPanel.FindChildTraverse('image');
                        if (!elFlairImage || !elFlairImage.IsValid())
                            return;
                        let imagepath = InventoryAPI.GetFlairItemImage(oPlayer.m_xuid);
                        elFlairImage.SetImage('file://{images}' + imagepath + '_small.png');
                    }
                };
                break;
            case 'avatar':
                fn = oPlayer => {
                    let elPanel = oPlayer.m_oElStats[stat];
                    if (!elPanel || !elPanel.IsValid())
                        return;
                    // AVATAR IMAGE
                    //
                    // create
                    let elAvatarImage = elPanel.FindChildTraverse('image');
                    if (!elAvatarImage || !elAvatarImage.IsValid())
                        return;
                    // update
                    elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(oPlayer.m_xuid));
                    let team = GameStateAPI.GetPlayerTeamName(oPlayer.m_xuid);
                    elAvatarImage.SwitchClass('teamstyle', 'team--' + team);
                    /////////////////////////////////////////////////////////////////////////
                    // TEAM COLOR
                    //
                    let elPlayerColor = elAvatarImage.FindChildTraverse('player-color');
                    if (elPlayerColor && elPlayerColor.IsValid()) {
                        let teamColor = GameStateAPI.GetPlayerColor(oPlayer.m_xuid);
                        if (teamColor !== '') {
                            elPlayerColor.style.washColor = teamColor;
                            elPlayerColor.RemoveClass('hidden');
                        }
                        else {
                            elPlayerColor.AddClass('hidden');
                        }
                    }
                    //////////////////////////
                    // MUTE STATE
                    //
                    //		const isMuted = oPlayer.m_xuid % 2 == 0; // for testing
                    let isMuted = GameStateAPI.IsSelectedPlayerMuted(oPlayer.m_xuid);
                    oPlayer.m_isMuted = isMuted;
                    let isEnemyTeamMuted = GameInterfaceAPI.GetSettingString("cl_mute_enemy_team") == "1";
                    let isEnemy = GameStateAPI.ArePlayersEnemies(oPlayer.m_xuid, GetLocalPlayerId());
                    let hasComAbusePenalty = GameStateAPI.HasCommunicationAbuseMute(oPlayer.m_xuid);
                    let isLocalPlayer = oPlayer.m_xuid == GetLocalPlayerId();
                    oPlayer.m_elPlayer.SetHasClass('muted', isMuted || (isEnemy && isEnemyTeamMuted) || (isLocalPlayer && hasComAbusePenalty));
                };
                break;
            case 'skillgroup':
                fn = oPlayer => {
                    let newStatValue = MockAdapter.GetPlayerCompetitiveRanking(oPlayer.m_xuid);
                    if (oPlayer.m_oStats[stat] !== newStatValue) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPlayer = oPlayer.m_elPlayer;
                        if (elPlayer && elPlayer.IsValid()) {
                            let options = {
                                root_panel: elPlayer.FindChildTraverse('jsRatingEmblem'),
                                xuid: oPlayer.m_xuid,
                                api: 'gamestate',
                            };
                            RatingEmblem.SetXuid(options);
                        }
                    }
                };
                break;
            case 'rank':
                fn = oPlayer => {
                    let newStatValue = MockAdapter.GetPlayerXpLevel(oPlayer.m_xuid);
                    if (oPlayer.m_oStats[stat] !== newStatValue) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPanel = oPlayer.m_oElStats[stat];
                        if (!elPanel || !elPanel.IsValid())
                            return;
                        let elRankImage = elPanel.FindChildTraverse('image');
                        if (!elRankImage || !elRankImage.IsValid())
                            return;
                        let imagepath = '';
                        if (newStatValue > 0) {
                            imagepath = 'file://{images}/icons/xp/level' + newStatValue + '.png';
                        }
                        else {
                            imagepath = '';
                        }
                        elRankImage.SetImage(imagepath);
                    }
                };
                break;
            case 'ggleader':
                fn = oPlayer => {
                    let isGGLeader = MockAdapter.GetTeamGungameLeaderXuid(oPlayer.GetStatText('teamname')) == oPlayer.m_xuid ? 1 : 0;
                    _GenericUpdateStat(oPlayer, stat, () => { return isGGLeader; });
                };
                break;
            case 'gglevel':
                fn = oPlayer => {
                    _GenericUpdateStat(oPlayer, stat, MockAdapter.GetPlayerGungameLevel);
                };
                break;
            default:
                $.Msg(stat + ' is an unhandled stat');
                return;
        }
        // register the fn. We will call all of these functions every time we update a player
        _m_oUpdateStatFns[stat] = fn;
    }
    function _GetPlayerRowForGameMode() {
        let mode = MockAdapter.GetGameModeInternalName(false);
        let skirmish = MockAdapter.GetGameModeInternalName(true);
        //DEVONLY{
        if (FAKEMODE !== '') {
            switch (FAKEMODE) {
                case 'Premier':
                    return 'snippet_scoreboard-classic__row--premier';
                case 'Competitive':
                    return 'snippet_scoreboard-classic__row--comp';
                case 'Wingman':
                    return 'snippet_scoreboard-classic__row--wingman';
            }
        }
        //}DEVONLY
        if (GameStateAPI.IsQueuedMatchmakingMode_Team()) {
            return 'snippet_scoreboard-classic__row--premier';
        }
        switch (mode) {
            case 'scrimcomp2v2':
                return 'snippet_scoreboard-classic__row--wingman';
            case 'competitive':
                return 'snippet_scoreboard-classic__row--comp';
            case 'gungameprogressive': // armsrace
                return 'snippet_scoreboard__row--armsrace';
            case 'training':
                return 'snippet_scoreboard__row--training';
            case 'deathmatch':
                return 'snippet_scoreboard__row--deathmatch';
            case 'gungametrbomb':
                return 'snippet_scoreboard__row--demolition';
            case 'coopmission':
            case 'cooperative':
                return 'snippet_scoreboard__row--cooperative';
            case 'casual':
                if (skirmish == 'flyingscoutsman')
                    return 'snippet_scoreboard__row--demolition';
                else
                    return 'snippet_scoreboard-classic__row--casual';
            default:
                return 'snippet_scoreboard-classic__row--casual';
        }
    }
    function _HighlightSortStatLabel(stat) {
        // remove hiliting class
        _m_cP.FindChildrenWithClassTraverse('sb-row__cell').forEach(function (el) {
            if (el && el.IsValid()) {
                if (el.BHasClass('sb-row__cell--' + stat)) {
                    el.AddClass('sortstat');
                }
                else {
                    el.RemoveClass('sortstat');
                }
            }
        });
    }
    function _CreateLabelForStat(stat, set, isHidden) {
        let elLabelRow = $('#id-sb-players-table__labels-row');
        if (!elLabelRow || !elLabelRow.IsValid())
            return;
        let elLabelRowOrSet = elLabelRow;
        // PROCESS SETS
        if (set !== '') {
            //////////////
            // LABEL SETS
            //
            // structure of sets
            //				
            //				+-----+     +----------------+
            //				|label+-----+ set containers |
            //				+-----+     +----+---------+-+
            //								 |         |
            //						 +-------+--+     ++--------+
            //						 |set 1     |     |set 2    |
            //						 +--+-----+-+     +--+----+-+
            //							|     |          |    |
            //						 +--+-----+---+ +----++ +-+---+
            //						 |label||label| |label| |label|
            //						 +------------+ +-----+ +-----+
            //				
            // do we have a set container?
            let labelSetContainerId = 'id-sb-row__set-container';
            let elLabelSetContainer = $('#' + labelSetContainerId);
            if (!elLabelSetContainer || !elLabelSetContainer.IsValid()) {
                elLabelSetContainer = $.CreatePanel('Panel', elLabelRow, labelSetContainerId);
                elLabelSetContainer.BLoadLayoutSnippet('snippet_sb-label-set-container');
                // enable the cycle button
                if ($('#id-sb-row__set-container')) {
                    $('#id-sb-meta__cycle').RemoveClass('hidden');
                }
            }
            let elSetLabels = elLabelSetContainer.FindChildTraverse('id-sb-row__sets');
            // do we have a set?
            let LabelSetId = 'id-sb-labels-set-' + set;
            let elLabelSet = elSetLabels.FindChildTraverse(LabelSetId);
            if (!elLabelSet || !elLabelSet.IsValid()) {
                _m_dataSetGetCount++; // keep track of the total number of sets
                // create the set container
                elLabelSet = $.CreatePanel('Panel', elSetLabels, LabelSetId);
                elLabelSet.AddClass('sb-row__set');
                elLabelSet.AddClass('no-hover');
            }
            // // keep a list of set panel containers
            // if ( !elLabelRow.Data()._m_oElStatSets )
            // 	elLabelRow.Data()._m_oElStatSets = {};
            // elLabelRow.Data()._m_oElStatSets[ set ].push( elLabelSet );
            elLabelRowOrSet = elLabelSet;
            // hide any set other than the current one
            if (set != _m_dataSetCurrent.toString()) {
                elLabelSet.AddClass('hidden');
            }
        }
        // Create the label for the column for this stat
        let elStatPanel = elLabelRowOrSet.FindChildInLayoutFile('id-sb-' + stat);
        if (!elStatPanel || !elStatPanel.IsValid()) {
            elStatPanel = $.CreatePanel('Button', elLabelRowOrSet, 'id-sb-' + stat);
            elStatPanel.AddClass('sb-row__cell');
            elStatPanel.AddClass('sb-row__cell--' + stat);
            elStatPanel.AddClass('sb-row__cell--label');
            let elStatLabel;
            if (stat === 'ping') {
                elStatLabel = $.CreatePanel('Image', elStatPanel, 'label-' + elStatPanel.id);
                elStatLabel.SetImage('file://{images}/icons/ui/ping_4.svg');
            }
            else {
                elStatLabel = $.CreatePanel('Label', elStatPanel, 'label-' + elStatPanel.id);
                if (isHidden == '1') {
                    elStatLabel.text = '';
                }
                else {
                    elStatLabel.text = $.Localize('#Scoreboard_' + stat);
                }
            }
            // Create the tooltip
            let toolTipString = $.Localize('#Scoreboard_' + stat + '_tooltip');
            if (toolTipString !== '') {
                elStatLabel.SetPanelEvent('onmouseover', () => UiToolkitAPI.ShowTextTooltip(elStatLabel.id, toolTipString));
                elStatLabel.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideTextTooltip(); });
            }
            let _SetNewSortStat = function (stat) {
                let newSortOrder = { 'dc': 0 };
                // get the unmodified sort order for this mode
                let modeDefaultSortOrder = _GetSortOrderForMode(MockAdapter.GetGameModeInternalName(false));
                // insert the desired stat as the first entry
                // if it doesn't exist then abort
                if (stat in modeDefaultSortOrder)
                    newSortOrder[stat] = modeDefaultSortOrder[stat];
                else
                    return;
                _HighlightSortStatLabel(stat);
                // copy the other stats in order.
                for (let s in modeDefaultSortOrder) {
                    if (s == stat)
                        continue;
                    // 'dc' is forced to the top regardless of player sort preference
                    if (s == 'dc')
                        continue;
                    newSortOrder[s] = modeDefaultSortOrder[s];
                }
                // set the global sort to this new sort.
                _m_sortOrder = newSortOrder;
                // resort players with new sort.
                for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
                    _SortPlayer(i);
                }
            };
            elStatPanel.SetPanelEvent('onactivate', _SetNewSortStat.bind(undefined, stat));
        }
    }
    //DEVONLY{
    function _ToggleSortOrderAndResort() {
        let defaultSort = _GetSortOrderForMode(MockAdapter.GetGameModeInternalName(false));
        if (_m_sortOrder == defaultSort)
            _m_sortOrder = sortOrder_reverse;
        else
            _m_sortOrder = defaultSort;
    }
    //}DEVONLY
    // custom stat values override
    function _GetCustomStatTextValue(stat, xuid) {
        let szCustomLabel = null;
        if (stat === 'ping') {
            if (MockAdapter.GetPlayerStatus(xuid) == 15) {
                szCustomLabel = '#SFUI_scoreboard_lbl_dc';
            }
            else if (MockAdapter.IsFakePlayer(xuid)) {
                szCustomLabel = '#SFUI_scoreboard_lbl_bot';
            }
            else if (IsTeamASpecTeam(MockAdapter.GetPlayerTeamName(xuid))) {
                szCustomLabel = '#SFUI_scoreboard_lbl_spec';
            }
        }
        return szCustomLabel;
    }
    // create a player row
    function _NewPlayerPanel(oPlayer) {
        if (!oPlayer.m_elTeam || !oPlayer.m_elTeam.IsValid())
            return;
        oPlayer.m_elPlayer = $.CreatePanel('Panel', oPlayer.m_elTeam, 'player-' + oPlayer.m_xuid);
        oPlayer.m_elPlayer.m_xuid = oPlayer.m_xuid; // store it on the panel as well for easy reverse lookup.
        _Helper_LoadSnippet(oPlayer.m_elPlayer, _GetPlayerRowForGameMode());
        let idx = 0;
        function _InitStatCell(elStatCell, oPlayer) {
            if (!elStatCell || !elStatCell.IsValid())
                return;
            let stat = elStatCell.GetAttributeString('data-stat', '');
            let set = elStatCell.GetAttributeString('data-set', '');
            let isHidden = elStatCell.GetAttributeString('data-hidden', '');
            // sometimes we group stat panels for layout. so recurse!
            let children = elStatCell.Children();
            for (let i = 0; i < children.length; i++) {
                _InitStatCell(children[i], oPlayer);
            }
            if (stat === '') {
                return;
            }
            // store pointer to the stat element
            oPlayer.m_oElStats[stat] = elStatCell;
            elStatCell.AddClass('sb-row__cell');
            elStatCell.AddClass('sb-row__cell--' + stat);
            // STAT CELLS
            // 
            if (set !== '') {
                // do we have a set container?
                let SetContainerId = 'id-sb-row__set-container';
                let elSetContainer = oPlayer.m_elPlayer.FindChildTraverse(SetContainerId);
                if (!elSetContainer || !elSetContainer.IsValid()) {
                    elSetContainer = $.CreatePanel('Panel', oPlayer.m_elPlayer, SetContainerId);
                    oPlayer.m_elPlayer.MoveChildBefore(elSetContainer, elStatCell);
                }
                // do we have a set?
                let setId = 'id-sb-set-' + set;
                let elSet = elSetContainer.FindChildTraverse(setId);
                if (!elSet || !elSet.IsValid) {
                    // create the set container
                    elSet = $.CreatePanel('Panel', elSetContainer, setId);
                    elSet.AddClass('sb-row__set');
                    elSet.AddClass('no-hover');
                    // reset the alt bg color
                    idx = 0;
                }
                // move the stat to the set
                elStatCell.SetParent(elSet);
                // hide any set other than the current one
                if (set != _m_dataSetCurrent.toString()) {
                    elSet.AddClass('hidden');
                }
            }
            // alternate dark backgrounds
            if (idx++ % 2)
                elStatCell.AddClass('sb-row__cell--dark');
            if (!isHidden) {
                _CreateStatUpdateFn(stat);
            }
        }
        // stats we want regardless of whether they have a column or not
        _CreateStatUpdateFn('teamname');
        _CreateStatUpdateFn('musickit');
        _CreateStatUpdateFn('status');
        _CreateStatUpdateFn('skillgroup');
        _CreateStatUpdateFn('leader');
        _CreateStatUpdateFn('teacher');
        _CreateStatUpdateFn('friendly');
        // process each stat:
        // - add a label for it in the header
        // - register the stat update function
        //
        let elStatCells = oPlayer.m_elPlayer.Children();
        let cellCount = elStatCells.length;
        for (let i = 0; i < cellCount; i++) {
            _InitStatCell(elStatCells[i], oPlayer);
        }
        // copies of stats
        oPlayer.m_oStats = {}; // dictionary of stats
        oPlayer.m_oStats['idx'] = GameStateAPI.GetPlayerSlot(oPlayer.m_xuid);
        // mouse events
        oPlayer.m_elPlayer.SetPanelEvent('onmouseover', function () {
            _m_arrSortingPausedRefGetCounter++;
        });
        oPlayer.m_elPlayer.SetPanelEvent('onmouseout', function () {
            _m_arrSortingPausedRefGetCounter--;
        });
        if (MockAdapter.IsXuidValid(oPlayer.m_xuid)) {
            oPlayer.m_elPlayer.SetPanelEvent('onactivate', function () {
                _m_arrSortingPausedRefGetCounter++;
                let elPlayerCardContextMenu = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + oPlayer.m_xuid, _OnPlayerCardDismiss.bind(undefined));
                elPlayerCardContextMenu.AddClass('ContextMenu_NoArrow');
                if (!_m_hDenyInputToGame) {
                    _m_hDenyInputToGame = UiToolkitAPI.AddDenyInputFlagsToGame(elPlayerCardContextMenu, 'ScoreboardPlayercard', 'CaptureMouse');
                }
            });
        }
        return oPlayer.m_elPlayer;
    }
    function _OnPlayerCardDismiss() {
        _m_arrSortingPausedRefGetCounter--;
        if (_m_hDenyInputToGame) {
            UiToolkitAPI.ReleaseDenyInputFlagsToGame(_m_hDenyInputToGame);
            _m_hDenyInputToGame = null;
        }
    }
    function _UpdateMatchInfo() {
        if (!_m_bInit)
            return;
        /////////////////////////////////////// NAME
        _m_cP.SetDialogVariable('server_name', _m_haveViewers ? '' : MockAdapter.GetServerName());
        _m_cP.SetDialogVariable('map_name', MockAdapter.GetMapName());
        _m_cP.SetDialogVariable('gamemode_name', MockAdapter.GetGameModeName(true));
        _m_cP.SetDialogVariable('tournament_stage', MockAdapter.GetTournamentEventStage());
        const elMapLabel = _m_cP.FindChildTraverse('id-sb-meta__labels__mode-map');
        if (elMapLabel && elMapLabel.IsValid() && elMapLabel.text == '') {
            if (MatchStatsAPI.IsTournamentMatch()) {
                elMapLabel.text = $.Localize('{s:tournament_stage} | {s:map_name}', _m_cP);
            }
            else {
                let strLocalizeScoreboardTitle = '{s:gamemode_name} | {s:map_name}';
                if ((GameStateAPI.GetGameModeInternalName(true) === 'competitive') &&
                    (GameTypesAPI.GetMapGroupAttribute('mg_' + GameStateAPI.GetMapBSPName(), 'competitivemod') === 'unranked')) {
                    strLocalizeScoreboardTitle = $.Localize('#SFUI_RankType_Modifier_Unranked', _m_cP) + ' | {s:map_name}';
                }
                else if (GameStateAPI.IsQueuedMatchmakingMode_Team()) {
                    let sMapName = '{s:map_name}';
                    if (GameStateAPI.GetMapBSPName() === 'lobby_mapveto')
                        sMapName = $.Localize('#matchdraft_arena_name', _m_cP);
                    strLocalizeScoreboardTitle = $.Localize('#SFUI_GameModeCompetitiveTeams', _m_cP) + ' | ' + sMapName;
                }
                elMapLabel.text = $.Localize(strLocalizeScoreboardTitle, _m_cP);
            }
        }
        if ($('#id-sb-meta__mode__image')) {
            if (GameStateAPI.IsQueuedMatchmakingMode_Team())
                $('#id-sb-meta__mode__image').SetImage('file://{images}/icons/ui/competitive_teams.svg');
            else
                $('#id-sb-meta__mode__image').SetImage(MockAdapter.GetGameModeImagePath());
        }
        if ($('#sb-meta__labels__map'))
            $('#sb-meta__labels__map').SetImage('file://{images}/map_icons/map_icon_' + MockAdapter.GetMapBSPName() + '.svg');
        let elCoopStats = $('#CoopStats');
        if (elCoopStats) {
            let questID = GameStateAPI.GetActiveQuestID();
            if (questID > 0) {
                elCoopStats.AddClass('show-mission-desc');
                MissionsAPI.ApplyQuestDialogVarsToPanelJS(questID, elCoopStats);
                let elLabel = elCoopStats.FindChildInLayoutFile('MissionDescriptionLabel');
                if (elLabel) {
                    let strMissionDescriptionToken = MissionsAPI.GetQuestDefinitionField(questID, 'loc_description');
                    elLabel.text = $.Localize(strMissionDescriptionToken, elCoopStats);
                }
            }
        }
        if (!MockAdapter.IsDemoOrHltv()) {
            const localTeamName = MockAdapter.GetPlayerTeamName(GetLocalPlayerId());
            if (_m_oTeams[localTeamName])
                _m_oTeams[localTeamName].CalculateAllCommends();
        }
        // mouse enable bind
        const elMouseBinding = _m_cP.FindChildInLayoutFile('id-sb-mouse-instructions');
        if (elMouseBinding && elMouseBinding.IsValid()) {
            let bind = GameInterfaceAPI.GetSettingString('cl_scoreboard_mouse_enable_binding');
            if (bind.charAt(0) == '+' || bind.charAt(0) == '-')
                bind = bind.substring(1);
            elMouseBinding.SetDialogVariable('scoreboard_mouse_enable_bind', $.Localize(`{s:bind_${bind}}`, elMouseBinding));
            elMouseBinding.text = $.Localize('#Scoreboard_Mouse_Enable_Instruction', elMouseBinding);
        }
        const elFooterWebsite = _m_cP.FindChildInLayoutFile('id-sb-footer-server-website');
        if (elFooterWebsite && elFooterWebsite.IsValid()) {
            const strWebsiteURL = MatchStatsAPI.GetServerWebsiteURL(false);
            if (strWebsiteURL) {
                elFooterWebsite.SetHasClass('hidden', false);
                elFooterWebsite.SetPanelEvent('onmouseover', () => UiToolkitAPI.ShowTextTooltip('id-sb-footer-server-website', strWebsiteURL));
                elFooterWebsite.SetPanelEvent('onmouseout', () => UiToolkitAPI.HideTextTooltip());
            }
            else {
                elFooterWebsite.SetHasClass('hidden', true);
            }
        }
    }
    function _UpdateHLTVViewerNumber(nViewers) {
        _m_cP.SetDialogVariableInt('viewers', nViewers);
        _m_haveViewers = nViewers > 0;
        _m_cP.SetDialogVariable('hltv_viewers', _m_haveViewers ? $.Localize('#Scoreboard_Viewers', _m_cP) : '');
    }
    function _UpdateRound(rnd, oScoreData, jsoTime) {
        if (!_SupportsTimeline(jsoTime))
            return;
        if (!oScoreData)
            return;
        if (!jsoTime)
            return;
        if (!('teamdata' in oScoreData))
            return;
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        let elRnd = elTimeline.FindChildTraverse(rnd.toString());
        if (!elRnd || !elRnd.IsValid())
            return;
        let elRndTop = elRnd.FindChildTraverse('id-sb-timeline__segment__round--top');
        let elRndBot = elRnd.FindChildTraverse('id-sb-timeline__segment__round--bot');
        elRndTop.FindChildTraverse('result').SetImage('');
        elRndBot.FindChildTraverse('result').SetImage('');
        elRndTop.SetDialogVariable('sb_clinch', '');
        elRndBot.SetDialogVariable('sb_clinch', '');
        //		$.Msg( "Updating round " + rnd );
        let elTick = elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick');
        if (elTick && elTick.IsValid()) {
            elTick.SetHasClass('hilite', rnd <= jsoTime['rounds_played'] + 1);
        }
        // clear all rounds in the future that may have been set before a match restart
        if (rnd > jsoTime['rounds_played']) {
            let bCanClinch = jsoTime['can_clinch'];
            if (bCanClinch) {
                let numToClinch = jsoTime['num_wins_to_clinch'];
                let topClinchRound = jsoTime['rounds_played'] + numToClinch - m_topScore;
                let bThisRoundIsClinchTop = rnd == topClinchRound;
                let botClinchRound = jsoTime['rounds_played'] + numToClinch - m_botScore;
                let bThisRoundIsClinchBot = rnd == botClinchRound;
                let bShowClinchTop = (bThisRoundIsClinchTop && topClinchRound <= botClinchRound);
                let bShowClinchBot = (bThisRoundIsClinchBot && botClinchRound <= topClinchRound);
                let thisRoundIsClinchAndShowIt = false;
                if (bShowClinchTop) {
                    elRndTop.FindChildTraverse('result').SetImage(dictRoundResultImage['win']);
                    thisRoundIsClinchAndShowIt = true;
                }
                if (bShowClinchBot) {
                    elRndBot.FindChildTraverse('result').SetImage(dictRoundResultImage['win']);
                    thisRoundIsClinchAndShowIt = true;
                }
                let roundIsPastClinch = (rnd > topClinchRound || rnd > botClinchRound);
                elRnd.SetHasClass('past-clinch', roundIsPastClinch);
                elRnd.SetHasClass('clinch-round', thisRoundIsClinchAndShowIt);
            }
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').RemoveClass('sb-team--CT');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').RemoveClass('sb-team--CT');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').RemoveClass('sb-team--TERRORIST');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').RemoveClass('sb-team--TERRORIST');
            let _ClearCasualties = function (elRnd) {
                for (let i = 1; i <= 5; i++) {
                    let img = elRnd.FindChildTraverse('casualty-' + i);
                    if (!img)
                        break;
                    img.AddClass('hidden');
                }
            };
            _ClearCasualties(elRndTop);
            _ClearCasualties(elRndBot);
            return;
        }
        let bFlippedSides = false;
        if (MockAdapter.AreTeamsPlayingSwitchedSides() !== MockAdapter.AreTeamsPlayingSwitchedSidesInRound(rnd)) {
            bFlippedSides = true;
            let elTemp = elRndTop;
            elRndTop = elRndBot;
            elRndBot = elTemp;
        }
        // set the team colors
        elRndTop.AddClass('sb-team--CT');
        elRndBot.AddClass('sb-team--TERRORIST');
        let idx;
        if (MatchStatsAPI.DoesSupportOvertimeStats()) {
            idx = rnd - jsoTime['first_round_this_period'] + 1;
        }
        else {
            idx = rnd;
        }
        const roundData = oScoreData.rounddata[idx];
        if (typeof roundData !== 'object')
            return;
        let result = roundData['result'].replace(/^(ct_|t_)/, '');
        // ROUND RESULTS
        if (roundData['result'].charAt(0) === 'c') {
            bFlippedSides ? m_botScore++ : m_topScore++;
            elRndTop.FindChildTraverse('result').SetImage(dictRoundResultImage[result]);
            elRndTop.FindChildTraverse('result').AddClass('sb-timeline__segment__round--active');
            elRndBot.FindChildTraverse('result').SetImage('');
            elRndBot.FindChildTraverse('result').RemoveClass('sb-timeline__segment__round--active');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').AddClass('sb-team--CT');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').AddClass('sb-team--CT');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').RemoveClass('sb-team--TERRORIST');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').RemoveClass('sb-team--TERRORIST');
        }
        else if (roundData['result'].charAt(0) === 't') {
            bFlippedSides ? m_topScore++ : m_botScore++;
            elRndBot.FindChildTraverse('result').SetImage(dictRoundResultImage[result]);
            elRndBot.FindChildTraverse('result').AddClass('sb-timeline__segment__round--active');
            elRndTop.FindChildTraverse('result').SetImage('');
            elRndTop.FindChildTraverse('result').RemoveClass('sb-timeline__segment__round--active');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').AddClass('sb-team--TERRORIST');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').AddClass('sb-team--TERRORIST');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick').RemoveClass('sb-team--CT');
            elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').RemoveClass('sb-team--CT');
        }
        // expecting "CT" or "TERRORIST" for teamName
        let _UpdateCasualties = function (teamName, elRnd) {
            if (_m_oTeams[teamName]) {
                let livingCount = teamName === 'CT' ? roundData.players_alive_CT : roundData.players_alive_TERRORIST;
                let nPlayers = 5;
                if (MockAdapter.GetGameModeInternalName(false) == 'scrimcomp2v2')
                    nPlayers = 2;
                for (let i = 1; i <= nPlayers; i++) {
                    let img = elRnd.FindChildTraverse('casualty-' + i);
                    if (!img)
                        break;
                    img.RemoveClass('hidden');
                    if (i > livingCount) {
                        img.AddClass('dead-casualty');
                    }
                    else {
                        img.RemoveClass('dead-casualty');
                    }
                }
            }
        };
        // CASUALTIES
        _UpdateCasualties('CT', elRndTop);
        _UpdateCasualties('TERRORIST', elRndBot);
    }
    function _ShowSurvivors(hide = false) {
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        let arrPanelsToToggleTransparency = [];
        function CollectPanelsToToggleTransparency(el) {
            if (!el || !el.IsValid())
                return;
            if (el.Children())
                el.Children().forEach(CollectPanelsToToggleTransparency);
            if (el.GetAttributeString('data-casualty-mouse-over-toggle-transparency', 'false') == 'true')
                arrPanelsToToggleTransparency.push(el);
        }
        elTimeline.Children().forEach(CollectPanelsToToggleTransparency);
        arrPanelsToToggleTransparency.forEach(el => el.SetHasClass('transparent', hide));
    }
    function _Casualties_OnMouseOver() {
        // ignore if survivors are always on
        if (GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0')
            _ShowSurvivors();
        UiToolkitAPI.ShowCustomLayoutTooltipStyled('1', 'id-tooltip-sb-casualties', 'file://{resources}/layout/tooltips/tooltip_scoreboard_casualties.xml', 'Tooltip_NoArrow');
    }
    function _Casualties_OnMouseOut() {
        // ignore if survivors are always on
        if (GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0')
            _ShowSurvivors(true);
        UiToolkitAPI.HideCustomLayoutTooltip('id-tooltip-sb-casualties');
    }
    function _RoundLossBonusMoneyForTeam(teamname) {
        let nLossAmount = MockAdapter.GetTeamNextRoundLossBonus(teamname);
        let nMaxLoss = parseInt(GameInterfaceAPI.GetSettingString('mp_consecutive_loss_max'));
        if (nLossAmount > nMaxLoss) {
            nLossAmount = nMaxLoss;
        }
        if (nLossAmount < 0) {
            nLossAmount = 0;
        }
        let nBaseAmount = parseInt(GameInterfaceAPI.GetSettingString('cash_team_loser_bonus'));
        let nConsecutiveBonus = parseInt(GameInterfaceAPI.GetSettingString('cash_team_loser_bonus_consecutive_rounds'));
        let nTotalAmount = nBaseAmount + (nLossAmount * nConsecutiveBonus);
        return nTotalAmount;
    }
    function _RoundLossBonusMoney_OnMouseOver_CT() {
        _m_cP.SetDialogVariable('round_loss_income_team', $.Localize('#counter-terrorists'));
        _m_cP.SetDialogVariableInt('round_loss_income_amount', _RoundLossBonusMoneyForTeam('CT'));
        let sTooltipText = $.Localize('#Scoreboard_lossmoneybonus_tooltip', _m_cP);
        UiToolkitAPI.ShowTextTooltip('id-sb-timeline__round-loss-bonus-money', sTooltipText);
    }
    function _RoundLossBonusMoney_OnMouseOut_CT() {
        UiToolkitAPI.HideTextTooltip();
    }
    function _RoundLossBonusMoney_OnMouseOver_TERRORIST() {
        _m_cP.SetDialogVariable('round_loss_income_team', $.Localize('#terrorists'));
        _m_cP.SetDialogVariableInt('round_loss_income_amount', _RoundLossBonusMoneyForTeam('TERRORIST'));
        let sTooltipText = $.Localize('#Scoreboard_lossmoneybonus_tooltip', _m_cP);
        UiToolkitAPI.ShowTextTooltip('id-sb-timeline__round-loss-bonus-money', sTooltipText);
    }
    function _RoundLossBonusMoney_OnMouseOut_TERRORIST() {
        UiToolkitAPI.HideTextTooltip();
    }
    function _UpdateTeamInfo(teamName) {
        let team = _m_oTeams[teamName];
        if (!team) {
            team = _m_oTeams[teamName] = new Team_t(teamName);
        }
        // team name
        _m_cP.SetDialogVariable('sb_team_name--' + teamName, MockAdapter.GetTeamClanName(teamName));
        // team logo
        const teamLogoImagePath = MockAdapter.GetTeamLogoImagePath(teamName);
        if (teamLogoImagePath != '') {
            for (const elTeamLogoBackground of _m_cP.FindChildrenWithClassTraverse('sb-team-logo-background--' + teamName)) {
                elTeamLogoBackground.style.backgroundImage = `url("file://{images}${teamLogoImagePath}")`;
                elTeamLogoBackground.AddClass('sb-team-logo-bg');
            }
        }
        // team player count
        _m_cP.SetDialogVariableInt(teamName + '_alive', MockAdapter.GetTeamLivingPlayerCount(teamName));
        _m_cP.SetDialogVariableInt(teamName + '_total', MockAdapter.GetTeamTotalPlayerCount(teamName));
    }
    function _UpdateTeams() {
        let oScoreData = MockAdapter.GetScoreDataJSO();
        // update team meta data
        for (let team in _m_oTeams) {
            _UpdateTeamInfo(team);
            // score
            if (!oScoreData || !('teamdata' in oScoreData) || !(team in oScoreData['teamdata']))
                continue;
            // 2 and 3 refer to the gamephase enums for first and second half, respectively.
            // this is used in the timeline strings
            const teamData = oScoreData.teamdata[team];
            _m_cP.SetDialogVariableInt('sb_team_score--' + team, teamData['score']);
            if ('score_1h' in teamData) {
                _m_cP.SetDialogVariableInt('sb_team_score_2--' + team, teamData['score_1h']);
            }
            if ('score_2h' in teamData) {
                _m_cP.SetDialogVariableInt('sb_team_score_3--' + team, teamData['score_2h']);
            }
            if ('score_ot' in teamData) {
                _m_cP.SetDialogVariableInt('sb_team_score_ot--' + team, teamData['score_ot']);
            }
            let elOTScore = _m_cP.FindChildTraverse('id-sb-timeline__score_ot');
            if (elOTScore && elOTScore.IsValid()) {
                elOTScore.SetHasClass('hidden', !('score_ot' in teamData));
                elOTScore.SetHasClass('fade', !('score_ot' in teamData));
            }
        }
    }
    function _InitClassicTeams() {
        _UpdateTeamInfo('TERRORIST');
        _UpdateTeamInfo('CT');
    }
    let m_topScore = 0;
    let m_botScore = 0;
    function _UpdateAllRounds() {
        let jsoTime = MockAdapter.GetTimeDataJSO();
        let oScoreData = MockAdapter.GetScoreDataJSO();
        if (!jsoTime)
            return;
        if (!oScoreData)
            return;
        if (!_SupportsTimeline(jsoTime))
            return;
        let lastRound;
        if (MatchStatsAPI.DoesSupportOvertimeStats()) {
            lastRound = jsoTime['last_round_this_period'];
        }
        else {
            lastRound = jsoTime['maxrounds'];
        }
        m_topScore = 0;
        m_botScore = 0;
        // scores are measured for the current period so if we're in overtime, intialize it with half of the rounds leading into this OT
        if (jsoTime['overtime'] > 0) {
            m_topScore = (jsoTime['maxrounds'] + (jsoTime['overtime'] - 1) * jsoTime['maxrounds_overtime']) / 2;
            m_botScore = (jsoTime['maxrounds'] + (jsoTime['overtime'] - 1) * jsoTime['maxrounds_overtime']) / 2;
        }
        for (let rnd = 1; rnd <= lastRound; rnd++) {
            _UpdateRound(rnd, oScoreData, jsoTime);
        }
    }
    function _UpdateScore_Classic() {
        // we may be trying to update scores before players and teams have been initialized.
        if (Object.keys(_m_oTeams).length === 0) {
            _InitClassicTeams();
        }
        _UpdateTeams();
        // MATCH INFO
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        let currentRound = jsoTime['rounds_played'] + 1;
        _m_cP.SetDialogVariable('match_phase', $.Localize('#gamephase_' + jsoTime['gamephase']));
        _m_cP.SetDialogVariable('rounds_remaining', jsoTime['rounds_remaining'].toString());
        _m_cP.SetDialogVariableInt('scoreboard_ot', jsoTime['overtime']);
        _m_cP.SetHasClass('sb-tournament-match', MatchStatsAPI.IsTournamentMatch());
        // clear the timelines and remake them because first half round results need to swap positions.
        let bResetTimeline = false;
        if (_m_maxRounds != jsoTime['maxrounds_this_period']) {
            bResetTimeline = true;
            _m_maxRounds = jsoTime['maxrounds_this_period'];
        }
        if (_m_areTeamsSwapped !== MockAdapter.AreTeamsPlayingSwitchedSides()) {
            bResetTimeline = true;
            _m_areTeamsSwapped = MockAdapter.AreTeamsPlayingSwitchedSides();
        }
        if (!_SupportsTimeline(jsoTime)) {
            bResetTimeline = true;
        }
        if (_m_overtime != jsoTime['overtime']) {
            _m_overtime = jsoTime['overtime'];
            bResetTimeline = true;
        }
        // should we update the rounds?
        if (bResetTimeline || !(currentRound in _m_RoundUpdated)) {
            if (bResetTimeline) {
                _ResetTimeline();
            }
            _UpdateAllRounds();
            _m_RoundUpdated[currentRound] = true;
        }
        else {
            // Always update current and previous round.
            let oScoreData = MockAdapter.GetScoreDataJSO();
            if (oScoreData) {
                _UpdateRound(currentRound - 1, oScoreData, jsoTime);
            }
        }
        _UpdateRoundLossBonus();
    }
    function _InsertTimelineDivider() {
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        let elDivider = $.CreatePanel('Panel', elTimeline, 'id-sb-timeline__divider');
        elDivider.AddClass('sb-timeline__divider');
    }
    function _InitTimelineSegment(startRound, endRound, phase) {
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        elTimeline.AddClass('sb-team-tint'); // we mark the entire timeline to be tinted whenever a team is applied
        let id = 'id-sb-timeline__segment--' + phase;
        let elSegment = elTimeline.FindChildTraverse(id);
        if (!elSegment || !elSegment.IsValid()) {
            elSegment = $.CreatePanel('Panel', elTimeline, id);
            elSegment.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment');
        }
        let elRoundContainer = elSegment.FindChildTraverse('id-sb-timeline__round-container');
        if (elRoundContainer && elRoundContainer.IsValid()) {
            // create the rounds
            for (let rnd = startRound; rnd <= endRound; rnd++) {
                let elRnd = elSegment.FindChildTraverse(rnd.toString());
                if (!elRnd || !elRnd.IsValid()) {
                    elRnd = $.CreatePanel('Panel', elRoundContainer, rnd.toString());
                    elRnd.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round');
                    let elTop = elRnd.FindChildTraverse('id-sb-timeline__segment__round--top');
                    elTop.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round__data');
                    let elBot = elRnd.FindChildTraverse('id-sb-timeline__segment__round--bot');
                    elBot.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round__data');
                    // put larger gaps every 5 rounds
                    if (rnd % 5 == 0) {
                        elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').text = rnd.toString();
                    }
                }
            }
        }
        // flip first half score positions
        if (MockAdapter.AreTeamsPlayingSwitchedSides() !== MockAdapter.AreTeamsPlayingSwitchedSidesInRound(endRound)) {
            let elCTScore = elSegment.FindChildTraverse('id-sb-timeline__segment__score__ct');
            let elTScore = elSegment.FindChildTraverse('id-sb-timeline__segment__score__t');
            if (elCTScore && elCTScore.IsValid()) {
                elCTScore.RemoveClass('sb-color--CT');
                elCTScore.AddClass('sb-color--TERRORIST');
            }
            if (elTScore && elTScore.IsValid()) {
                elTScore.RemoveClass('sb-color--TERRORIST');
                elTScore.AddClass('sb-color--CT');
            }
        }
    }
    function _SupportsTimeline(jsoTime) {
        if (jsoTime == undefined)
            jsoTime = MockAdapter.GetTimeDataJSO();
        let roundCountToEvaluate;
        if (MatchStatsAPI.DoesSupportOvertimeStats()) {
            roundCountToEvaluate = jsoTime['maxrounds_this_period'];
        }
        else {
            roundCountToEvaluate = jsoTime['maxrounds'];
        }
        return (roundCountToEvaluate <= 30);
    }
    function _UpdateRoundLossBonus() {
        let elRoundLossBonusMoney = _m_cP.FindChildInLayoutFile('id-sb-timeline__round-loss-bonus-money');
        if (elRoundLossBonusMoney && elRoundLossBonusMoney.IsValid()) {
            elRoundLossBonusMoney.AddClass('hidden');
            if (parseInt(GameInterfaceAPI.GetSettingString('mp_consecutive_loss_max')) > 0 &&
                parseInt(GameInterfaceAPI.GetSettingString('cash_team_loser_bonus_consecutive_rounds')) > 0) {
                let nLossT = MockAdapter.GetTeamNextRoundLossBonus('TERRORIST');
                let nLossCT = MockAdapter.GetTeamNextRoundLossBonus('CT');
                if (nLossT >= 0 && nLossCT >= 0) {
                    elRoundLossBonusMoney.RemoveClass('hidden');
                    for (let nClassIdx = 1; nClassIdx <= 4; ++nClassIdx) {
                        elRoundLossBonusMoney.SetHasClass('sb-timeline__round-loss-bonus-money__TERRORIST' + nClassIdx, nLossT >= nClassIdx);
                    }
                    for (let nClassIdx = 1; nClassIdx <= 4; ++nClassIdx) {
                        elRoundLossBonusMoney.SetHasClass('sb-timeline__round-loss-bonus-money__CT' + nClassIdx, nLossCT >= nClassIdx);
                    }
                }
            }
        }
    }
    function _ResetTimeline() {
        // $.Msg( "---SB----_ResetTimeline" );
        // When we reset timeline we should also update bonus
        _UpdateRoundLossBonus();
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        // clear the timeline
        elTimeline.RemoveAndDeleteChildren();
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        if (!_SupportsTimeline(jsoTime))
            return;
        // Show overtime rounds if we support them.
        let firstRound;
        let lastRound;
        let midRound;
        if (MatchStatsAPI.DoesSupportOvertimeStats()) {
            firstRound = jsoTime['first_round_this_period'];
            lastRound = jsoTime['last_round_this_period'];
            let elLabel = _m_cP.FindChildTraverse('id-sb-timeline__round-label');
            if (elLabel && elLabel.IsValid()) {
                elLabel.SetHasClass('hidden', jsoTime['overtime'] == 0);
            }
        }
        else {
            firstRound = 1;
            lastRound = jsoTime['maxrounds'];
        }
        midRound = firstRound + Math.ceil((lastRound - firstRound) / 2) - 1;
        if (MockAdapter.HasHalfTime()) {
            _InitTimelineSegment(firstRound, midRound, 'first-half');
            _InsertTimelineDivider();
            _InitTimelineSegment(midRound + 1, lastRound, 'second-half');
        }
        else // captures "casual"
         {
            _InitTimelineSegment(firstRound, lastRound, 'no-halves');
        }
        _UpdateAllRounds();
        if (GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '1')
            _ShowSurvivors();
    }
    function _UnborrowMusicKit() {
        GameInterfaceAPI.SetSettingString('cl_borrow_music_from_player_slot', '0');
        let oLocalPlayer = _m_oPlayers.GetPlayerByXuid(GetLocalPlayerId());
        _m_oUpdateStatFns['musickit'](oLocalPlayer, true);
    }
    function UpdateCasterButtons() {
        for (let i = 0; i < 4; i++) {
            let buttonName = '#spec-button' + (i + 1);
            let bActive = true;
            switch (i) {
                default:
                case 0:
                    bActive = !!GetCasterIsCameraman();
                    break;
                case 1:
                    bActive = !!GetCasterIsHeard();
                    break;
                case 2:
                    bActive = !!GetCasterControlsXray();
                    break;
                case 3:
                    bActive = !!GetCasterControlsUI();
                    break;
            }
            ToggleCasterButtonActive(buttonName, bActive);
        }
    }
    function ToggleCasterButtonActive(buttonName, bActive) {
        let button = $(buttonName);
        if (button == null)
            return;
        if (bActive == false && button.BHasClass('sb-spectator-control-button-notactive') == false) {
            button.AddClass('sb-spectator-control-button-notactive');
        }
        else if (bActive == true && button.BHasClass('sb-spectator-control-button-notactive') == true) {
            button.RemoveClass('sb-spectator-control-button-notactive');
        }
    }
    function _ToggleSetCasterIsCameraman() {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        if (GetCasterIsCameraman()) {
            GameStateAPI.SetCasterIsCameraman(0);
        }
        else {
            GameStateAPI.SetCasterIsCameraman(nCameraMan);
        }
        UpdateCasterButtons();
    }
    function _ToggleSetCasterIsHeard() {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        if (GetCasterIsHeard()) {
            GameStateAPI.SetCasterIsHeard(0);
        }
        else {
            GameStateAPI.SetCasterIsHeard(nCameraMan);
        }
        UpdateCasterButtons();
    }
    function _ToggleSetCasterControlsXray() {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        if (GetCasterControlsXray()) {
            GameStateAPI.SetCasterControlsXray(0);
            ToggleCasterButtonActive('#spec-button3', false);
        }
        else {
            GameStateAPI.SetCasterControlsXray(nCameraMan);
            ToggleCasterButtonActive('#spec-button3', true);
        }
    }
    function _ToggleSetCasterControlsUI() {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        if (GetCasterControlsUI()) {
            GameStateAPI.SetCasterControlsUI(0);
        }
        else {
            GameStateAPI.SetCasterControlsUI(nCameraMan);
        }
        UpdateCasterButtons();
    }
    ////////////////////////////////////////////////
    function _CycleStats() {
        if (_m_dataSetGetCount === 0)
            return;
        {
            _m_dataSetCurrent++;
            if (_m_dataSetCurrent >= _m_dataSetGetCount)
                _m_dataSetCurrent = 0;
        }
        // Labels
        let elLabelSets = $('#id-sb-row__sets');
        for (let i = 0; i < elLabelSets.Children().length; i++) {
            let elChild = elLabelSets.Children()[i];
            if (elChild.id == 'id-sb-labels-set-' + _m_dataSetCurrent) {
                elChild.RemoveClass('hidden');
            }
            else {
                elChild.AddClass('hidden');
            }
        }
        // Players
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let elPlayer = _m_oPlayers.GetPlayerByIndex(i).m_elPlayer;
            if (elPlayer && elPlayer.IsValid()) {
                let elSetContainer = elPlayer.FindChildTraverse('id-sb-row__set-container');
                if (elSetContainer && elSetContainer.IsValid()) {
                    for (let j = 0; j < elSetContainer.Children().length; j++) {
                        let elChild = elSetContainer.Children()[j];
                        if (elChild.id == 'id-sb-set-' + _m_dataSetCurrent) {
                            elChild.RemoveClass('hidden');
                        }
                        else {
                            elChild.AddClass('hidden');
                        }
                    }
                }
            }
        }
        StoreAPI.RecordUIEvent('ScoreboardMoreStatsToggle');
    }
    function _MuteVoice() {
        GameInterfaceAPI.ConsoleCommand('voice_modenable_toggle');
        $.Schedule(0.1, _UpdateMuteVoiceState);
    }
    function _UpdateMuteVoiceState() {
        StoreAPI.RecordUIEvent('ScoreboardMuteVoiceToggle');
        let muteState = GameInterfaceAPI.GetSettingString('voice_modenable') === '1';
        let elMuteImage = _m_cP.FindChildInLayoutFile('id-sb-meta__mutevoice__image');
        if (!elMuteImage)
            return;
        if (muteState) {
            elMuteImage.SetImage('file://{images}/icons/ui/unmuted.svg');
        }
        else {
            elMuteImage.SetImage('file://{images}/icons/ui/muted.svg');
        }
    }
    function _BlockUgc() {
        StoreAPI.RecordUIEvent('ScoreboardBlockUgcToggle');
        let ugcBlockState = GameInterfaceAPI.GetSettingString('cl_hide_avatar_images') !== '0' ||
            GameInterfaceAPI.GetSettingString('cl_sanitize_player_names') !== '0';
        if (ugcBlockState) {
            GameInterfaceAPI.SetSettingString('cl_sanitize_player_names', '0');
            GameInterfaceAPI.SetSettingString('cl_hide_avatar_images', '0');
        }
        else {
            GameInterfaceAPI.SetSettingString('cl_sanitize_player_names', '1');
            GameInterfaceAPI.SetSettingString('cl_hide_avatar_images', '2');
        }
        $.Schedule(0.1, _UpdateUgcState);
    }
    function _UpdateUgcState() {
        let ugcBlockState = GameInterfaceAPI.GetSettingString('cl_hide_avatar_images') !== '0' ||
            GameInterfaceAPI.GetSettingString('cl_sanitize_player_names') !== '0';
        let elBlockUgcImage = _m_cP.FindChildInLayoutFile('id-sb-meta__blockugc__image');
        if (!elBlockUgcImage)
            return;
        if (ugcBlockState) {
            elBlockUgcImage.SetImage('file://{images}/icons/ui/votekick.svg');
        }
        else {
            elBlockUgcImage.SetImage('file://{images}/icons/ui/player.svg');
        }
    }
    function _CreateLabelsForRow(el) {
        if (!el || !el.IsValid())
            return;
        for (let i = 0; i < el.Children().length; i++) {
            _CreateLabelsForRow(el.Children()[i]);
        }
        let stat = el.GetAttributeString('data-stat', '');
        let set = el.GetAttributeString('data-set', '');
        let isHidden = el.GetAttributeString('data-hidden', '');
        if (stat != '')
            _CreateLabelForStat(stat, set, isHidden);
    }
    function _GetSortOrderForMode(mode) {
        if (GameStateAPI.IsQueuedMatchmakingMode_Team())
            return sortOrder_tmm;
        switch (mode) {
            case 'gungameprogressive': // armsrace
                return sortOrder_gg;
            case 'deathmatch':
                if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                    return sortOrder_default;
                }
                return sortOrder_dm;
            case 'competitive':
                return sortOrder_tmm;
            default:
                return sortOrder_default;
        }
    }
    ////////////////////////////////////////////////
    function _Initialize() {
        // $.Msg( "---SB----_Initialize" );
        _Reset();
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        let scoreboardTemplate;
        let mode = MockAdapter.GetGameModeInternalName(false);
        let skirmish = MockAdapter.GetGameModeInternalName(true);
        // We want to differentiate the deathmatch modes but aren't sure this needs to be done outside of this scope. Do it here.
        if (mode == 'deathmatch') {
            // FFA
            if (GameInterfaceAPI.GetSettingString('mp_teammates_are_enemies') !== '0') {
                skirmish = 'ffadm';
            }
            else if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                skirmish = 'teamdm';
            }
        }
        //SRVL{
        if (mode === 'survival') {
            // Bailing on scoreboard for this mode
            // We re not going to have a traditional one in this mode
            return;
        }
        //}SRVL
        switch (mode) {
            case 'competitive':
            case 'scrimcomp2v2':
                scoreboardTemplate = 'snippet_scoreboard-classic--with-timeline--half-times';
                break;
            case 'deathmatch':
                if (skirmish == 'teamdm') {
                    scoreboardTemplate = 'snippet_scoreboard-classic--no-timeline';
                }
                else {
                    scoreboardTemplate = 'snippet_scoreboard--no-teams';
                }
                break;
            case 'training':
            case 'gungameprogressive':
                scoreboardTemplate = 'snippet_scoreboard--no-teams';
                break;
            case 'cooperative':
                scoreboardTemplate = 'snippet_scoreboard--cooperative';
                break;
            case 'coopmission':
                scoreboardTemplate = 'snippet_scoreboard--coopmission';
                break;
            case 'casual':
                if (skirmish == 'flyingscoutsman') {
                    scoreboardTemplate = 'snippet_scoreboard-classic--with-timeline--no-half-times';
                }
                else {
                    scoreboardTemplate = 'snippet_scoreboard-classic--no-timeline';
                }
                break;
            default:
                scoreboardTemplate = 'snippet_scoreboard-classic--no-timeline';
                break;
        }
        _Helper_LoadSnippet(_m_cP, scoreboardTemplate);
        // add a class to the root based on server conditions so we style appropriately
        //
        //
        if (MockAdapter.IsDemoOrHltv())
            _m_cP.AddClass('IsDemoOrHltv');
        if (MatchStatsAPI.IsTournamentMatch())
            _m_cP.AddClass('IsTournamentMatch');
        // choose a mode-appropriate sorting order
        _m_sortOrder = _GetSortOrderForMode(mode);
        // set labels
        let temp = $.CreatePanel('Panel', _m_cP, 'temp');
        _Helper_LoadSnippet(temp, _GetPlayerRowForGameMode());
        temp.visible = false;
        _CreateLabelsForRow(temp);
        temp.DeleteAsync(.0);
        _ResetTimeline();
        _m_bInit = true;
        // init these to blanks
        _m_cP.SetDialogVariable('server_name', '');
        _UpdateHLTVViewerNumber(0);
        _UpdateMatchInfo();
    }
    function _RankRevealAll() {
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let oPlayer = _m_oPlayers.GetPlayerByIndex(i);
            if (typeof (_m_oUpdateStatFns['skillgroup']) === 'function')
                _m_oUpdateStatFns['skillgroup'](oPlayer, true);
        }
    }
    function _UpdateScore() {
        switch (MockAdapter.GetGameModeInternalName(false)) {
            case 'competitive':
                _UpdateScore_Classic();
                break;
            case 'deathmatch':
                if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                    _UpdateScore_Classic();
                }
                break;
            case 'gungameprogressive':
                // no score box
                break;
            default:
            case 'casual':
                _UpdateScore_Classic();
                break;
        }
    }
    function _UpdateJob() {
        _UpdateMatchInfo();
        _UpdateScore();
        _UpdateNextPlayer();
    }
    function _UpdateEverything() {
        if (!_m_bInit) {
            _Initialize();
        }
        _UpdateMuteVoiceState();
        _UpdateUgcState();
        _UpdateMatchInfo();
        _UpdateScore();
        _UpdateAllPlayers_delayed(true);
        _UpdateSpectatorButtons();
        //	_UpdateLeaderboard();
    }
    function _OnMouseActive() {
        let elButtonPanel = _m_cP.FindChildTraverse('id-sb-meta__button-panel');
        if (elButtonPanel && elButtonPanel.IsValid())
            elButtonPanel.RemoveClass('hidden');
        let elServerViewers = _m_cP.FindChildTraverse('id-sb-meta__labels__server-viewers');
        if (elServerViewers && elServerViewers.IsValid())
            elServerViewers.AddClass('hidden');
        let elMouseInstructions = _m_cP.FindChildTraverse('id-sb-mouse-instructions');
        if (elMouseInstructions && elMouseInstructions.IsValid())
            elMouseInstructions.AddClass('hidden');
    }
    function _OnMouseInactive() {
        let elButtonPanel = _m_cP.FindChildTraverse('id-sb-meta__button-panel');
        if (elButtonPanel && elButtonPanel.IsValid())
            elButtonPanel.AddClass('hidden');
        let elServerViewers = _m_cP.FindChildTraverse('id-sb-meta__labels__server-viewers');
        if (elServerViewers && elServerViewers.IsValid())
            elServerViewers.RemoveClass('hidden');
        let elMouseInstructions = _m_cP.FindChildTraverse('id-sb-mouse-instructions');
        if (elMouseInstructions && elMouseInstructions.IsValid())
            elMouseInstructions.RemoveClass('hidden');
    }
    ////////////////////////////////////////////////
    function _CloseScoreboard() {
        if (_m_updatePlayerHandler) {
            $.UnregisterForUnhandledEvent('Scoreboard_UpdatePlayerByPlayerSlot', _m_updatePlayerHandler);
            _m_updatePlayerHandler = null;
        }
        // close any open player cards:
        $.DispatchEvent('DismissAllContextMenus');
        _OnMouseInactive();
    }
    ////////////////////////////////////////////////
    function _OpenScoreboard() {
        _UpdateEverything();
        _ShowSurvivors((GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0'));
        if (!_m_updatePlayerHandler) {
            _m_updatePlayerHandler = $.RegisterForUnhandledEvent('Scoreboard_UpdatePlayerByPlayerSlot', Scoreboard.UpdatePlayerByPlayerSlot);
        }
    }
    ////////////////////////////////////////////////
    function _OnEndOfMatch() {
        _OpenScoreboard();
    }
    function _GetFreeForAllTopThreePlayers() {
        _UpdateEverything();
        if (!$('#Scoreboard'))
            return [undefined, undefined, undefined];
        let elTeam = $('#Scoreboard').FindChildInLayoutFile('players-table-ANY');
        if (elTeam && elTeam.IsValid()) {
            const players = elTeam.Children();
            return [players[0]?.m_xuid || '0', players[1]?.m_xuid || '0', players[2]?.m_xuid || '0'];
        }
        return [undefined, undefined, undefined];
    }
    function _GetFreeForAllPlayerPosition(xuid) {
        _UpdateEverything();
        let elTeam = _m_cP.FindChildInLayoutFile('players-table-ANY');
        if (!elTeam || !elTeam.IsValid())
            return;
        let returnVal = 0;
        for (let i = 0; i < elTeam.Children().length; i++) {
            if (elTeam.Children()[i].m_xuid == xuid)
                returnVal = i + 1;
        }
        $.DispatchEvent('EndOfMatch_GetFreeForAllPlayerPosition_Response', returnVal);
    }
    // function _UpdateLeaderboard ( strLBname?: string ): void
    // {
    // 	let mode = MockAdapter.GetGameModeInternalName( false );
    // 	if ( mode !== 'cooperative' && mode !== 'coopmission' )
    // 	{
    // 		return;
    // 	}
    // 	let elLeaderboardStats = _m_cP.FindChildInLayoutFile( 'CoopStats' );
    // 	if ( !elLeaderboardStats )
    // 		return;
    // 	// Not a great way to control visibility... Assume we wont have LB data and add this class back on
    // 	// if we pass all the below checks. 
    // 	elLeaderboardStats.RemoveClass( 'show-mission-stats' );
    // 	// If server sent progress for this maatch, show that and return 
    // 	let hPrevDetails = LeaderboardsAPI.GetLeaderboardDetailsHandleForCoop();
    // 	let activeQuestID = GameStateAPI.GetActiveQuestID();
    // 	if ( activeQuestID > 0 && LeaderboardsAPI.GetDetailsQuestID( hPrevDetails ) === activeQuestID )
    // 	{
    // 		UpdateCoopScores( hPrevDetails );
    // 		return;
    // 	}
    // 	// Require a leaderboard name or an quest quest to deduce it
    // 	if ( strLBname === undefined )
    // 	{
    // 		if ( activeQuestID === 0 )
    // 			return;
    // 		strLBname = 'official_leaderboard_quest_' + activeQuestID;
    // 	}
    // 	// Get previous best from leaderboards
    // 	let lbState = LeaderboardsAPI.GetState( strLBname );
    // 	if ( lbState === 'none' )
    // 	{
    // 		LeaderboardsAPI.Refresh( strLBname );
    // 	} else if ( lbState === 'ready' )
    // 	{
    // 		// Requery occasionally, this behavior was copied from actionscript
    // 		let cacheTimeMinutes = LeaderboardsAPI.HowManyMinutesAgoCached( strLBname );
    // 		if ( cacheTimeMinutes > 3 )
    // 		{
    // 			LeaderboardsAPI.Refresh( strLBname );
    // 		} else
    // 		{
    // 			//@Ido this call was removed by you in Version 65 of file
    // 			// let hDetails = LeaderboardsAPI.GetEntryDetailsHandleByXuid( strLBname, MyPersonaAPI.GetXuid() );
    // 			// if ( hDetails )
    // 			// 	UpdateCoopScores( hDetails );
    // 		}
    // 	}
    // }
    // function _OnFinalCoopScore (): void
    // {
    // 	let hDetailHandle = LeaderboardsAPI.GetLeaderboardDetailsHandleForCoop();
    // 	_m_cP.AddClass( 'coop-finalscore' ); // changes top row labels to indicate result of current match and not previous LB results
    // 	UpdateCoopScores( hDetailHandle );
    // }
    //DEVONLY{
    //--------------------------------------------------------------------------------------------------
    //--------------------------------------------------------------------------------------------------
    function _CreateBugReport() {
        let strReport = 'Sample\n';
        for (let i = 0; i < 10; i++) {
            strReport += 'Line' + i + '\n';
        }
        return strReport;
    }
    //}DEVONLY
    // function UpdateCoopScores ( hDetailHandle: string ): void
    // {
    // 	let elLeaderboardStats = _m_cP.FindChildInLayoutFile( 'CoopStats' );
    // 	if ( !elLeaderboardStats )
    // 		return;
    // 	let mode = MockAdapter.GetGameModeInternalName( false );
    // 	if ( mode !== 'cooperative' && mode !== 'coopmission' )
    // 	{
    // 		return;
    // 	}
    // 	elLeaderboardStats.AddClass( 'show-mission-stats' ); // Show stats in the scoreboard instead of instructions
    // 	let nScoreCount = LeaderboardsAPI.GetDetailsMatchScoreboardStatsCount( hDetailHandle, 'score' );
    // 	for ( let i = 0; i < nScoreCount; ++i )
    // 	{
    // 		// Write name, stat value and stat score to dialog vars and let snippet organize where they're shown
    // 		let strNameToken = LeaderboardsAPI.GetDetailsMatchScoreboardStatNameByIndex( hDetailHandle, 'score', i );
    // 		elLeaderboardStats.SetDialogVariable( 'statname' + i, $.Localize( strNameToken ) );
    // 		FormatStatValueDialogVar();
    // 		FormatStatScoreDialogVar();
    // 		// Special case formating hacks for display. 
    // 		// For some stats we show what server sends but there are a few 
    // 		// special cases depending on the stat and game mode. 
    // 		function FormatStatValueDialogVar ()
    // 		{
    // 			let stat = LeaderboardsAPI.GetDetailsMatchScoreboardStatValueByIndex( hDetailHandle, 'score', i );
    // 			let statKey = 'statval' + i;
    // 			if ( strNameToken === '#SFUI_Scoreboard_Coop_DmgToEnemyRatio' )
    // 			{
    // 				elLeaderboardStats.SetDialogVariable( statKey, ( 100 - stat / 100 ).toFixed( 1 ) );
    // 			}
    // 			else if ( strNameToken === '#SFUI_Scoreboard_Coop_TeamAccuracy' || strNameToken === '#SFUI_Scoreboard_Coop_Headshots' )
    // 			{
    // 				elLeaderboardStats.SetDialogVariableInt( statKey, stat / 100 );
    // 			}
    // 			else if ( strNameToken === '#SFUI_Scoreboard_Coop_TimeLeft' )
    // 			{
    // 				elLeaderboardStats.SetDialogVariableTime( statKey, stat );
    // 			}
    // 			else
    // 			{
    // 				elLeaderboardStats.SetDialogVariableInt( statKey, stat );
    // 			}
    // 		};
    // 		function FormatStatScoreDialogVar ()
    // 		{
    // 			let score = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreByIndex( hDetailHandle, 'score', i );
    // 			if ( strNameToken === '#SFUI_Scoreboard_Coop_DmgToEnemyRatio' )
    // 				score = 10000 - score;
    // 			elLeaderboardStats.SetDialogVariableInt( 'statscore' + i, score );
    // 		};
    // 	}
    // 	let nBonusCount = LeaderboardsAPI.GetDetailsMatchScoreboardStatsCount( hDetailHandle, 'bonus' );
    // 	for ( let i = 0; i < nBonusCount; ++i )
    // 	{
    // 		elLeaderboardStats.SetDialogVariable( 'bonusname' + i, $.Localize( LeaderboardsAPI.GetDetailsMatchScoreboardStatNameByIndex( hDetailHandle, 'bonus', i ) ) );
    // 		elLeaderboardStats.SetDialogVariableInt( 'bonusval' + i, LeaderboardsAPI.GetDetailsMatchScoreboardStatValueByIndex( hDetailHandle, 'bonus', i ) );
    // 		elLeaderboardStats.SetDialogVariableInt( 'bonusscore' + i, LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreByIndex( hDetailHandle, 'bonus', i ) );
    // 	}
    // 	let nBonus = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal( hDetailHandle, 'bonus' );
    // 	elLeaderboardStats.SetDialogVariableInt( 'bonus_score', nBonus );
    // 	let nScore = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal( hDetailHandle, 'score' );
    // 	elLeaderboardStats.SetDialogVariableInt( 'score', nScore );
    // 	let nTotalScore = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal( hDetailHandle, 'all' );
    // 	elLeaderboardStats.SetDialogVariableInt( 'total_score', nTotalScore );
    // }
    function GetCasterIsCameraman() {
        let nCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_autodirector_cameraman'));
        let bQ = (MockAdapter.IsDemoOrHltv() && nCameraMan != 0 && MockAdapter.IsHLTVAutodirectorOn());
        return bQ;
    }
    function GetCasterIsHeard() {
        if (MockAdapter.IsDemoOrHltv()) {
            return !!parseInt(GameInterfaceAPI.GetSettingString('voice_caster_enable'));
        }
        return false;
    }
    // function GetCasterControlIsDisabled()
    // {
    // 	let bDisableWithControl = parseInt( GameInterfaceAPI.GetSettingString( 'spec_cameraman_disable_with_user_control' ) );
    // 	let bQ = ( MockAdapter.IsDemoOrHltv() && bDisableWithControl && MockAdapter.IsHLTVAutodirectorOn() == false );
    // 	return bQ;
    // }
    function GetCasterControlsXray() {
        let bXRay = MockAdapter.IsDemoOrHltv() && parseInt(GameInterfaceAPI.GetSettingString('spec_cameraman_xray'));
        return bXRay;
    }
    function GetCasterControlsUI() {
        let bSpecCameraMan = parseInt(GameInterfaceAPI.GetSettingString('spec_cameraman_ui'));
        let bQ = (MockAdapter.IsDemoOrHltv() && bSpecCameraMan);
        return bQ;
    }
    function _ApplyPlayerCrosshairCode(panel, xuid) {
        UiToolkitAPI.ShowGenericPopupYesNo($.Localize('#tooltip_copycrosshair'), $.Localize('#GameUI_Xhair_Copy_Code_Confirm'), '', function () { let code = GameStateAPI.GetCrosshairCode(xuid); MyPersonaAPI.BApplyCrosshairCode(code); }, function () { });
    }
    /* Public interface */
    return {
        OpenScoreboard: _OpenScoreboard,
        CloseScoreboard: _CloseScoreboard,
        UpdateMatchInfo: _UpdateMatchInfo,
        UpdatePlayerByPlayerSlot: _UpdatePlayerByPlayerSlot_delayed,
        UpdateEverything: _UpdateEverything,
        ResetAndInit: _Initialize,
        Casualties_OnMouseOver: _Casualties_OnMouseOver,
        Casualties_OnMouseOut: _Casualties_OnMouseOut,
        RoundLossBonusMoney_OnMouseOver_CT: _RoundLossBonusMoney_OnMouseOver_CT,
        RoundLossBonusMoney_OnMouseOut_CT: _RoundLossBonusMoney_OnMouseOut_CT,
        RoundLossBonusMoney_OnMouseOver_TERRORIST: _RoundLossBonusMoney_OnMouseOver_TERRORIST,
        RoundLossBonusMoney_OnMouseOut_TERRORIST: _RoundLossBonusMoney_OnMouseOut_TERRORIST,
        UpdateJob: _UpdateJob,
        CycleStats: _CycleStats,
        OnMouseActive: _OnMouseActive,
        OnEndOfMatch: _OnEndOfMatch,
        GetFreeForAllTopThreePlayers: _GetFreeForAllTopThreePlayers,
        GetFreeForAllPlayerPosition: _GetFreeForAllPlayerPosition,
        UnborrowMusicKit: _UnborrowMusicKit,
        UpdateHLTVViewerNumber: _UpdateHLTVViewerNumber,
        ToggleSetCasterIsCameraman: _ToggleSetCasterIsCameraman,
        ToggleSetCasterIsHeard: _ToggleSetCasterIsHeard,
        ToggleSetCasterControlsXray: _ToggleSetCasterControlsXray,
        ToggleSetCasterControlsUI: _ToggleSetCasterControlsUI,
        MuteVoice: _MuteVoice,
        BlockUgc: _BlockUgc,
        RankRevealAll: _RankRevealAll,
        // UpdateLeaderboard: _UpdateLeaderboard,
        // OnFinalCoopScore: _OnFinalCoopScore,
        ApplyPlayerCrosshairCode: _ApplyPlayerCrosshairCode,
        //DEVONLY{		
        ToggleSortOrderAndResort: _ToggleSortOrderAndResort,
        CreateBugReport: _CreateBugReport
        //}DEVONLY
    };
})();
//DEVONLY{		
//--------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------
function CreateBugReport() {
    return Scoreboard.CreateBugReport();
}
//}DEVONLY
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    $.RegisterForUnhandledEvent('OnOpenScoreboard', Scoreboard.OpenScoreboard);
    $.RegisterForUnhandledEvent('OnCloseScoreboard', Scoreboard.CloseScoreboard);
    $.RegisterForUnhandledEvent('GameState_OnLevelLoad', Scoreboard.ResetAndInit);
    $.RegisterForUnhandledEvent('Scoreboard_ResetAndInit', Scoreboard.ResetAndInit);
    $.RegisterForUnhandledEvent('Scoreboard_UpdateEverything', Scoreboard.UpdateEverything);
    $.RegisterForUnhandledEvent('Scoreboard_UpdateJob', Scoreboard.UpdateJob);
    $.RegisterForUnhandledEvent('Scoreboard_CycleStats', Scoreboard.CycleStats);
    $.RegisterForUnhandledEvent('Scoreboard_OnMouseActive', Scoreboard.OnMouseActive);
    $.RegisterForUnhandledEvent('Scoreboard_OnEndOfMatch', Scoreboard.OnEndOfMatch);
    $.RegisterForUnhandledEvent('Scoreboard_UnborrowMusicKit', Scoreboard.UnborrowMusicKit);
    $.RegisterForUnhandledEvent('Scoreboard_ToggleSetCasterIsCameraman', Scoreboard.ToggleSetCasterIsCameraman);
    $.RegisterForUnhandledEvent('Scoreboard_ToggleSetCasterIsHeard', Scoreboard.ToggleSetCasterIsHeard);
    $.RegisterForUnhandledEvent('Scoreboard_ToggleSetCasterControlsXray', Scoreboard.ToggleSetCasterControlsXray);
    $.RegisterForUnhandledEvent('Scoreboard_ToggleSetCasterControlsUI', Scoreboard.ToggleSetCasterControlsUI);
    $.RegisterForUnhandledEvent('GameState_RankRevealAll', Scoreboard.RankRevealAll);
    $.RegisterForUnhandledEvent('Scoreboard_UpdateHLTVViewers', Scoreboard.UpdateHLTVViewerNumber);
    $.RegisterForUnhandledEvent('Scoreboard_Casualties_OnMouseOver', Scoreboard.Casualties_OnMouseOver);
    $.RegisterForUnhandledEvent('Scoreboard_Casualties_OnMouseOut', Scoreboard.Casualties_OnMouseOut);
    $.RegisterForUnhandledEvent('Scoreboard_RoundLossBonusMoney_OnMouseOver_CT', Scoreboard.RoundLossBonusMoney_OnMouseOver_CT);
    $.RegisterForUnhandledEvent('Scoreboard_RoundLossBonusMoney_OnMouseOut_CT', Scoreboard.RoundLossBonusMoney_OnMouseOut_CT);
    $.RegisterForUnhandledEvent('Scoreboard_RoundLossBonusMoney_OnMouseOver_TERRORIST', Scoreboard.RoundLossBonusMoney_OnMouseOver_TERRORIST);
    $.RegisterForUnhandledEvent('Scoreboard_RoundLossBonusMoney_OnMouseOut_TERRORIST', Scoreboard.RoundLossBonusMoney_OnMouseOut_TERRORIST);
    // $.RegisterForUnhandledEvent( 'PanoramaComponent_Leaderboards_StateChange', Scoreboard.UpdateLeaderboard );
    // $.RegisterForUnhandledEvent( 'CoopScoreReceived', Scoreboard.OnFinalCoopScore );
    // $.RegisterForUnhandledEvent( 'GameState_OnMatchStart', function ()
    // {
    // 	$.Schedule( 0.1, Scoreboard.UpdateLeaderboard );
    // } );
    $.RegisterForUnhandledEvent('Scoreboard_MuteVoice', Scoreboard.MuteVoice);
    $.RegisterForUnhandledEvent('Scoreboard_BlockUgc', Scoreboard.BlockUgc);
    $.RegisterForUnhandledEvent('Scoreboard_ApplyPlayerCrosshairCode', Scoreboard.ApplyPlayerCrosshairCode);
    //DEVONLY{	
    // $.RegisterForUnhandledEvent( 'Scoreboard_Debug_Sort', Scoreboard.ToggleSortOrderAndResort );
    //}DEVONLY
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjb3JlYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0RBQXNEO0FBQ3RELDZDQUE2QztBQUM3Qyx5Q0FBeUM7QUFHekM7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBaUJFO0FBRUYsSUFBSSxVQUFVLEdBQUcsQ0FBRTtJQUVsQixTQUFTLElBQUksQ0FBRyxJQUFZO1FBRTNCLENBQUMsQ0FBQyxHQUFHLENBQUUsaUJBQWlCLEdBQUcsSUFBSSxDQUFFLENBQUM7SUFDbkMsQ0FBQztJQWtCRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFzQixDQUFDO0lBRXRELElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLENBQUcseUNBQXlDO0lBQ3RFLFNBQVMsZ0JBQWdCO1FBRXhCLElBQUssZ0JBQWdCLEtBQUssRUFBRTtZQUMzQixnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN0RCxPQUFPLGdCQUFnQixDQUFDO0lBQ3pCLENBQUM7SUFVRCxvQ0FBb0M7SUFDcEMsRUFBRTtJQUNGLE1BQU0sTUFBTTtRQUVYLHFCQUFxQixHQUF1RTtZQUMzRixRQUFRLEVBQUUsRUFBRTtZQUNaLFNBQVMsRUFBRSxFQUFFO1lBQ2IsVUFBVSxFQUFFLEVBQUU7U0FDZCxDQUFDO1FBQ0YsVUFBVSxDQUFTO1FBRW5CLFlBQWEsUUFBZ0I7WUFFNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7UUFDNUIsQ0FBQztRQUVELHFHQUFxRztRQUNyRyxvQkFBb0I7WUFFakIsQ0FBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBdUIsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBRTFFLGtGQUFrRjtnQkFDbEYsMERBQTBEO2dCQUUxRCxJQUFJLENBQUMsdUJBQXVCLENBQUUsSUFBSSxDQUFFLENBQUM7Z0JBRXJDLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxjQUFjLENBQUUsSUFBSSxDQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBRSxDQUFDO2dCQUVsRSxjQUFjLENBQUUsSUFBSSxDQUFFLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFFLElBQUksQ0FBRSxDQUFDO2dCQUMxRCxJQUFJLENBQUMscUJBQXFCLENBQUUsY0FBYyxDQUFFLElBQUksQ0FBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUUsQ0FBQyxDQUFDLFNBQVM7WUFDNUUsQ0FBQyxDQUFFLENBQUM7UUFDTCxDQUFDO1FBRUQsc0JBQXNCLENBQUcsSUFBWSxFQUFFLElBQW1CLEVBQUUsS0FBYTtZQUV4RSxJQUFLLEtBQUssSUFBSSxDQUFDO2dCQUNkLE9BQU87WUFFUixJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUUsQ0FBQztZQUV0RixJQUFLLENBQUMsYUFBYSxFQUNuQjtnQkFDQyxJQUFJLENBQUMscUJBQXFCLENBQUUsSUFBSSxDQUFFLENBQUMsSUFBSSxDQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUUsQ0FBQzthQUM1RTtpQkFFRDtnQkFDQyxhQUFhLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQzthQUM5QjtRQUVGLENBQUM7UUFFRCxvQ0FBb0MsQ0FBRyxJQUFZO1lBR2hELENBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQXVCLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxFQUFFO2dCQUUxRSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsSUFBSSxDQUFFLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUUsQ0FBQztnQkFFbkYsSUFBSyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQ2hCO29CQUNDLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxJQUFJLENBQUUsQ0FBQyxNQUFNLENBQUUsS0FBSyxFQUFFLENBQUMsQ0FBRSxDQUFDO2lCQUN0RDtZQUNGLENBQUMsQ0FBRSxDQUFDO1FBR0wsQ0FBQztRQUVPLHFCQUFxQixDQUFHLElBQVksRUFBRSxJQUFZLEVBQUUsTUFBZTtZQUUxRSxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDO1lBQ2xELElBQUssQ0FBQyxPQUFPO2dCQUNaLE9BQU87WUFFUixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ2xDLElBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNwQyxPQUFPO1lBRVIsSUFBSSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsNkJBQTZCLEdBQUcsSUFBSSxDQUFFLENBQUM7WUFDN0YsSUFBSyxDQUFDLG1CQUFtQixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFO2dCQUMxRCxPQUFPO1lBRVIsbUJBQW1CLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBRSxDQUFDO1FBQ3RELENBQUM7UUFFTyx1QkFBdUIsQ0FBRyxJQUFtQjtZQUVwRCxPQUFPO1lBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFFLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBRSxVQUFXLENBQUMsRUFBRSxDQUFDLElBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUNoRyxDQUFDO1FBRU8sbUJBQW1CLENBQUcsSUFBWTtZQUV6QyxRQUFTLElBQUksRUFDYjtnQkFDQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7Z0JBQ3RELEtBQUssU0FBUyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDeEQsS0FBSyxVQUFVLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQzthQUNwQjtRQUNGLENBQUM7UUFFTyx3QkFBd0I7WUFFL0IsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBRWpELE9BQU8sR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDekMsQ0FBQztRQUVPLHlCQUF5QjtZQUVoQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsU0FBUyxDQUFFLENBQUM7WUFFbEQsSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDaEQsSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFFaEQsSUFBSyxRQUFRLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFO2dCQUMvQyxPQUFPLFFBQVEsQ0FBQzs7Z0JBRWhCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFFTywwQkFBMEI7WUFFakMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLFVBQVUsQ0FBRSxDQUFDO1lBRW5ELElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2pELElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2pELElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBRWpELElBQUssU0FBUyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUU7Z0JBQ2pHLE9BQU8sU0FBUyxDQUFDO2lCQUNiLElBQUssU0FBUyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUU7Z0JBQ3RHLE9BQU8sU0FBUyxDQUFDOztnQkFFakIsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztLQUNEO0lBRUQsTUFBTSxRQUFRO1FBRWIsTUFBTSxDQUFTO1FBQ2YsVUFBVSxHQUE4QixTQUFTLENBQUMsQ0FBQyw0QkFBNEI7UUFDL0UsUUFBUSxHQUF3QixTQUFTLENBQUMsQ0FBRSw4REFBOEQ7UUFDMUcsUUFBUSxHQUE0QyxFQUFFLENBQUMsQ0FBSSx3Q0FBd0M7UUFDbkcsVUFBVSxHQUF3QixFQUFFLENBQUMsQ0FBRyx5Q0FBeUM7UUFDakYsU0FBUyxHQUFZLEtBQUssQ0FBQyxDQUFNLGVBQWU7UUFDaEQsYUFBYSxHQUE4QixTQUFTLENBQUM7UUFFckQsWUFBYSxJQUFZO1lBRXhCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxVQUFVLENBQUcsSUFBZ0IsRUFBRSxPQUFlLENBQUM7WUFFOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUNsQyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxRQUFRLENBQUUsR0FBRyxDQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2hFLENBQUM7UUFFRCxXQUFXLENBQUcsSUFBZ0IsRUFBRSxPQUFlLEVBQUU7WUFFaEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUNsQyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUM1RSxDQUFDO0tBQ0Q7SUFFRCxNQUFNLFlBQVk7UUFFVCxZQUFZLEdBQWUsRUFBRSxDQUFDO1FBRXRDLFNBQVMsQ0FBRyxJQUFZO1lBR3ZCLElBQUksU0FBUyxHQUFHLElBQUksUUFBUSxDQUFFLElBQUksQ0FBRSxDQUFDO1lBRXJDLElBQUksUUFBUSxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUV0RCxJQUFLLGVBQWUsQ0FBRSxRQUFRLENBQUU7Z0JBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7WUFFeEIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLGdCQUFnQixHQUFHLFFBQVEsQ0FBRSxDQUFDO1lBQ3hFLElBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQ2pDO2dCQUNDLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQzthQUM1RDtZQUNELFNBQVMsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO1lBRTVCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFFLFNBQVMsQ0FBRSxDQUFDO1lBRXBDLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxnQkFBZ0IsQ0FBRyxDQUFTO1lBRTNCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUMvQixDQUFDO1FBRUQsZUFBZSxDQUFHLElBQXdCO1lBRXpDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBRSxDQUFDO1FBQ3pELENBQUM7UUFFRCwwQkFBMEIsQ0FBRyxJQUFZO1lBRXhDLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxpQ0FBaUMsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUVsRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUMxQyxDQUFDO1FBRUQsb0JBQW9CLENBQUcsSUFBWTtZQUVsQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUUsQ0FBQztRQUM5RCxDQUFDO1FBRUQsUUFBUTtZQUVQLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDakMsQ0FBQztRQUVELGtCQUFrQixDQUFHLElBQVk7WUFFaEMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUMzQyxNQUFNLFFBQVEsR0FBRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQztZQUM3QyxJQUFLLFFBQVEsSUFBSSxTQUFTLENBQUUsUUFBUSxDQUFFLEVBQ3RDO2dCQUNDLFNBQVMsQ0FBRSxRQUFRLENBQUcsQ0FBQyxvQ0FBb0MsQ0FBRSxJQUFJLENBQUUsQ0FBQzthQUNwRTtZQUVELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUUxQyxJQUFLLElBQUksQ0FBQyxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUMsVUFBVyxDQUFDLE9BQU8sRUFBRSxFQUN0RjtnQkFDQyxJQUFJLENBQUMsWUFBWSxDQUFFLENBQUMsQ0FBRSxDQUFDLFVBQVcsQ0FBQyxXQUFXLENBQUUsRUFBRSxDQUFFLENBQUM7YUFDckQ7WUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLENBQUM7UUFDbEMsQ0FBQztRQUVELG9CQUFvQixDQUFHLFdBQTJDO1lBRWpFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUUsV0FBVyxDQUFFLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBRSxJQUFJLElBQUksRUFBRSxDQUFFLENBQUUsQ0FBQztZQUM1RixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBRSxDQUFFLENBQUM7WUFDM0QsS0FBTSxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxFQUN2QztnQkFDQyxJQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQ2hDO29CQUNDLG1FQUFtRTtvQkFDbkUsSUFBSSxDQUFDLGtCQUFrQixDQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUUsQ0FBQztpQkFDekM7YUFDRDtRQUNGLENBQUM7S0FDRDtJQUVELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztJQUVyQixJQUFJLGlCQUFpQixHQUEyQyxFQUFFLENBQUMsQ0FBRyxrRkFBa0Y7SUFDeEosSUFBSSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsQ0FBRSxtQ0FBbUM7SUFDbEUsSUFBSSxTQUFTLEdBQStCLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QjtJQUN4RSxJQUFJLGdDQUFnQyxHQUFHLENBQUMsQ0FBQyxDQUFDLG9DQUFvQztJQUM5RSxJQUFJLG1CQUFtQixHQUFrQixJQUFJLENBQUMsQ0FBQyx5RUFBeUU7SUFFeEgsSUFBSSxpQkFBaUIsR0FBRyxDQUFDLENBQUM7SUFDMUIsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7SUFFM0IsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3JCLElBQUksV0FBeUIsQ0FBQyxDQUFJLCtCQUErQjtJQUVqRSxJQUFJLGVBQWUsR0FBZ0MsRUFBRSxDQUFDLENBQUcsK0ZBQStGO0lBRXhKLElBQUksY0FBYyxHQUFrQztRQUNuRCxRQUFRLEVBQUUsR0FBRztRQUNiLFNBQVMsRUFBRSxHQUFHO1FBQ2QsVUFBVSxFQUFFLEdBQUc7S0FDZixDQUFDO0lBQ0YsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0lBRXBCLElBQUksc0JBQXNCLEdBQWtCLElBQUksQ0FBQztJQUVqRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFFM0IsSUFBSSxRQUFRLEdBQW9CLEVBQUUsQ0FBQztJQUVwQyxVQUFVO0lBQ1QsUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNmLFVBQVU7SUFHVCxNQUFNLGlCQUFpQixHQUFnQjtRQUV0QyxJQUFJLEVBQUUsQ0FBQztRQUNQLE9BQU8sRUFBRSxDQUFDO1FBQ1YsTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLEVBQUUsQ0FBQztRQUNULE9BQU8sRUFBRSxDQUFDO1FBQ1YsU0FBUyxFQUFFLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ1osUUFBUSxFQUFFLENBQUM7UUFDWCxTQUFTLEVBQUUsQ0FBQztRQUNaLFVBQVUsRUFBRSxDQUFDO1FBQ2IsTUFBTSxFQUFFLENBQUM7UUFDVCxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ1QsOERBQThEO1FBQzlELGdFQUFnRTtRQUNoRSxRQUFRLEVBQUUsQ0FBQztRQUNYLFNBQVMsRUFBRSxDQUFDO1FBQ1osT0FBTyxFQUFFLENBQUM7UUFDVixLQUFLLEVBQUUsQ0FBQztRQUNSLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixlQUFlLEVBQUUsQ0FBQztRQUNsQixnQkFBZ0IsRUFBRSxDQUFDO0tBQ25CLENBQUM7SUFFRixNQUFNLGlCQUFpQixHQUFnQjtRQUV0QyxJQUFJLEVBQUUsQ0FBQztRQUNQLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDWCxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ1YsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNWLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDWCxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ2IsUUFBUSxFQUFFLENBQUM7UUFDWCxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ1osU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNiLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDZCxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ1YsS0FBSyxFQUFFLENBQUM7UUFDUiw4REFBOEQ7UUFDOUQsaUVBQWlFO1FBQ2pFLFFBQVEsRUFBRSxDQUFDO1FBQ1gsU0FBUyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQztRQUNWLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixLQUFLLEVBQUUsQ0FBQztRQUNSLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLGdCQUFnQixFQUFFLENBQUM7S0FDbkIsQ0FBQztJQUVGLE1BQU0sWUFBWSxHQUFnQjtRQUVqQyxJQUFJLEVBQUUsQ0FBQztRQUNQLE9BQU8sRUFBRSxDQUFDO1FBQ1YsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNULDhEQUE4RDtRQUM5RCxpRUFBaUU7UUFDakUsS0FBSyxFQUFFLENBQUM7UUFDUixLQUFLLEVBQUUsQ0FBQztRQUNSLE9BQU8sRUFBRSxDQUFDO1FBQ1YsU0FBUyxFQUFFLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ1osTUFBTSxFQUFFLENBQUM7S0FDVCxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQWdCO1FBRWpDLElBQUksRUFBRSxDQUFDO1FBQ1AsU0FBUyxFQUFFLENBQUM7UUFDWixVQUFVLEVBQUUsQ0FBQztRQUNiLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDVCw4REFBOEQ7UUFDOUQsZ0VBQWdFO1FBQ2hFLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixPQUFPLEVBQUUsQ0FBQztRQUNWLE9BQU8sRUFBRSxDQUFDO1FBQ1YsU0FBUyxFQUFFLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVTtLQUN4QixDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQWdCO1FBRWxDLElBQUksRUFBRSxDQUFDO1FBQ1AsUUFBUSxFQUFFLENBQUM7UUFDWCxPQUFPLEVBQUUsQ0FBQztRQUNWLE1BQU0sRUFBRSxDQUFDO1FBQ1QsTUFBTSxFQUFFLENBQUM7UUFDVCxTQUFTLEVBQUUsQ0FBQztRQUNaLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQztRQUNYLFNBQVMsRUFBRSxDQUFDO1FBQ1osVUFBVSxFQUFFLENBQUM7UUFDYixNQUFNLEVBQUUsQ0FBQztRQUNULEtBQUssRUFBRSxDQUFDLENBQUM7UUFDVCw4REFBOEQ7UUFDOUQsaUVBQWlFO1FBQ2pFLE9BQU8sRUFBRSxDQUFDO1FBQ1YsU0FBUyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQztRQUNWLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixLQUFLLEVBQUUsQ0FBQztRQUNSLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLGdCQUFnQixFQUFFLENBQUM7S0FDbkIsQ0FBQztJQUVGLElBQUksWUFBWSxHQUFnQixpQkFBaUIsQ0FBQyxDQUFDLGdDQUFnQztJQUVuRixNQUFNLEVBQUUsQ0FBQztJQUVULFNBQVMsTUFBTTtRQUVkLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsV0FBVyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDakMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLG9CQUFvQixHQUFHLENBQUMsQ0FBQztRQUN6QixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsZ0NBQWdDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUMzQixpQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDdEIsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMzQixZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLFlBQVksR0FBRyxpQkFBaUIsQ0FBQztRQUNqQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBRWhCLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFFckIsY0FBYyxHQUFHO1lBQ2hCLFFBQVEsRUFBRSxHQUFHO1lBQ2IsU0FBUyxFQUFFLEdBQUc7WUFDZCxVQUFVLEVBQUUsR0FBRztTQUNmLENBQUM7UUFFRixLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUVoQyxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBRS9CLFVBQVU7UUFDVixJQUFLLFFBQVEsS0FBSyxTQUFTLEVBQzNCO1lBQ0MsV0FBVyxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsRUFBRTtnQkFDM0MsNkJBQTZCLEVBQUUsSUFBSTtnQkFDbkMsOEJBQThCLEVBQUU7b0JBQy9CLENBQUMsRUFBRSxRQUFRO2lCQUNYO2FBQ0QsQ0FBRSxDQUFDO1lBRUosV0FBVyxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1NBQ2hEO1FBQ0gsVUFBVTtJQUVULENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFHLE9BQWlDLEVBQUUsT0FBZTtRQUVoRixJQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDekM7WUFDQyxPQUFPLENBQUMsa0JBQWtCLENBQUUsT0FBTyxDQUFFLENBQUM7WUFDdEMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUNoQztJQUNGLENBQUM7SUFFRCxFQUFFO0lBQ0YsdUNBQXVDO0lBQ3ZDLEVBQUU7SUFDRixTQUFTLG1CQUFtQjtRQUUzQixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBRTVDLElBQUssU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzFCLE9BQU87UUFFUixXQUFXLENBQUMsb0JBQW9CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFL0MsS0FBTSxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQ2pDO1lBQ0MsSUFBSyxDQUFDLHVCQUF1QixDQUFFLFFBQVEsQ0FBRTtnQkFDeEMsU0FBUztZQUVWLFVBQVUsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUN2QixLQUFNLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUUsVUFBVSxDQUFFLFFBQVEsQ0FBRyxDQUFFLEVBQzVEO2dCQUNDLElBQUssSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRztvQkFDaEMsU0FBUztnQkFFVixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDO2dCQUVwRCxvREFBb0Q7Z0JBQ3BELElBQUssQ0FBQyxPQUFPLEVBQ2I7b0JBQ0MsZ0JBQWdCLENBQUUsSUFBSSxDQUFFLENBQUM7aUJBQ3pCO3FCQUNJLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsSUFBSSxRQUFRLEVBQUcsZ0JBQWdCO2lCQUN2RTtvQkFDQyxZQUFZLENBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBRSxDQUFDO2lCQUNsQzthQUNEO1NBQ0Q7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSyx1QkFBdUIsQ0FBRSxJQUFJLENBQUU7WUFDbkMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO1FBQ3BCLElBQUssdUJBQXVCLENBQUUsV0FBVyxDQUFFO1lBQzFDLFVBQVUsQ0FBRSxXQUFXLENBQUUsQ0FBQztRQUUzQixTQUFTLFVBQVUsQ0FBRyxRQUFnQjtZQUVyQyxJQUFLLENBQUMsU0FBUyxDQUFFLFFBQVEsQ0FBRTtnQkFDMUIsU0FBUyxDQUFFLFFBQVEsQ0FBRSxHQUFHLElBQUksTUFBTSxDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQ2pELENBQUM7UUFFRCxTQUFTLHVCQUF1QixDQUFHLElBQVk7WUFFOUMsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxDQUFDO1lBQ3pELElBQUssSUFBSSxJQUFJLGFBQWEsSUFBSSxJQUFJLElBQUksYUFBYSxFQUNuRDtnQkFDQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUN4RjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBRyxPQUFpQixFQUFFLE9BQWU7UUFFekQsbUJBQW1CO1FBQ25CLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsSUFBSSxPQUFPO1lBQzdDLE9BQU87UUFFUixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFZLENBQUM7UUFDdkQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUVsQyxnQ0FBZ0M7UUFDaEMsT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsR0FBRyxPQUFPLENBQUM7UUFFekMsZ0NBQWdDO1FBQ2hDLElBQUssT0FBTyxJQUFJLFNBQVMsRUFDekI7WUFDQyxTQUFTLENBQUUsT0FBTyxDQUFHLENBQUMsb0NBQW9DLENBQUUsSUFBSSxDQUFFLENBQUM7U0FDbkU7UUFFRCx3RkFBd0Y7UUFDeEYsT0FBTyxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsUUFBUSxDQUFFLFNBQVMsQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDcEMsT0FBTztRQUVSLCtDQUErQztRQUMvQyxJQUFLLE9BQU87WUFDWCxRQUFRLENBQUMsV0FBVyxDQUFFLFdBQVcsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUUvQyxRQUFRLENBQUMsUUFBUSxDQUFFLFdBQVcsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUUzQyx3Q0FBd0M7UUFDeEMsSUFBSyxlQUFlLENBQUUsT0FBTyxDQUFFLElBQUksYUFBYSxDQUFDLGlCQUFpQixFQUFFLEVBQ3BFO1lBQ0MsUUFBUSxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUU5QixPQUFPO1NBQ1A7UUFFRCw0Q0FBNEM7UUFDNUMsRUFBRTtRQUNGLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSxnQkFBZ0IsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUN2RSxJQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFFLE9BQU8sQ0FBRSxFQUMzQztZQUNDLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUM1RDtRQUVELElBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFDL0I7WUFDQyxPQUFPLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztZQUMxQixRQUFRLENBQUMsU0FBUyxDQUFFLE1BQU0sQ0FBRSxDQUFDO1lBQzdCLFFBQVEsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7U0FDakM7YUFFRDtZQUNDLFFBQVEsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7U0FDOUI7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBQ25ELHdCQUF3QixDQUFFLEdBQUcsRUFBRSxJQUFJLENBQUUsQ0FBQyxDQUFDLDhDQUE4QztRQUVyRixXQUFXLENBQUUsR0FBRyxDQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUcsSUFBWTtRQUV2QyxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFFLElBQUksQ0FBRSxDQUFDO1FBRTVDLGVBQWUsQ0FBRSxPQUFPLENBQUUsQ0FBQztRQUUzQixJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUUsSUFBSSxDQUFFLENBQUM7UUFDbkQsd0JBQXdCLENBQUUsR0FBRyxFQUFFLElBQUksQ0FBRSxDQUFDO1FBRXRDLFdBQVcsQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUVuQixzREFBc0Q7UUFDdEQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBRSxZQUEyQixDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyxZQUFZO1FBRTdFLENBQUMsQ0FBQyxHQUFHLENBQUUsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUUsWUFBMkIsQ0FBRSxDQUFFLENBQUM7UUFDcEUsdUJBQXVCLENBQUUsU0FBdUIsQ0FBRSxDQUFDO0lBRXBELENBQUM7SUFFRCxFQUFFO0lBQ0YsNkVBQTZFO0lBQzdFLDJDQUEyQztJQUMzQyxFQUFFO0lBQ0YsU0FBUyxpQkFBaUI7UUFFekIsV0FBVyxDQUFDLG9CQUFvQixDQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7UUFDcEUsSUFBSyxvQkFBb0IsSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQ25EO1lBQ0MsbUJBQW1CLEVBQUUsQ0FBQztZQUV0QixvQkFBb0IsR0FBRyxDQUFDLENBQUM7U0FDekI7UUFFRCxhQUFhLENBQUUsb0JBQW9CLENBQUUsQ0FBQztRQUV0QyxvQkFBb0IsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxTQUFTLHlCQUF5QixDQUFHLFVBQW1CLEtBQUs7UUFFNUQsMENBQTBDO1FBQzFDLENBQUMsQ0FBQyxRQUFRLENBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBRSxDQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLGlCQUFpQixDQUFHLE9BQWdCO1FBRTVDLElBQUssQ0FBQyxRQUFRO1lBQ2IsT0FBTztRQUVSLG1CQUFtQixFQUFFLENBQUM7UUFDdEIsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLHlEQUF5RDtRQUN6RCwrREFBK0Q7UUFDL0QsMkNBQTJDO1FBRTNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDLFVBQVUsQ0FBQztZQUM3RCxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNsQyxRQUFRLENBQUMsV0FBVyxDQUFFLG9CQUFvQixDQUFFLENBQUM7U0FDOUM7UUFFRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUNoRDtZQUNDLGFBQWEsQ0FBRSxDQUFDLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFFNUIsdURBQXVEO1NBQ3ZEO1FBRUQsK0JBQStCO1FBQy9CLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDLFVBQVUsQ0FBQztZQUM3RCxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNsQyxRQUFRLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7U0FDM0M7SUFFRixDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLFNBQVMsTUFBTSxDQUFHLEVBQVc7UUFFNUIsRUFBRSxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FBRyxJQUFZO1FBRWhELElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQywwQkFBMEIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUUzRCxhQUFhLENBQUUsS0FBSyxFQUFFLElBQUksQ0FBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxTQUFTLGlDQUFpQyxDQUFHLElBQVk7UUFFeEQsNEdBQTRHO1FBQzVHLCtDQUErQztRQUUvQywwQ0FBMEM7UUFDMUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztJQUU3RCxDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELEVBQUU7SUFDRixrQkFBa0I7SUFDbEIsd0RBQXdEO0lBQ3hELEVBQUU7SUFDRixTQUFTLGFBQWEsQ0FBRyxHQUFXLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFFcEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRWxELElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLE9BQU8sR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUVuQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBRTFCLE9BQU8sQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRWhFLG9CQUFvQjtRQUNwQixJQUFJO1FBQ0osV0FBVztRQUNYLElBQUk7UUFFSix3QkFBd0IsQ0FBRSxHQUFHLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDekMsV0FBVyxDQUFFLEdBQUcsQ0FBRSxDQUFDO0lBRXBCLENBQUM7SUFDRCxnREFBZ0Q7SUFFaEQsU0FBUyx1QkFBdUI7UUFFL0IsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFFLG9CQUFvQixDQUFFLENBQUM7UUFDOUMsSUFBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDOUMsT0FBTztRQUVSLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFDaEcsSUFBSSxFQUFFLEdBQUcsQ0FBRSxZQUFZLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUVqRSxJQUFLLEVBQUUsRUFDUDtZQUNDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQzdCLG1CQUFtQixFQUFFLENBQUM7U0FDdEI7YUFFRDtZQUNDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1NBQzlCO0lBQ0YsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFHLENBQU0sRUFBRSxDQUFNO1FBRWxDLENBQUMsR0FBRyxNQUFNLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDaEIsQ0FBQyxHQUFHLE1BQU0sQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUVoQixJQUFLLEtBQUssQ0FBRSxDQUFDLENBQUU7WUFDZCxPQUFPLENBQUUsQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBQztRQUN4QixJQUFLLEtBQUssQ0FBRSxDQUFDLENBQUU7WUFDZCxPQUFPLEtBQUssQ0FBQztRQUVkLE9BQU8sQ0FBRSxDQUFDLEdBQUcsQ0FBQyxDQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCxFQUFFO0lBQ0YsU0FBUyxXQUFXLENBQUcsR0FBVztRQUVqQyxJQUFLLGdDQUFnQyxJQUFJLENBQUM7WUFDekMsT0FBTztRQUVSLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBRSxHQUFHLENBQUcsQ0FBQztRQUVuRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQzlCLElBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ2hDLE9BQU87UUFFUixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1FBRWxDLElBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQ3BDLE9BQU87UUFHUixxQ0FBcUM7UUFDckMsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBcUIsQ0FBQztRQUNwRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDekM7WUFDQyw4QkFBOEI7WUFDOUIsSUFBSyxPQUFPLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNO2dCQUMzQyxTQUFTO1lBRVYsSUFBSSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBQztZQUMvRSxJQUFLLENBQUMsb0JBQW9CO2dCQUN6QixTQUFTO1lBRVYsS0FBTSxJQUFJLElBQUksSUFBSSxZQUFZLEVBQzlCO2dCQUNDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBa0IsQ0FBRSxDQUFDO2dCQUNwRCxJQUFJLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUUsSUFBa0IsQ0FBRSxDQUFDO2dCQUVqRSxJQUFLLFlBQVksQ0FBRSxJQUFrQixDQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUcsV0FBVztpQkFDNUQ7b0JBQ0MsT0FBTztvQkFDUCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUM7b0JBQ2pCLE1BQU0sR0FBRyxNQUFNLENBQUM7b0JBQ2hCLE1BQU0sR0FBRyxHQUFHLENBQUM7aUJBQ2I7Z0JBRUQsSUFBSyxTQUFTLENBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBRSxFQUNoQztvQkFFQyxJQUFLLFFBQVEsQ0FBRSxDQUFDLEdBQUcsQ0FBQyxDQUFFLElBQUksUUFBUSxFQUNsQzt3QkFDQyw2R0FBNkc7d0JBRTdHLE1BQU0sQ0FBQyxlQUFlLENBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBRSxDQUFDO3dCQUVsRCxnRUFBZ0U7d0JBQ2hFLFVBQVU7d0JBQ1YsV0FBVzt3QkFDWCxVQUFVO3dCQUNWLGFBQWE7d0JBQ2IsWUFBWTt3QkFDWix3REFBd0Q7d0JBQ3hELFVBQVU7d0JBQ1YsV0FBVzt3QkFDWCxVQUFVO3dCQUNWLFdBQVc7d0JBQ1gsTUFBTTtxQkFDTjtvQkFFRCxPQUFPO2lCQUNQO3FCQUNJLElBQUssU0FBUyxDQUFFLE1BQU0sRUFBRSxNQUFNLENBQUUsRUFDckM7b0JBRUMsd0RBQXdEO29CQUN4RCxTQUFTO29CQUNULFVBQVU7b0JBQ1YsU0FBUztvQkFDVCxZQUFZO29CQUNaLFdBQVc7b0JBQ1gsdURBQXVEO29CQUN2RCxTQUFTO29CQUNULFVBQVU7b0JBQ1YsU0FBUztvQkFDVCxVQUFVO29CQUNWLElBQUk7b0JBRUosTUFBTTtpQkFDTjthQUNEO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUcsUUFBZ0I7UUFFMUMsT0FBTyxDQUNOLFFBQVEsS0FBSyxXQUFXO1lBQ3hCLFFBQVEsS0FBSyxZQUFZO1lBQ3pCLFFBQVEsS0FBSyxTQUFTO1lBQ3RCLFFBQVEsS0FBSyxjQUFjO1lBQzNCLFFBQVEsS0FBSyxFQUFFLENBQ2YsQ0FBQztJQUNILENBQUM7SUFFRCxnREFBZ0Q7SUFDaEQsU0FBUyx3QkFBd0IsQ0FBRyxHQUFXLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFFL0QsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRWxELEtBQU0sSUFBSSxJQUFJLElBQUksaUJBQWlCLEVBQ25DO1lBQ0Msb0dBQW9HO1lBQ3BHLElBQUssT0FBTyxDQUFFLGlCQUFpQixDQUFFLElBQWtCLENBQUUsQ0FBRSxLQUFLLFVBQVUsRUFDdEU7Z0JBQ0MsaUJBQWlCLENBQUUsSUFBa0IsQ0FBRyxDQUFFLE9BQVEsRUFBRSxPQUFPLENBQUUsQ0FBQzthQUM5RDtTQUNEO0lBQ0YsQ0FBQztJQUVELDBFQUEwRTtJQUMxRSxTQUFTLGtCQUFrQixDQUFHLE9BQWlCLEVBQUUsSUFBZ0IsRUFBRSxTQUFzQixFQUFFLE9BQU8sR0FBRyxLQUFLO1FBRXpHLGtEQUFrRDtRQUNsRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO1FBRXpDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ2xDLE9BQU87UUFFUixJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7UUFFOUQsSUFBSSxZQUFZLEdBQUcsU0FBUyxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUMvQyxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5QztZQUNDLElBQUssQ0FBQyxPQUFPLEVBQ2I7Z0JBQ0MsSUFBSyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUNqQztvQkFDQyxNQUFNLENBQUUsT0FBTyxDQUFFLENBQUM7aUJBQ2xCO2FBQ0Q7WUFFRCxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQztZQUV4QyxJQUFLLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQ2pDO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ3ZDO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUcsSUFBZ0I7UUFFMUMsU0FBUyxHQUFHLENBQUcsSUFBWTtZQUUxQixJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRyxDQUFDO1lBQ25ELElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFFckMsSUFBSyxRQUFRO2dCQUNaLE9BQU8sQ0FBRSxRQUFRLENBQUUsSUFBSSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDNUQsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRUQsNERBQTREO0lBQzVELG1GQUFtRjtJQUNuRixFQUFFO0lBQ0YsU0FBUyxtQkFBbUIsQ0FBRyxJQUFnQjtRQUU5Qyw0Q0FBNEM7UUFDNUMsSUFBSSxFQUFrQixDQUFDO1FBRXZCLFFBQVMsSUFBSSxFQUNiO1lBQ0MsS0FBSyxVQUFVO2dCQUNkLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFFZCxJQUFLLFdBQVcsQ0FBQyxZQUFZLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRTt3QkFDOUMsT0FBTztvQkFFUixJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO29CQUMvQixJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3pELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztvQkFDdkIsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDO29CQUV2QixJQUFJLGtCQUFrQixHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxrQ0FBa0MsQ0FBRSxDQUFFLENBQUM7b0JBRTdHLElBQUssa0JBQWtCLElBQUksQ0FBQyxJQUFJLGFBQWEsRUFDN0M7d0JBQ0MsWUFBWSxHQUFHLFlBQVksQ0FBQyxpQ0FBaUMsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO3dCQUVwRixJQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsRUFDbEQ7NEJBQ0MsU0FBUyxHQUFHLFlBQVksQ0FBQzs0QkFDekIsVUFBVSxHQUFHLElBQUksQ0FBQzt5QkFDbEI7cUJBQ0Q7b0JBRUQsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFFLFNBQVMsQ0FBRSxDQUFDO29CQUVqRSxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsaUNBQWlDO3dCQUNqQyxJQUFLLGFBQWEsRUFDbEI7NEJBQ0MsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFFLHVCQUF1QixDQUFFLENBQUM7NEJBRTlDLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO2dDQUN4QyxPQUFPOzRCQUVSLElBQUksZUFBZSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7NEJBQ3ZDLFVBQVUsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFFLENBQUM7NEJBQ3JELElBQUssZUFBZSxFQUNwQjtnQ0FDQywwQkFBMEI7Z0NBQzFCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwrQkFBK0IsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUUsQ0FBQztnQ0FFaEcsSUFBSSxTQUFTLEdBQUcsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLGdDQUFnQyxDQUFFLFlBQVksQ0FBRSxHQUFHLE1BQU0sQ0FBQztnQ0FDMUcsQ0FBQyxDQUFFLDZCQUE2QixDQUFlLENBQUMsUUFBUSxDQUFFLFNBQVMsQ0FBRSxDQUFDO2dDQUN0RSxDQUFDLENBQUUsNEJBQTRCLENBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxZQUFZLENBQUMsdUJBQXVCLENBQUUsWUFBWSxDQUFFLENBQUUsQ0FBQzs2QkFDM0g7eUJBQ0Q7cUJBQ0Q7b0JBRUQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztvQkFDbEMsSUFBSyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUNuQzt3QkFDQyxnQ0FBZ0M7d0JBQ2hDLHFCQUFxQjt3QkFDckIsZ0NBQWdDO3dCQUNoQyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsc0JBQXNCLENBQUUsQ0FBQzt3QkFDMUUsSUFBSyxjQUFjLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUMvQzs0QkFDQyxjQUFjLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxZQUFZLElBQUksQ0FBQyxDQUFFLENBQUM7eUJBQzFEO3FCQUNEO2dCQUNGLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxVQUFVO2dCQUNkLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFFZCxJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO29CQUVuRSxZQUFZLENBQUUsT0FBTyxFQUFFLFlBQVksQ0FBRSxDQUFDO2dCQUN2QyxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssTUFBTTtnQkFDVixFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBRWQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztvQkFFbEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7d0JBQ3BDLE9BQU87b0JBRVIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsQ0FBQztvQkFDekMsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBYSxDQUFDO29CQUM5RCxJQUFLLENBQUMsT0FBTzt3QkFDWixPQUFPO29CQUVSLElBQUksYUFBYSxHQUFHLHVCQUF1QixDQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBQ3RFLE9BQU8sQ0FBQyxXQUFXLENBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxDQUFDLENBQUMseURBQXlEO29CQUNuSSxJQUFLLGFBQWEsRUFDbEI7d0JBQ0MsZ0RBQWdEO3dCQUNoRCxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsYUFBYSxDQUFFLENBQUM7d0JBQzNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsYUFBYSxDQUFDLENBQUMsb0ZBQW9GO3FCQUM5SDt5QkFFRDt3QkFDQyxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFFLENBQUM7cUJBQ3JFO2dCQUdGLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxPQUFPO2dCQUNYLEVBQUUsR0FBRyxVQUFXLE9BQU8sRUFBRSxPQUFPLEdBQUcsS0FBSztvQkFFdkMsa0JBQWtCLENBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUMxRSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssU0FBUztnQkFDYixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBRXZDLGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUM1RSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBRXZDLGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUUsQ0FBQztnQkFDM0UsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLElBQUksQ0FBQztZQUNWLEtBQUssSUFBSSxDQUFDO1lBQ1YsS0FBSyxJQUFJLENBQUM7WUFDVixLQUFLLEtBQUssQ0FBQztZQUNYLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxlQUFlLENBQUM7WUFDckIsS0FBSyxnQkFBZ0IsQ0FBQztZQUN0QixLQUFLLFFBQVE7Z0JBQ1osRUFBRSxHQUFHLFVBQVcsT0FBTyxFQUFFLE9BQU8sR0FBRyxLQUFLO29CQUV2QyxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBRSxJQUFJLENBQUUsRUFBRSxPQUFPLENBQUUsQ0FBQztnQkFDdkUsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLEtBQUs7Z0JBQ1QsRUFBRSxHQUFHLFVBQVcsT0FBTyxFQUFFLE9BQU8sR0FBRyxLQUFLO29CQUd2QyxJQUFJLEdBQW9CLENBQUM7b0JBRXpCLElBQUssV0FBVyxJQUFJLENBQUMsRUFDckI7d0JBQ0Msd0VBQXdFO3dCQUN4RSxvRUFBb0U7d0JBQ3BFLElBQUksS0FBSyxHQUFHLGVBQWUsQ0FBRSxLQUFLLENBQUUsQ0FBQzt3QkFDckMsR0FBRyxHQUFHLEtBQUssQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBRTlCLElBQUssT0FBTyxHQUFHLElBQUksUUFBUSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQ3RDOzRCQUNDLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO3lCQUNsQjtxQkFDRDt5QkFFRDt3QkFDQyxFQUFFO3dCQUNGLHNFQUFzRTt3QkFDdEUsaUVBQWlFO3dCQUNqRSwwR0FBMEc7d0JBQzFHLEdBQUc7d0JBQ0gsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxRQUFRLENBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2hELEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLE9BQU8sQ0FBRSxHQUFHLEtBQUssQ0FBQztxQkFDNUM7b0JBRUQsSUFBSyxPQUFPLEdBQUcsSUFBSSxRQUFRLEVBQzNCO3dCQUNDLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBRSxDQUFDO3FCQUN2QjtvQkFFRCxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUNyRSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssTUFBTTtnQkFFVixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBR3ZDLElBQUksWUFBWSxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO29CQUMvRCxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFFQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUM1QyxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTs0QkFDeEMsT0FBTzt3QkFFUix3QkFBd0I7d0JBQ3hCLElBQUksY0FBYyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsQ0FBQzt3QkFDbEUsSUFBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUU7NEJBQ2hELE9BQU87d0JBRVIsNkJBQTZCO3dCQUM3QixJQUFJLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQWEsQ0FBQzt3QkFDbkYsSUFBSyxDQUFDLG9CQUFvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFOzRCQUM1RCxPQUFPO3dCQUVSLGNBQWM7d0JBRWQsT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsR0FBRyxZQUFZLENBQUM7d0JBRXhDLGNBQWMsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLFlBQVksSUFBSSxDQUFDLENBQUUsQ0FBQzt3QkFDMUQsb0JBQW9CLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxZQUFZLElBQUksQ0FBQyxDQUFFLENBQUM7d0JBRWhFLG9CQUFvQixDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBRXBELElBQUssQ0FBQyxPQUFPLEVBQ2I7NEJBQ0MsTUFBTSxDQUFFLGNBQWMsQ0FBRSxDQUFDOzRCQUN6QixNQUFNLENBQUUsb0JBQW9CLENBQUUsQ0FBQzt5QkFDL0I7cUJBQ0Q7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLFNBQVM7b0JBQ1QsU0FBUztvQkFDVCxTQUFTO29CQUNULGNBQWM7b0JBQ2Qsa0JBQWtCO29CQUNsQixZQUFZO29CQUNaLGdCQUFnQjtvQkFDaEIsWUFBWTtvQkFDWixnQkFBZ0I7b0JBQ2hCLG9CQUFvQjtvQkFDcEIsa0NBQWtDO29CQUNsQyw2QkFBNkI7b0JBQzdCLCtCQUErQjtvQkFDL0IsOEJBQThCO29CQUM5Qiw4QkFBOEI7b0JBQzlCLGlCQUFpQjtvQkFDakIsdUJBQXVCO29CQUV2QixJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQXdDLENBQUM7b0JBRXZHLGlDQUFpQztvQkFDakMsdUdBQXVHO29CQUV2RyxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzt3QkFFbEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7NEJBQ3BDLE9BQU87d0JBRVIsUUFBUSxDQUFDLFdBQVcsQ0FBRSx1QkFBdUIsRUFBRSxZQUFZLEtBQUssQ0FBQyxDQUFFLENBQUM7d0JBRXBFLHNFQUFzRTt3QkFDdEUsUUFBUSxDQUFDLFdBQVcsQ0FBRSwrQkFBK0IsRUFBRSxZQUFZLEtBQUssRUFBRSxDQUFFLENBQUM7d0JBQzdFLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO3dCQUV0RSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUN6QyxJQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTs0QkFDbEMsT0FBTzt3QkFFUixJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7d0JBQ3BFLElBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFOzRCQUM5QyxPQUFPO3dCQUVSLGdCQUFnQjt3QkFDaEIsYUFBYSxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsQ0FBRSxZQUFZLENBQUUsQ0FBRSxDQUFDO3FCQUNoRTtnQkFDRixDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssT0FBTztnQkFDWCxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBRWQsa0JBQWtCLENBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsY0FBYyxDQUFFLENBQUM7Z0JBQ2pFLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxPQUFPO2dCQUNYLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFHZCxrREFBa0Q7b0JBQ2xELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUUsSUFBSSxDQUFFLENBQUM7b0JBQ3pDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO3dCQUNsQyxPQUFPO29CQUVSLDZFQUE2RTtvQkFDN0UsMkZBQTJGO29CQUMzRixhQUFhO29CQUViLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUUsQ0FBQztvQkFDbkQsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRWhFLElBQUssWUFBWSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEVBQzlDO3dCQUNDLElBQUssWUFBWSxJQUFJLENBQUMsRUFDdEI7NEJBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsS0FBSyxDQUFFLENBQUM7NEJBQ3ZDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBRSxjQUFjLEVBQUUsWUFBWSxDQUFFLENBQUM7eUJBQzdEOzZCQUVEOzRCQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLElBQUksQ0FBRSxDQUFDO3lCQUN0QztxQkFDRDtvQkFDRCxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQztnQkFFekMsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLE1BQU07Z0JBQ1YsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7d0JBQ3hELE9BQU87b0JBRVIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUUscUJBQXFCLEVBQUUsT0FBTyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7b0JBRS9GLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUUsSUFBSSxDQUFFLENBQUM7b0JBQ3pDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO3dCQUNsQyxPQUFPO29CQUVSLGdDQUFnQztvQkFDaEMsT0FBTztvQkFDUCxnQ0FBZ0M7b0JBRWhDLE9BQU8sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFFLENBQUM7b0JBRXZHLGtEQUFrRDtvQkFDbEQsVUFBVTtvQkFDVixrRUFBa0U7b0JBQ2xFLGdDQUFnQztvQkFDaEMsVUFBVTtnQkFDWCxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxTQUFTLENBQUM7WUFDZixLQUFLLFVBQVU7Z0JBQ2QsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUksWUFBWSxDQUFDO29CQUVqQixJQUFLLFlBQVksQ0FBQyxZQUFZLEVBQUUsSUFBSSxlQUFlLENBQUUsWUFBWSxDQUFDLGlCQUFpQixDQUFFLGdCQUFnQixFQUFFLENBQUUsQ0FBRTt3QkFDMUcsT0FBTztvQkFFUixJQUFLLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLEVBQ2hEO3dCQUNDLHlFQUF5RTt3QkFDekUsa0NBQWtDO3dCQUNsQyxPQUFPO3dCQUNQLE9BQU87cUJBQ1A7eUJBRUQ7d0JBQ0MsUUFBUyxJQUFJLEVBQ2I7NEJBQ0MsS0FBSyxRQUFRO2dDQUFFLFlBQVksR0FBRyxZQUFZLENBQUMsdUJBQXVCLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO2dDQUFDLE1BQU07NEJBQzVGLEtBQUssU0FBUztnQ0FBRSxZQUFZLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztnQ0FBQyxNQUFNOzRCQUM5RixLQUFLLFVBQVU7Z0NBQUUsWUFBWSxHQUFHLFlBQVksQ0FBQyx5QkFBeUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7Z0NBQUMsTUFBTTt5QkFDaEc7cUJBQ0Q7b0JBR0Qsd0JBQXdCO29CQUN4QixJQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLElBQUksWUFBWSxFQUM3Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUUsVUFBVSxDQUFFLENBQUUsQ0FBQzt3QkFFM0QsSUFBSyxLQUFLOzRCQUNULEtBQUssQ0FBQyxzQkFBc0IsQ0FBRSxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUUsQ0FBQztxQkFDcEU7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLE9BQU87Z0JBQ1gsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLHNEQUFzRDtvQkFDdEQsa0VBQWtFO29CQUNsRSxJQUFLLFlBQVksQ0FBQyxTQUFTLEVBQUU7d0JBQzVCLE9BQU87b0JBRVIsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRWpFLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsS0FBSyxZQUFZLEVBQzlDO3dCQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxDQUFDO3dCQUV4QyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUN6QyxJQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTs0QkFDbEMsT0FBTzt3QkFFUixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7d0JBQ25FLElBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFOzRCQUM1QyxPQUFPO3dCQUVSLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBRWpFLFlBQVksQ0FBQyxRQUFRLENBQUUsaUJBQWlCLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBRSxDQUFDO3FCQUN0RTtnQkFDRixDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBR2QsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsQ0FBQztvQkFDekMsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsZUFBZTtvQkFDZixFQUFFO29CQUNGLFNBQVM7b0JBQ1QsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBdUIsQ0FBQztvQkFDOUUsSUFBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7d0JBQzlDLE9BQU87b0JBRVIsU0FBUztvQkFDVCxhQUFhLENBQUMsc0JBQXNCLENBQUUsWUFBWSxDQUFDLGFBQWEsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztvQkFFckYsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztvQkFFNUQsYUFBYSxDQUFDLFdBQVcsQ0FBRSxXQUFXLEVBQUUsUUFBUSxHQUFHLElBQUksQ0FBRSxDQUFDO29CQUUxRCx5RUFBeUU7b0JBQ3pFLGFBQWE7b0JBQ2IsRUFBRTtvQkFDRixJQUFJLGFBQWEsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUUsY0FBYyxDQUFFLENBQUM7b0JBQ3RFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFDN0M7d0JBQ0MsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBQzlELElBQUssU0FBUyxLQUFLLEVBQUUsRUFDckI7NEJBQ0MsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDOzRCQUMxQyxhQUFhLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUN0Qzs2QkFFRDs0QkFDQyxhQUFhLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUNuQztxQkFDRDtvQkFDRCwwQkFBMEI7b0JBQzFCLGFBQWE7b0JBQ2IsRUFBRTtvQkFDRiwyREFBMkQ7b0JBQzNELElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBQ25FLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO29CQUM1QixJQUFJLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG9CQUFvQixDQUFFLElBQUksR0FBRyxDQUFDO29CQUN4RixJQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7b0JBRW5GLElBQUksa0JBQWtCLEdBQUcsWUFBWSxDQUFDLHlCQUF5QixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztvQkFDbEYsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO29CQUV6RCxPQUFPLENBQUMsVUFBVyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLENBQUUsT0FBTyxJQUFJLGdCQUFnQixDQUFFLElBQUksQ0FBRSxhQUFhLElBQUksa0JBQWtCLENBQUUsQ0FBRSxDQUFDO2dCQUVuSSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssWUFBWTtnQkFDaEIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUksWUFBWSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRTdFLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsS0FBSyxZQUFZLEVBQzlDO3dCQUVDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxDQUFDO3dCQUV4QyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO3dCQUNsQyxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQ25DOzRCQUNDLElBQUksT0FBTyxHQUNYO2dDQUNDLFVBQVUsRUFBRSxRQUFRLENBQUMsaUJBQWlCLENBQUUsZ0JBQWdCLENBQUU7Z0NBQzFELElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtnQ0FDcEIsR0FBRyxFQUFFLFdBQXFDOzZCQUMxQyxDQUFDOzRCQUVGLFlBQVksQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7eUJBQ2hDO3FCQUNEO2dCQUNGLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxNQUFNO2dCQUNWLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFHZCxJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsZ0JBQWdCLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO29CQUVsRSxJQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEtBQUssWUFBWSxFQUM5Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsQ0FBQzt3QkFDekMsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7NEJBQ2xDLE9BQU87d0JBRVIsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBYSxDQUFDO3dCQUNsRSxJQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRTs0QkFDMUMsT0FBTzt3QkFFUixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7d0JBRW5CLElBQUssWUFBWSxHQUFHLENBQUMsRUFDckI7NEJBQ0MsU0FBUyxHQUFHLGdDQUFnQyxHQUFHLFlBQVksR0FBRyxNQUFNLENBQUM7eUJBQ3JFOzZCQUVEOzRCQUNDLFNBQVMsR0FBRyxFQUFFLENBQUM7eUJBQ2Y7d0JBRUQsV0FBVyxDQUFDLFFBQVEsQ0FBRSxTQUFTLENBQUUsQ0FBQztxQkFDbEM7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLFVBQVU7Z0JBQ2QsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBRSxPQUFPLENBQUMsV0FBVyxDQUFFLFVBQVUsQ0FBRSxDQUFFLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRXJILGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQztnQkFDbkUsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLFNBQVM7Z0JBQ2IsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLHFCQUFxQixDQUFFLENBQUM7Z0JBQ3hFLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVA7Z0JBQ0MsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxJQUFJLEdBQUcsdUJBQXVCLENBQUUsQ0FBQztnQkFDeEMsT0FBTztTQUNSO1FBRUQscUZBQXFGO1FBQ3JGLGlCQUFpQixDQUFFLElBQUksQ0FBRSxHQUFHLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsU0FBUyx3QkFBd0I7UUFFaEMsSUFBSSxJQUFJLEdBQUcsV0FBVyxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxDQUFDO1FBQ3hELElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUUzRCxVQUFVO1FBQ1YsSUFBSyxRQUFRLEtBQUssRUFBRSxFQUNwQjtZQUNDLFFBQVMsUUFBUSxFQUNqQjtnQkFDQyxLQUFLLFNBQVM7b0JBQ2IsT0FBTywwQ0FBMEMsQ0FBQztnQkFDbkQsS0FBSyxhQUFhO29CQUNqQixPQUFPLHVDQUF1QyxDQUFDO2dCQUNoRCxLQUFLLFNBQVM7b0JBQ2IsT0FBTywwQ0FBMEMsQ0FBQzthQUNuRDtTQUNEO1FBQ0QsVUFBVTtRQUVWLElBQUssWUFBWSxDQUFDLDRCQUE0QixFQUFFLEVBQ2hEO1lBQ0MsT0FBTywwQ0FBMEMsQ0FBQztTQUNsRDtRQUVELFFBQVMsSUFBSSxFQUNiO1lBQ0MsS0FBSyxjQUFjO2dCQUNsQixPQUFPLDBDQUEwQyxDQUFDO1lBRW5ELEtBQUssYUFBYTtnQkFDakIsT0FBTyx1Q0FBdUMsQ0FBQztZQUVoRCxLQUFLLG9CQUFvQixFQUFFLFdBQVc7Z0JBQ3JDLE9BQU8sbUNBQW1DLENBQUM7WUFFNUMsS0FBSyxVQUFVO2dCQUNkLE9BQU8sbUNBQW1DLENBQUM7WUFFNUMsS0FBSyxZQUFZO2dCQUNoQixPQUFPLHFDQUFxQyxDQUFDO1lBRTlDLEtBQUssZUFBZTtnQkFDbkIsT0FBTyxxQ0FBcUMsQ0FBQztZQUU5QyxLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLGFBQWE7Z0JBQ2pCLE9BQU8sc0NBQXNDLENBQUM7WUFFL0MsS0FBSyxRQUFRO2dCQUNaLElBQUssUUFBUSxJQUFJLGlCQUFpQjtvQkFDakMsT0FBTyxxQ0FBcUMsQ0FBQzs7b0JBRTdDLE9BQU8seUNBQXlDLENBQUM7WUFFbkQ7Z0JBQ0MsT0FBTyx5Q0FBeUMsQ0FBQztTQUNsRDtJQUVGLENBQUM7SUFFRCxTQUFTLHVCQUF1QixDQUFHLElBQWdCO1FBRWxELHdCQUF3QjtRQUN4QixLQUFLLENBQUMsNkJBQTZCLENBQUUsY0FBYyxDQUFFLENBQUMsT0FBTyxDQUFFLFVBQVcsRUFBRTtZQUUzRSxJQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQ3ZCO2dCQUNDLElBQUssRUFBRSxDQUFDLFNBQVMsQ0FBRSxnQkFBZ0IsR0FBRyxJQUFJLENBQUUsRUFDNUM7b0JBQ0MsRUFBRSxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsQ0FBQztpQkFDMUI7cUJBRUQ7b0JBQ0MsRUFBRSxDQUFDLFdBQVcsQ0FBRSxVQUFVLENBQUUsQ0FBQztpQkFDN0I7YUFDRDtRQUVGLENBQUMsQ0FBRSxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUcsSUFBZ0IsRUFBRSxHQUFXLEVBQUUsUUFBZ0I7UUFFN0UsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFFLGtDQUFrQyxDQUFFLENBQUM7UUFFekQsSUFBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDeEMsT0FBTztRQUVSLElBQUksZUFBZSxHQUFHLFVBQVUsQ0FBQztRQUVqQyxlQUFlO1FBQ2YsSUFBSyxHQUFHLEtBQUssRUFBRSxFQUNmO1lBRUMsY0FBYztZQUNkLGFBQWE7WUFDYixFQUFFO1lBRUYsb0JBQW9CO1lBQ3BCLE1BQU07WUFDTixvQ0FBb0M7WUFDcEMsb0NBQW9DO1lBQ3BDLG9DQUFvQztZQUNwQyxzQkFBc0I7WUFDdEIscUNBQXFDO1lBQ3JDLHFDQUFxQztZQUNyQyxxQ0FBcUM7WUFDckMsZ0NBQWdDO1lBQ2hDLHVDQUF1QztZQUN2Qyx1Q0FBdUM7WUFDdkMsdUNBQXVDO1lBQ3ZDLE1BQU07WUFFTiw4QkFBOEI7WUFDOUIsSUFBSSxtQkFBbUIsR0FBRywwQkFBMEIsQ0FBQztZQUVyRCxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBRSxHQUFHLEdBQUcsbUJBQW1CLENBQUUsQ0FBQztZQUN6RCxJQUFLLENBQUMsbUJBQW1CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsRUFDM0Q7Z0JBQ0MsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixDQUFFLENBQUM7Z0JBQ2hGLG1CQUFtQixDQUFDLGtCQUFrQixDQUFFLGdDQUFnQyxDQUFFLENBQUM7Z0JBRTNFLDBCQUEwQjtnQkFDMUIsSUFBSyxDQUFDLENBQUUsMkJBQTJCLENBQUUsRUFDckM7b0JBQ0MsQ0FBQyxDQUFFLG9CQUFvQixDQUFHLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO2lCQUNuRDthQUNEO1lBRUQsSUFBSSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQztZQUU3RSxvQkFBb0I7WUFDcEIsSUFBSSxVQUFVLEdBQUcsbUJBQW1CLEdBQUcsR0FBRyxDQUFDO1lBQzNDLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztZQUM3RCxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUN6QztnQkFDQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMseUNBQXlDO2dCQUUvRCwyQkFBMkI7Z0JBQzNCLFVBQVUsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFFLENBQUM7Z0JBQy9ELFVBQVUsQ0FBQyxRQUFRLENBQUUsYUFBYSxDQUFFLENBQUM7Z0JBQ3JDLFVBQVUsQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFFLENBQUM7YUFFbEM7WUFFRCx5Q0FBeUM7WUFDekMsMkNBQTJDO1lBQzNDLDBDQUEwQztZQUUxQyw4REFBOEQ7WUFFOUQsZUFBZSxHQUFHLFVBQVUsQ0FBQztZQUU3QiwwQ0FBMEM7WUFDMUMsSUFBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQ3hDO2dCQUNDLFVBQVUsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7YUFDaEM7U0FDRDtRQUVELGdEQUFnRDtRQUNoRCxJQUFJLFdBQVcsR0FBRyxlQUFlLENBQUMscUJBQXFCLENBQUUsUUFBUSxHQUFHLElBQUksQ0FBRSxDQUFDO1FBQzNFLElBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQzNDO1lBQ0MsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxRQUFRLEdBQUcsSUFBSSxDQUFFLENBQUM7WUFDMUUsV0FBVyxDQUFDLFFBQVEsQ0FBRSxjQUFjLENBQUUsQ0FBQztZQUN2QyxXQUFXLENBQUMsUUFBUSxDQUFFLGdCQUFnQixHQUFHLElBQUksQ0FBRSxDQUFDO1lBQ2hELFdBQVcsQ0FBQyxRQUFRLENBQUUscUJBQXFCLENBQUUsQ0FBQztZQUU5QyxJQUFJLFdBQThCLENBQUM7WUFFbkMsSUFBSyxJQUFJLEtBQUssTUFBTSxFQUNwQjtnQkFDQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFFLENBQUM7Z0JBQy9FLFdBQVcsQ0FBQyxRQUFRLENBQUUscUNBQXFDLENBQUUsQ0FBQzthQUM5RDtpQkFFRDtnQkFDQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFFLENBQUM7Z0JBRS9FLElBQUssUUFBUSxJQUFJLEdBQUcsRUFDcEI7b0JBQ0MsV0FBVyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7aUJBQ3RCO3FCQUVEO29CQUVDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxjQUFjLEdBQUcsSUFBSSxDQUFFLENBQUM7aUJBQ3ZEO2FBQ0Q7WUFFRCxxQkFBcUI7WUFFckIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxjQUFjLEdBQUcsSUFBSSxHQUFHLFVBQVUsQ0FBRSxDQUFDO1lBQ3JFLElBQUssYUFBYSxLQUFLLEVBQUUsRUFDekI7Z0JBQ0MsV0FBVyxDQUFDLGFBQWEsQ0FBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBRSxXQUFXLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBRSxDQUFFLENBQUM7Z0JBQ2hILFdBQVcsQ0FBQyxhQUFhLENBQUUsWUFBWSxFQUFFLGNBQWMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7YUFDM0Y7WUFFRCxJQUFJLGVBQWUsR0FBRyxVQUFXLElBQWdCO2dCQUVoRCxJQUFJLFlBQVksR0FBZ0IsRUFBQyxJQUFJLEVBQUcsQ0FBQyxFQUFDLENBQUM7Z0JBRTNDLDhDQUE4QztnQkFDOUMsSUFBSSxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBRSxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLENBQUUsQ0FBQztnQkFFaEcsNkNBQTZDO2dCQUM3QyxpQ0FBaUM7Z0JBQ2pDLElBQUssSUFBSSxJQUFJLG9CQUFvQjtvQkFDaEMsWUFBWSxDQUFFLElBQUksQ0FBRSxHQUFHLG9CQUFvQixDQUFFLElBQUksQ0FBRSxDQUFDOztvQkFFcEQsT0FBTztnQkFFUix1QkFBdUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFFaEMsaUNBQWlDO2dCQUNqQyxLQUFNLElBQUksQ0FBQyxJQUFJLG9CQUFvQixFQUNuQztvQkFDQyxJQUFLLENBQUMsSUFBSSxJQUFJO3dCQUNiLFNBQVM7b0JBRVYsaUVBQWlFO29CQUNqRSxJQUFLLENBQUMsSUFBSSxJQUFJO3dCQUNiLFNBQVM7b0JBRVYsWUFBWSxDQUFFLENBQWUsQ0FBRSxHQUFHLG9CQUFvQixDQUFFLENBQWUsQ0FBRSxDQUFDO2lCQUMxRTtnQkFFRCx3Q0FBd0M7Z0JBQ3hDLFlBQVksR0FBRyxZQUFZLENBQUM7Z0JBRTVCLGdDQUFnQztnQkFDaEMsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFDaEQ7b0JBQ0MsV0FBVyxDQUFFLENBQUMsQ0FBRSxDQUFDO2lCQUNqQjtZQUNGLENBQUMsQ0FBQztZQUVGLFdBQVcsQ0FBQyxhQUFhLENBQUUsWUFBWSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUUsU0FBUyxFQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7U0FFbkY7SUFDRixDQUFDO0lBRUQsVUFBVTtJQUNWLFNBQVMseUJBQXlCO1FBRWpDLElBQUksV0FBVyxHQUFHLG9CQUFvQixDQUFFLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxLQUFLLENBQUUsQ0FBRSxDQUFDO1FBQ3ZGLElBQUssWUFBWSxJQUFJLFdBQVc7WUFDL0IsWUFBWSxHQUFHLGlCQUFpQixDQUFDOztZQUVqQyxZQUFZLEdBQUcsV0FBVyxDQUFDO0lBQzdCLENBQUM7SUFDRCxVQUFVO0lBRVYsOEJBQThCO0lBQzlCLFNBQVMsdUJBQXVCLENBQUcsSUFBZ0IsRUFBRSxJQUFZO1FBRWhFLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQztRQUN6QixJQUFLLElBQUksS0FBSyxNQUFNLEVBQ3BCO1lBQ0MsSUFBSyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRSxJQUFJLEVBQUUsRUFDOUM7Z0JBQ0MsYUFBYSxHQUFHLHlCQUF5QixDQUFDO2FBQzFDO2lCQUNJLElBQUssV0FBVyxDQUFDLFlBQVksQ0FBRSxJQUFJLENBQUUsRUFDMUM7Z0JBQ0MsYUFBYSxHQUFHLDBCQUEwQixDQUFDO2FBQzNDO2lCQUNJLElBQUssZUFBZSxDQUFFLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxJQUFJLENBQUUsQ0FBRSxFQUNsRTtnQkFDQyxhQUFhLEdBQUcsMkJBQTJCLENBQUM7YUFDNUM7U0FDRDtRQUNELE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxzQkFBc0I7SUFDdEIsU0FBUyxlQUFlLENBQUcsT0FBaUI7UUFFM0MsSUFBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUNwRCxPQUFPO1FBRVIsT0FBTyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7UUFFNUYsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHlEQUF5RDtRQUVyRyxtQkFBbUIsQ0FBRSxPQUFPLENBQUMsVUFBVSxFQUFFLHdCQUF3QixFQUFFLENBQUUsQ0FBQztRQUV0RSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDWixTQUFTLGFBQWEsQ0FBRyxVQUFtQixFQUFFLE9BQWlCO1lBRTlELElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN4QyxPQUFPO1lBRVIsSUFBSSxJQUFJLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFFLFdBQVcsRUFBRSxFQUFFLENBQXFCLENBQUM7WUFDL0UsSUFBSSxHQUFHLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFFLFVBQVUsRUFBRSxFQUFFLENBQUUsQ0FBQztZQUMxRCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsa0JBQWtCLENBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1lBRWxFLHlEQUF5RDtZQUN6RCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3pDO2dCQUNDLGFBQWEsQ0FBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLEVBQUUsT0FBTyxDQUFFLENBQUM7YUFDeEM7WUFFRCxJQUFLLElBQUksS0FBSyxFQUFFLEVBQ2hCO2dCQUNDLE9BQU87YUFDUDtZQUVELG9DQUFvQztZQUNwQyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxHQUFHLFVBQVUsQ0FBQztZQUV4QyxVQUFVLENBQUMsUUFBUSxDQUFFLGNBQWMsQ0FBRSxDQUFDO1lBQ3RDLFVBQVUsQ0FBQyxRQUFRLENBQUUsZ0JBQWdCLEdBQUcsSUFBSSxDQUFFLENBQUM7WUFFL0MsYUFBYTtZQUNiLEdBQUc7WUFDSCxJQUFLLEdBQUcsS0FBSyxFQUFFLEVBQ2Y7Z0JBQ0MsOEJBQThCO2dCQUM5QixJQUFJLGNBQWMsR0FBRywwQkFBMEIsQ0FBQztnQkFFaEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLENBQUUsQ0FBQztnQkFDN0UsSUFBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFDakQ7b0JBQ0MsY0FBYyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxVQUFXLEVBQUUsY0FBYyxDQUFFLENBQUM7b0JBQy9FLE9BQU8sQ0FBQyxVQUFXLENBQUMsZUFBZSxDQUFFLGNBQWMsRUFBRSxVQUFVLENBQUUsQ0FBQztpQkFDbEU7Z0JBRUQsb0JBQW9CO2dCQUNwQixJQUFJLEtBQUssR0FBRyxZQUFZLEdBQUcsR0FBRyxDQUFDO2dCQUMvQixJQUFJLEtBQUssR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUUsS0FBSyxDQUFFLENBQUM7Z0JBQ3RELElBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUM3QjtvQkFDQywyQkFBMkI7b0JBQzNCLEtBQUssR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7b0JBQ3hELEtBQUssQ0FBQyxRQUFRLENBQUUsYUFBYSxDQUFFLENBQUM7b0JBQ2hDLEtBQUssQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFFLENBQUM7b0JBRTdCLHlCQUF5QjtvQkFDekIsR0FBRyxHQUFHLENBQUMsQ0FBQztpQkFDUjtnQkFFRCwyQkFBMkI7Z0JBQzNCLFVBQVUsQ0FBQyxTQUFTLENBQUUsS0FBSyxDQUFFLENBQUM7Z0JBRTlCLDBDQUEwQztnQkFDMUMsSUFBSyxHQUFHLElBQUksaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQ3hDO29CQUNDLEtBQUssQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7aUJBQzNCO2FBQ0Q7WUFFRCw2QkFBNkI7WUFDN0IsSUFBSyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNiLFVBQVUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUU3QyxJQUFLLENBQUMsUUFBUSxFQUNkO2dCQUNDLG1CQUFtQixDQUFFLElBQUksQ0FBRSxDQUFDO2FBQzVCO1FBRUYsQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxtQkFBbUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUNsQyxtQkFBbUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUNsQyxtQkFBbUIsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUNoQyxtQkFBbUIsQ0FBRSxZQUFZLENBQUUsQ0FBQztRQUVwQyxtQkFBbUIsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUNoQyxtQkFBbUIsQ0FBRSxTQUFTLENBQUUsQ0FBQztRQUNqQyxtQkFBbUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUVsQyxxQkFBcUI7UUFDckIscUNBQXFDO1FBQ3JDLHNDQUFzQztRQUN0QyxFQUFFO1FBQ0YsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoRCxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBRW5DLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQ25DO1lBQ0MsYUFBYSxDQUFFLFdBQVcsQ0FBRSxDQUFDLENBQUUsRUFBRSxPQUFPLENBQUUsQ0FBQztTQUMzQztRQUVELGtCQUFrQjtRQUVsQixPQUFPLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxDQUFDLHNCQUFzQjtRQUU3QyxPQUFPLENBQUMsUUFBUSxDQUFFLEtBQUssQ0FBRSxHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1FBRXpFLGVBQWU7UUFFZixPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBRSxhQUFhLEVBQUU7WUFFaEQsZ0NBQWdDLEVBQUUsQ0FBQztRQUNwQyxDQUFDLENBQUUsQ0FBQztRQUVKLE9BQU8sQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFFLFlBQVksRUFBRTtZQUUvQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBQ3BDLENBQUMsQ0FBRSxDQUFDO1FBRUosSUFBSyxXQUFXLENBQUMsV0FBVyxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsRUFDOUM7WUFDQyxPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUU7Z0JBRy9DLGdDQUFnQyxFQUFFLENBQUM7Z0JBRW5DLElBQUksdUJBQXVCLEdBQUcsWUFBWSxDQUFDLGlEQUFpRCxDQUMzRixFQUFFLEVBQ0YsRUFBRSxFQUNGLHFFQUFxRSxFQUNyRSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFDeEIsb0JBQW9CLENBQUMsSUFBSSxDQUFFLFNBQVMsQ0FBRSxDQUN0QyxDQUFDO2dCQUVGLHVCQUF1QixDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO2dCQUMxRCxJQUFLLENBQUMsbUJBQW1CLEVBQ3pCO29CQUNDLG1CQUFtQixHQUFHLFlBQVksQ0FBQyx1QkFBdUIsQ0FBRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSxjQUFjLENBQUUsQ0FBQztpQkFDOUg7WUFFRixDQUFDLENBQUUsQ0FBQztTQUNKO1FBRUQsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQzNCLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUU1QixnQ0FBZ0MsRUFBRSxDQUFDO1FBQ25DLElBQUssbUJBQW1CLEVBQ3hCO1lBQ0MsWUFBWSxDQUFDLDJCQUEyQixDQUFFLG1CQUFtQixDQUFFLENBQUM7WUFDaEUsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1NBQzNCO0lBQ0YsQ0FBQztJQUNELFNBQVMsZ0JBQWdCO1FBRXhCLElBQUssQ0FBQyxRQUFRO1lBQ2IsT0FBTztRQUVSLDRDQUE0QztRQUU1QyxLQUFLLENBQUMsaUJBQWlCLENBQUUsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUUsQ0FBQztRQUM1RixLQUFLLENBQUMsaUJBQWlCLENBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBRSxDQUFDO1FBQ2hFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxlQUFlLEVBQUUsV0FBVyxDQUFDLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFDO1FBQ2hGLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxrQkFBa0IsRUFBRSxXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBRSxDQUFDO1FBRXJGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw4QkFBOEIsQ0FBYSxDQUFDO1FBQ3hGLElBQUssVUFBVSxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFDaEU7WUFDQyxJQUFLLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxFQUN0QztnQkFDQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUscUNBQXFDLEVBQUUsS0FBSyxDQUFFLENBQUM7YUFDN0U7aUJBRUQ7Z0JBQ0MsSUFBSSwwQkFBMEIsR0FBRyxrQ0FBa0MsQ0FBQztnQkFFcEUsSUFBSyxDQUFFLFlBQVksQ0FBQyx1QkFBdUIsQ0FBRSxJQUFJLENBQUUsS0FBSyxhQUFhLENBQUU7b0JBQ3RFLENBQUUsWUFBWSxDQUFDLG9CQUFvQixDQUFFLEtBQUssR0FBRyxZQUFZLENBQUMsYUFBYSxFQUFFLEVBQUUsZ0JBQWdCLENBQUUsS0FBSyxVQUFVLENBQUUsRUFDL0c7b0JBQ0MsMEJBQTBCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxrQ0FBa0MsRUFBRSxLQUFLLENBQUUsR0FBRyxpQkFBaUIsQ0FBQztpQkFDekc7cUJBQ0ksSUFBSyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsRUFDckQ7b0JBQ0MsSUFBSSxRQUFRLEdBQUcsY0FBYyxDQUFDO29CQUM5QixJQUFLLFlBQVksQ0FBQyxhQUFhLEVBQUUsS0FBSyxlQUFlO3dCQUNwRCxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx3QkFBd0IsRUFBRSxLQUFLLENBQUUsQ0FBQztvQkFDMUQsMEJBQTBCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxnQ0FBZ0MsRUFBRSxLQUFLLENBQUUsR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDO2lCQUN0RztnQkFFRCxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsMEJBQTBCLEVBQUUsS0FBSyxDQUFFLENBQUM7YUFDbEU7U0FDRDtRQUVELElBQUssQ0FBQyxDQUFFLDBCQUEwQixDQUFFLEVBQ3BDO1lBQ0MsSUFBSyxZQUFZLENBQUMsNEJBQTRCLEVBQUU7Z0JBQzdDLENBQUMsQ0FBRSwwQkFBMEIsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxnREFBZ0QsQ0FBRSxDQUFDOztnQkFFMUcsQ0FBQyxDQUFFLDBCQUEwQixDQUFlLENBQUMsUUFBUSxDQUFFLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFFLENBQUM7U0FDL0Y7UUFFRCxJQUFLLENBQUMsQ0FBRSx1QkFBdUIsQ0FBRTtZQUM5QixDQUFDLENBQUUsdUJBQXVCLENBQWUsQ0FBQyxRQUFRLENBQUUscUNBQXFDLEdBQUcsV0FBVyxDQUFDLGFBQWEsRUFBRSxHQUFHLE1BQU0sQ0FBRSxDQUFDO1FBRXRJLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBRSxZQUFZLENBQUUsQ0FBQztRQUNwQyxJQUFLLFdBQVcsRUFDaEI7WUFDQyxJQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM5QyxJQUFLLE9BQU8sR0FBRyxDQUFDLEVBQ2hCO2dCQUNDLFdBQVcsQ0FBQyxRQUFRLENBQUUsbUJBQW1CLENBQUUsQ0FBQztnQkFDNUMsV0FBVyxDQUFDLDZCQUE2QixDQUFFLE9BQU8sRUFBRSxXQUFXLENBQUUsQ0FBQztnQkFDbEUsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLHFCQUFxQixDQUFFLHlCQUF5QixDQUFhLENBQUM7Z0JBQ3hGLElBQUssT0FBTyxFQUNaO29CQUNDLElBQUksMEJBQTBCLEdBQUcsV0FBVyxDQUFDLHVCQUF1QixDQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBRSxDQUFDO29CQUNuRyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsMEJBQTBCLEVBQUUsV0FBVyxDQUFFLENBQUM7aUJBQ3JFO2FBQ0Q7U0FDRDtRQUVELElBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQ2hDO1lBQ0MsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFFLGdCQUFnQixFQUFFLENBQUUsQ0FBQztZQUMxRSxJQUFLLFNBQVMsQ0FBRSxhQUFhLENBQUU7Z0JBQzlCLFNBQVMsQ0FBRSxhQUFhLENBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1NBQ3BEO1FBRUQsb0JBQW9CO1FBQ3BCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBYSxDQUFDO1FBQzVGLElBQUssY0FBYyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFDL0M7WUFDQyxJQUFJLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxvQ0FBb0MsQ0FBRSxDQUFDO1lBQ3JGLElBQUssSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFDLENBQUUsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFDLENBQUUsSUFBSSxHQUFHO2dCQUN0RCxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUM1QixjQUFjLENBQUMsaUJBQWlCLENBQUUsOEJBQThCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxXQUFXLElBQUksR0FBRyxFQUFFLGNBQWMsQ0FBRSxDQUFFLENBQUM7WUFDckgsY0FBYyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHNDQUFzQyxFQUFFLGNBQWMsQ0FBRSxDQUFDO1NBQzNGO1FBRUQsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFFLENBQUM7UUFDckYsSUFBSyxlQUFlLElBQUksZUFBZSxDQUFDLE9BQU8sRUFBRSxFQUNqRDtZQUNDLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBRSxLQUFLLENBQUUsQ0FBQztZQUNqRSxJQUFLLGFBQWEsRUFDbEI7Z0JBQ0MsZUFBZSxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsS0FBSyxDQUFFLENBQUM7Z0JBQy9DLGVBQWUsQ0FBQyxhQUFhLENBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUUsNkJBQTZCLEVBQUUsYUFBYSxDQUFFLENBQUUsQ0FBQztnQkFDbkksZUFBZSxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFFLENBQUM7YUFDcEY7aUJBRUQ7Z0JBQ0MsZUFBZSxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsSUFBSSxDQUFFLENBQUM7YUFDOUM7U0FDRDtJQUNGLENBQUM7SUFFRCxTQUFTLHVCQUF1QixDQUFHLFFBQWdCO1FBRWxELEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxTQUFTLEVBQUUsUUFBUSxDQUFFLENBQUM7UUFDbEQsY0FBYyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUUscUJBQXFCLEVBQUUsS0FBSyxDQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBRSxDQUFDO0lBQzdHLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBRyxHQUFXLEVBQUUsVUFBcUIsRUFBRSxPQUFpQjtRQUU1RSxJQUFLLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFFO1lBQ2pDLE9BQU87UUFFUixJQUFLLENBQUMsVUFBVTtZQUNmLE9BQU87UUFFUixJQUFLLENBQUMsT0FBTztZQUNaLE9BQU87UUFFUixJQUFLLENBQUMsQ0FBRSxVQUFVLElBQUksVUFBVSxDQUFFO1lBQ2pDLE9BQU87UUFFUixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUMzRSxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUN4QyxPQUFPO1FBRVIsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO1FBQzNELElBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQzlCLE9BQU87UUFFUixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUscUNBQXFDLENBQUUsQ0FBQztRQUNoRixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUscUNBQXFDLENBQUUsQ0FBQztRQUU5RSxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFlLENBQUMsUUFBUSxDQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ25FLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsRUFBRSxDQUFFLENBQUM7UUFFckUsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFdBQVcsRUFBRSxFQUFFLENBQUUsQ0FBQztRQUM5QyxRQUFRLENBQUMsaUJBQWlCLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBRTlDLHFDQUFxQztRQUVyQyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQztRQUMvRSxJQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQy9CO1lBQ0MsTUFBTSxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLE9BQU8sQ0FBRSxlQUFlLENBQUUsR0FBRyxDQUFDLENBQUUsQ0FBQztTQUN0RTtRQUVELCtFQUErRTtRQUMvRSxJQUFLLEdBQUcsR0FBRyxPQUFPLENBQUUsZUFBZSxDQUFFLEVBQ3JDO1lBQ0MsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFFLFlBQVksQ0FBRSxDQUFDO1lBQ3pDLElBQUssVUFBVSxFQUNmO2dCQUNDLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO2dCQUVsRCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUUsZUFBZSxDQUFFLEdBQUcsV0FBVyxHQUFHLFVBQVUsQ0FBQztnQkFDM0UsSUFBSSxxQkFBcUIsR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDO2dCQUVsRCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUUsZUFBZSxDQUFFLEdBQUcsV0FBVyxHQUFHLFVBQVUsQ0FBQztnQkFDM0UsSUFBSSxxQkFBcUIsR0FBRyxHQUFHLElBQUksY0FBYyxDQUFDO2dCQUVsRCxJQUFJLGNBQWMsR0FBRyxDQUFFLHFCQUFxQixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUUsQ0FBQztnQkFDbkYsSUFBSSxjQUFjLEdBQUcsQ0FBRSxxQkFBcUIsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFFLENBQUM7Z0JBRW5GLElBQUksMEJBQTBCLEdBQUcsS0FBSyxDQUFDO2dCQUV2QyxJQUFLLGNBQWMsRUFDbkI7b0JBQ0csUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsQ0FBRSxLQUFLLENBQUUsQ0FBRSxDQUFDO29CQUNoRywwQkFBMEIsR0FBRyxJQUFJLENBQUM7aUJBQ2xDO2dCQUVELElBQUssY0FBYyxFQUNuQjtvQkFDRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFlLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLEtBQUssQ0FBRSxDQUFFLENBQUM7b0JBQ2hHLDBCQUEwQixHQUFHLElBQUksQ0FBQztpQkFDbEM7Z0JBRUQsSUFBSSxpQkFBaUIsR0FBRyxDQUFFLEdBQUcsR0FBRyxjQUFjLElBQUksR0FBRyxHQUFHLGNBQWMsQ0FBRSxDQUFDO2dCQUV6RSxLQUFLLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBRSxDQUFDO2dCQUN0RCxLQUFLLENBQUMsV0FBVyxDQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBRSxDQUFDO2FBRWhFO1lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHNDQUFzQyxDQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsQ0FBRSxDQUFDO1lBQy9GLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2Q0FBNkMsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxhQUFhLENBQUUsQ0FBQztZQUN0RyxLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQyxXQUFXLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUN0RyxLQUFLLENBQUMsaUJBQWlCLENBQUUsNkNBQTZDLENBQUUsQ0FBQyxXQUFXLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUU3RyxJQUFJLGdCQUFnQixHQUFHLFVBQVcsS0FBYztnQkFHL0MsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFDNUI7b0JBQ0MsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLFdBQVcsR0FBRyxDQUFDLENBQUUsQ0FBQztvQkFDckQsSUFBSyxDQUFDLEdBQUc7d0JBQ1IsTUFBTTtvQkFFUCxHQUFHLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO2lCQUN6QjtZQUVGLENBQUMsQ0FBQztZQUVGLGdCQUFnQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBQzdCLGdCQUFnQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBRzdCLE9BQU87U0FDUDtRQUVELElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUUxQixJQUFLLFdBQVcsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBRSxHQUFHLENBQUUsRUFDMUc7WUFDQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztZQUN0QixRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ3BCLFFBQVEsR0FBRyxNQUFNLENBQUM7U0FDbEI7UUFFRCxzQkFBc0I7UUFDdEIsUUFBUSxDQUFDLFFBQVEsQ0FBRSxhQUFhLENBQUUsQ0FBQztRQUNuQyxRQUFRLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7UUFFMUMsSUFBSSxHQUFXLENBQUM7UUFFaEIsSUFBSyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsRUFDN0M7WUFDQyxHQUFHLEdBQUcsR0FBRyxHQUFHLE9BQU8sQ0FBRSx5QkFBeUIsQ0FBRSxHQUFHLENBQUMsQ0FBQztTQUNyRDthQUVEO1lBQ0MsR0FBRyxHQUFHLEdBQUcsQ0FBQztTQUNWO1FBRUQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUM5QyxJQUFLLE9BQU8sU0FBUyxLQUFLLFFBQVE7WUFDakMsT0FBTztRQUVSLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBRSxRQUFRLENBQUUsQ0FBQyxPQUFPLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBdUMsQ0FBQztRQUVuRyxnQkFBZ0I7UUFDaEIsSUFBSyxTQUFTLENBQUUsUUFBUSxDQUFFLENBQUMsTUFBTSxDQUFFLENBQUMsQ0FBRSxLQUFLLEdBQUcsRUFDOUM7WUFDQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUUxQyxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFlLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLE1BQU0sQ0FBRSxDQUFFLENBQUM7WUFDakcsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO1lBRXZGLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsRUFBRSxDQUFFLENBQUM7WUFDckUsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO1lBRTVGLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxzQ0FBc0MsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxhQUFhLENBQUUsQ0FBQztZQUM1RixLQUFLLENBQUMsaUJBQWlCLENBQUUsNkNBQTZDLENBQUUsQ0FBQyxRQUFRLENBQUUsYUFBYSxDQUFFLENBQUM7WUFDbkcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHNDQUFzQyxDQUFFLENBQUMsV0FBVyxDQUFFLG9CQUFvQixDQUFFLENBQUM7WUFDdEcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZDQUE2QyxDQUFFLENBQUMsV0FBVyxDQUFFLG9CQUFvQixDQUFFLENBQUM7U0FFN0c7YUFDSSxJQUFLLFNBQVMsQ0FBRSxRQUFRLENBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBQyxDQUFFLEtBQUssR0FBRyxFQUNuRDtZQUNDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBRTFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsTUFBTSxDQUFFLENBQUUsQ0FBQztZQUNqRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFFLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxDQUFFLENBQUM7WUFFdkYsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxFQUFFLENBQUUsQ0FBQztZQUNyRSxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFFLENBQUMsV0FBVyxDQUFFLHFDQUFxQyxDQUFFLENBQUM7WUFFNUYsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHNDQUFzQyxDQUFFLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7WUFDbkcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZDQUE2QyxDQUFFLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7WUFDMUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHNDQUFzQyxDQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsQ0FBRSxDQUFDO1lBQy9GLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2Q0FBNkMsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxhQUFhLENBQUUsQ0FBQztTQUN0RztRQUVELDZDQUE2QztRQUM3QyxJQUFJLGlCQUFpQixHQUFHLFVBQVcsUUFBNEIsRUFBRSxLQUFjO1lBRzlFLElBQUssU0FBUyxDQUFFLFFBQVEsQ0FBRSxFQUMxQjtnQkFDQyxJQUFJLFdBQVcsR0FBRyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQztnQkFFckcsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO2dCQUVqQixJQUFLLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxLQUFLLENBQUUsSUFBSSxjQUFjO29CQUNsRSxRQUFRLEdBQUcsQ0FBQyxDQUFDO2dCQUVkLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQ25DO29CQUNDLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxXQUFXLEdBQUcsQ0FBQyxDQUFFLENBQUM7b0JBQ3JELElBQUssQ0FBQyxHQUFHO3dCQUNSLE1BQU07b0JBRVAsR0FBRyxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztvQkFFNUIsSUFBSyxDQUFDLEdBQUcsV0FBVyxFQUNwQjt3QkFDQyxHQUFHLENBQUMsUUFBUSxDQUFFLGVBQWUsQ0FBRSxDQUFDO3FCQUNoQzt5QkFFRDt3QkFDQyxHQUFHLENBQUMsV0FBVyxDQUFFLGVBQWUsQ0FBRSxDQUFDO3FCQUNuQztpQkFDRDthQUNEO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsYUFBYTtRQUViLGlCQUFpQixDQUFFLElBQUksRUFBRSxRQUFRLENBQUUsQ0FBQztRQUNwQyxpQkFBaUIsQ0FBRSxXQUFXLEVBQUUsUUFBUSxDQUFFLENBQUM7SUFDNUMsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFHLE9BQWdCLEtBQUs7UUFHOUMsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDBCQUEwQixDQUFFLENBQUM7UUFDM0UsSUFBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDeEMsT0FBTztRQUVSLElBQUksNkJBQTZCLEdBQWMsRUFBRSxDQUFDO1FBRWxELFNBQVMsaUNBQWlDLENBQUcsRUFBVztZQUV2RCxJQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtnQkFDeEIsT0FBTztZQUVSLElBQUssRUFBRSxDQUFDLFFBQVEsRUFBRTtnQkFDakIsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBRSxpQ0FBaUMsQ0FBRSxDQUFDO1lBRTVELElBQUssRUFBRSxDQUFDLGtCQUFrQixDQUFFLDhDQUE4QyxFQUFFLE9BQU8sQ0FBRSxJQUFJLE1BQU07Z0JBQzlGLDZCQUE2QixDQUFDLElBQUksQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUMzQyxDQUFDO1FBRUQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBRSxpQ0FBaUMsQ0FBRSxDQUFDO1FBRW5FLDZCQUE2QixDQUFDLE9BQU8sQ0FBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUUsYUFBYSxFQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7SUFDdEYsQ0FBQztJQUVELFNBQVMsdUJBQXVCO1FBRS9CLG9DQUFvQztRQUNwQyxJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG1DQUFtQyxDQUFFLElBQUksR0FBRztZQUNuRixjQUFjLEVBQUUsQ0FBQztRQUVsQixZQUFZLENBQUMsNkJBQTZCLENBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLHNFQUFzRSxFQUFFLGlCQUFpQixDQUFFLENBQUM7SUFDMUssQ0FBQztJQUVELFNBQVMsc0JBQXNCO1FBRTlCLG9DQUFvQztRQUNwQyxJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG1DQUFtQyxDQUFFLElBQUksR0FBRztZQUNuRixjQUFjLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFeEIsWUFBWSxDQUFDLHVCQUF1QixDQUFFLDBCQUEwQixDQUFFLENBQUM7SUFDcEUsQ0FBQztJQUVELFNBQVMsMkJBQTJCLENBQUcsUUFBZ0I7UUFFdEQsSUFBSSxXQUFXLEdBQUcsV0FBVyxDQUFDLHlCQUF5QixDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQ3BFLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx5QkFBeUIsQ0FBRSxDQUFFLENBQUM7UUFDMUYsSUFBSyxXQUFXLEdBQUcsUUFBUSxFQUFHO1lBQUUsV0FBVyxHQUFHLFFBQVEsQ0FBQztTQUFFO1FBQ3pELElBQUssV0FBVyxHQUFHLENBQUMsRUFBRztZQUFFLFdBQVcsR0FBRyxDQUFDLENBQUM7U0FBRTtRQUMzQyxJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsdUJBQXVCLENBQUUsQ0FBRSxDQUFDO1FBQzNGLElBQUksaUJBQWlCLEdBQUcsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLDBDQUEwQyxDQUFFLENBQUUsQ0FBQztRQUNwSCxJQUFJLFlBQVksR0FBRyxXQUFXLEdBQUcsQ0FBRSxXQUFXLEdBQUcsaUJBQWlCLENBQUUsQ0FBQztRQUNyRSxPQUFPLFlBQVksQ0FBQztJQUNyQixDQUFDO0lBRUQsU0FBUyxtQ0FBbUM7UUFFM0MsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUUscUJBQXFCLENBQUUsQ0FBRSxDQUFDO1FBQ3pGLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSwwQkFBMEIsRUFBRSwyQkFBMkIsQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFDO1FBQzlGLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsb0NBQW9DLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDN0UsWUFBWSxDQUFDLGVBQWUsQ0FBRSx3Q0FBd0MsRUFBRSxZQUFZLENBQUUsQ0FBQztJQUN4RixDQUFDO0lBRUQsU0FBUyxrQ0FBa0M7UUFFMUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxTQUFTLDBDQUEwQztRQUVsRCxLQUFLLENBQUMsaUJBQWlCLENBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxhQUFhLENBQUUsQ0FBRSxDQUFDO1FBQ2pGLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSwwQkFBMEIsRUFBRSwyQkFBMkIsQ0FBRSxXQUFXLENBQUUsQ0FBRSxDQUFDO1FBQ3JHLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsb0NBQW9DLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDN0UsWUFBWSxDQUFDLGVBQWUsQ0FBRSx3Q0FBd0MsRUFBRSxZQUFZLENBQUUsQ0FBQztJQUN4RixDQUFDO0lBRUQsU0FBUyx5Q0FBeUM7UUFFakQsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBRyxRQUFnQjtRQUUxQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUUsUUFBUSxDQUFFLENBQUM7UUFDakMsSUFBSyxDQUFDLElBQUksRUFDVjtZQUNDLElBQUksR0FBRyxTQUFTLENBQUUsUUFBUSxDQUFFLEdBQUcsSUFBSSxNQUFNLENBQUUsUUFBUSxDQUFFLENBQUM7U0FDdEQ7UUFFRCxZQUFZO1FBQ1osS0FBSyxDQUFDLGlCQUFpQixDQUFFLGdCQUFnQixHQUFHLFFBQVEsRUFBRSxXQUFXLENBQUMsZUFBZSxDQUFFLFFBQVEsQ0FBRSxDQUFFLENBQUM7UUFFaEcsWUFBWTtRQUNaLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQ3ZFLElBQUssaUJBQWlCLElBQUksRUFBRSxFQUM1QjtZQUNDLEtBQU0sTUFBTSxvQkFBb0IsSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUUsMkJBQTJCLEdBQUcsUUFBUSxDQUFFLEVBQ2pIO2dCQUNDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsdUJBQXVCLGlCQUFpQixJQUFJLENBQUM7Z0JBQzFGLG9CQUFvQixDQUFDLFFBQVEsQ0FBRSxpQkFBaUIsQ0FBRSxDQUFDO2FBQ25EO1NBQ0Q7UUFFRCxvQkFBb0I7UUFDcEIsS0FBSyxDQUFDLG9CQUFvQixDQUFFLFFBQVEsR0FBRyxRQUFRLEVBQUUsV0FBVyxDQUFDLHdCQUF3QixDQUFFLFFBQVEsQ0FBRSxDQUFFLENBQUM7UUFDcEcsS0FBSyxDQUFDLG9CQUFvQixDQUFFLFFBQVEsR0FBRyxRQUFRLEVBQUUsV0FBVyxDQUFDLHVCQUF1QixDQUFFLFFBQVEsQ0FBRSxDQUFFLENBQUM7SUFDcEcsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUVwQixJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFL0Msd0JBQXdCO1FBQ3hCLEtBQU0sSUFBSSxJQUFJLElBQUksU0FBUyxFQUMzQjtZQUNDLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUN4QixRQUFRO1lBRVIsSUFBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUUsVUFBVSxJQUFJLFVBQVUsQ0FBRSxJQUFJLENBQUMsQ0FBRSxJQUFJLElBQUksVUFBVSxDQUFFLFVBQVUsQ0FBRSxDQUFFO2dCQUN6RixTQUFTO1lBR1YsZ0ZBQWdGO1lBQ2hGLHVDQUF1QztZQUV2QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRyxDQUFDO1lBQzlDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxpQkFBaUIsR0FBRyxJQUFJLEVBQUUsUUFBUSxDQUFFLE9BQU8sQ0FBRSxDQUFFLENBQUM7WUFFNUUsSUFBSyxVQUFVLElBQUksUUFBUSxFQUMzQjtnQkFDQyxLQUFLLENBQUMsb0JBQW9CLENBQUUsbUJBQW1CLEdBQUcsSUFBSSxFQUFFLFFBQVEsQ0FBRSxVQUFVLENBQUcsQ0FBRSxDQUFDO2FBQ2xGO1lBRUQsSUFBSyxVQUFVLElBQUksUUFBUSxFQUMzQjtnQkFDQyxLQUFLLENBQUMsb0JBQW9CLENBQUUsbUJBQW1CLEdBQUcsSUFBSSxFQUFFLFFBQVEsQ0FBRSxVQUFVLENBQUcsQ0FBRSxDQUFDO2FBQ2xGO1lBRUQsSUFBSyxVQUFVLElBQUksUUFBUSxFQUMzQjtnQkFDQyxLQUFLLENBQUMsb0JBQW9CLENBQUUsb0JBQW9CLEdBQUcsSUFBSSxFQUFFLFFBQVEsQ0FBRSxVQUFVLENBQUcsQ0FBRSxDQUFDO2FBQ25GO1lBRUQsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDBCQUEwQixDQUFFLENBQUM7WUFDdEUsSUFBSyxTQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUNyQztnQkFDQyxTQUFTLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxDQUFDLENBQUUsVUFBVSxJQUFJLFFBQVEsQ0FBRSxDQUFFLENBQUM7Z0JBQy9ELFNBQVMsQ0FBQyxXQUFXLENBQUUsTUFBTSxFQUFFLENBQUMsQ0FBRSxVQUFVLElBQUksUUFBUSxDQUFFLENBQUUsQ0FBQzthQUM3RDtTQUVEO0lBQ0YsQ0FBQztJQUVELFNBQVMsaUJBQWlCO1FBRXpCLGVBQWUsQ0FBRSxXQUFXLENBQUUsQ0FBQztRQUMvQixlQUFlLENBQUUsSUFBSSxDQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNuQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7SUFFbkIsU0FBUyxnQkFBZ0I7UUFFeEIsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzNDLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUUvQyxJQUFLLENBQUMsT0FBTztZQUNaLE9BQU87UUFFUixJQUFLLENBQUMsVUFBVTtZQUNmLE9BQU87UUFFUixJQUFLLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFFO1lBQ2pDLE9BQU87UUFFUixJQUFJLFNBQVMsQ0FBQztRQUVkLElBQUssYUFBYSxDQUFDLHdCQUF3QixFQUFFLEVBQzdDO1lBQ0MsU0FBUyxHQUFHLE9BQU8sQ0FBRSx3QkFBd0IsQ0FBRSxDQUFDO1NBQ2hEO2FBRUQ7WUFDQyxTQUFTLEdBQUcsT0FBTyxDQUFFLFdBQVcsQ0FBRSxDQUFDO1NBQ25DO1FBRUQsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNmLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFFZixnSUFBZ0k7UUFDaEksSUFBSyxPQUFPLENBQUUsVUFBVSxDQUFFLEdBQUcsQ0FBQyxFQUM5QjtZQUNDLFVBQVUsR0FBRyxDQUFFLE9BQU8sQ0FBRSxXQUFXLENBQUUsR0FBRyxDQUFFLE9BQU8sQ0FBRSxVQUFVLENBQUUsR0FBRyxDQUFDLENBQUUsR0FBRyxPQUFPLENBQUUsb0JBQW9CLENBQUUsQ0FBRSxHQUFHLENBQUMsQ0FBQztZQUM5RyxVQUFVLEdBQUcsQ0FBRSxPQUFPLENBQUUsV0FBVyxDQUFFLEdBQUcsQ0FBRSxPQUFPLENBQUUsVUFBVSxDQUFFLEdBQUcsQ0FBQyxDQUFFLEdBQUcsT0FBTyxDQUFFLG9CQUFvQixDQUFFLENBQUUsR0FBRyxDQUFDLENBQUM7U0FDOUc7UUFFRCxLQUFNLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksU0FBUyxFQUFFLEdBQUcsRUFBRSxFQUMxQztZQUNDLFlBQVksQ0FBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBRSxDQUFDO1NBQ3pDO0lBQ0YsQ0FBQztJQUVELFNBQVMsb0JBQW9CO1FBRTVCLG9GQUFvRjtRQUNwRixJQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUUsU0FBUyxDQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFDMUM7WUFDQyxpQkFBaUIsRUFBRSxDQUFDO1NBQ3BCO1FBRUQsWUFBWSxFQUFFLENBQUM7UUFFZixhQUFhO1FBQ2IsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRTNDLElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBRSxlQUFlLENBQUUsR0FBRyxDQUFDLENBQUM7UUFFbEQsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLGFBQWEsR0FBRyxPQUFPLENBQUUsV0FBVyxDQUFFLENBQUUsQ0FBRSxDQUFDO1FBQy9GLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxrQkFBa0IsRUFBRSxPQUFPLENBQUUsa0JBQWtCLENBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO1FBQ3hGLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxlQUFlLEVBQUUsT0FBTyxDQUFFLFVBQVUsQ0FBRSxDQUFFLENBQUM7UUFFckUsS0FBSyxDQUFDLFdBQVcsQ0FBRSxxQkFBcUIsRUFBRSxhQUFhLENBQUMsaUJBQWlCLEVBQUUsQ0FBRSxDQUFDO1FBRTlFLCtGQUErRjtRQUUvRixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7UUFFM0IsSUFBSyxZQUFZLElBQUksT0FBTyxDQUFFLHVCQUF1QixDQUFFLEVBQ3ZEO1lBQ0MsY0FBYyxHQUFHLElBQUksQ0FBQztZQUN0QixZQUFZLEdBQUcsT0FBTyxDQUFFLHVCQUF1QixDQUFFLENBQUM7U0FDbEQ7UUFFRCxJQUFLLGtCQUFrQixLQUFLLFdBQVcsQ0FBQyw0QkFBNEIsRUFBRSxFQUN0RTtZQUNDLGNBQWMsR0FBRyxJQUFJLENBQUM7WUFDdEIsa0JBQWtCLEdBQUcsV0FBVyxDQUFDLDRCQUE0QixFQUFFLENBQUM7U0FDaEU7UUFFRCxJQUFLLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFFLEVBQ2xDO1lBQ0MsY0FBYyxHQUFHLElBQUksQ0FBQztTQUN0QjtRQUVELElBQUssV0FBVyxJQUFJLE9BQU8sQ0FBRSxVQUFVLENBQUUsRUFDekM7WUFDQyxXQUFXLEdBQUcsT0FBTyxDQUFFLFVBQVUsQ0FBRSxDQUFDO1lBQ3BDLGNBQWMsR0FBRyxJQUFJLENBQUM7U0FDdEI7UUFFRCwrQkFBK0I7UUFDL0IsSUFBSyxjQUFjLElBQUksQ0FBQyxDQUFFLFlBQVksSUFBSSxlQUFlLENBQUUsRUFDM0Q7WUFFQyxJQUFLLGNBQWMsRUFDbkI7Z0JBQ0MsY0FBYyxFQUFFLENBQUM7YUFDakI7WUFFRCxnQkFBZ0IsRUFBRSxDQUFDO1lBRW5CLGVBQWUsQ0FBRSxZQUFZLENBQUUsR0FBRyxJQUFJLENBQUM7U0FFdkM7YUFFRDtZQUNDLDRDQUE0QztZQUU1QyxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7WUFFL0MsSUFBSyxVQUFVLEVBQ2Y7Z0JBQ0MsWUFBWSxDQUFFLFlBQVksR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBRSxDQUFDO2FBQ3REO1NBQ0Q7UUFFRCxxQkFBcUIsRUFBRSxDQUFDO0lBRXpCLENBQUM7SUFFRCxTQUFTLHNCQUFzQjtRQUU5QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUUzRSxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUN4QyxPQUFPO1FBRVIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLHlCQUF5QixDQUFFLENBQUM7UUFDaEYsU0FBUyxDQUFDLFFBQVEsQ0FBRSxzQkFBc0IsQ0FBRSxDQUFDO0lBQzlDLENBQUM7SUFFRCxTQUFTLG9CQUFvQixDQUFHLFVBQWtCLEVBQUUsUUFBZ0IsRUFBRSxLQUFhO1FBRWxGLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBRTNFLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3hDLE9BQU87UUFFUixVQUFVLENBQUMsUUFBUSxDQUFFLGNBQWMsQ0FBRSxDQUFDLENBQUMsc0VBQXNFO1FBRTdHLElBQUksRUFBRSxHQUFHLDJCQUEyQixHQUFHLEtBQUssQ0FBQztRQUU3QyxJQUFJLFNBQVMsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUUsRUFBRSxDQUFFLENBQUM7UUFFbkQsSUFBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFDdkM7WUFDQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1lBQ3JELFNBQVMsQ0FBQyxrQkFBa0IsQ0FBRSwrQ0FBK0MsQ0FBRSxDQUFDO1NBQ2hGO1FBRUQsSUFBSSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUUsaUNBQWlDLENBQUUsQ0FBQztRQUN4RixJQUFLLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUNuRDtZQUNDLG9CQUFvQjtZQUNwQixLQUFNLElBQUksR0FBRyxHQUFHLFVBQVUsRUFBRSxHQUFHLElBQUksUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUNsRDtnQkFDQyxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7Z0JBQzFELElBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEVBQy9CO29CQUNDLEtBQUssR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztvQkFFbkUsS0FBSyxDQUFDLGtCQUFrQixDQUFFLHNEQUFzRCxDQUFFLENBQUM7b0JBRW5GLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO29CQUM3RSxLQUFLLENBQUMsa0JBQWtCLENBQUUsNERBQTRELENBQUUsQ0FBQztvQkFFekYsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHFDQUFxQyxDQUFFLENBQUM7b0JBQzdFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBRSw0REFBNEQsQ0FBRSxDQUFDO29CQUV6RixpQ0FBaUM7b0JBQ2pDLElBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQ2pCO3dCQUNHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2Q0FBNkMsQ0FBZSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7cUJBQzlHO2lCQUNEO2FBQ0Q7U0FDRDtRQUVELGtDQUFrQztRQUNsQyxJQUFLLFdBQVcsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLFdBQVcsQ0FBQyxtQ0FBbUMsQ0FBRSxRQUFRLENBQUUsRUFDL0c7WUFDQyxJQUFJLFNBQVMsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUUsb0NBQW9DLENBQUUsQ0FBQztZQUNwRixJQUFJLFFBQVEsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUUsbUNBQW1DLENBQUUsQ0FBQztZQUVsRixJQUFLLFNBQVMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQ3JDO2dCQUNDLFNBQVMsQ0FBQyxXQUFXLENBQUUsY0FBYyxDQUFFLENBQUM7Z0JBQ3hDLFNBQVMsQ0FBQyxRQUFRLENBQUUscUJBQXFCLENBQUUsQ0FBQzthQUM1QztZQUVELElBQUssUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFDbkM7Z0JBQ0MsUUFBUSxDQUFDLFdBQVcsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO2dCQUM5QyxRQUFRLENBQUMsUUFBUSxDQUFFLGNBQWMsQ0FBRSxDQUFDO2FBQ3BDO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBRyxPQUFrQjtRQUU5QyxJQUFLLE9BQU8sSUFBSSxTQUFTO1lBQ3hCLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFeEMsSUFBSSxvQkFBb0IsQ0FBQztRQUV6QixJQUFLLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxFQUM3QztZQUNDLG9CQUFvQixHQUFHLE9BQU8sQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO1NBQzFEO2FBRUQ7WUFDQyxvQkFBb0IsR0FBRyxPQUFPLENBQUUsV0FBVyxDQUFFLENBQUM7U0FFOUM7UUFFRCxPQUFPLENBQUUsb0JBQW9CLElBQUksRUFBRSxDQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELFNBQVMscUJBQXFCO1FBRTdCLElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLHdDQUF3QyxDQUFFLENBQUM7UUFDcEcsSUFBSyxxQkFBcUIsSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsRUFDN0Q7WUFDQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7WUFFM0MsSUFDQyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUseUJBQXlCLENBQUUsQ0FBRSxHQUFHLENBQUM7Z0JBQzlFLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSwwQ0FBMEMsQ0FBRSxDQUFFLEdBQUcsQ0FBQyxFQUVoRztnQkFDQyxJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUUsV0FBVyxDQUFFLENBQUM7Z0JBQ2xFLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFDNUQsSUFBSyxNQUFNLElBQUksQ0FBQyxJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQ2hDO29CQUNDLHFCQUFxQixDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztvQkFFOUMsS0FBTSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsU0FBUyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFDcEQ7d0JBQ0MscUJBQXFCLENBQUMsV0FBVyxDQUFFLGdEQUFnRCxHQUFHLFNBQVMsRUFBRSxNQUFNLElBQUksU0FBUyxDQUFFLENBQUM7cUJBQ3ZIO29CQUVELEtBQU0sSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLFNBQVMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQ3BEO3dCQUNDLHFCQUFxQixDQUFDLFdBQVcsQ0FBRSx5Q0FBeUMsR0FBRyxTQUFTLEVBQUUsT0FBTyxJQUFJLFNBQVMsQ0FBRSxDQUFDO3FCQUNqSDtpQkFDRDthQUNEO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxjQUFjO1FBRXRCLHNDQUFzQztRQUV0QyxxREFBcUQ7UUFDckQscUJBQXFCLEVBQUUsQ0FBQztRQUV4QixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUUzRSxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUN4QyxPQUFPO1FBRVIscUJBQXFCO1FBQ3JCLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBRXJDLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMzQyxJQUFLLENBQUMsT0FBTztZQUNaLE9BQU87UUFFUixJQUFLLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFFO1lBQ2pDLE9BQU87UUFHUiwyQ0FBMkM7UUFFM0MsSUFBSSxVQUFVLENBQUM7UUFDZixJQUFJLFNBQVMsQ0FBQztRQUNkLElBQUksUUFBUSxDQUFDO1FBRWIsSUFBSyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsRUFDN0M7WUFDQyxVQUFVLEdBQUcsT0FBTyxDQUFFLHlCQUF5QixDQUFFLENBQUM7WUFDbEQsU0FBUyxHQUFHLE9BQU8sQ0FBRSx3QkFBd0IsQ0FBRSxDQUFDO1lBRWhELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFDO1lBQ3ZFLElBQUssT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFDakM7Z0JBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsT0FBTyxDQUFFLFVBQVUsQ0FBRSxJQUFJLENBQUMsQ0FBRSxDQUFDO2FBQzVEO1NBQ0Q7YUFFRDtZQUNDLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDZixTQUFTLEdBQUcsT0FBTyxDQUFFLFdBQVcsQ0FBRSxDQUFDO1NBQ25DO1FBRUQsUUFBUSxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUUsU0FBUyxHQUFHLFVBQVUsQ0FBRSxHQUFHLENBQUMsQ0FBRSxHQUFHLENBQUMsQ0FBQztRQUd4RSxJQUFLLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFDOUI7WUFDQyxvQkFBb0IsQ0FBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBRSxDQUFDO1lBQzNELHNCQUFzQixFQUFFLENBQUM7WUFDekIsb0JBQW9CLENBQUUsUUFBUSxHQUFHLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFFLENBQUM7U0FFL0Q7YUFDSSxvQkFBb0I7U0FDekI7WUFDQyxvQkFBb0IsQ0FBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBRSxDQUFDO1NBQzNEO1FBRUQsZ0JBQWdCLEVBQUUsQ0FBQztRQUVuQixJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG1DQUFtQyxDQUFFLElBQUksR0FBRztZQUNuRixjQUFjLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsU0FBUyxpQkFBaUI7UUFFekIsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsa0NBQWtDLEVBQUUsR0FBRyxDQUFFLENBQUM7UUFFN0UsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBRSxnQkFBZ0IsRUFBRSxDQUFHLENBQUM7UUFDdEUsaUJBQWlCLENBQUUsVUFBVSxDQUFHLENBQUUsWUFBWSxFQUFFLElBQUksQ0FBRSxDQUFDO0lBQ3hELENBQUM7SUFFRCxTQUFTLG1CQUFtQjtRQUUzQixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUMzQjtZQUNDLElBQUksVUFBVSxHQUFHLGNBQWMsR0FBRyxDQUFFLENBQUMsR0FBRyxDQUFDLENBQUUsQ0FBQztZQUM1QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFFbkIsUUFBUyxDQUFDLEVBQ1Y7Z0JBQ0MsUUFBUTtnQkFDUixLQUFLLENBQUM7b0JBQ0wsT0FBTyxHQUFHLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29CQUFDLE1BQU07Z0JBRTNDLEtBQUssQ0FBQztvQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQUMsTUFBTTtnQkFFdkMsS0FBSyxDQUFDO29CQUNMLE9BQU8sR0FBRyxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFBQyxNQUFNO2dCQUU1QyxLQUFLLENBQUM7b0JBQ0wsT0FBTyxHQUFHLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUFDLE1BQU07YUFDMUM7WUFFRCx3QkFBd0IsQ0FBRSxVQUFVLEVBQUUsT0FBTyxDQUFFLENBQUM7U0FDaEQ7SUFDRixDQUFDO0lBRUQsU0FBUyx3QkFBd0IsQ0FBRyxVQUFrQixFQUFFLE9BQWdCO1FBRXZFLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUM3QixJQUFLLE1BQU0sSUFBSSxJQUFJO1lBQ2xCLE9BQU87UUFFUixJQUFLLE9BQU8sSUFBSSxLQUFLLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBRSx1Q0FBdUMsQ0FBRSxJQUFJLEtBQUssRUFDN0Y7WUFDQyxNQUFNLENBQUMsUUFBUSxDQUFFLHVDQUF1QyxDQUFFLENBQUM7U0FDM0Q7YUFDSSxJQUFLLE9BQU8sSUFBSSxJQUFJLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBRSx1Q0FBdUMsQ0FBRSxJQUFJLElBQUksRUFDaEc7WUFDQyxNQUFNLENBQUMsV0FBVyxDQUFFLHVDQUF1QyxDQUFFLENBQUM7U0FDOUQ7SUFDRixDQUFDO0lBRUQsU0FBUywyQkFBMkI7UUFFbkMsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLENBQUUsQ0FBQztRQUUxRSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsNkJBQTZCLENBQUUsQ0FBRSxDQUFDO1FBQ2hHLElBQUssb0JBQW9CLEVBQUUsRUFDM0I7WUFDQyxZQUFZLENBQUMsb0JBQW9CLENBQUUsQ0FBQyxDQUFFLENBQUM7U0FDdkM7YUFFRDtZQUNDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBRSxVQUFVLENBQUUsQ0FBQztTQUNoRDtRQUVELG1CQUFtQixFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELFNBQVMsdUJBQXVCO1FBRS9CLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFMUUsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLDZCQUE2QixDQUFFLENBQUUsQ0FBQztRQUNoRyxJQUFLLGdCQUFnQixFQUFFLEVBQ3ZCO1lBQ0MsWUFBWSxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRSxDQUFDO1NBQ25DO2FBRUQ7WUFDQyxZQUFZLENBQUMsZ0JBQWdCLENBQUUsVUFBVSxDQUFFLENBQUM7U0FDNUM7UUFFRCxtQkFBbUIsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxTQUFTLDRCQUE0QjtRQUVwQyxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTFFLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFDaEcsSUFBSyxxQkFBcUIsRUFBRSxFQUM1QjtZQUNDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUN4Qyx3QkFBd0IsQ0FBRSxlQUFlLEVBQUUsS0FBSyxDQUFFLENBQUM7U0FDbkQ7YUFFRDtZQUNDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztZQUNqRCx3QkFBd0IsQ0FBRSxlQUFlLEVBQUUsSUFBSSxDQUFFLENBQUM7U0FDbEQ7SUFDRixDQUFDO0lBRUQsU0FBUywwQkFBMEI7UUFFbEMsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLENBQUUsQ0FBQztRQUUxRSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsNkJBQTZCLENBQUUsQ0FBRSxDQUFDO1FBQ2hHLElBQUssbUJBQW1CLEVBQUUsRUFDMUI7WUFDQyxZQUFZLENBQUMsbUJBQW1CLENBQUUsQ0FBQyxDQUFFLENBQUM7U0FDdEM7YUFFRDtZQUNDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztTQUMvQztRQUVELG1CQUFtQixFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLFdBQVc7UUFHbkIsSUFBSyxrQkFBa0IsS0FBSyxDQUFDO1lBQzVCLE9BQU87UUFFUjtZQUNDLGlCQUFpQixFQUFFLENBQUM7WUFFcEIsSUFBSyxpQkFBaUIsSUFBSSxrQkFBa0I7Z0JBQzNDLGlCQUFpQixHQUFHLENBQUMsQ0FBQztTQUN2QjtRQUVELFNBQVM7UUFFVCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUUsa0JBQWtCLENBQUcsQ0FBQztRQUUzQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDdkQ7WUFDQyxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7WUFFMUMsSUFBSyxPQUFPLENBQUMsRUFBRSxJQUFJLG1CQUFtQixHQUFHLGlCQUFpQixFQUMxRDtnQkFDQyxPQUFPLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO2FBQ2hDO2lCQUVEO2dCQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7YUFDN0I7U0FDRDtRQUVELFVBQVU7UUFFVixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUNoRDtZQUNDLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDLENBQUcsQ0FBQyxVQUFVLENBQUM7WUFFN0QsSUFBSyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUNuQztnQkFDQyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztnQkFDOUUsSUFBSyxjQUFjLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUMvQztvQkFDQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDMUQ7d0JBQ0MsSUFBSSxPQUFPLEdBQUcsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUMsQ0FBRSxDQUFDO3dCQUU3QyxJQUFLLE9BQU8sQ0FBQyxFQUFFLElBQUksWUFBWSxHQUFHLGlCQUFpQixFQUNuRDs0QkFDQyxPQUFPLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUNoQzs2QkFFRDs0QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUM3QjtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7UUFFRCxRQUFRLENBQUMsYUFBYSxDQUFFLDJCQUEyQixDQUFFLENBQUM7SUFDdkQsQ0FBQztJQUVELFNBQVMsVUFBVTtRQUVsQixnQkFBZ0IsQ0FBQyxjQUFjLENBQUUsd0JBQXdCLENBQUUsQ0FBQztRQUU1RCxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsRUFBRSxxQkFBcUIsQ0FBRSxDQUFDO0lBQzFDLENBQUM7SUFFRCxTQUFTLHFCQUFxQjtRQUU3QixRQUFRLENBQUMsYUFBYSxDQUFFLDJCQUEyQixDQUFFLENBQUM7UUFFdEQsSUFBSSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsaUJBQWlCLENBQUUsS0FBSyxHQUFHLENBQUM7UUFFL0UsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDhCQUE4QixDQUFhLENBQUM7UUFDM0YsSUFBSyxDQUFDLFdBQVc7WUFDaEIsT0FBTztRQUVSLElBQUssU0FBUyxFQUNkO1lBQ0MsV0FBVyxDQUFDLFFBQVEsQ0FBRSxzQ0FBc0MsQ0FBRSxDQUFDO1NBQy9EO2FBRUQ7WUFDQyxXQUFXLENBQUMsUUFBUSxDQUFFLG9DQUFvQyxDQUFFLENBQUM7U0FDN0Q7SUFFRixDQUFDO0lBRUQsU0FBUyxTQUFTO1FBRWpCLFFBQVEsQ0FBQyxhQUFhLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUVyRCxJQUFJLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsQ0FBRSxLQUFLLEdBQUc7WUFDdkYsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMEJBQTBCLENBQUUsS0FBSyxHQUFHLENBQUM7UUFFekUsSUFBSyxhQUFhLEVBQ2xCO1lBQ0MsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMEJBQTBCLEVBQUUsR0FBRyxDQUFFLENBQUM7WUFDckUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFFLENBQUM7U0FFbEU7YUFFRDtZQUNDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLDBCQUEwQixFQUFFLEdBQUcsQ0FBRSxDQUFDO1lBQ3JFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHVCQUF1QixFQUFFLEdBQUcsQ0FBRSxDQUFDO1NBQ2xFO1FBRUQsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEVBQUUsZUFBZSxDQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVELFNBQVMsZUFBZTtRQUV2QixJQUFJLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsQ0FBRSxLQUFLLEdBQUc7WUFDdkYsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMEJBQTBCLENBQUUsS0FBSyxHQUFHLENBQUM7UUFFekUsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFhLENBQUM7UUFDOUYsSUFBSyxDQUFDLGVBQWU7WUFDcEIsT0FBTztRQUVSLElBQUssYUFBYSxFQUNsQjtZQUNDLGVBQWUsQ0FBQyxRQUFRLENBQUUsdUNBQXVDLENBQUUsQ0FBQztTQUNwRTthQUVEO1lBQ0MsZUFBZSxDQUFDLFFBQVEsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO1NBQ2xFO0lBRUYsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUcsRUFBVztRQUV6QyxJQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRTtZQUN4QixPQUFPO1FBRVIsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQzlDO1lBQ0MsbUJBQW1CLENBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUMsQ0FBRSxDQUFFLENBQUM7U0FDMUM7UUFFRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBcUIsQ0FBQztRQUN2RSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ2xELElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxhQUFhLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFFMUQsSUFBSyxJQUFJLElBQUksRUFBRTtZQUNkLG1CQUFtQixDQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFFLENBQUM7SUFFN0MsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsSUFBWTtRQUUzQyxJQUFLLFlBQVksQ0FBQyw0QkFBNEIsRUFBRTtZQUMvQyxPQUFPLGFBQWEsQ0FBQztRQUV0QixRQUFTLElBQUksRUFDYjtZQUNDLEtBQUssb0JBQW9CLEVBQUUsV0FBVztnQkFDckMsT0FBTyxZQUFZLENBQUM7WUFFckIsS0FBSyxZQUFZO2dCQUNoQixJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLGdCQUFnQixDQUFFLEtBQUssR0FBRyxFQUNsRTtvQkFDQyxPQUFPLGlCQUFpQixDQUFDO2lCQUN6QjtnQkFDRCxPQUFPLFlBQVksQ0FBQztZQUVyQixLQUFLLGFBQWE7Z0JBQ2pCLE9BQU8sYUFBYSxDQUFDO1lBRXRCO2dCQUNDLE9BQU8saUJBQWlCLENBQUM7U0FDMUI7SUFDRixDQUFDO0lBQ0QsZ0RBQWdEO0lBQ2hELFNBQVMsV0FBVztRQUVuQixtQ0FBbUM7UUFFbkMsTUFBTSxFQUFFLENBQUM7UUFFVCxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDM0MsSUFBSyxDQUFDLE9BQU87WUFDWixPQUFPO1FBRVIsSUFBSSxrQkFBa0IsQ0FBQztRQUV2QixJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLENBQUM7UUFDeEQsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLHVCQUF1QixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRTNELHlIQUF5SDtRQUN6SCxJQUFLLElBQUksSUFBSSxZQUFZLEVBQ3pCO1lBQ0MsTUFBTTtZQUNOLElBQUssZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMEJBQTBCLENBQUUsS0FBSyxHQUFHLEVBQzVFO2dCQUNDLFFBQVEsR0FBRyxPQUFPLENBQUM7YUFDbkI7aUJBQ0ksSUFBSyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsRUFDdkU7Z0JBQ0MsUUFBUSxHQUFHLFFBQVEsQ0FBQzthQUNwQjtTQUNEO1FBRUQsT0FBTztRQUNQLElBQUssSUFBSSxLQUFLLFVBQVUsRUFDeEI7WUFDQyxzQ0FBc0M7WUFDdEMseURBQXlEO1lBQ3pELE9BQU87U0FDUDtRQUNELE9BQU87UUFFUCxRQUFTLElBQUksRUFDYjtZQUNDLEtBQUssYUFBYSxDQUFDO1lBQ25CLEtBQUssY0FBYztnQkFDbEIsa0JBQWtCLEdBQUcsdURBQXVELENBQUM7Z0JBQzdFLE1BQU07WUFFUCxLQUFLLFlBQVk7Z0JBQ2hCLElBQUssUUFBUSxJQUFJLFFBQVEsRUFDekI7b0JBQ0Msa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7aUJBQy9EO3FCQUVEO29CQUNDLGtCQUFrQixHQUFHLDhCQUE4QixDQUFDO2lCQUNwRDtnQkFDRCxNQUFNO1lBRVAsS0FBSyxVQUFVLENBQUM7WUFDaEIsS0FBSyxvQkFBb0I7Z0JBQ3hCLGtCQUFrQixHQUFHLDhCQUE4QixDQUFDO2dCQUNwRCxNQUFNO1lBRVAsS0FBSyxhQUFhO2dCQUNqQixrQkFBa0IsR0FBRyxpQ0FBaUMsQ0FBQztnQkFDdkQsTUFBTTtZQUVQLEtBQUssYUFBYTtnQkFDakIsa0JBQWtCLEdBQUcsaUNBQWlDLENBQUM7Z0JBQ3ZELE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osSUFBSyxRQUFRLElBQUksaUJBQWlCLEVBQ2xDO29CQUNDLGtCQUFrQixHQUFHLDBEQUEwRCxDQUFDO2lCQUNoRjtxQkFFRDtvQkFDQyxrQkFBa0IsR0FBRyx5Q0FBeUMsQ0FBQztpQkFDL0Q7Z0JBQ0QsTUFBTTtZQUVQO2dCQUNDLGtCQUFrQixHQUFHLHlDQUF5QyxDQUFDO2dCQUMvRCxNQUFNO1NBQ1A7UUFFRCxtQkFBbUIsQ0FBRSxLQUFLLEVBQUUsa0JBQWtCLENBQUUsQ0FBQztRQUVqRCwrRUFBK0U7UUFDL0UsRUFBRTtRQUNGLEVBQUU7UUFDRixJQUFLLFdBQVcsQ0FBQyxZQUFZLEVBQUU7WUFDOUIsS0FBSyxDQUFDLFFBQVEsQ0FBRSxjQUFjLENBQUUsQ0FBQztRQUVsQyxJQUFLLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRTtZQUNyQyxLQUFLLENBQUMsUUFBUSxDQUFFLG1CQUFtQixDQUFFLENBQUM7UUFHdkMsMENBQTBDO1FBQzFDLFlBQVksR0FBRyxvQkFBb0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUU1QyxhQUFhO1FBRWIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBRSxDQUFDO1FBQ25ELG1CQUFtQixDQUFFLElBQUksRUFBRSx3QkFBd0IsRUFBRSxDQUFFLENBQUM7UUFDeEQsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFFckIsbUJBQW1CLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLFdBQVcsQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUV2QixjQUFjLEVBQUUsQ0FBQztRQUVqQixRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRWhCLHVCQUF1QjtRQUN2QixLQUFLLENBQUMsaUJBQWlCLENBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQzdDLHVCQUF1QixDQUFFLENBQUMsQ0FBRSxDQUFDO1FBRTdCLGdCQUFnQixFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsY0FBYztRQUV0QixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUNoRDtZQUNDLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDLENBQUcsQ0FBQztZQUVqRCxJQUFLLE9BQU8sQ0FBRSxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsQ0FBRSxLQUFLLFVBQVU7Z0JBQy9ELGlCQUFpQixDQUFFLFlBQVksQ0FBRSxDQUFFLE9BQU8sRUFBRSxJQUFJLENBQUUsQ0FBQztTQUNwRDtJQUVGLENBQUM7SUFFRCxTQUFTLFlBQVk7UUFFcEIsUUFBUyxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLEVBQ3JEO1lBQ0MsS0FBSyxhQUFhO2dCQUNqQixvQkFBb0IsRUFBRSxDQUFDO2dCQUN2QixNQUFNO1lBRVAsS0FBSyxZQUFZO2dCQUNoQixJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLGdCQUFnQixDQUFFLEtBQUssR0FBRyxFQUNsRTtvQkFDQyxvQkFBb0IsRUFBRSxDQUFDO2lCQUN2QjtnQkFDRCxNQUFNO1lBQ1AsS0FBSyxvQkFBb0I7Z0JBQ3hCLGVBQWU7Z0JBQ2YsTUFBTTtZQUVQLFFBQVE7WUFDUixLQUFLLFFBQVE7Z0JBQ1osb0JBQW9CLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtTQUNQO0lBQ0YsQ0FBQztJQUVELFNBQVMsVUFBVTtRQUVsQixnQkFBZ0IsRUFBRSxDQUFDO1FBQ25CLFlBQVksRUFBRSxDQUFDO1FBQ2YsaUJBQWlCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsU0FBUyxpQkFBaUI7UUFHekIsSUFBSyxDQUFDLFFBQVEsRUFDZDtZQUNDLFdBQVcsRUFBRSxDQUFDO1NBQ2Q7UUFFRCxxQkFBcUIsRUFBRSxDQUFDO1FBQ3hCLGVBQWUsRUFBRSxDQUFDO1FBRWxCLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsWUFBWSxFQUFFLENBQUM7UUFDZix5QkFBeUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUNsQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzNCLHdCQUF3QjtJQUV4QixDQUFDO0lBRUQsU0FBUyxjQUFjO1FBRXRCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBQzFFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDNUMsYUFBYSxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUV2QyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsb0NBQW9DLENBQUUsQ0FBQztRQUN0RixJQUFLLGVBQWUsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQ2hELGVBQWUsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFdEMsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUNoRixJQUFLLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUN4RCxtQkFBbUIsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsZ0JBQWdCO1FBRXhCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBQzFFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDNUMsYUFBYSxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUVwQyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsb0NBQW9DLENBQUUsQ0FBQztRQUN0RixJQUFLLGVBQWUsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQ2hELGVBQWUsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFekMsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUNoRixJQUFLLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUN4RCxtQkFBbUIsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLGdCQUFnQjtRQUV4QixJQUFLLHNCQUFzQixFQUMzQjtZQUNDLENBQUMsQ0FBQywyQkFBMkIsQ0FBRSxxQ0FBcUMsRUFBRSxzQkFBc0IsQ0FBRSxDQUFDO1lBQy9GLHNCQUFzQixHQUFHLElBQUksQ0FBQztTQUM5QjtRQUVELCtCQUErQjtRQUMvQixDQUFDLENBQUMsYUFBYSxDQUFFLHdCQUF3QixDQUFFLENBQUM7UUFFNUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELFNBQVMsZUFBZTtRQUV2QixpQkFBaUIsRUFBRSxDQUFDO1FBRXBCLGNBQWMsQ0FBRSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG1DQUFtQyxDQUFFLElBQUksR0FBRyxDQUFFLENBQUUsQ0FBQztRQUV0RyxJQUFLLENBQUMsc0JBQXNCLEVBQzVCO1lBQ0Msc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHFDQUFxQyxFQUFFLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBRSxDQUFDO1NBQ25JO0lBQ0YsQ0FBQztJQUVELGdEQUFnRDtJQUVoRCxTQUFTLGFBQWE7UUFFckIsZUFBZSxFQUFFLENBQUM7SUFDbkIsQ0FBQztJQUVELFNBQVMsNkJBQTZCO1FBRXJDLGlCQUFpQixFQUFFLENBQUM7UUFDcEIsSUFBSyxDQUFDLENBQUMsQ0FBRSxhQUFhLENBQUU7WUFDdkIsT0FBTyxDQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFFNUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFFLGFBQWEsQ0FBRyxDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFFLENBQUM7UUFFOUUsSUFBSyxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUMvQjtZQUNDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQXFCLENBQUM7WUFDckQsT0FBTyxDQUFFLE9BQU8sQ0FBRSxDQUFDLENBQUUsRUFBRSxNQUFNLElBQUksR0FBRyxFQUFFLE9BQU8sQ0FBRSxDQUFDLENBQUUsRUFBRSxNQUFNLElBQUksR0FBRyxFQUFFLE9BQU8sQ0FBRSxDQUFDLENBQUUsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFFLENBQUM7U0FDakc7UUFFRCxPQUFPLENBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQsU0FBUyw0QkFBNEIsQ0FBRyxJQUFZO1FBRW5ELGlCQUFpQixFQUFFLENBQUM7UUFFcEIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFFLENBQUM7UUFDaEUsSUFBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7WUFDaEMsT0FBTztRQUVSLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUVsQixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDbEQ7WUFDQyxJQUFPLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDLENBQXFCLENBQUMsTUFBTSxJQUFJLElBQUk7Z0JBQzlELFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ25CO1FBRUQsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxpREFBaUQsRUFBRSxTQUFTLENBQUUsQ0FBQztJQUVqRixDQUFDO0lBRUQsMkRBQTJEO0lBQzNELElBQUk7SUFDSiw0REFBNEQ7SUFDNUQsMkRBQTJEO0lBQzNELEtBQUs7SUFDTCxZQUFZO0lBQ1osS0FBSztJQUVMLHdFQUF3RTtJQUN4RSw4QkFBOEI7SUFDOUIsWUFBWTtJQUVaLHNHQUFzRztJQUN0Ryx3Q0FBd0M7SUFDeEMsMkRBQTJEO0lBRTNELHFFQUFxRTtJQUNyRSw0RUFBNEU7SUFDNUUsd0RBQXdEO0lBQ3hELG1HQUFtRztJQUNuRyxLQUFLO0lBQ0wsc0NBQXNDO0lBQ3RDLFlBQVk7SUFDWixLQUFLO0lBRUwsZ0VBQWdFO0lBQ2hFLGtDQUFrQztJQUNsQyxLQUFLO0lBQ0wsK0JBQStCO0lBQy9CLGFBQWE7SUFFYiwrREFBK0Q7SUFDL0QsS0FBSztJQUVMLDBDQUEwQztJQUMxQyx3REFBd0Q7SUFDeEQsNkJBQTZCO0lBQzdCLEtBQUs7SUFDTCwwQ0FBMEM7SUFDMUMscUNBQXFDO0lBQ3JDLEtBQUs7SUFDTCx3RUFBd0U7SUFDeEUsaUZBQWlGO0lBQ2pGLGdDQUFnQztJQUNoQyxNQUFNO0lBQ04sMkNBQTJDO0lBQzNDLFdBQVc7SUFDWCxNQUFNO0lBQ04sK0RBQStEO0lBQy9ELHlHQUF5RztJQUN6Ryx3QkFBd0I7SUFDeEIsdUNBQXVDO0lBQ3ZDLE1BQU07SUFDTixLQUFLO0lBQ0wsSUFBSTtJQUVKLHNDQUFzQztJQUN0QyxJQUFJO0lBQ0osNkVBQTZFO0lBQzdFLGtJQUFrSTtJQUNsSSxzQ0FBc0M7SUFDdEMsSUFBSTtJQUVKLFVBQVU7SUFDVixvR0FBb0c7SUFDcEcsb0dBQW9HO0lBQ3BHLFNBQVMsZ0JBQWdCO1FBRXhCLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQztRQUUzQixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUM1QjtZQUNDLFNBQVMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztTQUMvQjtRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFDRCxVQUFVO0lBRVYsNERBQTREO0lBQzVELElBQUk7SUFDSix3RUFBd0U7SUFDeEUsOEJBQThCO0lBQzlCLFlBQVk7SUFFWiw0REFBNEQ7SUFDNUQsMkRBQTJEO0lBQzNELEtBQUs7SUFDTCxZQUFZO0lBQ1osS0FBSztJQUVMLGdIQUFnSDtJQUNoSCxvR0FBb0c7SUFDcEcsMkNBQTJDO0lBQzNDLEtBQUs7SUFDTCx5R0FBeUc7SUFDekcsOEdBQThHO0lBQzlHLHdGQUF3RjtJQUN4RixnQ0FBZ0M7SUFDaEMsZ0NBQWdDO0lBRWhDLGtEQUFrRDtJQUNsRCxxRUFBcUU7SUFDckUsMkRBQTJEO0lBQzNELHlDQUF5QztJQUN6QyxNQUFNO0lBQ04sd0dBQXdHO0lBQ3hHLGtDQUFrQztJQUNsQyxxRUFBcUU7SUFDckUsT0FBTztJQUNQLDBGQUEwRjtJQUMxRixPQUFPO0lBQ1AsNkhBQTZIO0lBQzdILE9BQU87SUFDUCxzRUFBc0U7SUFDdEUsT0FBTztJQUNQLG1FQUFtRTtJQUNuRSxPQUFPO0lBQ1AsaUVBQWlFO0lBQ2pFLE9BQU87SUFDUCxVQUFVO0lBQ1YsT0FBTztJQUNQLGdFQUFnRTtJQUNoRSxPQUFPO0lBQ1AsT0FBTztJQUVQLHlDQUF5QztJQUN6QyxNQUFNO0lBQ04seUdBQXlHO0lBQ3pHLHFFQUFxRTtJQUNyRSw2QkFBNkI7SUFDN0Isd0VBQXdFO0lBQ3hFLE9BQU87SUFDUCxLQUFLO0lBQ0wsb0dBQW9HO0lBQ3BHLDJDQUEyQztJQUMzQyxLQUFLO0lBQ0wsa0tBQWtLO0lBQ2xLLHVKQUF1SjtJQUN2Six5SkFBeUo7SUFDekosS0FBSztJQUVMLG1HQUFtRztJQUNuRyxxRUFBcUU7SUFDckUsbUdBQW1HO0lBQ25HLCtEQUErRDtJQUMvRCxzR0FBc0c7SUFDdEcsMEVBQTBFO0lBQzFFLElBQUk7SUFFSixTQUFTLG9CQUFvQjtRQUU1QixJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsNkJBQTZCLENBQUUsQ0FBRSxDQUFDO1FBRWhHLElBQUksRUFBRSxHQUFHLENBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxJQUFJLFVBQVUsSUFBSSxDQUFDLElBQUksV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUUsQ0FBQztRQUVqRyxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLGdCQUFnQjtRQUV4QixJQUFLLFdBQVcsQ0FBQyxZQUFZLEVBQUUsRUFDL0I7WUFDQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUscUJBQXFCLENBQUUsQ0FBRSxDQUFDO1NBQ2hGO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLElBQUk7SUFDSiwwSEFBMEg7SUFFMUgsa0hBQWtIO0lBRWxILGNBQWM7SUFDZCxJQUFJO0lBRUosU0FBUyxxQkFBcUI7UUFFN0IsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDLFlBQVksRUFBRSxJQUFJLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFFLENBQUM7UUFFakgsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxtQkFBbUI7UUFFM0IsSUFBSSxjQUFjLEdBQUcsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG1CQUFtQixDQUFFLENBQUUsQ0FBQztRQUUxRixJQUFJLEVBQUUsR0FBRyxDQUFFLFdBQVcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxjQUFjLENBQUUsQ0FBQztRQUUxRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxTQUFTLHlCQUF5QixDQUFHLEtBQWMsRUFBRSxJQUFZO1FBRWhFLFlBQVksQ0FBQyxxQkFBcUIsQ0FDakMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx3QkFBd0IsQ0FBRSxFQUN0QyxDQUFDLENBQUMsUUFBUSxDQUFFLGlDQUFpQyxDQUFFLEVBQy9DLEVBQUUsRUFDRixjQUFjLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBRSxJQUFJLENBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBRSxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFDM0csY0FBYyxDQUFDLENBQ2YsQ0FBQztJQUNILENBQUM7SUFFRCxzQkFBc0I7SUFDdEIsT0FBTztRQUNOLGNBQWMsRUFBRSxlQUFlO1FBQy9CLGVBQWUsRUFBRSxnQkFBZ0I7UUFDakMsZUFBZSxFQUFFLGdCQUFnQjtRQUNqQyx3QkFBd0IsRUFBRSxpQ0FBaUM7UUFDM0QsZ0JBQWdCLEVBQUUsaUJBQWlCO1FBQ25DLFlBQVksRUFBRSxXQUFXO1FBQ3pCLHNCQUFzQixFQUFFLHVCQUF1QjtRQUMvQyxxQkFBcUIsRUFBRSxzQkFBc0I7UUFDN0Msa0NBQWtDLEVBQUUsbUNBQW1DO1FBQ3ZFLGlDQUFpQyxFQUFFLGtDQUFrQztRQUNyRSx5Q0FBeUMsRUFBRSwwQ0FBMEM7UUFDckYsd0NBQXdDLEVBQUUseUNBQXlDO1FBQ25GLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLFVBQVUsRUFBRSxXQUFXO1FBQ3ZCLGFBQWEsRUFBRSxjQUFjO1FBQzdCLFlBQVksRUFBRSxhQUFhO1FBQzNCLDRCQUE0QixFQUFFLDZCQUE2QjtRQUMzRCwyQkFBMkIsRUFBRSw0QkFBNEI7UUFDekQsZ0JBQWdCLEVBQUUsaUJBQWlCO1FBRW5DLHNCQUFzQixFQUFFLHVCQUF1QjtRQUUvQywwQkFBMEIsRUFBRSwyQkFBMkI7UUFDdkQsc0JBQXNCLEVBQUUsdUJBQXVCO1FBQy9DLDJCQUEyQixFQUFFLDRCQUE0QjtRQUN6RCx5QkFBeUIsRUFBRSwwQkFBMEI7UUFFckQsU0FBUyxFQUFFLFVBQVU7UUFDckIsUUFBUSxFQUFFLFNBQVM7UUFFbkIsYUFBYSxFQUFFLGNBQWM7UUFDN0IseUNBQXlDO1FBQ3pDLHVDQUF1QztRQUN2Qyx3QkFBd0IsRUFBRSx5QkFBeUI7UUFFbkQsWUFBWTtRQUNaLHdCQUF3QixFQUFFLHlCQUF5QjtRQUNuRCxlQUFlLEVBQUUsZ0JBQWdCO1FBQ2pDLFVBQVU7S0FDVixDQUFDO0FBRUgsQ0FBQyxDQUFFLEVBQUUsQ0FBQztBQUdOLFlBQVk7QUFDWixvR0FBb0c7QUFDcEcsb0dBQW9HO0FBQ3BHLFNBQVMsZUFBZTtJQUV2QixPQUFPLFVBQVUsQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUNyQyxDQUFDO0FBQ0QsVUFBVTtBQUVWLG9HQUFvRztBQUNwRywyQ0FBMkM7QUFDM0Msb0dBQW9HO0FBQ3BHLENBQUU7SUFFRCxDQUFDLENBQUMseUJBQXlCLENBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGNBQWMsQ0FBRSxDQUFDO0lBQzdFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxtQkFBbUIsRUFBRSxVQUFVLENBQUMsZUFBZSxDQUFFLENBQUM7SUFFL0UsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxZQUFZLENBQUUsQ0FBQztJQUNoRixDQUFDLENBQUMseUJBQXlCLENBQUUseUJBQXlCLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBRSxDQUFDO0lBRWxGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw2QkFBNkIsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUUsQ0FBQztJQUUxRixDQUFDLENBQUMseUJBQXlCLENBQUUsc0JBQXNCLEVBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBRSxDQUFDO0lBRTVFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSx1QkFBdUIsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFFLENBQUM7SUFFOUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDBCQUEwQixFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQUUsQ0FBQztJQUVwRixDQUFDLENBQUMseUJBQXlCLENBQUUseUJBQXlCLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBRSxDQUFDO0lBRWxGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw2QkFBNkIsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUUsQ0FBQztJQUUxRixDQUFDLENBQUMseUJBQXlCLENBQUUsdUNBQXVDLEVBQUUsVUFBVSxDQUFDLDBCQUEwQixDQUFFLENBQUM7SUFDOUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLG1DQUFtQyxFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBRSxDQUFDO0lBQ3RHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSx3Q0FBd0MsRUFBRSxVQUFVLENBQUMsMkJBQTJCLENBQUUsQ0FBQztJQUNoSCxDQUFDLENBQUMseUJBQXlCLENBQUUsc0NBQXNDLEVBQUUsVUFBVSxDQUFDLHlCQUF5QixDQUFFLENBQUM7SUFFNUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHlCQUF5QixFQUFFLFVBQVUsQ0FBQyxhQUFhLENBQUUsQ0FBQztJQUVuRixDQUFDLENBQUMseUJBQXlCLENBQUUsOEJBQThCLEVBQUUsVUFBVSxDQUFDLHNCQUFzQixDQUFFLENBQUM7SUFFakcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLG1DQUFtQyxFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBRSxDQUFDO0lBQ3RHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxrQ0FBa0MsRUFBRSxVQUFVLENBQUMscUJBQXFCLENBQUUsQ0FBQztJQUVwRyxDQUFDLENBQUMseUJBQXlCLENBQUUsK0NBQStDLEVBQUUsVUFBVSxDQUFDLGtDQUFrQyxDQUFFLENBQUM7SUFDOUgsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDhDQUE4QyxFQUFFLFVBQVUsQ0FBQyxpQ0FBaUMsQ0FBRSxDQUFDO0lBQzVILENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxzREFBc0QsRUFBRSxVQUFVLENBQUMseUNBQXlDLENBQUUsQ0FBQztJQUM1SSxDQUFDLENBQUMseUJBQXlCLENBQUUscURBQXFELEVBQUUsVUFBVSxDQUFDLHdDQUF3QyxDQUFFLENBQUM7SUFFMUksNkdBQTZHO0lBQzdHLG1GQUFtRjtJQUNuRixxRUFBcUU7SUFDckUsSUFBSTtJQUNKLG9EQUFvRDtJQUNwRCxPQUFPO0lBRVAsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUUsQ0FBQztJQUM1RSxDQUFDLENBQUMseUJBQXlCLENBQUUscUJBQXFCLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBRSxDQUFDO0lBQzFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxQ0FBcUMsRUFBRSxVQUFVLENBQUMsd0JBQXdCLENBQUUsQ0FBQztJQUUxRyxXQUFXO0lBQ1gsK0ZBQStGO0lBQy9GLFVBQVU7QUFDWCxDQUFDLENBQUUsRUFBRSxDQUFDIn0=