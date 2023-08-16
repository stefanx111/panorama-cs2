"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="digitpanel.ts" />
/// <reference path="common/sessionutil.ts" />
var RatingEmblem;
(function (RatingEmblem) {
    function _msg(msg) {
        $.Msg('rating_emblem.ts: ' + msg);
    }
    function _GetMainPanel(root_panel) {
        return root_panel.FindChildTraverse('jsPremierRating').GetParent();
    }
    function GetRatingDesc(root_panel) {
        return _GetMainPanel(root_panel).Data().ratingDesc;
    }
    RatingEmblem.GetRatingDesc = GetRatingDesc;
    function GetTooltipText(root_panel) {
        return _GetMainPanel(root_panel).Data().tooltipText;
    }
    RatingEmblem.GetTooltipText = GetTooltipText;
    function GetTransitionDesc(root_panel) {
        return _GetMainPanel(root_panel).Data().transitionDesc;
    }
    RatingEmblem.GetTransitionDesc = GetTransitionDesc;
    function SetXuid(options) {
        let isLocalPlayer = MyPersonaAPI.GetXuid() === options.xuid;
        let rating = undefined;
        let wins = undefined;
        let rank = undefined;
        let pct = undefined;
        let source = options.api;
        let do_fx = options.do_fx;
        let rating_type = options.rating_type;
        //	_msg( '-' + options.root_panel.id );
        let root_panel = _GetMainPanel(options.root_panel);
        _msg('-' + options.root_panel.id);
        //DEVONLY{			
        // options.api = 'fakeData';
        //}DEVONLY			
        // 2-pass because if the rating type is premier than switch to leaderboard api.
        if (!rating_type && options.xuid) {
            switch (source) {
                case 'friends':
                    rating_type = FriendsListAPI.GetFriendCompetitiveRankType(options.xuid);
                    break;
                case 'partylist':
                    rating_type = PartyListAPI.GetFriendCompetitiveRankType(options.xuid);
                    break;
                case 'gamestate':
                    rating_type = MockAdapter.GetPlayerCompetitiveRankType(options.xuid);
                    break;
                case 'leaderboard':
                case 'mypersona':
                default:
                    rating_type = 'Premier';
                    break;
            }
        }
        if (options.xuid) {
            switch (source) {
                case 'mypersona':
                    rating = MockAdapter.GetPipRankCount(rating_type);
                    break;
                case 'friends':
                    rating = FriendsListAPI.GetFriendCompetitiveRank(options.xuid, rating_type);
                    wins = FriendsListAPI.GetFriendCompetitiveWins(options.xuid, rating_type);
                    break;
                case 'partylist':
                    rating = PartyListAPI.GetFriendCompetitiveRank(options.xuid);
                    wins = PartyListAPI.GetFriendCompetitiveWins(options.xuid);
                    break;
                case 'gamestate':
                    rating = MockAdapter.GetPlayerCompetitiveRanking(options.xuid);
                    wins = MockAdapter.GetPlayerCompetitiveWins(options.xuid);
                    break;
            }
        }
        //DEVONLY{				
        if (source === 'fakeData') {
            rating = Math.floor(Math.random() * 18);
            wins = Math.floor(Math.random() * 1000);
        }
        //}DEVONLY			
        if (rating_type === 'Premier') {
            //DEVONLY{				
            if (options.api === 'fakeData') {
                options.leaderboard_details = {
                    score: Math.floor(Math.random() * 3500),
                    matchesWon: Math.floor(Math.random() * 1000),
                    rank: Math.floor(Math.random() * 100000),
                    pct: Math.random() * 100.00
                };
            }
            //}DEVONLY
            // for perf, we should pass value in if we have it so we don't retrieve it for every entry in the leaderboard
            // if we didn't get passed in the details then we need to get them ourselves
            if (options.xuid &&
                (!options.leaderboard_details ||
                    Object.keys(options.leaderboard_details).length === 0 ||
                    !options.leaderboard_details.score ||
                    !options.leaderboard_details.matchesWon)) {
                let season = options.explicit_leaderboard ? options.explicit_leaderboard : LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard();
                // if we're not on the leaderboard then we need the wins to let the user know how many are missing to get onto the leaderboard
                options.leaderboard_details = LeaderboardsAPI.GetEntryDetailsObjectByXuid(season, options.xuid);
                //	_msg( 'fallback to leaderboard api call ' + season + ' ' + options.leaderboard_details.score ); 
            }
            if (options.leaderboard_details && Object.keys(options.leaderboard_details).length > 0) {
                rating = options.leaderboard_details.score;
                wins = options.leaderboard_details.matchesWon;
                rank = options.leaderboard_details.rank;
                pct = options.leaderboard_details.pct;
                _msg('got data from leaderboard_details');
            }
            else if (isLocalPlayer && options.xuid) {
                wins = FriendsListAPI.GetFriendCompetitiveWins(options.xuid, 'Premier');
                rating = FriendsListAPI.GetFriendCompetitiveRank(options.xuid, 'Premier');
                //	_msg( 'got data from friendslist' );
            }
        }
        // DISPLAY
        ///////////
        _msg(rating_type + root_panel.id);
        root_panel.SwitchClass('type', rating_type);
        let elSkillGroupImage = null;
        let imagePath = '';
        let winsNeededForRank = SessionUtil ? SessionUtil.GetNumWinsNeededForRank(rating_type) : 10; // a fancy of way of saying 10
        let isloading = rating === undefined ? true : false;
        let bTooFewWins = wins < winsNeededForRank;
        let bRatingExpired = !bTooFewWins && rating < 1;
        let bHasRating = !bRatingExpired && !bTooFewWins && !isloading;
        let ratingDesc = '';
        let tooltipText = '';
        let transitionDesc = '';
        // DEVONLY{
        _msg('\n\n');
        _msg('player: ' + FriendsListAPI.GetFriendName(options.xuid));
        _msg('rating: ' + rating);
        _msg('wins:   ' + wins + '\n\n');
        //}DEVONLY
        if (isloading) {
            ratingDesc = $.Localize('#SFUI_LOADING');
        }
        // WINGMAN or COMPETITIVE
        if (rating_type === 'Wingman' || rating_type === 'Competitive') {
            elSkillGroupImage = root_panel.FindChildTraverse('jsRating-' + rating_type);
            let locTypeModifer = rating_type === 'Competitive' ? '' : rating_type.toLowerCase();
            imagePath = locTypeModifer !== '' ? locTypeModifer : 'skillgroup';
            if (bTooFewWins || isloading) {
                if (!isLocalPlayer)
                    return false;
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_none.svg');
                if (!isloading) {
                    var winsneeded = Math.max(0, winsNeededForRank - wins);
                    elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_none.svg');
                    ratingDesc = $.Localize('#skillgroup_0' + locTypeModifer);
                    root_panel.SetDialogVariableInt("winsneeded", winsneeded);
                    tooltipText = $.Localize('#tooltip_skill_group_none' + imagePath, root_panel);
                }
            }
            else if (bRatingExpired) // expired
             {
                if (!isLocalPlayer)
                    return false;
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_expired.svg');
                ratingDesc = $.Localize('#skillgroup_expired' + locTypeModifer);
                tooltipText = $.Localize('#tooltip_skill_group_expired' + locTypeModifer);
            }
            else // has a rating
             {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
                ratingDesc = $.Localize('#skillgroup_' + rating);
                tooltipText = $.Localize('#tooltip_skill_group_generic' + locTypeModifer);
            }
        }
        // PREMIER
        else if (rating_type === 'Premier') {
            let elPremierRating = root_panel.FindChildTraverse('jsPremierRating');
            let presentation = options.presentation ? options.presentation : 'simple';
            root_panel.FindChildTraverse('JsSimpleNumbers').visible = presentation === 'simple';
            root_panel.FindChildTraverse('JsDigitPanels').visible = presentation === 'digital';
            let majorRating = '';
            let minorRating = '';
            if (bTooFewWins || isloading) {
                majorRating = '??';
                minorRating = '??';
                var winsneeded = (winsNeededForRank - wins);
                ratingDesc = $.Localize('#cs_rating_none');
                root_panel.SetDialogVariableInt("winsneeded", winsneeded);
                tooltipText = $.Localize('#tooltip_cs_rating_none' + imagePath, root_panel);
            }
            else if (bRatingExpired) // expired
             {
                if (!isLocalPlayer)
                    return false;
                majorRating = '??';
                minorRating = '??';
                ratingDesc = $.Localize('#cs_rating_expired');
                tooltipText = $.Localize('#tooltip_cs_rating_expired');
            }
            else if (wins && rating) // has a rating
             {
                let remappedRating = Math.floor(rating / 100.00 / 5);
                let clampedRating = Math.max(0, Math.min(remappedRating, 6));
                root_panel.SwitchClass('tier', 'tier-' + clampedRating);
                let arrRating = SplitRating(rating);
                majorRating = arrRating[0];
                minorRating = arrRating[1];
                if (do_fx && rating) {
                    //$.Msg( "Premier Particles", rating );
                    ratingParticleControls.UpdateRatingEffects(elPremierRating, remappedRating, rating);
                }
                if (rank && rank < 1000) // REPLACE WITH CALL TO GET CONSTANT FROM C-SIDE
                 {
                    root_panel.SetDialogVariableInt('rank', rank);
                    ratingDesc = $.Localize('#cs_rating_rank', root_panel);
                }
                else if (pct) {
                    root_panel.SetDialogVariable('percentile', pct.toFixed(2) + '');
                    ratingDesc = $.Localize('#cs_rating_percentile', root_panel);
                }
                else {
                    ratingDesc = $.Localize('#cs_rating_generic');
                }
                // relegation or promotion
                if (minorRating === '00') {
                    transitionDesc = $.Localize('cs_rating_relegation');
                }
                else if (minorRating === '99') {
                    transitionDesc = $.Localize('cs_rating_promotion');
                }
                tooltipText = $.Localize('#tooltip_cs_rating_generic');
            }
            _SetPremierRatingValue(root_panel, majorRating, minorRating, presentation);
        }
        // set text fields
        if (wins) {
            root_panel.SetDialogVariableInt('wins', wins);
            let winText = $.Localize('#tooltip_skill_group_wins', root_panel);
            tooltipText = (tooltipText !== '') ? tooltipText + '<br><br>' + winText : winText;
        }
        root_panel.Data().ratingDesc = ratingDesc;
        root_panel.Data().tooltipText = tooltipText;
        root_panel.Data().transitionDesc = transitionDesc;
        return bHasRating;
    }
    RatingEmblem.SetXuid = SetXuid;
    function _SetPremierRatingValue(root_panel, major, minor, premierPresentation) {
        // set premier values
        root_panel.SetDialogVariable('rating-major', major);
        root_panel.SetDialogVariable('rating-minor', minor);
        if (premierPresentation === 'digital') {
            const elMajor = $.GetContextPanel().FindChildTraverse('jsPremierRatingMajor');
            const elMinor = $.GetContextPanel().FindChildTraverse('jsPremierRatingMinor');
            let bFastSet = false;
            if (!$.GetContextPanel().FindChildTraverse('DigitPanel')) {
                DigitPanelFactory.MakeDigitPanel(elMajor, 2, '', 1, "#digitpanel_digits_premier");
                DigitPanelFactory.MakeDigitPanel(elMinor, 3, '', 1, "#digitpanel_digits_premier");
                bFastSet = true;
            }
            DigitPanelFactory.SetDigitPanelString(elMajor, major, bFastSet);
            DigitPanelFactory.SetDigitPanelString(elMinor, '.' + minor, bFastSet);
        }
    }
    function SplitRating(rating) {
        rating = rating / 100.00;
        let strRating = (String((rating).toFixed(2))).padStart(5, '0');
        let major = strRating.slice(0, 2);
        let minor = strRating.slice(-2);
        return [major, minor];
    }
    RatingEmblem.SplitRating = SplitRating;
})(RatingEmblem || (RatingEmblem = {}));
var ratingParticleControls;
(function (ratingParticleControls) {
    function GetAllChildren(panel) {
        const children = panel.Children();
        return [...children, ...children.flatMap(GetAllChildren)];
    }
    function IsParticleScenePanel(panel) {
        return panel.type === "ParticleScenePanel";
    }
    function colorConvert(tier) {
        let rarityColors = [
            //["default", 106, 97, 86],
            ["common", 176, 195, 217],
            ["uncommon", 94, 152, 217],
            ["rare", 75, 105, 255],
            ["mythical", 136, 71, 255],
            ["legendary", 211, 44, 230],
            ["ancient", 235, 75, 75],
            //["immortal", 228, 174, 57],
            //["strange", 207, 106, 50],
            ["unusual", 255, 215, 0],
        ];
        if (tier < 0 || tier >= rarityColors.length)
            return { R: 0, G: 0, B: 0 };
        let R = rarityColors[tier][1];
        let G = rarityColors[tier][2];
        let B = rarityColors[tier][3];
        return { R, G, B };
    }
    function UpdateRatingEffects(panelId, tier, tierProg) {
        const AllPanels = GetAllChildren(panelId);
        const RatingFxThreshold = 0.5;
        const PromoMatchRatingThreshold = .98;
        //remap to 7.xxx from 3.5xx
        var tierProgress = (tierProg / 100 / 5.0) - tier;
        var PromoMatch = (((tierProgress / 2) * 10) - Math.floor((tierProgress / 2) * 10));
        //Remap to get every 100 Units, then check for the .99 change
        var doPromoMatchRatingEffect = PromoMatch >= PromoMatchRatingThreshold && PromoMatch < .999 ? 1 : 0;
        $.Msg(" -- Tier 0 - 6 :" + tier + "\n -- 500 progress :" + tierProgress * 100 + "% \n -- is promoMatch :" + doPromoMatchRatingEffect);
        var tierColor = colorConvert(tier);
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel)) {
                if (tierProg > RatingFxThreshold) {
                    panel.StartParticles();
                    panel.SetParticleNameAndRefresh("particles/ui/premier_ratings_bg.vpcf");
                    panel.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
                    panel.SetControlPoint(17, tierProgress * 100, tier, doPromoMatchRatingEffect);
                }
                else {
                    panel.StopParticlesImmediately(true);
                }
            }
        }
    }
    ratingParticleControls.UpdateRatingEffects = UpdateRatingEffects;
})(ratingParticleControls || (ratingParticleControls = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQW9COUMsSUFBVSxZQUFZLENBMFdyQjtBQTFXRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztRQUUxQixDQUFDLENBQUMsR0FBRyxDQUFFLG9CQUFvQixHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBRyxVQUFtQjtRQUUzQyxPQUFPLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3RFLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUcsVUFBbUI7UUFFbEQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO0lBQ3RELENBQUM7SUFIZSwwQkFBYSxnQkFHNUIsQ0FBQTtJQUVELFNBQWdCLGNBQWMsQ0FBRyxVQUFtQjtRQUVuRCxPQUFPLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDdkQsQ0FBQztJQUhlLDJCQUFjLGlCQUc3QixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUcsVUFBbUI7UUFFdEQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDO0lBQzFELENBQUM7SUFIZSw4QkFBaUIsb0JBR2hDLENBQUE7SUFFRCxTQUFnQixPQUFPLENBQUcsT0FBNkI7UUFFdEQsSUFBSSxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDNUQsSUFBSSxNQUFNLEdBQXVCLFNBQVMsQ0FBQztRQUMzQyxJQUFJLElB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