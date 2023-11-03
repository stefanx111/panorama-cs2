"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../inspect.ts" />
/// <reference path="../common/iteminfo.ts" />
/// <reference path="../popups/popup_can_apply_pick_slot.ts" />
var CapabilityCanPatch = (function () {
    let m_cP = $.GetContextPanel();
    let m_elPreviewPanel = m_cP.FindChildInLayoutFile('CanApplyItemModel');
    let m_prevCameraSlot = 0;
    let m_firstCameraAnim = false;
    let m_pos = 0;
    function _ResetPos() {
        m_pos = 0;
        m_prevCameraSlot = 0;
        m_firstCameraAnim = false;
    }
    function _PreviewPatchOnChar(toolId, activeIndex) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_nextPosition', 'MOUSE');
        let elCharPanel = m_elPreviewPanel.FindChildInLayoutFile("CharPreviewPanel");
        if (!elCharPanel || !elCharPanel.IsValid()) {
            return;
        }
        InventoryAPI.PreviewStickerInModelPanel(toolId, activeIndex, elCharPanel);
        _CameraAnim(activeIndex);
    }
    ;
    function _OnRemovePatch(itemId, slotIndex) {
        UiToolkitAPI.ShowGenericPopupTwoOptions($.Localize('#SFUI_Patch_Remove'), $.Localize('#SFUI_Patch_Remove_Desc'), '', $.Localize('#SFUI_Patch_Remove'), function () {
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            InspectAsyncActionBar.ResetTimeouthandle();
            InventoryAPI.WearItemSticker(itemId, slotIndex);
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            InspectAsyncActionBar.SetCallbackTimeout();
        }, $.Localize('#UI_Cancel'), function () {
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            InspectAsyncActionBar.ResetTimeouthandle();
            // @ts-ignore remove after popup_inspect_async-bar.js is TypeScript
            InspectAsyncActionBar.OnCloseRemove();
        });
    }
    function _CameraAnim(activeIndex) {
        if ((m_prevCameraSlot === activeIndex || activeIndex == -1) && m_firstCameraAnim)
            return;
        if (!InventoryAPI.IsItemInfoValid(m_elPreviewPanel.Data().id))
            return;
        InventoryAPI.HighlightPatchBySlot(activeIndex);
        _UpdatePreviewPanelSettingsForPatchPosition(m_elPreviewPanel.Data().id, activeIndex);
        m_prevCameraSlot = activeIndex;
        m_firstCameraAnim = m_firstCameraAnim === false ? true : true;
    }
    ;
    let m_positionData = [
        { type: 'chest', loadoutSlot: 'melee', pos: 0 },
        { type: 'rightarm', loadoutSlot: 'rifle1', pos: 1 },
        { type: 'rightleg', loadoutSlot: 'rifle1', pos: 1 },
        { type: 'rightside', loadoutSlot: 'rifle1', pos: 1 },
        { type: 'back', loadoutSlot: 'rifle1', pos: 2 },
        { type: 'leftarm', loadoutSlot: 'rifle1', pos: -1 },
        { type: 'leftside', loadoutSlot: 'rifle1', pos: -1 },
        { type: 'leftleg', loadoutSlot: 'rifle1', pos: -1 },
    ];
    function _UpdatePreviewPanelSettingsForPatchPosition(charItemId, activeIndex = 0) {
        const charTeam = ItemInfo.GetTeam(m_elPreviewPanel.Data().id);
        let setting_team = charTeam.search('Team_CT') !== -1 ? 'ct' : 't';
        let patchPosition = InventoryAPI.GetCharacterPatchPosition(charItemId, activeIndex.toString());
        let oPositionData = m_positionData.filter(entry => entry.type === patchPosition)[0];
        if (!oPositionData) {
            return;
        }
        InspectModelImage.SetCharScene(m_elPreviewPanel, m_elPreviewPanel.Data().id, LoadoutAPI.GetItemID(setting_team, oPositionData.loadoutSlot));
        let numTurns = 0;
        if (m_pos !== oPositionData.pos) {
            if (m_pos === 0 && oPositionData.pos === 1 ||
                m_pos === 1 && oPositionData.pos === 2 ||
                m_pos === 2 && oPositionData.pos === -1 ||
                m_pos === -1 && oPositionData.pos === 0) {
                numTurns = 1;
            }
            else if (m_pos === 2 && oPositionData.pos === 1 ||
                m_pos === 1 && oPositionData.pos === 0 ||
                m_pos === 0 && oPositionData.pos === -1 ||
                m_pos === -1 && oPositionData.pos === 2) {
                numTurns = -1;
            }
            else if (m_pos === 2 && oPositionData.pos === 0 ||
                m_pos === 1 && oPositionData.pos === -1 ||
                m_pos === -1 && oPositionData.pos === 1 ||
                m_pos === 0 && oPositionData.pos === 2) {
                numTurns = 2;
            }
        }
        m_pos = oPositionData.pos;
        let elModelPanel = m_elPreviewPanel.FindChildInLayoutFile("CharPreviewPanel");
        if (numTurns < 0) {
            elModelPanel.TurnLeftCount(numTurns * -1);
        }
        else {
            elModelPanel.TurnRightCount(numTurns);
        }
        patchPosition = !patchPosition ? 'wide_intro' : patchPosition + _CameraForModel(charItemId, activeIndex);
        elModelPanel.TransitionToCamera('cam_char_inspect_' + patchPosition, 1.25);
    }
    function _CameraForModel(charItemId, activeIndex) {
        const modelplayer = ItemInfo.GetModelPlayer(charItemId);
        if (modelplayer.indexOf('tm_jungle_raider_variantb2') !== -1 && activeIndex === 2) {
            return '_low';
        }
        if (modelplayer.indexOf('tm_professional_letg') !== -1 && activeIndex === 0) {
            return '_shoulder';
        }
        if (modelplayer.indexOf('tm_professional_letg') !== -1 && activeIndex === 2) {
            return '_offset';
        }
        if (modelplayer.indexOf('tm_professional_leth') !== -1 && activeIndex === 2) {
            return '_shoulder_top_left';
        }
        return '';
    }
    // @ts                                                             
    // @ts                                                             
    return {
        PreviewPatchOnChar: _PreviewPatchOnChar,
        CameraAnim: _CameraAnim,
        OnRemovePatch: _OnRemovePatch,
        ResetPos: _ResetPos,
        UpdatePreviewPanelSettingsForPatchPosition: _UpdatePreviewPanelSettingsForPatchPosition,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FwYWJpbGl0eV9jYW5fcGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF9jYXBhYmlsaXR5X2Nhbl9wYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLHNDQUFzQztBQUN0Qyw4Q0FBOEM7QUFDOUMsK0RBQStEO0FBRS9ELElBQUksa0JBQWtCLEdBQUcsQ0FBRTtJQUUxQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDL0IsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUUsbUJBQW1CLENBQUUsQ0FBQztJQUN6RSxJQUFJLGdCQUFnQixHQUFXLENBQUMsQ0FBQztJQUNqQyxJQUFJLGlCQUFpQixHQUFZLEtBQUssQ0FBQztJQUN2QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFJZCxTQUFTLFNBQVM7UUFFakIsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNWLGdCQUFnQixHQUFHLENBQUMsQ0FBQztRQUNyQixpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVELFNBQVMsbUJBQW1CLENBQUUsTUFBYSxFQUFFLFdBQW1CO1FBRS9ELENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFMUUsSUFBSSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUUsa0JBQWtCLENBQUUsQ0FBQztRQUUvRSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUMxQztZQUNDLE9BQU87U0FDUDtRQUVELFlBQVksQ0FBQywwQkFBMEIsQ0FBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBRSxDQUFDO1FBQzVFLFdBQVcsQ0FBRSxXQUFXLENBQUUsQ0FBQztJQUM1QixDQUFDO0lBQUEsQ0FBQztJQUVGLFNBQVMsY0FBYyxDQUFFLE1B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