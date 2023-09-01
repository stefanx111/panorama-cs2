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
        const type = MockAdapter.GetPlayerCompetitiveRankType(mysteamid);
        if (type !== 'Premier')
            return;
        let rankStats = MockAdapter.GetPlayerPremierRankStatsObject(mysteamid);
        if (!rankStats || rankStats.score === 0)
            return;
        let elMatchStakes = _GetMatchStakesPanel();
        elMatchStakes.style.visibility = 'visible';
        elMatchStakes.Data().teamIntroInProgress = true;
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
        function _SetDelta(panel, prediction, score, options) {
            let delta = prediction - score;
            panel.SetDialogVariable('delta', delta >= 0 ? '+' + delta : String(delta));
            panel.SetHasClass('animate', true);
            panel.AddClass('reveal-stakes');
        }
        _SetDelta(elWin, rankStats.predictedRankingIfWin, rankStats.score, options);
        _SetDelta(elLoss, rankStats.predictedRankingIfLoss, rankStats.score, options);
        if (promotionState) {
            elPfx.SetParticleNameAndRefresh(ParticleEffect);
            elPfx.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
        }
    }
    MatchStakes.StartTeamIntro = StartTeamIntro;
})(MatchStakes || (MatchStakes = {}));
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hfc3Rha2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWF0Y2hfc3Rha2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMseUNBQXlDO0FBQ3pDLHdDQUF3QztBQUV4QyxJQUFVLFdBQVcsQ0FxSnBCO0FBckpELFdBQVUsV0FBVztJQUVwQixJQUFJLGVBQWUsR0FBd0IsU0FBUyxDQUFDO0lBRXJELFNBQVMsSUFBSSxDQUFHLEdBQVc7SUFHM0IsQ0FBQztJQUVELFNBQVMsYUFBYTtRQUVyQixJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFN0MsSUFBSSxTQUFTLENBQUM7UUFDZCxPQUFRLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFO1lBQ3JDLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFFcEIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsU0FBUyxvQkFBb0I7UUFFNUIsSUFBSyxDQUFDLGVBQWUsRUFDckI7WUFDQyxJQUFJLENBQUUsMkJBQTJCLENBQUUsQ0FBQztZQUNwQyxJQUFJLEtBQUssR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUM1QixlQUFlLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGFBQWEsQ0FBRSxDQUFDO1NBQzNEO1FBRUQsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVELFNBQWdCLGtCQUFrQixDQUFHLEtBQUssR0FBRyxJQUFJO1FBRWhELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBRSxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBRSxDQUFDO1FBQzNGLElBQUssSUFBSSxLQUFLLFNBQVM7WUFDdEIsT0FBTztRQUVSLElBQUksYUFBYSxHQUFHLG9CQUFvQixFQUFFLENBQUM7UUFFM0MsSUFBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsRUFDOUM7WUFDQyxhQUFhLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1lBQ2hFLGFBQWEsQ0FBQyxXQUFXLENBQUUsWUFBWSxFQUFFLEtBQUssQ0FBRSxDQUFDO1NBQ2pEO0lBQ0YsQ0FBQztJQWJlLDhCQUFrQixxQkFhakMsQ0FBQTtJQUVELFNBQWdCLFlBQVk7UUFFM0IsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLDRCQUE0QixDQUFFLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFFLENBQUM7UUFDM0YsSUFBSyxJQUFJLEtBQUssU0FBUztZQUN0QixPQUFPO1FBRVIsSUFBSSxhQUFhLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQztRQUUzQyxhQUFhLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDNUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixHQUFHLEtBQUssQ0FBQztJQUVsRCxDQUFDO0lBWGUsd0JBQVksZUFXM0IsQ0FBQTtJQUVFLFNBQWdCLGNBQWM7UUFpQmhDLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3BELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBRSxTQUFTLENBQUUsQ0FBQztRQUNuRSxJQUFLLElBQUksS0FBSyxTQUFTO1lBQ3RCLE9BQU87UUFFUixJQUFJLFNBQVMsR0FBMkIsV0FBVyxDQUFDLCtCQUErQixDQUFFLFNBQVMsQ0FBRSxDQUFDO1FBQ2pHLElBQUssQ0FBQyxTQUFTLElBQUksU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDO1lBQ3ZDLE9BQU87UUFFUixJQUFJLGFBQWEsR0FBRyxvQkFBb0IsRUFBRSxDQUFDO1FBRTNDLGFBQWEsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztRQUMzQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBRWhELElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO1FBQ2xFLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO1FBQ3BFLElBQUksS0FBSyxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBRSxtQkFBbUIsQ0FBMEIsQ0FBQztRQUVyRixJQUFJLE9BQU8sR0FDakI7WUFDQyxHQUFHLEVBQUUsV0FBVztZQUNoQixJQUFJLEVBQUUsU0FBUztZQUNmLFVBQVUsRUFBRSxhQUFhO1lBQ2hCLFdBQVcsRUFBRSxTQUFTO1lBQy9CLEtBQUssRUFBRSxLQUFLO1lBQ1osWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQUVGLFlBQVksQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7UUFHaEMsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLFlBQVksQ0FBRSxhQUFhLENBQUUsQ0FBQztRQUMzRCxhQUFhLENBQUMsV0FBVyxDQUFFLGlCQUFpQixFQUFFLFNBQVMsS0FBSyxFQUFFLENBQUUsQ0FBQztRQUNqRSxhQUFhLENBQUMsaUJBQWlCLENBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBRSxDQUFDO1FBQzFELGFBQWEsQ0FBQyxZQUFZLENBQUUsZUFBZSxDQUFFLENBQUM7UUFFOUMsSUFBSSxjQUFjLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFFLGFBQWEsQ0FBRSxDQUFDO1FBQ3JFLElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBRSxTQUFTLENBQUMsS0FBTSxDQUFFLENBQUM7UUFDN0QsV0FBVyxHQUFHLFNBQVMsQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUM3QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFFLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBRSxDQUFDO1FBRTVDLElBQUksU0FBUyxHQUFHLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxJQUFLLGNBQWMsS0FBSyxDQUFDLENBQUMsRUFDMUI7WUFDQyxjQUFjLEdBQUcsMERBQTBELENBQUM7U0FDNUU7YUFDSSxJQUFLLGNBQWMsS0FBSyxDQUFDLEVBQzlCO1lBQ0MsY0FBYyxHQUFHLHFEQUFxRCxDQUFDO1NBQ3ZFO1FBRUQsU0FBUyxTQUFTLENBQUcsS0FBYyxFQUFFLFVBQWtCLEVBQUUsS0FBYSxFQUFFLE9BQThCO1lBRXJHLElBQUksS0FBSyxHQUFHLFVBQVUsR0FBRyxLQUFLLENBQUM7WUFFL0IsS0FBSyxDQUFDLGlCQUFpQixDQUFFLE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUUsS0FBSyxDQUFFLENBQUUsQ0FBQztZQUMvRSxLQUFLLENBQUMsV0FBVyxDQUFFLFNBQVMsRUFBRSxJQUFJLENBQUUsQ0FBQztZQUNyQyxLQUFLLENBQUMsUUFBUSxDQUFFLGVBQWUsQ0FBRSxDQUFDO1FBQ25DLENBQUM7UUFFRCxTQUFTLENBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBQzlFLFNBQVMsQ0FBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFaEYsSUFBSyxjQUFjLEVBQ25CO1lBQ0MsS0FBSyxDQUFDLHlCQUF5QixDQUFFLGNBQWMsQ0FBRSxDQUFDO1lBQ2xELEtBQUssQ0FBQyxlQUFlLENBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFFLENBQUM7U0FDbkU7SUFDQyxDQUFDO0lBeEZlLDBCQUFjLGlCQXdGN0IsQ0FBQTtBQUNMLENBQUMsRUFySlMsV0FBVyxLQUFYLFdBQVcsUUFxSnBCO0FBRUQsQ0FBRTtBQUVGLENBQUMsQ0FBRSxFQUFFLENBQUMifQ==