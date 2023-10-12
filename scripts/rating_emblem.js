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
                case 'partybrowser':
                    rating = Number(PartyBrowserAPI.GetPartySessionSetting(options.xuid, 'game/ark'));
                    rating = Math.floor(rating / 10);
                    break;
                case 'mypersona':
                    if (rating_type === 'Competitive' && options.rating_map) {
                        let pmso = MyPersonaAPI.GetCompetitivePerMapStatsObject();
                        rating = pmso[options.rating_map] ? pmso[options.rating_map]["skillgroup"] : -1;
                        wins = pmso[options.rating_map] ? pmso[options.rating_map]["wins"] : -1;
                    }
                    else {
                        rating = MyPersonaAPI.GetPipRankCount(rating_type);
                        wins = MyPersonaAPI.GetPipRankWins(rating_type);
                    }
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
        let tooltipExtraText = '';
        let colorClassName = '';
        let introText = '';
        let promotionState = '';
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
                    ratingParticleControls.UpdateRatingEffects(elPremierRating, majorRating, minorRating.slice(-3), parseInt(arrRating[2]));
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
                    if (arrRating[2] === '2') {
                        tooltipExtraText = $.Localize('#cs_rating_relegation_nextmatch');
                        introText = $.Localize('#cs_rating_relegation_match');
                        eomDescText = $.Localize('#cs_rating_relegation_nextmatch');
                        ratingDesc = $.Localize('#cs_rating_relegation_nextmatch');
                        promotionState = 'relegation';
                    }
                    else if (arrRating[2] === '1') {
                        tooltipExtraText = $.Localize('#cs_rating_promotion_nextmatch');
                        introText = $.Localize('#cs_rating_promotion_match');
                        eomDescText = $.Localize('#cs_rating_promotion_nextmatch');
                        ratingDesc = $.Localize('#cs_rating_promotion_nextmatch');
                        promotionState = 'promotion';
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
                        introText = $.Localize('#cs_rating_wins_needed_verbose_intro', root_panel);
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
            if (tooltipExtraText !== '') {
                tooltipText = tooltipText + '<br><br>' + tooltipExtraText;
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
        let matchType = '0';
        if (rating === 5000 || rating === 10000 || rating === 15000 ||
            rating === 20000 || rating === 25000 || rating === 30000)
            matchType = '2';
        else if (rating === 5000 - 1 || rating === 10000 - 1 || rating === 15000 - 1 ||
            rating === 20000 - 1 || rating === 25000 - 1 || rating === 30000 - 1)
            matchType = '1';
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
        return [major, minor, matchType];
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
    function UpdateRatingEffects(panelId, MajorRating, MinorRating, matchType) {
        const AllPanels = GetAllChildren(panelId);
        let ratingEffect = [
            "particles/ui/premier_ratings_bg.vpcf",
            "particles/ui/premier_ratings_promomatch.vpcf",
            "particles/ui/premier_ratings_relegation.vpcf"
        ];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQXVCOUMsSUFBVSxZQUFZLENBK2VyQjtBQS9lRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztJQUczQixDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUcsVUFBbUI7UUFFM0MsSUFBSyxVQUFVO1lBQ2QsVUFBVSxDQUFDLE9BQU8sRUFBRTtZQUNwQixVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUU7WUFDakQsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGlCQUFpQixDQUFFLENBQUMsT0FBTyxFQUFFLEVBQzVEO1lBQ0MsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztTQUNyRTthQUVEO1lBQ0MsT0FBTyxJQUFJLENBQUM7U0FDWjtJQUNGLENBQUM7SUFFRCxTQUFnQixhQUFhLENBQUcsVUFBbUI7UUFFbEQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDL0MsQ0FBQztJQUplLDBCQUFhLGdCQUk1QixDQUFBO0lBRUQsU0FBZ0IsY0FBYyxDQUFHLFVBQW1CO1FBRW5ELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUN6QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ2hELENBQUM7SUFKZSwyQkFBYyxpQkFJN0IsQ0FBQTtJQUVELFNBQWdCLGlCQUFpQixDQUFHLFVBQW1CO1FBRXRELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUN6QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ25ELENBQUM7SUFKZSw4QkFBaUIsb0JBSWhDLENBQUE7SUFFRCxTQUFnQixjQUFjLENBQUcsVUFBbUI7UUFFbkQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDaEQsQ0FBQztJQUplLDJCQUFjLGlCQUk3QixDQUFBO0lBRUQsU0FBZ0IsWUFBWSxDQUFHLFVBQW1CO1FBRWpELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUN6QyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFKZSx5QkFBWSxlQUkzQixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUcsVUFBbUI7UUFFdEQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBQ3pDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbkQsQ0FBQztJQUplLDhCQUFpQixvQkFJaEMsQ0FBQTtJQUVELFNBQWdCLE9BQU8sQ0FBRyxPQUE2QjtRQUV0RCxJQUFJLE1BQU0sR0FBdUIsU0FBUyxDQUFDO1FBQzNDLElBQUksSUFBSSxHQUF1QixTQUFTLENBQUM7UUFDekMsSUFBSSxJQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUN6QyxJQUFJLEdBQUcsR0FBdUIsU0FBUyxDQUFDO1FBQ3hDLElBQUksWUFBWSxHQUFZLE9BQU8sQ0FBQyxjQUFjLENBQUUsY0FBYyxDQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUVyRyxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3pCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFFMUIsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQWdDLENBQUM7UUFFM0QsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUVyRCxJQUFLLENBQUMsVUFBVTtZQUNmLE9BQU8sS0FBSyxDQUFDO1FBTWQsSUFBSyxDQUFDLFdBQVcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUNqQztZQUNDLFFBQVMsTUFBTSxFQUNmO2dCQUNDLEtBQUssU0FBUztvQkFDYixXQUFXLEdBQUcsY0FBYyxDQUFDLDRCQUE0QixDQUFFLE9BQU8sQ0FBQyxJQUFJLENBQXVCLENBQUM7b0JBQy9GLE1BQU07Z0JBRVAsS0FBSyxXQUFXO29CQUNmLFdBQVcsR0FBRyxZQUFZLENBQUMsNEJBQTRCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBdUIsQ0FBQztvQkFDN0YsTUFBTTtnQkFFUCxLQUFLLFdBQVc7b0JBQ2YsV0FBVyxHQUFHLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBRSxPQUFPLENBQUMsSUFBSSxDQUF1QixDQUFDO29CQUM1RixNQUFNO2dCQUVQLEtBQUssV0FBVyxDQUFDO2dCQUNqQjtvQkFDQyxXQUFXLEdBQUcsU0FBUyxDQUFDO29CQUN4QixNQUFNO2FBQ1A7U0FDRDtRQUVELElBQUssT0FBTyxDQUFDLElBQUksRUFDakI7WUFDQyxRQUFTLE1BQU0sRUFDZjtnQkFDQyxLQUFLLFNBQVM7b0JBQ2IsTUFBTSxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBRSxPQUFPLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBRSxDQUFDO29CQUM5RSxJQUFJLEdBQUcsY0FBYyxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFFLENBQUM7b0JBQzVFLE1BQU07Z0JBRVAsS0FBSyxXQUFXO29CQUNmLE1BQU0sR0FBRyxZQUFZLENBQUMsd0JBQXdCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBRSxDQUFDO29CQUMvRCxJQUFJLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUUsQ0FBQztvQkFDN0QsTUFBTTtnQkFFUCxLQUFLLFdBQVc7b0JBQ2YsTUFBTSxHQUFHLFdBQVcsQ0FBQywyQkFBMkIsQ0FBRSxPQUFPLENBQUMsSUFBSSxDQUFFLENBQUM7b0JBQ2pFLElBQUksR0FBRyxXQUFXLENBQUMsd0JBQXdCLENBQUUsT0FBTyxDQUFDLElBQUksQ0FBRSxDQUFDO29CQUM1RCxNQUFNO2dCQUVQLEtBQUssY0FBYztvQkFDbEIsTUFBTSxHQUFHLE1BQU0sQ0FBRSxlQUFlLENBQUMsc0JBQXNCLENBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUUsQ0FBRSxDQUFDO29CQUN0RixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxNQUFNLEdBQUcsRUFBRSxDQUFFLENBQUM7b0JBQ25DLE1BQU07Z0JBRVAsS0FBSyxXQUFXO29CQUVmLElBQUssV0FBVyxLQUFLLGFBQWEsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUN4RDt3QkFDQyxJQUFJLElBQUksR0FBbUMsWUFBWSxDQUFDLCtCQUErQixFQUFFLENBQUM7d0JBa0IxRixNQUFNLEdBQUcsSUFBSSxDQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUcsQ0FBRSxZQUFZLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZGLElBQUksR0FBRyxJQUFJLENBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBRyxDQUFFLE1BQU0sQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDL0U7eUJBRUQ7d0JBQ0MsTUFBTSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUUsV0FBVyxDQUFFLENBQUM7d0JBQ3JELElBQUksR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFFLFdBQVcsQ0FBRSxDQUFDO3FCQUNsRDtvQkFDRCxNQUFNO2FBQ1A7U0FDRDtRQUVELElBQUssV0FBVyxLQUFLLFNBQVMsRUFDOUI7WUFHQyxJQUFLLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3ZGO2dCQUNDLE1BQU0sR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO2dCQUMzQyxJQUFJLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQztnQkFDOUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ3hDLEdBQUcsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDO2dCQUV0QyxJQUFJLENBQUUsbUNBQW1DLENBQUUsQ0FBQzthQUM1QztTQUNEO1FBS0QsSUFBSSxDQUFFLFdBQVcsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFFLENBQUM7UUFDcEMsVUFBVSxDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsV0FBVyxDQUFFLENBQUM7UUFFOUMsSUFBSyxZQUFZLEVBQ2pCO1lBQ0MsSUFBSSxDQUFFLGdCQUFnQixDQUFFLENBQUM7WUFDekIsVUFBVSxDQUFDLGlCQUFpQixDQUFFLGFBQWEsRUFBRSxXQUFXLENBQUUsQ0FBQztTQUMzRDtRQUVELElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDO1FBQzdCLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVuQixJQUFJLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLHVCQUF1QixDQUFFLFdBQVcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUYsSUFBSSxTQUFTLEdBQUcsQ0FBRSxNQUFNLEtBQUssU0FBUyxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUsQ0FBQztRQUV2RCxJQUFJLGNBQWMsR0FBRyxNQUFPLEtBQUssQ0FBQyxDQUFDO1FBQ25DLElBQUksV0FBVyxHQUFHLGNBQWMsSUFBSSxDQUFFLElBQUssR0FBRyxpQkFBaUIsQ0FBRSxDQUFDO1FBRWxFLElBQUksVUFBVSxHQUFHLENBQUMsY0FBYyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsU0FBUyxDQUFDO1FBRS9ELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNwQixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO1FBQzFCLElBQUksY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBT3hCLElBQUssSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEVBQ3JCO1lBQ0MsSUFBSSxHQUFHLENBQUMsQ0FBQztTQUNUO1FBRUQsSUFBSyxTQUFTLEVBQ2Q7WUFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxlQUFlLENBQUUsQ0FBQztTQUMzQztRQUdELElBQUssV0FBVyxLQUFLLFNBQVMsSUFBSSxXQUFXLEtBQUssYUFBYSxFQUMvRDtZQUNDLGlCQUFpQixHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxXQUFXLEdBQUcsV0FBVyxDQUFhLENBQUM7WUFDekYsSUFBSSxjQUFjLEdBQUcsV0FBVyxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEYsU0FBUyxHQUFHLGNBQWMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO1lBRWxFLElBQUssV0FBVyxJQUFJLFNBQVMsRUFDN0I7Z0JBQ0MsaUJBQWlCLENBQUMsUUFBUSxDQUFFLG9DQUFvQyxHQUFHLFNBQVMsR0FBRyxXQUFXLENBQUUsQ0FBQztnQkFFN0YsSUFBSyxDQUFDLFNBQVMsRUFDZjtvQkFDQyxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFFLENBQUMsRUFBRSxpQkFBaUIsR0FBRyxJQUFLLENBQUUsQ0FBQztvQkFDMUQsaUJBQWlCLENBQUMsUUFBUSxDQUFFLG9DQUFvQyxHQUFHLFNBQVMsR0FBRyxXQUFXLENBQUUsQ0FBQztvQkFFN0YsSUFBSyxZQUFZLEVBQ2pCO3dCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGVBQWUsR0FBRyxjQUFjLENBQUUsQ0FBQzt3QkFDNUQsVUFBVSxDQUFDLG9CQUFvQixDQUFFLFlBQVksRUFBRSxVQUFVLENBQUUsQ0FBQzt3QkFDNUQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsMkJBQTJCLEdBQUcsU0FBUyxFQUFFLFVBQVUsQ0FBRSxDQUFDO3FCQUNoRjtpQkFDRDthQUNEO2lCQUNJLElBQUssY0FBYyxFQUN4QjtnQkFDQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUUsb0NBQW9DLEdBQUcsU0FBUyxHQUFHLGNBQWMsQ0FBRSxDQUFDO2dCQUVoRyxJQUFLLFlBQVksRUFDakI7b0JBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUscUJBQXFCLEdBQUcsY0FBYyxDQUFFLENBQUM7b0JBQ2xFLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDhCQUE4QixHQUFHLGNBQWMsQ0FBRSxDQUFDO2lCQUM1RTthQUNEO2lCQUVEO2dCQUNDLGlCQUFpQixDQUFDLFFBQVEsQ0FBRSxvQ0FBb0MsR0FBRyxTQUFTLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBRSxDQUFDO2dCQUVqRyxJQUFLLFlBQVksRUFDakI7b0JBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsY0FBYyxHQUFHLE1BQU0sQ0FBRSxDQUFDO29CQUNuRCxXQUFXLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSw4QkFBOEIsR0FBRyxjQUFjLENBQUUsQ0FBQztpQkFDNUU7YUFDRDtTQUNEO2FBR0ksSUFBSyxXQUFXLEtBQUssU0FBUyxFQUNuQztZQUNDLElBQUksZUFBZSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBYSxDQUFDO1lBQ25GLElBQUksWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUUxRSxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUcsQ0FBQyxPQUFPLEdBQUcsWUFBWSxLQUFLLFFBQVEsQ0FBQztZQUN2RixVQUFVLENBQUMsaUJBQWlCLENBQUUsZUFBZSxDQUFHLENBQUMsT0FBTyxHQUFHLFlBQVksS0FBSyxTQUFTLENBQUM7WUFFdEYsSUFBSSxXQUFXLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUVyQixVQUFVLENBQUMsV0FBVyxDQUFFLE1BQU0sRUFBRSxRQUFRLENBQUUsQ0FBQztZQUczQywwQkFBMEIsQ0FBRSxVQUFVLEVBQUUsTUFBTSxDQUFFLENBQUM7WUFFakQsSUFBSyxNQUFNLElBQUksTUFBTSxHQUFHLENBQUMsRUFDekI7Z0JBQ0MsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBRSxNQUFPLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBRSxDQUFDO2dCQUN6RCxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFFLGNBQWMsRUFBRSxDQUFDLENBQUUsQ0FBRSxDQUFDO2dCQUVqRSxVQUFVLENBQUMsV0FBVyxDQUFFLE1BQU0sRUFBRSxPQUFPLEdBQUcsYUFBYSxDQUFFLENBQUM7Z0JBQzFELGNBQWMsR0FBRyxPQUFPLEdBQUcsYUFBYSxDQUFDO2dCQUV6QyxJQUFJLFNBQVMsR0FBRyxXQUFXLENBQUUsTUFBTyxDQUFFLENBQUM7Z0JBRXZDLFdBQVcsR0FBRyxTQUFTLENBQUUsQ0FBQyxDQUFFLENBQUM7Z0JBQzdCLFdBQVcsR0FBRyxTQUFTLENBQUUsQ0FBQyxDQUFFLENBQUM7Z0JBRTdCLElBQUssS0FBSyxJQUFJLE1BQU0sRUFDcEI7b0JBRUMsc0JBQXNCLENBQUMsbUJBQW1CLENBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFFLENBQUMsQ0FBQyxDQUFFLEVBQUUsUUFBUSxDQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFFLENBQUM7aUJBQzlIO2dCQUVELElBQUssWUFBWSxFQUNqQjtvQkFDQyxJQUFLLElBQUksSUFBSSxJQUFJLElBQUksZUFBZSxDQUFDLGlDQUFpQyxFQUFFLEVBQ3hFO3dCQUVDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7d0JBQ2hELFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGlCQUFpQixFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUN6RCxXQUFXLEdBQUcsVUFBVSxDQUFDO3FCQUV6Qjt5QkFDSSxJQUFLLEdBQUcsRUFDYjt3QkFDQyxVQUFVLENBQUMsaUJBQWlCLENBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUUsQ0FBQyxDQUFFLEdBQUcsRUFBRSxDQUFFLENBQUM7d0JBQ3BFLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHVCQUF1QixFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUMvRCxXQUFXLEdBQUcsVUFBVSxDQUFDO3FCQUV6Qjt5QkFFRDt3QkFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDO3FCQUNoRDtvQkFJRCxJQUFLLFNBQVMsQ0FBRSxDQUFDLENBQUUsS0FBSyxHQUFHLEVBQzNCO3dCQUNDLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsaUNBQWlDLENBQUUsQ0FBQzt3QkFDbkUsU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsNkJBQTZCLENBQUUsQ0FBQzt3QkFDeEQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsaUNBQWlDLENBQUUsQ0FBQzt3QkFDOUQsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsaUNBQWlDLENBQUUsQ0FBQzt3QkFDN0QsY0FBYyxHQUFHLFlBQVksQ0FBQztxQkFDOUI7eUJBQ0ksSUFBSyxTQUFTLENBQUUsQ0FBQyxDQUFFLEtBQUssR0FBRyxFQUNoQzt3QkFDQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGdDQUFnQyxDQUFFLENBQUM7d0JBQ2xFLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDRCQUE0QixDQUFFLENBQUM7d0JBQ3ZELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGdDQUFnQyxDQUFFLENBQUM7d0JBQzdELFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGdDQUFnQyxDQUFFLENBQUM7d0JBQzVELGNBQWMsR0FBRyxXQUFXLENBQUM7cUJBQzdCO29CQUVELFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDRCQUE0QixDQUFFLENBQUM7aUJBQ3pEO2FBQ0Q7aUJBRUQ7Z0JBRUMsSUFBSyxZQUFZLEVBQ2pCO29CQUNDLElBQUssU0FBUyxFQUNkO3dCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHFCQUFxQixDQUFFLENBQUM7cUJBQ2pEO3lCQUNJLElBQUssV0FBVyxFQUNyQjt3QkFDQyxJQUFJLFVBQVUsR0FBRyxDQUFFLGlCQUFpQixHQUFHLElBQUssQ0FBRSxDQUFDO3dCQUMvQyxVQUFVLENBQUMsb0JBQW9CLENBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUM1RCxXQUFXLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx5QkFBeUIsRUFBRSxVQUFVLENBQUUsQ0FBQzt3QkFDbEUsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsZ0NBQWdDLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQ3pFLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHNDQUFzQyxFQUFFLFVBQVUsQ0FBRSxDQUFDO3dCQUc3RSxJQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxZQUFZLENBQUMsT0FBTyxFQUFFLEVBQzVEOzRCQUNDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLHdCQUF3QixFQUFFLFVBQVUsQ0FBRSxDQUFDO3lCQUNoRTs2QkFFRDs0QkFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxpQkFBaUIsQ0FBRSxDQUFDO3lCQUM3QztxQkFHRDt5QkFDSSxJQUFLLGNBQWMsRUFDeEI7d0JBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsQ0FBQzt3QkFDaEQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsNEJBQTRCLENBQUUsQ0FBQzt3QkFDekQsV0FBVyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsaUNBQWlDLEVBQUUsVUFBVSxDQUFFLENBQUM7d0JBQzFFLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLGlDQUFpQyxFQUFFLFVBQVUsQ0FBRSxDQUFDO3FCQUV4RTtpQkFDRDthQUNEO1lBRUQscUJBQXFCLENBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBRTNDLHNCQUFzQixDQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBRSxDQUFDO1NBQzdFO1FBRUQsSUFBSyxZQUFZLEVBQ2pCO1lBQ0MsSUFBSyxnQkFBZ0IsS0FBSyxFQUFFLEVBQzVCO2dCQUNDLFdBQVcsR0FBRyxXQUFXLEdBQUcsVUFBVSxHQUFHLGdCQUFnQixDQUFDO2FBQzFEO1lBR0QsSUFBSyxJQUFJLEVBQ1Q7Z0JBQ0MsVUFBVSxDQUFDLG9CQUFvQixDQUFFLE1BQU0sRUFBRSxJQUFLLENBQUUsQ0FBQztnQkFDakQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSwyQkFBMkIsRUFBRSxVQUFVLENBQUUsQ0FBQztnQkFFcEUsV0FBVyxHQUFHLENBQUUsV0FBVyxLQUFLLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2FBQ3BGO1lBRUQsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDMUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7WUFDNUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7WUFDbEQsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7WUFDNUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDeEMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7U0FFbEQ7UUFFRCxVQUFVLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxXQUFXLENBQUUsQ0FBQztRQUVyRCxPQUFPLFVBQVUsQ0FBQztJQUNuQixDQUFDO0lBM1dlLG9CQUFPLFVBMld0QixDQUFBO0lBRUQsU0FBUywwQkFBMEIsQ0FBRyxVQUFrQixFQUFFLE1BQXdCO1FBRWpGLElBQUksT0FBTyxHQUFHLENBQUUsTUFBTSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDO1FBQzVHLElBQUksT0FBTyxHQUFHLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBRSxtQkFBbUIsQ0FBYSxDQUFDO1FBQ2pGLE9BQU8sQ0FBQyxRQUFRLENBQUUsMkJBQTJCLEdBQUcsT0FBTyxDQUFFLENBQUM7SUFDM0QsQ0FBQztJQUdELFNBQVMscUJBQXFCLENBQUcsT0FBNkIsRUFBRSxVQUFrQjtRQUVqRixVQUFVLENBQUMscUJBQXFCLENBQUUsZUFBZSxDQUFFLENBQUMsV0FBVyxDQUFFLGFBQWEsRUFBRSxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkssQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUcsVUFBbUIsRUFBRSxLQUFhLEVBQUUsS0FBYSxFQUFFLG1CQUEwQztRQUc5SCxVQUFVLENBQUMsaUJBQWlCLENBQUUsY0FBYyxFQUFFLEtBQUssQ0FBRSxDQUFDO1FBQ3RELFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7UUFFdEQsSUFBSyxtQkFBbUIsS0FBSyxTQUFTLEVBQ3RDO1lBQ0MsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGlCQUFpQixDQUFFLHNCQUFzQixDQUFHLENBQUM7WUFDakYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGlCQUFpQixDQUFFLHNCQUFzQixDQUFHLENBQUM7WUFFakYsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLElBQUssQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsaUJBQWlCLENBQUUsWUFBWSxDQUFFLEVBQzNEO2dCQUNDLGlCQUFpQixDQUFDLGNBQWMsQ0FBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsNEJBQTRCLENBQUUsQ0FBQztnQkFDcEYsaUJBQWlCLENBQUMsY0FBYyxDQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSw0QkFBNEIsQ0FBRSxDQUFDO2dCQUVwRixRQUFRLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO1lBRUQsaUJBQWlCLENBQUMsbUJBQW1CLENBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUUsQ0FBQztZQUNsRSxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBRSxDQUFDO1NBQ2xFO0lBQ0YsQ0FBQztJQUVELFNBQWdCLFdBQVcsQ0FBRyxNQUFjO1FBRTNDLElBQUksU0FBUyxHQUFXLEdBQUcsQ0FBQztRQUM1QixJQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssS0FBSztZQUMzRCxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sS0FBSyxLQUFLLElBQUksTUFBTSxLQUFLLEtBQUs7WUFDeEQsU0FBUyxHQUFHLEdBQUcsQ0FBQzthQUNaLElBQUssTUFBTSxLQUFLLElBQUksR0FBQyxDQUFDLElBQUksTUFBTSxLQUFLLEtBQUssR0FBQyxDQUFDLElBQUksTUFBTSxLQUFLLEtBQUssR0FBQyxDQUFDO1lBQ3RFLE1BQU0sS0FBSyxLQUFLLEdBQUMsQ0FBQyxJQUFJLE1BQU0sS0FBSyxLQUFLLEdBQUMsQ0FBQyxJQUFJLE1BQU0sS0FBSyxLQUFLLEdBQUMsQ0FBQztZQUM5RCxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBRWpCLE1BQU0sR0FBRyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBRTFCLElBQUksU0FBUyxHQUFHLENBQUUsTUFBTSxDQUFFLENBQUUsTUFBTSxDQUFFLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBRSxDQUFFLENBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBRSxDQUFDO1FBQ3pFLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ3BDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUVsQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7UUFDdEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRXBDLElBQUssS0FBSyxLQUFLLElBQUksRUFDbkI7WUFDQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7WUFDdEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBRSxDQUFDO1NBQ3BDO2FBRUQ7WUFDQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztTQUNwQjtRQUtELE9BQU8sQ0FBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBRSxDQUFDO0lBQ3BDLENBQUM7SUFqQ2Usd0JBQVcsY0FpQzFCLENBQUE7QUFDRixDQUFDLEVBL2VTLFlBQVksS0FBWixZQUFZLFFBK2VyQjtBQUVELElBQVUsc0JBQXNCLENBb0cvQjtBQXBHRCxXQUFVLHNCQUFzQjtJQUUvQixTQUFTLGNBQWMsQ0FBRyxLQUFjO1FBRXZDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQyxPQUFPLENBQUUsR0FBRyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFFLGNBQWMsQ0FBRSxDQUFFLENBQUM7SUFDL0QsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsS0FBYztRQUU3QyxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssb0JBQW9CLENBQUM7SUFDNUMsQ0FBQztJQUVELFNBQWdCLFlBQVksQ0FBRyxJQUFZO1FBRTFDLElBQUksWUFBWSxHQUE4QztZQUU3RCxDQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBRTtZQUMzQixDQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBRTtZQUM1QixDQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBRTtZQUN4QixDQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBRTtZQUM1QixDQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBRTtZQUM3QixDQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBRTtZQUcxQixDQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBRTtTQUMxQixDQUFDO1FBRUYsSUFBSyxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxZQUFZLENBQUMsTUFBTTtZQUMzQyxPQUFPLEVBQUUsQ0FBQyxFQUFDLENBQUMsRUFBRSxDQUFDLEVBQUMsQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQztRQUV6QixJQUFJLENBQUMsR0FBRyxZQUFZLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFFLElBQUksQ0FBRSxDQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUVsQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNwQixDQUFDO0lBdkJlLG1DQUFZLGVBdUIzQixDQUFBO0lBR0QsU0FBZ0IsbUJBQW1CLENBQUcsT0FBZ0IsRUFBRSxXQUFtQixFQUFFLFdBQW1CLEVBQUUsU0FBaUI7UUFHbEgsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTVDLElBQUksWUFBWSxHQUFhO1lBQzVCLHNDQUFzQztZQUN0Qyw4Q0FBOEM7WUFDOUMsOENBQThDO1NBQzdDLENBQUM7UUFFSCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFFLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBRSxDQUFDO1FBQzVDLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBRSxJQUFJLENBQUUsQ0FBQztRQUtyQyxLQUFNLE1BQU0sS0FBSyxJQUFJLFNBQVMsRUFDOUI7WUFDQyxJQUFLLG9CQUFvQixDQUFFLEtBQUssQ0FBRSxFQUNsQztnQkFDQyxJQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsRUFDckI7b0JBQ0MsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUN2QixLQUFLLENBQUMseUJBQXlCLENBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFFLENBQUM7b0JBQzNELEtBQUssQ0FBQyxlQUFlLENBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFFLENBQUM7aUJBRW5FO3FCQUVEO29CQUNDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztpQkFDdkM7YUFDRDtTQUNEO0lBMkJGLENBQUM7SUE1RGUsMENBQW1CLHNCQTREbEMsQ0FBQTtBQUNGLENBQUMsRUFwR1Msc0JBQXNCLEtBQXRCLHNCQUFzQixRQW9HL0IifQ==