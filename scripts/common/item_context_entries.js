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
                const slotsub = ItemInfo.GetDefaultSlot(id);
                return ((slotsub) && (slotsub.startsWith("equipment") || slotsub.startsWith("grenade"))) ? '' : 'BottomSeparator';
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
                if ((_DoesItemTeamMatchTeamRequired('ct', id) &&
                    (ItemInfo.GetDefaultSlot(id) === "melee" || !ItemInfo.IsWeapon(id) || _IsWeaponAlreadyEquipped('ct', id)) &&
                    (_ItemIsNotEquippedAndNotInShuffle('ct', id) ||
                        _IsInShuffleButNotEquippedWeaponTypeForSlot('ct', id)))
                    &&
                        (_DoesItemTeamMatchTeamRequired('t', id) &&
                            (ItemInfo.GetDefaultSlot(id) === "melee" || !ItemInfo.IsWeapon(id) || _IsWeaponAlreadyEquipped('t', id)) &&
                            (_ItemIsNotEquippedAndNotInShuffle('t', id) ||
                                _IsInShuffleButNotEquippedWeaponTypeForSlot('t', id)))) {
                    return _CanEquipItem(id);
                }
                return false;
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
                if (_DoesItemTeamMatchTeamRequired('ct', id) &&
                    (["melee", "secondary0"].includes(ItemInfo.GetDefaultSlot(id)) || !ItemInfo.IsWeapon(id) || _IsWeaponAlreadyEquipped('ct', id)) &&
                    (_ItemIsNotEquippedAndNotInShuffle('ct', id) ||
                        _IsInShuffleButNotEquippedWeaponTypeForSlot('ct', id))) {
                    return _CanEquipItem(id);
                }
                return false;
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
                if (_DoesItemTeamMatchTeamRequired('t', id) &&
                    (["melee", "secondary0"].includes(ItemInfo.GetDefaultSlot(id)) || !ItemInfo.IsWeapon(id) || _IsWeaponAlreadyEquipped('t', id)) &&
                    (_ItemIsNotEquippedAndNotInShuffle('t', id) ||
                        _IsInShuffleButNotEquippedWeaponTypeForSlot('t', id))) {
                    return _CanEquipItem(id);
                }
                return false;
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
                return ItemInfo.GetDefaultSlot(id) === 'musickit' && !ItemInfo.IsEquippedForNoTeam(id) && !ItemInfo.IsShuffleEnabled(id, 'noteam');
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
        return false;
    };
    const _IsWeaponAlreadyEquipped = function (team, id) {
        const defIndex = InventoryAPI.GetItemDefinitionIndex(id);
        return LoadoutAPI.IsItemDefEquipped(team, defIndex);
    };
    const _ItemIsNotEquippedAndNotInShuffle = function (team, id) {
        return !InventoryAPI.IsEquipped(id, team) && !ItemInfo.IsShuffleEnabled(id, team);
    };
    const _IsInShuffleButNotEquippedWeaponTypeForSlot = function (team, id) {
        const slot = ItemInfo.GetEquippedSlot(id, team);
        const currentlyEquippedId = LoadoutAPI.GetItemID(team, slot);
        const isSharedSlot = InventoryAPI.GetRawDefinitionKey(id, "item_shares_equip_slot");
        const IsNotEquippedInSLot = InventoryAPI.GetItemDefinitionName(currentlyEquippedId) === InventoryAPI.GetItemDefinitionName(id);
        return ItemInfo.IsShuffleEnabled(id, team) && !IsNotEquippedInSLot && isSharedSlot === '1';
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
    return {
        FilterEntries: _FilterEntries,
        EquipItem: EquipItem
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbV9jb250ZXh0X2VudHJpZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpdGVtX2NvbnRleHRfZW50cmllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMsb0NBQW9DO0FBQ3BDLDhFQUE4RTtBQWM5RSxJQUFJLGtCQUFrQixHQUFHLENBQUU7SUFFMUIsTUFBTSxjQUFjLEdBQUcsVUFBVyxrQkFBMEI7UUFFM0QsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLEtBQUssYUFBYSxDQUFDO1FBQ3hELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUVqRCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUUsVUFBVyxLQUFLO1lBR3ZDLElBQUssS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFFLGFBQWEsQ0FBRSxFQUNoRTtnQkFDQyxPQUFPLEtBQUssQ0FBQzthQUNiO1lBR0QsSUFBSyxLQUFLLENBQUMsZUFBZSxFQUMxQjtnQkFDQyxPQUFPLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFFLGtCQUFrQixDQUFFLENBQUM7YUFDNUQ7aUJBRUksSUFBSyxVQUFVLElBQUksS0FBSyxDQUFDLGNBQWMsRUFDNUM7Z0JBQ0MsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBRSxrQkFBa0IsQ0FBRSxDQUFDO2FBQzNEO1lBR0QsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUNwQixDQUFDLENBQUUsQ0FBQztJQUNMLENBQUMsQ0FBQztJQU9GLE1BQU0sUUFBUSxHQUF5QjtRQWtDdEM7WUFDQyxJQUFJLEVBQUUsU0FBUztZQUNmLGNBQWMsRUFBRSxDQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixDQUFFO1lBQ3RILEtBQUssRUFBRSxVQUFXLEVBQUU7Z0JBRW5CLE1BQU0sT0FBTyxH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