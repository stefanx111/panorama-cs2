"use strict";
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
        // Tournament journals are only inspected for the purposes of Graffiti
        // ... but check for special hint: viewfunc=primary forces it to show as coin
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
        $.Msg('m_useAcknowledge: ' + m_useAcknowledge);
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
            // m_elPanel = _InitItemScene( 'nametag', itemId, 'snippet-item', 0 );
        }
        else if (ItemInfo.IsSticker(itemId) || ItemInfo.IsPatch(itemId)) {
            m_elPanel = _InitStickerScene('sticker', itemId);
        }
        // REPEAT PATTERN FOR ITEM_SPECIFIC MAPS
        // else if ( ItemInfo.IsDisplayItem( itemId ) )pinspec
        // {
        // 	_InitItemScene( elContainer, itemId, 'snippet-specialitem' );
        // }	
        // Generic 3d inspect
        else if (model) {
            if (ItemInfo.GetLoadoutCategory(itemId) === 'clothing') { // these are my gloves
                m_elPanel = _InitGlovesScene('gloves', itemId);
            }
            else {
                // m_elPanel = _InitItemScene( 'generic', itemId, '', 0 );
            }
        }
        // 2d inspect fallback
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
        // Generic 3d inspect
        if (model) {
            m_elPanel = _InitCaseScene('case', itemId);
        }
        // 2d inspect fallback
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
        $.Msg('_InitCharScene');
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
    // weapons have both an item scene and a preview on agent scene
    function _InitWeaponScene(name, itemId) {
        $.Msg('_InitWeaponScene');
        // floating weapon panel
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
        // char holding the weapon preview
        if (!m_useAcknowledge) {
            _InitCharScene(name, itemId, true);
        }
        return panel;
    }
    function _InitMeleeScene(name, itemId) {
        $.Msg('_InitMeleeScene');
        // floating weapon panel
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
        // char holding the weapon preview
        if (!m_useAcknowledge) {
            _InitCharScene(name, itemId, true);
        }
        return panel;
    }
    function _InitStickerScene(name, itemId) {
        $.Msg('_InitStickerScenes');
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
        $.Msg('_InitSprayScene');
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
        $.Msg('_InitDisplayScene');
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
        // const panel = _InitItemScene( 'sticker', itemId, 'snippet-item', 1 );
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'display_close', .2, false);
        return panel;
    }
    function _InitMusicKitScene(name, itemId) {
        $.Msg('_InitMusicKitScene');
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
        // const panel = _InitItemScene( 'sticker', itemId, 'snippet-item', 1 );
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'musickit_close', .2, false);
        return panel;
    }
    function _InitCaseScene(name, itemId) {
        $.Msg('_InitCaseScene');
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
        // const panel = _InitItemScene( 'sticker', itemId, 'snippet-item', 1 );
        _SetParticlesBg(panel);
        _AnimateIntroCamera(panel, 'case', .2, false);
        return panel;
    }
    function _InitGlovesScene(name, itemId) {
        $.Msg('_InitGlovesScene');
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
        backgroundMap = !backgroundMap ? backgroundMap : backgroundMap + '_vanity';
        return backgroundMap;
    }
    function _LoadInspectMap(itemId, oSettings) {
        let elPanel = m_elContainer.FindChildTraverse('ItemPreviewPanel') || null;
        if (elPanel) {
            elPanel.RemoveAndDeleteChildren();
        }
        let mapName = _GetBackGroundMap();
        if (!elPanel) {
            $.Msg('mapName:' + mapName);
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
        $.Msg('modelPath: ' + modelPath);
        //const elItemPanel = elPanel.FindChildTraverse( 'ItemPreviewPanel' ) as MapItemPreviewPanel_t;
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
                elItemPanel.SetHideParticles(true);
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
        $.Msg('InventoryAPI.GetItemDefinitionName( itemId )' + InventoryAPI.GetItemDefinitionName(itemId));
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
        $.Msg('m_scheduleHandle :' + m_scheduleHandle);
    }
    const _ResetCameraScheduleHandle = function () {
        if (m_scheduleHandle != 0) {
            $.Msg('_ResetCameraScheduleHandlem_scheduleHandle :' + m_scheduleHandle);
            $.CancelScheduled(m_scheduleHandle);
            m_scheduleHandle = 0;
        }
    };
    const _SetImage = function (itemId) {
        $.Msg('_SetImage');
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
        //	CharacterAnims.CancelScheduledAnim( elContainer.FindChildInLayoutFile( 'InspectModelChar' ) );
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
        // Number of entites in the vanity map for differnt things like weapson, stickes, cases...
        // Makes it easy to hide all but the on we are using.
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
        $.Msg('oColor: ' + sColor);
        elPanel.FireEntityInput('acknowledge_particle', 'SetControlPoint', '16: ' + sColor);
    };
    const _SetRimLight = function (indexShow, elPanel) {
        if (m_useAcknowledge) {
            elPanel.FireEntityInput('light_item' + indexShow, 'Disable');
            const oColor = _HexColorToRgb(m_rarityColor);
            const sColor = `${oColor.r} ${oColor.g} ${oColor.b}`;
            let lightNameInMap = "light_item_new" + indexShow;
            $.Msg('lightNameInMap: ' + lightNameInMap);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluc3BlY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLHlEQUF5RDtBQUN6RCxpREFBaUQ7QUFDakQsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUVsRCxJQUFJLGlCQUFpQixHQUFHLENBQUU7SUFFekIsSUFBSSxTQUFTLEdBQWtFLElBQUssQ0FBQztJQUNyRixJQUFJLGFBQWEsR0FBWSxJQUFLLENBQUM7SUFDbkMsSUFBSSxnQkFBZ0IsR0FBWSxLQUFLLENBQUM7SUFDdEMsSUFBSSxhQUFhLEdBQVcsRUFBRSxDQUFDO0lBQy9CLElBQUksdUJBQXVCLEdBQVksS0FBSyxDQUFDO0lBQzdDLElBQUksYUFBYSxHQUFXLEVBQUUsQ0FBQztJQUMvQixJQUFJLG1CQUFtQixHQUFZLEtBQUssQ0FBQztJQW1CekMsTUFBTSxLQUFLLEdBQUcsVUFBVyxXQUFvQixFQUFFLE1BQWMsRUFBRSxzQkFBNEU7UUFFMUksc0VBQXNFO1FBQ3RFLDZFQUE2RTtRQUM3RSxNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFM0YsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFFLGlCQUFpQixFQUFFLE9BQU8sQ0FBRSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ3ZILHVCQUF1QixHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBRSxvQkFBb0IsRUFBRSxPQUFPLENBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUU5SCxJQUFLLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBRSxNQUFNLEVBQUUscUJBQXFCLENBQUU7WUFDM0UsTUFBTSxHQUFHLENBQUUsV0FBVyxLQUFLLFNBQVMsQ0FBRSxDQUFD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