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
            // ffa
            case 'gungameprogressive': // armsrace
            case 'training':
            case 'deathmatch':
                snippet = 'snippet-banner-dm';
                break;
            default:
                snippet = 'snippet-banner-classic';
                break;
        }
        elCard.FindChildTraverse('JsBanner').BLoadLayoutSnippet(snippet);
        // Set banner background image
        let elBannerBG = elCard.FindChildTraverse('JsBannerBG');
        elBannerBG.SetImage('file://{images}/stats_cards/stats_card_banner_' + index + '.png');
        // Set card background
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
        // We can't access the xuid inventory so we ask for the display item a differnt way
        if (flairItemId === "0" || !flairItemId) {
            const flairDefIdx = FriendsListAPI.GetFriendDisplayItemDefFeatured(xuid);
            flairItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(flairDefIdx, 0);
            if (flairItemId === "0" || !flairItemId || flairDefIdx == 65535)
                return false;
        }
        const imagePath = InventoryAPI.GetItemInventoryImage(flairItemId);
        let elFlairImage = elCard.FindChildTraverse('jsFlairImage');
        elFlairImage.SetImage('file://{images}' + imagePath + '_small.png');
        // elCard.SetDialogVariable( 'flair', $.Localize( '#SFUI_XP_RankName_') );
        elCard.SetHasClass('show-flair', true);
    }
    playerStatsCard.SetFlair = SetFlair;
    function _UpdateSkillGroup(strSkillgroupData) {
        const oSkillgroupData = JSON.parse(strSkillgroupData);
        $.Msg(JSON.stringify(oSkillgroupData));
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
                        RatingEmblem.SetXuid(options);
                        elCard.TriggerClass('skillgroup-update');
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
            // because triggerclass doesn't restart the animation
            elCard.RemoveClass('show-skillgroup');
            $.Schedule(0, () => elCard.AddClass('show-skillgroup'));
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
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyX3N0YXRzX2NhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5ZXJfc3RhdHNfY2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHdDQUF3QztBQUN4Qyx5Q0FBeUM7QUFDekMsd0NBQXdDO0FBRXhDLElBQVUsZUFBZSxDQXFReEI7QUFyUUQsV0FBVSxlQUFlO0lBRXhCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQztJQUV2QixTQUFnQixJQUFJLENBQUcsUUFBaUIsRUFBRSxJQUFZLEVBQUUsS0FBYTtRQUdwRSxDQUFDLENBQUMseUJBQXlCLENBQUUsOEJBQThCLEVBQUUsaUJBQWlCLENBQUUsQ0FBQztRQUdqRixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxpREFBaUQsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDdEYsTUFBTSxDQUFDLG9CQUFvQixDQUFFLFlBQVksRUFBRSxNQUFNLENBQUUsV0FBVyxDQUFDLGFBQWEsQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFFLENBQUM7UUFDekYsTUFBTSxDQUFDLG9CQUFvQixDQUFFLE1BQU0sRUFBRSxNQUFNLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztRQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxJQUFJLEtBQUssV0FBVyxDQUFDLGtCQUFrQixFQUFFLENBQUUsQ0FBQztRQUUvRSxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFakIsUUFBUyxXQUFXLENBQUMsdUJBQXVCLENBQUUsS0FBSyxDQUFFLEVBQ3JEO1lBQ0MsTUFBTTtZQUNOLEtBQUssb0JBQW9CLENBQUMsQ0FBQyxXQUFXO1lBQ3RDLEtBQUssVUFBVSxDQUFDO1lBQ2hCLEtBQUssWUFBWTtnQkFDaEIsT0FBTyxHQUFHLG1C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