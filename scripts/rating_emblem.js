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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQXNCOUMsSUFBVSxZQUFZLENBNmRyQjtBQTdkRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztJQUczQixDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUcsVUFBbUI7UUFFM0MsSUFBSyxVQUFVO1lBQ2QsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUNwQixVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUU7WUFDakQsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGlCQUFpQixDQUFFLENBQUMsT0FBTyxFQUFFLEVBQzVEO1lBQ0MsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNyRTthQUVEO1lBQ0MsT0FBTyxJQUFJLENBQUM7U0FDWjtJQUNGLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUcsVUFBbUI7UUFFbEQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUplLDBCQUFhLGdCQUk1QixDQUFBO0lBRUQsU0FBZ0IsY0FBYyxDQUFHLFVBQW1CO1FBRW5ELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUN6QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFKZSwyQkFBYyxpQkFJN0IsQ0FB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