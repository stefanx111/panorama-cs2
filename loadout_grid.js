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
        ClearItemIdFilter();
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
                    let slot = category === 'spray' ? 'spray0' : category === 'clothing' ? 'clothing_hands' : category;
                    let elRow = $.GetContextPanel().FindChildInLayoutFile('id-loadout-row-slots-' + m_selectedTeam);
                    let elItemPanel = elRow.FindChildInLayoutFile('id-loadout-row-slots-' + slot + '-' + m_selectedTeam);
                    let isSameId = elDragImage.itemid === elItemPanel.Data().itemid ? true : false;
                    let equipSuccess = LoadoutAPI.EquipItemInSlot(OverrideTeam(m_selectedTeam, slot), itemId, slot);
                    PlayDropSounds(equipSuccess, isSameId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZG91dF9ncmlkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZG91dF9ncmlkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUNsQyxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGtEQUFrRDtBQUVsRCxJQUFVLFdBQVcsQ0FvaENwQjtBQXBoQ0QsV0FBVSxXQUFXO0lBRXBCLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0lBQzlCLElBQUkseUJBQXdDLENBQUM7SUFDN0MsSUFBSSx5QkFBd0MsQ0FBQztJQUM3QyxJQUFJLGNBQTBCLENBQUM7SUFDL0IsSUFBSSxlQUF1QixDQUFDO0lBQzVCLElBQUksY0FBdUIsQ0FBQztJQUM1QixJQUFJLFlBQW9CLENBQUM7SUFDekIsSUFBSSxjQUFjLEdBQVcsRUFBRSxDQUFDO0lBQ2hDLElBQUksOEJBQThCLEdBQVcsS0FBSyxDQUFDO0lBRW5ELElBQUksZUFBZSxHQUFHO1FBQ3JCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFHRixNQUFNLGVBQWUsR0FBRztRQUN2QixFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRTtRQUNsRCxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO1FBQ3BDLEVBQUUsSUFBSSxF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