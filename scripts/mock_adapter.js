/// <reference path="csgo.d.ts" />
/// <reference path="common/iteminfo.ts" />
var MockAdapter = (function () {
    const k_GetMatchEndWinDataJSO = "k_GetMatchEndWinDataJSO";
    const k_GetScoreDataJSO = "k_GetScoreDataJSO";
    const k_GetPlayerName = "k_GetPlayerName";
    const k_IsFakePlayer = "k_IsFakePlayer";
    const k_XpDataJSO = "k_XpDataJSO";
    const k_GetGameModeInternalName = "k_GetGameModeInternalName";
    const k_GetGameModeName = "k_GetGameModeName";
    const k_SkillgroupDataJSO = "k_SkillgroupDataJSO";
    const k_DropListJSO = "k_DropListJSO";
    const k_GetTimeDataJSO = "k_GetTimeDataJSO";
    const k_NextMatchVotingData = "k_NextMatchVotingData";
    const k_GetPlayerStatsJSO = "k_GetPlayerStatsJSO";
    const k_GetPlayerDataJSO = "k_GetPlayerDataJSO";
    const k_IsTournamentMatch = "k_IsTournamentMatch";
    const k_GetServerName = "k_GetServerName";
    const k_GetMapName = "k_GetMapName";
    const k_GetTournamentEventStage = "k_GetTournamentEventStage";
    const k_GetGameModeImagePath = "k_GetGameModeImagePath";
    const k_GetMapBSPName = "k_GetMapBSPName";
    const k_GetPlayerTeamName = "k_GetPlayerTeamName";
    const k_GetPlayerTeamNumber = "k_GetPlayerTeamNumber";
    const k_GetTeamNextRoundLossBonus = "k_GetTeamNextRoundLossBonus";
    const k_AreTeamsPlayingSwitchedSides = "k_AreTeamsPlayingSwitchedSides";
    const k_AreTeamsPlayingSwitchedSidesInRound = "k_AreTeamsPlayingSwitchedSidesInRound";
    const k_HasHalfTime = "k_HasHalfTime";
    const k_IsDemoOrHltv = "k_IsDemoOrHltv";
    const k_IsHLTVAutodirectorOn = "k_IsHLTVAutodirectorOn";
    const k_GetTeamLogoImagePath = "k_GetTeamLogoImagePath";
    const k_GetTeamLivingPlayerCount = "k_GetTeamLivingPlayerCount";
    const k_GetTeamTotalPlayerCount = "k_GetTeamTotalPlayerCount";
    const k_GetTeamClanName = "k_GetTeamClanName";
    const k_IsXuidValid = "k_IsXuidValid";
    const k_GetPlayerSlot = "k_GetPlayerSlot";
    const k_GetLocalPlayerXuid = "k_GetLocalPlayerXuid";
    const k_IsLocalPlayerHLTV = "k_IsLocalPlayerHLTV";
    const k_GetPlayerStatus = "k_GetPlayerStatus";
    const k_GetPlayerCommendsLeader = "k_GetPlayerCommendsLeader";
    const k_GetPlayerCommendsFriendly = "k_GetPlayerCommendsFriendly";
    const k_GetPlayerCommendsTeacher = "k_GetPlayerCommendsTeacher";
    const k_GetPlayerCompetitiveRanking = "k_GetPlayerCompetitiveRanking";
    const k_GetPlayerXpLevel = "k_GetPlayerXpLevel";
    const k_GetTeamGungameLeaderXuid = "k_GetTeamGungameLeaderXuid";
    const k_GetPlayerScore = "k_GetPlayerScore";
    const k_GetPlayerMVPs = "k_GetPlayerMVPs";
    const k_GetPlayerKills = "k_GetPlayerKills";
    const k_GetPlayerAssists = "k_GetPlayerAssists";
    const k_GetPlayerDeaths = "k_GetPlayerDeaths";
    const k_GetPlayerPing = "k_GetPlayerPing";
    const k_GetPlayerColor = "k_GetPlayerColor";
    const k_HasCommunicationAbuseMute = "k_HasCommunicationAbuseMute";
    const k_IsSelectedPlayerMuted = "IsSelectedPlayerMuted";
    const k_IsPlayerConnected = "k_IsPlayerConnected";
    const k_ArePlayersEnemies = "k_ArePlayersEnemies";
    const k_GetPlayerClanTag = "k_GetPlayerClanTag";
    const k_GetPlayerMoney = "k_GetPlayerMoney";
    const k_GetPlayerActiveWeaponItemId = "k_GetPlayerActiveWeaponItemId";
    const k_GetPlayerModel = "k_GetPlayerModel";
    const k_GetPlayerGungameLevel = "k_GetPlayerGungameLevel";
    const k_GetPlayerItemCT = "k_GetPlayerItemCT";
    const k_GetPlayerItemTerrorist = "k_GetPlayerItemTerrorist";
    const k_AccoladesJSO = "k_AccoladesJSO";
    const k_GetCharacterDefaultCheerByXuid = "k_GetCharacterDefaultCheerByXuid";
    const k_GetCooperativePlayerTeamName = "k_GetCooperativePlayerTeamName";
    const k_GetAllPlayersMatchDataJSO = "k_GetAllPlayersMatchDataJSO";
    const k_GetPlayerCharacterItemID = "k_GetPlayerCharacterItemID";
    const k_GetFauxItemIDFromDefAndPaintIndex = "GetFauxItemIDFromDefAndPaintIndex";
    let _m_mockData = undefined;
    function _SetMockData(dummydata) {
        _m_mockData = dummydata;
    }
    function _GetMockData() {
        return _m_mockData;
    }
    function FindMockTable(key) {
        const arrTablesInUse = _m_mockData.split(',');
        for (let group of arrTablesInUse) {
            if (MOCK_TABLE.hasOwnProperty(group) && MOCK_TABLE[group].hasOwnProperty(key)) {
                return MOCK_TABLE[group];
            }
        }
        if (MOCK_TABLE['defaults'].hasOwnProperty(key)) {
            return MOCK_TABLE['defaults'];
        }
        else
            return undefined;
    }
    function _APIAccessor(val, key, xuid = -1) {
        if (!_m_mockData) {
            return val;
        }
        const table = FindMockTable(key);
        if (!table) {
            return val;
        }
        let tableVal;
        if (xuid !== -1 && table[key].hasOwnProperty(xuid)) {
            tableVal = table[key][xuid];
        }
        else {
            tableVal = table[key];
        }
        if (tableVal && typeof tableVal === "function") {
            return tableVal(xuid);
        }
        else {
            return tableVal;
        }
    }
    const _getLoadoutWeapons = function (team) {
        const list = [];
        const slotStrings = LoadoutAPI.GetLoadoutSlotNames(false);
        const slots = JSON.parse(slotStrings);
        slots.forEach(slot => {
            const itemId = LoadoutAPI.GetItemID(team, slot);
            const bIsWeapon = ItemInfo.IsWeapon(itemId);
            if (bIsWeapon) {
                list.push(itemId);
            }
        });
        return list;
    };
    function _GetRandomWeaponFromLoadout() {
        const team = (_m_mockData.search('team_ct') !== -1) ? 'ct' : 't';
        const list = _getLoadoutWeapons(team);
        return list[_r(0, list.length)];
    }
    function _GetRandomPlayerStatsJSO(xuid) {
        const oPlayerStats = { "damage": 0, "kills": 0, "assists": 0, "deaths": 0, "adr": 0, "kdr": 0, "3k": 0, "4k": 0, "5k": 0, "headshotkills": 0, "hsp": 0, "worth": 0, "killreward": 0, "cashearned": 99, "livetime": 0, "objective": 0, "utilitydamage": 0, "enemiesflashed": 0 };
        Object.keys(oPlayerStats).forEach(stat => {
            oPlayerStats[stat] = _r();
        });
        return oPlayerStats;
    }
    function _r(min = 0, max = 100) {
        return Math.round(Math.random() * ((max - min) + min) + 0.5);
    }
    ;
    function _GetRandomXP() {
        const ret = {
            "xp_earned": {
                "2": _r(0, 1000),
                "6": _r(0, 1000),
            },
            "current_level": _r(0, 39),
            "current_xp": _r(0, 4999),
        };
        return ret;
    }
    function _GetRandomSkillGroup() {
        const oldrank = _r(1, 18);
        const newrank = oldrank + _r(-1, 1);
        const ret = {
            "old_rank": oldrank,
            "new_rank": newrank,
            "num_wins": _r(10, 1000)
        };
        return ret;
    }
    function _GetRandomPlayerModel(team) {
        const PlayerModels = {
            "ct": [
                "characters/models/ctm_fbi/ctm_fbi.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constianta.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiantb.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiantc.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiantd.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiante.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constianth.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiantf.vmdl",
                "characters/models/ctm_fbi/ctm_fbi_constiantg.vmdl",
                "characters/models/ctm_st6.vmdl",
                "characters/models/ctm_st6_constianta.vmdl",
                "characters/models/ctm_st6_constiantb.vmdl",
                "characters/models/ctm_st6_constiantc.vmdl",
                "characters/models/ctm_st6_constiantd.vmdl",
                "characters/models/ctm_st6_constianti.vmdl",
                "characters/models/ctm_st6_constiantm.vmdl",
                "characters/models/ctm_st6_constiantg.vmdl",
                "characters/models/ctm_st6_constiantk.vmdl",
                "characters/models/ctm_st6_constiante.vmdl",
                "characters/models/ctm_gign/ctm_gign.vmdl",
                "characters/models/ctm_gign/ctm_gign_constianta.vmdl",
                "characters/models/ctm_gign/ctm_gign_constiantb.vmdl",
                "characters/models/ctm_gign/ctm_gign_constiantc.vmdl",
                "characters/models/ctm_gign/ctm_gign_constiantd.vmdl",
                "characters/models/ctm_gsg9.vmdl",
                "characters/models/ctm_gsg9_constianta.vmdl",
                "characters/models/ctm_gsg9_constiantb.vmdl",
                "characters/models/ctm_gsg9_constiantc.vmdl",
                "characters/models/ctm_gsg9_constiantd.vmdl",
                "characters/models/ctm_idf/ctm_idf.vmdl",
                "characters/models/ctm_idf/ctm_idf_constiantb.vmdl",
                "characters/models/ctm_idf/ctm_idf_constiantc.vmdl",
                "characters/models/ctm_idf/ctm_idf_constiantd.vmdl",
                "characters/models/ctm_idf/ctm_idf_constiante.vmdl",
                "characters/models/ctm_idf/ctm_idf_constiantf.vmdl",
                "characters/models/ctm_sas/ctm_sas.vmdl",
                "characters/models/ctm_sas/ctm_sas_constiantf.vmdl",
                "characters/models/ctm_swat/ctm_swat.vmdl",
                "characters/models/ctm_swat/ctm_swat_constianta.vmdl",
                "characters/models/ctm_swat/ctm_swat_constiantb.vmdl",
                "characters/models/ctm_swat/ctm_swat_constiantc.vmdl",
                "characters/models/ctm_swat/ctm_swat_constiantd.vmdl",
                "characters/models/ctm_heavy/ctm_heavy.vmdl",
            ],
            "t": [
                "characters/models/tm_balkan/tm_balkan_constiante.vmdl",
                "characters/models/tm_balkan/tm_balkan_constianta.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantb.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantc.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantd.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantf.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantg.vmdl",
                "characters/models/tm_balkan/tm_balkan_constianth.vmdl",
                "characters/models/tm_balkan/tm_balkan_constianti.vmdl",
                "characters/models/tm_balkan/tm_balkan_constiantj.vmdl",
                "characters/models/tm_leet/tm_leet_constiante.vmdl",
                "characters/models/tm_leet/tm_leet_constianta.vmdl",
                "characters/models/tm_leet/tm_leet_constiantb.vmdl",
                "characters/models/tm_leet/tm_leet_constiantc.vmdl",
                "characters/models/tm_leet/tm_leet_constiantd.vmdl",
                "characters/models/tm_leet/tm_leet_constiantf.vmdl",
                "characters/models/tm_leet/tm_leet_constianth.vmdl",
                "characters/models/tm_leet/tm_leet_constiantg.vmdl",
                "characters/models/tm_leet/tm_leet_constianti.vmdl",
                "characters/models/tm_anarchist/tm_anarchist.vmdl",
                "characters/models/tm_anarchist/tm_anarchist_constianta.vmdl",
                "characters/models/tm_anarchist/tm_anarchist_constiantb.vmdl",
                "characters/models/tm_anarchist/tm_anarchist_constiantc.vmdl",
                "characters/models/tm_anarchist/tm_anarchist_constiantd.vmdl",
                "characters/models/tm_phoenix/tm_phoenix.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constianta.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiantb.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiantc.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiantd.vmdl",
                "characters/models/tm_pirate/tm_pirate.vmdl",
                "characters/models/tm_pirate/tm_pirate_constianta.vmdl",
                "characters/models/tm_pirate/tm_pirate_constiantb.vmdl",
                "characters/models/tm_pirate/tm_pirate_constiantc.vmdl",
                "characters/models/tm_pirate/tm_pirate_constiantd.vmdl",
                "characters/models/tm_professional/tm_professional.vmdl",
                "characters/models/tm_professional_const1.vmdl",
                "characters/models/tm_professional_const2.vmdl",
                "characters/models/tm_professional_const3.vmdl",
                "characters/models/tm_professional_const4.vmdl",
                "characters/models/tm_separatist/tm_separatist.vmdl",
                "characters/models/tm_separatist/tm_separatist_constianta.vmdl",
                "characters/models/tm_separatist/tm_separatist_constiantb.vmdl",
                "characters/models/tm_separatist/tm_separatist_constiantc.vmdl",
                "characters/models/tm_separatist/tm_separatist_constiantd.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiantg.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiante.vmdl",
                "characters/models/tm_phoenix/tm_phoenix_constiantf.vmdl",
                "characters/models/tm_phoenix_heavy/tm_phoenix_heavy.vmdl",
            ]
        };
        return PlayerModels[team][Math.floor(Math.random() * PlayerModels[team].length)];
    }
    function _GetRandomAccolades() {
        function _GetRandomAccoladeTitle() {
            const titles = [
                "kills",
                "damage",
                "adr",
                "mvps",
                "assists",
                "hsp",
                "3k",
                "4k",
                "5k",
                "headshotkills",
                "killreward",
                "utilitydamage",
                "enemiesflashed",
                "objective",
                "worth",
                "score",
                "livetime",
                "deaths",
                "nopurchasewins",
                "clutchkills",
                "footsteps",
                "pistolkills",
                "firstkills",
                "sniperkills",
                "roundssurvived",
                "chickenskilled",
                "killswhileblind",
                "bombcarrierkills",
                "burndamage",
                "cashspent",
                "uniqueweaponkills",
                "gimme_01",
                "gimme_02",
                "gimme_03",
                "gimme_04",
                "gimme_05",
                "gimme_06",
            ];
            return titles[Math.floor(Math.random() * titles.length)];
        }
        function _GetRandomAccolade(xuid) {
            const name = _GetRandomAccoladeTitle();
            const pos = name.includes("gimme_") ? 1 : 1 + Math.floor(Math.random() * 2);
            const accolade = {
                accolade: name,
                value: Math.floor(Math.random() * 1000),
                xuid: xuid,
                position: pos
            };
            return accolade;
        }
        const oAccolades = {
            titles: [
                _GetRandomAccolade(1),
                _GetRandomAccolade(3),
                _GetRandomAccolade(5),
                _GetRandomAccolade(7),
                _GetRandomAccolade(9),
                _GetRandomAccolade(2),
                _GetRandomAccolade(4),
                _GetRandomAccolade(6),
                _GetRandomAccolade(8),
                _GetRandomAccolade(10),
                _GetRandomAccolade(11),
                _GetRandomAccolade(13),
                _GetRandomAccolade(15),
                _GetRandomAccolade(17),
                _GetRandomAccolade(19),
                _GetRandomAccolade(12),
                _GetRandomAccolade(14),
                _GetRandomAccolade(16),
                _GetRandomAccolade(18),
                _GetRandomAccolade(20),
            ]
        };
        return oAccolades;
    }
    function _InternalGetFauxItemId(defid, paintid) {
        return String(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(defid, paintid));
    }
    function _GetRandomModelDefIndex(teamnum) {
        const models = [
            [],
            [],
            [
                4780,
                4777,
                4774,
            ],
            [
                4771,
                4757,
                4751
            ],
        ];
        const random = _r(0, 2);
        return (models[teamnum][random]);
    }
    const MOCK_TABLE = {};
    return {
        GetMatchEndWinDataJSO: function _APIGetMatchEndWinDataJSO() { return _APIAccessor(GameStateAPI.GetMatchEndWinDataJSO(), k_GetMatchEndWinDataJSO); },
        GetScoreDataJSO: function _GetScoreDataJSO() { return _APIAccessor(GameStateAPI.GetScoreDataJSO(), k_GetScoreDataJSO); },
        GetPlayerName: function _GetPlayerName(xuid) { return _APIAccessor(GameStateAPI.GetPlayerName(xuid), k_GetPlayerName, xuid); },
        GetPlayerNameWithNoHTMLEscapes: function GetPlayerNameWithNoHTMLEscapes(xuid) { return _APIAccessor(GameStateAPI.GetPlayerNameWithNoHTMLEscapes(xuid), k_GetPlayerName, xuid); },
        IsFakePlayer: function _IsFakePlayer(xuid) { return _APIAccessor(GameStateAPI.IsFakePlayer(xuid), k_IsFakePlayer); },
        XPDataJSO: function _XPDataJSO(panel) { return _APIAccessor(panel.XpDataJSO, k_XpDataJSO); },
        GetGameModeInternalName: function _GetGameModeInternalName(bUseSkirmishName) { return _APIAccessor(GameStateAPI.GetGameModeInternalName(bUseSkirmishName), k_GetGameModeInternalName); },
        GetGameModeName: function _GetGameModeName(bUseSkirmishName) { return _APIAccessor(GameStateAPI.GetGameModeName(bUseSkirmishName), k_GetGameModeName); },
        SkillgroupDataJSO: function _SkillgroupDataJSO(panel) { return _APIAccessor(panel.SkillgroupDataJSO, k_SkillgroupDataJSO); },
        DropListJSO: function _DropListJSO(panel) { return _APIAccessor(panel.DropListJSO, k_DropListJSO); },
        GetTimeDataJSO: function _GetTimeDataJSO() { return _APIAccessor(GameStateAPI.GetTimeDataJSO(), k_GetTimeDataJSO); },
        NextMatchVotingData: function _NextMatchVotingData(panel) { return _APIAccessor(panel.NextMatchVotingData, k_NextMatchVotingData); },
        GetPlayerStatsJSO: function _GetPlayerStatsJSO(xuid) { return _APIAccessor(MatchStatsAPI.GetPlayerStatsJSO(xuid), k_GetPlayerStatsJSO, xuid); },
        GetPlayerDataJSO: function _GetPlayerDataJSO() { return _APIAccessor(GameStateAPI.GetPlayerDataJSO(), k_GetPlayerDataJSO); },
        IsTournamentMatch: function _IsTournamentMatch() { return _APIAccessor(MatchStatsAPI.IsTournamentMatch(), k_IsTournamentMatch); },
        GetServerName: function _GetServerName() { return _APIAccessor(GameStateAPI.GetServerName(), k_GetServerName); },
        GetMapName: function _GetMapName() { return _APIAccessor(GameStateAPI.GetMapName(), k_GetMapName); },
        GetTournamentEventStage: function _GetTournamentEventStage() { return _APIAccessor(GameStateAPI.GetTournamentEventStage(), k_GetTournamentEventStage); },
        GetGameModeImagePath: function _GetGameModeImagePath() {
            const path = GameStateAPI.GetGameModeImagePath();
            const modPath = _APIAccessor(path, k_GetGameModeImagePath);
            if (typeof modPath === 'string') {
                return modPath;
            }
            return path;
        },
        GetMapBSPName: function _GetMapBSPName() { return _APIAccessor(GameStateAPI.GetMapBSPName(), k_GetMapBSPName); },
        GetPlayerTeamName: function _GetPlayerTeamName(xuid) { return _APIAccessor(GameStateAPI.GetPlayerTeamName(xuid), k_GetPlayerTeamName, xuid); },
        GetPlayerTeamNumber: function _GetPlayerTeamNumber(xuid) { return _APIAccessor(GameStateAPI.GetPlayerTeamNumber(xuid), k_GetPlayerTeamNumber, xuid); },
        GetTeamNextRoundLossBonus: function _GetTeamNextRoundLossBonus(team) { return _APIAccessor(GameStateAPI.GetTeamNextRoundLossBonus(team), k_GetTeamNextRoundLossBonus); },
        AreTeamsPlayingSwitchedSides: function _AreTeamsPlayingSwitchedSides() { return _APIAccessor(GameStateAPI.AreTeamsPlayingSwitchedSides(), k_AreTeamsPlayingSwitchedSides); },
        AreTeamsPlayingSwitchedSidesInRound: function _AreTeamsPlayingSwitchedSidesInRound(rnd) { return _APIAccessor(GameStateAPI.AreTeamsPlayingSwitchedSidesInRound(rnd), k_AreTeamsPlayingSwitchedSidesInRound); },
        HasHalfTime: function _HasHalfTime() { return _APIAccessor(GameStateAPI.HasHalfTime(), k_HasHalfTime); },
        IsDemoOrHltv: function _IsDemoOrHltv() { return _APIAccessor(GameStateAPI.IsDemoOrHltv(), k_IsDemoOrHltv); },
        IsHLTVAutodirectorOn: function _IsHLTVAutodirectorOn() { return _APIAccessor(GameStateAPI.IsHLTVAutodirectorOn(), k_IsHLTVAutodirectorOn); },
        GetTeamLogoImagePath: function _GetTeamLogoImagePath(team) { return _APIAccessor(GameStateAPI.GetTeamLogoImagePath(team), k_GetTeamLogoImagePath); },
        GetTeamLivingPlayerCount: function _GetTeamLivingPlayerCount(team) { return _APIAccessor(GameStateAPI.GetTeamLivingPlayerCount(team), k_GetTeamLivingPlayerCount); },
        GetTeamTotalPlayerCount: function _GetTeamTotalPlayerCount(team) { return _APIAccessor(GameStateAPI.GetTeamTotalPlayerCount(team), k_GetTeamTotalPlayerCount); },
        GetTeamClanName: function _GetTeamClanName(team) { return _APIAccessor(GameStateAPI.GetTeamClanName(team), k_GetTeamClanName, team); },
        IsXuidValid: function _IsXuidValid(xuid) { return _APIAccessor(GameStateAPI.IsXuidValid(xuid), k_IsXuidValid); },
        GetPlayerSlot: function _GetPlayerSlot(xuid) { return _APIAccessor(GameStateAPI.GetPlayerSlot(xuid), k_GetPlayerSlot, xuid); },
        GetLocalPlayerXuid: function _GetLocalPlayerXuid() { return _APIAccessor(GameStateAPI.GetLocalPlayerXuid(), k_GetLocalPlayerXuid); },
        IsLocalPlayerHLTV: function _IsLocalPlayerHLTV() { return _APIAccessor(GameStateAPI.IsLocalPlayerHLTV(), k_IsLocalPlayerHLTV); },
        GetPlayerStatus: function _GetPlayerStatus(xuid) { return _APIAccessor(GameStateAPI.GetPlayerStatus(xuid), k_GetPlayerStatus); },
        GetPlayerCommendsLeader: function _GetPlayerCommendsLeader(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCommendsLeader(xuid), k_GetPlayerCommendsLeader); },
        GetPlayerCommendsFriendly: function _GetPlayerCommendsFriendly(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCommendsFriendly(xuid), k_GetPlayerCommendsFriendly); },
        GetPlayerCommendsTeacher: function _GetPlayerCommendsTeacher(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCommendsTeacher(xuid), k_GetPlayerCommendsTeacher); },
        GetPlayerCompetitiveRanking: function _GetPlayerCompetitiveRanking(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCompetitiveRanking(xuid), k_GetPlayerCompetitiveRanking); },
        GetPlayerXpLevel: function _GetPlayerXpLevel(xuid) { return _APIAccessor(GameStateAPI.GetPlayerXpLevel(xuid), k_GetPlayerXpLevel, xuid); },
        GetTeamGungameLeaderXuid: function _GetTeamGungameLeaderXuid(xuid) { return _APIAccessor(GameStateAPI.GetTeamGungameLeaderXuid(xuid), k_GetTeamGungameLeaderXuid); },
        GetPlayerScore: function _GetPlayerScore(xuid) { return _APIAccessor(GameStateAPI.GetPlayerScore(xuid), k_GetPlayerScore, xuid); },
        GetPlayerMVPs: function _GetPlayerMVPs(xuid) { return _APIAccessor(GameStateAPI.GetPlayerMVPs(xuid), k_GetPlayerMVPs, xuid); },
        GetPlayerKills: function _GetPlayerKills(xuid) { return _APIAccessor(GameStateAPI.GetPlayerKills(xuid), k_GetPlayerKills, xuid); },
        GetPlayerAssists: function _GetPlayerAssists(xuid) { return _APIAccessor(GameStateAPI.GetPlayerAssists(xuid), k_GetPlayerAssists, xuid); },
        GetPlayerDeaths: function _GetPlayerDeaths(xuid) { return _APIAccessor(GameStateAPI.GetPlayerDeaths(xuid), k_GetPlayerDeaths, xuid); },
        GetPlayerPing: function _GetPlayerPing(xuid) { return _APIAccessor(GameStateAPI.GetPlayerPing(xuid), k_GetPlayerPing, xuid); },
        GetPlayerColor: function _GetPlayerColor(xuid) { return _APIAccessor(GameStateAPI.GetPlayerColor(xuid), k_GetPlayerColor, xuid); },
        HasCommunicationAbuseMute: function _HasCommunicationAbuseMute(xuid) { return _APIAccessor(GameStateAPI.HasCommunicationAbuseMute(xuid), k_HasCommunicationAbuseMute); },
        IsSelectedPlayerMuted: function _IsSelectedPlayerMuted(xuid) { return _APIAccessor(GameStateAPI.IsSelectedPlayerMuted(xuid), k_IsSelectedPlayerMuted); },
        IsPlayerConnected: function _IsPlayerConnected(xuid) { return _APIAccessor(GameStateAPI.IsPlayerConnected(xuid), k_IsPlayerConnected); },
        ArePlayersEnemies: function _ArePlayersEnemies(xuid1, xuid2) { return _APIAccessor(GameStateAPI.ArePlayersEnemies(xuid1, xuid2), k_ArePlayersEnemies); },
        GetPlayerClanTag: function _GetPlayerClanTag(xuid) { return _APIAccessor(GameStateAPI.GetPlayerClanTag(xuid), k_GetPlayerClanTag); },
        GetPlayerMoney: function _GetPlayerMoney(xuid) { return _APIAccessor(GameStateAPI.GetPlayerMoney(xuid), k_GetPlayerMoney); },
        GetPlayerActiveWeaponItemId: function _GetPlayerActiveWeaponItemId(xuid) { return _APIAccessor(GameStateAPI.GetPlayerActiveWeaponItemId(xuid), k_GetPlayerActiveWeaponItemId, xuid); },
        GetPlayerModel: function _GetPlayerModel(xuid) { return _APIAccessor(GameStateAPI.GetPlayerModel(xuid), k_GetPlayerModel, xuid); },
        GetPlayerGungameLevel: function _GetPlayerGungameLevel(xuid) { return _APIAccessor(GameStateAPI.GetPlayerGungameLevel(xuid), k_GetPlayerGungameLevel, xuid); },
        GetPlayerItemCT: function _GetPlayerItemCT(panel) { return _APIAccessor(panel.GetPlayerItemCT(), k_GetPlayerItemCT); },
        GetPlayerItemTerrorist: function _GetPlayerItemTerrorist(panel) { return _APIAccessor(panel.GetPlayerItemTerrorist(), k_GetPlayerItemTerrorist); },
        GetCharacterDefaultCheerByXuid: function _GetCharacterDefaultCheerByXuid(xuid) { return _APIAccessor(GameStateAPI.GetCharacterDefaultCheerByXuid(xuid), k_GetCharacterDefaultCheerByXuid, xuid); },
        GetCooperativePlayerTeamName: function _GetCooperativePlayerTeamName() { return _APIAccessor(GameStateAPI.GetCooperativePlayerTeamName(), k_GetCooperativePlayerTeamName); },
        GetAllPlayersMatchDataJSO: function _GetAllPlayersMatchDataJSO() { return _APIAccessor(GameStateAPI.GetAllPlayersMatchDataJSO(), k_GetAllPlayersMatchDataJSO); },
        GetPlayerCharacterItemID: function _GetPlayerCharacterItemID(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCharacterItemID(xuid), k_GetPlayerCharacterItemID); },
        GetFauxItemIDFromDefAndPaintIndex: function _GetFauxItemIDFromDefAndPaintIndex(defindex, paintid) { return _APIAccessor(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(defindex, paintid), k_GetFauxItemIDFromDefAndPaintIndex); },
        SetMockData: _SetMockData,
        GetMockData: _GetMockData,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja19hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9ja19hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQywyQ0FBMkM7QUFJM0MsSUFBSSxXQUFXLEdBQUcsQ0FBRTtJQUduQixNQUFNLHVCQUF1QixHQUFHLHlCQUF5QixDQUFDO0lBQzFELE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUM7SUFDOUMsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFDMUMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7SUFDeEMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDO0lBQ2xDLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUM7SUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQztJQUM5QyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQ2xELE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQztJQUN0QyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0lBQzVDLE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7SUFDdEQsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUNsRCxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0lBQ2hELE1BQU0sbUJBQW1CLEdBQUcscUJBQXFCLENBQUM7SUFDbEQsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFDMUMsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDO0lBQ3BDLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUM7SUFDOUQsTUFBTSxzQkFBc0IsR0FBRyx3QkFBd0IsQ0FBQztJQUN4RCxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQztJQUMxQyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQ2xELE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7SUFDdEQsTUFBTSwyQkFBMkIsR0FBRyw2QkFB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