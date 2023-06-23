/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
var playerStatsCard = (function () {
    const CARD_ID = 'card';
    function _Init(elParent, xuid, index) {
        let elCard = $.CreatePanel('Panel', elParent, CARD_ID);
        elCard.BLoadLayout("file://{resources}/layout/player_stats_card.xml", false, false);
        elCard.SetDialogVariableInt('playerslot', Number(GameStateAPI.GetPlayerSlot(xuid)));
        elCard.SetDialogVariableInt('xuid', Number(xuid));
        elCard.SetHasClass('localplayer', xuid === GameStateAPI.GetLocalPlayerXuid());
        let snippet = '';
        switch (GameStateAPI.GetGameModeInternalName(false)) {
            case 'gungameprogressive':
            case 'training':
            case 'deathmatch':
                snippet = 'snippet-banner-dm';
                break;
            default:
                snippet = 'snippet-banner-classic';
                break;
        }
        elCard.FindChildTraverse('JsBanner').BLoadLayoutSnippet(snippet);
        let elBannerBG = elCard.FindChildTraverse('JsBannerBG');
        elBannerBG.SetImage('file://{images}/stats_cards/stats_card_banner_' + index + '.png');
        let elCardBG = elCard.FindChildTraverse('JsCardBG');
        let maxCoord = 100;
        let minCoord = -100;
        let randX = Math.floor(Math.random() * (maxCoord - minCoord) + minCoord);
        let randY = Math.floor(Math.random() * (maxCoord - minCoord) + minCoord);
        elCardBG.style.backgroundPosition = randX + '% ' + randY + '%';
        return elCard;
    }
    function _GetCard(elParent) {
        return elParent.FindChildTraverse(CARD_ID);
    }
    function _SetAccolade(elCard, accValue, accName, accPosition) {
        if (!isNaN(Number(accValue))) {
            accValue = String(Math.floor(Number(accValue)));
        }
        elCard.SetDialogVariable('accolade-value-string', accValue);
        elCard.SetDialogVariableTime('accolade-value-time', Number(accValue));
        elCard.SetDialogVariableInt('accolade-value-int', Number(accValue));
        let secondPlaceSuffix = (accPosition != '1') ? '_2' : '';
        elCard.SetDialogVariable('accolade-the-title', $.Localize('#accolade_' + accName + secondPlaceSuffix));
        elCard.SetDialogVariable('accolade-desc', $.Localize('#accolade_' + accName + '_desc' + secondPlaceSuffix, elCard));
        let valueToken = '#accolade_' + accName + '_value';
        let valueLocalized = $.Localize('#accolade_' + accName + '_value', elCard);
        if (valueToken == valueLocalized)
            valueLocalized = '';
        elCard.SetDialogVariable('accolade-value', valueLocalized);
        elCard.SetHasClass('show-accolade', true);
    }
    function _SetAvatar(elCard, xuid) {
        let elAvatarImage = elCard.FindChildTraverse('jsAvatar');
        elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(xuid));
        let team = GameStateAPI.GetPlayerTeamName(xuid);
        elAvatarImage.SwitchClass('teamstyle', 'team--' + team);
    }
    function _SetRank(elCard, xuid) {
        let rankLvl = GameStateAPI.GetPlayerXpLevel(xuid);
        let elRankImage = elCard.FindChildTraverse('jsRankImage');
        elRankImage.SetImage("file://{images}/icons/xp/level" + rankLvl + ".png");
        elCard.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + rankLvl));
        elCard.SetDialogVariableInt('level', rankLvl);
        elCard.SetHasClass('show-rank', rankLvl >= 0);
    }
    function _SetFlair(elCard, xuid) {
        let flairItemId = InventoryAPI.GetFlairItemId(xuid);
        if (flairItemId === "0" || !flairItemId) {
            const flairDefIdx = FriendsListAPI.GetFriendDisplayItemDefFeatured(xuid);
            flairItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(flairDefIdx, 0);
            if (flairItemId === "0" || !flairItemId || flairDefIdx == 65535)
                return false;
        }
        const imagePath = InventoryAPI.GetItemInventoryImage(flairItemId);
        let elFlairImage = elCard.FindChildTraverse('jsFlairImage');
        elFlairImage.SetImage('file://{images}' + imagePath + '_small.png');
        elCard.SetHasClass('show-flair', true);
    }
    function _SetSkillGroup(elCard, xuid) {
        let skillGroup = GameStateAPI.GetPlayerCompetitiveRanking(xuid);
        let mode = GameStateAPI.GetGameModeInternalName(false);
        let elSkillGroupImage = elCard.FindChildTraverse('jsSkillgroupImage');
        let bShowSkillGroup = (mode == 'scrimcomp2v2' || mode == 'competitive') &&
            !GameStateAPI.IsFakePlayer(xuid) && skillGroup > 0;
        if (skillGroup > 0) {
            let modepath = 'skillgroup';
            if (mode == 'scrimcomp2v2')
                modepath = 'wingman';
            let imagepath = 'file://{images}/icons/skillgroups/' + modepath + skillGroup + '.svg';
            elSkillGroupImage.SetImage(imagepath);
        }
        elCard.SetDialogVariable('skillgroup', $.Localize('#skillgroup_' + skillGroup));
        if (bShowSkillGroup) {
            elCard.RemoveClass('show-skillgroup');
            $.Schedule(0, () => elCard.AddClass('show-skillgroup'));
        }
        else {
            elCard.RemoveClass('show-skillgroup');
        }
    }
    function _SetStats(elCard, xuid, arrBestStats = null) {
        let oStats = MatchStatsAPI.GetPlayerStatsJSO(xuid);
        let score = GameStateAPI.GetPlayerScore(xuid);
        if (arrBestStats) {
            arrBestStats.forEach(function (oBest) {
                let stat = oBest.stat;
                if (oStats[stat] > 0 && (!oBest.value || oStats[stat] > oBest.value)) {
                    oBest.value = oStats[stat];
                    oBest.elCard = elCard;
                }
            });
        }
        elCard.SetDialogVariableInt('playercardstats-kills', Number(oStats.kills));
        elCard.SetDialogVariableInt('playercardstats-deaths', Number(oStats.deaths));
        elCard.SetDialogVariableInt('playercardstats-assists', Number(oStats.assists));
        elCard.SetDialogVariableInt('playercardstats-adr', Number(oStats.adr));
        elCard.SetDialogVariableInt('playercardstats-hsp', Number(oStats.hsp));
        elCard.SetDialogVariableInt('playercardstats-ef', Number(oStats.enemiesflashed));
        elCard.SetDialogVariableInt('playercardstats-ud', Number(oStats.utilitydamage));
        elCard.SetDialogVariableInt('playercardstats-score', Number(score));
        elCard.SetHasClass('show-stats', true);
    }
    function _SetTeammateColor(elCard, xuid) {
        elCard.FindChildrenWithClassTraverse('colorize-teammate-color').forEach(function (elPlayerColor) {
            let teammateColor = GameStateAPI.GetPlayerColor(xuid);
            let teamName = GameStateAPI.GetPlayerTeamName(xuid);
            let teamColor = teammateColor ? teammateColor : teamName == 'CT' ? '#5ab8f4' : '#f0c941';
            elPlayerColor.style.washColor = (teamColor !== '') ? teamColor : 'black';
        });
    }
    async function _RevealStats(elCard) {
        const DELAY_DELTA = 0.1;
        for (const elPanel of elCard.FindChildrenWithClassTraverse('sliding-panel')) {
            await Async.Delay(DELAY_DELTA);
            elPanel.AddClass('slide');
        }
    }
    function _HighlightStat(elCard, stat) {
        elCard.AddClass('highlight-' + stat);
    }
    return {
        Init: _Init,
        SetAccolade: _SetAccolade,
        SetAvatar: _SetAvatar,
        SetRank: _SetRank,
        SetFlair: _SetFlair,
        SetSkillGroup: _SetSkillGroup,
        SetStats: _SetStats,
        SetTeammateColor: _SetTeammateColor,
        RevealStats: _RevealStats,
        HighlightStat: _HighlightStat,
        GetCard: _GetCard,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyX3N0YXRzX2NhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5ZXJfc3RhdHNfY2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxrQ0FBa0M7QUFDbEMsd0NBQXdDO0FBRXhDLElBQUksZUFBZSxHQUFHLENBQ3JCO0lBRUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBRXZCLFNBQVMsS0FBSyxDQUFHLFFBQWlCLEVBQUUsSUFBWSxFQUFFLEtBQWE7UUFFOUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUUsaURBQWlELEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBRSxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBRSxZQUFZLEVBQUUsTUFBTSxDQUFFLFlBQVksQ0FBQyxhQUFhLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBRSxDQUFDO1FBQzFGLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsTUFBTSxDQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7UUFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsSUFBSSxLQUFLLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFFLENBQUM7UUFFaEYsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBRWpCLFFBQVMsWUFBWSxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxFQUN0RDtZQUVDLEtBQUssb0JBQW9CLENBQUM7WUFDMUIsS0FBSyxVQUFVLENBQUM7WUFDaEIsS0FBSyxZQUFZO2dCQUNoQixPQUFPLEdBQUcsbUJBQW1CLENBQUM7Z0JBQzlCLE1BQU07WUFFUDtnQkFDQyxPQUFPLEdBQUcsd0JBQXdCLENBQUM7Z0JBQ25DLE1BQU07U0FDUDtRQUVELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBRSxVQUFVLENBQUUsQ0FBQyxrQkFB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