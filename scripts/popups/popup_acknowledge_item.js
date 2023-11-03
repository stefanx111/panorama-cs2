"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="popup_capability_can_sticker.ts" />
var AcknowledgeItems;
(function (AcknowledgeItems_1) {
    let m_isCapabliltyPopupOpen = false;
    let m_elEquipBtn = $('#EquipItemBtn');
    let m_focusedItemId = '';
    function OnLoad() {
        $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', AcknowledgeItems.Init);
        $.RegisterEventHandler("SetCarouselSelectedChild", $.GetContextPanel(), AcknowledgeItems.CarouselUpdated);
        $.RegisterForUnhandledEvent('CSGOShowMainMenu', AcknowledgeItems.OnMainMenuShow);
        $.RegisterForUnhandledEvent('PopulateLoadingScreen', AcknowledgeItems.AcknowledgeAllItems.OnCloseEvents);
        Init();
    }
    AcknowledgeItems_1.OnLoad = OnLoad;
    ;
    function Init() {
        const items = GetItems();
        if (items.length < 1) {
            $.DispatchEvent('UIPopupButtonClicked', '');
            return;
        }
        const numItems = items.length;
        AcknowledgeAllItems.SetItemsToSaveAsNew(items);
        const elParent = $.GetContextPanel().FindChildInLayoutFile('AcknowledgeItemsCarousel');
        elParent.RemoveAndDeleteChildren();
        for (let i = 0; i < items.length; i++) {
            const elDelayLoadPanel = $.CreatePanel('CSGODelayLoadPanel', elParent, 'carousel_delay_load_' + i, { class: 'Offscreen' });
            elDelayLoadPanel.SetLoadFunction(MakeItemPanel.bind(null, items[i], i, numItems));
            elDelayLoadPanel.ListenForClassRemoved('Offscreen');
        }
        $.Schedule(.25, () => {
            let aPanels = $.GetContextPanel().FindChildInLayoutFile('AcknowledgeItemsCarousel').Children();
            if (aPanels.length > 0) {
                for (let i = 0; i < aPanels.length; i++) {
                    if (aPanels[i].BHasClass('Focused')) {
                        ShowHideOpenItemInLayoutBtn(aPanels[i].Data().itemId);
                        if (m_elEquipBtn)
                            m_elEquipBtn.SetPanelEvent('onactivate', () => {
                                AcknowledgeAllItems.OnActivate();
                                $.DispatchEvent("ShowLoadoutForItem", m_focusedItemId);
                            });
                        break;
                    }
                }
            }
        });
        $.Schedule(1, SetFocusForNavButton);
    }
    AcknowledgeItems_1.Init = Init;
    ;
    function SetFocusForNavButton() {
        let elParent = $.GetContextPanel().FindChildInLayoutFile('AcknowledgeItemsCarouselNav');
        elParent.FindChildInLayoutFile('NextItemButton').SetPanelEvent('onmouseover', () => {
            elParent.FindChildInLayoutFile('NextItemButton').SetFocus();
        });
        elParent.FindChildInLayoutFile('PreviousItemButton').SetPanelEvent('onmouseover', () => {
            elParent.FindChildInLayoutFile('PreviousItemButton').SetFocus();
        });
    }
    ;
    function MakeItemPanel(item, index, numItems, elParent) {
        const elItemTile = $.CreatePanel('Panel', elParent, item.id);
        elItemTile.BLoadLayoutSnippet('Item');
        const modelPath = ShowModelOrItem(elItemTile, item.id, item.type);
        ResizeForVerticalItem(elItemTile, item.id);
        const rarityColor = ItemInfo.GetRarityColor(item.id);
        SetTitle(elItemTile, item, rarityColor);
        SetParticlesBg(elItemTile, rarityColor, modelPath, item.id);
        ColorRarityBar(elItemTile, rarityColor);
        SetItemName(elItemTile, item.id);
        ShowGiftPanel(elItemTile, item.id);
        ShowSetPanel(elItemTile, item.id);
        ItemCount(elItemTile, index, numItems);
        elParent.Data().itemId = item.id;
    }
    ;
    function ShowModelOrItem(elItemTile, id, type = "") {
        var elItemModelImagePanel = elItemTile.FindChildInLayoutFile('PopUpInspectModelOrImage');
        elItemModelImagePanel.Data().useAcknowledge = !(ItemInfo.IsSprayPaint(id) || ItemInfo.IsSpraySealed(id));
        return InspectModelImage.Init(elItemModelImagePanel, id);
    }
    ;
    function ResizeForVerticalItem(elItemTile, id) {
        if (ItemInfo.IsCharacter(id)) {
            var elPanel = elItemTile.FindChildInLayoutFile('AcknowledgeItemContainer');
            elPanel.AddClass('popup-acknowledge__item__model--vertical');
        }
    }
    ;
    function SetItemName(elItemTile, id) {
        const elLabel = elItemTile.FindChildInLayoutFile('AcknowledgeItemLabel');
        elLabel.text = ItemInfo.GetName(id);
    }
    ;
    function SetTitle(elItemTile, item, rarityColor) {
        const isOperationReward = item.pickuptype === 'quest_reward';
        const defName = InventoryAPI.GetItemDefinitionName(item.id);
        const elTitle = elItemTile.FindChildInLayoutFile('AcknowledgeItemTitle');
        const titleSuffex = isOperationReward ? 'quest_reward' : item.type;
        if (defName === 'casket' && item.type === 'nametag_add') {
            elTitle.text = $.Localize('#CSGO_Tool_Casket_Tag');
        }
        else {
            const idxOfExtraParams = titleSuffex.indexOf("[");
            const typeWithoutParams = (idxOfExtraParams > 0) ? titleSuffex.substring(0, idxOfExtraParams) : titleSuffex;
            elTitle.text = $.Localize('#popup_title_' + typeWithoutParams);
        }
        if (isOperationReward) {
            const tier = ItemInfo.GetRewardTier(item.id);
        }
        elTitle.style.washColor = rarityColor;
    }
    ;
    function SetParticlesBg(elItemTile, rarityColor, modelPath, itemId) {
        const oColor = HexColorToRgb(rarityColor);
        let elParticlePanel = elItemTile.FindChildInLayoutFile('popup-acknowledge__item__particle');
        elParticlePanel.visible = !modelPath;
        if (!modelPath) {
            elParticlePanel.SetParticleNameAndRefresh('particles/ui/ui_item_present_bokeh.vpcf');
            elParticlePanel.SetControlPoint(16, oColor.r, oColor.g, oColor.b);
            elParticlePanel.StartParticles();
            return;
        }
        elParticlePanel.StopParticlesImmediately(false);
    }
    ;
    function HexColorToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }
    ;
    function ColorRarityBar(elItemTile, rarityColor) {
        const elBar = elItemTile.FindChildInLayoutFile('AcknowledgeBar');
        elBar.style.washColor = rarityColor;
    }
    ;
    function ShowGiftPanel(elItemTile, id) {
        const elPanel = elItemTile.FindChildInLayoutFile('AcknowledgeItemGift');
        const gifterId = ItemInfo.GetGifter(id);
        elPanel.SetHasClass('hidden', gifterId === '');
        const elLabel = elItemTile.FindChildInLayoutFile('AcknowledgeItemGiftLabel');
        elLabel.SetDialogVariable('name', FriendsListAPI.GetFriendName(gifterId));
        elLabel.text = $.Localize('#acknowledge_gifter', elLabel);
    }
    ;
    function ShowQuestPanel(elItemTile, id) {
        const elPanel = elItemTile.FindChildInLayoutFile('AcknowledgeItemQuest');
        elPanel.SetHasClass('hidden', 'quest_reward' !== ItemInfo.GetItemPickUpMethod(id));
        const nTierReward = ItemInfo.GetRewardTier(id);
        const bPremium = ItemInfo.BIsRewardPremium(id);
        elPanel.SetHasClass("tier-reward", nTierReward > 0);
        elPanel.SetHasClass("premium", bPremium);
        if (nTierReward > 0) {
            elPanel.SetDialogVariableInt("tier_num", nTierReward);
        }
    }
    ;
    function ShowSetPanel(elItemTile, id) {
        const elPanel = elItemTile.FindChildInLayoutFile('AcknowledgeItemSet');
        const strSetName = InventoryAPI.GetTag(id, 'ItemSet');
        if (!strSetName || strSetName === '0') {
            elPanel.SetHasClass('hide', true);
            return;
        }
        const setName = InventoryAPI.GetTagString(strSetName);
        if (!setName) {
            elPanel.SetHasClass('hide', true);
            return;
        }
        const elLabel = elItemTile.FindChildInLayoutFile('AcknowledgeItemSetLabel');
        elLabel.text = setName;
        const elImage = elItemTile.FindChildInLayoutFile('AcknowledgeItemSetImage');
        elImage.SetImage('file://{images}/econ/set_icons/' + strSetName + '_small.png');
        elPanel.SetHasClass('hide', false);
    }
    ;
    function ItemCount(elItemTile, index, numItems) {
        const elCountLabel = elItemTile.FindChildInLayoutFile('AcknowledgeItemCount');
        if (numItems < 2) {
            elCountLabel.visible = false;
            return;
        }
        elCountLabel.visible = true;
        elCountLabel.text = (index + 1) + ' / ' + numItems;
    }
    ;
    function GetItems() {
        const newItems = [];
        const itemCount = InventoryAPI.GetUnacknowledgeItemsCount();
        for (let i = 0; i < itemCount; i++) {
            const itemId = InventoryAPI.GetUnacknowledgeItemByIndex(i);
            const pickUpType = ItemInfo.GetItemPickUpMethod(itemId);
            if (ItemstoAcknowlegeRightAway(itemId))
                InventoryAPI.AcknowledgeNewItembyItemID(itemId);
            else
                newItems.unshift({ type: 'acknowledge', id: itemId, pickuptype: pickUpType });
        }
        const getUpdateItem = GetUpdatedItem();
        if (getUpdateItem && newItems.filter(item => item.id === getUpdateItem.id).length < 1) {
            newItems.push(getUpdateItem);
        }
        const rewardItems = newItems.filter(item => item.pickuptype === "quest_reward");
        const otherItems = newItems.filter(item => item.pickuptype !== "quest_reward");
        return rewardItems.concat(otherItems);
    }
    AcknowledgeItems_1.GetItems = GetItems;
    ;
    function GetItemsByType(afilters, bShouldAcknowledgeItems) {
        const aItems = GetItems();
        const filterByDefNames = function (oItem) {
            return afilters.includes(ItemInfo.GetItemDefinitionName(oItem.id));
        };
        const alist = aItems.filter(filterByDefNames);
        if (bShouldAcknowledgeItems) {
            AcknowledgeAllItems.SetItemsToSaveAsNew(alist);
            AcknowledgeAllItems.AcknowledgeItems();
        }
        return alist.map(item => item.id);
    }
    AcknowledgeItems_1.GetItemsByType = GetItemsByType;
    ;
    function GetUpdatedItem() {
        const itemidExplicitAcknowledge = $.GetContextPanel().GetAttributeString("ackitemid", '');
        if (itemidExplicitAcknowledge === '')
            return null;
        return {
            id: itemidExplicitAcknowledge,
            type: $.GetContextPanel().GetAttributeString("acktype", '')
        };
    }
    ;
    function ItemstoAcknowlegeRightAway(id) {
        const itemType = InventoryAPI.GetItemTypeFromEnum(id);
        return itemType === 'quest' || itemType === 'coupon_crate' || itemType === 'campaign';
    }
    ;
    function SetIsCapabilityPopUpOpen(isOpen) {
        m_isCapabliltyPopupOpen = isOpen;
    }
    AcknowledgeItems_1.SetIsCapabilityPopUpOpen = SetIsCapabilityPopUpOpen;
    ;
    function CarouselUpdated(elPanel) {
        $.Schedule(.15, () => {
            if (elPanel && elPanel.IsValid())
                ShowHideOpenItemInLayoutBtn(elPanel.Data().itemId);
        });
    }
    AcknowledgeItems_1.CarouselUpdated = CarouselUpdated;
    function ShowHideOpenItemInLayoutBtn(itemId) {
        m_focusedItemId = itemId;
        let category = InventoryAPI.GetLoadoutCategory(itemId);
        var isHidden = (ItemInfo.ItemHasCapability(itemId, 'decodable') || category == undefined || category == '' || category == null) ? true : false;
        if (m_elEquipBtn) {
            m_elEquipBtn.SetHasClass('hide', isHidden);
        }
    }
    function OnMainMenuShow() {
        AcknowledgeItems.Init();
    }
    AcknowledgeItems_1.OnMainMenuShow = OnMainMenuShow;
    let AcknowledgeAllItems;
    (function (AcknowledgeAllItems) {
        let itemsToSave = [];
        function SetItemsToSaveAsNew(items) {
            itemsToSave = items;
        }
        AcknowledgeAllItems.SetItemsToSaveAsNew = SetItemsToSaveAsNew;
        ;
        function AcknowledgeItems() {
            itemsToSave.forEach(function (item) {
                InventoryAPI.SetItemSessionPropertyValue(item.id, 'item_pickup_method', ItemInfo.GetItemPickUpMethod(item.id));
                if (item.type === 'acknowledge') {
                    InventoryAPI.SetItemSessionPropertyValue(item.id, 'recent', '1');
                    InventoryAPI.AcknowledgeNewItembyItemID(item.id);
                }
                else {
                    InventoryAPI.SetItemSessionPropertyValue(item.id, 'updated', '1');
                    $.DispatchEvent('RefreshActiveInventoryList');
                }
            });
        }
        AcknowledgeAllItems.AcknowledgeItems = AcknowledgeItems;
        ;
        function OnActivate() {
            AcknowledgeItems();
            InventoryAPI.AcknowledgeNewBaseItems();
            const callbackResetAcknowlegePopupHandle = $.GetContextPanel().GetAttributeInt("callback", -1);
            if (callbackResetAcknowlegePopupHandle != -1) {
                UiToolkitAPI.InvokeJSCallback(callbackResetAcknowlegePopupHandle);
            }
            OnCloseEvents();
        }
        AcknowledgeAllItems.OnActivate = OnActivate;
        ;
        function OnCloseEvents() {
            $.DispatchEvent('UIPopupButtonClicked', '');
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_new_item_accept', 'MOUSE');
        }
        AcknowledgeAllItems.OnCloseEvents = OnCloseEvents;
    })(AcknowledgeAllItems = AcknowledgeItems_1.AcknowledgeAllItems || (AcknowledgeItems_1.AcknowledgeAllItems = {}));
})(AcknowledgeItems || (AcknowledgeItems = {}));
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfYWNrbm93bGVkZ2VfaXRlbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX2Fja25vd2xlZGdlX2l0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyw4Q0FBOEM7QUFDOUMsd0RBQXdEO0FBRXhELElBQVUsZ0JBQWdCLENBcWJ6QjtBQXJiRCxXQUFVLGtCQUFnQjtJQVN6QixJQUFJLHVCQUF1QixHQUFHLEtBQUssQ0FBQztJQUNwQyxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUUsZUFBZSxDQUFrQixDQUFDO0lBQ3hELElBQUksZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUV6QixTQUFnQixNQUFNO1FBRXJCLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw4Q0FBOEMsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUNyRyxDQUFDLENBQUMsb0JBQW9CLENBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFLGdCQUFnQixDQUFDLGVBQWUsQ0FBRSxDQUFDO1FBQzVHLENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQyxjQUFjLENBQUUsQ0FBQztRQUNuRixDQUFDLENBQUMseUJBQXlCLENBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsYUFBYSxDQUFFLENBQUM7UUFDM0csSUFBSSxFQUFFLENBQUM7SUFDUixDQUFDO0lBUGUseUJBQU0sU0FPckIsQ0FBQTtJQUFBLENBQUM7SUFFRixTQUFnQixJQUFJO1FBRW5CLE1BQU0sS0FBSyxHQUFHLFFBQVEsRUFBRSxDQUFDO1FBRXpCLElBQUssS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3JCO1lBQ0MsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxzQkFBc0IsRUFBRSxFQUFFLENBQUUsQ0FBQztZQUM5QyxPQUFPO1NBQ1A7UUFFRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsTUFB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