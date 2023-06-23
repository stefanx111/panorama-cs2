/// <reference path="../csgo.d.ts" />
var WelcomeLaunch = (function () {
    function _OnOKPressed() {
        var strGoalVersion = $.GetContextPanel().GetAttributeString("uisettingversion", '');
        GameInterfaceAPI.SetSettingString('ui_popup_weaponupdate_version', strGoalVersion);
        $.DispatchEvent('UIPopupButtonClicked', '');
    }
    function _OnCancelPressed() {
        _OnOKPressed();
    }
    return {
        OnOKPressed: _OnOKPressed,
        OnCancelPressed: _OnCancelPressed
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfd2VsY29tZV9sYXVuY2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF93ZWxjb21lX2xhdW5jaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFFckMsSUFBSSxhQUFhLEdBQUcsQ0FBRTtJQUVsQixTQUFTLFlBQVk7UUFFakIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGtCQUFrQixDQUFFLGtCQUFrQixFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ3RGLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLCtCQUErQixFQUFFLGNBQWMsQ0FBRSxDQUFDO1FBQ3JGLENBQUMsQ0FBQyxhQUFhLENBQUUsc0JBQXNCLEVBQUUsRUFBRSxDQUFFLENBQUM7SUFDbEQsQ0FBQztJQUVELFNBQVMsZ0JBQWdCO1FBRXJCLFlBQVksRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxPQUFPO1FBRUgsV0FBVyxFQUFFLFlBQVk7UUFDekIsZUFBZSxFQUFFLGdCQUFnQjtLQUNwQyxDQUFBO0FBRUwsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9