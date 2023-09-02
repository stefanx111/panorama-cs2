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
        $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', UpdateName);
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
    function UpdateName(xuid) {
        let elList = _m_elPickBanPanel.FindChildInLayoutFile('id-team-vote-team-teammates');
        let elAvatar = elList.FindChildInLayoutFile(xuid);
        if (elAvatar) {
            elAvatar.SetDialogVariable('teammate_name', FriendsListAPI.GetFriendName(xuid));
        }
    }
})(PremierPickBan || (PremierPickBan = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfcHJlbWllcl9waWNrX2Jhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX3ByZW1pZXJfcGlja19iYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyxpREFBaUQ7QUFDakQsZ0RBQWdEO0FBQ2hELGlEQUFpRDtBQUNqRCwrQ0FBK0M7QUFDL0MsOENBQThDO0FBQzlDLDRDQUE0QztBQUM1QyxzREFBc0Q7QUFFdEQsSUFBVSxjQUFjLENBZzZCdkI7QUFoNkJELFdBQVUsY0FBYztJQUV2QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDeEIsSUFBSSxTQUFTLEdBQVcsQ0FBQyxDQUFDO0lBQzFCLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDO0lBRS9CLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQztJQUN6QixNQUFNLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDekIsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBSWxCLE1BQU0sU0FBUyxHQUFHLENBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBRSxDQUFDO0lBQy9CLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixDQUFFLENBQUM7SUFRN0YsU0FBZ0IsSUFBSTtRQUVuQixDQUFDLENBQUMseUJBQXlCLENBQUUsNENBQTRDLEVBQUUsYUFBYSxDQUFFLENBQUM7UUFDM0YsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDJDQUEyQyxFQUFFLFVBQVUsQ0FBRSxDQUFDO1FBT3ZGLG9CQUFvQixFQUFFLENBQUM7UUFDdkIsSUFBSSxFQUFFLENBQUM7UUFDUCxhQUFhLEVBQUUsQ0FBQztRQUNoQiw0QkFBNEIsRUFBRSxDQUFDO1FBRS9CLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDJCQUEyQixDQUFtQixDQUFDO1FBQzVHLElBQUssV0FBVyxDQUFDLFlBQVksRUFBRSxFQUMvQjtZQUNDLGVBQWUsRUFBRSxDQUFDO1NBQ2xCO2FBRUQ7WUFDQyxDQUFDLENBQUMsb0JBQW9CLENBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUUsQ0FBQztTQUN0RTtRQUVELElBQUksVUFBVSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHlCQUF5QixDQUFhLENBQUM7UUFFakcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEVBQUUsY0FBYyxVQUFVLENBQUMsaUJBQWlCLENBQUUsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsaUNBQWlDLENBQUUsRUFBRSxLQUFLLENBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBRSxDQUFDO0lBQ3hKLENBQUM7SUE1QmUsbUJBQUksT0E0Qm5CLENBQUE7SUFFRCxTQUFTLElBQUk7UUFFWixpQkFBaUIsQ0FBQyxXQUFXLENBQUUsTUFBTSxFQUFFLElBQUksQ0FBRSxDQUFDO0lBQy9DLENBQUM7SUFFRCxTQUFTLG9CQUFvQjtRQUU1QixJQUFJLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxpQ0FBaUMsQ0FBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hHLFNBQVMsQ0FBQyxPQUFPLENBQUUsS0FBSyxDQUFDLEVBQUU7WUFFMUIsS0FBSyxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxFQUFFLENBQUUsQ0FBQztRQUMvQyxDQUFDLENBQUUsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLGFBQWE7UUFFckIsSUFBSSxTQUFTLEdBQUcsU0FBUyxLQUFLLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUM5RCxpQkFBaUIsQ0FBRSxTQUFTLENBQUUsQ0FBQztRQUUvQixTQUFTLEdBQUcsYUFBYSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQzVDLElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEtBQUssQ0FBRSxHQUFHLENBQUUsQ0FBQztRQUUvRCxpQkFBaUIsQ0FBQyxXQUFXLENBQUUsZ0JBQWdCLEVBQUUsd0JBQXdCLEdBQUcsU0FBUyxDQUFFLENBQUM7UUFFeEYsSUFBSSxjQUFjLEdBQXNCO1lBQ3ZDLE1BQU0sRUFBRSxLQUFLO1lBQ2IsSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsa0JBQWtCO1NBQ3pCLENBQUM7UUFFRixjQUFjLENBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBRSxDQUFDO1FBRTVDLElBQUksV0FBVyxHQUFzQjtZQUNwQyxNQUFNLEVBQUUsSUFBSTtZQUNaLElBQUksRUFBRSxTQUFTO1lBQ2YsS0FBSyxFQUFFLG1CQUFtQjtTQUMxQixDQUFDO1FBRUYsY0FBYyxDQUFFLFdBQVcsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUN6Qyx5QkFBeUIsRUFBRSxDQUFDO1FBQzVCLHNCQUFzQixFQUFFLENBQUM7UUFDekIsZUFBZSxDQUFFLFNBQVMsQ0FBRSxDQUFDO1FBQzdCLGtCQUFrQixFQUFFLENBQUM7UUFDckIsVUFBVSxFQUFFLENBQUM7SUFDZCxDQUFDO0lBRUQsU0FBUyxrQkFBa0I7UUFFMUIsSUFBSSxPQUFPLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUscUJBQXFCLENBQUUsQ0FBQztRQUMvRSxJQUFLLFNBQVMsR0FBRyxDQUFDLEVBQ2xCO1lBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxTQUFTLEVBQUMsa0NBQWtDLENBQUUsQ0FBQTtZQUNuRSxPQUFPO1NBQ1A7UUFFRCxJQUFLLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxFQUNoRjtZQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7U0FDbEU7YUFFRDtZQUNDLE9BQU8sQ0FBQyxXQUFXLENBQUUsU0FBUyxFQUFFLCtCQUErQixDQUFDLENBQUM7U0FDakU7SUFDRixDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBRyxTQUFpQjtRQUU3QyxJQUFLLFNBQVMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxJQUFJLFNBQVMsSUFBSSxDQUFDLEVBQ2pEO1lBQ0MsQ0FBQyxDQUFDLGFBQWEsQ0FBRSwrQkFBK0IsRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFFLENBQUM7U0FDMUY7YUFDSSxJQUFLLFNBQVMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUNwQztZQUNDLENBQUMsQ0FBQyxhQUFhLENBQUUsK0JBQStCLEVBQUUsOEJBQThCLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBRSxDQUFDO1NBQ2pHO0lBQ0YsQ0FBQztJQUVELFNBQVMsc0JBQXNCO1FBRTlCLElBQUksU0FBUyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLGlDQUFpQyxDQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEcsU0FBUyxDQUFDLE9BQU8sQ0FBRSxLQUFLLENBQUMsRUFBRTtZQUUxQixJQUFJLGNBQWMsR0FBRyxRQUFRLENBQUUsS0FBSyxDQUFDLGtCQUFrQixDQUFFLFlBQVksRUFBRSxFQUFFLENBQUUsQ0FBRSxDQUFDO1lBQzlFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxvQkFBb0IsR0FBRyxjQUFjLENBQUUsQ0FBRSxDQUFDO1lBQ2hHLEtBQUssQ0FBQyxXQUFXLENBQUUsZ0NBQWdDLEVBQUUsVUFBVSxFQUFFLElBQUksY0FBYyxLQUFLLFNBQVMsQ0FBRSxDQUFDO1lBQ3BHLEtBQUssQ0FBQyxXQUFXLENBQUUsaUNBQWlDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsSUFBSSxjQUFjLEtBQUssU0FBUyxDQUFFLENBQUM7WUFDdEcsS0FBSyxDQUFDLFdBQVcsQ0FBRSxnQ0FBZ0MsRUFBRSxjQUFjLEdBQUcsU0FBUyxDQUFFLENBQUM7WUFDbEYsS0FBSyxDQUFDLFdBQVcsQ0FBRSxpQ0FBaUMsRUFBRSxjQUFjLEdBQUcsU0FBUyxDQUFFLENBQUM7UUFDcEYsQ0FBQyxDQUFFLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxVQUFVO1FBRWxCLE9BQU8sU0FBUyxHQUFHLENBQUMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBU3ZDLENBQUM7SUFFRCxTQUFTLDRCQUE0QjtRQUVwQyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDbkIsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxFQUFFLEVBQUUsR0FBRyxFQUFFO1lBRXBCLElBQUksY0FBYyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHdCQUF3QixHQUFHLFNBQVMsQ0FBRSxDQUFDO1lBQ3JHLElBQUssY0FBYyxFQUNuQjtnQkFDQyxJQUFJLGNBQWMsR0FBRyxhQUFhLENBQUMsK0JBQStCLEVBQUUsQ0FBQztnQkFDckUsY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELGNBQWMsQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7Z0JBRTlFLElBQUksZUFBZSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFFLENBQUUsY0FBYyxHQUFHLGtCQUFrQixFQUFFLENBQUUsR0FBRyxHQUFHLENBQUUsQ0FBQztnQkFDMUYsY0FBYyxDQUFDLHFCQUFxQixDQUFFLHlCQUF5QixDQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLEdBQUcsR0FBRyxDQUFDO2dCQUV0RyxJQUFLLGNBQWMsR0FBRyxDQUFDLElBQUksVUFBVSxLQUFLLENBQUMsRUFDM0M7b0JBQ0MsQ0FBQyxDQUFDLGFBQWEsQ0FBRSwrQkFBK0IsRUFBRSx5QkFBeUIsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFFLENBQUM7b0JBQzVGLFVBQVUsRUFBRSxDQUFBO2lCQUNaOztvQkFDSSxDQUFFLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDdEI7b0JBQ0MsVUFBVSxHQUFHLENBQUMsQ0FBQztpQkFDZjthQUNEO1lBRUQsNEJBQTRCLEVBQUUsQ0FBQztRQUNoQyxDQUFDLENBQUUsQ0FBQztJQUNMLENBQUM7SUFBQSxDQUFDO0lBRUYsU0FBUyxrQkFBa0I7UUFFMUIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLFFBQVMsU0FBUyxFQUNsQjtZQUNDLEtBQUssQ0FBQztnQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLE1BQU07WUFDUCxLQUFLLENBQUM7Z0JBQ0wsT0FBTyxHQUFHLENBQUMsQ0FBQztnQkFDWixNQUFNO1lBQ1AsS0FBSyxDQUFDO2dCQUNMLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2IsTUFBTTtZQUNQLEtBQUssQ0FBQztnQkFDTCxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNiLE1BQU07WUFDUCxLQUFLLENBQUM7Z0JBQ0wsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDYixNQUFNO1lBQ1AsS0FBSyxDQUFDO2dCQUNMLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2IsTUFBTTtZQUNQLEtBQUssQ0FBQztnQkFDTCxPQUFPLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLE1BQU07WUFDUDtnQkFDQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO2dCQUNaLE1BQU07U0FDUDtRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBRyxTQUFrQjtRQUU1QyxJQUFJLFNBQVMsR0FBRyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQzdHLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxnQ0FBZ0MsR0FBRyxTQUFTLENBQUUsQ0FBQyxDQUFDO1lBQzlFLENBQUUsMkJBQTJCLEdBQUcsU0FBUyxDQUFFLENBQUM7UUFFN0MsSUFBSSxPQUFPLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsMEJBQTBCLENBQWEsQ0FBQztRQVEvRixpQkFBaUIsQ0FBQyxXQUFXLENBQUUsV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFFLENBQUM7UUFDekQsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsNEJBQTRCLENBQUUsQ0FBQyxXQUFXLENBQUUsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFFLENBQUM7UUFDMUcsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFFdkIsSUFBSyxTQUFTLEVBQ2Q7WUFDQyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDLFlBQVksQ0FBRSxnQ0FBZ0MsQ0FBRSxDQUFDO1NBQ2pIO1FBRUQsSUFBSyxTQUFTLEVBQ2Q7WUFDQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUUsZ0NBQWdDLEdBQUcsU0FBUyxDQUFFLENBQUM7WUFDMUUsT0FBTztTQUNQO1FBRUQsSUFBSSxXQUFXLEdBQUcsZUFBZSxFQUFFLENBQUMsTUFBTSxDQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUMsTUFBTSxDQUFDO1FBQ3pFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsV0FBVyxDQUFFLENBQUM7UUFDcEQsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFFLDJCQUEyQixHQUFHLFNBQVMsRUFBRSxPQUFPLENBQUUsQ0FBQztJQUMvRSxDQUFDO0lBRUQsU0FBUyxjQUFjLENBQUcsV0FBOEIsRUFBRSxTQUFpQjtRQUUxRSxJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDO1FBQ2hDLElBQUksS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFFOUIsSUFBSyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDeEI7WUFDQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDekM7Z0JBQ0MsTUFBTSxjQUFjLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsS0FBSyxHQUFHLENBQUMsQ0FBRSxDQUFDO2dCQUM1RSxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFFLGdCQUFnQixDQUFvQixDQUFDO2dCQUVoRixJQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFDNUI7b0JBQ0MsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO29CQUNuQixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7b0JBQ25CLElBQUksZUFBZSxHQUFHLE9BQU8sQ0FBQztvQkFFOUIsSUFBSyxXQUFXLENBQUMsTUFBTSxFQUN2Qjt3QkFDQyxJQUFJLElBQUksR0FBZSxRQUFRLENBQUUsQ0FBQyxDQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQzt3QkFDMUQsSUFBSSxNQUFNLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBRSxJQUFJLEVBQUUsY0FBYyxDQUFFLENBQUM7d0JBQzFELFNBQVMsR0FBRyxZQUFZLENBQUMscUJBQXFCLENBQUUsTUFBTSxDQUFFLENBQUM7d0JBQ3pELFNBQVMsR0FBRyxzQkFBc0IsR0FBRyxTQUFTLEdBQUcsUUFBUSxDQUFDO3dCQUMxRCxRQUFRLENBQUMsaUJBQWlCLENBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUUsd0JBQXdCLEdBQUcsSUFBSSxDQUFFLENBQUUsQ0FBQzt3QkFDeEYsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7d0JBRWpDLElBQUksWUFBWSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFhLENBQUM7d0JBQzVGLFlBQVksQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7d0JBQ3hELGVBQWUsR0FBRyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO3FCQUNwRTt5QkFFRDt3QkFDQyxTQUFTLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBRSxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxDQUFFLENBQUUsQ0FBQzt3QkFDcEUsU0FBUyxHQUFHLGtEQUFrRCxHQUFHLFNBQVMsR0FBRyxRQUFRLENBQUM7d0JBQ3RGLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxZQUFZLEdBQUcsU0FBUyxDQUFFLENBQUUsQ0FBQzt3QkFDakYsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7d0JBRWxDLElBQUksWUFBWSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFhLENBQUM7d0JBQzVGLFlBQVksQ0FBQyxpQkFBaUIsQ0FBRSxjQUFjLEVBQUUsS0FBSyxDQUFFLENBQUM7cUJBQ3hEO29CQUVELElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO29CQUM5RSxhQUFhLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7b0JBQ2hELGFBQWEsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDO29CQUNuRCxhQUFhLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUM7b0JBQzdDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztvQkFFdEQsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUUsQ0FBQyxDQUFFLENBQUM7b0JBQ3ZDLFFBQVEsQ0FBQyxhQUFhLENBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFFLFFBQVEsQ0FBRSxDQUFFLENBQUM7aUJBQzdFO2dCQUdELElBQUssU0FBUyxFQUNkO29CQUNDLFFBQVEsQ0FBQyxXQUFXLENBQUUsY0FBYyxFQUFFLEtBQUssQ0FBRSxDQUFDO29CQUM5QyxRQUFRLENBQUMsV0FBVyxDQUFFLGVBQWUsRUFBRSxLQUFLLENBQUUsQ0FBQztpQkFDL0M7Z0JBRUQsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLHNCQUFzQixFQUFFLEtBQUssYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBRTNGLElBQUssV0FBVyxDQUFDLE1BQU0sRUFDdkI7b0JBQ0MsUUFBUSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUM7b0JBRTVCLElBQUssU0FBUyxLQUFLLENBQUMsRUFDcEI7d0JBQ0MsUUFBUSxDQUFDLFdBQVcsQ0FBRSxzQkFBc0IsRUFBRSxRQUFRLENBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxDQUFFLEtBQUssZUFBZSxFQUFFLENBQUUsQ0FBQztxQkFDaEc7aUJBQ0Q7cUJBRUQ7b0JBQ0MsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixDQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztvQkFDeEYsUUFBUSxDQUFDLFdBQVcsQ0FBRSxrQkFBa0IsR0FBRyxRQUFRLEVBQUUsUUFBUSxLQUFLLEVBQUUsQ0FBRSxDQUFDO29CQUN2RSxRQUFRLENBQUMsT0FBTyxHQUFHLFFBQVEsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDO29CQUUvQyxJQUFLLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFDMUM7d0JBQ0MsY0FBYyxDQUFDLFdBQVcsQ0FBRSxrQ0FBa0MsRUFBRSxRQUFRLEtBQUssTUFBTSxDQUFFLENBQUM7d0JBQ3RGLGNBQWMsQ0FBQyxXQUFXLENBQUUsWUFBWSxFQUFFLFFBQVEsS0FBSyxNQUFNLENBQUUsQ0FBQzt3QkFHaEUsSUFBSSxZQUFZLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQWEsQ0FBQzt3QkFDNUYsWUFBWSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7cUJBQzdCO2lCQUNEO2dCQUVELElBQUksTUFBTSxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBRSxRQUFRLENBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBRSxDQUFFLENBQUM7Z0JBQ3hGLElBQUssTUFBTSxFQUNYO29CQUNDLElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLEtBQUssQ0FBRSxHQUFHLENBQUUsQ0FBQztvQkFDbkUsUUFBUSxDQUFDLFdBQVcsQ0FBRSxzQ0FBc0MsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBRSxDQUFDO2lCQUNsSDtnQkFFRCxpQkFBaUIsQ0FBRSxRQUFRLEVBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDO2dCQUN2RCxnQkFBZ0IsQ0FBRSxjQUFjLEVBQUUsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsQ0FBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDO2FBQ3hFO1NBQ0Q7SUFDRixDQUFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBRyxRQUF3QjtRQUVyRCxJQUFJLGFBQWEsR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUN0QyxJQUFJLGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUUsUUFBUSxDQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUUsQ0FBRSxDQUFDO1FBR25GLElBQUssZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLEVBQzVCO1lBRUMsYUFBYSxDQUFDLHVCQUF1QixDQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUUsQ0FBQztZQUN4RSxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLE9BQU8sQ0FBRSxDQUFDO1lBQzVFLE9BQU87U0FDUDtRQUdELElBQUssUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFDOUI7WUFDQyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUMzQjtnQkFDQyxJQUFJLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSxtQkFBbUIsR0FBRyxDQUFDLENBQUUsQ0FBQyxTQUFTLENBQUUsZ0JBQWdCLENBQW9CLENBQUM7Z0JBQy9ILEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUN0QixLQUFLLENBQUMsV0FBVyxDQUFFLGVBQWUsRUFBRSxLQUFLLENBQUUsQ0FBQzthQUM1QztZQUVELGFBQWEsQ0FBQyx1QkFBdUIsQ0FBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFFLENBQUUsQ0FBQztZQUUxRixRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUN4QixRQUFRLENBQUMsV0FBVyxDQUFFLGVBQWUsRUFBRSxJQUFJLENBQUUsQ0FBQztZQUM5QyxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE9BQU8sQ0FBRSxDQUFDO1lBQzNFLE9BQU87U0FDUDtRQUdELElBQUksUUFBUSxHQUFHLG9CQUFvQixDQUFFLGFBQWEsQ0FBRSxDQUFDO1FBQ3JELElBQUssUUFBUSxLQUFLLElBQUksRUFDdEI7WUFFQyxhQUFhLENBQUMsdUJBQXVCLENBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBRSxDQUFFLENBQUM7WUFFakcsUUFBUSxDQUFDLFdBQVcsQ0FBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLENBQUUsQ0FBQztZQUNyRCxRQUFRLENBQUMsV0FBVyxDQUFFLGVBQWUsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFFLENBQUM7WUFDdkQsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLENBQUUsQ0FBQztTQUMxRTthQUVEO1lBRUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDekIsSUFBSSxLQUFLLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsNkJBQTZCLENBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoRyxLQUFLLENBQUMsT0FBTyxDQUFFLFVBQVcsR0FBRztnQkFFNUIsSUFBSyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBRSxLQUFLLENBQUUsS0FBSyxDQUFDLENBQUMsRUFDbkM7b0JBRUMsSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBRSxnQkFBZ0IsQ0FBb0IsQ0FBQztvQkFDbkUsSUFBSyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sRUFDOUM7d0JBRUMsR0FBRyxDQUFDLFlBQVksQ0FBRSwrQkFBK0IsQ0FBRSxDQUFDO3FCQUNwRDtpQkFDRDtZQUNGLENBQUMsQ0FBRSxDQUFDO1lBQ0osQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSw0QkFBNEIsRUFBRSxPQUFPLENBQUUsQ0FBQztTQUNoRjtJQUNGLENBQUM7SUFFRCxTQUFTLGVBQWU7UUFFdkIsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO1FBRXZCLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFDM0M7WUFDQyxJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsc0JBQXNCLENBQUUsQ0FBQyxDQUFFLENBQUM7WUFDdkQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5QixhQUFhLENBQUMsSUFBSSxDQUFFLE1BQU0sQ0FBRSxDQUFDO1NBQzdCO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUcsYUFBdUI7UUFFdEQsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQzlDO1lBQ0MsSUFBSyxhQUFhLENBQUUsQ0FBQyxDQUFFLEtBQUssQ0FBQyxDQUFDLEVBQzlCO2dCQUNDLE9BQU8sQ0FBQyxDQUFDO2FBQ1Q7U0FDRDtRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFNBQVMsZUFBZTtRQUV2QixJQUFLLFNBQVMsS0FBSyxDQUFDLEVBQ3BCO1lBQ0MsT0FBTyxDQUFDLENBQUM7U0FDVDtRQUVELElBQUssU0FBUyxLQUFLLENBQUMsRUFDcEI7WUFDQyxPQUFPLENBQUMsQ0FBQztTQUNUO1FBRUQsSUFBSyxTQUFTLEtBQUssQ0FBQyxFQUNwQjtZQUNDLE9BQU8sQ0FBQyxDQUFDO1NBQ1Q7UUFFRCxJQUFLLFNBQVMsS0FBSyxDQUFDLEVBQ3BCO1lBQ0MsT0FBTyxDQUFDLENBQUM7U0FDVDtRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUcsUUFBdUIsRUFBRSxNQUFhLEVBQUUsUUFBZ0I7UUFHcEYsSUFBSSxhQUFhLENBQUMsc0JBQXNCLENBQUUsUUFBUSxDQUFFLE1BQU0sQ0FBRSxDQUFDLElBQUksUUFBUSxFQUN6RTtZQUNDLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUUsOEJBQThCLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSw2QkFBNkIsQ0FBRSxDQUFBO1lBQ3ZJLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBRSxRQUFRLEVBQUUsVUFBVSxDQUFFLENBQUM7WUFFbkQsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLHNCQUFzQixFQUFFLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1lBQ25FLFFBQVEsQ0FBQyxXQUFXLENBQUUsdUNBQXVDLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBRSxNQUFNLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBRSxDQUFDO1lBQ25HLFFBQVEsQ0FBQyxXQUFXLENBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUUsQ0FBQztTQUNsRTthQUVEO1lBQ0MsUUFBUSxDQUFDLFdBQVcsQ0FBRSx1Q0FBdUMsRUFBRSxLQUFLLENBQUUsQ0FBQztTQUN2RTtJQUNGLENBQUM7SUFFRCxTQUFTLGNBQWM7UUFFdEIsSUFBSSxPQUFPLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBQ2hFLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUUsUUFBUSxDQUFFLEVBQUUsQ0FBRSxDQUFFLEtBQUssTUFBTSxDQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7UUFDN0csT0FBTyxZQUFZLENBQUMsYUFBYSxDQUFFLFFBQVEsQ0FBRSxTQUFTLENBQUUsQ0FBRSxDQUFDO0lBQzVELENBQUM7SUFFRCxTQUFTLGVBQWU7UUFFdkIsSUFBSSxTQUFTLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDakQsSUFBSSxVQUFVLEdBQUcsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFJekMsSUFBSSxhQUFhLEdBQUcsQ0FBRSxhQUFhLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxhQUFhLENBQUMsd0JBQXdCLEVBQUUsQ0FBRTtZQUNqSCxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFHMUIsT0FBTyxhQUFhLENBQUM7SUFFdEIsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUcsS0FBYyxFQUFFLE1BQWMsRUFBRSxRQUFnQjtRQUUzRSxJQUFJLFdBQVcsR0FBRyxhQUFhLENBQUMsc0JBQXNCLENBQUUsTUFBTSxDQUFFLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1FBRzlFLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFFLHdCQUF3QixDQUFFLENBQUM7UUFDakYsa0JBQWtCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUU3QyxJQUFLLENBQUMsUUFBUSxFQUNkO1lBQ0MsT0FBTztTQUNQO1FBRUQsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQzVDO1lBR0MsVUFBVSxDQUFFLFdBQVcsQ0FBRSxDQUFDLENBQUUsRUFBRSxrQkFBa0IsQ0FBRSxDQUFDO1NBQ25EO0lBQ0YsQ0FBQztJQUVELFNBQVMsVUFBVSxDQUFHLElBQVksRUFBRSxXQUFvQjtRQUV2RCxJQUFLLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJO1lBQ3pCLE9BQU87UUFFUixJQUFLLElBQUksRUFDVDtZQUNDLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUUsQ0FBQztZQUMzRCxRQUFRLENBQUMsa0JBQWtCLENBQUUsY0FBYyxDQUFFLENBQUM7WUFFOUMsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFFLGVBQWUsQ0FBdUIsQ0FBQztZQUNyRixXQUFXLENBQUMsbUJBQW1CLENBQUUsSUFBSSxDQUFFLENBQUM7WUFFeEMsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLHFCQUFxQixDQUFFLElBQUssRUFBRSxnQkFBZ0IsQ0FBRSxDQUFDO1lBQ25GLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUUsTUFBTSxDQUFFLFlBQVksQ0FBRSxDQUFFLENBQUM7WUFFdEUsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLEdBQUcsWUFBWSxHQUFHLEdBQUcsQ0FBQztZQUVqRSxRQUFRLENBQUMsaUJBQWlCLENBQUUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxhQUFhLENBQUUsSUFBSSxDQUFFLENBQUUsQ0FBQztZQUVwRixPQUFPLFFBQVEsQ0FBQztTQUNoQjtJQUNGLENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBRyxTQUFpQixFQUFFLFFBQWlCO1FBRTVELElBQUksaUJBQWlCLEdBQUcsYUFBYSxDQUFDLGlDQUFpQyxDQUFFLFNBQVMsQ0FBRSxDQUFDO1FBR3JGLElBQUssQ0FBQyxRQUFRO1lBQ2IsT0FBTztRQUVSLElBQUksT0FBTyxHQUNYO1lBQ0MsVUFBVSxFQUFFLFFBQVE7WUFDcEIsV0FBVyxFQUFFLFNBQThCO1lBQzNDLEtBQUssRUFBRSxJQUFJO1lBQ1gsWUFBWSxFQUFFLEtBQUs7WUFDbkIsbUJBQW1CLEVBQUUsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsT0FBTyxFQUFFO1NBQ3pELENBQUM7UUFFRixZQUFZLENBQUMsT0FBTyxDQUFFLE9BQU8sQ0FBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFHLFdBQW9CLEVBQUUsYUFBb0I7UUFFdkUsSUFBSSxRQUFRLEdBQUcsYUFBYSxLQUFLLENBQUMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7UUFFeEQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBRSxDQUFDO1FBQy9FLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDO1FBRXZELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSwyQkFBMkIsQ0FBYSxDQUFDO1FBQ3ZGLE9BQU8sQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEdBQUcsUUFBUSxDQUFDLFFBQVEsRUFBRSxHQUFJLE1BQU0sQ0FBQyxDQUFDO1FBRXpGLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxTQUFTLHlCQUF5QjtRQUVqQyxJQUFLLFNBQVMsSUFBSSxDQUFDLEVBQ25CO1lBQ0MsSUFBSSxlQUFlLEdBQUcsY0FBYyxFQUFFLENBQUM7WUFDdkMsSUFBSSxTQUFTLEdBQUcsa0RBQWtELEdBQUcsZUFBZSxHQUFHLFFBQVEsQ0FBQztZQUVoRyxxQkFBcUIsQ0FBRSxJQUFJLEVBQUUsUUFBUSxDQUFFLENBQUM7WUFDeEMscUJBQXFCLENBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBRSxDQUFDO1lBRXJDLENBQUMsQ0FBQyxRQUFRLENBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFFbkIsSUFBSSxTQUFTLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsdUJBQXVCLENBQWEsQ0FBQTtnQkFDN0YsU0FBUyxDQUFDLFFBQVEsQ0FBRSxxQ0FBcUMsR0FBRyxlQUFlLEdBQUcsTUFBTSxDQUFFLENBQUM7Z0JBQ3ZGLFNBQVMsQ0FBQyxRQUFRLENBQUUsTUFBTSxDQUFFLENBQUM7Z0JBRTdCLElBQUksVUFBVSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHdCQUF3QixDQUFFLENBQUM7Z0JBQ3JGLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQztnQkFDN0MsVUFBVSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7Z0JBQ2hELFVBQVUsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztnQkFDMUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2dCQUNwQyxVQUFVLENBQUMsS0FBSyxDQUFDLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztnQkFFNUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQyxRQUFRLENBQUUsTUFBTSxDQUFFLENBQUM7WUFJbkYsQ0FBQyxDQUFFLENBQUM7WUFFSixJQUFLLFNBQVMsS0FBSyxDQUFDLEVBQ3BCO2dCQUNDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUMxQztvQkFDQyxJQUFLLFFBQVEsQ0FBRSxTQUFTLENBQUUsQ0FBQyxDQUFFLENBQUUsS0FBSyxlQUFlLEVBQUUsRUFDckQ7d0JBQ0MsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFFLENBQUMsQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7d0JBQy9DLElBQUksV0FBVyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixHQUFHLElBQUksQ0FBNkIsQ0FBQzt3QkFDckgsV0FBVyxDQUFDLFdBQVcsQ0FBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUUsQ0FBQztxQkFDcEU7aUJBQ0Q7YUFDRDtTQUNEO0lBQ0YsQ0FBQztJQUVELFNBQVMscUJBQXFCLENBQUcsSUFBZ0IsRUFBRSxJQUFXO1FBRTdELElBQUksV0FBVyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixHQUFHLElBQUksQ0FBNkIsQ0FBQztRQUVySCxJQUFJLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFFLElBQUksRUFBRSxjQUFjLENBQUUsQ0FBQztRQUMxRCxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBRSxDQUFDO1FBQzlELElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUUsSUFBSSxFQUFFLElBQUksQ0FBRSxDQUFDO1FBRWxELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxrQ0FBa0MsQ0FBRSxNQUFNLENBQUUsQ0FBQztRQUN2RSxRQUFRLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUM3QixRQUFRLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQztRQUNqQyxjQUFjLENBQUMsZ0JBQWdCLENBQUUsUUFBUSxDQUFFLENBQUM7SUFDN0MsQ0FBQztJQUVELFNBQVMsWUFBWTtRQUNwQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUUsY0FBYyxDQUFDLDRDQUE0QyxDQUFFLEdBQUcsQ0FBRSxDQUFFLENBQUM7SUFDMUYsQ0FBQztJQUVELFNBQVMsZ0NBQWdDLENBQUMsTUFBYztRQUV2RCxJQUFJLGtCQUFrQixHQUFHLEVBQXlCLENBQUM7UUFDbkQsSUFBSSxNQUFNLEdBQVcsR0FBRyxDQUFDO1FBQ3pCLElBQUksT0FBTyxHQUFHLFlBQVksRUFBRSxDQUFDO1FBRzdCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvRCxJQUFJLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxpQ0FBaUMsQ0FBRSxDQUFDLENBQUUsQ0FBQztZQUU3RSxJQUFJLFVBQVUsR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxVQUFVLElBQUksTUFBTTtnQkFDdkIsU0FBUztZQUVWLE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxDQUFDLE9BQU8sQ0FBRSxPQUFPLENBQUMsRUFBRTtnQkFFMUIsSUFBSSxVQUFVLEdBQVcsTUFBTSxDQUFFLElBQUksQ0FBQyxLQUFLLENBQUUsaUJBQWlCLENBQUUsT0FBTyxDQUFFLElBQUksQ0FBQyxDQUFFLENBQUUsQ0FBQztnQkFDbkYsSUFBSSxZQUFZLEdBQVcsTUFBTSxDQUFFLElBQUksQ0FBQyxLQUFLLENBQUUsa0JBQWtCLENBQUUsT0FBTyxDQUFFLElBQUksQ0FBQyxDQUFFLENBQUUsQ0FBQztnQkFDdEYsa0JBQWtCLENBQUUsT0FBTyxDQUFFLEdBQUcsVUFBVSxHQUFHLFlBQVksQ0FBQztZQUMzRCxDQUFDLENBQUUsQ0FBQztTQUNKO1FBTUQsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxlQUFlO1FBRXZCLElBQUksaUJBQWlCLEdBQUcsZ0NBQWdDLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDekUsSUFBSSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFFLGlCQUFpQixDQUFHLENBQUMsR0FBRyxDQUFVLENBQUUsT0FBTyxFQUFHLEVBQUUsR0FBRyxPQUFPLE1BQU0sQ0FBRSxpQkFBaUIsQ0FBRSxPQUFPLENBQUcsR0FBRyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBRWhKLElBQUksa0JBQWtCLEdBQUcsZ0NBQWdDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkUsSUFBSSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFFLGlCQUFpQixDQUFHLENBQUMsR0FBRyxDQUFVLENBQUUsT0FBTyxFQUFHLEVBQUUsR0FBRyxPQUFPLE1BQU0sQ0FBRSxrQkFBa0IsQ0FBRSxPQUFPLENBQUcsR0FBRyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBRWxKLElBQUksbUJBQW1CLEdBQUcsQ0FBRSxJQUFJLENBQUMsR0FBRyxDQUFFLEdBQUcsaUJBQWlCLEVBQUUsR0FBRyxrQkFBa0IsRUFBRSxDQUFDLENBQUUsQ0FBRSxDQUFDO1FBRXpGLE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDJCQUEyQixDQUFtQixDQUFDO1FBQzVHLGNBQWMsQ0FBRSxXQUFXLEVBQUUsbUJBQW1CLENBQUUsQ0FBQztRQUduRCxJQUFLLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLE9BQU8sRUFDakQ7WUFDQyxZQUFZLENBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1lBQzNFLFlBQVksQ0FBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixDQUFFLENBQUM7U0FDM0U7YUFFRDtZQUNDLFlBQVksQ0FBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixDQUFFLENBQUM7WUFDMUUsWUFBWSxDQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLENBQUUsQ0FBQztTQUM1RTtJQUNGLENBQUM7SUFFRCxTQUFTLGNBQWMsQ0FBRyxXQUEwQixFQUFFLG1CQUEwQjtRQUUvRSxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFbEIsV0FBVyxDQUFDLE9BQU8sQ0FBRSxlQUFlLENBQUUsQ0FBQztRQUN2QyxNQUFNLE9BQU8sR0FBeUI7WUFDckMsU0FBUyxFQUFFLFdBQVc7WUFDdEIsWUFBWSxFQUFFLFdBQVc7WUFDekIsZUFBZSxFQUFFLENBQUM7WUFDbEIsY0FBYyxFQUFFLEdBQUc7WUFDbkIsa0JBQWtCLEVBQUUsR0FBRztZQUN2QixlQUFlLEVBQUUsV0FBVztZQUM1QixtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGtCQUFrQixFQUFFLEdBQUc7WUFDdkIsZUFBZSxFQUFFLG1CQUFtQixHQUFHLENBQUM7WUFDeEMsZ0JBQWdCLEVBQUUsR0FBRztZQUNyQixLQUFLLEVBQUUsSUFBSTtTQUNYLENBQUM7UUFDRixXQUFXLENBQUMsZUFBZSxDQUFFLE9BQU8sQ0FBRSxDQUFDO1FBQ3ZDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBRSxPQUFPLENBQUUsQ0FBQztJQUM1QyxDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsV0FBeUIsRUFBRSxlQUF3QixFQUFFLFFBQWdCLEVBQUUsR0FBVztRQUd2RyxNQUFNLGFBQWEsR0FBRztZQUNyQixVQUFVLEVBQUUsNEJBQTRCO1lBQ3hDLGdCQUFnQixFQUFFLDRCQUE0QjtTQUM5QyxDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUc7WUFDdkIsVUFBVSxFQUFFLDBCQUEwQjtZQUN0QyxnQkFBZ0IsRUFBRSwwQkFBMEI7U0FDNUMsQ0FBQTtRQUVELGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBRSxDQUFDO1FBRXRELE1BQU0sV0FBVyxHQUEwQjtZQUMxQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsVUFBVTtZQUM1RSxjQUFjLEVBQUUsQ0FBQztZQUNqQixhQUFhLEVBQUUsRUFBRTtZQUNqQixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGdCQUFnQjtZQUM5RixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGdCQUFnQjtTQUM5RixDQUFDO1FBRUYsV0FBVyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQVVELFNBQVMsVUFBVTtRQUVsQixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxRQUFRLEdBQUc7WUFDZCxvQkFBb0I7WUFDcEIsb0JBQW9CO1lBQ3BCLG9CQUFvQjtZQUNwQixvQkFBb0I7WUFDcEIsb0JBQW9CO1lBQ3BCLG9CQUFvQjtZQUNwQixvQkFBb0I7WUFDcEIsb0JBQW9CO1lBQ3BCLEVBQUU7WUFDRixvQkFBb0I7U0FDcEIsQ0FBQztRQUVGLElBQUksV0FBVyxHQUFHO1lBQ2pCLENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztZQUNELENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztZQUNELENBQUM7WUFDRCxDQUFDO1lBQ0QsQ0FBQztZQUNELENBQUM7U0FDRCxDQUFDO1FBRUYsSUFBSSxVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3hDLElBQUksUUFBUSxHQUFlLEVBQUUsQ0FBQztRQUM5QixJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUVuRCxJQUFLLGFBQWEsRUFDbEI7WUFDQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1NBQ1o7UUFFRCxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUNoQztZQUNDLElBQUssYUFBYSxFQUNsQjtnQkFDQyxJQUFLLFdBQVcsQ0FBRSxDQUFDLENBQUUsSUFBSSxDQUFDLEVBQzFCO29CQUNDLElBQUksTUFBTSxHQUFhO3dCQUN0QixJQUFJLEVBQUUsUUFBUSxDQUFFLENBQUMsQ0FBRTt3QkFDbkIsTUFBTSxFQUFFLFdBQVcsQ0FBRSxDQUFDLENBQUU7d0JBQ3hCLEdBQUcsRUFBRSxDQUFDO3dCQUNOLFFBQVEsRUFBRSxRQUFRLENBQUUsQ0FBQyxDQUFFLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7cUJBQ3JELENBQUM7b0JBR0YsUUFBUSxDQUFDLElBQUksQ0FBRSxNQUFNLENBQUUsQ0FBQztpQkFDeEI7YUFDRDtpQkFFRDtnQkFDQyxJQUFLLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBRSxDQUFDLENBQUUsSUFBSSxDQUFDLEVBQ2xEO29CQUNDLElBQUksTUFBTSxHQUFhO3dCQUN0QixJQUFJLEVBQUUsYUFBYSxDQUFDLG9CQUFvQixDQUFFLENBQUMsQ0FBRTt3QkFDN0MsTUFBTSxFQUFFLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBRSxDQUFDLENBQUU7d0JBQ2hELEdBQUcsRUFBRSxDQUFDO3dCQUNOLFFBQVEsRUFBRSxhQUFhLENBQUMsb0JBQW9CLENBQUUsQ0FBQyxDQUFFLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7cUJBQy9FLENBQUM7b0JBRUYsUUFBUSxDQUFDLElBQUksQ0FBRSxNQUFNLENBQUUsQ0FBQztpQkFDeEI7YUFDRDtTQUNEO1FBRUQsSUFBSyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDeEI7WUFDQyxPQUFPO1NBQ1A7UUFFRCxJQUFJLFdBQVcsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFFLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBSXZGLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUN6QztZQUNDLGdCQUFnQixDQUFFLFFBQVEsQ0FBRSxDQUFDLENBQUUsRUFBRSxXQUFXLENBQUUsQ0FBQztTQUMvQztRQUVELG9CQUFvQixDQUFFLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFFLENBQUUsQ0FBQztRQUNqRyxvQkFBb0IsQ0FBRSxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSw0QkFBNEIsQ0FBRSxDQUFFLENBQUM7SUFDakcsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUcsTUFBZSxFQUFFLFdBQWtCO1FBRzlELElBQUksVUFBVSxHQUFHLENBQUUsV0FBVyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBRSxJQUFJLENBQUUsV0FBVyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBRSxDQUFDO1FBRWxHLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQzFCLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFFLENBQUMsQ0FBQztZQUMxRSxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBRSw0QkFBNEIsQ0FBRSxDQUFDO1FBRXpFLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSw0QkFBNEIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFFLENBQUM7UUFFakcsSUFBSyxDQUFDLFdBQVcsRUFDakI7WUFDQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FDMUIsT0FBTyxFQUNQLFFBQVEsRUFDUiw0QkFBNEIsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUM1QyxFQUFFLEtBQUssRUFBRSxrQ0FBa0MsRUFBRSxDQUM3QyxDQUFDO1NBQ0Y7UUFFRCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSxNQUFNLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUM7UUFDckksSUFBSyxDQUFDLFVBQVUsRUFDaEI7WUFDQyxJQUFLLFVBQVUsRUFDZjtnQkFDQyxhQUFhLENBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUUsQ0FBRSxDQUFDO2FBQ3BFO2lCQUVEO2dCQUNDLGFBQWEsQ0FBRSxNQUFNLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFFLENBQUUsQ0FBQzthQUMzRTtTQUNEO0lBQ0YsQ0FBQztJQUVELFNBQVMsb0JBQW9CLENBQUUsUUFBZ0I7UUFFOUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBRSxLQUFLLENBQUMsRUFBRTtZQUVwQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFFckMsSUFBSyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDN0I7Z0JBQ0MsYUFBYSxDQUFDLE9BQU8sQ0FBRSxDQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUcsRUFBRTtvQkFFM0MsSUFBSyxLQUFLLEtBQUssQ0FBQyxFQUNoQjt3QkFDQyxPQUFPLENBQUMsU0FBUyxDQUFFLHNCQUFzQixDQUFFLEVBQUUsUUFBUSxDQUFFLDhDQUE4QyxDQUFFLENBQUM7cUJBQ3hHO3lCQUNJLElBQUssS0FBSyxLQUFLLGFBQWEsQ0FBQyxNQUFNLEdBQUUsQ0FBQyxFQUMzQzt3QkFDQyxPQUFPLENBQUMsU0FBUyxDQUFFLHNCQUFzQixDQUFFLEVBQUUsUUFBUSxDQUFFLGlEQUFpRCxDQUFFLENBQUM7cUJBQzNHO3lCQUVEO3dCQUNDLE9BQU8sQ0FBQyxTQUFTLENBQUUsc0JBQXNCLENBQUUsRUFBRSxRQUFRLENBQUUsaURBQWlELENBQUUsQ0FBQztxQkFDM0c7Z0JBQ0YsQ0FBQyxDQUFFLENBQUM7YUFDSjtpQkFDSSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUNuQztnQkFDQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFFLHNCQUFzQixDQUFFLEVBQUUsUUFBUSxDQUFFLGdEQUFnRCxDQUFFLENBQUM7YUFDbkg7UUFDRixDQUFDLENBQUUsQ0FBQztJQUVMLENBQUM7SUFFRCxTQUFTLFVBQVUsQ0FBRyxJQUFZO1FBRWpDLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFFLDZCQUE2QixDQUFFLENBQUE7UUFDckYsSUFBSSxRQUFRLEdBQUcsTUFBTSxDQUFDLHFCQUFxQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRXBELElBQUssUUFBUSxFQUNiO1lBQ0MsUUFBUSxDQUFDLGlCQUFpQixDQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsYUFBYSxDQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7U0FDcEY7SUFDRixDQUFDO0FBQ0YsQ0FBQyxFQWg2QlMsY0FBYyxLQUFkLGNBQWMsUUFnNkJ2QiJ9