"use strict";
/// <reference path="../csgo.d.ts" />
/// <reference path="formattext.ts" />
/// <reference path="characteranims.ts" />
var ItemInfo = (function () {
    const _GetRarityColor = function (id) {
        return InventoryAPI.GetItemRarityColor(id);
    };
    const _GetFormattedName = function (id) {
        const strName = _GetName(id);
        if (InventoryAPI.HasCustomName(id)) {
            return new CFormattedText('#CSGO_ItemName_Custom', { item_name: strName });
        }
        else {
            const splitLoc = strName.indexOf('|');
            if (splitLoc >= 0) {
                const strWeaponName = strName.substring(0, splitLoc).trim();
                const strPaintName = strName.substring(splitLoc + 1).trim();
                return new CFormattedText('#CSGO_ItemName_Painted', { item_name: strWeaponName, paintkit_name: strPaintName });
            }
            return new CFormattedText('#CSGO_ItemName_Base', { item_name: strName });
        }
    };
    const _GetName = function (id) {
        return InventoryAPI.GetItemName(id);
    };
    const _GetNameWithRarity = function (id) {
        if (!ItemInfo.IsStockItem(id)) {
            const rarityColor = _GetRarityColor(id);
            return '<font color="' + rarityColor + '">' + _GetName(id) + '</font>';
        }
        else {
            return _GetName(id);
        }
    };
    const _IsEquippedForCT = function (id) {
        return InventoryAPI.IsEquipped(id, 'ct');
    };
    const _IsEquippedForT = function (id) {
        return InventoryAPI.IsEquipped(id, 't');
    };
    const _IsEquippedForNoTeam = function (id) {
        return InventoryAPI.IsEquipped(id, "noteam");
    };
    const _IsStockItem = function (id) {
        return LoadoutAPI.IsStockItem(id);
    };
    const _IsEquipped = function (id, team) {
        return InventoryAPI.IsEquipped(id, team);
    };
    const _CanEquipItemInSlot = function (szTeam, szItemID, szSlot) {
        return LoadoutAPI.IsLoadoutAllowed() && LoadoutAPI.CanEquipItemInSlot(szTeam, szItemID, szSlot);
    };
    const _GetLoadoutCategory = function (id) {
        return InventoryAPI.GetLoadoutCategory(id);
    };
    const _GetDefaultSlot = function (id) {
        return InventoryAPI.GetDefaultSlot(id);
    };
    const _GetEquippedSlot = function (id, szTeam) {
        let defIndex = InventoryAPI.GetItemDefinitionIndex(id);
        return LoadoutAPI.GetSlotEquippedWithDefIndex(szTeam, defIndex);
    };
    const _GetEquippedItemIdForDefIndex = function (defIndex, szTeam) {
        let slot = LoadoutAPI.GetSlotEquippedWithDefIndex(szTeam, defIndex);
        return _GetItemIdForItemEquippedInSlot(szTeam, slot);
    };
    const _GetTeam = function (id) {
        return InventoryAPI.GetItemTeam(id);
    };
    const _IsSpraySealed = function (id) {
        return InventoryAPI.DoesItemMatchDefinitionByName(id, 'spray');
    };
    const _IsSprayPaint = function (id) {
        return InventoryAPI.DoesItemMatchDefinitionByName(id, 'spraypaint');
    };
    const _IsTradeUpContract = function (id) {
        return InventoryAPI.DoesItemMatchDefinitionByName(id, 'Recipe Trade Up');
    };
    const _GetSprayTintColor = function (id) {
        return InventoryAPI.GetSprayTintColorCode(id);
    };
    const _IsTool = function (id) {
        return InventoryAPI.IsTool(id);
    };
    const _GetCapabilitybyIndex = function (id, index) {
        return InventoryAPI.GetItemCapabilityByIndex(id, index);
    };
    const _GetCapabilityCount = function (id) {
        return InventoryAPI.GetItemCapabilitiesCount(id);
    };
    const _ItemHasCapability = function (id, capName) {
        const caps = [];
        const capCount = _GetCapabilityCount(id);
        for (let i = 0; i < capCount; i++) {
            caps.push(_GetCapabilitybyIndex(id, i));
        }
        return caps.includes(capName);
    };
    const _GetChosenActionItemsCount = function (id, capability) {
        return InventoryAPI.GetChosenActionItemsCount(id, capability);
    };
    const _GetChosenActionItemIDByIndex = function (id, capability, index) {
        return InventoryAPI.GetChosenActionItemIDByIndex(id, capability, index);
    };
    const _GetKeyForCaseInXray = function (caseId) {
        const numActionItems = _GetChosenActionItemsCount(caseId, 'decodable');
        if (numActionItems > 0) {
            const aKeyIds = [];
            for (let i = 0; i < numActionItems; i++) {
                aKeyIds.push(_GetChosenActionItemIDByIndex(caseId, 'decodable', i));
            }
            aKeyIds.sort();
            return aKeyIds[0];
        }
        return '';
    };
    const _GetItemsInXray = function () {
        InventoryAPI.SetInventorySortAndFilters('inv_sort_age', false, 'xraymachine', '', '');
        const count = InventoryAPI.GetInventoryCount();
        if (count === 0) {
            return {};
        }
        let xrayCaseId = '';
        let xrayRewardId = '';
        for (let i = 0; i < count; i++) {
            const id = InventoryAPI.GetInventoryItemIDByIndex(i);
            xrayRewardId = i === 0 ? id : xrayRewardId;
            xrayCaseId = i === 1 ? id : xrayCaseId;
        }
        return { case: xrayCaseId, reward: xrayRewardId };
    };
    const _GetLoadoutWeapons = function (team) {
        let teamName = CharacterAnims.NormalizeTeamName(team, true);
        const list = [];
        const slotStrings = LoadoutAPI.GetLoadoutSlotNames(false);
        const slots = JSON.parse(slotStrings);
        slots.forEach(slot => {
            const weaponItemId = LoadoutAPI.GetItemID(teamName, slot);
            const bIsWeapon = ItemInfo.IsWeapon(weaponItemId);
            if (bIsWeapon) {
                list.push([slot, weaponItemId]);
            }
        });
        return list;
    };
    const _DeepCopyVanityCharacterSettings = function (inVanityCharacterSettings) {
        const modelRenderSettingsOneOffTempCopy = JSON.parse(JSON.stringify(inVanityCharacterSettings));
        modelRenderSettingsOneOffTempCopy.panel = inVanityCharacterSettings.panel;
        return modelRenderSettingsOneOffTempCopy;
    };
    const _PrecacheVanityCharacterSettings = function (inVanityCharacterSettings) {
        if (inVanityCharacterSettings.weaponItemId)
            InventoryAPI.PrecacheCustomMaterials(inVanityCharacterSettings.weaponItemId);
        if (inVanityCharacterSettings.glovesItemId)
            InventoryAPI.PrecacheCustomMaterials(inVanityCharacterSettings.glovesItemId);
    };
    const _GetOrUpdateVanityCharacterSettings = function (optionalCharacterItemId, optionalState) {
        const oSettings = {
            panel: undefined,
            team: undefined,
            charItemId: undefined,
            loadoutSlot: undefined,
            weaponItemId: undefined,
            glovesItemId: undefined,
            cameraPreset: undefined
        };
        if (optionalCharacterItemId && InventoryAPI.IsValidItemID(optionalCharacterItemId)) {
            const charTeam = ItemInfo.GetTeam(optionalCharacterItemId);
            if (charTeam.search('Team_CT') !== -1)
                oSettings.team = 'ct';
            else if (charTeam.search('Team_T') !== -1)
                oSettings.team = 't';
            if (oSettings.team)
                oSettings.charItemId = optionalCharacterItemId;
        }
        if (!oSettings.team) {
            oSettings.team = GameInterfaceAPI.GetSettingString('ui_vanitysetting_team');
            if (oSettings.team !== 'ct' && oSettings.team !== 't') {
                oSettings.team = (Math.round(Math.random()) > 0) ? 'ct' : 't';
                GameInterfaceAPI.SetSettingString('ui_vanitysetting_team', oSettings.team);
            }
        }
        const _fnRollRandomLoadoutSlotAndWeapon = function (strTeam) {
            const myResult = {
                loadoutSlot: '',
                weaponItemId: ''
            };
            const slots = JSON.parse(LoadoutAPI.GetLoadoutSlotNames(false));
            while (slots.length > 0) {
                slots.splice(slots.indexOf('heavy3'), 1);
                slots.splice(slots.indexOf('heavy4'), 1);
                const nRandomSlotIndex = Math.floor(Math.random() * slots.length);
                myResult.loadoutSlot = slots.splice(nRandomSlotIndex, 1)[0];
                myResult.weaponItemId = LoadoutAPI.GetItemID(strTeam, myResult.loadoutSlot);
                if (ItemInfo.IsWeapon(myResult.weaponItemId))
                    break;
            }
            return myResult;
        };
        oSettings.loadoutSlot = GameInterfaceAPI.GetSettingString('ui_vanitysetting_loadoutslot_' + oSettings.team);
        oSettings.weaponItemId = LoadoutAPI.GetItemID(oSettings.team, oSettings.loadoutSlot);
        if (!ItemInfo.IsWeapon(oSettings.weaponItemId)) {
            const randomResult = _fnRollRandomLoadoutSlotAndWeapon(oSettings.team);
            oSettings.loadoutSlot = randomResult.loadoutSlot;
            oSettings.weaponItemId = randomResult.weaponItemId;
            GameInterfaceAPI.SetSettingString('ui_vanitysetting_loadoutslot_' + oSettings.team, oSettings.loadoutSlot);
        }
        oSettings.glovesItemId = LoadoutAPI.GetItemID(oSettings.team, 'clothing_hands');
        if (!oSettings.charItemId)
            oSettings.charItemId = LoadoutAPI.GetItemID(oSettings.team, 'customplayer');
        if (optionalState && optionalState === 'unowned') {
            const randomResult = _fnRollRandomLoadoutSlotAndWeapon(oSettings.team);
            oSettings.loadoutSlot = randomResult.loadoutSlot;
            oSettings.weaponItemId = LoadoutAPI.GetDefaultItem(oSettings.team, oSettings.loadoutSlot);
            oSettings.glovesItemId = LoadoutAPI.GetDefaultItem(oSettings.team, 'clothing_hands');
        }
        return oSettings;
    };
    const _GetStickerSlotCount = function (id) {
        return InventoryAPI.GetItemStickerSlotCount(id);
    };
    const _GetStickerCount = function (id) {
        return InventoryAPI.GetItemStickerCount(id);
    };
    const _GetitemStickerList = function (id) {
        const count = _GetStickerCount(id);
        const stickerList = [];
        for (let i = 0; i < count; i++) {
            const image = _GetStickerImageByIndex(id, i);
            const oStickerInfo = {
                image: _GetStickerImageByIndex(id, i),
                name: _GetStickerNameByIndex(id, i)
            };
            stickerList.push(oStickerInfo);
        }
        return stickerList;
    };
    const _GetStickerImageByIndex = function (id, index) {
        return InventoryAPI.GetItemStickerImageByIndex(id, index);
    };
    const _GetStickerNameByIndex = function (id, index) {
        return InventoryAPI.GetItemStickerNameByIndex(id, index);
    };
    const _GetItemPickUpMethod = function (id) {
        return InventoryAPI.GetItemPickupMethod(id);
    };
    const _GetLoadoutPrice = function (id, subposition) {
        const team = _IsEquippedForCT(id) ? 'ct' : 't';
        return LoadoutAPI.GetItemGamePrice(team, _GetDefaultSlot(id).toString());
    };
    const _GetStoreOriginalPrice = function (id, count, rules) {
        return StoreAPI.GetStoreItemOriginalPrice(id, count, rules ? rules : '');
    };
    const _GetStoreSalePrice = function (id, count, rules) {
        return StoreAPI.GetStoreItemSalePrice(id, count, rules ? rules : '');
    };
    const _GetStoreSalePercentReduction = function (id) {
        return StoreAPI.GetStoreItemPercentReduction(id);
    };
    const _ItemPurchase = function (id) {
        StoreAPI.StoreItemPurchase(id);
    };
    const _IsStatTrak = function (id) {
        const numIsStatTrak = InventoryAPI.GetRawDefinitionKey(id, "will_produce_stattrak");
        return (Number(numIsStatTrak) === 1) ? true : false;
    };
    const _IsEquippalbleButNotAWeapon = function (id) {
        const subSlot = _GetDefaultSlot(id);
        return (subSlot === "flair0" || subSlot === "musickit" || subSlot === "spray0" || subSlot === "customplayer" || subSlot === "pet");
    };
    const _IsEquippableThroughContextMenu = function (id) {
        const subSlot = _GetDefaultSlot(id);
        return (subSlot === "flair0" || subSlot === "musickit" || subSlot === "spray0");
    };
    const _IsWeapon = function (id) {
        const schemaString = InventoryAPI.BuildItemSchemaDefJSON(id);
        if (!schemaString)
            return false;
        const itemSchemaDef = JSON.parse(schemaString);
        return (itemSchemaDef["craft_class"] === "weapon");
    };
    const _IsCase = function (id) {
        return ItemInfo.ItemHasCapability(id, 'decodable') &&
            InventoryAPI.GetAssociatedItemsCount(id) > 0 ?
            true :
            false;
    };
    const _IsCharacter = function (id) {
        return (_GetDefaultSlot(id) === "customplayer");
    };
    const _IsPet = function (id) {
        return (_GetDefaultSlot(id) === "pet");
    };
    const _IsItemCt = function (id) {
        return _GetTeam(id) === '#CSGO_Inventory_Team_CT';
    };
    const _IsItemT = function (id) {
        return _GetTeam(id) === '#CSGO_Inventory_Team_T';
    };
    const _IsItemAnyTeam = function (id) {
        return _GetTeam(id) === '#CSGO_Inventory_Team_Any';
    };
    const _GetItemDefinitionName = function (id) {
        return InventoryAPI.GetItemDefinitionName(id);
    };
    const _ItemMatchDefName = function (id, defName) {
        return InventoryAPI.DoesItemMatchDefinitionByName(id, defName);
    };
    const _ItemDefinitionNameSubstrMatch = function (id, defSubstr) {
        const itemDefName = InventoryAPI.GetItemDefinitionName(id);
        return (!!itemDefName && (itemDefName.indexOf(defSubstr) != -1));
    };
    const _GetFauxReplacementItemID = function (id, purpose) {
        if (purpose === 'graffiti') {
            if (_ItemDefinitionNameSubstrMatch(id, 'tournament_journal_')) {
                return _GetFauxItemIdForGraffiti(parseInt(InventoryAPI.GetItemAttributeValue(id, 'sticker slot 0 id')));
            }
        }
        return id;
    };
    const _GetFauxItemIdForGraffiti = function (stickestickerid_graffiti) {
        return InventoryAPI.GetFauxItemIDFromDefAndPaintIndex(1349, stickestickerid_graffiti);
    };
    const _GetItemIdForItemEquippedInSlot = function (team, slot) {
        return LoadoutAPI.GetItemID(team, slot);
    };
    const _ItemsNeededToTradeUp = function (id) {
        return InventoryAPI.GetNumItemsNeededToTradeUp(id);
    };
    const _GetGifter = function (id) {
        const xuid = InventoryAPI.GetItemGifterXuid(id);
        return xuid !== undefined ? xuid : '';
    };
    const _GetSet = function (id) {
        const setName = InventoryAPI.GetSet(id);
        return setName !== undefined ? setName : '';
    };
    const _GetModelPath = function (id, itemSchemaDef) {
        const isMusicKit = _ItemMatchDefName(id, 'musickit');
        const issMusicKitDefault = _ItemMatchDefName(id, 'musickit_default');
        const isSpray = itemSchemaDef.name === 'spraypaint';
        const isSprayPaint = itemSchemaDef.name === 'spray';
        const isFanTokenOrShieldItem = itemSchemaDef.name && itemSchemaDef.name.indexOf('tournament_journal_') != -1;
        const isPet = itemSchemaDef.name === itemSchemaDef.name && itemSchemaDef.name.indexOf('pet_') != -1;
        if (isSpray || isSprayPaint || isFanTokenOrShieldItem)
            return 'vmt://spraypreview_' + id;
        else if (_IsSticker(id) || _IsPatch(id))
            return 'vmt://stickerpreview_' + id;
        else if (itemSchemaDef.hasOwnProperty("model_player") || isMusicKit || issMusicKitDefault || isPet)
            return 'img://inventory_' + id;
    };
    const _GetModelPlayer = function (id) {
        const schemaString = InventoryAPI.BuildItemSchemaDefJSON(id);
        if (!schemaString)
            return "";
        const itemSchemaDef = JSON.parse(schemaString);
        const modelPlayer = itemSchemaDef["model_player"];
        return modelPlayer;
    };
    function _IsSticker(itemId) {
        return _ItemMatchDefName(itemId, 'sticker');
    }
    function _IsDisplayItem(itemId) {
        return _GetDefaultSlot(itemId) == 'flair0';
    }
    function _IsPatch(itemId) {
        return _ItemMatchDefName(itemId, 'patch');
    }
    const _GetDefaultCheer = function (id) {
        const schemaString = InventoryAPI.BuildItemSchemaDefJSON(id);
        const itemSchemaDef = JSON.parse(schemaString);
        if (itemSchemaDef["default_cheer"])
            return itemSchemaDef["default_cheer"];
        else
            return "";
    };
    const _GetVoPrefix = function (id) {
        const schemaString = InventoryAPI.BuildItemSchemaDefJSON(id);
        const itemSchemaDef = JSON.parse(schemaString);
        return itemSchemaDef["vo_prefix"];
    };
    const _GetModelPathFromJSONOrAPI = function (id) {
        if (id === '' || id === undefined || id === null) {
            return '';
        }
        let pedistalModel = '';
        const schemaString = InventoryAPI.BuildItemSchemaDefJSON(id);
        const itemSchemaDef = JSON.parse(schemaString);
        if (_GetDefaultSlot(id) === "flair0") {
            pedistalModel = itemSchemaDef.hasOwnProperty('attributes') ? itemSchemaDef.attributes["pedestal display model"] : '';
        }
        else if (_ItemHasCapability(id, 'decodable')) {
            pedistalModel = itemSchemaDef.hasOwnProperty("model_player") ? itemSchemaDef.model_player : '';
        }
        return (pedistalModel === '') ? _GetModelPath(id, itemSchemaDef) : pedistalModel;
    };
    const _GetLootListCount = function (id) {
        return InventoryAPI.GetLootListItemsCount(id);
    };
    const _GetLootListItemByIndex = function (id, index) {
        return InventoryAPI.GetLootListItemIdByIndex(id, index);
    };
    const _GetMarketLinkForLootlistItem = function (id) {
        const appID = SteamOverlayAPI.GetAppID();
        const communityUrl = SteamOverlayAPI.GetSteamCommunityURL();
        const strName = _GetName(id);
        return communityUrl + "/market/search?appid=" + appID + "&lock_appid=" + appID + "&q=" + strName;
    };
    const _GetToolType = function (id) {
        return InventoryAPI.GetToolType(id);
    };
    function _FindAnyUserOwnedCharacterItemID() {
        InventoryAPI.SetInventorySortAndFilters('inv_sort_rarity', false, 'customplayer,not_base_item', '', '');
        const count = InventoryAPI.GetInventoryCount();
        return (count > 0) ? InventoryAPI.GetInventoryItemIDByIndex(0) : '';
    }
    function _IsDefaultCharacter(id) {
        const defaultTItem = LoadoutAPI.GetDefaultItem('t', 'customplayer');
        const defaultCTItem = LoadoutAPI.GetDefaultItem('ct', 'customplayer');
        return id == defaultTItem || id == defaultCTItem;
    }
    function _IsPreviewable(id) {
        return (!!ItemInfo.GetDefaultSlot(id) || ItemInfo.ItemMatchDefName(id, 'sticker') || ItemInfo.ItemMatchDefName(id, 'patch') || ItemInfo.ItemMatchDefName(id, 'spray'));
    }
    return {
        BIsRewardPremium: function (id) { return InventoryAPI.BIsRewardPremium(id); },
        DeepCopyVanityCharacterSettings: _DeepCopyVanityCharacterSettings,
        FindAnyUserOwnedCharacterItemID: _FindAnyUserOwnedCharacterItemID,
        GetCapabilitybyIndex: _GetCapabilitybyIndex,
        GetCapabilityCount: _GetCapabilityCount,
        GetChosenActionItemIDByIndex: _GetChosenActionItemIDByIndex,
        GetChosenActionItemsCount: _GetChosenActionItemsCount,
        GetDefaultCheer: _GetDefaultCheer,
        GetFauxItemIdForGraffiti: _GetFauxItemIdForGraffiti,
        GetFauxReplacementItemID: _GetFauxReplacementItemID,
        GetFormattedName: _GetFormattedName,
        GetGifter: _GetGifter,
        GetItemDefinitionName: _GetItemDefinitionName,
        GetItemIdForItemEquippedInSlot: _GetItemIdForItemEquippedInSlot,
        GetEquippedSlot: _GetEquippedSlot,
        GetEquippedItemIdForDefIndex: _GetEquippedItemIdForDefIndex,
        GetItemPickUpMethod: _GetItemPickUpMethod,
        GetItemsInXray: _GetItemsInXray,
        GetitemStickerList: _GetitemStickerList,
        GetKeyForCaseInXray: _GetKeyForCaseInXray,
        GetLoadoutPrice: _GetLoadoutPrice,
        GetLoadoutWeapons: _GetLoadoutWeapons,
        GetLootListCount: _GetLootListCount,
        GetLootListItemByIndex: _GetLootListItemByIndex,
        GetMarketLinkForLootlistItem: _GetMarketLinkForLootlistItem,
        GetModelPath: _GetModelPath,
        GetModelPathFromJSONOrAPI: _GetModelPathFromJSONOrAPI,
        GetModelPlayer: _GetModelPlayer,
        GetName: _GetName,
        GetNameWithRarity: _GetNameWithRarity,
        GetOrUpdateVanityCharacterSettings: _GetOrUpdateVanityCharacterSettings,
        GetRarityColor: _GetRarityColor,
        GetRewardTier: function (id) { return InventoryAPI.GetRewardTier(id); },
        GetSet: _GetSet,
        GetLoadoutCategory: _GetLoadoutCategory,
        GetDefaultSlot: _GetDefaultSlot,
        GetSprayTintColor: _GetSprayTintColor,
        GetStickerCount: _GetStickerCount,
        GetStickerSlotCount: _GetStickerSlotCount,
        GetStoreOriginalPrice: _GetStoreOriginalPrice,
        GetStoreSalePercentReduction: _GetStoreSalePercentReduction,
        GetStoreSalePrice: _GetStoreSalePrice,
        GetTeam: _GetTeam,
        GetToolType: _GetToolType,
        GetVoPrefix: _GetVoPrefix,
        IsCase: _IsCase,
        IsCharacter: _IsCharacter,
        IsDefaultCharacter: _IsDefaultCharacter,
        IsDisplayItem: _IsDisplayItem,
        IsEquippableThroughContextMenu: _IsEquippableThroughContextMenu,
        IsEquippalbleButNotAWeapon: _IsEquippalbleButNotAWeapon,
        IsEquipped: _IsEquipped,
        IsEquippedForCT: _IsEquippedForCT,
        IsEquippedForNoTeam: _IsEquippedForNoTeam,
        IsEquippedForT: _IsEquippedForT,
        CanEquipItemInSlot: _CanEquipItemInSlot,
        IsItemAnyTeam: _IsItemAnyTeam,
        IsItemCt: _IsItemCt,
        IsItemT: _IsItemT,
        IsPatch: _IsPatch,
        IsPet: _IsPet,
        IsPreviewable: _IsPreviewable,
        IsSprayPaint: _IsSprayPaint,
        IsSpraySealed: _IsSpraySealed,
        IsStatTrak: _IsStatTrak,
        IsSticker: _IsSticker,
        IsTool: _IsTool,
        IsTradeUpContract: _IsTradeUpContract,
        IsWeapon: _IsWeapon,
        ItemDefinitionNameSubstrMatch: _ItemDefinitionNameSubstrMatch,
        ItemHasCapability: _ItemHasCapability,
        ItemMatchDefName: _ItemMatchDefName,
        ItemPurchase: _ItemPurchase,
        ItemsNeededToTradeUp: _ItemsNeededToTradeUp,
        PrecacheVanityCharacterSettings: _PrecacheVanityCharacterSettings,
        IsStockItem: _IsStockItem,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpdGVtaW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUNBQXFDO0FBQ3JDLHNDQUFzQztBQUN0QywwQ0FBMEM7QUFnQjFDLElBQUksUUFBUSxHQUFHLENBQUU7SUFFaEIsTUFBTSxlQUFlLEdBQUcsVUFBVyxFQUFVO1FBRTVDLE9BQU8sWUFBWSxDQUFDLGtCQUFrQixDQUFFLEVBQUUsQ0FBRSxDQUFDO0lBQzlDLENBQUMsQ0FBQztJQUdGLE1BQU0saUJBQWlCLEdBQUcsVUFBVyxFQUFVO1FBRTlDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBRSxFQUFFLENBQUUsQ0FBQztRQUUvQixJQUFLLFlBQVksQ0FBQyxhQUFhLENBQUUsRUFBRSxDQUFFLEVBQ3JDO1lBQ0MsT0FBTyxJQUFJLGNBQWMsQ0FBRSx1QkFBdUIsRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBRSxDQUFDO1NBQzdFO2FBRUQ7WUFFQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFFLEdBQUcsQ0FBRSxDQUFDO1lBRXhDLElBQUssUUFBUSxJQUFJLENBQUMsRUFDbEI7Z0JBQ0MsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBRSxDQUFDLEVBQUUsUUFBUSxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzlELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUUsUUFBUSxHQUFHLENBQUMsQ0FBRSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUU5RCxPQUFPLElBQUksY0FBYyxDQUFFLHdCQUF3QixFQUFFLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLENBQUUsQ0FBQzthQUNqSDtZQUVELE9BQU8sSUFBSSxjQUFjLENBQUUscUJBQXFCLEVBQUUsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUUsQ0FBQztTQUMzRTtJQUNG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