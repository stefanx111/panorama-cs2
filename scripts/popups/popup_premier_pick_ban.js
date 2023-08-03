"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../util_gamemodeflags.ts" />
/// <reference path="../common/formattext.ts" />
/// <reference path="../common/sessionutil.ts" />
/// <reference path="../common/teamcolor.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../avatar.ts" />_m_elPickBanPanel
var PremierPickBan;
(function (PremierPickBan) {
    let bStartTimer = false;
    let _m_nPhase = 0;
    //#define TEAM_TERRORIST          2
    //#define TEAM_CT                 3
    const _m_aTeams = ['3', '2'];
    const _m_elPickBanPanel = $.GetContextPanel().FindChildInLayoutFile('id-premier-pick-ban');
    function Init() {
        $.RegisterForUnhandledEvent('PanoramaComponent_PregameDraft_DraftUpdate', OnDraftUpdate);
        // $.RegisterForUnhandledEvent( 'PlayerTeamChanged', _PopulatePlayerList );
        SetDefaultTimerValue();
        Show();
        OnDraftUpdate();
        UpdateActivePhaseTimerAndBar();
        $.Schedule(1, DrawGraphBackground);
        let reflection = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-reflection');
        $.Schedule(1.1, function () { reflection.SetImageFromPanel(_m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-container'), false); });
    }
    PremierPickBan.Init = Init;
    function Show() {
        _m_elPickBanPanel.SetHasClass('show', true);
    }
    function SetDefaultTimerValue() {
        var aChildren = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-container').Children();
        aChildren.forEach(phase => {
            phase.SetDialogVariable('section-time', '');
        });
    }
    function OnDraftUpdate() {
        // if ( !bStartTimer )
        // {
        // 	bStartTimer = true;
        // 	UpdateTimer();
        // }
        var bNewPhase = _m_nPhase !== MatchDraftAPI.GetPregamePhase();
        _m_nPhase = MatchDraftAPI.GetPregamePhase();
        // if ( _m_nPhase > 0 )
        // {
        // 	_m_elPickBanPanel.SetHasClass( 'premier-pickban-phase-' + (_m_nPhase - 1), false );
        // }
        _m_elPickBanPanel.SetHasClass('premier-pickban-phase-' + _m_nPhase, true);
        let btnMapSettings = {
            isTeam: false,
            list: MatchDraftAPI.GetPregameMapIdsList().split(','),
            btnId: 'id-map-vote-btn-'
        };
        UpdateVoteBtns(btnMapSettings);
        let btnSettings = {
            isTeam: true,
            list: _m_aTeams,
            btnId: 'id-team-vote-btn-'
        };
        UpdateVoteBtns(btnSettings);
        UpdateTeamPanelBackground();
        UpdatePhaseProgressBar();
        UpdateTitleText(bNewPhase);
        // $.Msg( 'MatchDraftAPI.GetPregamePhase: ' + MatchDraftAPI.GetPregamePhase() );
        // $.Msg( 'MatchDraftAPI.GetPregameMyTeam: ' + MatchDraftAPI.GetPregameMyTeam() );
        // $.Msg( 'MatchDraftAPI.GetPregameTeamToActNow: ' + MatchDraftAPI.GetPregameTeamToActNow() );
    }
    function UpdatePhaseProgressBar() {
        var aChildren = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-container').Children();
        aChildren.forEach(phase => {
            var nPhaseBarIndex = parseInt(phase.GetAttributeString('data-phase', ''));
            phase.SetDialogVariable('section-label', $.Localize('#matchdraft_phase_' + nPhaseBarIndex));
            phase.SetHasClass('premier-pickban__progress--ban', IsBanPhase() && nPhaseBarIndex === _m_nPhase);
            phase.SetHasClass('premier-pickban__progress--pick', !IsBanPhase() && nPhaseBarIndex === _m_nPhase);
            phase.SetHasClass('premier-pickban__progress--pre', nPhaseBarIndex > _m_nPhase);
            phase.SetHasClass('premier-pickban__progress--post', nPhaseBarIndex < _m_nPhase);
        });
    }
    function IsBanPhase() {
        return _m_nPhase > 1 && _m_nPhase < 5;
        // if we add more conditions we can add them here
        // k_EMapVetoPickPhase_BeginDraftType1 = 0,
        // k_EMapVetoPickPhase_DecideWhoGoesFirst = 1,
        // k_EMapVetoPickPhase_VetoFirstTwoMaps = 2,
        // k_EMapVetoPickPhase_VetoThreeMoreMaps = 3,
        // k_EMapVetoPickPhase_VetoLastMap = 4,
        // k_EMapVetoPickPhase_PickStartingSide = 5,
        // k_EMapVetoPickPhase_EndDraftType1 = 6,
    }
    function UpdateActivePhaseTimerAndBar() {
        $.Schedule(.5, () => {
            let elBarContainer = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-' + _m_nPhase);
            if (elBarContainer) {
                var nTimeRemaining = MatchDraftAPI.GetPregamePhaseSecondsRemaining();
                nTimeRemaining = nTimeRemaining ? nTimeRemaining : 0;
                elBarContainer.SetDialogVariable('section-time', nTimeRemaining.toString());
                let percentComplete = 100 - Math.floor((nTimeRemaining / GetMaxTimeForPhase()) * 100);
                elBarContainer.FindChildInLayoutFile('id-team-phase-bar-inner').style.width = percentComplete + '%';
            }
            UpdateActivePhaseTimerAndBar();
        });
    }
    ;
    function GetMaxTimeForPhase() {
        return _m_nPhase === 6 ? 5 : 10;
    }
    function UpdateTitleText(bNewPhase) {
        let isWaiting = MatchDraftAPI.GetPregameTeamToActNow() !== MatchDraftAPI.GetPregameMyTeam();
        let sTitleText = isWaiting ? ('#matchdraft_phase_action_wait_' + _m_nPhase) :
            ('#matchdraft_phase_action_' + _m_nPhase);
        let elTitle = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-title-phase');
        if (_m_nPhase < 2) {
            elTitle.visible = false;
            return;
        }
        _m_elPickBanPanel.SetHasClass('your-turn', !isWaiting);
        _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-title-spinner').SetHasClass('hide', !isWaiting);
        elTitle.visible = true;
        if (isWaiting) {
            elTitle.text = $.Localize('#matchdraft_phase_action_wait_' + _m_nPhase);
            return;
        }
        if (bNewPhase) {
            elTitle.TriggerClass('premier-pickban__title--change');
        }
        var nPickedMaps = GetCurrentVotes().filter(vote => vote !== -1).length;
        elTitle.SetDialogVariableInt('maps', nPickedMaps);
        elTitle.text = $.Localize('#matchdraft_phase_action_' + _m_nPhase, elTitle);
    }
    function UpdateVoteBtns(btnSettings) {
        let aVoteIds = btnSettings.list;
        let btnId = btnSettings.btnId;
        if (aVoteIds.length > 1) {
            for (var i = 0; i < aVoteIds.length; i++) {
                const elMapBtn = _m_elPickBanPanel.FindChildInLayoutFile(btnId + i).FindChild('id-pickban-btn');
                if (!elMapBtn.Data().voteId) {
                    let imageName = '';
                    let imagePath = '';
                    if (btnSettings.isTeam) // team pick
                     {
                        let team = aVoteIds[i] === '3' ? "ct" : "t";
                        let charId = LoadoutAPI.GetItemID(team, 'customplayer');
                        imageName = InventoryAPI.GetItemInventoryImage(charId);
                        imagePath = 'url("file://{images}' + imageName + '.png")';
                        elMapBtn.SetDialogVariable('map-name', $.Localize('#SFUI_InvUse_Equipped_' + team));
                        elMapBtn.Data().isTeamBtn = true;
                    }
                    else {
                        imageName = DeepStatsAPI.MapIDToString(parseInt(aVoteIds[i]));
                        imagePath = 'url("file://{images}/map_icons/screenshots/360p/' + imageName + '.png")';
                        elMapBtn.SetDialogVariable('map-name', $.Localize('#SFUI_Map_' + imageName));
                        elMapBtn.Data().isTeamBtn = false;
                    }
                    let elBtnMapImage = elMapBtn.FindChildInLayoutFile('id-pickban-map-btn-bg');
                    elBtnMapImage.style.backgroundImage = imagePath;
                    elBtnMapImage.style.backgroundPosition = '50% 50%';
                    elBtnMapImage.style.backgroundSize = 'auto 150%';
                    elMapBtn.Data().voteId = aVoteIds[i];
                    elMapBtn.SetPanelEvent('onactivate', () => onActivateCastVote(elMapBtn));
                }
                let isMyTurn = MatchDraftAPI.GetPregameTeamToActNow() === MatchDraftAPI.GetPregameMyTeam();
                if (btnSettings.isTeam) // team pick
                 {
                    elMapBtn.enabled = isMyTurn;
                    if (_m_nPhase === 6) {
                        elMapBtn.SetHasClass('premier-pickban-pick', parseInt(aVoteIds[i]) === GetStartingTeam());
                    }
                }
                else // map pick
                 {
                    let mapState = MatchDraftAPI.GetPregameMapIdState(parseInt(elMapBtn.Data().voteId));
                    elMapBtn.SetHasClass('premier-pickban-' + mapState, mapState !== '');
                    elMapBtn.enabled = mapState === '' && isMyTurn;
                }
                if (MatchDraftAPI.GetPregameXuidsForVote(parseInt(elMapBtn.Data().voteId))) {
                    let aVoteIds = MatchDraftAPI.GetPregameWinningVotes().split(',');
                    elMapBtn.SetHasClass('map-draft-phase-button--winning-vote', aVoteIds.indexOf(elMapBtn.Data().voteId) !== -1);
                }
                UpdateWinningVote(elMapBtn, aVoteIds[i], isMyTurn);
                UpdateBtnAvatars(elMapBtn.GetParent(), parseInt(aVoteIds[i]), isMyTurn);
            }
        }
    }
    function onActivateCastVote(elMapBtn) {
        let aCurrentVotes = GetCurrentVotes();
        let matchingVoteSlot = aCurrentVotes.indexOf(parseInt(elMapBtn.Data().voteId));
        // You are trying to unselect an already selected btn and you already selected.
        if (matchingVoteSlot !== -1) {
            $.Msg("Vote Remove, Phase: " + _m_nPhase + " slot: " + matchingVoteSlot + "voteid" + 0);
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, matchingVoteSlot, 0);
            // _PlaySoundEffect( 'buymenu_select' );
            return;
        }
        // If you are on phase that only has 2 options. Unselect the selected option and set pressed one. 
        if (elMapBtn.Data().isTeamBtn) // team vote
         {
            for (let i = 0; i < 2; i++) {
                let elBtn = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-btn-' + i).FindChild('id-pickban-btn');
                elBtn.checked = false;
                elBtn.SetHasClass('is-vote-phase', false);
            }
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, 0, parseInt(elMapBtn.Data().voteId));
            $.Msg("Vote Add, Phase: " + _m_nPhase + " slot: 0" + "voteid" + elMapBtn.Data().voteId);
            elMapBtn.checked = true;
            elMapBtn.SetHasClass('is-vote-phase', true);
            //_PlaySoundEffect( 'buymenu_purchase' );
            return;
        }
        // Let you vote if you are allowed.
        let freeSlot = GetFirstFreeVoteSlot(aCurrentVotes);
        if (freeSlot !== null) // all map veto btns
         {
            $.Msg("Vote Add, Phase: " + _m_nPhase + " slot: " + freeSlot + "voteid" + elMapBtn.Data().voteId);
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, freeSlot, parseInt(elMapBtn.Data().voteId));
            elMapBtn.SetHasClass('is-ban-phase', IsBanPhase());
            elMapBtn.SetHasClass('is-vote-phase', !IsBanPhase());
            // _PlaySoundEffect( 'buymenu_purchase' );
        }
        else {
            // Show already selected btns
            elMapBtn.checked = false;
            let aBtns = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-btns-container').Children();
            aBtns.forEach(function (btn) {
                $.Msg("Vote, btn.IsSelected() : " + btn.IsSelected());
                var childBtn = btn.FindChild('id-pickban-btn');
                if (childBtn.IsSelected() && childBtn.enabled) {
                    $.Msg("Vote, PLAYANIM: ");
                    btn.TriggerClass('map-draft-phase-button--pulse');
                }
            });
            // _PlaySoundEffect( 'buymenu_failure' );
        }
    }
    function GetCurrentVotes() {
        var aCurrentVotes = [];
        for (var i = 0; i < GetNumVoteSlots(); i++) {
            let voteId = MatchDraftAPI.GetPregameMyVoteInSlot(i);
            voteId = voteId ? voteId : -1;
            aCurrentVotes.push(voteId);
        }
        return aCurrentVotes;
    }
    function GetFirstFreeVoteSlot(aCurrentVotes) {
        for (var i = 0; i < aCurrentVotes.length; i++) {
            if (aCurrentVotes[i] === -1) {
                return i;
            }
        }
        return null;
    }
    function GetNumVoteSlots() {
        if (_m_nPhase === 2) {
            return 2;
        }
        if (_m_nPhase === 3) {
            return 3;
        }
        if (_m_nPhase === 4) {
            return 1;
        }
        if (_m_nPhase === 5) {
            return 1;
        }
        return 0;
    }
    function UpdateWinningVote(elButton, voteId, isMyTurn) {
        // Is this tile winning the vote.
        if (MatchDraftAPI.GetPregameXuidsForVote(parseInt(voteId)) && isMyTurn) {
            let statusText = elButton.Data().isTeamBtn ? $.Localize('#matchdraft_vote_status_pick') : $.Localize('#matchdraft_vote_status_ban');
            elButton.SetDialogVariable('status', statusText);
            let aVoteIds = MatchDraftAPI.GetPregameWinningVotes().split(',');
            elButton.SetHasClass('premier-pickban__map-btn__show-status', aVoteIds.indexOf(voteId) !== -1);
            elButton.SetHasClass('is-team-pick', elButton.Data().isTeamBtn);
        }
        else {
            elButton.SetHasClass('premier-pickban__map-btn__show-status', false);
        }
    }
    function GetSelectedMap() {
        let aMapIds = MatchDraftAPI.GetPregameMapIdsList().split(',');
        let mapPickId = aMapIds.filter(id => MatchDraftAPI.GetPregameMapIdState(parseInt(id)) === 'pick')[0];
        return DeepStatsAPI.MapIDToString(parseInt(mapPickId));
    }
    function GetStartingTeam() {
        let nYourTeam = MatchDraftAPI.GetPregameMyTeam();
        let nOtherTeam = nYourTeam === 2 ? 3 : 2;
        // If you Banned fist then other team pick the starting side
        // If they picked the same side as you then you will start as the opposite team.
        var nStartingTeam = (MatchDraftAPI.GetPregameTeamWithFirstChoice() === MatchDraftAPI.GetPregameTeamStartingCT())
            ? nOtherTeam : nYourTeam;
        $.Msg("nStartingTeam " + nStartingTeam);
        return nStartingTeam;
    }
    function UpdateBtnAvatars(elBtn, voteId, isMyTurn) {
        // let aVotedXuids = MatchDraftAPI.GetPregameXuidsForVote( voteId ).split( ',' );
        let aVotedXuids = ('148618791998277666,148618791998277666,148618791998277666,148618791998277666,148618791998277666').split(',');
        let elAvatarsContainer = elBtn.FindChildInLayoutFile('id-pickban-btn-avatars');
        elAvatarsContainer.RemoveAndDeleteChildren();
        if (!isMyTurn) {
            return;
        }
        for (var i = 0; i < aVotedXuids.length; i++) {
            // $.Msg( 'Vote POSTaVotedXuids: ' + MatchDraftAPI.GetPregameXuidsForVote( voteId ) );
            // $.Msg( 'Vote SPLITaVotedXuids: ' + MatchDraftAPI.GetPregameXuidsForVote( voteId ).split( ',' ));
            _MakeAvatar(aVotedXuids[i], elAvatarsContainer);
        }
    }
    function _MakeAvatar(xuid, elTeammates, bisTeamLister = false) {
        // $.Msg( 'Vote _MakeAvatar: ' + xuid);
        if (xuid === '0' || !xuid)
            return;
        if (xuid) {
            //var elAvatar = elTeammates.FindChildInLayoutFile( xuid );
            var panelType = bisTeamLister ? 'Button' : 'Panel';
            //if( !elAvatar || elAvatar.BHasClass( 'hidden' ))
            //{
            let elAvatar = $.CreatePanel(panelType, elTeammates, xuid);
            elAvatar.BLoadLayoutSnippet('small-avatar');
            if (bisTeamLister) {
                // _AddOpenPlayerCardAction( elAvatar, xuid );
            }
            //}
            let avatarImage = elAvatar.FindChildTraverse('JsAvatarImage');
            avatarImage.PopulateFromSteamID(xuid);
            var teamColor = GameStateAPI.GetPlayerColor(xuid);
            // var elTeamColor = elAvatar.FindChildInLayoutFile( 'JsAvatarTeamColor' );
            // $.Msg( 'teamColor: ' + teamColor );
            if (!teamColor) {
                avatarImage.style.border = '1px solid white';
            }
            else {
                avatarImage.style.border = '1px solid ' + teamColor;
            }
            elAvatar.SetDialogVariable('teammate_name', FriendsListAPI.GetFriendName(xuid));
        }
    }
    function UpdateTeamPanelBackground() {
        if (_m_nPhase >= 5) {
            let selectedMapName = GetSelectedMap();
            let imagePath = 'url("file://{images}/map_icons/screenshots/360p/' + selectedMapName + '.png")';
            let elMapImage = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-map-image');
            elMapImage.style.backgroundImage = imagePath;
            elMapImage.style.backgroundPosition = '50% 50%';
            elMapImage.style.backgroundSize = 'cover';
            let elMapIcon = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-map-icon');
            elMapIcon.SetImage('file://{images}/map_icons/map_icon_' + selectedMapName + '.svg');
            UpdateCharacterModels('ct');
            UpdateCharacterModels('t');
        }
    }
    function UpdateCharacterModels(team) {
        let elCharPanel = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-agent-' + team);
        let charId = LoadoutAPI.GetItemID(team, 'customplayer');
        let glovesId = LoadoutAPI.GetItemID(team, 'clothing_hands');
        let weaponId = LoadoutAPI.GetItemID(team, 'melee');
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(charId);
        settings.panel = elCharPanel;
        settings.weaponItemId = weaponId;
        CharacterAnims.PlayAnimsOnPanel(settings);
    }
    function DrawGraphBackground() {
        return;
        const elParent = _m_elPickBanPanel.FindChildInLayoutFile('id-pick-vote-maps');
        const spiderGraph = $.CreatePanel('SpiderGraph', elParent, 'id-team-vote-spider-graph', {
            'class': 'premier-pickban__spider-bg'
        });
        const numMaps = 7;
        // const spiderGraph = _m_elPickBanPanel.FindChildInLayoutFile( 'id-team-vote-spider-graph' ) as SpiderGraph_t;
        // spiderGraph.ClearJS( 'rgba(0,0,0,0)' );
        const options = {
            bkg_color: "#00000080",
            spokes_color: '#ffffff10',
            spoke_thickness: 2,
            spoke_softness: 100,
            spoke_length_scale: 1.2,
            guideline_color: '#ffffff10',
            guideline_thickness: 2,
            guideline_softness: 100,
            guideline_count: 11,
            deadzone_percent: 0.1,
            scale: 0.70
        };
        spiderGraph.SetGraphOptions(options);
        spiderGraph.DrawGraphBackground(numMaps);
    }
})(PremierPickBan || (PremierPickBan = {}));
// 3 == ct
// MatchDraftAPI
// k_EMapVetoPickPhase_BeginDraftType1 = 0,
// k_EMapVetoPickPhase_DecideWhoGoesFirst = 1,
// k_EMapVetoPickPhase_VetoFirstTwoMaps = 2,
// k_EMapVetoPickPhase_VetoThreeMoreMaps = 3,
// k_EMapVetoPickPhase_VetoLastMap = 4,
// k_EMapVetoPickPhase_PickStartingSide = 5,
// k_EMapVetoPickPhase_EndDraftType1 = 6,
// GetPregamePlayerCount (): number;
// GetPregameMyTeam()
// GetPregamePlayerXuid ( idx: number ): string;
// GetPregamePlayerParty ( idx: number ): number;
// GetPregamePhase(): number;
// GetPregamePhaseSecondsRemaining(): number;
// GetPregameTeamWinningCoinToss(): number;
// GetPregameTeamWithFirstChoice(): number;
// GetPregameTeamToActNow(): number;
// GetPregameMapIdsList(): string;
// GetPregameMapIdState(nMapID: number): "pick" | "veto" | "";
// GetPregameTeamStartingCT(): number;
// GetPregameXuidsForVote(nMapID: number): string;
// GetPregameWinningVotes(): string;
// GetPregameMyVoteInSlot(nSlot: number): number;
// ActionPregameCastMyVote(phase: number, slot: number, vote: number): void;
// New events --
// this event means that we are heading into POST-ACCEPT pre-match UI (but we don't yet have all the match data, about who is participating and stuff, but it basically tells the ACCEPT UI that everybody accepted, but we will not be loading the map just yet) --
// $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ShowPreMatchInterface', PopupAcceptMatch.ShowPreMatchInterface);
// this event fires every time something about the draft state changes (somebody voted on something, or stage auto-advanced or whatever) --
// $.RegisterForUnhandledEvent('PanoramaComponent_PregameDraft_DraftUpdate', PopupAcceptMatch.PregameDraftUpdate);
// I shortened all the timers a bunch, probably can shorten some more. There's current a problem with the hosting map where the entity I need doesn't spawn, but once it's resolved all the flow should be fully functional and then it will be just about adding more data that we need exposed to the component methods (e.g. spidergraph points). 
// This is a reference shelf for hooking up the events:
// https://swarm.valve.org/changes/7933647
