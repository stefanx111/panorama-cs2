"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="match_stakes.ts" />
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
    let _m_LocalPlayerID = ''; // xuid of local player for highlighting
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
        'kills': 0,
        'kdr': 0,
        'damage': 0,
        'hsp': 0,
        'idx': -1,
        // we include the below so players can choose to sort by them.
        // otherwise they never get used because player index never ties
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
                    const elPlayer = oPlayer.m_elPlayer;
                    if (!elPlayer || !elPlayer.IsValid())
                        return;
                    let newStatValue = MockAdapter.GetPlayerCompetitiveRanking(oPlayer.m_xuid);
                    let elSkillgroup = elPlayer.FindChildTraverse('jsRatingEmblem');
                    if (elSkillgroup && elSkillgroup.IsValid()) {
                        if (newStatValue > 0) {
                            elSkillgroup.visible = true;
                            if (oPlayer.m_oStats[stat] !== newStatValue) {
                                oPlayer.m_oStats[stat] = newStatValue;
                                let options = {
                                    root_panel: elPlayer.FindChildTraverse('jsRatingEmblem'),
                                    xuid: oPlayer.m_xuid,
                                    api: 'gamestate',
                                    full_details: false,
                                };
                                RatingEmblem.SetXuid(options);
                            }
                        }
                        else {
                            elSkillgroup.visible = false;
                        }
                    }
                    ;
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
            case 'premier':
                return 'snippet_scoreboard-classic__row--comp';
            case 'training':
                return 'snippet_scoreboard__row--training';
            case 'deathmatch':
                return 'snippet_scoreboard__row--deathmatch';
            case 'coopmission':
            case 'cooperative':
                return 'snippet_scoreboard__row--cooperative';
            case 'casual':
                if (skirmish == 'flyingscoutsman')
                    return 'snippet_scoreboard__row--flyingscoutsman';
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
                let mode = GameStateAPI.GetGameModeInternalName(true);
                if ((mode === 'competitive' || mode === 'premier') &&
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
        GameInterfaceAPI.SetSettingString('cl_borrow_music_from_player_slot', '-1');
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
            case 'deathmatch':
                if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                    return sortOrder_default;
                }
                return sortOrder_dm;
            case 'competitive':
            case 'premier':
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
        switch (mode.toLowerCase()) {
            case 'premier':
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
            case 'premier':
                _UpdateScore_Classic();
                break;
            case 'deathmatch':
                if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                    _UpdateScore_Classic();
                }
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
        //	MatchStakes.ShowWithScoreboard( false );
    }
    ////////////////////////////////////////////////
    function _OpenScoreboard() {
        _UpdateEverything();
        _ShowSurvivors((GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0'));
        if (!_m_updatePlayerHandler) {
            _m_updatePlayerHandler = $.RegisterForUnhandledEvent('Scoreboard_UpdatePlayerByPlayerSlot', Scoreboard.UpdatePlayerByPlayerSlot);
        }
        //	MatchStakes.ShowWithScoreboard( true );
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
    $.RegisterForUnhandledEvent('Scoreboard_MuteVoice', Scoreboard.MuteVoice);
    $.RegisterForUnhandledEvent('Scoreboard_BlockUgc', Scoreboard.BlockUgc);
    $.RegisterForUnhandledEvent('Scoreboard_ApplyPlayerCrosshairCode', Scoreboard.ApplyPlayerCrosshairCode);
    //DEVONLY{	
    // $.RegisterForUnhandledEvent( 'Scoreboard_Debug_Sort', Scoreboard.ToggleSortOrderAndResort );
    //}DEVONLY
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2NvbnRlbnQvY3Nnby9wYW5vcmFtYS9zY3JpcHRzL3Njb3JlYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0RBQXNEO0FBQ3RELDZDQUE2QztBQUM3Qyx5Q0FBeUM7QUFDekMsd0NBQXdDO0FBR3hDOzs7Ozs7Ozs7Ozs7Ozs7OztFQWlCRTtBQUVGLElBQUksVUFBVSxHQUFHLENBQUU7SUFFbEIsU0FBUyxJQUFJLENBQUcsSUFBWTtRQUUzQixDQUFDLENBQUMsR0FBRyxDQUFFLGlCQUFpQixHQUFHLElBQUksQ0FBRSxDQUFDO0lBQ25DLENBQUM7SUFrQkQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBc0IsQ0FBQztJQUV0RCxJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQyxDQUFHLHdDQUF3QztJQUNyRSxTQUFTLGdCQUFnQjtRQUV4QixJQUFLLGdCQUFnQixLQUFLLEVBQUU7WUFDM0IsZ0JBQWdCLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDdEQsT0FBTyxnQkFBZ0IsQ0FBQztJQUN6QixDQUFDO0lBVUQsb0NBQW9DO0lBQ3BDLEVBQUU7SUFDRixNQUFNLE1BQU07UUFFWCxxQkFBcUIsR0FBdUU7WUFDM0YsUUFBUSxFQUFFLEVBQUU7WUFDWixTQUFTLEVBQUUsRUFBRTtZQUNiLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUNGLFVBQVUsQ0FBUztRQUVuQixZQUFhLFFBQWdCO1lBRTVCLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO1FBQzVCLENBQUM7UUFFRCxxR0FBcUc7UUFDckcsb0JBQW9CO1lBRWpCLENBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQXVCLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxFQUFFO2dCQUUxRSxrRkFBa0Y7Z0JBQ2xGLDBEQUEwRDtnQkFFMUQsSUFBSSxDQUFDLHVCQUF1QixDQUFFLElBQUksQ0FBRSxDQUFDO2dCQUVyQyxJQUFJLENBQUMscUJBQXFCLENBQUUsY0FBYyxDQUFFLElBQUksQ0FBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUUsQ0FBQztnQkFFbEUsY0FBYyxDQUFFLElBQUksQ0FBRSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFDMUQsSUFBSSxDQUFDLHFCQUFxQixDQUFFLGNBQWMsQ0FBRSxJQUFJLENBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFFLENBQUMsQ0FBQyxTQUFTO1lBQzVFLENBQUMsQ0FBRSxDQUFDO1FBQ0wsQ0FBQztRQUVELHNCQUFzQixDQUFHLElBQVksRUFBRSxJQUFtQixFQUFFLEtBQWE7WUFFeEUsSUFBSyxLQUFLLElBQUksQ0FBQztnQkFDZCxPQUFPO1lBRVIsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFFLENBQUM7WUFFdEYsSUFBSyxDQUFDLGFBQWEsRUFDbkI7Z0JBQ0MsSUFBSSxDQUFDLHFCQUFxQixDQUFFLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFFLENBQUM7YUFDNUU7aUJBRUQ7Z0JBQ0MsYUFBYSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7YUFDOUI7UUFFRixDQUFDO1FBRUQsb0NBQW9DLENBQUcsSUFBWTtZQUdoRCxDQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUF1QixDQUFDLE9BQU8sQ0FBRSxJQUFJLENBQUMsRUFBRTtnQkFFMUUsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLElBQUksQ0FBRSxDQUFDLFNBQVMsQ0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFFLENBQUM7Z0JBRW5GLElBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUNoQjtvQkFDQyxJQUFJLENBQUMscUJBQXFCLENBQUUsSUFBSSxDQUFFLENBQUMsTUFBTSxDQUFFLEtBQUssRUFBRSxDQUFDLENBQUUsQ0FBQztpQkFDdEQ7WUFDRixDQUFDLENBQUUsQ0FBQztRQUdMLENBQUM7UUFFTyxxQkFBcUIsQ0FBRyxJQUFZLEVBQUUsSUFBWSxFQUFFLE1BQWU7WUFFMUUsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUNsRCxJQUFLLENBQUMsT0FBTztnQkFDWixPQUFPO1lBRVIsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUNsQyxJQUFLLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtnQkFDcEMsT0FBTztZQUVSLElBQUksbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFFLDZCQUE2QixHQUFHLElBQUksQ0FBRSxDQUFDO1lBQzdGLElBQUssQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtnQkFDMUQsT0FBTztZQUVSLG1CQUFtQixDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUN0RCxDQUFDO1FBRU8sdUJBQXVCLENBQUcsSUFBbUI7WUFFcEQsT0FBTztZQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUUsVUFBVyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFDaEcsQ0FBQztRQUVPLG1CQUFtQixDQUFHLElBQVk7WUFFekMsUUFBUyxJQUFJLEVBQ2I7Z0JBQ0MsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUN0RCxLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7Z0JBQ3hELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDMUQsT0FBTyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUM7YUFDcEI7UUFDRixDQUFDO1FBRU8sd0JBQXdCO1lBRS9CLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUVqRCxPQUFPLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ3pDLENBQUM7UUFFTyx5QkFBeUI7WUFFaEMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLFNBQVMsQ0FBRSxDQUFDO1lBRWxELElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBQ2hELElBQUksUUFBUSxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1lBRWhELElBQUssUUFBUSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtnQkFDL0MsT0FBTyxRQUFRLENBQUM7O2dCQUVoQixPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO1FBRU8sMEJBQTBCO1lBRWpDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxVQUFVLENBQUUsQ0FBQztZQUVuRCxJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNqRCxJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUNqRCxJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztZQUVqRCxJQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFO2dCQUNqRyxPQUFPLFNBQVMsQ0FBQztpQkFDYixJQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFO2dCQUN0RyxPQUFPLFNBQVMsQ0FBQzs7Z0JBRWpCLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7S0FDRDtJQUVELE1BQU0sUUFBUTtRQUViLE1BQU0sQ0FBUztRQUNmLFVBQVUsR0FBOEIsU0FBUyxDQUFDLENBQUMsNEJBQTRCO1FBQy9FLFFBQVEsR0FBd0IsU0FBUyxDQUFDLENBQUUsOERBQThEO1FBQzFHLFFBQVEsR0FBNEMsRUFBRSxDQUFDLENBQUksd0NBQXdDO1FBQ25HLFVBQVUsR0FBd0IsRUFBRSxDQUFDLENBQUcseUNBQXlDO1FBQ2pGLFNBQVMsR0FBWSxLQUFLLENBQUMsQ0FBTSxlQUFlO1FBQ2hELGFBQWEsR0FBOEIsU0FBUyxDQUFDO1FBRXJELFlBQWEsSUFBWTtZQUV4QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNwQixDQUFDO1FBRUQsVUFBVSxDQUFHLElBQWdCLEVBQUUsT0FBZSxDQUFDO1lBRTlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDbEMsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksUUFBUSxDQUFFLEdBQUcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNoRSxDQUFDO1FBRUQsV0FBVyxDQUFHLElBQWdCLEVBQUUsT0FBZSxFQUFFO1lBRWhELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDbEMsT0FBTyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDNUUsQ0FBQztLQUNEO0lBRUQsTUFBTSxZQUFZO1FBRVQsWUFBWSxHQUFlLEVBQUUsQ0FBQztRQUV0QyxTQUFTLENBQUcsSUFBWTtZQUd2QixJQUFJLFNBQVMsR0FBRyxJQUFJLFFBQVEsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUVyQyxJQUFJLFFBQVEsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUUsSUFBSSxDQUFFLENBQUM7WUFFdEQsSUFBSyxlQUFlLENBQUUsUUFBUSxDQUFFO2dCQUMvQixRQUFRLEdBQUcsV0FBVyxDQUFDO1lBRXhCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSxnQkFBZ0IsR0FBRyxRQUFRLENBQUUsQ0FBQztZQUN4RSxJQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxFQUNqQztnQkFDQyxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFFLENBQUM7YUFDNUQ7WUFDRCxTQUFTLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztZQUU1QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBRSxTQUFTLENBQUUsQ0FBQztZQUVwQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsZ0JBQWdCLENBQUcsQ0FBUztZQUUzQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDL0IsQ0FBQztRQUVELGVBQWUsQ0FBRyxJQUF3QjtZQUV6QyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUUsQ0FBQztRQUN6RCxDQUFDO1FBRUQsMEJBQTBCLENBQUcsSUFBWTtZQUV4QyxJQUFJLElBQUksR0FBRyxZQUFZLENBQUMsaUNBQWlDLENBQUUsSUFBSSxDQUFFLENBQUM7WUFFbEUsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUUsSUFBSSxDQUFFLENBQUM7UUFDMUMsQ0FBQztRQUVELG9CQUFvQixDQUFHLElBQVk7WUFFbEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFFLENBQUM7UUFDOUQsQ0FBQztRQUVELFFBQVE7WUFFUCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO1FBQ2pDLENBQUM7UUFFRCxrQkFBa0IsQ0FBRyxJQUFZO1lBRWhDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDN0MsSUFBSyxRQUFRLElBQUksU0FBUyxDQUFFLFFBQVEsQ0FBRSxFQUN0QztnQkFDQyxTQUFTLENBQUUsUUFBUSxDQUFHLENBQUMsb0NBQW9DLENBQUUsSUFBSSxDQUFFLENBQUM7YUFDcEU7WUFFRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUUsSUFBSSxDQUFFLENBQUM7WUFFMUMsSUFBSyxJQUFJLENBQUMsWUFBWSxDQUFFLENBQUMsQ0FBRSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFFLENBQUMsQ0FBRSxDQUFDLFVBQVcsQ0FBQyxPQUFPLEVBQUUsRUFDdEY7Z0JBQ0MsSUFBSSxDQUFDLFlBQVksQ0FBRSxDQUFDLENBQUUsQ0FBQyxVQUFXLENBQUMsV0FBVyxDQUFFLEVBQUUsQ0FBRSxDQUFDO2FBQ3JEO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ2xDLENBQUM7UUFFRCxvQkFBb0IsQ0FBRyxXQUEyQztZQUVqRSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFFLFdBQVcsQ0FBRSxDQUFDLE9BQU8sQ0FBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBRSxDQUFFLENBQUM7WUFDNUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUUsQ0FBRSxDQUFDO1lBQzNELEtBQU0sTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksRUFDdkM7Z0JBQ0MsSUFBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUNoQztvQkFDQyxtRUFBbUU7b0JBQ25FLElBQUksQ0FBQyxrQkFBa0IsQ0FBRSxNQUFNLENBQUMsTUFBTSxDQUFFLENBQUM7aUJBQ3pDO2FBQ0Q7UUFDRixDQUFDO0tBQ0Q7SUFFRCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFFckIsSUFBSSxpQkFBaUIsR0FBMkMsRUFBRSxDQUFDLENBQUcsa0ZBQWtGO0lBQ3hKLElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLENBQUUsbUNBQW1DO0lBQ2xFLElBQUksU0FBUyxHQUErQixFQUFFLENBQUMsQ0FBQyx3QkFBd0I7SUFDeEUsSUFBSSxnQ0FBZ0MsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQ0FBb0M7SUFDOUUsSUFBSSxtQkFBbUIsR0FBa0IsSUFBSSxDQUFDLENBQUMseUVBQXlFO0lBRXhILElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0lBQzFCLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO0lBRTNCLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBQy9CLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLFdBQXlCLENBQUMsQ0FBSSwrQkFBK0I7SUFFakUsSUFBSSxlQUFlLEdBQWdDLEVBQUUsQ0FBQyxDQUFHLCtGQUErRjtJQUV4SixJQUFJLGNBQWMsR0FBa0M7UUFDbkQsUUFBUSxFQUFFLEdBQUc7UUFDYixTQUFTLEVBQUUsR0FBRztRQUNkLFVBQVUsRUFBRSxHQUFHO0tBQ2YsQ0FBQztJQUNGLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztJQUVwQixJQUFJLHNCQUFzQixHQUFrQixJQUFJLENBQUM7SUFFakQsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBRTNCLElBQUksUUFBUSxHQUFvQixFQUFFLENBQUM7SUFFcEMsVUFBVTtJQUNULFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDZixVQUFVO0lBR1QsTUFBTSxpQkFBaUIsR0FBZ0I7UUFFdEMsSUFBSSxFQUFFLENBQUM7UUFDUCxPQUFPLEVBQUUsQ0FBQztRQUNWLE1BQU0sRUFBRSxDQUFDO1FBQ1QsTUFBTSxFQUFFLENBQUM7UUFDVCxPQUFPLEVBQUUsQ0FBQztRQUNWLFNBQVMsRUFBRSxDQUFDO1FBQ1osUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNaLFFBQVEsRUFBRSxDQUFDO1FBQ1gsU0FBUyxFQUFFLENBQUM7UUFDWixVQUFVLEVBQUUsQ0FBQztRQUNiLE1BQU0sRUFBRSxDQUFDO1FBQ1QsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNULDhEQUE4RDtRQUM5RCxnRUFBZ0U7UUFDaEUsUUFBUSxFQUFFLENBQUM7UUFDWCxTQUFTLEVBQUUsQ0FBQztRQUNaLE9BQU8sRUFBRSxDQUFDO1FBQ1YsS0FBSyxFQUFFLENBQUM7UUFDUixLQUFLLEVBQUUsQ0FBQztRQUNSLEtBQUssRUFBRSxDQUFDO1FBQ1IsZUFBZSxFQUFFLENBQUM7UUFDbEIsZ0JBQWdCLEVBQUUsQ0FBQztLQUNuQixDQUFDO0lBRUYsTUFBTSxpQkFBaUIsR0FBZ0I7UUFFdEMsSUFBSSxFQUFFLENBQUM7UUFDUCxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ1gsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNWLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDVixPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ1gsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUNiLFFBQVEsRUFBRSxDQUFDO1FBQ1gsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNaLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDYixVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNWLEtBQUssRUFBRSxDQUFDO1FBQ1IsOERBQThEO1FBQzlELGlFQUFpRTtRQUNqRSxRQUFRLEVBQUUsQ0FBQztRQUNYLFNBQVMsRUFBRSxDQUFDO1FBQ1osT0FBTyxFQUFFLENBQUM7UUFDVixLQUFLLEVBQUUsQ0FBQztRQUNSLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixlQUFlLEVBQUUsQ0FBQztRQUNsQixnQkFBZ0IsRUFBRSxDQUFDO0tBQ25CLENBQUM7SUFFRixNQUFNLFlBQVksR0FBZ0I7UUFFakMsSUFBSSxFQUFFLENBQUM7UUFDUCxPQUFPLEVBQUUsQ0FBQztRQUNWLE9BQU8sRUFBRSxDQUFDO1FBQ1YsS0FBSyxFQUFFLENBQUM7UUFDUixRQUFRLEVBQUUsQ0FBQztRQUNYLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNULDhEQUE4RDtRQUM5RCxnRUFBZ0U7UUFDaEUsU0FBUyxFQUFFLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVTtLQUV4QixDQUFDO0lBRUYsTUFBTSxhQUFhLEdBQWdCO1FBRWxDLElBQUksRUFBRSxDQUFDO1FBQ1AsUUFBUSxFQUFFLENBQUM7UUFDWCxPQUFPLEVBQUUsQ0FBQztRQUNWLE1BQU0sRUFBRSxDQUFDO1FBQ1QsTUFBTSxFQUFFLENBQUM7UUFDVCxTQUFTLEVBQUUsQ0FBQztRQUNaLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDWixRQUFRLEVBQUUsQ0FBQztRQUNYLFNBQVMsRUFBRSxDQUFDO1FBQ1osVUFBVSxFQUFFLENBQUM7UUFDYixNQUFNLEVBQUUsQ0FBQztRQUNULEtBQUssRUFBRSxDQUFDLENBQUM7UUFDVCw4REFBOEQ7UUFDOUQsaUVBQWlFO1FBQ2pFLE9BQU8sRUFBRSxDQUFDO1FBQ1YsU0FBUyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQztRQUNWLEtBQUssRUFBRSxDQUFDO1FBQ1IsS0FBSyxFQUFFLENBQUM7UUFDUixLQUFLLEVBQUUsQ0FBQztRQUNSLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLGdCQUFnQixFQUFFLENBQUM7S0FDbkIsQ0FBQztJQUVGLElBQUksWUFBWSxHQUFnQixpQkFBaUIsQ0FBQyxDQUFDLGdDQUFnQztJQUVuRixNQUFNLEVBQUUsQ0FBQztJQUVULFNBQVMsTUFBTTtRQUVkLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDakIsV0FBVyxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFDakMsaUJBQWlCLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLG9CQUFvQixHQUFHLENBQUMsQ0FBQztRQUN6QixTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsZ0NBQWdDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLG1CQUFtQixHQUFHLElBQUksQ0FBQztRQUMzQixpQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDdEIsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUMzQixZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLFlBQVksR0FBRyxpQkFBaUIsQ0FBQztRQUNqQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBRWhCLGVBQWUsR0FBRyxFQUFFLENBQUM7UUFFckIsY0FBYyxHQUFHO1lBQ2hCLFFBQVEsRUFBRSxHQUFHO1lBQ2IsU0FBUyxFQUFFLEdBQUc7WUFDZCxVQUFVLEVBQUUsR0FBRztTQUNmLENBQUM7UUFFRixLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUVoQyxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBRS9CLFVBQVU7UUFDVixJQUFLLFFBQVEsS0FBSyxTQUFTLEVBQzNCO1lBQ0MsV0FBVyxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsRUFBRTtnQkFDM0MsNkJBQTZCLEVBQUUsSUFBSTtnQkFDbkMsOEJBQThCLEVBQUU7b0JBQy9CLENBQUMsRUFBRSxRQUFRO2lCQUNYO2FBQ0QsQ0FBRSxDQUFDO1lBRUosV0FBVyxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1NBQ2hEO1FBQ0gsVUFBVTtJQUVULENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFHLE9BQWlDLEVBQUUsT0FBZTtRQUVoRixJQUFLLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFDekM7WUFDQyxPQUFPLENBQUMsa0JBQWtCLENBQUUsT0FBTyxDQUFFLENBQUM7WUFDdEMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztTQUNoQztJQUNGLENBQUM7SUFFRCxFQUFFO0lBQ0YsdUNBQXVDO0lBQ3ZDLEVBQUU7SUFDRixTQUFTLG1CQUFtQjtRQUUzQixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBRTVDLElBQUssU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzFCLE9BQU87UUFFUixXQUFXLENBQUMsb0JBQW9CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFL0MsS0FBTSxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQ2pDO1lBQ0MsSUFBSyxDQUFDLHVCQUF1QixDQUFFLFFBQVEsQ0FBRTtnQkFDeEMsU0FBUztZQUVWLFVBQVUsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUN2QixLQUFNLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUUsVUFBVSxDQUFFLFFBQVEsQ0FBRyxDQUFFLEVBQzVEO2dCQUNDLElBQUssSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRztvQkFDaEMsU0FBUztnQkFFVixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDO2dCQUVwRCxvREFBb0Q7Z0JBQ3BELElBQUssQ0FBQyxPQUFPLEVBQ2I7b0JBQ0MsZ0JBQWdCLENBQUUsSUFBSSxDQUFFLENBQUM7aUJBQ3pCO3FCQUNJLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsSUFBSSxRQUFRLEVBQUcsZ0JBQWdCO2lCQUN2RTtvQkFDQyxZQUFZLENBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBRSxDQUFDO2lCQUNsQzthQUNEO1NBQ0Q7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSyx1QkFBdUIsQ0FBRSxJQUFJLENBQUU7WUFDbkMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO1FBQ3BCLElBQUssdUJBQXVCLENBQUUsV0FBVyxDQUFFO1lBQzFDLFVBQVUsQ0FBRSxXQUFXLENBQUUsQ0FBQztRQUUzQixTQUFTLFVBQVUsQ0FBRyxRQUFnQjtZQUVyQyxJQUFLLENBQUMsU0FBUyxDQUFFLFFBQVEsQ0FBRTtnQkFDMUIsU0FBUyxDQUFFLFFBQVEsQ0FBRSxHQUFHLElBQUksTUFBTSxDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQ2pELENBQUM7UUFFRCxTQUFTLHVCQUF1QixDQUFHLElBQVk7WUFFOUMsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxDQUFDO1lBQ3pELElBQUssSUFBSSxJQUFJLGFBQWEsSUFBSSxJQUFJLElBQUksYUFBYSxFQUNuRDtnQkFDQyxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQzthQUN4RjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBRyxPQUFpQixFQUFFLE9BQWU7UUFFekQsbUJBQW1CO1FBQ25CLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsSUFBSSxPQUFPO1lBQzdDLE9BQU87UUFFUixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFZLENBQUM7UUFDdkQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUVsQyxnQ0FBZ0M7UUFDaEMsT0FBTyxDQUFDLFFBQVEsQ0FBRSxVQUFVLENBQUUsR0FBRyxPQUFPLENBQUM7UUFFekMsZ0NBQWdDO1FBQ2hDLElBQUssT0FBTyxJQUFJLFNBQVMsRUFDekI7WUFDQyxTQUFTLENBQUUsT0FBTyxDQUFHLENBQUMsb0NBQW9DLENBQUUsSUFBSSxDQUFFLENBQUM7U0FDbkU7UUFFRCx3RkFBd0Y7UUFDeEYsT0FBTyxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNsQyxPQUFPLENBQUMsUUFBUSxDQUFFLFNBQVMsQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFFcEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDcEMsT0FBTztRQUVSLCtDQUErQztRQUMvQyxJQUFLLE9BQU87WUFDWCxRQUFRLENBQUMsV0FBVyxDQUFFLFdBQVcsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUUvQyxRQUFRLENBQUMsUUFBUSxDQUFFLFdBQVcsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUUzQyx3Q0FBd0M7UUFDeEMsSUFBSyxlQUFlLENBQUUsT0FBTyxDQUFFLElBQUksYUFBYSxDQUFDLGlCQUFpQixFQUFFLEVBQ3BFO1lBQ0MsUUFBUSxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUU5QixPQUFPO1NBQ1A7UUFFRCw0Q0FBNEM7UUFDNUMsRUFBRTtRQUNGLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSxnQkFBZ0IsR0FBRyxPQUFPLENBQUUsQ0FBQztRQUN2RSxJQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFFLE9BQU8sQ0FBRSxFQUMzQztZQUNDLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUM1RDtRQUVELElBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFDL0I7WUFDQyxPQUFPLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztZQUMxQixRQUFRLENBQUMsU0FBUyxDQUFFLE1BQU0sQ0FBRSxDQUFDO1lBQzdCLFFBQVEsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7U0FDakM7YUFFRDtZQUNDLFFBQVEsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7U0FDOUI7UUFFRCwwQkFBMEI7UUFDMUIsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDLG9CQUFvQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBQ25ELHdCQUF3QixDQUFFLEdBQUcsRUFBRSxJQUFJLENBQUUsQ0FBQyxDQUFDLDhDQUE4QztRQUVyRixXQUFXLENBQUUsR0FBRyxDQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUcsSUFBWTtRQUV2QyxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFFLElBQUksQ0FBRSxDQUFDO1FBRTVDLGVBQWUsQ0FBRSxPQUFPLENBQUUsQ0FBQztRQUUzQixJQUFJLEdBQUcsR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUUsSUFBSSxDQUFFLENBQUM7UUFDbkQsd0JBQXdCLENBQUUsR0FBRyxFQUFFLElBQUksQ0FBRSxDQUFDO1FBRXRDLFdBQVcsQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUVuQixzREFBc0Q7UUFDdEQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBRSxZQUEyQixDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUMsQ0FBQyxZQUFZO1FBRTdFLENBQUMsQ0FBQyxHQUFHLENBQUUsYUFBYSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUUsWUFBMkIsQ0FBRSxDQUFFLENBQUM7UUFDcEUsdUJBQXVCLENBQUUsU0FBdUIsQ0FBRSxDQUFDO0lBRXBELENBQUM7SUFFRCxFQUFFO0lBQ0YsNkVBQTZFO0lBQzdFLDJDQUEyQztJQUMzQyxFQUFFO0lBQ0YsU0FBUyxpQkFBaUI7UUFFekIsV0FBVyxDQUFDLG9CQUFvQixDQUFFLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7UUFDcEUsSUFBSyxvQkFBb0IsSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQ25EO1lBQ0MsbUJBQW1CLEVBQUUsQ0FBQztZQUV0QixvQkFBb0IsR0FBRyxDQUFDLENBQUM7U0FDekI7UUFFRCxhQUFhLENBQUUsb0JBQW9CLENBQUUsQ0FBQztRQUV0QyxvQkFBb0IsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxTQUFTLHlCQUF5QixDQUFHLFVBQW1CLEtBQUs7UUFFNUQsMENBQTBDO1FBQzFDLENBQUMsQ0FBQyxRQUFRLENBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBRSxDQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLGlCQUFpQixDQUFHLE9BQWdCO1FBRTVDLElBQUssQ0FBQyxRQUFRO1lBQ2IsT0FBTztRQUVSLG1CQUFtQixFQUFFLENBQUM7UUFDdEIsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO1FBRXpCLHlEQUF5RDtRQUN6RCwrREFBK0Q7UUFDL0QsMkNBQTJDO1FBRTNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDLFVBQVUsQ0FBQztZQUM3RCxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNsQyxRQUFRLENBQUMsV0FBVyxDQUFFLG9CQUFvQixDQUFFLENBQUM7U0FDOUM7UUFFRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUNoRDtZQUNDLGFBQWEsQ0FBRSxDQUFDLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFFNUIsdURBQXVEO1NBQ3ZEO1FBRUQsK0JBQStCO1FBQy9CLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDLFVBQVUsQ0FBQztZQUM3RCxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO2dCQUNsQyxRQUFRLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7U0FDM0M7SUFFRixDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLFNBQVMsTUFBTSxDQUFHLEVBQVc7UUFFNUIsRUFBRSxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1FBQ3ZDLEVBQUUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsU0FBUyx5QkFBeUIsQ0FBRyxJQUFZO1FBRWhELElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQywwQkFBMEIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUUzRCxhQUFhLENBQUUsS0FBSyxFQUFFLElBQUksQ0FBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxTQUFTLGlDQUFpQyxDQUFHLElBQVk7UUFFeEQsNEdBQTRHO1FBQzVHLCtDQUErQztRQUUvQywwQ0FBMEM7UUFDMUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztJQUU3RCxDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELEVBQUU7SUFDRixrQkFBa0I7SUFDbEIsd0RBQXdEO0lBQ3hELEVBQUU7SUFDRixTQUFTLGFBQWEsQ0FBRyxHQUFXLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFFcEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRWxELElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLE9BQU8sR0FBRyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUVuQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBRTFCLE9BQU8sQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRWhFLG9CQUFvQjtRQUNwQixJQUFJO1FBQ0osV0FBVztRQUNYLElBQUk7UUFFSix3QkFBd0IsQ0FBRSxHQUFHLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDekMsV0FBVyxDQUFFLEdBQUcsQ0FBRSxDQUFDO0lBRXBCLENBQUM7SUFDRCxnREFBZ0Q7SUFFaEQsU0FBUyx1QkFBdUI7UUFFL0IsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFFLG9CQUFvQixDQUFFLENBQUM7UUFDOUMsSUFBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDOUMsT0FBTztRQUVSLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFDaEcsSUFBSSxFQUFFLEdBQUcsQ0FBRSxZQUFZLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUVqRSxJQUFLLEVBQUUsRUFDUDtZQUNDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQzdCLG1CQUFtQixFQUFFLENBQUM7U0FDdEI7YUFFRDtZQUNDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1NBQzlCO0lBQ0YsQ0FBQztJQUVELFNBQVMsU0FBUyxDQUFHLENBQU0sRUFBRSxDQUFNO1FBRWxDLENBQUMsR0FBRyxNQUFNLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDaEIsQ0FBQyxHQUFHLE1BQU0sQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUVoQixJQUFLLEtBQUssQ0FBRSxDQUFDLENBQUU7WUFDZCxPQUFPLENBQUUsQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBQztRQUN4QixJQUFLLEtBQUssQ0FBRSxDQUFDLENBQUU7WUFDZCxPQUFPLEtBQUssQ0FBQztRQUVkLE9BQU8sQ0FBRSxDQUFDLEdBQUcsQ0FBQyxDQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELDBEQUEwRDtJQUMxRCxFQUFFO0lBQ0YsU0FBUyxXQUFXLENBQUcsR0FBVztRQUVqQyxJQUFLLGdDQUFnQyxJQUFJLENBQUM7WUFDekMsT0FBTztRQUVSLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBRSxHQUFHLENBQUcsQ0FBQztRQUVuRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQzlCLElBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ2hDLE9BQU87UUFFUixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO1FBRWxDLElBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQ3BDLE9BQU87UUFHUixxQ0FBcUM7UUFDckMsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBcUIsQ0FBQztRQUNwRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDekM7WUFDQyw4QkFBOEI7WUFDOUIsSUFBSyxPQUFPLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNO2dCQUMzQyxTQUFTO1lBRVYsSUFBSSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBQztZQUMvRSxJQUFLLENBQUMsb0JBQW9CO2dCQUN6QixTQUFTO1lBRVYsS0FBTSxJQUFJLElBQUksSUFBSSxZQUFZLEVBQzlCO2dCQUNDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBa0IsQ0FBRSxDQUFDO2dCQUNwRCxJQUFJLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUUsSUFBa0IsQ0FBRSxDQUFDO2dCQUVqRSxJQUFLLFlBQVksQ0FBRSxJQUFrQixDQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUcsV0FBVztpQkFDNUQ7b0JBQ0MsT0FBTztvQkFDUCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUM7b0JBQ2pCLE1BQU0sR0FBRyxNQUFNLENBQUM7b0JBQ2hCLE1BQU0sR0FBRyxHQUFHLENBQUM7aUJBQ2I7Z0JBRUQsSUFBSyxTQUFTLENBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBRSxFQUNoQztvQkFFQyxJQUFLLFFBQVEsQ0FBRSxDQUFDLEdBQUcsQ0FBQyxDQUFFLElBQUksUUFBUSxFQUNsQzt3QkFDQyw2R0FBNkc7d0JBRTdHLE1BQU0sQ0FBQyxlQUFlLENBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBRSxDQUFDO3dCQUVsRCxnRUFBZ0U7d0JBQ2hFLFVBQVU7d0JBQ1YsV0FBVzt3QkFDWCxVQUFVO3dCQUNWLGFBQWE7d0JBQ2IsWUFBWTt3QkFDWix3REFBd0Q7d0JBQ3hELFVBQVU7d0JBQ1YsV0FBVzt3QkFDWCxVQUFVO3dCQUNWLFdBQVc7d0JBQ1gsTUFBTTtxQkFDTjtvQkFFRCxPQUFPO2lCQUNQO3FCQUNJLElBQUssU0FBUyxDQUFFLE1BQU0sRUFBRSxNQUFNLENBQUUsRUFDckM7b0JBRUMsd0RBQXdEO29CQUN4RCxTQUFTO29CQUNULFVBQVU7b0JBQ1YsU0FBUztvQkFDVCxZQUFZO29CQUNaLFdBQVc7b0JBQ1gsdURBQXVEO29CQUN2RCxTQUFTO29CQUNULFVBQVU7b0JBQ1YsU0FBUztvQkFDVCxVQUFVO29CQUNWLElBQUk7b0JBRUosTUFBTTtpQkFDTjthQUNEO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUcsUUFBZ0I7UUFFMUMsT0FBTyxDQUNOLFFBQVEsS0FBSyxXQUFXO1lBQ3hCLFFBQVEsS0FBSyxZQUFZO1lBQ3pCLFFBQVEsS0FBSyxTQUFTO1lBQ3RCLFFBQVEsS0FBSyxjQUFjO1lBQzNCLFFBQVEsS0FBSyxFQUFFLENBQ2YsQ0FBQztJQUNILENBQUM7SUFFRCxnREFBZ0Q7SUFDaEQsU0FBUyx3QkFBd0IsQ0FBRyxHQUFXLEVBQUUsT0FBTyxHQUFHLEtBQUs7UUFFL0QsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRWxELEtBQU0sSUFBSSxJQUFJLElBQUksaUJBQWlCLEVBQ25DO1lBQ0Msb0dBQW9HO1lBQ3BHLElBQUssT0FBTyxDQUFFLGlCQUFpQixDQUFFLElBQWtCLENBQUUsQ0FBRSxLQUFLLFVBQVUsRUFDdEU7Z0JBQ0MsaUJBQWlCLENBQUUsSUFBa0IsQ0FBRyxDQUFFLE9BQVEsRUFBRSxPQUFPLENBQUUsQ0FBQzthQUM5RDtTQUNEO0lBQ0YsQ0FBQztJQUVELDBFQUEwRTtJQUMxRSxTQUFTLGtCQUFrQixDQUFHLE9BQWlCLEVBQUUsSUFBZ0IsRUFBRSxTQUFzQixFQUFFLE9BQU8sR0FBRyxLQUFLO1FBRXpHLGtEQUFrRDtRQUNsRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO1FBRXpDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ2xDLE9BQU87UUFFUixJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7UUFFOUQsSUFBSSxZQUFZLEdBQUcsU0FBUyxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUMvQyxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5QztZQUNDLElBQUssQ0FBQyxPQUFPLEVBQ2I7Z0JBQ0MsSUFBSyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUNqQztvQkFDQyxNQUFNLENBQUUsT0FBTyxDQUFFLENBQUM7aUJBQ2xCO2FBQ0Q7WUFFRCxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQztZQUV4QyxJQUFLLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQ2pDO2dCQUNDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO2FBQ3ZDO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUcsSUFBZ0I7UUFFMUMsU0FBUyxHQUFHLENBQUcsSUFBWTtZQUUxQixJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRyxDQUFDO1lBQ25ELElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFFckMsSUFBSyxRQUFRO2dCQUNaLE9BQU8sQ0FBRSxRQUFRLENBQUUsSUFBSSxDQUFFLElBQUksQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDNUQsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRUQsNERBQTREO0lBQzVELG1GQUFtRjtJQUNuRixFQUFFO0lBQ0YsU0FBUyxtQkFBbUIsQ0FBRyxJQUFnQjtRQUU5Qyw0Q0FBNEM7UUFDNUMsSUFBSSxFQUFrQixDQUFDO1FBRXZCLFFBQVMsSUFBSSxFQUNiO1lBQ0MsS0FBSyxVQUFVO2dCQUNkLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFFZCxJQUFLLFdBQVcsQ0FBQyxZQUFZLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRTt3QkFDOUMsT0FBTztvQkFFUixJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO29CQUMvQixJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ3pELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztvQkFDdkIsSUFBSSxZQUFZLEdBQUcsR0FBRyxDQUFDO29CQUV2QixJQUFJLGtCQUFrQixHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxrQ0FBa0MsQ0FBRSxDQUFFLENBQUM7b0JBRTdHLElBQUssa0JBQWtCLElBQUksQ0FBQyxJQUFJLGFBQWEsRUFDN0M7d0JBQ0MsWUFBWSxHQUFHLFlBQVksQ0FBQyxpQ0FBaUMsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO3dCQUVwRixJQUFLLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsRUFDbEQ7NEJBQ0MsU0FBUyxHQUFHLFlBQVksQ0FBQzs0QkFDekIsVUFBVSxHQUFHLElBQUksQ0FBQzt5QkFDbEI7cUJBQ0Q7b0JBRUQsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFFLFNBQVMsQ0FBRSxDQUFDO29CQUVqRSxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsaUNBQWlDO3dCQUNqQyxJQUFLLGFBQWEsRUFDbEI7NEJBQ0MsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFFLHVCQUF1QixDQUFFLENBQUM7NEJBRTlDLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO2dDQUN4QyxPQUFPOzRCQUVSLElBQUksZUFBZSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7NEJBQ3ZDLFVBQVUsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFFLENBQUM7NEJBQ3JELElBQUssZUFBZSxFQUNwQjtnQ0FDQywwQkFBMEI7Z0NBQzFCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwrQkFBK0IsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUUsQ0FBQztnQ0FFaEcsSUFBSSxTQUFTLEdBQUcsa0JBQWtCLEdBQUcsWUFBWSxDQUFDLGdDQUFnQyxDQUFFLFlBQVksQ0FBRSxHQUFHLE1BQU0sQ0FBQztnQ0FDMUcsQ0FBQyxDQUFFLDZCQUE2QixDQUFlLENBQUMsUUFBUSxDQUFFLFNBQVMsQ0FBRSxDQUFDO2dDQUN0RSxDQUFDLENBQUUsNEJBQTRCLENBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxZQUFZLENBQUMsdUJBQXVCLENBQUUsWUFBWSxDQUFFLENBQUUsQ0FBQzs2QkFDM0g7eUJBQ0Q7cUJBQ0Q7b0JBRUQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztvQkFDbEMsSUFBSyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUNuQzt3QkFDQyxnQ0FBZ0M7d0JBQ2hDLHFCQUFxQjt3QkFDckIsZ0NBQWdDO3dCQUNoQyxJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsc0JBQXNCLENBQUUsQ0FBQzt3QkFDMUUsSUFBSyxjQUFjLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUMvQzs0QkFDQyxjQUFjLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxZQUFZLElBQUksQ0FBQyxDQUFFLENBQUM7eUJBQzFEO3FCQUNEO2dCQUNGLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxVQUFVO2dCQUNkLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFFZCxJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO29CQUVuRSxZQUFZLENBQUUsT0FBTyxFQUFFLFlBQVksQ0FBRSxDQUFDO2dCQUN2QyxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssTUFBTTtnQkFDVixFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBRWQsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQztvQkFFbEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7d0JBQ3BDLE9BQU87b0JBRVIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsQ0FBQztvQkFDekMsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBYSxDQUFDO29CQUM5RCxJQUFLLENBQUMsT0FBTzt3QkFDWixPQUFPO29CQUVSLElBQUksYUFBYSxHQUFHLHVCQUF1QixDQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBQ3RFLE9BQU8sQ0FBQyxXQUFXLENBQUUsZ0NBQWdDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxDQUFDLENBQUMseURBQXlEO29CQUNuSSxJQUFLLGFBQWEsRUFDbEI7d0JBQ0MsZ0RBQWdEO3dCQUNoRCxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsYUFBYSxDQUFFLENBQUM7d0JBQzNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsYUFBYSxDQUFDLENBQUMsb0ZBQW9GO3FCQUM5SDt5QkFFRDt3QkFDQyxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFFLENBQUM7cUJBQ3JFO2dCQUdGLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxPQUFPO2dCQUNYLEVBQUUsR0FBRyxVQUFXLE9BQU8sRUFBRSxPQUFPLEdBQUcsS0FBSztvQkFFdkMsa0JBQWtCLENBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUMxRSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssU0FBUztnQkFDYixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBRXZDLGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUM1RSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBRXZDLGtCQUFrQixDQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUUsQ0FBQztnQkFDM0UsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLElBQUksQ0FBQztZQUNWLEtBQUssSUFBSSxDQUFDO1lBQ1YsS0FBSyxJQUFJLENBQUM7WUFDVixLQUFLLEtBQUssQ0FBQztZQUNYLEtBQUssS0FBSyxDQUFDO1lBQ1gsS0FBSyxlQUFlLENBQUM7WUFDckIsS0FBSyxnQkFBZ0IsQ0FBQztZQUN0QixLQUFLLFFBQVE7Z0JBQ1osRUFBRSxHQUFHLFVBQVcsT0FBTyxFQUFFLE9BQU8sR0FBRyxLQUFLO29CQUV2QyxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGVBQWUsQ0FBRSxJQUFJLENBQUUsRUFBRSxPQUFPLENBQUUsQ0FBQztnQkFDdkUsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLEtBQUs7Z0JBQ1QsRUFBRSxHQUFHLFVBQVcsT0FBTyxFQUFFLE9BQU8sR0FBRyxLQUFLO29CQUd2QyxJQUFJLEdBQW9CLENBQUM7b0JBRXpCLElBQUssV0FBVyxJQUFJLENBQUMsRUFDckI7d0JBQ0Msd0VBQXdFO3dCQUN4RSxvRUFBb0U7d0JBQ3BFLElBQUksS0FBSyxHQUFHLGVBQWUsQ0FBRSxLQUFLLENBQUUsQ0FBQzt3QkFDckMsR0FBRyxHQUFHLEtBQUssQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBRTlCLElBQUssT0FBTyxHQUFHLElBQUksUUFBUSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQ3RDOzRCQUNDLEdBQUcsR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO3lCQUNsQjtxQkFDRDt5QkFFRDt3QkFDQyxFQUFFO3dCQUNGLHNFQUFzRTt3QkFDdEUsaUVBQWlFO3dCQUNqRSwwR0FBMEc7d0JBQzFHLEdBQUc7d0JBQ0gsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxRQUFRLENBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2hELEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLE9BQU8sQ0FBRSxHQUFHLEtBQUssQ0FBQztxQkFDNUM7b0JBRUQsSUFBSyxPQUFPLEdBQUcsSUFBSSxRQUFRLEVBQzNCO3dCQUNDLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBRSxDQUFDO3FCQUN2QjtvQkFFRCxrQkFBa0IsQ0FBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBRSxDQUFDO2dCQUNyRSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssTUFBTTtnQkFFVixFQUFFLEdBQUcsVUFBVyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUs7b0JBR3ZDLElBQUksWUFBWSxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO29CQUMvRCxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFFQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUM1QyxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTs0QkFDeEMsT0FBTzt3QkFFUix3QkFBd0I7d0JBQ3hCLElBQUksY0FBYyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsQ0FBQzt3QkFDbEUsSUFBSyxDQUFDLGNBQWMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUU7NEJBQ2hELE9BQU87d0JBRVIsNkJBQTZCO3dCQUM3QixJQUFJLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQWEsQ0FBQzt3QkFDbkYsSUFBSyxDQUFDLG9CQUFvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFOzRCQUM1RCxPQUFPO3dCQUVSLGNBQWM7d0JBRWQsT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsR0FBRyxZQUFZLENBQUM7d0JBRXhDLGNBQWMsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLFlBQVksSUFBSSxDQUFDLENBQUUsQ0FBQzt3QkFDMUQsb0JBQW9CLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxZQUFZLElBQUksQ0FBQyxDQUFFLENBQUM7d0JBRWhFLG9CQUFvQixDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBRXBELElBQUssQ0FBQyxPQUFPLEVBQ2I7NEJBQ0MsTUFBTSxDQUFFLGNBQWMsQ0FBRSxDQUFDOzRCQUN6QixNQUFNLENBQUUsb0JBQW9CLENBQUUsQ0FBQzt5QkFDL0I7cUJBQ0Q7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLFNBQVM7b0JBQ1QsU0FBUztvQkFDVCxTQUFTO29CQUNULGNBQWM7b0JBQ2Qsa0JBQWtCO29CQUNsQixZQUFZO29CQUNaLGdCQUFnQjtvQkFDaEIsWUFBWTtvQkFDWixnQkFBZ0I7b0JBQ2hCLG9CQUFvQjtvQkFDcEIsa0NBQWtDO29CQUNsQyw2QkFBNkI7b0JBQzdCLCtCQUErQjtvQkFDL0IsOEJBQThCO29CQUM5Qiw4QkFBOEI7b0JBQzlCLGlCQUFpQjtvQkFDakIsdUJBQXVCO29CQUV2QixJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQXdDLENBQUM7b0JBRXZHLGlDQUFpQztvQkFDakMsdUdBQXVHO29CQUV2RyxJQUFLLFlBQVksS0FBSyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxFQUM5Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQzt3QkFFbEMsSUFBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7NEJBQ3BDLE9BQU87d0JBRVIsUUFBUSxDQUFDLFdBQVcsQ0FBRSx1QkFBdUIsRUFBRSxZQUFZLEtBQUssQ0FBQyxDQUFFLENBQUM7d0JBRXBFLHNFQUFzRTt3QkFDdEUsUUFBUSxDQUFDLFdBQVcsQ0FBRSwrQkFBK0IsRUFBRSxZQUFZLEtBQUssRUFBRSxDQUFFLENBQUM7d0JBQzdFLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO3dCQUV0RSxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUN6QyxJQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTs0QkFDbEMsT0FBTzt3QkFFUixJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7d0JBQ3BFLElBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFOzRCQUM5QyxPQUFPO3dCQUVSLGdCQUFnQjt3QkFDaEIsYUFBYSxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsQ0FBRSxZQUFZLENBQUUsQ0FBRSxDQUFDO3FCQUNoRTtnQkFDRixDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssT0FBTztnQkFDWCxFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBRWQsa0JBQWtCLENBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsY0FBYyxDQUFFLENBQUM7Z0JBQ2pFLENBQUMsQ0FBQztnQkFDRixNQUFNO1lBRVAsS0FBSyxPQUFPO2dCQUNYLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRTtvQkFHZCxrREFBa0Q7b0JBQ2xELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUUsSUFBSSxDQUFFLENBQUM7b0JBQ3pDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO3dCQUNsQyxPQUFPO29CQUVSLDZFQUE2RTtvQkFDN0UsMkZBQTJGO29CQUMzRixhQUFhO29CQUViLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUUsQ0FBQztvQkFDbkQsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRWhFLElBQUssWUFBWSxLQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEVBQzlDO3dCQUNDLElBQUssWUFBWSxJQUFJLENBQUMsRUFDdEI7NEJBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxRQUFRLEVBQUUsS0FBSyxDQUFFLENBQUM7NEJBQ3ZDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBRSxjQUFjLEVBQUUsWUFBWSxDQUFFLENBQUM7eUJBQzdEOzZCQUVEOzRCQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLElBQUksQ0FBRSxDQUFDO3lCQUN0QztxQkFDRDtvQkFDRCxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQztnQkFFekMsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLE1BQU07Z0JBQ1YsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUssQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7d0JBQ3hELE9BQU87b0JBRVIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUUscUJBQXFCLEVBQUUsT0FBTyxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7b0JBRS9GLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUUsSUFBSSxDQUFFLENBQUM7b0JBQ3pDLElBQUssQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO3dCQUNsQyxPQUFPO29CQUVSLGdDQUFnQztvQkFDaEMsT0FBTztvQkFDUCxnQ0FBZ0M7b0JBRWhDLE9BQU8sQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUUsYUFBYSxFQUFFLFlBQVksQ0FBQyxhQUFhLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFFLENBQUM7b0JBRXZHLGtEQUFrRDtvQkFDbEQsVUFBVTtvQkFDVixrRUFBa0U7b0JBQ2xFLGdDQUFnQztvQkFDaEMsVUFBVTtnQkFDWCxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxTQUFTLENBQUM7WUFDZixLQUFLLFVBQVU7Z0JBQ2QsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLElBQUksWUFBWSxDQUFDO29CQUVqQixJQUFLLFlBQVksQ0FBQyxZQUFZLEVBQUUsSUFBSSxlQUFlLENBQUUsWUFBWSxDQUFDLGlCQUFpQixDQUFFLGdCQUFnQixFQUFFLENBQUUsQ0FBRTt3QkFDMUcsT0FBTztvQkFFUixJQUFLLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLEVBQ2hEO3dCQUNDLHlFQUF5RTt3QkFDekUsa0NBQWtDO3dCQUNsQyxPQUFPO3dCQUNQLE9BQU87cUJBQ1A7eUJBRUQ7d0JBQ0MsUUFBUyxJQUFJLEVBQ2I7NEJBQ0MsS0FBSyxRQUFRO2dDQUFFLFlBQVksR0FBRyxZQUFZLENBQUMsdUJBQXVCLENBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO2dDQUFDLE1BQU07NEJBQzVGLEtBQUssU0FBUztnQ0FBRSxZQUFZLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztnQ0FBQyxNQUFNOzRCQUM5RixLQUFLLFVBQVU7Z0NBQUUsWUFBWSxHQUFHLFlBQVksQ0FBQyx5QkFBeUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7Z0NBQUMsTUFBTTt5QkFDaEc7cUJBQ0Q7b0JBR0Qsd0JBQXdCO29CQUN4QixJQUFLLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLElBQUksWUFBWSxFQUM3Qzt3QkFDQyxPQUFPLENBQUMsUUFBUSxDQUFFLElBQUksQ0FBRSxHQUFHLFlBQVksQ0FBQzt3QkFFeEMsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUUsVUFBVSxDQUFFLENBQUUsQ0FBQzt3QkFFM0QsSUFBSyxLQUFLOzRCQUNULEtBQUssQ0FBQyxzQkFBc0IsQ0FBRSxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUUsQ0FBQztxQkFDcEU7Z0JBQ0YsQ0FBQyxDQUFDO2dCQUNGLE1BQU07WUFFUCxLQUFLLE9BQU87Z0JBQ1gsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLHNEQUFzRDtvQkFDdEQsa0VBQWtFO29CQUNsRSxJQUFLLFlBQVksQ0FBQyxTQUFTLEVBQUU7d0JBQzVCLE9BQU87b0JBRVIsSUFBSSxZQUFZLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRWpFLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsS0FBSyxZQUFZLEVBQzlDO3dCQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxDQUFDO3dCQUV4QyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUN6QyxJQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTs0QkFDbEMsT0FBTzt3QkFFUixJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7d0JBQ25FLElBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFOzRCQUM1QyxPQUFPO3dCQUVSLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBRWpFLFlBQVksQ0FBQyxRQUFRLENBQUUsaUJBQWlCLEdBQUcsU0FBUyxHQUFHLFlBQVksQ0FBRSxDQUFDO3FCQUN0RTtnQkFDRixDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixFQUFFLEdBQUcsT0FBTyxDQUFDLEVBQUU7b0JBR2QsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsQ0FBQztvQkFDekMsSUFBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7d0JBQ2xDLE9BQU87b0JBRVIsZUFBZTtvQkFDZixFQUFFO29CQUNGLFNBQVM7b0JBQ1QsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBdUIsQ0FBQztvQkFDOUUsSUFBSyxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUU7d0JBQzlDLE9BQU87b0JBRVIsU0FBUztvQkFDVCxhQUFhLENBQUMsc0JBQXNCLENBQUUsWUFBWSxDQUFDLGFBQWEsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztvQkFFckYsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztvQkFFNUQsYUFBYSxDQUFDLFdBQVcsQ0FBRSxXQUFXLEVBQUUsUUFBUSxHQUFHLElBQUksQ0FBRSxDQUFDO29CQUUxRCx5RUFBeUU7b0JBQ3pFLGFBQWE7b0JBQ2IsRUFBRTtvQkFDRixJQUFJLGFBQWEsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUUsY0FBYyxDQUFFLENBQUM7b0JBQ3RFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFDN0M7d0JBQ0MsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7d0JBQzlELElBQUssU0FBUyxLQUFLLEVBQUUsRUFDckI7NEJBQ0MsYUFBYSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDOzRCQUMxQyxhQUFhLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUN0Qzs2QkFFRDs0QkFDQyxhQUFhLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO3lCQUNuQztxQkFDRDtvQkFDRCwwQkFBMEI7b0JBQzFCLGFBQWE7b0JBQ2IsRUFBRTtvQkFDRiwyREFBMkQ7b0JBQzNELElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBQ25FLE9BQU8sQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO29CQUM1QixJQUFJLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG9CQUFvQixDQUFFLElBQUksR0FBRyxDQUFDO29CQUN4RixJQUFJLE9BQU8sR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxDQUFFLENBQUM7b0JBRW5GLElBQUksa0JBQWtCLEdBQUcsWUFBWSxDQUFDLHlCQUF5QixDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztvQkFDbEYsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO29CQUV6RCxPQUFPLENBQUMsVUFBVyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsT0FBTyxJQUFJLENBQUUsT0FBTyxJQUFJLGdCQUFnQixDQUFFLElBQUksQ0FBRSxhQUFhLElBQUksa0JBQWtCLENBQUUsQ0FBRSxDQUFDO2dCQUVuSSxDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQLEtBQUssWUFBWTtnQkFDaEIsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUVkLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7b0JBQ3BDLElBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO3dCQUNwQyxPQUFPO29CQUVSLElBQUksWUFBWSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBQzdFLElBQUksWUFBWSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxnQkFBZ0IsQ0FBRSxDQUFDO29CQUVsRSxJQUFLLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFLEVBQzNDO3dCQUNDLElBQUssWUFBWSxHQUFHLENBQUMsRUFDckI7NEJBQ0MsWUFBWSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7NEJBRTVCLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsS0FBSyxZQUFZLEVBQzlDO2dDQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxDQUFDO2dDQUV4QyxJQUFJLE9BQU8sR0FDWDtvQ0FDQyxVQUFVLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFFLGdCQUFnQixDQUFFO29DQUMxRCxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07b0NBQ3BCLEdBQUcsRUFBRSxXQUFxQztvQ0FDMUMsWUFBWSxFQUFFLEtBQUs7aUNBQ25CLENBQUM7Z0NBRUYsWUFBWSxDQUFDLE9BQU8sQ0FBRSxPQUFPLENBQUUsQ0FBQzs2QkFFaEM7eUJBQ0Q7NkJBRUQ7NEJBQ0MsWUFBWSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7eUJBQzdCO3FCQUNEO29CQUFBLENBQUM7Z0JBQ0gsQ0FBQyxDQUFBO2dCQUNELE1BQU07WUFFUCxLQUFLLE1BQU07Z0JBQ1YsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFO29CQUdkLElBQUksWUFBWSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLENBQUM7b0JBRWxFLElBQUssT0FBTyxDQUFDLFFBQVEsQ0FBRSxJQUFJLENBQUUsS0FBSyxZQUFZLEVBQzlDO3dCQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFFLEdBQUcsWUFBWSxDQUFDO3dCQUV4QyxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFFLElBQUksQ0FBRSxDQUFDO3dCQUN6QyxJQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTs0QkFDbEMsT0FBTzt3QkFFUixJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUUsT0FBTyxDQUFhLENBQUM7d0JBQ2xFLElBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFOzRCQUMxQyxPQUFPO3dCQUVSLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQzt3QkFFbkIsSUFBSyxZQUFZLEdBQUcsQ0FBQyxFQUNyQjs0QkFDQyxTQUFTLEdBQUcsZ0NBQWdDLEdBQUcsWUFBWSxHQUFHLE1BQU0sQ0FBQzt5QkFDckU7NkJBRUQ7NEJBQ0MsU0FBUyxHQUFHLEVBQUUsQ0FBQzt5QkFDZjt3QkFFRCxXQUFXLENBQUMsUUFBUSxDQUFFLFNBQVMsQ0FBRSxDQUFDO3FCQUNsQztnQkFDRixDQUFDLENBQUM7Z0JBQ0YsTUFBTTtZQUVQO2dCQUNDLENBQUMsQ0FBQyxHQUFHLENBQUUsSUFBSSxHQUFHLHVCQUF1QixDQUFFLENBQUM7Z0JBQ3hDLE9BQU87U0FDUjtRQUVELHFGQUFxRjtRQUNyRixpQkFBaUIsQ0FBRSxJQUFJLENBQUUsR0FBRyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELFNBQVMsd0JBQXdCO1FBRWhDLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxLQUFLLENBQUUsQ0FBQztRQUN4RCxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsdUJBQXVCLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFM0QsVUFBVTtRQUNWLElBQUssUUFBUSxLQUFLLEVBQUUsRUFDcEI7WUFDQyxRQUFTLFFBQVEsRUFDakI7Z0JBQ0MsS0FBSyxTQUFTO29CQUNiLE9BQU8sMENBQTBDLENBQUM7Z0JBQ25ELEtBQUssYUFBYTtvQkFDakIsT0FBTyx1Q0FBdUMsQ0FBQztnQkFDaEQsS0FBSyxTQUFTO29CQUNiLE9BQU8sMENBQTBDLENBQUM7YUFDbkQ7U0FDRDtRQUNELFVBQVU7UUFFVixJQUFLLFlBQVksQ0FBQyw0QkFBNEIsRUFBRSxFQUNoRDtZQUNDLE9BQU8sMENBQTBDLENBQUM7U0FDbEQ7UUFFRCxRQUFTLElBQUksRUFDYjtZQUNDLEtBQUssY0FBYztnQkFDbEIsT0FBTywwQ0FBMEMsQ0FBQztZQUVuRCxLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyx1Q0FBdUMsQ0FBQztZQUVoRCxLQUFLLFVBQVU7Z0JBQ2QsT0FBTyxtQ0FBbUMsQ0FBQztZQUU1QyxLQUFLLFlBQVk7Z0JBQ2hCLE9BQU8scUNBQXFDLENBQUM7WUFFOUMsS0FBSyxhQUFhLENBQUM7WUFDbkIsS0FBSyxhQUFhO2dCQUNqQixPQUFPLHNDQUFzQyxDQUFDO1lBRS9DLEtBQUssUUFBUTtnQkFDWixJQUFLLFFBQVEsSUFBSSxpQkFBaUI7b0JBQ2pDLE9BQU8sMENBQTBDLENBQUM7O29CQUVsRCxPQUFPLHlDQUF5QyxDQUFDO1lBRW5EO2dCQUNDLE9BQU8seUNBQXlDLENBQUM7U0FDbEQ7SUFFRixDQUFDO0lBRUQsU0FBUyx1QkFBdUIsQ0FBRyxJQUFnQjtRQUVsRCx3QkFBd0I7UUFDeEIsS0FBSyxDQUFDLDZCQUE2QixDQUFFLGNBQWMsQ0FBRSxDQUFDLE9BQU8sQ0FBRSxVQUFXLEVBQUU7WUFFM0UsSUFBSyxFQUFFLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUN2QjtnQkFDQyxJQUFLLEVBQUUsQ0FBQyxTQUFTLENBQUUsZ0JBQWdCLEdBQUcsSUFBSSxDQUFFLEVBQzVDO29CQUNDLEVBQUUsQ0FBQyxRQUFRLENBQUUsVUFBVSxDQUFFLENBQUM7aUJBQzFCO3FCQUVEO29CQUNDLEVBQUUsQ0FBQyxXQUFXLENBQUUsVUFBVSxDQUFFLENBQUM7aUJBQzdCO2FBQ0Q7UUFFRixDQUFDLENBQUUsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLG1CQUFtQixDQUFHLElBQWdCLEVBQUUsR0FBVyxFQUFFLFFBQWdCO1FBRTdFLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBRSxrQ0FBa0MsQ0FBRSxDQUFDO1FBRXpELElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3hDLE9BQU87UUFFUixJQUFJLGVBQWUsR0FBRyxVQUFVLENBQUM7UUFFakMsZUFBZTtRQUNmLElBQUssR0FBRyxLQUFLLEVBQUUsRUFDZjtZQUVDLGNBQWM7WUFDZCxhQUFhO1lBQ2IsRUFBRTtZQUVGLG9CQUFvQjtZQUNwQixNQUFNO1lBQ04sb0NBQW9DO1lBQ3BDLG9DQUFvQztZQUNwQyxvQ0FBb0M7WUFDcEMsc0JBQXNCO1lBQ3RCLHFDQUFxQztZQUNyQyxxQ0FBcUM7WUFDckMscUNBQXFDO1lBQ3JDLGdDQUFnQztZQUNoQyx1Q0FBdUM7WUFDdkMsdUNBQXVDO1lBQ3ZDLHVDQUF1QztZQUN2QyxNQUFNO1lBRU4sOEJBQThCO1lBQzlCLElBQUksbUJBQW1CLEdBQUcsMEJBQTBCLENBQUM7WUFFckQsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUUsR0FBRyxHQUFHLG1CQUFtQixDQUFFLENBQUM7WUFDekQsSUFBSyxDQUFDLG1CQUFtQixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLEVBQzNEO2dCQUNDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO2dCQUNoRixtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBRSxnQ0FBZ0MsQ0FBRSxDQUFDO2dCQUUzRSwwQkFBMEI7Z0JBQzFCLElBQUssQ0FBQyxDQUFFLDJCQUEyQixDQUFFLEVBQ3JDO29CQUNDLENBQUMsQ0FBRSxvQkFBb0IsQ0FBRyxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztpQkFDbkQ7YUFDRDtZQUVELElBQUksV0FBVyxHQUFHLG1CQUFtQixDQUFDLGlCQUFpQixDQUFFLGlCQUFpQixDQUFFLENBQUM7WUFFN0Usb0JBQW9CO1lBQ3BCLElBQUksVUFBVSxHQUFHLG1CQUFtQixHQUFHLEdBQUcsQ0FBQztZQUMzQyxJQUFJLFVBQVUsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUUsVUFBVSxDQUFFLENBQUM7WUFDN0QsSUFBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFDekM7Z0JBQ0Msa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLHlDQUF5QztnQkFFL0QsMkJBQTJCO2dCQUMzQixVQUFVLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBRSxDQUFDO2dCQUMvRCxVQUFVLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxDQUFDO2dCQUNyQyxVQUFVLENBQUMsUUFBUSxDQUFFLFVBQVUsQ0FBRSxDQUFDO2FBRWxDO1lBRUQseUNBQXlDO1lBQ3pDLDJDQUEyQztZQUMzQywwQ0FBMEM7WUFFMUMsOERBQThEO1lBRTlELGVBQWUsR0FBRyxVQUFVLENBQUM7WUFFN0IsMENBQTBDO1lBQzFDLElBQUssR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUN4QztnQkFDQyxVQUFVLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO2FBQ2hDO1NBQ0Q7UUFFRCxnREFBZ0Q7UUFDaEQsSUFBSSxXQUFXLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixDQUFFLFFBQVEsR0FBRyxJQUFJLENBQUUsQ0FBQztRQUMzRSxJQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUMzQztZQUNDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsUUFBUSxHQUFHLElBQUksQ0FBRSxDQUFDO1lBQzFFLFdBQVcsQ0FBQyxRQUFRLENBQUUsY0FBYyxDQUFFLENBQUM7WUFDdkMsV0FBVyxDQUFDLFFBQVEsQ0FBRSxnQkFBZ0IsR0FBRyxJQUFJLENBQUUsQ0FBQztZQUNoRCxXQUFXLENBQUMsUUFBUSxDQUFFLHFCQUFxQixDQUFFLENBQUM7WUFFOUMsSUFBSSxXQUE4QixDQUFDO1lBRW5DLElBQUssSUFBSSxLQUFLLE1BQU0sRUFDcEI7Z0JBQ0MsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEdBQUcsV0FBVyxDQUFDLEVBQUUsQ0FBRSxDQUFDO2dCQUMvRSxXQUFXLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxDQUFFLENBQUM7YUFDOUQ7aUJBRUQ7Z0JBQ0MsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEdBQUcsV0FBVyxDQUFDLEVBQUUsQ0FBRSxDQUFDO2dCQUUvRSxJQUFLLFFBQVEsSUFBSSxHQUFHLEVBQ3BCO29CQUNDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO2lCQUN0QjtxQkFFRDtvQkFFQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsY0FBYyxHQUFHLElBQUksQ0FBRSxDQUFDO2lCQUN2RDthQUNEO1lBRUQscUJBQXFCO1lBRXJCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsY0FBYyxHQUFHLElBQUksR0FBRyxVQUFVLENBQUUsQ0FBQztZQUNyRSxJQUFLLGFBQWEsS0FBSyxFQUFFLEVBQ3pCO2dCQUNDLFdBQVcsQ0FBQyxhQUFhLENBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUUsQ0FBRSxDQUFDO2dCQUNoSCxXQUFXLENBQUMsYUFBYSxDQUFFLFlBQVksRUFBRSxjQUFjLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO2FBQzNGO1lBRUQsSUFBSSxlQUFlLEdBQUcsVUFBVyxJQUFnQjtnQkFFaEQsSUFBSSxZQUFZLEdBQWdCLEVBQUMsSUFBSSxFQUFHLENBQUMsRUFBQyxDQUFDO2dCQUUzQyw4Q0FBOEM7Z0JBQzlDLElBQUksb0JBQW9CLEdBQUcsb0JBQW9CLENBQUUsV0FBVyxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxDQUFFLENBQUM7Z0JBRWhHLDZDQUE2QztnQkFDN0MsaUNBQWlDO2dCQUNqQyxJQUFLLElBQUksSUFBSSxvQkFBb0I7b0JBQ2hDLFlBQVksQ0FBRSxJQUFJLENBQUUsR0FBRyxvQkFBb0IsQ0FBRSxJQUFJLENBQUUsQ0FBQzs7b0JBRXBELE9BQU87Z0JBRVIsdUJBQXVCLENBQUUsSUFBSSxDQUFFLENBQUM7Z0JBRWhDLGlDQUFpQztnQkFDakMsS0FBTSxJQUFJLENBQUMsSUFBSSxvQkFBb0IsRUFDbkM7b0JBQ0MsSUFBSyxDQUFDLElBQUksSUFBSTt3QkFDYixTQUFTO29CQUVWLGlFQUFpRTtvQkFDakUsSUFBSyxDQUFDLElBQUksSUFBSTt3QkFDYixTQUFTO29CQUVWLFlBQVksQ0FBRSxDQUFlLENBQUUsR0FBRyxvQkFBb0IsQ0FBRSxDQUFlLENBQUUsQ0FBQztpQkFDMUU7Z0JBRUQsd0NBQXdDO2dCQUN4QyxZQUFZLEdBQUcsWUFBWSxDQUFDO2dCQUU1QixnQ0FBZ0M7Z0JBQ2hDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO29CQUNDLFdBQVcsQ0FBRSxDQUFDLENBQUUsQ0FBQztpQkFDakI7WUFDRixDQUFDLENBQUM7WUFFRixXQUFXLENBQUMsYUFBYSxDQUFFLFlBQVksRUFBRSxlQUFlLENBQUMsSUFBSSxDQUFFLFNBQVMsRUFBRSxJQUFJLENBQUUsQ0FBRSxDQUFDO1NBRW5GO0lBQ0YsQ0FBQztJQUVELFVBQVU7SUFDVixTQUFTLHlCQUF5QjtRQUVqQyxJQUFJLFdBQVcsR0FBRyxvQkFBb0IsQ0FBRSxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLENBQUUsQ0FBQztRQUN2RixJQUFLLFlBQVksSUFBSSxXQUFXO1lBQy9CLFlBQVksR0FBRyxpQkFBaUIsQ0FBQzs7WUFFakMsWUFBWSxHQUFHLFdBQVcsQ0FBQztJQUM3QixDQUFDO0lBQ0QsVUFBVTtJQUVWLDhCQUE4QjtJQUM5QixTQUFTLHVCQUF1QixDQUFHLElBQWdCLEVBQUUsSUFBWTtRQUVoRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDekIsSUFBSyxJQUFJLEtBQUssTUFBTSxFQUNwQjtZQUNDLElBQUssV0FBVyxDQUFDLGVBQWUsQ0FBRSxJQUFJLENBQUUsSUFBSSxFQUFFLEVBQzlDO2dCQUNDLGFBQWEsR0FBRyx5QkFBeUIsQ0FBQzthQUMxQztpQkFDSSxJQUFLLFdBQVcsQ0FBQyxZQUFZLENBQUUsSUFBSSxDQUFFLEVBQzFDO2dCQUNDLGFBQWEsR0FBRywwQkFBMEIsQ0FBQzthQUMzQztpQkFDSSxJQUFLLGVBQWUsQ0FBRSxXQUFXLENBQUMsaUJBQWlCLENBQUUsSUFBSSxDQUFFLENBQUUsRUFDbEU7Z0JBQ0MsYUFBYSxHQUFHLDJCQUEyQixDQUFDO2FBQzVDO1NBQ0Q7UUFDRCxPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRUQsc0JBQXNCO0lBQ3RCLFNBQVMsZUFBZSxDQUFHLE9BQWlCO1FBRTNDLElBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7WUFDcEQsT0FBTztRQUVSLE9BQU8sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1FBRTVGLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyx5REFBeUQ7UUFFckcsbUJBQW1CLENBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSx3QkFBd0IsRUFBRSxDQUFFLENBQUM7UUFFdEUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ1osU0FBUyxhQUFhLENBQUcsVUFBbUIsRUFBRSxPQUFpQjtZQUU5RCxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDeEMsT0FBTztZQUVSLElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBRSxXQUFXLEVBQUUsRUFBRSxDQUFxQixDQUFDO1lBQy9FLElBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBRSxVQUFVLEVBQUUsRUFBRSxDQUFFLENBQUM7WUFDMUQsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLGtCQUFrQixDQUFFLGFBQWEsRUFBRSxFQUFFLENBQUUsQ0FBQztZQUVsRSx5REFBeUQ7WUFDekQsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUN6QztnQkFDQyxhQUFhLENBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxFQUFFLE9BQU8sQ0FBRSxDQUFDO2FBQ3hDO1lBRUQsSUFBSyxJQUFJLEtBQUssRUFBRSxFQUNoQjtnQkFDQyxPQUFPO2FBQ1A7WUFFRCxvQ0FBb0M7WUFDcEMsT0FBTyxDQUFDLFVBQVUsQ0FBRSxJQUFJLENBQUUsR0FBRyxVQUFVLENBQUM7WUFFeEMsVUFBVSxDQUFDLFFBQVEsQ0FBRSxjQUFjLENBQUUsQ0FBQztZQUN0QyxVQUFVLENBQUMsUUFBUSxDQUFFLGdCQUFnQixHQUFHLElBQUksQ0FBRSxDQUFDO1lBRS9DLGFBQWE7WUFDYixHQUFHO1lBQ0gsSUFBSyxHQUFHLEtBQUssRUFBRSxFQUNmO2dCQUNDLDhCQUE4QjtnQkFDOUIsSUFBSSxjQUFjLEdBQUcsMEJBQTBCLENBQUM7Z0JBRWhELElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxVQUFXLENBQUMsaUJBQWlCLENBQUUsY0FBYyxDQUFFLENBQUM7Z0JBQzdFLElBQUssQ0FBQyxjQUFjLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQ2pEO29CQUNDLGNBQWMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsVUFBVyxFQUFFLGNBQWMsQ0FBRSxDQUFDO29CQUMvRSxPQUFPLENBQUMsVUFBVyxDQUFDLGVBQWUsQ0FBRSxjQUFjLEVBQUUsVUFBVSxDQUFFLENBQUM7aUJBQ2xFO2dCQUVELG9CQUFvQjtnQkFDcEIsSUFBSSxLQUFLLEdBQUcsWUFBWSxHQUFHLEdBQUcsQ0FBQztnQkFDL0IsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixDQUFFLEtBQUssQ0FBRSxDQUFDO2dCQUN0RCxJQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFDN0I7b0JBQ0MsMkJBQTJCO29CQUMzQixLQUFLLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBRSxDQUFDO29CQUN4RCxLQUFLLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxDQUFDO29CQUNoQyxLQUFLLENBQUMsUUFBUSxDQUFFLFVBQVUsQ0FBRSxDQUFDO29CQUU3Qix5QkFBeUI7b0JBQ3pCLEdBQUcsR0FBRyxDQUFDLENBQUM7aUJBQ1I7Z0JBRUQsMkJBQTJCO2dCQUMzQixVQUFVLENBQUMsU0FBUyxDQUFFLEtBQUssQ0FBRSxDQUFDO2dCQUU5QiwwQ0FBMEM7Z0JBQzFDLElBQUssR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxFQUN4QztvQkFDQyxLQUFLLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO2lCQUMzQjthQUNEO1lBRUQsNkJBQTZCO1lBQzdCLElBQUssR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDYixVQUFVLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7WUFFN0MsSUFBSyxDQUFDLFFBQVEsRUFDZDtnQkFDQyxtQkFBbUIsQ0FBRSxJQUFJLENBQUUsQ0FBQzthQUM1QjtRQUVGLENBQUM7UUFFRCxnRUFBZ0U7UUFDaEUsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFDbEMsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFDbEMsbUJBQW1CLENBQUUsUUFBUSxDQUFFLENBQUM7UUFDaEMsbUJBQW1CLENBQUUsWUFBWSxDQUFFLENBQUM7UUFFcEMsbUJBQW1CLENBQUUsUUFBUSxDQUFFLENBQUM7UUFDaEMsbUJBQW1CLENBQUUsU0FBUyxDQUFFLENBQUM7UUFDakMsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFbEMscUJBQXFCO1FBQ3JCLHFDQUFxQztRQUNyQyxzQ0FBc0M7UUFDdEMsRUFBRTtRQUNGLElBQUksV0FBVyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEQsSUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztRQUVuQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUNuQztZQUNDLGFBQWEsQ0FBRSxXQUFXLENBQUUsQ0FBQyxDQUFFLEVBQUUsT0FBTyxDQUFFLENBQUM7U0FDM0M7UUFFRCxrQkFBa0I7UUFFbEIsT0FBTyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxzQkFBc0I7UUFFN0MsT0FBTyxDQUFDLFFBQVEsQ0FBRSxLQUFLLENBQUUsR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUV6RSxlQUFlO1FBRWYsT0FBTyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUUsYUFBYSxFQUFFO1lBRWhELGdDQUFnQyxFQUFFLENBQUM7UUFDcEMsQ0FBQyxDQUFFLENBQUM7UUFFSixPQUFPLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUU7WUFFL0MsZ0NBQWdDLEVBQUUsQ0FBQztRQUNwQyxDQUFDLENBQUUsQ0FBQztRQUVKLElBQUssV0FBVyxDQUFDLFdBQVcsQ0FBRSxPQUFPLENBQUMsTUFBTSxDQUFFLEVBQzlDO1lBQ0MsT0FBTyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUUsWUFBWSxFQUFFO2dCQUcvQyxnQ0FBZ0MsRUFBRSxDQUFDO2dCQUVuQyxJQUFJLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxpREFBaUQsQ0FDM0YsRUFBRSxFQUNGLEVBQUUsRUFDRixxRUFBcUUsRUFDckUsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQ3hCLG9CQUFvQixDQUFDLElBQUksQ0FBRSxTQUFTLENBQUUsQ0FDdEMsQ0FBQztnQkFFRix1QkFBdUIsQ0FBQyxRQUFRLENBQUUscUJBQXFCLENBQUUsQ0FBQztnQkFDMUQsSUFBSyxDQUFDLG1CQUFtQixFQUN6QjtvQkFDQyxtQkFBbUIsR0FBRyxZQUFZLENBQUMsdUJBQXVCLENBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLEVBQUUsY0FBYyxDQUFFLENBQUM7aUJBQzlIO1lBRUYsQ0FBQyxDQUFFLENBQUM7U0FDSjtRQUVELE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxvQkFBb0I7UUFFNUIsZ0NBQWdDLEVBQUUsQ0FBQztRQUNuQyxJQUFLLG1CQUFtQixFQUN4QjtZQUNDLFlBQVksQ0FBQywyQkFBMkIsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO1lBQ2hFLG1CQUFtQixHQUFHLElBQUksQ0FBQztTQUMzQjtJQUNGLENBQUM7SUFDRCxTQUFTLGdCQUFnQjtRQUV4QixJQUFLLENBQUMsUUFBUTtZQUNiLE9BQU87UUFFUiw0Q0FBNEM7UUFFNUMsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFFLENBQUM7UUFDNUYsS0FBSyxDQUFDLGlCQUFpQixDQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUUsQ0FBQztRQUNoRSxLQUFLLENBQUMsaUJBQWlCLENBQUUsZUFBZSxFQUFFLFdBQVcsQ0FBQyxlQUFlLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztRQUNoRixLQUFLLENBQUMsaUJBQWlCLENBQUUsa0JBQWtCLEVBQUUsV0FBVyxDQUFDLHVCQUF1QixFQUFFLENBQUUsQ0FBQztRQUVyRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsOEJBQThCLENBQWEsQ0FBQztRQUN4RixJQUFLLFVBQVUsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQ2hFO1lBQ0MsSUFBSyxhQUFhLENBQUMsaUJBQWlCLEVBQUUsRUFDdEM7Z0JBQ0MsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxFQUFFLEtBQUssQ0FBRSxDQUFDO2FBQzdFO2lCQUVEO2dCQUNDLElBQUksMEJBQTBCLEdBQUcsa0NBQWtDLENBQUM7Z0JBRXBFLElBQUksSUFBSSxHQUFHLFlBQVksQ0FBQyx1QkFBdUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFDeEQsSUFBSyxDQUFFLElBQUksS0FBSyxhQUFhLElBQUksSUFBSSxLQUFLLFNBQVMsQ0FBRTtvQkFDcEQsQ0FBRSxZQUFZLENBQUMsb0JBQW9CLENBQUUsS0FBSyxHQUFHLFlBQVksQ0FBQyxhQUFhLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBRSxLQUFLLFVBQVUsQ0FBRSxFQUMvRztvQkFDQywwQkFBMEIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGtDQUFrQyxFQUFFLEtBQUssQ0FBRSxHQUFHLGlCQUFpQixDQUFDO2lCQUN6RztxQkFDSSxJQUFLLFlBQVksQ0FBQyw0QkFBNEIsRUFBRSxFQUNyRDtvQkFDQyxJQUFJLFFBQVEsR0FBRyxjQUFjLENBQUM7b0JBQzlCLElBQUssWUFBWSxDQUFDLGFBQWEsRUFBRSxLQUFLLGVBQWU7d0JBQ3BELFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHdCQUF3QixFQUFFLEtBQUssQ0FBRSxDQUFDO29CQUMxRCwwQkFBMEIsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGdDQUFnQyxFQUFFLEtBQUssQ0FBRSxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUM7aUJBQ3RHO2dCQUVELFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSwwQkFBMEIsRUFBRSxLQUFLLENBQUUsQ0FBQzthQUNsRTtTQUNEO1FBRUQsSUFBSyxDQUFDLENBQUUsMEJBQTBCLENBQUUsRUFDcEM7WUFDQyxJQUFLLFlBQVksQ0FBQyw0QkFBNEIsRUFBRTtnQkFDN0MsQ0FBQyxDQUFFLDBCQUEwQixDQUFlLENBQUMsUUFBUSxDQUFFLGdEQUFnRCxDQUFFLENBQUM7O2dCQUUxRyxDQUFDLENBQUUsMEJBQTBCLENBQWUsQ0FBQyxRQUFRLENBQUUsV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUUsQ0FBQztTQUMvRjtRQUVELElBQUssQ0FBQyxDQUFFLHVCQUF1QixDQUFFO1lBQzlCLENBQUMsQ0FBRSx1QkFBdUIsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxxQ0FBcUMsR0FBRyxXQUFXLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxDQUFFLENBQUM7UUFFdEksSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFFLFlBQVksQ0FBRSxDQUFDO1FBQ3BDLElBQUssV0FBVyxFQUNoQjtZQUNDLElBQUksT0FBTyxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlDLElBQUssT0FBTyxHQUFHLENBQUMsRUFDaEI7Z0JBQ0MsV0FBVyxDQUFDLFFBQVEsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO2dCQUM1QyxXQUFXLENBQUMsNkJBQTZCLENBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBRSxDQUFDO2dCQUNsRSxJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMscUJBQXFCLENBQUUseUJBQXlCLENBQWEsQ0FBQztnQkFDeEYsSUFBSyxPQUFPLEVBQ1o7b0JBQ0MsSUFBSSwwQkFBMEIsR0FBRyxXQUFXLENBQUMsdUJBQXVCLENBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFFLENBQUM7b0JBQ25HLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSwwQkFBMEIsRUFBRSxXQUFXLENBQUUsQ0FBQztpQkFDckU7YUFDRDtTQUNEO1FBRUQsSUFBSyxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsRUFDaEM7WUFDQyxNQUFNLGFBQWEsR0FBRyxXQUFXLENBQUMsaUJBQWlCLENBQUUsZ0JBQWdCLEVBQUUsQ0FBRSxDQUFDO1lBQzFFLElBQUssU0FBUyxDQUFFLGFBQWEsQ0FBRTtnQkFDOUIsU0FBUyxDQUFFLGFBQWEsQ0FBRyxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDcEQ7UUFFRCxvQkFBb0I7UUFDcEIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDBCQUEwQixDQUFhLENBQUM7UUFDNUYsSUFBSyxjQUFjLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUMvQztZQUNDLElBQUksSUFBSSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLG9DQUFvQyxDQUFFLENBQUM7WUFDckYsSUFBSyxJQUFJLENBQUMsTUFBTSxDQUFFLENBQUMsQ0FBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFFLENBQUMsQ0FBRSxJQUFJLEdBQUc7Z0JBQ3RELElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFFLENBQUMsQ0FBRSxDQUFDO1lBQzVCLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBRSw4QkFBOEIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLFdBQVcsSUFBSSxHQUFHLEVBQUUsY0FBYyxDQUFFLENBQUUsQ0FBQztZQUNySCxjQUFjLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsc0NBQXNDLEVBQUUsY0FBYyxDQUFFLENBQUM7U0FDM0Y7UUFFRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsNkJBQTZCLENBQUUsQ0FBQztRQUNyRixJQUFLLGVBQWUsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQ2pEO1lBQ0MsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixDQUFFLEtBQUssQ0FBRSxDQUFDO1lBQ2pFLElBQUssYUFBYSxFQUNsQjtnQkFDQyxlQUFlLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxLQUFLLENBQUUsQ0FBQztnQkFDL0MsZUFBZSxDQUFDLGFBQWEsQ0FBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBRSw2QkFBNkIsRUFBRSxhQUFhLENBQUUsQ0FBRSxDQUFDO2dCQUNuSSxlQUFlLENBQUMsYUFBYSxDQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUUsQ0FBQzthQUNwRjtpQkFFRDtnQkFDQyxlQUFlLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxJQUFJLENBQUUsQ0FBQzthQUM5QztTQUNEO0lBQ0YsQ0FBQztJQUVELFNBQVMsdUJBQXVCLENBQUcsUUFBZ0I7UUFFbEQsS0FBSyxDQUFDLG9CQUFvQixDQUFFLFNBQVMsRUFBRSxRQUFRLENBQUUsQ0FBQztRQUNsRCxjQUFjLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUM5QixLQUFLLENBQUMsaUJBQWlCLENBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFFLENBQUM7SUFDN0csQ0FBQztJQUVELFNBQVMsWUFBWSxDQUFHLEdBQVcsRUFBRSxVQUFxQixFQUFFLE9BQWlCO1FBRTVFLElBQUssQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUU7WUFDakMsT0FBTztRQUVSLElBQUssQ0FBQyxVQUFVO1lBQ2YsT0FBTztRQUVSLElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLElBQUssQ0FBQyxDQUFFLFVBQVUsSUFBSSxVQUFVLENBQUU7WUFDakMsT0FBTztRQUVSLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBQzNFLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3hDLE9BQU87UUFFUixJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7UUFDM0QsSUFBSyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDOUIsT0FBTztRQUVSLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO1FBQ2hGLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxxQ0FBcUMsQ0FBRSxDQUFDO1FBRTlFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsRUFBRSxDQUFFLENBQUM7UUFDbkUsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUVyRSxRQUFRLENBQUMsaUJBQWlCLENBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQzlDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxXQUFXLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFFOUMscUNBQXFDO1FBRXJDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxzQ0FBc0MsQ0FBRSxDQUFDO1FBQy9FLElBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFDL0I7WUFDQyxNQUFNLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksT0FBTyxDQUFFLGVBQWUsQ0FBRSxHQUFHLENBQUMsQ0FBRSxDQUFDO1NBQ3RFO1FBRUQsK0VBQStFO1FBQy9FLElBQUssR0FBRyxHQUFHLE9BQU8sQ0FBRSxlQUFlLENBQUUsRUFDckM7WUFDQyxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUUsWUFBWSxDQUFFLENBQUM7WUFDekMsSUFBSyxVQUFVLEVBQ2Y7Z0JBQ0MsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFFLG9CQUFvQixDQUFFLENBQUM7Z0JBRWxELElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBRSxlQUFlLENBQUUsR0FBRyxXQUFXLEdBQUcsVUFBVSxDQUFDO2dCQUMzRSxJQUFJLHFCQUFxQixHQUFHLEdBQUcsSUFBSSxjQUFjLENBQUM7Z0JBRWxELElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBRSxlQUFlLENBQUUsR0FBRyxXQUFXLEdBQUcsVUFBVSxDQUFDO2dCQUMzRSxJQUFJLHFCQUFxQixHQUFHLEdBQUcsSUFBSSxjQUFjLENBQUM7Z0JBRWxELElBQUksY0FBYyxHQUFHLENBQUUscUJBQXFCLElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBRSxDQUFDO2dCQUNuRixJQUFJLGNBQWMsR0FBRyxDQUFFLHFCQUFxQixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUUsQ0FBQztnQkFFbkYsSUFBSSwwQkFBMEIsR0FBRyxLQUFLLENBQUM7Z0JBRXZDLElBQUssY0FBYyxFQUNuQjtvQkFDRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFlLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLEtBQUssQ0FBRSxDQUFFLENBQUM7b0JBQ2hHLDBCQUEwQixHQUFHLElBQUksQ0FBQztpQkFDbEM7Z0JBRUQsSUFBSyxjQUFjLEVBQ25CO29CQUNHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsS0FBSyxDQUFFLENBQUUsQ0FBQztvQkFDaEcsMEJBQTBCLEdBQUcsSUFBSSxDQUFDO2lCQUNsQztnQkFFRCxJQUFJLGlCQUFpQixHQUFHLENBQUUsR0FBRyxHQUFHLGNBQWMsSUFBSSxHQUFHLEdBQUcsY0FBYyxDQUFFLENBQUM7Z0JBRXpFLEtBQUssQ0FBQyxXQUFXLENBQUUsYUFBYSxFQUFFLGlCQUFpQixDQUFFLENBQUM7Z0JBQ3RELEtBQUssQ0FBQyxXQUFXLENBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFFLENBQUM7YUFFaEU7WUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQyxXQUFXLENBQUUsYUFBYSxDQUFFLENBQUM7WUFDL0YsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZDQUE2QyxDQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsQ0FBRSxDQUFDO1lBQ3RHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxzQ0FBc0MsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1lBQ3RHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2Q0FBNkMsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO1lBRTdHLElBQUksZ0JBQWdCLEdBQUcsVUFBVyxLQUFjO2dCQUcvQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUM1QjtvQkFDQyxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsV0FBVyxHQUFHLENBQUMsQ0FBRSxDQUFDO29CQUNyRCxJQUFLLENBQUMsR0FBRzt3QkFDUixNQUFNO29CQUVQLEdBQUcsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7aUJBQ3pCO1lBRUYsQ0FBQyxDQUFDO1lBRUYsZ0JBQWdCLENBQUUsUUFBUSxDQUFFLENBQUM7WUFDN0IsZ0JBQWdCLENBQUUsUUFBUSxDQUFFLENBQUM7WUFHN0IsT0FBTztTQUNQO1FBRUQsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBRTFCLElBQUssV0FBVyxDQUFDLDRCQUE0QixFQUFFLEtBQUssV0FBVyxDQUFDLG1DQUFtQyxDQUFFLEdBQUcsQ0FBRSxFQUMxRztZQUNDLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDckIsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQ3RCLFFBQVEsR0FBRyxRQUFRLENBQUM7WUFDcEIsUUFBUSxHQUFHLE1BQU0sQ0FBQztTQUNsQjtRQUVELHNCQUFzQjtRQUN0QixRQUFRLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxDQUFDO1FBQ25DLFFBQVEsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztRQUUxQyxJQUFJLEdBQVcsQ0FBQztRQUVoQixJQUFLLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxFQUM3QztZQUNDLEdBQUcsR0FBRyxHQUFHLEdBQUcsT0FBTyxDQUFFLHlCQUF5QixDQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3JEO2FBRUQ7WUFDQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1NBQ1Y7UUFFRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBQzlDLElBQUssT0FBTyxTQUFTLEtBQUssUUFBUTtZQUNqQyxPQUFPO1FBRVIsSUFBSSxNQUFNLEdBQUcsU0FBUyxDQUFFLFFBQVEsQ0FBRSxDQUFDLE9BQU8sQ0FBRSxXQUFXLEVBQUUsRUFBRSxDQUF1QyxDQUFDO1FBRW5HLGdCQUFnQjtRQUNoQixJQUFLLFNBQVMsQ0FBRSxRQUFRLENBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBQyxDQUFFLEtBQUssR0FBRyxFQUM5QztZQUNDLGFBQWEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBRTFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQWUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsTUFBTSxDQUFFLENBQUUsQ0FBQztZQUNqRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFFLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxDQUFFLENBQUM7WUFFdkYsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxFQUFFLENBQUUsQ0FBQztZQUNyRSxRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFFLENBQUMsV0FBVyxDQUFFLHFDQUFxQyxDQUFFLENBQUM7WUFFNUYsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHNDQUFzQyxDQUFFLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxDQUFDO1lBQzVGLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSw2Q0FBNkMsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxhQUFhLENBQUUsQ0FBQztZQUNuRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQyxXQUFXLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUN0RyxLQUFLLENBQUMsaUJBQWlCLENBQUUsNkNBQTZDLENBQUUsQ0FBQyxXQUFXLENBQUUsb0JBQW9CLENBQUUsQ0FBQztTQUU3RzthQUNJLElBQUssU0FBUyxDQUFFLFFBQVEsQ0FBRSxDQUFDLE1BQU0sQ0FBRSxDQUFDLENBQUUsS0FBSyxHQUFHLEVBQ25EO1lBQ0MsYUFBYSxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7WUFFMUMsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsQ0FBZSxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsQ0FBRSxNQUFNLENBQUUsQ0FBRSxDQUFDO1lBQ2pHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQUUsQ0FBQyxRQUFRLENBQUUscUNBQXFDLENBQUUsQ0FBQztZQUV2RixRQUFRLENBQUMsaUJBQWlCLENBQUUsUUFBUSxDQUFlLENBQUMsUUFBUSxDQUFFLEVBQUUsQ0FBRSxDQUFDO1lBQ3JFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLENBQUUsQ0FBQyxXQUFXLENBQUUscUNBQXFDLENBQUUsQ0FBQztZQUU1RixLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUNuRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsNkNBQTZDLENBQUUsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQztZQUMxRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsc0NBQXNDLENBQUUsQ0FBQyxXQUFXLENBQUUsYUFBYSxDQUFFLENBQUM7WUFDL0YsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZDQUE2QyxDQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsQ0FBRSxDQUFDO1NBQ3RHO1FBRUQsNkNBQTZDO1FBQzdDLElBQUksaUJBQWlCLEdBQUcsVUFBVyxRQUE0QixFQUFFLEtBQWM7WUFHOUUsSUFBSyxTQUFTLENBQUUsUUFBUSxDQUFFLEVBQzFCO2dCQUNDLElBQUksV0FBVyxHQUFHLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDO2dCQUVyRyxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBRWpCLElBQUssV0FBVyxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxJQUFJLGNBQWM7b0JBQ2xFLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBRWQsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFDbkM7b0JBQ0MsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLFdBQVcsR0FBRyxDQUFDLENBQUUsQ0FBQztvQkFDckQsSUFBSyxDQUFDLEdBQUc7d0JBQ1IsTUFBTTtvQkFFUCxHQUFHLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO29CQUU1QixJQUFLLENBQUMsR0FBRyxXQUFXLEVBQ3BCO3dCQUNDLEdBQUcsQ0FBQyxRQUFRLENBQUUsZUFBZSxDQUFFLENBQUM7cUJBQ2hDO3lCQUVEO3dCQUNDLEdBQUcsQ0FBQyxXQUFXLENBQUUsZUFBZSxDQUFFLENBQUM7cUJBQ25DO2lCQUNEO2FBQ0Q7UUFDRixDQUFDLENBQUM7UUFFRixhQUFhO1FBRWIsaUJBQWlCLENBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQ3BDLGlCQUFpQixDQUFFLFdBQVcsRUFBRSxRQUFRLENBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUcsT0FBZ0IsS0FBSztRQUc5QyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUMzRSxJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUN4QyxPQUFPO1FBRVIsSUFBSSw2QkFBNkIsR0FBYyxFQUFFLENBQUM7UUFFbEQsU0FBUyxpQ0FBaUMsQ0FBRyxFQUFXO1lBRXZELElBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO2dCQUN4QixPQUFPO1lBRVIsSUFBSyxFQUFFLENBQUMsUUFBUSxFQUFFO2dCQUNqQixFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFFLGlDQUFpQyxDQUFFLENBQUM7WUFFNUQsSUFBSyxFQUFFLENBQUMsa0JBQWtCLENBQUUsOENBQThDLEVBQUUsT0FBTyxDQUFFLElBQUksTUFBTTtnQkFDOUYsNkJBQTZCLENBQUMsSUFBSSxDQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQzNDLENBQUM7UUFFRCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFFLGlDQUFpQyxDQUFFLENBQUM7UUFFbkUsNkJBQTZCLENBQUMsT0FBTyxDQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztJQUN0RixDQUFDO0lBRUQsU0FBUyx1QkFBdUI7UUFFL0Isb0NBQW9DO1FBQ3BDLElBQUssZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsbUNBQW1DLENBQUUsSUFBSSxHQUFHO1lBQ25GLGNBQWMsRUFBRSxDQUFDO1FBRWxCLFlBQVksQ0FBQyw2QkFBNkIsQ0FBRSxHQUFHLEVBQUUsMEJBQTBCLEVBQUUsc0VBQXNFLEVBQUUsaUJBQWlCLENBQUUsQ0FBQztJQUMxSyxDQUFDO0lBRUQsU0FBUyxzQkFBc0I7UUFFOUIsb0NBQW9DO1FBQ3BDLElBQUssZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsbUNBQW1DLENBQUUsSUFBSSxHQUFHO1lBQ25GLGNBQWMsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUV4QixZQUFZLENBQUMsdUJBQXVCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztJQUNwRSxDQUFDO0lBRUQsU0FBUywyQkFBMkIsQ0FBRyxRQUFnQjtRQUV0RCxJQUFJLFdBQVcsR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUUsUUFBUSxDQUFFLENBQUM7UUFDcEUsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHlCQUF5QixDQUFFLENBQUUsQ0FBQztRQUMxRixJQUFLLFdBQVcsR0FBRyxRQUFRLEVBQUc7WUFBRSxXQUFXLEdBQUcsUUFBUSxDQUFDO1NBQUU7UUFDekQsSUFBSyxXQUFXLEdBQUcsQ0FBQyxFQUFHO1lBQUUsV0FBVyxHQUFHLENBQUMsQ0FBQztTQUFFO1FBQzNDLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFFLENBQUM7UUFDM0YsSUFBSSxpQkFBaUIsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMENBQTBDLENBQUUsQ0FBRSxDQUFDO1FBQ3BILElBQUksWUFBWSxHQUFHLFdBQVcsR0FBRyxDQUFFLFdBQVcsR0FBRyxpQkFBaUIsQ0FBRSxDQUFDO1FBQ3JFLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxTQUFTLG1DQUFtQztRQUUzQyxLQUFLLENBQUMsaUJBQWlCLENBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFFLENBQUM7UUFDekYsS0FBSyxDQUFDLG9CQUFvQixDQUFFLDBCQUEwQixFQUFFLDJCQUEyQixDQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7UUFDOUYsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsRUFBRSxLQUFLLENBQUUsQ0FBQztRQUM3RSxZQUFZLENBQUMsZUFBZSxDQUFFLHdDQUF3QyxFQUFFLFlBQVksQ0FBRSxDQUFDO0lBQ3hGLENBQUM7SUFFRCxTQUFTLGtDQUFrQztRQUUxQyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELFNBQVMsMENBQTBDO1FBRWxELEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxDQUFFLENBQUM7UUFDakYsS0FBSyxDQUFDLG9CQUFvQixDQUFFLDBCQUEwQixFQUFFLDJCQUEyQixDQUFFLFdBQVcsQ0FBRSxDQUFFLENBQUM7UUFDckcsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsRUFBRSxLQUFLLENBQUUsQ0FBQztRQUM3RSxZQUFZLENBQUMsZUFBZSxDQUFFLHdDQUF3QyxFQUFFLFlBQVksQ0FBRSxDQUFDO0lBQ3hGLENBQUM7SUFFRCxTQUFTLHlDQUF5QztRQUVqRCxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFHLFFBQWdCO1FBRTFDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUNqQyxJQUFLLENBQUMsSUFBSSxFQUNWO1lBQ0MsSUFBSSxHQUFHLFNBQVMsQ0FBRSxRQUFRLENBQUUsR0FBRyxJQUFJLE1BQU0sQ0FBRSxRQUFRLENBQUUsQ0FBQztTQUN0RDtRQUVELFlBQVk7UUFDWixLQUFLLENBQUMsaUJBQWlCLENBQUUsZ0JBQWdCLEdBQUcsUUFBUSxFQUFFLFdBQVcsQ0FBQyxlQUFlLENBQUUsUUFBUSxDQUFFLENBQUUsQ0FBQztRQUVoRyxZQUFZO1FBQ1osTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUUsUUFBUSxDQUFFLENBQUM7UUFDdkUsSUFBSyxpQkFBaUIsSUFBSSxFQUFFLEVBQzVCO1lBQ0MsS0FBTSxNQUFNLG9CQUFvQixJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBRSwyQkFBMkIsR0FBRyxRQUFRLENBQUUsRUFDakg7Z0JBQ0Msb0JBQW9CLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyx1QkFBdUIsaUJBQWlCLElBQUksQ0FBQztnQkFDMUYsb0JBQW9CLENBQUMsUUFBUSxDQUFFLGlCQUFpQixDQUFFLENBQUM7YUFDbkQ7U0FDRDtRQUVELG9CQUFvQjtRQUNwQixLQUFLLENBQUMsb0JBQW9CLENBQUUsUUFBUSxHQUFHLFFBQVEsRUFBRSxXQUFXLENBQUMsd0JBQXdCLENBQUUsUUFBUSxDQUFFLENBQUUsQ0FBQztRQUNwRyxLQUFLLENBQUMsb0JBQW9CLENBQUUsUUFBUSxHQUFHLFFBQVEsRUFBRSxXQUFXLENBQUMsdUJBQXVCLENBQUUsUUFBUSxDQUFFLENBQUUsQ0FBQztJQUNwRyxDQUFDO0lBRUQsU0FBUyxZQUFZO1FBRXBCLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUUvQyx3QkFBd0I7UUFDeEIsS0FBTSxJQUFJLElBQUksSUFBSSxTQUFTLEVBQzNCO1lBQ0MsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDO1lBQ3hCLFFBQVE7WUFFUixJQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBRSxVQUFVLElBQUksVUFBVSxDQUFFLElBQUksQ0FBQyxDQUFFLElBQUksSUFBSSxVQUFVLENBQUUsVUFBVSxDQUFFLENBQUU7Z0JBQ3pGLFNBQVM7WUFHVixnRkFBZ0Y7WUFDaEYsdUNBQXVDO1lBRXZDLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUUsSUFBSSxDQUFHLENBQUM7WUFDOUMsS0FBSyxDQUFDLG9CQUFvQixDQUFFLGlCQUFpQixHQUFHLElBQUksRUFBRSxRQUFRLENBQUUsT0FBTyxDQUFFLENBQUUsQ0FBQztZQUU1RSxJQUFLLFVBQVUsSUFBSSxRQUFRLEVBQzNCO2dCQUNDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxtQkFBbUIsR0FBRyxJQUFJLEVBQUUsUUFBUSxDQUFFLFVBQVUsQ0FBRyxDQUFFLENBQUM7YUFDbEY7WUFFRCxJQUFLLFVBQVUsSUFBSSxRQUFRLEVBQzNCO2dCQUNDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxtQkFBbUIsR0FBRyxJQUFJLEVBQUUsUUFBUSxDQUFFLFVBQVUsQ0FBRyxDQUFFLENBQUM7YUFDbEY7WUFFRCxJQUFLLFVBQVUsSUFBSSxRQUFRLEVBQzNCO2dCQUNDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBRSxvQkFBb0IsR0FBRyxJQUFJLEVBQUUsUUFBUSxDQUFFLFVBQVUsQ0FBRyxDQUFFLENBQUM7YUFDbkY7WUFFRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztZQUN0RSxJQUFLLFNBQVMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQ3JDO2dCQUNDLFNBQVMsQ0FBQyxXQUFXLENBQUUsUUFBUSxFQUFFLENBQUMsQ0FBRSxVQUFVLElBQUksUUFBUSxDQUFFLENBQUUsQ0FBQztnQkFDL0QsU0FBUyxDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsQ0FBQyxDQUFFLFVBQVUsSUFBSSxRQUFRLENBQUUsQ0FBRSxDQUFDO2FBQzdEO1NBRUQ7SUFDRixDQUFDO0lBRUQsU0FBUyxpQkFBaUI7UUFFekIsZUFBZSxDQUFFLFdBQVcsQ0FBRSxDQUFDO1FBQy9CLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO0lBQ25CLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztJQUVuQixTQUFTLGdCQUFnQjtRQUV4QixJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRS9DLElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLElBQUssQ0FBQyxVQUFVO1lBQ2YsT0FBTztRQUVSLElBQUssQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUU7WUFDakMsT0FBTztRQUVSLElBQUksU0FBUyxDQUFDO1FBRWQsSUFBSyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsRUFDN0M7WUFDQyxTQUFTLEdBQUcsT0FBTyxDQUFFLHdCQUF3QixDQUFFLENBQUM7U0FDaEQ7YUFFRDtZQUNDLFNBQVMsR0FBRyxPQUFPLENBQUUsV0FBVyxDQUFFLENBQUM7U0FDbkM7UUFFRCxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsVUFBVSxHQUFHLENBQUMsQ0FBQztRQUVmLGdJQUFnSTtRQUNoSSxJQUFLLE9BQU8sQ0FBRSxVQUFVLENBQUUsR0FBRyxDQUFDLEVBQzlCO1lBQ0MsVUFBVSxHQUFHLENBQUUsT0FBTyxDQUFFLFdBQVcsQ0FBRSxHQUFHLENBQUUsT0FBTyxDQUFFLFVBQVUsQ0FBRSxHQUFHLENBQUMsQ0FBRSxHQUFHLE9BQU8sQ0FBRSxvQkFBb0IsQ0FBRSxDQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlHLFVBQVUsR0FBRyxDQUFFLE9BQU8sQ0FBRSxXQUFXLENBQUUsR0FBRyxDQUFFLE9BQU8sQ0FBRSxVQUFVLENBQUUsR0FBRyxDQUFDLENBQUUsR0FBRyxPQUFPLENBQUUsb0JBQW9CLENBQUUsQ0FBRSxHQUFHLENBQUMsQ0FBQztTQUM5RztRQUVELEtBQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxTQUFTLEVBQUUsR0FBRyxFQUFFLEVBQzFDO1lBQ0MsWUFBWSxDQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFFLENBQUM7U0FDekM7SUFDRixDQUFDO0lBRUQsU0FBUyxvQkFBb0I7UUFFNUIsb0ZBQW9GO1FBQ3BGLElBQUssTUFBTSxDQUFDLElBQUksQ0FBRSxTQUFTLENBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUMxQztZQUNDLGlCQUFpQixFQUFFLENBQUM7U0FDcEI7UUFFRCxZQUFZLEVBQUUsQ0FBQztRQUVmLGFBQWE7UUFDYixJQUFJLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7UUFFM0MsSUFBSyxDQUFDLE9BQU87WUFDWixPQUFPO1FBRVIsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFFLGVBQWUsQ0FBRSxHQUFHLENBQUMsQ0FBQztRQUVsRCxLQUFLLENBQUMsaUJBQWlCLENBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUUsYUFBYSxHQUFHLE9BQU8sQ0FBRSxXQUFXLENBQUUsQ0FBRSxDQUFFLENBQUM7UUFDL0YsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGtCQUFrQixFQUFFLE9BQU8sQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7UUFDeEYsS0FBSyxDQUFDLG9CQUFvQixDQUFFLGVBQWUsRUFBRSxPQUFPLENBQUUsVUFBVSxDQUFFLENBQUUsQ0FBQztRQUVyRSxLQUFLLENBQUMsV0FBVyxDQUFFLHFCQUFxQixFQUFFLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFFLENBQUM7UUFFOUUsK0ZBQStGO1FBRS9GLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQztRQUUzQixJQUFLLFlBQVksSUFBSSxPQUFPLENBQUUsdUJBQXVCLENBQUUsRUFDdkQ7WUFDQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLFlBQVksR0FBRyxPQUFPLENBQUUsdUJBQXVCLENBQUUsQ0FBQztTQUNsRDtRQUVELElBQUssa0JBQWtCLEtBQUssV0FBVyxDQUFDLDRCQUE0QixFQUFFLEVBQ3RFO1lBQ0MsY0FBYyxHQUFHLElBQUksQ0FBQztZQUN0QixrQkFBa0IsR0FBRyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoRTtRQUVELElBQUssQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUUsRUFDbEM7WUFDQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1NBQ3RCO1FBRUQsSUFBSyxXQUFXLElBQUksT0FBTyxDQUFFLFVBQVUsQ0FBRSxFQUN6QztZQUNDLFdBQVcsR0FBRyxPQUFPLENBQUUsVUFBVSxDQUFFLENBQUM7WUFDcEMsY0FBYyxHQUFHLElBQUksQ0FBQztTQUN0QjtRQUVELCtCQUErQjtRQUMvQixJQUFLLGNBQWMsSUFBSSxDQUFDLENBQUUsWUFBWSxJQUFJLGVBQWUsQ0FBRSxFQUMzRDtZQUVDLElBQUssY0FBYyxFQUNuQjtnQkFDQyxjQUFjLEVBQUUsQ0FBQzthQUNqQjtZQUVELGdCQUFnQixFQUFFLENBQUM7WUFFbkIsZUFBZSxDQUFFLFlBQVksQ0FBRSxHQUFHLElBQUksQ0FBQztTQUV2QzthQUVEO1lBQ0MsNENBQTRDO1lBRTVDLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUUvQyxJQUFLLFVBQVUsRUFDZjtnQkFDQyxZQUFZLENBQUUsWUFBWSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFFLENBQUM7YUFDdEQ7U0FDRDtRQUVELHFCQUFxQixFQUFFLENBQUM7SUFFekIsQ0FBQztJQUVELFNBQVMsc0JBQXNCO1FBRTlCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBRTNFLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3hDLE9BQU87UUFFUixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUseUJBQXlCLENBQUUsQ0FBQztRQUNoRixTQUFTLENBQUMsUUFBUSxDQUFFLHNCQUFzQixDQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsVUFBa0IsRUFBRSxRQUFnQixFQUFFLEtBQWE7UUFFbEYsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLDBCQUEwQixDQUFFLENBQUM7UUFFM0UsSUFBSyxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFDeEMsT0FBTztRQUVSLFVBQVUsQ0FBQyxRQUFRLENBQUUsY0FBYyxDQUFFLENBQUMsQ0FBQyxzRUFBc0U7UUFFN0csSUFBSSxFQUFFLEdBQUcsMkJBQTJCLEdBQUcsS0FBSyxDQUFDO1FBRTdDLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUVuRCxJQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUN2QztZQUNDLFNBQVMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxDQUFFLENBQUM7WUFDckQsU0FBUyxDQUFDLGtCQUFrQixDQUFFLCtDQUErQyxDQUFFLENBQUM7U0FDaEY7UUFFRCxJQUFJLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBRSxpQ0FBaUMsQ0FBRSxDQUFDO1FBQ3hGLElBQUssZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQ25EO1lBQ0Msb0JBQW9CO1lBQ3BCLEtBQU0sSUFBSSxHQUFHLEdBQUcsVUFBVSxFQUFFLEdBQUcsSUFBSSxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQ2xEO2dCQUNDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBRSxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztnQkFDMUQsSUFBSyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFDL0I7b0JBQ0MsS0FBSyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO29CQUVuRSxLQUFLLENBQUMsa0JBQWtCLENBQUUsc0RBQXNELENBQUUsQ0FBQztvQkFFbkYsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLHFDQUFxQyxDQUFFLENBQUM7b0JBQzdFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBRSw0REFBNEQsQ0FBRSxDQUFDO29CQUV6RixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUscUNBQXFDLENBQUUsQ0FBQztvQkFDN0UsS0FBSyxDQUFDLGtCQUFrQixDQUFFLDREQUE0RCxDQUFFLENBQUM7b0JBRXpGLGlDQUFpQztvQkFDakMsSUFBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFDakI7d0JBQ0csS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZDQUE2QyxDQUFlLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztxQkFDOUc7aUJBQ0Q7YUFDRDtTQUNEO1FBRUQsa0NBQWtDO1FBQ2xDLElBQUssV0FBVyxDQUFDLDRCQUE0QixFQUFFLEtBQUssV0FBVyxDQUFDLG1DQUFtQyxDQUFFLFFBQVEsQ0FBRSxFQUMvRztZQUNDLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBRSxvQ0FBb0MsQ0FBRSxDQUFDO1lBQ3BGLElBQUksUUFBUSxHQUFHLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBRSxtQ0FBbUMsQ0FBRSxDQUFDO1lBRWxGLElBQUssU0FBUyxJQUFJLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFDckM7Z0JBQ0MsU0FBUyxDQUFDLFdBQVcsQ0FBRSxjQUFjLENBQUUsQ0FBQztnQkFDeEMsU0FBUyxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO2FBQzVDO1lBRUQsSUFBSyxRQUFRLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUNuQztnQkFDQyxRQUFRLENBQUMsV0FBVyxDQUFFLHFCQUFxQixDQUFFLENBQUM7Z0JBQzlDLFFBQVEsQ0FBQyxRQUFRLENBQUUsY0FBYyxDQUFFLENBQUM7YUFDcEM7U0FDRDtJQUNGLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFHLE9BQWtCO1FBRTlDLElBQUssT0FBTyxJQUFJLFNBQVM7WUFDeEIsT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUV4QyxJQUFJLG9CQUFvQixDQUFDO1FBRXpCLElBQUssYUFBYSxDQUFDLHdCQUF3QixFQUFFLEVBQzdDO1lBQ0Msb0JBQW9CLEdBQUcsT0FBTyxDQUFFLHVCQUF1QixDQUFFLENBQUM7U0FDMUQ7YUFFRDtZQUNDLG9CQUFvQixHQUFHLE9BQU8sQ0FBRSxXQUFXLENBQUUsQ0FBQztTQUU5QztRQUVELE9BQU8sQ0FBRSxvQkFBb0IsSUFBSSxFQUFFLENBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQsU0FBUyxxQkFBcUI7UUFFN0IsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsd0NBQXdDLENBQUUsQ0FBQztRQUNwRyxJQUFLLHFCQUFxQixJQUFJLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxFQUM3RDtZQUNDLHFCQUFxQixDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQztZQUUzQyxJQUNDLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx5QkFBeUIsQ0FBRSxDQUFFLEdBQUcsQ0FBQztnQkFDOUUsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLDBDQUEwQyxDQUFFLENBQUUsR0FBRyxDQUFDLEVBRWhHO2dCQUNDLElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBRSxXQUFXLENBQUUsQ0FBQztnQkFDbEUsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLHlCQUF5QixDQUFFLElBQUksQ0FBRSxDQUFDO2dCQUM1RCxJQUFLLE1BQU0sSUFBSSxDQUFDLElBQUksT0FBTyxJQUFJLENBQUMsRUFDaEM7b0JBQ0MscUJBQXFCLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO29CQUU5QyxLQUFNLElBQUksU0FBUyxHQUFHLENBQUMsRUFBRSxTQUFTLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUNwRDt3QkFDQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUUsZ0RBQWdELEdBQUcsU0FBUyxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUUsQ0FBQztxQkFDdkg7b0JBRUQsS0FBTSxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQUUsU0FBUyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFDcEQ7d0JBQ0MscUJBQXFCLENBQUMsV0FBVyxDQUFFLHlDQUF5QyxHQUFHLFNBQVMsRUFBRSxPQUFPLElBQUksU0FBUyxDQUFFLENBQUM7cUJBQ2pIO2lCQUNEO2FBQ0Q7U0FDRDtJQUNGLENBQUM7SUFFRCxTQUFTLGNBQWM7UUFFdEIsc0NBQXNDO1FBRXRDLHFEQUFxRDtRQUNyRCxxQkFBcUIsRUFBRSxDQUFDO1FBRXhCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBRTNFLElBQUssQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3hDLE9BQU87UUFFUixxQkFBcUI7UUFDckIsVUFBVSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFFckMsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzNDLElBQUssQ0FBQyxPQUFPO1lBQ1osT0FBTztRQUVSLElBQUssQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLENBQUU7WUFDakMsT0FBTztRQUdSLDJDQUEyQztRQUUzQyxJQUFJLFVBQVUsQ0FBQztRQUNmLElBQUksU0FBUyxDQUFDO1FBQ2QsSUFBSSxRQUFRLENBQUM7UUFFYixJQUFLLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxFQUM3QztZQUNDLFVBQVUsR0FBRyxPQUFPLENBQUUseUJBQXlCLENBQUUsQ0FBQztZQUNsRCxTQUFTLEdBQUcsT0FBTyxDQUFFLHdCQUF3QixDQUFFLENBQUM7WUFFaEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLDZCQUE2QixDQUFFLENBQUM7WUFDdkUsSUFBSyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUNqQztnQkFDQyxPQUFPLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxPQUFPLENBQUUsVUFBVSxDQUFFLElBQUksQ0FBQyxDQUFFLENBQUM7YUFDNUQ7U0FDRDthQUVEO1lBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNmLFNBQVMsR0FBRyxPQUFPLENBQUUsV0FBVyxDQUFFLENBQUM7U0FDbkM7UUFFRCxRQUFRLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBRSxTQUFTLEdBQUcsVUFBVSxDQUFFLEdBQUcsQ0FBQyxDQUFFLEdBQUcsQ0FBQyxDQUFDO1FBR3hFLElBQUssV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUM5QjtZQUNDLG9CQUFvQixDQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFFLENBQUM7WUFDM0Qsc0JBQXNCLEVBQUUsQ0FBQztZQUN6QixvQkFBb0IsQ0FBRSxRQUFRLEdBQUcsQ0FBQyxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUUsQ0FBQztTQUUvRDthQUNJLG9CQUFvQjtTQUN6QjtZQUNDLG9CQUFvQixDQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFFLENBQUM7U0FDM0Q7UUFFRCxnQkFBZ0IsRUFBRSxDQUFDO1FBRW5CLElBQUssZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsbUNBQW1DLENBQUUsSUFBSSxHQUFHO1lBQ25GLGNBQWMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxTQUFTLGlCQUFpQjtRQUV6QixnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUUsQ0FBQztRQUU5RSxJQUFJLFlBQVksR0FBRyxXQUFXLENBQUMsZUFBZSxDQUFFLGdCQUFnQixFQUFFLENBQUcsQ0FBQztRQUN0RSxpQkFBaUIsQ0FBRSxVQUFVLENBQUcsQ0FBRSxZQUFZLEVBQUUsSUFBSSxDQUFFLENBQUM7SUFDeEQsQ0FBQztJQUVELFNBQVMsbUJBQW1CO1FBRTNCLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQzNCO1lBQ0MsSUFBSSxVQUFVLEdBQUcsY0FBYyxHQUFHLENBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBRSxDQUFDO1lBQzVDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQztZQUVuQixRQUFTLENBQUMsRUFDVjtnQkFDQyxRQUFRO2dCQUNSLEtBQUssQ0FBQztvQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQUMsTUFBTTtnQkFFM0MsS0FBSyxDQUFDO29CQUNMLE9BQU8sR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztvQkFBQyxNQUFNO2dCQUV2QyxLQUFLLENBQUM7b0JBQ0wsT0FBTyxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO29CQUFDLE1BQU07Z0JBRTVDLEtBQUssQ0FBQztvQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQUMsTUFBTTthQUMxQztZQUVELHdCQUF3QixDQUFFLFVBQVUsRUFBRSxPQUFPLENBQUUsQ0FBQztTQUNoRDtJQUNGLENBQUM7SUFFRCxTQUFTLHdCQUF3QixDQUFHLFVBQWtCLEVBQUUsT0FBZ0I7UUFFdkUsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQzdCLElBQUssTUFBTSxJQUFJLElBQUk7WUFDbEIsT0FBTztRQUVSLElBQUssT0FBTyxJQUFJLEtBQUssSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFFLHVDQUF1QyxDQUFFLElBQUksS0FBSyxFQUM3RjtZQUNDLE1BQU0sQ0FBQyxRQUFRLENBQUUsdUNBQXVDLENBQUUsQ0FBQztTQUMzRDthQUNJLElBQUssT0FBTyxJQUFJLElBQUksSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFFLHVDQUF1QyxDQUFFLElBQUksSUFBSSxFQUNoRztZQUNDLE1BQU0sQ0FBQyxXQUFXLENBQUUsdUNBQXVDLENBQUUsQ0FBQztTQUM5RDtJQUNGLENBQUM7SUFFRCxTQUFTLDJCQUEyQjtRQUVuQyxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTFFLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFDaEcsSUFBSyxvQkFBb0IsRUFBRSxFQUMzQjtZQUNDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBRSxDQUFDLENBQUUsQ0FBQztTQUN2QzthQUVEO1lBQ0MsWUFBWSxDQUFDLG9CQUFvQixDQUFFLFVBQVUsQ0FBRSxDQUFDO1NBQ2hEO1FBRUQsbUJBQW1CLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsU0FBUyx1QkFBdUI7UUFFL0IsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLENBQUUsQ0FBQztRQUUxRSxJQUFJLFVBQVUsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsNkJBQTZCLENBQUUsQ0FBRSxDQUFDO1FBQ2hHLElBQUssZ0JBQWdCLEVBQUUsRUFDdkI7WUFDQyxZQUFZLENBQUMsZ0JBQWdCLENBQUUsQ0FBQyxDQUFFLENBQUM7U0FDbkM7YUFFRDtZQUNDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBRSxVQUFVLENBQUUsQ0FBQztTQUM1QztRQUVELG1CQUFtQixFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELFNBQVMsNEJBQTRCO1FBRXBDLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFMUUsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLDZCQUE2QixDQUFFLENBQUUsQ0FBQztRQUNoRyxJQUFLLHFCQUFxQixFQUFFLEVBQzVCO1lBQ0MsWUFBWSxDQUFDLHFCQUFxQixDQUFFLENBQUMsQ0FBRSxDQUFDO1lBQ3hDLHdCQUF3QixDQUFFLGVBQWUsRUFBRSxLQUFLLENBQUUsQ0FBQztTQUNuRDthQUVEO1lBQ0MsWUFBWSxDQUFDLHFCQUFxQixDQUFFLFVBQVUsQ0FBRSxDQUFDO1lBQ2pELHdCQUF3QixDQUFFLGVBQWUsRUFBRSxJQUFJLENBQUUsQ0FBQztTQUNsRDtJQUNGLENBQUM7SUFFRCxTQUFTLDBCQUEwQjtRQUVsQyxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTFFLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFDaEcsSUFBSyxtQkFBbUIsRUFBRSxFQUMxQjtZQUNDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBRSxDQUFDLENBQUUsQ0FBQztTQUN0QzthQUVEO1lBQ0MsWUFBWSxDQUFDLG1CQUFtQixDQUFFLFVBQVUsQ0FBRSxDQUFDO1NBQy9DO1FBRUQsbUJBQW1CLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELFNBQVMsV0FBVztRQUduQixJQUFLLGtCQUFrQixLQUFLLENBQUM7WUFDNUIsT0FBTztRQUVSO1lBQ0MsaUJBQWlCLEVBQUUsQ0FBQztZQUVwQixJQUFLLGlCQUFpQixJQUFJLGtCQUFrQjtnQkFDM0MsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZCO1FBRUQsU0FBUztRQUVULElBQUksV0FBVyxHQUFHLENBQUMsQ0FBRSxrQkFBa0IsQ0FBRyxDQUFDO1FBRTNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUN2RDtZQUNDLElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUUxQyxJQUFLLE9BQU8sQ0FBQyxFQUFFLElBQUksbUJBQW1CLEdBQUcsaUJBQWlCLEVBQzFEO2dCQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7YUFDaEM7aUJBRUQ7Z0JBQ0MsT0FBTyxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQzthQUM3QjtTQUNEO1FBRUQsVUFBVTtRQUVWLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDLFVBQVUsQ0FBQztZQUU3RCxJQUFLLFFBQVEsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQ25DO2dCQUNDLElBQUksY0FBYyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO2dCQUM5RSxJQUFLLGNBQWMsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQy9DO29CQUNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUMxRDt3QkFDQyxJQUFJLE9BQU8sR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7d0JBRTdDLElBQUssT0FBTyxDQUFDLEVBQUUsSUFBSSxZQUFZLEdBQUcsaUJBQWlCLEVBQ25EOzRCQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7eUJBQ2hDOzZCQUVEOzRCQUNDLE9BQU8sQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7eUJBQzdCO3FCQUNEO2lCQUNEO2FBQ0Q7U0FDRDtRQUVELFFBQVEsQ0FBQyxhQUFhLENBQUUsMkJBQTJCLENBQUUsQ0FBQztJQUN2RCxDQUFDO0lBRUQsU0FBUyxVQUFVO1FBRWxCLGdCQUFnQixDQUFDLGNBQWMsQ0FBRSx3QkFBd0IsQ0FBRSxDQUFDO1FBRTVELENBQUMsQ0FBQyxRQUFRLENBQUUsR0FBRyxFQUFFLHFCQUFxQixDQUFFLENBQUM7SUFDMUMsQ0FBQztJQUVELFNBQVMscUJBQXFCO1FBRTdCLFFBQVEsQ0FBQyxhQUFhLENBQUUsMkJBQTJCLENBQUUsQ0FBQztRQUV0RCxJQUFJLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxpQkFBaUIsQ0FBRSxLQUFLLEdBQUcsQ0FBQztRQUUvRSxJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsOEJBQThCLENBQWEsQ0FBQztRQUMzRixJQUFLLENBQUMsV0FBVztZQUNoQixPQUFPO1FBRVIsSUFBSyxTQUFTLEVBQ2Q7WUFDQyxXQUFXLENBQUMsUUFBUSxDQUFFLHNDQUFzQyxDQUFFLENBQUM7U0FDL0Q7YUFFRDtZQUNDLFdBQVcsQ0FBQyxRQUFRLENBQUUsb0NBQW9DLENBQUUsQ0FBQztTQUM3RDtJQUVGLENBQUM7SUFFRCxTQUFTLFNBQVM7UUFFakIsUUFBUSxDQUFDLGFBQWEsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBRXJELElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHVCQUF1QixDQUFFLEtBQUssR0FBRztZQUN2RixnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSwwQkFBMEIsQ0FBRSxLQUFLLEdBQUcsQ0FBQztRQUV6RSxJQUFLLGFBQWEsRUFDbEI7WUFDQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSwwQkFBMEIsRUFBRSxHQUFHLENBQUUsQ0FBQztZQUNyRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSx1QkFBdUIsRUFBRSxHQUFHLENBQUUsQ0FBQztTQUVsRTthQUVEO1lBQ0MsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsMEJBQTBCLEVBQUUsR0FBRyxDQUFFLENBQUM7WUFDckUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsdUJBQXVCLEVBQUUsR0FBRyxDQUFFLENBQUM7U0FDbEU7UUFFRCxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsRUFBRSxlQUFlLENBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxlQUFlO1FBRXZCLElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHVCQUF1QixDQUFFLEtBQUssR0FBRztZQUN2RixnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSwwQkFBMEIsQ0FBRSxLQUFLLEdBQUcsQ0FBQztRQUV6RSxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsNkJBQTZCLENBQWEsQ0FBQztRQUM5RixJQUFLLENBQUMsZUFBZTtZQUNwQixPQUFPO1FBRVIsSUFBSyxhQUFhLEVBQ2xCO1lBQ0MsZUFBZSxDQUFDLFFBQVEsQ0FBRSx1Q0FBdUMsQ0FBRSxDQUFDO1NBQ3BFO2FBRUQ7WUFDQyxlQUFlLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxDQUFFLENBQUM7U0FDbEU7SUFFRixDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FBRyxFQUFXO1FBRXpDLElBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFO1lBQ3hCLE9BQU87UUFFUixLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDOUM7WUFDQyxtQkFBbUIsQ0FBRSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBQztTQUMxQztRQUVELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxXQUFXLEVBQUUsRUFBRSxDQUFxQixDQUFDO1FBQ3ZFLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBRSxVQUFVLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFDbEQsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFFLGFBQWEsRUFBRSxFQUFFLENBQUUsQ0FBQztRQUUxRCxJQUFLLElBQUksSUFBSSxFQUFFO1lBQ2QsbUJBQW1CLENBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUUsQ0FBQztJQUU3QyxDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBRyxJQUFZO1FBRTNDLElBQUssWUFBWSxDQUFDLDRCQUE0QixFQUFFO1lBQy9DLE9BQU8sYUFBYSxDQUFDO1FBRXRCLFFBQVMsSUFBSSxFQUNiO1lBQ0MsS0FBSyxZQUFZO2dCQUNoQixJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLGdCQUFnQixDQUFFLEtBQUssR0FBRyxFQUNsRTtvQkFDQyxPQUFPLGlCQUFpQixDQUFDO2lCQUN6QjtnQkFDRCxPQUFPLFlBQVksQ0FBQztZQUVyQixLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxhQUFhLENBQUM7WUFFdEI7Z0JBQ0MsT0FBTyxpQkFBaUIsQ0FBQztTQUMxQjtJQUNGLENBQUM7SUFDRCxnREFBZ0Q7SUFDaEQsU0FBUyxXQUFXO1FBRW5CLG1DQUFtQztRQUVuQyxNQUFNLEVBQUUsQ0FBQztRQUVULElBQUksT0FBTyxHQUFHLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMzQyxJQUFLLENBQUMsT0FBTztZQUNaLE9BQU87UUFFUixJQUFJLGtCQUFrQixDQUFDO1FBRXZCLElBQUksSUFBSSxHQUFHLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxLQUFLLENBQUUsQ0FBQztRQUN4RCxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsdUJBQXVCLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFM0QseUhBQXlIO1FBQ3pILElBQUssSUFBSSxJQUFJLFlBQVksRUFDekI7WUFDQyxNQUFNO1lBQ04sSUFBSyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSwwQkFBMEIsQ0FBRSxLQUFLLEdBQUcsRUFDNUU7Z0JBQ0MsUUFBUSxHQUFHLE9BQU8sQ0FBQzthQUNuQjtpQkFDSSxJQUFLLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLGdCQUFnQixDQUFFLEtBQUssR0FBRyxFQUN2RTtnQkFDQyxRQUFRLEdBQUcsUUFBUSxDQUFDO2FBQ3BCO1NBQ0Q7UUFFRCxPQUFPO1FBQ1AsSUFBSyxJQUFJLEtBQUssVUFBVSxFQUN4QjtZQUNDLHNDQUFzQztZQUN0Qyx5REFBeUQ7WUFDekQsT0FBTztTQUNQO1FBQ0QsT0FBTztRQUVQLFFBQVMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUMzQjtZQUNDLEtBQUssU0FBUyxDQUFDO1lBQ2YsS0FBSyxhQUFhLENBQUM7WUFDbkIsS0FBSyxjQUFjO2dCQUNsQixrQkFBa0IsR0FBRyx1REFBdUQsQ0FBQztnQkFDN0UsTUFBTTtZQUVQLEtBQUssWUFBWTtnQkFDaEIsSUFBSyxRQUFRLElBQUksUUFBUSxFQUN6QjtvQkFDQyxrQkFBa0IsR0FBRyx5Q0FBeUMsQ0FBQztpQkFDL0Q7cUJBRUQ7b0JBQ0Msa0JBQWtCLEdBQUcsOEJBQThCLENBQUM7aUJBQ3BEO2dCQUNELE1BQU07WUFFUCxLQUFLLFVBQVU7Z0JBQ2Qsa0JBQWtCLEdBQUcsOEJBQThCLENBQUM7Z0JBQ3BELE1BQU07WUFFUCxLQUFLLGFBQWE7Z0JBQ2pCLGtCQUFrQixHQUFHLGlDQUFpQyxDQUFDO2dCQUN2RCxNQUFNO1lBRVAsS0FBSyxhQUFhO2dCQUNqQixrQkFBa0IsR0FBRyxpQ0FBaUMsQ0FBQztnQkFDdkQsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixJQUFLLFFBQVEsSUFBSSxpQkFBaUIsRUFDbEM7b0JBQ0Msa0JBQWtCLEdBQUcsMERBQTBELENBQUM7aUJBQ2hGO3FCQUVEO29CQUNDLGtCQUFrQixHQUFHLHlDQUF5QyxDQUFDO2lCQUMvRDtnQkFDRCxNQUFNO1lBRVA7Z0JBQ0Msa0JBQWtCLEdBQUcseUNBQXlDLENBQUM7Z0JBQy9ELE1BQU07U0FDUDtRQUVELG1CQUFtQixDQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBRSxDQUFDO1FBRWpELCtFQUErRTtRQUMvRSxFQUFFO1FBQ0YsRUFBRTtRQUNGLElBQUssV0FBVyxDQUFDLFlBQVksRUFBRTtZQUM5QixLQUFLLENBQUMsUUFBUSxDQUFFLGNBQWMsQ0FBRSxDQUFDO1FBRWxDLElBQUssYUFBYSxDQUFDLGlCQUFpQixFQUFFO1lBQ3JDLEtBQUssQ0FBQyxRQUFRLENBQUUsbUJBQW1CLENBQUUsQ0FBQztRQUd2QywwQ0FBMEM7UUFDMUMsWUFBWSxHQUFHLG9CQUFvQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRTVDLGFBQWE7UUFFYixJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFFLENBQUM7UUFDbkQsbUJBQW1CLENBQUUsSUFBSSxFQUFFLHdCQUF3QixFQUFFLENBQUUsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUVyQixtQkFBbUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsV0FBVyxDQUFFLEVBQUUsQ0FBRSxDQUFDO1FBRXZCLGNBQWMsRUFBRSxDQUFDO1FBRWpCLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFaEIsdUJBQXVCO1FBQ3ZCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxhQUFhLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFDN0MsdUJBQXVCLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFFN0IsZ0JBQWdCLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBRUQsU0FBUyxjQUFjO1FBRXRCLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQ2hEO1lBQ0MsSUFBSSxPQUFPLEdBQUcsV0FBVyxDQUFDLGdCQUFnQixDQUFFLENBQUMsQ0FBRyxDQUFDO1lBRWpELElBQUssT0FBTyxDQUFFLGlCQUFpQixDQUFFLFlBQVksQ0FBRSxDQUFFLEtBQUssVUFBVTtnQkFDL0QsaUJBQWlCLENBQUUsWUFBWSxDQUFFLENBQUUsT0FBTyxFQUFFLElBQUksQ0FBRSxDQUFDO1NBQ3BEO0lBRUYsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUVwQixRQUFTLFdBQVcsQ0FBQyx1QkFBdUIsQ0FBRSxLQUFLLENBQUUsRUFDckQ7WUFDQyxLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLFNBQVM7Z0JBQ2Isb0JBQW9CLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtZQUVQLEtBQUssWUFBWTtnQkFDaEIsSUFBSyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxnQkFBZ0IsQ0FBRSxLQUFLLEdBQUcsRUFDbEU7b0JBQ0Msb0JBQW9CLEVBQUUsQ0FBQztpQkFDdkI7Z0JBQ0QsTUFBTTtZQUVQLFFBQVE7WUFDUixLQUFLLFFBQVE7Z0JBQ1osb0JBQW9CLEVBQUUsQ0FBQztnQkFDdkIsTUFBTTtTQUNQO0lBQ0YsQ0FBQztJQUVELFNBQVMsVUFBVTtRQUVsQixnQkFBZ0IsRUFBRSxDQUFDO1FBQ25CLFlBQVksRUFBRSxDQUFDO1FBQ2YsaUJBQWlCLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsU0FBUyxpQkFBaUI7UUFHekIsSUFBSyxDQUFDLFFBQVEsRUFDZDtZQUNDLFdBQVcsRUFBRSxDQUFDO1NBQ2Q7UUFFRCxxQkFBcUIsRUFBRSxDQUFDO1FBQ3hCLGVBQWUsRUFBRSxDQUFDO1FBRWxCLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsWUFBWSxFQUFFLENBQUM7UUFDZix5QkFBeUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUNsQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzNCLHdCQUF3QjtJQUV4QixDQUFDO0lBRUQsU0FBUyxjQUFjO1FBRXRCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBQzFFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDNUMsYUFBYSxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUV2QyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsb0NBQW9DLENBQUUsQ0FBQztRQUN0RixJQUFLLGVBQWUsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQ2hELGVBQWUsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFdEMsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUNoRixJQUFLLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUN4RCxtQkFBbUIsQ0FBQyxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVELFNBQVMsZ0JBQWdCO1FBRXhCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSwwQkFBMEIsQ0FBRSxDQUFDO1FBQzFFLElBQUssYUFBYSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEVBQUU7WUFDNUMsYUFBYSxDQUFDLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUVwQyxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsb0NBQW9DLENBQUUsQ0FBQztRQUN0RixJQUFLLGVBQWUsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQ2hELGVBQWUsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFekMsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsMEJBQTBCLENBQUUsQ0FBQztRQUNoRixJQUFLLG1CQUFtQixJQUFJLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUN4RCxtQkFBbUIsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7SUFDOUMsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLGdCQUFnQjtRQUV4QixJQUFLLHNCQUFzQixFQUMzQjtZQUNDLENBQUMsQ0FBQywyQkFBMkIsQ0FBRSxxQ0FBcUMsRUFBRSxzQkFBc0IsQ0FBRSxDQUFDO1lBQy9GLHNCQUFzQixHQUFHLElBQUksQ0FBQztTQUM5QjtRQUVELCtCQUErQjtRQUMvQixDQUFDLENBQUMsYUFBYSxDQUFFLHdCQUF3QixDQUFFLENBQUM7UUFFNUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUVwQiwyQ0FBMkM7SUFFM0MsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxTQUFTLGVBQWU7UUFFdkIsaUJBQWlCLEVBQUUsQ0FBQztRQUVwQixjQUFjLENBQUUsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxtQ0FBbUMsQ0FBRSxJQUFJLEdBQUcsQ0FBRSxDQUFFLENBQUM7UUFFdEcsSUFBSyxDQUFDLHNCQUFzQixFQUM1QjtZQUNDLHNCQUFzQixHQUFHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxQ0FBcUMsRUFBRSxVQUFVLENBQUMsd0JBQXdCLENBQUUsQ0FBQztTQUNuSTtRQUVGLDBDQUEwQztJQUUxQyxDQUFDO0lBRUQsZ0RBQWdEO0lBRWhELFNBQVMsYUFBYTtRQUVyQixlQUFlLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsU0FBUyw2QkFBNkI7UUFFckMsaUJBQWlCLEVBQUUsQ0FBQztRQUNwQixJQUFLLENBQUMsQ0FBQyxDQUFFLGFBQWEsQ0FBRTtZQUN2QixPQUFPLENBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUU1QyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUsYUFBYSxDQUFHLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztRQUU5RSxJQUFLLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQy9CO1lBQ0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBcUIsQ0FBQztZQUNyRCxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUMsQ0FBRSxFQUFFLE1BQU0sSUFBSSxHQUFHLEVBQUUsT0FBTyxDQUFFLENBQUMsQ0FBRSxFQUFFLE1BQU0sSUFBSSxHQUFHLEVBQUUsT0FBTyxDQUFFLENBQUMsQ0FBRSxFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUUsQ0FBQztTQUNqRztRQUVELE9BQU8sQ0FBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxTQUFTLDRCQUE0QixDQUFHLElBQVk7UUFFbkQsaUJBQWlCLEVBQUUsQ0FBQztRQUVwQixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztRQUNoRSxJQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtZQUNoQyxPQUFPO1FBRVIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUNsRDtZQUNDLElBQU8sTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUMsQ0FBcUIsQ0FBQyxNQUFNLElBQUksSUFBSTtnQkFDOUQsU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDbkI7UUFFRCxDQUFDLENBQUMsYUFBYSxDQUFFLGlEQUFpRCxFQUFFLFNBQVMsQ0FBRSxDQUFDO0lBRWpGLENBQUM7SUFFRCxVQUFVO0lBQ1Ysb0dBQW9HO0lBQ3BHLG9HQUFvRztJQUNwRyxTQUFTLGdCQUFnQjtRQUV4QixJQUFJLFNBQVMsR0FBRyxVQUFVLENBQUM7UUFFM0IsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFDNUI7WUFDQyxTQUFTLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7U0FDL0I7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBQ0QsVUFBVTtJQUVWLFNBQVMsb0JBQW9CO1FBRTVCLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFFLENBQUM7UUFFaEcsSUFBSSxFQUFFLEdBQUcsQ0FBRSxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksVUFBVSxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsb0JBQW9CLEVBQUUsQ0FBRSxDQUFDO1FBRWpHLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELFNBQVMsZ0JBQWdCO1FBRXhCLElBQUssV0FBVyxDQUFDLFlBQVksRUFBRSxFQUMvQjtZQUNDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFFLENBQUM7U0FDaEY7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCx3Q0FBd0M7SUFDeEMsSUFBSTtJQUNKLDBIQUEwSDtJQUUxSCxrSEFBa0g7SUFFbEgsY0FBYztJQUNkLElBQUk7SUFFSixTQUFTLHFCQUFxQjtRQUU3QixJQUFJLEtBQUssR0FBRyxXQUFXLENBQUMsWUFBWSxFQUFFLElBQUksUUFBUSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUUsQ0FBQztRQUVqSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLG1CQUFtQjtRQUUzQixJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUUsbUJBQW1CLENBQUUsQ0FBRSxDQUFDO1FBRTFGLElBQUksRUFBRSxHQUFHLENBQUUsV0FBVyxDQUFDLFlBQVksRUFBRSxJQUFJLGNBQWMsQ0FBRSxDQUFDO1FBRTFELE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELFNBQVMseUJBQXlCLENBQUcsS0FBYyxFQUFFLElBQVk7UUFFaEUsWUFBWSxDQUFDLHFCQUFxQixDQUNqQyxDQUFDLENBQUMsUUFBUSxDQUFFLHdCQUF3QixDQUFFLEVBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUUsaUNBQWlDLENBQUUsRUFDL0MsRUFBRSxFQUNGLGNBQWMsSUFBSSxJQUFJLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFFLElBQUksQ0FBRSxDQUFDLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFFLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUMzRyxjQUFjLENBQUMsQ0FDZixDQUFDO0lBQ0gsQ0FBQztJQUVELHNCQUFzQjtJQUN0QixPQUFPO1FBQ04sY0FBYyxFQUFFLGVBQWU7UUFDL0IsZUFBZSxFQUFFLGdCQUFnQjtRQUNqQyxlQUFlLEVBQUUsZ0JBQWdCO1FBQ2pDLHdCQUF3QixFQUFFLGlDQUFpQztRQUMzRCxnQkFBZ0IsRUFBRSxpQkFBaUI7UUFDbkMsWUFBWSxFQUFFLFdBQVc7UUFDekIsc0JBQXNCLEVBQUUsdUJBQXVCO1FBQy9DLHFCQUFxQixFQUFFLHNCQUFzQjtRQUM3QyxrQ0FBa0MsRUFBRSxtQ0FBbUM7UUFDdkUsaUNBQWlDLEVBQUUsa0NBQWtDO1FBQ3JFLHlDQUF5QyxFQUFFLDBDQUEwQztRQUNyRix3Q0FBd0MsRUFBRSx5Q0FBeUM7UUFDbkYsU0FBUyxFQUFFLFVBQVU7UUFDckIsVUFBVSxFQUFFLFdBQVc7UUFDdkIsYUFBYSxFQUFFLGNBQWM7UUFDN0IsWUFBWSxFQUFFLGFBQWE7UUFDM0IsNEJBQTRCLEVBQUUsNkJBQTZCO1FBQzNELDJCQUEyQixFQUFFLDRCQUE0QjtRQUN6RCxnQkFBZ0IsRUFBRSxpQkFBaUI7UUFFbkMsc0JBQXNCLEVBQUUsdUJBQXVCO1FBRS9DLDBCQUEwQixFQUFFLDJCQUEyQjtRQUN2RCxzQkFBc0IsRUFBRSx1QkFBdUI7UUFDL0MsMkJBQTJCLEVBQUUsNEJBQTRCO1FBQ3pELHlCQUF5QixFQUFFLDBCQUEwQjtRQUVyRCxTQUFTLEVBQUUsVUFBVTtRQUNyQixRQUFRLEVBQUUsU0FBUztRQUVuQixhQUFhLEVBQUUsY0FBYztRQUM3Qix5Q0FBeUM7UUFDekMsdUNBQXVDO1FBQ3ZDLHdCQUF3QixFQUFFLHlCQUF5QjtRQUVuRCxZQUFZO1FBQ1osd0JBQXdCLEVBQUUseUJBQXlCO1FBQ25ELGVBQWUsRUFBRSxnQkFBZ0I7UUFDakMsVUFBVTtLQUNWLENBQUM7QUFFSCxDQUFDLENBQUUsRUFBRSxDQUFDO0FBR04sWUFBWTtBQUNaLG9HQUFvRztBQUNwRyxvR0FBb0c7QUFDcEcsU0FBUyxlQUFlO0lBRXZCLE9BQU8sVUFBVSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ3JDLENBQUM7QUFDRCxVQUFVO0FBRVYsb0dBQW9HO0FBQ3BHLDJDQUEyQztBQUMzQyxvR0FBb0c7QUFDcEcsQ0FBRTtJQUVELENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFFLENBQUM7SUFDN0UsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUUsQ0FBQztJQUUvRSxDQUFDLENBQUMseUJBQXlCLENBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBRSxDQUFDO0lBQ2hGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSx5QkFBeUIsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFFLENBQUM7SUFFbEYsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDO0lBRTFGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxzQkFBc0IsRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFFLENBQUM7SUFFNUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUUsQ0FBQztJQUU5RSxDQUFDLENBQUMseUJBQXlCLENBQUUsMEJBQTBCLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBRSxDQUFDO0lBRXBGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSx5QkFBeUIsRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFFLENBQUM7SUFFbEYsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDZCQUE2QixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBRSxDQUFDO0lBRTFGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSx1Q0FBdUMsRUFBRSxVQUFVLENBQUMsMEJBQTBCLENBQUUsQ0FBQztJQUM5RyxDQUFDLENBQUMseUJBQXlCLENBQUUsbUNBQW1DLEVBQUUsVUFBVSxDQUFDLHNCQUFzQixDQUFFLENBQUM7SUFDdEcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHdDQUF3QyxFQUFFLFVBQVUsQ0FBQywyQkFBMkIsQ0FBRSxDQUFDO0lBQ2hILENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxzQ0FBc0MsRUFBRSxVQUFVLENBQUMseUJBQXlCLENBQUUsQ0FBQztJQUU1RyxDQUFDLENBQUMseUJBQXlCLENBQUUseUJBQXlCLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBRSxDQUFDO0lBRW5GLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw4QkFBOEIsRUFBRSxVQUFVLENBQUMsc0JBQXNCLENBQUUsQ0FBQztJQUVqRyxDQUFDLENBQUMseUJBQXlCLENBQUUsbUNBQW1DLEVBQUUsVUFBVSxDQUFDLHNCQUFzQixDQUFFLENBQUM7SUFDdEcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLGtDQUFrQyxFQUFFLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBRSxDQUFDO0lBRXBHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSwrQ0FBK0MsRUFBRSxVQUFVLENBQUMsa0NBQWtDLENBQUUsQ0FBQztJQUM5SCxDQUFDLENBQUMseUJBQXlCLENBQUUsOENBQThDLEVBQUUsVUFBVSxDQUFDLGlDQUFpQyxDQUFFLENBQUM7SUFDNUgsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHNEQUFzRCxFQUFFLFVBQVUsQ0FBQyx5Q0FBeUMsQ0FBRSxDQUFDO0lBQzVJLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxREFBcUQsRUFBRSxVQUFVLENBQUMsd0NBQXdDLENBQUUsQ0FBQztJQUUxSSxDQUFDLENBQUMseUJBQXlCLENBQUUsc0JBQXNCLEVBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBRSxDQUFDO0lBQzVFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxQkFBcUIsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFFLENBQUM7SUFDMUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHFDQUFxQyxFQUFFLFVBQVUsQ0FBQyx3QkFBd0IsQ0FBRSxDQUFDO0lBRTFHLFdBQVc7SUFDWCwrRkFBK0Y7SUFDL0YsVUFBVTtBQUNYLENBQUMsQ0FBRSxFQUFFLENBQUMifQ==