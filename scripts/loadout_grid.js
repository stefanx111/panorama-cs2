"use strict";
/// <reference path="csgo.d.ts" />
/// <reference path="inspect.ts" />
/// <reference path="common/iteminfo.ts" />
/// <reference path="common/tint_spray_icon.ts" />
var LoadoutGrid;
(function (LoadoutGrid) {
    let m_hasRunFirstTime = false;
    let m_equipSlotChangedHandler;
    let m_setShuffleEnabledHandler;
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
    // helper for getting correct slot name for weapon. 
    const m_arrGenericCharacterGlobalSlots = [
        { slot: 'customplayer', category: 'customplayer' },
        { slot: 'clothing_hands', category: 'clothing' },
        { slot: 'melee', category: 'melee', equip_on_hover: true },
        { slot: 'musickit', category: 'musickit' },
        { slot: 'flair0', category: 'flair0' },
        { slot: 'spray0', category: 'spray' },
        { slot: 'c4', category: 'c4', required_team: 't', equip_on_hover: true }
    ];
    function _BCanFitIntoNonWeaponSlot(category, team) {
        return m_arrGenericCharacterGlobalSlots.find((entry) => { return entry.category === category && (!entry.required_team || (entry.required_team === team)); })
            ? true
            : false;
    }
    function _BIsSlotAndTeamConfigurationValid(slot, team) {
        return m_arrGenericCharacterGlobalSlots.find((entry) => { return entry.slot === slot && entry.required_team && (entry.required_team !== team); })
            ? false
            : true;
    }
    // -------Events Handeler registration and unregistration-------
    function OnReadyForDisplay() {
        if (!m_hasRunFirstTime) {
            m_hasRunFirstTime = true;
            Init();
        }
        else {
            FillOutRowItems('ct');
            FillOutRowItems('t');
            UpdateGridFilterIcons();
            UpdateGridShuffleIcons();
            UpdateItemList();
            // We do this here because OnReadyForDisplay() once the panel is visible fires after other events
            // But when the panel is created it fires before other events.
            m_updatedFromShowItemInLoadout = m_updatedFromShowItemInLoadout ? false : false;
        }
        m_equipSlotChangedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Loadout_EquipSlotChanged', OnEquipSlotChanged);
        m_setShuffleEnabledHandler = $.RegisterForUnhandledEvent('PanoramaComponent_Loadout_SetShuffleEnabled', UpdateGridShuffleIcons);
        m_inventoryUpdatedHandler = $.RegisterForUnhandledEvent('PanoramaComponent_MyPersona_InventoryUpdated', () => {
            $.Msg('LoadoutGrid-PanoramaComponent_MyPersona_InventoryUpdated');
            UpdateItemList;
        });
    }
    LoadoutGrid.OnReadyForDisplay = OnReadyForDisplay;
    function OnUnreadyForDisplay() {
        if (m_equipSlotChangedHandler) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_Loadout_EquipSlotChanged', m_equipSlotChangedHandler);
            m_equipSlotChangedHandler = null;
        }
        if (m_setShuffleEnabledHandler) {
            $.UnregisterForUnhandledEvent('PanoramaComponent_Loadout_SetShuffleEnabled', m_setShuffleEnabledHandler);
            m_setShuffleEnabledHandler = null;
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
        UpdateGridFilterIcons(); // e.g. if you moved or unequipped the weapon you're filtering by
    }
    // -------------------------------------------------------------------------------------------------------
    function Init() {
        UpdateCharModel('ct');
        UpdateCharModel('t');
        SetUpTeamSelectBtns();
        InitSortDropDown();
        UpdateGridShuffleIcons();
        // Select ct team loadout as first selection.
        // The Style 'loadout_t_selected' is applied by defaul_FillOutGridItemst so when we choose ct on display we get the animation.
        $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('id-loadout-select-team-btn-t'), "mouse");
        $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('id-loadout-select-team-btn-ct'), "mouse");
        // Disable drag scrolling. It's annoying when you're trying to drag item to your loadout.
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
        // keeping these active so you can filter and change team when you this these on the other side. Leaving here may use later.
        // elSection.FindChildInLayoutFile( 'id-loadout-row-slots-' + suffex ).hittestchildren = true;
        let oppositeTeam = suffex === 't' ? 'ct' : 't';
        let elOppositeSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + oppositeTeam);
        elOppositeSection.FindChildInLayoutFile('id-loadout-grid-slots-' + oppositeTeam).hittest = false;
        // keeping these active so you can filter and change team when you this these on the other side. Leaving here may use later.
        // elOppositeSection.FindChildInLayoutFile( 'id-loadout-row-slots-' + oppositeTeam ).hittestchildren = false;
        m_selectedTeam = suffex;
        // Update the slots to make sure we have the right ones when you switch teams
        FillOutGridItems(m_selectedTeam);
        FillOutRowItems(m_selectedTeam);
        if (!_BIsSlotAndTeamConfigurationValid(GetSelectedGroup(), m_selectedTeam)) {
            // we changed the team, but slot is not valid for this team -> clear filters and reset slot to 'all'
            // ClearItemIdFilter();
            // ClearFilters();
            let elGroupDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
            elGroupDropdown.SetSelected('all');
        }
        else {
            // UpdateFilters() transitively calls UpdateItemList(). Both can be necessary when changing teams.
            UpdateFilters();
        }
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
        // If we're filtering by something specific, prefer that over the given weapon ID.
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
        // Default to the last weapon we showed.
        if (!weaponId || weaponId == '0') {
            weaponId = m_currentCharWeaponId[team];
            if (!weaponId || weaponId == '0')
                weaponId = LoadoutAPI.GetItemID(team, 'melee'); // Default to knife.
        }
        // Only update if necessary. Unnecessary updates can result in gloves blinking.
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
                // grenades and equipment are non interactive
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
        m_arrGenericCharacterGlobalSlots.forEach(entry => {
            if (entry.required_team && entry.required_team !== team)
                return; // skip C4 slot for CTs
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
                elBtn.SetPanelEvent('oncontextmenu', () => {
                    if (LoadoutAPI.IsShuffleEnabled(OverrideTeam(team, slotName), slotName))
                        OpenContextMenu(elBtn, 'shuffle_slot_' + team);
                    else
                        OpenContextMenu(elBtn, 'loadout_slot_' + team);
                });
                elBtn.SetPanelEvent('onmouseover', () => {
                    if (team == m_selectedTeam && entry.equip_on_hover)
                        UpdateCharModel(team, LoadoutAPI.GetItemID(team, slotName));
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
    function UpdateSlotItemImage(team, elPanel, bUseIcon, bReplacable, bIsEquipment = false) {
        let slot = elPanel.GetAttributeString('data-slot', '');
        team = OverrideTeam(team, slot);
        let itemImage = elPanel.FindChild('loudout-item-image-' + slot);
        let itemid = LoadoutAPI.GetItemID(team, slot);
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
            if (bReplacable) {
                $.CreatePanel('Image', elPanel, 'id-loadout-item-filter-icon', {
                    class: 'loadout-slot-filter-icon'
                });
                let elShuffleIcon = $.CreatePanel('Image', elPanel, 'id-loadout-item-shuffle-icon', {
                    class: 'loadout-slot-shuffle-icon'
                });
                elShuffleIcon.visible = LoadoutAPI.IsShuffleEnabled(team, slot);
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
        if (LoadoutAPI.IsShuffleEnabled(team, slot)) {
            let sShuffleIds = GetShuffleItems(team, slot);
            // let aIds = [ itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid,itemid ];
            let elContainer = elPanel.FindChild('loudout-item-image-' + slot + '-shuffle');
            if (!elContainer) {
                elContainer = $.CreatePanel('Panel', elPanel, 'loudout-item-image-' + slot + '-shuffle', {});
            }
            // let aIds = sShuffleIds.split( ',' );
            sShuffleIds.forEach(element => {
                //let elShufffleItem = elContainer?.FindChild( 'loudout-item-image-' + slot +  )
                let elShufffleItem = $.CreatePanel('ItemImage', elContainer, 'loudout-item-image-' + slot, {
                    class: 'loadout-slot__image'
                });
                $.Msg('Shuffle Name: ' + InventoryAPI.GetItemName(element));
            });
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
    function ShuffleImages() {
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
        $.Msg('InventoryAPI.GetItemBaseName( itemid ): ' + InventoryAPI.GetItemBaseName(itemid));
        let aDefName = [];
        //
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
            $.Msg('loudout-item-image-' + m_mouseOverSlot);
            UpdateCharModel(m_selectedTeam, LoadoutAPI.GetItemID(m_selectedTeam, m_mouseOverSlot));
            UiToolkitAPI.ShowCustomLayoutParametersTooltip('loudout-item-image-' + m_mouseOverSlot, 'JsLoadoutItemTooltip', 'file://{resources}/layout/tooltips/tooltip_loadout_item.xml', 'itemid=' + elPanel.Data().itemid +
                '&' + 'slot=' + m_mouseOverSlot +
                '&' + 'team=' + m_selectedTeam +
                '&' + 'nameonly=' + 'true');
        });
        elPanel.SetPanelEvent('onmouseout', () => {
            m_mouseOverSlot = '';
            elPanel.SetPanelEvent('onmouseout', () => { UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip'); });
            // UpdateValidDropTargets();
        });
        elPanel.SetPanelEvent('oncontextmenu', () => {
            let slot = elPanel.GetAttributeString('data-slot', '');
            if (LoadoutAPI.IsShuffleEnabled(m_selectedTeam, slot))
                OpenContextMenu(elPanel, 'shuffle_slot_' + m_selectedTeam);
            else
                OpenContextMenu(elPanel, 'loadout_slot_' + m_selectedTeam);
        });
        // Weapons in the grid are draggable
        elPanel.SetDraggable(true);
        $.RegisterEventHandler('DragStart', elPanel, (elPanel, drag) => {
            if (m_mouseOverSlot !== null) {
                let itemid = LoadoutAPI.GetItemID(m_selectedTeam, m_mouseOverSlot);
                let bShuffle = LoadoutAPI.IsShuffleEnabled(m_selectedTeam, m_mouseOverSlot);
                OnDragStart(elPanel, drag, itemid, bShuffle);
            }
        });
        $.RegisterEventHandler('DragEnd', elPanel, (elRadial, elDragImage) => {
            OnDragEnd(elDragImage);
        });
    }
    function OpenContextMenu(elPanel, filterValue) {
        UiToolkitAPI.HideCustomLayoutTooltip('JsLoadoutItemTooltip');
        // override filter value
        var filterForContextMenuEntries = '&populatefiltertext=' + filterValue;
        // If you are browsing the inventory
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
    function OnDragStart(elDragSource, drag, itemid, bShuffle) {
        // Parent to $.GetContextPanel() instead of elDragSource.
        // Parenting to elDragSource results in item images getting stuck in weird places for some reason.
        let elDragImage = $.CreatePanel('ItemImage', $.GetContextPanel(), '', {
            class: 'loadout-drag-icon',
            textureheight: '128',
            texturewidth: '128'
        });
        elDragImage.itemid = itemid;
        elDragImage.Data().bShuffle = bShuffle;
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
        // // Disable scrolling while dragging.
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
        // Re-enable scrolling.
        let elItemList = $('#id-loadout-item-list');
        elItemList.hittest = true;
        elItemList.hittestchildren = true;
    }
    function OnDragDrop(elPanel, elDragImage) {
        let newSlot = elPanel.GetAttributeString('data-slot', '');
        if (newSlot !== null) {
            if (newSlot === 'side_slots' && m_selectedTeam === elPanel.GetAttributeString('data-team', '')) {
                let itemId = elDragImage.itemid;
                let bShuffle = elDragImage.Data().bShuffle;
                if (ItemInfo.ItemMatchDefName(itemId, 'spray')) {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + itemId +
                        '&' + 'asyncworktype=decodeable');
                }
                else {
                    let category = InventoryAPI.GetLoadoutCategory(itemId);
                    if (_BCanFitIntoNonWeaponSlot(category, m_selectedTeam)) {
                        // Catch the items that are using the subslot
                        let slot = category === 'spray' ? 'spray0' : category === 'clothing' ? 'clothing_hands' : category;
                        let team = OverrideTeam(m_selectedTeam, slot);
                        let elRow = $.GetContextPanel().FindChildInLayoutFile('id-loadout-row-slots-' + m_selectedTeam);
                        let elItemPanel = elRow.FindChildInLayoutFile('id-loadout-row-slots-' + slot + '-' + m_selectedTeam);
                        let isSameId = elDragImage.itemid === elItemPanel.Data().itemid ? true : false;
                        let equipSuccess = LoadoutAPI.EquipItemInSlot(team, itemId, slot);
                        PlayDropSounds(equipSuccess, isSameId);
                        if (equipSuccess && bShuffle) {
                            LoadoutAPI.SetShuffleEnabled(team, slot, true);
                        }
                    }
                }
                return;
            }
            let canEquip = LoadoutAPI.CanEquipItemInSlot(m_selectedTeam, elDragImage.itemid, newSlot);
            if (canEquip) {
                let itemId = elDragImage.itemid;
                let bShuffle = elDragImage.Data().bShuffle;
                if (InventoryAPI.IsValidItemID(itemId)) {
                    let itemDefIndex = InventoryAPI.GetItemDefinitionIndex(itemId);
                    let oldSlot = LoadoutAPI.GetSlotEquippedWithDefIndex(m_selectedTeam, itemDefIndex);
                    $.Msg('oldSlot: ' + oldSlot);
                    let isSameId = elDragImage.itemid === elPanel.Data().itemid ? true : false;
                    let equipSuccess = LoadoutAPI.EquipItemInSlot(m_selectedTeam, itemId, newSlot);
                    PlayDropSounds(equipSuccess, isSameId);
                    if (equipSuccess && bShuffle) {
                        LoadoutAPI.SetShuffleEnabled(m_selectedTeam, newSlot, true);
                    }
                    elPanel.TriggerClass('drop-target');
                    $.Schedule(.5, () => { if (elPanel) {
                        elPanel.RemoveClass('drop-target');
                    } });
                    // keep gun from making a drop target right away
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
        // 'id-loadout-column0', equipment
        'id-loadout-column1',
        'id-loadout-column2',
        'id-loadout-column3',
        // 'id-loadout-column4' grenades
    ];
    function UpdateValidDropTargets() {
        if (m_dragItemId && InventoryAPI.IsValidItemID(m_dragItemId)) {
            let category = InventoryAPI.GetLoadoutCategory(m_dragItemId);
            if (!category || _BCanFitIntoNonWeaponSlot(category, m_selectedTeam)) {
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
                    $.Msg('elColumn- ' + elColumn.id + ' slot- ' + slot + 'oldSlot: ' + oldSlot);
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
        if (!_BIsSlotAndTeamConfigurationValid(group, m_selectedTeam)) {
            // user selected a slot, but this slot is not valid for selected team...
            // ... well, use the fact that there are only two teams and we should just auto-switch
            // the user to the opposite team because clearly they want to work on that slot now
            $.DispatchEvent("Activated", $.GetContextPanel().FindChildInLayoutFile('id-loadout-select-team-btn-t'), "mouse");
            // return here, because activating the button will update filters again
            return;
        }
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
        // If we have a item id we are filtering for and change the drop down catagory then clear m_filterItemId
        // If the item changed under us and is not valid then also clear the m_filterItemId
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
        $.DispatchEvent('SetInventoryFilter', elItemList, 'flexible_loadout_group', 'any', 'any', sortType, loadoutSlotParams, '' // text filter
        );
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
            OnDragStart(elItemTile, drag, elItemTile.GetAttributeString('itemid', '0'), false);
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
        // Clear the item id after we have filtered for it.
        // This way drop downcalls work correctly and remove the existing fitler
        // m_filterItemId = m_filterItemId !== '' ? '' : '';
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
    function UpdateGridShuffleIcons() {
        let elGrid = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-slots-' + m_selectedTeam);
        if (elGrid) {
            for (let columnId of m_aActiveUsedColumns) {
                let elColumn = elGrid.FindChildInLayoutFile(columnId);
                for (let elPanel of elColumn.Children()) {
                    let elShuffleIcon = elPanel.FindChildInLayoutFile('id-loadout-item-shuffle-icon');
                    if (elShuffleIcon) {
                        let slot = elPanel.GetAttributeString('data-slot', '');
                        elShuffleIcon.visible = LoadoutAPI.IsShuffleEnabled(OverrideTeam(m_selectedTeam, slot), slot);
                    }
                }
            }
        }
        for (let team of ['ct', 't']) {
            let elSection = $.GetContextPanel().FindChildInLayoutFile('id-loadout-grid-section-' + team);
            let elRow = elSection.FindChildInLayoutFile('id-loadout-row-slots-' + team);
            for (let elPanel of elRow.Children()) {
                let elShuffleIcon = elPanel.FindChildInLayoutFile('id-loadout-item-shuffle-icon');
                if (elShuffleIcon) {
                    let slot = elPanel.GetAttributeString('data-slot', '');
                    elShuffleIcon.visible = LoadoutAPI.IsShuffleEnabled(OverrideTeam(team, slot), slot);
                }
            }
        }
    }
    function GetSelectedGroup() {
        let elDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-group');
        return (elDropdown?.visible ? elDropdown.GetSelected()?.id : null) ?? 'all';
    }
    function GetSelectedItemDef() {
        let elDropdown = $.GetContextPanel().FindChildInLayoutFile('id-loadout-filter-itemdef');
        return (elDropdown?.visible ? elDropdown.GetSelected()?.id : null) ?? 'all';
    }
    function GetShuffleItems(team, slot) {
        return JSON.parse(LoadoutAPI.GetShuffleItems(team, slot));
    }
})(LoadoutGrid || (LoadoutGrid = {}));
//--------------------------------------------------------------------------------------------------
// Entry point called when panel is created
//--------------------------------------------------------------------------------------------------
(function () {
    $.RegisterEventHandler('ReadyForDisplay', $.GetContextPanel(), LoadoutGrid.OnReadyForDisplay);
    $.RegisterEventHandler('UnreadyForDisplay', $.GetContextPanel(), LoadoutGrid.OnUnreadyForDisplay);
    $.RegisterForUnhandledEvent('LoadoutFilterByItemType', LoadoutGrid.FilterByItemType);
    $.RegisterEventHandler('CSGOInventoryItemLoaded', $.GetContextPanel(), LoadoutGrid.OnItemTileLoaded);
    $.RegisterForUnhandledEvent('ShowLoadoutForItem', LoadoutGrid.ShowLoadoutForItem);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZG91dF9ncmlkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9hZG91dF9ncmlkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrQ0FBa0M7QUFDbEMsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUMzQyxrREFBa0Q7QUFFbEQsSUFBVSxXQUFXLENBMHJDcEI7QUExckNELFdBQVUsV0FBVztJQUVwQixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztJQUM5QixJQUFJLHlCQUF3QyxDQUFDO0lBQzdDLElBQUksMEJBQXlDLENBQUM7SUFDOUMsSUFBSSx5QkFBd0MsQ0FBQztJQUM3QyxJQUFJLGNBQTBCLENBQUM7SUFDL0IsSUFBSSxlQUF1QixDQUFDO0lBQzVCLElBQUksY0FBdUIsQ0FBQztJQUM1QixJQUFJLFlBQW9CLENBQUM7SUFDekIsSUFBSSxjQUFjLEdBQVcsRUFBRSxDQUFDO0lBQ2hDLElBQUksOEJBQThCLEdBQVcsS0FBSyxDQUFDO0lBRW5ELElBQUksZUFBZSxHQUFHO1FBQ3JCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixJQUFJLHFCQUFxQixHQUFHO1FBQzNCLENBQUMsRUFBRSxFQUFFO1FBQ0wsRUFBRSxFQUFFLEVBQUU7UUFDTixNQUFNLEVBQUUsRUFBRTtLQUNWLENBQUM7SUFFRixvREFBb0Q7SUFDcEQsTUFBTSxnQ0FBZ0MsR0FBRztRQUN4QyxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRTtRQUNsRCxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFO1FBQ2hELEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFB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