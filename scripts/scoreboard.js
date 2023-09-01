"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="match_stakes.ts" />
var Scoreboard = (function () {
    function _msg(text) {
    }
    const _m_cP = $.GetContextPanel();
    let _m_LocalPlayerID = '';
    function GetLocalPlayerId() {
        if (_m_LocalPlayerID === '')
            _m_LocalPlayerID = GameStateAPI.GetLocalPlayerXuid();
        return _m_LocalPlayerID;
    }
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
        CalculateAllCommends() {
            ['leader', 'teacher', 'friendly'].forEach(stat => {
                this._SortCommendLeaderboard(stat);
                this._ChangeCommendDisplay(_m_TopCommends[stat], stat, false);
                _m_TopCommends[stat] = this._GetCommendBestXuid(stat);
                this._ChangeCommendDisplay(_m_TopCommends[stat], stat, true);
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
        m_elPlayer = undefined;
        m_elTeam = undefined;
        m_oStats = {};
        m_oElStats = {};
        m_isMuted = false;
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
                    this.DeletePlayerByXuid(player.m_xuid);
                }
            }
        }
    }
    let _m_bInit = false;
    let _m_oUpdateStatFns = {};
    let _m_updatePlayerIndex = 0;
    let _m_oTeams = {};
    let _m_arrSortingPausedRefGetCounter = 0;
    let _m_hDenyInputToGame = null;
    let _m_dataSetCurrent = 0;
    let _m_dataSetGetCount = 0;
    let _m_areTeamsSwapped = false;
    let _m_maxRounds = 0;
    let _m_oPlayers;
    let _m_RoundUpdated = {};
    let _m_TopCommends = {
        'leader': "0",
        'teacher': "0",
        'friendly': "0",
    };
    let _m_overtime = 0;
    let _m_updatePlayerHandler = null;
    let _m_haveViewers = false;
    let FAKEMODE = '';
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
        'hsp': 0,
        'kdr': 0,
        'score': 0,
        'kills': 0,
        'assists': 0,
        'deaths': -1,
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
        'score': 0,
        'avgrisc': 0,
        'money': 0,
        'hsp': 0,
        'kdr': 0,
        'adr': 0,
        'utilitydamage': 0,
        'enemiesflashed': 0,
    };
    let _m_sortOrder = sortOrder_default;
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
    }
    function _Helper_LoadSnippet(element, snippet) {
        if (element && !element.m_bSnippetLoaded) {
            element.BLoadLayoutSnippet(snippet);
            element.m_bSnippetLoaded = true;
        }
    }
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
                if (!oPlayer) {
                    _CreateNewPlayer(xuid);
                }
                else if (oPlayer.m_oStats['teamname'] != teamName) {
                    _ChangeTeams(oPlayer, teamName);
                }
            }
        }
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
        if (oPlayer.m_oStats['teamname'] == newTeam)
            return;
        let xuid = oPlayer.m_xuid;
        let oldTeam = oPlayer.m_oStats['teamname'];
        let elPlayer = oPlayer.m_elPlayer;
        oPlayer.m_oStats['teamname'] = newTeam;
        if (oldTeam in _m_oTeams) {
            _m_oTeams[oldTeam].DeletePlayerFromCommendsLeaderboards(xuid);
        }
        oPlayer.m_oStats['leader'] = -1;
        oPlayer.m_oStats['teacher'] = -1;
        oPlayer.m_oStats['friendly'] = -1;
        if (!elPlayer || !elPlayer.IsValid())
            return;
        if (oldTeam)
            elPlayer.RemoveClass('sb-team--' + oldTeam);
        elPlayer.AddClass('sb-team--' + newTeam);
        if (IsTeamASpecTeam(newTeam) && MatchStatsAPI.IsTournamentMatch()) {
            elPlayer.AddClass('hidden');
            return;
        }
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
        let idx = _m_oPlayers.GetPlayerIndexByXuid(xuid);
        _UpdateAllStatsForPlayer(idx, true);
        _SortPlayer(idx);
    }
    function _CreateNewPlayer(xuid) {
        let oPlayer = _m_oPlayers.AddPlayer(xuid);
        _NewPlayerPanel(oPlayer);
        let idx = _m_oPlayers.GetPlayerIndexByXuid(xuid);
        _UpdateAllStatsForPlayer(idx, true);
        _SortPlayer(idx);
        let sortOrder = Object.keys(_m_sortOrder)[1];
        _HighlightSortStatLabel(sortOrder);
    }
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
        $.Schedule(0.01, () => _UpdateAllPlayers(bSilent));
    }
    function _UpdateAllPlayers(bSilent) {
        if (!_m_bInit)
            return;
        _PopulatePlayerList();
        _m_updatePlayerIndex = 0;
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let elPlayer = _m_oPlayers.GetPlayerByIndex(i).m_elPlayer;
            if (elPlayer && elPlayer.IsValid())
                elPlayer.RemoveClass('sb-row--transition');
        }
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            _UpdatePlayer(i, bSilent);
        }
        for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
            let elPlayer = _m_oPlayers.GetPlayerByIndex(i).m_elPlayer;
            if (elPlayer && elPlayer.IsValid())
                elPlayer.AddClass('sb-row--transition');
        }
    }
    function _Pulse(el) {
        el.RemoveClass('sb-pulse-highlight');
        el.AddClass('sb-pulse-highlight');
    }
    function _UpdatePlayerByPlayerSlot(slot) {
        let index = _m_oPlayers.GetPlayerIndexByPlayerSlot(slot);
        _UpdatePlayer(index, true);
    }
    function _UpdatePlayerByPlayerSlot_delayed(slot) {
        $.Schedule(0.01, () => _UpdatePlayerByPlayerSlot(slot));
    }
    function _UpdatePlayer(idx, bSilent = false) {
        let oPlayer = _m_oPlayers.GetPlayerByIndex(idx);
        if (!oPlayer)
            return;
        bSilent = bSilent && _m_cP.visible;
        let xuid = oPlayer.m_xuid;
        oPlayer.m_oMatchStats = MatchStatsAPI.GetPlayerStatsJSO(xuid);
        _UpdateAllStatsForPlayer(idx, bSilent);
        _SortPlayer(idx);
    }
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
        let children = elTeam.Children();
        for (let i = 0; i < children.length; i++) {
            if (oPlayer.m_xuid === children[i].m_xuid)
                continue;
            let oCompareTargetPlayer = _m_oPlayers.GetPlayerByXuid(children[i].m_xuid);
            if (!oCompareTargetPlayer)
                continue;
            for (let stat in _m_sortOrder) {
                let p1stat = oPlayer.m_oStats[stat];
                let p2stat = oCompareTargetPlayer.m_oStats[stat];
                if (_m_sortOrder[stat] === -1) {
                    let tmp = p1stat;
                    p1stat = p2stat;
                    p2stat = tmp;
                }
                if (_lessthan(p2stat, p1stat)) {
                    if (children[i - 1] != elPlayer) {
                        elTeam.MoveChildBefore(elPlayer, children[i]);
                    }
                    return;
                }
                else if (_lessthan(p1stat, p2stat)) {
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
    function _UpdateAllStatsForPlayer(idx, bSilent = false) {
        let oPlayer = _m_oPlayers.GetPlayerByIndex(idx);
        for (let stat in _m_oUpdateStatFns) {
            if (typeof (_m_oUpdateStatFns[stat]) === 'function') {
                _m_oUpdateStatFns[stat](oPlayer, bSilent);
            }
        }
    }
    function _GenericUpdateStat(oPlayer, stat, fnGetStat, bSilent = false) {
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
    function _CreateStatUpdateFn(stat) {
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
                        if (isLocalPlayer) {
                            let elMusicKit = $('#id-sb-meta__musickit');
                            if (!elMusicKit || !elMusicKit.IsValid())
                                return;
                            let isValidMusicKit = newStatValue > 0;
                            elMusicKit.SetHasClass('hidden', !isValidMusicKit);
                            if (isValidMusicKit) {
                                _m_cP.FindChildTraverse('id-sb-meta__musickit-unborrow').SetHasClass('hidden', !isBorrowed);
                                let imagepath = 'file://{images}/' + InventoryAPI.GetItemInventoryImageFromMusicID(newStatValue) + '.png';
                                $('#id-sb-meta__musickit-image').SetImage(imagepath);
                                $('#id-sb-meta__musickit-name').text = $.Localize(InventoryAPI.GetMusicNameFromMusicID(newStatValue));
                            }
                        }
                    }
                    let elPlayer = oPlayer.m_elPlayer;
                    if (elPlayer && elPlayer.IsValid()) {
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
                    elLabel.SetHasClass('sb-row__cell--ping__label--bot', !!szCustomLabel);
                    if (szCustomLabel) {
                        elLabel.text = $.Localize(szCustomLabel);
                        oPlayer.m_oStats[stat] = szCustomLabel;
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
                        let kdrFn = _GetMatchStatFn('kdr');
                        kdr = kdrFn(oPlayer.m_xuid);
                        if (typeof kdr == 'number' && kdr > 0) {
                            kdr = kdr / 100.0;
                        }
                    }
                    else {
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
                        let elMVPStarImage = elMVPPanel.FindChildTraverse('star-image');
                        if (!elMVPStarImage || !elMVPStarImage.IsValid())
                            return;
                        let elMVPStarNumberLabel = elMVPPanel.FindChildTraverse('star-count');
                        if (!elMVPStarNumberLabel || !elMVPStarNumberLabel.IsValid())
                            return;
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
                    let newStatValue = MockAdapter.GetPlayerStatus(oPlayer.m_xuid);
                    if (newStatValue !== oPlayer.m_oStats[stat]) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPlayer = oPlayer.m_elPlayer;
                        if (!elPlayer || !elPlayer.IsValid())
                            return;
                        elPlayer.SetHasClass('sb-player-status-dead', newStatValue === 1);
                        elPlayer.SetHasClass('sb-player-status-disconnected', newStatValue === 15);
                        oPlayer.m_oStats['dc'] = newStatValue === 15 ? 0 : 1;
                        let elPanel = oPlayer.m_oElStats[stat];
                        if (!elPanel || !elPanel.IsValid())
                            return;
                        let elStatusImage = elPanel.FindChildTraverse('image');
                        if (!elStatusImage || !elStatusImage.IsValid())
                            return;
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
                    let elPanel = oPlayer.m_oElStats[stat];
                    if (!elPanel || !elPanel.IsValid())
                        return;
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
                    oPlayer.m_elPlayer.SetDialogVariableInt('player_slot', GameStateAPI.GetPlayerSlot(oPlayer.m_xuid));
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
                    let elAvatarImage = elPanel.FindChildTraverse('image');
                    if (!elAvatarImage || !elAvatarImage.IsValid())
                        return;
                    elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(oPlayer.m_xuid));
                    let team = GameStateAPI.GetPlayerTeamName(oPlayer.m_xuid);
                    elAvatarImage.SwitchClass('teamstyle', 'team--' + team);
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
                    let elSkillgroup = oPlayer.m_elPlayer.FindChildTraverse('jsRatingEmblem');
                    if (elSkillgroup) {
                        if (newStatValue > 0) {
                            elSkillgroup.visible = true;
                            if (oPlayer.m_oStats[stat] !== newStatValue) {
                                oPlayer.m_oStats[stat] = newStatValue;
                                let elPlayer = oPlayer.m_elPlayer;
                                if (elPlayer && elPlayer.IsValid()) {
                                    let options = {
                                        root_panel: elPlayer.FindChildTraverse('jsRatingEmblem'),
                                        xuid: oPlayer.m_xuid,
                                        api: 'gamestate',
                                        full_details: false,
                                    };
                                    RatingEmblem.SetXuid(options);
                                }
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
                return;
        }
        _m_oUpdateStatFns[stat] = fn;
    }
    function _GetPlayerRowForGameMode() {
        let mode = MockAdapter.GetGameModeInternalName(false);
        let skirmish = MockAdapter.GetGameModeInternalName(true);
        if (GameStateAPI.IsQueuedMatchmakingMode_Team()) {
            return 'snippet_scoreboard-classic__row--premier';
        }
        switch (mode) {
            case 'scrimcomp2v2':
                return 'snippet_scoreboard-classic__row--wingman';
            case 'competitive':
                return 'snippet_scoreboard-classic__row--comp';
            case 'gungameprogressive':
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
        if (set !== '') {
            let labelSetContainerId = 'id-sb-row__set-container';
            let elLabelSetContainer = $('#' + labelSetContainerId);
            if (!elLabelSetContainer || !elLabelSetContainer.IsValid()) {
                elLabelSetContainer = $.CreatePanel('Panel', elLabelRow, labelSetContainerId);
                elLabelSetContainer.BLoadLayoutSnippet('snippet_sb-label-set-container');
                if ($('#id-sb-row__set-container')) {
                    $('#id-sb-meta__cycle').RemoveClass('hidden');
                }
            }
            let elSetLabels = elLabelSetContainer.FindChildTraverse('id-sb-row__sets');
            let LabelSetId = 'id-sb-labels-set-' + set;
            let elLabelSet = elSetLabels.FindChildTraverse(LabelSetId);
            if (!elLabelSet || !elLabelSet.IsValid()) {
                _m_dataSetGetCount++;
                elLabelSet = $.CreatePanel('Panel', elSetLabels, LabelSetId);
                elLabelSet.AddClass('sb-row__set');
                elLabelSet.AddClass('no-hover');
            }
            elLabelRowOrSet = elLabelSet;
            if (set != _m_dataSetCurrent.toString()) {
                elLabelSet.AddClass('hidden');
            }
        }
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
            let toolTipString = $.Localize('#Scoreboard_' + stat + '_tooltip');
            if (toolTipString !== '') {
                elStatLabel.SetPanelEvent('onmouseover', () => UiToolkitAPI.ShowTextTooltip(elStatLabel.id, toolTipString));
                elStatLabel.SetPanelEvent('onmouseout', function () { UiToolkitAPI.HideTextTooltip(); });
            }
            let _SetNewSortStat = function (stat) {
                let newSortOrder = { 'dc': 0 };
                let modeDefaultSortOrder = _GetSortOrderForMode(MockAdapter.GetGameModeInternalName(false));
                if (stat in modeDefaultSortOrder)
                    newSortOrder[stat] = modeDefaultSortOrder[stat];
                else
                    return;
                _HighlightSortStatLabel(stat);
                for (let s in modeDefaultSortOrder) {
                    if (s == stat)
                        continue;
                    if (s == 'dc')
                        continue;
                    newSortOrder[s] = modeDefaultSortOrder[s];
                }
                _m_sortOrder = newSortOrder;
                for (let i = 0; i < _m_oPlayers.GetCount(); i++) {
                    _SortPlayer(i);
                }
            };
            elStatPanel.SetPanelEvent('onactivate', _SetNewSortStat.bind(undefined, stat));
        }
    }
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
    function _NewPlayerPanel(oPlayer) {
        if (!oPlayer.m_elTeam || !oPlayer.m_elTeam.IsValid())
            return;
        oPlayer.m_elPlayer = $.CreatePanel('Panel', oPlayer.m_elTeam, 'player-' + oPlayer.m_xuid);
        oPlayer.m_elPlayer.m_xuid = oPlayer.m_xuid;
        _Helper_LoadSnippet(oPlayer.m_elPlayer, _GetPlayerRowForGameMode());
        let idx = 0;
        function _InitStatCell(elStatCell, oPlayer) {
            if (!elStatCell || !elStatCell.IsValid())
                return;
            let stat = elStatCell.GetAttributeString('data-stat', '');
            let set = elStatCell.GetAttributeString('data-set', '');
            let isHidden = elStatCell.GetAttributeString('data-hidden', '');
            let children = elStatCell.Children();
            for (let i = 0; i < children.length; i++) {
                _InitStatCell(children[i], oPlayer);
            }
            if (stat === '') {
                return;
            }
            oPlayer.m_oElStats[stat] = elStatCell;
            elStatCell.AddClass('sb-row__cell');
            elStatCell.AddClass('sb-row__cell--' + stat);
            if (set !== '') {
                let SetContainerId = 'id-sb-row__set-container';
                let elSetContainer = oPlayer.m_elPlayer.FindChildTraverse(SetContainerId);
                if (!elSetContainer || !elSetContainer.IsValid()) {
                    elSetContainer = $.CreatePanel('Panel', oPlayer.m_elPlayer, SetContainerId);
                    oPlayer.m_elPlayer.MoveChildBefore(elSetContainer, elStatCell);
                }
                let setId = 'id-sb-set-' + set;
                let elSet = elSetContainer.FindChildTraverse(setId);
                if (!elSet || !elSet.IsValid) {
                    elSet = $.CreatePanel('Panel', elSetContainer, setId);
                    elSet.AddClass('sb-row__set');
                    elSet.AddClass('no-hover');
                    idx = 0;
                }
                elStatCell.SetParent(elSet);
                if (set != _m_dataSetCurrent.toString()) {
                    elSet.AddClass('hidden');
                }
            }
            if (idx++ % 2)
                elStatCell.AddClass('sb-row__cell--dark');
            if (!isHidden) {
                _CreateStatUpdateFn(stat);
            }
        }
        _CreateStatUpdateFn('teamname');
        _CreateStatUpdateFn('musickit');
        _CreateStatUpdateFn('status');
        _CreateStatUpdateFn('skillgroup');
        _CreateStatUpdateFn('leader');
        _CreateStatUpdateFn('teacher');
        _CreateStatUpdateFn('friendly');
        let elStatCells = oPlayer.m_elPlayer.Children();
        let cellCount = elStatCells.length;
        for (let i = 0; i < cellCount; i++) {
            _InitStatCell(elStatCells[i], oPlayer);
        }
        oPlayer.m_oStats = {};
        oPlayer.m_oStats['idx'] = GameStateAPI.GetPlayerSlot(oPlayer.m_xuid);
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
        let elTick = elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick');
        if (elTick && elTick.IsValid()) {
            elTick.SetHasClass('hilite', rnd <= jsoTime['rounds_played'] + 1);
        }
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
        if (GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0')
            _ShowSurvivors();
        UiToolkitAPI.ShowCustomLayoutTooltipStyled('1', 'id-tooltip-sb-casualties', 'file://{resources}/layout/tooltips/tooltip_scoreboard_casualties.xml', 'Tooltip_NoArrow');
    }
    function _Casualties_OnMouseOut() {
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
        _m_cP.SetDialogVariable('sb_team_name--' + teamName, MockAdapter.GetTeamClanName(teamName));
        const teamLogoImagePath = MockAdapter.GetTeamLogoImagePath(teamName);
        if (teamLogoImagePath != '') {
            for (const elTeamLogoBackground of _m_cP.FindChildrenWithClassTraverse('sb-team-logo-background--' + teamName)) {
                elTeamLogoBackground.style.backgroundImage = `url("file://{images}${teamLogoImagePath}")`;
                elTeamLogoBackground.AddClass('sb-team-logo-bg');
            }
        }
        _m_cP.SetDialogVariableInt(teamName + '_alive', MockAdapter.GetTeamLivingPlayerCount(teamName));
        _m_cP.SetDialogVariableInt(teamName + '_total', MockAdapter.GetTeamTotalPlayerCount(teamName));
    }
    function _UpdateTeams() {
        let oScoreData = MockAdapter.GetScoreDataJSO();
        for (let team in _m_oTeams) {
            _UpdateTeamInfo(team);
            if (!oScoreData || !('teamdata' in oScoreData) || !(team in oScoreData['teamdata']))
                continue;
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
        if (jsoTime['overtime'] > 0) {
            m_topScore = (jsoTime['maxrounds'] + (jsoTime['overtime'] - 1) * jsoTime['maxrounds_overtime']) / 2;
            m_botScore = (jsoTime['maxrounds'] + (jsoTime['overtime'] - 1) * jsoTime['maxrounds_overtime']) / 2;
        }
        for (let rnd = 1; rnd <= lastRound; rnd++) {
            _UpdateRound(rnd, oScoreData, jsoTime);
        }
    }
    function _UpdateScore_Classic() {
        if (Object.keys(_m_oTeams).length === 0) {
            _InitClassicTeams();
        }
        _UpdateTeams();
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        let currentRound = jsoTime['rounds_played'] + 1;
        _m_cP.SetDialogVariable('match_phase', $.Localize('#gamephase_' + jsoTime['gamephase']));
        _m_cP.SetDialogVariable('rounds_remaining', jsoTime['rounds_remaining'].toString());
        _m_cP.SetDialogVariableInt('scoreboard_ot', jsoTime['overtime']);
        _m_cP.SetHasClass('sb-tournament-match', MatchStatsAPI.IsTournamentMatch());
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
        if (bResetTimeline || !(currentRound in _m_RoundUpdated)) {
            if (bResetTimeline) {
                _ResetTimeline();
            }
            _UpdateAllRounds();
            _m_RoundUpdated[currentRound] = true;
        }
        else {
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
        elTimeline.AddClass('sb-team-tint');
        let id = 'id-sb-timeline__segment--' + phase;
        let elSegment = elTimeline.FindChildTraverse(id);
        if (!elSegment || !elSegment.IsValid()) {
            elSegment = $.CreatePanel('Panel', elTimeline, id);
            elSegment.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment');
        }
        let elRoundContainer = elSegment.FindChildTraverse('id-sb-timeline__round-container');
        if (elRoundContainer && elRoundContainer.IsValid()) {
            for (let rnd = startRound; rnd <= endRound; rnd++) {
                let elRnd = elSegment.FindChildTraverse(rnd.toString());
                if (!elRnd || !elRnd.IsValid()) {
                    elRnd = $.CreatePanel('Panel', elRoundContainer, rnd.toString());
                    elRnd.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round');
                    let elTop = elRnd.FindChildTraverse('id-sb-timeline__segment__round--top');
                    elTop.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round__data');
                    let elBot = elRnd.FindChildTraverse('id-sb-timeline__segment__round--bot');
                    elBot.BLoadLayoutSnippet('snippet_scoreboard-classic__timeline__segment__round__data');
                    if (rnd % 5 == 0) {
                        elRnd.FindChildTraverse('id-sb-timeline__segment__round__tick__label').text = rnd.toString();
                    }
                }
            }
        }
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
        _UpdateRoundLossBonus();
        let elTimeline = _m_cP.FindChildInLayoutFile('id-sb-timeline__segments');
        if (!elTimeline || !elTimeline.IsValid())
            return;
        elTimeline.RemoveAndDeleteChildren();
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        if (!_SupportsTimeline(jsoTime))
            return;
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
        else {
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
    function _CycleStats() {
        if (_m_dataSetGetCount === 0)
            return;
        {
            _m_dataSetCurrent++;
            if (_m_dataSetCurrent >= _m_dataSetGetCount)
                _m_dataSetCurrent = 0;
        }
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
            case 'gungameprogressive':
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
    function _Initialize() {
        _Reset();
        let jsoTime = MockAdapter.GetTimeDataJSO();
        if (!jsoTime)
            return;
        let scoreboardTemplate;
        let mode = MockAdapter.GetGameModeName(false);
        let skirmish = MockAdapter.GetGameModeName(true);
        if (mode == 'deathmatch') {
            if (GameInterfaceAPI.GetSettingString('mp_teammates_are_enemies') !== '0') {
                skirmish = 'ffadm';
            }
            else if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                skirmish = 'teamdm';
            }
        }
        if (mode === 'survival') {
            return;
        }
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
        if (MockAdapter.IsDemoOrHltv())
            _m_cP.AddClass('IsDemoOrHltv');
        if (MatchStatsAPI.IsTournamentMatch())
            _m_cP.AddClass('IsTournamentMatch');
        _m_sortOrder = _GetSortOrderForMode(mode);
        let temp = $.CreatePanel('Panel', _m_cP, 'temp');
        _Helper_LoadSnippet(temp, _GetPlayerRowForGameMode());
        temp.visible = false;
        _CreateLabelsForRow(temp);
        temp.DeleteAsync(.0);
        _ResetTimeline();
        _m_bInit = true;
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
    function _CloseScoreboard() {
        if (_m_updatePlayerHandler) {
            $.UnregisterForUnhandledEvent('Scoreboard_UpdatePlayerByPlayerSlot', _m_updatePlayerHandler);
            _m_updatePlayerHandler = null;
        }
        $.DispatchEvent('DismissAllContextMenus');
        _OnMouseInactive();
    }
    function _OpenScoreboard() {
        _UpdateEverything();
        _ShowSurvivors((GameInterfaceAPI.GetSettingString('cl_scoreboard_survivors_always_on') == '0'));
        if (!_m_updatePlayerHandler) {
            _m_updatePlayerHandler = $.RegisterForUnhandledEvent('Scoreboard_UpdatePlayerByPlayerSlot', Scoreboard.UpdatePlayerByPlayerSlot);
        }
    }
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
        ApplyPlayerCrosshairCode: _ApplyPlayerCrosshairCode,
    };
})();
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
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjb3JlYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0RBQXNEO0FBQ3RELDZDQUE2QztBQUM3Qyx5Q0FBeUM7QUFDekMsd0NBQXdDO0FBc0J4QyxJQUFJLFVBQVUsR0FBRyxDQUFFO0lBRWxCLFNBQVMsSUFBSSxDQUFHLElBQVk7SUFHNUIsQ0FBQztJQWtCRCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFzQixDQUFDO0lBRXRELElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0lBQzFCLFNBQVMsZ0JBQWdCO1FBRXhCLElBQUssZ0JBQWdCLEtBQUssRUFBRTtZQUMzQixnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN0RCxPQUFPLGdCQUFnQixDQUFDO0lBQ3pCLENBQUM7SUFZRCxNQUFNLE1BQU07UUFFWCxxQkFBcUIsR0FBdUU7WUFDM0YsUUFBUSxFQUFFLEVBQUU7WUFDWixTQUFTLEVBQUUsRUFBRTtZQUNiLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUNGLFVBQVUsQ0FBUztRQUVuQixZQUFhLFFBQWdCO1lBRTVCLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO1FBQzVCLENBQUM7UUFHRCxvQkFBb0I7WUFFakIsQ0FBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBdUIsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBSzFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFFckMsSUFBSSxDQUFDLHFCQUFxQixDQUFFLGNBQWMsQ0FBRSxJQUFJLENBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFFLENBQUM7Z0JBRWxFLGNBQWMsQ0FBRSxJQUFJLENBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUUsSUFBSSxD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