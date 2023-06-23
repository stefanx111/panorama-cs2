/// <reference path="csgo.d.ts" />
/// <reference path="inspect.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="common/tint_spray_icon.ts" />
var LoadoutGrid;
(function (LoadoutGrid) {
    let m_hasRunFirstTime = false;
    let m_equipSlotChangedHandler;
    let m_inventoryUpdatedHandler;
    let m_selectedTeam;
    let m_mouseOverSlot;
    let m_elDragSource;
    let m_dragItemId;
    let m_filterItemId = '';
    let m_updatedFromShowItemInLoadout = false;
    let m_currentCharId = {
        t: '',
        ct: '',
        noteam: '',
    };
    let m_currentCharGlovesId = {
        t: '',
        ct: '',
        noteam: '',
    };
    let m_currentCharWeaponId = {
        t: '',
        ct: '',
        noteam: '',
    };
    const m_notWeaponSlot = [
        { slot: 'customplayer', category: 'customplayer' },
        { slot: 'clothing_hands', category: 'clothing' },
        { slot: 'melee', category: 'melee' },
        { slot: 'musickit', category: 'musickit' },
        { slot: 'flair0', category: 'flair0' },
        { slot: 'spray0', category: 'spray' }
    ];
    function OnReadyForDisplay() {
        if (!m_hasRunFirstTime) {
            m_hasRunFirstTime = true;
            Init();
        }
        else {
            FillOutRowItems('ct');
            FillOutRowItems('t');
            UpdateGridFilterIcons();
            UpdateItemList();
            m_updatedFromShowItemInLoadout = m_updatedFromShowItemInLoadout ? false : false;
        }
        m_equipSlotChangedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Loadout_EquipSlotChanged', OnEquipSlotChanged);
        m_inventoryUpdatedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', () => {
            UpdateItemList;
        });
    }
    LoadoutGrid.OnReadyForDisplay = OnReadyForDisplay;
    function OnUnreadyForDisplay() {
        if (m_equipSlotChangedHandler) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_Loadout_EquipSlotChanged', m_equipSlotChangedHandler);
            m_equipSlotChangedHandler = null;
        }
        if (m_inventoryUpdatedHandler) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', m_inventoryUpdatedHandler);
            m_inventoryUpdatedHandler = null;
        }
        UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip');
    }
    LoadoutGrid.OnUnreadyForDisplay = OnUnreadyForDisplay;
    function OnEquipSlotChanged(team, slot, oldItemId, newItemId, bNew) {
        if (team == 't' || team == 'ct') {
            FillOutGridItems(team);
            if (['melee', 'secondary', 'smg', 'rifle'].includes(InventoryAPI.GetLoadoutCategory(newItemId)))
                UpdateCharModel(team, newItemId);
            else
                UpdateCharModel(team);
        }
        FillOutRowItems('ct');
        FillOutRowItems('t');
        UpdateGridFilterIcons();
    }
    function Init() {
        UpdateCharModel('ct');
        UpdateCharModel('t');
        SetUpTeamSelectBtns();
        InitSortDropDown();
        $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('id-loadout-select-team-btn-t'), "mouse");
        $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('id-loadout-select-team-btn-ct'), "mouse");
        let elItemList = $('#id-loadout-item-list');
        elItemList.SetAttributeInt('DragScrollSpeedHorizontal', 0);
        elItemList.SetAttributeInt('DragScrollSpeedVertical', 0);
    }
    function SetUpTeamSelectBtns() {
        let aSectionSuffexes = ['ct', 't'];
        aSectionSuffexes.forEach(suffex => {
            let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + suffex);
            let elBtn = elSection.FindChildInLayoutFile('id-loadout-select-team-btn-' + suffex);
            elBtn.Data().team = suffex;
            ItemDragTargetEvents(elBtn);
            elBtn.SetPanelEvent('onactivate', ChangeSelectedTeam);
            elBtn.SetPanelEvent('onmouseover', () => { UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip'); });
        });
    }
    function ChangeSelectedTeam() {
        let suffex = (m_selectedTeam == 't' ? 'ct' : 't');
        let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + suffex);
        $.GetContextPanel().SetHasClass('loadout_t_selected', suffex === 't');
        elSection.FindChildInLayoutFile('id-loadout-grid-slots-' + suffex).hittest = true;
        let oppositeTeam = suffex === 't' ? 'ct' : 't';
        let elOppositeSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + oppositeTeam);
        elOppositeSection.FindChildInLayoutFile('id-loadout-grid-slots-' + oppositeTeam).hittest = false;
        m_selectedTeam = suffex;
        FillOutGridItems(m_selectedTeam);
        FillOutRowItems(m_selectedTeam);
        UpdateFilters();
        UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip');
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.submenu_select', 'MOUSE');
    }
    function OnActivateSideItem(slotName, TeamName) {
        if (m_selectedTeam !== TeamName) {
            ChangeSelectedTeam();
            ToggleGroupDropdown(slotName, true);
        }
        else {
            ClearItemIdFilter();
            ToggleGroupDropdown(slotName, false);
        }
    }
    function UpdateCharModel(team, weaponId = '') {
        let elPanel = $.GetContextPanel().FindChildInLayoutFile('id-loadout-agent-' + team);
        if (!elPanel)
            return;
        let charId = LoadoutAPI.GetItemID(team, 'customplayer');
        let glovesId = LoadoutAPI.GetItemID(team, 'clothing_hands');
        const settings = ItemInfo.GetOrUpdateVanityCharacterSettings(charId);
        if (team == m_selectedTeam) {
            let selectedGroup = GetSelectedGroup();
            if (['melee', 'secondary0'].includes(selectedGroup)) {
                weaponId = LoadoutAPI.GetItemID(team, selectedGroup);
            }
            else if (['secondary', 'smg', 'rifle'].includes(selectedGroup)) {
                let selectedItemDef = GetSelectedItemDef();
                if (selectedItemDef != 'all') {
                    let itemDefIndex = InventoryAPI.GetItemDefinitionIndexFromDefinitionName(selectedItemDef);
                    if (LoadoutAPI.IsItemDefEquipped(team, itemDefIndex)) {
                        let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, itemDefIndex);
                        weaponId = LoadoutAPI.GetItemID(team, slot);
                    }
                }
            }
        }
        if (!weaponId || weaponId == '0') {
            weaponId = m_currentCharWeaponId[team];
            if (!weaponId || weaponId == '0')
                weaponId = LoadoutAPI.GetItemID(team, 'melee');
        }
        if (charId != m_currentCharId[team] || glovesId != m_currentCharGlovesId[team] || weaponId != m_currentCharWeaponId[team]) {
            m_currentCharId[team] = charId;
            m_currentCharGlovesId[team] = glovesId;
            m_currentCharWeaponId[team] = weaponId;
            settings.panel = elPanel;
            settings.weaponItemId = weaponId;
            CharacterAnims.PlayAnimsOnPanel(settings);
        }
    }
    function FillOutGridItems(team) {
        let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + team);
        let elGrid = elSection.FindChildInLayoutFile('id-loadout-grid-slots-' + team);
        elGrid.Children().forEach(column => {
            let aPanels = column.Children().filter(panel => panel.GetAttributeString('data-slot', '') !== '');
            for (let i = 0; i < aPanels.length; i++) {
                if (column.GetAttributeString('data-slot', '') === 'equipment' ||
                    column.GetAttributeString('data-slot', '') === 'grenade') {
                    UpdateSlotItemImage(team, aPanels[i], true, false, true);
                }
                else {
                    UpdateSlotItemImage(team, aPanels[i], false, true);
                    UpdateName(aPanels[i]);
                    UpdateMoney(aPanels[i], team);
                    LoadoutSlotItemTileEvents(aPanels[i]);
                    ItemDragTargetEvents(aPanels[i]);
                }
            }
        });
    }
    function FillOutRowItems(team) {
        let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + team);
        let elRow = elSection.FindChildInLayoutFile('id-loadout-row-slots-' + team);
        m_notWeaponSlot.forEach(entry => {
            let panelId = 'id-loadout-row-slots-' + entry.slot + '-' + team;
            let elBtn = elRow.FindChild(panelId);
            if (!elBtn) {
                elBtn = $.CreatePanel('ItemImage', elRow, panelId, {
                    class: 'loadout-model-panel__slot'
                });
                elBtn.SetAttributeString('data-slot', entry.slot);
            }
            let slotName = entry.slot;
            let itemid = LoadoutAPI.GetItemID(OverrideTeam(team, slotName), slotName);
            let bUseIcon = (slotName === 'musickit' || slotName === 'spray0' || slotName === 'flair0') && itemid === '0' ? true : false;
            UpdateSlotItemImage(team, elBtn, bUseIcon, true);
            if (itemid && itemid != '0' && elBtn) {
                elBtn.SetPanelEvent('oncontextmenu', () => OpenContextMenu(elBtn, 'loadout_slot_' + team));
                elBtn.SetPanelEvent('onmouseover', () => {
                    if (team == m_selectedTeam && slotName == 'melee')
                        UpdateCharModel(team, LoadoutAPI.GetItemID(team, 'melee'));
                    UiToolkitAPI.ShowCustomLayoutParametersTooltip(panelId, 'JsLoadoutItemTooltip', 'file://{resources}/layout/tooltips/tooltip_loadout_item.xml', 'itemid=' + elBtn.Data().itemid +
                        '&' + 'slot=' + slotName +
                        '&' + 'team=' + m_selectedTeam);
                });
                elBtn.SetPanelEvent('onmouseout', () => { UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip'); });
            }
            else
                elBtn.SetPanelEvent('oncontextmenu', () => { });
            elBtn.SetPanelEvent('onactivate', () => OnActivateSideItem(slotName, team));
        });
    }
    function UpdateSlotItemImage(team, elPanel, bUseIcon, bUseFilterIcon, bIsEquipment = false) {
        let slot = elPanel.GetAttributeString('data-slot', '');
        let itemImage = elPanel.FindChild('loudout-item-image-' + slot);
        let itemid = LoadoutAPI.GetItemID(OverrideTeam(team, slot), slot);
        let elRarity = elPanel.FindChild('id-loadout-item-rarity');
        if (!itemImage) {
            itemImage = $.CreatePanel('ItemImage', elPanel, 'loudout-item-image-' + slot, {
                class: 'loadout-slot__image'
            });
            if (!bUseIcon) {
                elRarity = $.CreatePanel('Panel', elPanel, 'id-loadout-item-rarity', {
                    class: 'loadout-slot-rarity'
                });
            }
            if (bUseFilterIcon) {
                $.CreatePanel('Image', elPanel, 'id-loadout-item-filter-icon', {
                    class: 'loadout-slot-filter-icon'
                });
            }
        }
        itemImage.SetHasClass('loadout-slot__image', !bUseIcon);
        itemImage.SetHasClass('loadout-slot-svg__image', bUseIcon);
        if (!bIsEquipment) {
            TintSprayImage(itemImage, itemid);
        }
        if (bUseIcon) {
            itemImage.SetImage('file://{images}/icons/equipment/' + GetDefName(itemid, slot) + '.svg');
        }
        else {
            itemImage.itemid = itemid;
        }
        elPanel.Data().itemid = itemid;
        var color = ItemInfo.GetRarityColor(itemid);
        if (elRarity) {
            elRarity.visible = color ? true : false;
            if (color)
                elRarity.style.backgroundColor = color;
            return;
        }
    }
    function TintSprayImage(itemImage, itemId) {
        TintSprayIcon.CheckIsSprayAndTint(itemId, itemImage);
    }
    ;
    function UpdateName(elPanel) {
        let elName = elPanel.FindChild('id-loadout-item-name');
        if (!elName) {
            elName = $.CreatePanel('Label', elPanel, 'id-loadout-item-name', {
                class: 'loadout-slot__name stratum-regular',
                text: '{s:item-name}'
            });
        }
        elPanel.SetDialogVariable('item-name', $.Localize(InventoryAPI.GetItemBaseName(elPanel.Data().itemid)));
    }
    function UpdateMoney(elPanel, team) {
        let elMoney = elPanel.FindChild('id-loadout-item-money');
        if (!elMoney) {
            elMoney = $.CreatePanel('Label', elPanel, 'id-loadout-item-money', {
                class: 'loadout-slot__money stratum-regular',
                text: '{d:money}'
            });
        }
        elPanel.SetDialogVariableInt('money', LoadoutAPI.GetItemGamePrice(team, elPanel.GetAttributeString('data-slot', '')));
        elMoney.text = $.Localize("#buymenu_money", elPanel);
    }
    function GetDefName(itemid, slot) {
        let defName = InventoryAPI.GetItemDefinitionName(itemid);
        let aDefName = [];
        if (slot === 'clothing_hands' || slot === 'melee' || slot === 'customplayer' || itemid === '0') {
            return slot;
        }
        else {
            aDefName = defName ? defName.split('_') : [];
            return aDefName[1];
        }
    }
    function OverrideTeam(team, slot) {
        return slot === 'musickit' || slot === 'spray0' || slot === 'flair0' ? 'noteam' : team;
    }
    function LoadoutSlotItemTileEvents(elPanel) {
        elPanel.SetPanelEvent('onactivate', () => {
            ClearItemIdFilter();
            FilterByItemType(elPanel.Data().itemid, true);
        });
        elPanel.SetPanelEvent('onmouseover', () => {
            m_mouseOverSlot = elPanel.GetAttributeString('data-slot', '');
            UpdateCharModel(m_selectedTeam, LoadoutAPI.GetItemID(m_selectedTeam, m_mouseOverSlot));
            UiToolkitAPI.ShowCustomLayoutParametersTooltip('loudout-item-image-' + m_mouseOverSlot, 'JsLoadoutItemTooltip', 'file://{resources}/layout/tooltips/tooltip_loadout_item.xml', 'itemid=' + elPanel.Data().itemid +
                '&' + 'slot=' + m_mouseOverSlot +
                '&' + 'team=' + m_selectedTeam +
                '&' + 'nameonly=' + 'true');
        });
        elPanel.SetPanelEvent('onmouseout', () => {
            m_mouseOverSlot = '';
            elPanel.SetPanelEvent('onmouseout', () => { UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip'); });
        });
        elPanel.SetPanelEvent('oncontextmenu', () => OpenContextMenu(elPanel, 'loadout_slot_' + m_selectedTeam));
        elPanel.SetDraggable(true);
        $.RegisterEventHandler('DragStart', elPanel, (elPanel, drag) => {
            if (m_mouseOverSlot !== null) {
                let itemid = LoadoutAPI.GetItemID(m_selectedTeam, m_mouseOverSlot);
                OnDragStart(elPanel, drag, itemid);
            }
        });
        $.RegisterEventHandler('DragEnd', elPanel, (elRadial, elDragImage) => {
            OnDragEnd(elDragImage);
        });
    }
    function OpenContextMenu(elPanel, filterValue) {
        UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip');
        var filterForContextMenuEntries = '&populatefiltertext=' + filterValue;
        var contextMenuPanel = UiToolkitAPI.ShowCustomLayoutContextMenuParametersDismissEvent('', '', 'file://{resources}/layout/context_menus/context_menu_inventory_item.xml', 'itemid=' + elPanel.Data().itemid + filterForContextMenuEntries, function () {
        });
        contextMenuPanel.AddClass("ContextMenu_NoArrow");
    }
    function ItemDragTargetEvents(elPanel) {
        $.RegisterEventHandler('DragEnter', elPanel, () => {
            elPanel.AddClass('loadout-drag-enter');
            m_mouseOverSlot = elPanel.GetAttributeString('data-slot', '');
        });
        $.RegisterEventHandler('DragLeave', elPanel, () => {
            elPanel.RemoveClass('loadout-drag-enter');
            m_mouseOverSlot = '';
        });
        $.RegisterEventHandler('DragDrop', elPanel, function (dispayId, elDragImage) {
            OnDragDrop(elPanel, elDragImage);
        });
    }
    function OnDragStart(elDragSource, drag, itemid) {
        let elDragImage = $.CreatePanel('ItemImage', $.GetContextPanel(), '', {
            class: 'loadout-drag-icon',
            textureheight: '128',
            texturewidth: '128'
        });
        elDragImage.itemid = itemid;
        TintSprayImage(elDragImage, itemid);
        drag.displayPanel = elDragImage;
        drag.offsetX = 96;
        drag.offsetY = 64;
        drag.removePositionBeforeDrop = false;
        elDragImage.AddClass('drag-start');
        m_elDragSource = elDragSource;
        m_elDragSource.AddClass('dragged-away');
        m_dragItemId = itemid;
        UpdateValidDropTargets();
        let elItemList = $('#id-loadout-item-list');
        elItemList.hittest = false;
        elItemList.hittestchildren = false;
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_item_pickup', 'MOUSE');
    }
    function OnDragEnd(elDragImage) {
        elDragImage.DeleteAsync(0.1);
        elDragImage.AddClass('drag-end');
        m_elDragSource.RemoveClass('dragged-away');
        m_dragItemId = '';
        UpdateValidDropTargets();
        let elItemList = $('#id-loadout-item-list');
        elItemList.hittest = true;
        elItemList.hittestchildren = true;
    }
    function OnDragDrop(elPanel, elDragImage) {
        let newSlot = elPanel.GetAttributeString('data-slot', '');
        if (newSlot !== null) {
            if (newSlot === 'side_slots' && m_selectedTeam === elPanel.GetAttributeString('data-team', '')) {
                let itemId = elDragImage.itemid;
                if (ItemInfo.ItemMatchDefName(itemId, 'spray')) {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + itemId +
                        '&' + 'asyncworktype=decodeable');
                }
                else {
                    let category = InventoryAPI.GetLoadoutCategory(itemId);
                    if (m_notWeaponSlot.find((entry) => { return entry.category === category; })) {
                        let slot = category === 'spray' ? 'spray0' : category === 'clothing' ? 'clothing_hands' : category;
                        let elRow = $.GetContextPanel().FindChildInLayoutFile('id-loadout-row-slots-' + m_selectedTeam);
                        let elItemPanel = elRow.FindChildInLayoutFile('id-loadout-row-slots-' + slot + '-' + m_selectedTeam);
                        let isSameId = elDragImage.itemid === elItemPanel.Data().itemid ? true : false;
                        let equipSuccess = LoadoutAPI.EquipItemInSlot(OverrideTeam(m_selectedTeam, slot), itemId, slot);
                        PlayDropSounds(equipSuccess, isSameId);
                    }
                }
                return;
            }
            let canEquip = LoadoutAPI.CanEquipItemInSlot(m_selectedTeam, elDragImage.itemid, newSlot);
            if (canEquip) {
                let itemId = elDragImage.itemid;
                if (InventoryAPI.IsValidItemID(itemId)) {
                    let itemDefIndex = InventoryAPI.GetItemDefinitionIndex(itemId);
                    let oldSlot = LoadoutAPI.GetSlotEquippedWithDefIndex(m_selectedTeam, itemDefIndex);
                    let isSameId = elDragImage.itemid === elPanel.Data().itemid ? true : false;
                    let equipSuccess = LoadoutAPI.EquipItemInSlot(m_selectedTeam, itemId, newSlot);
                    PlayDropSounds(equipSuccess, isSameId);
                    elPanel.TriggerClass('drop-target');
                    $.Schedule(.5, () => { if (elPanel) {
                        elPanel.RemoveClass('drop-target');
                    } });
                    elPanel.hittestchildren = false;
                    $.Schedule(1, () => { elPanel.hittestchildren = true; });
                    let oldTile = FindGridTile(oldSlot);
                    if (oldTile) {
                        oldTile.AddClass('old-item-slot');
                        $.Schedule(.5, () => { if (oldTile) {
                            oldTile.RemoveClass('old-item-slot');
                        } });
                    }
                }
            }
        }
    }
    function PlayDropSounds(equipSuccess, isSameId) {
        if (equipSuccess && !isSameId) {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_item_putdown', 'MOUSE');
        }
        else {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_item_notequipped', 'MOUSE');
        }
    }
    const m_aActiveUsedColumns = [
        'id-loadout-column1',
        'id-loadout-column2',
        'id-loadout-column3',
    ];
    function UpdateValidDropTargets() {
        if (m_dragItemId && InventoryAPI.IsValidItemID(m_dragItemId)) {
            let category = InventoryAPI.GetLoadoutCategory(m_dragItemId);
            if (!category || m_notWeaponSlot.find((entry) => { return entry.category === category; })) {
                let elBtn = $.GetContextPanel().FindChildInLayoutFile('id-loadout-agent-' + m_selectedTeam);
                elBtn.SetHasClass('loadout-valid-target', true);
                return;
            }
        }
        let aSectionSuffexes = ['ct', 't'];
        aSectionSuffexes.forEach(suffex => {
            let elBtn = $.GetContextPanel().FindChildInLayoutFile('id-loadout-agent-' + suffex);
            elBtn.SetHasClass('loadout-valid-target', false);
        });
        let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + m_selectedTeam);
        let elGrid = elSection.FindChildInLayoutFile('id-loadout-grid-slots-' + m_selectedTeam);
        for (let columnId of m_aActiveUsedColumns) {
            let elColumn = elGrid.FindChildInLayoutFile(columnId);
            for (let elPanel of elColumn.Children()) {
                let slot = elPanel.GetAttributeString('data-slot', '');
                let canEquip = LoadoutAPI.CanEquipItemInSlot(m_selectedTeam, m_dragItemId, slot);
                elPanel.SetHasClass('loadout-valid-target', canEquip);
            }
        }
    }
    function FindGridTile(oldSlot) {
        let elGrid = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-slots-' + m_selectedTeam);
        {
            for (let columnId of m_aActiveUsedColumns) {
                let elColumn = elGrid.FindChildInLayoutFile(columnId);
                for (let elPanel of elColumn.Children()) {
                    let slot = elPanel.GetAttributeString('data-slot', '');
                    if (slot === oldSlot) {
                        return elPanel;
                    }
                }
            }
        }
        return null;
    }
    function InitSortDropDown() {
        let elDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-sort');
        let count = InventoryAPI.GetSortMethodsCount();
        for (let i = 0; i < count; i++) {
            let id = InventoryAPI.GetSortMethodByIndex(i);
            let newEntry = $.CreatePanel('Label', elDropdown, id, { class: 'DropDownMenu' });
            newEntry.text = $.Localize('#' + id);
            elDropdown.AddOption(newEntry);
        }
        elDropdown.SetSelected(GameInterfaceAPI.GetSettingString("cl_loadout_saved_sort"));
    }
    function UpdateFilters() {
        let group = GetSelectedGroup();
        let elClearBtn = $.GetContextPanel().FindChildInLayoutFile('id-loadout-clear-filters');
        elClearBtn.visible = (group != 'all' || m_filterItemId !== '');
        let itemDefNames = null;
        if (['secondary', 'smg', 'rifle'].includes(group)) {
            itemDefNames = JSON.parse(LoadoutAPI.GetGroupItemDefNames(m_selectedTeam, group));
            itemDefNames.sort();
        }
        let elItemDefDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        if (itemDefNames) {
            let prevSelected = GetSelectedItemDef();
            elItemDefDropdown.RemoveAllOptions();
            {
                let elOption = $.CreatePanel('Label', elItemDefDropdown, 'all', { class: 'DropDownMenu' });
                elOption.text = $.Localize('#inv_filter_all_' + group);
                elItemDefDropdown.AddOption(elOption);
            }
            let itemDefNames = JSON.parse(LoadoutAPI.GetGroupItemDefNames(m_selectedTeam, group)).sort();
            for (let itemDefName of itemDefNames) {
                let itemDefIndex = InventoryAPI.GetItemDefinitionIndexFromDefinitionName(itemDefName);
                let itemId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(itemDefIndex, 0);
                let elOption = $.CreatePanel('Label', elItemDefDropdown, itemDefName, { class: 'DropDownMenu' });
                elOption.text = $.Localize(InventoryAPI.GetItemBaseName(itemId));
                elItemDefDropdown.AddOption(elOption);
                ;
            }
            elItemDefDropdown.visible = true;
            if (elItemDefDropdown.HasOption(prevSelected))
                elItemDefDropdown.SetSelected(prevSelected);
            else
                elItemDefDropdown.SetSelected('all');
        }
        else {
            elItemDefDropdown.visible = false;
            elItemDefDropdown.SetSelected('all');
            UpdateItemList();
        }
        UpdateGridFilterIcons();
    }
    LoadoutGrid.UpdateFilters = UpdateFilters;
    function UpdateItemList() {
        let loadoutSlotParams = m_selectedTeam;
        let group = GetSelectedGroup();
        if (group != 'all')
            loadoutSlotParams += ',flexible_loadout_group:' + group;
        let elItemDefDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        if (elItemDefDropdown.visible) {
            let itemDefName = GetSelectedItemDef();
            if (itemDefName != 'all')
                loadoutSlotParams += ',item_definition:' + itemDefName;
        }
        let elSortDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-sort');
        let sortType = elSortDropdown.GetSelected().id;
        if (GameInterfaceAPI.GetSettingString("cl_loadout_saved_sort") != sortType) {
            GameInterfaceAPI.SetSettingString("cl_loadout_saved_sort", sortType);
            GameInterfaceAPI.ConsoleCommand("host_writeconfig");
        }
        if (m_filterItemId !== '' &&
            InventoryAPI.IsValidItemID(m_filterItemId) &&
            group === InventoryAPI.GetRawDefinitionKey(m_filterItemId, 'flexible_loadout_group') &&
            m_updatedFromShowItemInLoadout) {
            loadoutSlotParams += ',item_id:' + m_filterItemId;
        }
        else if (m_filterItemId) {
            ClearItemIdFilter();
        }
        let elItemList = $.GetContextPanel().FindChildInLayoutFile('id-loadout-item-list');
        $.DispatchEvent('SetInventoryFilter', elItemList, 'flexible_loadout_group', 'any', 'any', sortType, loadoutSlotParams, '');
        UpdateGridFilterIcons();
        ShowHideItemFilterText(m_filterItemId != '');
    }
    LoadoutGrid.UpdateItemList = UpdateItemList;
    function ClearFilters() {
        let elGroupDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
        if ($.GetContextPanel().FindChildInLayoutFile('id-loadout-clear-filters-label').visible) {
            ShowHideItemFilterText(false);
            ClearItemIdFilter();
            UpdateItemList();
            return;
        }
        elGroupDropdown.SetSelected('all');
    }
    LoadoutGrid.ClearFilters = ClearFilters;
    function ShowHideItemFilterText(bShow) {
        $.GetContextPanel().FindChildInLayoutFile('id-loadout-clear-filters-label').visible = bShow;
    }
    ;
    function FilterByItemType(itemId, bToggle = false) {
        let group = InventoryAPI.GetRawDefinitionKey(itemId, 'flexible_loadout_group');
        let elGroupDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
        let elItemDefDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        if (bToggle && GetSelectedGroup() == group && !elItemDefDropdown.visible) {
            elGroupDropdown.SetSelected('all');
            return;
        }
        elGroupDropdown.SetSelected(group);
        if (elItemDefDropdown.visible) {
            let itemDefName = InventoryAPI.GetItemDefinitionName(itemId);
            if (bToggle && GetSelectedItemDef() == itemDefName)
                elItemDefDropdown.SetSelected('all');
            else
                elItemDefDropdown.SetSelected(itemDefName);
        }
    }
    LoadoutGrid.FilterByItemType = FilterByItemType;
    function ToggleGroupDropdown(group, bDisallowToggle = false) {
        let elGroupDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
        let elItemDefDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        if (GetSelectedGroup() == group && !bDisallowToggle) {
            if (GetSelectedItemDef() != 'all')
                elItemDefDropdown.SetSelected('all');
            else
                elGroupDropdown.SetSelected('all');
        }
        else {
            elGroupDropdown.SetSelected(group);
            if (elItemDefDropdown.visible)
                elItemDefDropdown.SetSelected('all');
        }
    }
    LoadoutGrid.ToggleGroupDropdown = ToggleGroupDropdown;
    function OnItemTileLoaded(elItemTile) {
        elItemTile.SetPanelEvent('onactivate', () => { });
        elItemTile.SetDraggable(true);
        $.RegisterEventHandler('DragStart', elItemTile, (elItemTile, drag) => {
            $.DispatchEvent('CSGOInventoryHideTooltip', elItemTile);
            OnDragStart(elItemTile, drag, elItemTile.GetAttributeString('itemid', '0'));
        });
        $.RegisterEventHandler('DragEnd', elItemTile, (elItemTile, elDragImage) => {
            OnDragEnd(elDragImage);
        });
    }
    LoadoutGrid.OnItemTileLoaded = OnItemTileLoaded;
    function ShowLoadoutForItem(itemId) {
        if (!DoesItemTeamMatchTeamRequired(m_selectedTeam, itemId)) {
            ChangeSelectedTeam();
        }
        m_filterItemId = itemId;
        m_updatedFromShowItemInLoadout = true;
        let elClearBtn = $.GetContextPanel().FindChildInLayoutFile('id-loadout-clear-filters');
        elClearBtn.SetDialogVariable('item_name', InventoryAPI.GetItemName(m_filterItemId));
        ShowHideItemFilterText(true);
        FilterByItemType(itemId);
    }
    LoadoutGrid.ShowLoadoutForItem = ShowLoadoutForItem;
    function ClearItemIdFilter() {
        m_filterItemId = m_filterItemId !== '' ? '' : '';
    }
    function DoesItemTeamMatchTeamRequired(team, id) {
        if (team === 't') {
            return ItemInfo.IsItemT(id) || ItemInfo.IsItemAnyTeam(id);
        }
        if (team === 'ct') {
            return ItemInfo.IsItemCt(id) || ItemInfo.IsItemAnyTeam(id);
        }
        return false;
    }
    function UpdateGridFilterIcons() {
        let selectedGroup = GetSelectedGroup();
        let selectedItemDef = GetSelectedItemDef();
        let elGrid = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-slots-' + m_selectedTeam);
        if (elGrid) {
            for (let group of ['secondary0', 'secondary', 'smg', 'rifle']) {
                let btn = elGrid.FindChildInLayoutFile('id-loadout-btn-' + group);
                if (btn) {
                    btn.checked = (group == selectedGroup && (!selectedItemDef || selectedItemDef == 'all'));
                }
            }
            for (let columnId of m_aActiveUsedColumns) {
                let elColumn = elGrid.FindChildInLayoutFile(columnId);
                for (let elPanel of elColumn.Children()) {
                    let elFilterIcon = elPanel.FindChildInLayoutFile('id-loadout-item-filter-icon');
                    if (elFilterIcon) {
                        let slot = elPanel.GetAttributeString('data-slot', '');
                        let itemId = LoadoutAPI.GetItemID(m_selectedTeam, slot);
                        let itemDef = InventoryAPI.GetItemDefinitionName(itemId);
                        elFilterIcon.visible = (itemDef == selectedItemDef);
                    }
                }
            }
        }
        for (let team of ['ct', 't']) {
            let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + team);
            let elRow = elSection.FindChildInLayoutFile('id-loadout-row-slots-' + team);
            for (let elPanel of elRow.Children()) {
                let elFilterIcon = elPanel.FindChildInLayoutFile('id-loadout-item-filter-icon');
                if (elFilterIcon) {
                    if (team == m_selectedTeam) {
                        let slot = elPanel.GetAttributeString('data-slot', '');
                        elFilterIcon.visible = (slot == selectedGroup);
                    }
                    else {
                        elFilterIcon.visible = false;
                    }
                }
            }
        }
        UpdateCharModel(m_selectedTeam);
    }
    function GetSelectedGroup() {
        let elDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
        return (elDropdown?.visible ? elDropdown.GetSelected()?.id : null) ?? 'all';
    }
    function GetSelectedItemDef() {
        let elDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        return (elDropdown?.visible ? elDropdown.GetSelected()?.id : null) ?? 'all';
    }
})(LoadoutGrid || (LoadoutGrid = {}));
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), LoadoutGrid.OnReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), LoadoutGrid.OnUnreadyForDisplay);
    $.RegisterForUnhandledEvent('LoadoutFilterByItemType', LoadoutGrid.FilterByItemType);
    $.RegisterEventHandler('CSGOInventoryItemLoaded', $.GetContextPanel(), LoadoutGrid.OnItemTileLoaded);
    $.RegisterForUnhandledEvent('ShowLoadoutForItem', LoadoutGrid.ShowLoadoutForItem);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZG91dF9ncmlkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZG91dF9ncmlkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQyxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUVsRCxJQUFVLFdBQVcsQ0F3aENwQjtBQXhoQ0QsV0FBVSxXQUFXO0lBRXBCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0lBQzlCLElBQUkseUJBQXdDLENBQUM7SUFDN0MsSUFBSSx5QkFBd0MsQ0FBQztJQUM3QyxJQUFJLGNBQTBCLENBQUM7SUFDL0IsSUFBSSxlQUF1QixDQUFDO0lBQzVCLElBQUksY0FBdUIsQ0FBQztJQUM1QixJQUFJLFlBQW9CLENBQUM7SUFDekIsSUFBSSxjQUFjLEdBQVcsRUFBRSxDQUFDO0lBQ2hDLElBQUksOEJBQThCLEdBQVcsS0FBSyxDQUFDO0lBRW5ELElBQUksZUFBZSxHQUFHO1FBQ3JCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFHRixNQUFNLGVBQWUsR0FBRztRQUN2QixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRTtRQUNsRCxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO1FBQ3BDLEVBQUUsSUFBSSxF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