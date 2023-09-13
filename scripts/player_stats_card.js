"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="mock_adapter.ts" />
var playerStatsCard;
(function (playerStatsCard) {
    const CARD_ID = 'card';
    function Init(elParent, xuid, index) {
        $.RegisterForUnhandledEvent("EndOfMatch_SkillGroupUpdated", _UpdateSkillGroup);
        let elCard = $.CreatePanel('Panel', elParent, CARD_ID);
        elCard.BLoadLayout("file://{resources}/layout/player_stats_card.xml", false, false);
        elCard.SetDialogVariableInt('playerslot', Number(MockAdapter.GetPlayerSlot(xuid)));
        elCard.SetDialogVariableInt('xuid', Number(xuid));
        elCard.SetHasClass('localplayer', xuid === MockAdapter.GetLocalPlayerXuid());
        let snippet = '';
        switch (MockAdapter.GetGameModeInternalName(false)) {
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
    playerStatsCard.Init = Init;
    function GetCard(elParent) {
        return elParent.FindChildTraverse(CARD_ID);
    }
    playerStatsCard.GetCard = GetCard;
    function SetAccolade(elCard, accValue, accName, accPosition) {
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
    playerStatsCard.SetAccolade = SetAccolade;
    function SetAvatar(elCard, xuid) {
        let elAvatarImage = elCard.FindChildTraverse('jsAvatar');
        elAvatarImage.PopulateFromPlayerSlot(MockAdapter.GetPlayerSlot(xuid));
        let team = MockAdapter.GetPlayerTeamName(xuid);
        elAvatarImage.SwitchClass('teamstyle', 'team--' + team);
    }
    playerStatsCard.SetAvatar = SetAvatar;
    function SetRank(elCard, xuid) {
        let rankLvl = MockAdapter.GetPlayerXpLevel(xuid);
        let elRankImage = elCard.FindChildTraverse('jsRankImage');
        elRankImage.SetImage("file://{images}/icons/xp/level" + rankLvl + ".png");
        elCard.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + rankLvl));
        elCard.SetDialogVariableInt('level', rankLvl);
        elCard.SetHasClass('show-rank', rankLvl >= 0);
    }
    playerStatsCard.SetRank = SetRank;
    function SetFlair(elCard, xuid) {
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
    playerStatsCard.SetFlair = SetFlair;
    function _UpdateSkillGroup(strSkillgroupData) {
        const oSkillgroupData = JSON.parse(strSkillgroupData);
        Object.keys(oSkillgroupData).forEach(function (xuid, i) {
            const cardId = 'cardcontainer-' + xuid;
            const elCard = $.GetContextPanel().FindChildTraverse(cardId);
            if (elCard) {
                const newPlayerData = oSkillgroupData[xuid];
                if (newPlayerData && newPlayerData.hasOwnProperty('new_rank') && newPlayerData.hasOwnProperty('rank_type')) {
                    const options = {
                        root_panel: elCard.FindChildTraverse('jsRatingEmblem'),
                        xuid: xuid,
                        do_fx: true,
                        full_details: false,
                        leaderboard_details: { score: newPlayerData.new_rank },
                        rating_type: newPlayerData.rank_type,
                    };
                    $.Schedule(1.0 + 0.5 * i, () => {
                        if (elCard && elCard.IsValid()) {
                            RatingEmblem.SetXuid(options);
                            elCard.TriggerClass('skillgroup-update');
                        }
                    });
                }
            }
        });
    }
    function SetSkillGroup(elCard, xuid) {
        if (!elCard.FindChildTraverse('jsRatingEmblem'))
            return;
        let options = {
            root_panel: elCard.FindChildTraverse('jsRatingEmblem'),
            xuid: xuid,
            api: 'gamestate',
            do_fx: true,
            full_details: true,
        };
        const bShowSkillGroup = RatingEmblem.SetXuid(options);
        if (bShowSkillGroup) {
            elCard.RemoveClass('show-skillgroup');
            $.Schedule(0, () => elCard && elCard.IsValid() ? elCard.AddClass('show-skillgroup') : '');
        }
        else {
            elCard.RemoveClass('show-skillgroup');
        }
    }
    playerStatsCard.SetSkillGroup = SetSkillGroup;
    function SetStats(elCard, xuid, arrBestStats = null) {
        let oStats = MockAdapter.GetPlayerStatsJSO(xuid);
        let score = MockAdapter.GetPlayerScore(xuid);
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
    playerStatsCard.SetStats = SetStats;
    function SetTeammateColor(elCard, xuid) {
        elCard.FindChildrenWithClassTraverse('colorize-teammate-color').forEach(function (elPlayerColor) {
            let teammateColor = MockAdapter.GetPlayerColor(xuid);
            let teamName = MockAdapter.GetPlayerTeamName(xuid);
            let teamColor = teammateColor ? teammateColor : teamName == 'CT' ? '#5ab8f4' : '#f0c941';
            elPlayerColor.style.washColor = (teamColor !== '') ? teamColor : 'black';
        });
    }
    playerStatsCard.SetTeammateColor = SetTeammateColor;
    async function RevealStats(elCard) {
        const DELAY_DELTA = 0.1;
        for (const elPanel of elCard.FindChildrenWithClassTraverse('sliding-panel')) {
            await Async.Delay(DELAY_DELTA);
            elPanel.AddClass('slide');
        }
    }
    playerStatsCard.RevealStats = RevealStats;
    function HighlightStat(elCard, stat) {
        elCard.AddClass('highlight-' + stat);
    }
    playerStatsCard.HighlightStat = HighlightStat;
})(playerStatsCard || (playerStatsCard = {}));
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyX3N0YXRzX2NhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5ZXJfc3RhdHNfY2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHdDQUF3QztBQUN4Qyx5Q0FBeUM7QUFDekMsd0NBQXdDO0FBRXhDLElBQVUsZUFBZSxDQXdReEI7QUF4UUQsV0FBVSxlQUFlO0lBRXhCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUV2QixTQUFnQixJQUFJLENBQUcsUUFBaUIsRUFBRSxJQUFZLEVBQUUsS0FBYTtRQUdwRSxDQUFDLENBQUMseUJBQXlCLENBQUUsOEJBQThCLEVBQUUsaUJBQWlCLENBQUUsQ0FBQztRQUdqRixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxpREFBaUQsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDdEYsTUFBTSxDQUFDLG9CQUFvQixDQUFFLFlBQVksRUFBRSxNQUFNLENBQUUsV0FBVyxDQUFDLGFBQWEsQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFFLENBQUM7UUFDekYsTUFBTSxDQUFDLG9CQUFvQixDQUFFLE1BQU0sRUFBRSxNQUFNLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztRQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxJQUFJLEtBQUssV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUUsQ0FBQztRQUUvRSxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFakIsUUFBUyxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLEVBQ3JEO1lBRUMsS0FBSyxvQkFBb0IsQ0FBQztZQUMxQixLQUFLLFVBQVUsQ0FBQztZQUNoQixLQUFLLFlBQVk7Z0JBQ2hCLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQztnQkFDOUIsTUFB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