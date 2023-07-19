/// <reference path="csgo.d.ts" />
/// <reference path="endofmatch.ts" />
/// <reference path="scoreboard.ts" />
/// <reference path="player_stats_card.ts" />
/// <reference path="mock_adapter.ts" />
var EOM_Characters = (function () {
    let _m_arrAllPlayersMatchDataJSO = [];
    let _m_localPlayer = null;
    let _m_teamToShow = null;
    const ACCOLADE_START_TIME = 1;
    const DELAY_PER_PLAYER = 0.5;
    let m_bNoGimmeAccolades = false;
    function _GetSnippetForMode(mode) {
        switch (mode) {
            case 'scrimcomp2v2':
                return 'snippet-eom-chars__layout--scrimcomp2v2';
            case 'competitive':
            case 'gungametrbomb':
            case 'cooperative':
            case 'casual':
            case 'teamdm':
                return 'snippet-eom-chars__layout--classic';
            case 'gungameprogressive':
            case 'training':
            case 'deathmatch':
            case 'ffadm':
                return 'snippet-eom-chars__layout--ffa';
            default:
                return 'snippet-eom-chars__layout--classic';
        }
    }
    function _SetTeamLogo(team) {
        let elRoot = $('#id-eom-characters-root');
        let teamLogoPath = 'file://{images}/icons/ui/' + (team == 'ct' ? 'ct_logo_1c.svg' : 't_logo_1c.svg');
        let elTeamLogo = elRoot.FindChildTraverse('id-eom-chars__layout__logo--' + team);
        if (elTeamLogo) {
            elTeamLogo.SetImage(teamLogoPath);
        }
    }
    function _SetupPanel(mode) {
        let elRoot = $('#id-eom-characters-root');
        let snippet = _GetSnippetForMode(mode);
        elRoot.RemoveAndDeleteChildren();
        elRoot.BLoadLayoutSnippet(snippet);
        _SetTeamLogo('t');
        _SetTeamLogo('ct');
    }
    function _CollectPlayersForMode(mode) {
        let arrPlayerList = [];
        switch (mode) {
            case 'deathmatch':
            case 'ffadm':
            case 'gungameprogressive':
                {
                    let arrPlayerXuids = Scoreboard.GetFreeForAllTopThreePlayers();
                    if (MockAdapter.GetMockData() != undefined) {
                        arrPlayerXuids = ['1', '2', '3'];
                    }
                    arrPlayerList[0] = _m_arrAllPlayersMatchDataJSO.filter(o => o['xuid'] == arrPlayerXuids[0])[0];
                    arrPlayerList[1] = _m_arrAllPlayersMatchDataJSO.filter(o => o['xuid'] == arrPlayerXuids[1])[0];
                    arrPlayerList[2] = _m_arrAllPlayersMatchDataJSO.filter(o => o['xuid'] == arrPlayerXuids[2])[0];
                    m_bNoGimmeAccolades = true;
                    break;
                }
            case 'training':
            case 'scrimcomp2v2':
                {
                    let listCT = _CollectPlayersOfTeam('CT').slice(0, 2);
                    let listT = _CollectPlayersOfTeam('TERRORIST').slice(0, 2);
                    arrPlayerList = listCT.concat(listT);
                    m_bNoGimmeAccolades = false;
                    break;
                }
            case 'competitive':
            case 'casual':
            case 'gungametrbomb':
            case 'cooperative':
            case 'teamdm':
            default:
                {
                    arrPlayerList = _CollectPlayersOfTeam(_m_teamToShow);
                    arrPlayerList = arrPlayerList.sort(_SortByScoreFn);
                    m_bNoGimmeAccolades = false;
                    if (_m_localPlayer) {
                        arrPlayerList = arrPlayerList.filter(player => player['xuid'] != _m_localPlayer['xuid']);
                        arrPlayerList.splice(0, 0, _m_localPlayer);
                    }
                    break;
                }
        }
        if (arrPlayerList)
            arrPlayerList = arrPlayerList.slice(0, _GetNumCharsToShowForMode(mode));
        return arrPlayerList;
    }
    function _CollectPlayersOfTeam(teamName) {
        let teamNum = 0;
        switch (teamName) {
            case 'TERRORIST':
                teamNum = 2;
                break;
            case 'CT':
                teamNum = 3;
                break;
        }
        return _m_arrAllPlayersMatchDataJSO.filter(o => o['teamnumber'] == teamNum);
    }
    function _GetNumCharsToShowForMode(mode) {
        switch (mode) {
            case 'scrimcomp2v2':
                return 4;
            case 'competitive':
                return 5;
            case 'casual':
            case 'gungametrbomb':
            case 'teamdm':
                return 5;
            case 'cooperative':
                return 2;
            case 'gungameprogressive':
            case 'deathmatch':
            case 'ffadm':
                return 3;
            case 'training':
                return 1;
            default:
                return 5;
        }
    }
    function _ShouldDisplayCommendsInMode(mode) {
        if (MyPersonaAPI.GetElevatedState() !== 'elevated') {
            return false;
        }
        switch (mode) {
            case 'scrimcomp2v2':
            case 'competitive':
            case 'casual':
            case 'gungametrbomb':
            case 'cooperative':
            case 'teamdm':
                return true;
            case 'gungameprogressive':
            case 'deathmatch':
            case 'ffadm':
            case 'training':
            default:
                return false;
        }
    }
    function _GetModeForEndOfMatchPurposes() {
        let mode = MockAdapter.GetGameModeInternalName(false);
        if (mode == 'deathmatch') {
            if (GameInterfaceAPI.GetSettingString('mp_teammates_are_enemies') !== '0') {
                mode = 'ffadm';
            }
            else if (GameInterfaceAPI.GetSettingString('mp_dm_teammode') !== '0') {
                mode = 'teamdm';
            }
        }
        return mode;
    }
    function _ShowWinningTeam(mode) {
        return false;
    }
    let _DisplayMe = function () {
        let data = MockAdapter.GetAllPlayersMatchDataJSO();
        if (data && data.allplayerdata && data.allplayerdata.length > 0) {
            _m_arrAllPlayersMatchDataJSO = data.allplayerdata;
        }
        else {
            // @ts-ignore Ignore until endofmatch.js is TypeScript
            EndOfMatch.ToggleBetweenScoreboardAndCharacters();
            return false;
        }
        // @ts-ignore Ignore until endofmatch.js is TypeScript
        EndOfMatch.EnableToggleBetweenScoreboardAndCharacters();
        let localPlayerSet = _m_arrAllPlayersMatchDataJSO.filter(oPlayer => oPlayer['xuid'] == MockAdapter.GetLocalPlayerXuid());
        let localPlayer = (localPlayerSet.length > 0) ? localPlayerSet[0] : undefined;
        let teamNumToShow = 3;
        let mode = _GetModeForEndOfMatchPurposes();
        if (localPlayer && !_ShowWinningTeam(mode)) {
            _m_localPlayer = localPlayer;
            teamNumToShow = _m_localPlayer['teamnumber'];
        }
        else {
            let oMatchEndData = MockAdapter.GetMatchEndWinDataJSO();
            if (oMatchEndData)
                teamNumToShow = oMatchEndData['winning_team_number'];
            if (!teamNumToShow && localPlayer) {
                _m_localPlayer = localPlayer;
                teamNumToShow = _m_localPlayer['teamnumber'];
            }
        }
        if (teamNumToShow == 2) {
            _m_teamToShow = 'TERRORIST';
        }
        else {
            _m_teamToShow = 'CT';
        }
        _SetupPanel(mode);
        let arrPlayerList = _CollectPlayersForMode(mode);
        arrPlayerList = _SortPlayers(mode, arrPlayerList);
        let mapCheers = {};
        if (_m_localPlayer) {
            let arrLocalPlayer = _m_localPlayer.hasOwnProperty('items') ? _m_localPlayer.items.filter(oItem => ItemInfo.IsCharacter(oItem.itemid)) : [];
            let localPlayerModel = arrLocalPlayer[0];
            let localPlayerCheer = localPlayerModel ? ItemInfo.GetDefaultCheer(localPlayerModel['itemid']) : '';
            mapCheers[localPlayerCheer] = 1;
        }
        let gapIndex = -1;
        if (mode == 'scrimcomp2v2' && arrPlayerList.length > 0) {
            let firstTeamNum = arrPlayerList[0].teamnumber;
            gapIndex = arrPlayerList.findIndex(player => player.teamnumber != firstTeamNum);
        }
        $.GetContextPanel().SetPlayerCount(arrPlayerList.length + (gapIndex >= 0 ? 1 : 0));
        arrPlayerList.forEach(function (oPlayer, index) {
            if (oPlayer) {
                if (index >= gapIndex && gapIndex >= 0)
                    index += 1;
                let cheer = '';
                let playerModelItem = null;
                let sWeaponItemId = '';
                if ('items' in oPlayer) {
                    playerModelItem = oPlayer['items'].filter(oItem => ItemInfo.IsCharacter(oItem['itemid']))[0];
                    let playerWeaponItem = oPlayer['items'].filter(oItem => ItemInfo.IsWeapon(oItem['itemid']))[0];
                    if (playerWeaponItem) {
                        sWeaponItemId = playerWeaponItem['itemid'];
                    }
                }
                cheer = playerModelItem ? ItemInfo.GetDefaultCheer(playerModelItem['itemid']) : '';
                if (oPlayer != _m_localPlayer &&
                    mapCheers[cheer] == 1) {
                    cheer = '';
                }
                mapCheers[cheer] = 1;
                let label = oPlayer['xuid'];
                $.GetContextPanel().AddPlayer(index, label, sWeaponItemId, cheer);
            }
        });
        _CreatePlayerStatCards(arrPlayerList, gapIndex, m_bNoGimmeAccolades);
        return true;
    };
    function _DisplayPlayerStatsCard(elCardContainer, index, nPlayerCount) {
        let elEndOfMatch = $.GetContextPanel();
        let w = elEndOfMatch.actuallayoutwidth;
        let h = elEndOfMatch.actuallayoutheight;
        let xMin = 1080 * (w / h) * 0.5 - 720;
        let x = xMin + 1440 * ((index + 1) / (nPlayerCount + 1));
        let charPos = { x: x, y: 540 };
        if (elCardContainer && elCardContainer.IsValid()) {
            elCardContainer.style.x = charPos.x + 'px;';
            let elCard = elCardContainer.FindChildTraverse('card');
            elCardContainer.AddClass('reveal');
            $.Schedule(0.3, function () {
                playerStatsCard.RevealStats(elCard);
            });
        }
        if (!$.GetContextPanel().BAscendantHasClass('scoreboard-visible')) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.stats_reveal', 'MOUSE');
        }
    }
    function _CreatePlayerStatCards(arrPlayerList, gapIndex, bNoGimmes) {
        if (!arrPlayerList || arrPlayerList.length == 0)
            return;
        let arrBestStats = [
            { stat: 'adr', value: null, elCard: null },
            { stat: 'hsp', value: null, elCard: null },
            { stat: 'enemiesflashed', value: null, elCard: null },
            { stat: 'utilitydamage', value: null, elCard: null }
        ];
        let nPlayerCount = arrPlayerList.length + (gapIndex >= 0 ? 1 : 0);
        let elRoot = $('#id-eom-characters-root');
        arrPlayerList.forEach(function (oPlayer) {
            if (!oPlayer)
                return;
            let oTitle = oPlayer.nomination;
            let index = arrPlayerList.indexOf(oPlayer);
            if (index >= gapIndex && gapIndex >= 0)
                index += 1;
            if (oTitle != undefined) {
                let xuid = oPlayer.xuid;
                let elCardContainer = $.CreatePanel('Panel', elRoot, 'cardcontainer-' + xuid);
                elCardContainer.AddClass('player-stats-card-container');
                elCardContainer.style.zIndex = (index * 10).toString();
                let elCard = playerStatsCard.Init(elCardContainer, xuid, index);
                let accName = GameStateAPI.GetAccoladeLocalizationString(Number(oTitle.eaccolade));
                let showAccolade = !(bNoGimmes && accName.includes('gimme_'));
                if (showAccolade) {
                    let accValue = oTitle.value.toString();
                    let accPosition = oTitle.position.toString();
                    playerStatsCard.SetAccolade(elCard, accValue, accName, accPosition);
                }
                playerStatsCard.SetStats(elCard, xuid, arrBestStats);
                playerStatsCard.SetFlair(elCard, xuid);
                playerStatsCard.SetSkillGroup(elCard, xuid);
                playerStatsCard.SetAvatar(elCard, xuid);
                playerStatsCard.SetTeammateColor(elCard, xuid);
                $.Schedule(ACCOLADE_START_TIME + (index * DELAY_PER_PLAYER), _DisplayPlayerStatsCard.bind(undefined, elCardContainer, index, nPlayerCount));
            }
            else {
            }
        });
        arrBestStats.forEach(function (oBest) {
            if (oBest.elCard)
                playerStatsCard.HighlightStat(oBest.elCard, oBest.stat);
        });
    }
    function _SortByTeamFn(a, b) {
        let team_a = Number(a['teamnumber']);
        let team_b = Number(b['teamnumber']);
        let index_a = Number(a['slot']);
        let index_b = Number(b['slot']);
        if (team_a != team_b) {
            return team_b - team_a;
        }
        else {
            return index_a - index_b;
        }
    }
    function _SortByScoreFn(a, b) {
        let score_a = MockAdapter.GetPlayerScore(a['xuid']);
        let score_b = MockAdapter.GetPlayerScore(b['xuid']);
        let index_a = Number(a['slot']);
        let index_b = Number(b['slot']);
        if (score_a != score_b) {
            return score_b - score_a;
        }
        else {
            return index_a - index_b;
        }
    }
    function _SortPlayers(mode, arrPlayerList) {
        let midpoint;
        let localPlayerPosition;
        switch (mode) {
            case 'scrimcomp2v2':
                arrPlayerList.sort(_SortByTeamFn);
                break;
            case 'no longer used but force local player to the middle':
                if (_m_localPlayer &&
                    _m_localPlayer.hasOwnProperty('xuid') &&
                    (arrPlayerList.filter(p => p.xuid == _m_localPlayer.xuid).length > 0)) {
                    midpoint = Math.floor(arrPlayerList.length / 2);
                    arrPlayerList = arrPlayerList.filter(player => player['xuid'] != _m_localPlayer['xuid']);
                    arrPlayerList.splice(midpoint, 0, _m_localPlayer);
                }
                break;
            case 'no longer used but force player to have a spot':
                if (_m_localPlayer && arrPlayerList.includes(_m_localPlayer)) {
                    localPlayerPosition = Math.min(arrPlayerList.indexOf(_m_localPlayer), 7);
                    arrPlayerList = arrPlayerList.filter(player => player['xuid'] != _m_localPlayer['xuid']);
                    arrPlayerList.splice(localPlayerPosition, 0, _m_localPlayer);
                }
                break;
            case 'gungameprogressive':
            case 'deathmatch':
            case 'ffadm':
            case 'gungametrbomb':
            case 'casual':
            case 'teamdm':
            default:
                break;
        }
        return arrPlayerList;
    }
    function _RankRevealAll() {
        let mode = _GetModeForEndOfMatchPurposes();
        let arrPlayerList = _CollectPlayersForMode(mode);
        arrPlayerList.forEach(function (oPlayer) {
            if (!oPlayer)
                return;
            let xuid = oPlayer.xuid;
            let elCardContainer = $.GetContextPanel().FindChildTraverse('cardcontainer-' + xuid);
            if (elCardContainer) {
                let elCard = playerStatsCard.GetCard(elCardContainer);
                playerStatsCard.SetSkillGroup(elCard, xuid);
            }
        });
    }
    function _Start() {
        _DisplayMe();
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gameover_show', 'MOUSE');
    }
    function _Shutdown() {
        $('#id-eom-characters-root').FindChildrenWithClassTraverse('eom-chars__accolade').forEach(el => el.DeleteAsync(.0));
        $('#id-eom-characters-root').RemoveAndDeleteChildren();
    }
    return {
        Start: _Start,
        Shutdown: _Shutdown,
        GetModeForEndOfMatchPurposes: _GetModeForEndOfMatchPurposes,
        ShowWinningTeam: _ShowWinningTeam,
        RankRevealAll: _RankRevealAll,
    };
})();
(function () {
    $.RegisterForUnhandledEvent('GameState_RankRevealAll', EOM_Characters.RankRevealAll);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC1jaGFyYWN0ZXJzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW5kb2ZtYXRjaC1jaGFyYWN0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQyxzQ0FBc0M7QUFDdEMsc0NBQXNDO0FBQ3RDLDZDQUE2QztBQUM3Qyx3Q0FBd0M7QUFHeEMsSUFBSSxjQUFjLEdBQUcsQ0FFcEI7SUFHQyxJQUFJLDRCQUE0QixHQUFvRCxFQUFFLENBQUM7SUFFdkYsSUFBSSxjQUFjLEdBQXlELElBQUksQ0FBQztJQUNoRixJQUFJLGFBQWEsR0FBOEIsSUFBSSxDQUFDO0lBRXBELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDO0lBRTdCLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFDO0lBRWhDLFNBQVMsa0JBQWtCLENBQUcsSUFBWTtRQUV6QyxRQUFTLElBQUksRUFDYjtZQUVDLEtBQUssY0FBYztnQkFDbEIsT0FBTyx5Q0FBeUMsQ0FBQztZQUdsRCxLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLGVBQWUsQ0FBQztZQUNyQixLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUTtnQkFDWixPQUFPLG9DQUFvQyxDQUFDO1lBRzdDLEtBQUssb0JBQW9CLENBQUM7WUFDMUIsS0FBSyxVQUFVLENBQUM7WUFDaEIsS0FBSyxZQUFZLENBQUM7WUFDbEIsS0FBSyxPQUFPO2dCQUNYLE9BQU8sZ0NBQWdDLENBQUM7WUFFekM7Z0JBQ0MsT0FBTyxvQ0FBb0MsQ0FBQztTQUM3QztJQUNGLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBRyxJQUFnQjtRQUV2QyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUseUJBQXlCLENBQUcsQ0FBQztRQUU3QyxJQUFJLFlBQVksR0FBRywyQkFBMkIsR0FBRyxDQUFFLElBQUksSUFBSSxJQUFJLENB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