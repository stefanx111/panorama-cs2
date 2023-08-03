"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="digitpanel.ts" />
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
        var R = rarityColors[tier][1];
        var G = rarityColors[tier][2];
        var B = rarityColors[tier][3];
        return { R, G, B };
    }
    function UpdateRatingEffects(panelId, tier, tierProg) {
        const AllPanels = GetAllChildren(panelId);
        var tierColor = colorConvert(tier);
        for (const panel of AllPanels) {
            if (IsParticleScenePanel(panel)) {
                panel.SetParticleNameAndRefresh("particles/ui/premier_ratings_bg.vpcf");
                panel.SetControlPoint(16, tierColor.R, tierColor.G, tierColor.B);
                panel.SetControlPoint(17, tierProg * 100, tierProg, tierProg);
            }
        }
    }
    ratingParticleControls.UpdateRatingEffects = UpdateRatingEffects;
})(ratingParticleControls || (ratingParticleControls = {}));
var RatingEmblem;
(function (RatingEmblem) {
    function _msg(msg) {
        $.Msg('RatingEmblem: ' + msg);
    }
    function SetXuid(elRating, xuid, explicitLeaderboard = null, testVal = undefined) {
        let rating = 0;
        let source = elRating.GetAttributeString("api", "no-api-specified");
        let fakeDataType = elRating.GetAttributeString("fakedatatype", '');
        let bDoFx = elRating.GetAttributeString("vfx", "false") === 'true';
        let type = elRating.GetAttributeString("ratingtype", '');
        let bEndOfMatch = elRating.GetAttributeString("end-of-match", '') === 'true';
        // END OF MATCH?
        $.GetContextPanel().FindChildTraverse('JsSimpleNumbers').visible = !bEndOfMatch;
        $.GetContextPanel().FindChildTraverse('JsDigitPanels').visible = bEndOfMatch;
        // pull the data
        switch (source) {
            case 'mypersona':
                rating = MockAdapter.GetPipRankCount(type);
                break;
            case 'friends':
                type = FriendsListAPI.GetFriendCompetitiveRankType(String(xuid));
                rating = FriendsListAPI.GetFriendCompetitiveRank(String(xuid), type);
                break;
            case 'partylist':
                type = PartyListAPI.GetFriendCompetitiveRankType(String(xuid));
                rating = PartyListAPI.GetFriendCompetitiveRank(String(xuid));
                break;
            case 'gamestate':
                type = MockAdapter.GetPlayerCompetitiveRankType(String(xuid));
                rating = MockAdapter.GetPlayerCompetitiveRanking(String(xuid));
                break;
            case 'leaderboard':
                type = 'Premier';
                let season = explicitLeaderboard ? explicitLeaderboard : LeaderboardsAPI.GetCurrentSeasonPremierLeaderboard();
                rating = LeaderboardsAPI.GetEntryScoreByXuid(season, String(xuid));
                ;
                break;
        }
        if (testVal) {
            rating = testVal;
        }
        // decide what to show
        if (rating < 0 && !fakeDataType) {
            return false;
        }
        // fake some data? 
        if (fakeDataType) {
            type = fakeDataType;
            $.Msg(type, fakeDataType);
            switch (type) {
                case 'Wingman':
                case 'Competitive':
                    rating = Math.ceil(Math.random() * 18);
                    break;
                case 'Premier':
                    rating = Math.floor(Math.random() * 3500);
                    break;
            }
        }
        elRating.SwitchClass('type', type);
        let elSkillGroupImage = null;
        let imagePath = '';
        // WINGMAN
        if (type === 'Wingman') {
            elSkillGroupImage = elRating.FindChildTraverse('jsWingmanRating');
            imagePath = 'wingman';
            elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
        }
        // COMPETITIVE
        else if (type === 'Competitive') {
            elSkillGroupImage = elRating.FindChildTraverse('jsCompRating');
            imagePath = 'skillgroup';
            elSkillGroupImage.SetImage('file://{images}/icons/skillgroups/' + imagePath + rating + '.svg');
        }
        // PREMIER
        else if (type === 'Premier') {
            let elPremierRating = elRating.FindChildTraverse('jsPremierRating');
            if (elPremierRating) {
                let remappedRating = Math.floor(rating / 100.00 / 5);
                let clampedRating = Math.max(0, Math.min(remappedRating, 6));
                if (bDoFx) {
                    $.Msg("Premier Particles");
                    ratingParticleControls.UpdateRatingEffects(elPremierRating, clampedRating, (rating / 100.00 / 5) - clampedRating);
                }
                elRating.SwitchClass('tier', 'tier-' + clampedRating);
                let arrRating = SplitRating(rating);
                elRating.SetDialogVariable('rating-major', arrRating[0]);
                elRating.SetDialogVariable('rating-minor', arrRating[1]);
                if (bEndOfMatch && type === 'Premier') {
                    const elMajor = $.GetContextPanel().FindChildTraverse('jsPremierRatingMajor');
                    const elMinor = $.GetContextPanel().FindChildTraverse('jsPremierRatingMinor');
                    let bForce = false;
                    if (!$.GetContextPanel().FindChildTraverse('DigitPanel')) {
                        DigitPanelFactory.MakeDigitPanel(elMajor, 2, '', 1);
                        DigitPanelFactory.MakeDigitPanel(elMinor, 3, '', 1);
                        bForce = true;
                    }
                    DigitPanelFactory.SetDigitPanelString(elMajor, arrRating[0], bForce);
                    DigitPanelFactory.SetDigitPanelString(elMinor, '.' + arrRating[1], bForce);
                }
            }
        }
        return true;
    }
    RatingEmblem.SetXuid = SetXuid;
    function SplitRating(rating) {
        rating = rating / 100.00;
        let strRating = (String((rating).toFixed(2))).padStart(5, '0');
        let major = strRating.slice(0, 2);
        let minor = strRating.slice(-2);
        _msg(major + ' ' + minor);
        return [major, minor];
    }
    RatingEmblem.SplitRating = SplitRating;
})(RatingEmblem || (RatingEmblem = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
})();
