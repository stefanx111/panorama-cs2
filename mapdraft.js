/// <reference path="csgo.d.ts" />
/// <reference path="avatar.ts" />
const MapDraft = (function () {
    const _m_cp = $.GetContextPanel();
    let _m_nPhase = 0;
    let _m_hDenyInputToGame = null;
    let _m_isThisPhasePick = false;
    const _m_phaseTitleText = _m_cp.FindChildInLayoutFile('id-map-draft-phase-info');
    const _m_rowsContainer = _m_cp.FindChildInLayoutFile('id-map-draft-phase-rows');
    const _m_rowPhaseName = 'id-map-draft-phase-buttons-container';
    const _m_nT = 2;
    const _m_nCt = 3;
    let _m_msLastSoundTimestamp = (new Date()).getTime();
    function _PlaySoundEffect(strSoundEffect, msThrottleRequired = 0) {
        const msTimestampNow = (new Date()).getTime();
        if (msThrottleRequired && (msThrottleRequired > 0)) {
            if (msTimestampNow - _m_msLastSoundTimestamp < msThrottleRequired)
                return;
        }
        $.DispatchEvent('CSGOPlaySoundEffect', strSoundEffect, 'MOUSE');
        _m_msLastSoundTimestamp = msTimestampNow;
    }
    function _Update() {
        let sGameUiState = GameStateAPI.GetCSGOGameUIStateName();
        let bThisPanelIsVisible = true;
        if (sGameUiState === 'CSGO_GAME_UI_STATE_LOADINGSCREEN' || MatchDraftAPI.GetDraft() !== 'ingame' || MatchDraftAPI.GetIngamePhase() < 1) {
            bThisPanelIsVisible = false;
        }
        _m_cp.visible = bThisPanelIsVisible;
        _m_cp.SetHasClass('map-draft--show', bThisPanelIsVisible);
        let bMouseCaptureActive = _m_hDenyInputToGame ? true : false;
        if (bMouseCaptureActive != bThisPanelIsVisible) {
            if (bThisPanelIsVisible) {
                _m_hDenyInputToGame = UiToolkitAPI.AddDenyInputFlagsToGame(_m_cp, "MapDraft", "ShareMouse");
                _PopulatePlayerList();
            }
            else {
                UiToolkitAPI.ReleaseDenyInputFlagsToGame(_m_hDenyInputToGame);
                _m_hDenyInputToGame = null;
            }
        }
        if (!bThisPanelIsVisible) {
            _m_rowsContainer.RemoveAndDeleteChildren();
            return;
        }
        _m_cp.visible = true;
        _m_cp.SetHasClass('map-draft--show', true);
        if (MatchDraftAPI.GetIngamePhase() != _m_nPhase) {
            _PlaySoundEffect('tab_mainmenu_watch');
        }
        else {
            const ingameTeamToActNow = MatchDraftAPI.GetIngameTeamToActNow();
            if (ingameTeamToActNow && (ingameTeamToActNow == GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid()))) {
                _PlaySoundEffect('UIPanorama.mainmenu_rollover', 400);
            }
        }
        _m_nPhase = MatchDraftAPI.GetIngamePhase();
        if (_m_nPhase > 6) {
            _m_nPhase = 6;
        }
        _HideFinishedPhaseRows();
        _MakeVoteButtons(_UpdateButtonsRow());
        _UpdateActionText();
        _UpdatePhaseProgressBar();
    }
    const _UpdatePhaseProgressBar = function () {
        const aChildren = _m_cp.FindChildInLayoutFile('id-map-draft-phasebar-container').Children();
        aChildren.forEach(phase => {
            const nPhaseBarIndex = parseInt(phase.GetAttributeString('data-phase', ''));
            phase.SetHasClass('map-draft-phasebar--ban', !_m_isThisPhasePick && nPhaseBarIndex === _m_nPhase);
            phase.SetHasClass('map-draft-phasebar--pick', _m_isThisPhasePick && nPhaseBarIndex === _m_nPhase);
            phase.SetHasClass('map-draft-phasebar--pre', nPhaseBarIndex > _m_nPhase);
            phase.SetHasClass('map-draft-phasebar--post', nPhaseBarIndex < _m_nPhase);
            phase.FindChildInLayoutFile('id-map-draft-phase-name').text = $.Localize('#matchdraft_phase_' + nPhaseBarIndex);
            if (nPhaseBarIndex === _m_nPhase) {
                const nTimeRemaining = MatchDraftAPI.GetIngamePhaseSecondsRemaining() || 0;
                phase.FindChildInLayoutFile('id-map-draft-phase-timer').timeleft = nTimeRemaining;
            }
        });
    };
    const _UpdateButtonsRow = function () {
        let elContainer = _m_rowsContainer.FindChildInLayoutFile(_m_rowPhaseName + _m_nPhase);
        if (!elContainer) {
            elContainer = $.CreatePanel('Panel', _m_rowsContainer, _m_rowPhaseName + _m_nPhase);
            elContainer.AddClass('map-draft-phase-buttons-container');
            elContainer.AddClass('map-draft-phase-buttons-container--show');
            elContainer.Data().phase = _m_nPhase;
        }
        elContainer.SetHasClass('map-draft-phase-buttons-container--show', true);
        elContainer.SetHasClass('map-draft-phase-buttons-container--hide', false);
        elContainer.hittest = true;
        elContainer.hittestchildren = true;
        return elContainer;
    };
    const _HideFinishedPhaseRows = function () {
        const aRows = _m_rowsContainer.Children();
        aRows.forEach(function (row) {
            if (row.Data().phase !== _m_nPhase) {
                row.RemoveClass('map-draft-phase-buttons-container--show');
                row.AddClass('map-draft-phase-buttons-container--hide');
                row.hittest = false;
                row.hittestchildren = false;
            }
        });
    };
    const _MakeVoteButtons = function (elContainer) {
        if (_m_nPhase === 1) {
            _m_isThisPhasePick = true;
            const nYourTeam = GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid());
            const nOtherTeam = nYourTeam === _m_nT ? _m_nCt : _m_nT;
            _MakeButton(elContainer, {
                id: 'id-phase-1-btn-ban-first',
                image: 'url("file://{images}/mapdraft/ban_first.png")',
                selectorimg: "file://{images}/mapdraft/green_check.png",
                name: "#matchdraft_vote_ban_first",
                statustext: '#matchdraft_vote_status_pick',
                ispick: _m_isThisPhasePick,
                voteid: nYourTeam
            });
            _MakeButton(elContainer, {
                id: 'id-phase-1-btn-pick-side',
                image: 'url("file://{images}/mapdraft/pick_team.png")',
                selectorimg: "file://{images}/mapdraft/green_check.png",
                name: "#matchdraft_vote_pick_team",
                statustext: '#matchdraft_vote_status_pick',
                ispick: _m_isThisPhasePick,
                voteid: nOtherTeam
            });
        }
        else if (_m_nPhase === 5) {
            _m_isThisPhasePick = true;
            _MakeButton(elContainer, {
                id: 'id-phase-5-btn-start-ct',
                image: 'url("file://{images}/mapdraft/pick_ct.png")',
                selectorimg: "file://{images}/mapdraft/green_check.png",
                name: "#CSGO_Inventory_Team_CT",
                statustext: '#matchdraft_vote_status_pick',
                ispick: _m_isThisPhasePick,
                voteid: _m_nCt
            });
            _MakeLargeMap(elContainer);
            _MakeButton(elContainer, {
                id: 'id-phase-5-btn-start-t',
                image: 'url("file://{images}/mapdraft/pick_t.png")',
                selectorimg: "file://{images}/mapdraft/green_check.png",
                name: "#CSGO_Inventory_Team_T",
                statustext: '#matchdraft_vote_status_pick',
                ispick: _m_isThisPhasePick,
                voteid: _m_nT
            });
        }
        else if (_m_nPhase === 6) {
            _MakeLargeMap(elContainer, 'map-draft-phase-pick-map-image--large');
        }
        else if (_m_nPhase < 5) {
            _m_isThisPhasePick = false;
            const aVoteIds = MatchDraftAPI.GetIngameMapIdsList().split(',');
            for (let i = 0; i < aVoteIds.length; i++) {
                const nVoteId = parseInt(aVoteIds[i]);
                const mapName = DeepStatsAPI.MapIDToString(nVoteId);
                if (_m_nPhase !== 4 ||
                    (_m_nPhase === 4 && MatchDraftAPI.GetIngameTeamToActNow() !== GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid())) ||
                    (_m_nPhase === 4 && MatchDraftAPI.GetIngameTeamToActNow() === GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid()) &&
                        MatchDraftAPI.GetIngameMapIdState(nVoteId) !== 'veto')) {
                    _MakeButton(elContainer, {
                        id: 'id-phase-' + _m_nPhase + '-btn-' + aVoteIds[i],
                        image: 'url("file://{images}/map_icons/screenshots/360p/' + mapName + '.png")',
                        selectorimg: "file://{images}/mapdraft/red_x.png",
                        name: '#SFUI_Map_' + mapName,
                        statustext: '#matchdraft_vote_status_ban',
                        ispick: _m_isThisPhasePick,
                        mapstatus: MatchDraftAPI.GetIngameMapIdState(nVoteId),
                        voteid: nVoteId
                    });
                }
            }
        }
    };
    const _MakeButton = function (elContainer, oBtnData) {
        let elButton = elContainer.FindChildInLayoutFile(oBtnData.id);
        if (!elButton) {
            elButton = $.CreatePanel('Button', elContainer, oBtnData.id);
            elButton.BLoadLayoutSnippet('ButtonMapTile');
            const bgImage = elButton.FindChildInLayoutFile('draft-phase-button-image');
            bgImage.style.backgroundImage = oBtnData.image;
            bgImage.style.backgroundPosition = '50% 0%';
            bgImage.style.backgroundSize = 'auto 100%';
            elButton.FindChildInLayoutFile('draft-phase-button-selectorimg').SetImage(oBtnData.selectorimg);
            elButton.SetDialogVariable('mapname', $.Localize(oBtnData.name));
            const elStatusText = elButton.FindChildInLayoutFile('draft-phase-button-statustext');
            elStatusText.text = $.Localize(oBtnData.statustext);
            elButton.SetPanelEvent('onactivate', () => _OnActivateVoteTile(elContainer, oBtnData));
            elButton.SetPanelEvent('onmouseover', function () {
                if (elButton.enabled) {
                    _PlaySoundEffect('UIPanorama.mainmenu_rollover');
                }
            });
            elButton.Data().voteid = oBtnData.voteid;
        }
        elButton.SetHasClass('map-draft-phase-button__status--positive', oBtnData.ispick);
        elButton.enabled = true;
        if (MatchDraftAPI.GetIngameTeamToActNow() !== GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid()) ||
            oBtnData.hasOwnProperty('mapstatus') && oBtnData.mapstatus === 'veto') {
            elButton.SetHasClass('map-draft-phase-button--vetoed', oBtnData.mapstatus === 'veto');
            elButton.enabled = false;
            return;
        }
        const aVotedXuids = MatchDraftAPI.GetIngameXuidsForVote(Number(oBtnData.voteid)).split(',');
        elButton.SetHasClass('map-draft-phase-button--selected', aVotedXuids.indexOf(MyPersonaAPI.GetXuid()) !== -1);
        if (MatchDraftAPI.GetIngameXuidsForVote(Number(oBtnData.voteid))) {
            const aVoteIds = MatchDraftAPI.GetIngameWinningVotes().split(',');
            elButton.SetHasClass('map-draft-phase-button--winning-vote', aVoteIds.indexOf(oBtnData.voteid.toString()) !== -1);
        }
        else {
            elButton.SetHasClass('map-draft-phase-button--winning-vote', false);
        }
        const elAvatarsContainer = elButton.FindChildInLayoutFile('id-map-draft-phase-avatars-container');
        elAvatarsContainer.RemoveAndDeleteChildren();
        for (let i = 0; i < aVotedXuids.length; i++) {
            _MakeAvatar(aVotedXuids[i], elAvatarsContainer);
        }
    };
    const _OnActivateVoteTile = function (elContainer, oBtnData) {
        const aCurrentVotes = _GetCurrentVotes();
        const matchingVoteSlot = aCurrentVotes.indexOf(oBtnData.voteid);
        if (matchingVoteSlot !== -1) {
            MatchDraftAPI.ActionIngameCastMyVote(_m_nPhase, matchingVoteSlot, 0);
            _PlaySoundEffect('buymenu_select');
            return;
        }
        const aBtns = elContainer.Children().filter(btn => btn.Data().voteid);
        if (aBtns.length < 3) {
            MatchDraftAPI.ActionIngameCastMyVote(_m_nPhase, 0, oBtnData.voteid);
            _PlaySoundEffect('buymenu_purchase');
            return;
        }
        const freeSlot = _GetFirstFreeVoteSlot(aCurrentVotes);
        if (freeSlot !== null) {
            MatchDraftAPI.ActionIngameCastMyVote(_m_nPhase, freeSlot, oBtnData.voteid);
            _PlaySoundEffect('buymenu_purchase');
        }
        else {
            aBtns.forEach(function (btn) {
                if (btn.BHasClass('map-draft-phase-button--selected')) {
                    btn.RemoveClass('map-draft-phase-button--pulse');
                    btn.AddClass('map-draft-phase-button--pulse');
                }
            });
            _PlaySoundEffect('buymenu_failure');
        }
    };
    const _GetCurrentVotes = function () {
        const aCurrentVotes = [];
        for (let i = 0; i < _GetNumVoteSlots(); i++) {
            const voteId = MatchDraftAPI.GetIngameMyVoteInSlot(i) || "empty";
            aCurrentVotes.push(voteId);
        }
        return aCurrentVotes;
    };
    const _GetFirstFreeVoteSlot = function (aCurrentVotes) {
        for (let i = 0; i < aCurrentVotes.length; i++) {
            if (aCurrentVotes[i] === 'empty') {
                return i;
            }
        }
        return null;
    };
    const _GetNumVoteSlots = function () {
        if (_m_nPhase === 1 || _m_nPhase === 5) {
            return 1;
        }
        if (_m_nPhase === 2) {
            return 2;
        }
        if (_m_nPhase === 3) {
            return 3;
        }
        if (_m_nPhase === 4) {
            return 1;
        }
        return 0.;
    };
    const _UpdateActionText = function () {
        const isWaiting = MatchDraftAPI.GetIngameTeamToActNow() !== GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid());
        _m_cp.FindChildInLayoutFile('id-map-draft-phase-info').SetHasClass('map-draft-phase-info--hidden', isWaiting);
        _m_cp.FindChildInLayoutFile('id-map-draft-phase-waiting').SetHasClass('map-draft-phase-info--hidden', !isWaiting);
        if (isWaiting) {
            _m_cp.FindChildInLayoutFile('id-map-draft-phase-wait').text = $.Localize('#matchdraft_phase_action_wait_' + _m_nPhase);
            return;
        }
        const elContainer = _m_rowsContainer.FindChildInLayoutFile(_m_rowPhaseName + _m_nPhase);
        const nPickedMaps = elContainer.Children().filter(btn => btn.BHasClass('map-draft-phase-button--selected'));
        _m_cp.SetDialogVariableInt('maps', nPickedMaps.length);
        _m_phaseTitleText.text = $.Localize('#matchdraft_phase_action_' + _m_nPhase, _m_cp);
    };
    const _MakeLargeMap = function (elContainer, style) {
        const aMapIds = MatchDraftAPI.GetIngameMapIdsList().split(',');
        const mapPickId = aMapIds.filter(id => MatchDraftAPI.GetIngameMapIdState(parseInt(id)) === 'pick')[0];
        const mapName = DeepStatsAPI.MapIDToString(parseInt(mapPickId));
        let elMapImage = elContainer.FindChildInLayoutFile('id-map-draft-phase-pick-map-image');
        if (!elMapImage) {
            elMapImage = $.CreatePanel('Panel', elContainer, 'id-map-draft-phase-pick-map-image');
            elMapImage.BLoadLayoutSnippet('FinalMapPick');
        }
        elMapImage.SetDialogVariable('mapname', $.Localize('#SFUI_Map_' + mapName));
        elMapImage.style.backgroundImage = 'url("file://{images}/map_icons/screenshots/360p/' + mapName + '.png")';
        elMapImage.style.backgroundPosition = '50% 0%';
        elMapImage.style.backgroundSize = 'auto 100%';
        elMapImage.style.backgroundImgOpacity = '.5';
        if (style) {
            elMapImage.AddClass(style);
            const nYourTeam = GameStateAPI.GetPlayerTeamNumber(MyPersonaAPI.GetXuid());
            const nOtherTeam = nYourTeam === _m_nT ? _m_nCt : _m_nT;
            const nStartingTeam = (MatchDraftAPI.GetIngameTeamWithFirstChoice() === MatchDraftAPI.GetIngameTeamStartingCT())
                ? nOtherTeam : nYourTeam;
            const teamLogo = nStartingTeam === _m_nT ? 't_logo.svg' : 'ct_logo.svg';
            const startingTeam = nStartingTeam === _m_nT ? '#CSGO_Inventory_Team_T' : '#CSGO_Inventory_Team_CT';
            elContainer.FindChildInLayoutFile('id-map-draft-starting-team').visible = true;
            elContainer.FindChildInLayoutFile('id-map-draft-starting-team-icon').SetImage("file://{images}/icons/" + teamLogo);
            elContainer.SetDialogVariable('teamname', $.Localize(startingTeam));
        }
    };
    function _PopulatePlayerList() {
        const yourXuid = MyPersonaAPI.GetXuid();
        const oPlayerList = GameStateAPI.GetPlayerDataJSO();
        const teamNames = ['TERRORIST', 'CT'];
        let iYourXuidTeamIdx = 1;
        for (let iTeam = 0; iTeam < teamNames.length; ++iTeam) {
            const teamName = teamNames[iTeam];
            let players = {};
            if (oPlayerList !== undefined && oPlayerList[teamName]) {
                players = oPlayerList[teamName];
            }
            if (iTeam === 0 && Object.values(players).indexOf(yourXuid) !== -1) {
                iYourXuidTeamIdx = 0;
            }
            const teamPanelId = (iYourXuidTeamIdx === iTeam) ? 'id-map-draft-phase-your-team' : 'id-map-draft-phase-other-team';
            const elTeammates = _m_cp.FindChildInLayoutFile(teamPanelId).FindChild('id-map-draft-phase-avatars');
            elTeammates.RemoveAndDeleteChildren();
            for (const j in players) {
                const xuid = players[j];
                if (!GameStateAPI.IsFakePlayer(xuid)) {
                    _MakeAvatar(xuid, elTeammates, true);
                }
            }
        }
    }
    const _CleanUpAvatars = function (xuids, elTeammates) {
        const listOfTeammatesPanels = elTeammates.Children();
        listOfTeammatesPanels.forEach(function (element) {
            if (xuids.indexOf(element.id) === -1 ||
                !GameStateAPI.IsPlayerConnected(element.id)) {
                element.AddClass('hidden');
            }
        });
        elTeammates.RemoveAndDeleteChildren();
    };
    const _MakeAvatar = function (xuid, elTeammates, bisTeamLister = false) {
        if (xuid === "0")
            return;
        if (xuid) {
            let elAvatar = elTeammates.FindChildInLayoutFile(xuid);
            const panelType = bisTeamLister ? 'Button' : 'Panel';
            if (!elAvatar || elAvatar.BHasClass('hidden')) {
                elAvatar = $.CreatePanel(panelType, elTeammates, xuid);
                elAvatar.BLoadLayoutSnippet('SmallAvatar');
                if (bisTeamLister) {
                    _AddOpenPlayerCardAction(elAvatar, xuid);
                }
            }
            elAvatar.FindChildTraverse('JsAvatarImage').PopulateFromSteamID(xuid);
            const teamColor = GameStateAPI.GetPlayerColor(xuid);
            const elTeamColor = elAvatar.FindChildInLayoutFile('JsAvatarTeamColor');
            if (!teamColor) {
                elTeamColor.visible = false;
            }
            else {
                elTeamColor.visible = true;
                elTeamColor.style.washColor = teamColor;
            }
            elAvatar.SetDialogVariable('teammate_name', FriendsListAPI.GetFriendName(xuid));
        }
    };
    const _AddOpenPlayerCardAction = function (elAvatar, xuid) {
        const openCard = function (xuid) {
            $.DispatchEvent('SidebarContextMenuActive', true);
            if (xuid !== "0") {
                const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_playercard.xml', 'xuid=' + xuid, function () {
                    $.DispatchEvent('SidebarContextMenuActive', false);
                });
                contextMenuPanel.AddClass("ContextMenu_NoArrow");
            }
        };
        elAvatar.SetPanelEvent("onactivate", () => openCard(xuid));
    };
    const m_eventHandles = [];
    function _OnReadyForDisplay() {
        m_eventHandles.push(['PanoramaComponent_IngameDraft_DraftUpdate', $.RegisterForUnhandledEvent('PanoramaComponent_IngameDraft_DraftUpdate', _Update)]);
        m_eventHandles.push(['UnloadLoadingScreenAndReinit', $.RegisterForUnhandledEvent('UnloadLoadingScreenAndReinit', _Update)]);
        m_eventHandles.push(['PlayerTeamChanged', $.RegisterForUnhandledEvent('PlayerTeamChanged', _PopulatePlayerList)]);
    }
    ;
    function _OnUnreadyForDisplay() {
        while (m_eventHandles.length > 0) {
            const h = m_eventHandles.pop();
            $.UnregisterForUnhandledEvent(h[0], h[1]);
        }
    }
    ;
    return {
        Update: _Update,
        PopulatePlayerList: _PopulatePlayerList,
        OnReadyForDisplay: _OnReadyForDisplay,
        OnUnreadyForDisplay: _OnUnreadyForDisplay,
    };
})();
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), MapDraft.OnReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), MapDraft.OnUnreadyForDisplay);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwZHJhZnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXBkcmFmdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxrQ0FBa0M7QUFDbEMsa0NBQWtDO0FBRWxDLE1BQU0sUUFBUSxHQUFHLENBQUU7SUFHbEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2xDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixJQUFJLG1CQUFtQixHQUFrQixJQUFJLENBQUM7SUFDOUMsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUseUJBQXlCLENBQWEsQ0FBQztJQUM5RixNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBRSx5QkFBeUIsQ0FBRSxDQUFDO0lBQ2xGLE1BQU0sZUFBZSxHQUFHLHNDQUFzQyxDQUFDO0lBSS9ELE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNoQixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFFakIsSUFBSSx1QkFBdUIsR0FBRyxDQUFFLElBQUksSUFBSSxFQUFFLENBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2RCxTQUFTLGdCQUFnQixDQUFHLGNBQXNCLEVBQUUscUJBQTZCLENBQUM7UUFFakYsTUFBTSxjQUFjLEdBQUcsQ0FBRSxJQUFJLElBQUksRUFBRSxDQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEQsSUFBSyxrQkFBa0IsSUFBSSxDQUFFLGtCQUFrQixHQUFHLENBQUMsQ0FBRSxFQUNyRDtZQUNDLElBQUssY0FBYyxHQUFHLHVCQUF1QixHQUFHLGtCQUFrQjtnQkFDakUsT0FBTztTQUNSO1FBRUQsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFDbEUsdUJBQXVCLEdBQUcsY0FBYyxDQUFDO0lBQzFD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