"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="rating_emblem.ts" />
// pass game accessors through here to be able to inject dummy data in test cases
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
    const k_GetPlayerCompetitiveWins = "k_GetPlayerCompetitiveWins";
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
    const k_GetFauxItemIDFromDefAndPaintIndex = "k_GetFauxItemIDFromDefAndPaintIndex";
    const k_GetPlayerCompetitiveRankType = "k_GetPlayerCompetitiveRankType";
    const k_bSkillgroupDataReady = "k_bSkillgroupDataReady";
    const k_GetPipRankCount = "k_GetPipRankCount";
    const k_GetPlayerPremierRankStatsObject = "k_GetPlayerPremierRankStatsObject";
    var _m_mockData = _GetMockData();
    function _msg(msg) {
        $.Msg('MockAdapter: ' + msg);
    }
    function _GetRootPanel() {
        let parent = $.GetContextPanel().GetParent();
        let newParent;
        while (newParent = parent.GetParent())
            parent = newParent;
        return parent;
    }
    function _SetMockData(dummydata) {
        let elRoot = _GetRootPanel();
        elRoot.Data().m_mockData = dummydata;
    }
    function _GetMockData() {
        let elRoot = _GetRootPanel();
        if (!elRoot.Data().hasOwnProperty('m_mockData'))
            return undefined;
        else
            return elRoot.Data().m_mockData;
    }
    function _GetMockTables() {
        let elRoot = _GetRootPanel();
        if (!elRoot.Data().hasOwnProperty('m_mockTables'))
            return undefined;
        else
            return elRoot.Data().m_mockTables;
    }
    function _AddTable(name, table) {
        let elRoot = _GetRootPanel();
        if (!elRoot.Data().hasOwnProperty('m_mockTables'))
            elRoot.Data().m_mockTables = {};
        elRoot.Data().m_mockTables[name] = table;
    }
    function FindMockTable(key) {
        //	_msg( 'looking for ' + String(key) );
        const arrTablesInUse = _m_mockData.split(',');
        for (let group of arrTablesInUse) {
            let mockTables = _GetMockTables();
            if (mockTables && mockTables.hasOwnProperty(group) && mockTables[group].hasOwnProperty(key)) {
                //	_msg( 'found ' + String( key ) + ' in ' + String( group ) );
                return mockTables[group];
            }
        }
        // if ( MOCK_TABLE[ 'defaults' ]!.hasOwnProperty( key ) )
        // {
        // 	return MOCK_TABLE[ 'defaults' ];
        // }
        // else
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
        // is this a table with per player data?
        if (xuid !== -1 && table[key].hasOwnProperty(xuid)) {
            tableVal = table[key][xuid];
        }
        else if (xuid !== -1 && !table[key].hasOwnProperty(xuid)) // xuid isn't in the table, just take the first entry
         {
            tableVal = table[key][0];
        }
        else {
            tableVal = table[key];
        }
        // if the entry is a function, evaluate the function
        if (tableVal && typeof tableVal === "function") {
            return tableVal(xuid);
        }
        else {
            return tableVal;
        }
    }
    const _getLoadoutWeapons = function (team) {
        //	$.Msg( '_getLoadoutWeapons' );
        const list = [];
        const slotStrings = LoadoutAPI.GetLoadoutSlotNames(false);
        const slots = JSON.parse(slotStrings);
        slots.forEach(slot => {
            const itemId = LoadoutAPI.GetItemID(team, slot);
            const bIsWeapon = ItemInfo.IsWeapon(itemId);
            //$.Msg( ItemInfo.GetName( itemId ) + " " + bIsWeapon );
            if (bIsWeapon) {
                list.push(itemId);
            }
        });
        return list;
    };
    function _GetRandomWeaponFromLoadout() {
        //	return "17293822569102704672";
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
        // for ( const i = 0; i < 50; i++ )
        // {
        // 	$.Msg( _r( 0, 2 ) );
        // }
        return (models[teamnum][random]);
    }
    let MOCK_TABLE = {
        //DEVONLY{
        "defaults": {
            k_GetTeamClanName: {
                TERRORIST: "Terrorists",
                CT: "Counter-Terrorists"
            },
            k_GetMapBSPName: "de_mirage",
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_Final_Won",
                "winning_team_number": 2,
                "losing_team_number": 3,
                "winning_player": "0"
            },
            k_GetLocalPlayerXuid: "1",
            k_GetTeamLogoImagePath: "/icons/ct_logo.svg",
            k_GetPlayerItemCT: "characters/models/ctm_st6_constiantd.vmdl",
            k_GetPlayerItemTerrorist: "characters/models/tm_balkan/tm_balkan_constiante.vmdl",
            k_IsPlayerConnected: true,
            k_IsFakePlayer: false,
            k_GetTimeDataJSO: {
                "gamephase": 5,
                "has_halftime": false,
                "maxrounds": 1,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 1,
                "first_round_this_period": 1,
                "last_round_this_period": 1,
                "overtime": 0,
                "roundtime": 135,
                "maptime": 0,
                "roundtime_remaining": 131,
                "roundtime_elapsed": 3,
                "maptime_remaining": -1,
                "maptime_elapsed": 45,
                "rounds_remaining": -1,
                "rounds_played": 2,
                "num_wins_to_clinch": 1,
                "num_wins_to_clinch_this_period": 1,
                "can_clinch": 1,
                "time": 953
            },
            k_GetPlayerSlot: {
                "1": "1",
                "3": "3",
                "5": "5",
                "7": "7",
                "9": "9",
                "2": "2",
                "4": "4",
                "6": "6",
                "8": "8",
                "10": "10",
                "11": "11",
                "13": "13",
                "15": "15",
                "17": "17",
                "19": "19",
                "12": "12",
                "14": "14",
                "16": "16",
                "18": "18",
                "20": "20"
            },
            k_GetPlayerStatus: 0,
            k_GetPlayerDataJSO: {
                "CT": {
                    "1": "1",
                    "3": "3",
                    "5": "5",
                    "7": "7",
                    "9": "9",
                    "11": "11",
                    "13": "13",
                    "15": "15",
                    "17": "17",
                    "19": "19"
                },
                "TERRORIST": {
                    "2": "2",
                    "4": "4",
                    "6": "6",
                    "8": "8",
                    "10": "10",
                    "12": "12",
                    "14": "14",
                    "16": "16",
                    "18": "18",
                    "20": "20"
                }
            },
            k_GetPlayerTeamName: {
                "1": "CT",
                "3": "CT",
                "5": "CT",
                "7": "CT",
                "9": "CT",
                "11": "CT",
                "13": "CT",
                "15": "CT",
                "17": "CT",
                "19": "CT",
                "2": "TERRORIST",
                "4": "TERRORIST",
                "6": "TERRORIST",
                "8": "TERRORIST",
                "10": "TERRORIST",
                "12": "TERRORIST",
                "14": "TERRORIST",
                "16": "TERRORIST",
                "18": "TERRORIST",
                "20": "TERRORIST"
            },
            k_GetPlayerTeamNumber: {
                "1": 3,
                "3": 3,
                "5": 3,
                "7": 3,
                "9": 3,
                "11": 3,
                "13": 3,
                "15": 3,
                "17": 3,
                "19": 3,
                "2": 2,
                "4": 2,
                "6": 2,
                "8": 2,
                "10": 2,
                "12": 2,
                "14": 2,
                "16": 2,
                "18": 2,
                "20": 2
            },
            k_GetPlayerName: {
                "1": "apple appleappleappleapple",
                "3": "banana bananabananabanana",
                "5": "pear pearpearpearpearpear",
                "7": "durian durianduriandurian",
                "9": "grape",
                "2": "kiwi",
                "4": "melon",
                "6": "strawberry",
                "8": "kumquat",
                "10": "orange",
                "11": "apple2",
                "13": "banana2",
                "15": "pear2",
                "17": "durian2",
                "19": "grape2",
                "12": "kiwi2",
                "14": "melon2",
                "16": "strawberry2",
                "18": "kumquat2",
                "20": "orange2",
            },
            k_GetPlayerActiveWeaponItemId: _GetRandomWeaponFromLoadout,
            k_GetPlayerModel: {
                "1": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "3": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "5": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "7": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "9": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "2": _GetRandomPlayerModel.bind(undefined, 't'),
                "4": _GetRandomPlayerModel.bind(undefined, 't'),
                "6": _GetRandomPlayerModel.bind(undefined, 't'),
                "8": _GetRandomPlayerModel.bind(undefined, 't'),
                "10": _GetRandomPlayerModel.bind(undefined, 't'),
                "11": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "13": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "15": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "17": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "19": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "12": _GetRandomPlayerModel.bind(undefined, 't'),
                "14": _GetRandomPlayerModel.bind(undefined, 't'),
                "16": _GetRandomPlayerModel.bind(undefined, 't'),
                "18": _GetRandomPlayerModel.bind(undefined, 't'),
                "20": _GetRandomPlayerModel.bind(undefined, 't'),
            },
            k_GetPlayerColor: {
                "1": "",
                "3": "",
                "5": "",
                "7": "",
                "9": "",
                "2": "",
                "4": "",
                "6": "",
                "8": "",
                "10": "",
                "11": "",
                "13": "",
                "15": "",
                "17": "",
                "19": "",
                "12": "",
                "14": "",
                "16": "",
                "18": "",
                "20": "", //"255 155 37",
            },
            k_GetPlayerStatsJSO: {
                "1": _GetRandomPlayerStatsJSO,
                "3": _GetRandomPlayerStatsJSO,
                "5": _GetRandomPlayerStatsJSO,
                "7": _GetRandomPlayerStatsJSO,
                "9": _GetRandomPlayerStatsJSO,
                "2": _GetRandomPlayerStatsJSO,
                "4": _GetRandomPlayerStatsJSO,
                "6": _GetRandomPlayerStatsJSO,
                "8": _GetRandomPlayerStatsJSO,
                "10": _GetRandomPlayerStatsJSO,
                "11": _GetRandomPlayerStatsJSO,
                "13": _GetRandomPlayerStatsJSO,
                "15": _GetRandomPlayerStatsJSO,
                "17": _GetRandomPlayerStatsJSO,
                "19": _GetRandomPlayerStatsJSO,
                "12": _GetRandomPlayerStatsJSO,
                "14": _GetRandomPlayerStatsJSO,
                "16": _GetRandomPlayerStatsJSO,
                "18": _GetRandomPlayerStatsJSO,
                "20": _GetRandomPlayerStatsJSO,
            },
            k_GetPlayerMVPs: {
                "1": _r(),
                "3": _r(),
                "5": _r(),
                "7": _r(),
                "9": _r(),
                "2": _r(),
                "4": _r(),
                "6": _r(),
                "8": _r(),
                "10": _r(),
                "11": _r(),
                "13": _r(),
                "15": _r(),
                "17": _r(),
                "19": _r(),
                "12": _r(),
                "14": _r(),
                "16": _r(),
                "18": _r(),
                "20": _r(),
            },
            k_GetPlayerScore: {
                "1": _r(),
                "3": _r(),
                "5": _r(),
                "7": _r(),
                "9": _r(),
                "2": _r(),
                "4": _r(),
                "6": _r(),
                "8": _r(),
                "10": _r(),
                "11": _r(),
                "13": _r(),
                "15": _r(),
                "17": _r(),
                "19": _r(),
                "12": _r(),
                "14": _r(),
                "16": _r(),
                "18": _r(),
                "20": _r(),
            },
            k_GetPlayerAssists: {
                "1": _r(),
                "3": _r(),
                "5": _r(),
                "7": _r(),
                "9": _r(),
                "2": _r(),
                "4": _r(),
                "6": _r(),
                "8": _r(),
                "10": _r(),
                "11": _r(),
                "13": _r(),
                "15": _r(),
                "17": _r(),
                "19": _r(),
                "12": _r(),
                "14": _r(),
                "16": _r(),
                "18": _r(),
                "20": _r(),
            },
            k_GetPlayerDeaths: {
                "1": _r(),
                "3": _r(),
                "5": _r(),
                "7": _r(),
                "9": _r(),
                "2": _r(),
                "4": _r(),
                "6": _r(),
                "8": _r(),
                "10": _r(),
                "11": _r(),
                "13": _r(),
                "15": _r(),
                "17": _r(),
                "19": _r(),
                "12": _r(),
                "14": _r(),
                "16": _r(),
                "18": _r(),
                "20": _r(),
            },
            k_AccoladesJSO: _GetRandomAccolades(),
            k_GetAllPlayersMatchDataJSO: {
                allplayerdata: [
                    {
                        entindex: "1",
                        isbot: true,
                        xuid: "1",
                        name: "Miller",
                        teamnumber: 2,
                        nomination: {
                            eaccolade: "9",
                            value: "102",
                            position: "2"
                        },
                        items: [
                            { itemid: _InternalGetFauxItemId(_GetRandomModelDefIndex(2), 0), defindex: _GetRandomModelDefIndex(2) },
                            { itemid: "17293822569102704644", defindex: "4" }
                        ]
                    },
                    {
                        entindex: "2", isbot: true, xuid: "2", name: "Nate", teamnumber: 3, nomination: { eaccolade: "5", value: "0", position: "1" },
                        items: [
                            { itemid: _InternalGetFauxItemId(_GetRandomModelDefIndex(3), 0), defindex: _GetRandomModelDefIndex(3) },
                            { itemid: "17293822569102704644", defindex: "4" }
                        ]
                    },
                    {
                        entindex: "3",
                        isbot: true,
                        xuid: "3",
                        name: "Steve",
                        teamnumber: 2,
                        nomination: {
                            eaccolade: "33",
                            value: "5",
                            position: "1"
                        },
                        items: [
                            { itemid: _InternalGetFauxItemId(5504, 0), defindex: "5504" },
                            { itemid: "17293822569102704699", defindex: "59", paintindex: "0", rarity: "0", quality: "0", stickers: [], origin: "4294967295", }
                        ]
                    },
                    { entindex: "5", isbot: true, xuid: "4", name: "Mark", teamnumber: 3, nomination: { eaccolade: "24", value: "1", position: "2" }, },
                    {
                        entindex: "6",
                        isbot: true,
                        xuid: "5",
                        name: "Colin",
                        teamnumber: 2,
                        nomination: {
                            eaccolade: "11",
                            value: "23",
                            position: "1"
                        },
                        items: [
                            { itemid: _InternalGetFauxItemId(5106, 0), defindex: "5106" },
                            { itemid: _InternalGetFauxItemId(9, 736), defindex: "5029", paintindex: "0", rarity: "1", quality: "0", stickers: [], origin: "4294967295", },
                            { itemid: "17293822569102704682", defindex: "42", paintindex: "0", rarity: "0", quality: "0", stickers: [], origin: "4294967295", }
                        ]
                    },
                    { entindex: "7", isbot: true, xuid: "6", name: "Will", teamnumber: 3, nomination: { eaccolade: "24", value: "1", position: "2" }, },
                    {
                        entindex: "8",
                        isbot: true,
                        xuid: "7",
                        name: "Jason",
                        teamnumber: 2,
                        nomination: {
                            eaccolade: "38",
                            value: "11",
                            position: "2"
                        },
                        items: [
                            { itemid: _InternalGetFauxItemId(5503, 0), defindex: "5503" },
                            { itemid: _InternalGetFauxItemId(28, 763), defindex: "", paintindex: "0", rarity: "1", quality: "0", stickers: [], origin: "4294967295", },
                        ]
                    },
                    { entindex: "9", isbot: true, xuid: "8", name: "Doug", teamnumber: 3, nomination: { eaccolade: "4", value: "0", position: "1" }, },
                    {
                        entindex: "10",
                        isbot: true,
                        xuid: "9",
                        name: "Adam",
                        teamnumber: 2,
                        nomination: {
                            eaccolade: "10",
                            value: "8",
                            position: "1"
                        },
                        items: [
                            { itemid: _InternalGetFauxItemId(5502, 0), defindex: "5502" },
                            { itemid: _InternalGetFauxItemId(518, 38), defindex: "5028", paintindex: "0", rarity: "1", quality: "0", stickers: [], origin: "4294967295", },
                        ]
                    },
                    { entindex: "11", isbot: true, xuid: "10", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "12", isbot: true, xuid: "11", name: "Mike", teamnumber: 2, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "13", isbot: true, xuid: "12", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "14", isbot: true, xuid: "13", name: "Mike", teamnumber: 2, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "15", isbot: true, xuid: "14", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "16", isbot: true, xuid: "15", name: "Mike", teamnumber: 2, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "17", isbot: true, xuid: "16", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "18", isbot: true, xuid: "17", name: "Mike", teamnumber: 2, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "19", isbot: true, xuid: "18", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "20", isbot: true, xuid: "19", name: "Mike", teamnumber: 2, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                    { entindex: "21", isbot: true, xuid: "20", name: "Mike", teamnumber: 3, nomination: { eaccolade: "3", value: "0", position: "1" }, },
                ],
                scene: 5,
            }
        },
        "char_balkan": {
            k_GetPlayerModel: {
                "1": "characters/models/tm_balkan/tm_balkan_constianth.vmdl",
                "3": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "5": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "7": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "9": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "2": "characters/models/tm_balkan/tm_balkan_constianth.vmdl",
                "4": _GetRandomPlayerModel.bind(undefined, 't'),
                "6": _GetRandomPlayerModel.bind(undefined, 't'),
                "8": _GetRandomPlayerModel.bind(undefined, 't'),
                "10": _GetRandomPlayerModel.bind(undefined, 't'),
                "11": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "13": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "15": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "17": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "19": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "12": _GetRandomPlayerModel.bind(undefined, 't'),
                "14": _GetRandomPlayerModel.bind(undefined, 't'),
                "16": _GetRandomPlayerModel.bind(undefined, 't'),
                "18": _GetRandomPlayerModel.bind(undefined, 't'),
                "20": _GetRandomPlayerModel.bind(undefined, 't'),
            },
            k_GetCharacterDefaultCheerByXuid: {
                "1": "punching",
                "3": "",
                "5": "",
                "7": "",
                "9": "",
                "2": "punching",
                "4": "",
                "6": "",
                "8": "",
                "10": "",
                "11": "",
                "13": "",
                "15": "",
                "17": "",
                "19": "",
                "12": "",
                "14": "",
                "16": "",
                "18": "",
                "20": "",
            },
        },
        "char_elite": {
            k_GetPlayerModel: {
                "1": "characters/models/tm_leet/tm_leet_constiantf.vmdl",
                "3": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "5": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "7": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "9": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "2": "characters/models/tm_leet/tm_leet_constiantf.vmdl",
                "4": _GetRandomPlayerModel.bind(undefined, 't'),
                "6": _GetRandomPlayerModel.bind(undefined, 't'),
                "8": _GetRandomPlayerModel.bind(undefined, 't'),
                "10": _GetRandomPlayerModel.bind(undefined, 't'),
                "11": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "13": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "15": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "17": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "19": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "12": _GetRandomPlayerModel.bind(undefined, 't'),
                "14": _GetRandomPlayerModel.bind(undefined, 't'),
                "16": _GetRandomPlayerModel.bind(undefined, 't'),
                "18": _GetRandomPlayerModel.bind(undefined, 't'),
                "20": _GetRandomPlayerModel.bind(undefined, 't'),
            },
            k_GetCharacterDefaultCheerByXuid: {
                "1": "swagger",
                "3": "",
                "5": "",
                "7": "",
                "9": "",
                "2": "swagger",
                "4": "",
                "6": "",
                "8": "",
                "10": "",
                "11": "",
                "13": "",
                "15": "",
                "17": "",
                "19": "",
                "12": "",
                "14": "",
                "16": "",
                "18": "",
                "20": "",
            },
        },
        "char_fbi": {
            k_GetPlayerModel: {
                "1": "characters/models/ctm_fbi/ctm_fbi_constiantb.vmdl",
                "3": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "5": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "7": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "9": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "2": "characters/models/ctm_fbi/ctm_fbi_constiantb.vmdl",
                "4": _GetRandomPlayerModel.bind(undefined, 't'),
                "6": _GetRandomPlayerModel.bind(undefined, 't'),
                "8": _GetRandomPlayerModel.bind(undefined, 't'),
                "10": _GetRandomPlayerModel.bind(undefined, 't'),
                "11": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "13": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "15": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "17": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "19": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "12": _GetRandomPlayerModel.bind(undefined, 't'),
                "14": _GetRandomPlayerModel.bind(undefined, 't'),
                "16": _GetRandomPlayerModel.bind(undefined, 't'),
                "18": _GetRandomPlayerModel.bind(undefined, 't'),
                "20": _GetRandomPlayerModel.bind(undefined, 't'),
            },
            k_GetCharacterDefaultCheerByXuid: {
                "1": "stretch",
                "3": "",
                "5": "",
                "7": "",
                "9": "",
                "2": "stretch",
                "4": "",
                "6": "",
                "8": "",
                "10": "",
                "11": "",
                "13": "",
                "15": "",
                "17": "",
                "19": "",
                "12": "",
                "14": "",
                "16": "",
                "18": "",
                "20": "",
            },
        },
        "char_st6": {
            k_GetPlayerModel: {
                "1": "characters/models/ctm_st6_constianti.vmdl",
                "3": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "5": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "7": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "9": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "2": "characters/models/ctm_st6_constianti.vmdl",
                "4": _GetRandomPlayerModel.bind(undefined, 't'),
                "6": _GetRandomPlayerModel.bind(undefined, 't'),
                "8": _GetRandomPlayerModel.bind(undefined, 't'),
                "10": _GetRandomPlayerModel.bind(undefined, 't'),
                "11": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "13": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "15": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "17": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "19": _GetRandomPlayerModel.bind(undefined, 'ct'),
                "12": _GetRandomPlayerModel.bind(undefined, 't'),
                "14": _GetRandomPlayerModel.bind(undefined, 't'),
                "16": _GetRandomPlayerModel.bind(undefined, 't'),
                "18": _GetRandomPlayerModel.bind(undefined, 't'),
                "20": _GetRandomPlayerModel.bind(undefined, 't'),
            },
            k_GetCharacterDefaultCheerByXuid: {
                "1": "dropdown",
                "3": "",
                "5": "",
                "7": "",
                "9": "",
                "2": "dropdown",
                "4": "",
                "6": "",
                "8": "",
                "10": "",
                "11": "",
                "13": "",
                "15": "",
                "17": "",
                "19": "",
                "12": "",
                "14": "",
                "16": "",
                "18": "",
                "20": "",
            },
        },
        "team_ct": {
            k_GetLocalPlayerXuid: "2",
        },
        "team_t": {
            k_GetLocalPlayerXuid: "1",
        },
        "vs5ct": {
            k_GetLocalPlayerXuid: "1",
            k_GetGameModeInternalName: "competitive",
        },
        "vs5t": {
            k_GetLocalPlayerXuid: "2",
            k_GetGameModeInternalName: "competitive",
        },
        "vs2ct": {
            k_GetLocalPlayerXuid: "1",
            k_GetGameModeInternalName: "cooperative",
        },
        "vs2t": {
            k_GetLocalPlayerXuid: "2",
            k_GetGameModeInternalName: "cooperative",
        },
        "mode_wingman": {
            k_GetGameModeInternalName: "scrimcomp2v2",
            k_GetGameModeName: "wingman",
            k_GetTeamLivingPlayerCount: 2,
            k_GetPlayerDataJSO: {
                "CT": {
                    "1": "1",
                    "3": "3",
                },
                "TERRORIST": {
                    "2": "2",
                    "4": "4",
                }
            },
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_Final_Won",
                "winning_team_number": 3,
                "losing_team_number": 2,
                "winning_player": "0"
            },
            k_GetScoreDataJSO: {
                "teamdata": {
                    "Unassigned": {
                        "team_name": "Unassigned",
                        "team_number": 0,
                        "clan_id": 0,
                        "clan_name": "Unassigned",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "Spectator": {
                        "team_name": "Spectator",
                        "team_number": 1,
                        "clan_id": 0,
                        "clan_name": "SPECTATORS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "TERRORIST": {
                        "team_name": "TERRORIST",
                        "team_number": 2,
                        "clan_id": 0,
                        "clan_name": "TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "CT": {
                        "team_name": "CT",
                        "team_number": 3,
                        "clan_id": 20,
                        "clan_name": "VALVE",
                        "flag": "",
                        "logo": "",
                        "score": 1,
                        "score_1h": 1,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                },
                "rounddata": {
                    "1": {
                        "round": 1,
                        "result": "t_win_elimination",
                        "players_alive_CT": 0,
                        "players_alive_TERRORIST": 1
                    },
                },
            },
            k_GetTimeDataJSO: {
                "gamephase": 5,
                "has_halftime": false,
                "maxrounds": 1,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 1,
                "first_round_this_period": 1,
                "last_round_this_period": 1,
                "overtime": 0,
                "roundtime": 135,
                "maptime": 0,
                "roundtime_remaining": 131,
                "roundtime_elapsed": 3,
                "maptime_remaining": -1,
                "maptime_elapsed": 45,
                "rounds_remaining": -1,
                "rounds_played": 2,
                "num_wins_to_clinch": 1,
                "num_wins_to_clinch_this_period": 1,
                "can_clinch": 1,
                "time": 953
            },
        },
        "mode_guardian": {
            k_GetLocalPlayerXuid: "2",
            k_GetGameModeInternalName: "cooperative",
            k_GetGameModeName: "cooperative",
            k_GetCooperativePlayerTeamName: "ct",
            k_GetTeamLivingPlayerCount: 2,
            k_GetPlayerDataJSO: {
                "CT": {
                    "1": "1",
                    "3": "3",
                },
                "TERRORIST": {
                    "2": "2",
                    "4": "4",
                }
            },
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_Final_Won",
                "winning_team_number": 3,
                "losing_team_number": 2,
                "winning_player": "0"
            },
            k_GetScoreDataJSO: {
                "teamdata": {
                    "Unassigned": {
                        "team_name": "Unassigned",
                        "team_number": 0,
                        "clan_id": 0,
                        "clan_name": "Unassigned",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "Spectator": {
                        "team_name": "Spectator",
                        "team_number": 1,
                        "clan_id": 0,
                        "clan_name": "SPECTATORS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "TERRORIST": {
                        "team_name": "TERRORIST",
                        "team_number": 2,
                        "clan_id": 0,
                        "clan_name": "TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "CT": {
                        "team_name": "CT",
                        "team_number": 3,
                        "clan_id": 20,
                        "clan_name": "VALVE",
                        "flag": "",
                        "logo": "",
                        "score": 1,
                        "score_1h": 1,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                },
                "rounddata": {
                    "1": {
                        "round": 1,
                        "result": "t_win_elimination",
                        "players_alive_CT": 0,
                        "players_alive_TERRORIST": 1
                    },
                },
            },
            k_GetTimeDataJSO: {
                "gamephase": 5,
                "has_halftime": false,
                "maxrounds": 1,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 1,
                "first_round_this_period": 1,
                "last_round_this_period": 1,
                "overtime": 0,
                "roundtime": 135,
                "maptime": 0,
                "roundtime_remaining": 131,
                "roundtime_elapsed": 3,
                "maptime_remaining": -1,
                "maptime_elapsed": 45,
                "rounds_remaining": -1,
                "rounds_played": 2,
                "num_wins_to_clinch": 1,
                "num_wins_to_clinch_this_period": 1,
                "can_clinch": 1,
                "time": 953
            },
        },
        "mode_comp": {
            k_GetGameModeInternalName: "competitive",
            k_GetGameModeName: "competitive",
            k_GetTeamLivingPlayerCount: 5,
            k_GetPlayerDataJSO: {
                "CT": {
                    "1": "1",
                    "3": "3",
                    "5": "5",
                    "7": "7",
                    "9": "9"
                },
                "TERRORIST": {
                    "2": "2",
                    "4": "4",
                    "6": "6",
                    "8": "8",
                    "10": "10"
                }
            },
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_Final_Won",
                "winning_team_number": 2,
                "losing_team_number": 3,
                "winning_player": "0"
            },
            k_GetScoreDataJSO: {
                "teamdata": {
                    "Unassigned": {
                        "team_name": "Unassigned",
                        "team_number": 0,
                        "clan_id": 0,
                        "clan_name": "Unassigned",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "Spectator": {
                        "team_name": "Spectator",
                        "team_number": 1,
                        "clan_id": 0,
                        "clan_name": "SPECTATORS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "TERRORIST": {
                        "team_name": "TERRORIST",
                        "team_number": 2,
                        "clan_id": 0,
                        "clan_name": "TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "CT": {
                        "team_name": "CT",
                        "team_number": 3,
                        "clan_id": 20,
                        "clan_name": "VALVE",
                        "flag": "",
                        "logo": "",
                        "score": 1,
                        "score_1h": 1,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                },
                "rounddata": {
                    "1": {
                        "round": 1,
                        "result": "t_win_elimination",
                        "players_alive_CT": 0,
                        "players_alive_TERRORIST": 1
                    },
                },
            },
            k_GetTimeDataJSO: {
                "gamephase": 5,
                "has_halftime": false,
                "maxrounds": 1,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 1,
                "first_round_this_period": 1,
                "last_round_this_period": 1,
                "overtime": 0,
                "roundtime": 135,
                "maptime": 0,
                "roundtime_remaining": 131,
                "roundtime_elapsed": 3,
                "maptime_remaining": -1,
                "maptime_elapsed": 45,
                "rounds_remaining": -1,
                "rounds_played": 2,
                "num_wins_to_clinch": 1,
                "num_wins_to_clinch_this_period": 1,
                "can_clinch": 1,
                "time": 953
            },
            k_GetPlayerColor: {
                "1": "#F8F62D",
                "3": "#A119F0",
                "5": "#00B562",
                "7": "#5CA8FF",
                "9": "#FF9B25",
                "2": "#F8F62D",
                "4": "#A119F0",
                "6": "#00B562",
                "8": "#5CA8FF",
                "10": "#FF9B25", //"255 155 37",
            }
        },
        "mode_cas": {
            k_GetGameModeInternalName: "casual",
            k_GetGameModeName: "casual",
            k_GetTeamLivingPlayerCount: 10,
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_Final_Won",
                "winning_team_number": 3,
                "losing_team_number": 2,
                "winning_player": "0"
            },
            k_GetScoreDataJSO: {
                "teamdata": {
                    "Unassigned": {
                        "team_name": "Unassigned",
                        "team_number": 0,
                        "clan_id": 0,
                        "clan_name": "Unassigned",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "Spectator": {
                        "team_name": "Spectator",
                        "team_number": 1,
                        "clan_id": 0,
                        "clan_name": "SPECTATORS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "score_1h": 0,
                        "score_2h": 0,
                        "map_victories": 0
                    },
                    "TERRORIST": {
                        "team_name": "TERRORIST",
                        "team_number": 2,
                        "clan_id": 0,
                        "clan_name": "TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 12,
                        "score_1h": 8,
                        "score_2h": 4,
                        "map_victories": 0
                    },
                    "CT": {
                        "team_name": "CT",
                        "team_number": 3,
                        "clan_id": 20,
                        "clan_name": "VALVE",
                        "flag": "",
                        "logo": "",
                        "score": 16,
                        "score_1h": 7,
                        "score_2h": 9,
                        "map_victories": 0
                    },
                },
                "rounddata": {
                    "1": {
                        "round": 1,
                        "result": "t_win_elimination",
                        "players_alive_CT": 0,
                        "players_alive_TERRORIST": 1
                    },
                },
            },
            k_GetTimeDataJSO: {
                "gamephase": 5,
                "has_halftime": false,
                "maxrounds": 16,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 1,
                "first_round_this_period": 1,
                "last_round_this_period": 1,
                "overtime": 0,
                "roundtime": 135,
                "maptime": 0,
                "roundtime_remaining": 131,
                "roundtime_elapsed": 3,
                "maptime_remaining": -1,
                "maptime_elapsed": 45,
                "rounds_remaining": -1,
                "rounds_played": 28,
                "num_wins_to_clinch": 1,
                "num_wins_to_clinch_this_period": 1,
                "can_clinch": 1,
                "time": 953
            },
        },
        // ARMS RACE
        "mode_armsrace": {
            k_GetGameModeInternalName: "gungameprogressive",
            k_GetGameModeName: "Arms Race",
            k_GetTeamLivingPlayerCount: 20,
            k_GetPlayerDataJSO: {
                "CT": {
                    "1": "1",
                    "3": "3",
                    "5": "5",
                    "7": "7",
                    "9": "9",
                    "11": "11",
                    "13": "13",
                    "15": "15",
                    "17": "17",
                    "19": "19"
                },
                "TERRORIST": {
                    "2": "2",
                    "4": "4",
                    "6": "6",
                    "8": "8",
                    "10": "10",
                    "12": "12",
                    "14": "14",
                    "16": "16",
                    "18": "18",
                    "20": "20"
                }
            },
            k_GetMatchEndWinDataJSO: {
                "text": "#Scoreboard_GG_The_Winner",
                "winning_team_number": 3,
                "losing_team_number": 0,
                "winning_player": "76561197960423941"
            },
            k_GetScoreDataJSO: {
                "teamdata": {
                    "Unassigned": {
                        "team_name": "Unassigned",
                        "team_number": 0,
                        "clan_id": 0,
                        "clan_name": "Unassigned",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "map_victories": 0
                    },
                    "Spectator": {
                        "team_name": "Spectator",
                        "team_number": 1,
                        "clan_id": 0,
                        "clan_name": "SPECTATORS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "map_victories": 0
                    },
                    "TERRORIST": {
                        "team_name": "TERRORIST",
                        "team_number": 2,
                        "clan_id": 0,
                        "clan_name": "TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "map_victories": 0
                    },
                    "CT": {
                        "team_name": "CT",
                        "team_number": 3,
                        "clan_id": 0,
                        "clan_name": "COUNTER-TERRORISTS",
                        "flag": "",
                        "logo": "",
                        "score": 0,
                        "map_victories": 0
                    }
                },
                "rounddata": {}
            },
            k_GetTimeDataJSO: {
                "gamephase": 0,
                "has_halftime": false,
                "maxrounds": 10,
                "maxrounds_overtime": 6,
                "maxrounds_this_period": 10,
                "first_round_this_period": 1,
                "last_round_this_period": 10,
                "overtime": 0,
                "roundtime": 1800,
                "maptime": 30,
                "roundtime_remaining": 1798,
                "roundtime_elapsed": 1,
                "maptime_remaining": 1798,
                "maptime_elapsed": 1,
                "rounds_remaining": 10,
                "rounds_played": 0,
                "num_wins_to_clinch": -1,
                "num_wins_to_clinch_this_period": 6,
                "can_clinch": 0,
                "time": 30
                // Key for game Phase
                // GAMEPHASE_WARMUP_ROUND                0
                // GAMEPHASE_PLAYING_STANDARD            1
                // GAMEPHASE_PLAYING_FIRST_HALF          2
                // GAMEPHASE_PLAYING_SECOND_HALF         3
                // GAMEPHASE_HALFTIME                    4
                // GAMEPHASE_MATCH_ENDED                 5
            },
        },
        "RANK_up": {
            k_XpDataJSO: _GetRandomXP,
        },
        "SKILLGROUP_up": {
            k_SkillgroupDataJSO: _GetRandomSkillGroup,
        },
        "DROPS": {
            k_DropListJSO: {
                "0": {
                    "item_id": "17221764975064776756",
                    "owner_xuid": "148618791998203739",
                    "display_time": 3.5,
                    "faux_item_id": "17293822569125249033",
                    "owner_team": 3,
                    "rarity": 1,
                    "is_local": 1,
                    "reason": 0
                },
                "1": {
                    "item_id": "17221764975064776755",
                    "owner_xuid": "148618791998203739",
                    "display_time": 3.5,
                    "faux_item_id": "17293822569125249033",
                    "owner_team": 3,
                    "rarity": 1,
                    "is_local": 1,
                    "reason": 0
                },
                "2": {
                    "item_id": "17221764975064776759",
                    "owner_xuid": "148618791998203739",
                    "display_time": 2,
                    "faux_item_id": "17293822569125249033",
                    "owner_team": 2,
                    "rarity": 3,
                    "is_local": 1,
                    "reason": 0
                },
                "3": {
                    "item_id": "17221764975064776753",
                    "owner_xuid": "148618791998203739",
                    "display_time": 1,
                    "faux_item_id": "17293822569125249033",
                    "owner_team": 2,
                    "rarity": 3,
                    "is_local": 1,
                    "reason": 0
                },
                "4": {
                    "item_id": "17221764975064776757",
                    "owner_xuid": "148618791998203739",
                    "display_time": 0.5,
                    "faux_item_id": "17293822569125249033",
                    "owner_team": 2,
                    "rarity": 5,
                    "is_local": 1,
                    "reason": 0
                },
            },
        },
        "VOTING": {
            k_NextMatchVotingData: {
                "votes_to_succeed": 4,
                "voting_done": 0,
                "voting_winner": -1,
                "voting_options": {
                    "0": {
                        "type": "map",
                        "name": "de_mirage",
                        "votes": 0
                    },
                    "1": {
                        "type": "map",
                        "name": "de_inferno",
                        "votes": 1
                    },
                    "2": {
                        "type": "map",
                        "name": "de_overpass",
                        "votes": 2
                    },
                    "3": {
                        "type": "map",
                        "name": "de_nuke",
                        "votes": 3
                    },
                    "4": {
                        "type": "map",
                        "name": "de_train",
                        "votes": 4
                    },
                    "5": {
                        "type": "map",
                        "name": "de_cache",
                        "votes": 0
                    },
                },
            },
        },
        //}DEVONLY	
    };
    /* Public interface */
    return {
        AddTable: _AddTable,
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
        GetPlayerCompetitiveWins: function _GetPlayerCompetitiveWins(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCompetitiveWins(xuid), k_GetPlayerCompetitiveWins); },
        GetPlayerXpLevel: function _GetPlayerXpLevel(xuid) { return _APIAccessor(GameStateAPI.GetPlayerXpLevel(xuid), k_GetPlayerXpLevel, xuid); },
        GetTeamGungameLeaderXuid: function _GetTeamGungameLeaderXuid(xuid) { return _APIAccessor(GameStateAPI.GetTeamGungameLeaderXuid(xuid), k_GetTeamGungameLeaderXuid); },
        GetPlayerScore: function _GetPlayerScore(xuid) { return _APIAccessor(GameStateAPI.GetPlayerScore(xuid), k_GetPlayerScore, xuid); },
        GetPlayerMVPs: function _GetPlayerMVPs(xuid) { return _APIAccessor(GameStateAPI.GetPlayerMVPs(xuid), k_GetPlayerMVPs, xuid); },
        GetPlayerKills: function _GetPlayerKills(xuid) { return _APIAccessor(GameStateAPI.GetPlayerKills(xuid), k_GetPlayerKills, xuid); },
        GetPlayerAssists: function _GetPlayerAssists(xuid) { return _APIAccessor(GameStateAPI.GetPlayerAssists(xuid), k_GetPlayerAssists, xuid); },
        GetPlayerDeaths: function _GetPlayerDeaths(xuid) { return _APIAccessor(GameStateAPI.GetPlayerDeaths(xuid), k_GetPlayerDeaths, xuid); },
        GetPlayerPing: function _GetPlayerPing(xuid) { return _APIAccessor(GameStateAPI.GetPlayerPing(xuid), k_GetPlayerPing, xuid); },
        // GetMusicIDForPlayer: function _GetMusicIDForPlayer ( xuid: string ) { return _APIAccessor( InventoryAPI.GetMusicIDForPlayer( xuid ), k_GetMusicIDForPlayer, xuid ); },
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
        // AccoladesJSO: function _AccoladesJSO ( panel ) { return _APIAccessor( panel.AccoladesJSO, k_AccoladesJSO ); },
        GetCharacterDefaultCheerByXuid: function _GetCharacterDefaultCheerByXuid(xuid) { return _APIAccessor(GameStateAPI.GetCharacterDefaultCheerByXuid(xuid), k_GetCharacterDefaultCheerByXuid, xuid); },
        GetCooperativePlayerTeamName: function _GetCooperativePlayerTeamName() { return _APIAccessor(GameStateAPI.GetCooperativePlayerTeamName(), k_GetCooperativePlayerTeamName); },
        GetAllPlayersMatchDataJSO: function _GetAllPlayersMatchDataJSO() { return _APIAccessor(GameStateAPI.GetAllPlayersMatchDataJSO(), k_GetAllPlayersMatchDataJSO); },
        GetPlayerCharacterItemID: function _GetPlayerCharacterItemID(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCharacterItemID(xuid), k_GetPlayerCharacterItemID); },
        GetFauxItemIDFromDefAndPaintIndex: function _GetFauxItemIDFromDefAndPaintIndex(defindex, paintid) { return _APIAccessor(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(defindex, paintid), k_GetFauxItemIDFromDefAndPaintIndex); },
        GetPlayerCompetitiveRankType: function _GetPlayerCompetitiveRankType(xuid) { return _APIAccessor(GameStateAPI.GetPlayerCompetitiveRankType(xuid), k_GetPlayerCompetitiveRankType, xuid); },
        bSkillgroupDataReady: function _bSkillgroupDataReady(panel) { return _APIAccessor(panel.bSkillgroupDataReady, k_bSkillgroupDataReady); },
        GetPipRankCount: function _GetPipRankCount(type) { return _APIAccessor(MyPersonaAPI.GetPipRankCount(type), k_GetPipRankCount); },
        GetPlayerPremierRankStatsObject: function (xuid) { return _APIAccessor(GameStateAPI.GetPlayerPremierRankStatsObject(xuid), k_GetPlayerPremierRankStatsObject, xuid); },
        SetMockData: _SetMockData,
        GetMockData: _GetMockData,
    };
})();
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja19hZGFwdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9ja19hZGFwdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsMkNBQTJDO0FBQzNDLHlDQUF5QztBQUV6QyxpRkFBaUY7QUFFakYsSUFBSSxXQUFXLEdBQUcsQ0FBRTtJQUduQixNQUFNLHVCQUF1QixHQUFHLHlCQUF5QixDQUFDO0lBQzFELE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUM7SUFDOUMsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFDMUMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7SUFDeEMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDO0lBQ2xDLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUM7SUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQztJQUM5QyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQ2xELE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQztJQUN0QyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0lBQzVDLE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7SUFDdEQsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQztJQUNsRCxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0lBQ2hELE1BQU0sbUJBQW1CLEdBQUcscUJBQXFCLENBQUM7SUFDbEQsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQUM7SUFDMUMsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDO0lBQ3BDLE1BQU0seUJBQXlCLEdBQUcsMkJBQTJCLENBQUM7SUFDOUQsTUFBTSxzQkFBc0IsR0FBRyx3QkFBd0IsQ0FBQztJQUN4RCxNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQztJQUMxQyxNQUFNLG1CQUFtQixHQUFHLHFCQUFxQixDQUFDO0lBQ2xELE1BQU0scUJBQXFCLEdBQUcsdUJBQXVCLENBQUM7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QUFHLENBQUU7Z0JBQ2pELElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBRTtnQkFFbEQsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBRSxTQUFTLEVBQUUsSUFBSSxDQUFFO2dCQUNuRCxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSSxDQUFFLFNBQVMsRUFBRSxJQUFJLENBQUU7Z0JBQ25ELElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUUsU0FBUyxFQUFFLElBQUksQ0FBRTtnQkFDbkQsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBRSxTQUFTLEVBQUUsSUFBSSxDQUFFO2dCQUNuRCxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSSxDQUFFLFNBQVMsRUFBRSxJQUFJLENBQUU7Z0JBRW5ELElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBRTtnQkFDbEQsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBRSxTQUFTLEVBQUUsR0FBRyxDQUFFO2dCQUNsRCxJQUFJLEVBQUUscUJBQXFCLENBQUMsSUFBSSxDQUFFLFNBQVMsRUFBRSxHQUFHLENBQUU7Z0JBQ2xELElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJLENBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBRTtnQkFDbEQsSUFBSSxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBRSxTQUFTLEVBQUUsR0FBRyxDQUFFO2FBQ2xEO1lBTUQsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUVQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLEdBQUcsRUFBRSxFQUFFO2dCQUNQLElBQUksRUFBRSxFQUFFO2dCQUVSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUVSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFO2dCQUNSLElBQUksRUFBRSxFQUFFLEVBQUMsZUFBZTthQUN4QjtZQUVELG1CQUFtQixFQUFFO2dCQUNwQixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUU3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixHQUFHLEVBQUUsd0JBQXdCO2dCQUM3QixJQUFJLEVBQUUsd0JBQXdCO2dCQUU5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUU5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixJQUFJLEVBQUUsd0JBQXdCO2FBQzlCO1lBRUQsZUFBZSxFQUFFO2dCQUNoQixHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBRVQsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUVWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFFVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7YUFDVjtZQUVELGdCQUFnQixFQUFFO2dCQUNqQixHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBRVQsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUVWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFFVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7YUFDVjtZQUVELGtCQUFrQixFQUFFO2dCQUNuQixHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBRVQsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUVWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFFVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNWLElBQUksRUFBRSxFQUFFLEVBQUU7YUFDVjtZQUVELGlCQUFpQixFQUFFO2dCQUNsQixHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBRVQsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxHQUFHLEVBQUUsRUFBRSxFQUFFO2dCQUNULEdBQUcsRUFBRSxFQUFFLEVBQUU7Z0JBQ1QsR0FBRyxFQUFFLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUVWLElBQUksRUFBRSxFQUFFLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEVBQUUsRUFBRTtnQkFDVixJQUFJLEVBQUUsRUFBRSxF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RyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLFlBQVksR0FBRzt5QkFDaEo7cUJBQ0Y7b0JBRUQsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRztvQkFDcEksRUFBRSxR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