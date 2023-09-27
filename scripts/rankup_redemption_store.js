"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="common/formattext.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="itemtile_store.ts" />
var RankUpRedemptionStore;
(function (RankUpRedemptionStore) {
    let m_redeemableBalance = 0;
    let m_timeStamp = -1;
    let m_timeoutScheduleHandle;
    let m_profileCustomizationHandler;
    let m_profileUpdateHandler;
    let m_registered = false;
    function _msg(text) {
    }
    function RegisterForInventoryUpdate() {
        if (m_registered)
            return;
        m_registered = true;
        _UpdateStoreState();
        CheckForPopulateItems();
        m_profileUpdateHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', OnInventoryUpdated);
        m_profileCustomizationHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Inventory_ItemCustomizationNotification', OnItemCustomization);
        $.GetContextPanel().RegisterForReadyEvents(true);
        $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), function () {
            _msg("READY FOR DISPLAY");
            _UpdateStoreState();
            CheckForPopulateItems(true);
            if (!m_profileUpdateHandler) {
                m_profileUpdateHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', OnInventoryUpdated);
            }
            if (!m_profileCustomizationHandler) {
                m_profileCustomizationHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Inventory_ItemCustomizationNotification', OnItemCustomization);
            }
        });
        $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), function () {
            _msg("UN-READY FOR DISPLAY");
            if (m_profileUpdateHandler) {
                $.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', m_profileUpdateHandler);
                m_profileUpdateHandler = null;
            }
            if (m_profileCustomizationHandler) {
                $.UnregisterForUnhandledEvent('PanoramaComponent_Inventory_ItemCustomizationNotification', m_profileCustomizationHandler);
                m_profileCustomizationHandler = null;
            }
        });
    }
    RankUpRedemptionStore.RegisterForInventoryUpdate = RegisterForInventoryUpdate;
    ;
    function CheckForPopulateItems(bFirstTime = false, claimedItemId = '') {
        const objStore = InventoryAPI.GetCacheTypeElementJSOByIndex("PersonalStore", 0);
        const genTime = objStore ? objStore.generation_time : 0;
        if (genTime != m_timeStamp || claimedItemId) {
            if (genTime != m_timeStamp) {
                m_timeStamp = genTime;
                GameInterfaceAPI.SetSettingString('cl_redemption_reset_timestamp', genTime);
            }
            PopulateItems(bFirstTime, claimedItemId);
        }
    }
    RankUpRedemptionStore.CheckForPopulateItems = CheckForPopulateItems;
    function _CreateItemPanel(itemId, index, bFirstTime, claimedItemId = '') {
        let bNoDropsEarned = itemId === '-';
        if (itemId !== '-' && (!InventoryAPI.IsItemInfoValid(itemId) || !InventoryAPI.IsValidItemID(itemId))) {
            _msg('item ' + itemId + ' is invalid');
            return;
        }
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        let elGhostItem = elItemContainer.FindChildInLayoutFile('itemdrop-' + itemId);
        elGhostItem = $.CreatePanel('Panel', elItemContainer, 'itemdrop-' + index + '-' + itemId);
        elGhostItem.BLoadLayout('file://{resources}/layout/itemtile_store.xml', false, false);
        _AddTileToBlurPanel(elGhostItem);
        let oItemData = {
            id: itemId,
            isDropItem: true,
            noDropsEarned: bNoDropsEarned,
        };
        ItemTileStore.Init(elGhostItem, oItemData);
        elGhostItem.Data().itemid = itemId;
        elGhostItem.Data().index = index;
        if (bNoDropsEarned)
            return;
        _OnGhostItemActivate(elGhostItem, itemId);
    }
    function _AddTileToBlurPanel(elGhostItem) {
        let parent = elGhostItem;
        let newParent;
        let count = 0;
        while (newParent = parent.GetParent()) {
            if (newParent.id === 'id-rewards-background') {
                let blurTarget = newParent.FindChildInLayoutFile('id-rewards-background-blur');
                blurTarget.AddBlurPanel(elGhostItem);
                break;
            }
            if (count > 5)
                break;
            parent = newParent;
            count++;
        }
    }
    function _OnGhostItemActivate(elGhostItem, itemId) {
        const bIsFauxItem = InventoryAPI.IsFauxItemID(itemId);
        if (!bIsFauxItem) {
            elGhostItem.SetPanelEvent('onactivate', () => _OnItemSelected(elGhostItem));
            const elInspect = elGhostItem.FindChildTraverse('id-itemtile-store-inspect-btn');
            elInspect.SetPanelEvent('onactivate', () => {
                if (ItemInfo.ItemHasCapability(itemId, 'decodable') && !ItemInfo.IsTool(itemId)) {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('popup-inspect-' + itemId, 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=' + '' + ',' + itemId +
                        '&' + 'extrapopupfullscreenstyle=solidbkgnd' +
                        '&' + 'asyncworkitemwarning=no' +
                        '&' + 'inspectonly=true' +
                        '&' + 'asyncworktype=decodeable' +
                        '&' + 'asyncworkbtnstyle=hidden' +
                        'none');
                }
                else {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + itemId +
                        '&' + 'inspectonly=true' +
                        '&' + 'showequip=false' +
                        '&' + 'allowsave=false' +
                        'none');
                }
            });
        }
    }
    function PopulateItems(bFirstTime = false, claimedItemId = '') {
        _msg('PopulateItems');
        _msg('claimedItemId:' + claimedItemId);
        const objStore = InventoryAPI.GetCacheTypeElementJSOByIndex("PersonalStore", 0);
        $.GetContextPanel().RemoveClass('waiting');
        if (bFirstTime) {
            $.GetContextPanel().TriggerClass('reveal-store');
        }
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        let aSelectedItems = [];
        elItemContainer.Children().forEach(element => {
            if (element.BHasClass('selected')) {
                aSelectedItems.push(element.Data().index);
            }
        });
        elItemContainer.RemoveAndDeleteChildren();
        const arrItemIds = objStore ? Object.values(objStore.items) : ['-', '-', '-', '-'];
        for (let i = 0; i < arrItemIds.length; i++) {
            _CreateItemPanel(arrItemIds[i], i, bFirstTime, claimedItemId);
        }
        elItemContainer.Children().forEach((element, idx) => {
            if (claimedItemId) {
                aSelectedItems.forEach(selectedIndex => {
                    if (idx === selectedIndex) {
                        element.TriggerClass('reveal-anim');
                        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gift_claim', '');
                    }
                });
            }
        });
    }
    RankUpRedemptionStore.PopulateItems = PopulateItems;
    function _UpdateStoreState() {
        const objStore = InventoryAPI.GetCacheTypeElementJSOByIndex("PersonalStore", 0);
        m_redeemableBalance = objStore ? objStore.redeemable_balance : 0;
        const elClaimButton = $.GetContextPanel().FindChildTraverse('jsRrsClaimButton');
        elClaimButton.enabled = m_redeemableBalance !== 0;
        elClaimButton.SetHasClass('hide', m_redeemableBalance === 0);
        if (m_redeemableBalance <= 0) {
            _CloseStore(objStore ? true : false);
        }
        else {
            _EnableStore();
        }
    }
    function OnItemCustomization(numericType, type, itemid) {
        _msg('OnItemCustomization ' + numericType + ' ' + type + ' ' + itemid);
        if (type !== 'free_reward_redeemed')
            return;
        if (m_timeoutScheduleHandle) {
            $.CancelScheduled(m_timeoutScheduleHandle);
            m_timeoutScheduleHandle = null;
        }
        CheckForPopulateItems(false, itemid);
    }
    function OnInventoryUpdated() {
        _UpdateStoreState();
        _msg('OnInventoryUpdated ');
        CheckForPopulateItems();
    }
    function _GetSelectedItems() {
        let arrItems = [];
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        elItemContainer.Children().forEach(function (panel) {
            if (panel.BHasClass('selected')) {
                arrItems.push(panel.Data().itemid);
            }
        });
        return arrItems;
    }
    function _OnItemSelected(elPanel) {
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        let aItemIds = _GetSelectedItems();
        let nSelected = _GetSelectedItems().length;
        if (nSelected < m_redeemableBalance) {
            elPanel.SetHasClass('selected', !elPanel.BHasClass('selected'));
            if (!elPanel.BHasClass('selected')) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gift_select', 'MOUSE');
            }
            else {
                $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gift_deselect', 'MOUSE');
            }
        }
        else {
            if (aItemIds.find(element => element === elPanel.Data().itemid)) {
                elPanel.SetHasClass('selected', !elPanel.BHasClass('selected'));
                if (!elPanel.BHasClass('selected')) {
                    $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gift_select', 'MOUSE');
                }
                else {
                    $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gift_deselect', 'MOUSE');
                }
            }
        }
        nSelected = _GetSelectedItems().length;
        elItemContainer.Children().forEach(function (element) {
            if (!elPanel.BHasClass('selected') && nSelected >= m_redeemableBalance) {
                if (element.BHasClass('selected')) {
                    element.TriggerClass('pulse-me');
                    $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.buymenu_failure', 'MOUSE');
                }
            }
        });
    }
    function _CloseStore(bHasStore) {
        _EnableDisableStorePanels(false);
        $.GetContextPanel().AddClass('store-closed');
        if (bHasStore) {
            $.GetContextPanel().SetDialogVariable('frame-badge-text', $.Localize('#rankup_redemption_store_closed'));
            const xpBonuses = MyPersonaAPI.GetActiveXpBonuses();
            const bEligibleForCarePackage = xpBonuses.split(',').includes('2');
            if (bEligibleForCarePackage) {
                $.GetContextPanel().SetDialogVariable('frame-desc-text', $.Localize('#rankup_redemption_store_closed_nextrank_desc'));
            }
            else {
                $.GetContextPanel().SetDialogVariable('frame-desc-text', $.Localize('#rankup_redemption_store_closed_desc'));
            }
        }
        else {
            $.GetContextPanel().SetDialogVariable('frame-badge-text', $.Localize('#rankup_redemption_store_earn_xp'));
            $.GetContextPanel().SetDialogVariable('frame-desc-text', $.Localize('#rankup_redemption_store_earn_xp_desc'));
        }
        _SetXpProgress();
    }
    function _EnableStore() {
        _msg('_EnableStore ');
        $.GetContextPanel().RemoveClass('waiting');
        $.GetContextPanel().RemoveClass('store-closed');
        $.GetContextPanel().SetDialogVariableInt('redeemable_balance', m_redeemableBalance);
        $.GetContextPanel().SetDialogVariable('frame-badge-text', $.Localize('#rankup_redemption_store_directive', $.GetContextPanel()));
        $.GetContextPanel().SetDialogVariable('frame-desc-text', $.Localize('#rankup_redemption_store_claim_desc'));
        _EnableDisableStorePanels(true);
    }
    function _EnableDisableStorePanels(enableStore) {
        _msg('_enableStore ' + enableStore);
        $.GetContextPanel().Children().forEach(elPanel => {
            elPanel.enabled = enableStore;
        });
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        elItemContainer.Children().forEach(function (panel) {
            panel.hittest = enableStore;
            panel.hittestchildren = enableStore;
        });
    }
    function _PulseItems() {
        const elItemContainer = $.GetContextPanel().FindChildTraverse('jsRrsItemContainer');
        elItemContainer.Children().forEach(function (panel) {
            if (!panel.BHasClass('item-claimed')) {
                panel.TriggerClass('pulse-me');
                $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.buymenu_failure', 'MOUSE');
            }
        });
    }
    function OnRedeem() {
        if (_GetSelectedItems().length === 0) {
            _PulseItems();
            return;
        }
        let szItemList = _GetSelectedItems().join(',');
        StoreAPI.StoreRedeemFreeRewards(szItemList);
        $.GetContextPanel().AddClass('waiting');
        _EnableDisableStorePanels(true);
        m_timeoutScheduleHandle = $.Schedule(10, _RedemptionTimedOut);
    }
    RankUpRedemptionStore.OnRedeem = OnRedeem;
    function _RedemptionTimedOut() {
        UiToolkitAPI.ShowGenericPopup($.Localize('#rankup_redemption_store_timeout_title'), $.Localize('#rankup_redemption_store_timeout_desc'), '');
        _EnableStore();
    }
    function _SetXpProgress() {
        const currentPoints = FriendsListAPI.GetFriendXp(MyPersonaAPI.GetXuid());
        const pointsPerLevel = MyPersonaAPI.GetXpPerLevel();
        let elXpBarInner = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXpBarInner');
        let percentComplete = (currentPoints / pointsPerLevel) * 100;
        elXpBarInner.style.width = percentComplete + '%';
        elXpBarInner.GetParent().visible = true;
        const xpBonuses = MyPersonaAPI.GetActiveXpBonuses();
        const bEligibleForCarePackage = xpBonuses.split(',').includes('2');
        $.GetContextPanel().SetHasClass('care-package-eligible', bEligibleForCarePackage);
        const currentLvl = FriendsListAPI.GetFriendLevel(MyPersonaAPI.GetXuid());
        let elRankIcon = $.GetContextPanel().FindChildInLayoutFile('JsPlayerXpIcon');
        elRankIcon.SetImage('file://{images}/icons/xp/level' + currentLvl + '.png');
    }
})(RankUpRedemptionStore || (RankUpRedemptionStore = {}));
(function () {
    $.GetContextPanel().RegisterForReadyEvents(true);
    RankUpRedemptionStore.RegisterForInventoryUpdate();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFua3VwX3JlZGVtcHRpb25fc3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyYW5rdXBfcmVkZW1wdGlvbl9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLDZDQUE2QztBQUM3QywyQ0FBMkM7QUFDM0MsMENBQTBDO0FBRTFDLElBQVUscUJBQXFCLENBK2Q5QjtBQS9kRCxXQUFVLHFCQUFxQjtJQUU5QixJQUFJLG1CQUFtQixHQUFXLENBQUMsQ0FBQztJQUNwQyxJQUFJLFdBQVcsR0FBVyxDQUFDLENBQUMsQ0FBQztJQUM3QixJQUFJLHVCQUFzQyxDQUFDO0lBQzNDLElBQUksNkJBQTRDLENBQUM7SUFDakQsSUFBSSxzQkFBcUMsQ0FBQztJQUMxQyxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7SUFFekIsU0FBUyxJQUFJLENBQUcsSUFBWTtJQUc1QixDQUFDO0lBRUQsU0FBZ0IsMEJBQTBCO1FBRXpDLElBQUssWUFBWTtZQUNoQixPQUFPO1FBRVIsWUFBWSxHQUFHLElBQUksQ0FBQztRQUNwQixpQkFBaUIsRUFBRSxDQUFDO1FBQ3BCLHFCQUFxQixFQUFFLENBQUM7UUFFeEIsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDhDQUE4QyxFQUFFLGtCQUFrQixDQUFFLENBQUM7UUFDM0gsNkJBQTZCLEdBQUksQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDJEQUEyRCxFQUFFLG1CQUFtQixDQUFFLENBQUM7UUFDakosQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLHNCQUFzQixDQUFFLElBQUksQ0FBRSxDQUFDO1FBRW5ELENBQUMsQ0FBQyxvQkFBb0IsQ0FBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUU7WUFFL0QsSUFBSSxDQUFFLG1CQUFtQixDQUFFLENBQUM7WUFFNUIsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixxQkFBcUIsQ0FBRSxJQUFJLENBQUUsQ0FBQztZQUU5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