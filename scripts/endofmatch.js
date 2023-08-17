"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="endofmatch-characters.ts" />
/// <reference path="mock_adapter.ts" />
var EndOfMatch = (function () {
    const _m_cP = $("#EndOfMatch") || $("#PanelToTest");
    const _m_data = _m_cP.Data();
    _m_data._m_arrPanelObjects = [];
    _m_data._m_currentPanelIndex = -1;
    _m_data._m_jobStart = null;
    _m_data._m_elActiveTab = null;
    _m_data._m_scoreboardVisible = false;
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
    function _ToggleBetweenScoreboardAndCharacters() {
        _m_data._m_scoreboardVisible = !_m_data._m_scoreboardVisible;
        _m_cP.SetHasClass('scoreboard-visible', _m_data._m_scoreboardVisible);
    }
    function _EnableToggleBetweenScoreboardAndCharacters() {
        _m_cP.SetHasClass('scoreboard-visible', _m_data._m_scoreboardVisible);
    }
    function _ShowScoreboard() {
        _m_cP.SetHasClass('scoreboard-visible', true);
        _m_data._m_scoreboardVisible = true;
    }
    function _HideScoreboard() {
        _m_cP.SetHasClass('scoreboard-visible', false);
        _m_data._m_scoreboardVisible = false;
    }
    function _SwitchToPanel(tab) {
        _m_cP.FindChildTraverse('rb--' + tab).RemoveClass("hidden");
        _m_cP.FindChildTraverse('rb--' + tab).checked = true;
        _NavigateToTab(tab);
    }
    function _RegisterPanelObject(panel) {
        _m_data._m_arrPanelObjects.push(panel);
    }
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
                _ShowNextPanel();
            });
        }
        else {
            _m_data._m_jobStart = $.Schedule(0.0, () => {
                _m_data._m_jobStart = null;
                _ShowPanelStart();
                $.Schedule(1.25, _ShowNextPanel);
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
        $.Schedule(1.25, _ShowNextPanel);
    }
    function _StartDisplayTimer(time) {
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
    function _ShowNextPanel() {
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
    return {
        ShowNextPanel: _ShowNextPanel,
        SwitchToPanel: _SwitchToPanel,
        RegisterPanelObject: _RegisterPanelObject,
        StartDisplayTimer: _StartDisplayTimer,
        EnableToggleBetweenScoreboardAndCharacters: _EnableToggleBetweenScoreboardAndCharacters,
        ToggleBetweenScoreboardAndCharacters: _ToggleBetweenScoreboardAndCharacters,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVuZG9mbWF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw2Q0FBNkM7QUFDN0Msc0RBQXNEO0FBQ3RELGlEQUFpRDtBQUNqRCx3Q0FBd0M7QUFzQ3hDLElBQUksVUFBVSxHQUFHLENBQUU7SUFJbEIsTUFBTSxLQUFLLEdBQXFCLENBQUMsQ0FBRSxhQUFhLENBQUUsSUFBSSxDQUFDLENBQUUsY0FBYyxDQUFHLENBQUM7SUFDM0UsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBc0IsQ0FBQztJQUNqRCxPQUFPLENBQUMsa0JBQWtCLEdBQUcsRUFBRSxDQUFDO0lBQ2hDLE9BQU8sQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNsQyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUMzQixPQUFPLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztJQUM5QixPQUFPLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0lBRXJDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFFLENBQUM7SUFDM0QsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHFCQUFxQixFQUFFLFNBQVMsQ0FBRSxDQUFDO0lBQ2hFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSwyQkFBMkIsRUFBRSxlQUFlLENBQUUsQ0FBQztJQUM1RSxDQUFDLENBQUMseUJBQXlCLENBQUUsMkJBQTJCLEVBQUUsZUFBZSxDQUFFLENBQUM7SUFVNUUsU0FBUyxjQUFjLENBQUcsR0FBVztRQUdwQyxJQUFLLE9BQU8sQ0FBQyxjQUFjLEVBQzNCO1lBQ0MsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUMxRDtRQUVELE9BQU8sQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFFLEdB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