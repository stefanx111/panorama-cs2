"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="mock_adapter.ts" />
/// <reference path="rank_skillgroup_particles.ts" />
/// <reference path="endofmatch.ts" />
var EOM_Skillgroup;
(function (EOM_Skillgroup) {
    var _m_pauseBeforeEnd = 1.5;
    var _m_cP = $.GetContextPanel();
    function _msg(msg) {
    }
    _m_cP.Data().m_retries = 0;
    function _DisplayMe() {
        if (!_m_cP || !_m_cP.IsValid())
            return false;
        _Reset();
        if (!MockAdapter.bSkillgroupDataReady(_m_cP)) {
            return false;
        }
        if (MyPersonaAPI.GetElevatedState() !== 'elevated') {
            return false;
        }
        let oSkillgroupData = MockAdapter.SkillgroupDataJSO(_m_cP);
        let localPlayerUpdate = oSkillgroupData[MockAdapter.GetLocalPlayerXuid()];
        if (!localPlayerUpdate)
            return false;
        let oData = {
            current_rating: localPlayerUpdate.new_rank,
            num_wins: localPlayerUpdate.num_wins,
            old_rating: localPlayerUpdate.old_rank,
            old_rating_info: '',
            old_rating_desc: '',
            old_image: '',
            new_rating: localPlayerUpdate.new_rank,
            new_rating_info: '',
            new_rating_desc: '',
            new_image: '',
            rating_change: localPlayerUpdate.rank_change,
            mode: localPlayerUpdate.rank_type,
            model: ''
        };
        let current_rating = Math.max(Number(oData.new_rating), Number(oData.old_rating));
        let winsNeededForRank = SessionUtil.GetNumWinsNeededForRank(oData.mode);
        let matchesNeeded = winsNeededForRank - oData.num_wins;
        _m_cP.SetDialogVariable('rating_type', $.Localize('#SFUI_GameMode' + oData.mode));
        if (current_rating < 1 && matchesNeeded <= 0) {
            switch (oData.mode) {
                case 'Wingman':
                case 'Competitive':
                    let modePrefix = (oData.mode === 'Wingman') ? 'wingman' : 'skillgroup';
                    oData.old_rating_info = $.Localize('#eom-skillgroup-expired', _m_cP);
                    oData.old_image = 'file://{images}/icons/skillgroups/' + modePrefix + '_expired.svg';
                    break;
                case 'Premier':
                    oData.old_rating_info = $.Localize('#eom-skillgroup-expired', _m_cP);
                    break;
            }
        }
        else if (current_rating < 1) {
            _m_cP.SetDialogVariableInt('winsneeded', matchesNeeded);
            let winNeededString = (matchesNeeded === 1) ? '#eom-skillgroup-needed-win' : '#eom-skillgroup-needed-wins';
            switch (oData.mode) {
                case 'Wingman':
                case 'Competitive':
                    let modePrefix = (oData.mode === 'Wingman') ? 'wingman' : 'skillgroup';
                    oData.old_rating_info = $.Localize(winNeededString, _m_cP);
                    oData.old_image = 'file://{images}/icons/skillgroups/' + modePrefix + '0.svg';
                    break;
                case 'Premier':
                    break;
            }
        }
        else if (current_rating >= 1) {
            switch (oData.mode) {
                case 'Wingman':
                case 'Competitive':
                    let modePrefix = (oData.mode === 'Wingman') ? 'wingman' : 'skillgroup';
                    oData.old_image = 'file://{images}/icons/skillgroups/' + modePrefix + oData.old_rating + '.svg';
                    oData.old_rating_info = $.Localize('#RankName_' + oData.old_rating);
                    oData.old_rating_desc = $.Localize('#eom-skillgroup-name', _m_cP);
                    if (oData.old_rating < oData.new_rating) {
                        oData.new_image = 'file://{images}/icons/skillgroups/' + modePrefix + oData.new_rating + '.svg';
                        oData.new_rating_info = $.Localize('#RankName_' + oData.new_rating);
                        oData.new_rating_desc = $.Localize('#eom-skillgroup-name', _m_cP);
                        _m_pauseBeforeEnd = 3.0;
                        _LoadAndShowNewRankReveal(oData);
                    }
                    break;
                case 'Premier':
                    if (oData.old_rating !== oData.new_rating) {
                        _m_pauseBeforeEnd = 5.0;
                        _LoadAndShowNewRankReveal(oData);
                    }
                    break;
            }
        }
        if (oData.mode === 'Premier') {
            _FilloutPremierRankData(oData);
            _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-bg').SwitchClass('tier', RatingEmblem.GetTierColorClass(_m_cP.FindChildInLayoutFile('jsRatingEmblem')));
        }
        else {
            _FilloutRankData(oData);
        }
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-bg').SetHasClass('hide', oData.mode === 'Premier');
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-bg').SetHasClass('hide', oData.mode !== 'Premier');
        _m_cP.AddClass('eom-skillgroup-show');
        return true;
    }
    ;
    function _LoadAndShowNewRankReveal(oData) {
        $.Schedule(1, _RevealNewIcon.bind(undefined, oData));
    }
    function _RevealNewIcon(oData) {
        if (!_m_cP || !_m_cP.IsValid())
            return;
        if (oData.mode === 'Competitive' || oData.mode === 'Wingman') {
            _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__image').SetImage(oData.new_image);
            _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem').AddClass("uprank-anim");
            _m_cP.SetDialogVariable('rank-info', oData.new_rating_info);
            let elParticleFlare = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__pfx--above');
            let aParticleSettings = GetSkillGroupSettings(oData.new_rating, oData.mode);
            elParticleFlare.SetParticleNameAndRefresh(aParticleSettings.particleName);
            elParticleFlare.SetControlPoint(aParticleSettings.cpNumber, aParticleSettings.cpValue[0], aParticleSettings.cpValue[1], 1);
            elParticleFlare.StartParticles();
            let elParticleAmb = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__pfx--below');
            let aParticleAmbSettings = GetSkillGroupAmbientSettings(oData.new_rating, oData.mode);
            elParticleAmb.SetParticleNameAndRefresh(aParticleAmbSettings.particleName);
            elParticleAmb.SetControlPoint(aParticleAmbSettings.cpNumber, aParticleAmbSettings.cpValue[0], aParticleAmbSettings.cpValue[1], 1);
            elParticleAmb.StartParticles();
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE');
        }
        else if (oData.mode === 'Premier') {
            let options = {
                root_panel: _m_cP.FindChildInLayoutFile('jsRatingEmblem'),
                xuid: MockAdapter.GetLocalPlayerXuid(),
                leaderboard_details: { score: oData.new_rating, matchesWon: oData.num_wins },
                do_fx: false,
                presentation: 'digital',
                eom_digipanel_class_override: GetEmblemStyleOverride(oData.new_rating),
                full_details: true,
            };
            let winLossStyle = GetWinLossStyle(oData);
            _m_cP.FindChildInLayoutFile('jsRatingEmblem').SwitchClass('winloss', winLossStyle + '-anim');
            PremierRankText(oData);
            SpeedLinesAnim(winLossStyle);
            RatingEmblemAnim(oData, options, winLossStyle);
        }
    }
    function _Reset() {
        let elDesc = _m_cP.FindChildInLayoutFile("id-eom-skillgroup__current_wins_desc");
        elDesc.text = '';
        _m_cP.SetDialogVariable('total-wins', '');
        _m_cP.SetDialogVariable('rank-info', '');
        let elRankDesc = _m_cP.FindChildInLayoutFile("id-eom-skillgroup__current__title");
        elRankDesc.AddClass('hidden');
        elRankDesc.text = '';
        let elImage = _m_cP.FindChildInLayoutFile("id-eom-skillgroup-emblem--current__image");
        elImage.AddClass('hidden');
        elImage.SetImage('');
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__image').SetImage('');
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem').RemoveClass("uprank-anim");
        _m_cP.RemoveClass('eom-skillgroup-show');
        let elParticleFlare = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__pfx--above');
        elParticleFlare.StopParticlesImmediately(true);
        let elParticleAmb = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-emblem--new__pfx--below');
        elParticleAmb.StopParticlesImmediately(true);
    }
    function _FilloutRankData(oData) {
        SetWinDescString(oData, _m_cP.FindChildInLayoutFile("id-eom-skillgroup__current_wins_desc"));
        _m_cP.SetDialogVariable('total-wins', oData.num_wins.toString());
        _m_cP.SetDialogVariable('rank-info', oData.old_rating_info);
        let elRankDesc = _m_cP.FindChildInLayoutFile("id-eom-skillgroup__current__title");
        if (oData.old_rating_desc) {
            elRankDesc.RemoveClass('hidden');
            elRankDesc.text = oData.old_rating_desc;
        }
        if (oData.mode === 'Competitive' || oData.mode === 'Wingman') {
            let elImage = _m_cP.FindChildInLayoutFile("id-eom-skillgroup-emblem--current__image");
            elImage.RemoveClass('hidden');
            elImage.SetImage(oData.old_image);
            let elParticleFlare = _m_cP.FindChildInLayoutFile('id-eom-skillgroup--current__pfx--above');
            let aParticleSettings = GetSkillGroupSettings(oData.old_rating, oData.mode);
            elParticleFlare.SetParticleNameAndRefresh(aParticleSettings.particleName);
            elParticleFlare.SetControlPoint(aParticleSettings.cpNumber, aParticleSettings.cpValue[0], aParticleSettings.cpValue[1], 0);
            elParticleFlare.StartParticles();
            let elParticleAmb = _m_cP.FindChildInLayoutFile('id-eom-skillgroup--current__pfx--below');
            let aParticleAmbSettings = GetSkillGroupAmbientSettings(oData.old_rating, oData.mode);
            elParticleAmb.SetParticleNameAndRefresh(aParticleAmbSettings.particleName);
            elParticleAmb.SetControlPoint(aParticleAmbSettings.cpNumber, aParticleAmbSettings.cpValue[0], aParticleAmbSettings.cpValue[1], 0);
            elParticleAmb.StartParticles();
        }
    }
    function GetEmblemStyleOverride(new_rating) {
        return new_rating < 1000 ? 'digitpanel-container-3-digit-offset' : new_rating < 10000 ? 'digitpanel-container-4-digit-offset' : '';
    }
    function _FilloutPremierRankData(oData) {
        let options = {
            root_panel: _m_cP.FindChildInLayoutFile('jsRatingEmblem'),
            xuid: MockAdapter.GetLocalPlayerXuid(),
            leaderboard_details: { score: oData.old_rating, matchesWon: oData.num_wins },
            do_fx: false,
            rating_type: oData.mode,
            presentation: 'digital',
            eom_digipanel_class_override: GetEmblemStyleOverride(oData.old_rating),
            full_details: true,
        };
        if (oData.rating_change === 0) {
            RatingEmblem.SetXuid(options);
            let winLossStyle = GetWinLossStyle(oData);
            _m_cP.FindChildInLayoutFile('jsRatingEmblem').SwitchClass('winloss', winLossStyle + '-anim');
            PremierRankText(oData);
            SpeedLinesAnim(winLossStyle);
            RatingEmblemAnim(oData, options, winLossStyle);
            return;
        }
        RatingEmblem.SetXuid(options);
    }
    function PremierRankText(oData) {
        SetWinDescString(oData, _m_cP.FindChildInLayoutFile("id-eom-skillgroup-premier-wins-desc"));
        _m_cP.SetDialogVariable('total-wins', oData.num_wins.toString());
        let desc;
        let nPoints;
        if (oData.new_rating > 0 && oData.old_rating < 1) {
            desc = $.Localize('#cs_rating_rating_established');
            nPoints = 0;
        }
        else {
            desc = RatingEmblem.GetEomDescText(_m_cP.FindChildInLayoutFile('jsRatingEmblem'));
            nPoints = Math.abs(oData.rating_change);
        }
        if (desc && desc !== '') {
            _m_cP.SetDialogVariable('premier-desc', desc);
        }
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-desc').SetHasClass('hide', desc === '' || !desc);
        let sPointsString = '';
        sPointsString = oData.new_rating >= oData.old_rating ? "#eom-premier-points-gained" : "#eom-premier-points-lost";
        _m_cP.SetDialogVariableInt('premier_points', nPoints);
        _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-points').text = $.Localize(sPointsString, _m_cP);
    }
    function GetWinLossStyle(oData) {
        let winLossStyle = ((oData.new_rating === 0) || (oData.new_rating > 0 && oData.old_rating < 1) || !oData.rating_change) ?
            'no-points' : oData.rating_change < 0 ?
            'lost-points' : oData.rating_change > 0 ?
            'gain-points' : '';
        return winLossStyle;
    }
    function SpeedLinesAnim(winLossStyle) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.EOM.SlideIn', 'MOUSE');
        $.Schedule(.25, () => {
            if (!_m_cP || !_m_cP.IsValid())
                return;
            let speedLines = _m_cP.FindChildInLayoutFile('id-eom-premier-speed-lines');
            if (speedLines && speedLines.IsValid()) {
                speedLines.SetMovie("file://{resources}/videos/speed_lines.webm");
                speedLines.SwitchClass('winloss', winLossStyle);
                speedLines.SetControls('none');
                speedLines.Play();
            }
        });
    }
    function RatingEmblemAnim(oData, options, winLossStyle) {
        PlayPremierRankSound(winLossStyle);
        $.Schedule(.75, () => {
            if (!elPanel || !elPanel.IsValid() || !options.root_panel || !options.root_panel.IsValid())
                return;
            RatingEmblem.SetXuid(options);
            PremierRankText(oData);
            elPanel.SwitchClass('tier', RatingEmblem.GetTierColorClass(_m_cP.FindChildInLayoutFile('jsRatingEmblem')));
        });
        let elPanel = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-bg');
        elPanel.SwitchClass('winloss', winLossStyle);
    }
    function PlayPremierRankSound(winLossStyle) {
        if (winLossStyle === 'no-points') {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.EOM.RankNeutral', 'MOUSE');
        }
        else if (winLossStyle === 'lost-points') {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.EOM.RankDown', 'MOUSE');
        }
        else {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UI.Premier.EOM.RankUp', 'MOUSE');
        }
    }
    function SetWinDescString(oData, elLabel) {
        elLabel.SetDialogVariableInt("matcheswon", oData.num_wins);
        elLabel.text = $.Localize('#eom-skillgroup-win', _m_cP);
    }
    function Start() {
        if (_DisplayMe()) {
            EndOfMatch.SwitchToPanel('eom-skillgroup');
            EndOfMatch.StartDisplayTimer(_m_pauseBeforeEnd);
            $.Schedule(_m_pauseBeforeEnd, _End);
        }
        else {
            _End();
            return;
        }
    }
    EOM_Skillgroup.Start = Start;
    function _End() {
        EndOfMatch.ShowNextPanel();
    }
    function Shutdown() {
    }
    EOM_Skillgroup.Shutdown = Shutdown;
    function name() {
        return 'eom-skillgroup';
    }
    EOM_Skillgroup.name = name;
})(EOM_Skillgroup || (EOM_Skillgroup = {}));
(function () {
    EndOfMatch.RegisterPanelObject({
        name: 'eom-skillgroup',
        Start: EOM_Skillgroup.Start,
        Shutdown: EOM_Skillgroup.Shutdown
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC1za2lsbGdyb3VwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW5kb2ZtYXRjaC1za2lsbGdyb3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsNkNBQTZDO0FBQzdDLHdDQUF3QztBQUN4QyxxREFBcUQ7QUFDckQsc0NBQXNDO0FBZ0N0QyxJQUFVLGNBQWMsQ0E2Y3ZCO0FBN2NELFdBQVUsY0FBYztJQUV2QixJQUFJLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztJQUM1QixJQUFJLEtBQUssR0FBbUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBSWhFLFNBQVMsSUFBSSxDQUFHLEdBQVc7SUFHM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRTNCLFNBQVMsVUFBVTtRQVFsQixJQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUM5QixPQUFPLEtBQUssQ0FBQztRQUVkLE1BQU0sRUFBRSxDQUFDO1FBRVQsSUFBSyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBRSxLQUFLLENBQUUsRUFDL0M7WUFDQyxPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsSUFBSSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxVQUFVLEVBQ2xEO1lBQ0MsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUVELElBQUksZUFBZSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxLQUFLLENBQUUsQ0FBQztRQUM3RCxJQUFJLGlCQUFpQixHQUFHLGVBQWUsQ0FBRSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBRSxDQUFDO1FBRTVFLElBQUssQ0FBQyxpQkFBaUI7WUFDdEIsT0FBTyxLQUFLLENBQUM7UUFFZCxJQUFJLEtBQUssR0FBcUI7WUFDN0IsY0FBYyxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDMUMsUUFBUSxFQUFFLGlCQUFpQixD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