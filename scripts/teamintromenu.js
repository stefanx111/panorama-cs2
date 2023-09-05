"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="match_stakes.ts" />
var TeamIntroMenu = (function () {
    const MAX_PLAYERS = 64;
    function _msg(msg) {
    }
    async function _StartTeamIntro() {
        _msg('_StartTeamIntro');
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
        const elAvatarImage = elInfo.FindChildInLayoutFile("AvatarImage");
        elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(sXuid));
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
        const bFirstHalf = timeData.gamephase === 2;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbWludHJvbWVudS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlYW1pbnRyb21lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyx3Q0FBd0M7QUFDeEMsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUd4QyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBaUJsQixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFFdkIsU0FBUyxJQUFJLENBQUcsR0FBVztJQUczQixDQUFDO0lBRUQsS0FBSyxVQUFVLGVBQWU7UUFFMUIsSUFBSSxDQUFFLGlCQUFpQixDQUFFLENBQUM7UUFFMUIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBeUIsQ0FBQztRQUMxRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNyRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFbEUsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBRSxjQUFjLENBQUUsQ0FBQztRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxJQUFJLENBQUUsQ0FBQztRQUNyQyxTQUFTLENBQUUsSUFBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFN0MsUUFBUSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBRXZCLFlBQVksQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUUzQixNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNsRCxlQUFlLENBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFFLENBQUM7UUFFL0QsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FB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