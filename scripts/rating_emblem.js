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
        let root_panel = _GetMainPanel(options.root_panel);
        _msg('-' + options.root_panel.id);
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
        if (rating_type === 'Premier') {
            if (options.xuid &&
                (!options.leaderboard_details ||
                    Object.keys(options.leaderboard_details).length === 0 ||
                    !options.leaderboard_details.score ||
                    !options.leaderboard_details.matchesWon)) {
                let season = options.explicit_leaderboard ? options.explicit_leaderboard : LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard();
                options.leaderboard_details = LeaderboardsAPI.GetEntryDetailsObjectByXuid(season, options.xuid);
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
            }
        }
        _msg(rating_type + root_panel.id);
        root_panel.SwitchClass('type', rating_type);
        let elSkillGroupImage = null;
        let imagePath = '';
        let winsNeededForRank = SessionUtil ? SessionUtil.GetNumWinsNeededForRank(rating_type) : 10;
        let isloading = rating === undefined ? true : false;
        let bTooFewWins = wins < winsNeededForRank;
        let bRatingExpired = !bTooFewWins && rating < 1;
        let bHasRating = !bRatingExpired && !bTooFewWins && !isloading;
        let ratingDesc = '';
        let tooltipText = '';
        let transitionDesc = '';
        _msg('\n\n');
        _msg('player: ' + FriendsListAPI.GetFriendName(options.xuid));
        _msg('rating: ' + rating);
        _msg('wins:   ' + wins + '\n\n');
        //}DEVONLY
        if (isloading) {
            ratingDesc = $.Localize('#SFUI_LOADING');
        }
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
            else if (bRatingExpired) {
                if (!isLocalPlayer)
                    return false;
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + '_expired.svg');
                ratingDesc = $.Localize('#skillgroup_expired' + locTypeModifer);
                tooltipText = $.Localize('#tooltip_skill_group_expired' + locTypeModifer);
            }
            else {
                elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
                ratingDesc = $.Localize('#skillgroup_' + rating);
                tooltipText = $.Localize('#tooltip_skill_group_generic' + locTypeModifer);
            }
        }
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
            else if (bRatingExpired) {
                if (!isLocalPlayer)
                    return false;
                majorRating = '??';
                minorRating = '??';
                ratingDesc = $.Localize('#cs_rating_expired');
                tooltipText = $.Localize('#tooltip_cs_rating_expired');
            }
            else if (wins && rating) {
                let remappedRating = Math.floor(rating / 100.00 / 5);
                let clampedRating = Math.max(0, Math.min(remappedRating, 6));
                root_panel.SwitchClass('tier', 'tier-' + clampedRating);
                let arrRating = SplitRating(rating);
                majorRating = arrRating[0];
                minorRating = arrRating[1];
                if (do_fx && rating) {
                    ratingParticleControls.UpdateRatingEffects(elPremierRating, remappedRating, rating);
                }
                if (rank && rank < 1000) {
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
    function UpdateRatingEffects(panelId, tier, tierProg) {
        const AllPanels = GetAllChildren(panelId);
        const RatingFxThreshold = 0.5;
        const PromoMatchRatingThreshold = .98;
        var tierProgress = (tierProg / 100 / 5.0) - tier;
        var PromoMatch = (((tierProgress / 2) * 10) - Math.floor((tierProgress / 2) * 10));
        var doPromoMatchRatingEffect = PromoMatch >= PromoMatchRatingThreshold && PromoMatch < .999 ? 1 : 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0aW5nX2VtYmxlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJhdGluZ19lbWJsZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQW9COUMsSUFBVSxZQUFZLENBMFdyQjtBQTFXRCxXQUFVLFlBQVk7SUFFckIsU0FBUyxJQUFJLENBQUcsR0FBVztJQUczQixDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUcsVUFBbUI7UUFFM0MsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUN0RSxDQUFDO0lBRUQsU0FBZ0IsYUFBYSxDQUFHLFVBQW1CO1FBRWxELE9BQU8sYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQztJQUN0RCxDQUFDO0lBSGUsMEJBQWEsZ0JBRzVCLENBQUE7SUFFRCxTQUFnQixjQUFjLENBQUcsVUFBbUI7UUFFbkQsT0FBTyxhQUFhLENBQUUsVUFBVSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ3ZELENBQUM7SUFIZSwyQkFBYyxpQkFHN0IsQ0FBQTtJQUVELFNBQWdCLGlCQUFpQixDQUFHLFVBQW1CO1FBRXRELE9BQU8sYUFBYSxDQUFFLFVBQVUsQ0FBRSxDQUFDLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQztJQUMxRCxDQUFDO0lBSGUsOEJBQWlCLG9CQUdoQyxDQUFBO0lBRUQsU0FBZ0IsT0FBTyxDQUFHLE9BQTZCO1FBRXRELElBQUksYUFBYSxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDO1FBQzVELElBQUksTUFBTSxHQUF1QixTQUFTLENBQUM7UUFDM0MsSUFBSSxJQUFJLEdBQXVCLFNBQVMsQ0FBQztRQUN6QyxJQUFJLElBQUksR0FBdUIsU0FBUyxDQUFDO1FB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