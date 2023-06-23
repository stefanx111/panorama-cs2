/// <reference path="../csgo.d.ts" />
/// <reference path="../avatar.ts" />
/// <reference path="../digitpanel.ts" />
/// <reference path="../common/formattext.ts" />
/// <reference path="../common/scheduler.ts" />
/// <reference path="../common/teamcolor.ts" />
var HudWinPanel = (function () {
    let _m_elCanvas;
    let _m_elPlotContainer;
    let _m_canvasHeightInPixels;
    let _m_canvasWidthInPixels;
    let _m_teamPerspective;
    let _m_localXuid;
    let _m_timeslice;
    let _m_bInit = false;
    let _m_xRange;
    let _m_prevChance;
    let _m_ListeningForGameEvents = false;
    let _m_bCanvasIsReady = false;
    let _m_arrTimelineEvents = [];
    let _m_arrPersonalDamageEvents = [];
    let _m_winningTeam;
    const TOTAL_TIME_REVEAL = 5;
    const BEAM_ONLY_ON_DAMAGE = false;
    function _Init() {
        if (_m_bInit)
            return;
        $.RegisterForUnhandledEvent('HudWinPanel_ShowRoundEndReport', _ShowRoundEndReport);
        $.RegisterForUnhandledEvent('Player_Hurt', _OnReceivePlayerHurt);
        $.RegisterForUnhandledEvent('Player_Death', _OnReceivePlayerDeath);
        _m_bInit = true;
    }
    function _SetMVPFlairImage(xuid) {
        const flairDefIdx = FriendsListAPI.GetFriendDisplayItemDefFeatured(xuid);
        const flairItemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(flairDefIdx, 0);
        const imagePath = InventoryAPI.GetItemInventoryImage(flairItemId);
        const elBgImage = $.GetContextPanel().FindChildInLayoutFile('MedalBackground');
        elBgImage.style.backgroundImage = (imagePath) ? 'url("file://{images}' + imagePath + '_large.png")' : 'none';
        elBgImage.style.backgroundPosition = '50% 50%';
        elBgImage.style.backgroundSize = 'cover';
        elBgImage.style.backgroundRepeat = 'no-repeat';
        elBgImage.TriggerClass('WinPanelRow__BG__AnimBg--anim');
    }
    function _OnReceivePlayerHurt(attackerXuid, victimXuid, damage) {
        if (!_m_ListeningForGameEvents)
            return;
        if (!_m_bCanvasIsReady) {
            $.Schedule(0.5, () => _OnReceivePlayerHurt(attackerXuid, victimXuid, damage));
            return;
        }
        if (_m_localXuid != attackerXuid && _m_localXuid != victimXuid)
            return;
        const wasDamageGiven = _m_localXuid == attackerXuid;
        const healthRemoved = wasDamageGiven ? damage : 0;
        const numHits = wasDamageGiven ? 1 : 0;
        const returnedHealthRemoved = wasDamageGiven ? 0 : damage;
        const returnHits = wasDamageGiven ? 0 : 1;
        _UpdateDamage(wasDamageGiven ? victimXuid : attackerXuid, healthRemoved, numHits, returnedHealthRemoved, returnHits);
    }
    function _OnReceivePlayerDeath(xuid) {
        if (!_m_ListeningForGameEvents)
            return;
        if (!_m_bCanvasIsReady) {
            $.Schedule(0.5, () => _OnReceivePlayerDeath(xuid));
            return;
        }
        const elEvent = $.GetContextPanel().FindChildTraverse('Event-' + xuid);
        if (!elEvent)
            return;
        const elDeath = elEvent.FindChildTraverse('Death');
        if (!elDeath)
            return;
        elDeath.visible = true;
    }
    function _TransformPointIntoCanvasSpace(point) {
        const denom = _m_xRange;
        const x = _m_canvasWidthInPixels / denom * point[0];
        const y = _m_canvasHeightInPixels - (_m_canvasHeightInPixels / 100 * point[1]);
        return [x, y];
    }
    function _FlipY(plotPoint) {
        return [plotPoint[0], _m_canvasHeightInPixels - plotPoint[1]];
    }
    function _ConvertToLocalOdds(terroristOdds) {
        if (_m_teamPerspective == 2)
            return terroristOdds;
        else
            return (100 - terroristOdds);
    }
    function _ShowRoundEndReport(msg) {
        if (!msg)
            return;
        _Reset();
        _m_ListeningForGameEvents = true;
        if (!_m_elCanvas.IsSizeValid()) {
            $.Schedule(0.5, () => _ShowRoundEndReport.bind(msg));
            return;
        }
        _m_bCanvasIsReady = true;
        $.GetContextPanel().SetDialogVariable('player_name', GameStateAPI.GetPlayerName(_m_localXuid));
        _m_canvasHeightInPixels = _m_elCanvas.actuallayoutheight / _m_elCanvas.actualuiscale_y;
        _m_canvasWidthInPixels = _m_elCanvas.actuallayoutwidth / _m_elCanvas.actualuiscale_x;
        const oInitialConditions = msg.init_conditions;
        const nStartingOdds = oInitialConditions.terrorist_odds;
        const arrEvents = msg.all_rer_event_data;
        _m_arrTimelineEvents = _ExtractTimelineEvents(arrEvents);
        _m_arrPersonalDamageEvents = _ExtractLivingEnemies(arrEvents);
        _m_winningTeam = '';
        if (_m_arrTimelineEvents.length > 0) {
            const FinalTOdds = _m_arrTimelineEvents[_m_arrTimelineEvents.length - 1]['terrorist_odds'];
            _m_winningTeam = FinalTOdds == 100 ? 2 : FinalTOdds == 0 ? 3 : '';
        }
        _m_xRange = _m_arrTimelineEvents.length + _m_arrPersonalDamageEvents.length + 1.5;
        _m_timeslice = TOTAL_TIME_REVEAL / _m_xRange;
        const x = 0;
        const y = _ConvertToLocalOdds(nStartingOdds);
        const startPoint = [x, y];
        const startPlotPoint = _TransformPointIntoCanvasSpace(startPoint);
        const points = [];
        points.push(startPoint);
        const plotPoints = [];
        plotPoints.push(startPlotPoint);
        _PlotStartingOdds(nStartingOdds, startPlotPoint);
        _ProcessTimelineEvents(_m_arrTimelineEvents, points, plotPoints, nStartingOdds);
        const finalPoint = points[points.length - 1];
        _ProcessDamageEvents(_m_arrPersonalDamageEvents, finalPoint[0]);
        const bCT = _m_teamPerspective == 3;
        const drawColor = bCT ? '#B5D4EEaa' : '#EAD18Aaa';
        _m_elCanvas.DrawSoftLinePointsJS(plotPoints.length, plotPoints.flat(), 4, 1.0, drawColor);
        _m_elCanvas.TriggerClass('show-canvas');
        const graphWidth = (_m_arrTimelineEvents.length) / _m_xRange * 100;
        const elGraphGuides = $.GetContextPanel().FindChildTraverse('GraphGuides');
        elGraphGuides.style.width = graphWidth + "%";
        const elLivingBG = $.GetContextPanel().FindChildTraverse('LivingBG');
        elLivingBG.style.width = 100 - graphWidth + "%";
        _Colorize();
        const freezetime = Number(GameInterfaceAPI.GetSettingString('mp_freezetime'));
        const roundRestartDelay = Number(GameInterfaceAPI.GetSettingString('mp_round_restart_delay'));
        const shutdownDelay = roundRestartDelay + freezetime - 1;
        Scheduler.Schedule(shutdownDelay, function () {
            _m_ListeningForGameEvents = false;
            _m_bCanvasIsReady = false;
        });
    }
    function _ExtractTimelineEvents(arrEvents) {
        const arrResults = [];
        arrEvents.forEach(function (oEvent, index) {
            const oVictimData = oEvent['victim_data'];
            const isLivingPlayer = oVictimData && !oVictimData['is_dead'];
            if (!isLivingPlayer)
                arrResults.push(oEvent);
        });
        return arrResults;
    }
    function _ExtractTPersonalDamageEvents(arrEvents) {
        const arrResults = [];
        arrEvents.forEach(function (oEvent, index) {
            const oVictimData = oEvent['victim_data'];
            const isLivingPlayer = oVictimData && !oVictimData['is_dead'];
            const oDamage = _FindDamageDataForPlayer(oEvent, _m_localXuid);
            if (isLivingPlayer && oDamage)
                arrResults.push(oEvent);
        });
        return arrResults;
    }
    function _ExtractLivingEnemies(arrEvents) {
        const arrResults = [];
        arrEvents.forEach(function (oEvent, index) {
            const oVictimData = oEvent['victim_data'];
            const isLivingPlayer = oVictimData && !oVictimData['is_dead'];
            const localTeam = GameStateAPI.GetAssociatedTeamNumber(_m_localXuid);
            const isEnemy = oVictimData && oVictimData['team_number'] != localTeam && (localTeam == 2 || localTeam == 3);
            if (isLivingPlayer && isEnemy)
                arrResults.push(oEvent);
        });
        return arrResults;
    }
    function _ProcessTimelineEvents(arrEvents, points, plotPoints, nStartingOdds) {
        let loopingSfxHandle = null;
        arrEvents.forEach(function (oEvent, index) {
            const x = index + 1;
            const y = _ConvertToLocalOdds(oEvent['terrorist_odds']);
            const point = [x, y];
            const plotPoint = _TransformPointIntoCanvasSpace(point);
            points.push(point);
            plotPoints.push(plotPoint);
            let delta = 0;
            if (index == 0)
                delta = oEvent['terrorist_odds'] - nStartingOdds;
            else
                delta = oEvent['terrorist_odds'] - arrEvents[index - 1]['terrorist_odds'];
            const sfx = delta < 0 ? "UIPanorama.round_report_line_down" : "UIPanorama.round_report_line_up";
            const delay = index * _m_timeslice;
            Scheduler.Schedule(delay, () => {
                _AddDamageToDamagePanel(oEvent, plotPoint);
                _DecoratePoint(oEvent, plotPoint);
                if (loopingSfxHandle)
                    UiToolkitAPI.StopSoundEvent(loopingSfxHandle, 0.1);
                loopingSfxHandle = UiToolkitAPI.PlaySoundEvent(sfx);
            });
        });
        Scheduler.Schedule(_m_arrTimelineEvents.length * _m_timeslice, function () {
            if (loopingSfxHandle)
                UiToolkitAPI.StopSoundEvent(loopingSfxHandle, 0.1);
        });
    }
    function _ProcessDamageEvents(arrEvents, startX) {
        arrEvents.forEach(function (oEvent, index) {
            const x = startX + index + 1;
            const y = 50;
            const plotPoint = _TransformPointIntoCanvasSpace([x, y]);
            const delay = (_m_arrTimelineEvents.length + index) * _m_timeslice;
            Scheduler.Schedule(delay, () => {
                _AddDamageToDamagePanel(oEvent, plotPoint);
                _DecoratePoint(oEvent, plotPoint);
            });
        });
    }
    function _Colorize() {
        const bCT = _m_winningTeam == 3;
        $.GetContextPanel().FindChildrenWithClassTraverse('team-colorize').forEach(el => {
            el.SetHasClass('color-ct', bCT);
            el.SetHasClass('color-t', !bCT);
        });
    }
    function _FindDamageDataForPlayer(oEvent, xuid) {
        const oDamageData = oEvent.all_damage_data;
        const returnObj = {};
        for (let i = 0; i < oDamageData.length; i++) {
            if (oDamageData[i].other_xuid.toString() == xuid)
                Object.assign(returnObj, oDamageData[i]);
        }
        return returnObj;
    }
    function _UpdateDamage(xuid, healthRemoved, numHits, returnHealthRemoved, returnHits) {
        const elDamage = $.GetContextPanel().FindChildTraverse('Damage-' + xuid);
        if (!elDamage)
            return;
        elDamage.healthRemoved += healthRemoved;
        elDamage.healthRemoved = Math.min(elDamage.healthRemoved, 100);
        elDamage.numHits += numHits;
        elDamage.returnHealthRemoved += returnHealthRemoved;
        elDamage.returnHealthRemoved = Math.min(elDamage.returnHealthRemoved, 100);
        elDamage.returnHits += returnHits;
        if ((elDamage.returnHealthRemoved > 0) || (elDamage.healthRemoved > 0)) {
            const elDGiven = elDamage.FindChildTraverse('DamageGiven');
            const elDTaken = elDamage.FindChildTraverse('DamageTaken');
            elDGiven.SetDialogVariable('health_removed', elDamage.healthRemoved.toString());
            elDGiven.SetDialogVariable('num_hits', elDamage.numHits.toString());
            elDTaken.SetDialogVariable('health_removed', elDamage.returnHealthRemoved.toString());
            elDTaken.SetDialogVariable('num_hits', elDamage.returnHits.toString());
            elDGiven.visible = elDamage.healthRemoved > 0;
            elDTaken.visible = elDamage.returnHealthRemoved > 0;
            if (BEAM_ONLY_ON_DAMAGE) {
                const elTeamColorBar = $.GetContextPanel().FindChildTraverse('bar-' + xuid);
                if (elTeamColorBar) {
                    elTeamColorBar.RemoveClass('prereveal');
                }
            }
            const dmgDelay = 0.1;
            Scheduler.Schedule(dmgDelay, () => {
                if (elDamage && elDamage.IsValid())
                    elDamage.RemoveClass('prereveal');
            });
        }
    }
    function _AddDamageToDamagePanel(oEvent, plotPoint) {
        const elDamageContainer = $.GetContextPanel().FindChildTraverse('DamageContainer');
        const oDamage = _FindDamageDataForPlayer(oEvent, _m_localXuid);
        const victimData = oEvent['victim_data'];
        const objectiveData = oEvent['objective_data'];
        if (objectiveData)
            return;
        const elDamage = $.CreatePanel('Panel', elDamageContainer, 'Damage-' + victimData['xuid']);
        elDamage.BLoadLayoutSnippet('snippet-damage');
        elDamage.healthRemoved = 0;
        elDamage.numHits = 0;
        elDamage.returnHealthRemoved = 0;
        elDamage.returnHits = 0;
        elDamage.style.x = plotPoint[0] + "px";
        if (BEAM_ONLY_ON_DAMAGE) {
            const bCT = _m_winningTeam == 3;
            const elTeamColorBar = $.CreatePanel('Panel', _m_elPlotContainer, 'bar-' + victimData['xuid']);
            elTeamColorBar.AddClass('ris-graph__bar');
            elTeamColorBar.AddClass('prereveal');
            elTeamColorBar.SetHasClass('color-ct', bCT);
            elTeamColorBar.SetHasClass('color-t', !bCT);
            elTeamColorBar.style.x = plotPoint[0] + "px";
            elTeamColorBar.style.height = _FlipY(plotPoint)[1] + 70 + "px";
        }
        if (oDamage) {
            const healthRemoved = oDamage.health_removed || 0;
            const nHits = oDamage.num_hits || 0;
            const returnedHealthRemoved = oDamage.return_health_removed || 0;
            const nReturnHits = oDamage.return_num_hits || 0;
            _UpdateDamage(victimData['xuid'], healthRemoved, nHits, returnedHealthRemoved, nReturnHits);
        }
    }
    function _PlotStartingOdds(nStartingOdds, startPlotPoint) {
        const elStartPlot = $.CreatePanel("Panel", _m_elPlotContainer, 'Start');
        elStartPlot.BLoadLayoutSnippet('snippet-starting-odds');
        elStartPlot.style.y = startPlotPoint[1] + "px";
        $.GetContextPanel().SetDialogVariable('starting_chance', _ConvertToLocalOdds(nStartingOdds) + '%');
        _m_prevChance = nStartingOdds;
    }
    function _DecoratePoint(oEvent, plotPoint) {
        const victimData = oEvent['victim_data'];
        const objectiveData = oEvent['objective_data'];
        const key = objectiveData ? objectiveData['type'] : victimData ? victimData['xuid'] : '';
        const elEventPlot = $.CreatePanel("Panel", _m_elPlotContainer, 'Event-' + key);
        elEventPlot.BLoadLayoutSnippet('snippet-event');
        const elEventIcon = elEventPlot.FindChildTraverse('EventIcon');
        const elEventBG = elEventPlot.FindChildTraverse('EventBG');
        const elEventChance = elEventPlot.FindChildTraverse('EventChance');
        const elEventMain = elEventPlot.FindChildTraverse('EventMain');
        const elDeath = elEventPlot.FindChildTraverse('Death');
        const chance = _ConvertToLocalOdds(oEvent['terrorist_odds']);
        if (victimData) {
            const xuid = victimData['xuid'];
            const isBot = victimData['is_bot'];
            const teamNumber = victimData['team_number'];
            const color = victimData['color'];
            const isDead = victimData['is_dead'];
            elEventChance.visible = isDead;
            elDeath.visible = isDead;
            elEventIcon.SetImage("file://{images}/icons/ui/kill.svg");
            elEventIcon.visible = false;
            const elAvatarImage = elEventPlot.FindChildTraverse('Avatar');
            elAvatarImage.PopulateFromPlayerSlot(GameStateAPI.GetPlayerSlot(xuid.toString()));
            const bCT = teamNumber == 3;
            elAvatarImage.SwitchClass('teamstyle', 'team--' + (bCT ? 'CT' : 'TERRORIST'));
            if (!BEAM_ONLY_ON_DAMAGE) {
                const elTeamColorBar = $.CreatePanel('Panel', _m_elPlotContainer, 'bar-' + victimData['xuid']);
                elTeamColorBar.AddClass('ris-graph__bar');
                elTeamColorBar.SetHasClass('color-ct', bCT);
                elTeamColorBar.SetHasClass('color-t', !bCT);
                elTeamColorBar.style.x = plotPoint[0] + "px";
                elTeamColorBar.style.height = _FlipY(plotPoint)[1] + 70 + "px";
            }
            const rgbColor = TeamColor.GetTeamColor(Number(color));
            elEventMain.FindChildTraverse('JsAvatarTeamColor').style.washColor = 'rgb(' + rgbColor + ')';
        }
        else if (objectiveData) {
            const elAvatarImage = elEventPlot.FindChildTraverse('Avatar');
            elAvatarImage.visible = false;
            let src = "";
            let bEventCT = false;
            switch (objectiveData['type']) {
                case 0:
                    src = "file://{images}/icons/ui/bomb_c4.svg";
                    bEventCT = false;
                    break;
                case 1:
                    src = "file://{images}/icons/ui/bomb.svg";
                    bEventCT = false;
                    break;
                case 2:
                    src = "file://{images}/icons/equipment/defuser.svg";
                    bEventCT = true;
                    break;
                case 3:
                    src = "file://{images}/icons/ui/time_exp.svg";
                    bEventCT = true;
                    break;
            }
            elEventIcon.SetImage(src);
            elEventIcon.AddClass('event__icon--objective');
            elEventBG.SetHasClass('color-ct', bEventCT);
            elEventBG.SetHasClass('color-t', !bEventCT);
        }
        const delta = chance - _m_prevChance;
        const deltaSymbol = delta < 0 ? "▼" : delta > 0 ? "▲" : "";
        if (chance == 100) {
            elEventPlot.SetDialogVariable('chance', $.Localize('#ris_win'));
            elEventChance.FindChildTraverse('EventChanceNumber').style.color = '#ffffff';
        }
        else if (chance == 0) {
            elEventPlot.SetDialogVariable('chance', $.Localize('#ris_loss'));
            elEventChance.FindChildTraverse('EventChanceNumber').style.color = '#ffffff';
        }
        else {
            elEventPlot.SetDialogVariable('chance', deltaSymbol + chance + '%');
            elEventChance.FindChildTraverse('EventChanceNumber').style.color = _RemapToTeamColorRGB(chance - _m_prevChance, -20, 20);
        }
        elEventPlot.style.x = plotPoint[0] + "px";
        elEventPlot.style.y = plotPoint[1] + "px";
        if (elEventMain && elEventMain.IsValid())
            elEventMain.RemoveClass('prereveal');
        if (elEventChance && elEventChance.IsValid())
            elEventChance.RemoveClass('prereveal');
        if (elDeath && elDeath.IsValid())
            elDeath.RemoveClass('prereveal');
        const sfx = delta > 0 ? "UIPanorama.round_report_odds_up" : delta < 0 ? "UIPanorama.round_report_odds_dn" : "UIPanorama.round_report_odds_none";
        UiToolkitAPI.PlaySoundEvent(sfx);
        _m_prevChance = chance;
    }
    function _RemapToTeamColorRGB(val, min, max) {
        let frac = Math.min(1, Math.max(0, (val - min) / (max - min)));
        const bCTWon = _m_winningTeam == 3;
        if (bCTWon)
            frac = 1 - frac;
        const R = frac * (234 - 122) + 122;
        const G = 210;
        const B = (1 - frac) * (238 - 139) + 139;
        return 'rgb(' + R + "," + G + "," + B + ")";
    }
    function _RemapToRedGreenRGB(val, min, max) {
        const frac = Math.min(1, Math.max(0, (val - min) / (max - min)));
        return 'rgb(' + (1 - frac) * 255 + "," + frac * 255 + "," + '0' + ")";
        let rgb = 'rgb(200,200,200)';
        if (val >= 20)
            rgb = 'rgb(0,255,0)';
        else if (val > 0)
            rgb = 'rgb(100,255,0)';
        else if (val < -20)
            rgb = 'rgb(255,0,0)';
        else if (val < 0)
            rgb = 'rgb(255,100,0)';
        return rgb;
    }
    function _Reset() {
        const localTeamNumber = GameStateAPI.GetAssociatedTeamNumber(_m_localXuid);
        const bUseInEye = GameStateAPI.IsDemoOrHltv() || (localTeamNumber != 2 && localTeamNumber != 3);
        _m_localXuid = bUseInEye ? GameStateAPI.GetHudPlayerXuid() : GameStateAPI.GetLocalPlayerXuid();
        _m_teamPerspective = (localTeamNumber == 2 || localTeamNumber == 3) ? localTeamNumber : 2;
        const bCT = _m_teamPerspective == 3;
        _m_elCanvas = $.GetContextPanel().FindChildTraverse('RisCanvas');
        _m_elPlotContainer = $.GetContextPanel().FindChildTraverse('RisPlotContainer');
        Scheduler.Cancel();
        _m_arrTimelineEvents = [];
        _m_arrPersonalDamageEvents = [];
        _m_elPlotContainer.RemoveAndDeleteChildren();
        const elDamageContainer = $.GetContextPanel().FindChildTraverse('DamageContainer');
        elDamageContainer.RemoveAndDeleteChildren();
        _m_elCanvas.ClearJS('rgba(0,0,0,0)');
        $.GetContextPanel().SetDialogVariable('team', GameStateAPI.GetTeamClanName(bCT ? 'CT' : 'TERRORIST'));
        const elTeamLogo = $.GetContextPanel().FindChildTraverse('RisTeamLogo');
        if (elTeamLogo) {
            elTeamLogo.SetImage(bCT ? "file://{images}/icons/ui/ct_logo_1c.svg" : "file://{images}/icons/ui/t_logo_1c.svg");
        }
        _Colorize();
    }
    function _OnShow() {
    }
    function _OnHide() {
    }
    return {
        Init: _Init,
        SetMVPFlairImage: _SetMVPFlairImage,
        OnShow: _OnShow,
        OnHide: _OnHide
    };
})();
(function () {
    $.RegisterEventHandler('HudWinPanel_MVP', $.GetContextPanel(), HudWinPanel.SetMVPFlairImage);
    $.RegisterEventHandler('HudWinPanel_Show', $.GetContextPanel(), HudWinPanel.OnShow);
    $.RegisterEventHandler('HudWinPanel_Hide', $.GetContextPanel(), HudWinPanel.OnHide);
    HudWinPanel.Init();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVkd2lucGFuZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodWR3aW5wYW5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMscUNBQXFDO0FBQ3JDLHlDQUF5QztBQUN6QyxnREFBZ0Q7QUFDaEQsK0NBQStDO0FBQy9DLCtDQUErQztBQUUvQyxJQUFJLFdBQVcsR0FBRyxDQUFFO0lBWW5CLElBQUksV0FBdUIsQ0FBQztJQUM1QixJQUFJLGtCQUEyQixDQUFDO0lBRWhDLElBQUksdUJBQStCLENBQUM7SUFDcEMsSUFBSSxzQkFBOEIsQ0FBQztJQUNuQyxJQUFJLGtCQUEwQixDQUFDO0lBQy9CLElBQUksWUFBb0IsQ0FBQztJQUN6QixJQUFJLFlBQW9CLENBQUM7SUFFekIsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLElBQUksU0FBaUIsQ0FBQztJQUN0QixJQUFJLGFBQXFCLENBQUM7SUFDMUIsSUFBSSx5QkFBeUIsR0FBRyxLQUFLLENBQUM7SUFDdEMsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFHOUIsSUFBSSxvQkFBb0IsR0FBNEMsRUFBRSxDQUFDO0lBQ3ZFLElBQUksMEJBQTBCLEdBQTRDLEVBQUUsQ0FBQztJQUU3RSxJQUFJLGNBQTBCLENBQUM7SUFFL0IsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUM7SUFFNUIsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7SUFHbEMsU0FBUyxLQUFLO1FBRWIsSUFBSyxRQUFRO1lBQ1osT0FBTztRQUVSLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxnQ0FBZ0MsRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1FBQ3JGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxhQUFhLEVBQUUsb0JBQW9CLENBQUUsQ0FBQztRQUNuRSxDQUFDLENBQUMseUJBQXlCLENBQUUsY0FBYyxFQUFFLHFCQUFxQixDQUFFLENBQUM7UUFFckUsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNq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