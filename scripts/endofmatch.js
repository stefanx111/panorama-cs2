"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/gamerules_constants.ts" />
/// <reference path="endofmatch-characters.ts" />
/// <reference path="mock_adapter.ts" />
var EndOfMatch = (function () {
    // for the case when we're a debug panel, use "PanelToTest". see \scripts\mainmenu_tests.js
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
    //DEVONLY{
    const DEBUG_EOM = false;
    $.RegisterForUnhandledEvent("EndOfMatch_Test_Show", _StartTestShow);
    //}DEVONLY
    function _NavigateToTab(tab) {
        // if an active tab exists, first deactivate it
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
        // we delay the latch to capture the last bits of data
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
        // reset progress bar
        let elProgBar = _m_cP.FindChildTraverse("id-display-timer-progress-bar");
        elProgBar.style.transitionDuration = "0s";
        elProgBar.style.width = '0%';
        // start with scoreboard in coop
        var mode = MockAdapter.GetGameModeInternalName(false);
        _m_data._m_scoreboardVisible = mode == "cooperative" || mode == "coopmission";
        // SCOREBOARD TOGGLE BINDING
        var bind = GameInterfaceAPI.GetSettingString("cl_scoreboard_mouse_enable_binding");
        if (bind.charAt(0) == '+' || bind.charAt(0) == '-')
            bind = bind.substring(1);
        bind = "{s:bind_" + bind + "}";
        bind = $.Localize(bind, _m_cP);
        _m_cP.SetDialogVariable("scoreboard_toggle_bind", bind);
        _m_cP.FindChildrenWithClassTraverse("timer").forEach(el => el.active = false);
        // populate navbar
        var elNavBar = _m_cP.FindChildTraverse("id-content-navbar__tabs");
        elNavBar.RemoveAndDeleteChildren();
        _m_cP.FindChildrenWithClassTraverse("eom-panel").forEach(function (elPanel, i) {
            // create the navbar button
            var elRBtn = $.CreatePanel("RadioButton", elNavBar, "rb--" + elPanel.id);
            elRBtn.BLoadLayoutSnippet("snippet_navbar-button");
            elRBtn.AddClass("navbar-button");
            elRBtn.AddClass("appear");
            elRBtn.SetPanelEvent('onactivate', _NavigateToTab.bind(undefined, elPanel.id));
            //DEVONLY{
            if (DEBUG_EOM) {
                elRBtn.style.border = '1px solid red';
                function _r(min = 0, max = 100) {
                    return Math.round(Math.random() * ((max - min) + min) + 0.5);
                }
                ;
                elRBtn.SetPanelEvent('onactivate', function (id) {
                    _NavigateToTab(id);
                    if (i === 0) {
                        let rankType = 'Wingman';
                        var oldrank = 2990; //_r( 0, 3500);
                        var newrank = oldrank + _r(-100, 100);
                        switch (rankType) {
                            case 'Wingman':
                            case 'Competitive':
                                oldrank = Math.ceil(Math.random() * 17);
                                newrank = oldrank + _r(-1, +1);
                                break;
                            case 'Premier':
                                oldrank = Math.floor(Math.random() * 3500);
                                var newrank = oldrank + _r(-100, 100);
                                break;
                        }
                        // inject some test values
                        // const oldrank = 2990; //_r( 0, 3500);
                        // const newrank = oldrank + _r( -100, 100 );
                        MockAdapter.AddTable('custom', {
                            k_SkillgroupDataJSO: {
                                "old_rank": oldrank,
                                "new_rank": newrank,
                                "num_wins": 345
                            },
                            k_GetPlayerCompetitiveRankType: {
                                0: rankType
                            },
                            k_GetPlayerCompetitiveRanking: 1234,
                            k_bSkillgroupDataReady: 'true', // this makes the skill group tab display in the end of match
                        });
                        $.DispatchEvent('EndOfMatch_Test_Show', 'custom,EOM_WIN,EOM_SKILLGROUP');
                    }
                    else {
                        _m_data._m_arrPanelObjects[i - 1].Start();
                    }
                }.bind(undefined, elPanel.id));
            }
            //}DEVONLY
            elRBtn.FindChildTraverse("id-navbar-button__label").text = $.Localize("#" + elPanel.id);
        });
    }
    function _ShowPanelStart() {
        if (!_m_cP || !_m_cP.IsValid())
            return;
        _m_cP.AddClass("eom--reveal");
        // Fade to black before enabling the in-world camera.
        // Then transition back by hiding the fade.
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
        //	_m_cP.FindChildrenWithClassTraverse( "timer" ).forEach( el => el.active = true );
    }
    function _Start(bHardCut) {
        _Initialize();
        if (bHardCut) {
            // unfortunately we can't do this synchronously --
            // we might be in the last frame of a killer replay,
            // which erroneously makes us think we are in a "demo".
            //
            // so instead do an async schedule here to wait 1 frame
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
        // reset
        $.Schedule(0.0, function () {
            if (elProgBar && elProgBar.IsValid()) {
                elProgBar.style.transitionDuration = "0s";
                elProgBar.style.width = '0%';
            }
        });
        // play
        $.Schedule(0.0, function () {
            if (elProgBar && elProgBar.IsValid()) {
                elProgBar.style.transitionDuration = time + "s";
                elProgBar.style.width = '100%';
            }
        });
    }
    // the shownext event will cycle the end of match to the next state
    function _ShowNextPanel() {
        _m_data._m_currentPanelIndex++;
        //$.Msg( "_ShowNextPanel: " + _m_data._m_currentPanelIndex );
        if (_m_data._m_currentPanelIndex < _m_data._m_arrPanelObjects.length) {
            //$.Msg( "_ShowNextPanel - starting: " + _m_data._m_arrPanelObjects[_m_data._m_currentPanelIndex].name );
            // reveal timer on last panel if live game
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
    /* Public interface */
    return {
        ShowNextPanel: _ShowNextPanel,
        SwitchToPanel: _SwitchToPanel,
        RegisterPanelObject: _RegisterPanelObject,
        StartDisplayTimer: _StartDisplayTimer,
        EnableToggleBetweenScoreboardAndCharacters: _EnableToggleBetweenScoreboardAndCharacters,
        ToggleBetweenScoreboardAndCharacters: _ToggleBetweenScoreboardAndCharacters,
    };
})();
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
})();
