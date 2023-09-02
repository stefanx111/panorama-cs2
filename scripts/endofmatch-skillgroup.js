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
        if (current_rating < 1 && matchesNeeded > 0) {
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
            _m_cP.SetDialogVariableInt('num_matches', matchesNeeded);
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
                        _m_pauseBeforeEnd = 3.0;
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
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE');
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
        if (oData.new_rating === 0) {
            RatingEmblem.SetXuid(options);
            let winLossStyle = GetWinLossStyle(oData);
            _m_cP.FindChildInLayoutFile('jsRatingEmblem').SwitchClass('winloss', winLossStyle + '-anim');
            PremierRankText(oData);
            SpeedLinesAnim(winLossStyle);
            RatingEmblemAnim(oData, options, winLossStyle);
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE');
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
        $.Schedule(.25, () => {
            let speedLines = _m_cP.FindChildInLayoutFile('id-eom-premier-speed-lines');
            speedLines.SetMovie("file://{resources}/videos/speed_lines.webm");
            speedLines.SwitchClass('winloss', winLossStyle);
            speedLines.SetControls('none');
            speedLines.Play();
        });
    }
    function RatingEmblemAnim(oData, options, winLossStyle) {
        $.Schedule(.75, () => {
            RatingEmblem.SetXuid(options);
            PremierRankText(oData);
            elPanel.SwitchClass('tier', RatingEmblem.GetTierColorClass(_m_cP.FindChildInLayoutFile('jsRatingEmblem')));
        });
        let elPanel = _m_cP.FindChildInLayoutFile('id-eom-skillgroup-premier-bg');
        elPanel.SwitchClass('winloss', winLossStyle);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5kb2ZtYXRjaC1za2lsbGdyb3VwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW5kb2ZtYXRjaC1za2lsbGdyb3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsNkNBQTZDO0FBQzdDLHdDQUF3QztBQUN4QyxxREFBcUQ7QUFDckQsc0NBQXNDO0FBZ0N0QyxJQUFVLGNBQWMsQ0FvYnZCO0FBcGJELFdBQVUsY0FBYztJQUl2QixJQUFJLGlCQUFpQixHQUFHLEdBQUcsQ0FBQztJQUM1QixJQUFJLEtBQUssR0FBbUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBSWhFLFNBQVMsSUFBSSxDQUFHLEdBQVc7SUFHM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRTNCLFNBQVMsVUFBVTtRQVFsQixJQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUM5QixPQUFPLEtBQUssQ0FBQztRQUVkLE1BQU0sRUFBRSxDQUFDO1FBRVQsSUFBSyxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBRSxLQUFLLENBQUUsRUFDL0M7WUFDQyxPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsSUFBSSxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxVQUFVLEVBQ2xEO1lBQ0MsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUVELElBQUksZUFBZSxHQUFHLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBRSxLQUFLLENBQUUsQ0FBQztRQUM3RCxJQUFJLGlCQUFpQixHQUFHLGVBQWUsQ0FBRSxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBRSxDQUFDO1FBRTVFLElBQUssQ0FBQyxpQkFBaUI7WUFDdEIsT0FBTyxLQUFLLENBQUM7UUFFZCxJQUFJLEtBQUssR0FBcUI7WUFDN0IsY0FBYyxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDMUMsUUFBUSxFQUFFLGlCQUFpQixD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