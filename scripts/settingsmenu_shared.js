/// <reference path="csgo.d.ts" />
var SettingsMenuShared = (function () {
    var _ResetControlsRecursive = function (panel) {
        if (panel == null) {
            return;
        }
        if (panel.GetChildCount == undefined) {
            return;
        }
        if (panel.paneltype == 'CSGOSettingsSlider' || panel.paneltype == 'CSGOSettingsEnumDropDown') {
            panel.RestoreCVarDefault();
        }
        else if (panel.paneltype == 'CSGOConfigSlider' || panel.paneltype == 'CSGOConfigEnumDropDown') {
            // @ts-ignore Property 'RestoreConfigDefault' does not exist on type 'Panel_t'.
            panel.RestoreConfigDefault();
        }
        else if (panel.paneltype == 'CSGOSettingsKeyBinder') {
            panel.OnShow();
        }
        else {
            var nCount = panel.GetChildCount();
            for (var i = 0; i < nCount; i++) {
                var child = panel.GetChild(i);
                _ResetControlsRecursive(child);
            }
        }
    };
    var _ResetControls = function () {
        _ResetControlsRecursive($.GetContextPanel());
    };
    var _ResetKeybdMouseDefaults = function () {
        // @ts-ignore Cannot find name 'OptionsMenuAPI'.
        OptionsMenuAPI.RestoreKeybdMouseBindingDefaults();
        _ResetControls();
    };
    var _ResetAudioSettings = function () {
        $.DispatchEvent("CSGOAudioSettingsResetDefault");
        _ResetControls();
    };
    var _ResetVideoSettings = function () {
        $.DispatchEvent("CSGOVideoSettingsResetDefault");
        _ResetControls();
        _VideoSettingsOnUserInputSubmit();
    };
    var _ResetVideoSettingsAdvanced = function () {
        $.DispatchEvent("CSGOVideoSettingsResetDefaultAdvanced");
        _VideoSettingEnableDiscard;
    };
    var _RefreshControlsRecursive = function (panel) {
        if (panel == null) {
            return;
        }
        if ('OnShow' in panel) {
            panel.OnShow();
        }
        if (panel.GetChildCount == undefined) {
            return;
        }
        else {
            var nCount = panel.GetChildCount();
            for (var i = 0; i < nCount; i++) {
                var child = panel.GetChild(i);
                _RefreshControlsRecursive(child);
            }
        }
    };
    var _ShowConfirmReset = function (resetCall, locText) {
        UiToolkitAPI.ShowGenericPopupOneOptionCustomCancelBgStyle('#settings_reset_confirm_title', locText, '', '#settings_reset', function () {
            resetCall();
        }, '#settings_return', function () {
        }, 'dim');
    };
    var _ShowConfirmDiscard = function (discardCall) {
        UiToolkitAPI.ShowGenericPopupOneOptionCustomCancelBgStyle('#settings_discard_confirm_title', '#settings_discard_confirm_video_desc', '', '#settings_discard', function () {
            discardCall();
        }, '#settings_return', function () {
        }, 'dim');
    };
    var _ScrollToId = function (locationId) {
        var elLocationPanel = $.GetContextPanel().FindChildTraverse(locationId);
        if (elLocationPanel != null) {
            $.GetContextPanel().Data().bScrollingToId = true;
            elLocationPanel.ScrollParentToMakePanelFit(1, false);
            elLocationPanel.TriggerClass('Highlight');
        }
    };
    var _SetVis = function (locationId, vis) {
        var panel = $.GetContextPanel().FindChildTraverse(locationId);
        if (panel != null) {
            panel.visible = vis;
        }
    };
    var gBtnApplyVideoSettingsButton = null;
    var gBtnDiscardVideoSettingChanges = null;
    var gBtnDiscardVideoSettingChanges2 = null;
    var _VideoSettingsOnUserInputSubmit = function () {
        if (gBtnApplyVideoSettingsButton != null) {
            gBtnApplyVideoSettingsButton.enabled = true;
        }
        if (gBtnDiscardVideoSettingChanges != null) {
            gBtnDiscardVideoSettingChanges.enabled = true;
        }
    };
    var _VideoSettingEnableDiscard = function () {
        if (gBtnDiscardVideoSettingChanges2 != null) {
            gBtnDiscardVideoSettingChanges2.enabled = true;
        }
    };
    var _VideoSettingsResetUserInput = function () {
        if (gBtnApplyVideoSettingsButton != null) {
            gBtnApplyVideoSettingsButton.enabled = false;
        }
        if (gBtnDiscardVideoSettingChanges != null) {
            gBtnDiscardVideoSettingChanges.enabled = false;
        }
        if (gBtnDiscardVideoSettingChanges2 != null) {
            gBtnDiscardVideoSettingChanges2.enabled = false;
        }
    };
    var _VideoSettingsDiscardChanges = function () {
        $.DispatchEvent("CSGOVideoSettingsInit");
        _VideoSettingsResetUserInput();
    };
    var _VideoSettingsDiscardAdvanced = function () {
        $.DispatchEvent("CSGOVideoSettingsDiscardAdvanced");
        _VideoSettingsResetUserInput();
    };
    var _VideoSettingsApplyChanges = function () {
        $.DispatchEvent("CSGOApplyVideoSettings");
        _VideoSettingsResetUserInput();
    };
    var _NewTabOpened = function (newTab) {
        var videoSettingsStr = 'VideoSettings';
        if (newTab == videoSettingsStr) {
            var videoSettingsPanel = $.GetContextPanel().FindChildInLayoutFile(videoSettingsStr);
            gBtnApplyVideoSettingsButton = videoSettingsPanel.FindChildInLayoutFile("BtnApplyVideoSettings");
            gBtnDiscardVideoSettingChanges = videoSettingsPanel.FindChildInLayoutFile("BtnDiscardVideoSettingChanges");
            gBtnDiscardVideoSettingChanges2 = videoSettingsPanel.FindChildInLayoutFile("BtnDiscardVideoSettingChanges2");
            gBtnApplyVideoSettingsButton.enabled = false;
            gBtnDiscardVideoSettingChanges.enabled = false;
            gBtnDiscardVideoSettingChanges2.enabled = false;
            $.DispatchEvent("CSGOVideoSettingsInit");
        }
        var newTabPanel = $.GetContextPanel().FindChildInLayoutFile(newTab);
        _RefreshControlsRecursive(newTabPanel);
        GameInterfaceAPI.ConsoleCommand("host_writeconfig");
    };
    var _ChangeBackground = function (delta) {
        let elBkg = $("#XhairBkg");
        if (elBkg) {
            let nBkgIdx = elBkg.GetAttributeInt("bkg-id", 0);
            let arrBkgs = ["bkg-dust2", "bkg-aztec", "bkg-mirage", "bkg-office"];
            nBkgIdx = (arrBkgs.length + nBkgIdx + delta) % arrBkgs.length;
            elBkg.SwitchClass("bkg-style", arrBkgs[nBkgIdx]);
            elBkg.SetAttributeInt("bkg-id", nBkgIdx);
        }
    };
    return {
        ResetControlsRecursivepanel: _ResetControlsRecursive,
        ResetControls: _ResetControls,
        ResetKeybdMouseDefaults: _ResetKeybdMouseDefaults,
        ResetAudioSettings: _ResetAudioSettings,
        ResetVideoSettings: _ResetVideoSettings,
        ResetVideoSettingsAdvanced: _ResetVideoSettingsAdvanced,
        ScrollToId: _ScrollToId,
        SetVis: _SetVis,
        ShowConfirmReset: _ShowConfirmReset,
        ShowConfirmDiscard: _ShowConfirmDiscard,
        VideoSettingsEnableDiscard: _VideoSettingEnableDiscard,
        VideoSettingsOnUserInputSubmit: _VideoSettingsOnUserInputSubmit,
        VideoSettingsDiscardAdvanced: _VideoSettingsDiscardAdvanced,
        VideoSettingsDiscardChanges: _VideoSettingsDiscardChanges,
        VideoSettingsApplyChanges: _VideoSettingsApplyChanges,
        NewTabOpened: _NewTabOpened,
        ChangeBackground: _ChangeBackground,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NtZW51X3NoYXJlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNldHRpbmdzbWVudV9zaGFyZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBRWxDLElBQUksa0JBQWtCLEdBQUcsQ0FBRTtJQUcxQixJQUFJLHVCQUF1QixHQUFHLFVBQVUsS0FBYztRQUVyRCxJQUFLLEtBQUssSUFBSSxJQUFJLEVBQ2xCO1lBQ0MsT0FBTztTQUNQO1FBRUQsSUFBSSxLQUFLLENBQUMsYUFBYSxJQUFJLFNBQVMsRUFDcEM7WUFFQyxPQUFPO1NBQ1A7UUFFRCxJQUFJLEtBQUssQ0FBQyxTQUFTLElBQUksb0JBQW9CLElBQUksS0FBSyxDQUFDLFNBQVMsSUFBSSwwQkFBMEIsRUFDNUY7WUFDRSxLQUEyRCxDQUFDLGtCQUFrQixFQUFFLENBQUM7U0FDbEY7YUFDSSxJQUFJLEtBQUssQ0FBQyxTQUFTLElBQUksa0JBQWtCLElBQUksS0FBSyxDQUFDLFNBQVMsSUFBSSx3QkFBd0IsRUFDN0Y7WUFDQywrRUFBK0U7WUFDNUUsS0FBSyxDQUFDLG9CQUFvQixFQUFFLENBQUM7U0FDaEM7YUFDSSxJQUFLLEtBQUssQ0FBQyxTQUFTLElBQUksdUJBQXVCLEVBQ3BEO1lBRUUsS0FBaUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUM1QzthQUVEO1lBQ0MsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ25DLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ2hDO2dCQUNDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQy9CO1NBQ0Q7SUFDRixDQUFDLENBQUM7SUFFRixJQUFJLGNBQWMsR0FBRztRQUdwQix1QkFBdUIsQ0FBQyxDQUFDLENB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