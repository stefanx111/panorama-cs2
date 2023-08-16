"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
/// <reference path="rating_emblem.ts" />
/// <reference path="mock_adapter.ts" />
var TeamIntroMenu = (function () {
    const MAX_PLAYERS = 64;
    function _msg(msg) {
        $.Msg('teamintro.ts: ' + msg);
    }
    async function _StartTeamIntro() {
        _msg('_StartTeamIntro');
        if (false) {
            MockAdapter.AddTable('custom', {
                k_GetPlayerCompetitiveRankType: {
                    0: 'Premier'
                },
                k_GetPlayerPremierRankStatsObject: {
                    0: {
                        score: 1234,
                        rankType: 'Premier',
                        competitiveWins: 111,
                        predictedRankingIfWin: 1264,
                        predictedRankingIfLoss: 1210,
                        predictedRankingIfTie: 1239,
                    }
                }
            });
            MockAdapter.SetMockData('custom');
        }
        const elMenu = $.GetContextPanel();
        const sLocalXuid = GameStateAPI.GetLocalPlayerXuid();
        const nLocalTeam = GameStateAPI.GetPlayerTeamNumber(sLocalXuid);
        const endPromise = Async.UnhandledEvent("EndTeamIntro");
        elMenu.SetHasClass("active", true);
        _SetFaded(true, 0);
        elMenu.StartCamera();
        const modelRefs = _SetupModels(nLocalTeam);
        _SetTeam(nLocalTeam);
        _SetupHeader(nLocalTeam);
        const teamInfoAbort = new Async.AbortController();
        _SetupTeamInfos(nLocalTeam, modelRefs, teamInfoAbort.signal);
        await Async.Delay(0.5);
        _SetFaded(false, 0.5);
        _SetupStakes();
        $.DispatchEvent('CSGOPlaySoundEffect', 'TeamIntro', 'MOUSE');
        if (nLocalTeam == 2) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'TeamIntro_TSuits', 'MOUSE');
        }
        else {
            $.DispatchEvent('CSGOPlaySoundEffect', 'TeamIntro_CTSuits', 'MOUSE');
        }
        await endPromise;
        _SetFaded(true, 0.5);
        await Async.Delay(0.5);
        teamInfoAbort.abort();
        $("#TeamIntroHeader").AddClass("hidden");
        $("#TeamIntroTeammateInfos").RemoveAndDeleteChildren();
        $("#JsTeamIntroStakes").visible = false;
        _ClearBackground();
        elMenu.StopCamera();
        elMenu.ClearModels();
        _SetFaded(false, 0.5);
        await Async.Delay(0.5);
        elMenu.SetHasClass("active", false);
    }
    function _SetupStakes() {
        _msg('_SetupStakes');
        $('#JsTeamIntroStakes').visible = false;
        const type = MockAdapter.GetPlayerCompetitiveRankType(GameStateAPI.GetLocalPlayerXuid());
        if (type !== 'Premier')
            return;
        if (GameStateAPI.IsDemoOrHltv())
            return;
        let rankStats = MockAdapter.GetPlayerPremierRankStatsObject(GameStateAPI.GetLocalPlayerXuid());
        if (!rankStats)
            return;
        $('#JsTeamIntroStakes').visible = true;
        let options = {
            root_panel: $('#JsIntroWin'),
            rating_type: 'Premier',
            do_fx: true,
            leaderboard_details: { matchesWon: 999 } // guarantees we force show rating
        };
        let winDelta = rankStats.predictedRankingIfWin - rankStats.score;
        let lossDelta = rankStats.predictedRankingIfLoss - rankStats.score;
        let tieDelta = rankStats.predictedRankingIfTie - rankStats.score;
        options.root_panel = $('#jsIntroWin');
        options.root_panel.SetDialogVariable('win-delta', '+' + winDelta);
        options.leaderboard_details.score = rankStats.predictedRankingIfWin;
        RatingEmblem.SetXuid(options);
        $('#jsIntroWin').AddClass('reveal-stakes');
        options.root_panel = $('#jsIntroLoss');
        options.root_panel.SetDialogVariable('loss-delta', String(lossDelta));
        options.leaderboard_details.score = rankStats.predictedRankingIfLoss;
        RatingEmblem.SetXuid(options);
        $('#jsIntroLoss').AddClass('reveal-stakes');
        options.root_panel = $('#jsIntroTie');
        options.root_panel.SetDialogVariable('tie-delta', tieDelta >= 0 ? '+' + tieDelta : String(tieDelta));
        options.leaderboard_details.score = rankStats.predictedRankingIfTie;
        RatingEmblem.SetXuid(options);
        $('#jsIntroTie').AddClass('reveal-stakes');
    }
    function _SetTeam(nTeamNumber) {
        switch (nTeamNumber) {
            case 2:
                $.GetContextPanel().SwitchClass('team', "TERRORIST");
                break;
            case 3:
                $.GetContextPanel().SwitchClass('team', "CT");
                break;
        }
    }
    function _ClearBackground() {
        $.GetContextPanel().SwitchClass('team', "no-background");
    }
    function _SetupTeamInfos(nTeamNumber, modelRefs, abortSignal) {
        const elMenu = $.GetContextPanel();
        $("#TeamIntroTeammateInfos").RemoveAndDeleteChildren();
        const teammateInfos = new Map();
        Async.RunSequence(function* () {
            for (const ref of modelRefs.values()) {
                yield Async.Delay(1.0);
                const elInfo = _CreateTeammateInfo(ref.sXuid, ref.nOrdinal);
                teammateInfos.set(ref.nOrdinal, elInfo);
                elInfo.RemoveClass("hidden");
            }
        }, abortSignal);
        Async.RunSequence(function* () {
            while (true) {
                for (const [nOrdinal, elInfo] of teammateInfos) {
                    let { x, y } = elMenu.GetModelBonePosition(nTeamNumber, nOrdinal, "neck_0");
                    if (isFinite(x) && isFinite(y) && elInfo) {
                        y -= 10.0;
                        x -= elInfo.actuallayoutwidth / elInfo.actualuiscale_x * 0.5;
                        y -= elInfo.actuallayoutheight / elInfo.actualuiscale_y;
                        elInfo.style.transform = "translate3d( " + x + "px, " + y + "px, 0px )";
                    }
                }
                yield Async.NextFrame();
            }
        }, abortSignal);
    }
    function _CreateTeammateInfo(sXuid, nOrdinal) {
        const elInfos = $("#TeamIntroTeammateInfos");
        const elInfo = $.CreatePanel("Panel", elInfos, nOrdinal.toString());
        elInfo.BLoadLayoutSnippet("TeamIntroTeammateInfo");
        // Populate avatar image.
        const elAvatarImage = elInfo.FindChildInLayoutFile("AvatarImage");
        elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(sXuid));
        // Set name.
        const elName = elInfo.FindChildInLayoutFile("Name");
        elName.text = GameStateAPI.GetPlayerName(sXuid);
        const teamColor = GameStateAPI.GetPlayerColor(sXuid);
        if (teamColor)
            elName.style.washColor = teamColor;
        return elInfo;
    }
    function _SetupModels(nLocalTeam) {
        const elMenu = $.GetContextPanel();
        elMenu.ClearModels();
        const modelRefs = [];
        for (let nOrdinal = 1;; ++nOrdinal) {
            const sXuid = elMenu.AddModel(nLocalTeam, nOrdinal);
            if (!sXuid)
                break;
            modelRefs.push({ sXuid, nOrdinal });
        }
        return modelRefs;
    }
    function _SetFaded(bVisible, transitionDuration) {
        const elFade = $("#TeamIntroFade");
        elFade.style.transitionDuration = `${transitionDuration}s`;
        elFade.SetHasClass("hidden", !bVisible);
    }
    function _SetupHeader(nTeamNumber) {
        const bFirstHalf = GameStateAPI.GetTimeDataJSO().gamephase === 2; // GAMEPHASE_PLAYING_FIRST_HALF
        $("#TeamIntroHeader").RemoveClass("hidden");
        const elIcon = $("#TeamIntroIcon");
        const elHalfLabel = $("#TeamIntroHalfLabel");
        const elTeamLabel = $("#TeamIntroTeamLabel");
        elHalfLabel.text = $.Localize(bFirstHalf ? "#team-intro-1st-half" : "#team-intro-2nd-half");
        switch (nTeamNumber) {
            case 2:
                elIcon.SetImage("file://{images}/icons/t_logo.svg");
                elTeamLabel.text = $.Localize(bFirstHalf ? "#team-intro-starting-as-t" : "#team-intro-playing-as-t");
                break;
            case 3:
                elIcon.SetImage("file://{images}/icons/ct_logo.svg");
                elTeamLabel.text = $.Localize(bFirstHalf ? "#team-intro-starting-as-ct" : "#team-intro-playing-as-ct");
                break;
        }
    }
    return {
        StartTeamIntro: _StartTeamIntro
    };
})();
(function () {
    $.RegisterForUnhandledEvent("StartTeamIntro", TeamIntroMenu.StartTeamIntro);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbWludHJvbWVudS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlYW1pbnRyb21lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMseUNBQXlDO0FBQ3pDLHdDQUF3QztBQUV4QyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBaUJsQixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFFdkIsU0FBUyxJQUFJLENBQUcsR0FBVztRQUV2QixDQUFDLENBQUMsR0FBRyxDQUFFLGdCQUFnQixHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLLFVBQVUsZUFBZTtRQUUxQixJQUFJLENBQUUsaUJBQWlCLENBQUUsQ0FBQztRQUcxQixJQUFLLEtBQUssRUFDVjtZQUNJLFdBQVcsQ0FBQyxRQUFRLENBQUUsUUFBUSxFQUFFO2dCQUU1Qiw4QkFBOEIsRUFBRTtvQkFDNUIsQ0FBQyxFQUFFLFNBQVM7aUJBQ2Y7Z0JBRUQsaUNBQWlDLEVBQUU7b0JBQy9CLENBQUMsRUFBRTt3QkFDQyxLQUFLLEVBQUUsSUFBSTt3QkFDWCxRQUFRLEVBQUUsU0FBUzt3QkFDbkIsZUFBZSxFQUFFLEdBQUc7d0JBQ3BCLHFCQUFxQixFQUFFLElBQUk7d0JBQzNCLHNCQUFzQixFQUFFLElBQUk7d0JBQzVCLHFCQUFxQixFQUFFLElBQUk7cUJBQzlCO2lCQUNKO2FBRUosQ0FBRSxDQUFDO1lBQ0osV0FBVyxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztTQUN2QztRQUVELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQXlCLENBQUM7UUFDMUQsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDckQsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBRWxFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLENB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