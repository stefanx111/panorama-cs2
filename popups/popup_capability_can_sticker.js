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
        CanApplySlotInfo.UpdateEmptySlotList(itemId);
        CanApplyPickSlot.Init(oSettings);
        _SetItemModel(toolId, itemId);
        _SetUpAsyncActionBar(toolId, itemId);
        _UpdateEnableDisaleOkBtn(false);
        if (m_worktype === "remove_sticker") {
            $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', CapabilityCanSticker.OnFinishedScratch);
        }
        $.DispatchEvent('CapabilityPopupIsOpen', true);
    }
    ;
    const _OnConfirmPressed = function () {
        $.DispatchEvent('CSGOPlaySoundEffect', 'generic_button_press', 'MOUSE');
        _SetSelectedSlot(CanApplySlotInfo.GetSelectedEmptySlot());
        _UpdateEnableDisaleOkBtn(true);
    };
    const _OnNextPressed = function (itemToApplyId, activeSlot) {
        _UpdateEnableDisaleOkBtn(false);
        if (m_worktype === 'can_sticker') {
            CapabilityCanSticker.PreviewStickerInSlot(itemToApplyId, activeSlot);
        }
        else if (m_worktype === 'can_patch') {
            $.Schedule(.1, () => CapabilityCanPatch.PreviewPatchOnChar(itemToApplyId, activeSlot));
        }
    };
    const _OnSelectForRemove = function (slotIndex) {
        if (m_worktype === 'remove_sticker') {
            CapabilityCanSticker.CameraAnim(slotIndex);
            _SetSelectedSlot(slotIndex);
            _UpdateEnableDisaleOkBtn(true);
            CapabilityCanSticker.HighlightStickerBySlot(slotIndex);
        }
        else if (m_worktype === 'remove_patch') {
            CapabilityCanPatch.CameraAnim(slotIndex);
            _SetSelectedSlot(slotIndex);
            _UpdateEnableDisaleOkBtn(true);
        }
    };
    const _UpdateEnableDisaleOkBtn = function (bEnable) {
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
                $.Schedule(.1, () => CapabilityCanPatch.PreviewPatchOnChar(toolId, CanApplySlotInfo.GetSelectedEmptySlot()));
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
        _CameraAnim(CanApplySlotInfo.GetSeletedRemoveSlot());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FwYWJpbGl0eV9jYW5fc3RpY2tlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBvcHVwX2NhcGFiaWxpdHlfY2FuX3N0aWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscUNBQXFDO0FBQ3JDLHNDQUFzQztBQUN0Qyw4Q0FBOEM7QUFDOUMsZ0VBQWdFO0FBQ2hFLCtEQUErRDtBQWUvRCxJQUFJLHdCQUF3QixHQUFHLENBQUU7SUFFaEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ2pDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFFLENBQUM7SUFDM0UsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0lBQ3ZCLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFFYixJQUFJLENBQUMsa0JBQWtCLENBQUUsb0JBQW9CLEVBQUUsTUFBTSxDQUFFLENBQUM7UUFFeEQsSUFBSSxNQUFNLEdBQVcsRUFBRSxDQUFDO1FBQ3hCLElBQUksTUFBTSxHQUFXLEVBQUUsQ0FBQztRQUN4QixVQUFVLEdBQUcsQ0FBRSxJQUFJLENBQUMsa0JBQWtCLENBQUUsZUFBZSxFQUFFLEVBQUUsQ0FBRSxDQUFFLENBQUM7UUFFaEUsVUFBVSxHQUFHLENBQUUsVUFBVSxLQUFLLGdCQUFnQixJQUFJLFVBQVUsS0FBSyxjQUFjLENBQUUsQ0FBQztRQUVsRixJQUFLLFVBQVUsRUFDZjtZQUNDLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUUsUUFBUSxFQUFFLGFBQWEsQ0FBRSxDQUFDO1lBQzVELElBQUssQ0FBQyxNQUFNLEVBQ1o7Z0JBRUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsT0FBTTthQUNOO1NBQ0Q7YUFFRDtZQUVDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBRSxtQkFBbUIsRUFBRSxhQUFhLENBQUUsQ0FBQztZQUM3RSxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1lBQ2pDLE1BQU0sR0FBRyxNQUFNLENBQUUsQ0FBQyxDQUFFLENBQUM7WUFDckIsTUFBTSxHQUFHLE1BQU0sQ0FBRSxDQUFDLENBQUUsQ0FBQztTQUNyQjtRQUVELElBQUksU0FBUyxHQUFnQjtZQUM1QixXQUFXLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixDQUFFO1lBQ2hFLFNBQVMsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUUsdUJBQXVCLENBQUU7WUFDaEUsTUFBTSxFQUFFLE1BQU07WUFDZCxNQUFNLEVBQUUsTUFBTTtZQUNkLFFBQVEsRUFBRSxVQUFVO1lBQ3BCLElBQUksRUFBRSxDQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUUsU0FBUyxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RILGFBQWEsRUFBRSxpQkFBaUI7WUFDaEMsVUFBVSxFQUFFLGNBQWM7WUFDMUIscUJBQXFCLEVBQUUsa0JBQWtCO1NBQ3pDLENBQUM7UUFFRixtRUFBbUU7UUFDbkUsY0FBYyxDQUFDLElBQUksQ0FBRSxTQUFTLENBQUUsQ0FBQztRQUNqQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBRSxNQUFNLENBQUUsQ0FBQztRQUMvQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUUsU0FBUyxDQUFFLENBQUM7UUFFbkMsYUFBYSxDQUFFLE1BQU0sRUFBRSxNQUFNLENBQUUsQ0FBQztRQUNoQyxvQkFBb0IsQ0FBRSxNQUFNLEVBQUUsTUFBTSxDQUFFLENBQUM7UUFDdkMsd0JBQXdCLENBQUUsS0FBSyxDQUFFLENBQUM7UUFHbEMsSUFBSyxVQUFVLEtBQUssZ0JBQWdCLEVBQ3BDO1lBQ0MsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDhDQUE4QyxFQUFFLG9CQUFvQixDQUFDLGlCQUFpQixDQUFFLENBQUM7U0FDdEg7UUFFRCxDQUFDLENBQUMsYUFBYSxDQUFFLHVCQUF1QixFQUFFLElBQUksQ0FBRSxDQUFDO0lBQ2xELENBQUM7SUFBQSxDQUFDO0lBSUYsTUFBTSxpQkFBaUIsR0FBRztRQUV6QixDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTFFLGdCQUFnQixDQUFFLGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQztRQUMzRCx3QkFBd0IsQ0FBRSxJQUFJLENBQUUsQ0FBQztJQUNsQyxDQUFDLENBQUE7SUFFRCxNQUFNLGNBQWMsR0FBRyxVQUFVLGFBQW9CLEVBQUUsVUFBaUI7UUFFdkUsd0JBQXdCLENBQUUsS0FBSyxDQUFFLENBQUM7UUFDbEMsSUFBSyxVQUFVLEtBQUssYUFBYSxFQUNqQztZQUNDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFFLGFBQWEsRUFBRSxVQUFVLENBQUUsQ0FBQztTQUN2RTthQUNJLElBQUssVUFBVSxLQUFLLFdBQVcsRUFDcEM7WUFDQyxDQUFDLENBQUMsUUFBUSxDQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBRSxhQUFhLEVBQUUsVUFBVSxDQUFFLENBQUMsQ0FBQztTQUMxRjtJQUNGLENBQUMsQ0FBQTtJQUVELE1BQU0sa0JBQWtCLEdBQUcsVUFBVyxTQUFnQjtRQUVyRCxJQUFLLFVBQVUsS0FBSyxnQkFBZ0IsRUFDcEM7WUFDQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUUsU0FBUyxDQUFFLENBQUM7WUFDN0MsZ0JBQWdCLENBQUUsU0FBUyxDQUFFLENBQUM7WUFDOUIsd0JBQXdCLENBQUUsSUFBSSxDQUFFLENBQUM7WUFDakMsb0JBQW9CLENBQUMsc0JBQXNCLENBQUUsU0FBUyxDQUFFLENBQUM7U0FDekQ7YUFDSSxJQUFLLFVBQVUsS0FBSyxjQUFjLEVBQ3ZDO1lBQ0Msa0JBQWtCLENBQUMsVUFBVSxDQUFFLFNBQVMsQ0FBRSxDQUFDO1lBQzNDLGdCQUFnQixDQUFFLFNBQVMsQ0FBRSxDQUFDO1lBQzlCLHdCQUF3QixDQUFFLElBQUksQ0FBRSxDQUFDO1NBQ2pDO0lBQ0YsQ0FBQyxDQUFBO0lBRUQsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLE9BQWU7UUFFekQsSUFBSSxxQkFBcUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsc0JBQXNCLENBQUUsQ0FBQztRQUNqRixtRUFBbUU7UUFDbkUscUJBQXFCLENBQUMsa0JBQWtCLENBQUUscUJBQXFCLEVBQUUsT0FBTyxDQUFFLENBQUM7SUFDNUUsQ0FBQyxDQUFBO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLFNBQWdCO1FBRWxELElBQUksQ0FBQyxrQkFBa0IsQ0FBRSx5QkFBeUIsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUUsQ0FBQztJQUM1RSxDQUFDLENBQUE7SUFJRCxNQUFNLGFBQWEsR0FBRyxVQUFXLE1BQWMsRUFBRSxNQUFjO1FBRTlELElBQUssQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFFLE1BQU0sQ0FBRTtZQUMzQyxPQUFPO1FBRVIsaUJBQWlCLENBQUMsSUFBSSxDQUFFLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBRSxDQUFDO1FBQ3hFLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFFcEMsSUFBSyxVQUFVLEVBQ2Y7WUFDQyxDQUFDLENBQUMsUUFBUSxDQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFFLENBQUM7U0FDakU7YUFFRDtZQUNDLElBQUssVUFBVSxLQUFLLGFBQWEsRUFDakM7Z0JBQ0Msb0JBQW9CLENBQUMsb0JBQW9CLENBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLENBQUUsQ0FBQTthQUM1RjtZQUVELElBQUssVUFBVSxLQUFNLFdBQVcsRUFDaEM7Z0JBQ0MsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUUsTUFBTSxFQUFFLGdCQUFnQixDQUFDLG9CQUFvQixFQUFFLENBQUUsQ0FBQyxDQUFDO2FBQ2hIO1NBQ0Q7SUFDRixDQUFDLENBQUM7SUFFRixNQUFNLG9CQUFvQixHQUFHLFVBQVcsTUFBYyxFQUFFLE1BQWM7UUFFckUsSUFBSSxDQUFDLGtCQUFrQixDQUFFLFFBQVEsRUFBRSxNQUFNLENBQUUsQ0FBQztRQUU1QyxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxzQkFBc0IsQ0FBRSxDQUFDO1FBQ25GLG1FQUFtRTtRQUNuRSxxQkFBcUIsQ0FBQyxJQUFJLENBQ3pCLHFCQUFxQixFQUNyQixNQUFNLEVBQ04sbUJBQW1CLEVBQ25CLDZCQUE2QixDQUM3QixDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsTUFBTSxtQkFBbUIsR0FBRyxVQUFXLFdBQW1CLEVBQUUsWUFBb0I7UUFFL0UsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUUsV0FBVyxFQUFFLFlBQVksQ0FBRSxDQUFDO0lBQzdELENBQUMsQ0FBQztJQUVGLE1BQU0sNkJBQTZCLEdBQUcsVUFBVSxNQUFhLEVBQUUsTUFBYSxFQUFFLElBQVc7UUFFeEYsZ0JBQWdCLENBQUMsV0FBVyxDQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFFLENBQUM7UUFFdEYsSUFBSyxVQUFVLEtBQUssZ0JBQWdCLEVBQ3BDO1lBQ0Msb0JBQW9CLENBQUMsZ0JBQWdCLENBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3JEO2FBQ0ksSUFBSyxVQUFVLEtBQUssY0FBYyxFQUN2QztZQUNDLGtCQUFrQixDQUFDLGFBQWEsQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDaEQ7YUFFRDtZQUNDLElBQUksUUFBUSxHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBRSxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7WUFDL0QsSUFBSyxRQUFRLEVBQ2I7Z0JBQ0MsWUFBWSxDQUFDLE9BQU8sQ0FBRSxNQUFNLEVBQUUsTUFBTSxDQUFFLENBQUM7YUFDdkM7U0FDRDtJQUNGLENBQUMsQ0FBQztJQUlGLE1BQU0sV0FBVyxHQUFHO1FBRW5CLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFFLHNCQUFzQixDQUFFLENBQUM7UUFFbkYsSUFBSyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBRSxRQUFRLENBQUUsRUFDakQ7WUFDQyxtRUFBbUU7WUFDbkUscUJBQXFCLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdkM7SUFDRixDQUFDLENBQUM7SUFFRixPQUFPO1FBQ04sSUFBSSxFQUFFLEtBQUs7UUFDWCxZQUFZLEVBQUUsYUFBYTtRQUMzQixVQUFVLEVBQUUsV0FBVztLQUN2QixDQUFDO0FBQ0gsQ0FBQyxDQUFFLEVBQUUsQ0FBQztBQU1OLElBQUksb0JBQW9CLEdBQUcsQ0FBRTtJQUU1QixJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQztJQUM3QixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUM5QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDakMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztJQUUzRSxNQUFNLG1CQUFtQixHQUFHO1FBQzNCLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO1FBQ3ZFLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFO1FBQzFFLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsRUFBRTtRQUNwRyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUcsSUFBSSxFQUFFLENBQUMsRUFBRTtLQUN4RSxDQUFDO0lBRUYsTUFBTSxxQkFBcUIsR0FBRyxVQUFXLFNBQWlCLEVBQUUsSUFBWTtRQUV2RSxDQUFDLENBQUMsYUFBYSxDQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE9BQU8sQ0FBRSxDQUFDO1FBRTFFLElBQUksT0FBTyxHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUEwQixJQUFJLElBQUksQ0FBQztRQUN0RyxZQUFZLENBQUMsMEJBQTBCLENBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUUsQ0FBQztRQUNwRSxZQUFZLENBQUMsdUJBQXVCLENBQUUsSUFBSSxDQUFFLENBQUM7UUFFN0MsV0FBVyxDQUFFLElBQUksQ0FBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQztJQUVGLE1BQU0sV0FBVyxHQUFHLFVBQVcsSUFBd0I7UUFFdEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBQzdFLElBQUksT0FBTyxHQUFHLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUEwQixJQUFJLElBQUksQ0FBQztRQUV0RyxJQUFJLFlBQVksR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxLQUFLLE9BQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBRSxDQUFDO1FBQzlHLElBQUssWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQzVCO1lBQ0MsT0FBTyxDQUFDLFdBQVcsQ0FBRSxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBRSxDQUFDLENBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFFLENBQUM7WUFFckYsSUFBSyxZQUFZLENBQUUsQ0FBQyxDQUFFLENBQUMsY0FBYyxDQUFFLFFBQVEsQ0FBRSxFQUNqRDtnQkFDQyxpQkFBaUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO2dCQUM5QyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBRSxDQUFDLENBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFFLENBQUM7YUFDbkg7U0FDRDthQUVEO1lBQ0MsSUFBSyxDQUFDLGlCQUFpQixFQUN2QjtnQkFHQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7Z0JBQ3pCLE9BQU87YUFDUDtZQUVELGlCQUFpQixDQUFDLHlCQUF5QixDQUFFLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBRSxDQUFDO1lBQzdGLE9BQU8sQ0FBQyxXQUFXLENBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUUsQ0FBQztTQUMvQjtJQUNGLENBQUMsQ0FBQztJQUdGLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxTQUFnQjtJQUtuRCxDQUFDLENBQUE7SUFFRCxNQUFNLGlCQUFpQixHQUFHLFVBQVcsTUFBYyxFQUFFLFNBQWlCO1FBRXJFLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFeEUsSUFBSyxZQUFZLENBQUMsMEJBQTBCLENBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBRSxFQUNqRTtZQUNDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUV4QixZQUFZLENBQUMsMEJBQTBCLENBQ3RDLENBQUMsQ0FBQyxRQUFRLENBQUUsc0JBQXNCLENBQUUsRUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBRSwyQkFBMkIsQ0FBRSxFQUN6QyxFQUFFLEVBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxzQkFBc0IsQ0FBRSxFQUNwQztnQkFFQyxtRUFBbUU7Z0JBQ25FLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzNDLFlBQVksQ0FBQyxlQUFlLENBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBRSxDQUFDO2dCQUVsRCxtRUFBbUU7Z0JBQ25FLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDNUMsQ0FBQyxFQUNELENBQUMsQ0FBQyxRQUFRLENBQUUsWUFBWSxDQUFFLEVBQzFCO2dCQUVDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztnQkFDekIsbUVBQW1FO2dCQUNuRSxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUMzQyxtRUFBbUU7Z0JBQ25FLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3ZDLENBQUMsQ0FDRCxDQUFDO1NBQ0Y7YUFFRDtZQVlDLHVCQUF1QixDQUFFLFNBQVMsQ0FBRSxDQUFDO1lBQ3JDLFlBQVksQ0FBQyxlQUFlLENBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBRSxDQUFDO1lBRWxELG1FQUFtRTtZQUNuRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsdUJBQXVCLENBQUUsQ0FBQyxxQkFBcUIsQ0FBRSxxQkFBcUIsQ0FBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25JLFVBQVUsQ0FBQyxPQUFPLENBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBRSxDQUFDO1NBQ3pEO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsTUFBTSx1QkFBdUIsR0FBRyxVQUFXLFNBQWlCO1FBRTNELFlBQVksQ0FBQyxzQkFBc0IsQ0FBRSxTQUFTLENBQUUsQ0FBQztJQUNsRCxDQUFDLENBQUM7SUFFRixNQUFNLGtCQUFrQixHQUFHO1FBSTFCLElBQUssZ0JBQWdCLElBQUksQ0FBQyxJQUFJLEVBQzlCO1lBQ0MsT0FBTztTQUNQO1FBRUQsbUVBQW1FO1FBQ25FLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0MsbUVBQW1FO1FBQ25FLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3RDLGlCQUFpQixDQUFDLGVBQWUsQ0FBRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUUsQ0FBQztRQUNoRSxXQUFXLENBQUUsZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsQ0FBRSxDQUFDO1FBRXZELG1FQUFtRTtRQUNuRSxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSx1QkFBdUIsQ0FBRSxDQUFDLHFCQUFxQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDaEksSUFBSyxrQkFBa0IsRUFDdkI7WUFDQyxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNqRCxVQUFVLENBQUMsT0FBTyxDQUFFLE9BQU8sQ0FBQyxFQUFFO2dCQUU3QixPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztZQUN4QixDQUFDLENBQUUsQ0FBQztZQUVKLG1FQUFtRTtTQUVuRTtJQUNGLENBQUMsQ0FBQztJQUdGLE9BQU87UUFDTixvQkFBb0IsRUFBRSxxQkFBcUI7UUFDM0MsZ0JBQWdCLEVBQUUsaUJBQWlCO1FBQ25DLGlCQUFpQixFQUFFLGtCQUFrQjtRQUNyQyxVQUFVLEVBQUUsV0FBVztRQUN2QixzQkFBc0IsRUFBRSx1QkFBdUI7S0FDL0MsQ0FBQztBQUNILENBQUMsQ0FBRSxFQUFFLENBQUMifQ==