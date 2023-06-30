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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXRlbWluZm8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpdGVtaW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMsc0NBQXNDO0FBQ3RDLDBDQUEwQztBQWdCMUMsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUVoQixNQUFNLGVBQWUsR0FBRyxVQUFXLEVBQVU7UUFFNUMsT0FBTyxZQUFZLENBQUMsa0JBQWtCLENBQUUsRUFBRSxDQUFFLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBR0YsTUFBTSxpQkFBaUIsR0FBRyxVQUFXLEVBQVU7UUFFOUMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFFLEVBQUUsQ0FBRSxDQUFDO1FBRS9CLElBQUssWUFBWSxDQUFDLGFBQWEsQ0FBRSxFQUFFLENBQUUsRUFDckM7WUFDQyxPQUFPLElBQUksY0FBYyxDQUFFLHVCQUF1QixFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFFLENBQUM7U0FDN0U7YUFFRDtZQUVDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUUsR0FBRyxDQUFFLENBQUM7WUFFeEMsSUFBSyxRQUFRLElBQUksQ0FBQyxFQUNsQjtnQkFDQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFFLENBQUMsRUFBRSxRQUFRLENBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBRSxRQUFRLEdBQUcsQ0FBQyxDQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRTlELE9BQU8sSUFBSSxjQUFjLENBQUUsd0JBQXdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsQ0FBRSxDQUFDO2FBQ2pIO1lBRUQsT0FBTyxJQUFJLGNBQWMsQ0FBRSxxQkFBcUIsRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBRSxDQUFDO1NBQzNFO0lBQ0Ys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