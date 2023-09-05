"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="mock_adapter.ts" />
var MatchStakes;
(function (MatchStakes) {
    var m_elMatchStakes = undefined;
    function _msg(msg) {
    }
    function _GetRootPanel() {
        let parent = $.GetContextPanel().GetParent();
        let newParent;
        while (newParent = parent.GetParent())
            parent = newParent;
        return parent;
    }
    function _GetMatchStakesPanel() {
        if (!m_elMatchStakes) {
            _msg('getting matchstakes panel');
            let elHud = _GetRootPanel();
            m_elMatchStakes = elHud.FindChildTraverse('MatchStakes');
        }
        return m_elMatchStakes;
    }
    function ShowWithScoreboard(bShow = true) {
        const type = MockAdapter.GetPlayerCompetitiveRankType(GameStateAPI.GetLocalPlayerXuid());
        if (type !== 'Premier')
            return;
        let elMatchStakes = _GetMatchStakesPanel();
        if (!elMatchStakes.Data().teamIntroInProgress) {
            elMatchStakes.style.visibility = bShow ? 'visible' : 'collapse';
            elMatchStakes.SetHasClass('scoreboard', bShow);
        }
    }
    MatchStakes.ShowWithScoreboard = ShowWithScoreboard;
    function EndTeamIntro() {
        const type = MockAdapter.GetPlayerCompetitiveRankType(GameStateAPI.GetLocalPlayerXuid());
        if (type !== 'Premier')
            return;
        let elMatchStakes = _GetMatchStakesPanel();
        elMatchStakes.style.visibility = 'collapse';
        elMatchStakes.Data().teamIntroInProgress = false;
    }
    MatchStakes.EndTeamIntro = EndTeamIntro;
    function StartTeamIntro() {
        const mysteamid = GameStateAPI.GetLocalPlayerXuid();
        let rankStats = MockAdapter.GetPlayerPremierRankStatsObject(mysteamid);
        if (!rankStats || rankStats.rankType !== 'Premier')
            return;
        let elMatchStakes = _GetMatchStakesPanel();
        elMatchStakes.style.visibility = 'visible';
        elMatchStakes.Data().teamIntroInProgress = true;
        elMatchStakes.SetHasClass('no-rating', rankStats.score === 0);
        let elWin = elMatchStakes.FindChildTraverse('jsMatchStakesWin');
        let elLoss = elMatchStakes.FindChildTraverse('jsMatchStakesLoss');
        let elPfx = elMatchStakes.FindChildTraverse('jsMatchStakes_pfx');
        let options = {
            api: 'gamestate',
            xuid: mysteamid,
            root_panel: elMatchStakes,
            rating_type: 'Premier',
            do_fx: false,
            full_details: true,
        };
        RatingEmblem.SetXuid(options);
        let introText = RatingEmblem.GetIntroText(elMatchStakes);
        elMatchStakes.SetHasClass('show-intro-text', introText !== '');
        elMatchStakes.SetDialogVariable('introtext', introText);
        elMatchStakes.TriggerClass('reveal-stakes');
        let promotionState = RatingEmblem.GetPromotionState(elMatchStakes);
        let ParticleEffect = '';
        let majorRating = '';
        let arrRating = RatingEmblem.SplitRating(rankStats.score);
        majorRating = arrRating[0];
        let tier = Math.floor(+majorRating / 5.0);
        var tierColor = ratingParticleControls.colorConvert(tier);
        if (promotionState === -1) {
            ParticleEffect = "particles/ui/premier_ratings_matchstakes_relegation.vpcf";
        }
        else if (promotionState === 1) {
            ParticleEffect = "particles/ui/premier_ratings_matchstakes_promo.vpcf";
        }
        function _SetDelta(panel, prediction, score, options, bLoss) {
            let delta = prediction - score;
            let deltaStr;
            if (delta === 0) {
                deltaStr = bLoss ? '-0' : '+0';
            }
            else if (delta < 0) {
                deltaStr = String(delta);
            }
            else {
                deltaStr = String('+' + delta);
            }
            panel.SetDialogVariable('delta', deltaStr);
            panel.SetHasClass('animate', true);
            panel.AddClass('reveal-stakes');
        }
        _SetDelta(elWin, rankStats.predictedRankingIfWin, rankStats.score, options, false);
        _SetDelta(elLoss, rankStats.predictedRankingIfLoss, rankStats.score, options, true);
        if (promotionState) {
            elPfx.SetParticleNameAndRefresh(ParticleEffect);
            elPfx.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
        }
    }
    MatchStakes.StartTeamIntro = StartTeamIntro;
})(MatchStakes || (MatchStakes = {}));
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hfc3Rha2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWF0Y2hfc3Rha2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMseUNBQXlDO0FBQ3pDLHdDQUF3QztBQUV4QyxJQUFVLFdBQVcsQ0F3THBCO0FBeExELFdBQVUsV0FBVztJQUVwQixJQUFJLGVBQWUsR0FBd0IsU0FBUyxDQUFDO0lBRXJELFNBQVMsSUFBSSxDQUFHLEdBQVc7SUFHM0IsQ0FBQztJQUVELFNBQVMsYUFBYTtRQUVyQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFN0MsSUFBSSxTQUFTLENBQUM7UUFDZCxPQUFRLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ3JDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFFcEIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxvQkFBb0I7UUFFNUIsSUFBSyxDQUFDLGVBQWUsRUFDckI7WUFDQyxJQUFJLENBQUUsMkJBQTJCLENBQUUsQ0FBQztZQUNwQyxJQUFJLEtBQUssR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUM1QixlQUFlLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGFBQWEsQ0FBRSxDQUFDO1NBQzNEO1FBRUQsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQWdCLGtCQUFrQixDQUFHLEtBQUssR0FBRyxJQUFJO1FBRWhELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBRSxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBRSxDQUFDO1FBQzNGLElBQUssSUFBSSxLQUFLLFNBQVM7WUFDdEIsT0FBTztRQUVSLElBQUksYUFBYSxHQUFHLG9CQUFvQixFQUFFLENBQUM7UUFFM0MsSUFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsRUFDOUM7WUFDQyxhQUFh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