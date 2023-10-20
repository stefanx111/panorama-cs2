"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="iteminfo.ts" />
/// <reference path="../generated/items_event_current_generated_store.ts" />
var ItemContextEntires = (function () {
    const _FilterEntries = function (populateFilterText) {
        const bHasFilter = populateFilterText !== "(not found)";
        return _Entries.filter(function (entry) {
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
                return '';
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
                return false;
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
                        UiToolkitAPI.ShowCustomLayoutPopupParameters('popup-inspect-' + id, 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
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
                    UiToolkitAPI.ShowCustomLayoutPopupParameters('popup-inspect-' + id, 'file://{resources}/layout/popups/popup_capability_decodable.xml', 'key-and-case=,' + id +
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
                const defName = InventoryAPI.GetItemDefinitionName(id);
                return (defName === 'casket' || defName === 'Name Tag') ? '' : 'TopSeparator';
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
                return 'TopSeparator';
            },
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
                if (CanAddToFavorites(id, 't'))
                    return '';
                return 'TopSeparator';
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 'ct'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('ct', id);
            },
        },
        {
            name: 'remove_from_favorites_ct',
            style: function (id) {
                return 'TopSeparator';
            },
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
                if (CanAddToFavorites(id, 'ct') || InventoryAPI.ItemIsInFavorites('ct', id))
                    return '';
                return 'TopSeparator';
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 't'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('t', id);
            },
        },
        {
            name: 'remove_from_favorites_t',
            style: function (id) {
                if (CanAddToFavorites(id, 'ct') || InventoryAPI.ItemIsInFavorites('ct', id))
                    return '';
                return 'TopSeparator';
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => InventoryAPI.ItemIsInFavorites('t', id),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveItemFromFavorites('t', id);
            },
        },
        {
            name: 'add_to_favorites_noteam',
            style: function (id) {
                return 'TopSeparator';
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => CanAddToFavorites(id, 'noteam'),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.AddItemToFavorites('noteam', id);
            },
        },
        {
            name: 'remove_from_favorites_noteam',
            style: function (id) {
                return 'TopSeparator';
            },
            populateFilter: ['inspect', 'loadout', 'loadout_slot_t', 'loadout_slot_ct'],
            AvailableForItem: id => InventoryAPI.ItemIsInFavorites('noteam', id),
            OnSelected: id => {
                $.DispatchEvent('ContextMenuEvent', '');
                InventoryAPI.RemoveItemFromFavorites('noteam', id);
            },
        },
        {
            name: 'enable_shuffle_slot',
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                return ['customplayer', 'clothing', 'melee', 'c4', 'musickit'].includes(category);
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 'ct');
                LoadoutAPI.SetShuffleEnabled(team, slot, true);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'enable_shuffle_slot',
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                return ['customplayer', 'clothing', 'melee', 'c4', 'musickit'].includes(category);
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 't');
                LoadoutAPI.SetShuffleEnabled(team, slot, true);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'enable_weapon_shuffle',
            exclusiveFilter: ['loadout_slot_ct'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
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
            name: 'enable_weapon_shuffle',
            exclusiveFilter: ['loadout_slot_t'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
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
            name: 'disable_shuffle_slot',
            exclusiveFilter: ['shuffle_slot_ct'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                return ['customplayer', 'clothing', 'melee', 'c4', 'musickit'].includes(category);
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 'ct');
                LoadoutAPI.SetShuffleEnabled(team, slot, false);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'disable_shuffle_slot',
            exclusiveFilter: ['shuffle_slot_t'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                return ['customplayer', 'clothing', 'melee', 'c4', 'musickit'].includes(category);
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 't');
                LoadoutAPI.SetShuffleEnabled(team, slot, false);
                $.DispatchEvent('ContextMenuEvent', '');
            },
        },
        {
            name: 'disable_weapon_shuffle',
            exclusiveFilter: ['shuffle_slot_ct'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
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
            name: 'disable_weapon_shuffle',
            exclusiveFilter: ['shuffle_slot_t'],
            AvailableForItem: function (id) {
                const category = InventoryAPI.GetLoadoutCategory(id);
                if (category != 'secondary' && category != 'smg' && category != 'rifle')
                    return false;
                $.GetContextPanel().SetDialogVariable("weapon_type", $.Localize(InventoryAPI.GetItemBaseName(id)));
                return true;
            },
            OnSelected: id => {
                const [team, slot] = _GetLoadoutSlot(id, 't');
                LoadoutAPI.SetShuffleEnabled(team, slot, false);
                $.DispatchEvent('ContextMenuEvent', '');
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
        if (team === 'noteam') {
            return ItemInfo.GetLoadoutCategory(id) == 'musickit';
        }
        return false;
    };
    const _CanEquipItem = function (itemID) {
        return !!ItemInfo.GetDefaultSlot(itemID) && !ItemInfo.IsEquippableThroughContextMenu(itemID);
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
        const [_, slot] = _GetLoadoutSlot(id, team);
        if (!ItemInfo.IsWeapon(id) && slot != 'customplayer' && slot != 'clothing_hands' && slot != 'musickit')
            return false;
        if (slot == 'musickit' && team != 'noteam')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbV9jb250ZXh0X2VudHJpZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpdGVtX2NvbnRleHRfZW50cmllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLG9DQUFvQztBQUNwQyw0RUFBNEU7QUFjNUUsSUFBSSxrQkFBa0IsR0FBRyxDQUFFO0lBRTFCLE1BQU0sY0FBYyxHQUFHLFVBQVcsa0JBQTBCO1FBRTNELE1BQU0sVUFBVSxHQUFHLGtCQUFrQixLQUFLLGFBQWEsQ0FBQztRQUV4RCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUUsVUFBVyxLQUFLO1lBR3ZDLElBQUssS0FBSyxDQUFDLGVBQWUsRUFDMUI7Z0JBQ0MsT0FBTyxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO2FBQzVEO2lCQUVJLElBQUssVUFBVSxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQzVDO2dCQUNDLE9BQU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUUsa0JBQWtCLENBQUUsQ0FBQzthQUMzRDtZQUdELE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDcEIsQ0FBQyxDQUFFLENBQUM7SUFDTCxDQUFDLENBQUM7SUFPRixNQUFNLFFBQVEsR0FBeUI7UUE4QnRDO1lBQ0MsSUFBSSxFQUFFLFNBQVM7WUFDZixjQUFjLEVBQUUsQ0FBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxxQkFBcUIsQ0FBRTtZQUN0SCxLQUFLLEVBQUUsVUFBVyxFQUFFO2dCQUVuQixPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFDRCxnQkFBZ0IsRUFBRSxVQUFXLEVBQUU7Z0JBRzlCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxxQkFBcUIsQ0FBRSxFQUFFLENBQUUsQ0FBQztnQkFDekQsSUFBSyxPQUFPLEtBQUssUUFBUTtvQkFDeEIsT0FBTyxZQUFZLENBQUMscUJB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