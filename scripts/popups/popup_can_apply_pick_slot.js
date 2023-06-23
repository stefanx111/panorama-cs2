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
            let elImage = $.CreatePanel('ItemImage', elContainer, itemId);
            elImage.itemid = Number(itemId);
            elImage.AddClass('popup-can-apply-item-image');
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
    const _GetSeletedRemoveSlot = function () {
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
        GetSeletedRemoveSlot: _GetSeletedRemoveSlot,
        IncrementIndex: _IncrementIndex,
        GetIndex: _GetIndex,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FuX2FwcGx5X3BpY2tfc2xvdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX2Nhbl9hcHBseV9waWNrX3Nsb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscUNBQXFDO0FBQ3JDLHNDQUFzQztBQUN0Qyw4Q0FBOEM7QUFDOUMsa0VBQWtFO0FBTWxFLElBQUksZ0JBQWdCLEdBQUcsQ0FBRTtJQUV4QixJQUFJLGVBQXdCLENBQUM7SUFFN0IsTUFBTSxLQUFLLEdBQUcsVUFBVSxTQUFzQjtRQUU3QyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBRSxRQUFRLENBQUUsQ0FBQztRQUU1QyxJQUFLLFNBQVMsQ0FBQyxRQUFRLEVBQ3ZCO1lBQ0Msc0JBQXNCLENBQUUsU0FBUyxDQUFFLENBQUM7U0FFcEM7YUFFRDtZQUNDLGFBQWEsQ0FBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBRSxDQUFDO1lBQzdDLGVBQWUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixDQUFFLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQyxDQUFFLENBQUM7U0FDckc7UUFFRCxXQUFXLENBQUUsU0FBUyxDQUFFLENBQUM7SUFDMUIsQ0FBQyxDQUFDO0lBRUYsTUFBTSxzQkFBc0IsR0FBRyxVQUFVLFNBQXNCO1FBRTlELElBQUksU0FBUyxHQUFHLFlBQVksQ0FBQyx1QkFBdUIsQ0FBRSxTQUFTLENBQUMsTUFBTSxDQUFFLENBQUM7UUFDekUsSUFBSSxXQUFXLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDO1FBQ3JGLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBRXRDLEtBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQ25DO1lBQ0MsSUFBSSxTQUFTLEdBQUcsWUFBWSxDQUFDLHlCQUF5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