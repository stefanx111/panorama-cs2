"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../util_gamemodeflags.ts" />
/// <reference path="../common/formattext.ts" />
/// <reference path="../common/sessionutil.ts" />
/// <reference path="../common/teamcolor.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../rating_emblem.ts" />
/// <reference path="../avatar.ts" />_m_elPickBanPanel
var PremierPickBan;
(function (PremierPickBan) {
    let bStartTimer = false;
    let _m_nPhase = 0;
    let _m_pickedMapReveal = false;
    const TEAM_SPECTATOR = 1;
    const TEAM_TERRORIST = 2;
    const TEAM_CT = 3;
    const _m_aTeams = ['3', '2'];
    const _m_elPickBanPanel = $.GetContextPanel().FindChildInLayoutFile('id-premier-pick-ban');
    function Init() {
        $.RegisterForUnhandledEvent('PanoramaComponent_PregameDraft_DraftUpdate', OnDraftUpdate);
        SetDefaultTimerValue();
        Show();
        OnDraftUpdate();
        UpdateActivePhaseTimerAndBar();
        const spiderGraph = _m_elPickBanPanel.FindChildInLayoutFile("id-team-vote-spider-graph");
        if (spiderGraph.BCanvasReady()) {
            DrawSpiderGraph();
        }
        else {
            $.RegisterEventHandler("CanvasReady", spiderGraph, DrawSpiderGraph);
        }
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
        PlayNewPhaseSound(bNewPhase);
        _m_nPhase = MatchDraftAPI.GetPregamePhase();
        let mapIds = MatchDraftAPI.GetPregameMapIdsList().split(',');
        _m_elPickBanPanel.SwitchClass('pick-ban-phase', 'premier-pickban-phase-' + _m_nPhase);
        let btnMapSettings = {
            isTeam: false,
            list: mapIds,
            btnId: 'id-map-vote-btn-'
        };
        UpdateVoteBtns(btnMapSettings, bNewPhase);
        let btnSettings = {
            isTeam: true,
            list: _m_aTeams,
            btnId: 'id-team-vote-btn-'
        };
        UpdateVoteBtns(btnSettings, bNewPhase);
        UpdateTeamPanelBackground();
        UpdatePhaseProgressBar();
        UpdateTitleText(bNewPhase);
        SetBackgroundColor();
        PlayerTeam();
    }
    function SetBackgroundColor() {
        let elPanel = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-middle');
        if (_m_nPhase < 2) {
            elPanel.SwitchClass('bg-fade', 'premier-pickban__middle--neutral');
            return;
        }
        if (MatchDraftAPI.GetPregameTeamToActNow() === MatchDraftAPI.GetPregameMyTeam()) {
            elPanel.SwitchClass('bg-fade', 'premier-pickban__middle--light');
        }
        else {
            elPanel.SwitchClass('bg-fade', 'premier-pickban__middle--dark');
        }
    }
    function PlayNewPhaseSound(bNewPhase) {
        if (bNewPhase && _m_nPhase > 0 && _m_nPhase <= 4) {
            $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'UI.Premier.MapsLocked', 'MOUSE', 1.0);
        }
        else if (bNewPhase && _m_nPhase > 4) {
            $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'UI.Premier.SubmenuTransition', 'MOUSE', 1.0);
        }
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
    }
    function UpdateActivePhaseTimerAndBar() {
        let nPlaySound = 0;
        $.Schedule(.5, () => {
            let elBarContainer = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-phasebar-' + _m_nPhase);
            if (elBarContainer) {
                let nTimeRemaining = MatchDraftAPI.GetPregamePhaseSecondsRemaining();
                nTimeRemaining = nTimeRemaining ? nTimeRemaining : 0;
                elBarContainer.SetDialogVariable('section-time', nTimeRemaining.toString());
                let percentComplete = 100 - Math.floor((nTimeRemaining / GetMaxTimeForPhase()) * 100);
                elBarContainer.FindChildInLayoutFile('id-team-phase-bar-inner').style.width = percentComplete + '%';
                if (nTimeRemaining < 5 && nPlaySound === 0) {
                    $.DispatchEvent('CSGOPlaySoundEffectMuteBypass', 'UI.Premier.CounterTimer', 'MOUSE', 1.0);
                    nPlaySound++;
                }
                else
                    (nPlaySound > 0);
                {
                    nPlaySound = 0;
                }
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
        _m_elPickBanPanel.SetHasClass('your-turn', !isWaiting);
        _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-title-spinner').SetHasClass('hide', !isWaiting);
        elTitle.visible = true;
        if (bNewPhase) {
            _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-title').TriggerClass('premier-pickban__title--change');
        }
        if (isWaiting) {
            elTitle.text = $.Localize('#matchdraft_phase_action_wait_' + _m_nPhase);
            return;
        }
        let nPickedMaps = GetCurrentVotes().filter(vote => vote !== -1).length;
        elTitle.SetDialogVariableInt('maps', nPickedMaps);
        elTitle.text = $.Localize('#matchdraft_phase_action_' + _m_nPhase, elTitle);
    }
    function UpdateVoteBtns(btnSettings, bNewPhase) {
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
                    if (btnSettings.isTeam) {
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
                if (bNewPhase) {
                    elMapBtn.SetHasClass('is-ban-phase', false);
                    elMapBtn.SetHasClass('is-vote-phase', false);
                }
                let isMyTurn = MatchDraftAPI.GetPregameTeamToActNow() === MatchDraftAPI.GetPregameMyTeam();
                if (btnSettings.isTeam) {
                    elMapBtn.enabled = isMyTurn;
                    if (_m_nPhase === 6) {
                        elMapBtn.SetHasClass('premier-pickban-pick', parseInt(aVoteIds[i]) === GetStartingTeam());
                    }
                }
                else {
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
                let sXuids = MatchDraftAPI.GetPregameXuidsForVote(parseInt(elMapBtn.Data().voteId));
                if (sXuids) {
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
        if (matchingVoteSlot !== -1) {
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, matchingVoteSlot, 0);
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.MapDeselect', 'MOUSE');
            return;
        }
        if (elMapBtn.Data().isTeamBtn) {
            for (let i = 0; i < 2; i++) {
                let elBtn = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-btn-' + i).FindChild('id-pickban-btn');
                elBtn.checked = false;
                elBtn.SetHasClass('is-vote-phase', false);
            }
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, 0, parseInt(elMapBtn.Data().voteId));
            elMapBtn.checked = true;
            elMapBtn.SetHasClass('is-vote-phase', true);
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.TeamSelect', 'MOUSE');
            return;
        }
        let freeSlot = GetFirstFreeVoteSlot(aCurrentVotes);
        if (freeSlot !== null) {
            MatchDraftAPI.ActionPregameCastMyVote(_m_nPhase, freeSlot, parseInt(elMapBtn.Data().voteId));
            elMapBtn.SetHasClass('is-ban-phase', IsBanPhase());
            elMapBtn.SetHasClass('is-vote-phase', !IsBanPhase());
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.MapSelect', 'MOUSE');
        }
        else {
            elMapBtn.checked = false;
            let aBtns = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-btns-container').Children();
            aBtns.forEach(function (btn) {
                if (btn.id.indexOf('ref') === -1) {
                    let childBtn = btn.FindChild('id-pickban-btn');
                    if (childBtn.IsSelected() && childBtn.enabled) {
                        btn.TriggerClass('map-draft-phase-button--pulse');
                    }
                }
            });
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.buymenu_failure', 'MOUSE');
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
        let nStartingTeam = (MatchDraftAPI.GetPregameTeamWithFirstChoice() === MatchDraftAPI.GetPregameTeamStartingCT())
            ? nOtherTeam : nYourTeam;
        return nStartingTeam;
    }
    function UpdateBtnAvatars(elBtn, voteId, isMyTurn) {
        let aVotedXuids = MatchDraftAPI.GetPregameXuidsForVote(voteId).split(',');
        let elAvatarsContainer = elBtn.FindChildInLayoutFile('id-pickban-btn-avatars');
        elAvatarsContainer.RemoveAndDeleteChildren();
        if (!isMyTurn) {
            return;
        }
        for (let i = 0; i < aVotedXuids.length; i++) {
            MakeAvatar(aVotedXuids[i], elAvatarsContainer);
        }
    }
    function MakeAvatar(xuid, elTeammates) {
        if (xuid === '0' || !xuid)
            return;
        if (xuid) {
            let elAvatar = $.CreatePanel('Panel', elTeammates, xuid);
            elAvatar.BLoadLayoutSnippet('small-avatar');
            let avatarImage = elAvatar.FindChildTraverse('JsAvatarImage');
            avatarImage.PopulateFromSteamID(xuid);
            const teamColorIdx = PartyListAPI.GetPartyMemberSetting(xuid, 'game/teamcolor');
            const teamColorRgb = TeamColor.GetTeamColor(Number(teamColorIdx));
            avatarImage.style.border = '2px solid rgb(' + teamColorRgb + ')';
            elAvatar.SetDialogVariable('teammate_name', FriendsListAPI.GetFriendName(xuid));
            return elAvatar;
        }
    }
    function SetPlayerRank(playerIdx, elAvatar) {
        let playerWindowStats = MatchDraftAPI.GetPregamePlayerWindowStatsObject(playerIdx);
        if (!elAvatar)
            return;
        let options = {
            root_panel: elAvatar,
            rating_type: 'Premier',
            do_fx: true,
            full_details: false,
            leaderboard_details: { score: playerWindowStats.rank_id }
        };
        RatingEmblem.SetXuid(options);
    }
    function MakeOpponentAvatar(elTeammates, indexOpponent) {
        let imgIndex = indexOpponent === 0 ? 1 : indexOpponent;
        let elAvatar = $.CreatePanel('Panel', elTeammates, indexOpponent.toString());
        elAvatar.BLoadLayoutSnippet('small-avatar-opponent');
        let elImage = elAvatar.FindChildInLayoutFile('id-avatar-opponent-avatar');
        elImage.SetImage('file://{images}/avatars/avatar_sub_0' + imgIndex.toString() + '.psd');
        return elAvatar;
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
    function _GetMapsList() {
        return Object.keys(FriendsListAPI.GetFriendCompetitivePremierWindowStatsObject("0"));
    }
    function ComputeAverageWindowStatsForTeam(teamID) {
        let averageWindowStats = {};
        let nCount = 0.0;
        let mapList = _GetMapsList();
        for (let i = 0; i < MatchDraftAPI.GetPregamePlayerCount(); i++) {
            let playerWindowStats = MatchDraftAPI.GetPregamePlayerWindowStatsObject(i);
            let thisTeamID = MatchDraftAPI.GetPregamePlayerTeam(i);
            if (thisTeamID != teamID)
                continue;
            nCount++;
            mapList.forEach(mapName => {
                let myWinCount = Number(Math.floor(playerWindowStats[mapName] || 0));
                let teamWinCount = Number(Math.floor(averageWindowStats[mapName] || 0));
                averageWindowStats[mapName] = myWinCount + teamWinCount;
            });
        }
        return averageWindowStats;
    }
    function DrawSpiderGraph() {
        let rankWindowStats_T = ComputeAverageWindowStatsForTeam(TEAM_TERRORIST);
        let rankWindowShape_T = Object.keys(rankWindowStats_T).map((mapName) => { return Number(rankWindowStats_T[mapName] | 0); });
        let rankWindowStats_CT = ComputeAverageWindowStatsForTeam(TEAM_CT);
        let rankWindowShape_CT = Object.keys(rankWindowStats_T).map((mapName) => { return Number(rankWindowStats_CT[mapName] | 0); });
        let maxWinsInASingleMap = (Math.max(...rankWindowShape_T, ...rankWindowShape_CT, 3));
        const spiderGraph = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-spider-graph');
        DrawBackground(spiderGraph, maxWinsInASingleMap);
        if (MatchDraftAPI.GetPregameMyTeam() === TEAM_CT) {
            DrawTeamPlot(spiderGraph, rankWindowShape_CT, true, maxWinsInASingleMap);
            DrawTeamPlot(spiderGraph, rankWindowShape_T, false, maxWinsInASingleMap);
        }
        else {
            DrawTeamPlot(spiderGraph, rankWindowShape_T, true, maxWinsInASingleMap);
            DrawTeamPlot(spiderGraph, rankWindowShape_CT, false, maxWinsInASingleMap);
        }
    }
    function DrawBackground(spiderGraph, maxWinsInASingleMap) {
        const numMaps = 7;
        spiderGraph.ClearJS('rgba(0,0,0,0)');
        const options = {
            bkg_color: "#00000080",
            spokes_color: '#ffffff10',
            spoke_thickness: 2,
            spoke_softness: 100,
            spoke_length_scale: 1.2,
            guideline_color: '#ffffff10',
            guideline_thickness: 2,
            guideline_softness: 100,
            guideline_count: maxWinsInASingleMap + 1,
            deadzone_percent: 0.1,
            scale: 0.70
        };
        spiderGraph.SetGraphOptions(options);
        spiderGraph.DrawGraphBackground(numMaps);
    }
    function DrawTeamPlot(spiderGraph, rankWindowShape, isMyTeam, max) {
        const oColorsMyTeam = {
            line_color: 'rgba( 100, 100, 100, 1.0);',
            fill_color_inner: 'rgba( 100, 100, 100, 0.5);'
        };
        const oColorsOpponent = {
            line_color: 'rgba( 219, 68, 55, 1.0);',
            fill_color_inner: 'rgba( 219, 68, 55, 0.5);'
        };
        rankWindowShape = rankWindowShape.map(a => a / max);
        const polyOptions = {
            line_color: isMyTeam ? oColorsMyTeam.line_color : oColorsOpponent.line_color,
            line_thickness: 3,
            line_softness: 10,
            fill_color_inner: isMyTeam ? oColorsMyTeam.fill_color_inner : oColorsOpponent.fill_color_inner,
            fill_color_outer: isMyTeam ? oColorsMyTeam.fill_color_inner : oColorsOpponent.fill_color_inner
        };
        spiderGraph.DrawGraphPoly(rankWindowShape, polyOptions);
    }
    function PlayerTeam() {
        let DEBUG_AVATARS = false;
        let aTestids = [
            '148618791998277666',
            '148618791998261669',
            '148618791998203739',
            '148618792083695883',
            '148618791998365706',
            '148618791998209668',
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
        if (DEBUG_AVATARS) {
            nCount = 10;
        }
        for (let i = 0; i < nCount; i++) {
            if (DEBUG_AVATARS) {
                if (aTestGroups[i] >= 0) {
                    let player = {
                        xuid: aTestids[i],
                        nParty: aTestGroups[i],
                        idx: i,
                        isClient: aTestids[i] === clientXuid ? true : false
                    };
                    aPlayers.push(player);
                }
            }
            else {
                if (MatchDraftAPI.GetPregamePlayerParty(i) >= 0) {
                    let player = {
                        xuid: MatchDraftAPI.GetPregamePlayerXuid(i),
                        nParty: MatchDraftAPI.GetPregamePlayerParty(i),
                        idx: i,
                        isClient: MatchDraftAPI.GetPregamePlayerXuid(i) === clientXuid ? true : false
                    };
                    aPlayers.push(player);
                }
            }
        }
        if (aPlayers.length < 1) {
            return;
        }
        let indexClient = aPlayers.findIndex(object => { return object.isClient === true; });
        for (let i = 0; i < aPlayers.length; i++) {
            AddPlayerToGroup(aPlayers[i], indexClient);
        }
        AddPartyBoundryLines(_m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-teammates'));
        AddPartyBoundryLines(_m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-opponent'));
    }
    function AddPlayerToGroup(player, indexClient) {
        let isTeammate = (indexClient < 5 && player.idx < 5) || (indexClient >= 5 && player.idx >= 5);
        let elParent = isTeammate ?
            _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-teammates') :
            _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-opponent');
        let elContainer = elParent.FindChildInLayoutFile('id-player-party-container-' + player.nParty);
        if (!elContainer) {
            elContainer = $.CreatePanel('Panel', elParent, 'id-player-party-container-' + player.nParty, { class: 'premier-pickban__teammates-party' });
        }
        let elTeammate = isTeammate ? elParent.FindChildInLayoutFile(player.xuid) : elParent.FindChildInLayoutFile(player.idx.toString());
        if (!elTeammate) {
            if (isTeammate) {
                SetPlayerRank(player.idx, MakeAvatar(player.xuid, elContainer));
            }
            else {
                SetPlayerRank(player.idx, MakeOpponentAvatar(elContainer, player.idx));
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfcHJlbWllcl9waWNrX2Jhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX3ByZW1pZXJfcGlja19iYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyxpREFBaUQ7QUFDakQsZ0RBQWdEO0FBQ2hELGlEQUFpRDtBQUNqRCwrQ0FBK0M7QUFDL0MsOENBQThDO0FBQzlDLDRDQUE0QztBQUM1QyxzREFBc0Q7QUFFdEQsSUFBVSxjQUFjLENBbTVCdkI7QUFuNUJELFdBQVUsY0FBYztJQUV2QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDeEIsSUFBSSxTQUFTLEdBQVcsQ0FBQyxDQUFDO0lBQzFCLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBRS9CLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQztJQUN6QixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDekIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBSWxCLE1BQU0sU0FBUyxHQUFHLENBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBRSxDQUFDO0lBQy9CLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixDQUFFLENBQUM7SUFRN0YsU0FBZ0IsSUFBSTtRQUVuQixDQUFDLENBQUMseUJBQXlCLENBQUUsNENBQTRDLEVBQUUsYUFBYSxDQUFFLENBQUM7UUFLM0Ysb0JBQW9CLEVBQUUsQ0FBQztRQUN2QixJQUFJLEVBQUUsQ0FBQztRQUNQLGFBQWEsRUFBRSxDQUFDO1FBQ2hCLDRCQUE0QixFQUFFLENBQUM7UUFFL0IsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsMkJBQTJCLENBQW1CLENBQUM7UUFDNUcsSUFBSyxXQUFXLENBQUMsWUFBWSxFQUFFLEVBQy9CO1lBQ0MsZUFBZSxFQUFFLENBQUM7U0FDbEI7YUFFRDtZQUNDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGVBQWUsQ0FBRSxDQUFDO1NBQ3RFO1FBRUQsSUFBSSxVQUFVLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUseUJBQXlCLENBQWEsQ0FBQztRQUVqRyxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsRUFBRSxjQUFjLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBRSxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxpQ0FBaUMsQ0FBRSxFQUFFLEtBQUssQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFFLENBQUM7SUFDeEosQ0FBQztJQXpCZSxtQkFBSSxPQXlCbkIsQ0FBQTtJQUVELFNBQVMsSUFBSTtRQUVaLGlCQUFpQixDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7SUFDL0MsQ0FBQztJQUVELFNBQVMsb0JBQW9CO1FBRTVCLElBQUksU0FBUyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLGlDQUFpQyxDQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEcsU0FBUyxDQUFDLE9BQU8sQ0FBRSxLQUFLLENBQUMsRUFBRTtZQUUxQixLQUFLLENBQUMsaUJBQWlCLENBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQy9DLENBQUMsQ0FBRSxDQUFDO0lBQ0wsQ0FBQztJQUVELFNBQVMsYUFBYTtRQUVyQixJQUFJLFNBQVMsR0FBRyxTQUFTLEtBQUssYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzlELGlCQUFpQixDQUFFLFNBQVMsQ0FBRSxDQUFDO1FBRS9CLFNBQVMsR0FBRyxhQUFhLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDNUMsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRS9ELGlCQUFpQixDQUFDLFdBQVcsQ0FBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsR0FBRyxTQUFTLENBQUUsQ0FBQztRQUV4RixJQUFJLGNBQWMsR0FBc0I7WUFDdkMsTUFBTSxFQUFFLEtBQUs7WUFDYixJQUFJLEVBQUUsTUFBTTtZQUNaLEtBQUssRUFBRSxrQkFBa0I7U0FDekIsQ0FBQztRQUVGLGNBQWMsQ0FBRSxjQUFjLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFFNUMsSUFBSSxXQUFXLEdBQXNCO1lBQ3BDLE1BQU0sRUFBRSxJQUFJO1lBQ1osSUFBSSxFQUFFLFNBQVM7WUFDZixLQUFLLEVBQUUsbUJBQW1CO1NBQzFCLENBQUM7UUFFRixjQUFjLENBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBRSxDQUFDO1FBQ3pDLHlCQUF5QixFQUFFLENBQUM7UUFDNUIsc0JBQXNCLEVBQUUsQ0FBQztRQUN6QixlQUFlLENBQUUsU0FBUyxDQUFFLENBQUM7UUFDN0Isa0JBQWtCLEVBQUUsQ0FBQztRQUNyQixVQUFVLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRCxTQUFTLGtCQUFrQjtRQUUxQixJQUFJLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO1FBQy9FLElBQUssU0FBUyxHQUFHLENBQUMsRUFDbEI7WUFDQyxPQUFPLENBQUMsV0FBVyxDQUFFLFNBQVMsRUFBQyxrQ0FBa0MsQ0FBRSxDQUFBO1lBQ25FLE9BQU87U0FDUDtRQUVELElBQUssYUFBYSxDQUFDLHNCQUFzQixFQUFFLEtBQUssYUFBYSxDQUFDLGdCQUFnQixFQUFFLEVBQ2hGO1lBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztTQUNsRTthQUVEO1lBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxTQUFTLEVBQUUsK0JBQStCLENBQUMsQ0FBQztTQUNqRTtJQUNGLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFHLFNBQWlCO1FBRTdDLElBQUssU0FBUyxJQUFJLFNBQVMsR0FBRyxDQUFDLElBQUksU0FBUyxJQUFJLENBQUMsRUFDakQ7WUFDQyxDQUFDLENBQUMsYUFBYSxDQUFFLCtCQUErQixFQUFFLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUUsQ0FBQztTQUMxRjthQUNJLElBQUssU0FBUyxJQUFJLFNBQVMsR0FBRyxDQUFDLEVBQ3BDO1lBQ0MsQ0FBQyxDQUFDLGFBQWEsQ0FBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFFLENBQUM7U0FDakc7SUFDRixDQUFDO0lBRUQsU0FBUyxzQkFBc0I7UUFFOUIsSUFBSSxTQUFTLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsaUNBQWlDLENBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4RyxTQUFTLENBQUMsT0FBTyxDQUFFLEtBQUssQ0FBQyxFQUFFO1lBRTFCLElBQUksY0FBYyxHQUFHLFFBQVEsQ0FBRSxLQUFLLENBQUMsa0JBQWtCLENBQUUsWUFBWSxFQUFFLEVBQUUsQ0FBRSxDQUFFLENBQUM7WUFDOUUsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLG9CQUFvQixHQUFHLGNBQWMsQ0FBRSxDQUFFLENBQUM7WUFDaEcsS0FBSyxDQUFDLFdBQVcsQ0FBRSxnQ0FBZ0MsRUFBRSxVQUFVLEVBQUUsSUFBSSxjQUFjLEtBQUssU0FBUyxDQUFFLENBQUM7WUFDcEcsS0FBSyxDQUFDLFdBQVcsQ0FBRSxpQ0FBaUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxJQUFJLGNBQWMsS0FBSyxTQUFTLENBQUUsQ0FBQztZQUN0RyxLQUFLLENBQUMsV0FBVyxDQUFFLGdDQUFnQyxFQUFFLGNBQWMsR0FBRyxTQUFTLENBQUUsQ0FBQztZQUNsRixLQUFLLENBQUMsV0FBVyxDQUFFLGlDQUFpQyxFQUFFLGNBQWMsR0FBRyxTQUFTLENBQUUsQ0FBQztRQUNwRixDQUFDLENBQUUsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLFVBQVU7UUFFbEIsT0FBTyxTQUFTLEdBQUcsQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7SUFTdkMsQ0FBQztJQUVELFNBQVMsNEJBQTRCO1FBRXBDLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDLENBQUMsUUFBUSxDQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUU7WUFFcEIsSUFBSSxjQUFjLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsd0JBQXdCLEdBQUcsU0FBUyxDQUFFLENBQUM7WUFDckcsSUFBSyxjQUFjLEVBQ25CO2dCQUNDLElBQUksY0FBYyxHQUFHLGFBQWEsQ0FBQywrQkFBK0IsRUFBRSxDQUFDO2dCQUNyRSxjQUFjLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckQsY0FBYyxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztnQkFFOUUsSUFBSSxlQUFlLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBRSxjQUFjLEdBQUcsa0JBQWtCLEVBQUUsQ0FBRSxHQUFHLEdBQUcsQ0FBRSxDQUFDO2dCQUMxRixjQUFjLENBQUMscUJBQXFCLENBQUUseUJBQXlCLENBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGVBQWUsR0FBRyxHQUFHLENBQUM7Z0JBRXRHLElBQUssY0FBYyxHQUFHLENBQUMsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUMzQztvQkFDQyxDQUFDLENBQUMsYUFBYSxDQUFFLCtCQUErQixFQUFFLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUUsQ0FBQztvQkFDNUYsVUFBVSxFQUFFLENBQUE7aUJBQ1o7O29CQUNJLENBQUUsVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUN0QjtvQkFDQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO2lCQUNmO2FBQ0Q7WUFFRCw0QkFBNEIsRUFBRSxDQUFDO1FBQ2hDLENBQUMsQ0FBRSxDQUFDO0lBQ0wsQ0FBQztJQUFBLENBQUM7SUFFRixTQUFTLGtCQUFrQjtRQUUxQixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsUUFBUyxTQUFTLEVBQ2xCO1lBQ0MsS0FBSyxDQUFDO2dCQUNMLE9BQU8sR0FBRyxDQUFDLENBQUM7Z0JBQ1osTUFBTTtZQUNQLEtBQUssQ0FBQztnQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLE1BQU07WUFDUCxLQUFLLENBQUM7Z0JBQ0wsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDYixNQUFNO1lBQ1AsS0FBSyxDQUFDO2dCQUNMLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2IsTUFBTTtZQUNQLEtBQUssQ0FBQztnQkFDTCxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNiLE1BQU07WUFDUCxLQUFLLENBQUM7Z0JBQ0wsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDYixNQUFNO1lBQ1AsS0FBSyxDQUFDO2dCQUNMLE9BQU8sR0FBRyxDQUFDLENBQUM7Z0JBQ1osTUFBTTtZQUNQO2dCQUNDLE9BQU8sR0FBRyxDQUFDLENBQUM7Z0JBQ1osTUFBTTtTQUNQO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFHLFNBQWtCO1FBRTVDLElBQUksU0FBUyxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDN0csSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFFLGdDQUFnQyxHQUFHLFNBQVMsQ0FBRSxDQUFDLENBQUM7WUFDOUUsQ0FBRSwyQkFBMkIsR0FBRyxTQUFTLENBQUUsQ0FBQztRQUU3QyxJQUFJLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSwwQkFBMEIsQ0FBYSxDQUFDO1FBUS9GLGlCQUFpQixDQUFDLFdBQVcsQ0FBRSxXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUUsQ0FBQztRQUN6RCxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSw0QkFBNEIsQ0FBRSxDQUFDLFdBQVcsQ0FBRSxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUUsQ0FBQztRQUMxRyxPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUV2QixJQUFLLFNBQVMsRUFDZDtZQUNDLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLG9CQUFvQixDQUFFLENBQUMsWUFBWSxDQUFFLGdDQUFnQyxDQUFFLENBQUM7U0FDakg7UUFFRCxJQUFLLFNBQVMsRUFDZDtZQUNDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxnQ0FBZ0MsR0FBRyxTQUFTLENBQUUsQ0FBQztZQUMxRSxPQUFPO1NBQ1A7UUFFRCxJQUFJLFdBQVcsR0FBRyxlQUFlLEVBQUUsQ0FBQyxNQUFNLENBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUUsQ0FBQyxNQUFNLENBQUM7UUFDekUsT0FBTyxDQUFDLG9CQUFvQixDQUFFLE1BQU0sRUFBRSxXQUFXLENBQUUsQ0FBQztRQUNwRCxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsMkJBQTJCLEdBQUcsU0FBUyxFQUFFLE9BQU8sQ0FBRSxDQUFDO0lBQy9FLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBRyxXQUE4QixFQUFFLFNBQWlCO1FBRTFFLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDaEMsSUFBSSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUU5QixJQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN4QjtZQUNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUN6QztnQkFDQyxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFFLENBQUM7Z0JBQzVFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUUsZ0JBQWdCLENBQW9CLENBQUM7Z0JBRWhGLElBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUM1QjtvQkFDQyxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7b0JBQ25CLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQztvQkFDbkIsSUFBSSxlQUFlLEdBQUcsT0FBTyxDQUFDO29CQUU5QixJQUFLLFdBQVcsQ0FBQyxNQUFNLEVBQ3ZCO3dCQUNDLElBQUksSUFBSSxHQUFlLFFBQVEsQ0FBRSxDQUFDLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO3dCQUMxRCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFFLElBQUksRUFBRSxjQUFjLENBQUUsQ0FBQzt3QkFDMUQsU0FBUyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxNQUFNLENBQUUsQ0FBQzt3QkFDekQsU0FBUyxHQUFHLHNCQUFzQixHQUFHLFNBQVMsR0FBRyxRQUFRLENBQUM7d0JBQzFELFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSx3QkFBd0IsR0FBRyxJQUFJLENBQUUsQ0FBRSxDQUFDO3dCQUN4RixRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQzt3QkFFakMsSUFBSSxZQUFZLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQWEsQ0FBQzt3QkFDNUYsWUFBWSxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxLQUFLLENBQUUsQ0FBQzt3QkFDeEQsZUFBZSxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7cUJBQ3BFO3lCQUVEO3dCQUNDLFNBQVMsR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLENBQUUsQ0FBRSxDQUFDO3dCQUNwRSxTQUFTLEdBQUcsa0RBQWtELEdBQUcsU0FBUyxHQUFHLFFBQVEsQ0FBQzt3QkFDdEYsUUFBUSxDQUFDLGlCQUFpQixDQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLFlBQVksR0FBRyxTQUFTLENBQUUsQ0FBRSxDQUFDO3dCQUNqRixRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQzt3QkFFbEMsSUFBSSxZQUFZLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQWEsQ0FBQzt3QkFDNUYsWUFBWSxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxLQUFLLENBQUUsQ0FBQztxQkFDeEQ7b0JBRUQsSUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLHVCQUF1QixDQUFFLENBQUM7b0JBQzlFLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztvQkFDaEQsYUFBYSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7b0JBQ25ELGFBQWEsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztvQkFDN0MsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO29CQUV0RCxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBQztvQkFDdkMsUUFBUSxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUUsUUFBUSxDQUFFLENBQUUsQ0FBQztpQkFDN0U7Z0JBR0QsSUFBSyxTQUFTLEVBQ2Q7b0JBQ0MsUUFBUSxDQUFDLFdBQVcsQ0FBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7b0JBQzlDLFFBQVEsQ0FBQyxXQUFXLENBQUUsZUFBZSxFQUFFLEtBQUssQ0FBRSxDQUFDO2lCQUMvQztnQkFFRCxJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFFM0YsSUFBSyxXQUFXLENBQUMsTUFBTSxFQUN2QjtvQkFDQyxRQUFRLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztvQkFFNUIsSUFBSyxTQUFTLEtBQUssQ0FBQyxFQUNwQjt3QkFDQyxRQUFRLENBQUMsV0FBVyxDQUFFLHNCQUFzQixFQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLENBQUUsS0FBSyxlQUFlLEVBQUUsQ0FBRSxDQUFDO3FCQUNoRztpQkFDRDtxQkFFRDtvQkFDQyxJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUUsUUFBUSxDQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBRSxDQUFDO29CQUN4RixRQUFRLENBQUMsV0FBVyxDQUFFLGtCQUFrQixHQUFHLFFBQVEsRUFBRSxRQUFRLEtBQUssRUFBRSxDQUFFLENBQUM7b0JBQ3ZFLFFBQVEsQ0FBQyxPQUFPLEdBQUcsUUFBUSxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUM7b0JBRS9DLElBQUssU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUMxQzt3QkFDQyxjQUFjLENBQUMsV0FBVyxDQUFFLGtDQUFrQyxFQUFFLFFBQVEsS0FBSyxNQUFNLENBQUUsQ0FBQzt3QkFDdEYsY0FBYyxDQUFDLFdBQVcsQ0FBRSxZQUFZLEVBQUUsUUFBUSxLQUFLLE1BQU0sQ0FBRSxDQUFDO3dCQUdoRSxJQUFJLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxLQUFLLEdBQUcsTUFBTSxHQUFHLENBQUMsQ0FBYSxDQUFDO3dCQUM1RixZQUFZLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztxQkFDN0I7aUJBQ0Q7Z0JBRUQsSUFBSSxNQUFNLEdBQUcsYUFBYSxDQUFDLHNCQUFzQixDQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztnQkFDeEYsSUFBSyxNQUFNLEVBQ1g7b0JBQ0MsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLHNCQUFzQixFQUFFLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO29CQUNuRSxRQUFRLENBQUMsV0FBVyxDQUFFLHNDQUFzQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUM7aUJBQ2xIO2dCQUVELGlCQUFpQixDQUFFLFFBQVEsRUFBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLEVBQUUsUUFBUSxDQUFFLENBQUM7Z0JBQ3ZELGdCQUFnQixDQUFFLGNBQWMsRUFBRSxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxDQUFFLEVBQUUsUUFBUSxDQUFFLENBQUM7YUFDeEU7U0FDRDtJQUNGLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFHLFFBQXdCO1FBRXJELElBQUksYUFBYSxHQUFHLGVBQWUsRUFBRSxDQUFDO1FBQ3RDLElBQUksZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBRSxRQUFRLENBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBRSxDQUFFLENBQUM7UUFHbkYsSUFBSyxnQkFBZ0IsS0FBSyxDQUFDLENBQUMsRUFDNUI7WUFFQyxhQUFhLENBQUMsdUJBQXVCLENBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBRSxDQUFDO1lBQ3hFLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsd0JBQXdCLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFDNUUsT0FBTztTQUNQO1FBR0QsSUFBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUM5QjtZQUNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQzNCO2dCQUNDLElBQUksS0FBSyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixHQUFHLENBQUMsQ0FBRSxDQUFDLFNBQVMsQ0FBRSxnQkFBZ0IsQ0FBb0IsQ0FBQztnQkFDL0gsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ3RCLEtBQUssQ0FBQyxXQUFXLENBQUUsZUFBZSxFQUFFLEtBQUssQ0FBRSxDQUFDO2FBQzVDO1lBRUQsYUFBYSxDQUFDLHVCQUF1QixDQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBRSxDQUFDO1lBRTFGLFFBQVEsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1lBQ3hCLFFBQVEsQ0FBQyxXQUFXLENBQUUsZUFBZSxFQUFFLElBQUksQ0FBRSxDQUFDO1lBQzlDLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFDM0UsT0FBTztTQUNQO1FBR0QsSUFBSSxRQUFRLEdBQUcsb0JBQW9CLENBQUUsYUFBYSxDQUFFLENBQUM7UUFDckQsSUFBSyxRQUFRLEtBQUssSUFBSSxFQUN0QjtZQUVDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztZQUVqRyxRQUFRLENBQUMsV0FBVyxDQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBRSxDQUFDO1lBQ3JELFFBQVEsQ0FBQyxXQUFXLENBQUUsZUFBZSxFQUFFLENBQUMsVUFBVSxFQUFFLENBQUUsQ0FBQztZQUN2RCxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1NBQzFFO2FBRUQ7WUFFQyxRQUFRLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztZQUN6QixJQUFJLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hHLEtBQUssQ0FBQyxPQUFPLENBQUUsVUFBVyxHQUFHO2dCQUU1QixJQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFFLEtBQUssQ0FBRSxLQUFLLENBQUMsQ0FBQyxFQUNuQztvQkFFQyxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFFLGdCQUFnQixDQUFvQixDQUFDO29CQUNuRSxJQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUM5Qzt3QkFFQyxHQUFHLENBQUMsWUFBWSxDQUFFLCtCQUErQixDQUFFLENBQUM7cUJBQ3BEO2lCQUNEO1lBQ0YsQ0FBQyxDQUFFLENBQUM7WUFDSixDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLDRCQUE0QixFQUFFLE9BQU8sQ0FBRSxDQUFDO1NBQ2hGO0lBQ0YsQ0FBQztJQUVELFNBQVMsZUFBZTtRQUV2QixJQUFJLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFFdkIsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUMzQztZQUNDLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUN2RCxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlCLGFBQWEsQ0FBQyxJQUFJLENBQUUsTUFBTSxDQUFFLENBQUM7U0FDN0I7UUFFRCxPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBRyxhQUF1QjtRQUV0RCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDOUM7WUFDQyxJQUFLLGFBQWEsQ0FBRSxDQUFDLENBQUUsS0FBSyxDQUFDLENBQUMsRUFDOUI7Z0JBQ0MsT0FBTyxDQUFDLENBQUM7YUFDVDtTQUNEO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBR0QsU0FBUyxlQUFlO1FBRXZCLElBQUssU0FBUyxLQUFLLENBQUMsRUFDcEI7WUFDQyxPQUFPLENBQUMsQ0FBQztTQUNUO1FBRUQsSUFBSyxTQUFTLEtBQUssQ0FBQyxFQUNwQjtZQUNDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Q7UUFFRCxJQUFLLFNBQVMsS0FBSyxDQUFDLEVBQ3BCO1lBQ0MsT0FBTyxDQUFDLENBQUM7U0FDVDtRQUVELElBQUssU0FBUyxLQUFLLENBQUMsRUFDcEI7WUFDQyxPQUFPLENBQUMsQ0FBQztTQUNUO1FBRUQsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBRyxRQUF1QixFQUFFLE1BQWEsRUFBRSxRQUFnQjtRQUdwRixJQUFJLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBRSxRQUFRLENBQUUsTUFBTSxDQUFFLENBQUMsSUFBSSxRQUFRLEVBQ3pFO1lBQ0MsSUFBSSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSw4QkFBOEIsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFFLDZCQUE2QixDQUFFLENBQUE7WUFDdkksUUFBUSxDQUFDLGlCQUFpQixDQUFFLFFBQVEsRUFBRSxVQUFVLENBQUUsQ0FBQztZQUVuRCxJQUFJLFFBQVEsR0FBRyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxLQUFLLENBQUUsR0FBRyxDQUFFLENBQUM7WUFDbkUsUUFBUSxDQUFDLFdBQVcsQ0FBRSx1Q0FBdUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLE1BQU0sQ0FBRSxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUM7WUFDbkcsUUFBUSxDQUFDLFdBQVcsQ0FBRSxjQUFjLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBRSxDQUFDO1NBQ2xFO2FBRUQ7WUFDQyxRQUFRLENBQUMsV0FBVyxDQUFFLHVDQUF1QyxFQUFFLEtBQUssQ0FBRSxDQUFDO1NBQ3ZFO0lBQ0YsQ0FBQztJQUVELFNBQVMsY0FBYztRQUV0QixJQUFJLE9BQU8sR0FBRyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxLQUFLLENBQUUsR0FBRyxDQUFFLENBQUM7UUFDaEUsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBRSxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBRSxRQUFRLENBQUUsRUFBRSxDQUFFLENBQUUsS0FBSyxNQUFNLENBQUUsQ0FBRSxDQUFDLENBQUUsQ0FBQztRQUM3RyxPQUFPLFlBQVksQ0FBQyxhQUFhLENBQUUsUUFBUSxDQUFFLFNBQVMsQ0FBRSxDQUFFLENBQUM7SUFDNUQsQ0FBQztJQUVELFNBQVMsZUFBZTtRQUV2QixJQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNqRCxJQUFJLFVBQVUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUl6QyxJQUFJLGFBQWEsR0FBRyxDQUFFLGFBQWEsQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFFO1lBQ2pILENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUcxQixPQUFPLGFBQWEsQ0FBQztJQUV0QixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBRyxLQUFjLEVBQUUsTUFBYyxFQUFFLFFBQWdCO1FBRTNFLElBQUksV0FBVyxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBRSxNQUFNLENBQUUsQ0FBQyxLQUFLLENBQUUsR0FBRyxDQUFFLENBQUM7UUFHOUUsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUMscUJBQXFCLENBQUUsd0JBQXdCLENBQUUsQ0FBQztRQUNqRixrQkFBa0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBRTdDLElBQUssQ0FBQyxRQUFRLEVBQ2Q7WUFDQyxPQUFPO1NBQ1A7UUFFRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDNUM7WUFHQyxVQUFVLENBQUUsV0FBVyxDQUFFLENBQUMsQ0FBRSxFQUFFLGtCQUFrQixDQUFFLENBQUM7U0FDbkQ7SUFDRixDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUcsSUFBWSxFQUFFLFdBQW9CO1FBRXZELElBQUssSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUk7WUFDekIsT0FBTztRQUVSLElBQUssSUFBSSxFQUNUO1lBQ0MsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBRSxDQUFDO1lBQzNELFFBQVEsQ0FBQyxrQkFBa0IsQ0FBRSxjQUFjLENBQUUsQ0FBQztZQUU5QyxJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsZUFBZSxDQUF1QixDQUFDO1lBQ3JGLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUV4QyxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMscUJBQXFCLENBQUUsSUFBSyxFQUFFLGdCQUFnQixDQUFFLENBQUM7WUFDbkYsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBRSxNQUFNLENBQUUsWUFBWSxDQUFFLENBQUUsQ0FBQztZQUV0RSxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsR0FBRyxZQUFZLEdBQUcsR0FBRyxDQUFDO1lBRWpFLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLGFBQWEsQ0FBRSxJQUFJLENBQUUsQ0FBRSxDQUFDO1lBRXBGLE9BQU8sUUFBUSxDQUFDO1NBQ2hCO0lBQ0YsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLFNBQWlCLEVBQUUsUUFBaUI7UUFFNUQsSUFBSSxpQkFBaUIsR0FBRyxhQUFhLENBQUMsaUNBQWlDLENBQUUsU0FBUyxDQUFFLENBQUM7UUFHckYsSUFBSyxDQUFDLFFBQVE7WUFDYixPQUFPO1FBRVIsSUFBSSxPQUFPLEdBQ1g7WUFDQyxVQUFVLEVBQUUsUUFBUTtZQUNwQixXQUFXLEVBQUUsU0FBOEI7WUFDM0MsS0FBSyxFQUFFLElBQUk7WUFDWCxZQUFZLEVBQUUsS0FBSztZQUNuQixtQkFBbUIsRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUU7U0FDekQsQ0FBQztRQUVGLFlBQVksQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7SUFDakMsQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUcsV0FBb0IsRUFBRSxhQUFvQjtRQUV2RSxJQUFJLFFBQVEsR0FBRyxhQUFhLEtBQUssQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztRQUV4RCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7UUFDL0UsUUFBUSxDQUFDLGtCQUFrQixDQUFFLHVCQUF1QixDQUFFLENBQUM7UUFFdkQsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLDJCQUEyQixDQUFhLENBQUM7UUFDdkYsT0FBTyxDQUFDLFFBQVEsQ0FBQyxzQ0FBc0MsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLEdBQUksTUFBTSxDQUFDLENBQUM7UUFFekYsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELFNBQVMseUJBQXlCO1FBRWpDLElBQUssU0FBUyxJQUFJLENBQUMsRUFDbkI7WUFDQyxJQUFJLGVBQWUsR0FBRyxjQUFjLEVBQUUsQ0FBQztZQUN2QyxJQUFJLFNBQVMsR0FBRyxrREFBa0QsR0FBRyxlQUFlLEdBQUcsUUFBUSxDQUFDO1lBRWhHLHFCQUFxQixDQUFFLElBQUksRUFBRSxRQUFRLENBQUUsQ0FBQztZQUN4QyxxQkFBcUIsQ0FBRSxHQUFHLEVBQUUsTUFBTSxDQUFFLENBQUM7WUFFckMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxDQUFDLEVBQUUsR0FBRyxFQUFFO2dCQUVuQixJQUFJLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSx1QkFBdUIsQ0FBYSxDQUFBO2dCQUM3RixTQUFTLENBQUMsUUFBUSxDQUFFLHFDQUFxQyxHQUFHLGVBQWUsR0FBRyxNQUFNLENBQUUsQ0FBQztnQkFDdkYsU0FBUyxDQUFDLFFBQVEsQ0FBRSxNQUFNLENBQUUsQ0FBQztnQkFFN0IsSUFBSSxVQUFVLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsd0JBQXdCLENBQUUsQ0FBQztnQkFDckYsVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO2dCQUM3QyxVQUFVLENBQUMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLFNBQVMsQ0FBQztnQkFDaEQsVUFBVSxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDO2dCQUMxQyxVQUFVLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7Z0JBQ3BDLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEdBQUcsR0FBRyxDQUFDO2dCQUU1QyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxNQUFNLENBQUUsQ0FBQztZQUluRixDQUFDLENBQUUsQ0FBQztZQUVKLElBQUssU0FBUyxLQUFLLENBQUMsRUFDcEI7Z0JBQ0MsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQzFDO29CQUNDLElBQUssUUFBUSxDQUFFLFNBQVMsQ0FBRSxDQUFDLENBQUUsQ0FBRSxLQUFLLGVBQWUsRUFBRSxFQUNyRDt3QkFDQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUUsQ0FBQyxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQzt3QkFDL0MsSUFBSSxXQUFXLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUscUJBQXFCLEdBQUcsSUFBSSxDQUE2QixDQUFDO3dCQUNySCxXQUFXLENBQUMsV0FBVyxDQUFFLGtDQUFrQyxFQUFFLElBQUksQ0FBRSxDQUFDO3FCQUNwRTtpQkFDRDthQUNEO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxxQkFBcUIsQ0FBRyxJQUFnQixFQUFFLElBQVc7UUFFN0QsSUFBSSxXQUFXLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUscUJBQXFCLEdBQUcsSUFBSSxDQUE2QixDQUFDO1FBRXJILElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBRSxDQUFDO1FBQzFELElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFFLENBQUM7UUFDOUQsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBRSxJQUFJLEVBQUUsSUFBSSxDQUFFLENBQUM7UUFFbEQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGtDQUFrQyxDQUFFLE1BQU0sQ0FBRSxDQUFDO1FBQ3ZFLFFBQVEsQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1FBQzdCLFFBQVEsQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDO1FBQ2pDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBRSxRQUFRLENBQUUsQ0FBQztJQUM3QyxDQUFDO0lBRUQsU0FBUyxZQUFZO1FBQ3BCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBRSxjQUFjLENBQUMsNENBQTRDLENBQUUsR0FBRyxDQUFFLENBQUUsQ0FBQztJQUMxRixDQUFDO0lBRUQsU0FBUyxnQ0FBZ0MsQ0FBQyxNQUFjO1FBRXZELElBQUksa0JBQWtCLEdBQUcsRUFBeUIsQ0FBQztRQUNuRCxJQUFJLE1BQU0sR0FBVyxHQUFHLENBQUM7UUFDekIsSUFBSSxPQUFPLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFHN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9ELElBQUksaUJBQWlCLEdBQUcsYUFBYSxDQUFDLGlDQUFpQyxDQUFFLENBQUMsQ0FBRSxDQUFDO1lBRTdFLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RCxJQUFJLFVBQVUsSUFBSSxNQUFNO2dCQUN2QixTQUFTO1lBRVYsTUFBTSxFQUFFLENBQUM7WUFDVCxPQUFPLENBQUMsT0FBTyxDQUFFLE9BQU8sQ0FBQyxFQUFFO2dCQUUxQixJQUFJLFVBQVUsR0FBVyxNQUFNLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBRSxpQkFBaUIsQ0FBRSxPQUFPLENBQUUsSUFBSSxDQUFDLENBQUUsQ0FBRSxDQUFDO2dCQUNuRixJQUFJLFlBQVksR0FBVyxNQUFNLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBRSxrQkFBa0IsQ0FBRSxPQUFPLENBQUUsSUFBSSxDQUFDLENBQUUsQ0FBRSxDQUFDO2dCQUN0RixrQkFBa0IsQ0FBRSxPQUFPLENBQUUsR0FBRyxVQUFVLEdBQUcsWUFBWSxDQUFDO1lBQzNELENBQUMsQ0FBRSxDQUFDO1NBQ0o7UUFNRCxPQUFPLGtCQUFrQixDQUFDO0lBQzNCLENBQUM7SUFFRCxTQUFTLGVBQWU7UUFFdkIsSUFBSSxpQkFBaUIsR0FBRyxnQ0FBZ0MsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN6RSxJQUFJLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUUsaUJBQWlCLENBQUcsQ0FBQyxHQUFHLENBQVUsQ0FBRSxPQUFPLEVBQUcsRUFBRSxHQUFHLE9BQU8sTUFBTSxDQUFFLGlCQUFpQixDQUFFLE9BQU8sQ0FBRyxHQUFHLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFFaEosSUFBSSxrQkFBa0IsR0FBRyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRSxJQUFJLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUUsaUJBQWlCLENBQUcsQ0FBQyxHQUFHLENBQVUsQ0FBRSxPQUFPLEVBQUcsRUFBRSxHQUFHLE9BQU8sTUFBTSxDQUFFLGtCQUFrQixDQUFFLE9BQU8sQ0FBRyxHQUFHLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFFbEosSUFBSSxtQkFBbUIsR0FBRyxDQUFFLElBQUksQ0FBQyxHQUFHLENBQUUsR0FBRyxpQkFBaUIsRUFBRSxHQUFHLGtCQUFrQixFQUFFLENBQUMsQ0FBRSxDQUFFLENBQUM7UUFFekYsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsMkJBQTJCLENBQW1CLENBQUM7UUFDNUcsY0FBYyxDQUFFLFdBQVcsRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1FBR25ELElBQUssYUFBYSxDQUFDLGdCQUFnQixFQUFFLEtBQUssT0FBTyxFQUNqRDtZQUNDLFlBQVksQ0FBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixDQUFFLENBQUM7WUFDM0UsWUFBWSxDQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUMzRTthQUVEO1lBQ0MsWUFBWSxDQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLENBQUUsQ0FBQztZQUMxRSxZQUFZLENBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1NBQzVFO0lBQ0YsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFHLFdBQTBCLEVBQUUsbUJBQTBCO1FBRS9FLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQztRQUVsQixXQUFXLENBQUMsT0FBTyxDQUFFLGVBQWUsQ0FBRSxDQUFDO1FBQ3ZDLE1BQU0sT0FBTyxHQUF5QjtZQUNyQyxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUUsV0FBVztZQUN6QixlQUFlLEVBQUUsQ0FBQztZQUNsQixjQUFjLEVBQUUsR0FBRztZQUNuQixrQkFBa0IsRUFBRSxHQUFHO1lBQ3ZCLGVBQWUsRUFBRSxXQUFXO1lBQzVCLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsa0JBQWtCLEVBQUUsR0FBRztZQUN2QixlQUFlLEVBQUUsbUJBQW1CLEdBQUcsQ0FBQztZQUN4QyxnQkFBZ0IsRUFBRSxHQUFHO1lBQ3JCLEtBQUssRUFBRSxJQUFJO1NBQ1gsQ0FBQztRQUNGLFdBQVcsQ0FBQyxlQUFlLENBQUUsT0FBTyxDQUFFLENBQUM7UUFDdkMsV0FBVyxDQUFDLG1CQUFtQixDQUFFLE9BQU8sQ0FBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxXQUF5QixFQUFFLGVBQXdCLEVBQUUsUUFBZ0IsRUFBRSxHQUFXO1FBR3ZHLE1BQU0sYUFBYSxHQUFHO1lBQ3JCLFVBQVUsRUFBRSw0QkFBNEI7WUFDeEMsZ0JBQWdCLEVBQUUsNEJBQTRCO1NBQzlDLENBQUE7UUFFRCxNQUFNLGVBQWUsR0FBRztZQUN2QixVQUFVLEVBQUUsMEJBQTBCO1lBQ3RDLGdCQUFnQixFQUFFLDBCQUEwQjtTQUM1QyxDQUFBO1FBRUQsZUFBZSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFFLENBQUM7UUFFdEQsTUFBTSxXQUFXLEdBQTBCO1lBQzFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQzVFLGNBQWMsRUFBRSxDQUFDO1lBQ2pCLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCO1lBQzlGLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCO1NBQzlGLENBQUM7UUFFRixXQUFXLENBQUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBVUQsU0FBUyxVQUFVO1FBRWxCLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLFFBQVEsR0FBRztZQUNkLG9CQUFvQjtZQUNwQixvQkFBb0I7WUFDcEIsb0JBQW9CO1lBQ3BCLG9CQUFvQjtZQUNwQixvQkFBb0I7WUFDcEIsb0JBQW9CO1lBQ3BCLG9CQUFvQjtZQUNwQixvQkFBb0I7WUFDcEIsRUFBRTtZQUNGLG9CQUFvQjtTQUNwQixDQUFDO1FBRUYsSUFBSSxXQUFXLEdBQUc7WUFDakIsQ0FBQztZQUNELENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztZQUNELENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztZQUNELENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztTQUNELENBQUM7UUFFRixJQUFJLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEMsSUFBSSxRQUFRLEdBQWUsRUFBRSxDQUFDO1FBQzlCLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBRW5ELElBQUssYUFBYSxFQUNsQjtZQUNDLE1BQU0sR0FBRyxFQUFFLENBQUM7U0FDWjtRQUVELEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ2hDO1lBQ0MsSUFBSyxhQUFhLEVBQ2xCO2dCQUNDLElBQUssV0FBVyxDQUFFLENBQUMsQ0FBRSxJQUFJLENBQUMsRUFDMUI7b0JBQ0MsSUFBSSxNQUFNLEdBQWE7d0JBQ3RCLElBQUksRUFBRSxRQUFRLENBQUUsQ0FBQyxDQUFFO3dCQUNuQixNQUFNLEVBQUUsV0FBVyxDQUFFLENBQUMsQ0FBRTt3QkFDeEIsR0FBRyxFQUFFLENBQUM7d0JBQ04sUUFBUSxFQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztxQkFDckQsQ0FBQztvQkFHRixRQUFRLENBQUMsSUFBSSxDQUFFLE1BQU0sQ0FBRSxDQUFDO2lCQUN4QjthQUNEO2lCQUVEO2dCQUNDLElBQUssYUFBYSxDQUFDLHFCQUFxQixDQUFFLENBQUMsQ0FBRSxJQUFJLENBQUMsRUFDbEQ7b0JBQ0MsSUFBSSxNQUFNLEdBQWE7d0JBQ3RCLElBQUksRUFBRSxhQUFhLENBQUMsb0JBQW9CLENBQUUsQ0FBQyxDQUFFO3dCQUM3QyxNQUFNLEVBQUUsYUFBYSxDQUFDLHFCQUFxQixDQUFFLENBQUMsQ0FBRTt3QkFDaEQsR0FBRyxFQUFFLENBQUM7d0JBQ04sUUFBUSxFQUFFLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBRSxDQUFDLENBQUUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztxQkFDL0UsQ0FBQztvQkFFRixRQUFRLENBQUMsSUFBSSxDQUFFLE1BQU0sQ0FBRSxDQUFDO2lCQUN4QjthQUNEO1NBQ0Q7UUFFRCxJQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN4QjtZQUNDLE9BQU87U0FDUDtRQUVELElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUUsTUFBTSxDQUFDLEVBQUUsR0FBRyxPQUFPLE1BQU0sQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFJdkYsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3pDO1lBQ0MsZ0JBQWdCLENBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxFQUFFLFdBQVcsQ0FBRSxDQUFDO1NBQy9DO1FBRUQsb0JBQW9CLENBQUUsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsNkJBQTZCLENBQUUsQ0FBRSxDQUFDO1FBQ2pHLG9CQUFvQixDQUFFLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDRCQUE0QixDQUFFLENBQUUsQ0FBQztJQUNqRyxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBRyxNQUFlLEVBQUUsV0FBa0I7UUFHOUQsSUFBSSxVQUFVLEdBQUcsQ0FBRSxXQUFXLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFFLElBQUksQ0FBRSxXQUFXLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFFLENBQUM7UUFFbEcsSUFBSSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDMUIsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsNkJBQTZCLENBQUUsQ0FBQyxDQUFDO1lBQzFFLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDRCQUE0QixDQUFFLENBQUM7UUFFekUsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLDRCQUE0QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUUsQ0FBQztRQUVqRyxJQUFLLENBQUMsV0FBVyxFQUNqQjtZQUNDLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUMxQixPQUFPLEVBQ1AsUUFBUSxFQUNSLDRCQUE0QixHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQzVDLEVBQUUsS0FBSyxFQUFFLGtDQUFrQyxFQUFFLENBQzdDLENBQUM7U0FDRjtRQUVELElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQSxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztRQUNySSxJQUFLLENBQUMsVUFBVSxFQUNoQjtZQUNDLElBQUssVUFBVSxFQUNmO2dCQUNDLGFBQWEsQ0FBRSxNQUFNLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBRSxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBRSxDQUFFLENBQUM7YUFDcEU7aUJBRUQ7Z0JBQ0MsYUFBYSxDQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUUsQ0FBRSxDQUFDO2FBQzNFO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxvQkFBb0IsQ0FBRSxRQUFnQjtRQUU5QyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFFLEtBQUssQ0FBQyxFQUFFO1lBRXBDLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUVyQyxJQUFLLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUM3QjtnQkFDQyxhQUFhLENBQUMsT0FBTyxDQUFFLENBQUUsT0FBTyxFQUFFLEtBQUssRUFBRyxFQUFFO29CQUUzQyxJQUFLLEtBQUssS0FBSyxDQUFDLEVBQ2hCO3dCQUNDLE9BQU8sQ0FBQyxTQUFTLENBQUUsc0JBQXNCLENBQUUsRUFBRSxRQUFRLENBQUUsOENBQThDLENBQUUsQ0FBQztxQkFDeEc7eUJBQ0ksSUFBSyxLQUFLLEtBQUssYUFBYSxDQUFDLE1BQU0sR0FBRSxDQUFDLEVBQzNDO3dCQUNDLE9BQU8sQ0FBQyxTQUFTLENBQUUsc0JBQXNCLENBQUUsRUFBRSxRQUFRLENBQUUsaURBQWlELENBQUUsQ0FBQztxQkFDM0c7eUJBRUQ7d0JBQ0MsT0FBTyxDQUFDLFNBQVMsQ0FBRSxzQkFBc0IsQ0FBRSxFQUFFLFFBQVEsQ0FBRSxpREFBaUQsQ0FBRSxDQUFDO3FCQUMzRztnQkFDRixDQUFDLENBQUUsQ0FBQzthQUNKO2lCQUNJLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQ25DO2dCQUNDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUUsc0JBQXNCLENBQUUsRUFBRSxRQUFRLENBQUUsZ0RBQWdELENBQUUsQ0FBQzthQUNuSDtRQUNGLENBQUMsQ0FBRSxDQUFDO0lBRUwsQ0FBQztBQUNGLENBQUMsRUFuNUJTLGNBQWMsS0FBZCxjQUFjLFFBbTVCdkIifQ==