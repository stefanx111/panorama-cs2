"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="common/store_items.ts" />
/// <reference path="common/prime_button_action.ts" />
/// <reference path="itemtile_store.ts" />
/// <reference path="generated/items_event_current_generated_store.d.ts" />
var MainMenuStore;
(function (MainMenuStore) {
    const _m_cp = $.GetContextPanel();
    let _m_activePanelId = '';
    let _m_pagePrefix = 'id-store-page-';
    function ReadyForDisplay() {
        if (!ConnectedToGcCheck()) {
            return;
        }
        if (_m_activePanelId === '' || !_m_activePanelId) {
            StoreItems.MakeStoreItemList();
            SetDefaultTab();
        }
        else if (StoreItems.GetStoreItems().coupon && StoreItems.GetStoreItems().coupon.length < 1) {
            StoreItems.MakeStoreItemList();
        }
        ShowPrimePanelOnHomePage();
        MakeTabsBtnsFromStoreData();
        NavigateToTab(_m_activePanelId);
        AccountWalletUpdated();
    }
    MainMenuStore.ReadyForDisplay = ReadyForDisplay;
    function UnreadyForDisplay() {
    }
    MainMenuStore.UnreadyForDisplay = UnreadyForDisplay;
    function ConnectedToGcCheck() {
        if (!MyPersonaAPI.IsInventoryValid() || !MyPersonaAPI.IsConnectedToGC()) {
            UiToolkitAPI.ShowGenericPopupOk($.Localize('#SFUI_SteamConnectionErrorTitle'), $.Localize('#SFUI_Steam_Error_LinkUnexpected'), '', function () {
                $.DispatchEvent('HideContentPanel');
            });
            return false;
        }
        return true;
    }
    function ShowPrimePanelOnHomePage() {
        let bHasPrime = FriendsListAPI.GetFriendPrimeEligible(MyPersonaAPI.GetXuid());
        let elUpsellPanel = $.GetContextPanel().FindChildInLayoutFile('id-prime-background');
        elUpsellPanel.SetHasClass('hidden', bHasPrime);
        if (!bHasPrime) {
            PrimeButtonAction.SetUpPurchaseBtn(_m_cp.FindChildInLayoutFile('id-store-buy-prime'));
        }
        $.GetContextPanel().FindChildInLayoutFile('id-rewards-background').SetHasClass('hidden', !bHasPrime);
    }
    MainMenuStore.ShowPrimePanelOnHomePage = ShowPrimePanelOnHomePage;
    function SetDefaultTab() {
        let navBtn = _m_cp.FindChildInLayoutFile('id-store-nav-home');
        $.DispatchEvent("Activated", navBtn, "mouse");
        navBtn.checked = true;
    }
    function NavigateToTab(panelId, keyType = '') {
        if (keyType) {
            panelId = _m_pagePrefix + keyType;
        }
        if (_m_activePanelId !== panelId) {
            if (panelId === 'id-store-page-home') {
                UpdateItemsInHomeSection('coupon', 'id-store-popular-items', 6);
                UpdateItemsInHomeSection('tournament', 'id-store-tournament-items', 4);
            }
            else {
                MakePageFromStoreData(keyType);
            }
            if (_m_activePanelId) {
                _m_cp.FindChildInLayoutFile(_m_activePanelId).SetHasClass('Active', false);
            }
            _m_activePanelId = panelId;
            let activePanel = _m_cp.FindChildInLayoutFile(panelId);
            activePanel.SetHasClass('Active', true);
        }
    }
    MainMenuStore.NavigateToTab = NavigateToTab;
    ;
    function UpdateItemsInHomeSection(catagory, parentId, numItemsToShow) {
        let elPanel = _m_cp.FindChildInLayoutFile(parentId);
        let elParent = _m_cp.FindChildInLayoutFile('id-store-home-section-' + catagory);
        elParent.style.backgroundImage = 'url("file://{images}/backgrounds/store_home_' + catagory + '.psd")';
        elParent.style.backgroundPosition = '50% 50%';
        elParent.style.backgroundSize = 'cover';
        let oItemsByCategory = StoreItems.GetStoreItems();
        let aItemsList = oItemsByCategory[catagory];
        if (aItemsList.length < 1) {
            elParent.visible = false;
            return;
        }
        elParent.visible = true;
        for (let i = 0; i < numItemsToShow; i++) {
            let elTile = elPanel.FindChildInLayoutFile('home-' + catagory + '-' + i);
            if (!elTile) {
                elTile = $.CreatePanel("Button", elPanel, 'home-' + catagory + '-' + i);
                elTile.BLoadLayout('file://{resources}/layout/itemtile_store.xml', false, false);
            }
            UpdateItem(elTile, catagory, i);
        }
    }
    function MakeTabsBtnsFromStoreData() {
        let elParent = _m_cp.FindChildInLayoutFile('id-store-lister-tabs');
        let oItemsByCategory = StoreItems.GetStoreItems();
        Object.entries(oItemsByCategory).forEach(([key, value]) => {
            let panelIdString = 'id-store-nav-' + key;
            let elButton = elParent.FindChildInLayoutFile(panelIdString);
            if (value.length > 0 && !elButton) {
                elButton = $.CreatePanel('RadioButton', elParent, panelIdString, {
                    group: 'store-top-nav',
                    class: 'content-navbar__tabs__btn'
                });
                let btnString = key === 'tournament' ?
                    // @ts-ignore 
                    $.Localize('#store_nav_' + key + '_' + g_ActiveTournamentInfo.eventid) :
                    $.Localize('#store_nav_' + key);
                $.CreatePanel('Label', elButton, '', {
                    text: btnString
                });
                elButton.SetPanelEvent('onactivate', () => {
                    MainMenuStore.NavigateToTab(_m_pagePrefix + key, key);
                });
            }
        });
    }
    function MakePageFromStoreData(typeKey) {
        let panelIdString = _m_pagePrefix + typeKey;
        let elParent = _m_cp.FindChildInLayoutFile('id-store-pages');
        let elPanel = elParent.FindChildInLayoutFile(panelIdString);
        if (!elPanel) {
            elPanel = $.CreatePanel('JSDelayLoadList', elParent, panelIdString, {
                class: 'store-dynamic-lister',
                itemwidth: "178px",
                itemheight: "280px",
                spacersize: "4px",
                spacerperiod: "4px"
            });
            UpdateDynamicLister(elPanel, typeKey);
        }
    }
    MainMenuStore.MakePageFromStoreData = MakePageFromStoreData;
    function UpdateDynamicLister(elList, typeKey) {
        let oItemsByCategory = StoreItems.GetStoreItems();
        let aItemsList = oItemsByCategory[typeKey];
        elList.SetLoadListItemFunction(function (parent, nPanelIdx, reusePanel) {
            if (!reusePanel || !reusePanel.IsValid()) {
                reusePanel = $.CreatePanel("Button", elList, aItemsList[nPanelIdx].id);
                reusePanel.BLoadLayout('file://{resources}/layout/itemtile_store.xml', false, false);
            }
            UpdateItem(reusePanel, typeKey, nPanelIdx);
            return reusePanel;
        });
        elList.UpdateListItems(aItemsList.length);
    }
    function UpdateItem(elPanel, typeKey, idx) {
        let oItemData = StoreItems.GetStoreItemData(typeKey, idx);
        ItemTileStore.Init(elPanel, oItemData);
    }
    function GotoStorePage(location) {
        let navBtn = _m_cp.FindChildInLayoutFile(location);
        $.DispatchEvent("Activated", navBtn, "mouse");
        navBtn.checked = true;
    }
    MainMenuStore.GotoStorePage = GotoStorePage;
    function AccountWalletUpdated() {
        var elBalance = _m_cp.FindChildInLayoutFile('id-store-nav-wallet');
        if ((MyPersonaAPI.GetLauncherType() === 'perfectworld') && (MyPersonaAPI.GetSteamType() !== 'china')) {
            elBalance.RemoveClass('hidden');
            elBalance.text = '#Store_SteamChina_Wallet';
            return;
        }
        var balance = (MyPersonaAPI.GetLauncherType() === 'perfectworld') ? StoreAPI.GetAccountWalletBalance() : '';
        if (balance === '' || balance === undefined || balance === null) {
            elBalance.AddClass('hidden');
        }
        else {
            elBalance.SetDialogVariable('balance', balance);
            elBalance.RemoveClass('hidden');
        }
    }
    MainMenuStore.AccountWalletUpdated = AccountWalletUpdated;
    ;
})(MainMenuStore || (MainMenuStore = {}));
(function () {
    MainMenuStore.ReadyForDisplay();
    let elJsStore = $('#JsMainMenuStore');
    $.RegisterEventHandler('ReadyForDisplay', elJsStore, MainMenuStore.ReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', elJsStore, MainMenuStore.UnreadyForDisplay);
    $.RegisterForUnhandledEvent('PanoramaComponent_Store_AccountWalletUpdated', MainMenuStore.AccountWalletUpdated);
    $.RegisterForUnhandledEvent('PanoramaComponent_Store_PriceSheetChanged', MainMenuStore.ReadyForDisplay);
    $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', MainMenuStore.ShowPrimePanelOnHomePage);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbm1lbnVfc3RvcmVfZnVsbHNjcmVlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW5tZW51X3N0b3JlX2Z1bGxzY3JlZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGtDQUFrQztBQUNsQyw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDhDQUE4QztBQUM5QyxzREFBc0Q7QUFDdEQsMENBQTBDO0FBQzFDLDJFQUEyRTtBQUUzRSxJQUFVLGFBQWEsQ0E0UHRCO0FBNVBELFdBQVUsYUFBYTtJQUV0QixNQUFNLEtBQUssR0FBWSxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0MsSUFBSSxnQkFBZ0IsR0FBVyxFQUFFLENBQUM7SUFDbEMsSUFBSSxhQUFhLEdBQUcsZ0JBQWdCLENBQUM7SUFFckMsU0FBZ0IsZUFBZTtRQUc5QixJQUFLLENBQUMsa0JBQWtCLEVBQUUsRUFDMUI7WUFDQyxPQUFPO1NBQ1A7UUFFRCxJQUFLLGdCQUFnQixLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUNqRDtZQUNDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLGFBQWEsRUFBRSxDQUFDO1NBQ2hCO2FBQ0ksSUFBSyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxNQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDNUY7WUFDQyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztTQUMvQjtRQUlELHdCQUF3QixFQUFFLENBQUE7UUFDMUIseUJBQXlCLEVBQUUsQ0FBQztRQUM1QixhQUFhLENBQUUsZ0JBQWdCLENBQUUsQ0FBQztRQUNsQyxvQkFBb0IsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUF4QmUsNkJBQWUsa0JBd0I5QixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCO0lBR2pDLENBQUM7SUFIZSwrQkFBaUIsb0JBR2hDLENBQUE7SUFFRCxTQUFTLGtCQUFrQjtRQUUx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