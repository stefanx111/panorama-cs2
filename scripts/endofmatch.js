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
                    return Math.ceil(Math.random() * ((max - min) + min));
                }
                ;
                elRBtn.SetPanelEvent('onactivate', function (id) {
                    _NavigateToTab(id);
                    if (i === 0) {
                        let rankType = 'Premier';
                        let oldrank;
                        let newrank;
                        switch (rankType) {
                            case 'Wingman':
                            case 'Competitive':
                                oldrank = Math.ceil(Math.random() * 17);
                                newrank = oldrank + _r(-1, +1);
                                break;
                            case 'Premier':
                                //oldrank = Math.ceil( Math.random() * 7 ) * 500 - Math.floor( Math.random() * 50);
                                //Keep for promotion state
                                //newrank = oldrank + (100 - (oldrank - (Math.floor(oldrank/100)*100))) - 1 ; // _r( 0, 100 ); 
                                //newrank = oldrank + _r( 0, 100 ); 
                                oldrank = 1118;
                                newrank = 2399;
                                break;
                        }
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
                            k_GetPlayerCompetitiveWins: 321,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVuZG9mbWF0Y2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw2Q0FBNkM7QUFDN0Msc0RBQXNEO0FBQ3RELGlEQUFpRDtBQUNqRCx3Q0FBd0M7QUFzQ3hDLElBQUksVUFBVSxHQUFHLENBQUU7SUFHbEIsMkZBQTJGO0lBQzNGLE1BQU0sS0FBSyxHQUFxQixDQUFDLENBQUUsYUFBYSxDQUFFLElBQUksQ0FBQyxDQUFFLGNBQWMsQ0FBRyxDQUFDO0lBQzNFLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQXNCLENBQUM7SUFDakQsT0FBTyxDQUFDLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztJQUNoQyxPQUFPLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbEMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDM0IsT0FBTyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7SUFDOUIsT0FBTyxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztJQUVyQyxDQUFDLENBQUMsb0JBQW9CLENBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBRSxDQUFDO0lBQzNELENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxxQkFBcUIsRUFBRSxTQUFTLENBQUUsQ0FBQztJQUNoRSxDQUFDLENBQUMseUJBQXlCLENBQUUsMkJBQTJCLEVBQUUsZUFBZSxDQUFFLENBQUM7SUFDNUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDJCQUEyQixFQUFFLGVBQWUsQ0FBRSxDQUFDO0lBRTVFLFVBQVU7SUFFVixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFFeEIsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLHNCQUFzQixFQUFFLGNBQWMsQ0FBRSxDQUFDO0lBQ3RFLFVBQVU7SUFHVixTQUFTLGNBQWMsQ0FBRyxHQUFXO1FBRXBDLCtDQUErQztRQUMvQyxJ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