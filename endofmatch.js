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
        var elPanel = $.GetContextPanel().FindChildTraverse('EomVacLive');
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
        _m_cP.FindChildrenWithClassTraverse("eom-panel").forEach(function (elPanel) {
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
        _m_cP.SetMouseCapture(true);
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
        if (_m_cP.id !== "PanelToTest")
            return;
        MockAdapter.SetMockData(mockData);
        $.DispatchEvent("Scoreboard_ResetAndInit");
        $.DispatchEvent("OnOpenScoreboard");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVuZG9mbWF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLDZDQUE2QztBQUM3QyxzREFBc0Q7QUFDdEQsaURBQWlEO0FBQ2pELHdDQUF3QztBQThCeEMsSUFBSSxVQUFVLEdBQUcsQ0FBRTtJQUlsQixNQUFNLEtBQUssR0FBcUIsQ0FBQyxDQUFFLGFBQWEsQ0FBRSxJQUFJLENBQUMsQ0FBRSxjQUFjLENBQUcsQ0FBQztJQUMzRSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFzQixDQUFDO0lBQ2pELE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7SUFDaEMsT0FBTyxDQUFDLG9CQUFvQixHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQzNCLE9BQU8sQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7SUFFckMsQ0FBQyxDQUFDLG9CQUFvQixDQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxNQUFNLENBQUUsQ0FBQztJQUMzRCxDQUFDLENBQUMseUJBQXlCLENBQUUscUJBQXFCLEVBQUUsU0FBUyxDQUFFLENBQUM7SUFDaEUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDJCQUEyQixFQUFFLGVBQWUsQ0FBRSxDQUFDO0lBQzVFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSwyQkFBMkIsRUFBRSxlQUFlLENBQUUsQ0FBQztJQU81RSxTQUFTLGNBQWMsQ0FBRyxHQUFXO1FBR3BDLElBQUssT0FBTyxDQUFDLGNBQWMsRUFDM0I7WUFDQyxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO1NBQzFEO1FBRUQsT0FBTyxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUUsR0FB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