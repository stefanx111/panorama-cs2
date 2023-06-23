/// <reference path="csgo.d.ts" />
/// <reference path="common/iteminfo.ts" />
var CharacterButtons = (function () {
    function _PopulateWeaponDropdownForCharacter(elDropdown, modelPanelSettings) {
        const list = ItemInfo.GetLoadoutWeapons(modelPanelSettings.team);
        if (!list || list.length == 0) {
            return;
        }
        elDropdown.RemoveAllOptions();
        list.forEach(function (entry) {
            const newEntry = $.CreatePanel('Panel', elDropdown, entry[1], {
                'class': 'DropDownMenu'
            });
            newEntry.SetAcceptsFocus(true);
            const elRarity = $.CreatePanel('Label', newEntry, 'rarity');
            elRarity.style.width = '100%';
            elRarity.style.height = '100%';
            elRarity.style.padding = '0px 0px';
            const rarityColor = ItemInfo.GetRarityColor(entry[1]);
            elRarity.style.backgroundColor = "gradient( linear, 0% 0%, 100% 0%, from(" + rarityColor + " ),  color-stop( 0.0125, #00000000 ), to( #00000000 ) );";
            const elLabel = $.CreatePanel('Label', newEntry, 'label', {
                'text': ItemInfo.GetName(entry[1])
            });
            elDropdown.AddOption(newEntry);
        });
        elDropdown.SetPanelEvent('oninputsubmit', () => _OnUpdateWeaponSelection(elDropdown, modelPanelSettings));
        elDropdown.SetSelected(modelPanelSettings.weaponItemId);
    }
    const _OnUpdateWeaponSelection = function (elDropdown, modelPanelSettings) {
        modelPanelSettings.weaponItemId = elDropdown.GetSelected() ? elDropdown.GetSelected().id : "";
        modelPanelSettings.panel.SetActiveCharacter(5);
        CharacterAnims.PlayAnimsOnPanel(modelPanelSettings);
    };
    function _ZoomCamera() {
        const data = $.GetContextPanel().Data();
        const elZoomButton = $.GetContextPanel().FindChildInLayoutFile('LoadoutSingleItemModelZoom');
        if (elZoomButton.checked) {
            data.m_modelPanelSettings.panel.TransitionToCamera('cam_char_inspect_closeup', 0.5);
        }
        else {
            data.m_modelPanelSettings.panel.TransitionToCamera('cam_char_inspect_wide', 0.5);
        }
    }
    function _PlayCheer() {
        const elZoomButton = $.GetContextPanel().FindChildInLayoutFile('LoadoutSingleItemModelZoom');
        if (elZoomButton.checked)
            elZoomButton.checked = false;
        const data = $.GetContextPanel().Data();
        data.m_modelPanelSettings.cameraPreset = data.m_characterToolbarButtonSettings.cameraPresetUnzoomed;
        const modelRenderSettingsOneOffTempCopy = ItemInfo.DeepCopyVanityCharacterSettings(data.m_modelPanelSettings);
        modelRenderSettingsOneOffTempCopy.cheer = InventoryAPI.GetCharacterDefaultCheerByItemId(modelRenderSettingsOneOffTempCopy.charItemId);
        CharacterAnims.PlayAnimsOnPanel(modelRenderSettingsOneOffTempCopy);
        StoreAPI.RecordUIEvent("PlayCheer", 1);
    }
    function _PreviewModelVoice() {
        const data = $.GetContextPanel().Data();
        InventoryAPI.PreviewModelVoice(data.m_modelPanelSettings.charItemId);
        StoreAPI.RecordUIEvent("PlayCheer", 2);
    }
    function _InitCharacterButtons(elButtons, elPreviewpanel, characterButtonSettings) {
        if (!elButtons)
            return;
        elButtons.Children().forEach(el => el.enabled = true);
        if (!elPreviewpanel)
            return;
        const elZoomButton = elButtons.FindChildInLayoutFile('LoadoutSingleItemModelZoom');
        const modelPanelSettings = ItemInfo.GetOrUpdateVanityCharacterSettings(characterButtonSettings.charItemId);
        modelPanelSettings.panel = elPreviewpanel;
        modelPanelSettings.cameraPreset = elZoomButton.checked ? characterButtonSettings.cameraPresetZoomed : characterButtonSettings.cameraPresetUnzoomed;
        const elDropdown = elButtons.FindChildInLayoutFile('LoadoutSingleItemModelWeaponChoice');
        _PopulateWeaponDropdownForCharacter(elDropdown, modelPanelSettings);
        const cheer = ItemInfo.GetDefaultCheer(modelPanelSettings.charItemId);
        const elCheer = elButtons.FindChildInLayoutFile('PlayCheer');
        elCheer.enabled = cheer != undefined && cheer != "";
        elButtons.Data().m_characterToolbarButtonSettings = characterButtonSettings;
        elButtons.Data().m_modelPanelSettings = modelPanelSettings;
    }
    return {
        InitCharacterButtons: _InitCharacterButtons,
        PlayCheer: _PlayCheer,
        PreviewModelVoice: _PreviewModelVoice,
        ZoomCamera: _ZoomCamera,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhcmFjdGVyYnV0dG9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNoYXJhY3RlcmJ1dHRvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLDJDQUEyQztBQUUzQyxJQUFJLGdCQUFnQixHQUFHLENBQUU7SUFleEIsU0FBUyxtQ0FBbUMsQ0FBRyxVQUFzQixFQUFFLGtCQUFzRTtRQUU1SSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFFLENBQUM7UUFFbkUsSUFBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFDOUI7WUFDQyxPQUFPO1NBQ1A7UUFFRCxVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUU5QixJQUFJLENBQUMsT0FBTyxDQUFFLFVBQVcsS0FBSztZQUU3QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM5RCxPQUFPLEVBQUUsY0FBYzthQUN2QixDQUFFLENBQUM7WUFDSixRQUFRLENBQUMsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDO1lBRWpDLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUUsQ0FBQztZQUM5RCxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7WUFDOUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBQy9CLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztZQUNuQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDO1lBR3hELFFBQVEsQ0FBQyxLQUFLLENBQUMsZUFBZSxH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