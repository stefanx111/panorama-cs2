"use strict";
/// <reference path="..\csgo.d.ts" />
var PopupRankUpRedemptionStore;
(function (PopupRankUpRedemptionStore) {
    function _msg(text) {
    }
    function Init() {
        _msg('Init');
    }
    PopupRankUpRedemptionStore.Init = Init;
    function OnClose() {
        const callbackHandle = $.GetContextPanel().GetAttributeInt("callback", -1);
        if (callbackHandle != -1) {
            UiToolkitAPI.InvokeJSCallback(callbackHandle);
        }
        $.DispatchEvent('UIPopupButtonClicked', '');
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_new_item_accept', 'MOUSE');
    }
    PopupRankUpRedemptionStore.OnClose = OnClose;
})(PopupRankUpRedemptionStore || (PopupRankUpRedemptionStore = {}));
;
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfcmFua3VwX3JlZGVtcHRpb25fc3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF9yYW5rdXBfcmVkZW1wdGlvbl9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBRXJDLElBQVUsMEJBQTBCLENBdUJuQztBQXZCRCxXQUFVLDBCQUEwQjtJQUVuQyxTQUFTLElBQUksQ0FBRyxJQUFZO0lBRzVCLENBQUM7SUFFRCxTQUFnQixJQUFJO1FBRW5CLElBQUksQ0FBRSxNQUFNLENBQUUsQ0FBQztJQUNoQixDQUFDO0lBSGUsK0JBQUksT0FHbkIsQ0FBQTtJQUVELFNBQWdCLE9BQU87UUFFdEIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLGVBQWUsQ0FBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUM3RSxJQUFLLGNBQWMsSUFBSSxDQUFDLENBQUMsRUFDekI7WUFDQyxZQUFZLENBQUMsZ0JBQWdCLENBQUUsY0FBYyxDQUFFLENBQUM7U0FDaEQ7UUFFRCxDQUFDLENBQUMsYUFBYSxDQUFFLHNCQUFzQixFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQzlDLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsc0NBQXNDLEVBQUUsT0FBTyxDQUFFLENBQUM7SUFDM0YsQ0FBQztJQVZlLGtDQUFPLFVBVXRCLENBQUE7QUFDRixDQUFDLEVBdkJTLDBCQUEwQixLQUExQiwwQkFBMEIsUUF1Qm5DO0FBQUEsQ0FBQztBQUtGLENBQUU7QUFFRixDQUFDLENBQUUsRUFBRSxDQUFDIn0=