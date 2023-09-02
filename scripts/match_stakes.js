"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="mock_adapter.ts" />
var MatchStakes;
(function (MatchStakes) {
    var m_elMatchStakes = undefined;
    function _msg(msg) {
        $.Msg('match_stakes.ts: ' + msg);
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
    //DEVONLY{
    const DEBUG_MATCHSTAKES = false;
    //}DEVONLY
    function StartTeamIntro() {
        //DEVONLY{
        // DEBUG
        if (DEBUG_MATCHSTAKES) {
            MockAdapter.AddTable('custom', {
                k_GetPlayerCompetitiveRankType: {
                    0: 'Premier'
                },
                k_GetPlayerPremierRankStatsObject: {
                    0: {
                        competitiveWins: 5,
                        predictedRankingIfLoss: 10500,
                        predictedRankingIfTie: 11500,
                        predictedRankingIfWin: 12500,
                        rankType: 'Premier',
                        score: 11999
                    }
                }
            });
            MockAdapter.SetMockData('custom');
        }
        //}DEVONLY
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
            //DEVONLY{
            leaderboard_details: DEBUG_MATCHSTAKES ? { score: rankStats.score, matchesWon: rankStats.competitiveWins } : undefined
            //}DEVONLY			
        };
        RatingEmblem.SetXuid(options);
        // promotion / relegation
        let introText = RatingEmblem.GetIntroText(elMatchStakes);
        elMatchStakes.SetHasClass('show-intro-text', introText !== '');
        elMatchStakes.SetDialogVariable('introtext', introText);
        elMatchStakes.TriggerClass('reveal-stakes');
        let promotionState = RatingEmblem.GetPromotionState(elMatchStakes);
        let ParticleEffect = '';
        // todo: get tier from ratingsemblem
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hfc3Rha2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWF0Y2hfc3Rha2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMseUNBQXlDO0FBQ3pDLHdDQUF3QztBQUV4QyxJQUFVLFdBQVcsQ0F3THBCO0FBeExELFdBQVUsV0FBVztJQUVwQixJQUFJLGVBQWUsR0FBd0IsU0FBUyxDQUFDO0lBRXJELFNBQVMsSUFBSSxDQUFHLEdBQVc7UUFFMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBRSxtQkFBbUIsR0FBRyxHQUFHLENBQUUsQ0FBQztJQUNwQyxDQUFDO0lBRUQsU0FBUyxhQUFhO1FBRXJCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFNBQVMsQ0FBQztRQUNkLE9BQVEsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUU7WUFDckMsTUFBTSxHQUFHLFNBQVMsQ0FBQztRQUVwQixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUU1QixJQUFLLENBQUMsZUFBZSxFQUNyQjtZQUNDLElBQUksQ0FBRSwyQkFBMkIsQ0FBRSxDQUFDO1lBQ3BDLElBQUksS0FBSyxHQUFHLGFBQWEsRUFBRSxDQUFDO1lBQzVCLGVBQWUsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsYUFBYSxDQUFFLENBQUM7U0FDM0Q7UUFFRCxPQUFPLGVBQWUsQ0FBQztJQUN4QixDQUFDO0lBRUQsU0FBZ0Isa0JBQWtCLENBQUcsS0FBSyxHQUFHLElBQUk7UUFFaEQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLDRCQUE0QixDQUFFLFlBQVksQ0FBQyxrQkFBa0IsRUFBRSxDQUFFLENBQUM7UUFDM0YsSUFBSyxJQUFJLEtBQUssU0FBUztZQUN0QixPQUFPO1FBRVIsSUFBSSxhQUFhLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQztRQUUzQyxJQUFL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