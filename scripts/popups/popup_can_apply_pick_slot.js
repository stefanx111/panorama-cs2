"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../inspect.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../popups/popup_capability_can_sticker.ts" />
var CanApplyPickSlot = (function () {
    let m_elItemToApply;
    const _Init = function (oSettings) {
        oSettings.infoPanel.RemoveClass('hidden');
        if (oSettings.isRemove) {
            _ShowItemIconsToRemove(oSettings);
        }
        else {
            _AddItemImage(oSettings, oSettings.toolId);
            m_elItemToApply = oSettings.infoPanel.FindChildInLayoutFile('CanStickerItemIcons').Children()[0];
        }
        _BtnActions(oSettings);
    };
    const _ShowItemIconsToRemove = function (oSettings) {
        let slotCount = InventoryAPI.GetItemStickerSlotCount(oSettings.itemId);
        let elContainer = oSettings.infoPanel.FindChildInLayoutFile('CanStickerItemIcons');
        elContainer.RemoveAndDeleteChildren();
        for (let i = 0; i < slotCount; i++) {
            let imagePath = InventoryAPI.GetItemStickerImageBySlot(oSettings.itemId, i);
            if (imagePath) {
                let elPatch = $.CreatePanel('RadioButton', elContainer, imagePath, { group: "remove-btns" });
                elPatch.Data().slot = i;
                elPatch.BLoadLayoutSnippet('RemoveBtn');
                let elImage = elPatch.FindChildInLayoutFile('RemoveImage');
                elImage.SetImage('file://{images}' + imagePath + '_large.png');
                elPatch.SetPanelEvent('onactivate', oSettings.funcOnSelectForRemove.bind(undefined, i));
            }
        }
    };
    const _AddItemImage = function (oSettings, itemid) {
        let elContainer = oSettings.infoPanel.FindChildInLayoutFile('CanStickerItemIcons');
        let aItems;
        aItems = itemid.split(',');
        aItems.forEach(itemId => {
            let elImage = elContainer.FindChildInLayoutFile(itemId);
            if (!elImage) {
                let elImage = $.CreatePanel('ItemImage', elContainer, itemId);
                elImage.itemid = Number(itemId);
                elImage.AddClass('popup-can-apply-item-image');
            }
        });
    };
    const _BtnActions = function (oSettings) {
        let slotsCount = oSettings.isRemove ? InventoryAPI.GetItemStickerSlotCount(oSettings.itemId) : CanApplySlotInfo.GetEmptySlotList().length;
        let elContinueBtn = oSettings.infoPanel.FindChildInLayoutFile('CanApplyContinue');
        let elNextSlotBtn = oSettings.infoPanel.FindChildInLayoutFile('CanApplyNextPos');
        if (elContinueBtn)
            elContinueBtn.SetHasClass('hidden', oSettings.isRemove);
        if (elNextSlotBtn) {
            elNextSlotBtn.enabled = !(oSettings.isRemove || slotsCount == 1);
            elNextSlotBtn.SetHasClass('hidden', oSettings.isRemove);
        }
        if (oSettings.isRemove) {
            return;
        }
        if (slotsCount >= 1) {
            if (elContinueBtn)
                elContinueBtn.SetPanelEvent('onactivate', () => _OnContinue(elContinueBtn, oSettings));
            if (elNextSlotBtn)
                elNextSlotBtn.SetPanelEvent('onactivate', () => _NextSlot(elContinueBtn, oSettings));
        }
    };
    const _DisableBtns = function (elPanel) {
        elPanel.FindChildInLayoutFile('CanApplyContinue').enabled = false;
        ;
        elPanel.FindChildInLayoutFile('CanApplyNextPos').enabled = false;
    };
    const _OnContinue = function (elContinueBtn, oSettings) {
        oSettings.funcOnConfirm();
        elContinueBtn.enabled = false;
        m_elItemToApply.ToggleClass('popup-can-apply-item-image--anim');
    };
    const _NextSlot = function (elContinueBtn, oSettings) {
        CanApplySlotInfo.IncrementIndex();
        oSettings.funcOnNext(oSettings.toolId, CanApplySlotInfo.GetSelectedEmptySlot());
        let elNextSlotBtn = oSettings.infoPanel.FindChildInLayoutFile('CanApplyNextPos');
        elNextSlotBtn.enabled = false;
        $.Schedule(1, () => {
            if (elNextSlotBtn && elNextSlotBtn.IsValid()) {
                elNextSlotBtn.enabled = true;
            }
        });
        elContinueBtn.enabled = true;
    };
    const _SelectFirstRemoveItem = function () {
        let elContainer = $.GetContextPanel().FindChildInLayoutFile('PopUpCanApplyPickSlot').FindChildInLayoutFile('CanStickerItemIcons');
        if (elContainer.Children()[0] !== undefined && elContainer.Children()[0].IsValid()) {
            $.DispatchEvent("Activated", elContainer.Children()[0], "mouse");
        }
    };
    return {
        Init: _Init,
        DisableBtns: _DisableBtns,
        SelectFirstRemoveItem: _SelectFirstRemoveItem,
        ShowItemIconsToRemove: _ShowItemIconsToRemove
    };
})();
var CanApplySlotInfo = (function () {
    let m_emptySlotList = [];
    let m_slotIndex = 0;
    const _ResetSlotIndex = function () {
        m_slotIndex = 0;
        m_emptySlotList = [];
    };
    const _UpdateEmptySlotList = function (itemId) {
        m_emptySlotList = _GetEmptySlots(_GetSlotInfo(itemId));
    };
    const _GetSlotInfo = function (itemId) {
        let aSlotInfoList = [];
        let slotsCount = InventoryAPI.GetItemStickerSlotCount(itemId);
        for (let i = 0; i < slotsCount; i++) {
            let ImagePath = InventoryAPI.GetItemStickerImageBySlot(itemId, i);
            aSlotInfoList.push({ index: i, path: !ImagePath ? 'empty' : ImagePath });
        }
        return aSlotInfoList;
    };
    const _GetEmptySlots = function (slotInfoList) {
        return slotInfoList.filter(function (slot) {
            if (slot.path === 'empty')
                return true;
        });
    };
    const _GetSelectedEmptySlot = function () {
        let emptySlotCount = m_emptySlotList.length;
        if (emptySlotCount === 0) {
            return 0;
        }
        let activeIndex = (m_slotIndex % emptySlotCount);
        return m_emptySlotList[activeIndex].index;
    };
    const _GetSelectedRemoveSlot = function () {
        let elContainer = $.GetContextPanel().FindChildInLayoutFile('PopUpCanApplyPickSlot').FindChildInLayoutFile('CanStickerItemIcons');
        if (elContainer.IsValid() && elContainer.Children().length > 0) {
            let aSelected = elContainer.Children().filter(entry => (entry.checked === true));
            return aSelected.length > 0 ? aSelected[0].Data().slot : 0;
        }
        return;
    };
    const _IncrementIndex = function () {
        m_slotIndex++;
    };
    const _GetIndex = function () {
        return m_slotIndex;
    };
    const _GetEmptySlotList = function () {
        return m_emptySlotList;
    };
    return {
        UpdateEmptySlotList: _UpdateEmptySlotList,
        GetEmptySlotList: _GetEmptySlotList,
        GetSelectedEmptySlot: _GetSelectedEmptySlot,
        GetSelectedRemoveSlot: _GetSelectedRemoveSlot,
        IncrementIndex: _IncrementIndex,
        GetIndex: _GetIndex,
        ResetSlotIndex: _ResetSlotIndex
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FuX2FwcGx5X3BpY2tfc2xvdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX2Nhbl9hcHBseV9waWNrX3Nsb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyxzQ0FBc0M7QUFDdEMsOENBQThDO0FBQzlDLGtFQUFrRTtBQU1sRSxJQUFJLGdCQUFnQixHQUFHLENBQUU7SUFFeEIsSUFBSSxlQUF3QixDQUFDO0lBRTdCLE1BQU0sS0FBSyxHQUFHLFVBQVUsU0FBc0I7UUFFN0MsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7UUFFNUMsSUFBSyxTQUFTLENBQUMsUUFBUSxFQUN2QjtZQUNDLHNCQUFzQixDQUFFLFNBQVMsQ0FBRSxDQUFDO1NBRXBDO2FBRUQ7WUFDQyxhQUFhLENBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUUsQ0FBQztZQUM3QyxlQUFlLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDLFFBQVEsRUFBRSxDQUFFLENBQUMsQ0FBRSxDQUFDO1NBQ3JHO1FBRUQsV0FBVyxDQUFFLFNBQVMsQ0FBRSxDQUFDO0lBQzFCLENBQUMsQ0FBQztJQUVGLE1BQU0sc0JBQXNCLEdBQUcsVUFBVSxTQUFzQjtRQUU5RCxJQUFJLFNBQVMsR0FBRyxZQUFZLENBQUMsdUJBQXVCLENBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1FBQ3pFLElBQUksV0FBVyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUUscUJBQXFCLENBQUUsQ0FBQztRQUNyRixXQUFXLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUV0QyxLQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUNuQztZQUNDLElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyx5QkFB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