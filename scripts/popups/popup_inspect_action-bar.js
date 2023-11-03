"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="../common/item_context_entries.ts" />
/// <reference path="../inspect.ts" />
/// <reference path="../characterbuttons.ts" />
var InspectActionBar = (function () {
    let m_modelImagePanel = null;
    let m_itemId = '';
    let m_callbackHandle = -1;
    let m_showCert = true;
    let m_showEquip = true;
    let m_insideCasketID = '';
    let m_capability = '';
    let m_showSave = true;
    let m_showMarketLink = false;
    let m_showCharSelect = true;
    let m_blurOperationPanel = false;
    let m_previewingMusic = false;
    let m_isSelected = false;
    let m_schfnMusicMvpPreviewEnd = null;
    const _Init = function (elPanel, itemId, funcGetSettingCallback, funcGetSettingCallbackInt, elItemModelImagePanel) {
        if (funcGetSettingCallback('inspectonly', 'false') === 'false')
            return;
        elPanel.RemoveClass('hidden');
        m_modelImagePanel = elItemModelImagePanel;
        m_itemId = itemId;
        m_callbackHandle = funcGetSettingCallbackInt('callback', -1);
        m_showCert = (funcGetSettingCallback('showitemcert', 'true') === 'false');
        m_showEquip = (funcGetSettingCallback('showequip', 'true') === 'false');
        m_insideCasketID = funcGetSettingCallback('insidecasketid', '');
        m_capability = funcGetSettingCallback('capability', '');
        m_showSave = (funcGetSettingCallback('allowsave', 'true') === 'true');
        m_showMarketLink = (funcGetSettingCallback('showmarketlink', 'false') === 'true');
        m_showCharSelect = (funcGetSettingCallback('showcharselect', 'true') === 'true');
        m_isSelected = (funcGetSettingCallback('isselected', 'false') === 'true');
        m_blurOperationPanel = ($.GetContextPanel().GetAttributeString('bluroperationpanel', 'false') === 'true') ? true : false;
        _SetUpItemCertificate(elPanel, itemId);
        _SetupEquipItemBtns(elPanel, itemId);
        _ShowButtonsForWeaponInspect(elPanel, itemId);
        _ShowButtonsForCharacterInspect(elPanel, itemId);
        _SetCloseBtnAction(elPanel);
        _SetUpMarketLink(elPanel, itemId);
        const category = ItemInfo.GetLoadoutCategory(itemId);
        if (category == "musickit") {
            InventoryAPI.PlayItemPreviewMusic(itemId, '');
            m_previewingMusic = true;
            const elMusicBtn = elPanel.FindChildInLayoutFile('InspectPlayMvpBtn');
            elMusicBtn.SetHasClass('hidden', (InventoryAPI.GetItemRarity(itemId) <= 0));
        }
    };
    const _SetUpItemCertificate = function (elPanel, id) {
        const elCert = elPanel.FindChildInLayoutFile('InspectItemCert');
        if (!elCert || !elCert.IsValid()) {
            return;
        }
        const certData = InventoryAPI.GetItemCertificateInfo(id);
        if (!certData || m_showCert) {
            elCert.visible = false;
            return;
        }
        const aCertData = certData.split("\n");
        let strLine = "";
        for (let i = 0; i < aCertData.length - 1; i++) {
            if (i % 2 == 0) {
                strLine = strLine + "<b>" + aCertData[i] + "</b>" + ": " + aCertData[i + 1] + "<br><br>";
            }
        }
        elCert.visible = true;
        elCert.SetPanelEvent('onmouseover', function () {
            UiToolkitAPI.ShowTextTooltip('InspectItemCert', strLine);
        });
        elCert.SetPanelEvent('onmouseout', function () {
            UiToolkitAPI.HideTextTooltip();
        });
    };
    const _SetUpMarketLink = function (elPanel, id) {
        const elMarketLinkBtn = elPanel.FindChildInLayoutFile('InspectMarketLink');
        elMarketLinkBtn.SetHasClass('hidden', !m_showMarketLink);
        if (!m_showMarketLink) {
            return;
        }
        elMarketLinkBtn.SetPanelEvent('onmouseover', function () {
            UiToolkitAPI.ShowTextTooltip('InspectMarketLink', '#SFUI_Store_Market_Link');
        });
        elMarketLinkBtn.SetPanelEvent('onmouseout', function () {
            UiToolkitAPI.HideTextTooltip();
        });
        elMarketLinkBtn.SetPanelEvent('onactivate', function () {
            SteamOverlayAPI.OpenURL(ItemInfo.GetMarketLinkForLootlistItem(id));
            StoreAPI.RecordUIEvent("ViewOnMarket");
        });
    };
    const _SetupEquipItemBtns = function (elPanel, id) {
        const elMoreActionsBtn = elPanel.FindChildInLayoutFile('InspectActionsButton');
        const elSingleActionBtn = elPanel.FindChildInLayoutFile('SingleAction');
        if (m_insideCasketID) {
            elMoreActionsBtn.AddClass('hidden');
            elSingleActionBtn.RemoveClass('hidden');
            elSingleActionBtn.text = !m_isSelected ? '#UI_Select' : '#UI_Unselect';
            elSingleActionBtn.SetPanelEvent('onactivate', _OnActivateUpdateSelectionForMultiSelect.bind(undefined, id));
            return;
        }
        if (m_showEquip) {
            elMoreActionsBtn.AddClass('hidden');
            elSingleActionBtn.AddClass('hidden');
            return;
        }
        const isFanToken = ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_pass_');
        const isSticker = ItemInfo.ItemMatchDefName(id, 'sticker');
        const isPatch = ItemInfo.ItemMatchDefName(id, 'patch');
        const isSpraySealed = ItemInfo.IsSpraySealed(id);
        const isEquipped = (ItemInfo.IsEquippedForT(id) || ItemInfo.IsEquippedForCT(id) || ItemInfo.IsEquippedForNoTeam(id)) ? true : false;
        if (ItemInfo.IsEquippalbleButNotAWeapon(id) ||
            isSticker ||
            isSpraySealed ||
            isFanToken ||
            isPatch ||
            isEquipped) {
            elMoreActionsBtn.AddClass('hidden');
            if (!isEquipped) {
                elSingleActionBtn.RemoveClass('hidden');
                _SetUpSingleActionBtn(elPanel, id, (isSticker || isSpraySealed || isFanToken || isPatch));
            }
            return;
        }
        else {
            elMoreActionsBtn.RemoveClass('hidden');
            elSingleActionBtn.AddClass('hidden');
        }
    };
    const _SetUpSingleActionBtn = function (elPanel, id, closeInspect) {
        const validEntries = ItemContextEntires.FilterEntries('inspect');
        const elSingleActionBtn = elPanel.FindChildInLayoutFile('SingleAction');
        for (let i = 0; i < validEntries.length; i++) {
            const entry = validEntries[i];
            if (entry.AvailableForItem(id)) {
                let displayName = '';
                if (entry.name instanceof Function) {
                    displayName = entry.name(id);
                }
                else {
                    displayName = entry.name;
                }
                elSingleActionBtn.text = '#inv_context_' + displayName;
                elSingleActionBtn.SetPanelEvent('onactivate', () => _OnSingleAction(entry, id, closeInspect));
                elSingleActionBtn.RemoveClass('hidden');
            }
        }
    };
    const _OnSingleAction = function (entry, id, closeInspect) {
        if (closeInspect) {
            _CloseBtnAction();
        }
        entry.OnSelected(id);
    };
    const _OnActivateUpdateSelectionForMultiSelect = function (idSubjectItem) {
        _CloseBtnAction();
        $.DispatchEvent('UpdateSelectItemForCapabilityPopup', m_capability, idSubjectItem, !m_isSelected);
    };
    const _ShowButtonsForWeaponInspect = function (elPanel, id) {
        if (m_showCharSelect === false) {
            return;
        }
        const hasAnims = ItemInfo.IsCharacter(id) || ItemInfo.IsWeapon(id);
        if (hasAnims &&
            !ItemInfo.IsEquippalbleButNotAWeapon(id) &&
            !ItemInfo.ItemMatchDefName(id, 'sticker') &&
            !ItemInfo.IsSpraySealed(id) &&
            !ItemInfo.ItemDefinitionNameSubstrMatch(id, "tournament_journal_") &&
            !ItemInfo.ItemDefinitionNameSubstrMatch(id, "tournament_pass_")) {
            elPanel.FindChildInLayoutFile('InspectCharBtn').SetHasClass('hidden', !hasAnims);
            elPanel.FindChildInLayoutFile('InspectWeaponBtn').SetHasClass('hidden', !hasAnims);
            const list = CharacterAnims.GetValidCharacterModels(true).filter(function (entry) {
                return (ItemInfo.IsItemCt(id) && (entry.team === 'ct' || entry.team === 'any')) ||
                    (ItemInfo.IsItemT(id) && (entry.team === 't' || entry.team === 'any')) ||
                    ItemInfo.IsItemAnyTeam(id);
            });
            if (list && (list.length > 0) && !elPanel.FindChildInLayoutFile('InspectDropdownCharModels').Data().selectedId)
                _SetDropdown(elPanel, list, id);
        }
    };
    function _ShowButtonsForCharacterInspect(elPanel, id) {
        const elPreviewPanel = InspectModelImage.GetModelPanel();
        if (!ItemInfo.IsCharacter(id))
            return;
        elPanel.FindChildInLayoutFile('id-character-button-container').SetHasClass('hidden', false);
        const inspectCameraPresets = {
            "AspectRatio4x3": [16, 17],
            "AspectRatio16x9": [26, 27],
            "AspectRatio21x9": [28, 29]
        };
        let arrCameraSetToUse = inspectCameraPresets.AspectRatio4x3;
        if ($.GetContextPanel().BAscendantHasClass("AspectRatio16x9") ||
            $.GetContextPanel().BAscendantHasClass("AspectRatio16x10")) {
            arrCameraSetToUse = inspectCameraPresets.AspectRatio16x9;
        }
        else if ($.GetContextPanel().BAscendantHasClass("AspectRatio21x9")) {
            arrCameraSetToUse = inspectCameraPresets.AspectRatio21x9;
        }
        const characterToolbarButtonSettings = {
            charItemId: id,
            cameraPresetUnzoomed: arrCameraSetToUse[0],
            cameraPresetZoomed: arrCameraSetToUse[1]
        };
        const elCharacterButtons = elPanel.FindChildInLayoutFile('id-character-buttons');
        CharacterButtons.InitCharacterButtons(elCharacterButtons, elPreviewPanel, characterToolbarButtonSettings);
    }
    const _SetDropdown = function (elPanel, validEntiresList, id) {
        const currentMainMenuVanitySettings = ItemInfo.GetOrUpdateVanityCharacterSettings(ItemInfo.IsItemAnyTeam(id) ? null
            : LoadoutAPI.GetItemID(ItemInfo.IsItemCt(id) ? 'ct' : 't', 'customplayer'));
        const elDropdown = elPanel.FindChildInLayoutFile('InspectDropdownCharModels');
        validEntiresList.forEach(function (entry) {
            const rarityColor = ItemInfo.GetRarityColor(entry.itemId);
            const newEntry = $.CreatePanel('Label', elDropdown, entry.itemId, {
                'class': 'DropDownMenu',
                'html': 'true',
                'text': "<font color='" + rarityColor + "'>•</font> " + entry.label,
                'data-team': (entry.team === 'any') ? ((ItemInfo.IsItemT(id) || ItemInfo.IsItemAnyTeam(id)) ? 't' : 'ct') : entry.team
            });
            elDropdown.AddOption(newEntry);
        });
        elDropdown.SetPanelEvent('oninputsubmit', () => InspectActionBar.OnUpdateCharModel(false, elDropdown, id));
        elDropdown.SetSelected(currentMainMenuVanitySettings.charItemId);
        elDropdown.SetPanelEvent('oninputsubmit', () => InspectActionBar.OnUpdateCharModel(true, elDropdown, id));
    };
    const _OnUpdateCharModel = function (bPlaySound, elDropdown, weaponItemId) {
        const characterItemId = elDropdown.GetSelected().id;
        elDropdown.Data().selectedId = elDropdown.GetSelected().id;
        InspectModelImage.SetCharScene(m_modelImagePanel, characterItemId, weaponItemId);
    };
    const _NavigateModelPanel = function (type) {
        InspectModelImage.ShowHideItemPanel((type !== 'InspectModelChar'));
        InspectModelImage.ShowHideCharPanel((type === 'InspectModelChar'));
        $.GetContextPanel().FindChildTraverse('InspectCharModelsControls').SetHasClass('hidden', type !== 'InspectModelChar');
    };
    const _InspectPlayMusic = function (type) {
        if (!m_previewingMusic)
            return;
        if (type === 'mvp') {
            if (m_schfnMusicMvpPreviewEnd)
                return;
            InventoryAPI.StopItemPreviewMusic();
            InventoryAPI.PlayItemPreviewMusic(m_itemId, 'MVPPreview');
            m_schfnMusicMvpPreviewEnd = $.Schedule(6.8, InspectActionBar.InspectPlayMusic.bind(null, 'schfn'));
        }
        else if (type === 'schfn') {
            m_schfnMusicMvpPreviewEnd = null;
            InventoryAPI.StopItemPreviewMusic();
            InventoryAPI.PlayItemPreviewMusic(m_itemId, '');
        }
    };
    const _ShowContextMenu = function () {
        const elBtn = $.GetContextPanel().FindChildTraverse('InspectActionsButton');
        const id = m_itemId;
        const contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent(elBtn.id, '', 'file://{resources}/layout/context_menus/context_menu_inventory_item.xml', 'itemid=' + id + '&populatefiltertext=inspect', function () {
            $.DispatchEvent("CSGOPlaySoundEffect", "weapon_selectReplace", "MOUSE");
        });
        contextMenuPanel.AddClass("ContextMenu_NoArrow");
    };
    const _SetCloseBtnAction = function (elPanel) {
        const elBtn = elPanel.FindChildInLayoutFile('InspectCloseBtn');
        elBtn.SetPanelEvent('onactivate', _CloseBtnAction);
    };
    const _CloseBtnAction = function () {
        $.DispatchEvent("CSGOPlaySoundEffect", "inventory_inspect_close", "MOUSE");
        if (m_modelImagePanel && m_modelImagePanel.IsValid()) {
            InspectModelImage.CancelCharAnim(m_modelImagePanel);
        }
        $.DispatchEvent('UIPopupButtonClicked', '');
        const callbackFunc = m_callbackHandle;
        if (callbackFunc != -1) {
            UiToolkitAPI.InvokeJSCallback(callbackFunc);
        }
        if (m_blurOperationPanel) {
            $.DispatchEvent('UnblurOperationPanel');
        }
        if (m_previewingMusic) {
            InventoryAPI.StopItemPreviewMusic();
            m_previewingMusic = false;
            if (m_schfnMusicMvpPreviewEnd) {
                $.CancelScheduled(m_schfnMusicMvpPreviewEnd);
                m_schfnMusicMvpPreviewEnd = null;
            }
        }
    };
    return {
        Init: _Init,
        ShowContextMenu: _ShowContextMenu,
        CloseBtnAction: _CloseBtnAction,
        NavigateModelPanel: _NavigateModelPanel,
        InspectPlayMusic: _InspectPlayMusic,
        OnUpdateCharModel: _OnUpdateCharModel
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXBfaW5zcGVjdF9hY3Rpb24tYmFyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicG9wdXBfaW5zcGVjdF9hY3Rpb24tYmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxxQ0FBcUM7QUFDckMsMERBQTBEO0FBQzFELHNDQUFzQztBQUN0QywrQ0FBK0M7QUFFL0MsSUFBSSxnQkFBZ0IsR0FBRyxDQUFFO0lBR3hCLElBQUksaUJBQWlCLEdBQW1CLElBQUksQ0FBQztJQUM3QyxJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7SUFDbEIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUcxQixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDdEIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3ZCLElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0lBQzFCLElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQztJQUN0QixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDdEIsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7SUFDN0IsSUFBSSxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7SUFDNUIsSUFBSSxvQkFBb0IsR0FBRyxLQUFLLENBQUM7SUFDakMsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7SUFDOUIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFDO0lBQ3pCLElBQUkseUJBQXlCLEdBQWtCLElBQUksQ0FBQztJQUVwRCxNQUFNLEtBQUssR0FBRyxVQUFXLE9BQWdCLEVBQUUsTUFBYyxFQUFFLHNCQUF3RSxFQUFFLHlCQUEyRSxFQUFFLHFCQUE4QjtRQUUvTyxJQUFLLHNCQUFzQixDQUFFLGFBQWEsRUFBRSxPQUFPLENBQUUsS0FBSyxPQUFPO1lBQ2hFLE9BQU87UUFFUixPQUFPLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO1FBRWhDLGlCQUFpQixHQUFHLHFCQUFxQixDQUFDO1FBQzFDLFFBQVEsR0FBRyxNQUFN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