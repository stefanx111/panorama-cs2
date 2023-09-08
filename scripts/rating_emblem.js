"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="digitpanel.ts" />
/// <reference path="common/sessionutil.ts" />
var RatingEmblem;
(function (RatingEmblem) {
    function _msg(msg) {
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
            if (options.leaderboard_details && Object.keys(options.leaderboard_details).length > 0) {
                rating = options.leaderboard_details.score;
                wins = options.leaderboard_details.matchesWon;
                rank = options.leaderboard_details.rank;
                pct = options.leaderboard_details.pct;
                _msg('got data from leaderboard_details');
            }
        }
        _msg(rating_type + root_panel.id);
        root_panel.SwitchClass('type', rating_type);
        if (bFullDetails) {
            _msg('making strings');
            root_panel.SetDialogVariable('rating_type', rating_type);
        }
        let elSkillGroupImage = null;
        let imagePath = '';
        let winsNeededForRank = SessionUtil ? SessionUtil.GetNumWinsNeededForRank(rating_type) : 10;
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
        if (wins && wins < 0) {
            wins = 0;
        }
        if (isloading) {
            ratingDesc = $.Localize('#SFUI_LOADING');
        }
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
            else if (bRatingExpired) {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_expired.svg');
                if (bFullDetails) {
                    ratingDesc = $.Localize('#skillgroup_expired' + locTypeModifer);
                    tooltipText = $.Localize('#tooltip_skill_group_expired' + locTypeModifer);
                }
            }
            else {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
                if (bFullDetails) {
                    ratingDesc = $.Localize('#skillgroup_' + rating);
                    tooltipText = $.Localize('#tooltip_skill_group_generic' + locTypeModifer);
                }
            }
        }
        else if (rating_type === 'Premier') {
            let elPremierRating = root_panel.FindChildTraverse('jsPremierRating');
            let presentation = options.presentation ? options.presentation : 'simple';
            root_panel.FindChildTraverse('JsSimpleNumbers').visible = presentation === 'simple';
            root_panel.FindChildTraverse('JsDigitPanels').visible = presentation === 'digital';
            let majorRating = '';
            let minorRating = '';
            root_panel.SwitchClass('tier', 'tier-0');
            _SetPremierBackgroundImage(root_panel, rating);
            if (rating && rating > 0) {
                let remappedRating = Math.floor(rating / 1000.00 / 5);
                let clampedRating = Math.max(0, Math.min(remappedRating, 6));
                root_panel.SwitchClass('tier', 'tier-' + clampedRating);
                colorClassName = 'tier-' + clampedRating;
                let arrRating = SplitRating(rating);
                majorRating = arrRating[0];
                minorRating = arrRating[1];
                if (do_fx && rating) {
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
                    else if (bRatingExpired) {
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
            ["common", 176, 195, 217],
            ["uncommon", 94, 152, 217],
            ["rare", 75, 105, 255],
            ["mythical", 136, 71, 255],
            ["legendary", 211, 44, 230],
            ["ancient", 235, 75, 75],
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
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel)) {
                if (+MajorRating > 0) {
                    panel.StartParticles();
                    panel.SetParticleNameAndRefresh(ratingEffect[matchType]);
                    panel.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
                }
                else {
                    panel.StopParticlesImmediately(true);
                }
            }
        }
    }
    ratingParticleControls.UpdateRatingEffects = UpdateRatingEffects;
})(ratingParticleControls || (ratingParticleControls = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQXVCOUMsSUFBVSxZQUFZLENBbWRyQjtBQW5kRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztJQUczQixDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUcsVUFBbUI7UUFFM0MsSUFBSyxVQUFVO1lBQ2QsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUNwQixVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUU7WUFDakQsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGlCQUFpQixDQUFFLENBQUMsT0FBTyxFQUFFLEVBQzVEO1lBQ0MsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNyRTthQUVEO1lBQ0MsT0FBTyxJQUFJLENBQUM7U0FDWjtJQUNGLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUcsVUFBbUI7UUFFbEQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUplLDBCQUFhLGdCQUk1QixDQUFBO0lBRUQsU0FBZ0IsY0FBYyxDQUFHLFVBQW1CO1FBRW5ELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUN6QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFKZSwyQkFBYyxpQkFJN0IsQ0FB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