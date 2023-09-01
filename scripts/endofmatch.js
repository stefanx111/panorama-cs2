"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="endofmatch-characters.ts" />
/// <reference path="mock_adapter.ts" />
var EndOfMatch;
(function (EndOfMatch) {
    const _m_cP = $('#EndOfMatch');
    const _m_data = {
        _m_arrPanelObjects: [],
        _m_currentPanelIndex: -1,
        _m_jobStart: null,
        _m_elActiveTab: null,
        _m_scoreboardVisible: false,
    };
    $.RegisterEventHandler("EndOfMatch_Show", _m_cP, _Start);
    $.RegisterForUnhandledEvent("EndOfMatch_Shutdown", _Shutdown);
    $.RegisterForUnhandledEvent("EndOfMatch_ShowScoreboard", _ShowScoreboard);
    $.RegisterForUnhandledEvent("EndOfMatch_HideScoreboard", _HideScoreboard);
    function _NavigateToTab(tab) {
        if (_m_data._m_elActiveTab) {
            _m_data._m_elActiveTab.RemoveClass('eom-panel--active');
        }
        _m_data._m_elActiveTab = _m_cP.FindChildTraverse(tab);
        if (_m_data._m_elActiveTab) {
            _m_data._m_elActiveTab.AddClass('eom-panel--active');
        }
    }
    function ToggleBetweenScoreboardAndCharacters() {
        _m_data._m_scoreboardVisible = !_m_data._m_scoreboardVisible;
        _m_cP.SetHasClass('scoreboard-visible', _m_data._m_scoreboardVisible);
    }
    EndOfMatch.ToggleBetweenScoreboardAndCharacters = ToggleBetweenScoreboardAndCharacters;
    function EnableToggleBetweenScoreboardAndCharacters() {
        _m_cP.SetHasClass('scoreboard-visible', _m_data._m_scoreboardVisible);
    }
    EndOfMatch.EnableToggleBetweenScoreboardAndCharacters = EnableToggleBetweenScoreboardAndCharacters;
    function _ShowScoreboard() {
        _m_cP.SetHasClass('scoreboard-visible', true);
        _m_data._m_scoreboardVisible = true;
    }
    function _HideScoreboard() {
        _m_cP.SetHasClass('scoreboard-visible', false);
        _m_data._m_scoreboardVisible = false;
    }
    function SwitchToPanel(tab) {
        _m_cP.FindChildTraverse('rb--' + tab).RemoveClass("hidden");
        _m_cP.FindChildTraverse('rb--' + tab).checked = true;
        _NavigateToTab(tab);
    }
    EndOfMatch.SwitchToPanel = SwitchToPanel;
    function RegisterPanelObject(panel) {
        _m_data._m_arrPanelObjects.push(panel);
    }
    EndOfMatch.RegisterPanelObject = RegisterPanelObject;
    function _Initialize() {
        _m_cP.SetMouseCapture(true);
        var elPanel = $.GetContextPanel().FindChildTraverse('EomVacLive');
        if (elPanel)
            elPanel.RemoveClass('show');
        $.Schedule(1, () => { $.DispatchEvent("EndOfMatch_Latch"); });
        _m_data._m_arrPanelObjects = [];
        _m_data._m_currentPanelIndex = -1;
        _m_data._m_elActiveTab = null;
        if (_m_data._m_jobStart !== null) {
            $.CancelScheduled(_m_data._m_jobStart);
            _m_data._m_jobStart = null;
        }
        var elLayout = _m_cP.FindChildTraverse("id-eom-layout");
        elLayout.RemoveAndDeleteChildren();
        elLayout.BLoadLayoutSnippet("snippet-eom-layout--default");
        let elProgBar = _m_cP.FindChildTraverse("id-display-timer-progress-bar");
        elProgBar.style.transitionDuration = "0s";
        elProgBar.style.width = '0%';
        var mode = MockAdapter.GetGameModeInternalName(false);
        _m_data._m_scoreboardVisible = mode == "cooperative" || mode == "coopmission";
        var bind = GameInterfaceAPI.GetSettingString("cl_scoreboard_mouse_enable_binding");
        if (bind.charAt(0) == '+' || bind.charAt(0) == '-')
            bind = bind.substring(1);
        bind = "{s:bind_" + bind + "}";
        bind = $.Localize(bind, _m_cP);
        _m_cP.SetDialogVariable("scoreboard_toggle_bind", bind);
        _m_cP.FindChildrenWithClassTraverse("timer").forEach(el => el.active = false);
        var elNavBar = _m_cP.FindChildTraverse("id-content-navbar__tabs");
        elNavBar.RemoveAndDeleteChildren();
        _m_cP.FindChildrenWithClassTraverse("eom-panel").forEach(function (elPanel, i) {
            var elRBtn = $.CreatePanel("RadioButton", elNavBar, "rb--" + elPanel.id);
            elRBtn.BLoadLayoutSnippet("snippet_navbar-button");
            elRBtn.AddClass("navbar-button");
            elRBtn.AddClass("appear");
            elRBtn.SetPanelEvent('onactivate', _NavigateToTab.bind(undefined, elPanel.id));
            elRBtn.FindChildTraverse("id-navbar-button__label").text = $.Localize("#" + elPanel.id);
        });
    }
    function _ShowPanelStart() {
        if (!_m_cP || !_m_cP.IsValid())
            return;
        _m_cP.AddClass("eom--reveal");
        const elFade = $("#id-eom-fade");
        elFade.AddClass("active");
        let elFallbackBackground = $("#id-eom-fallback-background");
        elFallbackBackground.AddClass("hidden");
        var elBackgroundImage = _m_cP.FindChildInLayoutFile('BackgroundMapImage');
        elBackgroundImage.SetImage('file://{images}/map_icons/screenshots/1080p/' + GameStateAPI.GetMapBSPName() + '.png');
        $.Schedule(0.5, () => {
            _m_cP.SetWantsCamera(true);
            if (_m_cP.FindChildTraverse('id-eom-characters-root')) {
                EOM_Characters.Start();
            }
            elFade.RemoveClass("active");
            if (_m_cP.IsInFallbackMode()) {
                elFallbackBackground.RemoveClass("hidden");
            }
        });
    }
    function _Start(bHardCut) {
        _Initialize();
        if (bHardCut) {
            _m_data._m_jobStart = $.Schedule(0.0, () => {
                _m_data._m_jobStart = null;
                _ShowPanelStart();
                ShowNextPanel();
            });
        }
        else {
            _m_data._m_jobStart = $.Schedule(0.0, () => {
                _m_data._m_jobStart = null;
                _ShowPanelStart();
                $.Schedule(1.25, ShowNextPanel);
            });
        }
    }
    function _StartTestShow(mockData) {
        MockAdapter.SetMockData(mockData);
        $.DispatchEvent("Scoreboard_ResetAndInit");
        $.DispatchEvent("OnOpenScoreboard");
        _m_cP.SetMouseCapture(false);
        _Initialize();
        _ShowPanelStart();
        $.Schedule(1.25, ShowNextPanel);
    }
    function StartDisplayTimer(time) {
        var elProgBar = _m_cP.FindChildTraverse("id-display-timer-progress-bar");
        $.Schedule(0.0, function () {
            if (elProgBar && elProgBar.IsValid()) {
                elProgBar.style.transitionDuration = "0s";
                elProgBar.style.width = '0%';
            }
        });
        $.Schedule(0.0, function () {
            if (elProgBar && elProgBar.IsValid()) {
                elProgBar.style.transitionDuration = time + "s";
                elProgBar.style.width = '100%';
            }
        });
    }
    EndOfMatch.StartDisplayTimer = StartDisplayTimer;
    function ShowNextPanel() {
        _m_data._m_currentPanelIndex++;
        if (_m_data._m_currentPanelIndex < _m_data._m_arrPanelObjects.length) {
            if (_m_data._m_currentPanelIndex === (_m_data._m_arrPanelObjects.length - 1) &&
                !GameStateAPI.IsDemoOrHltv() &&
                !GameStateAPI.IsQueuedMatchmaking()) {
                _m_cP.FindChildrenWithClassTraverse("timer").forEach(el => el.active = true);
            }
            _m_data._m_arrPanelObjects[_m_data._m_currentPanelIndex].Start();
        }
    }
    EndOfMatch.ShowNextPanel = ShowNextPanel;
    function _Shutdown() {
        if (_m_data._m_jobStart) {
            $.CancelScheduled(_m_data._m_jobStart);
            _m_data._m_jobStart = null;
        }
        var elLayout = _m_cP.FindChildTraverse("id-eom-layout");
        elLayout.RemoveAndDeleteChildren();
        for (const panelObject of _m_data._m_arrPanelObjects) {
            if (panelObject.Shutdown)
                panelObject.Shutdown();
        }
        _m_cP.RemoveClass("eom--reveal");
        if (_m_cP.FindChildTraverse('id-eom-characters-root')) {
            EOM_Characters.Shutdown();
        }
        _m_cP.SetWantsCamera(false);
    }
})(EndOfMatch || (EndOfMatch = {}));
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVuZG9mbWF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw2Q0FBNkM7QUFDN0Msc0RBQXNEO0FBQ3RELGlEQUFpRDtBQUNqRCx3Q0FBd0M7QUFxQ3hDLElBQVUsVUFBVSxDQXlYbkI7QUF6WEQsV0FBVSxVQUFVO0lBSW5CLE1BQU0sS0FBSyxHQUFxQixDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDakQsTUFBTSxPQUFPLEdBQ2I7UUFDQyxrQkFBa0IsRUFBRyxFQUFFO1FBQ3ZCLG9CQUFvQixFQUFHLENBQUMsQ0FBQztRQUN6QixXQUFXLEVBQUcsSUFBSTtRQUNsQixjQUFjLEVBQUcsSUFBSTtRQUNyQixvQkFBb0IsRUFBRyxLQUFLO0tBQzVCLENBQUE7SUFFRCxDQUFDLENBQUMsb0JBQW9CLENBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBRSxDQUFDO0lBQzNELENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxQkFBcUIsRUFBRSxTQUFTLENBQUUsQ0FBQztJQUNoRSxDQUFDLENBQUMseUJBQXlCLENBQUUsMkJBQTJCLEVBQUUsZUFBZSxDQUFFLENBQUM7SUFDNUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDJCQUEyQixFQUFFLGVBQWUsQ0FBRSxDQUFDO0lBVTVFLFNBQVMsY0FBYyxDQUFHLEdBQVc7UUFHcEMsSUFBSyxPQUFPLENBQUMsY0FBYyxFQUMzQjtZQUNDLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFFLG1CQUFtQixDQUFFLENBQUM7U0FDMUQ7UUFFRCxPQUFPLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUV4RCxJQUFLLE9BQU8sQ0FBQyxjQUFjLEVBQzNCO1lBQ0MsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUN2RDtJ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