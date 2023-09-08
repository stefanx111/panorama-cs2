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
        if (root_panel &&
            root_panel.IsValid() &&
            root_panel.FindChildTraverse('jsPremierRating') &&
            root_panel.FindChildTraverse('jsPremierRating').IsValid()) {
            return root_panel.FindChildTraverse('jsPremierRating').GetParent();
        }
        else {
            return null;
        }
    }
    function GetRatingDesc(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().ratingDesc : '';
    }
    RatingEmblem.GetRatingDesc = GetRatingDesc;
    function GetTooltipText(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().tooltipText : '';
    }
    RatingEmblem.GetTooltipText = GetTooltipText;
    function GetTierColorClass(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().colorClassName : '';
    }
    RatingEmblem.GetTierColorClass = GetTierColorClass;
    function GetEomDescText(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().eomDescText : '';
    }
    RatingEmblem.GetEomDescText = GetEomDescText;
    function GetIntroText(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().introText : '';
    }
    RatingEmblem.GetIntroText = GetIntroText;
    function GetPromotionState(root_panel) {
        let elMain = _GetMainPanel(root_panel);
        return elMain ? elMain.Data().promotionState : '';
    }
    RatingEmblem.GetPromotionState = GetPromotionState;
    function SetXuid(options) {
        let rating = undefined;
        let wins = undefined;
        let rank = undefined;
        let pct = undefined;
        let bFullDetails = options.hasOwnProperty('full_details') ? options.full_details : false;
        let source = options.api;
        let do_fx = options.do_fx;
        let rating_type = options.rating_type;
        let root_panel = _GetMainPanel(options.root_panel);
        if (!root_panel)
            return false;
        //DEVONLY{			
        // options.api = 'fakeData';
        //}DEVONLY			
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
                case 'mypersona':
                default:
                    rating_type = 'Premier';
                    break;
            }
        }
        if (options.xuid) {
            switch (source) {
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
                case 'mypersona':
                    if (rating_type === 'Competitive' && options.hasOwnProperty('rating_map')) {
                        // rating = MyPersonaAPI.GetCompetitiveIndividualMapRatings()[ options.rating_map ];
                        rating = MyPersonaAPI.GetPipRankCount(rating_type);
                    }
                    else {
                        rating = MyPersonaAPI.GetPipRankCount(rating_type);
                    }
                    wins = MyPersonaAPI.GetPipRankWins(rating_type);
                    break;
            }
        }
        if (rating_type === 'Premier') {
            // values were pushed down
            if (options.leaderboard_details && Object.keys(options.leaderboard_details).length > 0) {
                rating = options.leaderboard_details.score;
                wins = options.leaderboard_details.matchesWon;
                rank = options.leaderboard_details.rank;
                pct = options.leaderboard_details.pct;
                _msg('got data from leaderboard_details');
            }
        }
        // DISPLAY
        ///////////
        _msg(rating_type + root_panel.id);
        root_panel.SwitchClass('type', rating_type);
        if (bFullDetails) {
            _msg('making strings');
            root_panel.SetDialogVariable('rating_type', rating_type);
        }
        let elSkillGroupImage = null;
        let imagePath = '';
        let winsNeededForRank = SessionUtil ? SessionUtil.GetNumWinsNeededForRank(rating_type) : 10; // a fancy of way of saying 10
        let isloading = (rating === undefined || rating < 0);
        let bRatingExpired = rating === 0;
        let bTooFewWins = bRatingExpired && (wins < winsNeededForRank);
        let bHasRating = !bRatingExpired && !bTooFewWins && !isloading;
        let ratingDesc = '';
        let tooltipText = '';
        let eomDescText = '';
        let transitionText = '';
        let colorClassName = '';
        let introText = '';
        let promotionState = 0;
        //DEVONLY{
        _msg('\n\n');
        _msg('player: ' + FriendsListAPI.GetFriendName(options.xuid));
        _msg('rating: ' + rating);
        _msg('wins:   ' + wins + '\n\n');
        //}DEVONLY
        if (wins && wins < 0) {
            wins = 0;
        }
        if (isloading) {
            ratingDesc = $.Localize('#SFUI_LOADING');
        }
        // WINGMAN or COMPETITIVE
        if (rating_type === 'Wingman' || rating_type === 'Competitive') {
            elSkillGroupImage = root_panel.FindChildTraverse('jsRating-' + rating_type);
            let locTypeModifer = rating_type === 'Competitive' ? '' : rating_type.toLowerCase();
            imagePath = locTypeModifer !== '' ? locTypeModifer : 'skillgroup';
            if (bTooFewWins || isloading) {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_none.svg');
                if (!isloading) {
                    var winsneeded = Math.max(0, winsNeededForRank - wins);
                    elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_none.svg');
                    if (bFullDetails) {
                        ratingDesc = $.Localize('#skillgroup_0' + locTypeModifer);
                        root_panel.SetDialogVariableInt("winsneeded", winsneeded);
                        tooltipText = $.Localize('#tooltip_skill_group_none' + imagePath, root_panel);
                    }
                }
            }
            else if (bRatingExpired) // expired
             {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_expired.svg');
                if (bFullDetails) {
                    ratingDesc = $.Localize('#skillgroup_expired' + locTypeModifer);
                    tooltipText = $.Localize('#tooltip_skill_group_expired' + locTypeModifer);
                }
            }
            else // has a rating
             {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
                if (bFullDetails) {
                    ratingDesc = $.Localize('#skillgroup_' + rating);
                    tooltipText = $.Localize('#tooltip_skill_group_generic' + locTypeModifer);
                }
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
            root_panel.SwitchClass('tier', 'tier-0');
            // background
            _SetPremierBackgroundImage(root_panel, rating);
            if (rating && rating > 0) // has a rating
             {
                let remappedRating = Math.floor(rating / 1000.00 / 5);
                let clampedRating = Math.max(0, Math.min(remappedRating, 6));
                root_panel.SwitchClass('tier', 'tier-' + clampedRating);
                colorClassName = 'tier-' + clampedRating;
                let arrRating = SplitRating(rating);
                majorRating = arrRating[0];
                minorRating = arrRating[1];
                if (do_fx && rating) {
                    //$.Msg( "Premier Particles", rating );
                    ratingParticleControls.UpdateRatingEffects(elPremierRating, majorRating, minorRating.slice(-3));
                }
                if (bFullDetails) {
                    if (rank && rank <= LeaderboardsAPI.GetPremierLeaderboardTopBestCount()) {
                        root_panel.SetDialogVariableInt('rank', rank);
                        ratingDesc = $.Localize('#cs_rating_rank', root_panel);
                        eomDescText = ratingDesc;
                    }
                    else if (pct) {
                        root_panel.SetDialogVariable('percentile', pct.toFixed(2) + '');
                        ratingDesc = $.Localize('#cs_rating_percentile', root_panel);
                        eomDescText = ratingDesc;
                    }
                    else {
                        ratingDesc = $.Localize('#cs_rating_generic');
                    }
                    // relegation or promotion
                    if (minorRating.slice(-3) === '000') {
                        transitionText = $.Localize('#cs_rating_relegation');
                        introText = $.Localize('#cs_rating_intro_relegation');
                        eomDescText = transitionText;
                        promotionState = -1;
                        ratingDesc = transitionText;
                    }
                    else if (minorRating.slice(-3) === '999') {
                        transitionText = $.Localize('#cs_rating_promotion');
                        introText = $.Localize('#cs_rating_intro_promotion');
                        eomDescText = transitionText;
                        promotionState = 1;
                        ratingDesc = transitionText;
                    }
                    tooltipText = $.Localize('#tooltip_cs_rating_generic');
                }
            }
            else {
                if (bFullDetails) {
                    if (isloading) {
                        ratingDesc = $.Localize('#skillgroup_loading');
                    }
                    else if (bTooFewWins) {
                        var winsneeded = (winsNeededForRank - wins);
                        root_panel.SetDialogVariableInt("winsneeded", winsneeded);
                        tooltipText = $.Localize('#tooltip_cs_rating_none', root_panel);
                        eomDescText = $.Localize('#cs_rating_wins_needed_verbose', root_panel);
                        introText = $.Localize('#cs_rating_wins_needed_verbose', root_panel);
                        if (options.xuid && options.xuid === MyPersonaAPI.GetXuid()) {
                            ratingDesc = $.Localize('#cs_rating_wins_needed', root_panel);
                        }
                        else {
                            ratingDesc = $.Localize('#cs_rating_none');
                        }
                    }
                    else if (bRatingExpired) // expired
                     {
                        ratingDesc = $.Localize('#cs_rating_expired');
                        tooltipText = $.Localize('#tooltip_cs_rating_expired');
                        eomDescText = $.Localize('#eom-skillgroup-expired-premier', root_panel);
                        introText = $.Localize('#eom-skillgroup-expired-premier', root_panel);
                    }
                }
            }
            _SetEomStyleOverrides(options, root_panel);
            _SetPremierRatingValue(root_panel, majorRating, minorRating, presentation);
        }
        if (bFullDetails) {
            if (transitionText !== '') {
                tooltipText = tooltipText + '<br><br>' + transitionText;
            }
            // set text fields
            if (wins) {
                root_panel.SetDialogVariableInt('wins', wins);
                let winText = $.Localize('#tooltip_skill_group_wins', root_panel);
                tooltipText = (tooltipText !== '') ? tooltipText + '<br><br>' + winText : winText;
            }
            root_panel.Data().ratingDesc = ratingDesc;
            root_panel.Data().tooltipText = tooltipText;
            root_panel.Data().colorClassName = colorClassName;
            root_panel.Data().eomDescText = eomDescText;
            root_panel.Data().introText = introText;
            root_panel.Data().promotionState = promotionState;
        }
        root_panel.SwitchClass('rating_type', rating_type);
        return bHasRating;
    }
    RatingEmblem.SetXuid = SetXuid;
    function _SetPremierBackgroundImage(root_panel, rating) {
        let bgImage = (rating && rating > 0) ? 'premier_rating_bg_large.svg' : 'premier_rating_bg_large_none.svg';
        let elImage = root_panel.FindChildInLayoutFile('jsPremierRatingBg');
        elImage.SetImage('file://{images}/icons/ui/' + bgImage);
    }
    function _SetEomStyleOverrides(options, root_panel) {
        root_panel.FindChildInLayoutFile('JsDigitPanels').SwitchClass('emblemstyle', options.eom_digipanel_class_override ? options.eom_digipanel_class_override : '');
    }
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
                DigitPanelFactory.MakeDigitPanel(elMinor, 4, '', 1, "#digitpanel_digits_premier");
                bFastSet = true;
            }
            DigitPanelFactory.SetDigitPanelString(elMajor, major, bFastSet);
            DigitPanelFactory.SetDigitPanelString(elMinor, minor, bFastSet);
        }
    }
    function SplitRating(rating) {
        rating = rating / 1000.00;
        let strRating = (String((rating).toFixed(3))).padStart(6, '0');
        let major = strRating.slice(0, 2);
        let minor = strRating.slice(-3);
        major = major.replace(/^00/g, '  ');
        major = major.replace(/^0/g, ' ');
        if (major === '  ') {
            minor = minor.replace(/^00/g, '  ');
            minor = minor.replace(/^0/g, ' ');
        }
        else {
            minor = ',' + minor;
        }
        // return [ '35', ',888' ];
        // return [ '11', '111' ];
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
    ratingParticleControls.colorConvert = colorConvert;
    function UpdateRatingEffects(panelId, MajorRating, MinorRating) {
        const AllPanels = GetAllChildren(panelId);
        let ratingEffect = [
            "particles/ui/premier_ratings_bg.vpcf",
            "particles/ui/premier_ratings_promomatch.vpcf",
            "particles/ui/premier_ratings_relegation.vpcf"
        ];
        let matchType = 0;
        if (MinorRating === '000') {
            matchType = 2;
        }
        else if (MinorRating === '999') {
            matchType = 1;
        }
        let tier = Math.floor(+MajorRating / 5.0);
        var tierColor = colorConvert(tier);
        //$.Msg(" -- Tier 0 - 6 :" + tier + "\n -- 500 progress :" + MajorRating  + "% \n -- is promoMatch :" + matchType );
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel)) {
                if (+MajorRating > 0) {
                    panel.StartParticles();
                    panel.SetParticleNameAndRefresh(ratingEffect[matchType]);
                    panel.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
                    // panel.SetControlPoint( 17, tierProgress * 100, tier, doPromoMatchRatingEffect );	
                }
                else {
                    panel.StopParticlesImmediately(true);
                }
            }
        }
        // var tierProgress = (MajorRating/1000/5.0) - tier;
        // var PromoMatch = ((( tierProgress / 2) * 10) - Math.floor(( tierProgress / 2) * 10))
        // //Remap to get every 100 Units, then check for the .99 change
        // var doPromoMatchRatingEffect = PromoMatch >= PromoMatchRatingThreshold  && PromoMatch < .9999 ? 1 : 0;
        // //$.Msg(" -- Tier 0 - 6 :" + tier + "\n -- 500 progress :" + tierProgress*100  + "% \n -- is promoMatch :" + doPromoMatchRatingEffect );
        // var tierColor = colorConvert( tier );
        // for ( const panel of AllPanels )
        // {
        // 	if ( IsParticleScenePanel( panel ) )
        // 	{
        // 		if ( tierProg > RatingFxThreshold )
        // 		{
        // 			panel.StartParticles();
        // 			panel.SetParticleNameAndRefresh( ratingEffect[matchType] );
        // 			panel.SetControlPoint( 16, tierColor.R, tierColor.G, tierColor.B );
        // 			panel.SetControlPoint( 17, tierProgress * 100, tier, doPromoMatchRatingEffect );	
        // 		}
        // 		else
        // 		{
        // 			panel.StopParticlesImmediately( true );
        // 		}
        // 	}
        // }
    }
    ratingParticleControls.UpdateRatingEffects = UpdateRatingEffects;
})(ratingParticleControls || (ratingParticleControls = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQXVCOUMsSUFBVSxZQUFZLENBbWRyQjtBQW5kRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztRQUUxQixDQUFDLENBQUMsR0FBRyxDQUFFLG9CQUFvQixHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBRyxVQUFtQjtRQUUzQyxJQUFLLFVBQVU7WUFDZCxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ3BCLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRTtZQUNqRCxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQyxPQUFPLEVBQUUsRUFDNUQ7WUFDQyxPQUFPLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO1NBQ3JFO2FBRUQ7WUFDQyxPQUFPLElBQUksQ0FBQztTQUNaO0lBQ0YsQ0FBQztJQUVELFNBQWdCLGFBQWEsQ0FBRyxVQUFtQjtRQUVsRCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUM7UUFDekMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBSmUsMEJBQWEsZ0JBSTVCLENBQUE7SUFFRCxTQUFnQixjQUFjLENBQUcsVUFBbUI7UUFFbkQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUplLDJCQUFjLGlCQUk3QixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUcsVUFBbUI7UUFFdEQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbkQsQ0FBQztJQUplLDhCQUFpQixvQkFJaEMsQ0FBQTtJQUVELFNBQWdCLGNBQWMsQ0FBRyxVQUFtQjtRQUVuRCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUM7UUFDekMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBSmUsMkJBQWMsaUJBSTdCLENBQUE7SUFFRCxTQUFnQixZQUFZLENBQUcsVUFBbUI7UUFFakQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDOUMsQ0FBQztJQUplLHlCQUFZLGVBSTNCLENBQUE7SUFFRCxTQUFnQixpQkFBaUIsQ0FBRyxVQUFtQjtRQUV0RCxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUM7UUFDekMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0lBSmUsOEJBQWlCLG9CQUloQyxDQUFBO0lBRUQsU0FBZ0IsT0FBTyxDQUFHLE9BQTZCO1FBRXRELElBQUksTUFBTSxHQUF1QixTQUFTLENBQUM7UUFDM0MsSUFBSSxJQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUN6QyxJQUFJLElBQUksR0FBdUIsU0FBUyxDQUFDO1FBQ3pDLElBQUksR0FBRyxHQUF1QixTQUFTLENBQUM7UUFDeEMsSUFBSSxZQUFZLEdBQVksT0FBTyxDQUFDLGNBQWMsQ0FBRSxjQUFjLENBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBRXJHLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDekIsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUUxQixJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBZ0MsQ0FBQztRQUUzRCxJQUFJLFVBQVUsR0FBRyxhQUFhLENBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBRSxDQUFDO1FBRXJELElBQUssQ0FBQyxVQUFVO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFFaEIsYUFBYTtRQUNYLDRCQUE0QjtRQUM5QixhQUFhO1FBRVgsSUFBSyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUNqQztZQUNDLFFBQVMsTUFBTSxFQUNmO2dCQUNDLEtBQUssU0FBUztvQkFDYixXQUFXLEdBQUcsY0FBYyxDQUFDLDRCQUE0QixDQUFFLE9BQU8sQ0FBQyxJQUFJLENBQXVCLENBQUM7b0JBQy9GLE1BQU07Z0JBRVAsS0FBSyxXQUFXO29CQUNmLFdBQVcsR0FBRyxZQUFZLENBQUMsNEJBQTRCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBdUIsQ0FBQztvQkFDN0YsTUFBTTtnQkFFUCxLQUFLLFdBQVc7b0JBQ2YsV0FBVyxHQUFHLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBRSxPQUFPLENBQUMsSUFBSSxDQUF1QixDQUFDO29CQUM1RixNQUFNO2dCQUVQLEtBQUssV0FBVyxDQUFDO2dCQUNqQjtvQkFDQyxXQUFXLEdBQUcsU0FBUyxDQUFDO29CQUN4QixNQUFNO2FBQ1A7U0FDRDtRQUVELElBQUssT0FBTyxDQUFDLElBQUksRUFDakI7WUFDQyxRQUFTLE1BQU0sRUFDZjtnQkFDQyxLQUFLLFNBQVM7b0JBQ2IsTUFBTSxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBRSxPQUFPLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBRSxDQUFDO29CQUM5RSxJQUFJLEdBQUcsY0FBYyxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFFLENBQUM7b0JBQzVFLE1BQU07Z0JBRVAsS0FBSyxXQUFXO29CQUNmLE1BQU0sR0FBRyxZQUFZLENBQUMsd0JBQXdCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBRSxDQUFDO29CQUMvRCxJQUFJLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUUsQ0FBQztvQkFDN0QsTUFBTTtnQkFFUCxLQUFLLFdBQVc7b0JBQ2YsTUFBTSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsQ0FBRSxPQUFPLENBQUMsSUFBSSxDQUFFLENBQUM7b0JBQ2pFLElBQUksR0FBRyxXQUFXLENBQUMsd0JBQXdCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBRSxDQUFDO29CQUM1RCxNQUFNO2dCQUVQLEtBQUssV0FBVztvQkFFZixJQUFLLFdBQVcsS0FBSyxhQUFhLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBRSxZQUFZLENBQUUsRUFDNUU7d0JBQ0Msb0ZBQW9GO3dCQUNwRixNQUFNLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBRSxXQUFXLENBQUUsQ0FBQztxQkFFckQ7eUJBRUQ7d0JBQ0MsTUFBTSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUUsV0FBVyxDQUFFLENBQUM7cUJBQ3JEO29CQUNELElBQUksR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFFLFdBQVcsQ0FBRSxDQUFDO29CQUNsRCxNQUFNO2FBQ1A7U0FDRDtRQUVELElBQUssV0FBVyxLQUFLLFNBQVMsRUFDOUI7WUFFQywwQkFBMEI7WUFDMUIsSUFBSyxPQUFPLENBQUMsbUJBQW1CLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN2RjtnQkFDQyxNQUFNLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztnQkFDM0MsSUFBSSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUM7Z0JBQzlDLElBQUksR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDO2dCQUN4QyxHQUFHLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztnQkFFdEMsSUFBSSxDQUFFLG1DQUFtQyxDQUFFLENBQUM7YUFDNUM7U0FDRDtRQUVELFVBQVU7UUFDVixXQUFXO1FBRVgsSUFBSSxDQUFFLFdBQVcsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFFLENBQUM7UUFDcEMsVUFBVSxDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsV0FBVyxDQUFFLENBQUM7UUFFOUMsSUFBSyxZQUFZLEVBQ2pCO1lBQ0MsSUFBSSxDQUFFLGdCQUFnQixDQUFFLENBQUM7WUFDekIsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGFBQWEsRUFBRSxXQUFXLENBQUUsQ0FBQztTQUMzRDtRQUVELElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVuQixJQUFJLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFFLFdBQVcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7UUFDN0gsSUFBSSxTQUFTLEdBQUcsQ0FBRSxNQUFNLEtBQUssU0FBUyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUsQ0FBQztRQUV2RCxJQUFJLGNBQWMsR0FBRyxNQUFPLEtBQUssQ0FBQyxDQUFDO1FBQ25DLElBQUksV0FBVyxHQUFHLGNBQWMsSUFBSSxDQUFFLElBQUssR0FBRyxpQkFBaUIsQ0FBRSxDQUFDO1FBRWxFLElBQUksVUFBVSxHQUFHLENBQUMsY0FBYyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBRS9ELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLGNBQWMsR0FBRyxFQUFFLENBQUM7UUFDeEIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ25CLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQztRQUN6QixVQUFVO1FBQ1IsSUFBSSxDQUFFLE1BQU0sQ0FBRSxDQUFDO1FBQ2YsSUFBSSxDQUFFLFVBQVUsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFFLE9BQU8sQ0FBQyxJQUFLLENBQUUsQ0FBRSxDQUFDO1FBQ25FLElBQUksQ0FBRSxVQUFVLEdBQUcsTUFBTSxDQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFFLFVBQVUsR0FBRyxJQUFJLEdBQUcsTUFBTSxDQUFFLENBQUM7UUFDckMsVUFBVTtRQUNSLElBQUssSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQ3JCO1lBQ0MsSUFBSSxHQUFHLENBQUMsQ0FBQztTQUNUO1FBRUQsSUFBSyxTQUFTLEVBQ2Q7WUFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxlQUFlLENBQUUsQ0FBQztTQUMzQztRQUVELHlCQUF5QjtRQUN6QixJQUFLLFdBQVcsS0FBSyxTQUFTLElBQUksV0FBVyxLQUFLLGFBQWEsRUFDL0Q7WUFDQyxpQkFBaUIsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUUsV0FBVyxHQUFHLFdBQVcsQ0FBYSxDQUFDO1lBQ3pGLElBQUksY0FBYyxHQUFHLFdBQVcsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BGLFNBQVMsR0FBRyxjQUFjLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztZQUVsRSxJQUFLLFdBQVcsSUFBSSxTQUFTLEVBQzdCO2dCQUNDLGlCQUFpQixDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsR0FBRyxTQUFTLEdBQUcsV0FBVyxDQUFFLENBQUM7Z0JBRTdGLElBQUssQ0FBQyxTQUFTLEVBQ2Y7b0JBQ0MsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBRSxDQUFDLEVBQUUsaUJBQWlCLEdBQUcsSUFBSyxDQUFFLENBQUM7b0JBQzFELGlCQUFpQixDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsR0FBRyxTQUFTLEdBQUcsV0FBVyxDQUFFLENBQUM7b0JBRTdGLElBQUssWUFBWSxFQUNqQjt3QkFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxlQUFlLEdBQUcsY0FBYyxDQUFFLENBQUM7d0JBQzVELFVBQVUsQ0FBQyxvQkFBb0IsQ0FBRSxZQUFZLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQzVELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDJCQUEyQixHQUFHLFNBQVMsRUFBRSxVQUFVLENBQUUsQ0FBQztxQkFDaEY7aUJBQ0Q7YUFDRDtpQkFDSSxJQUFLLGNBQWMsRUFBRyxVQUFVO2FBQ3JDO2dCQUNDLGlCQUFpQixDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsR0FBRyxTQUFTLEdBQUcsY0FBYyxDQUFFLENBQUM7Z0JBRWhHLElBQUssWUFBWSxFQUNqQjtvQkFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxxQkFBcUIsR0FBRyxjQUFjLENBQUUsQ0FBQztvQkFDbEUsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsOEJBQThCLEdBQUcsY0FBYyxDQUFFLENBQUM7aUJBQzVFO2FBQ0Q7aUJBQ0ksZUFBZTthQUNwQjtnQkFDQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUUsb0NBQW9DLEdBQUcsU0FBUyxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUUsQ0FBQztnQkFFakcsSUFBSyxZQUFZLEVBQ2pCO29CQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGNBQWMsR0FBRyxNQUFNLENBQUUsQ0FBQztvQkFDbkQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsOEJBQThCLEdBQUcsY0FBYyxDQUFFLENBQUM7aUJBQzVFO2FBQ0Q7U0FDRDtRQUVELFVBQVU7YUFDTCxJQUFLLFdBQVcsS0FBSyxTQUFTLEVBQ25DO1lBQ0MsSUFBSSxlQUFlLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGlCQUFpQixDQUFhLENBQUM7WUFDbkYsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBRTFFLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRyxDQUFDLE9BQU8sR0FBRyxZQUFZLEtBQUssUUFBUSxDQUFDO1lBQ3ZGLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxlQUFlLENBQUcsQ0FBQyxPQUFPLEdBQUcsWUFBWSxLQUFLLFNBQVMsQ0FBQztZQUV0RixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDckIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBRXJCLFVBQVUsQ0FBQyxXQUFXLENBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1lBRTNDLGFBQWE7WUFDYiwwQkFBMEIsQ0FBRSxVQUFVLEVBQUUsTUFBTSxDQUFFLENBQUM7WUFFakQsSUFBSyxNQUFNLElBQUksTUFBTSxHQUFHLENBQUMsRUFBRyxlQUFlO2FBQzNDO2dCQUNDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsTUFBTyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUUsQ0FBQztnQkFDekQsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBRSxjQUFjLEVBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBQztnQkFFakUsVUFBVSxDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsT0FBTyxHQUFHLGFBQWEsQ0FBRSxDQUFDO2dCQUMxRCxjQUFjLEdBQUcsT0FBTyxHQUFHLGFBQWEsQ0FBQztnQkFFekMsSUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFFLE1BQU8sQ0FBRSxDQUFDO2dCQUV2QyxXQUFXLEdBQUcsU0FBUyxDQUFFLENBQUMsQ0FBRSxDQUFDO2dCQUM3QixXQUFXLEdBQUcsU0FBUyxDQUFFLENBQUMsQ0FBRSxDQUFDO2dCQUU3QixJQUFLLEtBQUssSUFBSSxNQUFNLEVBQ3BCO29CQUNDLHVDQUF1QztvQkFDdkMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQztpQkFDbEc7Z0JBRUQsSUFBSyxZQUFZLEVBQ2pCO29CQUNDLElBQUssSUFBSSxJQUFJLElBQUksSUFBSSxlQUFlLENBQUMsaUNBQWlDLEVBQUUsRUFDeEU7d0JBRUMsVUFBVSxDQUFDLG9CQUFvQixDQUFFLE1BQU0sRUFBRSxJQUFJLENBQUUsQ0FBQzt3QkFDaEQsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsaUJBQWlCLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQ3pELFdBQVcsR0FBRyxVQUFVLENBQUM7cUJBRXpCO3lCQUNJLElBQUssR0FBRyxFQUNiO3dCQUNDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBRSxDQUFDLENBQUUsR0FBRyxFQUFFLENBQUUsQ0FBQzt3QkFDcEUsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsdUJBQXVCLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQy9ELFdBQVcsR0FBRyxVQUFVLENBQUM7cUJBRXpCO3lCQUVEO3dCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7cUJBQ2hEO29CQUdELDBCQUEwQjtvQkFDMUIsSUFBSyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxFQUNwQzt3QkFDQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO3dCQUN2RCxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFDO3dCQUN4RCxXQUFXLEdBQUcsY0FBYyxDQUFDO3dCQUM3QixjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBRXBCLFVBQVUsR0FBRyxjQUFjLENBQUM7cUJBRTVCO3lCQUNJLElBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssRUFDekM7d0JBQ0MsY0FBYyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsc0JBQXNCLENBQUUsQ0FBQzt3QkFDdEQsU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsNEJBQTRCLENBQUUsQ0FBQzt3QkFDdkQsV0FBVyxHQUFHLGNBQWMsQ0FBQzt3QkFDN0IsY0FBYyxHQUFHLENBQUMsQ0FBQzt3QkFDbkIsVUFBVSxHQUFHLGNBQWMsQ0FBQztxQkFDNUI7b0JBRUQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsNEJBQTRCLENBQUUsQ0FBQztpQkFDekQ7YUFDRDtpQkFFRDtnQkFFQyxJQUFLLFlBQVksRUFDakI7b0JBQ0MsSUFBSyxTQUFTLEVBQ2Q7d0JBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUscUJBQXFCLENBQUUsQ0FBQztxQkFDakQ7eUJBQ0ksSUFBSyxXQUFXLEVBQ3JCO3dCQUNDLElBQUksVUFBVSxHQUFHLENBQUUsaUJBQWlCLEdBQUcsSUFBSyxDQUFFLENBQUM7d0JBQy9DLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBRSxZQUFZLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQzVELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHlCQUF5QixFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUNsRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxnQ0FBZ0MsRUFBRSxVQUFVLENBQUUsQ0FBQzt3QkFDekUsU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsZ0NBQWdDLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBR3ZFLElBQUssT0FBTyxDQUFDLElBQUksSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFDNUQ7NEJBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsd0JBQXdCLEVBQUUsVUFBVSxDQUFFLENBQUM7eUJBQ2hFOzZCQUVEOzRCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGlCQUFpQixDQUFFLENBQUM7eUJBQzdDO3FCQUdEO3lCQUNJLElBQUssY0FBYyxFQUFHLFVBQVU7cUJBQ3JDO3dCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLENBQUM7d0JBQ2hELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDRCQUE0QixDQUFFLENBQUM7d0JBQ3pELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGlDQUFpQyxFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUMxRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxpQ0FBaUMsRUFBRSxVQUFVLENBQUUsQ0FBQztxQkFFeEU7aUJBQ0Q7YUFDRDtZQUVELHFCQUFxQixDQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUUzQyxzQkFBc0IsQ0FBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUUsQ0FBQztTQUM3RTtRQUVELElBQUssWUFBWSxFQUNqQjtZQUNDLElBQUssY0FBYyxLQUFLLEVBQUUsRUFDMUI7Z0JBQ0MsV0FBVyxHQUFHLFdBQVcsR0FBRyxVQUFVLEdBQUcsY0FBYyxDQUFDO2FBQ3hEO1lBRUQsa0JBQWtCO1lBQ2xCLElBQUssSUFBSSxFQUNUO2dCQUNDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsSUFBSyxDQUFFLENBQUM7Z0JBQ2pELElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsMkJBQTJCLEVBQUUsVUFBVSxDQUFFLENBQUM7Z0JBRXBFLFdBQVcsR0FBRyxDQUFFLFdBQVcsS0FBSyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLFVBQVUsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNwRjtZQUVELFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1lBQzFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQzVDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1lBQ2xELFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQzVDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQ3hDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1NBRWxEO1FBRUQsVUFBVSxDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsV0FBVyxDQUFFLENBQUM7UUFFckQsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQXZWZSxvQkFBTyxVQXVWdEIsQ0FBQTtJQUVELFNBQVMsMEJBQTBCLENBQUcsVUFBa0IsRUFBRSxNQUF3QjtRQUVqRixJQUFJLE9BQU8sR0FBRyxDQUFFLE1BQU0sSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQztRQUM1RyxJQUFJLE9BQU8sR0FBRyxVQUFVLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQWEsQ0FBQztRQUNqRixPQUFPLENBQUMsUUFBUSxDQUFFLDJCQUEyQixHQUFHLE9BQU8sQ0FBRSxDQUFDO0lBQzNELENBQUM7SUFHRCxTQUFTLHFCQUFxQixDQUFHLE9BQTZCLEVBQUUsVUFBa0I7UUFFakYsVUFBVSxDQUFDLHFCQUFxQixDQUFFLGVBQWUsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25LLENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFHLFVBQW1CLEVBQUUsS0FBYSxFQUFFLEtBQWEsRUFBRSxtQkFBMEM7UUFFOUgscUJBQXFCO1FBQ3JCLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFDdEQsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxLQUFLLENBQUUsQ0FBQztRQUV0RCxJQUFLLG1CQUFtQixLQUFLLFNBQVMsRUFDdEM7WUFDQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsaUJBQWlCLENBQUUsc0JBQXNCLENBQUcsQ0FBQztZQUNqRixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsaUJBQWlCLENBQUUsc0JBQXNCLENBQUcsQ0FBQztZQUVqRixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFDckIsSUFBSyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBRSxZQUFZLENBQUUsRUFDM0Q7Z0JBQ0MsaUJBQWlCLENBQUMsY0FBYyxDQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSw0QkFBNEIsQ0FBRSxDQUFDO2dCQUNwRixpQkFBaUIsQ0FBQyxjQUFjLENBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLDRCQUE0QixDQUFFLENBQUM7Z0JBRXBGLFFBQVEsR0FBRyxJQUFJLENBQUM7YUFDaEI7WUFFRCxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBRSxDQUFDO1lBQ2xFLGlCQUFpQixDQUFDLG1CQUFtQixDQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFFLENBQUM7U0FDbEU7SUFDRixDQUFDO0lBRUQsU0FBZ0IsV0FBVyxDQUFHLE1BQWM7UUFFM0MsTUFBTSxHQUFHLE1BQU0sR0FBRyxPQUFPLENBQUM7UUFFMUIsSUFBSSxTQUFTLEdBQUcsQ0FBRSxNQUFNLENBQUUsQ0FBRSxNQUFNLENBQUUsQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxDQUFDLEVBQUUsR0FBRyxDQUFFLENBQUM7UUFDekUsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLENBQUM7UUFDcEMsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBRSxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBRWxDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFFLE1BQU0sRUFBRSxJQUFJLENBQUUsQ0FBQztRQUN0QyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxLQUFLLEVBQUUsR0FBRyxDQUFFLENBQUM7UUFFcEMsSUFBSyxLQUFLLEtBQUssSUFBSSxFQUNuQjtZQUNDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFFLE1BQU0sRUFBRSxJQUFJLENBQUUsQ0FBQztZQUN0QyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxLQUFLLEVBQUUsR0FBRyxDQUFFLENBQUM7U0FDcEM7YUFFRDtZQUNDLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDO1NBQ3BCO1FBRUQsMkJBQTJCO1FBQzNCLDBCQUEwQjtRQUUxQixPQUFPLENBQUUsS0FBSyxFQUFFLEtBQUssQ0FBRSxDQUFDO0lBQ3pCLENBQUM7SUF6QmUsd0JBQVcsY0F5QjFCLENBQUE7QUFDRixDQUFDLEVBbmRTLFlBQVksS0FBWixZQUFZLFFBbWRyQjtBQUVELElBQVUsc0JBQXNCLENBK0cvQjtBQS9HRCxXQUFVLHNCQUFzQjtJQUUvQixTQUFTLGNBQWMsQ0FBRyxLQUFjO1FBRXZDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPLENBQUUsR0FBRyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFFLGNBQWMsQ0FBRSxDQUFFLENBQUM7SUFDL0QsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsS0FBYztRQUU3QyxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUM7SUFDNUMsQ0FBQztJQUVELFNBQWdCLFlBQVksQ0FBRyxJQUFZO1FBRTFDLElBQUksWUFBWSxHQUE4QztZQUM3RCwyQkFBMkI7WUFDM0IsQ0FBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUU7WUFDM0IsQ0FBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUU7WUFDNUIsQ0FBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUU7WUFDeEIsQ0FBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUU7WUFDNUIsQ0FBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUU7WUFDN0IsQ0FBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUU7WUFDMUIsNkJBQTZCO1lBQzdCLDRCQUE0QjtZQUM1QixDQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBRTtTQUMxQixDQUFDO1FBRUYsSUFBSyxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxZQUFZLENBQUMsTUFBTTtZQUMzQyxPQUFPLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsR0FBRyxZQUFZLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFFLElBQUksQ0FBRSxDQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUVsQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBdkJlLG1DQUFZLGVBdUIzQixDQUFBO0lBR0QsU0FBZ0IsbUJBQW1CLENBQUcsT0FBZ0IsRUFBRSxXQUFtQixFQUFFLFdBQW1CO1FBRy9GLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBRSxPQUFPLENBQUUsQ0FBQztRQUU1QyxJQUFJLFlBQVksR0FBYTtZQUM1QixzQ0FBc0M7WUFDdEMsOENBQThDO1lBQzlDLDhDQUE4QztTQUM3QyxDQUFDO1FBRUgsSUFBSSxTQUFTLEdBQVcsQ0FBQyxDQUFDO1FBRTFCLElBQUssV0FBVyxLQUFLLEtBQUssRUFDMUI7WUFDQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1NBQ2Q7YUFDSSxJQUFLLFdBQVcsS0FBSyxLQUFLLEVBQy9CO1lBQ0MsU0FBUyxHQUFHLENBQUMsQ0FBQztTQUNkO1FBRUQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUUsQ0FBQztRQUM1QyxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFckMsb0hBQW9IO1FBR3BILEtBQU0sTUFBTSxLQUFLLElBQUksU0FBUyxFQUM5QjtZQUNDLElBQUssb0JBQW9CLENBQUUsS0FBSyxDQUFFLEVBQ2xDO2dCQUNDLElBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUNyQjtvQkFDQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQ3ZCLEtBQUssQ0FBQyx5QkFBeUIsQ0FBRSxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUUsQ0FBQztvQkFDM0QsS0FBSyxDQUFDLGVBQWUsQ0FBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUUsQ0FBQztvQkFDbkUsb0ZBQW9GO2lCQUNwRjtxQkFFRDtvQkFDQyxLQUFLLENBQUMsd0JBQXdCLENBQUUsSUFBSSxDQUFFLENBQUM7aUJBQ3ZDO2FBQ0Q7U0FDRDtRQUlELG9EQUFvRDtRQUNwRCx1RkFBdUY7UUFDdkYsZ0VBQWdFO1FBQ2hFLHlHQUF5RztRQUN6RywySUFBMkk7UUFDM0ksd0NBQXdDO1FBQ3hDLG1DQUFtQztRQUNuQyxJQUFJO1FBQ0osd0NBQXdDO1FBQ3hDLEtBQUs7UUFDTCx3Q0FBd0M7UUFDeEMsTUFBTTtRQUNOLDZCQUE2QjtRQUM3QixpRUFBaUU7UUFDakUseUVBQXlFO1FBQ3pFLHVGQUF1RjtRQUN2RixNQUFNO1FBQ04sU0FBUztRQUNULE1BQU07UUFDTiw2Q0FBNkM7UUFDN0MsTUFBTTtRQUNOLEtBQUs7UUFDTCxJQUFJO0lBQ0wsQ0FBQztJQXZFZSwwQ0FBbUIsc0JBdUVsQyxDQUFBO0FBQ0YsQ0FBQyxFQS9HUyxzQkFBc0IsS0FBdEIsc0JBQXNCLFFBK0cvQiJ9