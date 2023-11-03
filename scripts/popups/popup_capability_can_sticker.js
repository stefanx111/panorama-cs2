"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../inspect.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../popups/popup_capability_can_patch.ts" />
/// <reference path="../popups/popup_can_apply_pick_slot.ts" />
var CapabilityCanApplyAction = (function () {
    const m_cP = $.GetContextPanel();
    const m_elPreviewPanel = m_cP.FindChildInLayoutFile('CanApplyItemModel');
    let m_isRemove = false;
    let m_worktype = '';
    function _Init() {
        m_cP.SetAttributeString('stickerApplyRemove', 'true');
        let itemId = '';
        let toolId = '';
        m_worktype = (m_cP.GetAttributeString("asyncworktype", ""));
        m_isRemove = (m_worktype === "remove_sticker" || m_worktype === "remove_patch");
        if (m_isRemove) {
            itemId = m_cP.GetAttributeString("itemid", "(not found)");
            if (!itemId) {
                _ClosePopUp();
                return;
            }
        }
        else {
            const strMsg = m_cP.GetAttributeString("toolid-and-itemid", "(not found)");
            let idList = strMsg.split(',');
            toolId = idList[0];
            itemId = idList[1];
        }
        let oSettings = {
            headerPanel: m_cP.FindChildInLayoutFile('PopUpCanApplyHeader'),
            infoPanel: m_cP.FindChildInLayoutFile('PopUpCanApplyPickSlot'),
            itemId: itemId,
            toolId: toolId,
            isRemove: m_isRemove,
            type: (m_worktype.indexOf('sticker') !== -1) ? 'sticker' : (m_worktype.indexOf('patch') !== -1) ? 'patch' : '',
            funcOnConfirm: _OnConfirmPressed,
            funcOnNext: _OnNextPressed,
            funcOnSelectForRemove: _OnSelectForRemove
        };
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        CanApplyHeader.Init(oSettings);
        CanApplySlotInfo.ResetSlotIndex();
        CapabilityCanPatch.ResetPos();
        CanApplySlotInfo.UpdateEmptySlotList(itemId);
        CanApplyPickSlot.Init(oSettings);
        _SetItemModel(toolId, itemId);
        _SetUpAsyncActionBar(toolId, itemId);
        _UpdateEnableDisableOkBtn(false);
        if (m_worktype === "remove_sticker") {
            $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', CapabilityCanSticker.OnFinishedScratch);
        }
        $.DispatchEvent('CapabilityPopupIsOpen', true);
    }
    ;
    const _OnConfirmPressed = function () {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        _SetSelectedSlot(CanApplySlotInfo.GetSelectedEmptySlot());
        _UpdateEnableDisableOkBtn(true);
    };
    const _OnNextPressed = function (itemToApplyId, activeSlot) {
        _UpdateEnableDisableOkBtn(false);
        if (m_worktype === 'can_sticker') {
            CapabilityCanSticker.PreviewStickerInSlot(itemToApplyId, activeSlot);
        }
        else if (m_worktype === 'can_patch') {
            $.Schedule(.25, () => CapabilityCanPatch.PreviewPatchOnChar(itemToApplyId, activeSlot));
        }
    };
    const _OnSelectForRemove = function (slotIndex) {
        if (m_worktype === 'remove_sticker') {
            CapabilityCanSticker.CameraAnim(slotIndex);
            _SetSelectedSlot(slotIndex);
            _UpdateEnableDisableOkBtn(true);
            CapabilityCanSticker.HighlightStickerBySlot(slotIndex);
        }
        else if (m_worktype === 'remove_patch') {
            CapabilityCanPatch.CameraAnim(slotIndex);
            _SetSelectedSlot(slotIndex);
            _UpdateEnableDisableOkBtn(true);
        }
    };
    const _UpdateEnableDisableOkBtn = function (bEnable) {
        let elAsyncActionBarPanel = m_cP.FindChildInLayoutFile('PopUpInspectAsyncBar');
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        InspectAsyncActionBar.EnableDisableOkBtn(elAsyncActionBarPanel, bEnable);
    };
    const _SetSelectedSlot = function (slotIndex) {
        m_cP.SetAttributeString('selectedItemToApplySlot', slotIndex.toString());
    };
    const _SetItemModel = function (toolId, itemId) {
        if (!InventoryAPI.IsItemInfoValid(itemId))
            return;
        InspectModelImage.Init(m_elPreviewPanel, itemId, _GetSettingCallback);
        m_elPreviewPanel.Data().id = itemId;
        if (m_isRemove) {
            $.Schedule(.1, () => CanApplyPickSlot.SelectFirstRemoveItem());
        }
        else {
            if (m_worktype === 'can_sticker') {
                CapabilityCanSticker.PreviewStickerInSlot(toolId, CanApplySlotInfo.GetSelectedEmptySlot());
            }
            if (m_worktype === 'can_patch') {
                $.Schedule(.25, () => CapabilityCanPatch.PreviewPatchOnChar(toolId, CanApplySlotInfo.GetSelectedEmptySlot()));
            }
        }
    };
    const _SetUpAsyncActionBar = function (toolId, itemId) {
        m_cP.SetAttributeString('toolid', toolId);
        const elAsyncActionBarPanel = m_cP.FindChildInLayoutFile('PopUpInspectAsyncBar');
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        InspectAsyncActionBar.Init(elAsyncActionBarPanel, itemId, _GetSettingCallback, _AsyncActionPerformedCallback);
    };
    const _GetSettingCallback = function (settingname, defaultvalue) {
        return m_cP.GetAttributeString(settingname, defaultvalue);
    };
    const _AsyncActionPerformedCallback = function (itemid, toolid, slot) {
        CanApplyPickSlot.DisableBtns(m_cP.FindChildInLayoutFile('PopUpCanApplyPickSlot'));
        if (m_worktype === 'remove_sticker') {
            CapabilityCanSticker.OnScratchSticker(itemid, slot);
        }
        else if (m_worktype === 'remove_patch') {
            CapabilityCanPatch.OnRemovePatch(itemid, slot);
        }
        else {
            let bIsValid = InventoryAPI.SetStickerToolSlot(itemid, slot);
            if (bIsValid) {
                InventoryAPI.UseTool(toolid, itemid);
            }
        }
    };
    const _ClosePopUp = function () {
        const elAsyncActionBarPanel = m_cP.FindChildInLayoutFile('PopUpInspectAsyncBar');
        if (!elAsyncActionBarPanel.BHasClass('hidden')) {
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            InspectAsyncActionBar.OnEventToClose();
        }
    };
    return {
        Init: _Init,
        SetItemModel: _SetItemModel,
        ClosePopUp: _ClosePopUp,
    };
})();
var CapabilityCanSticker = (function () {
    let m_isFinalScratch = false;
    let m_firstCameraAnim = false;
    const m_cP = $.GetContextPanel();
    const m_elPreviewPanel = m_cP.FindChildInLayoutFile('CanApplyItemModel');
    const m_weaponPosSettings = [
        { weapontype: 'weapon_tec9', rotatation: -80, pitchAngle: 0, slot: 3 },
        { weapontype: 'weapon_revolver', rotatation: 180, pitchAngle: 0, slot: 4 },
        { weapontype: 'weapon_nova', rotatation: -80, pitchAngle: 0, slot: 0, camera: 'cam_weapon_nova_0' },
        { weapontype: 'weapon_m249', rotatation: -80, pitchAngle: 0, slot: 3 }
    ];
    const _PreviewStickerInSlot = function (stickerId, slot) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_nextPosition', 'MOUSE');
        let elPanel = m_elPreviewPanel.FindChildTraverse('ItemPreviewPanel') || null;
        InventoryAPI.PreviewStickerInModelPanel(stickerId, slot, elPanel);
        InventoryAPI.PeelEffectStickerBySlot(slot);
        _CameraAnim(slot);
    };
    const _CameraAnim = function (slot) {
        const defName = ItemInfo.GetItemDefinitionName(m_elPreviewPanel.Data().id);
        let elPanel = m_elPreviewPanel.FindChildTraverse('ItemPreviewPanel') || null;
        let aPosSettings = m_weaponPosSettings.filter(entry => entry.weapontype === defName && entry.slot === slot);
        if (aPosSettings.length > 0) {
            elPanel.SetRotation(aPosSettings[0].rotatation, aPosSettings[0].pitchAngle, 1);
            if (aPosSettings[0].hasOwnProperty('camera')) {
                InspectModelImage.ResetCameraScheduleHandle();
                InspectModelImage.SetItemCameraByWeaponType(m_elPreviewPanel.Data().id, elPanel, aPosSettings[0].camera, true);
            }
        }
        else {
            if (!m_firstCameraAnim) {
                m_firstCameraAnim = true;
                return;
            }
            InspectModelImage.SetItemCameraByWeaponType(m_elPreviewPanel.Data().id, elPanel, '', true);
            elPanel.SetRotation(0, 0, 1);
        }
    };
    const _OnRemoveSticker = function (slotIndex) {
    };
    const _OnScratchSticker = function (itemId, slotIndex) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_scratchOff', 'MOUSE');
        if (InventoryAPI.IsItemStickerAtExtremeWear(itemId, slotIndex)) {
            m_isFinalScratch = true;
            UiToolkitAPI.ShowGenericPopupTwoOptions($.Localize('#SFUI_Sticker_Remove'), $.Localize('#SFUI_Sticker_Remove_Desc'), '', $.Localize('#SFUI_Sticker_Remove'), function () {
                // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
                InspectAsyncActionBar.ResetTimeouthandle();
                InventoryAPI.WearItemSticker(itemId, slotIndex);
                // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
                InspectAsyncActionBar.SetCallbackTimeout();
            }, $.Localize('#UI_Cancel'), function () {
                m_isFinalScratch = false;
                // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
                InspectAsyncActionBar.ResetTimeouthandle();
                // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
                InspectAsyncActionBar.OnCloseRemove();
            });
        }
        else {
            _HighlightStickerBySlot(slotIndex);
            InventoryAPI.WearItemSticker(itemId, slotIndex);
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            const panelsList = m_cP.FindChildInLayoutFile('PopUpCanApplyPickSlot').FindChildInLayoutFile('CanStickerItemIcons').Children();
            panelsList.forEach(element => element.enabled = false);
        }
    };
    const _HighlightStickerBySlot = function (slotIndex) {
        InventoryAPI.HighlightStickerBySlot(slotIndex);
    };
    const _OnFinishedScratch = function () {
        if (m_isFinalScratch || !m_cP) {
            return;
        }
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        InspectAsyncActionBar.ResetTimeouthandle();
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        InspectAsyncActionBar.OnCloseRemove();
        InspectModelImage.UpdateModelOnly(m_elPreviewPanel.Data().id);
        _CameraAnim(CanApplySlotInfo.GetSelectedRemoveSlot());
        // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        const elStickersToRemove = m_cP.FindChildInLayoutFile('PopUpCanApplyPickSlot').FindChildInLayoutFile('CanStickerItemIcons');
        if (elStickersToRemove) {
            const panelsList = elStickersToRemove.Children();
            panelsList.forEach(element => {
                element.enabled = true;
            });
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
        }
    };
    return {
        PreviewStickerInSlot: _PreviewStickerInSlot,
        OnScratchSticker: _OnScratchSticker,
        OnFinishedScratch: _OnFinishedScratch,
        CameraAnim: _CameraAnim,
        HighlightStickerBySlot: _HighlightStickerBySlot
    };
})();
(function () {
    var _m_PanelRegisteredForEventsStickerApply;
    if (!_m_PanelRegisteredForEventsStickerApply) {
        _m_PanelRegisteredForEventsStickerApply = $.RegisterForUnhandledEvent('CSGOShowMainMenu', CapabilityCanApplyAction.Init);
        $.RegisterForUnhandledEvent('PopulateLoadingScreen', CapabilityCanApplyAction.ClosePopUp);
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FwYWJpbGl0eV9jYW5fc3RpY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX2NhcGFiaWxpdHlfY2FuX3N0aWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHFDQUFxQztBQUNyQyxzQ0FBc0M7QUFDdEMsOENBQThDO0FBQzlDLGdFQUFnRTtBQUNoRSwrREFBK0Q7QUFlL0QsSUFBSSx3QkFBd0IsR0FBRyxDQUFFO0lBRWhDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNqQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO0lBQzNFLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztJQUN2QixJQUFJLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBRWIsSUFBSSxDQUFDLGtCQUFrQixDQUFFLG9CQUFvQixFQUFFLE1BQU0sQ0FBRSxDQUFDO1FBRXhELElBQUksTUFBTSxHQUFXLEVBQUUsQ0FBQztRQUN4QixJQUFJLE1BQU0sR0FBVyxFQUFFLENBQUM7UUFDeEIsVUFBVSxHQUFHLENBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFFLGVBQWUsRUFBRSxFQUFFLENBQUUsQ0FBRSxDQUFDO1FBRWhFLFVBQVUsR0FBRyxDQUFFLFVBQVUsS0FBSyxnQkFBZ0IsSUFBSSxVQUFVLEtBQUssY0FBYyxDQUFFLENBQUM7UUFFbEYsSUFBSyxVQUFVLEVBQ2Y7WUFDQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFFLFFBQVEsRUFBRSxhQUFhLENBQUUsQ0FBQztZQUM1RCxJQUFLLENBQUMsTUFBTSxFQUNaO2dCQUVDLFdBQVcsRUFBRSxDQUFDO2dCQUNkLE9BQU07YUFDTjtTQUNEO2FBRUQ7WUFFQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUUsbUJBQW1CLEVBQUUsYUFBYSxDQUFFLENBQUM7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