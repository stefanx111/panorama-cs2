"use strict";
/// <reference path="..\csgo.d.ts" />
var LeaderboardNameLock;
(function (LeaderboardNameLock) {
    let m_timeoutHandler;
    function Init() {
        $.GetContextPanel().SetDialogVariable('profile-name', MyPersonaAPI.GetName());
    }
    LeaderboardNameLock.Init = Init;
    function Submit() {
        let entry = $('#TextEntry').text;
        LeaderboardsAPI.SetLocalPlayerLeaderboardSafeName(entry);
        m_timeoutHandler = $.Schedule(15, function () {
            UiToolkitAPI.ShowGenericPopup('Generic', $.Localize('#leaderboard_namelock_submission_timeout'), '');
            $.DispatchEvent('UIPopupButtonClicked', '');
        });
        $.GetContextPanel().FindChildrenWithClassTraverse('button').forEach(element => element.enabled = false);
        $.GetContextPanel().AddClass('submitted');
    }
    LeaderboardNameLock.Submit = Submit;
    function _Validate() {
        if ($('#submit') === null)
            return;
        let entry = $('#TextEntry').text;
        let bSuccess = LeaderboardsAPI.PrefilterLeaderboardSafeName(entry);
        $.GetContextPanel().SetHasClass('results-panel-valid', bSuccess);
    }
    function Cancel() {
        $.DispatchEvent('UIPopupButtonClicked', '');
    }
    LeaderboardNameLock.Cancel = Cancel;
    function Success() {
        if (m_timeoutHandler) {
            $.CancelScheduled(m_timeoutHandler);
        }
        UiToolkitAPI.ShowGenericPopup('Generic', $.Localize('#leaderboard_namelock_submission_success'), '');
        $.DispatchEvent('UIPopupButtonClicked', '');
    }
    LeaderboardNameLock.Success = Success;
    function OpenProfile() {
        SteamOverlayAPI.ShowUserProfilePage(MyPersonaAPI.GetXuid());
        $.DispatchEvent('ContextMenuEvent', '');
    }
    LeaderboardNameLock.OpenProfile = OpenProfile;
})(LeaderboardNameLock || (LeaderboardNameLock = {}));
(function () {
    $.RegisterForUnhandledEvent('PanoramaComponent_FriendsList_NameChanged', LeaderboardNameLock.Init);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_SetPlayerLeaderboardSafeName', LeaderboardNameLock.Success);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfbGVhZGVyYm9hcmRfbmFtZWxvY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF9sZWFkZXJib2FyZF9uYW1lbG9jay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBRXJDLElBQVUsbUJBQW1CLENBa0U1QjtBQWxFRCxXQUFVLG1CQUFtQjtJQUU1QixJQUFJLGdCQUF5QixDQUFDO0lBRTlCLFNBQWdCLElBQUk7UUFJbkIsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGlCQUFpQixDQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUUsQ0FBQTtJQUdoRixDQUFDO0lBUGUsd0JBQUksT0FPbkIsQ0FBQTtJQUVELFNBQWdCLE1BQU07UUFFckIsSUFBSSxLQUFLLEdBQUssQ0FBQyxDQUFFLFlBQVksQ0FBZSxDQUFDLElBQUksQ0FBQztRQUlsRCxlQUFlLENBQUMsaUNBQWlDLENBQUUsS0FBSyxDQUFFLENBQUM7UUFFM0QsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxFQUFFLEVBQUU7WUFFbEMsWUFBWSxDQUFDLGdCQUFnQixDQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFFLDBDQUEwQyxDQUFFLEVBQUUsRUFBRSxDQUFFLENBQUM7WUFDekcsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxzQkFBc0IsRUFBRSxFQUFFLENBQUUsQ0FBQztRQUM5QyxDQUFDLENBQUUsQ0FBQztRQUVMLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyw2QkFBNkIsQ0FBRSxRQUFRLENBQUUsQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBRSxDQUFDO1FBQzVHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxRQUFRLENBQUUsV0FBVyxDQUFFLENBQUM7SUFDN0MsQ0FBQztJQWhCZSwwQkFBTSxTQWdCckIsQ0FBQTtJQUVELFNBQVMsU0FBUztRQUdqQixJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJO1lBQ3hCLE9BQU87UUFFUixJQUFJLEtBQUssR0FBSSxDQUFDLENBQUMsWUFBWSxDQUFhLENBQUMsSUFBSSxDQUFDO1FBQzlDLElBQUksUUFBUSxHQUFHLGVBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuRSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsV0FBVyxDQUFFLHFCQUFxQixFQUFFLFFBQVEsQ0FBRSxDQUFDO0lBQ3BFLENBQUM7SUFFRCxTQUFnQixNQUFNO1FBRXJCLENBQUMsQ0FBQyxhQUFhLENBQUUsc0JBQXNCLEVBQUUsRUFBRSxDQUFFLENBQUM7SUFDL0MsQ0FBQztJQUhlLDBCQUFNLFNBR3JCLENBQUE7SUFFRCxTQUFnQixPQUFPO1FBRXRCLElBQUssZ0JBQWdCLEVBQ3JCO1lBQ0MsQ0FBQyxDQUFDLGVBQWUsQ0FBRSxnQkFBZ0IsQ0FBRSxDQUFDO1NBQ3RDO1FBRUQsWUFBWSxDQUFDLGdCQUFnQixDQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLDBDQUEwQyxDQUFDLEVBQUUsRUFBRSxDQUFFLENBQUM7UUFFdkcsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxzQkFBc0IsRUFBRSxFQUFFLENBQUUsQ0FBQztJQUMvQyxDQUFDO0lBVmUsMkJBQU8sVUFVdEIsQ0FBQTtJQUVELFNBQWdCLFdBQVc7UUFFMUIsZUFBZSxDQUFDLG1CQUFtQixDQUFFLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBRSxDQUFDO1FBQzlELENBQUMsQ0FBQyxhQUFhLENBQUUsa0JBQWtCLEVBQUUsRUFBRSxDQUFFLENBQUM7SUFDM0MsQ0FBQztJQUplLCtCQUFXLGNBSTFCLENBQUE7QUFFRixDQUFDLEVBbEVTLG1CQUFtQixLQUFuQixtQkFBbUIsUUFrRTVCO0FBS0QsQ0FBRTtJQUdELENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSwyQ0FBMkMsRUFBRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUUsQ0FBQztJQUNyRyxDQUFDLENBQUMseUJBQXlCLENBQUUsMERBQTBELEVBQUUsbUJBQW1CLENBQUMsT0FBTyxDQUFFLENBQUM7QUFFeEgsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9