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
    function GetTierColorClass(root_panel) {
        return _GetMainPanel(root_panel).Data().colorClassName;
    }
    RatingEmblem.GetTierColorClass = GetTierColorClass;
    function GetEomDescText(root_panel) {
        return _GetMainPanel(root_panel).Data().eomDescText;
    }
    RatingEmblem.GetEomDescText = GetEomDescText;
    function GetIntroText(root_panel) {
        return _GetMainPanel(root_panel).Data().introText;
    }
    RatingEmblem.GetIntroText = GetIntroText;
    function GetPromotionState(root_panel) {
        return _GetMainPanel(root_panel).Data().promotionState;
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
        let bFetchLocalPlayerData = false;
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
                    rating = MyPersonaAPI.GetPipRankCount(rating_type);
                    wins = MyPersonaAPI.GetPipRankWins(rating_type);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQXNCOUMsSUFBVSxZQUFZLENBMmNyQjtBQTNjRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztRQUUxQixDQUFDLENBQUMsR0FBRyxDQUFFLG9CQUFvQixHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBRyxVQUFtQjtRQUUzQyxPQUFPLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3RFLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUcsVUFBbUI7UUFFbEQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDO0lBQ3RELENBQUM7SUFIZSwwQkFBYSxnQkFHNUIsQ0FBQTtJQUVELFNBQWdCLGNBQWMsQ0FBRyxVQUFtQjtRQUVuRCxPQUFPLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDdkQsQ0FBQztJQUhlLDJCQUFjLGlCQUc3QixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUcsVUFBbUI7UUFFdEQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDO0lBQzFELENBQUM7SUFIZSw4QkFBaUIsb0JBR2hDLENBQUE7SUFFRCxTQUFnQixjQUFjLENBQUcsVUFBbUI7UUFFbkQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ3ZELENBQUM7SUFIZSwyQkFBYyxpQkFHN0IsQ0FBQTtJQUVELFNBQWdCLFlBQVks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