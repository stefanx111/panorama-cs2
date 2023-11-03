"use strict";
/// <reference path="common/characteranims.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="common/tint_spray_icon.ts" />
var InspectModelImage = (function () {
    let m_elPanel = null;
    let m_elContainer = null;
    let m_useAcknowledge = false;
    let m_rarityColor = '';
    let m_isStickerApplyRemove = false;
    let m_strWorkType = '';
    let m_isWorkshopPreview = false;
    let m_previousDisplayedItemId = '';
    const _Init = function (elContainer, itemId, funcGetSettingCallback) {
        const strViewFunc = funcGetSettingCallback ? funcGetSettingCallback('viewfunc', '') : '';
        m_isWorkshopPreview = funcGetSettingCallback ? funcGetSettingCallback('workshopPreview', 'false') === 'true' : false;
        m_isStickerApplyRemove = funcGetSettingCallback ? funcGetSettingCallback('stickerApplyRemove', 'false') === 'true' : false;
        if (ItemInfo.ItemDefinitionNameSubstrMatch(itemId, 'tournament_journal_'))
            itemId = (strViewFunc === 'primary') ? itemId : ItemInfo.GetFauxReplacementItemID(itemId, 'graffiti');
        if (!InventoryAPI.IsValidItemID(itemId)) {
            return '';
        }
        m_strWorkType = funcGetSettingCallback ? funcGetSettingCallback('asyncworktype', '') : '';
        m_elContainer = elContainer;
        m_useAcknowledge = m_elContainer.Data().useAcknowledge ? m_elContainer.Data().useAcknowledge : false;
        m_rarityColor = ItemInfo.GetRarityColor(itemId);
        const model = ItemInfo.GetModelPathFromJSONOrAPI(itemId);
        _InitSceneBasedOnItemType(model, itemId);
        m_previousDisplayedItemId = itemId;
        return model;
    };
    const _InitSceneBasedOnItemType = function (model, itemId) {
        if (ItemInfo.IsCharacter(itemId)) {
            m_elPanel = _InitCharScene('character', itemId);
        }
        else if (ItemInfo.GetLoadoutCategory(itemId) == "melee") {
            m_elPanel = _InitMeleeScene('melee', itemId);
        }
        else if (ItemInfo.IsWeapon(itemId)) {
            m_elPanel = _InitWeaponScene('weapon', itemId);
        }
        else if (ItemInfo.IsDisplayItem(itemId)) {
            m_elPanel = _InitDisplayScene('flair', itemId);
        }
        else if (ItemInfo.GetLoadoutCategory(itemId) == "musickit") {
            m_elPanel = _InitMusicKitScene('musickit', itemId);
        }
        else if (ItemInfo.IsSprayPaint(itemId) || ItemInfo.IsSpraySealed(itemId)) {
            m_elPanel = _InitSprayScene('spray', itemId);
        }
        else if (ItemInfo.IsCase(itemId)) {
            m_elPanel = _InitCaseScene('case', itemId);
        }
        else if (ItemInfo.ItemMatchDefName(itemId, 'name tag')) {
            m_elPanel = _InitNametagScene('nametag', itemId);
        }
        else if (ItemInfo.IsSticker(itemId) || ItemInfo.IsPatch(itemId)) {
            m_elPanel = _InitStickerScene('sticker', itemId);
        }
        else if (model) {
            if (ItemInfo.GetLoadoutCategory(itemId) === 'clothing') {
                m_elPanel = _InitGlovesScene('gloves', itemId);
            }
            else if (model.includes('models/props/crates/')) {
                m_elPanel = _InitCaseScene('case', itemId);
            }
        }
        else if (!model) {
            m_elPanel = _SetImage(itemId);
        }
        return m_elPanel;
    };
    function _InitCharScene(name, itemId, bHide = false, weaponItemId = '') {
        let elPanel = m_elContainer.FindChildTraverse('CharPreviewPanel');
        let active_item_idx = 5;
        if (!elPanel) {
            let mapName = _GetBackGroundMap();
            elPanel = $.CreatePanel('MapPlayerPreviewPanel', m_elContainer, 'CharPreviewPanel', {
                "require-composition-layer": "true",
                "pin-fov": "vertical",
                class: 'full-width full-height hidden',
                camera: 'cam_char_inspect_wide_intro',
                player: "true",
                map: mapName,
                initial_entity: 'item',
                mouse_rotate: false,
                playername: "vanity_character",
                animgraphcharactermode: "inventory-inspect",
                animgraphturns: "false",
                workshop_preview: m_isWorkshopPreview
            });
        }
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(itemId);
        elPanel.SetActiveCharacter(active_item_idx);
        settings.panel = elPanel;
        settings.weaponItemId = weaponItemId ? weaponItemId : settings.weaponItemId ? settings.weaponItemId : '';
        CharacterAnims.PlayAnimsOnPanel(settings);
        if (m_strWorkType !== 'can_patch' && m_strWorkType !== 'remove_patch') {
            _AnimateIntroCamera(elPanel, 'char_inspect_wide', .5, false);
        }
        if (!bHide) {
            elPanel.RemoveClass('hidden');
        }
        _HidePanelItemEntities(elPanel);
        _HidePanelCharEntities(elPanel, true);
        _SetParticlesBg(elPanel);
        _SetWorkshopPreviewPanelProperties(elPanel);
        return elPanel;
    }
    function _InitWeaponScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 0,
            camera: 'cam_default',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "360",
            rotation_limit_y: "90",
            auto_rotate_x: m_isStickerApplyRemove ? "2" : "35",
            auto_rotate_y: m_isStickerApplyRemove ? "3" : "10",
            auto_rotate_period_x: m_isStickerApplyRemove ? "10" : "15",
            auto_rotate_period_y: m_isStickerApplyRemove ? "10" : "25",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _SetItemCameraByWeaponType(itemId, panel, '', false);
        if (!m_useAcknowledge) {
            _InitCharScene(name, itemId, true);
        }
        return panel;
    }
    function _InitMeleeScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 8,
            camera: 'cam_melee_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "360",
            rotation_limit_y: "90",
            auto_rotate_x: "35",
            auto_rotate_y: "10",
            auto_rotate_period_x: "15",
            auto_rotate_period_y: "25",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'melee', .2, false);
        if (!m_useAcknowledge) {
            _InitCharScene(name, itemId, true);
        }
        return panel;
    }
    function _InitStickerScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 1,
            camera: 'cam_sticker_close_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "70",
            rotation_limit_y: "60",
            auto_rotate_x: "20",
            auto_rotate_y: "0",
            auto_rotate_period_x: "10",
            auto_rotate_period_y: "10",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'sticker_close', .2, false);
        return panel;
    }
    function _InitSprayScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 2,
            camera: 'camera_path_spray',
            initial_entity: 'item',
            mouse_rotate: "false",
            rotation_limit_x: "",
            rotation_limit_y: "",
            auto_rotate_x: "",
            auto_rotate_y: "",
            auto_rotate_period_x: "",
            auto_rotate_period_y: "",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        panel.TransitionToCamera('camera_path_spray', 0);
        return panel;
    }
    function _InitDisplayScene(name, itemId) {
        let bOverrideItem = InventoryAPI.GetItemDefinitionIndex(itemId) === 996;
        let rotationOverrideX = bOverrideItem ? "360" : "70";
        let autoRotateOverrideX = bOverrideItem ? "180" : "45";
        let autoRotateTimeOverrideX = bOverrideItem ? "100" : "20";
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 3,
            camera: 'cam_display_close_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: rotationOverrideX,
            rotation_limit_y: "60",
            auto_rotate_x: autoRotateOverrideX,
            auto_rotate_y: "12",
            auto_rotate_period_x: autoRotateTimeOverrideX,
            auto_rotate_period_y: "20",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'display_close', .2, false);
        return panel;
    }
    function _InitMusicKitScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 4,
            camera: 'cam_musickit_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "55",
            rotation_limit_y: "55",
            auto_rotate_x: "10",
            auto_rotate_y: "0",
            auto_rotate_period_x: "20",
            auto_rotate_period_y: "20",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'musickit_close', .2, false);
        return panel;
    }
    function _InitCaseScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 6,
            camera: 'cam_case_intro',
            initial_entity: 'item',
            mouse_rotate: "false",
            rotation_limit_x: "",
            rotation_limit_y: "",
            auto_rotate_x: "",
            auto_rotate_y: "",
            auto_rotate_period_x: "",
            auto_rotate_period_y: "",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'case', .2, false);
        return panel;
    }
    function _InitGlovesScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 7,
            camera: 'cam_gloves',
            initial_entity: 'item',
            mouse_rotate: "false",
            rotation_limit_x: "",
            rotation_limit_y: "",
            auto_rotate_x: "",
            auto_rotate_y: "",
            auto_rotate_period_x: "",
            auto_rotate_period_y: "",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        return panel;
    }
    function _InitNametagScene(name, itemId) {
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 1,
            camera: 'cam_nametag_close_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "70",
            rotation_limit_y: "60",
            auto_rotate_x: "20",
            auto_rotate_y: "0",
            auto_rotate_period_x: "10",
            auto_rotate_period_y: "10",
            auto_recenter: false,
            player: "false",
        };
        const panel = _LoadInspectMap(itemId, oSettings);
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'nametag_close', .2, false);
        return panel;
    }
    function _GetBackGroundMap() {
        if (m_useAcknowledge) {
            return 'ui/acknowledge_item';
        }
        let backgroundMap = GameInterfaceAPI.GetSettingString('ui_mainmenu_bkgnd_movie');
        backgroundMap = !backgroundMap ? backgroundMap : backgroundMap + '_vanity';
        return backgroundMap;
    }
    function _LoadInspectMap(itemId, oSettings) {
        let elPanelOld = m_elContainer.FindChildTraverse('ItemPreviewPanel') || null;
        if (elPanelOld) {
            if (m_previousDisplayedItemId !== itemId) {
                elPanelOld.GetParent().Children().forEach((el) => {
                    if (el.Data().itemId !== itemId && el.id === 'ItemPreviewPanel') {
                        el.AddClass('inspect-model-image-panel--hidden');
                        el.DeleteAsync(0.25);
                    }
                });
            }
            else {
                elPanelOld.AddClass('inspect-model-image-panel--hidden');
                elPanelOld.DeleteAsync(0.25);
            }
        }
        let mapName = _GetBackGroundMap();
        let elPanel = $.CreatePanel(oSettings.panel_type, m_elContainer, 'ItemPreviewPanel', {
            "require-composition-layer": "true",
            'transparent-background': 'false',
            'disable-depth-of-field': m_useAcknowledge ? 'true' : 'false',
            "pin-fov": "vertical",
            class: 'inspect-model-image-panel inspect-model-image-panel--hidden',
            camera: oSettings.camera,
            player: "true",
            map: mapName,
            initial_entity: 'item',
            mouse_rotate: oSettings.mouse_rotate,
            rotation_limit_x: oSettings.rotation_limit_x,
            rotation_limit_y: oSettings.rotation_limit_y,
            auto_rotate_x: oSettings.auto_rotate_x,
            auto_rotate_y: oSettings.auto_rotate_y,
            auto_rotate_period_x: oSettings.auto_rotate_period_x,
            auto_rotate_period_y: oSettings.auto_rotate_period_y,
            auto_recenter: oSettings.auto_recenter,
            workshop_preview: m_isWorkshopPreview
        });
        elPanel.Data().itemId = itemId;
        elPanel.SetActiveItem(oSettings.active_item_idx);
        elPanel.SetItemItemId(itemId);
        elPanel.RemoveClass('inspect-model-image-panel--hidden');
        _HidePanelCharEntities(elPanel);
        _HideItemEntities(oSettings.active_item_idx, elPanel);
        if (mapName === 'de_nuke_vanity') {
            _SetSpotlightBrightness(elPanel);
        }
        else {
            _SetSunBrightness(elPanel);
        }
        _SetWorkshopPreviewPanelProperties(elPanel);
        return elPanel;
    }
    function _SetWorkshopPreviewPanelProperties(elItemPanel) {
        if (m_isWorkshopPreview) {
            let sTransparentBackground = InventoryAPI.GetPreviewSceneStateAttribute("transparent_background");
            let sBackgroundColor = InventoryAPI.GetPreviewSceneStateAttribute("background_color");
            if (sTransparentBackground === "1") {
                elItemPanel.SetHideStaticGeometry(true);
                elItemPanel.SetHideParticles(true);
                elItemPanel.SetTransparentBackground(true);
            }
            else if (sBackgroundColor) {
                const oColor = _HexColorToRgb(sBackgroundColor);
                elItemPanel.SetHideStaticGeometry(true);
                elItemPanel.SetHideParticles(true);
                elItemPanel.SetBackgroundColor(oColor.r, oColor.g, oColor.b, 0);
                elItemPanel.SetTransparentBackground(false);
            }
            else {
                elItemPanel.SetHideStaticGeometry(false);
                elItemPanel.SetHideParticles(false);
                elItemPanel.SetBackgroundColor(0, 0, 0, 255);
                elItemPanel.SetTransparentBackground(false);
            }
        }
    }
    ;
    function _SetItemCameraByWeaponType(itemId, elItemPanel, cameraOverride, bSkipInto) {
        if (cameraOverride) {
            elItemPanel.TransitionToCamera(cameraOverride, 1);
            return;
        }
        const category = InventoryAPI.GetLoadoutCategory(itemId);
        const defName = InventoryAPI.GetItemDefinitionName(itemId);
        var strCamera = 'wide';
        switch (category) {
            case 'secondary':
                strCamera = 'close';
                break;
            case 'smg':
                strCamera = 'mid_close';
                break;
        }
        switch (defName) {
            case 'weapon_awp':
                strCamera = 'far';
                break;
            case 'weapon_usp_silencer':
                strCamera = 'mid_close';
                break;
            case 'weapon_ssg08':
                strCamera = 'far';
                break;
            case 'weapon_galilar':
                strCamera = 'mid';
                break;
            case 'weapon_aug':
                strCamera = 'mid';
                break;
            case 'weapon_mp5sd':
                strCamera = 'mid';
                break;
            case 'weapon_m249':
                strCamera = 'far';
                break;
            case 'weapon_elite':
                strCamera = 'mid_close';
                break;
            case 'weapon_nova':
                strCamera = 'mid';
                break;
            case 'weapon_tec9':
                strCamera = 'mid_close';
                break;
            case 'weapon_ump45':
                strCamera = "mid";
                break;
            case 'weapon_bizon':
                strCamera = "mid";
                break;
            case 'weapon_mag7':
                strCamera = "mid";
                break;
            case 'weapon_c4':
                strCamera = "mid_close";
                break;
            case 'weapon_knife':
                strCamera = "mid_close";
                break;
            case 'weapon_taser':
                strCamera = "close";
                break;
        }
        _AnimateIntroCamera(elItemPanel, strCamera, .5, bSkipInto);
    }
    ;
    let m_scheduleHandle = 0;
    function _AnimateIntroCamera(elPanel, strCamera, nDelay, bSkipInto) {
        if (bSkipInto) {
            elPanel.TransitionToCamera('cam_' + strCamera, 1);
            return;
        }
        elPanel.TransitionToCamera('cam_' + strCamera + '_intro', 0);
        if (m_scheduleHandle === 0) {
            m_scheduleHandle = $.Schedule(nDelay, function () {
                if (elPanel.IsValid() && elPanel) {
                    elPanel.TransitionToCamera('cam_' + strCamera, 1.5);
                }
            });
        }
    }
    const _ResetCameraScheduleHandle = function () {
        if (m_scheduleHandle != 0) {
            $.CancelScheduled(m_scheduleHandle);
            m_scheduleHandle = 0;
        }
    };
    const _SetImage = function (itemId) {
        let elPanel = m_elContainer.FindChildTraverse('InspectItemImage');
        if (!elPanel) {
            _SetImageBackgroundMap();
            elPanel = $.CreatePanel('Panel', m_elContainer, 'InspectItemImage');
            elPanel.BLoadLayoutSnippet("snippet-image");
        }
        const elImagePanel = elPanel.FindChildTraverse('ImagePreviewPanel');
        elImagePanel.itemid = itemId;
        elImagePanel.RemoveClass('hidden');
        _TintSprayImage(itemId, elImagePanel);
        return elImagePanel;
    };
    const _SetImageBackgroundMap = function () {
        let mapName = _GetBackGroundMap();
        let elPanel = $.CreatePanel('MapPlayerPreviewPanel', m_elContainer, 'id-inspect-image-bg-map', {
            "require-composition-layer": "true",
            'transparent-background': 'false',
            'disable-depth-of-field': 'false',
            "pin-fov": "vertical",
            class: 'full-width full-height',
            camera: "cam_default",
            player: "false",
            map: mapName
        });
        _HidePanelItemEntities(elPanel);
        _HidePanelCharEntities(elPanel, false);
    };
    const _TintSprayImage = function (id, elImage) {
        TintSprayIcon.CheckIsSprayAndTint(id, elImage);
    };
    const _SetCharScene = function (elPanel, characterItemId, weaponItemId) {
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(characterItemId);
        _InitCharScene("character", characterItemId, true, weaponItemId);
    };
    const _CancelCharAnim = function (elContainer) {
    };
    const _ShowHideItemPanel = function (bshow) {
        if (!m_elContainer.IsValid())
            return;
        const elItemPanel = m_elContainer.FindChildTraverse('ItemPreviewPanel');
        elItemPanel.SetHasClass('hidden', !bshow);
        if (bshow)
            $.DispatchEvent("CSGOPlaySoundEffect", "weapon_showSolo", "MOUSE");
    };
    const _ShowHideCharPanel = function (bshow) {
        if (!m_elContainer.IsValid())
            return;
        const elCharPanel = m_elContainer.FindChildTraverse('CharPreviewPanel');
        if (elCharPanel && elCharPanel.IsValid())
            elCharPanel.SetHasClass('hidden', !bshow);
        if (bshow)
            $.DispatchEvent("CSGOPlaySoundEffect", "weapon_showOnChar", "MOUSE");
    };
    const _GetModelPanel = function () {
        return m_elPanel;
    };
    const _UpdateModelOnly = function (itemId) {
        var elpanel = m_elPanel;
        if (elpanel && elpanel.IsValid()) {
            elpanel.SetItemItemId(itemId);
        }
    };
    const _HidePanelCharEntities = function (elPanel, bIsPlayerInspect = false) {
        elPanel.FireEntityInput('vanity_character', 'Alpha');
        elPanel.FireEntityInput('vanity_character1', 'Alpha');
        elPanel.FireEntityInput('vanity_character2', 'Alpha');
        elPanel.FireEntityInput('vanity_character3', 'Alpha');
        elPanel.FireEntityInput('vanity_character4', 'Alpha');
        if (!bIsPlayerInspect) {
            elPanel.FireEntityInput('vanity_character5', 'Alpha');
        }
    };
    const _HidePanelItemEntities = function (elPanel) {
        _HideItemEntities(-1, elPanel);
    };
    const _HideItemEntities = function (indexShow, elPanel) {
        let numItemEntitiesInMap = 8;
        for (var i = 0; i <= numItemEntitiesInMap; i++) {
            let itemIndexMod = i === 0 ? '' : i.toString();
            if (indexShow !== i) {
                elPanel.FireEntityInput('item' + itemIndexMod, 'Alpha');
                elPanel.FireEntityInput('light_item' + itemIndexMod, 'Disable');
                elPanel.FireEntityInput('light_item_new' + itemIndexMod, 'Disable');
            }
            else {
                _SetRimLight(itemIndexMod, elPanel);
            }
        }
    };
    const _SetParticlesBg = function (elPanel) {
        if (!m_useAcknowledge) {
            return;
        }
        const oColor = _HexColorToRgb(m_rarityColor);
        const sColor = `${oColor.r} ${oColor.g} ${oColor.b}`;
        elPanel.FireEntityInput('acknowledge_particle', 'SetControlPoint', '16: ' + sColor);
    };
    const _SetRimLight = function (indexShow, elPanel) {
        if (m_useAcknowledge) {
            elPanel.FireEntityInput('light_item' + indexShow, 'Disable');
            const oColor = _HexColorToRgb(m_rarityColor);
            const sColor = `${oColor.r} ${oColor.g} ${oColor.b}`;
            let lightNameInMap = "light_item_new" + indexShow;
            elPanel.FireEntityInput(lightNameInMap, 'SetColor', sColor);
        }
        else {
            elPanel.FireEntityInput('light_item_new' + indexShow, 'Disable');
        }
    };
    const _SetSunBrightness = function (elPanel) {
        elPanel.FireEntityInput('sun', 'SetLightBrightness', '1.1');
    };
    const _SetSpotlightBrightness = function (elPanel) {
        elPanel.FireEntityInput('main_light', 'SetBrightness', '1.1');
    };
    const _HexColorToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    };
    const _Refresh = function () {
        if (!m_elContainer || !m_elContainer.IsValid()) {
            return;
        }
        if (!InventoryAPI.IsValidItemID(m_previousDisplayedItemId)) {
            return;
        }
        const model = ItemInfo.GetModelPathFromJSONOrAPI(m_previousDisplayedItemId);
        _InitSceneBasedOnItemType(model, m_previousDisplayedItemId);
    };
    return {
        Init: _Init,
        SetCharScene: _SetCharScene,
        CancelCharAnim: _CancelCharAnim,
        ShowHideItemPanel: _ShowHideItemPanel,
        ShowHideCharPanel: _ShowHideCharPanel,
        GetModelPanel: _GetModelPanel,
        UpdateModelOnly: _UpdateModelOnly,
        HidePanelItemEntities: _HidePanelItemEntities,
        HidePanelCharEntities: _HidePanelCharEntities,
        SetItemCameraByWeaponType: _SetItemCameraByWeaponType,
        ResetCameraScheduleHandle: _ResetCameraScheduleHandle
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluc3BlY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFDM0Msa0RBQWtEO0FBRWxELElBQUksaUJBQWlCLEdBQUcsQ0FBRTtJQUV6QixJQUFJLFNBQVMsR0FBa0UsSUFBSyxDQUFDO0lBQ3JGLElBQUksYUFBYSxHQUFZLElBQUssQ0FBQztJQUNuQyxJQUFJLGdCQUFnQixHQUFZLEtBQUssQ0FBQztJQUN0QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7SUFDL0IsSUFBSSxzQkFBc0IsR0FBWSxLQUFLLENBQUM7SUFDNUMsSUFBSSxhQUFhLEdBQVcsRUFBRSxDQUFDO0lBQy9CLElBQUksbUJBQW1CLEdBQVksS0FBSyxDQUFDO0lBQ3pDLElBQUkseUJBQXlCLEdBQVcsRUFBRSxDQUFDO0lBbUIzQyxNQUFNLEtBQUssR0FBRyxVQUFXLFdBQW9CLEVBQUUsTUFBYyxFQUFFLHNCQUE0RTtRQUkxSSxNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFM0YsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZILHNCQUFzQixHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBRSxvQkFBb0IsRUFBRSxPQUFPLENBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUU3SCxJQUFLLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBRSxNQUFNLEVBQUUscUJBQXFCLENBQUU7WUFDM0UsTUFBTSxHQUFHLENBQUUsV0FBVyxLQUFLLFNBQVMsQ0FBRSxDQUFDLENBQUMs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