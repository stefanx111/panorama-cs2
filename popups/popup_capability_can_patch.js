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
    function _PreviewPatchOnChar(toolId, activeIndex) {
        $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_nextPosition', 'MOUSE');
        let elCharPanel = m_elPreviewPanel.FindChildInLayoutFile("CharPreviewPanel");
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
        { type: 'chest', loadoutSlot: 'secondary1', pos: 0 },
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
        UpdatePreviewPanelSettingsForPatchPosition: _UpdatePreviewPanelSettingsForPatchPosition,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfY2FwYWJpbGl0eV9jYW5fcGF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwb3B1cF9jYXBhYmlsaXR5X2Nhbl9wYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMsc0NBQXNDO0FBQ3RDLDhDQUE4QztBQUM5QywrREFBK0Q7QUFFL0QsSUFBSSxrQkFBa0IsR0FBRyxDQUFFO0lBRTFCLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMvQixJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBRSxtQkFBbUIsQ0FBRSxDQUFDO0lBQ3pFLElBQUksZ0JBQWdCLEdBQVcsQ0FBQyxDQUFDO0lBQ2pDLElBQUksaUJBQWlCLEdBQVksS0FBSyxDQUFDO0lBQ3ZDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUlkLFNBQVMsbUJBQW1CLENBQUUsTUFBYSxFQUFFLFdBQW1CO1FBRS9ELENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFFLENBQUM7UUFFMUUsSUFBSSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUUsa0JBQWtCLENBQUUsQ0FBQztRQUMvRSxZQUFZLENBQUMsMEJBQTBCLENBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUUsQ0FBQztRQUM1RSxXQUFXLENBQUUsV0FBVyxDQUFFLENBQUM7SUFDNUIsQ0FBQztJQUFBLENBQUM7SUFFRixTQUFTLGNBQWMsQ0FBRSxNQUFjLEVBQUUsU0FBaUI7UUFFekQsWUFBWSxDQUFDLDBCQUEwQixDQUN0QyxDQUFDLENBQUMsUUFBUSxDQUFFLG9CQUFvQixDQUFFLEVBQ2xDLENBQUMsQ0FBQyxRQUFRLENBQUUseUJBQXlCLENBQUUsRUFDdkMsRUFBRSxFQUNGLENBQUMsQ0FBQyxRQUFRLENBQUUsb0JBQW9CLENBQUUsRUFDbEM7WUFFQyxtRUFBbUU7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