"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="iteminfo.ts" />
/// <reference path="../generated/items_event_current_generated_store.d.ts" />
var ItemContextEntires = (function () {
    const _FilterEntries = function (populateFilterText) {
        const bHasFilter = populateFilterText !== "(not found)";
        const sGameBetaType = MyPersonaAPI.GetBetaType();
        return _Entries.filter(function (entry) {
            if (entry.betatype && !entry.betatype.includes(sGameBetaType)) {
                return false;
            }
            if (entry.exclusiveFilter) {
                return entry.exclusiveFilter.includes(populateFilterText);
            }
            else if (bHasFilter && entry.populateFilter) {
                return entry.populateFilter.includes(populateFilterText);
            }
            return !bHasFilter;
        });
    };
    const _Entries = [
        {
            name: 'preview',
            populateFilter: ['lootlist', 'loadout', 'loadout_slot_t', 'loadout_slot_ct', 'tradeup_items', 'tradeup_ingredients'],
            style: function (id) {
                return 'TopSeparator';
            },
            AvailableForItem: function (id) {
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket')
                    return InventoryAPI.GetItemAttributeValue(id, 'modification date') ? true : false;
                return ItemInfo.IsPreviewable(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket') {
                    if (InventoryAPI.GetItemAttributeValue(id, 'items count')) {
                        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_casket_operation.xml', 'op=loadcontents' +
                            '&nextcapability=casketcontents' +
                            '&spinner=1' +
                            '&casket_item_id=' + id +
                            '&subject_item_id=' + id);
                    }
                    else {
                        UiToolkitAPI.ShowGenericPopupOk($.Localize('#popup_casket_title_error_casket_empty'), $.Localize('#popup_casket_message_error_casket_empty'), '', function () {
                        });
                    }
                    return;
                }
                $.DispatchEvent("InventoryItemPreview", id);
            }
        },
        {
            name: 'bulkretrieve',
            populateFilter: ['loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                const defName = InventoryAPI.GetItemDefinitionName(id);
                return (defName === 'casket') && !!InventoryAPI.GetItemAttributeValue(id, 'modification date');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket') {
                    if (InventoryAPI.GetItemAttributeValue(id, 'items count')) {
                        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_casket_operation.xml', 'op=loadcontents' +
                            '&nextcapability=casketretrieve' +
                            '&spinner=1' +
                            '&casket_item_id=' + id +
                            '&subject_item_id=' + id);
                    }
                    else {
                        UiToolkitAPI.ShowGenericPopupOk($.Localize('#popup_casket_title_error_casket_empty'), $.Localize('#popup_casket_message_error_casket_empty'), '', function () {
                        });
                    }
                    return;
                }
            }
        },
        {
            name: 'bulkstore',
            populateFilter: ['loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            style: function (id) {
                return 'BottomSeparator';
            },
            AvailableForItem: function (id) {
                const defName = InventoryAPI.GetItemDefinitionName(id);
                return (defName === 'casket') && !!InventoryAPI.GetItemAttributeValue(id, 'modification date');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket') {
                    $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'casketstore', id, '');
                }
            }
        },
        {
            name: 'view_tournament_journal',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            betatype: ['fullversion'],
            style: function (id) {
                return '';
            },
            AvailableForItem: function (id) {
                return (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_journal_') &&
                    g_ActiveTournamentInfo.eventid == InventoryAPI.GetItemAttributeValue(id, "tournament event id"));
            },
            OnSelected: function (id) {
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_tournament_journal.xml', 'journalid=' + id);
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            name: 'openloadout',
            style: function (id) {
                return 'TopSeparator';
            },
            AvailableForItem: function (id) {
                return !!InventoryAPI.GetRawDefinitionKey(id, 'flexible_loadout_group');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowLoadoutForItem", id);
            }
        },
        {
            name: 'swap_finish_both',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            style: function (id) {
                return '';
            },
            AvailableForItem: function (id) {
                return _CanSwapFinish(id, 'ct') && _CanSwapFinish(id, 't');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                EquipItem(id, ['ct', 't']);
            }
        },
        {
            name: 'swap_finish_ct',
            CustomName: function (id) {
                return _GetItemToReplaceName(id, 'ct');
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            style: function (id) {
                return '';
            },
            AvailableForItem: function (id) {
                return _CanSwapFinish(id, 'ct');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                EquipItem(id, ['ct']);
            }
        },
        {
            name: 'swap_finish_t',
            CustomName: function (id) {
                return _GetItemToReplaceName(id, 't');
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            style: function (id) {
                return '';
            },
            AvailableForItem: function (id) {
                return _CanSwapFinish(id, 't');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                EquipItem(id, ['t']);
            }
        },
        {
            name: 'flair',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                return ItemInfo.GetDefaultSlot(id) === 'flair0' && (!ItemInfo.IsEquippedForNoTeam(id) || (InventoryAPI.GetRawDefinitionKey(id, 'item_sub_position2') !== ''));
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                EquipItem(id, ['noteam']);
            }
        },
        {
            name: 'equip_spray',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                return (ItemInfo.ItemMatchDefName(id, 'spraypaint') && !ItemInfo.IsEquippedForNoTeam(id));
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                EquipItem(id, ['noteam'], 'spray0');
            }
        },
        {
            name: 'equip_tournament_spray',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                return (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_journal_') && (InventoryAPI.GetRawDefinitionKey(id, 'item_sub_position2') === 'spray0'));
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_tournament_select_spray.xml', 'journalid=' + id);
            }
        },
        {
            name: 'equip_musickit',
            CustomName: function (id) {
                return _GetItemToReplaceName(id, 'noteam');
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            style: function (id) {
                return '';
            },
            AvailableForItem: function (id) {
                return ItemInfo.GetDefaultSlot(id) === 'musickit' && !ItemInfo.IsEquippedForNoTeam(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                const isMusicvolumeOn = InventoryAPI.TestMusicVolume();
                if (!isMusicvolumeOn) {
                    $.DispatchEvent('ShowResetMusicVolumePopup', '');
                }
                else {
                    $.DispatchEvent('CSGOPlaySoundEffect', 'equip_musickit', 'MOUSE');
                    EquipItem(id, ['noteam']);
                }
            }
        },
        {
            name: 'unequip',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: (id) => {
                return ItemInfo.IsEquippedForNoTeam(id) && ['flair0', 'spray0'].includes(ItemInfo.GetDefaultSlot(id));
            },
            OnSelected: (id) => {
                $.DispatchEvent('ContextMenuEvent', '');
                LoadoutAPI.EquipItemInSlot('noteam', '0', ItemInfo.GetDefaultSlot(id));
            },
        },
        {
            name: 'open_watch_panel_pickem',
            AvailableForItem: function (id) {
                if (GameStateAPI.GetMapBSPName())
                    return false;
                return (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_journal_') && (InventoryAPI.GetRawDefinitionKey(id, 'item_sub_position2') === 'spray0'));
            },
            OnSelected: function (id) {
                $.DispatchEvent('OpenWatchMenu');
                $.DispatchEvent('ShowActiveTournamentPage', '');
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            name: 'getprestige',
            AvailableForItem: function (id) {
                return (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'xpgrant') &&
                    (FriendsListAPI.GetFriendLevel(MyPersonaAPI.GetXuid()) >= InventoryAPI.GetMaxLevel()));
            },
            OnSelected: function (id) {
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + '0' +
                    '&' + 'asyncworkitemwarning=no' +
                    '&' + 'asyncworktype=prestigecheck');
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            name: 'useitem',
            betatype: ['fullversion'],
            AvailableForItem: function (id) {
                if (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_pass_'))
                    return true;
                if (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'xpgrant')) {
                    return (FriendsListAPI.GetFriendLevel(MyPersonaAPI.GetXuid()) < InventoryAPI.GetMaxLevel());
                }
                if (!InventoryAPI.IsTool(id))
                    return false;
                const season = InventoryAPI.GetItemAttributeValue(id, 'season access');
                if (season != undefined)
                    return true;
                return false;
            },
            OnSelected: function (id) {
                if (ItemInfo.ItemDefinitionNameSubstrMatch(id, 'tournament_pass_')) {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
                        '&' + 'asyncworktype=decodeable');
                }
                else {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
                        '&' + 'asyncworktype=useitem');
                }
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            name: 'usespray',
            populateFilter: ['inspect'],
            AvailableForItem: function (id) {
                return ItemInfo.ItemMatchDefName(id, 'spray');
            },
            OnSelected: function (id) {
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
                    '&' + 'asyncworktype=decodeable');
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            betatype: ['fullversion'],
            name: function (id) {
                return InventoryAPI.GetDecodeableRestriction(id) === 'xray' && !ItemInfo.IsTool(id) ? 'look_inside' : _IsKeyForXrayItem(id) !== '' ? 'goto_xray' : 'open_package';
            },
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'decodable');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                if (ItemInfo.GetChosenActionItemsCount(id, 'decodable') === 0) {
                    if (ItemInfo.IsTool(id)) {
                        $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'decodable', id, '');
                    }
                    else {
                        UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
                            '&' + 'asyncworktype=decodeable');
                    }
                    $.DispatchEvent('ContextMenuEvent', '');
                    return;
                }
                if (ItemInfo.GetChosenActionItemsCount(id, 'decodable') > 0 && ItemInfo.IsTool(id) && InventoryAPI.GetDecodeableRestriction(id) === 'xray') {
                    const caseId = _IsKeyForXrayItem(id);
                    if (caseId) {
                        $.DispatchEvent("ShowXrayCasePopup", id, caseId, false);
                        $.DispatchEvent('ContextMenuEvent', '');
                        return;
                    }
                }
                if (!ItemInfo.IsTool(id) && InventoryAPI.GetDecodeableRestriction(id) === 'xray') {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
                        '&' + 'asyncworktype=decodeable');
                    return;
                }
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'decodable', id, '');
            }
        },
        {
            betatype: ['fullversion'],
            name: function (id) {
                const strActionName = 'nameable';
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket') {
                    return InventoryAPI.GetItemAttributeValue(id, 'modification date') ? 'yourcasket' : 'newcasket';
                }
                return strActionName;
            },
            style: function (id) {
                return 'TopSeparator';
            },
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'nameable');
            },
            OnSelected: function (id) {
                const defName = InventoryAPI.GetItemDefinitionName(id);
                if (defName === 'casket') {
                    const fauxNameTag = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1200, 0);
                    const noteText = InventoryAPI.GetItemAttributeValue(id, 'modification date') ? 'yourcasket' : 'newcasket';
                    $.DispatchEvent('ContextMenuEvent', '');
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_nameable.xml', 'nametag-and-itemtoname=' + fauxNameTag + ',' + id +
                        '&' + 'asyncworktype=nameable' +
                        '&' + 'asyncworkitemwarningtext=#popup_' + noteText + '_warning');
                }
                else if (_DoesNotHaveChosenActionItems(id, 'nameable')) {
                    const nameTagId = '', itemToNameId = id;
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_nameable.xml', 'nametag-and-itemtoname=' + nameTagId + ',' + itemToNameId +
                        '&' + 'asyncworktype=nameable');
                }
                else {
                    $.DispatchEvent('ContextMenuEvent', '');
                    $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'nameable', id, '');
                }
            }
        },
        {
            betatype: ['fullversion'],
            name: 'can_sticker',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                return ItemInfo.ItemMatchDefName(id, 'sticker') && ItemInfo.ItemHasCapability(id, 'can_sticker');
            },
            OnSelected: function (id) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_applySticker', 'MOUSE');
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_sticker', id, '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'can_sticker',
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'can_sticker') &&
                    ItemInfo.GetStickerSlotCount(id) > ItemInfo.GetStickerCount(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_applySticker', 'MOUSE');
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_sticker', id, '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'remove_sticker',
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'can_sticker') && ItemInfo.GetStickerCount(id) > 0;
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_can_sticker.xml', 'itemid=' + id +
                    '&' + 'asyncworktype=remove_sticker');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'can_patch',
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: function (id) {
                return ItemInfo.ItemMatchDefName(id, 'patch') && ItemInfo.ItemHasCapability(id, 'can_patch');
            },
            OnSelected: function (id) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_applySticker', 'MOUSE');
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_patch', id, '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'can_patch',
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'can_patch') &&
                    ItemInfo.GetStickerSlotCount(id) > ItemInfo.GetStickerCount(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'sticker_applySticker', 'MOUSE');
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_patch', id, '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'remove_patch',
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'can_patch') && ItemInfo.GetStickerCount(id) > 0;
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_capability_can_patch.xml', 'itemid=' + id +
                    '&' + 'asyncworktype=remove_patch');
            }
        },
        {
            name: 'recipe',
            AvailableForItem: function (id) {
                return ItemInfo.ItemMatchDefName(id, 'recipe');
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'can_stattrack_swap',
            AvailableForItem: function (id) {
                return ItemInfo.ItemHasCapability(id, 'can_stattrack_swap') && InventoryAPI.IsTool(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_stattrack_swap', id, '');
            }
        },
        {
            name: 'journal',
            AvailableForItem: function (id) {
                return false;
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'tradeup_add',
            populateFilter: ['tradeup_items'],
            AvailableForItem: function (id) {
                const slot = ItemInfo.GetDefaultSlot(id);
                return !!slot && slot !== "melee" && slot !== "c4" && slot !== "clothing_hands" && !ItemInfo.IsEquippalbleButNotAWeapon(id) &&
                    (InventoryAPI.CanTradeUp(id) || InventoryAPI.GetNumItemsNeededToTradeUp(id) > 0);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddCraftIngredient(id);
            }
        },
        {
            betatype: ['fullversion'],
            name: 'tradeup_remove',
            exclusiveFilter: ['tradeup_ingredients'],
            AvailableForItem: function (id) {
                const slot = ItemInfo.GetDefaultSlot(id);
                return !!slot && slot !== "melee" && slot !== "c4" && slot !== "clothing_hands" && !ItemInfo.IsEquippalbleButNotAWeapon(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveCraftIngredient(id);
            }
        },
        {
            betatype: ['fullversion'],
            name: 'open_contract',
            AvailableForItem: function (id) {
                return ItemInfo.IsTradeUpContract(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ShowTradeUpPanel');
                $.DispatchEvent('ContextMenuEvent', '');
            }
        },
        {
            betatype: ['fullversion'],
            name: 'usegift',
            AvailableForItem: function (id) {
                return ItemInfo.GetToolType(id) === 'gift';
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                const CapDisabledMessage = InventoryAPI.GetItemCapabilityDisabledMessageByIndex(id, 0);
                if (CapDisabledMessage === "") {
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
                        '&' + 'asyncworkitemwarning=no' +
                        '&' + 'asyncworktype=usegift');
                }
                else {
                    const capDisabledMessage = InventoryAPI.GetItemCapabilityDisabledMessageByIndex(id, 0);
                    UiToolkitAPI.ShowGenericPopupOk($.Localize('#inv_context_usegift'), $.Localize(capDisabledMessage), '', function () {
                    });
                }
            }
        },
        {
            name: 'add_to_favorites_both',
            style: function (id) {
                if (CanAddToFavorites(id, 't') && CanAddToFavorites(id, 'ct'))
                    return 'TopSeparator';
                return '';
            },
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 't') && CanAddToFavorites(id, 'ct'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('ct', id);
                InventoryAPI.AddItemToFavorites('t', id);
            },
        },
        {
            name: 'add_to_favorites_ct',
            style: function (id) {
                if (!CanAddToFavorites(id, 't') && CanAddToFavorites(id, 'ct'))
                    return 'TopSeparator';
                return '';
            },
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 'ct'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('ct', id);
            },
        },
        {
            name: 'remove_from_favorites_ct',
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => InventoryAPI.ItemIsInFavorites('ct', id),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveItemFromFavorites('ct', id);
            },
        },
        {
            name: 'add_to_favorites_t',
            style: function (id) {
                if (CanAddToFavorites(id, 't') && !CanAddToFavorites(id, 'ct'))
                    return 'TopSeparator';
                return '';
            },
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 't'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('t', id);
            },
        },
        {
            name: 'remove_from_favorites_t',
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => InventoryAPI.ItemIsInFavorites('t', id),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveItemFromFavorites('t', id);
            },
        },
        {
            name: 'add_to_favorites_musickit',
            style: function (id) {
                return 'TopSeparator';
            },
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => {
                let slot = InventoryAPI.GetDefaultSlot(id);
                return (slot == 'musickit') && !InventoryAPI.ItemIsInFavorites('noteam', id);
            },
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('noteam', id);
            },
        },
        {
            name: 'add_to_favorites_flair',
            style: function (id) {
                return 'TopSeparator';
            },
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => {
                let slot = InventoryAPI.GetDefaultSlot(id);
                return (slot == 'flair0') && !InventoryAPI.ItemIsInFavorites('noteam', id);
            },
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('noteam', id);
            },
        },
        {
            name: 'remove_from_favorites_noteam',
            betatype: ['fullversion'],
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => InventoryAPI.ItemIsInFavorites('noteam', id),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveItemFromFavorites('noteam', id);
            },
        },
        {
            name: 'intocasket',
            style: function (id) {
                return 'TopSeparator';
            },
            AvailableForItem: function (id) {
                return InventoryAPI.IsPotentiallyMarketable(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                if (ItemInfo.GetChosenActionItemsCount(id, 'can_collect') > 0) {
                    $.DispatchEvent("ShowSelectItemForCapabilityPopup", 'can_collect', id, '');
                }
                else {
                    const fauxCasket = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1201, 0);
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + fauxCasket
                        + '&' +
                        'inspectonly=false'
                        + '&' +
                        'asyncworkitemwarning=no'
                        + '&' +
                        'storeitemid=' + fauxCasket);
                }
            }
        },
        {
            name: 'sell',
            AvailableForItem: function (id) {
                return InventoryAPI.IsMarketable(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('CSGOPlaySoundEffect', 'inventory_inspect_sellOnMarket', 'MOUSE');
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.SellItem(id);
            }
        },
        {
            name: 'delete',
            style: function (id) {
                return !InventoryAPI.IsMarketable(id) ? 'TopSeparator' : '';
            },
            AvailableForItem: function (id) {
                return InventoryAPI.IsDeletable(id);
            },
            OnSelected: function (id) {
                $.DispatchEvent('ContextMenuEvent', '');
                UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_inventory_inspect.xml', 'itemid=' + id +
                    '&' + 'asyncworktype=delete' +
                    '&' + 'asyncworkbtnstyle=Negative');
            }
        },
        {
            name: 'loadout_slot_reset_t',
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: id => {
                let team = 't';
                let slot = InventoryAPI.GetDefaultSlot(id);
                if (slot == 'musickit')
                    team = 'noteam';
                else if (slot != 'customplayer' && slot != 'clothing_hands' && slot != 'melee')
                    return false;
                return id != LoadoutAPI.GetDefaultItem(team, slot);
            },
            OnSelected: id => {
                let team = 't';
                let slot = InventoryAPI.GetDefaultSlot(id);
                if (slot == 'musickit')
                    team = 'noteam';
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                LoadoutAPI.EquipItemInSlot(team, defaultId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'loadout_slot_reset_ct',
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: id => {
                let team = 'ct';
                let slot = InventoryAPI.GetDefaultSlot(id);
                if (slot == 'musickit')
                    team = 'noteam';
                else if (slot != 'customplayer' && slot != 'clothing_hands' && slot != 'melee')
                    return false;
                return id != LoadoutAPI.GetDefaultItem(team, slot);
            },
            OnSelected: id => {
                let team = 'ct';
                let slot = InventoryAPI.GetDefaultSlot(id);
                if (slot == 'musickit')
                    team = 'noteam';
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                LoadoutAPI.EquipItemInSlot(team, defaultId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'loadout_slot_reset_weapon_t',
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: id => {
                let team = 't';
                let category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                let defaultDefIndex = InventoryAPI.GetItemDefinitionIndex(defaultId);
                return defIndex != defaultDefIndex;
            },
            OnSelected: id => {
                let team = 't';
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                let defaultDefIndex = InventoryAPI.GetItemDefinitionIndex(defaultId);
                let preferredId = LoadoutAPI.GetPreferredItemIdForItemDefIndex(team, defaultDefIndex);
                LoadoutAPI.EquipItemInSlot(team, preferredId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'loadout_slot_reset_weapon_ct',
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: id => {
                let team = 'ct';
                let category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                let defaultDefIndex = InventoryAPI.GetItemDefinitionIndex(defaultId);
                return defIndex != defaultDefIndex;
            },
            OnSelected: id => {
                let team = 'ct';
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let defaultId = LoadoutAPI.GetDefaultItem(team, slot);
                let defaultDefIndex = InventoryAPI.GetItemDefinitionIndex(defaultId);
                let preferredId = LoadoutAPI.GetPreferredItemIdForItemDefIndex(team, defaultDefIndex);
                LoadoutAPI.EquipItemInSlot(team, preferredId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'loadout_slot_reset_finish_t',
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: id => {
                let category = InventoryAPI.GetLoadoutCategory(id);
                if (category == 'secondary' || category == 'smg' || category == 'rifle')
                    return !InventoryAPI.IsFauxItemID(id);
                else
                    return false;
            },
            OnSelected: id => {
                let team = 't';
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let fauxId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(defIndex, 0);
                LoadoutAPI.EquipItemInSlot(team, fauxId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'loadout_slot_reset_finish_ct',
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: id => {
                let category = InventoryAPI.GetLoadoutCategory(id);
                if (category == 'secondary' || category == 'smg' || category == 'rifle')
                    return !InventoryAPI.IsFauxItemID(id);
                else
                    return false;
            },
            OnSelected: id => {
                let team = 'ct';
                let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
                let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, defIndex);
                let fauxId = InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(defIndex, 0);
                LoadoutAPI.EquipItemInSlot(team, fauxId, slot);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            betatype: ['fullversion'],
            name: 'enable_shuffle_slot',
            style: function (id) {
                return 'TopSeparator';
            },
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: function (id) {
                $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
                return true;
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 'ct');
                LoadoutAPI.SetShuffleEnabled(team, slot, true);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            betatype: ['fullversion'],
            name: 'enable_shuffle_slot',
            style: function (id) {
                return 'TopSeparator';
            },
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: function (id) {
                $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
                return true;
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 't');
                LoadoutAPI.SetShuffleEnabled(team, slot, true);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            betatype: ['fullversion'],
            name: 'disable_shuffle_slot',
            style: function (id) {
                return 'TopSeparator';
            },
            exclusiveFilter: ['shuffle_slot_ct'],
            AvailableForItem: function (id) {
                $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
                return true;
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 'ct');
                LoadoutAPI.SetShuffleEnabled(team, slot, false);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            betatype: ['fullversion'],
            name: 'disable_shuffle_slot',
            style: function (id) {
                return 'TopSeparator';
            },
            exclusiveFilter: ['shuffle_slot_t'],
            AvailableForItem: function (id) {
                $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
                return true;
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 't');
                LoadoutAPI.SetShuffleEnabled(team, slot, false);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
    ];
    const _GetItemToReplaceName = function (id, team, slot) {
        if (slot === null || slot === undefined || slot === '') {
            if (ItemInfo.IsWeapon(id) && !['melee', 'secondary0'].includes(ItemInfo.GetDefaultSlot(id))) {
                slot = ItemInfo.GetEquippedSlot(id, team);
            }
            else {
                slot = ItemInfo.GetDefaultSlot(id);
            }
        }
        const currentEquippedItem = ItemInfo.GetItemIdForItemEquippedInSlot(team, slot);
        if (currentEquippedItem && currentEquippedItem !== '0') {
            $.GetContextPanel().SetDialogVariable("item_name", _GetNameWithRarity(currentEquippedItem));
            if (team != 'noteam') {
                return $.Localize('#inv_context_equip_team', $.GetContextPanel());
            }
            else
                return $.Localize('#inv_context_equip', $.GetContextPanel());
        }
        return 'WRONG CONTEXT -_GetItemToReplaceName()' + id;
    };
    const _GetNameWithRarity = function (id) {
        const rarityColor = ItemInfo.GetRarityColor(id);
        return '<font color="' + rarityColor + '">' + ItemInfo.GetName(id) + '</font>';
    };
    const _GetShuffleString = function (id, isEnable) {
        let locString = isEnable ? '#inv_context_enable_shuffle_slot' : '#inv_context_disable_shuffle_slot';
        $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
        return $.Localize(locString, $.GetContextPanel());
    };
    const EquipItem = function (id, team, slot) {
        if (slot === null || slot === undefined || slot === '') {
            slot = ItemInfo.GetDefaultSlot(id);
            if (ItemInfo.IsWeapon(id) && !["melee", "secondary0"].includes(ItemInfo.GetDefaultSlot(id)))
                slot = ItemInfo.GetEquippedSlot(id, team[0]);
            else
                slot = ItemInfo.GetDefaultSlot(id);
        }
        const teamShownOnMainMenu = GameInterfaceAPI.GetSettingString('ui_vanitysetting_team');
        team.forEach(element => LoadoutAPI.EquipItemInSlot(element, id, slot));
        let bNeedToRestartMainMenuVanity = false;
        if (ItemInfo.IsCharacter(id)) {
            const teamOfCharacter = (ItemInfo.GetTeam(id).search('Team_T') === -1) ? 'ct' : 't';
            if (teamOfCharacter !== teamShownOnMainMenu) {
                GameInterfaceAPI.SetSettingString('ui_vanitysetting_team', teamOfCharacter);
            }
            bNeedToRestartMainMenuVanity = true;
        }
        else {
            team.filter(function (e) { return e === teamShownOnMainMenu; });
            if (team.length > 0) {
                if ((slot === 'clothing_hands') ||
                    (slot === GameInterfaceAPI.GetSettingString('ui_vanitysetting_loadoutslot_' + teamShownOnMainMenu))) {
                    bNeedToRestartMainMenuVanity = true;
                }
            }
        }
        if (bNeedToRestartMainMenuVanity) {
            $.DispatchEvent('ForceRestartVanity');
        }
    };
    const _DoesNotHaveChosenActionItems = function (id, capability) {
        return (ItemInfo.GetChosenActionItemsCount(id, capability) === 0 && !ItemInfo.IsTool(id));
    };
    const _DoesItemTeamMatchTeamRequired = function (team, id) {
        if (team === 't') {
            return ItemInfo.IsItemT(id) || ItemInfo.IsItemAnyTeam(id);
        }
        if (team === 'ct') {
            return ItemInfo.IsItemCt(id) || ItemInfo.IsItemAnyTeam(id);
        }
        return false;
    };
    const _CanEquipItem = function (itemID) {
        return !!ItemInfo.GetDefaultSlot(itemID) && !ItemInfo.IsEquippableThroughContextMenu(itemID) && LoadoutAPI.IsLoadoutAllowed();
    };
    const _IsKeyForXrayItem = function (id) {
        const oData = ItemInfo.GetItemsInXray();
        if (oData.case && oData.reward) {
            const numActionItems = ItemInfo.GetChosenActionItemsCount(oData.case, 'decodable');
            if (numActionItems > 0) {
                for (let i = 0; i < numActionItems; i++) {
                    if (id === ItemInfo.GetChosenActionItemIDByIndex(oData.case, 'decodable', i)) {
                        return oData.case;
                    }
                }
            }
        }
        return '';
    };
    function _CanSwapFinish(id, team) {
        if (!_DoesItemTeamMatchTeamRequired(team, id))
            return false;
        let slot;
        let group = InventoryAPI.GetRawDefinitionKey(id, 'flexible_loadout_group');
        switch (group) {
            case 'customplayer':
            case 'clothing_hands':
            case 'melee':
            case 'c4':
                {
                    slot = group;
                    break;
                }
            case 'secondary0':
            case 'secondary':
            case 'smg':
            case 'rifle':
                {
                    let itemDefIndex = InventoryAPI.GetItemDefinitionIndex(id);
                    slot = LoadoutAPI.GetSlotEquippedWithDefIndex(team, itemDefIndex);
                    if (!slot)
                        return false;
                    break;
                }
            default:
                {
                    return false;
                }
        }
        if (LoadoutAPI.GetItemID(team, slot) == id)
            return false;
        if (LoadoutAPI.IsShuffleEnabled(team, slot))
            return false;
        return _CanEquipItem(id);
    }
    function _GetLoadoutSlot(id, team) {
        let group = InventoryAPI.GetRawDefinitionKey(id, 'flexible_loadout_group');
        if (['secondary0', 'secondary', 'smg', 'rifle'].includes(group)) {
            let itemDefIndex = InventoryAPI.GetItemDefinitionIndex(id);
            return [team, LoadoutAPI.GetSlotEquippedWithDefIndex(team, itemDefIndex)];
        }
        else if (['musickit', 'flair0', 'spray0'].includes(group)) {
            return ['noteam', group];
        }
        else {
            return [team, group];
        }
    }
    function CanAddToFavorites(id, team) {
        const [teamVal, slot] = _GetLoadoutSlot(id, 'ct');
        if (!ItemInfo.IsWeapon(id))
            return false;
        if (InventoryAPI.ItemIsInFavorites(team, id))
            return false;
        if (!_DoesItemTeamMatchTeamRequired(team, id))
            return false;
        return !!ItemInfo.GetDefaultSlot(id);
    }
    return {
        FilterEntries: _FilterEntries,
        EquipItem: EquipItem
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbV9jb250ZXh0X2VudHJpZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpdGVtX2NvbnRleHRfZW50cmllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLG9DQUFvQztBQUNwQyw4RUFBOEU7QUFjOUUsSUFBSSxrQkFBa0IsR0FBRyxDQUFFO0lBRTFCLE1BQU0sY0FBYyxHQUFHLFVBQVcsa0JBQTBCO1FBRTNELE1BQU0sVUFBVSxHQUFHLGtCQUFrQixLQUFLLGFBQWEsQ0FBQztRQUN4RCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFakQsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFFLFVBQVcsS0FBSztZQUd2QyxJQUFLLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBRSxhQUFhLENBQUUsRUFDaEU7Z0JBQ0MsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUdELElBQUssS0FBSyxDQUFDLGVBQWUsRUFDMUI7Z0JBQ0MsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO2FBQzVEO2lCQUVJLElBQUssVUFBVSxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQzVDO2dCQUNDLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUUsa0JBQWtCLENBQUUsQ0FBQzthQUMzRDtZQUdELE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDcEIsQ0FBQyxDQUFFLENBQUM7SUFDTCxDQUFDLENBQUM7SUFPRixNQUFNLFFBQVEsR0FBeUI7UUE4QnRDO1lBQ0MsSUFBSSxFQUFFLFNBQVM7WUFDZixjQUFjLEVBQUUsQ0FBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxxQkFBcUIsQ0FBRTtZQUN0SCxLQUFLLEVBQUUsVUFBVyxFQUFFO2dCQUVuQixPQUFPLGNBQWMs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