/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="common/formattext.ts" />
var Scoreboard = (function () {
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
                    let newStatValue = GameStateAPI.GetPlayerCompetitiveRanking(oPlayer.m_xuid);
                    if (oPlayer.m_oStats[stat] !== newStatValue) {
                        oPlayer.m_oStats[stat] = newStatValue;
                        let elPlayer = oPlayer.m_elPlayer;
                        if (elPlayer && elPlayer.IsValid()) {
                            let elSkillGroupImage = elPlayer.FindChildTraverse('id-sb-skillgroup-image');
                            if (elSkillGroupImage && elSkillGroupImage.IsValid()) {
                                let imagepath = '';
                                if (newStatValue > 0) {
                                    let mode = MockAdapter.GetGameModeInternalName(false);
                                    let imagePath = 'skillgroup';
                                    if (mode == 'scrimcomp2v2')
                                        imagePath = 'wingman';
                                    imagepath = 'file://{images}/icons/skillgroups/' + imagePath + newStatValue + '.svg';
                                    elSkillGroupImage.RemoveClass('hidden');
                                }
                                else {
                                    imagepath = '';
                                    elSkillGroupImage.AddClass('hidden');
                                }
                                elSkillGroupImage.SetImage(imagepath);
                            }
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
                return;
        }
        _m_oUpdateStatFns[stat] = fn;
    }
    function _GetPlayerRowForGameMode() {
        let mode = MockAdapter.GetGameModeInternalName(false);
        let skirmish = MockAdapter.GetGameModeInternalName(true);
        if (GameStateAPI.IsQueuedMatchmakingMode_Team()) {
            return 'snippet_scoreboard-classic__row--teammatchmaking';
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
        let mode = MockAdapter.GetGameModeInternalName(false);
        let skirmish = MockAdapter.GetGameModeInternalName(true);
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
        _UpdateLeaderboard();
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
        _m_cP.FindChildrenWithClassTraverse('timer').forEach(el => el.active = false);
        $.DispatchEvent('DismissAllContextMenus');
        _OnMouseInactive();
    }
    function _OpenScoreboard() {
        _UpdateEverything();
        _m_cP.FindChildrenWithClassTraverse('timer').forEach(el => el.active = true);
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
    function _UpdateLeaderboard(strLBname) {
        let mode = MockAdapter.GetGameModeInternalName(false);
        if (mode !== 'cooperative' && mode !== 'coopmission') {
            return;
        }
        let elLeaderboardStats = _m_cP.FindChildInLayoutFile('CoopStats');
        if (!elLeaderboardStats)
            return;
        elLeaderboardStats.RemoveClass('show-mission-stats');
        let hPrevDetails = LeaderboardsAPI.GetLeaderboardDetailsHandleForCoop();
        let activeQuestID = GameStateAPI.GetActiveQuestID();
        if (activeQuestID > 0 && LeaderboardsAPI.GetDetailsQuestID(hPrevDetails) === activeQuestID) {
            UpdateCoopScores(hPrevDetails);
            return;
        }
        if (strLBname === undefined) {
            if (activeQuestID === 0)
                return;
            strLBname = 'official_leaderboard_quest_' + activeQuestID;
        }
        let lbState = LeaderboardsAPI.GetState(strLBname);
        if (lbState === 'none') {
            LeaderboardsAPI.Refresh(strLBname);
        }
        else if (lbState === 'ready') {
            let cacheTimeMinutes = LeaderboardsAPI.HowManyMinutesAgoCached(strLBname);
            if (cacheTimeMinutes > 3) {
                LeaderboardsAPI.Refresh(strLBname);
            }
            else {
                let hDetails = LeaderboardsAPI.GetEntryDetailsHandleByXuid(strLBname, MyPersonaAPI.GetXuid());
                if (hDetails)
                    UpdateCoopScores(hDetails);
            }
        }
    }
    function _OnFinalCoopScore() {
        let hDetailHandle = LeaderboardsAPI.GetLeaderboardDetailsHandleForCoop();
        _m_cP.AddClass('coop-finalscore');
        UpdateCoopScores(hDetailHandle);
    }
    function UpdateCoopScores(hDetailHandle) {
        let elLeaderboardStats = _m_cP.FindChildInLayoutFile('CoopStats');
        if (!elLeaderboardStats)
            return;
        let mode = MockAdapter.GetGameModeInternalName(false);
        if (mode !== 'cooperative' && mode !== 'coopmission') {
            return;
        }
        elLeaderboardStats.AddClass('show-mission-stats');
        let nScoreCount = LeaderboardsAPI.GetDetailsMatchScoreboardStatsCount(hDetailHandle, 'score');
        for (let i = 0; i < nScoreCount; ++i) {
            let strNameToken = LeaderboardsAPI.GetDetailsMatchScoreboardStatNameByIndex(hDetailHandle, 'score', i);
            elLeaderboardStats.SetDialogVariable('statname' + i, $.Localize(strNameToken));
            FormatStatValueDialogVar();
            FormatStatScoreDialogVar();
            function FormatStatValueDialogVar() {
                let stat = LeaderboardsAPI.GetDetailsMatchScoreboardStatValueByIndex(hDetailHandle, 'score', i);
                let statKey = 'statval' + i;
                if (strNameToken === '#SFUI_Scoreboard_Coop_DmgToEnemyRatio') {
                    elLeaderboardStats.SetDialogVariable(statKey, (100 - stat / 100).toFixed(1));
                }
                else if (strNameToken === '#SFUI_Scoreboard_Coop_TeamAccuracy' || strNameToken === '#SFUI_Scoreboard_Coop_Headshots') {
                    elLeaderboardStats.SetDialogVariableInt(statKey, stat / 100);
                }
                else if (strNameToken === '#SFUI_Scoreboard_Coop_TimeLeft') {
                    elLeaderboardStats.SetDialogVariableTime(statKey, stat);
                }
                else {
                    elLeaderboardStats.SetDialogVariableInt(statKey, stat);
                }
            }
            ;
            function FormatStatScoreDialogVar() {
                let score = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreByIndex(hDetailHandle, 'score', i);
                if (strNameToken === '#SFUI_Scoreboard_Coop_DmgToEnemyRatio')
                    score = 10000 - score;
                elLeaderboardStats.SetDialogVariableInt('statscore' + i, score);
            }
            ;
        }
        let nBonusCount = LeaderboardsAPI.GetDetailsMatchScoreboardStatsCount(hDetailHandle, 'bonus');
        for (let i = 0; i < nBonusCount; ++i) {
            elLeaderboardStats.SetDialogVariable('bonusname' + i, $.Localize(LeaderboardsAPI.GetDetailsMatchScoreboardStatNameByIndex(hDetailHandle, 'bonus', i)));
            elLeaderboardStats.SetDialogVariableInt('bonusval' + i, LeaderboardsAPI.GetDetailsMatchScoreboardStatValueByIndex(hDetailHandle, 'bonus', i));
            elLeaderboardStats.SetDialogVariableInt('bonusscore' + i, LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreByIndex(hDetailHandle, 'bonus', i));
        }
        let nBonus = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal(hDetailHandle, 'bonus');
        elLeaderboardStats.SetDialogVariableInt('bonus_score', nBonus);
        let nScore = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal(hDetailHandle, 'score');
        elLeaderboardStats.SetDialogVariableInt('score', nScore);
        let nTotalScore = LeaderboardsAPI.GetDetailsMatchScoreboardStatScoreTotal(hDetailHandle, 'all');
        elLeaderboardStats.SetDialogVariableInt('total_score', nTotalScore);
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
        UpdateLeaderboard: _UpdateLeaderboard,
        OnFinalCoopScore: _OnFinalCoopScore,
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
    $.RegisterForUnhandledEvent('PanoramaComponent_Leaderboards_StateChange', Scoreboard.UpdateLeaderboard);
    $.RegisterForUnhandledEvent('CoopScoreReceived', Scoreboard.OnFinalCoopScore);
    $.RegisterForUnhandledEvent('GameState_OnMatchStart', function () {
        $.Schedule(0.1, Scoreboard.UpdateLeaderboard);
    });
    $.RegisterForUnhandledEvent('Scoreboard_MuteVoice', Scoreboard.MuteVoice);
    $.RegisterForUnhandledEvent('Scoreboard_BlockUgc', Scoreboard.BlockUgc);
    $.RegisterForUnhandledEvent('Scoreboard_ApplyPlayerCrosshairCode', Scoreboard.ApplyPlayerCrosshairCode);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NvcmVib2FyZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNjb3JlYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLHdDQUF3QztBQUN4QyxzREFBc0Q7QUFDdEQsNkNBQTZDO0FBcUI3QyxJQUFJLFVBQVUsR0FBRyxDQUFFO0lBa0JsQixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFzQixDQUFDO0lBRXRELElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0lBQzFCLFNBQVMsZ0JBQWdCO1FBRXhCLElBQUssZ0JBQWdCLEtBQUssRUFBRTtZQUMzQixnQkFBZ0IsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUN0RCxPQUFPLGdCQUFnQixDQUFDO0lBQ3pCLENBQUM7SUFXRCxNQUFNLE1BQU07UUFFWCxxQkFBcUIsR0FBdUU7WUFDM0YsUUFBUSxFQUFFLEVBQUU7WUFDWixTQUFTLEVBQUUsRUFBRTtZQUNiLFVBQVUsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUNGLFVBQVUsQ0FBUztRQUVuQixZQUFhLFFBQWdCO1lBRTVCLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO1FBQzVCLENBQUM7UUFHRCxvQkFBb0I7WUFFakIsQ0FBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBdUIsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLEVBQUU7Z0JBSzFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztnQkFFckMsSUFBSSxDQUFDLHFCQUFxQixDQUFFLGNBQWMsQ0FBRSxJQUFJLENBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFFLENBQUM7Z0JBRWxFLGNBQWMsQ0FBRSxJQUFJLENBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUUsSUFBSSxDQUFFLENBQUM7Z0JBQzFELElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxjQUFjLENBQUUsSUFBSSxDQUFFLEVBQUUs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