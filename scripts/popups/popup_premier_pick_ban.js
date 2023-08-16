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
    let _m_pickedMapReveal = false;
    const TEAM_SPECTATOR = 1;
    const TEAM_TERRORIST = 2;
    const TEAM_CT = 3;
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
        let aChildren = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-container').Children();
        aChildren.forEach(phase => {
            phase.SetDialogVariable('section-time', '');
        });
    }
    function OnDraftUpdate() {
        let bNewPhase = _m_nPhase !== MatchDraftAPI.GetPregamePhase();
        _m_nPhase = MatchDraftAPI.GetPregamePhase();
        let mapIds = MatchDraftAPI.GetPregameMapIdsList().split(',');
        _m_elPickBanPanel.SetHasClass('premier-pickban-phase-' + _m_nPhase, true);
        let btnMapSettings = {
            isTeam: false,
            list: mapIds,
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
        PlayerTeam();
        // $.Msg( 'MatchDraftAPI.GetPregamePhase: ' + MatchDraftAPI.GetPregamePhase() );
        // $.Msg( 'MatchDraftAPI.GetPregameMyTeam: ' + MatchDraftAPI.GetPregameMyTeam() );
        // $.Msg( 'MatchDraftAPI.GetPregameTeamToActNow: ' + MatchDraftAPI.GetPregameTeamToActNow() );
    }
    function UpdatePhaseProgressBar() {
        let aChildren = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-container').Children();
        aChildren.forEach(phase => {
            let nPhaseBarIndex = parseInt(phase.GetAttributeString('data-phase', ''));
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
                let nTimeRemaining = MatchDraftAPI.GetPregamePhaseSecondsRemaining();
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
        let timeMax = 0;
        switch (_m_nPhase) {
            case 0:
                timeMax = 0;
                break;
            case 1:
                timeMax = 0;
                break;
            case 2:
                timeMax = 15;
                break;
            case 3:
                timeMax = 20;
                break;
            case 4:
                timeMax = 10;
                break;
            case 5:
                timeMax = 10;
                break;
            case 6:
                timeMax = 5;
                break;
            default:
                timeMax = 0;
                break;
        }
        return timeMax;
    }
    function UpdateTitleText(bNewPhase) {
        let isWaiting = MatchDraftAPI.GetPregameTeamToActNow() !== MatchDraftAPI.GetPregameMyTeam() || _m_nPhase < 2;
        let sTitleText = isWaiting ? ('#matchdraft_phase_action_wait_' + _m_nPhase) :
            ('#matchdraft_phase_action_' + _m_nPhase);
        let elTitle = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-title-phase');
        // if ( _m_nPhase < 2 )
        // {
        // 	elTitle.visible = false;
        // 	return;
        // }
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
        let nPickedMaps = GetCurrentVotes().filter(vote => vote !== -1).length;
        elTitle.SetDialogVariableInt('maps', nPickedMaps);
        elTitle.text = $.Localize('#matchdraft_phase_action_' + _m_nPhase, elTitle);
    }
    function UpdateVoteBtns(btnSettings) {
        let aVoteIds = btnSettings.list;
        let btnId = btnSettings.btnId;
        if (aVoteIds.length > 1) {
            for (let i = 0; i < aVoteIds.length; i++) {
                const elMapBtnParent = _m_elPickBanPanel.FindChildInLayoutFile(btnId + i);
                const elMapBtn = elMapBtnParent.FindChild('id-pickban-btn');
                if (!elMapBtn.Data().voteId) {
                    let imageName = '';
                    let imagePath = '';
                    let backgroundColor = 'none;';
                    if (btnSettings.isTeam) // team pick
                     {
                        let team = aVoteIds[i] === '3' ? "ct" : "t";
                        let charId = LoadoutAPI.GetItemID(team, 'customplayer');
                        imageName = InventoryAPI.GetItemInventoryImage(charId);
                        imagePath = 'url("file://{images}' + imageName + '.png")';
                        elMapBtn.SetDialogVariable('map-name', $.Localize('#SFUI_InvUse_Equipped_' + team));
                        elMapBtn.Data().isTeamBtn = true;
                        let elReflection = _m_elPickBanPanel.FindChildInLayoutFile(btnId + 'ref-' + i);
                        elReflection.SetImageFromPanel(elMapBtnParent, false);
                        backgroundColor = team === 'ct' ? 'rgb(150, 200, 250);' : '#eabe54;';
                    }
                    else {
                        imageName = DeepStatsAPI.MapIDToString(parseInt(aVoteIds[i]));
                        imagePath = 'url("file://{images}/map_icons/screenshots/360p/' + imageName + '.png")';
                        elMapBtn.SetDialogVariable('map-name', $.Localize('#SFUI_Map_' + imageName));
                        elMapBtn.Data().isTeamBtn = false;
                        let elReflection = _m_elPickBanPanel.FindChildInLayoutFile(btnId + 'ref-' + i);
                        elReflection.SetImageFromPanel(elMapBtnParent, false);
                    }
                    let elBtnMapImage = elMapBtn.FindChildInLayoutFile('id-pickban-map-btn-bg');
                    elBtnMapImage.style.backgroundImage = imagePath;
                    elBtnMapImage.style.backgroundPosition = '50% 50%';
                    elBtnMapImage.style.backgroundSize = 'cover';
                    elBtnMapImage.style.backgroundColor = backgroundColor;
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
                    if (_m_nPhase >= 5 && !_m_pickedMapReveal) {
                        elMapBtnParent.SetHasClass("premier-pickban__map-btn--picked", mapState === "pick");
                        elMapBtnParent.SetHasClass("not-picked", mapState !== "pick");
                        let elReflection = _m_elPickBanPanel.FindChildInLayoutFile(btnId + 'ref-' + i);
                        elReflection.visible = false;
                    }
                }
                if (MatchDraftAPI.GetPregameXuidsForVote(parseInt(elMapBtn.Data().voteId))) {
                    let aVoteIds = MatchDraftAPI.GetPregameWinningVotes().split(',');
                    elMapBtn.SetHasClass('map-draft-phase-button--winning-vote', aVoteIds.indexOf(elMapBtn.Data().voteId) !== -1);
                }
                UpdateWinningVote(elMapBtn, aVoteIds[i], isMyTurn);
                UpdateBtnAvatars(elMapBtnParent, parseInt(aVoteIds[i]), isMyTurn);
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
                if (btn.id.indexOf('ref') === -1) {
                    $.Msg("Vote, btn.IsSelected() : " + btn.IsSelected());
                    let childBtn = btn.FindChild('id-pickban-btn');
                    if (childBtn.IsSelected() && childBtn.enabled) {
                        $.Msg("Vote, PLAYANIM: ");
                        btn.TriggerClass('map-draft-phase-button--pulse');
                    }
                }
            });
            // _PlaySoundEffect( 'buymenu_failure' );
        }
    }
    function GetCurrentVotes() {
        let aCurrentVotes = [];
        for (let i = 0; i < GetNumVoteSlots(); i++) {
            let voteId = MatchDraftAPI.GetPregameMyVoteInSlot(i);
            voteId = voteId ? voteId : -1;
            aCurrentVotes.push(voteId);
        }
        return aCurrentVotes;
    }
    function GetFirstFreeVoteSlot(aCurrentVotes) {
        for (let i = 0; i < aCurrentVotes.length; i++) {
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
        let nStartingTeam = (MatchDraftAPI.GetPregameTeamWithFirstChoice() === MatchDraftAPI.GetPregameTeamStartingCT())
            ? nOtherTeam : nYourTeam;
        $.Msg("nStartingTeam " + nStartingTeam);
        return nStartingTeam;
    }
    function UpdateBtnAvatars(elBtn, voteId, isMyTurn) {
        let aVotedXuids = MatchDraftAPI.GetPregameXuidsForVote(voteId).split(',');
        // let aVotedXuids = ( '148618791998277666,148618791998277666,148618791998277666,148618791998277666,148618791998277666' ).split( ',' );
        let elAvatarsContainer = elBtn.FindChildInLayoutFile('id-pickban-btn-avatars');
        elAvatarsContainer.RemoveAndDeleteChildren();
        if (!isMyTurn) {
            return;
        }
        for (let i = 0; i < aVotedXuids.length; i++) {
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
            //let elAvatar = elTeammates.FindChildInLayoutFile( xuid );
            let panelType = bisTeamLister ? 'Button' : 'Panel';
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
            const teamColorIdx = PartyListAPI.GetPartyMemberSetting(xuid, 'game/teamcolor');
            const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
            avatarImage.style.border = '2px solid rgb(' + teamColorRgb + ')';
            elAvatar.SetDialogVariable('teammate_name', FriendsListAPI.GetFriendName(xuid));
            return elAvatar;
        }
    }
    function UpdateTeamPanelBackground() {
        if (_m_nPhase >= 5) {
            let selectedMapName = GetSelectedMap();
            let imagePath = 'url("file://{images}/map_icons/screenshots/360p/' + selectedMapName + '.png")';
            UpdateCharacterModels('ct', 'rifle0');
            UpdateCharacterModels('t', 'smg0');
            $.Schedule(1, () => {
                let elMapIcon = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-map-icon');
                elMapIcon.SetImage('file://{images}/map_icons/map_icon_' + selectedMapName + '.svg');
                elMapIcon.AddClass('show');
                let elMapImage = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-map-image');
                elMapImage.style.backgroundImage = imagePath;
                elMapImage.style.backgroundPosition = '50% 50%';
                elMapImage.style.backgroundSize = 'cover';
                elMapImage.style.brightness = '.1;';
                elMapImage.style.backgroundImgOpacity = '1';
                _m_elPickBanPanel.FindChildInLayoutFile('id-pick-vote-team').AddClass('show');
                // let elReflection = _m_elPickBanPanel.FindChildInLayoutFile( 'id-team-vote-team-reflection' ) as Image_t;
                // elReflection.SetImageFromPanel( _m_elPickBanPanel.FindChildInLayoutFile( 'id-pick-vote-team' ), false );
            });
            if (_m_nPhase === 6) {
                for (let i = 0; i < _m_aTeams.length; i++) {
                    if (parseInt(_m_aTeams[i]) === GetStartingTeam()) {
                        let team = _m_aTeams[i] === '3' ? 'ct' : 't';
                        let elCharPanel = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-agent-' + team);
                        elCharPanel.SetHasClass('premier-pickban__map-btn--picked', true);
                    }
                }
            }
        }
    }
    function UpdateCharacterModels(team, slot) {
        let elCharPanel = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-agent-' + team);
        let charId = LoadoutAPI.GetItemID(team, 'customplayer');
        let glovesId = LoadoutAPI.GetItemID(team, 'clothing_hands');
        let weaponId = LoadoutAPI.GetItemID(team, slot);
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(charId);
        settings.panel = elCharPanel;
        settings.weaponItemId = weaponId;
        CharacterAnims.PlayAnimsOnPanel(settings);
    }
    function ComputeAverageWindowStatsForTeam(teamID) {
        let averageWindowStats = {};
        let nCount = 0.0;
        let averageWindowStatsByTeam = [];
        for (let i = 0; i < MatchDraftAPI.GetPregamePlayerCount(); i++) {
            let playerWindowStats = MatchDraftAPI.GetPregamePlayerWindowStatsObject(i);
            let thisTeamID = MatchDraftAPI.GetPregamePlayerTeam(i);
            if (thisTeamID != teamID)
                continue;
            nCount++;
            for (let mapName in Object.keys(playerWindowStats)) {
                let myWinCount = Number(Math.floor(playerWindowStats[mapName] || 0));
                let teamWinCount = Number(Math.floor(averageWindowStats[mapName] || 0));
                averageWindowStats[mapName] = myWinCount + teamWinCount;
            }
        }
        for (let mapName in Object.keys(averageWindowStats)) {
            averageWindowStats[mapName] = averageWindowStats[mapName] / Math.max(1.0, nCount);
        }
        return averageWindowStats;
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
        const polyOptions = {
            line_color: '#ffffffff',
            line_thickness: 3,
            line_softness: 10,
            fill_color_inner: '#ffffff10',
            fill_color_outer: '#ffffff10',
        };
        let rankWindowStats_T = ComputeAverageWindowStatsForTeam(TEAM_TERRORIST);
        let rankWindowShape_T = Object.keys(rankWindowStats_T).map((mapName) => { return Number(rankWindowStats_T[mapName] | 0); });
        spiderGraph.DrawGraphPoly(rankWindowShape_T, polyOptions);
        let rankWindowStats_CT = ComputeAverageWindowStatsForTeam(TEAM_CT);
        let rankWindowShape_CT = Object.keys(rankWindowStats_T).map((mapName) => { return Number(rankWindowStats_CT[mapName] | 0); });
        spiderGraph.DrawGraphPoly(rankWindowShape_CT, polyOptions);
    }
    function PlayerTeam() {
        let aTestids = [
            '148618791998209668',
            '148618791998261669',
            '148618791998203739',
            '148618792083695883',
            '148618791998365706',
            '',
            '148618791998345670',
            '148618792154451370',
            '',
            '148618792083696093'
        ];
        let aTestGroups = [
            2,
            2,
            3,
            3,
            3,
            8,
            8,
            8,
            8,
            1
        ];
        let clientXuid = MyPersonaAPI.GetXuid();
        let aPlayers = [];
        let nCount = MatchDraftAPI.GetPregamePlayerCount();
        $.Msg('MatchDraftAPI.GetPregamePlayerCount(): ' + nCount);
        for (let i = 0; i < nCount; i++) {
            // if ( aTestGroups[ i ] >= 0 )
            if (MatchDraftAPI.GetPregamePlayerParty(i) >= 0) {
                // Debug Settings //
                // let player: Player_t = {
                // 	xuid: aTestids[ i ],
                // 	nParty: aTestGroups[ i ], 
                // 	idx: i,
                // 	isClient: aTestids[ i ] === clientXuid ? true : false
                // };
                // $.Msg( 'MatchDraftAPI.GetPregamePlayerXuid(): ' + aTestids[ i ]);
                // $.Msg( 'MatchDraftAPI.GetPregamePlayerParty(): ' + aTestGroups[ i ]);
                // Debug Settings //
                let player = {
                    xuid: MatchDraftAPI.GetPregamePlayerXuid(i),
                    nParty: MatchDraftAPI.GetPregamePlayerParty(i),
                    idx: i,
                    isClient: MatchDraftAPI.GetPregamePlayerXuid(i) === clientXuid ? true : false
                };
                aPlayers.push(player);
            }
        }
        if (aPlayers.length < 1) {
            return;
        }
        let indexClient = aPlayers.findIndex(object => { return object.isClient === true; });
        $.Msg('MatchDraftAPI.indexClient: ' + indexClient);
        for (let i = 0; i < aPlayers.length; i++) {
            AddPlayerToGroup(aPlayers[i], indexClient);
        }
        AddPartyBoundryLines(_m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-teammates'));
        AddPartyBoundryLines(_m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-opponent'));
    }
    function AddPlayerToGroup(player, indexClient) {
        $.Msg('MatchDraftAPI.player.idx: ' + player.idx + ', player.xuid: ' + player.xuid);
        let elParent = (indexClient < 5 && player.idx < 5) || (indexClient >= 5 && player.idx >= 5) ?
            _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-teammates') :
            _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-opponent');
        let elContainer = elParent.FindChildInLayoutFile('id-player-party-container-' + player.nParty);
        if (!elContainer) {
            elContainer = $.CreatePanel('Panel', elParent, 'id-player-party-container-' + player.nParty, { class: 'premier-pickban__teammates-party' });
        }
        let elTeammate = elParent.FindChildInLayoutFile(player.xuid);
        if (!elTeammate) {
            _MakeAvatar(player.xuid, elContainer, true);
        }
    }
    function AddPartyBoundryLines(elParent) {
        elParent.Children().forEach(party => {
            let aPartyMembers = party.Children();
            if (aPartyMembers.length > 1) {
                aPartyMembers.forEach((element, index) => {
                    if (index === 0) {
                        element.FindChild('id-avatar-party-line')?.AddClass('premier-pickban__map-avatars__party-line-top');
                    }
                    else if (index === aPartyMembers.length - 1) {
                        element.FindChild('id-avatar-party-line')?.AddClass('premier-pickban__map-avatars__party-line-bottom');
                    }
                    else {
                        element.FindChild('id-avatar-party-line')?.AddClass('premier-pickban__map-avatars__party-line-middle');
                    }
                });
            }
            else if (aPartyMembers.length === 1) {
                aPartyMembers[0].FindChild('id-avatar-party-line')?.AddClass('premier-pickban__map-avatars__party-line-empty');
            }
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfcHJlbWllcl9waWNrX2Jhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX3ByZW1pZXJfcGlja19iYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyxpREFBaUQ7QUFDakQsZ0RBQWdEO0FBQ2hELGlEQUFpRDtBQUNqRCwrQ0FBK0M7QUFDL0MsOENBQThDO0FBQzlDLHNEQUFzRDtBQUV0RCxJQUFVLGNBQWMsQ0FreEJ2QjtBQWx4QkQsV0FBVSxjQUFjO0lBRXZCLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztJQUN4QixJQUFJLFNBQVMsR0FBVyxDQUFDLENBQUM7SUFDMUIsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFFL0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQztJQUN6QixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFFbEIsbUNBQW1DO0lBQ25DLG1DQUFtQztJQUNuQyxNQUFNLFNBQVMsR0FBRyxDQUFFLEdBQUcsRUFBRSxHQUFHLENBQUUsQ0FBQztJQUMvQixNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO0lBUTdGLFNBQWdCLElBQUk7UUFFbkIsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDRDQUE0QyxFQUFFLGFBQWEsQ0FBRSxDQUFDO1FBQzNGLDJFQUEyRTtRQUUzRSxvQkFBb0IsRUFBRSxDQUFDO1FBQ3ZCLElBQUksRUFBRSxDQUFDO1FBQ1AsYUFBYSxFQUFFLENBQUM7UUFDaEIsNEJBQTRCLEVBQUUsQ0FBQztRQUUvQixDQUFDLENBQUMsUUFBUSxDQUFFLENBQUMsRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1FBRXJDLElBQUksVUFBVSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHlCQUF5QixDQUFhLENBQUM7UUFFakcsQ0FBQyxD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