"use strict";
/// <reference path="..\csgo.d.ts" />
var LeaderboardNameLock;
(function (LeaderboardNameLock) {
    function Init() {
        $('#submit').enabled = false;
        $('#TextEntry').SetPanelEvent('ontextentrychange', _Validate);
        _Validate();
        $('#TextEntry').SetFocus();
    }
    LeaderboardNameLock.Init = Init;
    function Submit() {
        let entry = $('#TextEntry').text;
        LeaderboardsAPI.SetLocalPlayerLeaderboardSafeName(entry);
        _Close();
    }
    LeaderboardNameLock.Submit = Submit;
    function _Validate() {
        // This can happen when XML is reloaded in tools mode.
        if ($('#submit') === null)
            return;
        let entry = $('#TextEntry').text;
        let bSuccess = LeaderboardsAPI.PrefilterLeaderboardSafeName(entry);
        $('#submit').enabled = bSuccess;
        $.GetContextPanel().SetHasClass('results-panel-valid', bSuccess);
    }
    function Cancel() {
        _Close();
    }
    LeaderboardNameLock.Cancel = Cancel;
    function _Close() {
        $.DispatchEvent('UIPopupButtonClicked', '');
    }
})(LeaderboardNameLock || (LeaderboardNameLock = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created 
//--------------------------------------------------------------------------------------------------
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfbGVhZGVyYm9hcmRfbmFtZWxvY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF9sZWFkZXJib2FyZF9uYW1lbG9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBRXJDLElBQVUsbUJBQW1CLENBMEM1QjtBQTFDRCxXQUFVLG1CQUFtQjtJQUU1QixTQUFnQixJQUFJO1FBRW5CLENBQUMsQ0FBRSxTQUFTLENBQUcsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLENBQUMsQ0FBRSxZQUFZLENBQUcsQ0FBQyxhQUFhLENBQUUsbUJBQW1CLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDbkUsU0FBUyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUMsWUFBWSxDQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQU5lLHdCQUFJLE9BTW5CLENBQUE7SUFFRCxTQUFnQixNQUFNO1FBRXJCLElBQUksS0FBSyxHQUFLLENBQUMsQ0FBRSxZQUFZLENBQWUsQ0FBQyxJQUFJLENBQUM7UUFDbEQsZUFBZSxDQUFDLGlDQUFpQyxDQUFFLEtBQUssQ0FBRSxDQUFDO1FBRTNELE1BQU0sRUFBRSxDQUFDO0lBQ1YsQ0FBQztJQU5lLDBCQUFNLFNBTXJCLENBQUE7SUFHRCxTQUFTLFNBQVM7UUFFakIsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUk7WUFDeEIsT0FBTztRQUVSLElBQUksS0FBSyxHQUFJLENBQUMsQ0FBQyxZQUFZLENBQWEsQ0FBQyxJQUFJLENBQUM7UUFDOUMsSUFBSSxRQUFRLEdBQUcsZUFBZSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25FLENBQUMsQ0FBQyxTQUFTLENBQUUsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxXQUFXLENBQUUscUJBQXFCLEVBQUUsUUFBUSxDQUFFLENBQUM7SUFDcEUsQ0FBQztJQUVELFNBQWdCLE1BQU07UUFFckIsTUFBTSxFQUFFLENBQUM7SUFDVixDQUFDO0lBSGUsMEJBQU0sU0FHckIsQ0FBQTtJQUVELFNBQVMsTUFBTTtRQUdkLENBQUMsQ0FBQyxhQUFhLENBQUUsc0JBQXNCLEVBQUUsRUFBRSxDQUFFLENBQUM7SUFDL0MsQ0FBQztBQUVGLENBQUMsRUExQ1MsbUJBQW1CLEtBQW5CLG1CQUFtQixRQTBDNUI7QUFFRCxvR0FBb0c7QUFDcEcsNENBQTRDO0FBQzVDLG9HQUFvRztBQUNwRyxDQUFFO0FBRUYsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9