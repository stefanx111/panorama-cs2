"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="match_stakes.ts" />
var TeamIntroMenu = (function () {
    const MAX_PLAYERS = 64;
    function _msg(msg) {
        $.Msg('teamintro.ts: ' + msg);
    }
    async function _StartTeamIntro() {
        _msg('_StartTeamIntro');
        const type = MockAdapter.GetPlayerCompetitiveRankType(GameStateAPI.GetLocalPlayerXuid());
        const elMenu = $.GetContextPanel();
        elMenu.SetHasClass('premier', type === 'Premier');
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
        MatchStakes.StartTeamIntro();
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
        MatchStakes.EndTeamIntro();
        _ClearBackground();
        elMenu.StopCamera();
        elMenu.ClearModels();
        _SetFaded(false, 0.5);
        await Async.Delay(0.5);
        elMenu.SetHasClass("active", false);
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
        const timeData = GameStateAPI.GetTimeDataJSO();
        const nOvertime = timeData.overtime;
        const bFirstHalf = timeData.gamephase === 2; // GAMEPHASE_PLAYING_FIRST_HALF
        $("#TeamIntroHeader").RemoveClass("hidden");
        const elIcon = $("#TeamIntroIcon");
        const elHalfLabel = $("#TeamIntroHalfLabel");
        const elTeamLabel = $("#TeamIntroTeamLabel");
        if (nOvertime > 0) {
            elHalfLabel.SetDialogVariableInt("overtime_num", nOvertime);
            elHalfLabel.SetLocString(bFirstHalf ? "#team-intro-overtime-1st-half" : "#team-intro-overtime-2nd-half");
        }
        else {
            elHalfLabel.SetLocString(bFirstHalf ? "#team-intro-1st-half" : "#team-intro-2nd-half");
        }
        switch (nTeamNumber) {
            case 2:
                if (elIcon) {
                    elIcon.SetImage("file://{images}/icons/t_logo.svg");
                }
                elTeamLabel.SetLocString(nOvertime == 0 && bFirstHalf ? "#team-intro-starting-as-t" : "#team-intro-playing-as-t");
                break;
            case 3:
                if (elIcon) {
                    elIcon.SetImage("file://{images}/icons/ct_logo.svg");
                }
                elTeamLabel.SetLocString(nOvertime == 0 && bFirstHalf ? "#team-intro-starting-as-ct" : "#team-intro-playing-as-ct");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbWludHJvbWVudS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlYW1pbnRyb21lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUd4QyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBaUJsQixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFFdkIsU0FBUyxJQUFJLENBQUcsR0FBVztRQUV2QixDQUFDLENBQUMsR0FBRyxDQUFFLGdCQUFnQixHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLLFVBQVUsZUFBZTtRQUUxQixJQUFJLENBQUUsaUJBQWlCLENBQUUsQ0FBQztRQUUxQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsNEJBQTRCLENBQUUsWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUUsQ0FBQztRQUMzRixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUF5QixDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUUsU0FBUyxFQUFFLElBQUksS0FBSyxTQUFTLENBQUUsQ0FBQztRQUVwRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNyRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFbEUsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBRSxjQUFjLENBQUUsQ0FBQztRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxJQUFJLENBQUUsQ0FBQztRQUNyQyxTQUFTLENBQUUsSUFBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFN0MsUUFBUSxDQUFFLFVBQVUsQ0FB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