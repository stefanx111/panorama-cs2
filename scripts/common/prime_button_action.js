"use strict";
/// <reference path="../csgo.d.ts" />
var PrimeButtonAction;
(function (PrimeButtonAction) {
    function SetUpPurchaseBtn(btnPurchase) {
        var sPrice = StoreAPI.GetStoreItemSalePrice(InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1353, 0), 1, '');
        btnPurchase.SetDialogVariable("price", sPrice ? sPrice : '$0');
        btnPurchase.SetPanelEvent('onactivate', function () {
            SteamOverlayAPI.OpenURL(_GetStoreUrl() + '/sub/54029');
            $.DispatchEvent('UIPopupButtonClicked', '');
        });
    }
    PrimeButtonAction.SetUpPurchaseBtn = SetUpPurchaseBtn;
    function _GetStoreUrl() {
        return 'https://store.' +
            ((SteamOverlayAPI.GetAppID() == 710) ? 'beta.' : '') +
            ((MyPersonaAPI.GetSteamType() === 'china' || MyPersonaAPI.GetLauncherType() === "perfectworld") ? 'steamchina' : 'steampowered') + '.com';
    }
})(PrimeButtonAction || (PrimeButtonAction = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpbWVfYnV0dG9uX2FjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByaW1lX2J1dHRvbl9hY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUVyQyxJQUFVLGlCQUFpQixDQXNCMUI7QUF0QkQsV0FBVSxpQkFBaUI7SUFFMUIsU0FBZ0IsZ0JBQWdCLENBQUcsV0FBd0I7UUFLMUQsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLFlBQVksQ0FBQyxpQ0FBaUMsQ0FBRSxJQUFJLEVBQUUsQ0FBQyxDQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBRSxDQUFDO1FBQ2hILFdBQVksQ0FBQyxpQkFBaUIsQ0FBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBRSxDQUFDO1FBRWxFLFdBQVksQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFO1lBQ3hDLGVBQWUsQ0FBQyxPQUFPLENBQUUsWUFBWSxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUM7WUFDeEQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFaZSxrQ0FBZ0IsbUJBWS9CLENBQUE7SUFFRCxTQUFTLFlBQVk7UUFFcEIsT0FBTyxnQkFBZ0I7WUFDdEIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEQsQ0FBQyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsS0FBSyxPQUFPLElBQUksWUFBWSxDQUFDLGVBQWUsRUFBRSxLQUFLLGNBQWMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztJQUM3SSxDQUFDO0FBQ0YsQ0FBQyxFQXRCUyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBc0IxQiJ9