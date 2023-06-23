/// <reference path="csgo.d.ts" />
/// <reference path="common/async.ts" />
var TeamIntroMenu = (function () {
    const MAX_PLAYERS = 64;
    async function _StartTeamIntro() {
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
        const bFirstHalf = GameStateAPI.GetTimeDataJSO().gamephase === 2;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbWludHJvbWVudS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlYW1pbnRyb21lbnUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLHdDQUF3QztBQUV4QyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBaUJsQixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFFdkIsS0FBSyxVQUFVLGVBQWU7UUFFMUIsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBeUIsQ0FBQztRQUMxRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUNyRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFbEUsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBRSxjQUFjLENBQUUsQ0FBQztRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFFLFFBQVEsRUFBRSxJQUFJLENBQUUsQ0FBQztRQUNyQyxTQUFTLENBQUUsSUFBSSxFQUFFLENBQUMsQ0FBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNyQixNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUUsVUFBVSxDQUFFLENBQUM7UUFFN0MsUUFBUSxDQUFFLFVBQVUsQ0FBRSxDQUFDO1FBRXZCLFlBQVksQ0FBRSxVQUFVLENBQUUsQ0FBQztRQUUzQixNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNsRCxlQUFlLENBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFFLENBQUM7UUFFL0QsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBQ3pCLFNBQVMsQ0FBRSxLQUFLLEVBQUUsR0FBRyxDQUFFLENBQUM7UUFFeEIsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUs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