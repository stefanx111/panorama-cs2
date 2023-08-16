"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="mock_adapter.ts" />
var playerStatsCard = (function () {
    const CARD_ID = 'card';
    function _Init(elParent, xuid, index) {
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
        elAvatarImage.PopulateFromPlayerSlot(MockAdapter.GetPlayerSlot(xuid));
        let team = MockAdapter.GetPlayerTeamName(xuid);
        elAvatarImage.SwitchClass('teamstyle', 'team--' + team);
    }
    function _SetRank(elCard, xuid) {
        let rankLvl = MockAdapter.GetPlayerXpLevel(xuid);
        let elRankImage = elCard.FindChildTraverse('jsRankImage');
        elRankImage.SetImage("file://{images}/icons/xp/level" + rankLvl + ".png");
        elCard.SetDialogVariable('name', $.Localize('#SFUI_XP_RankName_' + rankLvl));
        elCard.SetDialogVariableInt('level', rankLvl);
        elCard.SetHasClass('show-rank', rankLvl >= 0);
    }
    function _SetFlair(elCard, xuid) {
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
    function _SetSkillGroup(elCard, xuid) {
        if (!elCard.FindChildTraverse('jsRatingEmblem'))
            return;
        let options = {
            root_panel: elCard.FindChildTraverse('jsRatingEmblem'),
            xuid: xuid,
            api: 'gamestate',
            do_fx: true,
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
    function _SetStats(elCard, xuid, arrBestStats = null) {
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
    function _SetTeammateColor(elCard, xuid) {
        elCard.FindChildrenWithClassTraverse('colorize-teammate-color').forEach(function (elPlayerColor) {
            let teammateColor = MockAdapter.GetPlayerColor(xuid);
            let teamName = MockAdapter.GetPlayerTeamName(xuid);
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
    /* Public interface */
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
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheWVyX3N0YXRzX2NhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwbGF5ZXJfc3RhdHNfY2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHdDQUF3QztBQUN4Qyx5Q0FBeUM7QUFDekMsd0NBQXdDO0FBRXhDLElBQUksZUFBZSxHQUFHLENBQ3JCO0lBRUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBRXZCLFNBQVMsS0FBSyxDQUFHLFFBQWlCLEVBQUUsSUFBWSxFQUFFLEtBQWE7UUFFOUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUUsaURBQWlELEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBRSxDQUFDO1FBQ3RGLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBRSxZQUFZLEVBQUUsTUFBTSxDQUFFLFdBQVcsQ0FBQyxhQUFhLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBRSxDQUFDO1FBQ3pGLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsTUFBTSxDQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7UUFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsSUFBSSxLQUFLLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFFLENBQUM7UUFFL0UsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBRWpCLFFBQVMsV0FBVyxDQUFDLHVCQUF1QixDQUFFLEtBQUssQ0FBRSxFQUNyRDtZQUNDLE1BQU07WUFDTixLQUFLLG9CQUFvQixDQUFDLENBQUMsV0FBVztZQUN0QyxLQUFLLFVBQVUsQ0FBQztZQUNoQixLQUFLLFlBQVk7Z0JBQ2hCLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQztnQkFDOUIsTUFBTTtZQUVQO2dCQUNDLE9BQU8sR0FBRyx3QkFBd0IsQ0FBQztnQkFDbkMsTUFBTTtTQUNQ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