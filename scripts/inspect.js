/// <reference path="csgo.d.ts" />m_isStrickerApplyRemove
/// <reference path="common/characteranims.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="common/tint_spray_icon.ts" />
var InspectModelImage = (function () {
    let m_elPanel = null;
    let m_elContainer = null;
    let m_useAcknowledge = false;
    let m_rarityColor = '';
    let m_isStrickerApplyRemove = false;
    let m_strWorkType = '';
    let m_isWorkshopPreview = false;
    const _Init = function (elContainer, itemId, funcGetSettingCallback) {
        const strViewFunc = funcGetSettingCallback ? funcGetSettingCallback('viewfunc', '') : '';
        m_isWorkshopPreview = funcGetSettingCallback ? funcGetSettingCallback('workshopPreview', 'false') === 'true' : false;
        m_isStrickerApplyRemove = funcGetSettingCallback ? funcGetSettingCallback('stickerApplyRemove', 'false') === 'true' : false;
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
        else if (ItemInfo.IsCase(itemId)) {
            m_elPanel = _InitCaseScene('case', itemId);
        }
        else if (ItemInfo.IsSprayPaint(itemId) || ItemInfo.IsSpraySealed(itemId)) {
            m_elPanel = _InitSprayScene('spray', itemId);
        }
        else if (ItemInfo.ItemMatchDefName(itemId, 'name tag')) {
        }
        else if (ItemInfo.IsSticker(itemId) || ItemInfo.IsPatch(itemId)) {
            m_elPanel = _InitStickerScene('sticker', itemId);
        }
        else if (model) {
            if (ItemInfo.GetLoadoutCategory(itemId) === 'clothing') {
                m_elPanel = _InitGlovesScene('gloves', itemId);
            }
            else {
            }
        }
        else if (!model) {
            m_elPanel = _SetImage(itemId);
        }
        return model;
    };
    const _InitCase = function (elContainer, itemId) {
        if (!InventoryAPI.IsValidItemID(itemId)) {
            return;
        }
        m_elContainer = elContainer;
        const model = ItemInfo.GetModelPathFromJSONOrAPI(itemId);
        if (model) {
            m_elPanel = _InitCaseScene('case', itemId);
        }
        else if (!model) {
            m_elPanel = _SetImage(itemId);
        }
    };
    const _InitSealedSpray = function (elContainer, itemId) {
        if (!InventoryAPI.IsValidItemID(itemId)) {
            return;
        }
        m_elContainer = elContainer;
        m_elPanel = _InitSprayScene('spray', itemId);
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
                animgraphturns: "false"
            });
        }
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(itemId);
        elPanel.SetActiveCharacter(active_item_idx);
        settings.panel = elPanel;
        settings.weaponItemId = weaponItemId;
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
            auto_rotate_x: m_isStrickerApplyRemove ? "2" : "35",
            auto_rotate_y: m_isStrickerApplyRemove ? "3" : "10",
            auto_rotate_period_x: m_isStrickerApplyRemove ? "10" : "15",
            auto_rotate_period_y: m_isStrickerApplyRemove ? "10" : "25",
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
        let oSettings = {
            panel_type: "MapItemPreviewPanel",
            active_item_idx: 3,
            camera: 'cam_display_close_intro',
            initial_entity: 'item',
            mouse_rotate: "true",
            rotation_limit_x: "70",
            rotation_limit_y: "60",
            auto_rotate_x: "45",
            auto_rotate_y: "12",
            auto_rotate_period_x: "20",
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
    function _GetBackGroundMap() {
        if (m_useAcknowledge) {
            return 'ui/acknowledge_item';
        }
        let backgroundMap = GameInterfaceAPI.GetSettingString('ui_mainmenu_bkgnd_movie');
        backgroundMap = !backgroundMap ? backgroundMap : 'de_' + backgroundMap + '_vanity';
        return backgroundMap;
    }
    function _LoadInspectMap(itemId, oSettings) {
        let elPanel = m_elContainer.FindChildTraverse('ItemPreviewPanel') || null;
        if (elPanel) {
            elPanel.RemoveAndDeleteChildren();
        }
        let mapName = _GetBackGroundMap();
        if (!elPanel) {
            elPanel = $.CreatePanel(oSettings.panel_type, m_elContainer, 'ItemPreviewPanel', {
                "require-composition-layer": "true",
                'transparent-background': 'false',
                'disable-depth-of-field': m_useAcknowledge ? 'true' : 'false',
                "pin-fov": "vertical",
                class: 'full-width full-height hidden',
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
                workshop_preview: m_isWorkshopPreview,
            });
        }
        let modelPath = ItemInfo.GetModelPathFromJSONOrAPI(itemId);
        elPanel.SetActiveItem(oSettings.active_item_idx);
        elPanel.SetItemItemId(itemId);
        elPanel.RemoveClass('hidden');
        _HidePanelCharEntities(elPanel);
        _HideItemEntities(oSettings.active_item_idx, elPanel);
        if (mapName === 'de_nuke_vanity') {
            _SetSpotlightBrightness(elPanel);
        }
        else {
            _SetSunBrightness(elPanel);
        }
        if (m_isWorkshopPreview) {
            const elItemPanel = elPanel;
            let sBackgroundColor = InventoryAPI.GetPreviewSceneStateAttribute("background_color");
            if (sBackgroundColor) {
                const oColor = _HexColorToRgb(sBackgroundColor);
                elItemPanel.SetHideStaticGeometry(true);
                elItemPanel.SetBackgroundColor(oColor.r, oColor.g, oColor.b, 255);
            }
            else {
                elItemPanel.SetHideStaticGeometry(false);
                elItemPanel.SetBackgroundColor(0, 0, 0, 255);
            }
        }
        return elPanel;
    }
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
            elPanel = $.CreatePanel('Panel', m_elContainer, 'InspectItemImage');
            elPanel.BLoadLayoutSnippet("snippet-image");
        }
        const elImagePanel = elPanel.FindChildTraverse('ImagePreviewPanel');
        elImagePanel.itemid = Number(itemId);
        elImagePanel.RemoveClass('hidden');
        _TintSprayImage(itemId, elImagePanel);
        return elImagePanel;
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
    const _GetImagePanel = function () {
        return m_elPanel;
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
        let numItemEntitesInMap = 8;
        for (var i = 0; i <= numItemEntitesInMap; i++) {
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
    return {
        Init: _Init,
        InitCase: _InitCase,
        InitSealedSpray: _InitSealedSpray,
        SetCharScene: _SetCharScene,
        CancelCharAnim: _CancelCharAnim,
        ShowHideItemPanel: _ShowHideItemPanel,
        ShowHideCharPanel: _ShowHideCharPanel,
        GetModelPanel: _GetModelPanel,
        UpdateModelOnly: _UpdateModelOnly,
        GetImagePanel: _GetImagePanel,
        HidePanelItemEntities: _HidePanelItemEntities,
        HidePanelCharEntities: _HidePanelCharEntities,
        SetItemCameraByWeaponType: _SetItemCameraByWeaponType,
        ResetCameraScheduleHandle: _ResetCameraScheduleHandle
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluc3BlY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseURBQXlEO0FBQ3pELGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFDM0Msa0RBQWtEO0FBRWxELElBQUksaUJBQWlCLEdBQUcsQ0FBRTtJQUV6QixJQUFJLFNBQVMsR0FBa0UsSUFBSyxDQUFDO0lBQ3JGLElBQUksYUFBYSxHQUFZLElBQUssQ0FBQztJQUNuQyxJQUFJLGdCQUFnQixHQUFZLEtBQUssQ0FBQztJQUN0QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7SUFDL0IsSUFBSSx1QkFBdUIsR0FBWSxLQUFLLENBQUM7SUFDN0MsSUFBSSxhQUFhLEdBQVcsRUFBRSxDQUFDO0lBQy9CLElBQUksbUJBQW1CLEdBQVksS0FBSyxDQUFDO0lBbUJ6QyxNQUFNLEtBQUssR0FBRyxVQUFXLFdBQW9CLEVBQUUsTUFBYyxFQUFFLHNCQUE0RTtRQUkxSSxNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFM0YsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZILHVCQUF1QixHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBRSxvQkFBb0IsRUFBRSxPQUFPLENBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUU5SCxJQUFLLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBRSxNQUFNLEVBQUUscUJBQXFCLENBQUU7WUFDM0UsTUFBTSxHQUFHLENBQUUsV0FBVyxLQUFLLFNBQVMsQ0FBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxD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